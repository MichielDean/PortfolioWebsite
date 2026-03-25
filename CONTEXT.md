# Context

## Item: po-1oewi

**Title:** Implement Greenhouse Job Board poller for watchlist companies
**Status:** in_progress
**Priority:** 2

### Description

Create src/job-hunter/sources/greenhouse.ts. Maintain a watchlist array of Greenhouse board tokens (e.g. 'stripe', 'notion') in a config file. For each company, GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true and filter for titles matching the target roles and remote=true in location/content. Normalize to internal Job shape (source='greenhouse', external_id=job.id, ats_type='greenhouse'). Acceptance: mock tests verify filtering and normalization; config-driven watchlist can be extended without code changes.

## Current Step: docs

- **Type:** agent
- **Role:** docs_writer
- **Context:** full_codebase

## ⚠️ REVISION REQUIRED — Fix these issues before anything else

This droplet was recirculated. The following issues were found and **must** be fixed.
Do not proceed to implementation until you have read and understood each issue.

### Issue 1 (from: reviewer)

Finding: greenhouse.ts:62,23 — Null-dereference risk from unvalidated API data. After line 57 checks Array.isArray(jobs), line 62 casts to GreenhouseJob[] without validating element shapes. If the Greenhouse API returns a job with location:null or location:undefined (e.g. draft listings, schema changes), isRemote() at line 23 dereferences job.location.name — two levels deep — causing TypeError: Cannot read properties of null (reading 'name'). The TheirStack client has a similar top-level cast but only accesses single-level properties, making it resilient to undefined (returns 'undefined' string, not crash). Fix: Either add a guard in the filter (line 62-64) to skip elements missing required fields, or validate element shape before cast (e.g. check that each element has location/content/title/id).

### Issue 2 (from: reviewer)

Finding: greenhouse.config.ts:14-19 + theirstack.ts:7-12 — Duplicate target roles configuration. TARGET_ROLES in greenhouse.config.ts is an exact copy of JOB_TITLES in theirstack.ts (same 4 strings in same order). If a role is added/removed/renamed in one source but not the other, the two pollers silently diverge — Greenhouse would filter for a different set of roles than TheirStack. Fix: Extract the shared role list to a single source-of-truth (e.g. src/job-hunter/config.ts or similar) and import it from both sources.

### Issue 3 (from: reviewer)

Finding: greenhouse.ts:47-55 — Single company failure discards all previously-collected results. fetchGreenhouseJobs iterates companies sequentially (line 47). If company N's fetch throws (non-ok response at line 52, or network error), the error propagates uncaught, losing all JobInput[] results already collected from companies 0..N-1. Unlike TheirStack (which paginates a single API), Greenhouse fetches from independent company boards — one company's outage or board removal should not discard results from all others. No test covers partial-failure behavior. Fix: Wrap the per-company fetch in try/catch, log or collect the error, and continue processing remaining companies. Add a test for partial failure.

### Issue 4 (from: reviewer)

♻ 3 findings. (1) greenhouse.ts:62,23 — Null-dereference risk: Array.isArray check on jobs array does not validate element shapes; isRemote dereferences job.location.name two levels deep, will throw TypeError if any element has location:null/undefined from unexpected API data. (2) greenhouse.config.ts:14-19 + theirstack.ts:7-12 — Duplicate target roles: TARGET_ROLES is an exact copy of JOB_TITLES; updating one without the other causes silent filter divergence between sources. Extract to shared config. (3) greenhouse.ts:47-55 — Single company failure discards all results: per-company errors propagate uncaught, losing JobInput results from previously-successful companies; each company is an independent source so partial failure should be handled gracefully. No test covers this scenario.

### Issue 5 (from: reviewer)

All 3 prior findings verified RESOLVED. (1) Null-deref guard: isValidGreenhouseJobShape validates element shapes before isRemote can dereference location.name. (2) Shared config: TARGET_ROLES extracted to src/job-hunter/config.ts, imported by both greenhouse and theirstack. (3) Per-company error isolation: try/catch wraps loop body; partial-failure test confirms graceful degradation. Fresh review: no new findings — error handling, type safety, API contracts, and test coverage are all sound.

---

## Recent Step Notes

### From: reviewer

All 3 prior findings verified RESOLVED. (1) Null-deref guard: isValidGreenhouseJobShape validates element shapes before isRemote can dereference location.name. (2) Shared config: TARGET_ROLES extracted to src/job-hunter/config.ts, imported by both greenhouse and theirstack. (3) Per-company error isolation: try/catch wraps loop body; partial-failure test confirms graceful degradation. Fresh review: no new findings — error handling, type safety, API contracts, and test coverage are all sound.

### From: simplifier

Simplified: (1) greenhouse.ts — removed 4 comments that restated function names (matchesTargetRole, isRemote, normalizeJob) and the obvious first half of the fetchGreenhouseJobs header; condensed isValidGreenhouseJobShape comment to just the non-obvious 'why'. (2) greenhouse.test.ts — removed 7 redundant warnSpy.mockRestore() calls in error-handling tests; the top-level afterEach(jest.restoreAllMocks) already handles cleanup. Tests: all 125 packages pass.

### From: implementer

Fixed all 3 issues from review cycle. (1) Issue 1 — null-deref: added isValidGreenhouseJobShape() type guard in the filter pipeline; elements missing location/title/content/id are skipped before isRemote() can dereference location.name. (2) Issue 2 — duplicate roles: extracted TARGET_ROLES to src/job-hunter/config.ts as single source of truth; greenhouse.config.ts re-exports it and theirstack.ts imports it directly — JOB_TITLES is gone. (3) Issue 3 — per-company error isolation: each company fetch is now wrapped in try/catch; non-ok response and network errors log a console.warn and continue, preserving results from previously-successful companies. Tests updated: error handling tests now assert graceful continuation instead of throws; added partial-failure test (one of two companies fails, results from the other are returned), and two null/undefined location guard tests. All 125 tests pass.

### From: reviewer

♻ 3 findings. (1) greenhouse.ts:62,23 — Null-dereference risk: Array.isArray check on jobs array does not validate element shapes; isRemote dereferences job.location.name two levels deep, will throw TypeError if any element has location:null/undefined from unexpected API data. (2) greenhouse.config.ts:14-19 + theirstack.ts:7-12 — Duplicate target roles: TARGET_ROLES is an exact copy of JOB_TITLES; updating one without the other causes silent filter divergence between sources. Extract to shared config. (3) greenhouse.ts:47-55 — Single company failure discards all results: per-company errors propagate uncaught, losing JobInput results from previously-successful companies; each company is an independent source so partial failure should be handled gracefully. No test covers this scenario.

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
    ct droplet pass po-1oewi

**Recirculate (needs rework — send back upstream):**
    ct droplet recirculate po-1oewi
    ct droplet recirculate po-1oewi --to implement

**Block (genuinely blocked, cannot proceed):**
    ct droplet block po-1oewi

Add notes before signaling:
    ct droplet note po-1oewi "What you did / found"

The `ct` binary is on your PATH.
