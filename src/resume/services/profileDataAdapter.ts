/**
 * Profile Data Adapter
 * Converts profileData.ts format to a clean structure for LLM consumption
 * Single source of truth - imports from main data folder
 */

import * as fs from 'fs';
import * as path from 'path';
import { profileData } from '../../data/profileData.js';

/**
 * Load contact information from local config file
 */
function loadContactInfo(): {
  name: string;
  email: string;
  phone: string;
  location: string;
  website: string;
} {
  try {
    // Look for contact.json in the project root
    const contactPath = path.join(process.cwd(), 'contact.json');
    
    if (!fs.existsSync(contactPath)) {
      throw new Error(
        `contact.json not found! Please create it from contact.example.json\n` +
        `Run: cp contact.example.json contact.json\n` +
        `Then update with your actual contact information.`
      );
    }
    
    const contactData = JSON.parse(fs.readFileSync(contactPath, 'utf-8'));
    
    // Validate required fields
    const required = ['name', 'email', 'phone', 'location', 'website'];
    const missing = required.filter(field => !contactData[field]);
    
    if (missing.length > 0) {
      throw new Error(`contact.json is missing required fields: ${missing.join(', ')}`);
    }
    
    return contactData;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load contact info: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Calculate total years of experience from work history
 */
function calculateYearsOfExperience(workHistory: any[]): number {
  if (!workHistory || workHistory.length === 0) return 0;
  
  // Find the earliest start date
  let earliestDate: Date | null = null;
  
  workHistory.forEach(job => {
    const durationParts = job.duration.split(' - ');
    if (durationParts.length > 0) {
      const startDate = new Date(durationParts[0]);
      if (!earliestDate || startDate < earliestDate) {
        earliestDate = startDate;
      }
    }
  });
  
  if (!earliestDate) return 0;
  
  const now = new Date();
  const diffYears = (now.getTime() - (earliestDate as Date).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  
  // Round to nearest integer
  return Math.round(diffYears);
}

export interface SimpleProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
  workHistory: {
    company: string;
    role: string;
    duration: string;
    location: string;
    achievements: string[];
  }[];
}

/**
 * Convert profileData to a clean format for LLM
 */
export function getProfileForResume(): SimpleProfile {
  // Load contact info from local config file
  const contactInfo = loadContactInfo();
  
  const contact = {
    name: contactInfo.name,
    email: contactInfo.email,
    phone: contactInfo.phone,
    location: contactInfo.location,
    linkedin: profileData.linkedin || 'https://www.linkedin.com/in/michielbugher/',
    github: profileData.github || 'https://github.com/MichielDean',
    website: contactInfo.website
  };

  // Convert nested work history structure to flat achievement list
  const workHistory = profileData.workHistory.map((job: any) => {
    // Flatten all achievements from all description sections
    const achievements: string[] = [];
    
    job.description.forEach((section: any) => {
      section.moreInfo.forEach((achievement: string) => {
        achievements.push(achievement);
      });
    });

    return {
      company: job.company,
      role: job.role,
      duration: job.duration,
      location: job.role.includes('Remote') ? 'Remote' : 'Meridian, ID',
      achievements
    };
  });

  // Calculate actual years of experience
  const yearsOfExperience = calculateYearsOfExperience(profileData.workHistory);

  // Generate a professional summary with accurate years
  const summary = `Accomplished Director of Software Engineering with ${yearsOfExperience}+ years of experience leading high-performing engineering teams and driving technical excellence. Proven track record of implementing test automation frameworks, establishing quality standards, and fostering engineering cultures that deliver exceptional software products. Expert in both development and QA leadership, with deep expertise in agile methodologies, CI/CD, and cross-functional collaboration.`;

  return {
    ...contact,
    summary,
    workHistory
  };
}

/**
 * Get profile as a formatted string for LLM context
 */
export function getProfileAsText(): string {
  const profile = getProfileForResume();
  
  let text = `# Professional Profile\n\n`;
  text += `**Name:** ${profile.name}\n`;
  text += `**Location:** ${profile.location}\n`;
  text += `**Email:** ${profile.email}\n`;
  text += `**Phone:** ${profile.phone}\n`;
  text += `**LinkedIn:** ${profile.linkedin}\n`;
  text += `**GitHub:** ${profile.github}\n`;
  text += `**Website:** ${profile.website}\n\n`;
  
  text += `## Professional Summary\n\n${profile.summary}\n\n`;
  
  text += `## Work History\n\n`;
  
  profile.workHistory.forEach(job => {
    text += `### ${job.role} at ${job.company}\n`;
    text += `**Duration:** ${job.duration}\n`;
    text += `**Location:** ${job.location}\n\n`;
    text += `**Achievements:**\n`;
    job.achievements.forEach(achievement => {
      text += `- ${achievement}\n`;
    });
    text += `\n`;
  });
  
  return text;
}
