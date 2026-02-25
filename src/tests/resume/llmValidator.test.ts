/**
 * Tests for LLMValidator
 * Covers: parseValidationResponse (via validateResume) — JSON parsing,
 * code block stripping, issue/warning normalization, all error fallback paths
 */

import { LLMValidator, ValidationResult } from '../../resume/services/llmValidator';
import { OllamaService } from '../../resume/services/ollamaService';
import { SimpleProfile } from '../../resume/services/profileDataAdapter';
import { TailoredResumeResult } from '../../resume/services/resumeTailoringEngine';

// Suppress console.error: LLMValidator logs on parse failures as expected
// behavior. Tests exercising those paths would produce noisy output otherwise.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const mockProfile: SimpleProfile = {
  name: 'Hank Hill',
  email: 'hank@strickland.com',
  phone: '555-0100',
  location: 'Arlen, TX',
  linkedin: 'https://linkedin.com/in/hankhill',
  github: 'https://github.com/hankhill',
  website: 'https://hankhill.dev',
  summary: 'Expert propane and software engineer.',
  workHistory: [
    {
      company: 'Strickland Propane',
      role: 'Assistant Manager',
      duration: 'January 2000 - Present',
      location: 'Arlen, TX',
      achievements: ['Managed propane sales', 'Led team of 5'],
    },
  ],
};

