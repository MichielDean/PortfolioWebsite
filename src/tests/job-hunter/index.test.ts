/**
 * Tests for the job-hunter orchestration entry point (src/job-hunter/index.ts).
 *
 * All external pipeline modules are mocked so this suite tests orchestration
 * behaviour only — not the individual pipeline steps.
 *
 * Structure follows Given / When / Then:
 *   Given: pipeline mock configurations and process options
 *   When:  runCycle() or startProcess() is invoked
 *   Then:  pipeline functions are called in the right order / errors handled correctly
 */

jest.mock('node-cron');
jest.mock('../../job-hunter/ingestion');
jest.mock('../../job-hunter/scoring');
jest.mock('../../job-hunter/telegram/notifier');
jest.mock('../../job-hunter/telegram/callbackHandler');
jest.mock('../../job-hunter/resume/approvalHandler');
jest.mock('../../job-hunter/db/migrations');
jest.mock('better-sqlite3', () => jest.fn().mockImplementation(() => ({})));

import type Database from 'better-sqlite3';
import * as nodeCron from 'node-cron';
import { runCycle, startProcess, CRON_SCHEDULE } from '../../job-hunter/index';
import { runIngestion } from '../../job-hunter/ingestion';
import { runScoring } from '../../job-hunter/scoring';
import { runNotifier } from '../../job-hunter/telegram/notifier';
import { runCallbackPoller } from '../../job-hunter/telegram/callbackHandler';
import { runApprovalHandler } from '../../job-hunter/resume/approvalHandler';
import { runMigrations } from '../../job-hunter/db/migrations';

const mockRunIngestion = runIngestion as jest.MockedFunction<typeof runIngestion>;
const mockRunScoring = runScoring as jest.MockedFunction<typeof runScoring>;
const mockRunNotifier = runNotifier as jest.MockedFunction<typeof runNotifier>;
const mockRunCallbackPoller = runCallbackPoller as jest.MockedFunction<typeof runCallbackPoller>;
const mockRunApprovalHandler = runApprovalHandler as jest.MockedFunction<typeof runApprovalHandler>;
const mockRunMigrations = runMigrations as jest.MockedFunction<typeof runMigrations>;
const mockCronSchedule = nodeCron.schedule as jest.MockedFunction<typeof nodeCron.schedule>;

function makeMockDb(): Database.Database {
  return {} as Database.Database;
}

// ─── CRON_SCHEDULE constant ──────────────────────────────────────────────────

describe('CRON_SCHEDULE', () => {
  it('Then the schedule expression targets 08:00 UTC daily', () => {
    expect(CRON_SCHEDULE).toBe('0 8 * * *');
  });
});

// ─── runCycle() ──────────────────────────────────────────────────────────────

