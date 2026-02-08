# Scan HTML for sidebar and legacy panel references
$htmlPath = "c:\Users\xator\Desktop\ALL TEMPLATES\PolygonAPPtemplates\Gamepolygon\workingtutorial2 - Copy\index.html"
$content = Get-Content $htmlPath -Raw

# Find body tag and its content
if ($content -match '(?s)<body[^>]*>(.*?)</body>') {
    $bodyContent = $matches[1]
    
    # Look for div elements with IDs that might be panels
    $divMatches = [regex]::Matches($bodyContent, '<div[^>]+id="([^"]+)"[^>]*>')
    
    Write-Host "=== Found DIV IDs in BODY ===" -ForegroundColor Cyan
    foreach ($match in $divMatches) {
        Write-Host $match.Groups[1].Value
    }
    
    Write-Host "`n=== Searching for 'Learn' references ===" -ForegroundColor Yellow
    $learnMatches = [regex]::Matches($content, '(?i)[^>]*learn[^<]*', [System.Text.RegularExpressions.RegexOptions]::Multiline)
    foreach ($match in $learnMatches | Select-Object -First 10) {
        Write-Host $match.Value.Trim()
    }
    
    Write-Host "`n=== Searching for 'Playground' references ===" -ForegroundColor Yellow
    $playgroundMatches = [regex]::Matches($content, '(?i)[^>]*playground[^<]*', [System.Text.RegularExpressions.RegexOptions]::Multiline)
    foreach ($match in $playgroundMatches | Select-Object -First 10) {
        Write-Host $match.Value.Trim()
    }
}
