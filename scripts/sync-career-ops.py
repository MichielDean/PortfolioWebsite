#!/usr/bin/env python3
"""Sync career config from PortfolioWebsite (source of truth) to all downstream targets.

Source of truth:
  - ~/source/PortfolioWebsite/src/data/profileData.ts  (who you are)
  - ~/.config/lobsterdog/job-preferences.yaml           (what you want — gates, salary, work mode)

Targets synced by this script:
  1. ~/.config/llmem/resume/profile.json                (lobresume — for resume tailoring)
  2. ~/source/career-ops/config/profile.yml             (career-ops candidate info — name, email, narrative, comp, target roles)
  3. ~/source/career-ops/modes/_profile.md              (career-ops archetypes + adaptive framing — generated from profileData)

NOT touched by this script:
  - ~/source/career-ops/portals.yml                     (manually curated scanner config — companies, search queries, title filters)
  - ~/source/career-ops/cv.md                           (hand-authored CV — career-ops generates from this)
  - ~/source/career-ops/modes/_custom.md                (procedural house rules)
  - ~/source/career-ops/data/*                          (pipeline, applications, scan history)

The portals.yml target_roles and title_filter are curated manually and represent
the scanner's net. config/profile.yml.target_roles is the candidate's role hierarchy.
They overlap but serve different purposes. This script syncs identity/contact/narrative/
comp fields from profileData.ts into profile.yml, and regenerates _profile.md archetypes
from the profileData.ts skill categories + summary. Target roles in profile.yml are
preserved (manually curated) unless --reset-roles is passed.

Usage:
  python3 sync-career-ops.py              # sync all targets
  python3 sync-career-ops.py --check      # dry run, show what would change
  python3 sync-career-ops.py --reset-roles  # also regenerate target_roles from portals.yml

Exit codes:
  0 = success (or dry run with no changes)
  1 = error
  2 = changes detected in dry run
"""

import json
import re
import sys
import yaml
from pathlib import Path
from datetime import datetime

# === Paths ===
PORTFOLIO_DIR = Path("~/source/PortfolioWebsite").expanduser()
PROFILE_DATA_FILE = PORTFOLIO_DIR / "src/data/profileData.ts"
JOB_PREFS_FILE = Path("~/.config/lobsterdog/job-preferences.yaml").expanduser()

LOBRESUME_PROFILE = Path("~/.config/llmem/resume/profile.json").expanduser()
CAREER_OPS_DIR = Path("~/source/career-ops").expanduser()
CAREER_OPS_PROFILE_YML = CAREER_OPS_DIR / "config/profile.yml"
CAREER_OPS_PROFILE_MD = CAREER_OPS_DIR / "modes/_profile.md"

# === TS Parser (same logic as sync-profile.py) ===

def parse_ts_object(text: str, start: int) -> tuple[dict, int]:
    while start < len(text) and text[start] in ' \t\n\r':
        start += 1
    if text[start] != '{':
        raise ValueError(f"Expected '{{' at position {start}, got '{text[start]}'")
    obj = {}
    i = start + 1
    while i < len(text):
        while i < len(text) and text[i] in ' \t\n\r,':
            i += 1
        if i >= len(text):
            break
        if text[i] == '}':
            return obj, i + 1
        key, i = _read_value(text, i, is_key=True)
        if key is None:
            continue
        while i < len(text) and text[i] in ' \t\n\r':
            i += 1
        if i < len(text) and text[i] == ':':
            i += 1
        value, i = _read_value(text, i)
        obj[key] = value
    raise ValueError("Unterminated object")

def _read_value(text: str, i: int, is_key: bool = False) -> tuple:
    while i < len(text) and text[i] in ' \t\n\r':
        i += 1
    if i >= len(text):
        return None, i
    char = text[i]
    if char in ('"', "'", '`'):
        return _read_string(text, i)
    if char == '[':
        return _read_array(text, i)
    if char == '{':
        return parse_ts_object(text, i)
    if char.isdigit() or (char == '-' and i + 1 < len(text) and text[i + 1].isdigit()):
        j = i + 1
        while j < len(text) and (text[j].isdigit() or text[j] == '.'):
            j += 1
        return float(text[i:j]) if '.' in text[i:j] else int(text[i:j]), j
    if text[i:i + 4] == 'true':
        return True, i + 4
    if text[i:i + 5] == 'false':
        return False, i + 5
    if text[i:i + 4] == 'null':
        return None, i + 4
    if is_key or char.isalpha() or char == '_':
        j = i
        while j < len(text) and (text[j].isalnum() or text[j] in '_$'):
            j += 1
        return text[i:j], j
    raise ValueError(f"Unexpected character '{char}' at position {i}")

