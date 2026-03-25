/**
 * Tests for the Telegram job-card notifier.
 *
 * Uses an in-memory SQLite DB for real persistence and spies on global.fetch
 * so no real Telegram API calls are made.
 *
 * Structure follows Given / When / Then:
 *   Given: DB state (jobs + scores + optional approvals)
 *   When:  getEligibleUnnotifiedJobs() / formatJobMessage() / runNotifier() is called
 *   Then:  DB state, fetch calls, and returned results match expectations
 */

import Database from 'better-sqlite3';
import { runMigrations } from '../../job-hunter/db/migrations';
import {
  upsertJob,
  addScore,
  upsertApproval,
  getApproval,
  getEligibleUnnotifiedJobs,
} from '../../job-hunter/db/repository';
import { formatJobMessage, runNotifier } from '../../job-hunter/telegram/notifier';
import type { JobInput } from '../../job-hunter/db/types';
import type { EligibleJob } from '../../job-hunter/db/repository';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

/** Insert a job with a score and return the persisted job id. */
function seedJobWithScore(
  db: Database.Database,
  overrides: Partial<JobInput> = {},
  score = 8,
): number {
  const job = upsertJob(db, {
    source: 'theirstack',
    ats_type: 'unknown',
    external_id: `ts-${Math.random()}`,
    title: 'VP of Engineering',
    company: 'Acme Corp',
    url: 'https://acme.com/jobs/1',
    salary_raw: '150000-200000',
    posted_at: '2025-03-20T00:00:00.000Z',
    ...overrides,
  });
  addScore(db, { job_id: job.id, score, rationale: 'Strong match' });
  return job.id;
}

/** Mock global.fetch to return a Telegram-like success or error response. */
function mockFetch(ok = true, statusText = 'OK'): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    statusText,
  } as Response);
}

// ─── getEligibleUnnotifiedJobs() ──────────────────────────────────────────────

describe('getEligibleUnnotifiedJobs()', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Given a job with score >= 6 and no approval, When called, Then returns that job', () => {
    const db = makeDb();
    const id = seedJobWithScore(db, {}, 7);

    const result = getEligibleUnnotifiedJobs(db);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(id);
  });

  test('Given a job with score exactly 6, When called, Then includes it', () => {
    const db = makeDb();
    const id = seedJobWithScore(db, {}, 6);

    const result = getEligibleUnnotifiedJobs(db);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(id);
  });

  test('Given a job with score < 6 and no approval, When called, Then excludes it', () => {
    const db = makeDb();
    seedJobWithScore(db, {}, 5);

    const result = getEligibleUnnotifiedJobs(db);

    expect(result).toHaveLength(0);
  });

  test('Given a job with score >= 6 and existing pending approval, When called, Then excludes it', () => {
    const db = makeDb();
    const id = seedJobWithScore(db, {}, 8);
    upsertApproval(db, { job_id: id, status: 'pending' });

    const result = getEligibleUnnotifiedJobs(db);

    expect(result).toHaveLength(0);
  });

  test('Given an approved job with score >= 6, When called, Then excludes it', () => {
    const db = makeDb();
    const id = seedJobWithScore(db, {}, 9);
    upsertApproval(db, { job_id: id, status: 'approved' });

    const result = getEligibleUnnotifiedJobs(db);

    expect(result).toHaveLength(0);
  });

  test('Given a blacklisted job with score >= 6, When called, Then excludes it', () => {
    const db = makeDb();
    const id = seedJobWithScore(db, {}, 8);
    db.prepare('UPDATE jobs SET blacklisted = 1 WHERE id = ?').run(id);

    const result = getEligibleUnnotifiedJobs(db);

    expect(result).toHaveLength(0);
  });

  test('Given multiple eligible jobs and one ineligible, When called, Then returns only eligible', () => {
    const db = makeDb();
    const id1 = seedJobWithScore(db, { external_id: 'a' }, 7);
    const id2 = seedJobWithScore(db, { external_id: 'b' }, 8);
    seedJobWithScore(db, { external_id: 'c' }, 5); // below threshold

    const result = getEligibleUnnotifiedJobs(db);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id).sort()).toEqual([id1, id2].sort());
  });

  test('Given an eligible job, When called, Then result row includes all required fields', () => {
    const db = makeDb();
    const job = upsertJob(db, {
      source: 'theirstack',
      ats_type: 'unknown',
      external_id: 'ts-999',
      title: 'Director of Engineering',
      company: 'TechCorp',
      url: 'https://techcorp.io/jobs/42',
      salary_raw: '120000-150000',
      posted_at: '2025-02-01T00:00:00.000Z',
    });
    addScore(db, { job_id: job.id, score: 8, rationale: 'Excellent fit for role' });

    const result = getEligibleUnnotifiedJobs(db);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: job.id,
      title: 'Director of Engineering',
      company: 'TechCorp',
      url: 'https://techcorp.io/jobs/42',
      salary_raw: '120000-150000',
      posted_at: '2025-02-01T00:00:00.000Z',
      score: 8,
      rationale: 'Excellent fit for role',
    });
  });

  test('Given a job with null salary and null posted_at, When called, Then result has null fields', () => {
    const db = makeDb();
    const job = upsertJob(db, {
      source: 'greenhouse',
      ats_type: 'greenhouse',
      external_id: 'gh-1',
      title: 'VP of Engineering',
      company: 'Acme',
      url: 'https://acme.com/jobs/1',
      salary_raw: null,
      posted_at: null,
    });
    addScore(db, { job_id: job.id, score: 7, rationale: 'Good match' });

    const result = getEligibleUnnotifiedJobs(db);

    expect(result[0].salary_raw).toBeNull();
    expect(result[0].posted_at).toBeNull();
  });
});

