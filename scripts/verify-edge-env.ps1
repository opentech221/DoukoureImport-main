param(
  [Parameter(Mandatory = $false)]
  [string]$ProjectRef = ""
)

$ErrorActionPreference = "Stop"

function Write-Status {
  param(
    [string]$Label,
    [string]$Value,
    [string]$Color = "Cyan"
  )
  Write-Host ("{0,-40} {1}" -f $Label, $Value) -ForegroundColor $Color
}

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Error "Supabase CLI introuvable dans PATH."
}

$requiredVars = @(
  "ADMIN_API_TOKEN",
  "APP_PUBLIC_BASE_URL"
)

$providerVarGroups = @(
  @("WAVE_API_URL", "WAVE_SANDBOX_API_URL"),
  @("WAVE_API_KEY", "WAVE_SANDBOX_API_KEY"),
  @("WAVE_WEBHOOK_SECRET", "WAVE_SANDBOX_WEBHOOK_SECRET"),
  @("ORANGE_API_URL", "ORANGE_SANDBOX_API_URL"),
  @("ORANGE_API_KEY", "ORANGE_SANDBOX_API_KEY"),
  @("ORANGE_WEBHOOK_SECRET", "ORANGE_SANDBOX_WEBHOOK_SECRET")
)

$secretListParameters = @("secrets", "list", "--output", "json")
if ($ProjectRef -and $ProjectRef.Trim().Length -gt 0) {
  $secretListParameters += @("--project-ref", $ProjectRef)
}

Write-Host "== Verification des secrets Edge Supabase ==" -ForegroundColor Green
$raw = & supabase @secretListParameters
if (-not $raw) {
  Write-Error "Impossible de lire les secrets Supabase (sortie vide)."
}

$parsed = $raw | ConvertFrom-Json
$names = @{}
foreach ($item in $parsed) {
  if ($item.name) {
    $names[$item.name] = $true
  }
}

$missing = @()
foreach ($varName in $requiredVars) {
  if ($names.ContainsKey($varName)) {
    Write-Status $varName "OK" "Green"
  } else {
    Write-Status $varName "MISSING" "Yellow"
    $missing += $varName
  }
}

foreach ($group in $providerVarGroups) {
  $present = $group | Where-Object { $names.ContainsKey($_) }
  $label = ($group -join " | ")
  if ($present.Count -gt 0) {
    Write-Status $label ("OK ({0})" -f ($present -join ", ")) "Green"
  } else {
    Write-Status $label "MISSING" "Yellow"
    $missing += $group[0]
  }
}

Write-Host ""
if ($missing.Count -eq 0) {
  Write-Host "Resultat: toutes les variables Edge requises sont configurees." -ForegroundColor Green
  exit 0
}

Write-Host "Resultat: variables manquantes detectees." -ForegroundColor Yellow
Write-Host "Commande type pour les configurer:" -ForegroundColor Yellow
$setPairs = $missing | ForEach-Object { "$_=__A_COMPLETER__" }
if ($ProjectRef -and $ProjectRef.Trim().Length -gt 0) {
  Write-Host ("supabase secrets set {0} --project-ref {1}" -f ($setPairs -join " "), $ProjectRef)
} else {
  Write-Host ("supabase secrets set {0}" -f ($setPairs -join " "))
}
exit 2
