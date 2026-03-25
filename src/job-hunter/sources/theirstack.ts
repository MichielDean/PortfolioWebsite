import type { JobInput } from '../db/types';

const API_URL = 'https://api.theirstack.com/v1/jobs/search';

const JOB_TITLES = [
  'Director of Engineering',
  'Senior Engineering Manager',
  'VP of Engineering',
  'VP of QA',
];

// ─── TheirStack API shapes ────────────────────────────────────────────────────

export interface TheirStackJob {
  id: string | number;
  job_title: string;
  company_name: string;
  url: string;
  min_annual_salary?: number | null;
  max_annual_salary?: number | null;
  date_posted?: string | null;
}

interface TheirStackResponse {
  data: TheirStackJob[];
  metadata: {
    total_results: number;
    page: number;
    total_pages: number;
  };
}

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Map a raw TheirStack job to the internal JobInput shape.
 *
 * salary_raw is formatted as "min-max", "min", "max", or null depending on
 * which salary fields are present in the source record.
 */
export function normalizeJob(job: TheirStackJob): JobInput {
  let salary_raw: string | null = null;
  if (job.min_annual_salary != null && job.max_annual_salary != null) {
    salary_raw = `${job.min_annual_salary}-${job.max_annual_salary}`;
  } else if (job.min_annual_salary != null) {
    salary_raw = String(job.min_annual_salary);
  } else if (job.max_annual_salary != null) {
    salary_raw = String(job.max_annual_salary);
  }

  return {
    source: 'theirstack',
    ats_type: 'unknown',
    external_id: String(job.id),
    title: job.job_title,
    company: job.company_name,
    url: job.url,
    salary_raw,
    posted_at: job.date_posted ?? null,
  };
}

// ─── API client ───────────────────────────────────────────────────────────────

/**
 * Fetch all matching jobs from TheirStack, paginating to exhaustion.
 *
 * Requires THEIRSTACK_API_KEY to be set in the environment.
 * Query is scoped to remote-only jobs posted in the last day, filtered to the
 * four target job titles.
 *
 * Returns an array of normalized JobInput values ready for upsert.
 */
export async function fetchTheirStackJobs(): Promise<JobInput[]> {
  const apiKey = process.env.THEIRSTACK_API_KEY;
  if (!apiKey) {
    throw new Error('THEIRSTACK_API_KEY environment variable is not set');
  }

  const all: JobInput[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_title_or: JOB_TITLES,
        remote: true,
        posted_at_max_age_days: 1,
        page,
        limit: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `TheirStack API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as TheirStackResponse;
    all.push(...data.data.map(normalizeJob));
    totalPages = data.metadata.total_pages;
    page++;
  }

  return all;
}
