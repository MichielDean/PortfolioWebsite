/**
 * Tests for the job-hunter SQLite repository layer.
 *
 * All tests use an in-memory database so they are fast, isolated, and
 * deterministic — no filesystem side-effects.
 *
 * Structure follows Given / When / Then thinking:
 *   Given: a fresh in-memory DB with migrations applied
 *   When:  a repository function is called
 *   Then:  the returned value and DB state match expectations
 */

import Database from 'better-sqlite3';
import { runMigrations } from '../../job-hunter/db/migrations';
import {
  upsertJob,
  getJobById,
  listJobs,
  blacklistJob,
  getUnscoredJobs,
  addScore,
  getScore,
  getPendingApprovals,
  upsertApproval,
  getApproval,
  addApplication,
  getApplication,
} from '../../job-hunter/db/repository';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  runMigrations(db);
  db.pragma('foreign_keys = ON');
  return db;
}

const jobA = {
  source: 'linkedin',
  ats_type: 'greenhouse' as const,
  external_id: 'job-001',
  title: 'Software Engineer',
  company: 'Acme Corp',
  url: 'https://acme.com/jobs/001',
};

const jobB = {
  source: 'indeed',
  ats_type: 'lever' as const,
  external_id: 'job-002',
  title: 'Senior Engineer',
  company: 'Globex',
  url: 'https://globex.com/jobs/002',
};

// ─── runMigrations() ──────────────────────────────────────────────────────────

describe('runMigrations()', () => {
  it('creates all four tables', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain('jobs');
    expect(names).toContain('scores');
    expect(names).toContain('approvals');
    expect(names).toContain('applications');
  });

  it('is idempotent — calling twice does not throw', () => {
    const db = new Database(':memory:');
    expect(() => {
      runMigrations(db);
      runMigrations(db);
    }).not.toThrow();
  });

  it('enables foreign key enforcement', () => {
    const db = makeDb();
    const result = db.pragma('foreign_keys', { simple: true });
    expect(result).toBe(1);
  });

  it('enforces UNIQUE constraint on (source, external_id)', () => {
    const db = makeDb();
    db.prepare(
      "INSERT INTO jobs (source, ats_type, external_id, title, company, url, fetched_at, blacklisted) VALUES ('s','greenhouse','e','T','C','http://x','now',0)"
    ).run();
    expect(() =>
      db.prepare(
        "INSERT INTO jobs (source, ats_type, external_id, title, company, url, fetched_at, blacklisted) VALUES ('s','greenhouse','e','T2','C2','http://y','now',0)"
      ).run()
    ).toThrow();
  });
});

// ─── upsertJob() ──────────────────────────────────────────────────────────────

describe('upsertJob()', () => {
  it('inserts a new job and returns it with a generated id', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    expect(job.id).toBeGreaterThan(0);
    expect(job.source).toBe('linkedin');
    expect(job.external_id).toBe('job-001');
    expect(job.blacklisted).toBe(0);
  });

  it('sets fetched_at to an ISO date string on insert', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    expect(job.fetched_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(job.fetched_at).getTime()).not.toBeNaN();
  });

  it('stores null for optional fields when not provided', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    expect(job.salary_raw).toBeNull();
    expect(job.posted_at).toBeNull();
  });

  it('stores optional fields when provided', () => {
    const db = makeDb();
    const job = upsertJob(db, { ...jobA, salary_raw: '$100k–$140k', posted_at: '2024-01-15' });
    expect(job.salary_raw).toBe('$100k–$140k');
    expect(job.posted_at).toBe('2024-01-15');
  });

  it('updates an existing job when (source, external_id) conflicts', () => {
    const db = makeDb();
    upsertJob(db, jobA);
    const updated = upsertJob(db, { ...jobA, title: 'Staff Engineer', company: 'Acme Plus' });
    expect(updated.title).toBe('Staff Engineer');
    expect(updated.company).toBe('Acme Plus');
  });

  it('preserves the same id when updating an existing job', () => {
    const db = makeDb();
    const first = upsertJob(db, jobA);
    const second = upsertJob(db, { ...jobA, title: 'Updated Title' });
    expect(second.id).toBe(first.id);
  });

  it('does not duplicate rows when upserting the same job twice', () => {
    const db = makeDb();
    upsertJob(db, jobA);
    upsertJob(db, jobA);
    const rows = listJobs(db);
    expect(rows).toHaveLength(1);
  });

  it('assigns distinct ids to different (source, external_id) pairs', () => {
    const db = makeDb();
    const a = upsertJob(db, jobA);
    const b = upsertJob(db, jobB);
    expect(a.id).not.toBe(b.id);
  });
});

