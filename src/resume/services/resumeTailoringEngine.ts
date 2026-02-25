/**
 * LLM-First Resume Tailoring Engine
 * Relies on LLM intelligence instead of rigid keyword matching
 */

import { OllamaService } from './ollamaService.js';
import { PromptLibrary } from './promptLibrary.js';
import { SimpleProfile } from './profileDataAdapter.js';



export interface TailoredResumeResult {
  summary: string;
  selectedExperiences: {
    company: string;
    role: string;
    duration: string;
    location: string;
    selectedAchievements: string[];
  }[];
  relevantSkills: string[];
  matchScore: number;
  reasoning: string;
}

export class ResumeTailoringEngine {
  private promptLibrary: PromptLibrary;

  constructor(
    private ollamaAnalyze: OllamaService,
    private ollamaTailor: OllamaService,
    private ollamaValidate: OllamaService
  ) {
    this.promptLibrary = new PromptLibrary();
  }

  /**
   * Factory: creates an engine wired to task-appropriate Ollama instances.
   */
  static create(): ResumeTailoringEngine {
    return new ResumeTailoringEngine(
      OllamaService.forTask('analyze'),
      OllamaService.forTask('tailor'),
      OllamaService.forTask('validate')
    );
  }

  /**
   * Tailor resume using LLM intelligence with prompt library
   */
  async tailorResume(
    profile: SimpleProfile,
    jobPosting: string,
    jobTitle: string,
    company: string
  ): Promise<TailoredResumeResult> {
    // Format work history for prompt
    const workHistory = profile.workHistory.map(job => 
      `${job.company} | ${job.role} | ${job.duration} | ${job.location}\nAchievements:\n${job.achievements.map(a => `- ${a}`).join('\n')}`
    ).join('\n\n');

    // Get prompt from library and fill with values
    const prompts = this.promptLibrary.fillTemplate('resume-tailor', {
      name: profile.name,
      summary: profile.summary,
      workHistory,
      numPositions: profile.workHistory.length.toString(),
      jobTitle,
      company,
      jobPosting
    });

    if (!prompts) {
      throw new Error('Failed to load resume-tailor prompt template');
    }

    // Get LLM to do the intelligent tailoring using library prompts
    const response = await this.ollamaTailor.chat([
      {
        role: 'system',
        content: prompts.system
      },
      {
        role: 'user',
        content: prompts.user
      }
    ]);

    // Parse the structured response
    const result = this.parseResponse(response, profile);
    
    // STRICT validation: Only include experiences that exist in profile and normalize to exact values
    result.selectedExperiences = result.selectedExperiences
      .map(exp => {
        // Find matching job in profile by BOTH company AND role
        const originalJob = profile.workHistory.find(job => 
          (job.company.toLowerCase() === exp.company.toLowerCase() ||
           job.company.toLowerCase().includes(exp.company.toLowerCase()) ||
           exp.company.toLowerCase().includes(job.company.toLowerCase())) &&
          (job.role.toLowerCase() === exp.role.toLowerCase() ||
           job.role.toLowerCase().includes(exp.role.toLowerCase()) ||
           exp.role.toLowerCase().includes(job.role.toLowerCase()))
        );
        
        if (originalJob) {
          // Use EXACT values from original, but keep selected achievements
          return {
            company: originalJob.company,
            role: originalJob.role,
            duration: originalJob.duration,
            location: originalJob.location,
            selectedAchievements: exp.selectedAchievements
              .map(achievement => {
                // Find closest matching achievement in original
                const match = originalJob.achievements.find(orig =>
                  orig.toLowerCase().includes(achievement.toLowerCase().substring(0, 50)) ||
                  achievement.toLowerCase().includes(orig.toLowerCase().substring(0, 50))
                );
                return match || achievement;
              })
              .filter(a => a) // Remove empty/null
          };
        }
        
        // If no match found, skip this experience (it's fabricated)
        return null;
      })
      .filter((exp): exp is NonNullable<typeof exp> => exp !== null);
    
    // POST-PROCESSING: Ensure all positions are included and no duplicates
    
    // Step 1: Merge duplicate positions and combine their achievements
    const experienceMap = new Map<string, typeof result.selectedExperiences[0]>();
    
    result.selectedExperiences.forEach(exp => {
      const key = `${exp.company}|${exp.role}`;
      if (experienceMap.has(key)) {
        // Merge achievements from duplicate
        const existing = experienceMap.get(key)!;
        const allAchievements = [...existing.selectedAchievements, ...exp.selectedAchievements];
        // Deduplicate achievements and keep unique ones
        existing.selectedAchievements = Array.from(new Set(allAchievements));
      } else {
        experienceMap.set(key, exp);
      }
    });
    
    const uniqueExperiences = Array.from(experienceMap.values());
    
    // Step 2: Build set of included positions AFTER deduplication
    const includedCompaniesAndRoles = new Set(experienceMap.keys());
    
    // Step 3: Add missing positions with minimal achievements
    profile.workHistory.forEach(originalJob => {
      const key = `${originalJob.company}|${originalJob.role}`;
      if (!includedCompaniesAndRoles.has(key)) {
        // Add missing position with 1-2 achievements
        uniqueExperiences.push({
          company: originalJob.company,
          role: originalJob.role,
          duration: originalJob.duration,
          location: originalJob.location,
          selectedAchievements: originalJob.achievements.slice(0, 2)
        });
      }
    });
    
    result.selectedExperiences = uniqueExperiences;
    
    return result;
  }

  /**
   * Parse LLM response into structured result
   */
  private parseResponse(response: string, profile: SimpleProfile): TailoredResumeResult {
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      // Try to extract JSON even if there's text before/after
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      let jsonStr = jsonMatch[0];
      
      // Fix common JSON issues from LLMs
      // 1. Missing quotes around property names (though most LLMs get this right)
      // 2. Unescaped newlines in strings
      jsonStr = jsonStr.replace(/\n/g, ' ').replace(/\r/g, '');
      
      // Try to parse
      const parsed = JSON.parse(jsonStr);

      // Validate and extract fields with defaults
      return {
        summary: parsed.tailoredSummary || profile.summary,
        selectedExperiences: Array.isArray(parsed.selectedExperiences) 
          ? parsed.selectedExperiences.map((exp: any) => ({
              company: exp.company || '',
              role: exp.role || '',
              duration: exp.duration || '',
              location: exp.location || '',
              selectedAchievements: Array.isArray(exp.selectedAchievements) 
                ? exp.selectedAchievements 
                : []
            }))
          : [],
        relevantSkills: Array.isArray(parsed.relevantSkills) ? parsed.relevantSkills : [],
        matchScore: typeof parsed.matchScore === 'number' ? parsed.matchScore : 50,
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.error('Response was:', response);
      
      // Fallback: return all experiences with top achievements
      return {
        summary: profile.summary,
        selectedExperiences: profile.workHistory.map(job => ({
          company: job.company,
          role: job.role,
          duration: job.duration,
          location: job.location,
          selectedAchievements: job.achievements.slice(0, 5)
        })),
        relevantSkills: [],
        matchScore: 50,
        reasoning: 'Failed to parse LLM response, using fallback with all data'
      };
    }
  }
}
