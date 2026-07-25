# Git Hooks

This repo uses a post-commit hook to keep downstream profile data in sync.

## Setup

After cloning, link the hooks directory:

```bash
git config core.hooksPath .git-hooks
```

This makes git use `.git-hooks/` instead of the default `.git/hooks/`.

## post-commit

Runs `scripts/sync-career-ops.py` when `src/data/profileData.ts` is in the commit.
Updates:
- `~/.config/llmem/resume/profile.json` (lobresume)
- `~/source/career-ops/config/profile.yml` (career-ops candidate info)
- `~/source/career-ops/modes/_profile.md` (archetypes + framing)

Silent on success unless profileData.ts was changed. Fails loudly if sync fails.