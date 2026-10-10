# Verno AI Development Studio Launcher
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backendDir = Join-Path $root "backend"
$ideDir = Join-Path $root "ide"
$extDir = Join-Path $root "verno-extension"
$workspaceDir = Join-Path $root "workspace"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Starting Verno AI Software Development Studio...      " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if backend is running on port 8000
$portActive = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
if ($portActive) {
    Write-Host "[OK] Verno Backend is running on port 8000." -ForegroundColor Green
} else {
    Write-Host "[*] Starting Verno Multi-Agent Backend on http://127.0.0.1:8000..." -ForegroundColor Yellow
    Start-Process -FilePath "python" -ArgumentList "-m uvicorn main:app --host 127.0.0.1 --port 8000" -WorkingDirectory $backendDir -WindowStyle Minimized
    Start-Sleep -Seconds 2
}

# 2. Launch Verno Studio
$vernoExe = Join-Path $ideDir "Verno.exe"
if (-not (Test-Path $vernoExe)) {
    $vernoExe = Join-Path $ideDir "VSCodium.exe"
}

if (Test-Path $vernoExe) {
    Write-Host "[*] Launching Verno Studio IDE in $workspaceDir..." -ForegroundColor Green
    Start-Process -FilePath $vernoExe -ArgumentList "--extensionDevelopmentPath=`"$extDir`" `"$workspaceDir`""
} else {
    Write-Host "[ERROR] Verno executable not found in $ideDir." -ForegroundColor Red
}
