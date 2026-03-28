# Context

## Item: po-54o85

**Title:** Integrate ingest.py: schema migration, type update, ingestion.ts wiring, retire old scrapers
**Status:** in_progress
**Priority:** 2

### Description

Five coordinated changes:

(1) migrations.ts — add to runMigrations(): ALTER TABLE jobs ADD COLUMN description TEXT (guard against 'duplicate column' error so it is idempotent).

(2) db/types.ts — add description: string | null to the Job interface.

(3) ingestion.ts — update runIngestion() signature to accept (db: Database.Database, dbPath: string). Replace Greenhouse/Lever exec logic with a single shell-exec of src/job-hunter/sources/ingest.py, passing dbPath as argv[1]. Parse 'Inserted X, skipped Y' from stdout for logging. Propagate non-zero exit as an error. Update the call site in index.ts to pass dbPath (resolved from the same path used to open the DB connection).

(4) Delete these files: greenhouse.ts, greenhouse.config.ts, lever.ts, sources.config.ts. Remove their imports and any scheduler references.

(5) Update the scoring prompt to include the description field when non-null, with a graceful fallback when null.

Acceptance: full pipeline runs end-to-end with ingest.py as the sole source; relevant roles surface in Telegram notifications; scoring and Telegram notifier behavior otherwise unchanged.

## Current Step: docs

- **Type:** agent
- **Role:** docs_writer
- **Context:** full_codebase

## ⚠️ REVISION REQUIRED — Fix these issues before anything else

This droplet was recirculated. The following issues were found and **must** be fixed.
Do not proceed to implementation until you have read and understood each issue.

### Issue 1 (from: reviewer)

Finding 1: src/job-hunter/sources/ingest.py:134-139 — LOGIC ERROR: Missing company-level blacklist check. The Python ingest path only checks if the exact (source, external_id) is blacklisted, but does not check if ANY job from the same company is blacklisted. The TypeScript ingestJobs() correctly does this (ingestion.ts:41-43). Since ingest.py is now the primary ingestion path, company-level blacklisting is broken. Fix: add query 'SELECT 1 FROM jobs WHERE company = ? AND blacklisted = 1 LIMIT 1' before the INSERT and skip the row if it matches.

### Issue 2 (from: reviewer)

Finding 2: src/job-hunter/ingestion.ts:6-13 — MISSING ERROR HANDLING: execFileAsync discards stderr. The execFile callback receives (error, stdout, stderr) but only stdout is captured. When ingest.py encounters scraping failures (line 123 prints to stderr), those diagnostics vanish. If all 4 role scrapes fail, the caller sees {inserted:0, skipped:0} with zero visibility into the cause. Fix: capture stderr in the callback and log it via console.warn when non-empty.

### Issue 3 (from: reviewer)

Finding 3: src/job-hunter/db/migrations.ts:8-10 and src/job-hunter/sources/ingest.py:94 — RACE CONDITION: No SQLite busy_timeout set on either connection. The Node.js callback poller (long-running background loop performing DB writes for approve/deny actions) and the Python ingest.py subprocess (which opens its own sqlite3 connection for writes) can contend on the same DB file. Without busy_timeout, SQLITE_BUSY is thrown immediately with no retry. A user's Telegram approve/deny action during an ingest run will be silently lost. Fix: add PRAGMA busy_timeout = 5000 in both initConnection() and ingest.py after sqlite3.connect().

### Issue 4 (from: reviewer)

♻ 3 findings. (1) ingest.py:134-139 — missing company-level blacklist check; only checks exact (source, external_id) pair, not company, so blacklisted companies' new jobs are still inserted. (2) ingestion.ts:6-13 — execFileAsync discards stderr from ingest.py, losing all scraping error diagnostics. (3) migrations.ts:8-10 and ingest.py:94 — no PRAGMA busy_timeout on either SQLite connection; concurrent access from callback poller and ingest.py subprocess will throw SQLITE_BUSY immediately, silently losing user approve/deny actions.

### Issue 5 (from: reviewer)

Phase 1 — All 4 prior issues verified RESOLVED: (1) company-level blacklist check present at ingest.py:137-142 with tests. (2) stderr capture present at ingestion.ts:9 with tests. (3) busy_timeout=5000 present at migrations.ts:10 and ingest.py:95 with tests. (4) Duplicate of 1-3.

### Issue 6 (from: reviewer)

Phase 2 — Fresh adversarial review: no new findings. Checked SQL injection (all parameterized), command injection (execFile/spawn with arrays), XSS (HTML escaping in notifier), prompt injection (sanitizeField + data tags), resource leaks (finally blocks), error handling (per-phase try/catch, backoff, partial-send tracking), concurrency (busy_timeout + idempotency guards), logic correctness (parameter counts, dedup, blacklist). All 41 changed files reviewed.

### Issue 7 (from: reviewer)

No findings. All 3 prior issues verified resolved with tests. Fresh adversarial review of full diff (41 files, 8353 insertions) found no security vulnerabilities, logic errors, missing error handling, API contract violations, or resource leaks.

---

## Recent Step Notes

### From: reviewer

No findings. All 3 prior issues verified resolved with tests. Fresh adversarial review of full diff (41 files, 8353 insertions) found no security vulnerabilities, logic errors, missing error handling, API contract violations, or resource leaks.

### From: reviewer

Phase 2 — Fresh adversarial review: no new findings. Checked SQL injection (all parameterized), command injection (execFile/spawn with arrays), XSS (HTML escaping in notifier), prompt injection (sanitizeField + data tags), resource leaks (finally blocks), error handling (per-phase try/catch, backoff, partial-send tracking), concurrency (busy_timeout + idempotency guards), logic correctness (parameter counts, dedup, blacklist). All 41 changed files reviewed.

### From: reviewer

Phase 1 — All 4 prior issues verified RESOLVED: (1) company-level blacklist check present at ingest.py:137-142 with tests. (2) stderr capture present at ingestion.ts:9 with tests. (3) busy_timeout=5000 present at migrations.ts:10 and ingest.py:95 with tests. (4) Duplicate of 1-3.

### From: simplifier

Simplified ingest.py: removed redundant per-job blacklist check (SELECT blacklisted FROM jobs WHERE source=? AND external_id=?). The check was superseded by the company-level blacklist check added in the previous fix — any blacklisted job belongs to a company with blacklisted=1, so the company check covers it; INSERT OR IGNORE handles non-blacklisted duplicates. Also hoisted company extraction before the company check to fail fast before parsing salary/description/date. 7 lines deleted, no behaviour change. Tests: 346 TS + 32 Python all pass.

<available_skills>
  <skill>
    <name>cistern-droplet-state</name>
    <description>Manage droplet state in the Cistern agentic pipeline using the `ct` CLI.</description>
    <location>/home/lobsterdog/.cistern/skills/cistern-droplet-state/SKILL.md</location>
  </skill>
  <skill>
    <name>cistern-git</name>
    <description>---</description>
    <location>/home/lobsterdog/.cistern/skills/cistern-git/SKILL.md</location>
  </skill>
</available_skills>

## Signaling Completion

When your work is done, signal your outcome using the `ct` CLI:

**Pass (work complete, move to next step):**
    ct droplet pass po-54o85

**Recirculate (needs rework — send back upstream):**
    ct droplet recirculate po-54o85
    ct droplet recirculate po-54o85 --to implement

**Block (genuinely blocked, cannot proceed):**
    ct droplet block po-54o85

Add notes before signaling:
    ct droplet note po-54o85 "What you did / found"

The `ct` binary is on your PATH.