// ─── formatJobMessage() ───────────────────────────────────────────────────────

describe('formatJobMessage()', () => {
  const fullJob: EligibleJob = {
    id: 42,
    title: 'VP of Engineering',
    company: 'Acme Corp',
    url: 'https://acme.com/jobs/42',
    salary_raw: '150000-200000',
    posted_at: '2025-03-20T00:00:00.000Z',
    score: 8,
    rationale: 'Strong leadership match',
  };

  test('Given all fields present, When formatJobMessage called, Then message contains title', () => {
    const msg = formatJobMessage(fullJob);
    expect(msg).toContain('VP of Engineering');
  });

  test('Given all fields present, When formatJobMessage called, Then message contains company', () => {
    const msg = formatJobMessage(fullJob);
    expect(msg).toContain('Acme Corp');
  });

  test('Given all fields present, When formatJobMessage called, Then message contains salary', () => {
    const msg = formatJobMessage(fullJob);
    expect(msg).toContain('150000-200000');
  });

  test('Given all fields present, When formatJobMessage called, Then message contains posted date', () => {
    const msg = formatJobMessage(fullJob);
    expect(msg).toContain('2025-03-20T00:00:00.000Z');
  });

  test('Given all fields present, When formatJobMessage called, Then fit score is formatted as X/10', () => {
    const msg = formatJobMessage(fullJob);
    expect(msg).toContain('8/10');
  });

  test('Given all fields present, When formatJobMessage called, Then message contains rationale', () => {
    const msg = formatJobMessage(fullJob);
    expect(msg).toContain('Strong leadership match');
  });

  test('Given all fields present, When formatJobMessage called, Then message contains job URL', () => {
    const msg = formatJobMessage(fullJob);
    expect(msg).toContain('https://acme.com/jobs/42');
  });

  test('Given salary_raw is null, When formatJobMessage called, Then message omits salary line', () => {
    const msg = formatJobMessage({ ...fullJob, salary_raw: null });
    expect(msg).not.toContain('Salary');
  });

  test('Given posted_at is null, When formatJobMessage called, Then message omits posted date line', () => {
    const msg = formatJobMessage({ ...fullJob, posted_at: null });
    expect(msg).not.toContain('Posted');
  });
});

// ─── runNotifier() ────────────────────────────────────────────────────────────

