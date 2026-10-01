param(
    [string]$Token = "",
    [string]$ProjectRef = "zwpqneedroxllkdjohos"
)

if (-not $Token) {
    Write-Host "Usage: .\update-email-template.ps1 -Token 'sbp_your_token_here'" -ForegroundColor Yellow
    Write-Host "Get your Supabase Access Token from: https://supabase.com/dashboard/account/tokens" -ForegroundColor Cyan
    exit 1
}

$htmlPath = Join-Path $PSScriptRoot "supabase-email-template.html"
if (-not (Test-Path $htmlPath)) {
    Write-Host "Error: supabase-email-template.html not found!" -ForegroundColor Red
    exit 1
}

$htmlContent = Get-Content -Raw -Path $htmlPath -Encoding UTF8

$body = @{
    mailer_subjects_confirmation = "{{ .Token }} adalah kode verifikasi akun PlanCalender Anda"
    mailer_templates_confirmation_content = $htmlContent
} | ConvertTo-Json -Depth 5

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$url = "https://api.supabase.com/v1/projects/$ProjectRef/config/auth"

Write-Host "Updating Supabase Auth Email Template for project $ProjectRef..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $url -Method Patch -Headers $headers -Body $body
    Write-Host "SUCCESS! Template email Gmail di Supabase berhasil di-update langsung!" -ForegroundColor Green
    Write-Host "Subject: {{ .Token }} adalah kode verifikasi akun PlanCalender Anda" -ForegroundColor Green
} catch {
    Write-Host "Error updating Supabase template:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}
