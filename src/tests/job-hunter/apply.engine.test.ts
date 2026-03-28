/**
 * Tests for the apply engine.
 *
 * Uses an in-memory SQLite DB for real persistence and injects a mock fetchFn
 * so no real HTTP calls are made.
 *
 * Structure follows Given / When / Then:
 *   Given: DB state + fixture PDFs + mock fetch
 *   When:  runApplyEngine() called
 *   Then:  fetch calls, DB state, and return values match expectations
 */

import os from 'os';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { runMigrations } from '../../job-hunter/db/migrations';
import {
  upsertJob,
  addScore,
  upsertApproval,
  getApplication,
} from '../../job-hunter/db/repository';
import { runApplyEngine } from '../../job-hunter/apply/engine';
import type { ApplicantProfile, FetchFn } from '../../job-hunter/apply/engine';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

const TEST_PROFILE: ApplicantProfile = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
};

function seedJob(
  db: Database.Database,
  overrides: {
    ats_type?: string;
    external_id?: string;
    url?: string;
    company?: string;
    title?: string;
  } = {},
): number {
  const job = upsertJob(db, {
    source: 'greenhouse',
    ats_type: (overrides.ats_type ?? 'greenhouse') as import('../../job-hunter/db/types').AtsType,
    external_id: overrides.external_id ?? '99001',
    title: overrides.title ?? 'Staff Engineer',
    company: overrides.company ?? 'Acme Corp',
    url: overrides.url ?? 'https://acme.com/jobs/99001',
    salary_raw: null,
    posted_at: null,
  });
  addScore(db, { job_id: job.id, score: 9, rationale: 'Great match' });
  upsertApproval(db, { job_id: job.id, status: 'approved' });
  return job.id;
}

/** Create real temp PDF files and return their paths. */
function makePdfFixtures(): { resumePdf: string; coverLetterPdf: string } {
  const dir = os.tmpdir();
  const tag = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const resumePdf = path.join(dir, `resume-fixture-${tag}.pdf`);
  const coverLetterPdf = path.join(dir, `cover-letter-fixture-${tag}.pdf`);
  fs.writeFileSync(resumePdf, Buffer.from('%PDF-1.4 mock-resume'));
  fs.writeFileSync(coverLetterPdf, Buffer.from('%PDF-1.4 mock-cover-letter'));
  return { resumePdf, coverLetterPdf };
}

function cleanPdfFixtures(fixtures: { resumePdf: string; coverLetterPdf: string }): void {
  try { fs.unlinkSync(fixtures.resumePdf); } catch { /* already removed */ }
  try { fs.unlinkSync(fixtures.coverLetterPdf); } catch { /* already removed */ }
}

type MockResponseSpec = { ok: boolean; status: number };

/** Build a jest.fn() that returns mock responses in sequence. */
function makeMockFetch(responses: MockResponseSpec[]): jest.MockedFunction<FetchFn> {
  let callIndex = 0;
  return jest.fn().mockImplementation(() => {
    const res = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return Promise.resolve({
      ok: res.ok,
      status: res.status,
      statusText: res.ok ? 'OK' : 'Bad Request',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    } as unknown as Response);
  });
}

/** All-success mock: every call returns 200 ok. */
function allSuccessFetch(): jest.MockedFunction<FetchFn> {
  return makeMockFetch([{ ok: true, status: 200 }]);
}

// ─── runApplyEngine() — Greenhouse happy path ─────────────────────────────────