describe('runNotifier() — missing credentials', () => {
  let savedToken: string | undefined;
  let savedChatId: string | undefined;

  beforeEach(() => {
    savedToken = process.env.TELEGRAM_BOT_TOKEN;
    savedChatId = process.env.TELEGRAM_CHAT_ID;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  afterEach(() => {
    if (savedToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = savedToken;
    else delete process.env.TELEGRAM_BOT_TOKEN;
    if (savedChatId !== undefined) process.env.TELEGRAM_CHAT_ID = savedChatId;
    else delete process.env.TELEGRAM_CHAT_ID;
    jest.restoreAllMocks();
  });

  test('Given neither env var set, When runNotifier called without explicit creds, Then throws for bot token', async () => {
    const db = makeDb();
    await expect(runNotifier(db)).rejects.toThrow('TELEGRAM_BOT_TOKEN');
  });

  test('Given TELEGRAM_BOT_TOKEN set but no chat id, When runNotifier called without chat, Then throws for chat id', async () => {
    const db = makeDb();
    process.env.TELEGRAM_BOT_TOKEN = 'sometoken';
    await expect(runNotifier(db)).rejects.toThrow('TELEGRAM_CHAT_ID');
  });
});

describe('runNotifier()', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Given no eligible jobs, When runNotifier called, Then returns notified=0 skipped=0 and makes no fetch call', async () => {
    const db = makeDb();
    const fetchSpy = mockFetch();

    const result = await runNotifier(db, 'token', 'chat');

    expect(result).toEqual({ notified: 0, skipped: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('Given an eligible job, When runNotifier called, Then POSTs to correct Telegram endpoint', async () => {
    const db = makeDb();
    seedJobWithScore(db, {}, 8);
    const fetchSpy = mockFetch();

    await runNotifier(db, 'mytoken', 'mychat');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/botmytoken/sendMessage');
    expect(opts.method).toBe('POST');
  });

  test('Given an eligible job, When runNotifier called, Then request body has correct chat_id and parse_mode', async () => {
    const db = makeDb();
    seedJobWithScore(db, {}, 8);
    mockFetch();

    await runNotifier(db, 'tok', 'chat99');

    const [, opts] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.chat_id).toBe('chat99');
    expect(body.parse_mode).toBe('HTML');
  });

  test('Given an eligible job, When runNotifier called, Then message text contains job title', async () => {
    const db = makeDb();
    seedJobWithScore(db, { title: 'Director of Engineering', external_id: 'doe1' }, 8);
    mockFetch();

    await runNotifier(db, 'tok', 'chat');

    const [, opts] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.text).toContain('Director of Engineering');
  });

  test('Given an eligible job, When runNotifier called, Then inline keyboard has one row with two buttons', async () => {
    const db = makeDb();
    seedJobWithScore(db, {}, 8);
    mockFetch();

    await runNotifier(db, 'tok', 'chat');

    const [, opts] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    const keyboard = body.reply_markup.inline_keyboard;
    expect(keyboard).toHaveLength(1);
    expect(keyboard[0]).toHaveLength(2);
  });

  test('Given an eligible job, When runNotifier called, Then approve button has correct callback_data', async () => {
    const db = makeDb();
    const id = seedJobWithScore(db, {}, 8);
    mockFetch();

    await runNotifier(db, 'tok', 'chat');

    const [, opts] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    const buttons = body.reply_markup.inline_keyboard[0];
    const approveBtn = buttons.find((b: { callback_data: string }) =>
      b.callback_data.startsWith('approve:'),
    );
    expect(approveBtn).toBeDefined();
    expect(approveBtn.callback_data).toBe(`approve:${id}`);
    expect(approveBtn.text).toBe('Approve ✅');
  });

  test('Given an eligible job, When runNotifier called, Then deny button has correct callback_data', async () => {
    const db = makeDb();
    const id = seedJobWithScore(db, {}, 8);
    mockFetch();

    await runNotifier(db, 'tok', 'chat');

    const [, opts] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    const buttons = body.reply_markup.inline_keyboard[0];
    const denyBtn = buttons.find((b: { callback_data: string }) =>
      b.callback_data.startsWith('deny:'),
    );
    expect(denyBtn).toBeDefined();
    expect(denyBtn.callback_data).toBe(`deny:${id}`);
    expect(denyBtn.text).toBe('Deny ❌');
  });

  test('Given an eligible job, When runNotifier called, Then stores pending approval in DB', async () => {
    const db = makeDb();
    const id = seedJobWithScore(db, {}, 8);
    mockFetch();

    await runNotifier(db, 'tok', 'chat');

    const approval = getApproval(db, id);
    expect(approval).toBeDefined();
    expect(approval!.status).toBe('pending');
  });

  test('Given a job with existing approval, When runNotifier called, Then does not re-send', async () => {
    const db = makeDb();
    const id = seedJobWithScore(db, {}, 8);
    upsertApproval(db, { job_id: id, status: 'pending' });
    const fetchSpy = mockFetch();

    await runNotifier(db, 'tok', 'chat');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('Given Telegram API returns error, When runNotifier called, Then logs warning and returns skipped=1', async () => {
    const db = makeDb();
    seedJobWithScore(db, {}, 8);
    mockFetch(false, 'Bad Request');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await runNotifier(db, 'tok', 'chat');

    expect(result).toEqual({ notified: 0, skipped: 1 });
    expect(warnSpy).toHaveBeenCalled();
  });

  test('Given Telegram API returns error, When runNotifier called, Then does not store approval', async () => {
    const db = makeDb();
    const id = seedJobWithScore(db, {}, 8);
    mockFetch(false, 'Bad Request');
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await runNotifier(db, 'tok', 'chat');

    expect(getApproval(db, id)).toBeUndefined();
  });

  test('Given multiple eligible jobs, When runNotifier called, Then notifies each and returns correct counts', async () => {
    const db = makeDb();
    seedJobWithScore(db, { external_id: 'j1' }, 7);
    seedJobWithScore(db, { external_id: 'j2' }, 9);
    mockFetch();

    const result = await runNotifier(db, 'tok', 'chat');

    expect(result).toEqual({ notified: 2, skipped: 0 });
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(2);
  });

  test('Given one job succeeds and one fails, When runNotifier called, Then counts each correctly', async () => {
    const db = makeDb();
    seedJobWithScore(db, { external_id: 'good' }, 8);
    seedJobWithScore(db, { external_id: 'bad' }, 7);
    let callCount = 0;
    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      callCount++;
      return { ok: callCount === 1, status: callCount === 1 ? 200 : 400, statusText: callCount === 1 ? 'OK' : 'Bad Request' } as Response;
    });
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await runNotifier(db, 'tok', 'chat');

    expect(result.notified).toBe(1);
    expect(result.skipped).toBe(1);
  });
});
