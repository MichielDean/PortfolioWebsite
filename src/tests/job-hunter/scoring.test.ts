/**
 * Tests for the Claude fit-scoring service.
 *
 * Uses an in-memory SQLite DB for real persistence and a mocked Anthropic
 * client so no real API calls are made.
 *
 * Structure follows Given / When / Then:
 *   Given: DB state and mock Anthropic response
 *   When:  scoreJob() or runScoring() is called
 *   Then:  prompt structure, DB state, and returned result match expectations
 */

import Anthropic from '@anthropic-ai/sdk';
import Database from 'better-sqlite3';
import { runMigrations } from '../../job-hunter/db/migrations';
import { upsertJob, getScore } from '../../job-hunter/db/repository';
import {
  buildScoringPrompt,
  scoreJob,
  runScoring,
  SCORING_MODEL,
  MIN_ELIGIBLE_SCORE,
  BATCH_SIZE,
} from '../../job-hunter/scoring';
import type { Job, JobInput } from '../../job-hunter/db/types';
import { profileData } from '../../data/profileData';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

/**
 * Create a mock Anthropic client that returns the given score and rationale.
 * `create` is exposed so tests can assert on call arguments.
 */
function makeMockAnthropic(
  score: number,
  rationale: string,
): { client: Anthropic; create: jest.Mock } {
  const create = jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ score, rationale }) }],
  });
  const client = { messages: { create } } as unknown as Anthropic;
  return { client, create };
}

/** Insert a job into the DB and return the persisted row. */
function seedJob(db: Database.Database, overrides: Partial<JobInput> = {}): Job {
  return upsertJob(db, {
    source: 'theirstack',
    ats_type: 'unknown',
    external_id: `ts-${Math.random()}`,
    title: 'VP of Engineering',
    company: 'Acme Corp',
    url: 'https://acme.com/jobs/1',
    salary_raw: '200000-250000',
    posted_at: '2025-03-20T00:00:00.000Z',
    ...overrides,
  });
}

// ─── buildScoringPrompt() ─────────────────────────────────────────────────────

describe('buildScoringPrompt()', () => {
  it('Given a profile and job, When buildScoringPrompt is called, Then prompt contains the effective title', () => {
    const db = makeDb();
    const job = seedJob(db);
    const prompt = buildScoringPrompt(profileData, job);

    // Profile title is empty; should fall back to first work history role
    const expectedTitle = profileData.workHistory[0].role;
    expect(prompt).toContain(expectedTitle);
  });

  it('Given a profile and job, When buildScoringPrompt is called, Then prompt contains recent work history', () => {
    const db = makeDb();
    const job = seedJob(db);
    const prompt = buildScoringPrompt(profileData, job);

    expect(prompt).toContain(profileData.workHistory[0].company);
    expect(prompt).toContain(profileData.workHistory[0].duration);
  });

  it('Given a profile and job, When buildScoringPrompt is called, Then prompt contains key competencies', () => {
    const db = makeDb();
    const job = seedJob(db);
    const prompt = buildScoringPrompt(profileData, job);

    const firstCompetency = profileData.workHistory[0].description[0].description;
    expect(prompt).toContain(firstCompetency);
  });

  it('Given a job, When buildScoringPrompt is called, Then prompt contains the job title', () => {
    const db = makeDb();
    const job = seedJob(db, { title: 'Director of Engineering' });
    const prompt = buildScoringPrompt(profileData, job);
    expect(prompt).toContain('Director of Engineering');
  });

  it('Given a job, When buildScoringPrompt is called, Then prompt contains the company name', () => {
    const db = makeDb();
    const job = seedJob(db, { company: 'Globex Corp' });
    const prompt = buildScoringPrompt(profileData, job);
    expect(prompt).toContain('Globex Corp');
  });

  it('Given a job, When buildScoringPrompt is called, Then prompt contains the job URL', () => {
    const db = makeDb();
    const job = seedJob(db, { url: 'https://example.com/jobs/42' });
    const prompt = buildScoringPrompt(profileData, job);
    expect(prompt).toContain('https://example.com/jobs/42');
  });

  it('Given a job with salary, When buildScoringPrompt is called, Then prompt includes salary', () => {
    const db = makeDb();
    const job = seedJob(db, { salary_raw: '300000-350000' });
    const prompt = buildScoringPrompt(profileData, job);
    expect(prompt).toContain('300000-350000');
  });

  it('Given a job without salary, When buildScoringPrompt is called, Then prompt omits salary line', () => {
    const db = makeDb();
    const job = seedJob(db, { salary_raw: null });
    const prompt = buildScoringPrompt(profileData, job);
    expect(prompt).not.toContain('Salary:');
  });

  it('Given a profile and job, When buildScoringPrompt is called, Then prompt requests JSON response format', () => {
    const db = makeDb();
    const job = seedJob(db);
    const prompt = buildScoringPrompt(profileData, job);
    expect(prompt).toContain('"score"');
    expect(prompt).toContain('"rationale"');
  });

  it('Given a job with control characters in fields, When buildScoringPrompt is called, Then control characters are stripped', () => {
    const db = makeDb();
    const job = seedJob(db, {
      title: 'VP\nof Engineering\n\n## FAKE SECTION',
      company: 'Acme\r\nCorp',
    });
    const prompt = buildScoringPrompt(profileData, job);
    expect(prompt).not.toContain('VP\nof');
    expect(prompt).not.toContain('Acme\r\n');
    expect(prompt).toContain('VP of Engineering');
    expect(prompt).toContain('Acme  Corp');
  });
});

