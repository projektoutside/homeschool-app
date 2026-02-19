param(
  [int]$Port = 5173
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$escapedRepoRoot = $repoRoot -replace "'", "''"

function Wait-PortReady {
  param(
    [int]$TargetPort,
    [int]$TimeoutSeconds = 120
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
      $client.Connect('127.0.0.1', $TargetPort)
      if ($client.Connected) {
        $client.Close()
        return $true
      }
    } catch {
      # Keep polling until timeout.
    } finally {
      $client.Dispose()
    }
    Start-Sleep -Milliseconds 800
  }

  return $false
}

function Get-ListeningPid {
  param(
    [int]$TargetPort
  )

  $match = netstat -ano | Select-String -Pattern ":$TargetPort\s+.*LISTENING" | Select-Object -First 1
  if (-not $match) { return $null }
  $pidText = ($match -split '\s+')[-1]
  if (-not $pidText) { return $null }
  return [int]$pidText
}

function Get-NgrokTunnelForPort {
  param(
    [int]$TargetPort
  )

  try {
    $response = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -TimeoutSec 2
    return $response.tunnels |
      Where-Object { $_.proto -eq 'https' -and $_.config.addr -eq "http://localhost:$TargetPort" } |
      Select-Object -First 1
  } catch {
    return $null
  }
}

function Get-NgrokPublicUrl {
  param(
    [int]$TargetPort,
    [int]$TimeoutSeconds = 25
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $tunnel = Get-NgrokTunnelForPort -TargetPort $TargetPort
    if ($tunnel -and $tunnel.public_url) {
      return $tunnel.public_url
    }
    Start-Sleep -Milliseconds 800
  }
  return $null
}

$ngrokCheck = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokCheck) {
  Write-Error "ngrok is not installed or not on PATH. Install with: winget install -e --id Ngrok.Ngrok --source winget"
}

$vitePid = Get-ListeningPid -TargetPort $Port
if (-not $vitePid) {
  $devCommand = "Set-Location '$escapedRepoRoot'; npm run dev:live"
  Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-Command", $devCommand) | Out-Null

  if (-not (Wait-PortReady -TargetPort $Port)) {
    Write-Error "Vite dev server did not become reachable on http://127.0.0.1:$Port. Check the dev terminal window."
  }
  $vitePid = Get-ListeningPid -TargetPort $Port
} else {
  Write-Host "Detected existing app server on port $Port (PID $vitePid). Reusing it."
}

$existingTunnel = Get-NgrokTunnelForPort -TargetPort $Port
$ngrokProcess = Get-Process ngrok -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $existingTunnel) {
  $ngrokProcess = Start-Process -FilePath "ngrok" -ArgumentList @("http", "http://localhost:$Port") -PassThru -WindowStyle Hidden
}

$publicUrl = Get-NgrokPublicUrl -TargetPort $Port

Write-Host ""
Write-Host "Vite PID : $vitePid"
if ($ngrokProcess) {
  Write-Host "ngrok PID: $($ngrokProcess.Id)"
}
if ($publicUrl) {
  Write-Host "Live URL : $publicUrl"
  Write-Host "Use this URL on any external device/network."
} else {
  Write-Warning "ngrok started but the public URL was not auto-detected. Open http://127.0.0.1:4040/status to inspect tunnels."
}
Write-Host ""
Write-Host "To stop both processes later:"
if ($ngrokProcess) {
  Write-Host "Stop-Process -Id $vitePid,$($ngrokProcess.Id)"
} else {
  Write-Host "Stop-Process -Id $vitePid"
}
