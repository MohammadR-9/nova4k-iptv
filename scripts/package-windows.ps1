# Windows Desktop App Packaging Script
Param(
    [string]$OutputDir = "build-windows"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   NOVA 4K ULTRA - Windows Desktop App   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Build Vite Production Web App
Write-Host "[1/3] Building Web Distribution..." -ForegroundColor Yellow
npm run build

if (-not (Test-Path "dist")) {
    Write-Error "Build failed! 'dist' directory not found."
    exit 1
}

# 2. Setup Windows Package Directory
Write-Host "[2/3] Preparing Windows Standalone Desktop App..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
New-Item -ItemType Directory -Force -Path "$OutputDir\app" | Out-Null

Copy-Item -Path "dist\*" -Destination "$OutputDir\app\dist" -Recurse -Force
Copy-Item -Path "electron\main.cjs" -Destination "$OutputDir\app\main.cjs" -Force

# Create Desktop Launcher inside build-windows
$launcherLines = @(
'@echo off',
'title NOVA 4K ULTRA - Desktop Edition',
'cd /d "%~dp0"',
'echo Launching NOVA 4K ULTRA Standalone Desktop App...',
'npx electron app/main.cjs'
)
$launcherLines | Out-File -FilePath "$OutputDir\Launch_Nova4K_Windows.bat" -Encoding ASCII

# Create Documentation
$readmeLines = @(
'# NOVA 4K ULTRA - Windows Desktop Standalone Edition',
'',
'Full native Windows desktop application (not browser/cloud based).',
'',
'## Features:',
'- Direct hardware GPU acceleration (NVIDIA / AMD / Intel).',
'- Unrestricted network streaming (CORS bypass for 100% reliable IPTV streams).',
'- Fullscreen cinema TV mode (F11 or double-click).',
'- Audio booster & Dolby 5.1 multi-channel sound support.',
'',
'## To Run Immediately:',
'Double-click: Launch_Nova4K_Windows.bat or run-windows.bat in root.'
)
$readmeLines | Out-File -FilePath "$OutputDir\README.md" -Encoding UTF8

Write-Host "=========================================" -ForegroundColor Green
Write-Host "Windows Desktop Application Ready at: $OutputDir" -ForegroundColor Green
Write-Host "Launch via: $OutputDir\Launch_Nova4K_Windows.bat" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Green