const mockTailored: TailoredResumeResult = {
  summary: 'Tailored summary',
  matchScore: 85,
  reasoning: 'Good fit',
  selectedExperiences: [
    {
      company: 'Strickland Propane',
      role: 'Assistant Manager',
      duration: 'January 2000 - Present',
      location: 'Arlen, TX',
      selectedAchievements: ['Managed propane sales'],
    },
  ],
  relevantSkills: ['Leadership', 'TypeScript'],
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeValidator(chatResponse: string): LLMValidator {
  const mockOllama = {
    chat: jest.fn().mockResolvedValue(chatResponse),
  } as unknown as OllamaService;
  return new LLMValidator(mockOllama);
}

async function validate(chatResponse: string): Promise<ValidationResult> {
  return makeValidator(chatResponse).validateResume(mockProfile, mockTailored);
}

// ─── Construction ────────────────────────────────────────────────────────────

describe('LLMValidator — construction', () => {
  it('constructs without throwing', () => {
    const mockOllama = { chat: jest.fn() } as unknown as OllamaService;
    expect(() => new LLMValidator(mockOllama)).not.toThrow();
  });

  it('calls ollama.chat() when validateResume() is invoked', async () => {
    const chat = jest.fn().mockResolvedValue('{"isValid":true,"issues":[],"warnings":[],"confidence":90}');
    const mockOllama = { chat } as unknown as OllamaService;
    const validator = new LLMValidator(mockOllama);
    await validator.validateResume(mockProfile, mockTailored);
    expect(chat).toHaveBeenCalledTimes(1);
  });
});

// ─── parseValidationResponse — happy paths ───────────────────────────────────

describe('LLMValidator — parseValidationResponse (via validateResume)', () => {
  it('returns isValid:true when issues array is empty', async () => {
    const result = await validate('{"isValid":true,"issues":[],"warnings":[],"confidence":95}');
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('returns isValid:false when issues array is non-empty', async () => {
    const result = await validate('{"isValid":false,"issues":["Fake company added"],"warnings":[],"confidence":90}');
    expect(result.isValid).toBe(false);
    expect(result.issues).toContain('Fake company added');
  });

  it('parses confidence value correctly', async () => {
    const result = await validate('{"isValid":true,"issues":[],"warnings":[],"confidence":77}');
    expect(result.confidence).toBe(77);
  });

  it('strips ```json code block markers', async () => {
    const json = '{"isValid":true,"issues":[],"warnings":[],"confidence":80}';
    const result = await validate('```json\n' + json + '\n```');
    expect(result.isValid).toBe(true);
    expect(result.confidence).toBe(80);
  });

  it('strips ``` code block markers', async () => {
    const json = '{"isValid":true,"issues":[],"warnings":[],"confidence":70}';
    const result = await validate('```\n' + json + '\n```');
    expect(result.isValid).toBe(true);
    expect(result.confidence).toBe(70);
  });

  it('extracts JSON embedded in surrounding text', async () => {
    const result = await validate('Here is my validation: {"isValid":true,"issues":[],"warnings":[],"confidence":60} End.');
    expect(result.isValid).toBe(true);
  });
});

// ─── Issue normalization ──────────────────────────────────────────────────────

describe('LLMValidator — issue normalization', () => {
  it('handles issues as plain strings', async () => {
    const result = await validate('{"isValid":false,"issues":["Company mismatch"],"warnings":[],"confidence":85}');
    expect(result.issues[0]).toBe('Company mismatch');
  });

  it('handles issues as objects with .issue field, prefixed with company and role', async () => {
    const issueObj = { company: 'Acme', role: 'Engineer', issue: 'Role not found' };
    const result = await validate(JSON.stringify({
      isValid: false,
      issues: [issueObj],
      warnings: [],
      confidence: 80,
    }));
    expect(result.issues[0]).toContain('Acme');
    expect(result.issues[0]).toContain('Engineer');
    expect(result.issues[0]).toContain('Role not found');
  });

  it('handles issues as objects without .issue field via JSON.stringify fallback', async () => {
    const result = await validate(JSON.stringify({
      isValid: false,
      issues: [{ unknown: 'structure' }],
      warnings: [],
      confidence: 75,
    }));
    expect(result.issues[0]).toContain('unknown');
  });

  it('filters out "No issues found" strings from issues array', async () => {
    const result = await validate(JSON.stringify({
      isValid: true,
      issues: ['No issues found'],
      warnings: [],
      confidence: 90,
    }));
    expect(result.issues).toHaveLength(0);
    expect(result.isValid).toBe(true);
  });

  it('respects explicit isValid:false even with empty issues after filtering', async () => {
    // When parsed.isValid is explicitly false, result should be false
    const result = await validate(JSON.stringify({
      isValid: false,
      issues: [],
      warnings: [],
      confidence: 50,
    }));
    expect(result.isValid).toBe(false);
  });
});

// ─── Warning normalization ────────────────────────────────────────────────────

describe('LLMValidator — warning normalization', () => {
  it('handles warnings as strings', async () => {
    const result = await validate('{"isValid":true,"issues":[],"warnings":["Minor format difference"],"confidence":90}');
    expect(result.warnings[0]).toBe('Minor format difference');
  });

  it('handles warnings as objects (stringified)', async () => {
    const result = await validate(JSON.stringify({
      isValid: true,
      issues: [],
      warnings: [{ code: 'W001', message: 'date format' }],
      confidence: 85,
    }));
    expect(result.warnings[0]).toContain('W001');
  });

  it('returns empty warnings array when warnings missing from response', async () => {
    const result = await validate('{"isValid":true,"issues":[],"confidence":90}');
    expect(result.warnings).toEqual([]);
  });
});

// ─── Error fallbacks ──────────────────────────────────────────────────────────

describe('LLMValidator — error fallbacks', () => {
  it('defaults confidence to 50 when confidence is not a number', async () => {
    const result = await validate('{"isValid":true,"issues":[],"warnings":[],"confidence":"high"}');
    expect(result.confidence).toBe(50);
  });

  it('returns isValid:true with warning when JSON parse fails entirely', async () => {
    const result = await validate('This is not JSON at all, completely unparseable text.');
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Failed to parse');
  });

  it('returns isValid:true with warning when no JSON object found in response', async () => {
    const result = await validate('["array", "not", "object"]');
    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('returns confidence 50 in fallback path', async () => {
    const result = await validate('unparseable');
    expect(result.confidence).toBe(50);
  });
});