describe('runApplyEngine() — Greenhouse happy path', () => {
  test('Given a Greenhouse job, When runApplyEngine called, Then POSTs to the Greenhouse applications endpoint', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = allSuccessFetch();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const firstUrl = (fetchMock.mock.calls[0] as [string, RequestInit])[0];
    expect(firstUrl).toBe('https://boards-api.greenhouse.io/v1/applications');
    cleanPdfFixtures(fixtures);
  });

  test('Given a Greenhouse job, When runApplyEngine called, Then form includes first_name from profile', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = allSuccessFetch();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as unknown as FormData;
    expect(form.get('first_name')).toBe(TEST_PROFILE.firstName);
    cleanPdfFixtures(fixtures);
  });

  test('Given a Greenhouse job, When runApplyEngine called, Then form includes last_name from profile', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = allSuccessFetch();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as unknown as FormData;
    expect(form.get('last_name')).toBe(TEST_PROFILE.lastName);
    cleanPdfFixtures(fixtures);
  });

  test('Given a Greenhouse job, When runApplyEngine called, Then form includes email from profile', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = allSuccessFetch();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as unknown as FormData;
    expect(form.get('email')).toBe(TEST_PROFILE.email);
    cleanPdfFixtures(fixtures);
  });

  test('Given a Greenhouse job, When runApplyEngine called, Then form includes job_id matching external_id', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse', external_id: '42001' });
    const fixtures = makePdfFixtures();
    const fetchMock = allSuccessFetch();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as unknown as FormData;
    expect(form.get('job_id')).toBe('42001');
    cleanPdfFixtures(fixtures);
  });

  test('Given a Greenhouse job, When runApplyEngine called, Then form includes resume PDF attachment', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = allSuccessFetch();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as unknown as FormData;
    expect(form.get('resume')).toBeTruthy();
    cleanPdfFixtures(fixtures);
  });

  test('Given a Greenhouse job, When runApplyEngine called and returns 200, Then records application with method greenhouse', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, allSuccessFetch());

    expect(getApplication(db, jobId)?.method).toBe('greenhouse');
    cleanPdfFixtures(fixtures);
  });

  test('Given a Greenhouse job, When runApplyEngine called and returns 200, Then records application with result submitted', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, allSuccessFetch());

    expect(getApplication(db, jobId)?.result).toBe('submitted');
    cleanPdfFixtures(fixtures);
  });

  test('Given a Greenhouse job, When runApplyEngine called and returns 201, Then records application with result submitted', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: true, status: 201 }, // Greenhouse
      { ok: true, status: 200 }, // Telegram
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    expect(getApplication(db, jobId)?.result).toBe('submitted');
    cleanPdfFixtures(fixtures);
  });

  test('Given a Greenhouse job, When runApplyEngine called and succeeds, Then sends Telegram confirmation via sendMessage', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = allSuccessFetch();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const confirmationCalls = fetchMock.mock.calls.filter(
      (call) => (call[0] as string).includes('sendMessage'),
    );
    expect(confirmationCalls).toHaveLength(1);
    cleanPdfFixtures(fixtures);
  });

  test('Given a Greenhouse job, When runApplyEngine called and succeeds, Then Telegram confirmation uses bot token in URL', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = allSuccessFetch();

    await runApplyEngine(db, 'mytoken', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const sendMessageCall = fetchMock.mock.calls.find(
      (call) => (call[0] as string).includes('sendMessage'),
    )!;
    expect(sendMessageCall[0]).toContain('/botmytoken/sendMessage');
    cleanPdfFixtures(fixtures);
  });
});

// ─── runApplyEngine() — Lever happy path ──────────────────────────────────────

