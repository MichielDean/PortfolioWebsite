/**
 * Tests for the approval handler.
 *
 * Uses an in-memory SQLite DB for real persistence and spies on global.fetch
 * so no real Telegram API calls are made. Injects a mock tailorFn to avoid
 * running the resume CLI.
 *
 * Structure follows Given / When / Then:
 *   Given: DB state + fixture PDFs
 *   When:  handleApproval() / runApprovalHandler() called
 *   Then:  fetch calls, DB state, and return values match expectations
 */

import os from 'os';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import { runMigrations } from '../../job-hunter/db/migrations';
import {
  upsertJob,
  addScore,
  upsertApproval,
  getApplication,
  getJobById,
} from '../../job-hunter/db/repository';
import {
  handleApproval,
  runApprovalHandler,
} from '../../job-hunter/resume/approvalHandler';
import type { TailorResult } from '../../job-hunter/resume/approvalHandler';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

function seedJob(
  db: Database.Database,
  overrides: { title?: string; company?: string; url?: string } = {},
): number {
  const job = upsertJob(db, {
    source: 'theirstack',
    ats_type: 'unknown',
    external_id: `ts-${Math.random()}`,
    title: overrides.title ?? 'Staff Engineer',
    company: overrides.company ?? 'Acme Corp',
    url: overrides.url ?? 'https://acme.com/jobs/123',
    salary_raw: null,
    posted_at: null,
  });
  addScore(db, { job_id: job.id, score: 9, rationale: 'Excellent match' });
  upsertApproval(db, { job_id: job.id, status: 'approved' });
  return job.id;
}

function mockFetch(ok = true): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request',
    json: () => Promise.resolve({ ok: true }),
    text: () => Promise.resolve(''),
  } as unknown as Response);
}

/** Create real temp PDF files and return their paths. */
function makePdfFixtures(): TailorResult {
  const dir = os.tmpdir();
  const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const resumePdf = path.join(dir, `resume-fixture-${tag}.pdf`);
  const coverLetterPdf = path.join(dir, `cover-letter-fixture-${tag}.pdf`);
  fs.writeFileSync(resumePdf, Buffer.from('%PDF-1.4 mock-resume'));
  fs.writeFileSync(coverLetterPdf, Buffer.from('%PDF-1.4 mock-cover-letter'));
  return { resumePdf, coverLetterPdf };
}

function cleanPdfFixtures(fixtures: TailorResult): void {
  try { fs.unlinkSync(fixtures.resumePdf); } catch { /* already removed */ }
  try { fs.unlinkSync(fixtures.coverLetterPdf); } catch { /* already removed */ }
}

/** Flush the event loop so async event-listener work completes. */
function flushPromises(): Promise<void> {
  return new Promise<void>(resolve => setTimeout(resolve, 0));
}

// ─── handleApproval() — happy path ───────────────────────────────────────────

