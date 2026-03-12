/**
 * Claude AI Service
 * Drop-in replacement for OllamaService, using the Anthropic SDK.
 * Reads ANTHROPIC_API_KEY from the environment (set via pass in .bashrc).
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
const TASK_MODELS: Record<string, string> = {
  'analyze':      'claude-sonnet-4-5',
  'tailor':       'claude-sonnet-4-5',
  'cover-letter': 'claude-sonnet-4-5',
  'validate':     'claude-haiku-4-5',
  'score':        'claude-haiku-4-5',
};

export class ClaudeService {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: ClaudeConfig = {}) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. ' +
        'Run: export ANTHROPIC_API_KEY=$(pass anthropic/claude)'
      );
    }

    this.client = new Anthropic({ apiKey });
    this.model = config.model ?? 'claude-sonnet-4-5';
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.3;
  }

  /**
   * Returns a purpose-specific ClaudeService instance for the given task.
   */
  static forTask(task: 'analyze' | 'tailor' | 'cover-letter' | 'validate' | 'score'): ClaudeService {
    return new ClaudeService({ model: TASK_MODELS[task] ?? 'claude-sonnet-4-5' });
  }

  /**
   * Check if the Claude API is reachable and the key is valid.
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Minimal call to verify connectivity + auth
      await this.client.messages.create({
        model: this.model,
        max_tokens: 8,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send a chat completion request to Claude.
   * Accepts the same [{role, content}] format as OllamaService.
   * The first 'system' message is extracted and passed as the system prompt.
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    // Extract system prompt (Claude API takes it separately)
    const systemMessages = messages.filter(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const systemPrompt = systemMessages.map(m => m.content).join('\n\n');

    const anthropicMessages: Anthropic.MessageParam[] = userMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: anthropicMessages,
    });

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
    } catch {
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
   * Calculate relevance score for an achievement based on job keywords.
   */
  async scoreAchievement(
    _achievementDescription: string,
    achievementKeywords: string[],
    jobKeywords: string[]
  ): Promise<number> {
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
