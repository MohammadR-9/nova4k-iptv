# LG webOS Packaging & Sync Script
Param(
    [string]$OutputDir = "../webos IPTV"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "    LG webOS TV IPTV - Packaging .ipk   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Build Production Web Distribution
Write-Host "[1/4] Building Web Distribution..." -ForegroundColor Yellow
npm run build

if (-not (Test-Path "dist")) {
    Write-Error "Build failed! 'dist' directory not found."
    exit 1
}

# 2. Ensure target webos IPTV directory exists
Write-Host "[2/4] Syncing to webOS Project Directory: $OutputDir..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Copy all dist files into the webos IPTV folder
Copy-Item -Path "dist/*" -Destination $OutputDir -Recurse -Force

# 3. Copy webOS App Configuration
Write-Host "[3/4] Adding webOS appinfo.json & Assets..." -ForegroundColor Yellow
if (Test-Path "appinfo.json") {
    Copy-Item -Path "appinfo.json" -Destination "$OutputDir/appinfo.json" -Force
}

# 4. Check for webOS CLI (ares-package)
Write-Host "[4/4] Finalizing webOS Package..." -ForegroundColor Yellow
if (Get-Command "ares-package" -ErrorAction SilentlyContinue) {
    Write-Host "Found LG webOS CLI. Packaging with ares-package..." -ForegroundColor Green
    ares-package $OutputDir -o $OutputDir
    Write-Host "webOS .ipk package generated successfully!" -ForegroundColor Green
} else {
    Write-Host "LG webOS project files deployed to: $OutputDir" -ForegroundColor Green
    Write-Host "Ready to run with webOS CLI: ares-package $OutputDir -o $OutputDir" -ForegroundColor Cyan
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "LG webOS Integration Ready!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
