import type { JobInput } from '../db/types';
import { GREENHOUSE_WATCHLIST, TARGET_ROLES } from './greenhouse.config';

const API_BASE = 'https://boards-api.greenhouse.io/v1/boards';

export interface GreenhouseJob {
  id: number;
  title: string;
  location: { name: string };
  content: string;
  updated_at: string;
  absolute_url: string;
}

// Returns true if the title contains any target role string (case-insensitive).
export function matchesTargetRole(title: string, roles: string[] = TARGET_ROLES): boolean {
  const lower = title.toLowerCase();
  return roles.some((role) => lower.includes(role.toLowerCase()));
}

// Returns true if the job location name or content mentions "remote" (case-insensitive).
export function isRemote(job: Pick<GreenhouseJob, 'location' | 'content'>): boolean {
  return /remote/i.test(job.location.name) || /remote/i.test(job.content);
}

// Normalizes a Greenhouse job to the internal JobInput shape.
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

// Fetches jobs from all Greenhouse board tokens in the watchlist,
// filtering for target roles and remote positions.
export async function fetchGreenhouseJobs(
  watchlist: string[] = GREENHOUSE_WATCHLIST,
): Promise<JobInput[]> {
  const all: JobInput[] = [];

  for (const token of watchlist) {
    const url = `${API_BASE}/${token}/jobs?content=true`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Greenhouse API error for ${token}: ${response.status} ${response.statusText}`,
      );
    }

    const { jobs } = (await response.json()) as { jobs?: unknown };
    if (!Array.isArray(jobs)) {
      throw new Error(`Unexpected Greenhouse response shape for ${token}`);
    }

    const matched = (jobs as GreenhouseJob[]).filter(
      (job) => matchesTargetRole(job.title) && isRemote(job),
    );
    all.push(...matched.map((job) => normalizeJob(job, token)));
  }

  return all;
}
