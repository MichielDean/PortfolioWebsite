import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { getJobById, addApplication } from '../db/index.js';
import type { Job } from '../db/index.js';

const GREENHOUSE_APPLY_URL = 'https://boards-api.greenhouse.io/v1/applications';
const LEVER_APPLY_BASE = 'https://api.lever.co/v0/postings';
const TELEGRAM_API_BASE = 'https://api.telegram.org';

export interface ApplicantProfile {
  firstName: string;
  lastName: string;
  email: string;
}

export type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function appendPdf(form: FormData, field: string, filePath: string): void {
  form.append(field, new Blob([fs.readFileSync(filePath)], { type: 'application/pdf' }), path.basename(filePath));
}

async function applyGreenhouse(
  job: Job,
  resumePdfPath: string,
  profile: ApplicantProfile,
  fetchFn: FetchFn,
): Promise<void> {
  const form = new FormData();
  form.append('first_name', profile.firstName);
  form.append('last_name', profile.lastName);
  form.append('email', profile.email);
  form.append('job_id', job.external_id);
  appendPdf(form, 'resume', resumePdfPath);

  const response = await fetchFn(GREENHOUSE_APPLY_URL, { method: 'POST', body: form });

  if (response.status !== 200 && response.status !== 201) {
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(`Greenhouse apply failed: ${response.status} ${body.message ?? response.statusText}`);
  }
}

async function applyLever(
  job: Job,
  resumePdfPath: string,
  profile: ApplicantProfile,
  fetchFn: FetchFn,
): Promise<void> {
  const form = new FormData();
  form.append('data', JSON.stringify({
    name: `${profile.firstName} ${profile.lastName}`,
    email: profile.email,
  }));
  appendPdf(form, 'resume', resumePdfPath);

  const response = await fetchFn(`${LEVER_APPLY_BASE}/${job.external_id}/apply`, { method: 'POST', body: form });

  if (response.status !== 200 && response.status !== 201) {
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(`Lever apply failed: ${response.status} ${body.message ?? response.statusText}`);
  }
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  fetchFn: FetchFn,
): Promise<void> {
  const response = await fetchFn(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { description?: string };
    throw new Error(`Telegram sendMessage failed: ${response.status} ${body.description ?? response.statusText}`);
  }
}

async function sendTelegramDocument(
  botToken: string,
  chatId: string,
  filePath: string,
  caption: string,
  fetchFn: FetchFn,
): Promise<void> {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('caption', caption);
  appendPdf(form, 'document', filePath);

  const response = await fetchFn(`${TELEGRAM_API_BASE}/bot${botToken}/sendDocument`, { method: 'POST', body: form });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { description?: string };
    throw new Error(`Telegram sendDocument failed: ${response.status} ${body.description ?? response.statusText}`);
  }
}

async function sendManualFallback(
  db: Database.Database,
  botToken: string,
  chatId: string,
  job: Job,
  resumePdfPath: string,
  coverLetterPdfPath: string,
  fetchFn: FetchFn,
): Promise<void> {
  const text = `Apply manually: ${job.url}`;
  await sendTelegramMessage(botToken, chatId, text, fetchFn);
  await sendTelegramDocument(botToken, chatId, resumePdfPath, text, fetchFn);
  await sendTelegramDocument(botToken, chatId, coverLetterPdfPath, text, fetchFn);
  addApplication(db, {
    job_id: job.id,
    method: 'manual',
    submitted_at: new Date().toISOString(),
    result: 'manual_required',
  });
}

/**
 * Attempt to auto-apply to a job via its ATS.
 *
 * - Greenhouse: multipart POST with profile fields + resume PDF
 * - Lever: multipart POST with JSON data field + resume PDF
 * - On success (HTTP 200 or 201): records application result='submitted', sends Telegram confirmation
 * - On ATS failure or unrecognised ats_type: sends Telegram 'Apply manually: {url}' with both PDFs
 *   and records result='manual_required'
 *
 * @param fetchFn  Injectable fetch function; defaults to the global fetch.
 */
export async function runApplyEngine(
  db: Database.Database,
  botToken: string,
  chatId: string,
  jobId: number,
  resumePdfPath: string,
  coverLetterPdfPath: string,
  profile: ApplicantProfile,
  fetchFn: FetchFn = fetch,
): Promise<void> {
  const job = getJobById(db, jobId);
  if (!job) {
    console.warn(`runApplyEngine: job ${jobId} not found in DB`);
    return;
  }

  if (job.ats_type === 'greenhouse' || job.ats_type === 'lever') {
    const applyFn = job.ats_type === 'greenhouse'
      ? () => applyGreenhouse(job, resumePdfPath, profile, fetchFn)
      : () => applyLever(job, resumePdfPath, profile, fetchFn);
    try {
      await applyFn();
      addApplication(db, {
        job_id: job.id,
        method: job.ats_type,
        submitted_at: new Date().toISOString(),
        result: 'submitted',
      });
      await sendTelegramMessage(botToken, chatId, `Application submitted: ${job.title} at ${job.company}`, fetchFn);
    } catch (err) {
      console.warn(`runApplyEngine: ${job.ats_type} apply failed for job ${jobId}:`, err);
      await sendManualFallback(db, botToken, chatId, job, resumePdfPath, coverLetterPdfPath, fetchFn);
    }
  } else {
    await sendManualFallback(db, botToken, chatId, job, resumePdfPath, coverLetterPdfPath, fetchFn);
  }
}
