# Script to push changes to GitHub
# Navigate to the project directory
Set-Location "C:\Users\xator\Desktop\ReworkingGitHubRepos\La's Homeschool"

# Check git status
Write-Host "Checking git status..." -ForegroundColor Cyan
git status

# Add all changes
Write-Host "`nStaging all files..." -ForegroundColor Cyan
git add .

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Host "`nCreating commit..." -ForegroundColor Cyan
    git commit -m "Update project files"
    
    Write-Host "`nPushing to GitHub..." -ForegroundColor Cyan
    git push -u origin main
    
    Write-Host "`n✓ Successfully pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "`nNo changes to commit. Everything is up to date." -ForegroundColor Yellow
}
