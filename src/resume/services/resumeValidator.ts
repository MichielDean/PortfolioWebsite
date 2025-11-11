/**
 * Resume Validator
 * Ensures AI-generated content doesn't fabricate information
 */

import { ResumeData, TailoredResume } from '../types/resumeTypes.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  changes: {
    type: 'summary' | 'achievement' | 'skill';
    original: string;
    modified: string;
    reason: string;
  }[];
}

export class ResumeValidator {
  /**
   * Validate that the tailored resume doesn't fabricate information
   */
  validateResume(
    original: ResumeData,
    tailored: TailoredResume
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      changes: []
    };

    // Validate summary
    this.validateSummary(original.summary, tailored.summary, original, result);

    // Validate skills (should only be a subset)
    this.validateSkills(original.skills, tailored.skills, result);

    // Validate achievements (should only be from original set)
    this.validateAchievements(original.experience, tailored, result);

    // Validate experience (dates, titles, companies must match)
    this.validateExperience(original.experience, tailored.experience, result);

    // Validate education (should be identical)
    this.validateEducation(original.education, tailored.education, result);

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate summary hasn't added false information
   */
  private validateSummary(
    original: string,
    tailored: string,
    originalData: ResumeData,
    result: ValidationResult
  ): void {
    // Extract key facts from original (years of experience, roles, etc.)
    const originalFacts = this.extractFacts(original);
    const tailoredFacts = this.extractFacts(tailored);
    
    // Build a set of allowed terms from the original resume data
    const allowedTerms = new Set<string>();
    originalFacts.forEach(fact => allowedTerms.add(fact.toLowerCase()));
    
    // Add skills to allowed terms
    originalData.skills.forEach(skill => {
      allowedTerms.add(skill.name.toLowerCase());
      skill.keywords.forEach(kw => allowedTerms.add(kw.toLowerCase()));
    });
    
    // Add companies and positions
    originalData.experience.forEach(exp => {
      allowedTerms.add(exp.company.toLowerCase());
      allowedTerms.add(exp.position.toLowerCase());
    });

    // Check for added facts
    for (const fact of tailoredFacts) {
      if (!allowedTerms.has(fact.toLowerCase()) && !this.factExistsInOriginal(fact, originalFacts)) {
        result.errors.push(
          `Summary contains potentially fabricated information: "${fact}"`
        );
      }
    }

    // Track the change
    if (original !== tailored) {
      result.changes.push({
        type: 'summary',
        original,
        modified: tailored,
        reason: 'AI tailoring with keyword emphasis'
      });
    }

    // Check length deviation (should be roughly same length)
    const lengthRatio = tailored.length / original.length;
    if (lengthRatio > 1.3 || lengthRatio < 0.7) {
      result.warnings.push(
        `Summary length changed significantly (${Math.round(lengthRatio * 100)}% of original)`
      );
    }
  }

  /**
   * Validate skills are only from the original set
   */
  private validateSkills(
    original: ResumeData['skills'],
    tailored: TailoredResume['skills'],
    result: ValidationResult
  ): void {
    const originalSkillNames = new Set(original.map(s => s.name.toLowerCase()));

    for (const skill of tailored) {
      if (!originalSkillNames.has(skill.name.toLowerCase())) {
        result.errors.push(
          `Skill "${skill.name}" not found in original resume data`
        );
      }
    }
  }

  /**
   * Validate achievements are only from original experience
   */
  private validateAchievements(
    originalExperience: ResumeData['experience'],
    tailored: TailoredResume,
    result: ValidationResult
  ): void {
    // Build set of all original achievement IDs
    const originalAchievementIds = new Set<string>();
    for (const exp of originalExperience) {
      for (const ach of exp.achievements) {
        originalAchievementIds.add(ach.id);
      }
    }

    // Check all selected achievements exist in original
    for (const achId of tailored.jobMatch.selectedAchievements) {
      if (!originalAchievementIds.has(achId)) {
        result.errors.push(
          `Achievement ID "${achId}" not found in original resume data`
        );
      }
    }

    // Validate achievement descriptions haven't been changed
    const achievementMap = new Map<string, string>();
    for (const exp of originalExperience) {
      for (const ach of exp.achievements) {
        achievementMap.set(ach.id, ach.description);
      }
    }

    for (const exp of tailored.experience) {
      for (const ach of exp.achievements) {
        const original = achievementMap.get(ach.id);
        if (original && original !== ach.description) {
          // Achievement description was modified - this should NOT happen
          result.errors.push(
            `Achievement "${ach.id}" description was modified. Original: "${original}", Modified: "${ach.description}"`
          );
        }
      }
    }
  }