describe('runApplyEngine() — Lever happy path', () => {
  test('Given a Lever job, When runApplyEngine called, Then POSTs to the Lever postings apply endpoint', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'lever', external_id: 'lever-abc-123', company: 'acme' });
    const fixtures = makePdfFixtures();
    const fetchMock = allSuccessFetch();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const firstUrl = (fetchMock.mock.calls[0] as [string, RequestInit])[0];
    expect(firstUrl).toBe('https://api.lever.co/v0/postings/acme/lever-abc-123/apply');
    cleanPdfFixtures(fixtures);
  });

  test('Given a Lever job, When runApplyEngine called, Then form data field contains name from profile', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'lever', external_id: 'lever-xyz' });
    const fixtures = makePdfFixtures();
    const fetchMock = allSuccessFetch();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as unknown as FormData;
    const data = JSON.parse(form.get('data') as string) as { name: string; email: string };
    expect(data.name).toBe(`${TEST_PROFILE.firstName} ${TEST_PROFILE.lastName}`);
    cleanPdfFixtures(fixtures);
  });

  test('Given a Lever job, When runApplyEngine called, Then form data field contains email from profile', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'lever', external_id: 'lever-xyz' });
    const fixtures = makePdfFixtures();
    const fetchMock = allSuccessFetch();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as unknown as FormData;
    const data = JSON.parse(form.get('data') as string) as { name: string; email: string };
    expect(data.email).toBe(TEST_PROFILE.email);
    cleanPdfFixtures(fixtures);
  });

  test('Given a Lever job, When runApplyEngine called, Then form includes resume PDF attachment', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'lever', external_id: 'lever-resume-check' });
    const fixtures = makePdfFixtures();
    const fetchMock = allSuccessFetch();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as unknown as FormData;
    expect(form.get('resume')).toBeTruthy();
    cleanPdfFixtures(fixtures);
  });

  test('Given a Lever job, When runApplyEngine called and returns 200, Then records application with method lever', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'lever', external_id: 'lever-001' });
    const fixtures = makePdfFixtures();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, allSuccessFetch());

    expect(getApplication(db, jobId)?.method).toBe('lever');
    cleanPdfFixtures(fixtures);
  });

  test('Given a Lever job, When runApplyEngine called and returns 200, Then records application with result submitted', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'lever', external_id: 'lever-001' });
    const fixtures = makePdfFixtures();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, allSuccessFetch());

    expect(getApplication(db, jobId)?.result).toBe('submitted');
    cleanPdfFixtures(fixtures);
  });

  test('Given a Lever job, When runApplyEngine called and returns 201, Then records application with result submitted', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'lever', external_id: 'lever-002' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: true, status: 201 }, // Lever
      { ok: true, status: 200 }, // Telegram
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    expect(getApplication(db, jobId)?.result).toBe('submitted');
    cleanPdfFixtures(fixtures);
  });

  test('Given a Lever job, When runApplyEngine called and succeeds, Then sends Telegram confirmation', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'lever', external_id: 'lever-003' });
    const fixtures = makePdfFixtures();
    const fetchMock = allSuccessFetch();

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const confirmationCalls = fetchMock.mock.calls.filter(
      (call) => (call[0] as string).includes('sendMessage'),
    );
    expect(confirmationCalls).toHaveLength(1);
    cleanPdfFixtures(fixtures);
  });
});

// ─── runApplyEngine() — Greenhouse failure → manual fallback ──────────────────

describe('runApplyEngine() — Greenhouse failure sends manual fallback', () => {
  test('Given a Greenhouse job and apply returns 422, When runApplyEngine called, Then sends Telegram message with Apply manually text', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse', url: 'https://acme.com/jobs/42' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: false, status: 422 }, // Greenhouse fail
      { ok: true, status: 200 },  // Telegram sendMessage
      { ok: true, status: 200 },  // Telegram sendDocument resume
      { ok: true, status: 200 },  // Telegram sendDocument cover letter
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const sendMessageCall = fetchMock.mock.calls.find(
      (call) => (call[0] as string).includes('sendMessage'),
    )!;
    const body = JSON.parse((sendMessageCall[1] as RequestInit).body as string) as { text?: string };
    expect(body.text).toContain('Apply manually: https://acme.com/jobs/42');
    cleanPdfFixtures(fixtures);
  });

  test('Given a Greenhouse job and apply returns 422, When runApplyEngine called, Then sends both PDFs via sendDocument', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: false, status: 422 }, // Greenhouse fail
      { ok: true, status: 200 },  // Telegram sendMessage
      { ok: true, status: 200 },  // Telegram sendDocument 1
      { ok: true, status: 200 },  // Telegram sendDocument 2
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const sendDocCalls = fetchMock.mock.calls.filter(
      (call) => (call[0] as string).includes('sendDocument'),
    );
    expect(sendDocCalls).toHaveLength(2);
    cleanPdfFixtures(fixtures);
  });

  test('Given a Greenhouse job and apply returns 422, When runApplyEngine called, Then records application with method manual', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: false, status: 422 },
      { ok: true, status: 200 },
      { ok: true, status: 200 },
      { ok: true, status: 200 },
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    expect(getApplication(db, jobId)?.method).toBe('manual');
    cleanPdfFixtures(fixtures);
  });

  test('Given a Greenhouse job and apply returns 422, When runApplyEngine called, Then records application with result manual_required', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: false, status: 422 },
      { ok: true, status: 200 },
      { ok: true, status: 200 },
      { ok: true, status: 200 },
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    expect(getApplication(db, jobId)?.result).toBe('manual_required');
    cleanPdfFixtures(fixtures);
  });
});