describe('runCycle()', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = makeMockDb();
    mockRunIngestion.mockReset();
    mockRunScoring.mockReset();
    mockRunNotifier.mockReset();
  });

  describe('happy path', () => {
    it('Given all phases succeed, When called, Then ingestion is invoked with the db', async () => {
      mockRunIngestion.mockResolvedValue({ inserted: 1, skipped: 0 });
      mockRunScoring.mockResolvedValue({ scored: 1, eligible: [] });
      mockRunNotifier.mockResolvedValue({ notified: 1, skipped: 0 });

      await runCycle(db);

      expect(mockRunIngestion).toHaveBeenCalledWith(db);
    });

    it('Given all phases succeed, When called, Then scoring is invoked with the db', async () => {
      mockRunIngestion.mockResolvedValue({ inserted: 0, skipped: 0 });
      mockRunScoring.mockResolvedValue({ scored: 0, eligible: [] });
      mockRunNotifier.mockResolvedValue({ notified: 0, skipped: 0 });

      await runCycle(db);

      expect(mockRunScoring).toHaveBeenCalledWith(db);
    });

    it('Given all phases succeed, When called, Then notifier is invoked with the db', async () => {
      mockRunIngestion.mockResolvedValue({ inserted: 0, skipped: 0 });
      mockRunScoring.mockResolvedValue({ scored: 0, eligible: [] });
      mockRunNotifier.mockResolvedValue({ notified: 0, skipped: 0 });

      await runCycle(db);

      expect(mockRunNotifier).toHaveBeenCalledWith(db);
    });

    it('Given all phases succeed, When called, Then phases run in ingestion→scoring→notifier order', async () => {
      const callOrder: string[] = [];
      mockRunIngestion.mockImplementation(async () => {
        callOrder.push('ingest');
        return { inserted: 0, skipped: 0 };
      });
      mockRunScoring.mockImplementation(async () => {
        callOrder.push('score');
        return { scored: 0, eligible: [] };
      });
      mockRunNotifier.mockImplementation(async () => {
        callOrder.push('notify');
        return { notified: 0, skipped: 0 };
      });

      await runCycle(db);

      expect(callOrder).toEqual(['ingest', 'score', 'notify']);
    });

    it('Given all phases succeed, When called, Then ingestion counts are logged', async () => {
      mockRunIngestion.mockResolvedValue({ inserted: 5, skipped: 2 });
      mockRunScoring.mockResolvedValue({ scored: 3, eligible: [] });
      mockRunNotifier.mockResolvedValue({ notified: 1, skipped: 0 });
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await runCycle(db);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('5 inserted'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('2 skipped'));
      logSpy.mockRestore();
    });

    it('Given all phases succeed, When called, Then scoring count is logged', async () => {
      mockRunIngestion.mockResolvedValue({ inserted: 0, skipped: 0 });
      mockRunScoring.mockResolvedValue({ scored: 4, eligible: [] });
      mockRunNotifier.mockResolvedValue({ notified: 0, skipped: 0 });
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await runCycle(db);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('4 scored'));
      logSpy.mockRestore();
    });

    it('Given all phases succeed, When called, Then notifier count is logged', async () => {
      mockRunIngestion.mockResolvedValue({ inserted: 0, skipped: 0 });
      mockRunScoring.mockResolvedValue({ scored: 0, eligible: [] });
      mockRunNotifier.mockResolvedValue({ notified: 3, skipped: 1 });
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await runCycle(db);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('3 notified'));
      logSpy.mockRestore();
    });
  });

  describe('error recovery', () => {
    it('Given ingestion throws, When called, Then the cycle resolves without throwing', async () => {
      mockRunIngestion.mockRejectedValue(new Error('TheirStack unavailable'));
      mockRunScoring.mockResolvedValue({ scored: 0, eligible: [] });
      mockRunNotifier.mockResolvedValue({ notified: 0, skipped: 0 });

      await expect(runCycle(db)).resolves.toBeUndefined();
    });

    it('Given ingestion throws, When called, Then scoring still runs', async () => {
      mockRunIngestion.mockRejectedValue(new Error('TheirStack unavailable'));
      mockRunScoring.mockResolvedValue({ scored: 0, eligible: [] });
      mockRunNotifier.mockResolvedValue({ notified: 0, skipped: 0 });

      await runCycle(db);

      expect(mockRunScoring).toHaveBeenCalled();
    });

    it('Given ingestion throws, When called, Then notifier still runs', async () => {
      mockRunIngestion.mockRejectedValue(new Error('TheirStack unavailable'));
      mockRunScoring.mockResolvedValue({ scored: 0, eligible: [] });
      mockRunNotifier.mockResolvedValue({ notified: 0, skipped: 0 });

      await runCycle(db);

      expect(mockRunNotifier).toHaveBeenCalled();
    });

    it('Given ingestion throws, When called, Then the error is logged via console.warn', async () => {
      const err = new Error('TheirStack unavailable');
      mockRunIngestion.mockRejectedValue(err);
      mockRunScoring.mockResolvedValue({ scored: 0, eligible: [] });
      mockRunNotifier.mockResolvedValue({ notified: 0, skipped: 0 });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await runCycle(db);

      expect(warnSpy).toHaveBeenCalledWith('[job-hunter] Ingestion failed:', err);
      warnSpy.mockRestore();
    });

    it('Given scoring throws, When called, Then the cycle resolves without throwing', async () => {
      mockRunIngestion.mockResolvedValue({ inserted: 0, skipped: 0 });
      mockRunScoring.mockRejectedValue(new Error('Claude API rate limited'));
      mockRunNotifier.mockResolvedValue({ notified: 0, skipped: 0 });

      await expect(runCycle(db)).resolves.toBeUndefined();
    });

    it('Given scoring throws, When called, Then notifier still runs', async () => {
      mockRunIngestion.mockResolvedValue({ inserted: 0, skipped: 0 });
      mockRunScoring.mockRejectedValue(new Error('Claude API rate limited'));
      mockRunNotifier.mockResolvedValue({ notified: 0, skipped: 0 });

      await runCycle(db);

      expect(mockRunNotifier).toHaveBeenCalled();
    });

    it('Given scoring throws, When called, Then the error is logged via console.warn', async () => {
      const err = new Error('Claude API rate limited');
      mockRunIngestion.mockResolvedValue({ inserted: 0, skipped: 0 });
      mockRunScoring.mockRejectedValue(err);
      mockRunNotifier.mockResolvedValue({ notified: 0, skipped: 0 });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await runCycle(db);

      expect(warnSpy).toHaveBeenCalledWith('[job-hunter] Scoring failed:', err);
      warnSpy.mockRestore();
    });

    it('Given notifier throws, When called, Then the cycle resolves without throwing', async () => {
      mockRunIngestion.mockResolvedValue({ inserted: 0, skipped: 0 });
      mockRunScoring.mockResolvedValue({ scored: 0, eligible: [] });
      mockRunNotifier.mockRejectedValue(new Error('Telegram API down'));

      await expect(runCycle(db)).resolves.toBeUndefined();
    });

    it('Given notifier throws, When called, Then the error is logged via console.warn', async () => {
      const err = new Error('Telegram API down');
      mockRunIngestion.mockResolvedValue({ inserted: 0, skipped: 0 });
      mockRunScoring.mockResolvedValue({ scored: 0, eligible: [] });
      mockRunNotifier.mockRejectedValue(err);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await runCycle(db);

      expect(warnSpy).toHaveBeenCalledWith('[job-hunter] Notifier failed:', err);
      warnSpy.mockRestore();
    });

    it('Given all phases throw, When called, Then the cycle resolves without throwing', async () => {
      mockRunIngestion.mockRejectedValue(new Error('source error'));
      mockRunScoring.mockRejectedValue(new Error('scoring error'));
      mockRunNotifier.mockRejectedValue(new Error('notify error'));

      await expect(runCycle(db)).resolves.toBeUndefined();
    });
  });
});

