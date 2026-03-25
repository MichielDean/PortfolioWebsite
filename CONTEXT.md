# Context

## Item: po-w535j

**Title:** Build job ingestion layer with deduplication and normalization
**Status:** in_progress
**Priority:** 2

### Description

Create src/job-hunter/ingestion.ts that accepts arrays of normalized jobs from any source and: (1) checks DB for existing (source, external_id) pairs and skips duplicates, (2) skips blacklisted companies/jobs, (3) inserts net-new jobs with status 'new'. Expose ingestJobs(jobs: NormalizedJob[]): Promise<{inserted: number, skipped: number}>. Wire TheirStack and Greenhouse sources as the two input streams. Acceptance: duplicate run inserts 0 rows; novel jobs are inserted; blacklisted jobs are filtered.

## Current Step: docs

- **Type:** agent
- **Role:** docs_writer
- **Context:** full_codebase

## ⚠️ REVISION REQUIRED — Fix these issues before anything else

This droplet was recirculated. The following issues were found and **must** be fixed.
Do not proceed to implementation until you have read and understood each issue.

### Issue 1 (from: reviewer)

Finding: src/job-hunter/ingestion.ts:77 — runIngestion() uses Promise.all, so if fetchTheirStackJobs() throws (missing API key, network error, bad response shape), the rejection discards the Greenhouse results too. Fix: use Promise.allSettled() and collect only fulfilled results, so one source failing does not lose the other source's jobs.

### Issue 2 (from: reviewer)

Finding: src/job-hunter/ingestion.ts:44-67 — ingestJobs() runs each INSERT as its own auto-committed SQLite transaction. For N jobs this means N fsyncs (~100x slower than a single transaction) and no atomicity (crash mid-loop leaves partial batch). Fix: wrap the for-loop in db.transaction(() => { ... })() for both performance and atomicity.

### Issue 3 (from: reviewer)

Finding: src/tests/job-hunter/ingestion.test.ts:198-255 — runIngestion() tests only cover happy paths where both sources resolve successfully. No tests for source fetch failures (e.g. fetchTheirStackJobs rejects). Fix: add tests verifying that when one source throws, the other source's jobs are still ingested (after fixing runIngestion to use Promise.allSettled).

### Issue 4 (from: reviewer)

♻ 3 findings. (1) ingestion.ts:77 — Promise.all in runIngestion means one source failure discards the other source's results; use Promise.allSettled. (2) ingestion.ts:44-67 — no transaction wrapping around batch inserts; each INSERT auto-commits (N fsyncs, no atomicity); wrap in db.transaction(). (3) ingestion.test.ts:198-255 — no test coverage for source fetch failures in runIngestion; add tests for partial-failure scenarios.

### Issue 5 (from: reviewer)

Phase 1 verification — all 4 prior issues RESOLVED: (1) Promise.allSettled confirmed at ingestion.ts:79. (2) db.transaction() wrap confirmed at ingestion.ts:44-69. (3) Partial-failure tests confirmed at ingestion.test.ts:256-290. (4) Summary — same as 1-3.

### Issue 6 (from: reviewer)

Finding: src/job-hunter/ingestion.ts:84 — Rejected source fetches silently discarded. results.flatMap(r => r.status === 'fulfilled' ? r.value : []) drops rejected promises without logging r.reason. Both source modules use console.warn for internal errors, but top-level failures (e.g. missing API key, network error) vanish silently. Return value {inserted:0, skipped:0} is indistinguishable from 'no new jobs' vs 'source is broken'. Fix: before flatMap, iterate rejected results and console.warn each r.reason to match existing codebase logging pattern.

### Issue 7 (from: reviewer)

♻ 1 finding. (1) ingestion.ts:84 — rejected Promise.allSettled results are silently discarded without logging; errors from failed source fetches vanish, making source outages invisible to operators. Fix: log rejected r.reason values via console.warn before collecting fulfilled results.

### Issue 8 (from: reviewer)

Phase 1 — All 7 prior issues RESOLVED: (1) Promise.allSettled at ingestion.ts:79. (2) db.transaction() wrap at ingestion.ts:44-69. (3) Partial-failure tests at ingestion.test.ts:256-331. (4) Summary of 1-3. (5) Prior verification confirmed. (6-7) console.warn logging for rejected results at ingestion.ts:84-88, with tests at lines 268-331. Phase 2 — Fresh review: no new findings. Parameterized SQL, correct transaction semantics, comprehensive test coverage, proper error handling via Promise.allSettled, verified type/schema contracts across all layers.

### Issue 9 (from: reviewer)

No findings. All 7 prior issues verified RESOLVED. Fresh adversarial review found no new security, logic, error-handling, test coverage, contract, or resource-leak issues.

---

## Recent Step Notes

### From: reviewer

No findings. All 7 prior issues verified RESOLVED. Fresh adversarial review found no new security, logic, error-handling, test coverage, contract, or resource-leak issues.

### From: reviewer

Phase 1 — All 7 prior issues RESOLVED: (1) Promise.allSettled at ingestion.ts:79. (2) db.transaction() wrap at ingestion.ts:44-69. (3) Partial-failure tests at ingestion.test.ts:256-331. (4) Summary of 1-3. (5) Prior verification confirmed. (6-7) console.warn logging for rejected results at ingestion.ts:84-88, with tests at lines 268-331. Phase 2 — Fresh review: no new findings. Parameterized SQL, correct transaction semantics, comprehensive test coverage, proper error handling via Promise.allSettled, verified type/schema contracts across all layers.

### From: simplifier

No simplifications required — code is already clear and idiomatic. ingestion.ts (92 lines) is well-structured with useful non-obvious JSDoc, idiomatic better-sqlite3 transaction pattern, no dead code. ingestion.test.ts (332 lines) is well-organized with proper fixture scoping and mock resets. All 148 tests pass.

### From: implementer

Fixed Issue 6/7: added console.warn logging for rejected Promise.allSettled results in runIngestion() before collecting fulfilled results. Added 3 new tests verifying warn is called for TheirStack failure, Greenhouse failure, and both-failure scenarios. All 148 tests pass.

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
    ct droplet pass po-w535j

**Recirculate (needs rework — send back upstream):**
    ct droplet recirculate po-w535j
    ct droplet recirculate po-w535j --to implement

**Block (genuinely blocked, cannot proceed):**
    ct droplet block po-w535j

Add notes before signaling:
    ct droplet note po-w535j "What you did / found"

The `ct` binary is on your PATH.
