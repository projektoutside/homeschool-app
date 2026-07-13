[CmdletBinding()]
param(
    [string]$BundlePath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'android\app\build\outputs\bundle\release\app-release.aab'),
    [string]$BundletoolPath = $env:BUNDLETOOL_JAR
)

$ErrorActionPreference = 'Stop'
$resolvedBundlePath = (Resolve-Path -LiteralPath $BundlePath).Path
Add-Type -AssemblyName System.IO.Compression.FileSystem

$archive = [IO.Compression.ZipFile]::OpenRead($resolvedBundlePath)
try {
    $moduleSizes = @{}
    foreach ($entry in $archive.Entries) {
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

if (-not $BundletoolPath) {
    $knownBundletoolPaths = @(
        (Join-Path $env:TEMP 'codex-bundletool-1.18.3\bundletool-all-1.18.3.jar'),
        (Join-Path $env:TEMP 'bundletool-all-1.18.1.jar')
    )
    $BundletoolPath = $knownBundletoolPaths |
        Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
        Select-Object -First 1
}

if (-not $BundletoolPath) {
    $BundletoolPath = Get-ChildItem -Path $env:TEMP -Recurse -Filter 'bundletool-all-*.jar' -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}

if (-not $BundletoolPath -or -not (Test-Path -LiteralPath $BundletoolPath -PathType Leaf)) {
    throw 'Bundletool is required to verify Play Asset Delivery metadata.'
}

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

$result = [ordered]@{
    bundlePath = $resolvedBundlePath
    bundleBytes = (Get-Item -LiteralPath $resolvedBundlePath).Length
    deliveryType = 'on-demand'
    modules = [ordered]@{
        base = $moduleSizes['base']
        game_assets = $moduleSizes['game_assets']
    }
}

$result | ConvertTo-Json -Depth 4
