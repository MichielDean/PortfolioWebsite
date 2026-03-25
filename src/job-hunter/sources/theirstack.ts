import type { JobInput } from '../db/types';
import { TARGET_ROLES } from '../config';

const API_URL = 'https://api.theirstack.com/v1/jobs/search';

export const MAX_PAGES = 50;

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

// salary_raw is "min-max", "min", "max", or null depending on which salary fields are present.
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

// Requires THEIRSTACK_API_KEY. Fetches remote-only jobs posted in the last day for TARGET_ROLES,
// paginating to exhaustion.
export async function fetchTheirStackJobs(): Promise<JobInput[]> {
  const apiKey = process.env.THEIRSTACK_API_KEY;
  if (!apiKey) {
    throw new Error('THEIRSTACK_API_KEY environment variable is not set');
  }

  const all: JobInput[] = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages && page < MAX_PAGES) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_title_or: TARGET_ROLES,
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

    const raw = (await response.json()) as { data?: unknown; metadata?: { total_pages?: unknown } };
    if (!Array.isArray(raw.data) || typeof raw.metadata?.total_pages !== 'number') {
      throw new Error('Unexpected TheirStack response shape');
    }
    const data = raw as unknown as TheirStackResponse;
    all.push(...data.data.map(normalizeJob));
    totalPages = data.metadata.total_pages;
    page++;
  }

  if (totalPages > MAX_PAGES) {
    console.warn(
      `TheirStack: pagination truncated at MAX_PAGES=${MAX_PAGES}; API reported total_pages=${totalPages}`,
    );
  }

  return all;
}
