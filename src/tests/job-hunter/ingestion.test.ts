/**
 * Tests for the job ingestion layer.
 *
 * Uses an in-memory SQLite DB for fast, isolated, deterministic tests.
 * External source function (fetchGreenhouseJobs) is mocked for runIngestion() tests.
 *
 * Structure follows Given / When / Then:
 *   Given: DB state and input jobs
 *   When:  ingestJobs() or runIngestion() is called
 *   Then:  returned counts and DB state match expectations
 */

jest.mock('../../job-hunter/sources/greenhouse');
jest.mock('../../job-hunter/sources/lever');

import Database from 'better-sqlite3';
import { runMigrations } from '../../job-hunter/db/migrations';
import { blacklistJob, listJobs } from '../../job-hunter/db/repository';
import { ingestJobs, runIngestion } from '../../job-hunter/ingestion';
import type { NormalizedJob } from '../../job-hunter/ingestion';
import { fetchGreenhouseJobs } from '../../job-hunter/sources/greenhouse';
import { fetchLeverJobs } from '../../job-hunter/sources/lever';

const mockFetchGreenhouse = fetchGreenhouseJobs as jest.MockedFunction<typeof fetchGreenhouseJobs>;
const mockFetchLever = fetchLeverJobs as jest.MockedFunction<typeof fetchLeverJobs>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

const jobA: NormalizedJob = {
  source: 'greenhouse',
  ats_type: 'greenhouse',
  external_id: 'gh-001',
  title: 'VP of Engineering',
  company: 'Acme Corp',
  url: 'https://boards.greenhouse.io/acme/jobs/001',
  salary_raw: '200000-250000',
  posted_at: '2025-03-20T00:00:00.000Z',
};

const jobB: NormalizedJob = {
  source: 'greenhouse',
  ats_type: 'greenhouse',
  external_id: 'gh-101',
  title: 'Senior Engineering Manager',
  company: 'Globex',
  url: 'https://boards.greenhouse.io/globex/jobs/101',
  salary_raw: null,
  posted_at: '2025-03-19T00:00:00.000Z',
};

const jobC: NormalizedJob = {
  source: 'greenhouse',
  ats_type: 'greenhouse',
  external_id: 'gh-002',
  title: 'Director of Engineering',
  company: 'Initech',
  url: 'https://boards.greenhouse.io/initech/jobs/002',
  salary_raw: null,
  posted_at: null,
};

// ─── ingestJobs() ─────────────────────────────────────────────────────────────

