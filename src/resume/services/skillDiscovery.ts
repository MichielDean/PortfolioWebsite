/**
 * Skill Discovery Service
 * Detects skills in job postings that aren't in your resume and prompts to add them
 */

import * as readline from 'readline';
import * as fs from 'fs';
import { Skill } from '../types/resumeTypes.js';

export interface UnlistedSkill {
  name: string;
  category: 'technical' | 'soft' | 'tool' | 'language' | 'framework' | 'methodology';
  source: 'job-posting' | 'ai-extracted';
  confidence: 'high' | 'medium' | 'low';
  context?: string; // Where it appeared in the job posting
}

export interface SkillDiscoveryResult {
  discovered: UnlistedSkill[];
  confirmed: Skill[];
  declined: string[];
}

export class SkillDiscoveryService {
  /**
   * Find skills mentioned in job posting that aren't in user's resume
   */
  findUnlistedSkills(
    jobKeywords: string[],
    existingSkills: Skill[],
    jobDescription: string
  ): UnlistedSkill[] {
    const existingSkillNames = new Set<string>();
    
    // Build comprehensive set of existing skills (including keywords)
    for (const skill of existingSkills) {
      existingSkillNames.add(skill.name.toLowerCase());
      for (const keyword of skill.keywords) {
        existingSkillNames.add(keyword.toLowerCase());
      }
    }

    const unlisted: UnlistedSkill[] = [];
    const seen = new Set<string>();

    // Check job keywords
    for (const keyword of jobKeywords) {
      const normalized = keyword.toLowerCase().trim();
      
      if (!normalized || seen.has(normalized)) continue;
      if (existingSkillNames.has(normalized)) continue;
      
      // Skip very generic terms
      if (this.isGenericTerm(normalized)) continue;

      const skillInfo = this.categorizeSkill(normalized);
      const context = this.findSkillContext(normalized, jobDescription);
      
      unlisted.push({
        name: keyword, // Use original casing
        category: skillInfo.category,
        source: 'job-posting',
        confidence: skillInfo.confidence,
        context
      });
      
      seen.add(normalized);
    }

    return unlisted;
  }

