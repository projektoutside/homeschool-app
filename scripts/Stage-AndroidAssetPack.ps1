[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$baseAssetsRoot = Join-Path $repoRoot 'android\app\src\main\assets\public'
$packAssetsRoot = Join-Path $repoRoot 'android\game_assets\src\main\assets'
$manifestPath = Join-Path $packAssetsRoot 'asset-pack-sizes.json'
$assetDirectories = @(
    'Games',
    'HomePageAPP',
    'PolygonAPP',
    '3dClass',
    'Worksheets',
    'FinalGraph',
    'MathWorksheetCreator'
)

$resolvedRepoRoot = (Resolve-Path -LiteralPath $repoRoot).Path
$resolvedBaseAssetsRoot = (Resolve-Path -LiteralPath $baseAssetsRoot).Path
if (-not $resolvedBaseAssetsRoot.StartsWith($resolvedRepoRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to stage assets from outside the repository: $resolvedBaseAssetsRoot"
}

$expectedPackRoot = [IO.Path]::GetFullPath((Join-Path $resolvedRepoRoot 'android\game_assets\src\main\assets'))
if ([IO.Path]::GetFullPath($packAssetsRoot) -ne $expectedPackRoot) {
    throw 'Refusing to stage outside the game asset pack.'
}
New-Item -ItemType Directory -Path $packAssetsRoot -Force | Out-Null
$resolvedPackRoot = (Resolve-Path -LiteralPath $packAssetsRoot).Path
if ($resolvedPackRoot -ne $expectedPackRoot) { throw 'Unexpected asset-pack destination.' }
Get-ChildItem -LiteralPath $packAssetsRoot -Force |
    Where-Object { $_.Name -ne '.gitkeep' } |
    ForEach-Object {
        if ($_.LinkType -or -not $_.FullName.StartsWith($resolvedPackRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
            throw 'Refusing to delete an asset-pack path outside its verified destination.'
        }
        Remove-Item -LiteralPath $_.FullName -Recurse -Force
    }

$sizes = [ordered]@{}
foreach ($directory in $assetDirectories) {
    $sourcePath = Join-Path $resolvedBaseAssetsRoot $directory
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Container)) {
        throw "Required Android asset directory is missing: $sourcePath"
    }

    $resolvedSource = (Resolve-Path -LiteralPath $sourcePath).Path
    $resolvedDestination = [IO.Path]::GetFullPath((Join-Path $resolvedPackRoot $directory))
    if ((Get-Item -LiteralPath $sourcePath).LinkType -or
        -not $resolvedSource.StartsWith($resolvedBaseAssetsRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or
        -not $resolvedDestination.StartsWith($resolvedPackRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Refusing to move assets outside verified staging roots.'
    }
    $sizeBytes = (Get-ChildItem -LiteralPath $sourcePath -Recurse -File | Measure-Object Length -Sum).Sum
    $sizes[$directory] = [long]$sizeBytes
    Move-Item -LiteralPath $sourcePath -Destination $packAssetsRoot
}

[ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    totalBytes = [long](($sizes.Values | Measure-Object -Sum).Sum)
    directories = $sizes
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $manifestPath -Encoding utf8

Write-Host "Play Asset Delivery pack staged: $manifestPath"
