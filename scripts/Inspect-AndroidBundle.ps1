[CmdletBinding()]
param(
    [string]$BundlePath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'android\app\build\outputs\bundle\release\app-release.aab'),
    [string]$BundletoolPath = $env:BUNDLETOOL_JAR,
    [switch]$SkipDeliveryMetadataCheck
)

$ErrorActionPreference = 'Stop'
$resolvedBundlePath = (Resolve-Path -LiteralPath $BundlePath).Path
Add-Type -AssemblyName System.IO.Compression.FileSystem

$expectedAnimalImageCount = 100
$expectedAnimalVoiceCount = 154
$repoRoot = Split-Path -Parent $PSScriptRoot
$animalDataPath = Join-Path $repoRoot 'public\Games\Animal Champion\js\animal-data.js'
$animalVoiceLedgerPath = Join-Path $repoRoot 'public\Games\Animal Champion\assets\audio\voice\voice-ledger.json'
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

$animalVoiceLedger = Get-Content -LiteralPath $animalVoiceLedgerPath -Raw | ConvertFrom-Json
$animalVoicePaths = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($clip in $animalVoiceLedger.clips) {
    $voicePath = [string]$clip.path
    if ($voicePath -notmatch '^assets/audio/voice/[a-z0-9/-]+\.mp3$') {
        throw "Animal Champion voice ledger contains an invalid MP3 path: $voicePath"
    }
    [void]$animalVoicePaths.Add($voicePath)
}

if ($animalVoiceLedger.clipCount -ne $expectedAnimalVoiceCount -or $animalVoiceLedger.clips.Count -ne $expectedAnimalVoiceCount -or $animalVoicePaths.Count -ne $expectedAnimalVoiceCount) {
    throw "Animal Champion voice ledger must contain exactly $expectedAnimalVoiceCount ordinal-unique MP3 paths (declared: $($animalVoiceLedger.clipCount); clips: $($animalVoiceLedger.clips.Count); unique: $($animalVoicePaths.Count))."
}

$requiredAnimalEntries = @(
    'game_assets/assets/Games/Animal Champion/index.html',
    'game_assets/assets/Games/Animal Champion/css/style.css',
    'game_assets/assets/Games/Animal Champion/js/animal-data.js',
    'game_assets/assets/Games/Animal Champion/js/animal-speech.js',
    'game_assets/assets/Games/Animal Champion/js/audio-system.js',
    'game_assets/assets/Games/Animal Champion/js/game-engine.js',
    'game_assets/assets/Games/Animal Champion/js/game.js',
    'game_assets/assets/Games/Animal Champion/js/voice-manifest.js',
    'game_assets/assets/Games/Animal Champion/assets/audio/voice/voice-ledger.json',
    'game_assets/assets/Games/Animal Champion/assets/images/ui/menu-wallpaper.webp',
    'game_assets/assets/Games/Animal Champion/assets/images/ui/thumb.webp',
    'game_assets/assets/Games/shared/lahsPointsBridge.js',
    'base/assets/public/assets/thumbnails/optimized/animal-champion-128.webp'
)
foreach ($animalImagePath in $animalImagePaths) {
    $requiredAnimalEntries += "game_assets/assets/Games/Animal Champion/$animalImagePath"
}
foreach ($animalVoicePath in $animalVoicePaths) {
    $requiredAnimalEntries += "game_assets/assets/Games/Animal Champion/$animalVoicePath"
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

if (-not $SkipDeliveryMetadataCheck -and -not $BundletoolPath) {
    $knownBundletoolPaths = @(
        (Join-Path $env:TEMP 'codex-bundletool-1.18.3\bundletool-all-1.18.3.jar'),
        (Join-Path $env:TEMP 'bundletool-all-1.18.1.jar')
    )
    $BundletoolPath = $knownBundletoolPaths |
        Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
        Select-Object -First 1
}

if (-not $SkipDeliveryMetadataCheck -and -not $BundletoolPath) {
    $BundletoolPath = Get-ChildItem -Path $env:TEMP -Recurse -Filter 'bundletool-all-*.jar' -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}

if (-not $SkipDeliveryMetadataCheck -and (-not $BundletoolPath -or -not (Test-Path -LiteralPath $BundletoolPath -PathType Leaf))) {
    throw 'Bundletool is required to verify Play Asset Delivery metadata.'
}

if (-not $SkipDeliveryMetadataCheck) {
    $javaCandidates = @()
    if ($env:JAVA_HOME) {
        $javaCandidates += (Join-Path $env:JAVA_HOME 'bin\java.exe')
    }
    $javaCandidates += 'C:\Program Files\Android\Android Studio\jbr\bin\java.exe'
    $javaCommand = Get-Command java -ErrorAction SilentlyContinue
    if ($javaCommand) {
        $javaCandidates += $javaCommand.Source
    }
    $javaPath = $javaCandidates |
        Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } |
        Select-Object -First 1

    if (-not $javaPath) {
        throw 'Java is required to inspect Play Asset Delivery metadata.'
    }

    $resolvedBundletoolPath = (Resolve-Path -LiteralPath $BundletoolPath).Path
    $manifestDump = & $javaPath -jar $resolvedBundletoolPath dump manifest --bundle=$resolvedBundlePath --module=game_assets
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to inspect game_assets delivery metadata.'
    }
    $manifestText = $manifestDump -join [Environment]::NewLine
    if ($manifestText -notmatch '<dist:on-demand') {
        throw 'game_assets is not configured for dist:on-demand delivery in the final bundle.'
    }
}

$result = [ordered]@{
    bundlePath = $resolvedBundlePath
    bundleBytes = (Get-Item -LiteralPath $resolvedBundlePath).Length
    deliveryType = if ($SkipDeliveryMetadataCheck) { 'fixture-skipped' } else { 'on-demand' }
    modules = [ordered]@{
        base = $moduleSizes['base']
        game_assets = $moduleSizes['game_assets']
    }
}

$result | ConvertTo-Json -Depth 4
