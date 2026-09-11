@echo off
title NOVA 4K ULTRA - Windows Desktop Launcher
echo ====================================================
echo   NOVA 4K ULTRA - Starting Windows Desktop App...
echo ====================================================

REM Ensure production distribution is built
if not exist "dist\index.html" (
    echo Building latest web distribution...
    call npm run build
)

echo Launching Native Windows Application...
npx electron electron/main.cjs
