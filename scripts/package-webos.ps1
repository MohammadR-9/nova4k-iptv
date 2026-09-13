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

# 3. Copy webOS App Configuration & Icons
Write-Host "[3/4] Adding webOS appinfo.json & Assets..." -ForegroundColor Yellow
if (Test-Path "appinfo.json") {
    Copy-Item -Path "appinfo.json" -Destination "$OutputDir/appinfo.json" -Force
}
if (Test-Path "public/icons") {
    New-Item -ItemType Directory -Force -Path "$OutputDir/icons" | Out-Null
    Copy-Item -Path "public/icons/*" -Destination "$OutputDir/icons" -Recurse -Force
}

# 4. Generate webOS .ipk package
Write-Host "[4/4] Finalizing webOS Package (.ipk)..." -ForegroundColor Yellow
$ipkSuccess = $false
if (Get-Command "ares-package" -ErrorAction SilentlyContinue) {
    Write-Host "Packaging with system ares-package..." -ForegroundColor Green
    ares-package $OutputDir -o $OutputDir
    $ipkSuccess = ($LASTEXITCODE -eq 0)
} else {
    Write-Host "Packaging with npx @webosose/ares-cli ares-package..." -ForegroundColor Green
    cmd.exe /c "npx -p @webosose/ares-cli ares-package `"$OutputDir`" -o `"$OutputDir`""
    $ipkSuccess = ($LASTEXITCODE -eq 0)
}

if ($ipkSuccess) {
    # Find generated IPK and copy to root
    $generatedIpk = Get-ChildItem -Path $OutputDir -Filter "*.ipk" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($generatedIpk) {
        Copy-Item -Path $generatedIpk.FullName -Destination "..\$($generatedIpk.Name)" -Force
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host "LG webOS .ipk Package Generated Successfully!" -ForegroundColor Green
        Write-Host "Location 1: $($generatedIpk.FullName)" -ForegroundColor Cyan
        Write-Host "Location 2: ..\$($generatedIpk.Name)" -ForegroundColor Cyan
        Write-Host "=========================================" -ForegroundColor Green
    }
} else {
    Write-Warning "Could not build .ipk automatically. Web distribution deployed to $OutputDir"
}
