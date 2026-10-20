$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$serverDir = Join-Path $repoRoot 'server'
$runtimeDir = Join-Path $PSScriptRoot '.runtime'
$envPath = Join-Path $serverDir '.env.internal-test'
if (-not (Test-Path -LiteralPath $envPath)) { throw 'Internal-test environment file is missing.' }
if (Test-Path -LiteralPath (Join-Path $runtimeDir 'server.pid.json')) { throw 'Stop the production-mode internal server before running integration tests.' }
if (Get-NetTCPConnection -State Listen -LocalPort 3101 -ErrorAction SilentlyContinue) { throw 'Port 3101 is already in use.' }

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
foreach ($name in @('DATABASE_URL', 'DB_ALLOW_PUBLIC_KEY_RETRIEVAL', 'JWT_SECRET', 'FRONTEND_URL', 'HOST', 'PORT', 'NODE_ENV', 'ALLOW_SELF_REGISTRATION')) {
  Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue
}
$env:DOTENV_CONFIG_PATH = $envPath
$env:NODE_ENV = 'development'
$env:ALLOW_SELF_REGISTRATION = 'true'
$env:TEST_BASE_URL = 'http://127.0.0.1:3101'
$api = $null
$locationPushed = $false

try {
  $api = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList 'src/server.js' -WorkingDirectory $serverDir -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDir 'integration-server.out.log') -RedirectStandardError (Join-Path $runtimeDir 'integration-server.err.log')
  $ready = $false
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    if ($api.HasExited) { throw "Internal API exited. Check logs in $runtimeDir" }
    try {
      $health = Invoke-WebRequest -Uri "$($env:TEST_BASE_URL)/api/health" -UseBasicParsing -TimeoutSec 2
      if ($health.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
  }
  if (-not $ready) { throw "Internal API did not start. Check logs in $runtimeDir" }

  Push-Location $serverDir
  $locationPushed = $true
  npm run test:wallet-quiz
  if ($LASTEXITCODE -ne 0) { throw 'test:wallet-quiz failed.' }
  npm run test:player
  if ($LASTEXITCODE -ne 0) { throw 'test:player failed.' }
  Write-Output 'Both integration suites passed against the isolated internal-test database.'
} finally {
  if ($locationPushed) { Pop-Location }
  if ($api) { Stop-Process -Id $api.Id -Force -ErrorAction SilentlyContinue }
}
