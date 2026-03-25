import Database from 'better-sqlite3';
import type {
  Job,
  Score,
  Approval,
  Application,
  JobInput,
  ScoreInput,
  ApprovalInput,
  ApplicationInput,
} from './types';

// ─── Jobs ─────────────────────────────────────────────────────────────────────

/**
 * Insert a job or update it if the (source, external_id) pair already exists.
 *
 * Deduplication key: (source, external_id).
 * On conflict, all mutable fields are updated; `id` and `blacklisted` are preserved.
 * `fetched_at` is always set to the current time.
 *
 * Returns the full persisted row.
 */
export function upsertJob(db: Database.Database, input: JobInput): Job {
  const fetched_at = new Date().toISOString();
  db.prepare(`
    INSERT INTO jobs (source, ats_type, external_id, title, company, url, salary_raw, posted_at, fetched_at, blacklisted)
    VALUES (@source, @ats_type, @external_id, @title, @company, @url, @salary_raw, @posted_at, @fetched_at, 0)
    ON CONFLICT(source, external_id) DO UPDATE SET
      ats_type   = excluded.ats_type,
      title      = excluded.title,
      company    = excluded.company,
      url        = excluded.url,
      salary_raw = excluded.salary_raw,
      posted_at  = excluded.posted_at,
      fetched_at = excluded.fetched_at
  `).run({
    ...input,
    salary_raw: input.salary_raw ?? null,
    posted_at:  input.posted_at ?? null,
    fetched_at,
  });
  return db.prepare('SELECT * FROM jobs WHERE source = ? AND external_id = ?')
    .get(input.source, input.external_id) as Job;
}

/** Retrieve a job by its primary key. Returns `undefined` if not found. */
export function getJobById(db: Database.Database, id: number): Job | undefined {
  return db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Job | undefined;
}

/**
 * List jobs, optionally filtered by blacklist status.
 * When `opts.blacklisted` is omitted, all jobs are returned.
 */
export function listJobs(db: Database.Database, opts: { blacklisted?: boolean } = {}): Job[] {
  if (opts.blacklisted !== undefined) {
    return db.prepare('SELECT * FROM jobs WHERE blacklisted = ?').all(opts.blacklisted ? 1 : 0) as Job[];
  }
  return db.prepare('SELECT * FROM jobs').all() as Job[];
}

/** Mark a job as blacklisted. Silently does nothing if the id does not exist. */
export function blacklistJob(db: Database.Database, id: number): void {
  db.prepare('UPDATE jobs SET blacklisted = 1 WHERE id = ?').run(id);
}

// ─── Scores ───────────────────────────────────────────────────────────────────

/**
 * Return all non-blacklisted jobs that have no score record yet.
 * These are the jobs that the scoring pipeline should process next.
 */
export function getUnscoredJobs(db: Database.Database): Job[] {
  return db.prepare(`
    SELECT j.* FROM jobs j
    LEFT JOIN scores s ON s.job_id = j.id
    WHERE s.job_id IS NULL AND j.blacklisted = 0
  `).all() as Job[];
}

/**
 * Record a score for a job. Throws if `job_id` does not reference an existing job
 * (foreign-key enforcement must be enabled on the connection for the throw to surface).
 *
 * Returns the persisted score row.
 */
export function addScore(db: Database.Database, input: ScoreInput): Score {
  const scored_at = new Date().toISOString();
  db.prepare(`
    INSERT INTO scores (job_id, score, rationale, scored_at) VALUES (?, ?, ?, ?)
  `).run(input.job_id, input.score, input.rationale, scored_at);
  return db.prepare('SELECT * FROM scores WHERE job_id = ?').get(input.job_id) as Score;
}

/** Retrieve the score for a job. Returns `undefined` if no score exists yet. */
export function getScore(db: Database.Database, jobId: number): Score | undefined {
  return db.prepare('SELECT * FROM scores WHERE job_id = ?').get(jobId) as Score | undefined;
}

// ─── Approvals ────────────────────────────────────────────────────────────────

/**
 * Return all jobs that have an approval record with status = 'pending'.
 * Jobs with no approval row are not included.
 */
export function getPendingApprovals(db: Database.Database): Job[] {
  return db.prepare(`
    SELECT j.* FROM jobs j
    INNER JOIN approvals a ON a.job_id = j.id
    WHERE a.status = 'pending'
  `).all() as Job[];
}

/**
 * Create or update the approval record for a job.
 * `actioned_at` is set to the current time when status is 'approved' or 'denied';
 * it is cleared (NULL) when status is 'pending'.
 *
 * Returns the persisted approval row.
 */
export function upsertApproval(db: Database.Database, input: ApprovalInput): Approval {
  const actioned_at = input.status !== 'pending' ? new Date().toISOString() : null;
  db.prepare(`
    INSERT INTO approvals (job_id, status, actioned_at)
    VALUES (?, ?, ?)
    ON CONFLICT(job_id) DO UPDATE SET
      status      = excluded.status,
      actioned_at = excluded.actioned_at
  `).run(input.job_id, input.status, actioned_at);
  return db.prepare('SELECT * FROM approvals WHERE job_id = ?').get(input.job_id) as Approval;
}

/** Retrieve the approval record for a job. Returns `undefined` if none exists. */
export function getApproval(db: Database.Database, jobId: number): Approval | undefined {
  return db.prepare('SELECT * FROM approvals WHERE job_id = ?').get(jobId) as Approval | undefined;
}

// ─── Applications ─────────────────────────────────────────────────────────────

/**
 * Record that an application was submitted for a job.
 * Returns the persisted application row.
 */
export function addApplication(db: Database.Database, input: ApplicationInput): Application {
  db.prepare(`
    INSERT INTO applications (job_id, method, submitted_at, result) VALUES (?, ?, ?, ?)
  `).run(input.job_id, input.method, input.submitted_at, input.result ?? null);
  return db.prepare('SELECT * FROM applications WHERE job_id = ?').get(input.job_id) as Application;
}

/** Retrieve the application record for a job. Returns `undefined` if none exists. */
export function getApplication(db: Database.Database, jobId: number): Application | undefined {
  return db.prepare('SELECT * FROM applications WHERE job_id = ?').get(jobId) as Application | undefined;
}