// ─── getJobById() ─────────────────────────────────────────────────────────────

describe('getJobById()', () => {
  it('returns the job when it exists', () => {
    const db = makeDb();
    const inserted = upsertJob(db, jobA);
    const found = getJobById(db, inserted.id);
    expect(found).toBeDefined();
    expect(found!.external_id).toBe('job-001');
  });

  it('returns undefined when the id does not exist', () => {
    const db = makeDb();
    expect(getJobById(db, 9999)).toBeUndefined();
  });
});

// ─── listJobs() ───────────────────────────────────────────────────────────────

describe('listJobs()', () => {
  it('returns all jobs by default', () => {
    const db = makeDb();
    upsertJob(db, jobA);
    upsertJob(db, jobB);
    expect(listJobs(db)).toHaveLength(2);
  });

  it('returns empty array when there are no jobs', () => {
    const db = makeDb();
    expect(listJobs(db)).toHaveLength(0);
  });

  it('filters to blacklisted jobs when blacklisted=true', () => {
    const db = makeDb();
    const a = upsertJob(db, jobA);
    upsertJob(db, jobB);
    blacklistJob(db, a.id);
    const result = listJobs(db, { blacklisted: true });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(a.id);
  });

  it('filters to non-blacklisted jobs when blacklisted=false', () => {
    const db = makeDb();
    const a = upsertJob(db, jobA);
    upsertJob(db, jobB);
    blacklistJob(db, a.id);
    const result = listJobs(db, { blacklisted: false });
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('indeed');
  });
});

// ─── blacklistJob() ───────────────────────────────────────────────────────────

describe('blacklistJob()', () => {
  it('marks a job as blacklisted (blacklisted = 1)', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    blacklistJob(db, job.id);
    const updated = getJobById(db, job.id);
    expect(updated!.blacklisted).toBe(1);
  });

  it('does not affect other jobs', () => {
    const db = makeDb();
    const a = upsertJob(db, jobA);
    const b = upsertJob(db, jobB);
    blacklistJob(db, a.id);
    expect(getJobById(db, b.id)!.blacklisted).toBe(0);
  });
});

// ─── getUnscoredJobs() ────────────────────────────────────────────────────────

describe('getUnscoredJobs()', () => {
  it('returns all jobs when none have been scored', () => {
    const db = makeDb();
    upsertJob(db, jobA);
    upsertJob(db, jobB);
    expect(getUnscoredJobs(db)).toHaveLength(2);
  });

  it('excludes jobs that have been scored', () => {
    const db = makeDb();
    const a = upsertJob(db, jobA);
    upsertJob(db, jobB);
    addScore(db, { job_id: a.id, score: 85, rationale: 'Good match' });
    const unscored = getUnscoredJobs(db);
    expect(unscored).toHaveLength(1);
    expect(unscored[0].source).toBe('indeed');
  });

  it('excludes blacklisted jobs even when unscored', () => {
    const db = makeDb();
    const a = upsertJob(db, jobA);
    blacklistJob(db, a.id);
    expect(getUnscoredJobs(db)).toHaveLength(0);
  });

  it('returns empty array when all jobs are scored', () => {
    const db = makeDb();
    const a = upsertJob(db, jobA);
    addScore(db, { job_id: a.id, score: 90, rationale: 'Great fit' });
    expect(getUnscoredJobs(db)).toHaveLength(0);
  });

  it('returns empty array when there are no jobs', () => {
    const db = makeDb();
    expect(getUnscoredJobs(db)).toHaveLength(0);
  });
});

