# Build Guide

## Prerequisites

**Node.js** ≥ 20.11.1 and **npm** ≥ 10.2.4 are required.

```bash
node --version  # should be >= 20.11.1
npm --version   # should be >= 10.2.4
```

**Python 3.13** is required only if you plan to run the Python job ingest script.
jobspy's regex wheel does not build on Python 3.14+, so the system Python (which
may be newer) can silently break ingestion. The recommended setup is a dedicated
venv at `~/.venv/jobhunter-sys` using Python 3.13:

```bash
# One-time setup — create the venv with Python 3.13 and install dependencies
python3.13 -m venv ~/.venv/jobhunter-sys
~/.venv/jobhunter-sys/bin/pip install -r src/job-hunter/sources/requirements.txt
```

`ingestion.ts` resolves the interpreter in this order:
1. `INGEST_PYTHON` env var (if set) — use this to point at any interpreter explicitly
2. `~/.venv/jobhunter-sys/bin/python3` (if it exists on disk) — preferred
3. `python3` system fallback (may be incompatible with jobspy on newer OS versions)

A missing venv is handled gracefully — ingestion falls back to `python3` rather
than crashing. If jobspy fails to import, set `INGEST_PYTHON` to a known-good 3.13
interpreter.

**Environment variables** — export these in your shell before running the job-hunter pipeline (e.g. add to `~/.bashrc` / `~/.zshrc`, or `export VAR=value` in your terminal):

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key for job-hunter fit-scoring |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for job notifications |
| `TELEGRAM_CHAT_ID` | Telegram chat ID for job notifications |
| `JOB_HUNTER_DB` | Path to the SQLite database file (e.g. `./job-hunter.db`) |
| `INGEST_PYTHON` | Override the Python interpreter used by `ingest.py` (e.g. `/usr/local/bin/python3.13`) |

The portfolio site itself has no required env vars; the above are only needed to run the job-hunter pipeline.

## Local Dev Setup

```bash
npm install       # install dependencies
npm run dev       # start Vite dev server at http://localhost:5173
```

## Running Tests

```bash
npm test                          # all unit tests
npm run test:watch                # watch mode
npm run test:coverage             # with coverage report
npm run test:resume               # resume-module tests only
npm run test:job-hunter           # job-hunter tests only
npm run test:e2e                  # end-to-end tests (requires built site)
```

## Deployment

The site deploys to Netlify. Build output goes to `dist/`.

```bash
npm run build                     # typecheck + Vite production build
netlify deploy --dir dist         # preview deploy
netlify deploy --dir dist --prod  # production deploy
```

Netlify CI/CD runs `npm run build` automatically on push (see `netlify.toml`). The `prebuild` hook runs `npm test` before every build.
