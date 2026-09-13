/**
 * Server and Gateway Configuration
 * NOTE: Server URLs and Portal Endpoints are sealed and hidden from the regular UI.
 * The application operates purely via User & Code login, resolving endpoints internally.
 */

export const SERVER_CONFIG = {
  // Dynamic Master DNS configured by Admin Portal
  getMasterDns: (): string => {
    try {
      const saved = localStorage.getItem('nova_master_dns');
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    return 'http://look.5g.in';
  },
  setMasterDns: (url: string): void => {
    try {
      localStorage.setItem('nova_master_dns', url.trim());
    } catch {}
  },
  isServerUrlHidden: (): boolean => {
    try {
      return localStorage.getItem('nova_hide_server_input') === 'true';
    } catch {}
    return false;
  },
  setServerUrlHidden: (hidden: boolean): void => {
    try {
      localStorage.setItem('nova_hide_server_input', hidden ? 'true' : 'false');
    } catch {}
  },
  get DEFAULT_PORTAL_URL(): string {
    try {
      const saved = localStorage.getItem('nova_master_dns');
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    return 'http://look.5g.in';
  },
  get FALLBACK_PORTAL_URL(): string {
    return SERVER_CONFIG.DEFAULT_PORTAL_URL;
  },
  
  // App identification and branding
  APP_NAME: 'NOVA 4K ULTRA',
  APP_VERSION: '3.0.0-tizen',
  BUILD_NUMBER: '20260910',
  
  // Secret Developer Trigger (Press Red -> Green -> Yellow -> Blue or tap logo 5 times)
  DEV_TRIGGER_CLICKS: 5,
  DEV_KEY_SEQUENCE: ['COLOR_RED', 'COLOR_GREEN', 'COLOR_YELLOW', 'COLOR_BLUE'],

  // Default Buffer Settings
  BUFFER_PRESETS: {
    FAST_ZAPPING: { initial: 0.5, min: 1.0, max: 3.0 },
    BALANCED: { initial: 1.5, min: 2.5, max: 6.0 },
    STABLE: { initial: 3.0, min: 5.0, max: 12.0 }
  },

  // High-Quality Verified Sample Streams for Simulation & Instant Testing
  DEMO_STREAMS: [
    {
      id: 101,
      name: 'beIN SPORTS 1 HD (Test 1080p 50fps)',
      category: 'Sports HD',
      logo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&h=120&fit=crop',
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      resolution: 'FHD' as const,
      fps: 50,
      currentShow: 'الدوري الإسباني: برشلونة ضد ريال مدريد',
      nextShow: 'استوديو التحليل الرياضي الشامل'
    },
    {
      id: 102,
      name: 'العربية الحدث HD (Live News)',
      category: 'News',
      logo: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=120&h=120&fit=crop',
      url: 'https://live.alarabiya.net/alarabiapublish/alhadath.smil/playlist.m3u8',
      resolution: 'FHD' as const,
      fps: 60,
      currentShow: 'متابعة الأخبار والتقارير الميدانية المباشرة',
      nextShow: 'الحصاد الإخباري والتحليلات السياسية'
    },
    {
      id: 103,
      name: 'TRT عربي الإخبارية HD',
      category: 'News',
      logo: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=120&h=120&fit=crop',
      url: 'https://tv-trtarabi.medya.trt.com.tr/master.m3u8',
      resolution: 'FHD' as const,
      fps: 50,
      currentShow: 'نشرات إخبارية وتقارير استقصائية',
      nextShow: 'نافذة على العالم والسياسة الدولية'
    },
    {
      id: 104,
      name: 'OSN Movies Premiere 4K (Tears of Steel)',
      category: 'Cinema & VOD',
      logo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=120&h=120&fit=crop',
      url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
      resolution: 'FHD' as const,
      fps: 24,
      currentShow: 'فيلم السهرة: دموع الفولاذ (Tears of Steel)',
      nextShow: 'كواليس وتأثيرات السينما العالمية'
    },
    {
      id: 105,
      name: 'Al Jazeera News HD (Live News Feed)',
      category: 'News',
      logo: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=120&h=120&fit=crop',
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      resolution: 'HD' as const,
      fps: 50,
      currentShow: 'نشرة الأخبار الرئيسية وحصاد اليوم',
      nextShow: 'ما وراء الخبر: قراءة سياسية معمقة'
    }
  ]
};
