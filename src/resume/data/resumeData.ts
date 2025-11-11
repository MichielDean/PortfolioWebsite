import { ContactInfo, Skill } from '../types/resumeTypes.js';
import contactJson from '../../../contact.json' with { type: 'json' };
import { profileData } from '../../data/profileData.js';

/**
 * Resume Data for CLI Resume Tailoring
 * 
 * Contact Info: Sourced from contact.json (validated)
 * Skills: Expanded list with keywords for job matching
 * Work History: Use profileData.ts (src/data/profileData.ts)
 */

// Validate contact.json exists and has required fields
if (!contactJson || typeof contactJson !== 'object') {
  throw new Error(
    'contact.json not found or invalid. Please create contact.json in the project root with your contact information.\n' +
    'Required fields: name, email, phone, location, website'
  );
}

const requiredFields = ['name', 'email', 'phone', 'location', 'website'];
const missingFields = requiredFields.filter(field => !(contactJson as any)[field]);

if (missingFields.length > 0) {
  throw new Error(
    `contact.json is missing required fields: ${missingFields.join(', ')}\n` +
    'Please ensure all required contact information is provided in contact.json'
  );
}

// Prefer contact.json as the single source of truth for contact info.
// Fallback to profileData for social links if not present in contact.json.
export const contactInfo: ContactInfo = {
  name: (contactJson as any).name,
  email: (contactJson as any).email,
  phone: (contactJson as any).phone,
  location: (contactJson as any).location,
  linkedin: (profileData as any)?.linkedin || (contactJson as any)?.linkedin || '',
  github: (profileData as any)?.github || (contactJson as any)?.github || '',
  website: (contactJson as any).website
};

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
