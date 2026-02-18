param(
  [string]$ManifestPath = (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'image-manifest.json')
)

$root = Split-Path -Parent $ManifestPath
$manifest = Get-Content -Raw $ManifestPath -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
$count = 0

function New-ProjectFolder {
  param(
    [Parameter(Mandatory)]
    [string]$ImageFile,

    [Parameter(Mandatory)]
    [string]$Root
  )

  $base = [System.IO.Path]::GetFileNameWithoutExtension($ImageFile)
  if ([string]::IsNullOrWhiteSpace($base)) {
    return
  }

  $folder = Join-Path $Root $base
  New-Item -ItemType Directory -Path $folder -Force | Out-Null

  $indexPath = Join-Path $folder 'index.html'
  if (-not (Test-Path $indexPath)) {
    $safeTitle = ($base -replace '[_-]', ' ') -replace '\s+', ' '
    $title = $safeTitle.Trim()
    if ([string]::IsNullOrWhiteSpace($title)) { $title = $base }

    $template = @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>$title</title>
</head>
<body>
  <main style="font-family: Arial, Helvetica, sans-serif; max-width: 900px; margin: 20px auto;">
    <h1>$title</h1>
    <p>Drop your app files in this folder and keep your main entry file as <strong>index.html</strong>.</p>
    <a href="../index.html">Back to gallery</a>
  </main>
</body>
</html>
"@

    Set-Content -Path $indexPath -Value $template -NoNewline
  }
}

foreach ($entry in $manifest) {
  $file = if ($entry -is [string]) {
    $entry
  } elseif ($entry.PSObject.Properties['image']) {
    [string]$entry.image
  } else {
    ''
  }

  if ([string]::IsNullOrWhiteSpace($file)) { continue }
  if ($file -notmatch '\.[Pp][Nn][Gg]$') { continue }

  New-ProjectFolder -ImageFile $file -Root $root
  $count++
}

Write-Host "Folders synced: $count PNG entries."