def _read_string(text: str, i: int) -> tuple[str, int]:
    quote_char = text[i]
    i += 1
    result = []
    while i < len(text):
        if text[i] == '\\' and i + 1 < len(text):
            next_char = text[i + 1]
            if next_char == 'n':
                result.append('\n')
            elif next_char == 't':
                result.append('\t')
            elif next_char == '\\':
                result.append('\\')
            elif next_char == quote_char:
                result.append(quote_char)
            else:
                result.append(next_char)
            i += 2
        elif text[i] == quote_char:
            return ''.join(result), i + 1
        else:
            result.append(text[i])
            i += 1
    raise ValueError(f"Unterminated string starting at position {i}")

def _read_array(text: str, i: int) -> tuple[list, int]:
    i += 1
    items = []
    while i < len(text):
        while i < len(text) and text[i] in ' \t\n\r,':
            i += 1
        if i >= len(text):
            break
        if text[i] == ']':
            return items, i + 1
        value, i = _read_value(text, i)
        items.append(value)
    raise ValueError("Unterminated array")

def extract_profile_data(ts_content: str) -> dict:
    match = re.search(r'export\s+const\s+profileData\s*:\s*Profile\s*=\s*\{', ts_content)
    if not match:
        raise ValueError("Could not find profileData assignment in TypeScript file")
    start = match.end() - 1
    data, _ = parse_ts_object(ts_content, start)
    return data

# === Converters ===

def convert_to_lobresume_json(profile_data: dict) -> dict:
    """Convert profileData to lobresume profile.json format."""
    result = {
        "name": profile_data.get("name", ""),
        "email": profile_data.get("email", ""),
        "phone": profile_data.get("phone", ""),
        "location": profile_data.get("location", ""),
        "linkedin": profile_data.get("linkedin", ""),
        "website": profile_data.get("website", ""),
        "summary": profile_data.get("summary", ""),
        "skills": profile_data.get("skills", []),
        "skill_categories": {},
        "work_history": [],
        "education": profile_data.get("education", []),
        "certifications": profile_data.get("certifications", []),
        "do_not_claim": profile_data.get("doNotClaim", []),
    }
    for cat_entry in profile_data.get("skillCategories", []):
        if isinstance(cat_entry, dict):
            cat_name = cat_entry.get("category", "")
            cat_skills = cat_entry.get("skills", [])
            if cat_name and cat_skills:
                result["skill_categories"][cat_name] = cat_skills
    for entry in profile_data.get("workHistory", []):
        bullets = []
        description_parts = []
        for desc_obj in entry.get("description", []):
            if isinstance(desc_obj, dict):
                desc_label = desc_obj.get("description", "")
                more_infos = desc_obj.get("moreInfo", [])
                description_parts.append(desc_label)
                for info in more_infos:
                    bullets.append(info)
            elif isinstance(desc_obj, str):
                description_parts.append(desc_obj)
        duration = entry.get("duration", "")
        start_date = ""
        end_date = ""
        if " - " in duration:
            parts = duration.split(" - ", 1)
            start_date = parts[0].strip()
            end_date = parts[1].strip()
        elif duration:
            start_date = duration
        result["work_history"].append({
            "company": entry.get("company", ""),
            "title": entry.get("role", ""),
            "start_date": start_date,
            "end_date": end_date,
            "description": ", ".join(description_parts),
            "bullets": bullets,
        })
    return result

def load_job_prefs() -> dict:
    """Load job-preferences.yaml."""
    if not JOB_PREFS_FILE.exists():
        print(f"Warning: {JOB_PREFS_FILE} not found — using defaults")
        return {}
    with open(JOB_PREFS_FILE, 'r') as f:
        return yaml.safe_load(f) or {}

