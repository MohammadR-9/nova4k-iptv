#!/usr/bin/env pwsh
# ============================================================
# NOVA 4K ULTRA — Git Init & GitHub Push (First-Time Setup)
# Run once to initialize the git repo and push to GitHub.
# Usage: .\scripts\init-git-push.ps1 -GitHubUsername "yourname"
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUsername,
    
    [string]$RepoName = "nova4k-iptv",
    [string]$Branch = "main"
)

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "`n🚀 NOVA 4K ULTRA — Git Setup" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor DarkGray

# Check git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git غير مثبت! نزّله من: https://git-scm.com" -ForegroundColor Red
    exit 1
}

# Build first
Write-Host "`n📦 1. بناء التطبيق..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 1) {
    Write-Host "❌ فشل البناء" -ForegroundColor Red
    exit 1
}
Write-Host "✅ البناء ناجح" -ForegroundColor Green

# Init git
Write-Host "`n🔧 2. تهيئة Git..." -ForegroundColor Yellow
if (-not (Test-Path ".git")) {
    git init
    Write-Host "✅ تم إنشاء مستودع Git" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Git موجود بالفعل" -ForegroundColor DarkGray
}

# Stage all
Write-Host "`n📁 3. إضافة الملفات..." -ForegroundColor Yellow
git add .
git commit -m "feat: NOVA 4K ULTRA IPTV App - initial release" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ℹ️  لا يوجد تغييرات جديدة للـ commit" -ForegroundColor DarkGray
}

# Set branch
git branch -M $Branch

# Remote
$remoteUrl = "https://github.com/$GitHubUsername/$RepoName.git"
Write-Host "`n🔗 4. ربط GitHub: $remoteUrl" -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin $remoteUrl

# Push
Write-Host "`n⬆️  5. رفع الكود على GitHub..." -ForegroundColor Yellow
git push -u origin $Branch --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🎉 تم الرفع بنجاح!" -ForegroundColor Green
    Write-Host "`n📋 الخطوات التالية:" -ForegroundColor Cyan
    Write-Host "  1. افتح: https://github.com/$GitHubUsername/$RepoName/actions" -ForegroundColor White
    Write-Host "  2. انتظر ~3-5 دقائق لبناء APK تلقائياً" -ForegroundColor White
    Write-Host "  3. انقر على أحدث Run → قسم Artifacts → نزّل NOVA-4K-debug-apk" -ForegroundColor White
    Write-Host "`n🌐 لتفعيل GitHub Pages:" -ForegroundColor Cyan
    Write-Host "  1. GitHub → Settings → Pages → Source: GitHub Actions" -ForegroundColor White
    Write-Host "  2. ثم استخدم الرابط على: https://www.pwabuilder.com" -ForegroundColor White
} else {
    Write-Host "`n⚠️  تأكد من:" -ForegroundColor Yellow
    Write-Host "  • إنشاء المستودع على GitHub: https://github.com/new" -ForegroundColor White
    Write-Host "  • اسم المستودع: $RepoName" -ForegroundColor White
    Write-Host "  • الخصوصية: Private" -ForegroundColor White
    Write-Host "  • لا تضيف README أو .gitignore (المشروع جاهز)" -ForegroundColor White
}
