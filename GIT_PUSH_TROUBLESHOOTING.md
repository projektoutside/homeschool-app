# Git Push Troubleshooting Guide

## Quick Fixes

### 1. **Stage and Commit All Changes**
If you have uncommitted files (like `FinalGraph` and `MathPuzzle`), you need to add and commit them:

```powershell
git add .
git commit -m "Add FinalGraph and MathPuzzle tools"
git push origin main
```

### 2. **Check Your Remote Configuration**
Verify your remote is set correctly:

```powershell
git remote -v
```

Should show something like:
```
origin  https://github.com/yourusername/your-repo.git (fetch)
origin  https://github.com/yourusername/your-repo.git (push)
```

If not configured, add it:
```powershell
git remote add origin https://github.com/yourusername/your-repo.git
```

### 3. **Authentication Issues**
GitHub no longer accepts passwords. You need either:

**Option A: Personal Access Token (PAT)**
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with `repo` permissions
3. Use the token as your password when pushing

**Option B: SSH Key**
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Add to GitHub: Settings → SSH and GPG keys
3. Change remote to SSH: `git remote set-url origin git@github.com:username/repo.git`

### 4. **Branch Name Mismatch**
If your local branch is different from remote:

```powershell
# Check current branch
git branch --show-current

# If you're on a different branch, either:
# Switch to main
git checkout main

# Or push your current branch
git push -u origin your-branch-name
```

### 5. **Local Behind Remote**
If remote has changes you don't have:

```powershell
# Pull first, then push
git pull origin main
git push origin main
```

### 6. **Large Files**
If you're trying to push large files (>100MB), GitHub will reject them. Check for large files:

```powershell
# Find large files
git ls-files | ForEach-Object { Get-Item $_ } | Where-Object { $_.Length -gt 50MB } | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB,2)}}
```

### 7. **Run the Diagnostic Script**
Use the provided `check-git-status.ps1` script to diagnose issues:

```powershell
.\check-git-status.ps1
```

## Step-by-Step Push Process

1. **Check status:**
   ```powershell
   git status
   ```

2. **Add all changes:**
   ```powershell
   git add .
   ```

3. **Commit changes:**
   ```powershell
   git commit -m "Add FinalGraph and MathPuzzle tools"
   ```

4. **Push to GitHub:**
   ```powershell
   git push origin main
   ```

   If first time or branch not tracking:
   ```powershell
   git push -u origin main
   ```

## Common Error Messages

### "fatal: The current branch has no upstream branch"
**Fix:** `git push -u origin main`

### "fatal: Authentication failed"
**Fix:** Set up PAT or SSH key (see #3 above)

### "error: failed to push some refs"
**Fix:** Pull first: `git pull --rebase origin main` then push again

### "error: RPC failed; HTTP 413"
**Fix:** You're pushing files too large. Use Git LFS or remove large files.

### "error: src refspec main does not match any"
**Fix:** You need to commit first: `git commit -m "Initial commit"`

## Using the Push Script

You can also use the existing `push-to-github.ps1` script:

```powershell
.\push-to-github.ps1
```

This script will:
- Check git status
- Stage all files
- Commit if there are changes
- Push to GitHub
