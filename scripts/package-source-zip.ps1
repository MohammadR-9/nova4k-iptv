# Script to build clean source code ZIP for NOVA 4K ULTRA
$ErrorActionPreference = "Stop"

$Root = "d:\AI Apps\Tizen IPTV"
$ZipTarget = Join-Path $Root "NOVA_4K_ULTRA_SourceCode.zip"
$StageRoot = Join-Path $Root "temp_source_staging"
$BundleDir = Join-Path $StageRoot "NOVA_4K_ULTRA_SourceCode"

Write-Host "1. Cleaning previous staging and zip..." -ForegroundColor Cyan
if (Test-Path $StageRoot) { Remove-Item -Path $StageRoot -Recurse -Force }
if (Test-Path $ZipTarget) { Remove-Item -Path $ZipTarget -Force }

New-Item -ItemType Directory -Path $BundleDir -Force | Out-Null

Write-Host "2. Creating README.md..." -ForegroundColor Cyan
$readmeContent = @"
# 🌟 NOVA 4K ULTRA - Smart TV, Mobile & Desktop IPTV Platform

تطبيق IPTV سينمائي متكامل فائق السرعة يدعم كافة المنصات:
* 📺 **Samsung Tizen Smart TV** (Tizen 4.0 - 8.0)
* 📺 **LG webOS Smart TV** (webOS 3.0 - 24)
* 🤖 **Android TV & TV Box & Fire TV** (Leanback + D-Pad Navigation + 60 FPS)
* 📱 **Android & iOS Mobile Phones** (Touch Screen Optimized)
* 💻 **Windows Desktop** (Electron 4K)

---

## 🚀 المميزات الرئيسية (Core Features)

1. **الواجهة السينمائية ثلاثية الأعمدة (3-Column Cinema Layout)**:
   - قائمة الباقات الذكية مع تصنيفات تفاعلية.
   - قائمة القنوات عالية الكثافة بأرقام القنوات والشعارات وشارات الجودة (4K UHD / FHD).
   - نافذة معاينة فورية (Instant Preview Card) بدون شاشة سوداء.
   - دليل البرامج الإلكتروني (EPG Info Card) مع وصف البرامج وشريط تقدم البث المباشر.

2. **تحكم كامل عبر ريموت التلفاز (D-Pad Remote Navigation)**:
   - تنقل رأسي وأفقي سلس بين القنوات والأعمدة.
   - كيبورد افتراضي داخلي ذكي متعدد اللغات (عربي / إنجليزي / أرقام ورموز) لا يعتمد على كيبورد النظام.
   - شريط تقليب القنوات السينمائي العائم (Fullscreen Cinema Zapping OSD) بمعدل 60 FPS حقيقي.

3. **محركات تشغيل الفيديو المتعددة (Multi-Engine Video Player)**:
   - **HLS.js Pro Engine**: تسريع عتادي ودعم كامل لـ Multi-Audio Tracks و Closed Captions.
   - **Samsung AVPlay Engine**: تسريع عتادي مخصص لشاشات سامسونج تيزن لدعم HEVC 4K HDR.
   - **Native Video Fallback**: تشغيل متوافق مع كافة المتصفحات والأجهزة.

4. **إدارة الاشتراكات والبروفايلات المتعددة (Multi-Profile Management)**:
   - حفظ عدة اشتراكات بروفايل في نفس الوقت مع إمكانية التبديل بنقرة واحدة والحذف والتعديل.
   - دعم التفعيل عبر أكواد التفعيل الذكية (Activation Code) أو بيانات Xtream Codes (المستخدم / كلمة المرور / السيرفر).
   - تسجيل الدخول التجريبي الفوري بنقرة واحدة (1-Click Demo Pass).

5. **مكتبة VOD والأفلام والمسلسلات**:
   - استئناف المشاهدة الذكي (Smart Resume Playback) بدقة الثواني وحفظ تقدم المشاهدة محلياً.
   - محرك بحث متقدم مع تصنيف الجودة والسنوات والترجمة.
   - واجهة مستجيبة بالكامل تعمل بنقاء على الهواتف والشاشات اللوحية.

---

## 🛠️ متطلبات التشغيل (Prerequisites)

* **Node.js**: الإصدار 18 أو 20 أو 22 LTS
* **npm**: الإصدار 9 أو أحدث

---

## 📦 التثبيت والتشغيل المحلي (Quick Start)

1. **تثبيت الحزم والاعتماديات**:
   ```bash
   npm install
   ```

2. **تشغيل السيرفر التجريبي للمطورين (Development Server)**:
   ```bash
   npm run dev
   ```
   سيتم فتح التطبيق على الرابط: `http://localhost:5173`

3. **بناء النسخة الإنتاجية (Production Build)**:
   ```bash
   npm run build
   ```
   يتم توليد ملفات التوزيع في مجلد `dist/`.

