import { ResumeData, ContactInfo, Skill, Experience, Education } from '../types/resumeTypes.js';
import contactJson from '../../../contact.json';
import { profileData } from '../../data/profileData.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RESUME DATA - DEPRECATED (Mostly)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * IMPORTANT: This file is mostly deprecated in favor of the LLM-first architecture!
 * 
 * SINGLE SOURCE OF TRUTH: src/data/profileData.ts
 * - Work experience and achievements are now ONLY maintained in profileData.ts
 * - The new simplified resume system uses profileData.ts directly
 * 
 * WHAT'S STILL USED HERE:
 * - skills: The expanded skills list with keywords (actively used)
 * - contactInfo: Kept for backward compatibility with old tools
 * - professionalSummary: Kept for backward compatibility with old tools
 * 
 * WHAT'S DEPRECATED:
 * - experience: Empty - use profileData.ts instead
 * - education: Empty - add to profileData.ts if needed
 * 
 * TO UPDATE YOUR RESUME:
 * 1. Edit work history in: src/data/profileData.ts
 * 2. Add/update skills below in the skills array
 * 3. Run: npm run resume:build
 * 4. Generate resume: node dist/resume-cli/resume/cli/simplifiedResumeTailor.js
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Prefer contact.json as the single source of truth for contact info.
// Fallback to profileData for social links if not present in contact.json.
export const contactInfo: ContactInfo = {
  name: (contactJson as any)?.name || (profileData as any)?.name || 'Michiel Bugher',
  email: (contactJson as any)?.email || '',
  phone: (contactJson as any)?.phone || '',
  location: (contactJson as any)?.location || '',
  linkedin: (profileData as any)?.linkedin || (contactJson as any)?.linkedin || '',
  github: (profileData as any)?.github || (contactJson as any)?.github || '',
  website: (contactJson as any)?.website || (profileData as any)?.website || ''
};

export const professionalSummary = `Accomplished Director of Software Engineering with 15+ years of experience leading high-performing engineering teams and driving technical excellence. Proven track record of implementing test automation frameworks, establishing quality standards, and fostering engineering cultures that deliver exceptional software products. Expert in both development and QA leadership, with deep expertise in agile methodologies, CI/CD, and cross-functional collaboration.`;

