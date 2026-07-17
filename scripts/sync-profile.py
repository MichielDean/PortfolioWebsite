#!/usr/bin/env python3
"""Sync profile data from PortfolioWebsite (source of truth) to lobresume profile.json.

Reads:  ~/source/PortfolioWebsite/src/data/profileData.ts
Writes: ~/.config/llmem/resume/profile.json

The PortfolioWebsite profileData.ts is the single source of truth.
Run this script after editing profileData.ts to update the resume pipeline.
"""

import json
import re
import sys
from pathlib import Path

PORTFOLIO_DIR = Path("~/source/PortfolioWebsite").expanduser()
PROFILE_DATA_FILE = PORTFOLIO_DIR / "src/data/profileData.ts"
OUTPUT_FILE = Path("~/.config/llmem/resume/profile.json").expanduser()


def parse_ts_object(text: str, start: int) -> tuple[dict, int]:
    """Parse a TypeScript object literal starting at the opening brace.

    Returns (parsed_dict, end_position).
    """
    # Skip whitespace
    while start < len(text) and text[start] in ' \t\n\r':
        start += 1

    if text[start] != '{':
        raise ValueError(f"Expected '{{' at position {start}, got '{text[start]}'")

    obj = {}
    i = start + 1  # skip opening {

    while i < len(text):
        # Skip whitespace and commas
        while i < len(text) and text[i] in ' \t\n\r,':
            i += 1

        if i >= len(text):
            break

        # Closing brace
        if text[i] == '}':
            return obj, i + 1

        # Read key
        key, i = _read_value(text, i, is_key=True)
        if key is None:
            continue

        # Skip whitespace and colon
        while i < len(text) and text[i] in ' \t\n\r':
            i += 1
        if i < len(text) and text[i] == ':':
            i += 1

        # Read value
        value, i = _read_value(text, i)
        obj[key] = value

    raise ValueError("Unterminated object")


def _read_value(text: str, i: int, is_key: bool = False) -> tuple:
    """Read a value (string, number, boolean, array, object, or identifier) starting at position i.

    Returns (value, new_position).
    """
    # Skip whitespace
    while i < len(text) and text[i] in ' \t\n\r':
        i += 1

    if i >= len(text):
        return None, i

    char = text[i]

    # String literal
    if char in ('"', "'", '`'):
        return _read_string(text, i)

    # Array
    if char == '[':
        return _read_array(text, i)

    # Object
    if char == '{':
        return parse_ts_object(text, i)

    # Number
    if char.isdigit() or (char == '-' and i + 1 < len(text) and text[i + 1].isdigit()):
        j = i + 1
        while j < len(text) and (text[j].isdigit() or text[j] == '.'):
            j += 1
        return float(text[i:j]) if '.' in text[i:j] else int(text[i:j]), j

    # Boolean / null / unquoted identifier (key)
    if text[i:i + 4] == 'true':
        return True, i + 4
    if text[i:i + 5] == 'false':
        return False, i + 5
    if text[i:i + 4] == 'null':
        return None, i + 4

    # Unquoted key (identifier like workHistory, name, etc.)
    if is_key or char.isalpha() or char == '_':
        j = i
        while j < len(text) and (text[j].isalnum() or text[j] in '_$'):
            j += 1
        return text[i:j], j

    raise ValueError(f"Unexpected character '{char}' at position {i}: ...{text[max(0,i-20):i+20]}...")


def _read_string(text: str, i: int) -> tuple[str, int]:
    """Read a string literal starting at position i. Handles double quotes, single quotes, and backticks."""
    quote_char = text[i]
    i += 1  # skip opening quote
    result = []

    while i < len(text):
        if text[i] == '\\' and i + 1 < len(text):
            # Escaped character
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
    """Read an array literal starting at position i."""
    i += 1  # skip [
    items = []

    while i < len(text):
        # Skip whitespace and commas
        while i < len(text) and text[i] in ' \t\n\r,':
            i += 1

        if i >= len(text):
            break

        # Closing bracket
        if text[i] == ']':
            return items, i + 1

        value, i = _read_value(text, i)
        items.append(value)

    raise ValueError("Unterminated array")


def extract_profile_data(ts_content: str) -> dict:
    """Extract the profileData object from TypeScript file content."""
    # Find where profileData assignment starts
    match = re.search(r'export\s+const\s+profileData\s*:\s*Profile\s*=\s*\{', ts_content)
    if not match:
        raise ValueError("Could not find profileData assignment in TypeScript file")

    # Parse from the opening brace
    start = match.end() - 1  # position of the opening {
    data, _ = parse_ts_object(ts_content, start)
    return data


def convert_to_profile_json(profile_data: dict) -> dict:
    """Convert PortfolioWebsite profileData format to lobresume profile.json format."""
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
        # Convert description array format to flat bullets
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

        # Parse duration into start_date and end_date
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


def main():
    if not PROFILE_DATA_FILE.exists():
        print(f"Error: PortfolioWebsite profileData not found at {PROFILE_DATA_FILE}")
        print("Ensure the PortfolioWebsite repo is cloned at ~/source/PortfolioWebsite/")
        sys.exit(1)

    ts_content = PROFILE_DATA_FILE.read_text(encoding="utf-8")

    try:
        profile_data = extract_profile_data(ts_content)
    except ValueError as e:
        print(f"Error parsing profileData.ts: {e}")
        sys.exit(1)

    profile_json = convert_to_profile_json(profile_data)

    # Validate basic structure
    if not profile_json.get("name"):
        print("Error: profile has no name")
        sys.exit(1)
    if not profile_json.get("email"):
        print("Error: profile has no email")
        sys.exit(1)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(profile_json, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Synced profile: {PROFILE_DATA_FILE} -> {OUTPUT_FILE}")
    print(f"  Name: {profile_json['name']}")
    print(f"  Skills: {len(profile_json.get('skills', []))}")
    print(f"  Work history entries: {len(profile_json.get('work_history', []))}")
    print(f"  Education entries: {len(profile_json.get('education', []))}")


if __name__ == "__main__":
    main()