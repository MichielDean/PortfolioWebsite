
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
- **Multiple Job Sources**: Integrates with both TheirStack API and Greenhouse job boards
- **Remote Job Filtering**: Automatically fetches remote engineering positions (Director of Engineering, Senior Engineering Manager, VP of Engineering, VP of QA)
- **SQLite Database**: Persistent storage for jobs, scores, approvals, and application tracking
- **Daily Updates**: Configurable to fetch jobs posted in the last X days (defaults to 1 day)
- **Pagination**: Safely handles large result sets with built-in guardrails (MAX_PAGES=50)
- **Response Validation**: Validates external API responses before processing
- **Partial Failure Resilience**: Company board failures don't discard results from other sources

### Setup

1. **Get a TheirStack API Key**:
   - Sign up at [TheirStack](https://theirstack.com)
   - Generate an API key from your account settings

2. **Configure Environment**:
```sh
export THEIRSTACK_API_KEY="your-api-key-here"
```

3. **Configure Greenhouse Watchlist** (Optional):
   Edit `src/job-hunter/sources/greenhouse.config.ts` to add company board tokens:
```typescript
export const GREENHOUSE_WATCHLIST: string[] = [
  'stripe',    // Stripe careers board
  'notion',    // Notion careers board
  // Add more company tokens as needed
];
```
   The watchlist can be extended without code changes — just add new tokens to the array.

### Usage

**Fetch jobs from TheirStack**:
```typescript
import { fetchTheirStackJobs } from './job-hunter/sources/theirstack';

const jobs = await fetchTheirStackJobs();
// Returns normalized array of JobInput objects
```

**Fetch jobs from Greenhouse**:
```typescript
import { fetchGreenhouseJobs } from './job-hunter/sources/greenhouse';

const jobs = await fetchGreenhouseJobs();
// Returns normalized array of JobInput objects from all configured boards
// Automatically filters for remote positions in target roles
```

**Combine Multiple Sources**:
```typescript
import { fetchTheirStackJobs } from './job-hunter/sources/theirstack';
import { fetchGreenhouseJobs } from './job-hunter/sources/greenhouse';

const [theirStackJobs, greenhouseJobs] = await Promise.all([
  fetchTheirStackJobs(),
  fetchGreenhouseJobs(),
]);
const allJobs = [...theirStackJobs, ...greenhouseJobs];
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
- TheirStack API client mocking and pagination validation
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