export const skills: Skill[] = [
  // Leadership & Management
  { name: 'Engineering Leadership', category: 'soft', keywords: ['leadership', 'management', 'team lead', 'director'], proficiency: 'expert' },
  { name: 'Agile/Scrum', category: 'methodology', keywords: ['agile', 'scrum', 'kanban', 'sprint planning'], proficiency: 'expert' },
  { name: 'Cross-functional Collaboration', category: 'soft', keywords: ['collaboration', 'stakeholder management', 'communication'], proficiency: 'expert' },
  { name: 'Mentorship', category: 'soft', keywords: ['mentoring', 'coaching', 'training', 'development'], proficiency: 'expert' },
  
  // Technical Skills
  { name: 'Test Automation', category: 'technical', keywords: ['automation', 'automated testing', 'test frameworks'], proficiency: 'expert' },
  { name: 'CI/CD', category: 'technical', keywords: ['continuous integration', 'continuous deployment', 'devops', 'pipeline', 'ci/cd integration'], proficiency: 'expert' },
  { name: 'Quality Assurance', category: 'technical', keywords: ['QA', 'quality engineering', 'testing'], proficiency: 'expert' },
  { name: 'Performance Testing', category: 'technical', keywords: ['performance testing', 'load testing', 'stress testing'], proficiency: 'expert' },
  { name: 'API Testing', category: 'technical', keywords: ['api testing', 'rest api', 'api automation'], proficiency: 'expert' },
  { name: 'Security Testing', category: 'technical', keywords: ['security testing', 'penetration testing', 'vulnerability testing'], proficiency: 'advanced' },
  { name: 'Database Testing', category: 'technical', keywords: ['database testing', 'sql testing', 'data validation'], proficiency: 'expert' },
  { name: 'Distributed Systems Testing', category: 'technical', keywords: ['distributed systems testing', 'microservices testing'], proficiency: 'expert' },
  { name: 'Feature Flagging', category: 'technical', keywords: ['feature flagging', 'feature toggles', 'progressive rollout'], proficiency: 'expert' },
  { name: 'AI-enabled Testing', category: 'technical', keywords: ['ai-enabled testing tools', 'ai testing', 'ml testing'], proficiency: 'advanced' },
  
  // Programming Languages
  { name: 'Java', category: 'language', keywords: ['java', 'jvm', 'spring'], proficiency: 'advanced' },
  { name: 'C#/.NET', category: 'language', keywords: ['c#', 'csharp', '.net', 'dotnet', '.net core'], proficiency: 'expert' },
  { name: 'TypeScript', category: 'language', keywords: ['typescript', 'ts', 'javascript', 'js'], proficiency: 'advanced' },
  { name: 'Python', category: 'language', keywords: ['python', 'py'], proficiency: 'intermediate' },
  
  // Testing Frameworks & Tools
  { name: 'Selenium', category: 'tool', keywords: ['selenium', 'webdriver', 'selenium grid'], proficiency: 'expert' },
  { name: 'Playwright', category: 'tool', keywords: ['playwright', 'playwright test'], proficiency: 'expert' },
  { name: 'Cypress', category: 'tool', keywords: ['cypress', 'cypress.io'], proficiency: 'expert' },
  { name: 'Jest', category: 'framework', keywords: ['jest', 'unit testing'], proficiency: 'advanced' },
  
  // Cloud & Infrastructure
  { name: 'AWS', category: 'tool', keywords: ['aws', 'amazon web services', 'ec2', 's3', 'lambda'], proficiency: 'advanced' },
  { name: 'Linux Systems', category: 'technical', keywords: ['linux systems', 'unix', 'bash', 'shell scripting'], proficiency: 'expert' },
  
  // Project Management & Collaboration Tools
  { name: 'JIRA', category: 'tool', keywords: ['jira', 'atlassian jira'], proficiency: 'expert' },
  { name: 'Confluence', category: 'tool', keywords: ['confluence', 'atlassian confluence'], proficiency: 'expert' },
  { name: 'TestRail', category: 'tool', keywords: ['testrail', 'test management'], proficiency: 'expert' },
  
  // Web Development
  { name: 'React', category: 'framework', keywords: ['react', 'reactjs', 'react.js'], proficiency: 'advanced' },
  { name: 'D3.js', category: 'framework', keywords: ['d3', 'd3.js', 'data visualization'], proficiency: 'intermediate' },
];

/**
 * DEPRECATED: Experience data has been moved to src/data/profileData.ts
 * The new LLM-first architecture uses profileData.ts as the single source of truth.
 * This array is kept empty for compatibility with legacy code that might import it.
 * 
 * To update experience data, edit: src/data/profileData.ts
 */
export const experience: Experience[] = [];

export const education: Education[] = [
  // TODO: Update with your actual education
  // Uncomment and fill in your education details:
  // {
  //   id: 'edu-1',
  //   institution: 'Your University Name',
  //   degree: 'Bachelor of Science',
  //   field: 'Computer Science',
  //   location: 'City, State',
  //   graduationDate: '2007-05',
  //   gpa: '3.5',
  //   honors: ['Dean\'s List', 'Cum Laude'],
  //   relevantCourses: ['Software Engineering', 'Algorithms', 'Database Systems']
  // }
];

export const resumeData: ResumeData = {
  contact: contactInfo,
  summary: professionalSummary,
  skills,
  experience,
  education,
  certifications: [
    // Add your certifications here
    // {
    //   id: 'cert-1',
    //   name: 'AWS Certified Solutions Architect',
    //   issuer: 'Amazon Web Services',
    //   date: '2023-01',
    //   keywords: ['aws', 'cloud', 'architecture']
    // }
  ]
};
