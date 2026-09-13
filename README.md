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
   `ash
   npm install
   `

2. **تشغيل السيرفر التجريبي للمطورين (Development Server)**:
   `ash
   npm run dev
   `
   سيتم فتح التطبيق على الرابط: http://localhost:5173

3. **بناء النسخة الإنتاجية (Production Build)**:
   `ash
   npm run build
   `
   يتم توليد ملفات التوزيع في مجلد dist/.

---

## 📱 بناء الحزم للمنصات المختلفة (Multi-Platform Packaging)

* **تجهيز تطبيق Android TV & Mobile**:
  `ash
  npm run package:android
  `
  يقوم بمزامنة الملفات وتحديث مشروع أندرويد في مجلد ndroid/ و ndroid IPTV/.

* **تجهيز حزمة Samsung Tizen (.wgt)**:
  `ash
  npm run package:tizen
  `

* **تجهيز حزمة LG webOS (.ipk)**:
  `ash
  npm run package:webos
  `

* **تشغيل نسخة سطح المكتب (Windows Electron)**:
  `ash
  npm run start:windows
  `
  أو النقر المزدوج على un-windows.bat.

---

## 📁 هيكلية المشروع (Project Architecture)

`
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
`

---

**NOVA 4K ULTRA** © 2026 - Engineered for Cinema Quality & Ultra-Fast Streaming.