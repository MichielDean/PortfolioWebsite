/**
 * Resume data structure optimized for ATS compliance
 * Each field can be included/excluded or emphasized based on job requirements
 */

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface Skill {
  name: string;
  category: 'technical' | 'soft' | 'tool' | 'language' | 'framework' | 'methodology';
  keywords: string[]; // Alternative names for ATS matching
  proficiency?: 'expert' | 'advanced' | 'intermediate' | 'beginner';
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string | 'Present';
  achievements: Achievement[];
  keywords: string[]; // For matching with job descriptions
}

export interface Achievement {
  id: string;
  description: string;
  impact?: string; // Quantifiable impact (e.g., "Increased efficiency by 40%")
  keywords: string[]; // Skills/technologies used
  priority: number; // 1-10, used for ordering when space is limited
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  location: string;
  graduationDate: string;
  gpa?: string;
  honors?: string[];
  relevantCourses?: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expirationDate?: string;
  credentialId?: string;
  keywords: string[];
}

export interface ResumeData {
  contact: ContactInfo;
  summary: string; // Professional summary, can be tailored
  skills: Skill[];
  experience: Experience[];
  education: Education[];
  certifications?: Certification[];
  additionalSections?: {
    [key: string]: string[] | string; // Flexible additional sections
  };
}

export interface JobPosting {
  title: string;
  company: string;
  description: string;
  requirements: string[];
  keywords: string[];
  industryContext?: string;
}

export interface TailoredResume extends ResumeData {
  jobMatch: {
    matchedKeywords: string[];
    emphasizedSkills: string[];
    selectedAchievements: string[];
    tailoredSummary: string;
    matchScore: number; // 0-100
  };
}

export interface ResumeTailoringOptions {
  maxAchievementsPerJob?: number; // Limit achievements to fit on one page
  includeAllSkills?: boolean; // Or only matched skills
  emphasizeKeywords?: boolean; // Visually emphasize matched keywords
  summaryStyle?: 'concise' | 'detailed' | 'keyword-focused';
  atsOptimization?: boolean; // Enable ATS-specific formatting
}

/**
 * Cover Letter Types
 */

export interface SkillMatch {
  skill: string;
  experienceExamples: string[]; // Brief examples from work history demonstrating this skill
  relevanceRating: number; // 1-10, how relevant this skill is to the role
}

export interface GrowthOpportunity {
  area: string; // Area of growth (e.g., "Test Infrastructure Architecture")
  currentExperience: string; // What you've done that relates to this
  desiredGrowth: string; // What you're excited to learn/do
  whyExcited: string; // Why this opportunity excites you
}

export interface CoverLetterResult {
  opening: string; // Strong opening paragraph expressing interest
  skillMatches: SkillMatch[]; // Top 3-5 matching skills with examples
  growthOpportunities: GrowthOpportunity[]; // 2-3 areas for growth/excitement
  companyAlignment: string; // Why you're interested in this specific company
  closing: string; // Strong closing paragraph
  tone: 'professional' | 'enthusiastic' | 'conversational';
  fullLetter: string; // Complete formatted cover letter text
}

export interface CoverLetterOptions {
  tone?: 'professional' | 'enthusiastic' | 'conversational';
  maxLength?: number; // Maximum word count
  focusAreas?: ('technical-depth' | 'leadership' | 'innovation' | 'collaboration')[]; // What to emphasize
  companyResearch?: string; // Optional additional context about the company
}
