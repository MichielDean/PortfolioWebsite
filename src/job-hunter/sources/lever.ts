import type { JobInput } from '../db/types';
import { TARGET_ROLES } from '../config';
import { LEVER_WATCHLIST } from './sources.config';

const API_BASE = 'https://api.lever.co/v0/postings';
const PAGE_LIMIT = 100;

export interface LeverCategories {
  location?: string;
  commitment?: string;
  department?: string;
  team?: string;
}

export interface LeverListItem {
  text: string;
  content: string;
}

export interface LeverJob {
  id: string;
  text: string;
  categories: LeverCategories;
  description: string;
  lists?: LeverListItem[];
  hostedUrl: string;
  createdAt: number;
}

export interface LeverApiPage {
  data: LeverJob[];
  hasNext: boolean;
  next?: string;
}

// Skips malformed listings to prevent null-dereference in isRemote().
export function isValidLeverJobShape(element: unknown): element is LeverJob {
  if (typeof element !== 'object' || element === null) return false;
  const e = element as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.text === 'string' &&
    typeof e.hostedUrl === 'string' &&
    typeof e.categories === 'object' &&
    e.categories !== null
  );
}

export function matchesTargetRole(title: string, roles: string[] = TARGET_ROLES): boolean {
  const lower = title.toLowerCase();
  return roles.some((role) => lower.includes(role.toLowerCase()));
}

export function isRemote(job: Pick<LeverJob, 'categories' | 'description'>): boolean {
  const location = (job.categories as LeverCategories).location ?? '';
  return /remote/i.test(location) || /remote/i.test(job.description);
}

function extractSalaryRaw(job: LeverJob): string | null {
  if (!Array.isArray(job.lists)) return null;
  const salaryItem = job.lists.find((item) =>
    /salary|compensation|pay/i.test(item.text),
  );
  return salaryItem?.content ?? null;
}

export function normalizeJob(job: LeverJob, company: string): JobInput {
  return {
    source: 'lever',
    ats_type: 'lever',
    external_id: job.id,
    title: job.text,
    company,
    url: job.hostedUrl,
    salary_raw: extractSalaryRaw(job),
    posted_at: job.createdAt != null ? new Date(job.createdAt).toISOString() : null,
  };
}

// Per-company failures are logged and skipped — one bad posting board does not discard results from others.
export async function fetchLeverJobs(
  watchlist: string[] = LEVER_WATCHLIST,
): Promise<JobInput[]> {
  const all: JobInput[] = [];

  for (const company of watchlist) {
    try {
      let hasNext = true;
      let cursor: string | undefined;

      while (hasNext) {
        const params = new URLSearchParams({ mode: 'json', limit: String(PAGE_LIMIT) });
        if (cursor) params.set('offset', cursor);

        const url = `${API_BASE}/${company}?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
          console.warn(
            `Lever: skipping ${company} — ${response.status} ${response.statusText}`,
          );
          break;
        }

        const page = (await response.json()) as LeverApiPage;

        if (!Array.isArray(page.data)) {
          console.warn(`Lever: skipping ${company} — unexpected response shape`);
          break;
        }

        const matched = page.data
          .filter(isValidLeverJobShape)
          .filter((job) => matchesTargetRole(job.text) && isRemote(job));
        all.push(...matched.map((job) => normalizeJob(job, company)));

        hasNext = page.hasNext ?? false;
        cursor = page.next;
      }
    } catch (err) {
      console.warn(`Lever: skipping ${company} — ${(err as Error).message}`);
    }
  }

  return all;
}
