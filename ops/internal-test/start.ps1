$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$serverDir = Join-Path $repoRoot 'server'
$runtimeDir = Join-Path $PSScriptRoot '.runtime'
$envPath = Join-Path $serverDir '.env.internal-test'

if (-not (Test-Path -LiteralPath $envPath)) { throw 'Run the internal-test database provisioning step first.' }
if (Test-Path -LiteralPath (Join-Path $runtimeDir 'server.pid.json')) { throw 'Internal server PID file already exists; run stop.ps1 or inspect the process.' }
if (Test-Path -LiteralPath (Join-Path $runtimeDir 'site.pid.json')) { throw 'Internal site PID file already exists; run stop.ps1 or inspect the process.' }
foreach ($port in @(3101, 4174)) {
  if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) { throw "Port $port is already in use." }
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$nodePath = (Get-Command node.exe).Source
$started = @()
$locationPushed = $false

try {
  Push-Location $repoRoot
  $locationPushed = $true
  $env:VITE_API_URL = '/api'
  $env:VITE_ENABLE_REGISTRATION = 'false'
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
  Pop-Location
  $locationPushed = $false

  foreach ($name in @('DATABASE_URL', 'DB_ALLOW_PUBLIC_KEY_RETRIEVAL', 'JWT_SECRET', 'FRONTEND_URL', 'HOST', 'PORT', 'NODE_ENV', 'ALLOW_SELF_REGISTRATION')) {
    Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue
  }
  $env:DOTENV_CONFIG_PATH = $envPath
  $api = Start-Process -FilePath $nodePath -ArgumentList 'src/server.js' -WorkingDirectory $serverDir -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDir 'server.out.log') -RedirectStandardError (Join-Path $runtimeDir 'server.err.log')
  $started += $api
  @{ pid = $api.Id; token = 'src/server.js' } | ConvertTo-Json -Compress | Set-Content -LiteralPath (Join-Path $runtimeDir 'server.pid.json') -Encoding utf8

  $site = Start-Process -FilePath $nodePath -ArgumentList 'ops/internal-test/site.mjs' -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDir 'site.out.log') -RedirectStandardError (Join-Path $runtimeDir 'site.err.log')
  $started += $site
  @{ pid = $site.Id; token = 'ops/internal-test/site.mjs' } | ConvertTo-Json -Compress | Set-Content -LiteralPath (Join-Path $runtimeDir 'site.pid.json') -Encoding utf8

  $ready = $false
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    if ($api.HasExited -or $site.HasExited) { throw "An internal service exited. Check logs in $runtimeDir" }
    try {
      $apiHealth = Invoke-WebRequest -Uri 'http://127.0.0.1:3101/api/health' -UseBasicParsing -TimeoutSec 2
      $siteHealth = Invoke-WebRequest -Uri 'http://127.0.0.1:4174/' -UseBasicParsing -TimeoutSec 2
      if ($apiHealth.StatusCode -eq 200 -and $siteHealth.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
  }
  if (-not $ready) { throw "Services did not become ready. Check logs in $runtimeDir" }
  Write-Output 'Internal API and site are running on localhost; Tailscale Serve can expose HTTPS port 8443 to the tailnet.'
} catch {
  if ($locationPushed) { Pop-Location }
  foreach ($process in $started) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
  Remove-Item -LiteralPath (Join-Path $runtimeDir 'server.pid.json'),(Join-Path $runtimeDir 'site.pid.json') -Force -ErrorAction SilentlyContinue
  throw
}
