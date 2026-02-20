$f = "c:\Users\xator\Desktop\ONLYGITHUBMAIN\La's Homeschool\public\HomePageAPP\index.html"
$lines = [System.IO.File]::ReadAllLines($f)
Write-Host ("Total lines: " + $lines.Count)
$pattern = 'prop-preview-panel \{|\.prop-preview-panel\s*\{|\.preview-viewport\s*\{|\.preview-header\s*\{|\.preview-subtitle\s*\{|\.preview-actions\s*\{|preview-apply-btn|\.preview-title\s*\{|\.preview-close|previewStageShadow|previewStageRing|function resizePropViewport|function placeObjectInPreview|function setPreviewCamera|function updatePreviewStage'
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match $pattern) {
        Write-Host ($i.ToString() + ": " + $lines[$i])
    }
}