  /**
   * Interactively ask user about unlisted skills
   */
  async promptForSkills(
    unlistedSkills: UnlistedSkill[],
    colors: any
  ): Promise<SkillDiscoveryResult> {
    const result: SkillDiscoveryResult = {
      discovered: unlistedSkills,
      confirmed: [],
      declined: []
    };

    if (unlistedSkills.length === 0) {
      return result;
    }

    console.log(`\n${colors.bright}${colors.cyan}━━━ Skill Discovery ━━━${colors.reset}`);
    console.log(`\nFound ${colors.yellow}${unlistedSkills.length}${colors.reset} skills in the job posting that aren't in your resume:\n`);

    // Sort by confidence
    const sorted = [...unlistedSkills].sort((a, b) => {
      const confidenceOrder = { high: 0, medium: 1, low: 2 };
      return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    for (let i = 0; i < sorted.length; i++) {
      const skill = sorted[i];
      const confidenceColor = 
        skill.confidence === 'high' ? colors.green :
        skill.confidence === 'medium' ? colors.yellow :
        colors.red;

      console.log(`\n${i + 1}/${sorted.length}. ${colors.bright}${skill.name}${colors.reset}`);
      console.log(`   Category: ${skill.category}`);
      console.log(`   Confidence: ${confidenceColor}${skill.confidence}${colors.reset}`);
      
      if (skill.context) {
        console.log(`   Context: "${skill.context.substring(0, 80)}..."`);
      }

      const response = await new Promise<string>((resolve) => {
        rl.question(
          `\n   ${colors.bright}Do you have this skill?${colors.reset} [${colors.green}y${colors.reset}/${colors.red}n${colors.reset}/${colors.yellow}s${colors.reset}kip]: `,
          resolve
        );
      });

      const answer = response.trim().toLowerCase();

      if (answer === 'y' || answer === 'yes') {
        // Ask for proficiency
        console.log(`\n   ${colors.bright}Proficiency level:${colors.reset}`);
        console.log(`   1. Expert      - Deep expertise, can mentor others`);
        console.log(`   2. Advanced    - Strong working knowledge`);
        console.log(`   3. Intermediate - Comfortable using it`);
        console.log(`   4. Beginner    - Basic familiarity`);

        const proficiencyInput = await new Promise<string>((resolve) => {
          rl.question(`   Select (1-4, default 2): `, resolve);
        });

        const proficiencyMap: { [key: string]: 'expert' | 'advanced' | 'intermediate' | 'beginner' } = {
          '1': 'expert',
          '2': 'advanced',
          '3': 'intermediate',
          '4': 'beginner',
          '': 'advanced' // default
        };

        const proficiency = proficiencyMap[proficiencyInput.trim()] || 'advanced';

        // Ask for related keywords
        const keywordInput = await new Promise<string>((resolve) => {
          rl.question(
            `   Related keywords/aliases (comma-separated, optional): `,
            resolve
          );
        });

        const keywords = keywordInput
          .split(',')
          .map(k => k.trim())
          .filter(k => k)
          .concat([skill.name.toLowerCase()]);

        // Remove duplicates
        const uniqueKeywords = Array.from(new Set(keywords));

        const confirmedSkill: Skill = {
          name: skill.name,
          category: skill.category,
          keywords: uniqueKeywords,
          proficiency
        };

        result.confirmed.push(confirmedSkill);
        console.log(`   ${colors.green}✓ Added${colors.reset}`);

      } else if (answer === 'n' || answer === 'no') {
        result.declined.push(skill.name);
        console.log(`   ${colors.red}✗ Skipped${colors.reset}`);
      } else {
        // Skip or invalid input
        console.log(`   ${colors.yellow}⊘ Skipped${colors.reset}`);
      }
    }

    rl.close();

    return result;
  }

  /**
   * Generate code to add skills to resumeData.ts
   */
  generateSkillCode(skills: Skill[]): string {
    if (skills.length === 0) {
      return '';
    }

    let code = '\n// Newly discovered skills - add these to your skills array:\n';
    
    for (const skill of skills) {
      code += `  { name: '${skill.name}', category: '${skill.category}', keywords: [${skill.keywords.map(k => `'${k}'`).join(', ')}], proficiency: '${skill.proficiency}' },\n`;
    }

    return code;
  }

  /**
   * Categorize a skill based on its name
   */
  private categorizeSkill(skillName: string): {
    category: UnlistedSkill['category'];
    confidence: UnlistedSkill['confidence'];
  } {
    const lower = skillName.toLowerCase();

    // Programming languages
    const languages = [
      'java', 'javascript', 'typescript', 'python', 'c#', 'csharp', 'c++', 'cpp',
      'ruby', 'go', 'golang', 'rust', 'swift', 'kotlin', 'scala', 'php', 'perl',
      'r', 'matlab', 'sql', 'bash', 'shell', 'powershell'
    ];

    // Frameworks
    const frameworks = [
      'react', 'angular', 'vue', 'svelte', 'nextjs', 'next.js', 'gatsby',
      'spring', 'django', 'flask', 'rails', 'express', 'fastapi',
      '.net', 'dotnet', 'asp.net', 'entity framework',
      'tensorflow', 'pytorch', 'keras', 'scikit-learn'
    ];

    // Tools
    const tools = [
      'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
      'jenkins', 'travis', 'circleci', 'gitlab ci', 'github actions',
      'docker', 'kubernetes', 'k8s', 'terraform', 'ansible',
      'aws', 'azure', 'gcp', 'google cloud', 'heroku',
      'selenium', 'cypress', 'playwright', 'jest', 'mocha', 'junit',
      'postman', 'insomnia', 'swagger'
    ];

    // Methodologies
    const methodologies = [
      'agile', 'scrum', 'kanban', 'devops', 'ci/cd', 'tdd', 'bdd',
      'microservices', 'rest', 'restful', 'graphql', 'soap',
      'oauth', 'jwt', 'saml'
    ];

    // Soft skills
    const softSkills = [
      'leadership', 'management', 'communication', 'collaboration',
      'mentoring', 'coaching', 'problem solving', 'critical thinking',
      'time management', 'project management', 'stakeholder management'
    ];

    // Check categories
    if (languages.some(lang => lower.includes(lang))) {
      return { category: 'language', confidence: 'high' };
    }
    
    if (frameworks.some(fw => lower.includes(fw))) {
      return { category: 'framework', confidence: 'high' };
    }
    
    if (tools.some(tool => lower.includes(tool))) {
      return { category: 'tool', confidence: 'high' };
    }
    
    if (methodologies.some(meth => lower.includes(meth))) {
      return { category: 'methodology', confidence: 'high' };
    }
    
    if (softSkills.some(soft => lower.includes(soft))) {
      return { category: 'soft', confidence: 'medium' };
    }

    // Default to technical with lower confidence
    return { category: 'technical', confidence: 'low' };
  }

  /**
   * Find context where skill appears in job description
   */
  private findSkillContext(skillName: string, jobDescription: string): string | undefined {
    const lower = jobDescription.toLowerCase();
    const skillLower = skillName.toLowerCase();
    
    const index = lower.indexOf(skillLower);
    if (index === -1) return undefined;

    // Extract surrounding context (50 chars before and after)
    const start = Math.max(0, index - 50);
    const end = Math.min(lower.length, index + skillName.length + 50);
    
    let context = jobDescription.substring(start, end);
    
    // Clean up
    context = context.replace(/\s+/g, ' ').trim();
    if (start > 0) context = '...' + context;
    if (end < jobDescription.length) context = context + '...';
    
    return context;
  }

  /**
   * Check if term is too generic to be useful
   */
  private isGenericTerm(term: string): boolean {
    const generic = [
      'experience', 'skills', 'knowledge', 'ability', 'work',
      'team', 'project', 'software', 'development', 'engineering',
      'years', 'required', 'preferred', 'must', 'should',
      'plus', 'bonus', 'nice', 'have', 'strong', 'excellent',
      'good', 'great', 'best', 'top', 'senior', 'junior',
      'lead', 'manager', 'director', 'engineer', 'developer',
      'position', 'role', 'job', 'opportunity', 'candidate'
    ];

    return generic.includes(term) || term.length < 2;
  }

  /**
   * Save discovered skills to a temporary file for review
   */
  saveDiscoveredSkills(skills: Skill[], filePath: string = './generated/discovered-skills.json'): void {
    // Ensure generated folder exists
    const dir = './generated';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const data = {
      timestamp: new Date().toISOString(),
      skills,
      instructions: 'Review these skills and add relevant ones to src/resume/data/resumeData.ts'
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
}
