param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,

  [Parameter(Mandatory = $true)]
  [ValidateSet("wave", "orange")]
  [string]$Provider,

  [Parameter(Mandatory = $true)]
  [string]$OrderRef,

  [Parameter(Mandatory = $true)]
  [string]$WebhookSecret,

  [Parameter(Mandatory = $false)]
  [string]$IdempotencyKey = "",

  [Parameter(Mandatory = $false)]
  [switch]$RunDuplicateTest
)

$ErrorActionPreference = "Stop"

if (-not $IdempotencyKey -or $IdempotencyKey.Trim().Length -eq 0) {
  $IdempotencyKey = "idem-" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
}

$payloadObj = [ordered]@{
  orderRef = $OrderRef
  idempotencyKey = $IdempotencyKey
  providerReference = ("{0}-{1}" -f $Provider.ToUpper(), [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
  status = "CONFIRMED"
}
$payloadJson = $payloadObj | ConvertTo-Json -Compress

$hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($WebhookSecret))
$hashBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($payloadJson))
$signature = -join ($hashBytes | ForEach-Object { $_.ToString("x2") })

$endpoint = ($BaseUrl.TrimEnd("/")) + "/make-server-9c5a520a/payments/webhook/$Provider"
$headers = @{
  "Content-Type" = "application/json"
  "x-webhook-signature" = $signature
}

Write-Host "== Signed webhook E2E test ==" -ForegroundColor Green
Write-Host "Endpoint      : $endpoint"
Write-Host "Provider      : $Provider"
Write-Host "OrderRef      : $OrderRef"
Write-Host "IdempotencyKey: $IdempotencyKey"

try {
  $response = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body $payloadJson
  Write-Host "First call response:" -ForegroundColor Cyan
  $response | ConvertTo-Json -Depth 6

  if (-not $response.ok) {
    throw "First call returned ok=false"
  }

  if ($RunDuplicateTest) {
    $dup = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body $payloadJson
    Write-Host "Duplicate call response:" -ForegroundColor Cyan
    $dup | ConvertTo-Json -Depth 6

    if (-not $dup.ok) {
      throw "Duplicate call returned ok=false"
    }

    if ($dup.deduped -ne $true) {
      throw "Duplicate call should return deduped=true"
    }
  }

  Write-Host "Webhook test PASSED." -ForegroundColor Green
  exit 0
}
catch {
  Write-Host "Webhook test FAILED:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
