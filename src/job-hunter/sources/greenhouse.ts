import type { JobInput } from '../db/types';
import { GREENHOUSE_WATCHLIST } from './greenhouse.config';
import { matchesTargetRole } from '../config';

const API_BASE = 'https://boards-api.greenhouse.io/v1/boards';

export interface GreenhouseJob {
  id: number;
  title: string;
  location: { name: string };
  content: string;
  updated_at: string;
  absolute_url: string;
}

// Skips malformed/draft listings to prevent null-dereference in isRemote().
function isValidGreenhouseJobShape(element: unknown): element is GreenhouseJob {
  if (typeof element !== 'object' || element === null) return false;
  const e = element as Record<string, unknown>;
  return (
    (typeof e.id === 'number' || typeof e.id === 'string') &&
    typeof e.title === 'string' &&
    typeof e.content === 'string' &&
    typeof e.absolute_url === 'string' &&
    typeof e.location === 'object' &&
    e.location !== null &&
    typeof (e.location as Record<string, unknown>).name === 'string'
  );
}

export function isRemote(job: Pick<GreenhouseJob, 'location' | 'content'>): boolean {
  return /remote/i.test(job.location.name) || /remote/i.test(job.content);
}

export function normalizeJob(job: GreenhouseJob, company: string): JobInput {
  return {
    source: 'greenhouse',
    ats_type: 'greenhouse',
    external_id: String(job.id),
    title: job.title,
    company,
    url: job.absolute_url,
    salary_raw: null,
    posted_at: job.updated_at ?? null,
  };
}

// Per-company failures are logged and skipped — one bad board does not discard results from others.
export async function fetchGreenhouseJobs(
  watchlist: string[] = GREENHOUSE_WATCHLIST,
): Promise<JobInput[]> {
  const all: JobInput[] = [];

  for (const token of watchlist) {
    try {
      const url = `${API_BASE}/${token}/jobs?content=true`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(
          `Greenhouse: skipping ${token} — ${response.status} ${response.statusText}`,
        );
        continue;
      }

      const { jobs } = (await response.json()) as { jobs?: unknown };
      if (!Array.isArray(jobs)) {
        console.warn(`Greenhouse: skipping ${token} — unexpected response shape`);
        continue;
      }

      const matched = jobs
        .filter(isValidGreenhouseJobShape)
        .filter((job) => matchesTargetRole(job.title) && isRemote(job));
      all.push(...matched.map((job) => normalizeJob(job, token)));
    } catch (err) {
      console.warn(`Greenhouse: skipping ${token} — ${(err as Error).message}`);
    }
  }

  return all;
}
