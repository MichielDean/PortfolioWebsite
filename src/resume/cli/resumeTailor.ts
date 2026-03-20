/**
 * Simplified Resume Tailor CLI
 * Uses LLM-first architecture with profileData as single source of truth
 */

import * as fs from 'fs';
import puppeteer from 'puppeteer';
import { getProfileForResume } from '../services/profileDataAdapter.js';
import { ClaudeService as OllamaService } from '../services/claudeService.js';
import { ResumeTailoringEngine } from '../services/resumeTailoringEngine.js';
import { LLMValidator } from '../services/llmValidator.js';
import { CoverLetterEngine } from '../services/coverLetterEngine.js';

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
  url?: string;
  jobTitle?: string;
  company?: string;
  output?: string;
  coverLetterOnly?: boolean;
  noCoverLetter?: boolean;
  tone?: 'professional' | 'enthusiastic' | 'conversational';
}

/**
 * Fetch a job posting from a URL and strip HTML to plain text.
 * Pure Node.js — no new dependencies.
 */
/**
 * Sanitize a company name for use in a filename.
 * e.g. "JP Morgan Chase & Co." → "jp_morgan_chase_co"
 * Falls back to "unknown_company" if the result would be empty (e.g. all-special-char input).
 */
function sanitizeCompanyName(company: string): string {
  const sanitized = company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')  // non-alphanumeric runs → single underscore
    .replace(/^_+|_+$/g, '');      // trim leading/trailing underscores
  return sanitized.length > 0 ? sanitized : 'unknown_company';
}

async function fetchJobFromUrl(url: string): Promise<string> {
  const { get } = await import('https');
  const { get: httpGet } = await import('http');

  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? get : httpGet;
    const req = client(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer | string) => data += chunk);
      res.on('end', () => {
        // Strip HTML tags and compress whitespace
        const text = data
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/\s{3,}/g, '\n\n')
          .trim()
          .slice(0, 8000);

        if (text.length < 200) {
          reject(new Error('URL returned too little text. If this is LinkedIn, paste the job text to a file and use --job-file instead.'));
        } else {
          resolve(text);
        }
      });
    });
    req.on('error', reject);
  });
}

class ResumeCLI {
  private claude: OllamaService | null = null;
  private tailoring: ResumeTailoringEngine | null = null;
  private validator: LLMValidator | null = null;
  private coverLetter: CoverLetterEngine | null = null;

  constructor() {
    // Services are created lazily in run() to avoid import-time crashes
    // when ANTHROPIC_API_KEY is not yet set.
  }

  private initServices(): void {
    if (!this.claude) {
      this.claude = OllamaService.forTask('analyze');
      this.tailoring = ResumeTailoringEngine.create();
      this.validator = new LLMValidator(OllamaService.forTask('validate'));
      this.coverLetter = CoverLetterEngine.create();
    }
  }

