param(
  [Parameter(Mandatory = $false)]
  [string]$EntryBudgetKb = "40",

  [Parameter(Mandatory = $false)]
  [string]$TotalBudgetKb = "420"
)

$ErrorActionPreference = "Stop"
$env:QA_ENTRY_BUNDLE_MAX_KB = $EntryBudgetKb
$env:QA_TOTAL_BUNDLE_MAX_KB = $TotalBudgetKb

npm run qa:gates