def derive_archetypes(profile_data: dict) -> list[dict]:
    """Derive career archetypes from profileData skills + title + summary."""
    title = profile_data.get("title", "")
    summary = profile_data.get("summary", "")
    skill_cats = profile_data.get("skillCategories", [])
    cat_names = [c.get("category", "") for c in skill_cats if isinstance(c, dict)]
    skills_lower = [s.lower() for s in profile_data.get("skills", [])]

    archetypes = []

    # Engineering Director / VP
    if any(k in title.lower() for k in ["director", "vp", "head of"]):
        archetypes.append({
            "name": "Engineering Director / VP",
            "level": "Director/VP",
            "fit": "primary",
            "axes": "Team leadership, org scaling, engineering strategy, hiring",
            "buys": "A leader who scales engineering orgs and delivers at scale",
            "evidence": "3 teams, 15+ engineers, 100B+ monthly impressions at Triton Digital",
        })

    # QA / Test Engineering Leader
    if "Testing & QA" in cat_names or "QE Strategy & Governance" in cat_names:
        archetypes.append({
            "name": "QA / Test Engineering Leader",
            "level": "Director/Manager",
            "fit": "primary",
            "axes": "Test automation strategy, QE org building, shift-left, CI/CD quality",
            "buys": "A QE leader who transforms testing orgs and drives automation-first culture",
            "evidence": "18 years in quality engineering, org-wide QA at Triton, automation-first transformation",
        })

    # Engineering Manager
    if any(k in title.lower() for k in ["manager", "director", "vp"]):
        archetypes.append({
            "name": "Engineering Manager",
            "level": "Manager",
            "fit": "secondary",
            "axes": "Team building, 1:1s, career development, delivery management",
            "buys": "A hands-on manager who grows engineers and ships reliably",
            "evidence": "Built career paths, hired 5+ engineers, strong retention at Triton Digital",
        })

    # AI-Enabled Engineering Leader
    if "AI & Developer Tooling" in cat_names:
        archetypes.append({
            "name": "AI-Enabled Engineering Leader",
            "level": "Director/Manager",
            "fit": "secondary",
            "axes": "AI tool rollout, governance, developer productivity, adoption",
            "buys": "A leader who drives AI adoption across engineering orgs with governance",
            "evidence": "Copilot 40%→80% adoption, LLM code review, AI governance policies at Triton Digital",
        })

    # Platform / Infrastructure Leader
    if "Cloud & DevOps" in cat_names or "Distributed Systems" in cat_names:
        archetypes.append({
            "name": "Platform / Infrastructure Leader",
            "level": "Director/Manager",
            "fit": "secondary",
            "axes": "Kubernetes, CI/CD, microservices migration, developer platforms",
            "buys": "A leader who modernizes infrastructure and builds paved-road developer platforms",
            "evidence": "Monolith→microservices, on-prem→Kubernetes, paved-road workflows at Triton Digital",
        })

    return archetypes

