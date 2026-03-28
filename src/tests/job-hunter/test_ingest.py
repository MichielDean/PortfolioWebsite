"""Tests for src/job-hunter/sources/ingest.py.

Covers:
  - ensure_schema: table creation, idempotency, adding description to existing DBs
  - format_salary: various salary combinations
  - ingest: happy path, deduplication, blacklist, per-role error handling, null fields
  - get_db_path: argv, env var, missing path
  - main: stdout output format
"""

import os
import sqlite3
import sys
from datetime import date
from unittest.mock import patch

import pandas as pd
import pytest

# ingest.py is on sys.path via conftest.py
from ingest import ensure_schema, format_salary, get_db_path, ingest, main


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def make_db(path: str = ':memory:') -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    ensure_schema(conn)
    return conn


def make_row(**overrides) -> pd.Series:
    base = {
        'site': 'indeed',
        'job_url': 'https://indeed.com/job/123',
        'title': 'VP of Engineering',
        'company': 'Acme Corp',
        'description': 'Great job',
        'date_posted': date(2026, 3, 27),
        'min_amount': float('nan'),
        'max_amount': float('nan'),
        'interval': float('nan'),
        'currency': float('nan'),
    }
    base.update(overrides)
    return pd.Series(base)


def make_df(*rows: pd.Series) -> pd.DataFrame:
    return pd.DataFrame(list(rows))


# ─────────────────────────────────────────────────────────────
# ensure_schema
# ─────────────────────────────────────────────────────────────

class TestEnsureSchema:
    def test_creates_jobs_table_on_empty_db(self):
        conn = sqlite3.connect(':memory:')
        ensure_schema(conn)
        tables = {r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()}
        assert 'jobs' in tables

    def test_is_idempotent(self):
        conn = sqlite3.connect(':memory:')
        ensure_schema(conn)
        ensure_schema(conn)  # Must not raise

    def test_adds_description_column_to_existing_schema(self):
        """Given a DB created without description, ensure_schema adds it."""
        conn = sqlite3.connect(':memory:')
        conn.execute('''
            CREATE TABLE jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                ats_type TEXT NOT NULL,
                external_id TEXT NOT NULL,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                url TEXT NOT NULL,
                salary_raw TEXT,
                posted_at TEXT,
                fetched_at TEXT NOT NULL,
                blacklisted INTEGER NOT NULL DEFAULT 0,
                UNIQUE (source, external_id)
            )
        ''')
        conn.commit()
        ensure_schema(conn)
        cols = {row[1] for row in conn.execute('PRAGMA table_info(jobs)').fetchall()}
        assert 'description' in cols

    def test_schema_has_unique_constraint_on_source_external_id(self):
        conn = make_db()
        conn.execute(
            "INSERT INTO jobs (source, ats_type, external_id, title, company, url, fetched_at)"
            " VALUES ('indeed', 'unknown', 'http://x.com', 'T', 'C', 'http://x.com', '2026-01-01')"
        )
        conn.commit()
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(
                "INSERT INTO jobs (source, ats_type, external_id, title, company, url, fetched_at)"
                " VALUES ('indeed', 'unknown', 'http://x.com', 'T2', 'C2', 'http://x.com', '2026-01-02')"
            )


# ─────────────────────────────────────────────────────────────
# format_salary
# ─────────────────────────────────────────────────────────────

