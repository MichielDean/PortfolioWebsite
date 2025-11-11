# Resume Tailor Tool

AI-powered resume tailoring with LLM-first architecture, RAG learning, and anti-fabrication safeguards. All processing happens locally via Ollama.

## Quick Start

```bash
# 1. Install Ollama from https://ollama.ai
# 2. Pull a large model: ollama pull gpt-oss:120b
# 3. Update your data: src/data/profileData.ts
# 4. Generate resume:
.\scripts\tailor-resume.ps1 -JobFile job.txt -JobTitle "Job Title" -Company "Company"
```

## Features

🤖 **Local AI** - Private, offline processing with Ollama  
🎯 **LLM-First** - Intelligent content selection, not keyword matching  
🛡️ **Anti-Fabrication** - Auto-correction prevents company/role hallucination  
� **Single Source** - Data maintained only in profileData.ts  
🧠 **RAG Learning** - Learns from past successful applications  
📊 **Match Scoring** - LLM-based resume-job fit percentage  
📄 **ATS-Compliant** - Clean HTML output  
✅ **Truthful** - Maps all LLM output to actual profile data

## Architecture

### Files
- `src/data/profileData.ts` - **Single source of truth** for work experience
- `src/resume/data/resumeData.ts` - Skills list with keywords (contact info deprecated)
- `src/resume/cli/resumeTailor.ts` - Main CLI
- `src/resume/services/resumeTailoringEngine.ts` - LLM-first tailoring
- `src/resume/services/llmValidator.ts` - LLM-based fact-checking
- `src/resume/services/profileDataAdapter.ts` - Converts profileData to resume format

### How It Works
1. **Load Profile** - Reads from profileData.ts as single source
2. **LLM Selection** - AI selects relevant experiences and achievements
3. **Auto-Correction** - Maps LLM output back to actual profile data
4. **Validation** - LLM verifies no fabrication occurred
5. **HTML Generation** - Creates clean, ATS-friendly resume

## Usage

### Recommended: PowerShell Script (Windows)
```powershell
.\scripts\tailor-resume.ps1 -JobFile "C:\path\to\job.txt" -JobTitle "Senior Engineer" -Company "Acme Corp"
```

### Alternative: Direct Node Command
```bash
# First build
npm run resume:build

# Then run
node dist/resume-cli/resume/cli/resumeTailor.js --job-file job.txt --job-title "Senior Engineer" --company "Acme Corp"
```

### Basic
```bash
node dist/resume-cli/resume/cli/resumeTailor.js --job-file job.txt --job-title "Senior Engineer" --company "Acme Corp"
```

### Direct Invocation
```bash
node dist/resume-cli/resume/cli/resumeTailor.js \
  --job-file examples/job.txt \
  --job-title "Director of QA" \
  --company "Bestow" \
  --output resume.html
```

### Options
```
--job-file, -j <file>     Job posting file
--job-title, -t <title>   Job title
--company, -c <name>      Company name
--output, -o <file>       Output (default: generated/resume.html)
--help, -h                Show help
```

### Track Results
```bash
npm run resume:update  # Log interview/offer/rejection
```

## How It Works

**1. Skill Discovery** (Optional)
- Detects skills in job posting not in your resume
- Prompts: "Do you have Kubernetes? [y/n/skip]"
- Adds confirmed skills for this session
- Generates code to add permanently

**2. Resume Tailoring**
- Extracts job keywords with AI
- Matches your skills to requirements
- Scores achievements by relevance
- Selects top achievements
- Tailors summary (keyword emphasis only)

**3. Validation** (Safeguards)
- ❌ Blocks fabricated numbers, dates, titles
- ❌ Blocks new skills not in source data
- ❌ Blocks modified achievement text
- ✅ Only allows reordering/emphasis

**4. RAG Learning**
- Saves resume + job posting to history
- Finds similar past applications
- Uses successful patterns for future resumes
- Updates with application outcomes

## Anti-Hallucination Safeguards

**Problem**: AI might fabricate experience, skills, or achievements.

