#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Resume Tailor CLI wrapper script
.DESCRIPTION
    Builds the resume tool and runs it with proper argument handling.
    Avoids npm's argument parsing issues.
.PARAMETER JobFile
    Path to job posting text file (required)
.PARAMETER JobTitle
    Job title (required)
.PARAMETER Company
    Company name (required)
.PARAMETER Output
    Output filename (default: resume.html)
.EXAMPLE
    .\tailor-resume.ps1 -JobFile "C:\path\to\job.txt" -JobTitle "Senior Engineer" -Company "Acme Corp"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$JobFile,
    
    [Parameter(Mandatory=$true)]
    [string]$JobTitle,
    
    [Parameter(Mandatory=$true)]
    [string]$Company,
    
    [Parameter(Mandatory=$false)]
    [string]$Output = "generated\resume.html"
)

# Build the resume tool
Write-Host "Building resume tool..." -ForegroundColor Cyan
npm run resume:build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Ensure generated folder exists
if (-not (Test-Path "generated")) {
    New-Item -ItemType Directory -Path "generated" | Out-Null
}

# Run the CLI with proper arguments
node dist/resume-cli/resume/cli/resumeTailor.js `
    --job-file "$JobFile" `
    --job-title "$JobTitle" `
    --company "$Company" `
    --output "$Output"
