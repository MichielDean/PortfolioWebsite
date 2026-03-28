import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type Database from 'better-sqlite3';
import type { JobInput } from './db/types';

function execFileAsync(file: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(file, args, (err, stdout, stderr) => {
      if (stderr) { console.warn('[ingest.py stderr]', stderr.trim()); }
      if (err) { reject(err); return; }
      resolve(stdout);
    });
  });
}

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
 * Returns the Python interpreter to use for running ingest.py.
 * Resolution order:
 *   1. INGEST_PYTHON env var (if set)
 *   2. ~/.venv/jobhunter-sys/bin/python3 (if present on disk)
 *   3. 'python3' system fallback
 *
 * The venv is preferred because jobspy's regex wheel fails to build on
 * Python 3.14+; the venv is expected to use Python 3.13.
 */
export function resolveInterpreter(): string {
  if (process.env.INGEST_PYTHON) {
    return process.env.INGEST_PYTHON;
  }
  const venvPython = path.join(
    os.homedir(),
    '.venv',
    'jobhunter-sys',
    'bin',
    'python3',
  );
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  return 'python3';
}

/**
 * Run the Python ingest.py scraper as a subprocess, passing the database path
 * as the first argument. Parses "Inserted X, skipped Y" from stdout and
 * returns the counts. Propagates non-zero exit as a rejection.
 */
export async function runIngestion(
  _db: Database.Database,
  dbPath: string,
): Promise<IngestionResult> {
  const scriptPath = path.join(__dirname, 'sources', 'ingest.py');
  const interpreter = resolveInterpreter();
  const stdout = await execFileAsync(interpreter, [scriptPath, dbPath]);

  const match = stdout.match(/Inserted (\d+), skipped (\d+)/);
  if (!match) {
    throw new Error(`Unexpected output from ingest.py: ${stdout.trim()}`);
  }

  return {
    inserted: parseInt(match[1], 10),
    skipped: parseInt(match[2], 10),
  };
}