def generate_profile_md(profile_data: dict, archetypes: list[dict], job_prefs: dict) -> str:
    """Generate modes/_profile.md from profileData + derived archetypes."""
    name = profile_data.get("name", "Candidate")
    title = profile_data.get("title", "")
    summary = profile_data.get("summary", "")
    skill_cats = profile_data.get("skillCategories", [])
    do_not_claim = profile_data.get("doNotClaim", [])

    # Build archetypes table
    arch_rows = []
    for a in archetypes:
        arch_rows.append(
            f"| **{a['name']}** | {a['axes']} | {a['buys']} |"
        )

    # Build adaptive framing table
    frame_rows = []
    for a in archetypes:
        frame_rows.append(
            f"| {a['name']} | {a['evidence']} | cv.md + article-digest.md |"
        )

    # Build do_not_claim list
    dnc_items = "\n".join(f"- **{item}**" for item in do_not_claim) if do_not_claim else "(none)"

    # Build skill category summary
    cat_lines = []
    for cat in skill_cats:
        if isinstance(cat, dict):
            cat_name = cat.get("category", "")
            cat_skills = cat.get("skills", [])
            cat_lines.append(f"  - **{cat_name}**: {', '.join(cat_skills[:8])}{'...' if len(cat_skills) > 8 else ''}")

    # Salary from job-preferences
    salary_min = job_prefs.get("salary_min", 0)
    salary_max = job_prefs.get("salary_max", 0)
    salary_min_k = salary_min // 1000 if isinstance(salary_min, int) else salary_min
    salary_max_k = salary_max // 1000 if isinstance(salary_max, int) else salary_max
    work_mode = job_prefs.get("work_mode", "remote_only")
    comp_line = f"Target: ${salary_min_k}K-${salary_max_k}K | Work mode: {work_mode}"

    md = f"""# User Profile Context -- career-ops

<!-- ============================================================
     AUTO-GENERATED by sync-career-ops.py
     Source: ~/source/PortfolioWebsite/src/data/profileData.ts
     Last sync: {datetime.now().strftime("%Y-%m-%d")}

     DO NOT EDIT MANUALLY — changes will be overwritten on next sync.
     To customize: edit profileData.ts in PortfolioWebsite, then run
     sync-career-ops.py (or wait for the daily cron sync).

     The system reads _shared.md (updatable) first, then this
     file (your overrides). Your customizations always win.
     ============================================================ -->

## Candidate

**{name}** — {title}
{comp_line}

## Your Target Roles

| Archetype | Thematic axes | What they buy |
|-----------|---------------|---------------|
{chr(10).join(arch_rows)}

## Your Adaptive Framing

| If the role is... | Emphasize about you... | Proof point sources |
|-------------------|------------------------|---------------------|
{chr(10).join(frame_rows)}

## Your Exit Narrative

Use the candidate's exit story from `config/profile.yml` to frame ALL content:
- **In PDF Summaries:** Bridge from past to future
- **In STAR stories:** Reference proof points from article-digest.md
- **In Draft Answers:** The transition narrative appears in the first response

Summary from profileData.ts:
> {summary}

## Your Cross-cutting Advantage

Engineering leader with 18+ years in quality engineering, now directing multi-team engineering orgs with AI tool adoption. Unique combination: deep QE expertise + engineering leadership + hands-on AI agent building. Tailor emphasis to the role.

## Your Skill Categories

{chr(10).join(cat_lines)}

## Do Not Claim (HARD EXCLUSION)

These skills/topics must NEVER appear in generated content:

{dnc_items}

## Your Comp Targets

**General guidance:**
- Use WebSearch for current market data (Glassdoor, Levels.fyi, Blind)
- Frame by role title, not by skills
- Target range from job-preferences.yaml: ${salary_min_k}K-${salary_max_k}K

**Salary expectations:**
> "Based on market data for this role, I'm targeting ${salary_min_k}K-${salary_max_k}K. I'm flexible on structure -- what matters is the total package and the opportunity."

**Geographic discount pushback:**
> "The roles I'm competitive for are output-based, not location-based. My track record doesn't change based on postal code."

**When offered below target:**
> "I'm comparing with opportunities in the ${salary_max_k}K+ range. I'm drawn to [company] because of [reason]. Can we explore [target]?"

## Your Location Policy

**In forms:**
- Follow your actual availability from profile.yml
- Specify timezone overlap in free-text fields

**In evaluations (scoring):**
- Remote dimension for hybrid outside your country: score **3.0** (not 1.0)
- Only score 1.0 if JD says "must be on-site 4-5 days/week, no exceptions"
"""
    return md

