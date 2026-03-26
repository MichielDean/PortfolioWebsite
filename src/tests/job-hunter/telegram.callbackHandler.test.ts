/**
 * Tests for the Telegram callback handler.
 *
 * Uses an in-memory SQLite DB for real persistence and spies on global.fetch
 * so no real Telegram API calls are made.
 *
 * Structure follows Given / When / Then:
 *   Given: DB state + setup
 *   When:  parseCallbackData() / handleCallback() / runCallbackPoller() called
 *   Then:  DB state, emitter events, fetch calls, and return values match expectations
 */

import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import { runMigrations } from '../../job-hunter/db/migrations';
import {
  upsertJob,
  addScore,
  upsertApproval,
  getApproval,
  getJobById,
} from '../../job-hunter/db/repository';
import {
  parseCallbackData,
  handleCallback,
  runCallbackPoller,
} from '../../job-hunter/telegram/callbackHandler';
// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

/** Insert a job with a score and a pending approval; return the job id. */
function seedJobWithPendingApproval(db: Database.Database): number {
  const job = upsertJob(db, {
    source: 'theirstack',
    ats_type: 'unknown',
    external_id: `ts-${Math.random()}`,
    title: 'VP of Engineering',
    company: 'Acme Corp',
    url: 'https://acme.com/jobs/1',
    salary_raw: '150000-200000',
    posted_at: '2025-03-20T00:00:00.000Z',
  });
  addScore(db, { job_id: job.id, score: 8, rationale: 'Strong match' });
  upsertApproval(db, { job_id: job.id, status: 'pending' });
  return job.id;
}

/**
 * Insert a job with a score but no approval row (simulates a job that was never
 * sent through the notifier); return the job id.
 */
function seedJobWithoutApproval(db: Database.Database): number {
  const job = upsertJob(db, {
    source: 'theirstack',
    ats_type: 'unknown',
    external_id: `ts-${Math.random()}`,
    title: 'Engineer',
    company: 'Acme',
    url: 'https://acme.com/jobs/1',
    salary_raw: null,
    posted_at: null,
  });
  addScore(db, { job_id: job.id, score: 8, rationale: 'Good fit' });
  return job.id;
}

/** Mock global.fetch to return a simple ok/error response. */
function mockFetch(ok = true): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request',
    json: () => Promise.resolve({ ok: true }),
    text: () => Promise.resolve(''),
  } as unknown as Response);
}

// ─── parseCallbackData() ──────────────────────────────────────────────────────

describe('parseCallbackData()', () => {
  test('Given "approve:42", When called, Then returns action=approve and jobId=42', () => {
    expect(parseCallbackData('approve:42')).toEqual({ action: 'approve', jobId: 42 });
  });

  test('Given "deny:7", When called, Then returns action=deny and jobId=7', () => {
    expect(parseCallbackData('deny:7')).toEqual({ action: 'deny', jobId: 7 });
  });

  test('Given "approve:1" with large id, When called, Then returns correct jobId', () => {
    expect(parseCallbackData('approve:99999')).toEqual({ action: 'approve', jobId: 99999 });
  });

  test('Given empty string, When called, Then returns null', () => {
    expect(parseCallbackData('')).toBeNull();
  });

  test('Given "approve:" (no id), When called, Then returns null', () => {
    expect(parseCallbackData('approve:')).toBeNull();
  });

  test('Given "unknown:42", When called, Then returns null', () => {
    expect(parseCallbackData('unknown:42')).toBeNull();
  });

  test('Given "approve:abc" (non-numeric id), When called, Then returns null', () => {
    expect(parseCallbackData('approve:abc')).toBeNull();
  });

  test('Given "approve:1:2" (extra segment), When called, Then returns null', () => {
    expect(parseCallbackData('approve:1:2')).toBeNull();
  });

  test('Given "APPROVE:42" (wrong case), When called, Then returns null', () => {
    expect(parseCallbackData('APPROVE:42')).toBeNull();
  });
});