describe('ingestJobs()', () => {
  describe('inserting new jobs', () => {
    it('Given an empty DB, When called with novel jobs, Then all are inserted', async () => {
      const db = makeDb();
      const result = await ingestJobs(db, [jobA, jobB]);
      expect(result).toEqual({ inserted: 2, skipped: 0 });
      expect(listJobs(db)).toHaveLength(2);
    });

    it('Given no jobs, When called with an empty array, Then returns zero counts', async () => {
      const db = makeDb();
      const result = await ingestJobs(db, []);
      expect(result).toEqual({ inserted: 0, skipped: 0 });
      expect(listJobs(db)).toHaveLength(0);
    });

    it('Given a new job, When inserted, Then all fields are persisted correctly', async () => {
      const db = makeDb();
      await ingestJobs(db, [jobA]);
      const jobs = listJobs(db);
      expect(jobs).toHaveLength(1);
      expect(jobs[0]).toMatchObject({
        source: jobA.source,
        ats_type: jobA.ats_type,
        external_id: jobA.external_id,
        title: jobA.title,
        company: jobA.company,
        url: jobA.url,
        salary_raw: jobA.salary_raw,
        posted_at: jobA.posted_at,
        blacklisted: 0,
      });
    });

    it('Given a job with null optional fields, When inserted, Then nulls are stored correctly', async () => {
      const db = makeDb();
      await ingestJobs(db, [jobC]);
      const jobs = listJobs(db);
      expect(jobs).toHaveLength(1);
      expect(jobs[0].salary_raw).toBeNull();
      expect(jobs[0].posted_at).toBeNull();
    });
  });

  describe('deduplication', () => {
    it('Given jobs already in DB, When same jobs are ingested again, Then all are skipped', async () => {
      const db = makeDb();
      await ingestJobs(db, [jobA, jobB]);
      const result = await ingestJobs(db, [jobA, jobB]);
      expect(result).toEqual({ inserted: 0, skipped: 2 });
      expect(listJobs(db)).toHaveLength(2);
    });

    it('Given a mix of new and existing jobs, When ingested, Then only new jobs are inserted', async () => {
      const db = makeDb();
      await ingestJobs(db, [jobA]);
      const result = await ingestJobs(db, [jobA, jobB, jobC]);
      expect(result).toEqual({ inserted: 2, skipped: 1 });
      expect(listJobs(db)).toHaveLength(3);
    });

    it('Given duplicate (source, external_id) within a single call, When ingested, Then only the first is inserted', async () => {
      const db = makeDb();
      const duplicate: NormalizedJob = { ...jobA };
      const result = await ingestJobs(db, [jobA, duplicate]);
      expect(result).toEqual({ inserted: 1, skipped: 1 });
      expect(listJobs(db)).toHaveLength(1);
    });

    it('Given same external_id from different sources, When ingested, Then both are inserted', async () => {
      const db = makeDb();
      const sameIdDifferentSource: NormalizedJob = { ...jobA, source: 'lever' };
      const result = await ingestJobs(db, [jobA, sameIdDifferentSource]);
      expect(result).toEqual({ inserted: 2, skipped: 0 });
      expect(listJobs(db)).toHaveLength(2);
    });
  });

  describe('blacklist filtering', () => {
    it('Given a blacklisted company, When new jobs from that company arrive, Then they are skipped', async () => {
      const db = makeDb();
      await ingestJobs(db, [jobA]);
      const [existing] = listJobs(db);
      blacklistJob(db, existing.id);

      const newAcmeJob: NormalizedJob = {
        ...jobA,
        external_id: 'gh-999',
        title: 'VP of Engineering II',
      };
      const result = await ingestJobs(db, [newAcmeJob]);
      expect(result).toEqual({ inserted: 0, skipped: 1 });
      expect(listJobs(db)).toHaveLength(1);
    });

    it('Given blacklisted-company and non-blacklisted-company jobs mixed, When ingested, Then only non-blacklisted-company jobs are inserted', async () => {
      const db = makeDb();
      await ingestJobs(db, [jobA]);
      const [existing] = listJobs(db);
      blacklistJob(db, existing.id);

      const newAcmeJob: NormalizedJob = { ...jobA, external_id: 'gh-999' };
      const result = await ingestJobs(db, [newAcmeJob, jobB]);
      expect(result).toEqual({ inserted: 1, skipped: 1 });
    });

    it('Given a blacklisted individual job, When same job is ingested again, Then it is skipped as a duplicate', async () => {
      const db = makeDb();
      await ingestJobs(db, [jobA]);
      const [existing] = listJobs(db);
      blacklistJob(db, existing.id);

      const result = await ingestJobs(db, [jobA]);
      expect(result).toEqual({ inserted: 0, skipped: 1 });
    });

    it('Given a non-blacklisted company with multiple jobs, When ingested, Then all are inserted', async () => {
      const db = makeDb();
      const acmeJob2: NormalizedJob = { ...jobA, external_id: 'gh-002' };
      const result = await ingestJobs(db, [jobA, acmeJob2]);
      expect(result).toEqual({ inserted: 2, skipped: 0 });
    });
  });
});

const leverJobA: NormalizedJob = {
  source: 'lever',
  ats_type: 'lever',
  external_id: 'lv-uuid-001',
  title: 'VP of Engineering',
  company: 'acme',
  url: 'https://jobs.lever.co/acme/lv-uuid-001',
  salary_raw: null,
  posted_at: '2025-03-20T00:00:00.000Z',
};

