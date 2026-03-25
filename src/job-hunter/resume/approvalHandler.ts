import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import Database from 'better-sqlite3';
import { getJobById, addApplication } from '../db/index.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

export interface TailorResult {
  resumePdf: string;
  coverLetterPdf: string;
}

export type TailorFn = (
  jobTitle: string,
  company: string,
  jobUrl: string,
) => Promise<TailorResult>;

function sanitizeCompany(company: string): string {
  const s = company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return s.length > 0 ? s : 'unknown_company';
}

async function defaultTailorFn(
  jobTitle: string,
  company: string,
  jobUrl: string,
): Promise<TailorResult> {
  return new Promise((resolve, reject) => {
    const cliPath = path.join(process.cwd(), 'dist/resume-cli/resume/cli/resumeTailor.js');
    const child = spawn('node', [
      cliPath,
      '--url', jobUrl,
      '--job-title', jobTitle,
      '--company', company,
    ]);

    child.stderr?.on('data', (data: Buffer) => {
      console.warn('resumeTailor stderr:', data.toString());
    });

    child.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`resumeTailor exited with code ${code}`));
        return;
      }
      const companySuffix = sanitizeCompany(company);
      resolve({
        resumePdf: `./generated/resume_${companySuffix}.pdf`,
        coverLetterPdf: `./generated/cover-letter_${companySuffix}.pdf`,
      });
    });

    child.on('error', reject);
  });
}

async function sendDocument(
  botToken: string,
  chatId: string,
  filePath: string,
  caption: string,
): Promise<void> {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('caption', caption);
  form.append('document', new Blob([fileBuffer], { type: 'application/pdf' }), fileName);

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendDocument`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    throw new Error(`sendDocument failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * Handle an approved job: invoke the resume tailor, send both PDFs via
 * Telegram, and record the delivery in the applications table.
 *
 * @param tailorFn  Injectable tailor function; defaults to the child-process
 *                  implementation that runs resumeTailor.js.
 */
export async function handleApproval(
  db: Database.Database,
  botToken: string,
  chatId: string,
  jobId: number,
  tailorFn: TailorFn = defaultTailorFn,
): Promise<void> {
  const job = getJobById(db, jobId);
  if (!job) {
    console.warn(`handleApproval: job ${jobId} not found in DB`);
    return;
  }

  const { resumePdf, coverLetterPdf } = await tailorFn(job.title, job.company, job.url);
  const caption = `Resume and cover letter for ${job.title} at ${job.company}`;

  await sendDocument(botToken, chatId, resumePdf, caption);
  await sendDocument(botToken, chatId, coverLetterPdf, caption);

  addApplication(db, {
    job_id: jobId,
    method: 'manual',
    submitted_at: new Date().toISOString(),
    result: 'pdfs_sent',
  });
}

/**
 * Register an 'approve' event listener on the emitter. For each approved
 * job, runs the full PDF generation and Telegram delivery pipeline.
 *
 * Credentials fall back to TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars
 * when not supplied explicitly.
 */
export function runApprovalHandler(
  db: Database.Database,
  emitter: EventEmitter,
  botToken?: string,
  chatId?: string,
  tailorFn?: TailorFn,
): void {
  const token = botToken ?? process.env.TELEGRAM_BOT_TOKEN;
  const chat = chatId ?? process.env.TELEGRAM_CHAT_ID;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
  if (!chat) throw new Error('TELEGRAM_CHAT_ID is required');

  emitter.on('approve', (jobId: number) => {
    handleApproval(db, token, chat, jobId, tailorFn).catch((err) => {
      console.warn(`handleApproval failed for job ${jobId}:`, err);
    });
  });
}
