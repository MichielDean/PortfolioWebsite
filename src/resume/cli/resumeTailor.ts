/**
 * Simplified Resume Tailor CLI
 * Uses LLM-first architecture with profileData as single source of truth
 */

import * as fs from 'fs';
import puppeteer from 'puppeteer';
import { getProfileForResume } from '../services/profileDataAdapter.js';
import { OllamaService } from '../services/ollamaService.js';
import { ResumeTailoringEngine } from '../services/resumeTailoringEngine.js';
import { LLMValidator } from '../services/llmValidator.js';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

interface CLIOptions {
  jobFile?: string;
  jobTitle?: string;
  company?: string;
  output?: string;
}

class ResumeCLI {
  private ollama: OllamaService;
  private tailoring: ResumeTailoringEngine;
  private validator: LLMValidator;

  constructor() {
    this.ollama = new OllamaService();
    this.tailoring = new ResumeTailoringEngine(this.ollama);
    this.validator = new LLMValidator(this.ollama);
  }

  async run(args: string[]): Promise<void> {
    console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}  Resume Tailor - LLM-First Architecture${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

    // Check Ollama
    const isOllamaAvailable = await this.ollama.isAvailable();
    if (!isOllamaAvailable) {
      console.error(`${colors.red}Error: Ollama is not running!${colors.reset}`);
      console.log(`\nPlease start Ollama and try again.\n`);
      process.exit(1);
    }

    console.log(`${colors.green}✓ Ollama is running${colors.reset}\n`);

    const options = this.parseArgs(args);

    if (!options.jobFile || !options.jobTitle || !options.company) {
      console.error(`${colors.red}Error: Missing required arguments${colors.reset}`);
      this.printHelp();
      process.exit(1);
    }

    await this.generateResume(options);
  }