describe('handleApproval() — happy path', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Given an approved job, When handleApproval called, Then tailorFn invoked with job title, company, and url', async () => {
    const db = makeDb();
    const jobId = seedJob(db);
    const fixtures = makePdfFixtures();
    const tailorFn = jest.fn().mockResolvedValue(fixtures);
    mockFetch();

    await handleApproval(db, 'token', 'chat-123', jobId, tailorFn);

    const job = getJobById(db, jobId)!;
    expect(tailorFn).toHaveBeenCalledWith(job.title, job.company, job.url);
    cleanPdfFixtures(fixtures);
  });

  test('Given an approved job, When handleApproval called, Then sends exactly two documents via Telegram sendDocument', async () => {
    const db = makeDb();
    const jobId = seedJob(db);
    const fixtures = makePdfFixtures();
    const tailorFn = jest.fn().mockResolvedValue(fixtures);
    const fetchSpy = mockFetch();

    await handleApproval(db, 'token', 'chat-123', jobId, tailorFn);

    const sendDocCalls = fetchSpy.mock.calls.filter(
      (call) => (call[0] as string).includes('sendDocument'),
    );
    expect(sendDocCalls).toHaveLength(2);
    cleanPdfFixtures(fixtures);
  });

  test('Given an approved job, When handleApproval called, Then uses bot token in sendDocument URL', async () => {
    const db = makeDb();
    const jobId = seedJob(db);
    const fixtures = makePdfFixtures();
    const tailorFn = jest.fn().mockResolvedValue(fixtures);
    const fetchSpy = mockFetch();

    await handleApproval(db, 'mytoken', 'chat-123', jobId, tailorFn);

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/botmytoken/sendDocument');
    cleanPdfFixtures(fixtures);
  });

  test('Given an approved job, When handleApproval called, Then both sendDocument calls use correct caption', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { title: 'Staff Engineer', company: 'Acme Corp' });
    const fixtures = makePdfFixtures();
    const tailorFn = jest.fn().mockResolvedValue(fixtures);
    const fetchSpy = mockFetch();

    await handleApproval(db, 'token', 'chat-123', jobId, tailorFn);

    for (const call of fetchSpy.mock.calls) {
      const form = (call as [string, RequestInit])[1].body as unknown as FormData;
      expect(form.get('caption')).toBe('Resume and cover letter for Staff Engineer at Acme Corp');
    }
    cleanPdfFixtures(fixtures);
  });

  test('Given an approved job, When handleApproval called, Then both sendDocument calls use correct chat_id', async () => {
    const db = makeDb();
    const jobId = seedJob(db);
    const fixtures = makePdfFixtures();
    const tailorFn = jest.fn().mockResolvedValue(fixtures);
    const fetchSpy = mockFetch();

    await handleApproval(db, 'token', 'chat-456', jobId, tailorFn);

    for (const call of fetchSpy.mock.calls) {
      const form = (call as [string, RequestInit])[1].body as unknown as FormData;
      expect(form.get('chat_id')).toBe('chat-456');
    }
    cleanPdfFixtures(fixtures);
  });

  test('Given an approved job, When handleApproval called, Then records application row in DB', async () => {
    const db = makeDb();
    const jobId = seedJob(db);
    const fixtures = makePdfFixtures();
    const tailorFn = jest.fn().mockResolvedValue(fixtures);
    mockFetch();

    await handleApproval(db, 'token', 'chat-123', jobId, tailorFn);

    expect(getApplication(db, jobId)).toBeDefined();
    cleanPdfFixtures(fixtures);
  });

  test('Given an approved job, When handleApproval called, Then application row has result pdfs_sent', async () => {
    const db = makeDb();
    const jobId = seedJob(db);
    const fixtures = makePdfFixtures();
    const tailorFn = jest.fn().mockResolvedValue(fixtures);
    mockFetch();

    await handleApproval(db, 'token', 'chat-123', jobId, tailorFn);

    const app = getApplication(db, jobId)!;
    expect(app.result).toBe('pdfs_sent');
    cleanPdfFixtures(fixtures);
  });

  test('Given an approved job, When handleApproval called, Then application row has method manual', async () => {
    const db = makeDb();
    const jobId = seedJob(db);
    const fixtures = makePdfFixtures();
    const tailorFn = jest.fn().mockResolvedValue(fixtures);
    mockFetch();

    await handleApproval(db, 'token', 'chat-123', jobId, tailorFn);

    const app = getApplication(db, jobId)!;
    expect(app.method).toBe('manual');
    cleanPdfFixtures(fixtures);
  });

  test('Given an approved job, When handleApproval called, Then application row submitted_at is a valid ISO timestamp', async () => {
    const db = makeDb();
    const jobId = seedJob(db);
    const fixtures = makePdfFixtures();
    const tailorFn = jest.fn().mockResolvedValue(fixtures);
    mockFetch();

    const before = new Date().toISOString();
    await handleApproval(db, 'token', 'chat-123', jobId, tailorFn);
    const after = new Date().toISOString();

    const app = getApplication(db, jobId)!;
    expect(app.submitted_at >= before).toBe(true);
    expect(app.submitted_at <= after).toBe(true);
    cleanPdfFixtures(fixtures);
  });
});

// ─── handleApproval() — job not found ────────────────────────────────────────

describe('handleApproval() — job not found', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Given non-existent jobId, When handleApproval called, Then tailorFn is not called', async () => {
    const db = makeDb();
    const tailorFn = jest.fn();
    mockFetch();

    await handleApproval(db, 'token', 'chat-123', 9999, tailorFn);

    expect(tailorFn).not.toHaveBeenCalled();
  });

  test('Given non-existent jobId, When handleApproval called, Then no Telegram API calls made', async () => {
    const db = makeDb();
    const tailorFn = jest.fn();
    const fetchSpy = mockFetch();

    await handleApproval(db, 'token', 'chat-123', 9999, tailorFn);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('Given non-existent jobId, When handleApproval called, Then no application row created', async () => {
    const db = makeDb();
    const tailorFn = jest.fn();
    mockFetch();

    await handleApproval(db, 'token', 'chat-123', 9999, tailorFn);

    expect(getApplication(db, 9999)).toBeUndefined();
  });
});

// ─── handleApproval() — sendDocument failure ─────────────────────────────────

