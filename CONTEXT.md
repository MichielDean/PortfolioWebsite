# Context

## Item: po-ldl1v

**Title:** Wire cron orchestrator and persistent process manager
**Status:** in_progress
**Priority:** 2

### Description

Create src/job-hunter/index.ts as the main entry point. Use node-cron to schedule the fetch→ingest→score→notify pipeline daily at 08:00 UTC. Start the Telegram callback handler as a long-running getUpdates polling loop in the same process. Expose a CLI flag --run-now to trigger an immediate fetch cycle (useful for testing). Add a package.json script and a systemd service unit file (or PM2 ecosystem config) for lobsterdog deployment. Acceptance: --run-now executes a full cycle end-to-end; cron fires at correct interval; process recovers from transient API errors without crashing (caught rejections logged, process continues).

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
    ct droplet pass po-ldl1v

**Recirculate (needs rework — send back upstream):**
    ct droplet recirculate po-ldl1v
    ct droplet recirculate po-ldl1v --to implement

**Block (genuinely blocked, cannot proceed):**
    ct droplet block po-ldl1v

Add notes before signaling:
    ct droplet note po-ldl1v "What you did / found"

The `ct` binary is on your PATH.
