$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$serverDir = Join-Path $repoRoot 'server'
$envPath = Join-Path $serverDir '.env.internal-test'
if (-not (Test-Path -LiteralPath $envPath)) { throw 'Internal-test environment file is missing.' }

foreach ($name in @('DATABASE_URL', 'DB_ALLOW_PUBLIC_KEY_RETRIEVAL', 'JWT_SECRET', 'FRONTEND_URL', 'HOST', 'PORT', 'NODE_ENV', 'ALLOW_SELF_REGISTRATION')) {
  Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue
}
$env:DOTENV_CONFIG_PATH = $envPath
$originLine = Get-Content -LiteralPath $envPath | Where-Object { $_ -match '^FRONTEND_URL=' } | Select-Object -First 1
if (-not $originLine) { throw 'FRONTEND_URL is missing from internal-test environment file.' }
$env:TEST_BASE_URL = ($originLine -split '=', 2)[1].Trim('"')
if (-not $env:TEST_BASE_URL.StartsWith('https://')) { throw 'Internal-test FRONTEND_URL must use HTTPS.' }

Push-Location $serverDir
try {
  node scripts/create-internal-test-accounts.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Internal test account creation failed.' }
} finally {
  Pop-Location
}
