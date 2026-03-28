import type Database from 'better-sqlite3';
import type { JobInput } from './db/types';
import { fetchGreenhouseJobs } from './sources/greenhouse';
import { GREENHOUSE_WATCHLIST } from './sources/greenhouse.config';

/** Normalized form accepted by ingestJobs(). */
export type NormalizedJob = JobInput;

export interface IngestionResult {
  inserted: number;
  skipped: number;
}

/**
 * Ingest an array of normalized jobs into the database.
 *
 * For each job:
 *  - Skips duplicates: (source, external_id) already exists in the jobs table.
 *  - Skips blacklisted companies: any existing job from the same company has
 *    blacklisted = 1.
 *  - Inserts net-new jobs from non-blacklisted companies with blacklisted = 0.
 *
 * Returns counts of inserted and skipped jobs.
 */
export async function ingestJobs(
  db: Database.Database,
  jobs: NormalizedJob[],
): Promise<IngestionResult> {
  const checkExists = db.prepare(
    'SELECT 1 FROM jobs WHERE source = ? AND external_id = ?',
  );
  const checkCompanyBlacklisted = db.prepare(
    'SELECT 1 FROM jobs WHERE company = ? AND blacklisted = 1 LIMIT 1',
  );
  const insertJob = db.prepare(`
    INSERT INTO jobs (source, ats_type, external_id, title, company, url, salary_raw, posted_at, fetched_at, blacklisted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);

  let inserted = 0;
  let skipped = 0;

  db.transaction(() => {
    for (const job of jobs) {
      if (checkExists.get(job.source, job.external_id)) {
        skipped++;
        continue;
      }

      if (checkCompanyBlacklisted.get(job.company)) {
        skipped++;
        continue;
      }

      insertJob.run(
        job.source,
        job.ats_type,
        job.external_id,
        job.title,
        job.company,
        job.url,
        job.salary_raw ?? null,
        job.posted_at ?? null,
        new Date().toISOString(),
      );
      inserted++;
    }
  })();

  return { inserted, skipped };
}

/**
 * Fetch jobs from Greenhouse, then ingest them into the DB.
 * Returns aggregated inserted/skipped counts.
 */
export async function runIngestion(db: Database.Database): Promise<IngestionResult> {
  const results = await Promise.allSettled([
    fetchGreenhouseJobs(GREENHOUSE_WATCHLIST),
  ]);

  for (const r of results) {
    if (r.status === 'rejected') {
      console.warn('Job source fetch failed:', r.reason);
    }
  }

  const jobs = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  return ingestJobs(db, jobs);
}
