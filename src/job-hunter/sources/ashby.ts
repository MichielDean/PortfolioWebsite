import type { JobInput } from '../db/types';
import { matchesTargetRole } from '../config';
import { ASHBY_WATCHLIST } from './sources.config';

const API_BASE_URL = 'https://api.ashbyhq.com/posting-api/job-board';

export interface AshbyCompensation {
  compensationTierSummary?: string | null;
}

export interface AshbyJob {
  id: string;
  title: string;
  publishedAt?: string | null;
  jobUrl: string;
  isRemote?: boolean | null;
  location?: string | null;
  compensation?: AshbyCompensation | null;
}

export interface AshbyJobBoardResponse {
  jobs: AshbyJob[];
}

// Skips malformed listings to prevent null-dereference in isRemote().
export function isValidAshbyJobShape(element: unknown): element is AshbyJob {
  if (typeof element !== 'object' || element === null) return false;
  const e = element as Record<string, unknown>;
  return typeof e.id === 'string' && typeof e.title === 'string' && typeof e.jobUrl === 'string';
}

export function isRemote(job: Pick<AshbyJob, 'isRemote' | 'location'>): boolean {
  return job.isRemote === true || /remote/i.test(job.location ?? '');
}

export function normalizeJob(job: AshbyJob, company: string): JobInput {
  return {
    source: 'ashby',
    ats_type: 'ashby',
    external_id: job.id,
    title: job.title,
    company,
    url: job.jobUrl,
    salary_raw: job.compensation?.compensationTierSummary ?? null,
    posted_at: job.publishedAt ?? null,
  };
}

// Per-company failures are logged and skipped — one bad board does not discard results from others.
export async function fetchAshbyJobs(
  watchlist: string[] = ASHBY_WATCHLIST,
): Promise<JobInput[]> {
  const all: JobInput[] = [];

  for (const boardName of watchlist) {
    try {
      const response = await fetch(`${API_BASE_URL}/${boardName}`);

      if (!response.ok) {
        console.warn(
          `Ashby: skipping ${boardName} — ${response.status} ${response.statusText}`,
        );
        continue;
      }

      const page = (await response.json()) as AshbyJobBoardResponse;

      if (!Array.isArray(page.jobs)) {
        console.warn(`Ashby: skipping ${boardName} — unexpected response shape`);
        continue;
      }

      const matched = page.jobs
        .filter(isValidAshbyJobShape)
        .filter((job) => matchesTargetRole(job.title) && isRemote(job));
      all.push(...matched.map((job) => normalizeJob(job, boardName)));
    } catch (err) {
      console.warn(`Ashby: skipping ${boardName} — ${(err as Error).message}`);
    }
  }

  return all;
}
