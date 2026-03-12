/**
 * Claude AI Service
 * Uses the `claude --print` CLI (claude.ai subscription auth) instead of the API SDK.
 * No ANTHROPIC_API_KEY needed — authentication is handled by the Claude Code CLI.
 */

import { spawn } from 'child_process';

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
 */
const TASK_MODELS: Record<'analyze' | 'tailor' | 'cover-letter' | 'validate' | 'score', string> = {
  'analyze':      'claude-sonnet-4-5',
  'tailor':       'claude-sonnet-4-5',
  'cover-letter': 'claude-sonnet-4-5',
  'validate':     'claude-haiku-4-5',
  'score':        'claude-haiku-4-5',
};

/**
 * Spawn `claude --print` with the given input and model.
 * System prompt is prepended inline since --append-system-prompt adds to Claude Code defaults.
 */
function runClaudeCLI(input: string, model: string, timeoutMs = 60000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['--print', '--model', model], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`[ClaudeService] claude CLI timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on('close', (code: number | null) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`[ClaudeService] claude CLI exited ${code}: ${stderr.slice(0, 300)}`));
      }
    });

    proc.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(new Error(`[ClaudeService] Failed to spawn claude CLI: ${err.message}`));
    });

    proc.stdin.write(input);
    proc.stdin.end();
  });
}

export class ClaudeService {
  private model: string;

  constructor(config: ClaudeConfig = {}) {
    this.model = config.model ?? 'claude-sonnet-4-5';
    // maxTokens and temperature kept in ClaudeConfig for interface compatibility but not used by CLI
    void config.maxTokens;
    void config.temperature;
  }

  static forTask(task: 'analyze' | 'tailor' | 'cover-letter' | 'validate' | 'score'): ClaudeService {
    return new ClaudeService({ model: TASK_MODELS[task] });
  }

  /**
   * Check if the claude CLI is available and authenticated.
   */
  async isAvailable(): Promise<boolean> {
    try {
      await runClaudeCLI('ping', this.model, 15000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send a chat completion request via the claude CLI.
   * System messages are prepended to the user input so Claude sees them as instructions.
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    const systemMessages = messages.filter(m => m.role === 'system');
    const userMessages   = messages.filter(m => m.role !== 'system');

    if (userMessages.length === 0) {
      throw new Error('[ClaudeService] chat(): messages must contain at least one user or assistant message');
    }
    if (userMessages[0].role !== 'user') {
      throw new Error(
        `[ClaudeService] chat(): first non-system message must have role 'user', got '${userMessages[0].role}'`
      );
    }

    // Build the full input: system block (if any) + conversation turns
    const parts: string[] = [];

    if (systemMessages.length > 0) {
      const systemText = systemMessages.map(m => m.content).join('\n\n');
      parts.push(`<system>\n${systemText}\n</system>\n`);
    }

    for (const msg of userMessages) {
      const prefix = msg.role === 'user' ? 'User' : 'Assistant';
      parts.push(`${prefix}: ${msg.content}`);
    }

    // Append a trailing "Assistant:" to cue the response
    parts.push('Assistant:');

    const input = parts.join('\n\n');
    return runClaudeCLI(input, this.model, 120000);
  }

  /**
   * Extract keywords from job posting text.
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
