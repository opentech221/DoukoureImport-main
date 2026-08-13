param(
  [Parameter(Mandatory = $false)]
  [string]$DatabaseUrl = "",

  [Parameter(Mandatory = $false)]
  [string]$SqlFile = "scripts/sql/rls-go-live-gate.sql"
)

$ErrorActionPreference = "Stop"

if (-not $DatabaseUrl) {
  $DatabaseUrl = $env:DATABASE_URL
}

if (-not $DatabaseUrl) {
  Write-Host "DATABASE_URL non fourni. Passez -DatabaseUrl ou définissez la variable d'environnement DATABASE_URL." -ForegroundColor Yellow
  exit 2
}

if (-not (Test-Path -Path $SqlFile)) {
  Write-Host "Fichier SQL introuvable: $SqlFile" -ForegroundColor Red
  exit 2
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  Write-Host "psql introuvable dans PATH. Installez PostgreSQL client ou exécutez dans un environnement CI avec psql." -ForegroundColor Red
  exit 2
}

Write-Host "== RLS Go-Live Gate ==" -ForegroundColor Green
Write-Host "SQL file: $SqlFile"

$raw = & psql "$DatabaseUrl" -X -v ON_ERROR_STOP=1 -t -A -F "|" -f "$SqlFile"
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  Write-Host "Exécution SQL échouée (exit code $exitCode)." -ForegroundColor Red
  exit $exitCode
}

$rows = @()
if ($raw) {
  $rows = ($raw -split "`n") | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
}

if ($rows.Count -eq 0) {
  Write-Host "PASS: aucun blocage RLS détecté." -ForegroundColor Green
  exit 0
}

Write-Host "FAIL: blocages RLS détectés ($($rows.Count))." -ForegroundColor Red
Write-Host "table_name|issue|detail" -ForegroundColor Yellow
$rows | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
exit 1