describe('handleApproval() — sendDocument failure', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Given Telegram sendDocument returns non-ok, When handleApproval called, Then throws', async () => {
    const db = makeDb();
    const jobId = seedJob(db);
    const fixtures = makePdfFixtures();
    const tailorFn = jest.fn().mockResolvedValue(fixtures);
    mockFetch(false);

    await expect(handleApproval(db, 'token', 'chat-123', jobId, tailorFn)).rejects.toThrow('sendDocument failed');
    cleanPdfFixtures(fixtures);
  });

  test('Given Telegram sendDocument returns non-ok, When handleApproval called, Then application row is not created', async () => {
    const db = makeDb();
    const jobId = seedJob(db);
    const fixtures = makePdfFixtures();
    const tailorFn = jest.fn().mockResolvedValue(fixtures);
    mockFetch(false);

    await expect(handleApproval(db, 'token', 'chat-123', jobId, tailorFn)).rejects.toThrow();
    expect(getApplication(db, jobId)).toBeUndefined();
    cleanPdfFixtures(fixtures);
  });
});

// ─── handleApproval() — tailorFn failure ─────────────────────────────────────

describe('handleApproval() — tailorFn failure', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Given tailorFn rejects, When handleApproval called, Then error propagates', async () => {
    const db = makeDb();
    const jobId = seedJob(db);
    const tailorFn = jest.fn().mockRejectedValue(new Error('CLI failed'));
    mockFetch();

    await expect(handleApproval(db, 'token', 'chat-123', jobId, tailorFn)).rejects.toThrow('CLI failed');
  });

  test('Given tailorFn rejects, When handleApproval called, Then no Telegram API calls made', async () => {
    const db = makeDb();
    const jobId = seedJob(db);
    const tailorFn = jest.fn().mockRejectedValue(new Error('CLI failed'));
    const fetchSpy = mockFetch();

    await expect(handleApproval(db, 'token', 'chat-123', jobId, tailorFn)).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ─── runApprovalHandler() — missing credentials ───────────────────────────────

describe('runApprovalHandler() — missing credentials', () => {
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

  test('Given no TELEGRAM_BOT_TOKEN, When runApprovalHandler called without explicit token, Then throws', () => {
    const db = makeDb();
    expect(() => runApprovalHandler(db, new EventEmitter())).toThrow('TELEGRAM_BOT_TOKEN');
  });

  test('Given TELEGRAM_BOT_TOKEN set but no TELEGRAM_CHAT_ID, When runApprovalHandler called without explicit chatId, Then throws', () => {
    const db = makeDb();
    expect(() => runApprovalHandler(db, new EventEmitter(), 'token-123')).toThrow('TELEGRAM_CHAT_ID');
  });
});

// ─── runApprovalHandler() — approve event dispatch ───────────────────────────

describe('runApprovalHandler() — approve event dispatch', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Given approve event emitted with jobId, When handler registered, Then tailorFn called for that job', async () => {
    const db = makeDb();
    const jobId = seedJob(db);
    const fixtures = makePdfFixtures();
    const tailorFn = jest.fn().mockResolvedValue(fixtures);
    mockFetch();

    const emitter = new EventEmitter();
    runApprovalHandler(db, emitter, 'token', 'chat-123', tailorFn);
    emitter.emit('approve', jobId);

    await flushPromises();

    const job = getJobById(db, jobId)!;
    expect(tailorFn).toHaveBeenCalledWith(job.title, job.company, job.url);
    cleanPdfFixtures(fixtures);
  });

  test('Given approve event emitted, When handler registered, Then application row is written after completion', async () => {
    const db = makeDb();
    const jobId = seedJob(db);
    const fixtures = makePdfFixtures();
    const tailorFn = jest.fn().mockResolvedValue(fixtures);
    mockFetch();

    const emitter = new EventEmitter();
    runApprovalHandler(db, emitter, 'token', 'chat-123', tailorFn);
    emitter.emit('approve', jobId);

    await flushPromises();

    expect(getApplication(db, jobId)).toBeDefined();
    cleanPdfFixtures(fixtures);
  });

  test('Given tailorFn rejects on approve event, When handler registered, Then emitter does not crash', async () => {
    const db = makeDb();
    const jobId = seedJob(db);
    const tailorFn = jest.fn().mockRejectedValue(new Error('CLI failed'));
    mockFetch();

    const emitter = new EventEmitter();
    runApprovalHandler(db, emitter, 'token', 'chat-123', tailorFn);

    expect(() => emitter.emit('approve', jobId)).not.toThrow();
    await flushPromises();
  });

  test('Given env vars set, When runApprovalHandler called without explicit credentials, Then uses env vars', () => {
    const db = makeDb();
    process.env.TELEGRAM_BOT_TOKEN = 'env-token';
    process.env.TELEGRAM_CHAT_ID = 'env-chat';

    expect(() => runApprovalHandler(db, new EventEmitter())).not.toThrow();

    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });
});
