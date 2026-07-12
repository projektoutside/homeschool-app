[CmdletBinding()]
param(
    [string]$BundlePath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'android\app\build\outputs\bundle\release\app-release.aab')
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

$result = [ordered]@{
    bundlePath = $resolvedBundlePath
    bundleBytes = (Get-Item -LiteralPath $resolvedBundlePath).Length
    modules = [ordered]@{
        base = $moduleSizes['base']
        game_assets = $moduleSizes['game_assets']
    }
}

$result | ConvertTo-Json -Depth 3
