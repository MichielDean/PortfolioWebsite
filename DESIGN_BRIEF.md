# Design Brief: Delete resume tailoring system from PortfolioWebsite

## Requirements Summary

Remove the deprecated TypeScript resume tailoring system from PortfolioWebsite. The resume functionality now lives entirely in Lobsterdog under the lobresume CLI. This is a deletion-only task — no new functionality is added. The implementer must delete the resume system files, remove resume-only dependencies, clean configuration files, and update documentation, while ensuring the remaining portfolio site remains fully functional (build, test, typecheck all pass).

## Existing Patterns to Follow

### ORM / Query

Not applicable — this is a Vite/React frontend with no ORM or database layer. The project uses static data files (`src/data/profileData.ts`) for content.

### Naming Conventions

- Test files follow the pattern `src/tests/<category>/<ComponentName>.test.tsx` for component tests, `src/tests/<category>/<moduleName>.test.ts` for utility tests. See `src/tests/components/AboutMe.test.tsx:1`, `src/tests/utils/dateUtils.test.ts:1`.
- Configuration files use kebab-case: `jest.config.cjs`, `jest.e2e.config.ts`, `jest.resume.config.cjs`, `tsconfig.app.json`, `tsconfig.resume.json`. See root directory.
- The `test:*` npm script naming convention uses colons: `test:watch`, `test:coverage`, `test:e2e`, `test:resume`. See `package.json:26-30`.

### Error Handling

Not applicable — this is a deletion task with no new error handling paths.

### Collection Types

Not applicable — no new collections are introduced.

### Migrations

Not applicable — no database or migration system exists in this project.

### Idiom Fit

This is a pure deletion task. The implementer must only remove code, not add new code. The only "addition" is cleaning up configuration strings (removing entries from JSON configs, removing exclusion paths from tsconfig, removing entries from .gitignore).

### Testing

- The main test suite uses `jest.config.cjs` with `testPathIgnorePatterns` that excludes `src/tests/resume`. See `jest.config.cjs:17`.
- The e2e test suite uses `jest.e2e.config.ts`. See `jest.e2e.config.ts:1-13`.
- The resume test suite uses `jest.resume.config.cjs` (the file being deleted). See `jest.resume.config.cjs:1-20`.
- Component tests use `@testing-library/react` with `jest-dom` matchers. See `src/tests/components/AboutMe.test.tsx:1-4`.
- Running tests: `npm test` (main suite), `npm run test:e2e` (e2e suite).

## Reusability Requirements

Not applicable — no new code is created.

## Coupling Requirements

The resume system has one coupling point to the main app: `src/data/profileData.ts`. The resume module imports `profileData` from `../../data/profileData.js` (see `src/resume/data/resumeData.ts:2`, `src/resume/services/profileDataAdapter.ts:9`). The main app also imports `profileData` (see `src/components/WorkHistory.tsx:4`, `src/components/ScrollExperience.tsx:4`, `src/components/AboutMe.tsx:1`). Since `src/data/profileData.ts` is used by the main app, it must **NOT** be deleted.

The resume system also shares `puppeteer` with the e2e test suite. `puppeteer` is imported by `src/tests/e2e/mobile-viewport.test.ts:2` and `src/resume/cli/resumeTailor.ts:7`. Since the e2e tests still need it, `puppeteer` must **NOT** be removed from `devDependencies`.

## DRY Requirements

Not applicable — no new code is created.

## Migration Requirements

Not applicable — no database migrations exist.

## Test Requirements

After deletion is complete, the following commands must all pass:

1. `npm test` — main test suite (must not break due to missing resume test config or imports)
2. `npm run typecheck` — TypeScript compilation must pass (no broken references)
3. `npm run build` — Vite production build must succeed

The `npm run test:resume` script will be removed, so there is no resume test to run. The implementer must verify the three commands above pass.

The implementer must also verify that `npm run test:e2e` still references `puppeteer` correctly (it should, since `puppeteer` remains in `devDependencies`).

## Forbidden Patterns