class TestFormatSalary:
    def test_returns_none_when_no_amounts(self):
        row = make_row()
        assert format_salary(row) is None

    def test_returns_none_when_both_nan(self):
        row = pd.Series({'min_amount': float('nan'), 'max_amount': float('nan'),
                         'interval': 'yearly', 'currency': 'USD'})
        assert format_salary(row) is None

    def test_formats_range_with_currency_and_interval(self):
        row = pd.Series({'min_amount': 100000.0, 'max_amount': 150000.0,
                         'interval': 'yearly', 'currency': 'USD'})
        result = format_salary(row)
        assert result is not None
        assert '100000' in result
        assert '150000' in result
        assert 'USD' in result
        assert 'yearly' in result

    def test_formats_min_only(self):
        row = pd.Series({'min_amount': 80000.0, 'max_amount': float('nan'),
                         'interval': float('nan'), 'currency': float('nan')})
        result = format_salary(row)
        assert result is not None
        assert '80000' in result
        assert '+' in result

    def test_formats_max_only(self):
        row = pd.Series({'min_amount': float('nan'), 'max_amount': 200000.0,
                         'interval': float('nan'), 'currency': float('nan')})
        result = format_salary(row)
        assert result is not None
        assert '200000' in result
        assert 'up to' in result


# ─────────────────────────────────────────────────────────────
# ingest
# ─────────────────────────────────────────────────────────────

