/**
 * Tests for PromptLibrary
 * Covers: template loading, getTemplate, fillTemplate variable substitution,
 * addTemplate, listTemplates, exportTemplates, importTemplates
 */

import { PromptLibrary, PromptTemplate } from '../../resume/services/promptLibrary';

// Suppress console.error: importTemplates logs on invalid JSON as expected behavior.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('PromptLibrary — initialization', () => {
  it('constructs without throwing', () => {
    expect(() => new PromptLibrary()).not.toThrow();
  });

  it('loads exactly 4 default templates', () => {
    const lib = new PromptLibrary();
    expect(lib.listTemplates()).toHaveLength(4);
  });

  it('loads the expected default template ids', () => {
    const lib = new PromptLibrary();
    const ids = lib.listTemplates().map(t => t.id);
    expect(ids).toContain('resume-tailor');
    expect(ids).toContain('validation');
    expect(ids).toContain('skills-extraction');
    expect(ids).toContain('cover-letter');
  });
});

// ─── getTemplate() ────────────────────────────────────────────────────────────

describe('PromptLibrary.getTemplate()', () => {
  let lib: PromptLibrary;
  beforeEach(() => { lib = new PromptLibrary(); });

  it('returns template object for "resume-tailor"', () => {
    const t = lib.getTemplate('resume-tailor');
    expect(t).toBeDefined();
    expect(t?.id).toBe('resume-tailor');
  });

  it('returns template object for "validation"', () => {
    const t = lib.getTemplate('validation');
    expect(t).toBeDefined();
    expect(t?.id).toBe('validation');
  });

  it('returns template object for "cover-letter"', () => {
    const t = lib.getTemplate('cover-letter');
    expect(t).toBeDefined();
    expect(t?.id).toBe('cover-letter');
  });

  it('returns template object for "skills-extraction"', () => {
    const t = lib.getTemplate('skills-extraction');
    expect(t).toBeDefined();
    expect(t?.id).toBe('skills-extraction');
  });

  it('returns undefined for unknown id', () => {
    expect(lib.getTemplate('does-not-exist')).toBeUndefined();
  });

  it('returned template has required fields', () => {
    const t = lib.getTemplate('resume-tailor')!;
    expect(t.id).toBeTruthy();
    expect(t.name).toBeTruthy();
    expect(t.systemPrompt).toBeTruthy();
    expect(t.userPromptTemplate).toBeTruthy();
    expect(t.outputFormat).toBeTruthy();
  });
});

// ─── fillTemplate() ──────────────────────────────────────────────────────────