- **Do NOT delete `src/data/profileData.ts`** — it is shared with the main app. See `src/components/WorkHistory.tsx:4`, `src/components/AboutMe.tsx:1`, `src/components/ScrollExperience.tsx:4`.
- **Do NOT remove `puppeteer` from devDependencies** — it is still used by `src/tests/e2e/mobile-viewport.test.ts:2`.
- **Do NOT remove any non-resume dependencies** — `@types/better-sqlite3` and `@types/node-cron` should be removed (they are type packages for resume-only deps), but `react`, `react-dom`, `react-helmet-async`, `react-router-dom`, `@testing-library/*`, `@vitejs/plugin-react`, `vite`, `ts-jest`, `jest`, `jest-environment-jsdom`, `tsx`, `typescript`, `@types/jest`, `@types/node`, `@types/react`, `@types/react-dom`, `identity-obj-proxy`, `puppeteer` must all remain.
- **Do NOT modify `jest.config.cjs` in a way that removes its exclusion of resume tests prematurely** — once `src/tests/resume/` is deleted, the `testPathIgnorePatterns` entry for `src/tests/resume` becomes inert but harmless. The implementer MAY remove it for cleanliness, but must NOT break the config.
- **Do NOT leave orphaned references** — every file, import, script, config entry, and documentation reference related to the resume system must be removed or updated.

## API Surface Checklist

This is a deletion task. There are no new methods or API surface to create. The checklist is verification-only:

- [ ] `src/resume/` directory is fully deleted (cli/, services/, data/, types/, README.md, tsconfig.json)
- [ ] `src/tests/resume/` directory is fully deleted (all 5 test files: claudeService.test.ts, llmValidator.test.ts, ollamaService.test.ts, profileDataAdapter.test.ts, promptLibrary.test.ts)
- [ ] `scripts/tailor-resume.ps1` is deleted
- [ ] `jest.resume.config.cjs` is deleted
- [ ] `tsconfig.resume.json` is deleted
- [ ] `src/resume/tsconfig.json` reference: the project reference `{ "path": "./src/resume/tsconfig.json" }` in `tsconfig.json:5` is removed, leaving only `{ "path": "./tsconfig.app.json" }`
- [ ] `tsconfig.app.json:29`: the `"src/resume/**/*"` and `"src/tests/resume/**/*"` entries are removed from the `exclude` array, OR the entire `exclude` field is kept if it still has other valid entries. Currently the exclude is `["src/resume/**/*", "src/tests/resume/**/*"]` — after deletion, if no other excludes are needed, the `exclude` field can be removed entirely.
- [ ] `package.json`: the `"test:resume"` script is removed from `scripts` (line 30)
- [ ] `package.json`: `"@anthropic-ai/sdk"` is removed from `dependencies` (line 33)
- [ ] `package.json`: `"better-sqlite3"` is removed from `dependencies` (line 34)
- [ ] `package.json`: `"node-cron"` is removed from `dependencies` (line 35)
- [ ] `package.json`: `"@types/better-sqlite3"` is removed from `devDependencies` (line 44)
- [ ] `package.json`: `"@types/node-cron"` is removed from `devDependencies` (line 47)
- [ ] `package.json`: `"puppeteer"` remains in `devDependencies` (line 54) — it is still used by e2e tests
- [ ] `scripts/README.md` is updated to remove all resume-related content (lines 7-27 reference `tailor-resume.ps1`)
- [ ] `README.md` is updated to remove all resume-related content (lines 59-99: the entire "Resume Tailoring Tool" section, and any other resume references on lines 86-99)
- [ ] `BUILD.md` is updated to remove the `npm run test:resume` reference (line 25)
- [ ] `.gitignore` is cleaned: remove resume-specific entries (lines 9-16: `generated/*`, `!generated/.gitkeep`, `resume*.html`, `resumes/`, `*.pdf` and their comments). Note: `generated/` is only used by the resume system; `contact.json` (line 36) is only used by the resume system; these should be removed.
- [ ] `openclaw/portfoliowebsite/SKILL.md` is updated to remove the entire "Resume Tailoring" section (lines 12-48) and the `src/resume/services/claudeService.ts` architecture reference (line 54)
- [ ] `npm install` succeeds after dependency removal (validates package-lock.json consistency)
- [ ] `npm run typecheck` passes with no errors
- [ ] `npm test` passes (main test suite)
- [ ] `npm run build` passes (production build succeeds)

## Dependency Analysis

The following dependencies are **only used by the resume system** and must be removed:

| Package | Type | Lines in package.json | Used by resume | Used by main app |
|---------|------|-----------------------|----------------|------------------|
| `@anthropic-ai/sdk` | dependencies:33 | Only in resume test mock (`src/tests/resume/claudeService.test.ts:17`); imported by no source file (claudeService uses CLI, not SDK) | Yes | No |
| `better-sqlite3` | dependencies:34 | Not imported by any source file in the codebase | No import | No import |
| `node-cron` | dependencies:35 | Not imported by any source file in the codebase | No import | No import |
| `@types/better-sqlite3` | devDependencies:44 | Type package for better-sqlite3 | Yes | No |
| `@types/node-cron` | devDependencies:47 | Type package for node-cron | Yes | No |

