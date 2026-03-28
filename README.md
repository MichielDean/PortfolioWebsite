
# Portfolio Site

A personal portfolio website built with Vite, React, and TypeScript showcasing my professional experience and skills in software engineering and quality assurance.

## 🛠 Technologies

- Vite
- React 18
- TypeScript
- React Router
- React Helmet Async
- CSS Modules
- Responsive Design
- Theme Switching (Dark/Light Mode)
- Netlify Hosting

## 🚀 Getting Started

1. **Install Dependencies**
```sh
npm install
```

2. **Start Development Server**
```sh
npm run dev
```

The site will be running at `http://localhost:8000`

3. **Build for Production**
```sh
npm run build
```

4. **Preview Production Build**
```sh
npm run preview
```

## 🧪 Testing

Run tests with:
```sh
npm test
```

Watch mode:
```sh
npm test:watch
```

Coverage report:
```sh
npm test:coverage
```

**Note:** The `npm test` command uses jsdom config. For job-hunter module tests, use:
```sh
npm run test:job-hunter
```

## � Resume Tailoring Tool

This project includes an AI-powered resume tailoring tool that customizes your resume for specific job postings.

### First-Time Setup

1. **Create your contact configuration:**
```sh
cp contact.example.json contact.json
```

2. **Edit `contact.json` with your information:**
```json
{
  "name": "Your Full Name",
  "email": "your.email@example.com",
  "phone": "(xxx) xxx-xxxx",
  "location": "City, State",
  "website": "https://your-website.com/"
}
```

**Note:** `contact.json` is in `.gitignore` and will never be committed to source control.

### Generate Tailored Resume

```sh
npm run tailor-resume -- --job-file path/to/job-posting.txt --job-title "Job Title" --company "Company Name"
```

This will generate:
- `generated/resume.html` - HTML version
- `generated/resume.pdf` - **PDF ready to submit** (one-page optimized)

### Features
- ✅ Automatically calculates years of experience from work history
- ✅ Selects most relevant achievements for the role
- ✅ Optimized for ATS (Applicant Tracking Systems)
- ✅ One-page PDF format
- ✅ Plain text URLs for maximum compatibility
- ✅ No sensitive data in source control

## 🎯 Job Hunter Module

A backend subsystem for automating remote job discovery, scoring, and application tracking.

### Features
- **Greenhouse Integration**: Fetches jobs from configured Greenhouse company boards
- **Lever Integration**: Fetches jobs from configured Lever company boards
- **Remote Job Filtering**: Automatically fetches remote engineering positions (Director of Engineering, Senior Engineering Manager, VP of Engineering, VP of QA)
- **SQLite Database**: Persistent storage for jobs, scores, approvals, and application tracking
- **Daily Updates**: Configurable to fetch jobs posted in the last X days (defaults to 1 day)
- **Response Validation**: Validates external API responses before processing
- **Partial Failure Resilience**: Company board failures don't discard results from other sources

### Setup

1. **Configure Greenhouse Watchlist** (Optional):
   Edit `src/job-hunter/sources/greenhouse.config.ts` to add company board tokens:
```typescript
export const GREENHOUSE_WATCHLIST: string[] = [
  'stripe',    // Stripe careers board
  'notion',    // Notion careers board
  // Add more company tokens as needed
];
```
   The watchlist can be extended without code changes — just add new tokens to the array.

2. **Configure Lever Watchlist** (Optional):
   Edit `src/job-hunter/sources/sources.config.ts` to add company slugs:
```typescript
export const LEVER_WATCHLIST: string[] = [
  'acme',      // ACME Corp careers board
  'techcorp',  // TechCorp careers board
  // Add more company slugs as needed
];
```
   The watchlist can be extended without code changes — just add new slugs to the array.
   Lever uses public company slugs (found in the URL: `lever.co/jobs/{slug}`) instead of tokens.

### Usage

**Fetch jobs from Greenhouse**:
```typescript
import { fetchGreenhouseJobs } from './job-hunter/sources/greenhouse';

const jobs = await fetchGreenhouseJobs();
// Returns normalized array of JobInput objects from all configured boards
// Automatically filters for remote positions in target roles
```

**Fetch jobs from Lever**:
```typescript
import { fetchLeverJobs } from './job-hunter/sources/lever';
import { LEVER_WATCHLIST } from './job-hunter/sources/sources.config';

const jobs = await fetchLeverJobs(LEVER_WATCHLIST);
// Returns normalized array of JobInput objects from all configured company boards
// Automatically filters for remote positions in target roles
// Uses Lever's public API (no authentication required)
```

**Fetch and ingest from all sources**:
```typescript
import { runIngestion } from './job-hunter/ingestion';
import Database from 'better-sqlite3';

const db = new Database('jobs.db');
const result = await runIngestion(db);
// Fetches from both Greenhouse and Lever boards in parallel
// Deduplicates by (source, external_id)
// Skips jobs from blacklisted companies
// Returns { inserted: number, skipped: number }
console.log(`Ingested: ${result.inserted}, Skipped: ${result.skipped}`);
```