class TestIngest:
    def test_inserts_new_job_and_returns_inserted_count(self, tmp_path):
        """Given one unique job row, When ingesting all 4 roles, Then inserted=1."""
        db_path = str(tmp_path / 'test.db')
        df = make_df(make_row())
        with patch('ingest.scrape_jobs', return_value=df):
            inserted, skipped = ingest(db_path)
        assert inserted == 1
        assert inserted + skipped == 4  # 4 roles × 1 row each

    def test_second_run_inserts_zero(self, tmp_path):
        """Given data already in DB, When ingesting same data again, Then inserted=0."""
        db_path = str(tmp_path / 'test.db')
        df = make_df(make_row())
        with patch('ingest.scrape_jobs', return_value=df):
            ingest(db_path)
        with patch('ingest.scrape_jobs', return_value=df):
            inserted, skipped = ingest(db_path)
        assert inserted == 0

    def test_skips_blacklisted_job(self, tmp_path):
        """Given a blacklisted (source, external_id), When ingesting that job, Then it is skipped."""
        db_path = str(tmp_path / 'test.db')
        row = make_row()
        conn = make_db(db_path)
        conn.execute(
            'INSERT INTO jobs (source, ats_type, external_id, title, company, url, fetched_at, blacklisted)'
            " VALUES (?, 'unknown', ?, ?, ?, ?, '2026-01-01', 1)",
            (row['site'], row['job_url'], row['title'], row['company'], row['job_url']),
        )
        conn.commit()
        conn.close()

        df = make_df(row)
        with patch('ingest.scrape_jobs', return_value=df):
            inserted, skipped = ingest(db_path)
        assert inserted == 0
        assert skipped == 4

    def test_does_not_skip_non_blacklisted_existing_entry(self, tmp_path):
        """Given a non-blacklisted existing (source, external_id), When ingesting, INSERT OR IGNORE fires."""
        db_path = str(tmp_path / 'test.db')
        row = make_row()
        conn = make_db(db_path)
        conn.execute(
            'INSERT INTO jobs (source, ats_type, external_id, title, company, url, fetched_at, blacklisted)'
            " VALUES (?, 'unknown', ?, ?, ?, ?, '2026-01-01', 0)",
            (row['site'], row['job_url'], row['title'], row['company'], row['job_url']),
        )
        conn.commit()
        conn.close()

        df = make_df(row)
        with patch('ingest.scrape_jobs', return_value=df):
            inserted, skipped = ingest(db_path)
        # All conflict → 0 inserted, 4 skipped
        assert inserted == 0
        assert skipped == 4

    def test_per_role_error_is_logged_and_skipped(self, tmp_path, capsys):
        """Given scrape_jobs raises on first role, When ingesting, Then error is on stderr and other roles continue."""
        db_path = str(tmp_path / 'test.db')
        good_df = make_df(make_row(site='linkedin', job_url='https://linkedin.com/job/1'))
        call_count = {'n': 0}

        def side_effect(**_):
            call_count['n'] += 1
            if call_count['n'] == 1:
                raise RuntimeError('network timeout')
            return good_df

        with patch('ingest.scrape_jobs', side_effect=side_effect):
            inserted, skipped = ingest(db_path)

        assert 'network timeout' in capsys.readouterr().err
        assert inserted == 1
        assert call_count['n'] == 4  # All 4 roles attempted

    def test_handles_null_description(self, tmp_path):
        """Given a row with NaN description, When ingesting, Then description stored as NULL."""
        db_path = str(tmp_path / 'test.db')
        row = make_row(description=float('nan'))
        df = make_df(row)
        with patch('ingest.scrape_jobs', return_value=df):
            ingest(db_path)
        conn = sqlite3.connect(db_path)
        result = conn.execute('SELECT description FROM jobs LIMIT 1').fetchone()
        conn.close()
        assert result[0] is None

    def test_stores_description_when_present(self, tmp_path):
        """Given a row with a description, When ingesting, Then description is stored."""
        db_path = str(tmp_path / 'test.db')
        row = make_row(description='# Lead engineers\nGreat role.')
        df = make_df(row)
        with patch('ingest.scrape_jobs', return_value=df):
            ingest(db_path)
        conn = sqlite3.connect(db_path)
        result = conn.execute('SELECT description FROM jobs LIMIT 1').fetchone()
        conn.close()
        assert result[0] == '# Lead engineers\nGreat role.'

    def test_stores_correct_source_and_external_id(self, tmp_path):
        """Given a LinkedIn job row, When ingested, Then source='linkedin' and external_id=job_url."""
        db_path = str(tmp_path / 'test.db')
        row = make_row(site='linkedin', job_url='https://linkedin.com/jobs/view/99')
        df = make_df(row)
        with patch('ingest.scrape_jobs', return_value=df):
            ingest(db_path)
        conn = sqlite3.connect(db_path)
        result = conn.execute('SELECT source, external_id FROM jobs LIMIT 1').fetchone()
        conn.close()
        assert result[0] == 'linkedin'
        assert result[1] == 'https://linkedin.com/jobs/view/99'

    def test_multiple_distinct_jobs_all_inserted(self, tmp_path):
        """Given 3 unique job URLs across sites, When all 4 roles return same DF, Then inserted=3, skipped=9."""
        db_path = str(tmp_path / 'test.db')
        df = make_df(
            make_row(site='indeed', job_url='https://indeed.com/job/1'),
            make_row(site='linkedin', job_url='https://linkedin.com/job/2'),
            make_row(site='google', job_url='https://google.com/job/3'),
        )
        with patch('ingest.scrape_jobs', return_value=df):
            inserted, skipped = ingest(db_path)
        assert inserted == 3
        assert skipped == 9

    def test_ats_type_set_to_unknown(self, tmp_path):
        """Given any jobspy row, When ingested, Then ats_type='unknown'."""
        db_path = str(tmp_path / 'test.db')
        df = make_df(make_row())
        with patch('ingest.scrape_jobs', return_value=df):
            ingest(db_path)
        conn = sqlite3.connect(db_path)
        result = conn.execute('SELECT ats_type FROM jobs LIMIT 1').fetchone()
        conn.close()
        assert result[0] == 'unknown'

    def test_skips_row_with_missing_site_or_url(self, tmp_path):
        """Given a row with empty site, When ingesting, Then row is counted as skipped."""
        db_path = str(tmp_path / 'test.db')
        bad_row = make_row(site='', job_url='https://indeed.com/job/1')
        good_row = make_row(site='indeed', job_url='https://indeed.com/job/2')
        df = make_df(bad_row, good_row)
        with patch('ingest.scrape_jobs', return_value=df):
            inserted, skipped = ingest(db_path)
        # bad_row skipped (×4 roles) + good_row dedup-skipped (×3 roles)
        assert inserted == 1
        assert skipped > 0

    def test_nan_site_or_url_skips_row(self, tmp_path):
        """Given rows with NaN site or NaN job_url, When ingesting, Then rows are skipped."""
        db_path = str(tmp_path / 'test.db')
        nan_site_row = make_row(site=float('nan'), job_url='https://indeed.com/job/1')
        nan_url_row = make_row(site='indeed', job_url=float('nan'))
        good_row = make_row(site='indeed', job_url='https://indeed.com/job/3')
        df = make_df(nan_site_row, nan_url_row, good_row)
        with patch('ingest.scrape_jobs', return_value=df):
            inserted, skipped = ingest(db_path)
        # good_row inserted once (first role), then dedup-skipped for remaining 3 roles
        assert inserted == 1
        # NaN rows: 2 per role × 4 roles = 8 skipped; dedup: 3 more skipped
        assert skipped == 11

    def test_empty_dataframe_returns_zero_inserted_skipped(self, tmp_path):
        """Given scrape_jobs returns empty DataFrame, When ingesting, Then inserted=0, skipped=0."""
        db_path = str(tmp_path / 'test.db')
        with patch('ingest.scrape_jobs', return_value=pd.DataFrame()):
            inserted, skipped = ingest(db_path)
        assert inserted == 0
        assert skipped == 0


