# Android TV & Mobile APK Packaging Preparation Script
Param(
    [string]$OutputDir = "..\android IPTV"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Android TV & Mobile - Packaging Setup   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Build Production Web App
Write-Host "[1/4] Building Web Distribution..." -ForegroundColor Yellow
npm run build

if (-not (Test-Path "dist")) {
    Write-Error "Build failed! 'dist' directory not found."
    exit 1
}

# 2. Setup Output Directory
Write-Host "[2/4] Deploying to Android Project: $OutputDir..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
New-Item -ItemType Directory -Force -Path "$OutputDir\app\src\main\assets\public" | Out-Null
New-Item -ItemType Directory -Force -Path "$OutputDir\app\src\main\res\values" | Out-Null
New-Item -ItemType Directory -Force -Path "$OutputDir\app\src\main\res\xml" | Out-Null

# 3. Copy Web Assets
Copy-Item -Path "dist\*" -Destination "$OutputDir\app\src\main\assets\public" -Recurse -Force

# 4. Generate AndroidManifest.xml configured for Android TV (Leanback) + Mobile Phone
$manifestLines = @(
'<?xml version="1.0" encoding="utf-8"?>',
'<manifest xmlns:android="http://schemas.android.com/apk/res/android"',
'    package="com.nova.iptvpro">',
'    <uses-permission android:name="android.permission.INTERNET" />',
'    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
'    <uses-permission android:name="android.permission.WAKE_LOCK" />',
'    <uses-feature android:name="android.software.leanback" android:required="false" />',
'    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />',
'    <application',
'        android:allowBackup="true"',
'        android:label="NOVA 4K ULTRA"',
'        android:banner="@drawable/banner"',
'        android:supportsRtl="true"',
'        android:usesCleartextTraffic="true"',
'        android:hardwareAccelerated="true">',
'        <activity',
'            android:name=".MainActivity"',
'            android:exported="true"',
'            android:screenOrientation="sensorLandscape">',
'            <intent-filter>',
'                <action android:name="android.intent.action.MAIN" />',
'                <category android:name="android.intent.category.LAUNCHER" />',
'            </intent-filter>',
'            <intent-filter>',
'                <action android:name="android.intent.action.MAIN" />',
'                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />',
'            </intent-filter>',
'        </activity>',
'    </application>',
'</manifest>'
)
$manifestLines | Out-File -FilePath "$OutputDir\app\src\main\AndroidManifest.xml" -Encoding UTF8

# 5. Network Security Config
$netSecurityLines = @(
'<?xml version="1.0" encoding="utf-8"?>',
'<network-security-config>',
'    <base-config cleartextTrafficPermitted="true">',
'        <trust-anchors>',
'            <certificates src="system" />',
'        </trust-anchors>',
'    </base-config>',
'</network-security-config>'
)
$netSecurityLines | Out-File -FilePath "$OutputDir\app\src\main\res\xml\network_security_config.xml" -Encoding UTF8

# 6. Documentation
$readmeLines = @(
'# NOVA 4K ULTRA - Android TV & Mobile Edition',
'',
'This directory contains the production Android integration for **NOVA 4K ULTRA**.',
'',
'## Highlights:',
'1. **Dual TV & Phone Support:** Works on Android TV with D-Pad navigation and on Mobile with touch.',
'2. **Cleartext Traffic Enabled:** Supports HTTP IPTV streaming channels.',
'3. **Hardware Acceleration:** Native GPU rendering enabled.',
'',
'## How to build APK:',
'- Open this folder in **Android Studio** -> Build -> Build Bundle(s) / APK(s) -> **Build APK(s)**',
'- Or run terminal: `./gradlew assembleRelease`'
)
$readmeLines | Out-File -FilePath "$OutputDir\README.md" -Encoding UTF8

Write-Host "=========================================" -ForegroundColor Green
Write-Host "Android TV & Mobile Project Deployed to: $OutputDir" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