**Database Operations**:
```typescript
import {
  initConnection,
  runMigrations,
  upsertJob,
  listJobs,
  getUnscoredJobs,
  addScore,
  upsertApproval,
} from './job-hunter/db';
import Database from 'better-sqlite3';

const db = new Database('jobs.db');
initConnection(db);  // Enable foreign keys
runMigrations(db);   // Create schema

// Store jobs
for (const job of jobs) {
  upsertJob(db, job);
}

// List all jobs
const allJobs = listJobs(db);

// Score jobs
const unscoredJobs = getUnscoredJobs(db);
for (const job of unscoredJobs) {
  // AI scoring logic here
  addScore(db, { job_id: job.id, score: 0.85, rationale: '...' });
}
```

**Telegram Notifications**:
```typescript
import { runNotifier } from './job-hunter/telegram/notifier';
import Database from 'better-sqlite3';

const db = new Database('jobs.db');

// Send notifications for jobs with score >= 6
// Credentials from TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars
const result = await runNotifier(db);
console.log(`Notified: ${result.notified}, Skipped: ${result.skipped}`);

// Or supply credentials directly
const result = await runNotifier(db, 'your-bot-token', 'your-chat-id');
```

Each notification:
- Displays the job title, company, salary (if available), posted date, fit score, and rationale
- Includes an inline Telegram keyboard with Approve ✅ and Deny ❌ buttons
- Stores a pending approval record so the job isn't re-notified on subsequent runs
- Requires environment variables: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`

**Telegram Callback Handler**:
```typescript
import { runCallbackPoller } from './job-hunter/telegram/callbackHandler';
import { EventEmitter } from 'events';
import Database from 'better-sqlite3';

const db = new Database('jobs.db');
const emitter = new EventEmitter();

// Listen for approve events from user clicks
emitter.on('approve', async (jobId: number) => {
  console.log(`Job ${jobId} approved by user, triggering resume generation...`);
  // Connect to resume generation pipeline here
});

// Long-poll for callback_query events from user button clicks
// Credentials from TELEGRAM_BOT_TOKEN env var when botToken not supplied
const signal = new AbortController().signal;
const result = await runCallbackPoller(db, emitter, undefined, signal);
console.log(`Processed: Approved=${result.approved}, Denied=${result.denied}, Ignored=${result.ignored}`);
```

The callback handler:
- Long-polls Telegram's `getUpdates` API for `callback_query` events (when users click buttons)
- Parses the callback data to extract the action (approve/deny) and job ID
- **Deny**: Updates approval status to 'denied', blacklists the job, notifies the user
- **Approve**: Updates approval status to 'approved', emits an 'approve' event for downstream processing, notifies the user
- **Idempotency**: Duplicate callbacks are silently ignored (no-ops) — prevents duplicate processing if a user clicks multiple times
- **Error Handling**: Network errors and malformed responses trigger a 5-second backoff and retry; the poller never crashes
- Requires environment variable: `TELEGRAM_BOT_TOKEN`

**Resume Approval Handler**:
```typescript
import { runApprovalHandler } from './job-hunter/resume/approvalHandler';
import { runCallbackPoller } from './job-hunter/telegram/callbackHandler';
import { EventEmitter } from 'events';
import Database from 'better-sqlite3';

const db = new Database('jobs.db');
const emitter = new EventEmitter();

// Set up the approval handler to listen for approve events
// When a user clicks the Approve button, the handler will:
// 1. Invoke the resume tailor CLI with the job details
// 2. Generate resume and cover letter PDFs
// 3. Send both PDFs to the user via Telegram
// 4. Record the submission in the applications table
runApprovalHandler(db, emitter);

// Start the callback poller to listen for user button clicks
const signal = new AbortController().signal;
const result = await runCallbackPoller(db, emitter, undefined, signal);
```

The approval handler:
- Listens for 'approve' events emitted by the callback poller
- Spawns the resume tailor CLI as a child process with the job details and posting URL
- Waits up to 120 seconds for PDF generation to complete
- Sends both resume and cover letter PDFs via Telegram with caption 'Resume and cover letter for {title} at {company}'
- Records successful submissions with status 'pdfs_sent' in the applications table
- On partial failure (e.g., resume sent but cover letter send failed), records a 'partial_send' status to prevent duplicate resumes on retry
- Requires environment variables: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
- Requires the compiled resume tailor CLI at `dist/resume-cli/resume/cli/resumeTailor.js` (built via `npm run build`)

**Auto-Apply Engine**:
```typescript
import { runApplyEngine } from './job-hunter/apply/engine';
import { getApprovedApplications } from './job-hunter/db';
import Database from 'better-sqlite3';

const db = new Database('jobs.db');

