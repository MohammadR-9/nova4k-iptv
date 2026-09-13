# Samsung Tizen Packaging Script
Param(
    [string]$OutputDir = "build-tizen"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Samsung Tizen IPTV - Packaging .wgt   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Build Vite Production Web App
Write-Host "[1/3] Building Web Distribution..." -ForegroundColor Yellow
npm run build

if (-not (Test-Path "dist")) {
    Write-Error "Build failed! 'dist' directory not found."
    exit 1
}

# 2. Copy Tizen Config to dist
Write-Host "[2/3] Preparing Tizen Widget Files..." -ForegroundColor Yellow
Copy-Item -Path "config.xml" -Destination "dist/config.xml" -Force

if (Test-Path "icon.png") {
    Copy-Item -Path "icon.png" -Destination "dist/icon.png" -Force
}

# 3. Create .wgt Package
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$WgtFile = Join-Path $OutputDir "NOVA_4K_ULTRA.wgt"

if (Get-Command "tizen" -ErrorAction SilentlyContinue) {
    Write-Host "[3/3] Found Tizen CLI. Packaging with official Tizen tools..." -ForegroundColor Green
    tizen package -t wgt -s DefaultSecurityProfile -- "dist"
} else {
    Write-Host "[3/3] Packaging as standard Tizen .wgt archive..." -ForegroundColor Green
    $ZipFile = Join-Path $OutputDir "NOVA_4K_ULTRA.zip"
    if (Test-Path $ZipFile) { Remove-Item $ZipFile -Force }
    if (Test-Path $WgtFile) { Remove-Item $WgtFile -Force }
    Compress-Archive -Path "dist/*" -DestinationPath $ZipFile -Force
    Rename-Item -Path $ZipFile -NewName "NOVA_4K_ULTRA.wgt" -Force
}

if (Test-Path $WgtFile) {
    Copy-Item -Path $WgtFile -Destination "..\NOVA_4K_ULTRA.wgt" -Force
    Copy-Item -Path $WgtFile -Destination (Join-Path $OutputDir "TizenIPTVPro.wgt") -Force
    $wgtItem = Get-Item $WgtFile
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Samsung Tizen .wgt Package Created Successfully!" -ForegroundColor Green
    Write-Host "Location 1: $WgtFile" -ForegroundColor Cyan
    Write-Host "Location 2: ..\NOVA_4K_ULTRA.wgt" -ForegroundColor Cyan
    Write-Host "Size: $([math]::Round($wgtItem.Length / 1MB, 2)) MB" -ForegroundColor Cyan
    Write-Host "Ready for deployment via Tizen Studio, USB, or SDB" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
}
