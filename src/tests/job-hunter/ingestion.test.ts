/**
 * Tests for the job ingestion layer.
 *
 * Uses an in-memory SQLite DB for fast, isolated, deterministic tests.
 * child_process.execFile is mocked for runIngestion() tests.
 *
 * Structure follows Given / When / Then:
 *   Given: DB state and input jobs (or execFile mock configuration)
 *   When:  ingestJobs() or runIngestion() is called
 *   Then:  returned counts and DB state match expectations
 */

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  existsSync: jest.fn(),
}));

import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { runMigrations } from '../../job-hunter/db/migrations';
import { blacklistJob, listJobs } from '../../job-hunter/db/repository';
import { ingestJobs, runIngestion, resolveInterpreter } from '../../job-hunter/ingestion';
import type { NormalizedJob } from '../../job-hunter/ingestion';

const mockExecFile = execFile as jest.MockedFunction<typeof execFile>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

/** Configure mockExecFile to call its callback with the given stdout. */
function mockExecFileSuccess(stdout: string): void {
  mockExecFile.mockImplementation(
    (_file: unknown, _args: unknown, callback: unknown) => {
      (callback as (err: null, stdout: string, stderr: string) => void)(
        null,
        stdout,
        '',
      );
      return undefined as never;
    },
  );
}

/** Configure mockExecFile to call its callback with a non-zero error. */
function mockExecFileFailure(exitCode: number, stderr = ''): void {
  mockExecFile.mockImplementation(
    (_file: unknown, _args: unknown, callback: unknown) => {
      const err = Object.assign(new Error('Command failed'), { code: exitCode });
      (callback as (err: Error, stdout: string, stderr: string) => void)(
        err,
        '',
        stderr,
      );
      return undefined as never;
    },
  );
}

const jobA: NormalizedJob = {
  source: 'greenhouse',
  ats_type: 'unknown',
  external_id: 'gh-001',
  title: 'VP of Engineering',
  company: 'Acme Corp',
  url: 'https://boards.greenhouse.io/acme/jobs/001',
  salary_raw: '200000-250000',
  posted_at: '2025-03-20T00:00:00.000Z',
};

const jobB: NormalizedJob = {
  source: 'greenhouse',
  ats_type: 'unknown',
  external_id: 'gh-101',
  title: 'Senior Engineering Manager',
  company: 'Globex',
  url: 'https://boards.greenhouse.io/globex/jobs/101',
  salary_raw: null,
  posted_at: '2025-03-19T00:00:00.000Z',
};