// ─── runApplyEngine() — Lever failure → manual fallback ───────────────────────

describe('runApplyEngine() — Lever failure sends manual fallback', () => {
  test('Given a Lever job and apply returns 500, When runApplyEngine called, Then sends Telegram message with Apply manually text', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'lever', external_id: 'lever-fail-1', url: 'https://lever.co/jobs/lever-fail-1' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: false, status: 500 }, // Lever fail
      { ok: true, status: 200 },  // Telegram sendMessage
      { ok: true, status: 200 },  // Telegram sendDocument resume
      { ok: true, status: 200 },  // Telegram sendDocument cover letter
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const sendMessageCall = fetchMock.mock.calls.find(
      (call) => (call[0] as string).includes('sendMessage'),
    )!;
    const body = JSON.parse((sendMessageCall[1] as RequestInit).body as string) as { text?: string };
    expect(body.text).toContain('Apply manually: https://lever.co/jobs/lever-fail-1');
    cleanPdfFixtures(fixtures);
  });

  test('Given a Lever job and apply returns 500, When runApplyEngine called, Then sends both PDFs via sendDocument', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'lever', external_id: 'lever-fail-2' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: false, status: 500 },
      { ok: true, status: 200 },
      { ok: true, status: 200 },
      { ok: true, status: 200 },
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const sendDocCalls = fetchMock.mock.calls.filter(
      (call) => (call[0] as string).includes('sendDocument'),
    );
    expect(sendDocCalls).toHaveLength(2);
    cleanPdfFixtures(fixtures);
  });

  test('Given a Lever job and apply returns 500, When runApplyEngine called, Then records application with result manual_required', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'lever', external_id: 'lever-fail-3' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: false, status: 500 },
      { ok: true, status: 200 },
      { ok: true, status: 200 },
      { ok: true, status: 200 },
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    expect(getApplication(db, jobId)?.result).toBe('manual_required');
    cleanPdfFixtures(fixtures);
  });
});

// ─── runApplyEngine() — unknown ATS → manual fallback ─────────────────────────

