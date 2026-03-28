---
name: portfoliowebsite
description: Work with Michiel's PortfolioWebsite repo — resume tailoring, job search pipeline, and portfolio site. Use when: generating or tailoring a resume/cover letter for a job, running the job hunter pipeline, working on the portfolio site code. Triggers on: "tailor resume", "cover letter", "job search", "PortfolioWebsite", "resume for", "apply to".
metadata: {"openclaw": {"emoji": "📄"}}
---

# PortfolioWebsite

**Repo:** `~/.openclaw/workspace/PortfolioWebsite`
**GitHub:** `github.com/MichielDean/PortfolioWebsite`

## Resume Tailoring

### Quick run
```bash
cd ~/.openclaw/workspace/PortfolioWebsite
git checkout main && git pull
export ANTHROPIC_API_KEY=$(pass anthropic/claude)
# Save job description to job.txt first (or use --job-file)
node dist/resume-cli/resume/cli/resumeTailor.js \
  --job-file job.txt \
  --job-title "Title" \
  --company "CompanyName"
```

Output: `generated/resume_<company>.pdf` + `generated/cover-letter_<company>.pdf`

**Send both PDFs via Telegram immediately after generating:**
```bash
BOT_TOKEN=$(cat ~/.openclaw/openclaw.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['channels']['telegram']['botToken'])")
curl -s -F document=@"generated/resume_<company>.pdf" -F caption="Resume" \
  "https://api.telegram.org/bot${BOT_TOKEN}/sendDocument?chat_id=8569372105"
curl -s -F document=@"generated/cover-letter_<company>.pdf" -F caption="Cover letter" \
  "https://api.telegram.org/bot${BOT_TOKEN}/sendDocument?chat_id=8569372105"
```

### Getting job description from a URL
```bash
curl -s -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" <url> \
  | python3 -c "import sys; from html.parser import HTMLParser; ..."
# Or just save the text manually to job.txt
```
LinkedIn requires curl with a User-Agent — `web_fetch` returns a login wall.

### If not compiled
```bash
npx tsc --project src/resume/tsconfig.json
```

## Architecture

- Work history source: `src/data/profileData.ts`
- Contact info: `contact.json` (gitignored) — recreate: `pass portfolio/contact | python3 -m json.tool > contact.json`
- LLM backend: `src/resume/services/claudeService.ts` (claude-sonnet-4-5 / haiku-4-5)

## Michiel's Work History (for context when tailoring)

- **Director of Software Engineering** — Triton Digital (Mar 2022–Present): 3 teams + org-wide QA, AI tool rollout
- **Sr. Software Engineering Manager [QA]** — Triton Digital (Mar 2019–Mar 2022): QA transformation
- **Senior SDET** — Risk Placement Services (May 2018–Mar 2019)
- **SDET III** — Scentsy, Inc. (Jun 2011–May 2018): led SDET team, test dashboard
- **Software Test Engineer** — Lionbridge (May 2007–Jun 2011): HP, Microsoft, Palm

## Job Hunter Pipeline

**Repo location:** `src/job-hunter/`
**Sources:** Greenhouse, Lever (free, no API key), Ashby (free, no API key)
**Target roles:** Director of Engineering, Senior Engineering Manager, VP of Engineering, VP of QA

The pipeline runs on lobsterdog (not Netlify — that's a static site). No env vars needed for ingestion.

### Status
- TheirStack removed (was paid, now gone)
- Lever + Ashby sources: droplets po-566g3 / po-175jx in flight
- Watchlist expansion: po-1dmsc (blocked on Lever + Ashby)
