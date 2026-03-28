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
