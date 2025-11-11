#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Resume & Cover Letter Tailor CLI wrapper script
.DESCRIPTION
    Builds the resume tool and runs it with proper argument handling.
    Avoids npm's argument parsing issues.
    Now includes cover letter generation!
.PARAMETER JobFile
    Path to job posting text file (required)
.PARAMETER JobTitle
    Job title (required)
.PARAMETER Company
    Company name (required)
.PARAMETER Output
    Output filename (default: generated\resume.html)
.PARAMETER CoverLetterOnly
    Generate only a cover letter (no resume)
.PARAMETER NoCoverLetter
    Skip cover letter generation
.PARAMETER Tone
    Cover letter tone: professional, enthusiastic, conversational (default: professional)
.EXAMPLE
    .\tailor-resume.ps1 -JobFile "C:\path\to\job.txt" -JobTitle "Senior Engineer" -Company "Acme Corp"
.EXAMPLE
    .\tailor-resume.ps1 -JobFile "job.txt" -JobTitle "Staff Engineer" -Company "ClickUp" -CoverLetterOnly
.EXAMPLE
    .\tailor-resume.ps1 -JobFile "job.txt" -JobTitle "Staff Engineer" -Company "ClickUp" -Tone enthusiastic
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$JobFile,
    
    [Parameter(Mandatory=$true)]
    [string]$JobTitle,
    
    [Parameter(Mandatory=$true)]
    [string]$Company,
    
    [Parameter(Mandatory=$false)]
    [string]$Output = "generated\resume.html",
    
    [Parameter(Mandatory=$false)]
    [switch]$CoverLetterOnly,
    
    [Parameter(Mandatory=$false)]
    [switch]$NoCoverLetter,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('professional', 'enthusiastic', 'conversational')]
    [string]$Tone = 'professional'
)

# Build the resume tool
Write-Host "Building resume tool..." -ForegroundColor Cyan
npm run build
npx tsc -p src/resume/tsconfig.json

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Ensure generated folder exists
if (-not (Test-Path "generated")) {
    New-Item -ItemType Directory -Path "generated" | Out-Null
}

# Build the command arguments
$args = @(
    "--job-file", "$JobFile",
    "--job-title", "$JobTitle",
    "--company", "$Company",
    "--output", "$Output",
    "--tone", "$Tone"
)

if ($CoverLetterOnly) {
    $args += "--cover-letter-only"
}

if ($NoCoverLetter) {
    $args += "--no-cover-letter"
}

# Run the CLI with proper arguments
node dist/resume-cli/resume/cli/resumeTailor.js @args
