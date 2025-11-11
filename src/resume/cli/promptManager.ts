#!/usr/bin/env node
/**
 * Prompt Template Manager CLI
 * Tool for viewing, exporting, and customizing prompt templates
 */

import * as fs from 'fs';
import { PromptLibrary } from '../services/promptLibrary.js';

interface ManagerOptions {
  action?: 'list' | 'export' | 'import' | 'view';
  templateId?: string;
  file?: string;
}

class PromptManager {
  private library: PromptLibrary;

  constructor() {
    this.library = new PromptLibrary();
  }

  async run(args: string[]): Promise<void> {
    const options = this.parseArgs(args);

    switch (options.action) {
      case 'list':
        this.listTemplates();
        break;
      case 'view':
        this.viewTemplate(options.templateId);
        break;
      case 'export':
        this.exportTemplates(options.file);
        break;
      case 'import':
        this.importTemplates(options.file);
        break;
      default:
        this.printHelp();
    }
  }

  private parseArgs(args: string[]): ManagerOptions {
    const options: ManagerOptions = {};

    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case 'list':
          options.action = 'list';
          break;
        case 'view':
          options.action = 'view';
          if (args[i + 1]) {
            options.templateId = args[i + 1];
            i++;
          }
          break;
        case 'export':
          options.action = 'export';
          if (args[i + 1]) {
            options.file = args[i + 1];
            i++;
          }
          break;
        case 'import':
          options.action = 'import';
          if (args[i + 1]) {
            options.file = args[i + 1];
            i++;
          }
          break;
        case '-h':
        case '--help':
          this.printHelp();
          process.exit(0);
      }
    }

    return options;
  }

  private listTemplates(): void {
    const templates = this.library.listTemplates();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  Available Prompt Templates');
    console.log('═══════════════════════════════════════════════════════\n');

    templates.forEach(template => {
      console.log(`📝 ${template.name} (${template.id})`);
      console.log(`   ${template.description}\n`);
    });

    console.log(`Total: ${templates.length} template(s)\n`);
    console.log('Use "prompt-manager view <template-id>" to see full template');
    console.log('Use "prompt-manager export <file>" to save templates as JSON\n');
  }

  private viewTemplate(templateId?: string): void {
    if (!templateId) {
      console.error('Error: Template ID required for view action');
      console.error('Usage: prompt-manager view <template-id>');
      process.exit(1);
    }

    const template = this.library.getTemplate(templateId);
    if (!template) {
      console.error(`Error: Template "${templateId}" not found`);
      process.exit(1);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`  ${template.name}`);
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`ID: ${template.id}`);
    console.log(`Description: ${template.description}\n`);

    console.log('SYSTEM PROMPT:');
    console.log('─'.repeat(55));
    console.log(template.systemPrompt);
    console.log('─'.repeat(55));
    console.log();

    console.log('USER PROMPT TEMPLATE:');
    console.log('─'.repeat(55));
    console.log(template.userPromptTemplate);
    console.log('─'.repeat(55));
    console.log();

    console.log('OUTPUT FORMAT:');
    console.log('─'.repeat(55));
    console.log(template.outputFormat);
    console.log('─'.repeat(55));
    console.log();

    if (template.examples && template.examples.length > 0) {
      console.log('EXAMPLES:');
      console.log('─'.repeat(55));
      template.examples.forEach((example, idx) => {
        console.log(`${idx + 1}. ${example}`);
      });
      console.log('─'.repeat(55));
      console.log();
    }
  }

  private exportTemplates(file?: string): void {
    // Ensure generated folder exists
    const dir = './generated';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = file || './generated/prompt-templates.json';
    const json = this.library.exportTemplates();

    fs.writeFileSync(filename, json, 'utf-8');

    console.log(`\n✓ Exported templates to ${filename}\n`);
    console.log('You can now:');
    console.log('1. Edit the JSON file to customize prompts');
    console.log('2. Import with: prompt-manager import <file>\n');
  }

  private importTemplates(file?: string): void {
    if (!file) {
      console.error('Error: File path required for import action');
      console.error('Usage: prompt-manager import <file>');
      process.exit(1);
    }

    if (!fs.existsSync(file)) {
      console.error(`Error: File "${file}" not found`);
      process.exit(1);
    }

    try {
      const json = fs.readFileSync(file, 'utf-8');
      this.library.importTemplates(json);

      console.log(`\n✓ Successfully imported templates from ${file}\n`);
      console.log('Templates are now available for use.');
      console.log('Note: Imports only affect the current session.\n');
      console.log('To persist changes, modify src/resume/services/promptLibrary.ts\n');
    } catch (error) {
      console.error('Error importing templates:', error);
      process.exit(1);
    }
  }

  private printHelp(): void {
    console.log(`
Prompt Template Manager - Manage and customize LLM prompts

USAGE:
  prompt-manager <action> [options]

ACTIONS:
  list                List all available prompt templates
  view <template-id>  View full details of a specific template
  export [file]       Export templates to JSON file (default: prompt-templates.json)
  import <file>       Import templates from JSON file

EXAMPLES:
  prompt-manager list
  prompt-manager view resume-tailor
  prompt-manager export my-templates.json
  prompt-manager import src/resume/examples/custom-prompts.json

OPTIONS:
  -h, --help         Show this help message

CUSTOMIZATION:
  1. Export templates to JSON
  2. Edit the JSON file to customize prompts
  3. Test by importing (temporary changes)
  4. To persist, modify src/resume/services/promptLibrary.ts
`);
  }
}

// Run CLI
const manager = new PromptManager();
manager.run(process.argv.slice(2)).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
