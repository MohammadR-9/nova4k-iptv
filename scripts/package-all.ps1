# Unified Multi-Platform Packaging Script (Builds Once, Deploys to all 5 Platforms)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  NOVA 4K ULTRA - Multi-Platform Single Build & Deploy    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Step 1: Single Universal Build
Write-Host "`n[1/5] Compiling Universal Web Engine (npm run build)..." -ForegroundColor Yellow
npm run build

if (-not (Test-Path "dist")) {
    Write-Error "Build failed! 'dist' directory not found."
    exit 1
}

# Step 2: Samsung Tizen .wgt Package
Write-Host "`n[2/5] Packaging for Samsung Tizen TV (.wgt)..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "build-tizen" | Out-Null
Copy-Item -Path "config.xml" -Destination "dist/config.xml" -Force
if (Test-Path "icon.png") { Copy-Item -Path "icon.png" -Destination "dist/icon.png" -Force }

$TizenZip = "build-tizen/TizenIPTVPro.zip"
$TizenWgt = "build-tizen/TizenIPTVPro.wgt"
if (Test-Path $TizenZip) { Remove-Item $TizenZip -Force }
if (Test-Path $TizenWgt) { Remove-Item $TizenWgt -Force }
Compress-Archive -Path "dist/*" -DestinationPath $TizenZip -Force
Rename-Item -Path $TizenZip -NewName "TizenIPTVPro.wgt" -Force
Write-Host "  -> Samsung Tizen package ready: build-tizen/TizenIPTVPro.wgt" -ForegroundColor Green

# Step 3: LG webOS TV Package
Write-Host "`n[3/5] Deploying to LG webOS TV (../webos IPTV)..." -ForegroundColor Yellow
$WebOsDir = "../webos IPTV"
New-Item -ItemType Directory -Force -Path $WebOsDir | Out-Null
Copy-Item -Path "dist/*" -Destination $WebOsDir -Recurse -Force
if (Test-Path "appinfo.json") {
    Copy-Item -Path "appinfo.json" -Destination (Join-Path $WebOsDir "appinfo.json") -Force
}
Write-Host "  -> LG webOS project synced: $WebOsDir" -ForegroundColor Green

# Step 4: Android TV & Mobile
Write-Host "`n[4/5] Deploying to Android TV & Mobile (../android IPTV)..." -ForegroundColor Yellow
$AndroidDir = "../android IPTV"
$AndroidAssets = Join-Path $AndroidDir "assets/www"
New-Item -ItemType Directory -Force -Path $AndroidAssets | Out-Null
Copy-Item -Path "dist/*" -Destination $AndroidAssets -Recurse -Force
Write-Host "  -> Android TV & Mobile project synced: $AndroidDir" -ForegroundColor Green

# Step 5: Windows Desktop (Electron)
Write-Host "`n[5/5] Finalizing Windows Desktop Edition..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "build-windows" | Out-Null
Copy-Item -Path "electron/main.cjs" -Destination "build-windows/main.cjs" -Force
Write-Host "  -> Windows Desktop ready: Run with 'run-windows.bat'" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  SUCCESS: All 5 Platforms Synced & Packaged in 1 Click!  " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