// ─── addScore() / getScore() ──────────────────────────────────────────────────

describe('addScore()', () => {
  it('creates a score record and returns it with scored_at', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    const score = addScore(db, { job_id: job.id, score: 77, rationale: 'Decent match' });
    expect(score.job_id).toBe(job.id);
    expect(score.score).toBe(77);
    expect(score.rationale).toBe('Decent match');
    expect(score.scored_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('stores fractional scores correctly', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    const score = addScore(db, { job_id: job.id, score: 92.5, rationale: 'Near-perfect' });
    expect(score.score).toBe(92.5);
  });

  it('upserts when called twice with the same job_id — updates score without duplicating rows', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    addScore(db, { job_id: job.id, score: 50, rationale: 'First pass' });
    const updated = addScore(db, { job_id: job.id, score: 75, rationale: 'Revised' });
    expect(updated.score).toBe(75);
    expect(updated.rationale).toBe('Revised');
    const count = (db.prepare('SELECT COUNT(*) as c FROM scores').get() as { c: number }).c;
    expect(count).toBe(1);
  });

  it('throws a foreign key error when job_id does not exist', () => {
    const db = makeDb();
    expect(() =>
      addScore(db, { job_id: 9999, score: 80, rationale: 'Orphan' })
    ).toThrow();
  });
});

describe('getScore()', () => {
  it('returns undefined when no score exists for the job', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    expect(getScore(db, job.id)).toBeUndefined();
  });

  it('returns the score after it has been added', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    addScore(db, { job_id: job.id, score: 60, rationale: 'Okay' });
    const score = getScore(db, job.id);
    expect(score).toBeDefined();
    expect(score!.score).toBe(60);
    expect(score!.rationale).toBe('Okay');
  });

  it('returns undefined for an id that was never inserted', () => {
    const db = makeDb();
    expect(getScore(db, 9999)).toBeUndefined();
  });
});

// ─── upsertApproval() / getApproval() ────────────────────────────────────────

describe('upsertApproval()', () => {
  it('creates a pending approval with null actioned_at', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    const approval = upsertApproval(db, { job_id: job.id, status: 'pending' });
    expect(approval.job_id).toBe(job.id);
    expect(approval.status).toBe('pending');
    expect(approval.actioned_at).toBeNull();
  });

  it('sets actioned_at to an ISO string when status is approved', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    const approval = upsertApproval(db, { job_id: job.id, status: 'approved' });
    expect(approval.status).toBe('approved');
    expect(approval.actioned_at).not.toBeNull();
    expect(approval.actioned_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('sets actioned_at when status is denied', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    const approval = upsertApproval(db, { job_id: job.id, status: 'denied' });
    expect(approval.actioned_at).not.toBeNull();
  });

  it('updates an existing approval record without creating a duplicate', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    upsertApproval(db, { job_id: job.id, status: 'pending' });
    const updated = upsertApproval(db, { job_id: job.id, status: 'approved' });
    expect(updated.status).toBe('approved');
    const count = (
      db.prepare('SELECT COUNT(*) as c FROM approvals').get() as { c: number }
    ).c;
    expect(count).toBe(1);
  });

  it('throws a foreign key error when job_id does not exist', () => {
    const db = makeDb();
    expect(() =>
      upsertApproval(db, { job_id: 9999, status: 'pending' })
    ).toThrow();
  });
});

describe('getApproval()', () => {
  it('returns undefined when no approval exists', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    expect(getApproval(db, job.id)).toBeUndefined();
  });

  it('returns the approval after it has been set', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    upsertApproval(db, { job_id: job.id, status: 'pending' });
    const approval = getApproval(db, job.id);
    expect(approval).toBeDefined();
    expect(approval!.status).toBe('pending');
  });
});

