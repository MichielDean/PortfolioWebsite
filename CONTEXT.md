# Context

## Item: po-566g3

**Title:** Add Lever ingestion source and wire into ingestion.ts
**Status:** in_progress
**Priority:** 2

### Description

Implement a Lever fetcher using the unauthenticated public postings endpoint (`api.lever.co/v0/postings/{company}`). Normalize results to `JobInput` (source='lever', ats_type='lever', external_id from posting id, title, company, url, salary_raw from text field if present, posted_at from createdAt). Handle pagination. Add unit tests with fixture responses. Add an exported `LEVER_WATCHLIST: string[]` to `sources.config.ts` (rename from `greenhouse.config.ts` if needed), initially empty. Update `ingestion.ts` to iterate `LEVER_WATCHLIST` and call the Lever fetcher alongside the existing Greenhouse call. Acceptance: ingestion compiles and runs end-to-end with no env vars required; an empty watchlist produces no errors.

## Current Step: implement

- **Type:** agent
- **Role:** implementer
- **Context:** full_codebase

## ⚠️ REVISION REQUIRED — Fix these issues before anything else

This droplet was recirculated. The following issues were found and **must** be fixed.
Do not proceed to implementation until you have read and understood each issue.

### Issue 1 (from: reviewer)

Finding: src/job-hunter/sources/lever.ts:117-118 — Infinite pagination loop. If Lever API returns hasNext:true but next is undefined/absent, cursor stays undefined and the same first page is re-fetched in an infinite loop. Fix: add 'if (hasNext && \!cursor) break;' after setting cursor.

### Issue 2 (from: reviewer)

Finding: src/job-hunter/index.ts:122 — require.main === module will fail at runtime. package.json has "type": "module" and tsconfig.app.json uses "module": "ESNext", so tsx runs index.ts as ESM. In ESM, the CJS 'module' global is not defined, causing a ReferenceError that crashes the daemon or silently skips startProcess(). Fix: use the ESM pattern: import { fileURLToPath } from 'node:url'; if (process.argv[1] === fileURLToPath(import.meta.url)) {

### Issue 3 (from: reviewer)

Finding: src/job-hunter/telegram/callbackHandler.ts:141-143 — Telegram body.ok===false permanently kills the poller. This throw escapes the while loop, terminates runCallbackPoller forever, and the caller only logs and never restarts. A single transient Telegram API error (e.g. rate limit 429 with {ok:false}) disables callback handling for the life of the process. Fix: replace throw with console.warn + await backoff() + continue, matching the HTTP error handling pattern at lines 126-129.

### Issue 4 (from: reviewer)

Finding (Verify): src/job-hunter/apply/engine.ts:57 — Lever apply URL likely missing company slug. URL is constructed as https://api.lever.co/v0/postings/{external_id}/apply but the Lever API requires {company} in the path: https://api.lever.co/v0/postings/{company}/{external_id}/apply. The test at apply.engine.test.ts:266 asserts the same wrong URL. Fix: include job.company in the path.

### Issue 5 (from: reviewer)

♻ 4 findings. (1) lever.ts:117-118 — infinite pagination loop when hasNext:true but next is undefined. (2) index.ts:122 — require.main===module throws ReferenceError in ESM (package.json has type:module). (3) callbackHandler.ts:141-143 — Telegram body.ok===false permanently kills the poller instead of backing off. (4) engine.ts:57 — Lever apply URL likely missing company slug in path (Verify against Lever API docs).

---

## Recent Step Notes

### From: reviewer

♻ 4 findings. (1) lever.ts:117-118 — infinite pagination loop when hasNext:true but next is undefined. (2) index.ts:122 — require.main===module throws ReferenceError in ESM (package.json has type:module). (3) callbackHandler.ts:141-143 — Telegram body.ok===false permanently kills the poller instead of backing off. (4) engine.ts:57 — Lever apply URL likely missing company slug in path (Verify against Lever API docs).

### From: reviewer

Finding (Verify): src/job-hunter/apply/engine.ts:57 — Lever apply URL likely missing company slug. URL is constructed as https://api.lever.co/v0/postings/{external_id}/apply but the Lever API requires {company} in the path: https://api.lever.co/v0/postings/{company}/{external_id}/apply. The test at apply.engine.test.ts:266 asserts the same wrong URL. Fix: include job.company in the path.

### From: reviewer

Finding: src/job-hunter/telegram/callbackHandler.ts:141-143 — Telegram body.ok===false permanently kills the poller. This throw escapes the while loop, terminates runCallbackPoller forever, and the caller only logs and never restarts. A single transient Telegram API error (e.g. rate limit 429 with {ok:false}) disables callback handling for the life of the process. Fix: replace throw with console.warn + await backoff() + continue, matching the HTTP error handling pattern at lines 126-129.

### From: reviewer

Finding: src/job-hunter/index.ts:122 — require.main === module will fail at runtime. package.json has "type": "module" and tsconfig.app.json uses "module": "ESNext", so tsx runs index.ts as ESM. In ESM, the CJS 'module' global is not defined, causing a ReferenceError that crashes the daemon or silently skips startProcess(). Fix: use the ESM pattern: import { fileURLToPath } from 'node:url'; if (process.argv[1] === fileURLToPath(import.meta.url)) {

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
  <skill>
    <name>cistern-github</name>
    <description>---</description>
    <location>/home/lobsterdog/.cistern/skills/cistern-github/SKILL.md</location>
  </skill>
</available_skills>

## Signaling Completion

When your work is done, signal your outcome using the `ct` CLI:

**Pass (work complete, move to next step):**
    ct droplet pass po-566g3

**Recirculate (needs rework — send back upstream):**
    ct droplet recirculate po-566g3
    ct droplet recirculate po-566g3 --to implement

**Block (genuinely blocked, cannot proceed):**
    ct droplet block po-566g3

Add notes before signaling:
    ct droplet note po-566g3 "What you did / found"

The `ct` binary is on your PATH.