// ─── startProcess() ──────────────────────────────────────────────────────────

describe('startProcess()', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(process, 'on').mockReturnValue(process);

    mockRunIngestion.mockResolvedValue({ inserted: 0, skipped: 0 });
    mockRunScoring.mockResolvedValue({ scored: 0, eligible: [] });
    mockRunNotifier.mockResolvedValue({ notified: 0, skipped: 0 });
    mockRunCallbackPoller.mockResolvedValue({ approved: 0, denied: 0, ignored: 0 });
    mockRunApprovalHandler.mockImplementation(() => undefined);
    mockRunMigrations.mockImplementation(() => undefined);
    mockCronSchedule.mockReturnValue({ start: jest.fn(), stop: jest.fn() } as unknown as nodeCron.ScheduledTask);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Given any options, When called, Then DB migrations are run', async () => {
    await startProcess({ runNow: false });

    expect(mockRunMigrations).toHaveBeenCalled();
  });

  it('Given any options, When called, Then the approval handler is registered', async () => {
    await startProcess({ runNow: false });

    expect(mockRunApprovalHandler).toHaveBeenCalled();
  });

  it('Given any options, When called, Then the Telegram callback poller is started', async () => {
    await startProcess({ runNow: false });

    expect(mockRunCallbackPoller).toHaveBeenCalled();
  });

  it('Given any options, When called, Then cron.schedule is called with the 08:00 UTC daily expression', async () => {
    await startProcess({ runNow: false });

    expect(mockCronSchedule).toHaveBeenCalledWith(
      '0 8 * * *',
      expect.any(Function),
      expect.objectContaining({ timezone: 'UTC' }),
    );
  });

  it('Given runNow: true, When called, Then the pipeline cycle runs before returning', async () => {
    await startProcess({ runNow: true });

    expect(mockRunIngestion).toHaveBeenCalled();
    expect(mockRunScoring).toHaveBeenCalled();
    expect(mockRunNotifier).toHaveBeenCalled();
  });

  it('Given runNow: false, When called, Then the pipeline cycle is NOT executed immediately', async () => {
    await startProcess({ runNow: false });

    expect(mockRunIngestion).not.toHaveBeenCalled();
  });

  it('Given the scheduled cron fires, When the task runs, Then runCycle is executed', async () => {
    let scheduledFn: (() => void) | undefined;
    mockCronSchedule.mockImplementation((_expr, fn) => {
      scheduledFn = fn as () => void;
      return { start: jest.fn(), stop: jest.fn() } as unknown as nodeCron.ScheduledTask;
    });

    await startProcess({ runNow: false });

    expect(scheduledFn).toBeDefined();
    await scheduledFn!();

    expect(mockRunIngestion).toHaveBeenCalled();
  });

  it('Given the callback poller rejects, When called, Then the error is caught and logged', async () => {
    const err = new Error('getUpdates connection lost');
    mockRunCallbackPoller.mockRejectedValue(err);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await startProcess({ runNow: false });

    expect(warnSpy).toHaveBeenCalledWith('[job-hunter] Callback poller failed:', err);
    warnSpy.mockRestore();
  });

  it('Given a scheduled cycle throws, When the cron task runs, Then the error is caught and logged', async () => {
    const err = new Error('network timeout');
    mockRunIngestion.mockRejectedValueOnce(err); // ingestion fails the first time
    mockRunScoring.mockResolvedValue({ scored: 0, eligible: [] });
    mockRunNotifier.mockResolvedValue({ notified: 0, skipped: 0 });

    let scheduledFn: (() => void) | undefined;
    mockCronSchedule.mockImplementation((_expr, fn) => {
      scheduledFn = fn as () => void;
      return { start: jest.fn(), stop: jest.fn() } as unknown as nodeCron.ScheduledTask;
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await startProcess({ runNow: false });
    await scheduledFn!();

    expect(warnSpy).toHaveBeenCalledWith('[job-hunter] Ingestion failed:', err);
    warnSpy.mockRestore();
  });

  it('Given any options, When called, Then SIGINT and SIGTERM handlers are registered', async () => {
    const processOnSpy = process.on as jest.MockedFunction<typeof process.on>;

    await startProcess({ runNow: false });

    const registeredEvents = processOnSpy.mock.calls.map(c => c[0]);
    expect(registeredEvents).toContain('SIGINT');
    expect(registeredEvents).toContain('SIGTERM');
  });
});
