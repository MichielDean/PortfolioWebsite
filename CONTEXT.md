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
    ct droplet pass po-54o85

**Recirculate (needs rework — send back upstream):**
    ct droplet recirculate po-54o85
    ct droplet recirculate po-54o85 --to implement

**Block (genuinely blocked, cannot proceed):**
    ct droplet block po-54o85

Add notes before signaling:
    ct droplet note po-54o85 "What you did / found"

The `ct` binary is on your PATH.