// ─── runIngestion() ───────────────────────────────────────────────────────────

describe('runIngestion()', () => {
  beforeEach(() => {
    mockFetchGreenhouse.mockReset();
    mockFetchLever.mockReset();
    mockFetchGreenhouse.mockResolvedValue([]);
    mockFetchLever.mockResolvedValue([]);
  });

  it('Given Greenhouse returns jobs, When runIngestion is called, Then all are ingested', async () => {
    const db = makeDb();
    mockFetchGreenhouse.mockResolvedValue([jobA, jobB]);

    const result = await runIngestion(db);

    expect(result).toEqual({ inserted: 2, skipped: 0 });
    expect(listJobs(db)).toHaveLength(2);
  });

  it('Given runIngestion is called, Then Greenhouse source is queried', async () => {
    const db = makeDb();
    mockFetchGreenhouse.mockResolvedValue([]);

    await runIngestion(db);

    expect(mockFetchGreenhouse).toHaveBeenCalledTimes(1);
  });

  it('Given a duplicate run, When runIngestion is called twice with same data, Then second run inserts 0 rows', async () => {
    const db = makeDb();
    mockFetchGreenhouse.mockResolvedValue([jobA, jobB]);

    await runIngestion(db);
    const second = await runIngestion(db);

    expect(second).toEqual({ inserted: 0, skipped: 2 });
  });

  it('Given empty source, When runIngestion is called, Then returns zero counts', async () => {
    const db = makeDb();
    mockFetchGreenhouse.mockResolvedValue([]);

    const result = await runIngestion(db);
    expect(result).toEqual({ inserted: 0, skipped: 0 });
  });

  it('Given Greenhouse throws, When runIngestion is called, Then returns zero counts', async () => {
    const db = makeDb();
    mockFetchGreenhouse.mockRejectedValue(new Error('Greenhouse API unavailable'));

    const result = await runIngestion(db);

    expect(result).toEqual({ inserted: 0, skipped: 0 });
    expect(listJobs(db)).toHaveLength(0);
  });

  it('Given Greenhouse throws, When runIngestion is called, Then the error is logged via console.warn', async () => {
    const db = makeDb();
    const error = new Error('Greenhouse API unavailable');
    mockFetchGreenhouse.mockRejectedValue(error);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await runIngestion(db);

    expect(warnSpy).toHaveBeenCalledWith('Job source fetch failed:', error);
    warnSpy.mockRestore();
  });

  it('Given runIngestion is called, Then Lever source is queried', async () => {
    const db = makeDb();

    await runIngestion(db);

    expect(mockFetchLever).toHaveBeenCalledTimes(1);
  });

  it('Given Lever returns jobs and Greenhouse is empty, When runIngestion is called, Then Lever jobs are ingested', async () => {
    const db = makeDb();
    mockFetchLever.mockResolvedValue([leverJobA]);

    const result = await runIngestion(db);

    expect(result).toEqual({ inserted: 1, skipped: 0 });
    expect(listJobs(db)).toHaveLength(1);
    expect(listJobs(db)[0].source).toBe('lever');
  });

  it('Given both sources return jobs, When runIngestion is called, Then all are ingested', async () => {
    const db = makeDb();
    mockFetchGreenhouse.mockResolvedValue([jobA]);
    mockFetchLever.mockResolvedValue([leverJobA]);

    const result = await runIngestion(db);

    expect(result).toEqual({ inserted: 2, skipped: 0 });
    expect(listJobs(db)).toHaveLength(2);
  });

  it('Given Lever throws, When runIngestion is called, Then Greenhouse jobs are still ingested', async () => {
    const db = makeDb();
    mockFetchGreenhouse.mockResolvedValue([jobA]);
    mockFetchLever.mockRejectedValue(new Error('Lever API unavailable'));

    const result = await runIngestion(db);

    expect(result).toEqual({ inserted: 1, skipped: 0 });
    expect(listJobs(db)).toHaveLength(1);
  });
});
