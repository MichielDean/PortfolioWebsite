import Database from 'better-sqlite3';
import { EventEmitter } from 'events';
import cron from 'node-cron';
import { runMigrations } from './db/migrations';
import { runIngestion } from './ingestion';
import { runScoring } from './scoring';
import { runNotifier } from './telegram/notifier';
import { runCallbackPoller } from './telegram/callbackHandler';
import { runApprovalHandler } from './resume/approvalHandler';

/** Default path to the SQLite database file. Override with JOB_HUNTER_DB env var. */
const DEFAULT_DB_PATH = process.env.JOB_HUNTER_DB ?? './job-hunter.db';

/** Cron expression for the daily 08:00 UTC pipeline run. */
export const CRON_SCHEDULE = '0 8 * * *';

/**
 * Run one full pipeline cycle: fetch → ingest → score → notify.
 *
 * Each phase is wrapped in its own try/catch so a failure in one phase does
 * not prevent subsequent phases from running. Errors are logged via
 * console.warn and the cycle resolves normally.
 */
export async function runCycle(db: Database.Database, dbPath: string): Promise<void> {
  console.log('[job-hunter] Starting pipeline cycle...');

  try {
    const result = await runIngestion(db, dbPath);
    console.log(`[job-hunter] Ingestion: ${result.inserted} inserted, ${result.skipped} skipped`);
  } catch (err) {
    console.warn('[job-hunter] Ingestion failed:', err);
  }

  try {
    const result = await runScoring(db);
    console.log(`[job-hunter] Scoring: ${result.scored} scored`);
  } catch (err) {
    console.warn('[job-hunter] Scoring failed:', err);
  }

  try {
    const result = await runNotifier(db);
    console.log(`[job-hunter] Notifier: ${result.notified} notified, ${result.skipped} skipped`);
  } catch (err) {
    console.warn('[job-hunter] Notifier failed:', err);
  }

  console.log('[job-hunter] Pipeline cycle complete.');
}

export interface StartOptions {
  /** Trigger an immediate pipeline cycle before entering the cron loop. */
  runNow?: boolean;
  /** Path to the SQLite database file. Defaults to DEFAULT_DB_PATH. */
  dbPath?: string;
}

/**
 * Start the job-hunter process:
 *
 * 1. Open and migrate the SQLite database.
 * 2. Register the Telegram approval handler (event-driven, synchronous setup).
 * 3. Start the Telegram callback poller as a background long-running loop.
 * 4. If --run-now (or options.runNow), execute a full pipeline cycle immediately.
 * 5. Schedule the daily 08:00 UTC pipeline via node-cron.
 *
 * Transient errors in the poller or scheduled cycles are caught and logged;
 * the process continues running.
 */
export async function startProcess(options: StartOptions = {}): Promise<void> {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  const runNow = options.runNow ?? process.argv.includes('--run-now');

  const db = new Database(dbPath);
  runMigrations(db);

  const emitter = new EventEmitter();
  const controller = new AbortController();
  let cronTask: ReturnType<typeof cron.schedule> | undefined;
  let shuttingDown = false;

  // Graceful shutdown on SIGINT / SIGTERM
  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('[job-hunter] Shutting down...');
    cronTask?.stop();
    controller.abort();
    db.close();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Register approval handler (synchronous — listens for 'approve' events)
  runApprovalHandler(db, emitter);

  // Start Telegram callback poller (long-running background loop)
  runCallbackPoller(db, emitter, undefined, controller.signal).catch((err) => {
    console.warn('[job-hunter] Callback poller failed:', err);
  });

  // Immediate cycle if requested (useful for testing / one-shot runs)
  if (runNow) {
    await runCycle(db, dbPath);
  }

  // Schedule daily 08:00 UTC pipeline
  cronTask = cron.schedule(
    CRON_SCHEDULE,
    () => {
      runCycle(db, dbPath).catch((err) => {
        console.warn('[job-hunter] Scheduled cycle failed:', err);
      });
    },
    { timezone: 'UTC' },
  );

  console.log('[job-hunter] Scheduled daily pipeline at 08:00 UTC. Telegram poller running.');
}

// Run when invoked directly (not when imported as a module in tests).
// In ESM (tsx runtime): `require` is not a global, so typeof require === 'undefined' is
// true and short-circuit prevents the ReferenceError that `module` would throw.
// In CJS (jest/ts-jest): require.main !== module when imported, so startProcess() is not called.
if (typeof require === 'undefined' || require.main === module) {
  startProcess().catch((err) => {
    console.error('[job-hunter] Fatal error:', err);
    process.exit(1);
  });
}
