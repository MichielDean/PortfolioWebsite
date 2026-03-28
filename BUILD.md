# Build Guide

## Prerequisites

**Node.js** ≥ 20.11.1 and **npm** ≥ 10.2.4 are required.

```bash
node --version  # should be >= 20.11.1
npm --version   # should be >= 10.2.4
```

**Python** ≥ 3.9 is required only if you plan to run the Python job ingest script:

```bash
python3 --version  # should be >= 3.9
pip3 install -r src/job-hunter/sources/requirements.txt
```

**Environment variables** — export these in your shell before running the job-hunter pipeline (e.g. add to `~/.bashrc` / `~/.zshrc`, or `export VAR=value` in your terminal):

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key for job-hunter fit-scoring |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for job notifications |
| `TELEGRAM_CHAT_ID` | Telegram chat ID for job notifications |
| `JOB_HUNTER_DB` | Path to the SQLite database file (e.g. `./job-hunter.db`) |

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
