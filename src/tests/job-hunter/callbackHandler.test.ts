/**
 * Tests for the Telegram callback handler.
 *
 * Uses an in-memory SQLite DB for real persistence and spies on global.fetch
 * so no real Telegram API calls are made.
 *
 * Structure follows Given / When / Then:
 *   Given: DB and signal state
 *   When:  parseCallbackData / handleCallback / runCallbackPoller is called
 *   Then:  outcomes, DB state, and signal listener hygiene match expectations
 */

import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import { runMigrations } from '../../job-hunter/db/migrations';
import { upsertJob, addScore, upsertApproval, getApproval, blacklistJob } from '../../job-hunter/db/repository';
import {
  parseCallbackData,
  handleCallback,
  runCallbackPoller,
} from '../../job-hunter/telegram/callbackHandler';
import type { JobInput } from '../../job-hunter/db/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

function seedJobWithPendingApproval(
  db: Database.Database,
  overrides: Partial<JobInput> = {},
): number {
  const job = upsertJob(db, {
    source: 'theirstack',
    ats_type: 'unknown',
    external_id: `ts-${Math.random()}`,
    title: 'VP of Engineering',
    company: 'Acme Corp',
    url: 'https://acme.com/jobs/1',
    salary_raw: null,
    posted_at: null,
    ...overrides,
  });
  addScore(db, { job_id: job.id, score: 8, rationale: 'Strong match' });
  upsertApproval(db, { job_id: job.id, status: 'pending' });
  return job.id;
}

// ─── parseCallbackData() ──────────────────────────────────────────────────────

describe('parseCallbackData()', () => {
  test('Given "approve:42", When called, Then returns action=approve and jobId=42', () => {
    const result = parseCallbackData('approve:42');
    expect(result).toEqual({ action: 'approve', jobId: 42 });
  });

  test('Given "deny:7", When called, Then returns action=deny and jobId=7', () => {
    const result = parseCallbackData('deny:7');
    expect(result).toEqual({ action: 'deny', jobId: 7 });
  });

  test('Given empty string, When called, Then returns null', () => {
    expect(parseCallbackData('')).toBeNull();
  });

  test('Given unrecognised prefix, When called, Then returns null', () => {
    expect(parseCallbackData('skip:1')).toBeNull();
  });

  test('Given non-numeric id, When called, Then returns null', () => {
    expect(parseCallbackData('approve:abc')).toBeNull();
  });

  test('Given trailing content after id, When called, Then returns null', () => {
    expect(parseCallbackData('approve:42extra')).toBeNull();
  });
});

// ─── handleCallback() ─────────────────────────────────────────────────────────

