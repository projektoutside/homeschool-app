[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$credentialPath = Join-Path $env:USERPROFILE '.android\las-homeschool-upload-key-password.xml'
$keystorePath = Join-Path $env:USERPROFILE '.android\las-homeschool-upload-key.jks'
$bundlePath = Join-Path $repoRoot 'android\app\build\outputs\bundle\release\app-release.aab'

if (-not (Test-Path -LiteralPath $credentialPath)) {
    throw "Missing encrypted upload-key credential: $credentialPath"
}

if (-not (Test-Path -LiteralPath $keystorePath)) {
    throw "Missing upload keystore: $keystorePath"
}

$securePassword = Import-Clixml -LiteralPath $credentialPath
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $env:LAHS_UPLOAD_STORE_FILE = $keystorePath
    $env:LAHS_UPLOAD_STORE_PASSWORD = $plainPassword
    $env:LAHS_UPLOAD_KEY_ALIAS = 'las-homeschool-upload'
    $env:LAHS_UPLOAD_KEY_PASSWORD = $plainPassword

    Push-Location $repoRoot
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw 'Web production build failed.' }

        npx cap sync android
        if ($LASTEXITCODE -ne 0) { throw 'Capacitor Android sync failed.' }

        & (Join-Path $PSScriptRoot 'Stage-AndroidAssetPack.ps1')
        if ($LASTEXITCODE -ne 0) { throw 'Android asset-pack staging failed.' }

        Push-Location (Join-Path $repoRoot 'android')
        try {
            .\gradlew.bat bundleRelease
            if ($LASTEXITCODE -ne 0) { throw 'Android release bundle failed.' }
        }
        finally {
            Pop-Location
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    Remove-Item Env:LAHS_UPLOAD_STORE_FILE -ErrorAction SilentlyContinue
    Remove-Item Env:LAHS_UPLOAD_STORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:LAHS_UPLOAD_KEY_ALIAS -ErrorAction SilentlyContinue
    Remove-Item Env:LAHS_UPLOAD_KEY_PASSWORD -ErrorAction SilentlyContinue
}

if (-not (Test-Path -LiteralPath $bundlePath)) {
    throw "Android bundle was not created at $bundlePath"
}

& (Join-Path $PSScriptRoot 'Inspect-AndroidBundle.ps1') -BundlePath $bundlePath
if ($LASTEXITCODE -ne 0) { throw 'Android bundle inspection failed.' }

Write-Host "Android App Bundle ready: $bundlePath"