// ─── getPendingApprovals() ────────────────────────────────────────────────────

describe('getPendingApprovals()', () => {
  it('returns jobs whose approval status is pending', () => {
    const db = makeDb();
    const a = upsertJob(db, jobA);
    const b = upsertJob(db, jobB);
    upsertApproval(db, { job_id: a.id, status: 'pending' });
    upsertApproval(db, { job_id: b.id, status: 'approved' });
    const pending = getPendingApprovals(db);
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(a.id);
  });

  it('returns empty array when no approvals have status=pending', () => {
    const db = makeDb();
    const a = upsertJob(db, jobA);
    upsertApproval(db, { job_id: a.id, status: 'approved' });
    expect(getPendingApprovals(db)).toHaveLength(0);
  });

  it('does not include jobs with no approval record', () => {
    const db = makeDb();
    upsertJob(db, jobA); // no approval row
    expect(getPendingApprovals(db)).toHaveLength(0);
  });

  it('returns multiple pending jobs', () => {
    const db = makeDb();
    const a = upsertJob(db, jobA);
    const b = upsertJob(db, jobB);
    upsertApproval(db, { job_id: a.id, status: 'pending' });
    upsertApproval(db, { job_id: b.id, status: 'pending' });
    expect(getPendingApprovals(db)).toHaveLength(2);
  });
});

// ─── addApplication() / getApplication() ─────────────────────────────────────

describe('addApplication()', () => {
  it('creates an application record and returns it', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    const app = addApplication(db, {
      job_id: job.id,
      method: 'greenhouse',
      submitted_at: '2024-03-01T10:00:00.000Z',
    });
    expect(app.job_id).toBe(job.id);
    expect(app.method).toBe('greenhouse');
    expect(app.submitted_at).toBe('2024-03-01T10:00:00.000Z');
    expect(app.result).toBeNull();
  });

  it('stores the result field when provided', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    const app = addApplication(db, {
      job_id: job.id,
      method: 'manual',
      submitted_at: '2024-03-01T10:00:00.000Z',
      result: 'interviewed',
    });
    expect(app.result).toBe('interviewed');
  });

  it('stores null for result when not provided', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    const app = addApplication(db, {
      job_id: job.id,
      method: 'lever',
      submitted_at: '2024-03-01T10:00:00.000Z',
    });
    expect(app.result).toBeNull();
  });

  it('upserts when called twice with the same job_id — updates application without duplicating rows', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    addApplication(db, { job_id: job.id, method: 'greenhouse', submitted_at: '2024-03-01T10:00:00.000Z' });
    const updated = addApplication(db, { job_id: job.id, method: 'manual', submitted_at: '2024-03-02T12:00:00.000Z', result: 'rejected' });
    expect(updated.method).toBe('manual');
    expect(updated.result).toBe('rejected');
    const count = (db.prepare('SELECT COUNT(*) as c FROM applications').get() as { c: number }).c;
    expect(count).toBe(1);
  });

  it('throws a foreign key error when job_id does not exist', () => {
    const db = makeDb();
    expect(() =>
      addApplication(db, { job_id: 9999, method: 'manual', submitted_at: '2024-03-01T10:00:00.000Z' })
    ).toThrow();
  });
});

describe('getApplication()', () => {
  it('returns undefined when no application exists', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    expect(getApplication(db, job.id)).toBeUndefined();
  });

  it('returns the application after it has been added', () => {
    const db = makeDb();
    const job = upsertJob(db, jobA);
    addApplication(db, {
      job_id: job.id,
      method: 'lever',
      submitted_at: '2024-03-05T09:00:00.000Z',
    });
    const app = getApplication(db, job.id);
    expect(app).toBeDefined();
    expect(app!.method).toBe('lever');
    expect(app!.submitted_at).toBe('2024-03-05T09:00:00.000Z');
  });

  it('returns undefined for an id that was never inserted', () => {
    const db = makeDb();
    expect(getApplication(db, 9999)).toBeUndefined();
  });
});
