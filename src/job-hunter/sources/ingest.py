#!/usr/bin/env python3
"""Jobspy-based job discovery writing directly to SQLite.

Usage:
    python ingest.py <db_path>
    JOB_HUNTER_DB=/path/to/jobs.db python ingest.py

Writes exactly one line to stdout on completion:
    Inserted X, skipped Y
"""

import os
import sqlite3
import sys
from datetime import datetime, timezone

import pandas as pd
from jobspy import scrape_jobs

ROLES = [
    'Director of Engineering',
    'Senior Engineering Manager',
    'VP of Engineering',
    'VP of QA',
]


def get_db_path() -> str:
    """Return DB path from argv[1] or JOB_HUNTER_DB env var; exit if neither."""
    if len(sys.argv) > 1:
        return sys.argv[1]
    path = os.environ.get('JOB_HUNTER_DB', '').strip()
    if not path:
        sys.exit('Error: provide DB path as argv[1] or set JOB_HUNTER_DB')
    return path


def ensure_schema(conn: sqlite3.Connection) -> None:
    """Create the jobs table if absent; add description column to existing DBs."""
    conn.execute('''
        CREATE TABLE IF NOT EXISTS jobs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            source      TEXT    NOT NULL,
            ats_type    TEXT    NOT NULL,
            external_id TEXT    NOT NULL,
            title       TEXT    NOT NULL,
            company     TEXT    NOT NULL,
            url         TEXT    NOT NULL,
            salary_raw  TEXT,
            posted_at   TEXT,
            fetched_at  TEXT    NOT NULL,
            description TEXT,
            blacklisted INTEGER NOT NULL DEFAULT 0,
            UNIQUE (source, external_id)
        )
    ''')
    try:
        conn.execute('ALTER TABLE jobs ADD COLUMN description TEXT')
    except Exception:
        pass  # Column already exists — no-op
    conn.commit()


def format_salary(row: pd.Series) -> str | None:
    """Return a human-readable salary string, or None if no salary data."""
    min_amt = row.get('min_amount')
    max_amt = row.get('max_amount')
    interval = row.get('interval')
    currency = row.get('currency')

    min_null = pd.isna(min_amt)
    max_null = pd.isna(max_amt)
    if min_null and max_null:
        return None

    parts: list[str] = []
    if not pd.isna(currency):
        parts.append(str(currency))
    if not min_null and not max_null:
        parts.append(f'{min_amt:.0f}-{max_amt:.0f}')
    elif not min_null:
        parts.append(f'{min_amt:.0f}+')
    else:
        parts.append(f'up to {max_amt:.0f}')
    if not pd.isna(interval):
        parts.append(f'/{interval}')

    return ' '.join(parts) if parts else None


def ingest(db_path: str) -> tuple[int, int]:
    """Fetch jobs for all roles, insert into the DB, return (inserted, skipped)."""
    conn = sqlite3.connect(db_path)
    try:
        ensure_schema(conn)

        inserted = 0
        skipped = 0
        fetched_at = datetime.now(timezone.utc).isoformat()

        insert_stmt = '''
            INSERT OR IGNORE INTO jobs
                (source, ats_type, external_id, title, company, url,
                 salary_raw, posted_at, fetched_at, description, blacklisted)
            VALUES (?, 'unknown', ?, ?, ?, ?, ?, ?, ?, ?, 0)
        '''

        for role in ROLES:
            try:
                df = scrape_jobs(
                    site_name=['indeed', 'linkedin', 'zip_recruiter', 'google'],
                    search_term=role,
                    location='United States',
                    results_wanted=25,
                    hours_old=48,
                    is_remote=True,
                    linkedin_fetch_description=True,
                    verbose=0,
                    description_format='markdown',
                )
            except Exception as exc:
                print(f'Error scraping {role!r}: {exc}', file=sys.stderr)
                continue

            for _, row in df.iterrows():
                source = row.get('site', '')
                external_id = row.get('job_url', '')
                if not source or not external_id or pd.isna(source) or pd.isna(external_id):
                    skipped += 1
                    continue

                # Skip if this (source, external_id) is blacklisted
                existing = conn.execute(
                    'SELECT blacklisted FROM jobs WHERE source = ? AND external_id = ?',
                    (source, external_id),
                ).fetchone()
                if existing is not None and existing[0] == 1:
                    skipped += 1
                    continue

                title_val = row.get('title')
                company_val = row.get('company')
                description_val = row.get('description')
                description = None if pd.isna(description_val) else description_val
                salary_raw = format_salary(row)

                date_posted = row.get('date_posted')
                posted_at = None if pd.isna(date_posted) else str(date_posted)

                title_str = '' if pd.isna(title_val) else str(title_val)
                company_str = '' if pd.isna(company_val) else str(company_val)

                cur = conn.execute(
                    insert_stmt,
                    (source, external_id, title_str, company_str, external_id,
                     salary_raw, posted_at, fetched_at, description),
                )
                if cur.rowcount == 1:
                    inserted += 1
                else:
                    skipped += 1

            conn.commit()

        return inserted, skipped
    finally:
        conn.close()


def main() -> None:
    db_path = get_db_path()
    ins, skp = ingest(db_path)
    print(f'Inserted {ins}, skipped {skp}')


if __name__ == '__main__':
    main()
