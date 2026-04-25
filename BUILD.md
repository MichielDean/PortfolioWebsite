# Build Guide

## Prerequisites

**Node.js** ≥ 20.11.1 and **npm** ≥ 10.2.4 are required.

```bash
node --version  # should be >= 20.11.1
npm --version   # should be >= 10.2.4
```

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