def sync_profile_yml(profile_data: dict, existing: dict, job_prefs: dict) -> dict:
    """Sync identity/contact/narrative fields in career-ops config/profile.yml.
    Preserves target_roles (manually curated) unless they don't exist."""
    # Start from existing or empty
    out = existing.copy() if existing else {}

    # Sync candidate info from profileData
    candidate = out.get("candidate", {})
    candidate["full_name"] = profile_data.get("name", candidate.get("full_name", ""))
    candidate["email"] = profile_data.get("email", candidate.get("email", ""))
    candidate["phone"] = profile_data.get("phone", candidate.get("phone", ""))
    candidate["location"] = profile_data.get("location", candidate.get("location", ""))
    candidate["linkedin"] = profile_data.get("linkedin", candidate.get("linkedin", ""))
    candidate["portfolio_url"] = profile_data.get("website", candidate.get("portfolio_url", ""))
    candidate["github"] = profile_data.get("github", candidate.get("github", ""))
    out["candidate"] = candidate

    # Sync narrative from profileData summary
    narrative = out.get("narrative", {})
    narrative["headline"] = profile_data.get("summary", "").split(".")[0] + "."
    narrative["exit_story"] = profile_data.get("summary", narrative.get("exit_story", ""))

    # Derive superpowers from skill categories
    skill_cats = profile_data.get("skillCategories", [])
    superpowers = []
    for cat in skill_cats:
        if isinstance(cat, dict):
            cat_name = cat.get("category", "")
            cat_skills = cat.get("skills", [])
            if cat_name in ["Leadership & Strategy", "Testing & QA", "AI & Developer Tooling", "QE Strategy & Governance"]:
                superpowers.append(f"{cat_name}: {', '.join(cat_skills[:3])}")
    narrative["superpowers"] = superpowers if superpowers else narrative.get("superpowers", [])
    out["narrative"] = narrative

    # Sync compensation from job-preferences
    comp = out.get("compensation", {})
    salary_min = job_prefs.get("salary_min", 0)
    salary_max = job_prefs.get("salary_max", 0)
    comp["target_range"] = f"${salary_min // 1000}K-${salary_max // 1000}K"
    comp["currency"] = "USD"
    comp["minimum"] = f"${int(salary_min * 0.8) // 1000}K"
    work_mode = job_prefs.get("work_mode", "remote_only")
    comp["location_flexibility"] = "Remote required. Open to occasional travel." if work_mode == "remote_only" else comp.get("location_flexibility", "Remote preferred.")
    out["compensation"] = comp

    # Sync location
    location = out.get("location", {})
    location["country"] = "United States"
    location["city"] = profile_data.get("location", location.get("city", ""))
    location["timezone"] = "MST"
    location["visa_status"] = "No sponsorship needed (US citizen)" if not job_prefs.get("visa_sponsorship", False) else "Requires visa sponsorship"
    out["location"] = location

    # Preserve target_roles (manually curated) — don't overwrite
    if "target_roles" not in out:
        out["target_roles"] = {
            "primary": [],
            "archetypes": []
        }

    # Preserve other fields
    out.setdefault("language", {"output": "en"})
    out.setdefault("spend_tier", "standard")
    out.setdefault("cv", {"output_format": "html"})
    out.setdefault("cover_letter", {"notice_period_days": 30, "primary_domain": "digital media / streaming audio"})

    return out

