/**
 * Cover Letter Engine
 * Generates personalized cover letters that highlight skill matches and growth opportunities
 */

import { OllamaService } from './ollamaService.js';
import { PromptLibrary } from './promptLibrary.js';
import { SimpleProfile } from './profileDataAdapter.js';
import { CoverLetterResult, CoverLetterOptions } from '../types/resumeTypes.js';

export class CoverLetterEngine {
  private promptLibrary: PromptLibrary;

  constructor(
    private ollama: OllamaService
  ) {
    this.promptLibrary = new PromptLibrary();
  }

  /**
   * Generate a tailored cover letter using LLM intelligence
   */
  async generateCoverLetter(
    profile: SimpleProfile,
    jobPosting: string,
    jobTitle: string,
    company: string,
    options: CoverLetterOptions = {}
  ): Promise<CoverLetterResult> {
    // Set defaults
    const tone = options.tone || 'professional';
    const maxLength = options.maxLength || 300;
    const focusAreas = options.focusAreas || ['technical-depth', 'collaboration'];

    // Format work history for prompt
    const workHistory = profile.workHistory.map(job => 
      `${job.company} | ${job.role} | ${job.duration}\nKey Achievements:\n${job.achievements.map(a => `- ${a}`).join('\n')}`
    ).join('\n\n');

    // Get prompt from library and fill with values
    const prompts = this.promptLibrary.fillTemplate('cover-letter', {
      name: profile.name,
      summary: profile.summary,
      workHistory,
      jobTitle,
      company,
      jobPosting,
      tone,
      maxLength: maxLength.toString(),
      focusAreas: focusAreas.join(', '),
      companyResearch: options.companyResearch || 'Not provided'
    });

    if (!prompts) {
      throw new Error('Failed to load cover-letter prompt template');
    }

    // Get LLM to generate the cover letter
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

    // Parse the structured response
    const result = this.parseResponse(response, tone);
    
    // Generate full letter text
    result.fullLetter = this.formatFullLetter(result, profile.name, company, jobTitle);

    return result;
  }

