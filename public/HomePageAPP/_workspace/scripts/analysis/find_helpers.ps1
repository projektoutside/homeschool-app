$f = "c:\Users\xator\Desktop\ONLYGITHUBMAIN\La's Homeschool\public\HomePageAPP\index.html"
$lines = [System.IO.File]::ReadAllLines($f)
Write-Host ("Total lines: " + $lines.Count)
$pattern = 'function computeSafeObjectBounds|function computePreviewAutoFit|function getPreviewFitConfig|function computePreviewCameraDistance|PREVIEW_ITEM_FIT_OVERRIDES|function sanitizePreviewInvalid|function hasFiniteRenderableGeometry|function getFiniteSizeVector|function sanitizeFiniteNumber|function hasFiniteGeometry|previewState\s*=\s*\{'
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $pattern) {
        Write-Host ($i.ToString() + ": " + $lines[$i])
    }
}