  /**
   * Validate experience entries (dates, titles, companies)
   */
  private validateExperience(
    original: ResumeData['experience'],
    tailored: TailoredResume['experience'],
    result: ValidationResult
  ): void {
    // Build map of original experiences
    const originalMap = new Map(original.map(exp => [exp.id, exp]));

    for (const exp of tailored) {
      const orig = originalMap.get(exp.id);
      
      if (!orig) {
        result.errors.push(
          `Experience "${exp.id}" not found in original resume data`
        );
        continue;
      }

      // Validate immutable fields
      if (exp.position !== orig.position) {
        result.errors.push(
          `Job position changed for "${exp.id}": "${orig.position}" → "${exp.position}"`
        );
      }

      if (exp.company !== orig.company) {
        result.errors.push(
          `Company changed for "${exp.id}": "${orig.company}" → "${exp.company}"`
        );
      }

      if (exp.startDate !== orig.startDate || exp.endDate !== orig.endDate) {
        result.errors.push(
          `Dates changed for "${exp.id}": ${orig.startDate}-${orig.endDate} → ${exp.startDate}-${exp.endDate}`
        );
      }

      if (exp.location !== orig.location) {
        result.errors.push(
          `Location changed for "${exp.id}": "${orig.location}" → "${exp.location}"`
        );
      }
    }
  }

  /**
   * Validate education hasn't changed
   */
  private validateEducation(
    original: ResumeData['education'],
    tailored: TailoredResume['education'],
    result: ValidationResult
  ): void {
    if (original.length !== tailored.length) {
      result.errors.push(
        `Education entries count changed: ${original.length} → ${tailored.length}`
      );
      return;
    }

    for (let i = 0; i < original.length; i++) {
      const orig = original[i];
      const tail = tailored[i];

      if (orig.degree !== tail.degree) {
        result.errors.push(
          `Degree changed: "${orig.degree}" → "${tail.degree}"`
        );
      }

      if (orig.institution !== tail.institution) {
        result.errors.push(
          `Institution changed: "${orig.institution}" → "${tail.institution}"`
        );
      }

      if (orig.graduationDate !== tail.graduationDate) {
        result.errors.push(
          `Graduation date changed: ${orig.graduationDate} → ${tail.graduationDate}`
        );
      }
    }
  }

  /**
   * Extract factual statements from text
   */
  private extractFacts(text: string): string[] {
    const facts: string[] = [];

    // Extract years of experience (e.g., "10+ years", "15 years")
    const yearsMatch = text.match(/(\d+)\+?\s*years?/gi);
    if (yearsMatch) {
      facts.push(...yearsMatch.map(m => m.toLowerCase()));
    }

    // Extract specific roles/titles
    const rolePatterns = [
      /(?:director|manager|engineer|lead|architect|developer|qa|analyst|designer)\w*/gi
    ];
    for (const pattern of rolePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        facts.push(...matches.map(m => m.toLowerCase()));
      }
    }

    // Extract certifications or degrees
    const certPatterns = [
      /\b(?:phd|master|bachelor|mba|pmp|aws|azure|gcp|scrum master|csm|pmi)\b/gi
    ];
    for (const pattern of certPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        facts.push(...matches.map(m => m.toLowerCase()));
      }
    }

    // Extract numbers (team sizes, project counts, etc.)
    const numberContexts = text.match(/\d+[\+]?\s*(?:teams?|engineers?|projects?|products?|developers?|people)/gi);
    if (numberContexts) {
      facts.push(...numberContexts.map(m => m.toLowerCase()));
    }

    return facts;
  }

  /**
   * Check if a fact from tailored resume exists in original
   */
  private factExistsInOriginal(fact: string, originalFacts: string[]): boolean {
    const factLower = fact.toLowerCase().trim();
    
    // Exact match
    if (originalFacts.some(f => f === factLower)) {
      return true;
    }

    // Partial match (e.g., "15 years" matches "15+ years")
    const factNum = this.extractNumber(factLower);
    if (factNum !== null) {
      for (const origFact of originalFacts) {
        const origNum = this.extractNumber(origFact);
        if (origNum === factNum) {
          return true;
        }
      }
    }

    // Semantic equivalence (same role in different form)
    for (const origFact of originalFacts) {
      if (this.areSemanticallyEquivalent(factLower, origFact)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract number from a string
   */
  private extractNumber(text: string): number | null {
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Check if two facts are semantically equivalent
   */
  private areSemanticallyEquivalent(fact1: string, fact2: string): boolean {
    // Remove common words and compare
    const normalize = (s: string) => 
      s.replace(/\b(?:the|a|an|of|in|at|to|for|and|or)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    const norm1 = normalize(fact1);
    const norm2 = normalize(fact2);

    // Check if one contains the other
    return norm1.includes(norm2) || norm2.includes(norm1);
  }

  /**
   * Generate a validation report for console output
   */
  generateReport(validation: ValidationResult): string {
    let report = '\n';
    
    if (validation.isValid) {
      report += '✓ Resume validation PASSED - No fabricated information detected\n';
    } else {
      report += '✗ Resume validation FAILED - Issues detected:\n';
    }

    if (validation.errors.length > 0) {
      report += '\nERRORS:\n';
      for (const error of validation.errors) {
        report += `  • ${error}\n`;
      }
    }

    if (validation.warnings.length > 0) {
      report += '\nWARNINGS:\n';
      for (const warning of validation.warnings) {
        report += `  ⚠ ${warning}\n`;
      }
    }

    if (validation.changes.length > 0) {
      report += `\nCHANGES MADE: ${validation.changes.length}\n`;
      for (const change of validation.changes.slice(0, 3)) {
        report += `  • ${change.type}: ${change.reason}\n`;
      }
      if (validation.changes.length > 3) {
        report += `  ... and ${validation.changes.length - 3} more\n`;
      }
    }

    return report;
  }
}