  private parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--job-file':
        case '-j':
          options.jobFile = args[++i];
          break;
        case '--job-title':
        case '-t':
          options.jobTitle = args[++i];
          break;
        case '--company':
        case '-c':
          options.company = args[++i];
          break;
        case '--output':
        case '-o':
          options.output = args[++i];
          break;
        case '--help':
        case '-h':
          this.printHelp();
          process.exit(0);
          break;
      }
    }

    return options;
  }

  private async generateResume(options: CLIOptions): Promise<void> {
    try {
      console.log(`${colors.bright}Processing...${colors.reset}\n`);

      // Ensure generated folder exists
      const generatedDir = './generated';
      if (!fs.existsSync(generatedDir)) {
        fs.mkdirSync(generatedDir, { recursive: true });
      }

      // Get profile from single source of truth
      console.log(`${colors.cyan}→ Loading profile data...${colors.reset}`);
      const profile = getProfileForResume();

      // Read job posting
      console.log(`${colors.cyan}→ Reading job posting...${colors.reset}`);
      const jobPosting = fs.readFileSync(options.jobFile!, 'utf-8');

      // Tailor resume using LLM
      console.log(`${colors.cyan}→ Tailoring resume with LLM...${colors.reset}`);
      const tailored = await this.tailoring.tailorResume(
        profile,
        jobPosting,
        options.jobTitle!,
        options.company!
      );

      console.log(`${colors.green}✓ Match score: ${tailored.matchScore}%${colors.reset}`);
      console.log(`${colors.cyan}  Reasoning: ${tailored.reasoning}${colors.reset}`);

      // Validate with LLM
      console.log(`${colors.cyan}→ Validating content with LLM...${colors.reset}`);
      const validation = await this.validator.validateResume(profile, tailored);

      if (!validation.isValid) {
        console.error(`${colors.red}✗ Validation failed!${colors.reset}`);
        validation.issues.forEach(issue => {
          console.error(`${colors.red}  • ${issue}${colors.reset}`);
        });
        console.error(`\n${colors.yellow}Resume NOT saved.${colors.reset}\n`);
        process.exit(1);
      }

      if (validation.warnings.length > 0) {
        console.log(`${colors.yellow}⚠ Warnings:${colors.reset}`);
        validation.warnings.forEach(warning => {
          console.log(`${colors.yellow}  • ${warning}${colors.reset}`);
        });
      }

      console.log(`${colors.green}✓ Validation passed (${validation.confidence}% confident)${colors.reset}`);

      // Generate HTML (create simple generator here or reuse existing)
      console.log(`${colors.cyan}→ Generating HTML...${colors.reset}`);
      const html = this.generateHTML(profile, tailored, options);

      // Save to generated folder by default
      const outputFile = options.output || './generated/resume.html';
      fs.writeFileSync(outputFile, html);

      // Generate PDF automatically
      console.log(`${colors.cyan}→ Generating PDF...${colors.reset}`);
      const pdfFile = outputFile.replace('.html', '.pdf');
      await this.generatePDF(html, pdfFile);

      console.log(`\n${colors.green}${colors.bright}✓ Success!${colors.reset}\n`);
      console.log(`Resume Details:`);
      console.log(`  Job Match Score: ${tailored.matchScore}%`);
      console.log(`  Skills Matched: ${tailored.relevantSkills.length}`);
      console.log(`  Experiences: ${tailored.selectedExperiences.length}`);
      console.log(`  HTML Output: ${outputFile}`);
      console.log(`  PDF Output:  ${pdfFile}\n`);
      
    } catch (error) {
      console.error(`${colors.red}Error: ${error}${colors.reset}`);
      process.exit(1);
    }
  }

  private async generatePDF(html: string, outputPath: string): Promise<void> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: outputPath,
        format: 'letter',
        printBackground: true,
        margin: {
          top: '0.4in',
          right: '0.5in',
          bottom: '0.4in',
          left: '0.5in'
        }
      });
    } finally {
      await browser.close();
    }
  }

  private generateHTML(profile: any, tailored: any, _options: CLIOptions): string {
    // Optimized HTML for one-page PDF output
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${profile.name} - Resume</title>
  <style>
    @page {
      size: letter;
      margin: 0.4in 0.5in;
    }
    body { 
      font-family: Arial, sans-serif; 
      margin: 0;
      padding: 0;
      font-size: 10pt;
      line-height: 1.3;
      color: #333;
    }
    h1 { 
      color: #2c3e50; 
      margin: 0 0 4px 0;
      font-size: 20pt;
      font-weight: bold;
    }
    .contact { 
      color: #666; 
      margin-bottom: 12px;
      font-size: 9pt;
      line-height: 1.4;
    }
    .section { 
      margin-bottom: 10px;
    }
    .section h2 { 
      color: #2c3e50;
      border-bottom: 1.5px solid #3498db;
      padding-bottom: 2px;
      margin: 0 0 6px 0;
      font-size: 12pt;
      font-weight: bold;
    }
    .job { 
      margin-bottom: 8px;
      page-break-inside: avoid;
    }
    .job-header { 
      margin-bottom: 3px;
    }
    .job-title { 
      font-weight: bold;
      font-size: 10.5pt;
      color: #2c3e50;
    }
    .company { 
      color: #3498db;
      font-weight: 600;
    }
    .duration { 
      color: #666;
      font-size: 9pt;
    }
    ul { 
      margin: 3px 0 0 18px;
      padding: 0;
    }
    li { 
      margin-bottom: 3px;
      line-height: 1.35;
      font-size: 9.5pt;
    }
    p {
      margin: 0 0 6px 0;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <h1>${profile.name}</h1>
  <div class="contact">
    ${profile.email} | ${profile.phone} | ${profile.location}<br>
    LinkedIn: ${profile.linkedin} | 
    GitHub: ${profile.github} | 
    Website: ${profile.website}
  </div>

  <div class="section">
    <h2>Professional Summary</h2>
    <p>${tailored.summary}</p>
  </div>

  <div class="section">
    <h2>Skills</h2>
    <p>${tailored.relevantSkills.join(' • ')}</p>
  </div>

  <div class="section">
    <h2>Professional Experience</h2>
    ${tailored.selectedExperiences.map((exp: any) => `
      <div class="job">
        <div class="job-header">
          <div class="job-title">${exp.role}</div>
          <div><span class="company">${exp.company}</span> | <span class="duration">${exp.duration}</span> | ${exp.location}</div>
        </div>
        ${exp.selectedAchievements.length > 0 ? `
          <ul>
            ${exp.selectedAchievements.map((achievement: any) => `<li>${achievement}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('')}
  </div>

</body>
</html>`;
  }

  private printHelp(): void {
    console.log(`
${colors.bright}Usage:${colors.reset}
  npm run tailor-resume [options]

${colors.bright}Options:${colors.reset}
  -j, --job-file <file>     Path to job posting text file (required)
  -t, --job-title <title>   Job title (required)
  -c, --company <name>      Company name (required)
  -o, --output <file>       Output filename (default: generated/resume.html)
  -h, --help                Show this help message

${colors.bright}Example:${colors.reset}
  ${colors.cyan}node dist/resume-cli/resume/cli/resumeTailor.js --job-file job.txt --job-title "Director of QA" --company "Bestow"${colors.reset}

${colors.bright}Note:${colors.reset}
  All generated files are saved to the ${colors.cyan}generated/${colors.reset} folder.
`);
  }
}

// Run CLI
const cli = new ResumeCLI();
cli.run(process.argv.slice(2)).catch((error: Error) => {
  console.error(`${colors.red}Fatal error: ${error}${colors.reset}`);
  process.exit(1);
});

export { ResumeCLI };
