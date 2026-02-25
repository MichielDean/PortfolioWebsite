/**
 * Tests for OllamaService
 * Covers: constructor defaults, model alias resolution, forTask() routing,
 * isAvailable(), chat(), extractJobKeywords() JSON parsing
 */

import { OllamaService } from '../../resume/services/ollamaService';

// Helper to capture the fetch body sent during chat()
// Uses jest.spyOn so restoreAllMocks() cleans it up automatically.
async function chatAndCaptureBody(service: OllamaService): Promise<Record<string, unknown>> {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({
      model: 'test',
      created_at: '',
      message: { role: 'assistant', content: 'ok' },
      done: true,
    }),
  } as Response);
  await service.chat([{ role: 'user', content: 'test' }]);
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  return JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
}

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── Constructor ──────────────────────────────────────────────────────────────

describe('OllamaService — constructor', () => {
  it('uses default model qwen3:14b when no config provided', async () => {
    const svc = new OllamaService();
    const body = await chatAndCaptureBody(svc);
    expect(body.model).toBe('qwen3:14b');
  });

  it('accepts custom baseUrl without throwing', () => {
    expect(() => new OllamaService({ baseUrl: 'http://localhost:11434' })).not.toThrow();
  });

  it('accepts custom model string', async () => {
    const svc = new OllamaService({ model: 'llama3:8b' });
    const body = await chatAndCaptureBody(svc);
    expect(body.model).toBe('llama3:8b');
  });
});

// ─── Model Alias Resolution ───────────────────────────────────────────────────

describe('OllamaService — model alias resolution', () => {
  const cases: [string, string][] = [
    ['qwen3',    'qwen3:14b'],
    ['qwen2',    'qwen2.5:14b'],
    ['deepseek', 'deepseek-r1:14b'],
    ['fast',     'qwen2.5:7b'],
    ['qwen3-8b', 'qwen3:8b'],
  ];

  test.each(cases)('resolves alias "%s" → "%s"', async (alias, expected) => {
    const svc = new OllamaService({ model: alias });
    const body = await chatAndCaptureBody(svc);
    expect(body.model).toBe(expected);
  });

  it('passes through unknown model names unchanged', async () => {
    const svc = new OllamaService({ model: 'llama3:70b' });
    const body = await chatAndCaptureBody(svc);
    expect(body.model).toBe('llama3:70b');
  });
});

// ─── forTask() ────────────────────────────────────────────────────────────────

describe('OllamaService.forTask()', () => {
  const taskExpected: [Parameters<typeof OllamaService.forTask>[0], string][] = [
    ['analyze',      'qwen3:14b'],
    ['tailor',       'qwen3:14b'],
    ['cover-letter', 'deepseek-r1:14b'],
    ['validate',     'qwen2.5:14b'],
    ['score',        'qwen2.5:14b'],
  ];

  test.each(taskExpected)('task "%s" uses model "%s"', async (task, expectedModel) => {
    const svc = OllamaService.forTask(task);
    const body = await chatAndCaptureBody(svc);
    expect(body.model).toBe(expectedModel);
  });

  it('returns an OllamaService instance', () => {
    expect(OllamaService.forTask('analyze')).toBeInstanceOf(OllamaService);
  });
});

// ─── isAvailable() ────────────────────────────────────────────────────────────

describe('OllamaService.isAvailable()', () => {
  it('returns true when fetch responds ok', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    const svc = new OllamaService();
    expect(await svc.isAvailable()).toBe(true);
  });

  it('returns false when response.ok is false', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);
    const svc = new OllamaService();
    expect(await svc.isAvailable()).toBe(false);
  });

  it('returns false when fetch throws', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const svc = new OllamaService();
    expect(await svc.isAvailable()).toBe(false);
  });
});

// ─── chat() ──────────────────────────────────────────────────────────────────

describe('OllamaService.chat()', () => {
  const mockOkResponse = (content: string) => ({
    ok: true,
    json: async () => ({
      model: 'test',
      created_at: '',
      message: { role: 'assistant', content },
      done: true,
    }),
  } as Response);

  it('returns message.content from successful response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(mockOkResponse('Hello from Ollama'));
    const svc = new OllamaService();
    const result = await svc.chat([{ role: 'user', content: 'hi' }]);
    expect(result).toBe('Hello from Ollama');
  });

  it('sends POST to /api/chat', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(mockOkResponse('ok'));
    const svc = new OllamaService();
    await svc.chat([{ role: 'user', content: 'hi' }]);
    expect(spy.mock.calls[0][0]).toMatch(/\/api\/chat$/);
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe('POST');
  });

  it('sends messages and stream:false in body', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(mockOkResponse('ok'));
    const svc = new OllamaService();
    const messages = [{ role: 'system' as const, content: 'sys' }, { role: 'user' as const, content: 'hello' }];
    await svc.chat(messages);
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.messages).toEqual(messages);
    expect(body.stream).toBe(false);
  });

  it('throws when response is not ok', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    } as Response);
    const svc = new OllamaService();
    await expect(svc.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow('Ollama API error');
  });

  it('throws when fetch itself throws', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network down'));
    const svc = new OllamaService();
    await expect(svc.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow('Network down');
  });
});

// ─── extractJobKeywords() ─────────────────────────────────────────────────────

describe('OllamaService.extractJobKeywords()', () => {
  const validKeywords = {
    skills: ['TypeScript', 'React'],
    qualifications: ['5 years experience'],
    responsibilities: ['Lead team'],
    tools: ['JIRA'],
  };

  function mockChatResponse(content: string) {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'test', created_at: '', done: true,
        message: { role: 'assistant', content },
      }),
    } as Response);
  }

  it('parses plain JSON response', async () => {
    mockChatResponse(JSON.stringify(validKeywords));
    const svc = new OllamaService();
    const result = await svc.extractJobKeywords('some job posting');
    expect(result).toEqual(validKeywords);
  });

  it('parses JSON wrapped in ```json code block', async () => {
    mockChatResponse('```json\n' + JSON.stringify(validKeywords) + '\n```');
    const svc = new OllamaService();
    const result = await svc.extractJobKeywords('some job posting');
    expect(result).toEqual(validKeywords);
  });

  it('parses JSON wrapped in ``` code block', async () => {
    mockChatResponse('```\n' + JSON.stringify(validKeywords) + '\n```');
    const svc = new OllamaService();
    const result = await svc.extractJobKeywords('some job posting');
    expect(result).toEqual(validKeywords);
  });

  it('returns empty structure when JSON parse fails', async () => {
    mockChatResponse('This is not JSON at all.');
    const svc = new OllamaService();
    const result = await svc.extractJobKeywords('some job posting');
    expect(result).toEqual({ skills: [], qualifications: [], responsibilities: [], tools: [] });
  });

  it('returns arrays for all four fields', async () => {
    mockChatResponse(JSON.stringify(validKeywords));
    const svc = new OllamaService();
    const result = await svc.extractJobKeywords('job');
    expect(Array.isArray(result.skills)).toBe(true);
    expect(Array.isArray(result.qualifications)).toBe(true);
    expect(Array.isArray(result.responsibilities)).toBe(true);
    expect(Array.isArray(result.tools)).toBe(true);
  });
});