# === Main ===

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Sync career-ops configs from PortfolioWebsite + job-preferences")
    parser.add_argument("--check", action="store_true", help="Dry run — show what would change, don't write")
    parser.add_argument("--reset-roles", action="store_true", help="Also regenerate target_roles from portals.yml")
    parser.add_argument("--force", action="store_true", help="Overwrite _profile.md even if no auto-gen marker")
    args = parser.parse_args()

    # Load source of truth
    if not PROFILE_DATA_FILE.exists():
        print(f"Error: {PROFILE_DATA_FILE} not found")
        sys.exit(1)
    ts_content = PROFILE_DATA_FILE.read_text(encoding="utf-8")
    try:
        profile_data = extract_profile_data(ts_content)
    except ValueError as e:
        print(f"Error parsing profileData.ts: {e}")
        sys.exit(1)

    job_prefs = load_job_prefs()

    changes = []

    # === 1. Sync lobresume profile.json ===
    lobresume_json = convert_to_lobresume_json(profile_data)
    if LOBRESUME_PROFILE.exists():
        existing = json.loads(LOBRESUME_PROFILE.read_text())
        if existing != lobresume_json:
            changes.append(f"profile.json: content differs ({len(lobresume_json.get('skills',[]))} skills, {len(lobresume_json.get('work_history',[]))} jobs)")
            if not args.check:
                LOBRESUME_PROFILE.parent.mkdir(parents=True, exist_ok=True)
                LOBRESUME_PROFILE.write_text(json.dumps(lobresume_json, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        else:
            changes.append("profile.json: up to date")
    else:
        changes.append(f"profile.json: creating new ({len(lobresume_json.get('skills',[]))} skills)")
        if not args.check:
            LOBRESUME_PROFILE.parent.mkdir(parents=True, exist_ok=True)
            LOBRESUME_PROFILE.write_text(json.dumps(lobresume_json, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # === 2. Sync career-ops config/profile.yml ===
    existing_yml = {}
    if CAREER_OPS_PROFILE_YML.exists():
        with open(CAREER_OPS_PROFILE_YML, 'r') as f:
            existing_yml = yaml.safe_load(f) or {}

    new_yml = sync_profile_yml(profile_data, existing_yml, job_prefs)

    # If --reset-roles, regenerate from portals.yml
    if args.reset_roles:
        portals_file = CAREER_OPS_DIR / "portals.yml"
        if portals_file.exists():
            with open(portals_file, 'r') as f:
                portals = yaml.safe_load(f) or {}
            positive = portals.get("title_filter", {}).get("positive", [])
            # Group into primary/secondary
            primary_roles = [r for r in positive if any(k in r.lower() for k in ["director", "vp", "head of", "head of"])]
            secondary_roles = [r for r in positive if r not in primary_roles]
            new_yml["target_roles"]["primary"] = primary_roles + secondary_roles
            changes.append(f"profile.yml: reset target_roles from portals.yml ({len(primary_roles)+len(secondary_roles)} roles)")

    new_yml_text = yaml.dump(new_yml, default_flow_style=False, sort_keys=False, allow_unicode=True)
    if CAREER_OPS_PROFILE_YML.exists():
        old_yml_text = CAREER_OPS_PROFILE_YML.read_text()
        if old_yml_text.strip() != new_yml_text.strip():
            changes.append("profile.yml: content differs (identity/narrative/comp synced)")
            if not args.check:
                CAREER_OPS_PROFILE_YML.write_text(new_yml_text, encoding="utf-8")
        else:
            changes.append("profile.yml: up to date")
    else:
        changes.append("profile.yml: creating new")
        if not args.check:
            CAREER_OPS_PROFILE_YML.parent.mkdir(parents=True, exist_ok=True)
            CAREER_OPS_PROFILE_YML.write_text(new_yml_text, encoding="utf-8")

    # === 3. Sync career-ops modes/_profile.md ===
    archetypes = derive_archetypes(profile_data)
    new_md = generate_profile_md(profile_data, archetypes, job_prefs)

    # Check if existing file is auto-generated (has marker) or manual
    if CAREER_OPS_PROFILE_MD.exists():
        old_md = CAREER_OPS_PROFILE_MD.read_text()
        # Strip "Last sync:" line before comparing — it changes every run
        old_md_cmp = re.sub(r'Last sync:.*$', '', old_md, flags=re.MULTILINE)
        new_md_cmp = re.sub(r'Last sync:.*$', '', new_md, flags=re.MULTILINE)
        if "AUTO-GENERATED by sync-career-ops.py" in old_md:
            if old_md_cmp.strip() != new_md_cmp.strip():
                changes.append("_profile.md: content differs (archetypes/narrative regenerated)")
                if not args.check:
                    CAREER_OPS_PROFILE_MD.write_text(new_md, encoding="utf-8")
            else:
                # Content same — just update the timestamp silently
                if old_md.strip() != new_md.strip():
                    CAREER_OPS_PROFILE_MD.write_text(new_md, encoding="utf-8")
                changes.append("_profile.md: up to date")
        elif args.force:
            changes.append("_profile.md: MANUAL FILE — overwriting with --force")
            if not args.check:
                CAREER_OPS_PROFILE_MD.write_text(new_md, encoding="utf-8")
        else:
            changes.append("_profile.md: MANUAL FILE (no auto-gen marker) — skipping. Run with --force to overwrite.")
    else:
        changes.append("_profile.md: creating new (auto-generated)")
        if not args.check:
            CAREER_OPS_PROFILE_MD.write_text(new_md, encoding="utf-8")

    # === Report ===
    if args.check:
        print(f"Career config sync (DRY RUN)")
        print(f"Source: {PROFILE_DATA_FILE}")
        print()
        for c in changes:
            print(f"  {c}")
        print()
        would_change = any("differs" in c or "creating new" in c or "reset" in c for c in changes)
        sys.exit(2 if would_change else 0)
    else:
        # In normal mode: print output only if something actually changed
        # (silent on success when everything is up to date — for cron/watchdog use)
        actual_changes = [c for c in changes if "up to date" not in c and "skipping" not in c]
        if actual_changes:
            print(f"Career config sync COMPLETE")
            print(f"Source: {PROFILE_DATA_FILE}")
            print()
            for c in changes:
                print(f"  {c}")
        sys.exit(0)

if __name__ == "__main__":
    main()