// Auto-submit applications to Greenhouse or Lever ATS
const approved = getApprovedApplications(db);
for (const app of approved) {
  const job = getJobById(db, app.job_id);
  await runApplyEngine(
    db,
    process.env.TELEGRAM_BOT_TOKEN!,
    process.env.TELEGRAM_CHAT_ID!,
    job.id,
    './generated/resume.pdf',
    './generated/cover_letter.pdf',
    {
      firstName: 'Your',
      lastName: 'Name',
      email: 'your.email@example.com',
    },
  );
}
```

The apply engine:
- **Greenhouse ATS**: POSTs to `https://boards-api.greenhouse.io/v1/applications` with multipart form containing name, email, job ID, and resume PDF
- **Lever ATS**: POSTs to `https://api.lever.co/v0/postings/{id}/apply` with JSON-formatted applicant data and resume PDF
- **On success (HTTP 200/201)**: Records application with result='submitted' and sends Telegram confirmation message
- **On ATS failure**: Gracefully falls back to manual application mode: sends message with direct job URL and attaches both resume and cover letter PDFs for manual submission
- **On unknown ATS type**: Defaults to manual fallback mode (applies to job boards without API integration)
- **Error Resilience**: Telegram notification failures are logged but don't block the application record — ensures data integrity even if notifications fail
- Requires environment variables: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`

### Complete Job Hunter Pipeline

End-to-end workflow (typically run hourly or daily via cron):

1. **Discover**: Fetch fresh job listings from configured Greenhouse boards
2. **Store**: Upsert jobs into the database
3. **Score**: Run Claude AI to score each job (6+ eligible for notification)
4. **Notify**: Send high-scoring jobs to Telegram with Approve/Deny buttons
5. **Listen**: Poll for user button clicks via Telegram callback handler
6. **Generate**: On approval, spawn resume tailor CLI to generate customized PDFs
7. **Send PDFs**: Transmit resume and cover letter to user via Telegram
8. **Auto-apply**: Submit application directly to ATS or request manual submission as fallback

### Database Schema

- **jobs**: Core job listings (source, title, company, URL, salary, posted date)
- **scores**: AI-generated relevance scores and rationale
- **approvals**: Manual approval status (pending/approved/denied)
- **applications**: Submission tracking and results

### Testing

Run job-hunter tests:
```sh
npm run test:job-hunter
```

Tests include:
- Greenhouse board polling with multiple company sources
- Response shape validation and error handling
- Per-company error isolation and partial failure recovery
- Database repository CRUD operations
- SQLite foreign key constraint enforcement

##�📦 Deployment

The site is configured for Netlify deployment:
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 20

The build automatically runs tests before creating the production bundle.

### Job Hunter Daemon (PM2)

The job-hunter daemon runs the complete end-to-end job discovery and application pipeline on a schedule.

**Local Testing:**
```sh
# Run one immediate cycle (useful for testing)
npm run job-hunter:now

# Or using tsx directly with --run-now flag
npm run job-hunter -- --run-now
```

**Production Deployment with PM2:**

1. **Install PM2 globally** (if not already installed):
```sh
npm install -g pm2
```

2. **Set environment variables**:
```sh
# Required for Telegram notifications and approval flow
export TELEGRAM_BOT_TOKEN="your-bot-token-here"
export TELEGRAM_CHAT_ID="your-chat-id-here"

# Optional: customize database location (defaults to ./job-hunter.db)
export JOB_HUNTER_DB="/home/lobsterdog/.local/share/job-hunter/jobs.db"
```

3. **Start the daemon**:
```sh
pm2 start ecosystem.config.cjs
pm2 save        # Save process state for auto-restart on reboot
pm2 startup     # Generate systemd unit to auto-start on boot
```

4. **Monitor and manage**:
```sh
pm2 logs job-hunter        # View live logs
pm2 status job-hunter      # Check process status
pm2 restart job-hunter     # Restart the daemon
pm2 stop job-hunter        # Stop the daemon
pm2 delete job-hunter      # Remove from PM2
```

**One-shot test run via PM2:**
```sh
pm2 start ecosystem.config.cjs --only job-hunter --env production -- --run-now
```

**Configuration:**

The ecosystem.config.cjs file defines:
- **Process name:** `job-hunter`
- **Script runner:** `tsx` (TypeScript executor, no separate compile step)
- **Concurrency:** 1 instance (single daemon)
- **Restart:** Automatic on crash
- **Memory limit:** 200MB (restart if exceeded)
- **Logs:** Merged stdout/stderr to `logs/job-hunter-{out,error}.log`

**Daily Schedule:**

The daemon automatically runs the complete pipeline daily at **08:00 UTC**:
1. Fetch fresh job listings from configured Greenhouse boards
2. Store new jobs in SQLite database
3. Score each job with Claude AI
4. Notify via Telegram for high-scoring matches
5. Listen for user button clicks (approve/deny)
6. Generate tailored resume on approval
7. Send PDFs to user
8. Auto-submit applications to ATS or request manual submission

**Graceful Shutdown:**

The daemon handles SIGTERM and SIGINT gracefully:
- Stops the cron scheduler
- Closes the database connection properly (WAL checkpoint)
- Aborts in-flight requests
- Removes Telegram polling listeners
- Exits cleanly without forcing PM2 to SIGKILL