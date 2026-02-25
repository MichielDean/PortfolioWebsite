/**
 * Ollama AI Service
 * Provides local AI capabilities for resume tailoring
 * Requires Ollama to be installed and running locally
 */

const MODEL_ALIASES: Record<string, string> = {
  'qwen3':    'qwen3:14b',
  'qwen2':    'qwen2.5:14b',
  'deepseek': 'deepseek-r1:14b',
  'fast':     'qwen2.5:7b',
  'qwen3-8b': 'qwen3:8b',
};

function resolveModel(model: string): string {
  return MODEL_ALIASES[model] ?? model;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  temperature?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export class OllamaService {
  private config: OllamaConfig;

  constructor(config?: Partial<OllamaConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || 'http://192.168.0.135:11434',
      model: resolveModel(config?.model || 'qwen3:14b'),
      temperature: config?.temperature || 0.3 // Lower temperature for more focused, factual responses
    };
  }

  /**
   * Returns a purpose-specific OllamaService instance for the given task.
   * Each task uses the model best suited for its workload.
   */
  static forTask(task: 'analyze' | 'tailor' | 'cover-letter' | 'validate' | 'score'): OllamaService {
    const taskModels: Record<string, string> = {
      'analyze':      'qwen3:14b',       // JD analysis: needs strong instruction following
      'tailor':       'qwen3:14b',       // Resume tailoring: complex judgment + keyword injection
      'cover-letter': 'deepseek-r1:14b', // Cover letter: reasoning model for better prose
      'validate':     'qwen2.5:14b',     // Validation: pattern matching, structural check
      'score':        'qwen2.5:14b',     // ATS scoring: keyword matching, scoring logic
    };
    return new OllamaService({ model: taskModels[task] ?? 'qwen3:14b' });
  }

  /**
   * Check if Ollama is running and accessible
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      return response.ok;
    } catch (error) {
      console.error('Ollama connection error:', error);
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      const data = await response.json() as { models?: Array<{ name: string }> };
      return data.models?.map((m) => m.name) || [];
    } catch (error) {
      console.error('Error listing models:', error);
      return [];
    }
  }

  /**
   * Send a chat completion request to Ollama
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: this.config.temperature,
          stream: false
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json() as OllamaResponse;
      return data.message.content;
    } catch (error) {
      console.error('Error communicating with Ollama:', error);
      throw error;
    }
  }

  /**
   * Extract keywords from job posting text
   * Returns structured data about job requirements
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
      { role: 'user', content: userPrompt }
    ]);

    try {
      // Try to parse the response as JSON
      // Handle cases where the model might wrap JSON in markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                       response.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      return JSON.parse(response);
    } catch (error) {
      console.error('Error parsing job keywords:', error);
      console.error('Raw response:', response);
      // Return empty structure if parsing fails
      return { skills: [], qualifications: [], responsibilities: [], tools: [] };
    }
  }

  /**
   * Generate a tailored professional summary
   * Takes original summary and job context, returns modified version that emphasizes relevant experience
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
- Emphasize existing relevant keywords

FORBIDDEN CHANGES:
- Adding any new facts, numbers, or claims
- Changing any years, team sizes, or quantitative measures  
- Adding technologies not mentioned in original summary
- Expanding the summary significantly`;

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
      { role: 'user', content: userPrompt }
    ]);

    return response.trim();
  }

  /**
   * Calculate relevance score for an achievement based on job keywords
   */
  async scoreAchievement(
    _achievementDescription: string,
    achievementKeywords: string[],
    jobKeywords: string[]
  ): Promise<number> {
    // Simple keyword matching for now
    const matches = achievementKeywords.filter(ak => 
      jobKeywords.some(jk => 
        ak.toLowerCase().includes(jk.toLowerCase()) || 
        jk.toLowerCase().includes(ak.toLowerCase())
      )
    );

    // Score based on percentage of matched keywords + base priority
    const matchScore = (matches.length / Math.max(achievementKeywords.length, 1)) * 100;
    return Math.min(matchScore, 100);
  }

  /**
   * Generate alternative phrasing for an achievement to include job keywords
   * Only used if the achievement is relevant but could be worded better
   */
  async rephraseAchievement(
    originalAchievement: string,
    targetKeywords: string[]
  ): Promise<string> {
    const systemPrompt = `You are a professional resume writer. Rephrase the achievement to naturally incorporate relevant keywords, but DO NOT:
1. Add any false information
2. Exaggerate the achievement
3. Change the core meaning
4. Make it sound unnatural

Only make subtle adjustments to wording to include keywords where they fit naturally.`;

    const userPrompt = `Achievement: ${originalAchievement}

Target keywords to incorporate naturally (if applicable): ${targetKeywords.join(', ')}

Rephrase this achievement to include relevant keywords while keeping it truthful and natural.`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    return response.trim();
  }
}

export const ollamaService = new OllamaService();