// ─── scoreJob() ───────────────────────────────────────────────────────────────

describe('scoreJob()', () => {
  it('Given a valid job and mock Anthropic, When scoreJob is called, Then score is persisted to the DB', async () => {
    const db = makeDb();
    const job = seedJob(db);
    const { client } = makeMockAnthropic(8, 'Strong leadership background. Good technical depth.');

    await scoreJob(db, job, client);

    const persisted = getScore(db, job.id);
    expect(persisted).toBeDefined();
    expect(persisted!.score).toBe(8);
    expect(persisted!.rationale).toBe('Strong leadership background. Good technical depth.');
    expect(persisted!.scored_at).toBeDefined();
  });

  it('Given a valid job, When scoreJob is called, Then the correct model is used', async () => {
    const db = makeDb();
    const job = seedJob(db);
    const { client, create } = makeMockAnthropic(7, 'Decent match.');

    await scoreJob(db, job, client);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ model: SCORING_MODEL }),
    );
  });

  it('Given a valid job, When scoreJob is called, Then the prompt includes job and profile details', async () => {
    const db = makeDb();
    const job = seedJob(db, { title: 'Engineering Manager', company: 'Initech' });
    const { client, create } = makeMockAnthropic(6, 'Good fit overall.');

    await scoreJob(db, job, client);

    const call = create.mock.calls[0][0] as { messages: Array<{ content: string }> };
    const sentPrompt = call.messages[0].content;
    expect(sentPrompt).toContain('Engineering Manager');
    expect(sentPrompt).toContain('Initech');
    expect(sentPrompt).toContain(profileData.workHistory[0].role);
  });

  it('Given a valid job, When scoreJob is called, Then the returned response matches the Claude output', async () => {
    const db = makeDb();
    const job = seedJob(db);
    const { client } = makeMockAnthropic(9, 'Excellent match with strong leadership skills.');

    const result = await scoreJob(db, job, client);

    expect(result).toEqual({ score: 9, rationale: 'Excellent match with strong leadership skills.' });
  });

  it('Given Claude returns non-text content, When scoreJob is called, Then it throws', async () => {
    const db = makeDb();
    const job = seedJob(db);
    const create = jest.fn().mockResolvedValue({ content: [{ type: 'tool_use', id: 'x' }] });
    const client = { messages: { create } } as unknown as Anthropic;

    await expect(scoreJob(db, job, client)).rejects.toThrow('Unexpected response type');
  });

  it('Given Claude returns non-JSON text, When scoreJob is called, Then it throws', async () => {
    const db = makeDb();
    const job = seedJob(db);
    const create = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'I cannot score this job.' }],
    });
    const client = { messages: { create } } as unknown as Anthropic;

    await expect(scoreJob(db, job, client)).rejects.toThrow('non-JSON');
  });

  it('Given Claude returns a score out of range, When scoreJob is called, Then it throws', async () => {
    const db = makeDb();
    const job = seedJob(db);
    const create = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ score: 11, rationale: 'Too high.' }) }],
    });
    const client = { messages: { create } } as unknown as Anthropic;

    await expect(scoreJob(db, job, client)).rejects.toThrow('invalid score');
  });

  it('Given Claude returns an empty rationale, When scoreJob is called, Then it throws', async () => {
    const db = makeDb();
    const job = seedJob(db);
    const create = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ score: 7, rationale: '   ' }) }],
    });
    const client = { messages: { create } } as unknown as Anthropic;

    await expect(scoreJob(db, job, client)).rejects.toThrow('invalid rationale');
  });

  it('Given Claude returns an empty content array, When scoreJob is called, Then it throws Unexpected response type', async () => {
    const db = makeDb();
    const job = seedJob(db);
    const create = jest.fn().mockResolvedValue({ content: [] });
    const client = { messages: { create } } as unknown as Anthropic;

    await expect(scoreJob(db, job, client)).rejects.toThrow('Unexpected response type');
  });

  it('Given Claude returns a float score, When scoreJob is called, Then it throws invalid score', async () => {
    const db = makeDb();
    const job = seedJob(db);
    const create = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ score: 7.5, rationale: 'Good fit.' }) }],
    });
    const client = { messages: { create } } as unknown as Anthropic;

    await expect(scoreJob(db, job, client)).rejects.toThrow('invalid score');
  });
});

// ─── runScoring() — integration tests ─────────────────────────────────────────