# ─────────────────────────────────────────────────────────────
# get_db_path
# ─────────────────────────────────────────────────────────────

class TestGetDbPath:
    def test_returns_argv1_when_provided(self):
        with patch.object(sys, 'argv', ['ingest.py', '/path/to/db.sqlite']):
            assert get_db_path() == '/path/to/db.sqlite'

    def test_returns_env_var_when_no_argv(self):
        with patch.object(sys, 'argv', ['ingest.py']):
            with patch.dict(os.environ, {'JOB_HUNTER_DB': '/env/db.sqlite'}):
                assert get_db_path() == '/env/db.sqlite'

    def test_exits_when_neither_argv_nor_env(self):
        with patch.object(sys, 'argv', ['ingest.py']):
            with patch.dict(os.environ, {'JOB_HUNTER_DB': ''}):
                with pytest.raises(SystemExit):
                    get_db_path()

    def test_argv_takes_precedence_over_env(self):
        with patch.object(sys, 'argv', ['ingest.py', '/argv/db.sqlite']):
            with patch.dict(os.environ, {'JOB_HUNTER_DB': '/env/db.sqlite'}):
                assert get_db_path() == '/argv/db.sqlite'


# ─────────────────────────────────────────────────────────────
# main — output format
# ─────────────────────────────────────────────────────────────

class TestMain:
    def test_prints_inserted_skipped_to_stdout(self, tmp_path, capsys):
        """When main() runs, Then stdout contains exactly 'Inserted X, skipped Y'."""
        db_path = str(tmp_path / 'test.db')
        df = make_df(make_row())
        with patch.object(sys, 'argv', ['ingest.py', db_path]):
            with patch('ingest.scrape_jobs', return_value=df):
                main()
        out = capsys.readouterr().out.strip()
        assert out.startswith('Inserted ')
        assert ', skipped ' in out

    def test_output_format_matches_spec(self, tmp_path, capsys):
        """Output line must be exactly 'Inserted X, skipped Y\\n'."""
        db_path = str(tmp_path / 'test.db')
        df = make_df(make_row())
        with patch.object(sys, 'argv', ['ingest.py', db_path]):
            with patch('ingest.scrape_jobs', return_value=df):
                main()
        out = capsys.readouterr().out
        # Must be a single line ending with newline
        lines = out.splitlines()
        assert len(lines) == 1
        line = lines[0]
        assert line.startswith('Inserted ')
        assert ', skipped ' in line
        # Values must be integers
        parts = line.replace('Inserted ', '').replace(', skipped ', ' ').split()
        assert parts[0].isdigit()
        assert parts[1].isdigit()