**Solution**: 5 protection layers

1. **Strict AI Prompts** - 10 explicit "DO NOT" rules
2. **Immutable Source** - `resumeData.ts` never modified
3. **Selection-Only** - Achievements selected, not generated
4. **Post-Validation** - Fact-checks against original
5. **User Review** - Final check before sending

**Example validation failure:**
```
✗ VALIDATION FAILED!
ERRORS:
  • Summary contains fabricated information: "aws"
  • Achievement description was modified

Resume NOT saved.
```

**What's allowed:**
- ✅ Reorder achievements by relevance
- ✅ Emphasize matching keywords
- ✅ Select most relevant experience
- ✅ Adjust professional summary wording

**What's blocked:**
- ❌ Add fake skills
- ❌ Invent experience
- ❌ Modify achievement text
- ❌ Change dates/titles/companies

**Result**: You can trust generated resumes are truthful.

## Skill Discovery

Finds skills you forgot to list:

```
━━━ Skill Discovery ━━━

Found 3 skills not in your resume:

1/3. Kubernetes
   Category: tool, Confidence: high
   Context: "...Docker and Kubernetes experience..."

   Do you have this skill? [y/n/skip]: y
   Proficiency (1-4, default 2): 2
   Keywords (optional): k8s, container orchestration
   ✓ Added

2/3. Terraform
   [continues...]
```

**Output:**
```typescript
// Add to resumeData.ts:
{ name: 'Kubernetes', category: 'tool', keywords: ['k8s', 'container orchestration'], proficiency: 'advanced' }
```

**Disable if needed:**
```bash
npm run tailor-resume -- --job-file job.txt --job-title "Title" --company "Co" --no-discover-skills
```

## RAG Learning System

**Learns from your application history:**

1. Every resume saved to `resume-history.json`
2. Track outcomes: `npm run resume:update`
3. Marks successful patterns (interviews/offers)
4. Future resumes use these patterns

**Example:**
- Application 1: 42% match → no response
- Application 2: 48% match → interview ✓
- Application 3: 53% match → interview ✓ (RAG learning kicks in)
- Application 4: 58% match → offer ✓✓

**Stats tracked:**
- Success rate: (interviews + offers) / total
- Average match score
- Effective skills/achievements

## Workflow

```
1. Generate resume → Skill discovery → Validation → Save
2. Apply for job
3. Track result: npm run resume:update
4. Repeat → RAG learns patterns
5. Better match scores over time
```

## Data Structure

**Your resume lives in:**
```
src/resume/data/resumeData.ts
```

**Edit this file to:**
- Update contact info
- Add skills with keywords
- List achievements with priorities (1-10)
- Include education, certifications

**Never edited by tool** - single source of truth.

## Output

**HTML Resume:**
- ATS-compliant semantic HTML
- Print-optimized CSS
- Keyword emphasis
- Match score display
- Three color schemes

**Print to PDF:**
1. Open in browser
2. Ctrl+P (Cmd+P on Mac)
3. Destination: Save as PDF
4. Margins: Default
5. Background graphics: On

## Troubleshooting

**Validation fails?**
- Read errors carefully
- Check if info IS accurate → update `resumeData.ts`
- Report false positives