The following dependency is used by **both resume and main app** and must be **kept**:

| Package | Type | Resume usage | Main app usage |
|---------|------|--------------|----------------|
| `puppeteer` | devDependencies:54 | `src/resume/cli/resumeTailor.ts:7` | `src/tests/e2e/mobile-viewport.test.ts:2` |

Note: `@anthropic-ai/sdk` appears only in the test mock for `claudeService.test.ts`. The actual `claudeService.ts` uses `child_process.spawn` to call the `claude` CLI, not the SDK. Since `claudeService.ts` is being deleted along with its test, the SDK can be safely removed.

## Files to Delete

1. `src/resume/cli/promptManager.ts`
2. `src/resume/cli/resumeTailor.ts`
3. `src/resume/services/claudeService.ts`
4. `src/resume/services/coverLetterEngine.ts`
5. `src/resume/services/llmValidator.ts`
6. `src/resume/services/ollamaService.ts`
7. `src/resume/services/profileDataAdapter.ts`
8. `src/resume/services/promptLibrary.ts`
9. `src/resume/services/resumeTailoringEngine.ts`
10. `src/resume/services/resumeValidator.ts`
11. `src/resume/services/skillDiscovery.ts`
12. `src/resume/data/resumeData.ts`
13. `src/resume/types/resumeTypes.ts`
14. `src/resume/README.md`
15. `src/resume/tsconfig.json`
16. `src/tests/resume/claudeService.test.ts`
17. `src/tests/resume/llmValidator.test.ts`
18. `src/tests/resume/ollamaService.test.ts`
19. `src/tests/resume/profileDataAdapter.test.ts`
20. `src/tests/resume/promptLibrary.test.ts`
21. `scripts/tailor-resume.ps1`
22. `jest.resume.config.cjs`
23. `tsconfig.resume.json`

## Files to Modify

1. **`tsconfig.json`** — Remove the `{ "path": "./src/resume/tsconfig.json" }` reference from `references` array (line 5), leaving only `{ "path": "./tsconfig.app.json" }`.
2. **`tsconfig.app.json`** — Remove `src/resume/**/*` and `src/tests/resume/**/*` from the `exclude` array (line 29). If this empties the `exclude` array, remove the entire `exclude` field.
3. **`package.json`** — Remove `test:resume` script (line 30), `@anthropic-ai/sdk` from dependencies (line 33), `better-sqlite3` from dependencies (line 34), `node-cron` from dependencies (line 35), `@types/better-sqlite3` from devDependencies (line 44), `@types/node-cron` from devDependencies (line 47). Keep `puppeteer`.
4. **`jest.config.cjs`** — Remove `src/tests/resume` from `testPathIgnorePatterns` (line 17). It currently reads `['node_modules', 'dist', 'src/tests/e2e', 'src/tests/resume']` — change to `['node_modules', 'dist', 'src/tests/e2e']`.
5. **`.gitignore`** — Remove resume-specific entries: lines 9-16 (the `generated/*`, `!generated/.gitkeep`, resume HTML/PDF patterns, and `resumes/`). Remove `contact.json` entry (line 36) — it is only used by the resume system. Consider whether `generated/` directory still needs to exist; if not, remove the `.gitkeep` file and directory too.
6. **`README.md`** — Remove the entire "Resume Tailoring Tool" section (lines 59-99), including the "First-Time Setup" and "Generate Tailored Resume" subsections and "Features" list.
7. **`BUILD.md`** — Remove the `npm run test:resume` line (line 25).
8. **`scripts/README.md`** — Remove all resume-related content (lines 7-27 referencing `tailor-resume.ps1` and the resume tailoring CLI).
9. **`openclaw/portfoliowebsite/SKILL.md`** — Remove the "Resume Tailoring" section (lines 12-48) and the `claudeService.ts` architecture reference (line 54). Update the description (line 3) to remove "resume tailoring" and "resume for" triggers.

## Post-Deletion Verification

After all deletions and modifications:

1. Run `npm install` to regenerate `package-lock.json` without removed packages.
2. Run `npm run typecheck` — must pass with zero errors.
3. Run `npm test` — must pass (all non-resume tests green).
4. Run `npm run build` — must produce a working production build.
5. Grep for `resume` in `src/` (excluding deleted files) — should return zero results.
6. Grep for `@anthropic-ai/sdk`, `better-sqlite3`, `node-cron` in remaining source files — should return zero results.