const jobC: NormalizedJob = {
  source: 'greenhouse',
  ats_type: 'unknown',
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

// ─── runIngestion() ───────────────────────────────────────────────────────────

describe('runIngestion()', () => {
  beforeEach(() => {
    mockExecFile.mockReset();
  });

  it('Given ingest.py outputs "Inserted 5, skipped 2", When runIngestion is called, Then returns parsed counts', async () => {
    const db = makeDb();
    mockExecFileSuccess('Inserted 5, skipped 2\n');

    const result = await runIngestion(db, '/tmp/test.db');

    expect(result).toEqual({ inserted: 5, skipped: 2 });
  });

  it('Given ingest.py outputs "Inserted 0, skipped 0", When runIngestion is called, Then returns zero counts', async () => {
    const db = makeDb();
    mockExecFileSuccess('Inserted 0, skipped 0\n');

    const result = await runIngestion(db, '/tmp/test.db');

    expect(result).toEqual({ inserted: 0, skipped: 0 });
  });

  it('Given a dbPath, When runIngestion is called, Then execFile is invoked with the dbPath as an argument', async () => {
    const db = makeDb();
    mockExecFileSuccess('Inserted 3, skipped 1\n');

    await runIngestion(db, '/data/jobs.db');

    expect(mockExecFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['/data/jobs.db']),
      expect.any(Function),
    );
  });

  it('Given a dbPath, When runIngestion is called, Then execFile is invoked with a path containing ingest.py', async () => {
    const db = makeDb();
    mockExecFileSuccess('Inserted 1, skipped 0\n');

    await runIngestion(db, 'test.db');

    const [file, args] = mockExecFile.mock.calls[0];
    const fullInvocation = [file, ...(args as string[])].join(' ');
    expect(fullInvocation).toContain('ingest.py');
  });

  it('Given ingest.py exits with non-zero, When runIngestion is called, Then the rejection propagates', async () => {
    const db = makeDb();
    mockExecFileFailure(1, 'Error: DB not found');

    await expect(runIngestion(db, 'missing.db')).rejects.toThrow();
  });

  it('Given ingest.py produces unexpected output, When runIngestion is called, Then it throws', async () => {
    const db = makeDb();
    mockExecFileSuccess('Something went wrong\n');

    await expect(runIngestion(db, 'test.db')).rejects.toThrow(
      /unexpected output/i,
    );
  });

  it('Given ingest.py outputs with extra whitespace, When runIngestion is called, Then counts are parsed correctly', async () => {
    const db = makeDb();
    mockExecFileSuccess('  Inserted 10, skipped 3  \n');

    const result = await runIngestion(db, 'test.db');

    expect(result).toEqual({ inserted: 10, skipped: 3 });
  });

  it('Given ingest.py writes to stderr, When runIngestion is called, Then stderr is logged via console.warn', async () => {
    const db = makeDb();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockExecFile.mockImplementation(
      (_file: unknown, _args: unknown, callback: unknown) => {
        (callback as (err: null, stdout: string, stderr: string) => void)(
          null,
          'Inserted 0, skipped 0\n',
          'Warning: scraping issue on linkedin\n',
        );
        return undefined as never;
      },
    );

    await runIngestion(db, 'test.db');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('scraping issue on linkedin'),
    );
    warnSpy.mockRestore();
  });

  it('Given ingest.py writes no stderr, When runIngestion is called, Then console.warn is not called', async () => {
    const db = makeDb();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockExecFileSuccess('Inserted 1, skipped 0\n');

    await runIngestion(db, 'test.db');

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('Given INGEST_PYTHON is set, When runIngestion is called, Then that interpreter is passed to execFile', async () => {
    const db = makeDb();
    process.env.INGEST_PYTHON = '/custom/python3.13';
    mockExecFileSuccess('Inserted 2, skipped 1\n');

    try {
      await runIngestion(db, 'test.db');
      expect(mockExecFile).toHaveBeenCalledWith(
        '/custom/python3.13',
        expect.any(Array),
        expect.any(Function),
      );
    } finally {
      delete process.env.INGEST_PYTHON;
    }
  });
});

// ─── resolveInterpreter() ─────────────────────────────────────────────────────

const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;

describe('resolveInterpreter()', () => {
  const expectedVenvPath = path.join(
    os.homedir(),
    '.venv',
    'jobhunter-sys',
    'bin',
    'python3',
  );

  beforeEach(() => {
    delete process.env.INGEST_PYTHON;
    mockExistsSync.mockReset();
  });

  it('Given INGEST_PYTHON is set, When resolveInterpreter is called, Then returns the env var value', () => {
    process.env.INGEST_PYTHON = '/usr/local/bin/python3.13';
    expect(resolveInterpreter()).toBe('/usr/local/bin/python3.13');
  });

  it('Given INGEST_PYTHON is set and venv exists, When resolveInterpreter is called, Then env var takes priority and existsSync is not called', () => {
    process.env.INGEST_PYTHON = '/custom/python';
    mockExistsSync.mockReturnValue(true);
    expect(resolveInterpreter()).toBe('/custom/python');
    expect(mockExistsSync).not.toHaveBeenCalled();
  });

  it('Given INGEST_PYTHON is not set and venv exists, When resolveInterpreter is called, Then returns the venv path', () => {
    mockExistsSync.mockReturnValue(true);
    const result = resolveInterpreter();
    expect(result).toBe(expectedVenvPath);
    expect(mockExistsSync).toHaveBeenCalledWith(expectedVenvPath);
  });

  it('Given INGEST_PYTHON is not set and venv does not exist, When resolveInterpreter is called, Then falls back to python3', () => {
    mockExistsSync.mockReturnValue(false);
    expect(resolveInterpreter()).toBe('python3');
  });
});
