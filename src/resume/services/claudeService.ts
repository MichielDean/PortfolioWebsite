/**
 * Claude AI Service
 * Drop-in replacement for OllamaService, using the Anthropic SDK.
 * Reads ANTHROPIC_API_KEY from the environment.
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ClaudeConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Task-to-model mapping.
 * All tasks use claude-sonnet for quality; swap to claude-haiku for speed if needed.
 */
const TASK_MODELS: Record<'analyze' | 'tailor' | 'cover-letter' | 'validate' | 'score', string> = {
  'analyze':      'claude-sonnet-4-5',
  'tailor':       'claude-sonnet-4-5',
  'cover-letter': 'claude-sonnet-4-5',
  'validate':     'claude-haiku-4-5',
  'score':        'claude-haiku-4-5',
};

/**
 * Module-level lazy Anthropic client shared across all ClaudeService instances.
 * Initialised on first use to avoid import-time crashes when the key is absent.
 */
let _sharedClient: Anthropic | null = null;

function getSharedClient(): Anthropic {
  if (!_sharedClient) {
    _sharedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _sharedClient;
}

export class ClaudeService {
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: ClaudeConfig = {}) {
    // Do NOT validate the API key here — defer to chat() / isAvailable()
    // so callers get a friendly message instead of a constructor crash.
    this.model = config.model ?? 'claude-sonnet-4-5';
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.3;
  }

  /**
   * Returns a purpose-specific ClaudeService instance for the given task.
   * All instances share one underlying Anthropic client (lazy-initialised).
   */
  static forTask(task: 'analyze' | 'tailor' | 'cover-letter' | 'validate' | 'score'): ClaudeService {
    return new ClaudeService({ model: TASK_MODELS[task] }); // TASK_MODELS is exhaustive; fallback removed
  }

  /**
   * Check if the Claude API is reachable and the key is valid.
   * Returns false (and logs) on any error, including missing key or network timeout.
   * Imposes a 5-second timeout on the probe request.
   */
  async isAvailable(): Promise<boolean> {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('[ClaudeService] isAvailable: ANTHROPIC_API_KEY is not set');
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      await getSharedClient().messages.create(
        {
          model: this.model,
          max_tokens: 8,
          messages: [{ role: 'user', content: 'ping' }],
        },
        { signal: controller.signal }
      );
      return true;
    } catch (err) {
      console.warn('[ClaudeService] isAvailable: probe failed:', err);
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Send a chat completion request to Claude.
   * Accepts the same [{role, content}] format as OllamaService.
   * The first 'system' message(s) are extracted and passed as the system prompt.
   *
   * Message ordering requirements:
   *  - `messages` must not be empty.
   *  - The first non-system message must have role 'user'.
   *  - System messages must precede user/assistant turns in the input array.
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    // Extract system prompt (Claude API takes it separately)
    const systemMessages = messages.filter(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    if (userMessages.length === 0) {
      throw new Error('[ClaudeService] chat(): messages must contain at least one user or assistant message');
    }

    if (userMessages[0].role !== 'user') {
      throw new Error(
        `[ClaudeService] chat(): first non-system message must have role 'user', got '${userMessages[0].role}'`
      );
    }

    const systemPrompt = systemMessages.map(m => m.content).join('\n\n');

    const anthropicMessages: Anthropic.MessageParam[] = userMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // 60-second timeout on LLM calls. No retry — callers are responsible for retry policy.
    const chatController = new AbortController();
    const chatTimeoutId = setTimeout(() => chatController.abort(), 60000);

    let response: Anthropic.Message;
    try {
      response = await getSharedClient().messages.create(
        {
          model: this.model,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          ...(systemPrompt ? { system: systemPrompt } : {}),
          messages: anthropicMessages,
        },
        { signal: chatController.signal }
      );
    } finally {
      clearTimeout(chatTimeoutId);
    }

    if (response.content.length === 0) {
      throw new Error('Claude returned an empty response');
    }

    const textBlocks = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text);

    if (textBlocks.length === 0) {
      throw new Error(`Claude returned no text blocks; first block type: ${response.content[0].type}`);
    }

    return textBlocks.join('\n');
  }

  /**
   * Extract keywords from job posting text.
   * Returns structured data about job requirements.
   */
  async extractJobKeywords(
    jobPostingText: string,
    ragContext?: string
  ): Promise<{
    skills: string[];
    qualifications: string[];
    responsibilities: string[];
    tools: string[];
  }> {
    const systemPrompt = `You are an expert at analyzing job postings and extracting key requirements.
Your task is to identify:
1. Technical skills mentioned (programming languages, frameworks, tools)
2. Required qualifications (years of experience, education, certifications)
3. Key responsibilities
4. Specific tools or platforms mentioned

Return ONLY a valid JSON object with these four arrays: skills, qualifications, responsibilities, tools.
Do not include any explanatory text, just the JSON object.`;

    const ragContextSection = ragContext
      ? `\n\nContext from similar past applications:\n${ragContext}\n\nUse this context to better identify important keywords and requirements.`
      : '';

    const userPrompt = `Analyze this job posting and extract the key information:

${jobPostingText}${ragContextSection}

Return a JSON object with arrays for: skills, qualifications, responsibilities, tools`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    try {
      const jsonMatch =
        response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ||
        response.match(/(\{[\s\S]*\})/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      return JSON.parse(response);
    } catch (error) {
      console.warn('[ClaudeService] extractJobKeywords: JSON parse failed. Error:', error, 'Response snippet:', typeof response === 'string' ? response.slice(0, 200) : response);
      return { skills: [], qualifications: [], responsibilities: [], tools: [] };
    }
  }

  /**
   * Generate a tailored professional summary.
   */
  async tailorSummary(
    originalSummary: string,
    jobKeywords: string[],
    jobTitle: string,
    ragContext?: string
  ): Promise<string> {
    const systemPrompt = `You are a professional resume writer. Your task is to slightly modify a professional summary to better align with a specific job posting.

CRITICAL RULES - VIOLATIONS WILL RESULT IN REJECTION:
1. DO NOT fabricate any experience, skills, or achievements
2. DO NOT add any years of experience, team sizes, or numbers not in the original
3. DO NOT add any job titles, companies, or roles not mentioned in the original
4. DO NOT add any technologies, tools, or skills not present in the original
5. ONLY reorder existing sentences or slightly rephrase them
6. Keep ALL factual claims identical (years of experience, team sizes, specific achievements)
7. You may emphasize different aspects by reordering sentences
8. You may replace generic words with specific keywords if they mean the same thing
9. The summary should remain the same length (±20 words maximum)
10. Maintain professional tone and first/third person perspective from original

ALLOWED CHANGES:
- Reorder sentences to emphasize relevant experience first
- Replace "led teams" with "led engineering teams" if engineering is mentioned
- Replace "cloud" with "AWS" if AWS is specifically mentioned in original

FORBIDDEN CHANGES:
- Adding any new facts, numbers, or claims
- Changing any years, team sizes, or quantitative measures
- Adding technologies not mentioned in original summary`;

    const ragContextSection = ragContext
      ? `\n\nContext from similar past applications:\n${ragContext}\n\nUse this to understand which aspects have been successful for similar roles.`
      : '';

    const userPrompt = `Original Summary:
${originalSummary}

Target Job Title: ${jobTitle}

Key Job Requirements: ${jobKeywords.join(', ')}${ragContextSection}

Please modify the summary to better emphasize relevant experience for this role.

REMEMBER:
- NO new facts or fabrications
- ONLY reorder or slightly rephrase existing content
- Keep ALL numbers, years, and factual claims identical
- Return ONLY the modified summary, no explanations

Modified summary:`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    return response.trim();
  }

  /**
   * Heuristic keyword-overlap score. Does not call the LLM.
   */
  scoreAchievementByKeywordMatch(
    achievementKeywords: string[],
    jobKeywords: string[]
  ): number {
    const matches = achievementKeywords.filter(ak =>
      jobKeywords.some(
        jk =>
          ak.toLowerCase().includes(jk.toLowerCase()) ||
          jk.toLowerCase().includes(ak.toLowerCase())
      )
    );

    const matchScore = (matches.length / Math.max(achievementKeywords.length, 1)) * 100;
    return Math.min(matchScore, 100);
  }
}

let _claudeService: ClaudeService | null = null;

export function getClaudeService(): ClaudeService {
  if (!_claudeService) {
    _claudeService = new ClaudeService();
  }
  return _claudeService;
}
