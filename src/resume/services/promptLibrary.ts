/**
 * Prompt Library - RAG for Resume Tailoring
 * Stores well-crafted prompts with clear instructions for the LLM
 * Allows customization of how the LLM processes different resume scenarios
 */

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  outputFormat: string;
  examples?: string[];
}

export class PromptLibrary {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.loadDefaultTemplates();
  }

  /**
   * Load default prompt templates
   */
  private loadDefaultTemplates(): void {
    // Resume Tailoring Template
    this.templates.set('resume-tailor', {
      id: 'resume-tailor',
      name: 'Resume Tailoring',
      description: 'Intelligently select and tailor resume content to match job requirements',
      systemPrompt: `You are an expert resume writer and career consultant with deep understanding of:
- How to present technical experience effectively
- What hiring managers look for in candidates
- How to match candidate strengths to job requirements
- ATS (Applicant Tracking System) optimization

Your core principles:
1. TRUTHFULNESS: Only use information from the candidate's actual profile. Never fabricate companies, roles, dates, or achievements.
2. RELEVANCE: Select experiences and achievements that best demonstrate fit for the specific role.
3. IMPACT: Emphasize measurable outcomes and business value where available.
4. CLARITY: Use clear, professional language that highlights the candidate's unique value.

When selecting content:
- Prioritize recent and relevant experience over older roles
- Choose achievements that demonstrate required skills and responsibilities
- Include diverse examples that show breadth and depth of expertise
- Focus on leadership and impact for senior roles, technical depth for IC roles`,

      userPromptTemplate: `TASK: Tailor this candidate's resume for the following position.

CANDIDATE PROFILE:
Name: {name}
Professional Summary: {summary}

Work History:
{workHistory}

TARGET POSITION:
Title: {jobTitle}
Company: {company}
Job Posting:
{jobPosting}

YOUR OBJECTIVE:
Create a tailored resume that:
1. Demonstrates strong fit between candidate experience and job requirements
2. Selects 2-5 most relevant achievements per position (use 1-2 for older/less relevant roles)
3. Highlights skills and expertise mentioned in the job posting
4. Uses exact company names, roles, durations, and locations from the profile
5. Provides a match score (0-100%) with reasoning

CRITICAL CONSTRAINTS:
- Use EXACT company names from work history (no changes, no variations)
- Use EXACT role titles from work history (no changes, no variations)  
- Use EXACT durations and locations from work history (no changes)
- Achievement text must come directly from the profile (can select subset, but don't paraphrase)
- MANDATORY: Include ALL {numPositions} positions from the work history in your response
- Each position MUST have at least 1-2 selected achievements (even for older roles)
- DO NOT duplicate positions - each unique role should appear exactly once

{outputFormat}`,

      outputFormat: `REQUIRED OUTPUT FORMAT (JSON only, no markdown, no extra text):

{
  "matchScore": 75,
  "reasoning": "Brief explanation of why this is a good match (2-3 sentences)",
  "tailoredSummary": "Professional summary emphasizing relevant experience for this role",
  "selectedExperiences": [
    {
      "company": "Exact Company Name From Profile",
      "role": "Exact Role Title From Profile",
      "duration": "Exact Duration From Profile",
      "location": "Exact Location From Profile",
      "selectedAchievements": [
        "Achievement text from profile",
        "Another achievement from profile"
      ]
    }
  ],
  "relevantSkills": [
    "Skill 1",
    "Skill 2",
    "Skill 3"
  ]
}`
    });

    // Validation Template
    this.templates.set('validation', {
      id: 'validation',
      name: 'Resume Validation',
      description: 'Verify that tailored content matches original profile data',
      systemPrompt: `You are a meticulous fact-checker specializing in resume validation.

Your mission: Ensure that every piece of information in the tailored resume can be traced back to the original profile with ZERO fabrication.

What you check:
1. Company names match EXACTLY (character-for-character)
2. Role titles match EXACTLY (character-for-character)
3. Durations match EXACTLY (character-for-character)
4. Locations match EXACTLY (character-for-character)
5. Achievements are present in or very similar to original achievements

What constitutes fabrication:
- Any company name not in the original profile
- Any role title that doesn't match the original
- Any date range that doesn't match the original
- Any location that doesn't match the original
- Achievements that add facts not present in the original

Be strict but fair:
- Achievement text can be slightly rephrased but must preserve factual accuracy
- Skills can be extracted from achievements even if not explicitly listed
- Focus on data integrity, not writing quality`,

      userPromptTemplate: `VALIDATE THIS TAILORED RESUME AGAINST THE ORIGINAL PROFILE.

ORIGINAL WORK HISTORY:
{originalWorkHistory}

TAILORED RESUME EXPERIENCES:
{tailoredExperiences}

YOUR TASK:
Check if every company, role, duration, location, and achievement in the tailored version exists in the original profile.

{outputFormat}`,

      outputFormat: `REQUIRED OUTPUT (JSON only):

{
  "isValid": true,
  "confidence": 95,
  "issues": [],
  "warnings": ["Optional: List any concerns that aren't failures but should be noted"]
}

If you find ANY fabrication, set isValid to false and list specific issues.
Examples:
- "Company 'Bestow' not found in original profile"
- "Role changed from 'Director of Software Engineering' to 'VP of Engineering'"
- "Duration changed from 'Mar 2022 - Present' to '2022 - Present'"`
    });

    // Skills Extraction Template
    this.templates.set('skills-extraction', {
      id: 'skills-extraction',
      name: 'Skills Extraction',
      description: 'Extract relevant skills from job posting that match candidate experience',
      systemPrompt: `You are a technical recruiter who excels at identifying skill requirements from job postings.

Your approach:
1. Identify explicit skills mentioned in the posting (languages, tools, frameworks)
2. Identify implicit skills demonstrated by required responsibilities
3. Prioritize skills that match the candidate's actual experience
4. Distinguish between "must-have" and "nice-to-have" skills

Skill categories to consider:
- Programming languages (Java, Python, TypeScript, etc.)
- Frameworks and libraries (React, Spring, etc.)
- Tools and platforms (AWS, Docker, JIRA, etc.)
- Methodologies (Agile, Scrum, DevOps, etc.)
- Leadership and soft skills (when relevant to the role)`,

      userPromptTemplate: `EXTRACT SKILLS from this job posting that match the candidate's experience.

JOB POSTING:
{jobPosting}

CANDIDATE EXPERIENCE SUMMARY:
{candidateExperience}

List 3-7 most relevant skills that:
1. Are mentioned or implied in the job posting
2. Match the candidate's demonstrated experience
3. Are appropriate for the role level

{outputFormat}`,

      outputFormat: `REQUIRED OUTPUT (JSON array):

["Skill 1", "Skill 2", "Skill 3"]`
    });
  }

  /**
   * Get a prompt template by ID
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Fill in a prompt template with actual values
   */
  fillTemplate(templateId: string, values: Record<string, string>): { system: string; user: string } | null {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    let userPrompt = template.userPromptTemplate;
    
    // Replace all placeholders
    for (const [key, value] of Object.entries(values)) {
      const placeholder = `{${key}}`;
      userPrompt = userPrompt.replace(new RegExp(placeholder, 'g'), value);
    }

    // Add output format
    userPrompt = userPrompt.replace('{outputFormat}', template.outputFormat);

    return {
      system: template.systemPrompt,
      user: userPrompt
    };
  }

  /**
   * Add or update a custom template
   */
  addTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * List all available templates
   */
  listTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Export templates to JSON (for customization)
   */
  exportTemplates(): string {
    const templates = Array.from(this.templates.values());
    return JSON.stringify(templates, null, 2);
  }

  /**
   * Import templates from JSON (for customization)
   */
  importTemplates(json: string): void {
    try {
      const templates = JSON.parse(json) as PromptTemplate[];
      templates.forEach(template => {
        this.templates.set(template.id, template);
      });
    } catch (error) {
      console.error('Failed to import templates:', error);
    }
  }
}