describe('runScoring()', () => {
  it('Given no unscored jobs, When runScoring is called, Then returns zero counts and empty eligible', async () => {
    const db = makeDb();
    const { client } = makeMockAnthropic(8, 'Good fit.');

    const result = await runScoring(db, client);

    expect(result).toEqual({ scored: 0, eligible: [] });
  });

  it('Given unscored jobs, When runScoring is called, Then all are scored', async () => {
    const db = makeDb();
    seedJob(db, { external_id: 'j1' });
    seedJob(db, { external_id: 'j2' });
    const { client } = makeMockAnthropic(7, 'Good fit.');

    const result = await runScoring(db, client);

    expect(result.scored).toBe(2);
  });

  it('Given unscored jobs, When runScoring is called, Then scores are persisted to the DB', async () => {
    const db = makeDb();
    const job = seedJob(db);
    const { client } = makeMockAnthropic(8, 'Strong engineering leadership background.');

    await runScoring(db, client);

    const score = getScore(db, job.id);
    expect(score).toBeDefined();
    expect(score!.score).toBe(8);
    expect(score!.rationale).toBe('Strong engineering leadership background.');
  });

  it('Given jobs scoring >= 6, When runScoring is called, Then they appear in eligible', async () => {
    const db = makeDb();
    seedJob(db, { external_id: 'j1' });
    const { client } = makeMockAnthropic(MIN_ELIGIBLE_SCORE, 'Meets the threshold.');

    const result = await runScoring(db, client);

    expect(result.eligible).toHaveLength(1);
  });

  it('Given jobs scoring < 6, When runScoring is called, Then they are NOT in eligible', async () => {
    const db = makeDb();
    seedJob(db, { external_id: 'j1' });
    seedJob(db, { external_id: 'j2' });
    const { client } = makeMockAnthropic(MIN_ELIGIBLE_SCORE - 1, 'Weak fit.');

    const result = await runScoring(db, client);

    expect(result.scored).toBe(2);
    expect(result.eligible).toHaveLength(0);
  });

  it('Given a mix of scores, When runScoring is called, Then only jobs scoring >= 6 are eligible', async () => {
    const db = makeDb();
    const jobA = seedJob(db, { external_id: 'high' });
    const jobB = seedJob(db, { external_id: 'low' });

    let callCount = 0;
    const create = jest.fn().mockImplementation(() => {
      callCount++;
      const score = callCount === 1 ? 8 : 4;
      return Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify({ score, rationale: 'Rationale.' }) }],
      });
    });
    const client = { messages: { create } } as unknown as Anthropic;

    const result = await runScoring(db, client);

    expect(result.scored).toBe(2);
    expect(result.eligible).toHaveLength(1);
    expect(result.eligible[0].id).toBe(jobA.id);
  });

  it('Given already-scored jobs, When runScoring is called, Then they are skipped', async () => {
    const db = makeDb();
    const job = seedJob(db, { external_id: 'j1' });
    const { client, create } = makeMockAnthropic(7, 'Good fit.');

    await runScoring(db, client);
    create.mockClear();

    const second = await runScoring(db, client);

    expect(create).not.toHaveBeenCalled();
    expect(second.scored).toBe(0);
    // original score is still in DB
    expect(getScore(db, job.id)).toBeDefined();
  });

  it('Given a job that fails to score, When runScoring is called, Then the error is logged and other jobs are scored', async () => {
    const db = makeDb();
    seedJob(db, { external_id: 'bad' });
    seedJob(db, { external_id: 'good' });

    let callCount = 0;
    const create = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('API timeout'));
      return Promise.resolve({
        content: [{ type: 'text', text: JSON.stringify({ score: 7, rationale: 'Good fit.' }) }],
      });
    });
    const client = { messages: { create } } as unknown as Anthropic;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await runScoring(db, client);

    expect(result.scored).toBe(1);
    expect(warnSpy).toHaveBeenCalledWith('Failed to score job:', expect.any(Number), expect.any(Error));
    warnSpy.mockRestore();
  });

  it('Given more than BATCH_SIZE unscored jobs, When runScoring is called, Then all jobs are scored', async () => {
    jest.useFakeTimers();
    try {
      const db = makeDb();
      for (let i = 0; i < BATCH_SIZE + 1; i++) {
        seedJob(db, { external_id: `j${i}` });
      }
      const { client } = makeMockAnthropic(7, 'Good fit.');

      const scoringPromise = runScoring(db, client);
      // Advance fake clock to unblock the inter-batch delay
      await jest.advanceTimersByTimeAsync(1000);
      const result = await scoringPromise;

      expect(result.scored).toBe(BATCH_SIZE + 1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('Given more than BATCH_SIZE unscored jobs, When runScoring is called, Then a 1s delay is applied between batches', async () => {
    jest.useFakeTimers();
    try {
      const db = makeDb();
      for (let i = 0; i < BATCH_SIZE + 1; i++) {
        seedJob(db, { external_id: `j${i}` });
      }
      const { client } = makeMockAnthropic(7, 'Good fit.');
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      const scoringPromise = runScoring(db, client);
      await jest.advanceTimersByTimeAsync(1000);
      await scoringPromise;

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
      setTimeoutSpy.mockRestore();
    } finally {
      jest.useRealTimers();
    }
  });
});
