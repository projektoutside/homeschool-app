$f = "c:\Users\xator\Desktop\ONLYGITHUBMAIN\La's Homeschool\public\HomePageAPP\index.html"
$lines = [System.IO.File]::ReadAllLines($f)

function Show-Range($start, $end, $label) {
    Write-Host "=== $label (lines $start-$end) ==="
    for ($i = $start; $i -le $end; $i++) {
        Write-Host ($i.ToString() + ": " + $lines[$i])
    }
    Write-Host ""
}

# CSS prop-preview-panel block (line 1085 onwards - find end)
Show-Range 1085 1450 "CSS PROP-PREVIEW-PANEL"

# HTML section (around line 1648-1668)
Show-Range 1643 1670 "HTML PROP-PREVIEW-PANEL"

# JS setPreviewCameraForObjectMode and placeObjectInPreviewViewport (9036-9230)
Show-Range 9036 9230 "JS CAMERA+PLACE FUNCTIONS"
