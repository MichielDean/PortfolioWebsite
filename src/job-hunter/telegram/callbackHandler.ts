import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import { getApproval, upsertApproval, blacklistJob } from '../db/index.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

export interface CallbackHandlerResult {
  approved: number;
  denied: number;
  ignored: number;
}

/**
 * Parse a Telegram callback_data string of the form "approve:<id>" or "deny:<id>".
 * Returns null if the format is not recognised.
 */
export function parseCallbackData(
  data: string,
): { action: 'approve' | 'deny'; jobId: number } | null {
  const match = /^(approve|deny):(\d+)$/.exec(data);
  if (!match) return null;
  return { action: match[1] as 'approve' | 'deny', jobId: parseInt(match[2], 10) };
}

async function answerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  text: string,
): Promise<void> {
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
  if (!response.ok) {
    console.warn(`answerCallbackQuery failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * Process one callback_query update.
 *
 * - deny:    sets approval status='denied', blacklists the job, answers the query.
 * - approve: sets approval status='approved', emits 'approve' event, answers the query.
 * - no approval row or already actioned (not pending): no-op, returns 'ignored'.
 * - unrecognised callback_data: no-op, returns 'ignored'.
 *
 * Returns the outcome label.
 */
export async function handleCallback(
  db: Database.Database,
  botToken: string,
  emitter: EventEmitter,
  callbackQueryId: string,
  callbackData: string,
): Promise<'approved' | 'denied' | 'ignored'> {
  const parsed = parseCallbackData(callbackData);
  if (!parsed) return 'ignored';

  const { action, jobId } = parsed;

  // Idempotency: no approval row or already actioned → no-op
  const approval = getApproval(db, jobId);
  if (!approval || approval.status !== 'pending') return 'ignored';

  if (action === 'deny') {
    upsertApproval(db, { job_id: jobId, status: 'denied' });
    blacklistJob(db, jobId);
    await answerCallbackQuery(botToken, callbackQueryId, 'Job denied and blacklisted');
    return 'denied';
  } else {
    upsertApproval(db, { job_id: jobId, status: 'approved' });
    emitter.emit('approve', jobId);
    await answerCallbackQuery(botToken, callbackQueryId, 'Approved \u2014 generating resume\u2026');
    return 'approved';
  }
}

interface TelegramUpdate {
  update_id: number;
  callback_query?: {
    id: string;
    data?: string;
  };
}

/**
 * Long-poll Telegram for callback_query events and dispatch each one.
 *
 * Runs until the AbortSignal fires. Returns aggregate outcome counts.
 * Credentials fall back to TELEGRAM_BOT_TOKEN env var when not supplied.
 */
export async function runCallbackPoller(
  db: Database.Database,
  emitter: EventEmitter,
  botToken?: string,
  signal?: AbortSignal,
): Promise<CallbackHandlerResult> {
  const token = botToken ?? process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

  const totals: CallbackHandlerResult = { approved: 0, denied: 0, ignored: 0 };
  let offset = 0;
  const backoff = (): Promise<void> => new Promise<void>((resolve) => {
    const onAbort = () => { clearTimeout(timer); resolve(); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, 5000);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

  while (!signal?.aborted) {
    let response: Response;
    try {
      response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/getUpdates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset, timeout: 30, allowed_updates: ['callback_query'] }),
        signal,
      });
    } catch (err) {
      if (signal?.aborted) break;
      console.warn('getUpdates fetch error:', err);
      await backoff();
      continue;
    }

    if (!response.ok) {
      console.warn(`getUpdates failed: ${response.status} ${response.statusText}`);
      await backoff();
      continue;
    }

    let body: { ok: boolean; description?: string; result: TelegramUpdate[] };
    try {
      body = (await response.json()) as { ok: boolean; description?: string; result: TelegramUpdate[] };
    } catch (err) {
      console.warn('getUpdates response parse error:', err);
      await backoff();
      continue;
    }

    if (!body.ok) {
      throw new Error(`Telegram getUpdates error: ${body.description ?? 'unknown error'}`);
    }

    try {
      for (const update of body.result) {
        if (update.callback_query) {
          const cq = update.callback_query;
          const outcome = await handleCallback(db, token, emitter, cq.id, cq.data ?? '');
          totals[outcome]++;
        }
        offset = update.update_id + 1;
      }
    } catch (err) {
      console.warn('getUpdates callback processing error:', err);
      await backoff();
      continue;
    }
  }

  return totals;
}
