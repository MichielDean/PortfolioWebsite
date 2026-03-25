import Database from 'better-sqlite3';
import { getEligibleUnnotifiedJobs, upsertApproval } from '../db/index.js';
import type { EligibleJob } from '../db/index.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const MIN_NOTIFY_SCORE = 6;

/** Format a job as an HTML message for Telegram. */
export function formatJobMessage(job: EligibleJob): string {
  const lines: string[] = [
    `<b>${job.title}</b>`,
    `<b>Company:</b> ${job.company}`,
  ];
  if (job.salary_raw != null) {
    lines.push(`<b>Salary:</b> ${job.salary_raw}`);
  }
  if (job.posted_at != null) {
    lines.push(`<b>Posted:</b> ${job.posted_at}`);
  }
  lines.push(`<b>Fit score:</b> ${job.score}/10`);
  lines.push(`<b>Rationale:</b> ${job.rationale}`);
  lines.push(`<a href="${job.url}">View job</a>`);
  return lines.join('\n');
}

async function sendJobNotification(
  botToken: string,
  chatId: string,
  job: EligibleJob,
): Promise<void> {
  const response = await fetch(
    `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formatJobMessage(job),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: 'Approve ✅', callback_data: `approve:${job.id}` },
            { text: 'Deny ❌', callback_data: `deny:${job.id}` },
          ]],
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.status} ${response.statusText}`);
  }
}

export interface NotifierResult {
  notified: number;
  skipped: number;
}

/**
 * Send Telegram job-card notifications for all eligible, unnotified jobs.
 *
 * A job is eligible when its score >= MIN_NOTIFY_SCORE and it has no approval
 * record yet. After a successful send the job receives a pending approval row
 * so it will not be re-sent on subsequent runs.
 *
 * Credentials are taken from the explicit parameters when supplied; otherwise
 * from TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables.
 */
export async function runNotifier(
  db: Database.Database,
  botToken?: string,
  chatId?: string,
): Promise<NotifierResult> {
  const token = botToken ?? process.env.TELEGRAM_BOT_TOKEN;
  const chat = chatId ?? process.env.TELEGRAM_CHAT_ID;

  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
  if (!chat) throw new Error('TELEGRAM_CHAT_ID is required');

  const jobs = getEligibleUnnotifiedJobs(db, MIN_NOTIFY_SCORE);
  let notified = 0;
  let skipped = 0;

  for (const job of jobs) {
    try {
      await sendJobNotification(token, chat, job);
      upsertApproval(db, { job_id: job.id, status: 'pending' });
      notified++;
    } catch (err) {
      console.warn(`Failed to notify job ${job.id}:`, err);
      skipped++;
    }
  }

  return { notified, skipped };
}