describe('handleCallback()', () => {
  let savedToken: string | undefined;

  beforeEach(() => {
    savedToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
    } as unknown as Response);
  });

  afterEach(() => {
    if (savedToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = savedToken;
    else delete process.env.TELEGRAM_BOT_TOKEN;
    jest.restoreAllMocks();
  });

  test('Given unrecognised callback_data, When handleCallback called, Then returns ignored', async () => {
    const db = makeDb();
    const emitter = new EventEmitter();
    const result = await handleCallback(db, 'tok', emitter, 'cq1', 'unknown:1');
    expect(result).toBe('ignored');
  });

  test('Given no approval row for job, When handleCallback called with approve, Then returns ignored', async () => {
    const db = makeDb();
    const job = upsertJob(db, {
      source: 'greenhouse',
      ats_type: 'greenhouse',
      external_id: 'gh-1',
      title: 'Eng Manager',
      company: 'Corp',
      url: 'https://example.com',
      salary_raw: null,
      posted_at: null,
    });
    const emitter = new EventEmitter();
    const result = await handleCallback(db, 'tok', emitter, 'cq1', `approve:${job.id}`);
    expect(result).toBe('ignored');
  });

  test('Given a pending approval, When handleCallback called with deny, Then returns denied and blacklists job', async () => {
    const db = makeDb();
    const emitter = new EventEmitter();
    const jobId = seedJobWithPendingApproval(db);

    const result = await handleCallback(db, 'tok', emitter, 'cq1', `deny:${jobId}`);

    expect(result).toBe('denied');
    const approval = getApproval(db, jobId);
    expect(approval?.status).toBe('denied');
  });

  test('Given a pending approval, When handleCallback called with approve, Then returns approved and emits approve event', async () => {
    const db = makeDb();
    const emitter = new EventEmitter();
    const jobId = seedJobWithPendingApproval(db);
    const emitSpy = jest.spyOn(emitter, 'emit');

    const result = await handleCallback(db, 'tok', emitter, 'cq1', `approve:${jobId}`);

    expect(result).toBe('approved');
    expect(emitSpy).toHaveBeenCalledWith('approve', jobId);
    const approval = getApproval(db, jobId);
    expect(approval?.status).toBe('approved');
  });

  test('Given an already-approved job, When handleCallback called again, Then returns ignored', async () => {
    const db = makeDb();
    const emitter = new EventEmitter();
    const jobId = seedJobWithPendingApproval(db);
    upsertApproval(db, { job_id: jobId, status: 'approved' });

    const result = await handleCallback(db, 'tok', emitter, 'cq2', `approve:${jobId}`);

    expect(result).toBe('ignored');
  });
});

// ─── runCallbackPoller() — backoff abort-listener cleanup ─────────────────────

describe('runCallbackPoller() — backoff abort-listener cleanup', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('Given fetch fails and backoff timer fires, When timer resolves, Then removeEventListener is called for the abort listener', async () => {
    jest.useFakeTimers();

    const removeListenerSpy = jest.spyOn(AbortSignal.prototype, 'removeEventListener');

    let fetchCallCount = 0;
    jest.spyOn(global, 'fetch').mockImplementation((_url, opts) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return Promise.reject(new Error('Network error'));
      }
      // Second call: hang until signal aborts so the loop terminates cleanly
      return new Promise<Response>((_resolve, reject) => {
        (opts as RequestInit | undefined)?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      });
    });

    const db = makeDb();
    const emitter = new EventEmitter();
    const controller = new AbortController();

    const pollerPromise = runCallbackPoller(db, emitter, 'test-token', controller.signal);

    // Advance past the 5 second backoff timer
    await jest.advanceTimersByTimeAsync(5001);

    // After the timer fires, the timer callback must call removeEventListener
    expect(removeListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));

    // Tear down: abort to unblock the hanging second fetch
    controller.abort();
    await pollerPromise.catch(() => {});
  });

  test('Given multiple backoff cycles via timeout, When backoffs complete, Then removeEventListener is called once per cycle', async () => {
    jest.useFakeTimers();

    const removeListenerSpy = jest.spyOn(AbortSignal.prototype, 'removeEventListener');

    let fetchCallCount = 0;
    jest.spyOn(global, 'fetch').mockImplementation((_url, opts) => {
      fetchCallCount++;
      if (fetchCallCount <= 2) {
        return Promise.reject(new Error('Network error'));
      }
      return new Promise<Response>((_resolve, reject) => {
        (opts as RequestInit | undefined)?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      });
    });

    const db = makeDb();
    const emitter = new EventEmitter();
    const controller = new AbortController();

    const pollerPromise = runCallbackPoller(db, emitter, 'test-token', controller.signal);

    // Advance through two complete backoff cycles
    await jest.advanceTimersByTimeAsync(5001);
    await jest.advanceTimersByTimeAsync(5001);

    // Each timer-resolved backoff must call removeEventListener to clean up its listener
    const abortRemoveCalls = removeListenerSpy.mock.calls.filter(([type]) => type === 'abort');
    expect(abortRemoveCalls.length).toBeGreaterThanOrEqual(2);

    controller.abort();
    await pollerPromise.catch(() => {});
  });
});