**Low match score?**
- Add missing skills to resumeData.ts
- Update achievement keywords
- Might not be good fit (that's OK!)

**Skill discovery too slow?**
- Use `--no-discover-skills` for bulk processing
- Review `discovered-skills.json` files later

**Ollama not running?**
```bash
# Check status
ollama list

# Start if needed (usually auto-starts)
ollama serve
```

## Architecture

```
src/resume/
├── types/resumeTypes.ts          # Type definitions
├── data/resumeData.ts            # YOUR DATA (edit this!)
├── services/
│   ├── ollamaService.ts          # AI integration
│   ├── resumeTailoringEngine.ts  # Matching logic
│   ├── resumeGenerator.ts        # HTML generation
│   ├── resumeRAG.ts              # Learning system
│   ├── resumeValidator.ts        # Safeguards
│   └── skillDiscovery.ts         # Skill detection
└── cli/
    ├── resumeTailor.ts           # Main CLI
    └── updateResult.ts           # Result tracking
```

## Configuration

**AI Temperature** (determinism):
```typescript
// src/resume/services/ollamaService.ts
temperature: 0.3  // Lower = more deterministic (range 0-1)
```

**Validation Strictness**:
```typescript
// src/resume/services/resumeValidator.ts
if (lengthRatio > 1.3 || lengthRatio < 0.7) // Adjust thresholds
```

**Disable AI Summary** (ultra-safe):
```typescript
// src/resume/services/resumeTailoringEngine.ts
const tailoredSummary = resumeData.summary; // Skip AI
```

## Best Practices

✅ Keep `resumeData.ts` accurate and current  
✅ Review validation output every time  
✅ Track application results for RAG  
✅ Update discovered skills permanently  
✅ Print to PDF immediately after generation  
✅ Back up `resume-history.json` weekly

❌ Don't disable validation  
❌ Don't manually edit achievement text  
❌ Don't confirm skills you don't have  
❌ Don't increase temperature above 0.5

## Privacy & Security

✅ All AI processing local (Ollama)  
✅ No data sent to external servers  
✅ Job postings stay private  
✅ Resume history stored locally  
✅ Complete offline capability

## Examples

**Engineering Role:**
```powershell
.\scripts\tailor-resume.ps1 -JobFile "roles\senior-engineer.txt" -JobTitle "Senior Software Engineer" -Company "Google"
```

**Leadership Role:**
```powershell
.\scripts\tailor-resume.ps1 -JobFile "roles\director.txt" -JobTitle "Engineering Director" -Company "Amazon"
```

**Quick Batch:**
```powershell
Get-ChildItem jobs\*.txt | ForEach-Object {
    .\scripts\tailor-resume.ps1 -JobFile $_.FullName -JobTitle "Engineer" -Company "TechCo" -Output "generated/resume-$($_.BaseName).html"
}
```

## Files Generated

All generated files are saved to the `generated/` folder (automatically created):

- `generated/resume.html` - Your tailored resume
- `generated/discovered-skills.json` - Skills found in session
- `generated/prompt-templates.json` - Exported prompt templates (if using prompt manager)

The `generated/` folder is in `.gitignore` to keep your repository clean.

## FAQ

**Q: Will it fabricate experience?**  
A: No. 5-layer validation blocks fabrication. Resume not saved if detected.

**Q: How does RAG help?**  
A: Learns which skills/achievements get interviews. Prioritizes them in future resumes.

**Q: Can I use different AI models?**  
A: Yes. Edit `ollamaService.ts` model name. Test smaller models: `llama3.2`, `mistral`.

**Q: Does it work offline?**  
A: Yes. Once Ollama and model are installed, fully offline.

**Q: How long does it take?**  
A: 30-60 seconds without skill discovery, 2-5 minutes with (depends on unlisted skills).

**Q: Is it better than resume services?**  
A: Different. Those have better design. This has better truthfulness, privacy, and learning.

## Model Requirements

| Model | RAM Needed | Quality | Speed |
|-------|------------|---------|-------|
| llama3.2 | ~4GB | Good | Fast |
| gpt-oss:20b | ~12GB | Better | Medium |
| gpt-oss:120b | ~54GB | Best | Slow |

Start with `llama3.2`, upgrade if needed.

## Support

Issues? Check:
1. Ollama running: `ollama list`
2. Model downloaded: `ollama pull llama3.2`
3. `resumeData.ts` has your info
4. Validation errors are false positives

## License

Private portfolio tool.

---

**Remember**: The tool makes your resume better, but YOU are the source of truth. Keep your data accurate, review outputs, and be honest about your skills. The safeguards are there to help you, not restrict you.

**Tip**: Run with skill discovery on new jobs, without it for similar roles. Update `resumeData.ts` monthly with new achievements.