  /**
   * Parse LLM response into structured cover letter result
   */
  private parseResponse(response: string, tone: string): CoverLetterResult {
    try {
      // Extract JSON from response (handle markdown code blocks and extra text)
      let jsonStr = response.trim();
      
      // Remove any leading text before JSON
      const jsonStartIndex = jsonStr.indexOf('{');
      if (jsonStartIndex > 0) {
        jsonStr = jsonStr.substring(jsonStartIndex);
      }
      
      // Handle markdown code blocks
      if (jsonStr.includes('```json')) {
        const match = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      } else if (jsonStr.includes('```')) {
        const match = jsonStr.match(/```\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonStr = match[1];
        }
      }
      
      // Extract just the JSON object if there's trailing text
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr);

      // Validate structure (be lenient about empty fields)
      if (!parsed.opening || !parsed.skillMatches || !parsed.growthOpportunities || !parsed.closing) {
        throw new Error('Invalid cover letter structure from LLM - missing required fields');
      }

      return {
        opening: parsed.opening,
        skillMatches: parsed.skillMatches.map((sm: any) => ({
          skill: sm.skill,
          experienceExamples: Array.isArray(sm.experienceExamples) ? sm.experienceExamples : [],
          relevanceRating: sm.relevanceRating || 8
        })),
        growthOpportunities: parsed.growthOpportunities.map((go: any) => ({
          area: go.area,
          currentExperience: go.currentExperience,
          desiredGrowth: go.desiredGrowth,
          whyExcited: go.whyExcited
        })),
        companyAlignment: parsed.companyAlignment || 'I am excited about the opportunity to contribute to your team and help drive success.',
        closing: parsed.closing,
        tone: tone as any,
        fullLetter: '' // Will be generated separately
      };
    } catch (error) {
      console.error('Failed to parse cover letter response:', error);
      console.error('Raw response:', response);
      throw new Error('Failed to parse LLM response for cover letter');
    }
  }

  /**
   * Format complete cover letter from structured components
   */
  private formatFullLetter(
    result: CoverLetterResult,
    candidateName: string,
    _company: string,
    _jobTitle: string
  ): string {
    const sections: string[] = [];

    // Header
    sections.push(`Dear Hiring Manager,\n`);

    // Opening
    sections.push(result.opening);
    sections.push('');

    // Skill matches section - more concise
    sections.push('Key qualifications:');
    result.skillMatches.forEach(match => {
      sections.push(`\n${match.skill}: ${match.experienceExamples.join(' ')}`);
    });
    sections.push('');

    // Growth opportunities section - more concise
    sections.push('I\'m particularly excited about:');
    result.growthOpportunities.forEach(opportunity => {
      sections.push(`\n${opportunity.area}: ${opportunity.whyExcited} ${opportunity.desiredGrowth}`);
    });
    sections.push('');

    // Company alignment (if provided)
    if (result.companyAlignment && result.companyAlignment.trim().length > 0) {
      sections.push(result.companyAlignment);
      sections.push('');
    }

    // Closing
    sections.push(result.closing);
    sections.push('');
    sections.push('Sincerely,');
    sections.push(candidateName);

    return sections.join('\n');
  }

  /**
   * Export cover letter to plain text
   */
  exportToText(result: CoverLetterResult): string {
    return result.fullLetter;
  }

  /**
   * Export cover letter to HTML
   */
  exportToHTML(
    result: CoverLetterResult,
    candidateName: string,
    contactEmail: string,
    contactPhone: string,
    _company: string,
    _jobTitle: string
  ): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cover Letter - ${candidateName}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #333;
    }
    .header {
      text-align: right;
      margin-bottom: 40px;
      border-bottom: 2px solid #2c3e50;
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      color: #2c3e50;
    }
    .header p {
      margin: 5px 0;
      font-size: 14px;
      color: #555;
    }
    .date {
      text-align: left;
      margin-bottom: 30px;
      color: #666;
    }
    .salutation {
      margin-bottom: 20px;
    }
    .paragraph {
      margin-bottom: 20px;
      text-align: justify;
    }
    .skill-section, .growth-section {
      margin: 25px 0;
    }
    .skill-item, .growth-item {
      margin: 15px 0 15px 20px;
    }
    .skill-item strong, .growth-item strong {
      color: #2c3e50;
    }
    .closing {
      margin-top: 40px;
    }
    .signature {
      margin-top: 60px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${candidateName}</h1>
    <p>${contactEmail} | ${contactPhone}</p>
  </div>

  <div class="date">
    ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
  </div>

  <div class="salutation">
    <p>Dear Hiring Manager,</p>
  </div>

  <div class="paragraph">
    ${result.opening}
  </div>

  <div class="skill-section">
    <p><strong>My experience aligns strongly with your requirements:</strong></p>
    ${result.skillMatches.map(match => `
      <div class="skill-item">
        <strong>${match.skill}:</strong> ${match.experienceExamples.join(' ')}
      </div>
    `).join('')}
  </div>

  <div class="growth-section">
    <p><strong>Beyond my current expertise, I'm particularly excited about opportunities to:</strong></p>
    ${result.growthOpportunities.map(opportunity => `
      <div class="growth-item">
        <strong>${opportunity.area}:</strong> ${opportunity.whyExcited} Building on my experience with ${opportunity.currentExperience}, I'm eager to ${opportunity.desiredGrowth}.
      </div>
    `).join('')}
  </div>

  <div class="paragraph">
    ${result.companyAlignment}
  </div>

  <div class="closing">
    <div class="paragraph">
      ${result.closing}
    </div>
    <div class="signature">
      <p>Sincerely,</p>
      <p><strong>${candidateName}</strong></p>
    </div>
  </div>
</body>
</html>`;
  }
}
