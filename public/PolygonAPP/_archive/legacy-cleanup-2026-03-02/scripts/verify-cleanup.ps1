# Verification Script - Check for Legacy Panel References
$htmlPath = "index.html"
$content = Get-Content $htmlPath -Raw

Write-Host "=== VERIFICATION: Checking for Legacy Panel References ===" -ForegroundColor Cyan

$errors = @()
$warnings = @()

# Check for removed HTML elements
Write-Host "`n[1] Checking for removed HTML elements..." -ForegroundColor Yellow
if ($content -match 'layersPanel') {
    $errors += "Found layersPanel reference"
}
if ($content -match 'layersList') {
    $errors += "Found layersList reference"
}
if ($content -match 'visualizersBackBtn') {
    $errors += "Found visualizersBackBtn reference"
}
if ($content -match 'layersBackBtn') {
    $errors += "Found layersBackBtn reference"
}

# Check for removed CSS classes
Write-Host "[2] Checking for removed CSS classes..." -ForegroundColor Yellow
if ($content -match '\.layer-item') {
    $errors += "Found .layer-item CSS"
}
if ($content -match '\.viz-item') {
    $errors += "Found .viz-item CSS"
}

# Check for removed JavaScript functions
Write-Host "[3] Checking for removed JavaScript functions..." -ForegroundColor Yellow
if ($content -match 'function setupMobileMenus') {
    $errors += "Found setupMobileMenus function"
}
if ($content -match 'function setupPanelBackButtons') {
    $errors += "Found setupPanelBackButtons function"
}

# Count remaining lines  
$lineCount = ($content -split "`n").Count
$fileSize = [math]::Round((Get-Item $htmlPath).Length / 1KB, 2)
Write-Host "`n[4] File Statistics:" -ForegroundColor Yellow
Write-Host "   Total Lines: $lineCount"
Write-Host "   File Size: $fileSize KB"

# Report results
Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan
if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✓ ALL CHECKS PASSED - No legacy panel references found!" -ForegroundColor Green
}
else {
    if ($errors.Count -gt 0) {
        Write-Host "`n❌ ERRORS FOUND:" -ForegroundColor Red
        $errors | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    }
    if ($warnings.Count -gt 0) {
        Write-Host "`n⚠️ WARNINGS:" -ForegroundColor Yellow
        $warnings | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
    }
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Green
Write-Host "Please test in browser to verify:" -ForegroundColor Gray
Write-Host "  1. Open index.html in your browser" -ForegroundColor Gray
Write-Host "  2. Use browser dev tools to resize to tablet landscape (e.g., 1024x768)" -ForegroundColor Gray
Write-Host "  3. Verify NO sidebars appear on left or right" -ForegroundColor Gray
Write-Host "  4. Test gameplay features (split, combine, undo, redo)" -ForegroundColor Gray
Write-Host "  5. Test audio settings" -ForegroundColor Gray