// ─── handleCallback() — deny flow ────────────────────────────────────────────

describe('handleCallback() — deny flow', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Given a pending approval, When deny callback received, Then sets approval status to denied', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    mockFetch();

    await handleCallback(db, 'token', new EventEmitter(), 'cq-1', `deny:${jobId}`);

    expect(getApproval(db, jobId)?.status).toBe('denied');
  });

  test('Given a pending approval, When deny callback received, Then blacklists the job', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    mockFetch();

    await handleCallback(db, 'token', new EventEmitter(), 'cq-1', `deny:${jobId}`);

    expect(getJobById(db, jobId)?.blacklisted).toBe(1);
  });

  test('Given a pending approval, When deny callback received, Then answers query with "Job denied and blacklisted"', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    const fetchSpy = mockFetch();

    await handleCallback(db, 'mytoken', new EventEmitter(), 'cq-99', `deny:${jobId}`);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/botmytoken/answerCallbackQuery');
    const body = JSON.parse(opts.body as string);
    expect(body.callback_query_id).toBe('cq-99');
    expect(body.text).toBe('Job denied and blacklisted');
  });

  test('Given a pending approval, When deny callback received, Then returns "denied"', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    mockFetch();

    const result = await handleCallback(db, 'token', new EventEmitter(), 'cq-1', `deny:${jobId}`);

    expect(result).toBe('denied');
  });

  test('Given a pending approval, When deny callback received, Then does not emit approve event', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    mockFetch();
    const emitter = new EventEmitter();
    const approveSpy = jest.fn();
    emitter.on('approve', approveSpy);

    await handleCallback(db, 'token', emitter, 'cq-1', `deny:${jobId}`);

    expect(approveSpy).not.toHaveBeenCalled();
  });
});

// ─── handleCallback() — approve flow ─────────────────────────────────────────

describe('handleCallback() — approve flow', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Given a pending approval, When approve callback received, Then sets approval status to approved', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    mockFetch();

    await handleCallback(db, 'token', new EventEmitter(), 'cq-1', `approve:${jobId}`);

    expect(getApproval(db, jobId)?.status).toBe('approved');
  });

  test('Given a pending approval, When approve callback received, Then answers query with "Approved — generating resume…"', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    const fetchSpy = mockFetch();

    await handleCallback(db, 'mytoken', new EventEmitter(), 'cq-55', `approve:${jobId}`);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/botmytoken/answerCallbackQuery');
    const body = JSON.parse(opts.body as string);
    expect(body.callback_query_id).toBe('cq-55');
    expect(body.text).toBe('Approved — generating resume\u2026');
  });

  test('Given a pending approval, When approve callback received, Then emits approve event with jobId', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    mockFetch();
    const emitter = new EventEmitter();
    const approveSpy = jest.fn();
    emitter.on('approve', approveSpy);

    await handleCallback(db, 'token', emitter, 'cq-1', `approve:${jobId}`);

    expect(approveSpy).toHaveBeenCalledTimes(1);
    expect(approveSpy).toHaveBeenCalledWith(jobId);
  });

  test('Given a pending approval, When approve callback received, Then returns "approved"', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    mockFetch();

    const result = await handleCallback(db, 'token', new EventEmitter(), 'cq-1', `approve:${jobId}`);

    expect(result).toBe('approved');
  });

  test('Given a pending approval, When approve callback received, Then does not blacklist the job', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    mockFetch();

    await handleCallback(db, 'token', new EventEmitter(), 'cq-1', `approve:${jobId}`);

    expect(getJobById(db, jobId)?.blacklisted).toBe(0);
  });

  test('Given a pending approval, When approve callback received and answerCallbackQuery throws network error, Then approve event is emitted before the error propagates', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Network error'));
    const emitter = new EventEmitter();
    const approveSpy = jest.fn();
    emitter.on('approve', approveSpy);

    await expect(
      handleCallback(db, 'token', emitter, 'cq-1', `approve:${jobId}`)
    ).rejects.toThrow('Network error');

    expect(approveSpy).toHaveBeenCalledWith(jobId);
  });
});

