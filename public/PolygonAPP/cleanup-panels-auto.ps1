# Legacy Panel Cleanup Script
# This script removes the layers panel, visualizers panel, and related code

$htmlFile = "index.html"
$content = Get-Content $htmlFile -Raw

Write-Host "Starting Legacy Panel Cleanup..." -ForegroundColor Cyan

# Step 1: Remove setupMobileMenus function and its calls
Write-Host "`n[1/5] Removing setupMobileMenus function..." -ForegroundColor Yellow

# Remove the function definition (lines 8978-9024 based on our scans)
$content = $content -replace '(?s)// Add mobile menu buttons.*?function setupMobileMenus\(\) \{.*?\n\s+\}(?=\s*\n\s*//)', ''

# Remove function calls
$content = $content -replace 'setupMobileMenus\(\);', '// setupMobileMenus() removed'
$content = $content -replace "window\.addEventListener\('deviceResize', setupMobileMenus\);", "// deviceResize listener removed"
$content = $content -replace 'window\.addEventListener\(''resize'', \(\) => \{\s*clearTimeout\(window\.mobileMenuResizeTimeout\);.*?setupMobileMenus\(\);.*?\}\);', '// resize listener for mobile menus removed'
$content = $content -replace "window\.addEventListener\('orientationchange', \(\) => \{.*?setupMobileMenus\(\);.*?\}\);", "// orientationchange listener removed"

Write-Host "[OK] setupMobileMenus removed" -ForegroundColor Green

# Step 2: Remove layersPanel HTML
Write-Host "`n[2/5] Removing layersPanel HTML..." -ForegroundColor Yellow

# Find and remove the entire layersPanel div
$content = $content -replace '(?s)\s*<!--\s*Wrapper for Layers Panel.*?-->.*?<div class="resizable-panel" id="layersPanel".*?</div>\s*(?=\s*<!--\s*Right)', ''

Write-Host "[OK] layersPanel HTML removed" -ForegroundColor Green

# Step 3: Remove layer-related CSS
Write-Host "`n[3/5] Removing layer-related CSS..." -ForegroundColor Yellow

# Remove all .layer- CSS rules
$content = $content -replace '(?s)/\*\s*Layer.*?\*/.*?(\n\s*\.layer-[^\{]+\{[^\}]+\}\s*)+', ''

# Remove visualizer CSS
$content = $content -replace '(?s)/\*\s*Visualizer.*?\*/.*?(\n\s*\.viz[^\{]+\{[^\}]+\}\s*)+', ''

Write-Host "[OK] Layer CSS removed" -ForegroundColor Green

# Step 4: Remove setupResizablePanels references to layersPanel
Write-Host "`n[4/5] Cleaning up setupResizablePanels..." -ForegroundColor Yellow

# Comment out layersPanel references in setupResizablePanels
$content = $content -replace '(const layersPanel = )', '// $1'
$content = $content -replace '(if \(layersPanel\))', '// $1'
$content = $content -replace '(layersPanel\.style)', '// $1'

Write-Host "[OK] setupResizablePanels cleaned" -ForegroundColor Green

# Step 5: Save the cleaned file
Write-Host "`n[5/5] Saving cleaned file..." -ForegroundColor Yellow
$content | Set-Content $htmlFile -Encoding UTF8
Write-Host "[OK] File saved successfully!" -ForegroundColor Green

Write-Host "`n=== Cleanup Complete ===" -ForegroundColor Cyan
Write-Host "Backup file created at: index.html.backup_*" -ForegroundColor Gray
Write-Host "Please test the application to verify everything works." -ForegroundColor Gray