  async run(args: string[]): Promise<void> {
    this.initServices();

    console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}  Resume Tailor - LLM-First Architecture${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

    // Check Claude API
    const isClaudeAvailable = await this.claude!.isAvailable();
    if (!isClaudeAvailable) {
      console.error(`${colors.red}Error: Claude CLI is not available!${colors.reset}`);
      console.log(`\nEnsure you are logged in: run 'claude' and authenticate with your claude.ai subscription.\n`);
      process.exit(1);
    }

    console.log(`${colors.green}✓ Claude API is available${colors.reset}\n`);

    const options = this.parseArgs(args);

    if (!options.jobFile && !options.url) {
      console.error(`${colors.red}Error: Missing required argument: --job-file or --url${colors.reset}`);
      this.printHelp();
      process.exit(1);
    }

    if (!options.jobTitle || !options.company) {
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
        case '--url':
        case '-u':
          options.url = args[++i];
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
        case '--cover-letter-only':
          options.coverLetterOnly = true;
          break;
        case '--no-cover-letter':
          options.noCoverLetter = true;
          break;
        case '--tone':
          options.tone = args[++i] as any;
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

  private async resolveJobPosting(options: CLIOptions): Promise<string> {
    if (options.url) {
      console.log(`${colors.cyan}🌐 Fetching job posting from URL...${colors.reset}`);
      const text = await fetchJobFromUrl(options.url);
      console.log(`${colors.green}   Got ${text.length} chars of job posting text${colors.reset}`);
      return text;
    } else if (options.jobFile) {
      return fs.readFileSync(options.jobFile, 'utf-8');
    } else {
      console.error(`${colors.red}Error: Must provide --job-file or --url${colors.reset}`);
      process.exit(1);
    }
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

      // Read job posting (from file or URL)
      console.log(`${colors.cyan}→ Reading job posting...${colors.reset}`);
      const jobPosting = await this.resolveJobPosting(options);

      // Handle cover letter only mode
      if (options.coverLetterOnly) {
        await this.generateCoverLetter(profile, jobPosting, options);
        return;
      }

      // Tailor resume using LLM
      console.log(`${colors.cyan}→ Tailoring resume with LLM...${colors.reset}`);
      const tailored = await this.tailoring!.tailorResume(
        profile,
        jobPosting,
        options.jobTitle!,
        options.company!
      );

      console.log(`${colors.green}✓ Match score: ${tailored.matchScore}%${colors.reset}`);
      console.log(`${colors.cyan}  Reasoning: ${tailored.reasoning}${colors.reset}`);

      // Validate with LLM
      console.log(`${colors.cyan}→ Validating content with LLM...${colors.reset}`);
      const validation = await this.validator!.validateResume(profile, tailored);

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

      // Save to generated folder — named by company unless overridden
      const companySuffix = sanitizeCompanyName(options.company!);
      const outputFile = options.output || `./generated/resume_${companySuffix}.html`;
      fs.writeFileSync(outputFile, html);

      // Generate PDF automatically
      console.log(`${colors.cyan}→ Generating PDF...${colors.reset}`);
      const companySuffix = options.company ? `_${options.company.toLowerCase().replace(/\s+/g, '_')}` : '';
      const pdfFile = options.output?.replace('.html', '.pdf') || `./generated/resume${companySuffix}.pdf`;
      await this.generatePDF(html, pdfFile);

      console.log(`\n${colors.green}${colors.bright}✓ Resume Generated!${colors.reset}\n`);
      console.log(`Resume Details:`);
      console.log(`  Job Match Score: ${tailored.matchScore}%`);
      console.log(`  Skills Matched: ${tailored.relevantSkills.length}`);
      console.log(`  Experiences: ${tailored.selectedExperiences.length}`);
      console.log(`  PDF Output:  ${pdfFile}\n`);

      // Generate cover letter (unless disabled)
      if (!options.noCoverLetter) {
        console.log(`${colors.cyan}→ Generating cover letter...${colors.reset}`);
        await this.generateCoverLetter(profile, jobPosting, options);
      }
      
    } catch (error) {
      console.error(`${colors.red}Error: ${error}${colors.reset}`);
      process.exit(1);
    }
  }

  private async generateCoverLetter(profile: any, jobPosting: string, options: CLIOptions): Promise<void> {
    const coverLetterResult = await this.coverLetter!.generateCoverLetter(
      profile,
      jobPosting,
      options.jobTitle!,
      options.company!,
      {
        tone: options.tone || 'professional',
        maxLength: 400
      }
    );

    const coverLetterHTML = this.coverLetter!.exportToHTML(
      coverLetterResult,
      profile.name,
      profile.email,
      profile.phone,
      options.company!,
      options.jobTitle!
    );

    const companySuffix = sanitizeCompanyName(options.company!);
    const htmlFile = `./generated/cover-letter_${companySuffix}.html`;
    fs.writeFileSync(htmlFile, coverLetterHTML);

    // Generate PDF
    const pdfFile = `./generated/cover-letter_${companySuffix}.pdf`;
    await this.generatePDF(coverLetterHTML, pdfFile);

    // Save text version
    const textFile = `./generated/cover-letter_${companySuffix}.txt`;
    fs.writeFileSync(textFile, coverLetterResult.fullLetter);

    console.log(`\n${colors.green}${colors.bright}✓ Cover Letter Generated!${colors.reset}\n`);
    console.log(`Cover Letter Details:`);
    console.log(`  Tone: ${coverLetterResult.tone}`);
    console.log(`  Skill Matches: ${coverLetterResult.skillMatches.length}`);
    console.log(`  Growth Areas: ${coverLetterResult.growthOpportunities.length}`);
    console.log(`  HTML Output: ${htmlFile}`);
    console.log(`  PDF Output:  ${pdfFile}`);
    console.log(`  Text Output: ${textFile}\n`);
  }

  private async generateAndSaveCoverLetter(profile: any, jobPosting: string, options: CLIOptions): Promise<void> {
    const coverLetterResult = await this.coverLetter!.generateCoverLetter(
      profile,
      jobPosting,
      options.jobTitle!,
      options.company!,
      { 
        tone: options.tone || 'professional',
        maxLength: 400
      }
    );

    // Save cover letter HTML
    const coverLetterHTML = this.coverLetter!.exportToHTML(
      coverLetterResult,
      profile.name,
      profile.email,
      profile.phone,
      options.company!,
      options.jobTitle!
    );

    const companySuffix = sanitizeCompanyName(options.company!);
    const htmlFile = `./generated/cover-letter_${companySuffix}.html`;
    fs.writeFileSync(htmlFile, coverLetterHTML);

    // Generate PDF
    const pdfFile = `./generated/cover-letter_${companySuffix}.pdf`;
    await this.generatePDF(coverLetterHTML, pdfFile);

    // Save text version
    const textFile = `./generated/cover-letter_${companySuffix}.txt`;
    fs.writeFileSync(textFile, coverLetterResult.fullLetter);

    console.log(`\n${colors.green}${colors.bright}✓ Cover Letter Generated!${colors.reset}\n`);
    console.log(`Cover Letter Details:`);
    console.log(`  Tone: ${coverLetterResult.tone}`);
    console.log(`  Skill Matches: ${coverLetterResult.skillMatches.length}`);
    console.log(`  Growth Areas: ${coverLetterResult.growthOpportunities.length}`);
    console.log(`  HTML Output: ${htmlFile}`);
    console.log(`  PDF Output:  ${pdfFile}`);
    console.log(`  Text Output: ${textFile}\n`);
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
  -j, --job-file <file>     Path to job posting text file (required if --url not given)
  -u, --url <url>           Job posting URL (LinkedIn or other job board)
  -t, --job-title <title>   Job title (required)
  -c, --company <name>      Company name (required)
  -o, --output <file>       Output filename (default: generated/resume_<company>.html)
  --cover-letter-only       Generate only a cover letter (no resume)
  --no-cover-letter         Skip cover letter generation
  --tone <tone>             Cover letter tone: professional, enthusiastic, conversational (default: professional)
  -h, --help                Show this help message

${colors.bright}Examples:${colors.reset}
  ${colors.cyan}# Generate resume from a job posting file${colors.reset}
  node dist/resume-cli/resume/cli/resumeTailor.js --job-file job.txt --job-title "Staff Engineer" --company "ClickUp"

  ${colors.cyan}# Generate resume from a job posting URL${colors.reset}
  node dist/resume-cli/resume/cli/resumeTailor.js --url "https://linkedin.com/jobs/view/..." --job-title "Staff Engineer" --company "ClickUp"

  ${colors.cyan}# Generate only cover letter${colors.reset}
  node dist/resume-cli/resume/cli/resumeTailor.js --job-file job.txt --job-title "Staff Engineer" --company "ClickUp" --cover-letter-only

  ${colors.cyan}# Generate resume without cover letter${colors.reset}
  node dist/resume-cli/resume/cli/resumeTailor.js --job-file job.txt --job-title "Staff Engineer" --company "ClickUp" --no-cover-letter

  ${colors.cyan}# Generate with enthusiastic tone${colors.reset}
  node dist/resume-cli/resume/cli/resumeTailor.js --job-file job.txt --job-title "Staff Engineer" --company "ClickUp" --tone enthusiastic

${colors.bright}Note:${colors.reset}
  All generated files are saved to the ${colors.cyan}generated/${colors.reset} folder.
  Generated files: resume_<company>.html, resume_<company>.pdf, cover-letter_<company>.html, cover-letter_<company>.pdf, cover-letter_<company>.txt
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
