# Scripts Folder

Utility scripts for the project.

## Available Scripts

### `tailor-resume.ps1` (PowerShell)
Wrapper script for the resume tailoring CLI tool.

**Usage:**
```powershell
.\scripts\tailor-resume.ps1 -JobFile "path\to\job.txt" -JobTitle "Job Title" -Company "Company Name"
```

**Parameters:**
- `JobFile` (required): Path to job posting text file
- `JobTitle` (required): Target job title
- `Company` (required): Company name
- `Output` (optional): Output filename (default: `generated/resume.html`)

**What it does:**
1. Builds the resume CLI tool
2. Creates the `generated/` folder if it doesn't exist
3. Runs the resume tailor with your parameters
4. Outputs a tailored HTML resume to the `generated/` folder

See [src/resume/README.md](../src/resume/README.md) for more details on the resume tool.
