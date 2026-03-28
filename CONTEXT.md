# Context

## Item: po-kehls

**Title:** Remove dead code: ashby.ts and orphaned AtsType values
**Status:** in_progress
**Priority:** 2

### Description

Delete src/job-hunter/sources/ashby.ts and its test file src/tests/job-hunter/ashby.test.ts if it exists. In db/types.ts, narrow AtsType to only values actually written by ingest.py: 'indeed' | 'linkedin' | 'zip_recruiter' | 'google' | 'unknown'. Run npm test and fix any failures caused by the type narrowing. Acceptance: no orphaned source files in src/job-hunter/sources/; AtsType contains only the five live values; all tests pass.

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
    ct droplet pass po-kehls

**Recirculate (needs rework — send back upstream):**
    ct droplet recirculate po-kehls
    ct droplet recirculate po-kehls --to implement

**Block (genuinely blocked, cannot proceed):**
    ct droplet block po-kehls

Add notes before signaling:
    ct droplet note po-kehls "What you did / found"

The `ct` binary is on your PATH.
