# Context

## Item: po-8cfb1

**Title:** Implement Claude fit-scoring service with profile matching
**Status:** in_progress
**Priority:** 2

### Description

Create src/job-hunter/scoring.ts. Load profile from src/data/profileData.ts. For each unscored job, call Claude (claude-sonnet-4-6) with a prompt that provides the profile and job details and requests a JSON response: {score: number (1-10), rationale: string (2-3 sentences)}. Persist score + rationale to scores table. Only jobs scoring 6+ are eligible for Telegram notification. Process in batches of 5 with 1s delay to avoid rate limits. Acceptance: integration test with a mocked Anthropic client verifies prompt structure and score persistence; scores < 6 are never forwarded.

## Current Step: docs

- **Type:** agent
- **Role:** docs_writer
- **Context:** full_codebase

## ⚠️ REVISION REQUIRED — Fix these issues before anything else

This droplet was recirculated. The following issues were found and **must** be fixed.
Do not proceed to implementation until you have read and understood each issue.

### Issue 1 (from: reviewer)

Finding: scoring.ts:91 — Non-integer score passes validation. The prompt requests 'integer 1-10' but validation only checks range (1-10), not integrality. A float like 7.5 is accepted and stored. Fix: add || !Number.isInteger(parsed.score) to the guard on line 91.

### Issue 2 (from: reviewer)

Finding: scoring.ts:28-61 — Prompt injection via unsanitized job data. buildScoringPrompt interpolates job.title, job.company, job.url, job.salary_raw directly into the Claude prompt without sanitization. Since data comes from third-party APIs (TheirStack, Greenhouse), a crafted job listing with embedded newlines and markdown headings could manipulate the score. Scores >= 6 trigger Telegram notifications, making this an abuse vector. Fix: strip newlines/control characters and cap field lengths before interpolation; ideally separate instructions (system msg) from untrusted data (user msg).

### Issue 3 (from: reviewer)

Finding: scoring.test.ts — Missing test for empty content array. The guard at scoring.ts:83 handles message.content[0] being undefined, but no test covers the edge case { content: [] }. This is a reachable API response. Fix: add a test asserting scoreJob throws 'Unexpected response type' when mock returns { content: [] }.

### Issue 4 (from: reviewer)

♻ 3 findings. (1) scoring.ts:91 — non-integer score passes validation; prompt asks for integer but guard only checks range 1-10, not Number.isInteger(). (2) scoring.ts:28-61 — prompt injection via unsanitized job fields from third-party APIs; crafted job titles with newlines can manipulate scores, triggering false Telegram notifications. (3) scoring.test.ts — missing test for empty content array response ({ content: [] }).

### Issue 5 (from: reviewer)

Phase 1 — All 3 prior issues RESOLVED: (1) Number.isInteger check at scoring.ts:114 (2) sanitizeField applied to title/company/url/salary_raw (3) empty content array test at scoring.test.ts:285

### Issue 6 (from: reviewer)

Finding: scoring.ts:73 — posted_at not sanitized in buildScoringPrompt. All other external job fields (title, company, url, salary_raw) are passed through sanitizeField() before prompt interpolation, but posted_at is interpolated raw. Same trust boundary — data comes from TheirStack/Greenhouse APIs. Fix: lines.push(`Posted: ${sanitizeField(job.posted_at, 50)}`)

### Issue 7 (from: reviewer)

Finding: scoring.test.ts:374-398 — Flaky test assumes undefined query order. The 'mix of scores' test uses callCount-based mock (call 1 → score 8, call 2 → score 4) and asserts result.eligible[0].id === jobA.id. This assumes getUnscoredJobs returns jobs in insertion order, but the SQL query has no ORDER BY clause. Fix: add ORDER BY j.id to getUnscoredJobs query, or make the test order-independent (e.g. assert result.eligible.some(j => j.external_id === 'high')).

### Issue 8 (from: reviewer)

♻ 2 findings. (1) scoring.ts:73 — posted_at interpolated into prompt without sanitizeField, inconsistent with all other external fields. (2) scoring.test.ts:374-398 — flaky test assumes getUnscoredJobs returns insertion order but query has no ORDER BY.

### Issue 9 (from: reviewer)

Phase 1 — All 8 prior issues verified RESOLVED: (1) Number.isInteger check at scoring.ts:114, (2) sanitizeField on all external fields scoring.ts:66-72, (3) empty content array test at scoring.test.ts:282, (4-5) summaries of 1-3, (6) posted_at sanitized scoring.ts:73, (7) ORDER BY j.id at repository.ts:79, (8) summary of 6-7.

### Issue 10 (from: reviewer)

Phase 2 — Fresh adversarial review: no new findings. All 178 tests pass. Verified: security (parameterized SQL, sanitized prompt inputs, no hardcoded secrets), logic (correct score validation, correct Promise.allSettled index mapping, proper batch delay), error handling (all failure modes caught and tested), test coverage (comprehensive edge cases including float scores, empty content, non-JSON, out-of-range), resource management (no leaks).

### Issue 11 (from: reviewer)

No findings. All 8 prior issues resolved and verified. Fresh adversarial review found no new security, logic, error handling, test coverage, or resource leak issues. 178 tests pass.

---

## Recent Step Notes

### From: reviewer

No findings. All 8 prior issues resolved and verified. Fresh adversarial review found no new security, logic, error handling, test coverage, or resource leak issues. 178 tests pass.

### From: reviewer

Phase 2 — Fresh adversarial review: no new findings. All 178 tests pass. Verified: security (parameterized SQL, sanitized prompt inputs, no hardcoded secrets), logic (correct score validation, correct Promise.allSettled index mapping, proper batch delay), error handling (all failure modes caught and tested), test coverage (comprehensive edge cases including float scores, empty content, non-JSON, out-of-range), resource management (no leaks).

### From: reviewer

Phase 1 — All 8 prior issues verified RESOLVED: (1) Number.isInteger check at scoring.ts:114, (2) sanitizeField on all external fields scoring.ts:66-72, (3) empty content array test at scoring.test.ts:282, (4-5) summaries of 1-3, (6) posted_at sanitized scoring.ts:73, (7) ORDER BY j.id at repository.ts:79, (8) summary of 6-7.

### From: simplifier

No simplifications required — code is already clear and idiomatic. scoring.ts is well-structured with appropriate JSDoc comments explaining non-obvious behavior (prompt injection prevention, batch delay rationale, optional Anthropic client). repository.ts change (ORDER BY j.id) is a single clean line. All 178 tests pass.

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
    ct droplet pass po-8cfb1

**Recirculate (needs rework — send back upstream):**
    ct droplet recirculate po-8cfb1
    ct droplet recirculate po-8cfb1 --to implement

**Block (genuinely blocked, cannot proceed):**
    ct droplet block po-8cfb1

Add notes before signaling:
    ct droplet note po-8cfb1 "What you did / found"

The `ct` binary is on your PATH.