// ─── handleCallback() — idempotency ──────────────────────────────────────────

describe('handleCallback() — idempotency', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Given an already-approved job, When approve callback received again, Then returns "ignored"', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    upsertApproval(db, { job_id: jobId, status: 'approved' });
    const fetchSpy = mockFetch();

    const result = await handleCallback(db, 'token', new EventEmitter(), 'cq-1', `approve:${jobId}`);

    expect(result).toBe('ignored');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('Given an already-approved job, When approve callback received again, Then does not re-emit approve event', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    upsertApproval(db, { job_id: jobId, status: 'approved' });
    mockFetch();
    const emitter = new EventEmitter();
    const approveSpy = jest.fn();
    emitter.on('approve', approveSpy);

    await handleCallback(db, 'token', emitter, 'cq-1', `approve:${jobId}`);

    expect(approveSpy).not.toHaveBeenCalled();
  });

  test('Given an already-denied job, When deny callback received again, Then returns "ignored"', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    upsertApproval(db, { job_id: jobId, status: 'denied' });
    const fetchSpy = mockFetch();

    const result = await handleCallback(db, 'token', new EventEmitter(), 'cq-1', `deny:${jobId}`);

    expect(result).toBe('ignored');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('Given an already-approved job, When deny callback received, Then returns "ignored"', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    upsertApproval(db, { job_id: jobId, status: 'approved' });
    const fetchSpy = mockFetch();

    const result = await handleCallback(db, 'token', new EventEmitter(), 'cq-1', `deny:${jobId}`);

    expect(result).toBe('ignored');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('Given an already-denied job, When approve callback received, Then returns "ignored"', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    upsertApproval(db, { job_id: jobId, status: 'denied' });
    const fetchSpy = mockFetch();

    const result = await handleCallback(db, 'token', new EventEmitter(), 'cq-1', `approve:${jobId}`);

    expect(result).toBe('ignored');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ─── handleCallback() — no approval row (non-notified jobs) ──────────────────

describe('handleCallback() — no approval row', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Given valid approve callback but job id does not exist in DB, When called, Then returns "ignored"', async () => {
    const db = makeDb();
    const fetchSpy = mockFetch();

    const result = await handleCallback(db, 'token', new EventEmitter(), 'cq-1', 'approve:9999');

    expect(result).toBe('ignored');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('Given valid deny callback but job id does not exist in DB, When called, Then returns "ignored"', async () => {
    const db = makeDb();
    const fetchSpy = mockFetch();

    const result = await handleCallback(db, 'token', new EventEmitter(), 'cq-1', 'deny:9999');

    expect(result).toBe('ignored');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('Given valid approve callback for existing job with no approval row, When called, Then returns "ignored"', async () => {
    const db = makeDb();
    const jobId = seedJobWithoutApproval(db);
    const fetchSpy = mockFetch();

    const result = await handleCallback(db, 'token', new EventEmitter(), 'cq-1', `approve:${jobId}`);

    expect(result).toBe('ignored');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('Given valid deny callback for existing job with no approval row, When called, Then returns "ignored"', async () => {
    const db = makeDb();
    const jobId = seedJobWithoutApproval(db);
    const fetchSpy = mockFetch();

    const result = await handleCallback(db, 'token', new EventEmitter(), 'cq-1', `deny:${jobId}`);

    expect(result).toBe('ignored');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('Given valid approve callback for existing job with no approval row, When called, Then does not emit approve event', async () => {
    const db = makeDb();
    const jobId = seedJobWithoutApproval(db);
    mockFetch();
    const emitter = new EventEmitter();
    const approveSpy = jest.fn();
    emitter.on('approve', approveSpy);

    await handleCallback(db, 'token', emitter, 'cq-1', `approve:${jobId}`);

    expect(approveSpy).not.toHaveBeenCalled();
  });

  test('Given valid deny callback for existing job with no approval row, When called, Then does not blacklist the job', async () => {
    const db = makeDb();
    const jobId = seedJobWithoutApproval(db);
    mockFetch();

    await handleCallback(db, 'token', new EventEmitter(), 'cq-1', `deny:${jobId}`);

    expect(getJobById(db, jobId)?.blacklisted).toBe(0);
  });
});

// ─── handleCallback() — invalid callback data ────────────────────────────────

describe('handleCallback() — invalid callback data', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Given invalid callback_data, When called, Then returns "ignored"', async () => {
    const db = makeDb();
    const fetchSpy = mockFetch();

    const result = await handleCallback(db, 'token', new EventEmitter(), 'cq-1', 'invalid-data');

    expect(result).toBe('ignored');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('Given empty callback_data, When called, Then returns "ignored"', async () => {
    const db = makeDb();
    const fetchSpy = mockFetch();

    const result = await handleCallback(db, 'token', new EventEmitter(), 'cq-1', '');

    expect(result).toBe('ignored');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ─── runCallbackPoller() — missing credentials ───────────────────────────────

describe('runCallbackPoller() — missing credentials', () => {
  let savedToken: string | undefined;

  beforeEach(() => {
    savedToken = process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  afterEach(() => {
    if (savedToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = savedToken;
    else delete process.env.TELEGRAM_BOT_TOKEN;
    jest.restoreAllMocks();
  });

  test('Given no TELEGRAM_BOT_TOKEN, When runCallbackPoller called without explicit token, Then throws', async () => {
    const db = makeDb();
    await expect(runCallbackPoller(db, new EventEmitter())).rejects.toThrow('TELEGRAM_BOT_TOKEN');
  });
});

// ─── runCallbackPoller() — abort-aware backoff ───────────────────────────────

describe('runCallbackPoller() — abort-aware backoff', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Given fetch error, When signal aborted during backoff, Then poller exits without waiting 5s', async () => {
    const db = makeDb();
    const controller = new AbortController();

    jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Network error'));

    const pollerPromise = runCallbackPoller(db, new EventEmitter(), 'mytoken', controller.signal);

    // Flush microtask queue to let the fetch rejection reach the backoff await
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // Abort — the abort listener on the backoff timer should resolve it immediately
    controller.abort();

    // Should resolve without needing a 5s timer advancement
    const result = await pollerPromise;
    expect(result).toEqual({ approved: 0, denied: 0, ignored: 0 });
  }, 500 /* fail fast if backoff does not respect the abort signal */);
});

// ─── runCallbackPoller() — resilient to malformed response body ──────────────

describe('runCallbackPoller() — resilient to malformed response body', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('Given HTTP 200 with malformed JSON body, When poller receives it, Then backsoff 5s and continues polling without dying', async () => {
    const db = makeDb();
    const controller = new AbortController();
    let callCount = 0;

    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          json: () => { throw new SyntaxError('Unexpected token'); },
          text: () => Promise.resolve(''),
        } as unknown as Response;
      }
      controller.abort();
      return {
        ok: true,
        json: () => Promise.resolve({ ok: true, result: [] }),
        text: () => Promise.resolve(''),
      } as unknown as Response;
    });

    const pollerPromise = runCallbackPoller(db, new EventEmitter(), 'mytoken', controller.signal);
    await jest.advanceTimersByTimeAsync(6000);
    const result = await pollerPromise;

    expect(result).toEqual({ approved: 0, denied: 0, ignored: 0 });
    expect(callCount).toBe(2);
  });

  test('Given HTTP 200 with missing result field in body, When poller receives it, Then backsoff 5s and continues polling without dying', async () => {
    const db = makeDb();
    const controller = new AbortController();
    let callCount = 0;

    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          json: () => Promise.resolve({ ok: true }),
          text: () => Promise.resolve(''),
        } as unknown as Response;
      }
      controller.abort();
      return {
        ok: true,
        json: () => Promise.resolve({ ok: true, result: [] }),
        text: () => Promise.resolve(''),
      } as unknown as Response;
    });

    const pollerPromise = runCallbackPoller(db, new EventEmitter(), 'mytoken', controller.signal);
    await jest.advanceTimersByTimeAsync(6000);
    const result = await pollerPromise;

    expect(result).toEqual({ approved: 0, denied: 0, ignored: 0 });
    expect(callCount).toBe(2);
  });
});

// ─── runCallbackPoller() — processes updates ─────────────────────────────────

describe('runCallbackPoller() — dispatches callback_query updates', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Given a deny callback update, When poller processes it and is aborted, Then returns denied=1 and blacklists the job', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    const controller = new AbortController();
    let getUpdatesCount = 0;

    jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('getUpdates')) {
        if (getUpdatesCount++ === 0) {
          return {
            ok: true,
            json: () =>
              Promise.resolve({
                ok: true,
                result: [{ update_id: 1, callback_query: { id: 'cq-1', data: `deny:${jobId}` } }],
              }),
            text: () => Promise.resolve(''),
          } as unknown as Response;
        }
        controller.abort();
        return {
          ok: true,
          json: () => Promise.resolve({ ok: true, result: [] }),
          text: () => Promise.resolve(''),
        } as unknown as Response;
      }
      return {
        ok: true,
        json: () => Promise.resolve({ ok: true }),
        text: () => Promise.resolve(''),
      } as unknown as Response;
    });

    const result = await runCallbackPoller(db, new EventEmitter(), 'mytoken', controller.signal);

    expect(result.denied).toBe(1);
    expect(result.approved).toBe(0);
    expect(getJobById(db, jobId)?.blacklisted).toBe(1);
  });

  test('Given an approve callback update, When poller processes it and is aborted, Then emits approve event', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    const emitter = new EventEmitter();
    const approveSpy = jest.fn();
    emitter.on('approve', approveSpy);
    const controller = new AbortController();
    let getUpdatesCount = 0;

    jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('getUpdates')) {
        if (getUpdatesCount++ === 0) {
          return {
            ok: true,
            json: () =>
              Promise.resolve({
                ok: true,
                result: [{ update_id: 1, callback_query: { id: 'cq-1', data: `approve:${jobId}` } }],
              }),
            text: () => Promise.resolve(''),
          } as unknown as Response;
        }
        controller.abort();
        return {
          ok: true,
          json: () => Promise.resolve({ ok: true, result: [] }),
          text: () => Promise.resolve(''),
        } as unknown as Response;
      }
      return {
        ok: true,
        json: () => Promise.resolve({ ok: true }),
        text: () => Promise.resolve(''),
      } as unknown as Response;
    });

    await runCallbackPoller(db, emitter, 'mytoken', controller.signal);

    expect(approveSpy).toHaveBeenCalledWith(jobId);
  });

  test('Given a duplicate approve callback (already approved), When poller processes it, Then returns ignored=1', async () => {
    const db = makeDb();
    const jobId = seedJobWithPendingApproval(db);
    upsertApproval(db, { job_id: jobId, status: 'approved' });
    const controller = new AbortController();
    let getUpdatesCount = 0;

    jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('getUpdates')) {
        if (getUpdatesCount++ === 0) {
          return {
            ok: true,
            json: () =>
              Promise.resolve({
                ok: true,
                result: [{ update_id: 1, callback_query: { id: 'cq-1', data: `approve:${jobId}` } }],
              }),
            text: () => Promise.resolve(''),
          } as unknown as Response;
        }
        controller.abort();
        return {
          ok: true,
          json: () => Promise.resolve({ ok: true, result: [] }),
          text: () => Promise.resolve(''),
        } as unknown as Response;
      }
      return {
        ok: true,
        json: () => Promise.resolve({ ok: true }),
        text: () => Promise.resolve(''),
      } as unknown as Response;
    });

    const result = await runCallbackPoller(db, new EventEmitter(), 'mytoken', controller.signal);

    expect(result.ignored).toBe(1);
    expect(result.approved).toBe(0);
  });
});