describe('runApplyEngine() — unknown ATS type sends manual fallback', () => {
  test('Given a job with ats_type workday, When runApplyEngine called, Then sends Telegram message with Apply manually text', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'workday', url: 'https://workday.com/jobs/1' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: true, status: 200 }, // Telegram sendMessage
      { ok: true, status: 200 }, // Telegram sendDocument resume
      { ok: true, status: 200 }, // Telegram sendDocument cover letter
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const sendMessageCall = fetchMock.mock.calls.find(
      (call) => (call[0] as string).includes('sendMessage'),
    )!;
    const body = JSON.parse((sendMessageCall[1] as RequestInit).body as string) as { text?: string };
    expect(body.text).toContain('Apply manually: https://workday.com/jobs/1');
    cleanPdfFixtures(fixtures);
  });

  test('Given a job with ats_type unknown, When runApplyEngine called, Then sends both PDFs via sendDocument', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'unknown' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: true, status: 200 },
      { ok: true, status: 200 },
      { ok: true, status: 200 },
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const sendDocCalls = fetchMock.mock.calls.filter(
      (call) => (call[0] as string).includes('sendDocument'),
    );
    expect(sendDocCalls).toHaveLength(2);
    cleanPdfFixtures(fixtures);
  });

  test('Given a job with ats_type unknown, When runApplyEngine called, Then records application with method manual', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'unknown' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: true, status: 200 },
      { ok: true, status: 200 },
      { ok: true, status: 200 },
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    expect(getApplication(db, jobId)?.method).toBe('manual');
    cleanPdfFixtures(fixtures);
  });

  test('Given a job with ats_type unknown, When runApplyEngine called, Then records application with result manual_required', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'unknown' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: true, status: 200 },
      { ok: true, status: 200 },
      { ok: true, status: 200 },
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    expect(getApplication(db, jobId)?.result).toBe('manual_required');
    cleanPdfFixtures(fixtures);
  });

  test('Given a job with ats_type taleo, When runApplyEngine called, Then does not call Greenhouse or Lever URLs', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'taleo' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: true, status: 200 },
      { ok: true, status: 200 },
      { ok: true, status: 200 },
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const atsCalls = fetchMock.mock.calls.filter(
      (call) => {
        const url = call[0] as string;
        return url.includes('boards-api.greenhouse.io') || url.includes('api.lever.co');
      },
    );
    expect(atsCalls).toHaveLength(0);
    cleanPdfFixtures(fixtures);
  });
});

// ─── runApplyEngine() — Telegram failure during manual fallback ───────────────

describe('runApplyEngine() — Telegram failure during manual fallback', () => {
  test('Given Greenhouse ATS fails AND Telegram sendMessage fails, When runApplyEngine called, Then DB records application with result manual_required', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: false, status: 422 }, // Greenhouse fail
      { ok: false, status: 429 }, // Telegram sendMessage fail
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    expect(getApplication(db, jobId)?.result).toBe('manual_required');
    cleanPdfFixtures(fixtures);
  });

  test('Given Greenhouse ATS fails AND Telegram sendMessage fails, When runApplyEngine called, Then runApplyEngine does not throw', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: false, status: 422 }, // Greenhouse fail
      { ok: false, status: 429 }, // Telegram sendMessage fail
    ]);

    await expect(
      runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock),
    ).resolves.toBeUndefined();
    cleanPdfFixtures(fixtures);
  });

  test('Given unknown ATS AND Telegram sendDocument fails, When runApplyEngine called, Then DB records application with result manual_required', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'workday', url: 'https://workday.com/jobs/9' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: true, status: 200 },  // Telegram sendMessage ok
      { ok: false, status: 503 }, // Telegram sendDocument resume fail
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    expect(getApplication(db, jobId)?.result).toBe('manual_required');
    cleanPdfFixtures(fixtures);
  });

  test('Given unknown ATS AND Telegram sendDocument fails, When runApplyEngine called, Then runApplyEngine does not throw', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'workday', url: 'https://workday.com/jobs/9' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: true, status: 200 },  // Telegram sendMessage ok
      { ok: false, status: 503 }, // Telegram sendDocument resume fail
    ]);

    await expect(
      runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock),
    ).resolves.toBeUndefined();
    cleanPdfFixtures(fixtures);
  });
});

// ─── runApplyEngine() — ATS success, Telegram confirmation failure ───────────

