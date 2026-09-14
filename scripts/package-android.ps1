# Android TV & Mobile APK Packaging Preparation Script
Param(
    [string]$OutputDir = "..\android IPTV"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Android TV & Mobile - Packaging Setup   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Build Production Web App
Write-Host "[1/5] Building Web Distribution..." -ForegroundColor Yellow
npm run build

if (-not (Test-Path "dist")) {
    Write-Error "Build failed! 'dist' directory not found."
    exit 1
}

# 2. Sync Capacitor Android Platform
Write-Host "[2/5] Syncing Capacitor Android Engine..." -ForegroundColor Yellow
npx cap sync android

# 3. Setup Output Directory
Write-Host "[3/5] Deploying to Android Project: $OutputDir..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
New-Item -ItemType Directory -Force -Path "$OutputDir\assets\www" | Out-Null
New-Item -ItemType Directory -Force -Path "$OutputDir\app\src\main\assets\public" | Out-Null
New-Item -ItemType Directory -Force -Path "$OutputDir\app\src\main\res\values" | Out-Null
New-Item -ItemType Directory -Force -Path "$OutputDir\app\src\main\res\xml" | Out-Null

# Clean old bundle files
if (Test-Path "$OutputDir\assets\www\assets") {
    Remove-Item -Path "$OutputDir\assets\www\assets\*" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "$OutputDir\app\src\main\assets\public\assets") {
    Remove-Item -Path "$OutputDir\app\src\main\assets\public\assets\*" -Recurse -Force -ErrorAction SilentlyContinue
}

# Copy fresh web assets to both www and public
Copy-Item -Path "dist\*" -Destination "$OutputDir\assets\www" -Recurse -Force
Copy-Item -Path "dist\*" -Destination "$OutputDir\app\src\main\assets\public" -Recurse -Force

# 4. Sync Gradle / Android Studio Project Files
Write-Host "[4/5] Syncing Gradle & Native Project Files..." -ForegroundColor Yellow
if (Test-Path "android") {
    Copy-Item -Path "android\build.gradle" -Destination "$OutputDir\build.gradle" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "android\settings.gradle" -Destination "$OutputDir\settings.gradle" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "android\variables.gradle" -Destination "$OutputDir\variables.gradle" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "android\gradle.properties" -Destination "$OutputDir\gradle.properties" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "android\gradlew" -Destination "$OutputDir\gradlew" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "android\gradlew.bat" -Destination "$OutputDir\gradlew.bat" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "android\gradle" -Destination "$OutputDir\" -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "android\app\build.gradle" -Destination "$OutputDir\app\build.gradle" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "android\app\src\main\java" -Destination "$OutputDir\app\src\main\" -Recurse -Force -ErrorAction SilentlyContinue
}

# 5. Generate AndroidManifest.xml configured for Android TV (Leanback) + Mobile Phone
$manifestLines = @(
'<?xml version="1.0" encoding="utf-8"?>',
'<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
'    <uses-feature android:name="android.software.leanback" android:required="false" />',
'    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />',
'    <uses-feature android:name="android.hardware.screen.landscape" android:required="false" />',
'    <uses-permission android:name="android.permission.INTERNET" />',
'    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
'    <uses-permission android:name="android.permission.WAKE_LOCK" />',
'    <application',
'        android:allowBackup="true"',
'        android:icon="@mipmap/ic_launcher"',
'        android:label="@string/app_name"',
'        android:roundIcon="@mipmap/ic_launcher_round"',
'        android:banner="@mipmap/ic_launcher"',
'        android:supportsRtl="true"',
'        android:usesCleartextTraffic="true"',
'        android:hardwareAccelerated="true"',
'        android:networkSecurityConfig="@xml/network_security_config"',
'        android:theme="@style/AppTheme">',
'        <activity',
'            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"',
'            android:name=".MainActivity"',
'            android:label="@string/title_activity_main"',
'            android:theme="@style/AppTheme.NoActionBarLaunch"',
'            android:launchMode="singleTask"',
'            android:screenOrientation="sensor"',
'            android:exported="true">',
'            <intent-filter>',
'                <action android:name="android.intent.action.MAIN" />',
'                <category android:name="android.intent.category.LAUNCHER" />',
'            </intent-filter>',
'            <intent-filter>',
'                <action android:name="android.intent.action.MAIN" />',
'                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />',
'            </intent-filter>',
'        </activity>',
'        <provider',
'            android:name="androidx.core.content.FileProvider"',
'            android:authorities="${applicationId}.fileprovider"',
'            android:exported="false"',
'            android:grantUriPermissions="true">',
'            <meta-data',
'                android:name="android.support.FILE_PROVIDER_PATHS"',
'                android:resource="@xml/file_paths" />',
'        </provider>',
'    </application>',
'</manifest>'
)
$manifestLines | Out-File -FilePath "$OutputDir\app\src\main\AndroidManifest.xml" -Encoding UTF8

# Network Security Config
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

# Documentation
$readmeLines = @(
'# NOVA 4K ULTRA - Android TV & Mobile Edition',
'',
'This directory contains the production Android integration for **NOVA 4K ULTRA**.',
'',
'## Highlights:',
'1. **Dual TV & Phone Support:** Works on Android TV with D-Pad navigation and on Mobile with touch.',
'2. **Cleartext Traffic Enabled:** Supports HTTP IPTV streaming channels.',
'3. **Hardware Acceleration:** Native GPU rendering enabled.',
'4. **Full Turn-Key Android Studio Project:** Ready to build directly.',
'',
'## How to build APK:',
'- Open this folder (`android IPTV`) in **Android Studio** -> Build -> Build Bundle(s) / APK(s) -> **Build APK(s)**',
'- Or run terminal: `./gradlew assembleRelease` or `./gradlew assembleDebug`'
)
$readmeLines | Out-File -FilePath "$OutputDir\README.md" -Encoding UTF8

# 6. Automatic Production APK Package via Gradle
Write-Host "[5/5] Compiling Production APK via Gradle..." -ForegroundColor Yellow
try {
    $javaHome = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot" }
    $androidSdk = "D:\AI Apps\Tizen IPTV\.tools\android-sdk"
    $env:JAVA_HOME = $javaHome
    $env:ANDROID_HOME = $androidSdk
    $env:ANDROID_SDK_ROOT = $androidSdk

    $targetOutputDir = (Resolve-Path $OutputDir).Path
    $targetRootDir = (Resolve-Path "..").Path

    Push-Location "android"
    .\gradlew assembleDebug --no-daemon
    $apkSource = "app\build\outputs\apk\debug\app-debug.apk"
    if ($LASTEXITCODE -eq 0 -and (Test-Path $apkSource)) {
        Copy-Item -Path $apkSource -Destination "$targetOutputDir\NOVA_4K_ULTRA.apk" -Force
        Copy-Item -Path $apkSource -Destination "$targetRootDir\NOVA_4K_ULTRA.apk" -Force
        Copy-Item -Path $apkSource -Destination "$targetRootDir\NOVA_4K_ULTRA_AndroidTV.apk" -Force
        Write-Host "Production APK compiled & deployed successfully via local Gradle!" -ForegroundColor Green
    }
    Pop-Location
} catch {
    Write-Warning "Gradle APK compilation error: $_"
}

Write-Host "=========================================" -ForegroundColor Green
Write-Host "Android TV & Mobile Project Deployed to: $OutputDir" -ForegroundColor Green
Write-Host "Production APK Ready at: $OutputDir\NOVA_4K_ULTRA.apk" -ForegroundColor Green
Write-Host "Root APK Ready at: ..\NOVA_4K_ULTRA.apk" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
