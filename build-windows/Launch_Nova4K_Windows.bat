@echo off
title NOVA 4K ULTRA - Desktop Edition
cd /d "%~dp0"
echo Launching NOVA 4K ULTRA Standalone Desktop App...
npx electron app/main.cjs
