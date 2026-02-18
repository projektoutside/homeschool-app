$f = "c:\Users\xator\Desktop\ONLYGITHUBMAIN\La's Homeschool\public\HomePageAPP\index.html"
$lines = [System.IO.File]::ReadAllLines($f)

function Show-Range($start, $end, $label) {
    Write-Host "=== $label (lines $start-$end) ==="
    for ($i = $start; $i -le $end; $i++) {
        Write-Host ($i.ToString() + ": " + $lines[$i])
    }
    Write-Host ""
}

Show-Range 7012 7100 "previewState + PREVIEW_ITEM_FIT_OVERRIDES start"
Show-Range 7031 7110 "PREVIEW_ITEM_FIT_OVERRIDES"
Show-Range 8440 8530 "computeSafeObjectBounds"
Show-Range 8876 8960 "getFiniteSizeVector + getPreviewFitConfig"
Show-Range 8964 9036 "computePreviewCameraDistanceForScale + computePreviewAutoFit"
