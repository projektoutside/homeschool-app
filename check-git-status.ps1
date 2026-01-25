# Git Status Checker Script
# This script helps diagnose git push issues

Write-Host "=== Git Status Checker ===" -ForegroundColor Cyan
Write-Host ""

# Navigate to project directory
$projectPath = "C:\Users\xator\Desktop\ReworkingGitHubRepos\La's Homeschool"
Set-Location $projectPath

# Check git status
Write-Host "1. Checking git status..." -ForegroundColor Yellow
git status

Write-Host "`n2. Checking remote configuration..." -ForegroundColor Yellow
git remote -v

Write-Host "`n3. Checking current branch..." -ForegroundColor Yellow
git branch --show-current

Write-Host "`n4. Checking if branch is tracking remote..." -ForegroundColor Yellow
git branch -vv

Write-Host "`n5. Checking for uncommitted changes..." -ForegroundColor Yellow
$uncommitted = git status --porcelain
if ($uncommitted) {
    Write-Host "Found uncommitted changes:" -ForegroundColor Red
    git status --short
} else {
    Write-Host "No uncommitted changes found." -ForegroundColor Green
}

Write-Host "`n6. Checking if local is ahead/behind remote..." -ForegroundColor Yellow
git fetch origin
$status = git status -sb
Write-Host $status

Write-Host "`n=== Diagnosis Complete ===" -ForegroundColor Cyan
Write-Host "`nCommon fixes:" -ForegroundColor Yellow
Write-Host "1. If you see uncommitted files, run: git add . && git commit -m 'Your message'"
Write-Host "2. If branch is not tracking, run: git push -u origin main"
Write-Host "3. If authentication fails, check your GitHub credentials"
Write-Host "4. If you're behind remote, run: git pull --rebase origin main"
