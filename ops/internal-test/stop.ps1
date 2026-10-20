$ErrorActionPreference = 'Stop'
$runtimeDir = Join-Path $PSScriptRoot '.runtime'

foreach ($name in @('site', 'server')) {
  $pidFile = Join-Path $runtimeDir "$name.pid.json"
  if (-not (Test-Path -LiteralPath $pidFile)) { continue }
  $entry = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.pid)" -ErrorAction SilentlyContinue
  if ($process -and $process.Name -eq 'node.exe' -and $process.CommandLine -and $process.CommandLine.Contains($entry.token)) {
    Stop-Process -Id $entry.pid -Force
  }
  Remove-Item -LiteralPath $pidFile -Force
}

Write-Output 'Internal application processes stopped. Tailscale Serve configuration is unchanged.'
