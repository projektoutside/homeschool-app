[CmdletBinding()]
param(
    [string]$BundlePath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'android\app\build\outputs\bundle\release\app-release.aab')
)

$ErrorActionPreference = 'Stop'
$resolvedBundlePath = (Resolve-Path -LiteralPath $BundlePath).Path
Add-Type -AssemblyName System.IO.Compression.FileSystem

$expectedAnimalImageCount = 100
$repoRoot = Split-Path -Parent $PSScriptRoot
$animalDataPath = Join-Path $repoRoot 'public\Games\Animal Champion\js\animal-data.js'
$animalDataSource = Get-Content -LiteralPath $animalDataPath -Raw
$animalImageMatches = [regex]::Matches(
    $animalDataSource,
    '["''](?<path>Animals/[^"'']+\.webp)["'']'
)
$animalImagePaths = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($match in $animalImageMatches) {
    [void]$animalImagePaths.Add($match.Groups['path'].Value)
}

if ($animalImageMatches.Count -ne $expectedAnimalImageCount -or $animalImagePaths.Count -ne $expectedAnimalImageCount) {
    throw "Animal Champion animal-data.js must contain exactly $expectedAnimalImageCount ordinal-unique quoted Animals/*.webp paths (matches: $($animalImageMatches.Count); unique: $($animalImagePaths.Count))."
}

$requiredAnimalEntries = @(
    'game_assets/assets/Games/Animal Champion/index.html',
    'game_assets/assets/Games/Animal Champion/css/style.css',
    'game_assets/assets/Games/Animal Champion/js/animal-data.js',
    'game_assets/assets/Games/Animal Champion/js/game-engine.js',
    'game_assets/assets/Games/Animal Champion/js/game.js',
    'game_assets/assets/Games/Animal Champion/assets/images/ui/menu-wallpaper.webp',
    'game_assets/assets/Games/Animal Champion/assets/images/ui/thumb.webp',
    'game_assets/assets/Games/shared/lahsPointsBridge.js',
    'base/assets/public/assets/thumbnails/optimized/animal-champion-128.webp'
)
foreach ($animalImagePath in $animalImagePaths) {
    $requiredAnimalEntries += "game_assets/assets/Games/Animal Champion/$animalImagePath"
}

$moduleSizes = @{}
$archiveEntryNames = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$archive = [IO.Compression.ZipFile]::OpenRead($resolvedBundlePath)
try {
    foreach ($entry in $archive.Entries) {
        [void]$archiveEntryNames.Add($entry.FullName)
        $moduleName = ($entry.FullName -split '/', 2)[0]
        if (-not $moduleName) { continue }
        if (-not $moduleSizes.ContainsKey($moduleName)) { $moduleSizes[$moduleName] = [long]0 }
        $moduleSizes[$moduleName] += [long]$entry.CompressedLength
    }
}
finally {
    $archive.Dispose()
}

foreach ($requiredModule in @('base', 'game_assets')) {
    if (-not $moduleSizes.ContainsKey($requiredModule)) {
        throw "Android bundle is missing required module: $requiredModule"
    }
}

if ($moduleSizes['base'] -ge 500MB) {
    throw "Android base module is too large: $($moduleSizes['base']) bytes (limit: 500MB)."
}

[string[]]$missingAnimalEntries = @(
    $requiredAnimalEntries | Where-Object { -not $archiveEntryNames.Contains($_) }
)
[Array]::Sort($missingAnimalEntries, [StringComparer]::Ordinal)
if ($missingAnimalEntries.Count -gt 0) {
    throw "Android bundle is missing required Animal Champion entries:`n$($missingAnimalEntries -join "`n")"
}

$result = [ordered]@{
    bundlePath = $resolvedBundlePath
    bundleBytes = (Get-Item -LiteralPath $resolvedBundlePath).Length
    modules = [ordered]@{
        base = $moduleSizes['base']
        game_assets = $moduleSizes['game_assets']
    }
}

$result | ConvertTo-Json -Depth 3
