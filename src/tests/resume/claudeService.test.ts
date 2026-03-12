/**
 * Tests for ClaudeService
 * Covers: forTask() model routing, chat() validation guards,
 * extractJobKeywords() parse-failure logging + fallback,
 * scoreAchievementByKeywordMatch() correctness.
 *
 * The @anthropic-ai/sdk module is mocked so no real API calls are made.
 */

// ─── Mock @anthropic-ai/sdk ───────────────────────────────────────────────────
// Use a class (not jest.fn) for the constructor so jest.resetAllMocks() doesn't
// wipe the mock implementation between tests. mockMessagesCreate is a jest.fn
// controlled per-test via .mockResolvedValue / .mockRejectedValue.

const mockMessagesCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  // Using a real class avoids jest.resetAllMocks() clearing the constructor impl.
  // The `messages` property is evaluated at instantiation time, by which point
  // `mockMessagesCreate` is already defined.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: class MockAnthropic {
    constructor(_options?: unknown) {}
    messages = { create: mockMessagesCreate };
  },
}));

// ─── Import after mock setup ──────────────────────────────────────────────────

import { ClaudeService } from '../../resume/services/claudeService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal Anthropic messages.create success response */
function mockTextResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
  };
}

beforeEach(() => {
  // Reset call history + implementation on the API mock so each test is clean.
  mockMessagesCreate.mockReset();
  // Provide a fake key so key-validation guards pass by default.
  process.env.ANTHROPIC_API_KEY = 'test-key-xxx';
});

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  jest.restoreAllMocks();
});

// ─── forTask() ────────────────────────────────────────────────────────────────

describe('ClaudeService.forTask()', () => {
  const taskModels: [Parameters<typeof ClaudeService.forTask>[0], string][] = [
    ['analyze',      'claude-sonnet-4-5'],
    ['tailor',       'claude-sonnet-4-5'],
    ['cover-letter', 'claude-sonnet-4-5'],
    ['validate',     'claude-haiku-4-5'],
    ['score',        'claude-haiku-4-5'],
  ];

  test.each(taskModels)('task "%s" uses model "%s"', async (task, expectedModel) => {
    mockMessagesCreate.mockResolvedValue(mockTextResponse('ok'));
    const svc = ClaudeService.forTask(task);
    await svc.chat([{ role: 'user', content: 'hi' }]);
    const callArgs = mockMessagesCreate.mock.calls[0][0];
    expect(callArgs.model).toBe(expectedModel);
  });

  it('returns a ClaudeService instance', () => {
    expect(ClaudeService.forTask('analyze')).toBeInstanceOf(ClaudeService);
  });
});

// ─── chat() guards ────────────────────────────────────────────────────────────

describe('ClaudeService.chat() — validation guards', () => {
  it('throws when userMessages array is empty (only system messages)', async () => {
    const svc = new ClaudeService();
    await expect(
      svc.chat([{ role: 'system', content: 'sys' }])
    ).rejects.toThrow(/at least one user or assistant message/);
  });

  it('throws when messages is completely empty', async () => {
    const svc = new ClaudeService();
    await expect(svc.chat([])).rejects.toThrow(/at least one user or assistant message/);
  });

  it('throws when first non-system message is "assistant"', async () => {
    const svc = new ClaudeService();
    await expect(
      svc.chat([
        { role: 'system', content: 'sys' },
        { role: 'assistant', content: 'hi' },
      ])
    ).rejects.toThrow(/first non-system message must have role 'user'/);
  });

  it('succeeds with a valid user message', async () => {
    mockMessagesCreate.mockResolvedValue(mockTextResponse('Hello'));
    const svc = new ClaudeService();
    const result = await svc.chat([{ role: 'user', content: 'hi' }]);
    expect(result).toBe('Hello');
  });

  it('throws when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const svc = new ClaudeService();
    await expect(
      svc.chat([{ role: 'user', content: 'hi' }])
    ).rejects.toThrow(/ANTHROPIC_API_KEY is not set/);
  });
});

// ─── extractJobKeywords() ─────────────────────────────────────────────────────

describe('ClaudeService.extractJobKeywords()', () => {
  const validKeywords = {
    skills: ['TypeScript', 'React'],
    qualifications: ['5 years experience'],
    responsibilities: ['Lead team'],
    tools: ['JIRA'],
  };

  it('parses a valid JSON response', async () => {
    mockMessagesCreate.mockResolvedValue(mockTextResponse(JSON.stringify(validKeywords)));
    const svc = new ClaudeService();
    const result = await svc.extractJobKeywords('some job posting');
    expect(result).toEqual(validKeywords);
  });

  it('parses JSON wrapped in ```json code block', async () => {
    mockMessagesCreate.mockResolvedValue(
      mockTextResponse('```json\n' + JSON.stringify(validKeywords) + '\n```')
    );
    const svc = new ClaudeService();
    const result = await svc.extractJobKeywords('some job posting');
    expect(result).toEqual(validKeywords);
  });

  it('logs a warning and returns empty structure on JSON parse failure', async () => {
    mockMessagesCreate.mockResolvedValue(mockTextResponse('Not JSON at all.'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const svc = new ClaudeService();
    const result = await svc.extractJobKeywords('some job posting');
    expect(result).toEqual({ skills: [], qualifications: [], responsibilities: [], tools: [] });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ClaudeService] extractJobKeywords: JSON parse failed'),
      expect.any(Error),
      expect.stringContaining('Response snippet:'),
      expect.stringContaining('Not JSON at all.')
    );
  });
});

// ─── scoreAchievementByKeywordMatch() ────────────────────────────────────────

describe('ClaudeService.scoreAchievementByKeywordMatch()', () => {
  it('returns 0 when there are no matches', () => {
    const svc = new ClaudeService();
    expect(svc.scoreAchievementByKeywordMatch(['Python'], ['Java'])).toBe(0);
  });

  it('returns 100 when all achievement keywords match job keywords', () => {
    const svc = new ClaudeService();
    expect(svc.scoreAchievementByKeywordMatch(['TypeScript', 'React'], ['TypeScript', 'React', 'Node'])).toBe(100);
  });

  it('returns a partial score for partial matches', () => {
    const svc = new ClaudeService();
    // 1 of 2 match → 50
    const score = svc.scoreAchievementByKeywordMatch(['TypeScript', 'Python'], ['TypeScript']);
    expect(score).toBe(50);
  });

  it('handles empty achievementKeywords without throwing (returns 0)', () => {
    const svc = new ClaudeService();
    const score = svc.scoreAchievementByKeywordMatch([], ['TypeScript']);
    expect(score).toBe(0);
  });

  it('is case-insensitive', () => {
    const svc = new ClaudeService();
    expect(svc.scoreAchievementByKeywordMatch(['typescript'], ['TypeScript'])).toBe(100);
  });

  it('caps score at 100', () => {
    const svc = new ClaudeService();
    const score = svc.scoreAchievementByKeywordMatch(['A'], ['A', 'A', 'A']);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('is synchronous (does not return a Promise)', () => {
    const svc = new ClaudeService();
    const result = svc.scoreAchievementByKeywordMatch(['TypeScript'], ['TypeScript']);
    expect(result).not.toBeInstanceOf(Promise);
    expect(typeof result).toBe('number');
  });
});