describe('PromptLibrary.fillTemplate()', () => {
  let lib: PromptLibrary;

  const customTemplate: PromptTemplate = {
    id: 'test-template',
    name: 'Test Template',
    description: 'For unit tests',
    systemPrompt: 'You are a test assistant.',
    userPromptTemplate: 'Hello {name}, your task is {task}. Again: {name}.\n\n{outputFormat}',
    outputFormat: 'Return plain text.',
  };

  beforeEach(() => {
    lib = new PromptLibrary();
    lib.addTemplate(customTemplate);
  });

  it('returns null for unknown template id', () => {
    expect(lib.fillTemplate('nonexistent', {})).toBeNull();
  });

  it('returns object with system and user keys', () => {
    const result = lib.fillTemplate('test-template', { name: 'Hank', task: 'review code' });
    expect(result).toHaveProperty('system');
    expect(result).toHaveProperty('user');
  });

  it('replaces a {variable} placeholder', () => {
    const result = lib.fillTemplate('test-template', { name: 'Hank', task: 'review code' });
    expect(result!.user).toContain('Hank');
    expect(result!.user).toContain('review code');
  });

  it('replaces the same variable appearing multiple times', () => {
    const result = lib.fillTemplate('test-template', { name: 'Hank', task: 'review code' });
    // "Again: {name}" should also be replaced
    const occurrences = (result!.user.match(/Hank/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it('leaves system prompt unchanged', () => {
    const result = lib.fillTemplate('test-template', { name: 'Hank', task: 'review code' });
    expect(result!.system).toBe('You are a test assistant.');
  });

  it('appends outputFormat to user prompt', () => {
    const result = lib.fillTemplate('test-template', { name: 'Hank', task: 'review code' });
    expect(result!.user).toContain('Return plain text.');
  });

  it('does not leave unreplaced {outputFormat} placeholder when outputFormat exists', () => {
    const result = lib.fillTemplate('test-template', { name: 'Hank', task: 'review code' });
    expect(result!.user).not.toContain('{outputFormat}');
  });

  it('works with real resume-tailor template and expected variables', () => {
    const result = lib.fillTemplate('resume-tailor', {
      name: 'Hank Hill',
      summary: 'Engineer',
      workHistory: 'Strickland Propane | Engineer | 2020-Present | Arlen TX',
      jobTitle: 'Senior Engineer',
      company: 'Acme Corp',
      jobPosting: 'We need an engineer',
      numPositions: '1',
    });
    expect(result).not.toBeNull();
    expect(result!.user).toContain('Hank Hill');
    expect(result!.user).toContain('Acme Corp');
  });
});

// ─── addTemplate() ────────────────────────────────────────────────────────────

describe('PromptLibrary.addTemplate()', () => {
  it('adds a custom template retrievable by getTemplate()', () => {
    const lib = new PromptLibrary();
    const custom: PromptTemplate = {
      id: 'custom-id', name: 'Custom', description: 'desc',
      systemPrompt: 'sys', userPromptTemplate: 'user', outputFormat: 'out',
    };
    lib.addTemplate(custom);
    expect(lib.getTemplate('custom-id')).toEqual(custom);
  });

  it('custom template appears in listTemplates()', () => {
    const lib = new PromptLibrary();
    const custom: PromptTemplate = {
      id: 'my-custom', name: 'Mine', description: 'desc',
      systemPrompt: 'sys', userPromptTemplate: 'user', outputFormat: 'out',
    };
    lib.addTemplate(custom);
    const ids = lib.listTemplates().map(t => t.id);
    expect(ids).toContain('my-custom');
  });

  it('can override an existing template by same id', () => {
    const lib = new PromptLibrary();
    const override: PromptTemplate = {
      id: 'validation', name: 'Overridden', description: 'overridden',
      systemPrompt: 'new sys', userPromptTemplate: 'new user', outputFormat: 'new out',
    };
    lib.addTemplate(override);
    expect(lib.getTemplate('validation')!.name).toBe('Overridden');
  });
});

// ─── exportTemplates() / importTemplates() ───────────────────────────────────

describe('PromptLibrary.exportTemplates()', () => {
  it('returns valid JSON string', () => {
    const lib = new PromptLibrary();
    expect(() => JSON.parse(lib.exportTemplates())).not.toThrow();
  });

  it('exported JSON contains all 4 default template ids', () => {
    const lib = new PromptLibrary();
    const parsed = JSON.parse(lib.exportTemplates()) as PromptTemplate[];
    const ids = parsed.map(t => t.id);
    expect(ids).toContain('resume-tailor');
    expect(ids).toContain('validation');
    expect(ids).toContain('cover-letter');
    expect(ids).toContain('skills-extraction');
  });
});

describe('PromptLibrary.importTemplates()', () => {
  it('imports and makes templates available', () => {
    const lib = new PromptLibrary();
    const newTemplates: PromptTemplate[] = [{
      id: 'imported-template', name: 'Imported', description: 'test',
      systemPrompt: 'sys', userPromptTemplate: 'user', outputFormat: 'out',
    }];
    lib.importTemplates(JSON.stringify(newTemplates));
    expect(lib.getTemplate('imported-template')).toBeDefined();
  });

  it('does not throw on invalid JSON', () => {
    const lib = new PromptLibrary();
    expect(() => lib.importTemplates('not valid json {')).not.toThrow();
  });

  it('round-trips: export then import produces parseable JSON with all default ids', () => {
    const lib1 = new PromptLibrary();
    const exported = lib1.exportTemplates();
    const lib2 = new PromptLibrary();
    lib2.importTemplates(exported);
    // The exported JSON is valid and all 4 default ids survive the round-trip
    const ids = lib2.listTemplates().map(t => t.id);
    expect(ids).toContain('resume-tailor');
    expect(ids).toContain('validation');
    expect(ids).toContain('cover-letter');
    expect(ids).toContain('skills-extraction');
  });
});