---

## 📱 بناء الحزم للمنصات المختلفة (Multi-Platform Packaging)

* **تجهيز تطبيق Android TV & Mobile**:
  ```bash
  npm run package:android
  ```
  يقوم بمزامنة الملفات وتحديث مشروع أندرويد في مجلد `android/` و `android IPTV/`.

* **تجهيز حزمة Samsung Tizen (`.wgt`)**:
  ```bash
  npm run package:tizen
  ```

* **تجهيز حزمة LG webOS (`.ipk`)**:
  ```bash
  npm run package:webos
  ```

* **تشغيل نسخة سطح المكتب (Windows Electron)**:
  ```bash
  npm run start:windows
  ```
  أو النقر المزدوج على `run-windows.bat`.

---

## 📁 هيكلية المشروع (Project Architecture)

```
NOVA_4K_ULTRA_SourceCode/
├── src/                  # واجهات التطبيق ومكونات React و TypeScript
├── public/               # الشعارات، الأيقونات، الخطوط، صور الواجهة
├── android/              # مشروع Capacitor Android الأصلي
├── electron/             # كود تشغيل نسخة سطح المكتب لنظام ويندوز
├── scripts/              # سكربتات أتمتة البناء والحزم لكافة المنصات
├── .github/workflows/    # سير العمل السحابي التلقائي لبناء APK
├── index.html            # نقطة دخول الويب والتلفاز
├── package.json          # الحزم والاعتماديات
├── tailwind.config.js    # نظام الألوان الملكي وظلال النيون NOVA
├── tsconfig.json         # إعدادات TypeScript الصارمة
└── vite.config.ts        # إعدادات التجميع السريع
```

---

**NOVA 4K ULTRA** © 2026 - Engineered for Cinema Quality & Ultra-Fast Streaming.
"@

[System.IO.File]::WriteAllText((Join-Path $BundleDir "README.md"), $readmeContent, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText((Join-Path "d:\AI Apps\Tizen IPTV\Tizen Iptv" "README.md"), $readmeContent, [System.Text.Encoding]::UTF8)

Write-Host "3. Copying clean source code files from 'Tizen Iptv'..." -ForegroundColor Cyan
$SourceDir = "d:\AI Apps\Tizen IPTV\Tizen Iptv"

# Top-level directories to copy recursively
$dirsToCopy = @("src", "public", "scripts", "electron", ".github")
foreach ($d in $dirsToCopy) {
    $srcPath = Join-Path $SourceDir $d
    $dstPath = Join-Path $BundleDir $d
    if (Test-Path $srcPath) {
        Copy-Item -Path $srcPath -Destination $dstPath -Recurse -Force
    }
}

# Android directory (copy all except app/build and .gradle)
$androidSrc = Join-Path $SourceDir "android"
$androidDst = Join-Path $BundleDir "android"
if (Test-Path $androidSrc) {
    New-Item -ItemType Directory -Path $androidDst -Force | Out-Null
    Get-ChildItem -Path $androidSrc -Exclude "build",".gradle" | ForEach-Object {
        if ($_.PSIsContainer) {
            if ($_.Name -eq "app") {
                # Copy app without build folder
                $appDst = Join-Path $androidDst "app"
                New-Item -ItemType Directory -Path $appDst -Force | Out-Null
                Get-ChildItem -Path $_.FullName -Exclude "build" | ForEach-Object {
                    Copy-Item -Path $_.FullName -Destination (Join-Path $appDst $_.Name) -Recurse -Force
                }
            } else {
                Copy-Item -Path $_.FullName -Destination (Join-Path $androidDst $_.Name) -Recurse -Force
            }
        } else {
            Copy-Item -Path $_.FullName -Destination (Join-Path $androidDst $_.Name) -Force
        }
    }
}

# Top-level individual configuration files
$filesToCopy = @(
    "index.html",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vite.config.ts",
    "tailwind.config.js",
    "postcss.config.js",
    "capacitor.config.ts",
    "config.xml",
    "appinfo.json",
    "run-windows.bat",
    ".gitignore"
)

foreach ($f in $filesToCopy) {
    $srcFile = Join-Path $SourceDir $f
    if (Test-Path $srcFile) {
        Copy-Item -Path $srcFile -Destination (Join-Path $BundleDir $f) -Force
    }
}

Write-Host "4. Compressing to ZIP archive: $ZipTarget..." -ForegroundColor Cyan
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($StageRoot, $ZipTarget, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Write-Host "5. Cleaning staging folder..." -ForegroundColor Cyan
Remove-Item -Path $StageRoot -Recurse -Force

Write-Host "SUCCESS! Source code ZIP created at: $ZipTarget" -ForegroundColor Green
Get-Item $ZipTarget | Select-Object FullName, Length, LastWriteTime