describe('runApplyEngine() — ATS succeeds but Telegram confirmation fails', () => {
  test('Given Greenhouse ATS returns 200 but Telegram sendMessage returns 429, When runApplyEngine called, Then DB still records result submitted', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: true, status: 200 },  // Greenhouse success
      { ok: false, status: 429 }, // Telegram sendMessage fail
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    expect(getApplication(db, jobId)?.result).toBe('submitted');
    cleanPdfFixtures(fixtures);
  });

  test('Given Greenhouse ATS returns 200 but Telegram sendMessage returns 429, When runApplyEngine called, Then no sendDocument calls are made', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: true, status: 200 },  // Greenhouse success
      { ok: false, status: 429 }, // Telegram sendMessage fail
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const sendDocCalls = fetchMock.mock.calls.filter(
      (call) => (call[0] as string).includes('sendDocument'),
    );
    expect(sendDocCalls).toHaveLength(0);
    cleanPdfFixtures(fixtures);
  });

  test('Given Greenhouse ATS returns 200 but Telegram sendMessage returns 429, When runApplyEngine called, Then runApplyEngine does not throw', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'greenhouse' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: true, status: 200 },  // Greenhouse success
      { ok: false, status: 429 }, // Telegram sendMessage fail
    ]);

    await expect(
      runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock),
    ).resolves.toBeUndefined();
    cleanPdfFixtures(fixtures);
  });

  test('Given Lever ATS returns 200 but Telegram sendMessage returns 429, When runApplyEngine called, Then DB still records result submitted', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'lever', external_id: 'lever-tg-fail-1' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: true, status: 200 },  // Lever success
      { ok: false, status: 429 }, // Telegram sendMessage fail
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    expect(getApplication(db, jobId)?.result).toBe('submitted');
    cleanPdfFixtures(fixtures);
  });

  test('Given Lever ATS returns 200 but Telegram sendMessage returns 429, When runApplyEngine called, Then no sendDocument calls are made', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'lever', external_id: 'lever-tg-fail-2' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: true, status: 200 },  // Lever success
      { ok: false, status: 429 }, // Telegram sendMessage fail
    ]);

    await runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock);

    const sendDocCalls = fetchMock.mock.calls.filter(
      (call) => (call[0] as string).includes('sendDocument'),
    );
    expect(sendDocCalls).toHaveLength(0);
    cleanPdfFixtures(fixtures);
  });

  test('Given Lever ATS returns 200 but Telegram sendMessage returns 429, When runApplyEngine called, Then runApplyEngine does not throw', async () => {
    const db = makeDb();
    const jobId = seedJob(db, { ats_type: 'lever', external_id: 'lever-tg-fail-3' });
    const fixtures = makePdfFixtures();
    const fetchMock = makeMockFetch([
      { ok: true, status: 200 },  // Lever success
      { ok: false, status: 429 }, // Telegram sendMessage fail
    ]);

    await expect(
      runApplyEngine(db, 'token', 'chat-123', jobId, fixtures.resumePdf, fixtures.coverLetterPdf, TEST_PROFILE, fetchMock),
    ).resolves.toBeUndefined();
    cleanPdfFixtures(fixtures);
  });
});

// ─── runApplyEngine() — job not found ────────────────────────────────────────

describe('runApplyEngine() — job not found', () => {
  test('Given non-existent jobId, When runApplyEngine called, Then no HTTP calls made', async () => {
    const db = makeDb();
    const fetchMock = jest.fn() as jest.MockedFunction<FetchFn>;

    await runApplyEngine(db, 'token', 'chat-123', 9999, '/tmp/resume.pdf', '/tmp/cover.pdf', TEST_PROFILE, fetchMock);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('Given non-existent jobId, When runApplyEngine called, Then no application row created', async () => {
    const db = makeDb();
    const fetchMock = jest.fn() as jest.MockedFunction<FetchFn>;

    await runApplyEngine(db, 'token', 'chat-123', 9999, '/tmp/resume.pdf', '/tmp/cover.pdf', TEST_PROFILE, fetchMock);

    expect(getApplication(db, 9999)).toBeUndefined();
  });
});
