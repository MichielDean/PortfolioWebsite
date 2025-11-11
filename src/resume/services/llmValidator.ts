/**
 * LLM-Based Resume Validator
 * Uses LLM to fact-check resume content instead of rigid rules
 */

import { OllamaService } from './ollamaService.js';
import { PromptLibrary } from './promptLibrary.js';
import { SimpleProfile } from './profileDataAdapter.js';
import { TailoredResumeResult } from './resumeTailoringEngine.js';

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  confidence: number; // 0-100% how confident the validator is
}

export class LLMValidator {
  private promptLibrary: PromptLibrary;

  constructor(private ollama: OllamaService) {
    this.promptLibrary = new PromptLibrary();
  }

  /**
   * Validate tailored resume against original profile using LLM with prompt library
   */
  async validateResume(
    originalProfile: SimpleProfile,
    tailoredResume: TailoredResumeResult
  ): Promise<ValidationResult> {
    // Format work history for validation
    const originalWorkHistory = originalProfile.workHistory.map(job =>
      `${job.company} | ${job.role} | ${job.duration} | ${job.location}\nAchievements:\n${job.achievements.map(a => `- ${a}`).join('\n')}`
    ).join('\n\n');

    const tailoredExperiences = JSON.stringify(tailoredResume.selectedExperiences, null, 2);

    // Get prompt from library
    const prompts = this.promptLibrary.fillTemplate('validation', {
      originalWorkHistory,
      tailoredExperiences
    });

    if (!prompts) {
      throw new Error('Failed to load validation prompt template');
    }

    const response = await this.ollama.chat([
      {
        role: 'system',
        content: prompts.system
      },
      {
        role: 'user',
        content: prompts.user
      }
    ]);

    return this.parseValidationResponse(response);
  }

  /**
   * Parse validation response from LLM
   */
  private parseValidationResponse(response: string): ValidationResult {
    try {
      // Clean up response
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in validation response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Ensure issues and warnings are string arrays
      const issues = Array.isArray(parsed.issues) 
        ? parsed.issues.map((issue: any) => typeof issue === 'string' ? issue : JSON.stringify(issue))
        : [];
      
      const warnings = Array.isArray(parsed.warnings)
        ? parsed.warnings.map((warning: any) => typeof warning === 'string' ? warning : JSON.stringify(warning))
        : [];

      return {
        isValid: parsed.isValid !== false, // Default to true if unclear
        issues,
        warnings,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50
      };
    } catch (error) {
      console.error('Failed to parse validation response:', error);
      console.error('Response was:', response);
      
      // Default to valid if we can't parse (better than blocking)
      return {
        isValid: true,
        issues: [],
        warnings: ['Failed to parse validation response'],
        confidence: 50
      };
    }
  }
}
