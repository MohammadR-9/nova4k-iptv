import { LiveCategory, LiveChannel, VodItem, SeriesItem, SeriesSeason, SeriesEpisode } from '../types/iptv.types';
import { SERVER_CONFIG } from '../config/server.config';
import { ActivationService } from './activation.service';
import { matchesItemMetadata } from '../utils/searchHelper';

export class XtreamService {
  /**
   * Helper to format fetch URLs:
   * In browser dev mode (localhost), use Vite's /api/proxy to bypass CORS.
   * On Samsung Tizen TV (tizen hardware), fetch directly since config.xml has full access privileges.
   */
  private static getProxiedUrl(targetUrl: string): string {
    // When running Vite dev server (port 5173 on localhost, 127.0.0.1, or LAN IP 192.168.x.x), use /api/proxy
    // On Android APK, Capacitor, Tizen TV, and GitHub Pages (port is empty), fetch directly!
    if (typeof window !== 'undefined') {
      const isViteDevServer = window.location.port === '5173';
      if (isViteDevServer && targetUrl.startsWith('http')) {
        return `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
      }
    }
    return targetUrl;
  }

  /**
   * Fast Fetch with AbortController timeout (3.5s max).
   * Prevents browser and TV freezing when remote IPTV servers are slow or non-responsive.
   */
  private static async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(this.getProxiedUrl(url), {
        ...options,
        signal: controller.signal
      });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Ping / Health check for IPTV server (e.g. look4k.net:8080)
   * Verifies that the Xtream-Masters panel is online and responding.
   */
  public static async checkServerHealth(serverUrl: string = SERVER_CONFIG.DEFAULT_PORTAL_URL): Promise<{
    ok: boolean;
    status: number;
    latencyMs: number;
    serverTitle: string;
    serverHost: string;
  }> {
    const baseUrl = serverUrl.replace(/\/+$/, '');
    const targetUrl = `${baseUrl}/player_api.php`;
    const start = performance.now();

    try {
      const res = await this.fetchWithTimeout(targetUrl, {
        headers: { 'Accept': 'application/json' }
      }, 2500);
      const latencyMs = Math.max(1, Math.round(performance.now() - start));
      
      // Status 200 or 401 proves the Xtream API is active (401 is standard for player_api without auth)
      const isReachable = res.status === 200 || res.status === 401;
      return {
        ok: isReachable,
        status: res.status,
        latencyMs,
        serverTitle: 'Xtream-Masters OTT Panel',
        serverHost: baseUrl.replace(/^https?:\/\//, '')
      };
    } catch (e: any) {
      const latencyMs = Math.max(1, Math.round(performance.now() - start));
      return {
        ok: false,
        status: 0,
        latencyMs,
        serverTitle: 'غير متصل (Unreachable)',
        serverHost: baseUrl.replace(/^https?:\/\//, '')
      };
    }
  }

  /**
   * Real Xtream Codes API Authentication
   * GET /player_api.php?username=USER&password=PASS
   */
  public static async authenticate(serverUrl: string, username: string, pass: string): Promise<any> {
    const baseUrl = serverUrl.replace(/\/+$/, '');
    const targetUrl = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(pass)}`;

    const res = await this.fetchWithTimeout(targetUrl, { headers: { 'Accept': 'application/json' } }, 3500);
    if (!res.ok && res.status !== 200) {
      if (res.status === 401) {
        throw new Error('بيانات الدخول غير صحيحة أو غير مصرح بها على السيرفر (HTTP 401)');
      }
      throw new Error(`خادم Xtream رفض الاتصال (كود الحالة: ${res.status})`);
    }
    const data = await res.json();
    if (data.error || !data.user_info || data.user_info.auth === 0) {
      throw new Error('بيانات الدخول غير صحيحة أو الحساب غير نشط على السيرفر');
    }
    return data;
  }

  private static liveCategoriesCache: LiveCategory[] | null = null;
  private static liveChannelsCache: Map<string, LiveChannel[]> = new Map();
  private static vodCategoriesCache: { category_id: string; category_name: string }[] | null = null;
  private static vodMoviesCache: Map<string, VodItem[]> = new Map();
  private static allVodMaster: VodItem[] | null = null;
  private static isFetchingVodMaster = false;
  private static vodMasterWaiters: ((items: VodItem[]) => void)[] = [];

  private static seriesCategoriesCache: { category_id: string; category_name: string }[] | null = null;
  private static seriesListCache: Map<string, SeriesItem[]> = new Map();
  private static allSeriesMaster: SeriesItem[] | null = null;
  private static isFetchingSeriesMaster = false;
  private static seriesMasterWaiters: ((items: SeriesItem[]) => void)[] = [];

  public static clearCache(): void {
    this.liveCategoriesCache = null;
    this.liveChannelsCache.clear();
    this.vodCategoriesCache = null;
    this.vodMoviesCache.clear();
    this.allVodMaster = null;
    this.seriesCategoriesCache = null;
    this.seriesListCache.clear();
    this.allSeriesMaster = null;
  }

  /**
   * Get Live TV Categories
   */
  public static async getLiveCategories(): Promise<LiveCategory[]> {
    if (this.liveCategoriesCache && this.liveCategoriesCache.length > 0) {
      return this.liveCategoriesCache;
    }

    const account = ActivationService.getSavedAccount();
    if (account?.isLiveServer && account?.serverUrl && account.serverUrl.startsWith('http')) {
      try {
        const baseUrl = account.serverUrl.replace(/\/+$/, '');
        const target = `${baseUrl}/player_api.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password || '')}&action=get_live_categories`;
        const res = await this.fetchWithTimeout(target, {}, 3500);
        if (res.ok) {
          const remoteCats = await res.json();
          if (Array.isArray(remoteCats) && remoteCats.length > 0) {
            const result: LiveCategory[] = [
              { category_id: 'all', category_name: '★ جميع القنوات المباشرة' },
              ...remoteCats.map((c: any) => ({
                category_id: String(c.category_id),
                category_name: c.category_name || `باقة ${c.category_id}`,
                parent_id: c.parent_id ? Number(c.parent_id) : 0,
                stream_count: c.stream_count ? Number(c.stream_count) : undefined
              }))
            ];
            this.liveCategoriesCache = result;
            return result;
          }
        }
      } catch (e) {
        console.warn('[XtreamService] Remote live categories failed/timeout, using curated categories:', e);
      }
    }

    const fallback: LiveCategory[] = [
      { category_id: 'all', category_name: '★ جميع القنوات المباشرة' },
      { category_id: 'sports', category_name: '⚽ باقة الرياضة العالمية (Sports 4K)' },
      { category_id: 'news', category_name: '🌍 باقة الأخبار والأحداث المباشرة (News)' },
      { category_id: 'entertainment', category_name: '🎬 القنوات الترفيهية والسينمائية (Cinema)' },
      { category_id: 'documentary', category_name: '🦁 القنوات الوثائقية والطبيعة (Doc 4K)' },
      { category_id: 'kids', category_name: '👶 باقة الأطفال والرسوم المتحركة (Kids)' }
    ];
    this.liveCategoriesCache = fallback;
    return fallback;
  }

  /**
   * Get Live Channels by category with EPG programs.
    * Instant in-memory and persistent caching to eliminate browser/TV freezes completely.
   */
  public static getCachedLiveChannels(categoryId: string = 'all'): LiveChannel[] | null {
    const account = ActivationService.getSavedAccount();
    if (!account?.isLiveServer) {
      return null;
    }
    if (this.liveChannelsCache.has(categoryId)) {
      return this.liveChannelsCache.get(categoryId)!;
    }
    try {
      const raw = localStorage.getItem(`tizen_live_chs_${categoryId}`);
      if (raw) {
        const parsed: LiveChannel[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.liveChannelsCache.set(categoryId, parsed);
          return parsed;
        }
      }
    } catch {}
    return null;
  }

  public static prefetchLiveCategories(categoryIds: string[]): void {
    const account = ActivationService.getSavedAccount();
    if (!account?.isLiveServer || !account?.serverUrl) return;

    categoryIds.slice(0, 8).forEach((catId, index) => {
      if (catId === 'all' || catId === 'favorites') return;
      if (this.liveChannelsCache.has(catId)) return;

      setTimeout(async () => {
        try {
          await this.getLiveChannels(catId);
        } catch {}
      }, (index + 1) * 500);
    });
  }

  public static optimizeImageUrl(url?: string): string {
    if (!url) return '';
    let clean = url.trim();
    if (clean.startsWith('http://image.tmdb.org')) {
      clean = clean.replace('http://image.tmdb.org', 'https://image.tmdb.org');
    }
    if (clean.includes('image.tmdb.org')) {
      clean = clean.replace('/w600_and_h900_bestv2/', '/w342/');
      clean = clean.replace('/original/', '/w500/');
    }
    return clean;
  }

  public static async getLiveChannels(categoryId: string = 'all'): Promise<LiveChannel[]> {
    const cached = this.getCachedLiveChannels(categoryId);
    if (cached && cached.length > 0) {
      return cached;
    }

    const account = ActivationService.getSavedAccount();
    if (account?.isLiveServer && account?.serverUrl && account.serverUrl.startsWith('http')) {
      try {
        const baseUrl = account.serverUrl.replace(/\/+$/, '');

        // NEVER fetch unconstrained get_live_streams without category_id (avoids 4.3 MB / 8,450 channels freeze!)
        let targetCatId = categoryId;
        if (categoryId === 'all') {
          const cats = await this.getLiveCategories();
          const firstReal = cats.find(c => c.category_id !== 'all' && (c.stream_count === undefined || c.stream_count > 0));
          targetCatId = firstReal ? firstReal.category_id : '447';
        }

        const target = `${baseUrl}/player_api.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password || '')}&action=get_live_streams&category_id=${encodeURIComponent(targetCatId)}`;
        const res = await this.fetchWithTimeout(target, {}, 7000);
        if (res.ok) {
          const remoteStreams = await res.json();
          if (Array.isArray(remoteStreams) && remoteStreams.length > 0) {
            const mapped: LiveChannel[] = remoteStreams.map((s: any, idx: number) => ({
              num: idx + 1,
              name: s.name || `Channel ${idx + 1}`,
              stream_type: 'live',
              stream_id: s.stream_id || idx + 1,
              stream_icon: this.optimizeImageUrl(s.stream_icon) || 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=160&h=160&fit=crop',
              epg_channel_id: s.epg_channel_id || null,
              category_id: s.category_id || targetCatId,
              added: s.added || '2026-01-01',
              custom_sid: null,
              tv_archive: s.tv_archive || 0,
              // Universal Xtream Codes live stream (.m3u8 HLS hardware-accelerated with automatic .ts MPEG-TS fallback)
              direct_source: `${baseUrl}/live/${encodeURIComponent(account.username)}/${encodeURIComponent(account.password || '')}/${s.stream_id}.m3u8`,
              resolution: (s.name?.includes('4K') || s.name?.includes('UHD')) ? '4K UHD' : 'FHD',
              fps: 50,
              currentProgram: {
                id: `epg-${s.stream_id}`,
                title: s.name || 'بث مباشر عالي الجودة',
                start: '21:00',
                end: '23:00',
                startTimeStamp: Date.now() - 1800000,
                endTimeStamp: Date.now() + 5400000,
                description: 'بث مباشر من سيرفر IPTV فائق السرعة بتقنية MPEG-TS.',
                progressPercentage: 40
              }
            }));

            this.liveChannelsCache.set(targetCatId, mapped);
            if (categoryId === 'all') {
              this.liveChannelsCache.set('all', mapped);
            }
            try {
              localStorage.setItem(`tizen_live_chs_${targetCatId}`, JSON.stringify(mapped));
              if (categoryId === 'all') {
                localStorage.setItem('tizen_live_chs_all', JSON.stringify(mapped));
              }
            } catch {}
            return mapped;
          }
        }
      } catch (e) {
        console.warn('[XtreamService] Remote live channels fetch failed/timeout, falling back to curated list:', e);
      }
    }

    const curated = this.getCuratedLiveChannels(categoryId);
    return curated;
  }

  public static getCuratedLiveChannels(categoryId: string = 'all'): LiveChannel[] {
    const curatedChannels: LiveChannel[] = [
      // ================= SPORTS =================
      {
        num: 1,
        name: 'beIN SPORTS 1 Premium 4K',
        stream_type: 'live',
        stream_id: 101,
        stream_icon: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=160&h=160&fit=crop',
        epg_channel_id: 'bein1',
        category_id: 'sports',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8',
        resolution: '4K UHD',
        fps: 60,
        isFavorite: true,
        currentProgram: {
          id: 'sp-1',
          title: 'قمة الكلاسيكو الإسباني: برشلونة ضد ريال مدريد (مباشر 4K)',
          start: '21:00',
          end: '23:30',
          startTimeStamp: Date.now() - 3600000,
          endTimeStamp: Date.now() + 5400000,
          description: 'نقل حصري مباشر للكلاسيكو بتعليق عربي متميز مع تقنيات التصوير البطيء فائق الدقة 4K HDR.',
          progressPercentage: 55
        },
        nextProgram: {
          id: 'sp-2',
          title: 'الاستوديو التحليلي وحصاد الجولة',
          start: '23:30',
          end: '01:00',
          startTimeStamp: Date.now() + 5400000,
          endTimeStamp: Date.now() + 10800000,
          description: 'تحليل شامل للأهداف والحالات التحكيمية مع كوكبة من نجوم التحليل.',
          progressPercentage: 0
        }
      },
      {
        num: 2,
        name: 'beIN SPORTS 2 UHD (Live Arena)',
        stream_type: 'live',
        stream_id: 102,
        stream_icon: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=160&h=160&fit=crop',
        epg_channel_id: 'bein2',
        category_id: 'sports',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        resolution: '4K UHD',
        fps: 60,
        isFavorite: true,
        currentProgram: {
          id: 'sp-3',
          title: 'الدوري الإنجليزي الممتاز: مانشستر سيتي ضد ليفربول',
          start: '20:30',
          end: '22:45',
          startTimeStamp: Date.now() - 2400000,
          endTimeStamp: Date.now() + 3600000,
          description: 'قمة مباريات البريميرليج بصوت دولبي محيطي نقي وجودة بث غير مضغوطة.',
          progressPercentage: 45
        }
      },
      {
        num: 3,
        name: 'Red Bull Action TV (Extreme 4K)',
        stream_type: 'live',
        stream_id: 103,
        stream_icon: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=160&h=160&fit=crop',
        epg_channel_id: 'redbull',
        category_id: 'sports',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
        resolution: 'FHD',
        fps: 60,
        currentProgram: {
          id: 'sp-4',
          title: 'بطولة العالم للرياضات الجريئة والقفز المظلي',
          start: '21:00',
          end: '22:30',
          startTimeStamp: Date.now() - 1800000,
          endTimeStamp: Date.now() + 3600000,
          description: 'مغامرات استثنائية من أعلى قمم الجبال الجليدية مع تصوير سينمائي فائق الروعة.',
          progressPercentage: 35
        }
      },
      {
        num: 4,
        name: 'Sports Network Worldwide HD',
        stream_type: 'live',
        stream_id: 104,
        stream_icon: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=160&h=160&fit=crop',
        epg_channel_id: 'snw',
        category_id: 'sports',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 0,
        direct_source: 'https://d2zihajmogu5jn.cloudfront.net/bipbop-advanced/bipbop_16x9_variant.m3u8',
        resolution: 'FHD',
        fps: 50,
        currentProgram: {
          id: 'sp-5',
          title: 'دوري أبطال آسيا للنخبة: الهلال ضد النصر',
          start: '20:00',
          end: '22:15',
          startTimeStamp: Date.now() - 1200000,
          endTimeStamp: Date.now() + 4800000,
          description: 'كلاسيكو المملكة الآسيوي بتغطية شاملة وإحصائيات مباشرة لحظة بلحظة.',
          progressPercentage: 60
        }
      },

      // ================= NEWS =================
      {
        num: 5,
        name: 'الجزيرة مباشر (Al Jazeera Live)',
        stream_type: 'live',
        stream_id: 105,
        stream_icon: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=160&h=160&fit=crop',
        epg_channel_id: 'ajm',
        category_id: 'news',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://live-hls-web-ajm.getaj.net/AJM/index.m3u8',
        resolution: 'FHD',
        fps: 50,
        isFavorite: true,
        currentProgram: {
          id: 'nw-1',
          title: 'تغطية إخبارية حية ومباشرة لكافة الأحداث العربية والعالمية',
          start: '21:00',
          end: '23:00',
          startTimeStamp: Date.now() - 3600000,
          endTimeStamp: Date.now() + 3600000,
          description: 'نقل حي للمؤتمرات الصحفية والمستجدات الميدانية العاجلة على مدار الساعة.',
          progressPercentage: 50
        }
      },
      {
        num: 6,
        name: 'TRT عربي الإخبارية HD',
        stream_type: 'live',
        stream_id: 106,
        stream_icon: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=160&h=160&fit=crop',
        epg_channel_id: 'trtarabi',
        category_id: 'news',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://tv-trtarabi.medya.trt.com.tr/master.m3u8',
        resolution: 'FHD',
        fps: 50,
        currentProgram: {
          id: 'nw-2',
          title: 'الحصاد الإخباري: نظرة معمقة على السياسة الدولية',
          start: '21:30',
          end: '22:30',
          startTimeStamp: Date.now() - 1200000,
          endTimeStamp: Date.now() + 2400000,
          description: 'قراءة تحليلية لأبرز التطورات الإقليمية ومحادثات القمة العالمية.',
          progressPercentage: 40
        }
      },
      {
        num: 7,
        name: 'العربية الحدث (Al Hadath HD)',
        stream_type: 'live',
        stream_id: 107,
        stream_icon: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=160&h=160&fit=crop',
        epg_channel_id: 'alhadath',
        category_id: 'news',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://live.alarabiya.net/alarabiapublish/alhadath.smil/playlist.m3u8',
        resolution: 'FHD',
        fps: 50,
        isFavorite: true,
        currentProgram: {
          id: 'nw-3',
          title: 'الحدث الآن: متابعة عاجلة ونشرات ميدانية مباشرة',
          start: '21:00',
          end: '22:00',
          startTimeStamp: Date.now() - 1800000,
          endTimeStamp: Date.now() + 1800000,
          description: 'تقارير المراسلين من قلب الحدث وشبكة تحليلات عسكرية وسياسية موسعة.',
          progressPercentage: 50
        }
      },
      {
        num: 8,
        name: 'العربية الإخبارية (Al Arabiya)',
        stream_type: 'live',
        stream_id: 108,
        stream_icon: 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=160&h=160&fit=crop',
        epg_channel_id: 'alarabiya',
        category_id: 'news',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://live.alarabiya.net/alarabiapublish/alarabiya.smil/playlist.m3u8',
        resolution: 'FHD',
        fps: 50,
        currentProgram: {
          id: 'nw-4',
          title: 'بانوراما: ملفات الساعة وتحديات الاقتصاد العالمي',
          start: '21:00',
          end: '22:30',
          startTimeStamp: Date.now() - 2000000,
          endTimeStamp: Date.now() + 3400000,
          description: 'حوارات حصرية مع وزراء وخبراء استراتيجيين حول تحولات أسواق الطاقة.',
          progressPercentage: 35
        }
      },
      {
        num: 9,
        name: 'DW عربية (Deutsche Welle Arabic HD)',
        stream_type: 'live',
        stream_id: 109,
        stream_icon: 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=160&h=160&fit=crop',
        epg_channel_id: 'dwarabic',
        category_id: 'news',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8',
        resolution: 'HD',
        fps: 50,
        currentProgram: {
          id: 'nw-5',
          title: 'مع الحدث: قضايا الحريات والتقنية وحقوق الإنسان',
          start: '21:15',
          end: '22:15',
          startTimeStamp: Date.now() - 900000,
          endTimeStamp: Date.now() + 2700000,
          description: 'برنامج حواري يبحث في التحديات الاجتماعية والسياسية في العالم العربي.',
          progressPercentage: 25
        }
      },
      {
        num: 10,
        name: 'BBC News HD (Global News Feed)',
        stream_type: 'live',
        stream_id: 110,
        stream_icon: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=160&h=160&fit=crop',
        epg_channel_id: 'bbcnews',
        category_id: 'news',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/t=3840/v=pv14/b=5070016/main.m3u8',
        resolution: 'FHD',
        fps: 50,
        currentProgram: {
          id: 'nw-6',
          title: 'BBC World News: Live Global Reporting & Business Briefing',
          start: '21:00',
          end: '22:00',
          startTimeStamp: Date.now() - 1500000,
          endTimeStamp: Date.now() + 2100000,
          description: 'Comprehensive international coverage and economic analysis from London.',
          progressPercentage: 42
        }
      },
      {
        num: 11,
        name: 'DW English Global HD',
        stream_type: 'live',
        stream_id: 111,
        stream_icon: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=160&h=160&fit=crop',
        epg_channel_id: 'dweng',
        category_id: 'news',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
        resolution: 'HD',
        fps: 50,
        currentProgram: {
          id: 'nw-7',
          title: 'The Day: Global News & European In-Depth Analysis',
          start: '21:00',
          end: '22:00',
          startTimeStamp: Date.now() - 1200000,
          endTimeStamp: Date.now() + 2400000,
          description: 'European perspectives on global developments and science advances.',
          progressPercentage: 33
        }
      },

      // ================= ENTERTAINMENT & CINEMA =================
      {
        num: 12,
        name: 'OSN Cinema Premiere 4K',
        stream_type: 'live',
        stream_id: 112,
        stream_icon: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=160&h=160&fit=crop',
        epg_channel_id: 'osn_prem',
        category_id: 'entertainment',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
        resolution: '4K UHD',
        fps: 24,
        isFavorite: true,
        currentProgram: {
          id: 'ent-1',
          title: 'فيلم السهرة: دموع الفولاذ (Tears of Steel 4K HDR)',
          start: '20:30',
          end: '22:45',
          startTimeStamp: Date.now() - 2400000,
          endTimeStamp: Date.now() + 3600000,
          description: 'ملحمة خيال علمي في مستقبل تقني تصطدم فيه الروبوتات الذكية مع حماة كوكب الأرض.',
          progressPercentage: 60
        }
      },
      {
        num: 13,
        name: 'Dolby Atmos Cinema Theater 4K',
        stream_type: 'live',
        stream_id: 113,
        stream_icon: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=160&h=160&fit=crop',
        epg_channel_id: 'dolby_ch',
        category_id: 'entertainment',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/adv_dv_atmos/main.m3u8',
        resolution: '4K UHD',
        fps: 60,
        isFavorite: true,
        currentProgram: {
          id: 'ent-2',
          title: 'تجربة الصوت المحيطي المطلق Dolby Atmos & Vision',
          start: '21:00',
          end: '23:00',
          startTimeStamp: Date.now() - 1800000,
          endTimeStamp: Date.now() + 5400000,
          description: 'استعراض لأقوى المؤثرات البصرية والصوتية المكانية للأجهزة والمسارح المنزلية المتطورة.',
          progressPercentage: 25
        }
      },
      {
        num: 14,
        name: 'MBC 1 HD (Showcase Live)',
        stream_type: 'live',
        stream_id: 114,
        stream_icon: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=160&h=160&fit=crop',
        epg_channel_id: 'mbc1',
        category_id: 'entertainment',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://live.alarabiya.net/alarabiapublish/alarabiya.smil/playlist.m3u8',
        resolution: 'FHD',
        fps: 60,
        currentProgram: {
          id: 'ent-3',
          title: 'برنامج المنوعات والمسابقات الأسبوعي المباشر',
          start: '21:00',
          end: '22:30',
          startTimeStamp: Date.now() - 1500000,
          endTimeStamp: Date.now() + 3900000,
          description: 'لقاءات فنية وجوائز نقدية كبرى مع أبرز نجوم الدراما والسينما العربية.',
          progressPercentage: 30
        }
      },
      {
        num: 15,
        name: 'Sci-Fi Universe (Angel One 4K)',
        stream_type: 'live',
        stream_id: 115,
        stream_icon: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=160&h=160&fit=crop',
        epg_channel_id: 'scifi_u',
        category_id: 'entertainment',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
        resolution: '4K UHD',
        fps: 24,
        currentProgram: {
          id: 'ent-4',
          title: 'مسلسل الفضاء والمستقبل: Angel One Chronicles',
          start: '20:45',
          end: '22:15',
          startTimeStamp: Date.now() - 3000000,
          endTimeStamp: Date.now() + 1800000,
          description: 'مهمة استكشافية خارج درب التبانة تواجه ألغازاً حضارية خارقة للمألوف.',
          progressPercentage: 62
        }
      },
      {
        num: 16,
        name: 'Hollywood Premiere HD',
        stream_type: 'live',
        stream_id: 116,
        stream_icon: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=160&h=160&fit=crop',
        epg_channel_id: 'holly_prem',
        category_id: 'entertainment',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 0,
        direct_source: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
        resolution: 'FHD',
        fps: 50,
        currentProgram: {
          id: 'ent-5',
          title: 'فيلم الإثارة والغموض: الملاح الأخير (2025)',
          start: '21:30',
          end: '23:30',
          startTimeStamp: Date.now() - 1000000,
          endTimeStamp: Date.now() + 6200000,
          description: 'مغامرة تحبس الأنفاس في أعماق المحيط الأطلسي لإنقاذ غواصة مفقودة.',
          progressPercentage: 20
        }
      },
      {
        num: 17,
        name: 'Cinema World Classic HD',
        stream_type: 'live',
        stream_id: 117,
        stream_icon: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=160&h=160&fit=crop',
        epg_channel_id: 'cinema_classic',
        category_id: 'entertainment',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 0,
        direct_source: 'https://assets.afcdn.com/video49/20210722/v_645516.m3u8',
        resolution: 'FHD',
        fps: 24,
        currentProgram: {
          id: 'ent-6',
          title: 'روائع السينما العالمية الخالدة (Remastered Edition)',
          start: '20:00',
          end: '22:30',
          startTimeStamp: Date.now() - 3600000,
          endTimeStamp: Date.now() + 1800000,
          description: 'أفلام حققت أوسكار عبر التاريخ بنسخ رقمية محسنة ومعدلة بالألوان.',
          progressPercentage: 66
        }
      },

      // ================= DOCUMENTARY =================
      {
        num: 18,
        name: 'National Geographic Wild 4K',
        stream_type: 'live',
        stream_id: 118,
        stream_icon: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=160&h=160&fit=crop',
        epg_channel_id: 'natgeo',
        category_id: 'documentary',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://content.jwplatform.com/manifests/vM7nH0Kl.m3u8',
        resolution: '4K UHD',
        fps: 60,
        isFavorite: true,
        currentProgram: {
          id: 'doc-1',
          title: 'عالم المفترسات في براري سيرينغيتي (4K HDR)',
          start: '21:15',
          end: '22:45',
          startTimeStamp: Date.now() - 1800000,
          endTimeStamp: Date.now() + 3600000,
          description: 'رحلة تصوير مجهرية لتوثيق حياة الفهود والنمور البرية بأحدث الكاميرات فائقة السرعة.',
          progressPercentage: 35
        }
      },
      {
        num: 19,
        name: 'Discovery Earth & Science 4K',
        stream_type: 'live',
        stream_id: 119,
        stream_icon: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=160&h=160&fit=crop',
        epg_channel_id: 'disc_earth',
        category_id: 'documentary',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
        resolution: '4K UHD',
        fps: 60,
        currentProgram: {
          id: 'doc-2',
          title: 'معجزات النظام الشمسي وأسرار الثقوب السوداء',
          start: '20:30',
          end: '22:00',
          startTimeStamp: Date.now() - 2700000,
          endTimeStamp: Date.now() + 2700000,
          description: 'محاكاة حاسوبية ثلاثية الأبعاد للمجرات الكونية وأصول نشأة النجوم.',
          progressPercentage: 50
        }
      },
      {
        num: 20,
        name: 'NASA Explorer 4K Live',
        stream_type: 'live',
        stream_id: 120,
        stream_icon: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=160&h=160&fit=crop',
        epg_channel_id: 'nasa_live',
        category_id: 'documentary',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://test-streams.mux.dev/test_001/stream.m3u8',
        resolution: 'FHD',
        fps: 50,
        currentProgram: {
          id: 'doc-3',
          title: 'بث محطة الفضاء الدولية (ISS Live Earth Views)',
          start: '21:00',
          end: '23:00',
          startTimeStamp: Date.now() - 1500000,
          endTimeStamp: Date.now() + 5700000,
          description: 'مشاهد مباشرة ورائعة لكوكب الأرض من ارتفاع 400 كيلومتر مع صوت طاقم المحطة.',
          progressPercentage: 20
        }
      },

      // ================= KIDS =================
      {
        num: 21,
        name: 'Cartoon Toon 4K Animation',
        stream_type: 'live',
        stream_id: 121,
        stream_icon: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=160&h=160&fit=crop',
        epg_channel_id: 'toon_4k',
        category_id: 'kids',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 0,
        direct_source: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
        resolution: 'FHD',
        fps: 60,
        currentProgram: {
          id: 'kd-1',
          title: 'مغامرات الأرنب الذكي (Big Buck Bunny 4K)',
          start: '21:00',
          end: '22:00',
          startTimeStamp: Date.now() - 1200000,
          endTimeStamp: Date.now() + 2400000,
          description: 'رسوم متحركة مسلية وممتعة للأطفال في الغابة المليئة بالمفاجآت.',
          progressPercentage: 35
        }
      },
      {
        num: 22,
        name: 'Spacetoon Heroes 4K',
        stream_type: 'live',
        stream_id: 122,
        stream_icon: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=160&h=160&fit=crop',
        epg_channel_id: 'spacetoon',
        category_id: 'kids',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 1,
        direct_source: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
        resolution: 'FHD',
        fps: 50,
        currentProgram: {
          id: 'kd-2',
          title: 'ملحمة التنين الصغير وحامية القلعة (Sintel Animation)',
          start: '21:15',
          end: '22:15',
          startTimeStamp: Date.now() - 900000,
          endTimeStamp: Date.now() + 2700000,
          description: 'مغامرة مشوقة لإنقاذ التنين الصغير في عوالم الثلج والغموض.',
          progressPercentage: 25
        }
      },
      {
        num: 23,
        name: 'Kids World Fun HD',
        stream_type: 'live',
        stream_id: 123,
        stream_icon: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=160&h=160&fit=crop',
        epg_channel_id: 'kids_world',
        category_id: 'kids',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 0,
        direct_source: 'https://media.w3.org/2010/05/video/movie_300.mp4',
        resolution: 'HD',
        fps: 30,
        currentProgram: {
          id: 'kd-3',
          title: 'عالم المرح والألوان للأطفال الصغار',
          start: '21:00',
          end: '21:45',
          startTimeStamp: Date.now() - 1500000,
          endTimeStamp: Date.now() + 1200000,
          description: 'أغاني وأناشيد تعليمية ممتعة للأطفال تنمي المهارات والتفكير الإبداعي.',
          progressPercentage: 55
        }
      },
      {
        num: 24,
        name: 'Nature Animals 4K UHD',
        stream_type: 'live',
        stream_id: 124,
        stream_icon: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&h=160&fit=crop',
        epg_channel_id: 'nature_4k',
        category_id: 'documentary',
        added: '2026-01-01',
        custom_sid: null,
        tv_archive: 0,
        direct_source: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        resolution: '4K UHD',
        fps: 60,
        currentProgram: {
          id: 'doc-4',
          title: 'تفتح الأزهار وعجائب النباتات الاستوائية',
          start: '20:30',
          end: '22:30',
          startTimeStamp: Date.now() - 3000000,
          endTimeStamp: Date.now() + 4200000,
          description: 'تصوير تايم لابس استثنائي فائق الدقة 4K لدورة حياة النباتات النادرة.',
          progressPercentage: 40
        }
      }
    ];

    if (categoryId === 'all') {
      return curatedChannels;
    }
    return curatedChannels.filter(c => c.category_id === categoryId);
  }

  /**
   * Get VOD Movie Categories (fetches real categories from IPTV server or falls back to curated)
   */
  public static async getVodCategories(): Promise<{ category_id: string; category_name: string }[]> {
    if (this.vodCategoriesCache && this.vodCategoriesCache.length > 0) {
      return this.vodCategoriesCache;
    }

    const account = ActivationService.getSavedAccount();
    if (account?.isLiveServer && account?.serverUrl && account?.username && account.serverUrl.startsWith('http')) {
      try {
        const baseUrl = account.serverUrl.replace(/\/+$/, '');
        const target = `${baseUrl}/player_api.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password || '')}&action=get_vod_categories`;
        const res = await this.fetchWithTimeout(target, {}, 3500);
        if (res.ok) {
          const remoteCats = await res.json();
          if (Array.isArray(remoteCats) && remoteCats.length > 0) {
            const result = [
              { category_id: 'all', category_name: '★ جميع الأفلام السينمائية' },
              ...remoteCats.map((c: any) => ({
                category_id: String(c.category_id),
                category_name: c.category_name || `باقة ${c.category_id}`
              }))
            ];
            this.vodCategoriesCache = result;
            return result;
          }
        }
      } catch (e) {
        console.warn('[XtreamService] Remote VOD categories fetch failed, using fallback:', e);
      }
    }

    const fallback = [
      { category_id: 'all', category_name: '★ جميع الأفلام السينمائية' },
      { category_id: 'action', category_name: '🔥 أفلام الأكشن والإثارة' },
      { category_id: 'sci-fi', category_name: '🚀 الخيال العلمي والفضاء' },
      { category_id: 'drama', category_name: '🎭 دراما وسير ذاتية' },
      { category_id: 'animation', category_name: '✨ الرسوم المتحركة والأنمي' }
    ];
    this.vodCategoriesCache = fallback;
    return fallback;
  }

  /**
   * Get VOD Movies (fetches real movies from IPTV server or falls back to curated)
   * Prevents 15 MB / 20,000 movies downloading freeze by querying by category!
   */
  public static getCachedVodMovies(categoryId: string = 'all'): VodItem[] | null {
    const account = ActivationService.getSavedAccount();
    if (!account?.isLiveServer) {
      return null;
    }
    if (this.vodMoviesCache.has(categoryId)) {
      return this.vodMoviesCache.get(categoryId)!;
    }
    try {
      const raw = localStorage.getItem(`tizen_vod_movies_${categoryId}`);
      if (raw) {
        const parsed: VodItem[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.vodMoviesCache.set(categoryId, parsed);
          return parsed;
        }
      }
    } catch {}
    return null;
  }

  public static async getVodMovies(categoryId: string = 'all'): Promise<VodItem[]> {
    const cached = this.getCachedVodMovies(categoryId);
    if (cached && cached.length > 0) {
      return cached;
    }

    const account = ActivationService.getSavedAccount();
    if (account?.isLiveServer && account?.serverUrl && account?.username && account.serverUrl.startsWith('http')) {
      try {
        const baseUrl = account.serverUrl.replace(/\/+$/, '');
        let targetCatId = categoryId;
        if (categoryId === 'all') {
          const cats = await this.getVodCategories();
          const firstReal = cats.find(c => c.category_id !== 'all');
          targetCatId = firstReal ? firstReal.category_id : '149';
        }

        const target = `${baseUrl}/player_api.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password || '')}&action=get_vod_streams&category_id=${encodeURIComponent(targetCatId)}`;
        const res = await this.fetchWithTimeout(target, {}, 7000);
        if (res.ok) {
          const remoteStreams = await res.json();
          if (Array.isArray(remoteStreams) && remoteStreams.length > 0) {
            const mapped: VodItem[] = remoteStreams.map((s: any, idx: number) => 
              this.mapRawVodItem(s, idx, baseUrl, account.username, account.password, targetCatId)
            );

            this.vodMoviesCache.set(targetCatId, mapped);
            if (categoryId === 'all') {
              this.vodMoviesCache.set('all', mapped);
            }
            try {
              localStorage.setItem(`tizen_vod_movies_${targetCatId}`, JSON.stringify(mapped));
              if (categoryId === 'all') {
                localStorage.setItem('tizen_vod_movies_all', JSON.stringify(mapped));
              }
            } catch {}
            return mapped;
          }
        }
      } catch (e) {
        console.warn('[XtreamService] Remote VOD movies fetch failed, using fallback:', e);
      }
    }

    return this.getCuratedVodMovies(categoryId);
  }

  /**
   * Helper to map raw VOD stream object from Xtream API to typed VodItem
   */
  public static mapRawVodItem(
    s: any, 
    idx: number, 
    baseUrl: string, 
    username: string, 
    password?: string, 
    fallbackCatId = ''
  ): VodItem {
    const streamId = parseInt(s.stream_id, 10) || (idx + 1);
    const containerExt = s.container_extension || 'mp4';
    const rawRating = parseFloat(s.rating || s.rating_5based || '8.5');
    const rating = isNaN(rawRating) || rawRating <= 0 ? 8.5 : Math.round(rawRating * 10) / 10;
    const nameStr = s.name || `Movie ${idx + 1}`;
    const yearMatch = nameStr.match(/\b(19\d\d|20\d\d)\b/);
    const year = s.year || (s.release_date ? String(s.release_date).split('-')[0] : (yearMatch ? yearMatch[1] : '2024'));
    const durationSec = parseInt(s.duration_secs || (s.episode_run_time ? String(parseInt(s.episode_run_time, 10) * 60) : '7200'), 10) || 7200;
    const hours = Math.floor(durationSec / 3600);
    const mins = Math.floor((durationSec % 3600) / 60);
    const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return {
      num: idx + 1,
      name: nameStr,
      stream_type: 'movie' as const,
      stream_id: streamId,
      stream_icon: this.optimizeImageUrl(s.stream_icon) || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop',
      backdrop: this.optimizeImageUrl((Array.isArray(s.backdrop_path) && s.backdrop_path[0]) || s.backdrop_path || s.stream_icon),
      rating,
      year: String(year),
      duration: durationStr,
      durationSec,
      category_id: String(s.category_id || fallbackCatId),
      plot: s.plot || s.description || 'فيلم سينمائي بجودة فائقة 4K من سيرفر IPTV.',
      director: s.director || undefined,
      cast: s.cast || undefined,
      direct_source: `${baseUrl}/movie/${encodeURIComponent(username)}/${encodeURIComponent(password || '')}/${streamId}.${containerExt}`,
      container_extension: containerExt
    };
  }

  /**
   * Pre-fetches and returns the complete master VOD catalog (all 12,600+ movies across all categories).
   * Loaded in background to power global instant search across the whole server catalog.
   */
  public static async getAllVodMaster(): Promise<VodItem[]> {
    if (this.allVodMaster && this.allVodMaster.length > 0) {
      return this.allVodMaster;
    }

    if (this.isFetchingVodMaster) {
      return new Promise<VodItem[]>((resolve) => {
        this.vodMasterWaiters.push(resolve);
      });
    }

    this.isFetchingVodMaster = true;
    const account = ActivationService.getSavedAccount();
    if (account?.isLiveServer && account?.serverUrl && account?.username && account.serverUrl.startsWith('http')) {
      try {
        const baseUrl = account.serverUrl.replace(/\/+$/, '');
        const target = `${baseUrl}/player_api.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password || '')}&action=get_vod_streams`;
        const res = await this.fetchWithTimeout(target, {}, 12000);
        if (res.ok) {
          const remoteStreams = await res.json();
          if (Array.isArray(remoteStreams) && remoteStreams.length > 0) {
            const mapped = remoteStreams.map((s: any, idx: number) => 
              this.mapRawVodItem(s, idx, baseUrl, account.username, account.password)
            );
            this.allVodMaster = mapped;
            this.vodMasterWaiters.forEach(cb => cb(mapped));
            this.vodMasterWaiters = [];
            this.isFetchingVodMaster = false;
            return mapped;
          }
        }
      } catch (e) {
        console.warn('[XtreamService] Global VOD master fetch error:', e);
      }
    }

    this.isFetchingVodMaster = false;
    const fallback = this.getCuratedVodMovies('all');
    this.vodMasterWaiters.forEach(cb => cb(fallback));
    this.vodMasterWaiters = [];
    return fallback;
  }

  /**
   * Global search across all movies in the entire IPTV server library.
   * Finds any movie (e.g. Momo (2025)) instantly regardless of category!
   */
  public static async searchVodGlobally(query: string): Promise<VodItem[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    // 1. Gather all currently cached movies across all loaded categories
    const pool = new Map<number, VodItem>();
    this.vodMoviesCache.forEach((movies) => {
      movies.forEach(m => {
        if (!pool.has(m.stream_id)) pool.set(m.stream_id, m);
      });
    });

    // 2. Fetch or use master catalog if available
    try {
      const master = await this.getAllVodMaster();
      if (Array.isArray(master) && master.length > 0) {
        master.forEach(m => {
          if (!pool.has(m.stream_id)) pool.set(m.stream_id, m);
        });
      }
    } catch (e) {
      console.warn('[XtreamService] searchVodGlobally master error:', e);
    }

    const allItems = Array.from(pool.values());
    return allItems.filter(m => matchesItemMetadata(m, query));
  }

  /**
   * Curated offline fallback VOD movies list
   */
  private static getCuratedVodMovies(categoryId: string = 'all'): VodItem[] {
    const list: VodItem[] = [
      {
        num: 1,
        name: 'دموع الفولاذ (Tears of Steel 4K HDR)',
        stream_type: 'movie',
        stream_id: 201,
        stream_icon: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&h=600&fit=crop',
        backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&h=720&fit=crop',
        rating: 8.9,
        year: '2025',
        duration: '1h 55m',
        durationSec: 6900,
        category_id: 'sci-fi',
        plot: 'في مستقبل ما بعد الكارثة في أمستردام، تحاول مجموعة من العلماء ومحاربي المقاومة إنقاذ العالم من سيطرة الذكاء الاصطناعي.',
        director: 'إيان هوبيرت',
        cast: 'ديريك دي لينت، دينيسي ريبيرجر، سيرجيو هاسلبانك',
        direct_source: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
        container_extension: 'm3u8'
      },
      {
        num: 2,
        name: 'ملحمة الفضاء: Angel One (Multi-Track 4K)',
        stream_type: 'movie',
        stream_id: 202,
        stream_icon: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=600&fit=crop',
        backdrop: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1280&h=720&fit=crop',
        rating: 8.8,
        year: '2024',
        duration: '2h 10m',
        durationSec: 7800,
        category_id: 'sci-fi',
        plot: 'مهمة استكشافية خارج درب التبانة تبحث عن بقايا سفينة استعمارية مفقودة لتكتشف حضارة كوكبية غامضة وقوانين غير مألوفة.',
        director: 'ستيف هيدن',
        cast: 'باتريك ستيوارت، جوناثان فراكس، مارينا سيرتيس',
        direct_source: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
        container_extension: 'm3u8'
      },
      {
        num: 3,
        name: 'مغامرة سينتل الأسطورية (Sintel 4K Cinema)',
        stream_type: 'movie',
        stream_id: 203,
        stream_icon: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&h=600&fit=crop',
        backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&h=720&fit=crop',
        rating: 9.1,
        year: '2024',
        duration: '1h 45m',
        durationSec: 6300,
        category_id: 'animation',
        plot: 'فتاة شجاعة تدعى سينتل تخوض رحلة خطيرة عبر الجبال الجليدية والصحاري بحثاً عن تنينها الصغير الذي اختطفه كائن غامض.',
        director: 'كولن ليفي',
        cast: 'هالينا رين، ثوم هوفمان',
        direct_source: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
        container_extension: 'mp4'
      },
      {
        num: 4,
        name: 'كوزموس: أسرار الكون (JW Cinema Showcase)',
        stream_type: 'movie',
        stream_id: 204,
        stream_icon: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=600&fit=crop',
        backdrop: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1280&h=720&fit=crop',
        rating: 9.0,
        year: '2025',
        duration: '2h 20m',
        durationSec: 8400,
        category_id: 'sci-fi',
        plot: 'رحلة سينمائية ساحرة إلى حواف الفضاء المرئي والأبعاد الفيزيائية الخفية التي تحكم ولادة المجرات ومصير النجوم.',
        director: 'آن درويان',
        cast: 'نيل ديجراس تايسون',
        direct_source: 'https://content.jwplatform.com/manifests/vM7nH0Kl.m3u8',
        container_extension: 'm3u8'
      },
      {
        num: 5,
        name: 'الأرنب الأسطوري المتمرد (Big Buck Bunny 4K)',
        stream_type: 'movie',
        stream_id: 205,
        stream_icon: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=600&fit=crop',
        backdrop: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=1280&h=720&fit=crop',
        rating: 8.5,
        year: '2023',
        duration: '1h 30m',
        durationSec: 5400,
        category_id: 'animation',
        plot: 'أرنب مسالم وضخم يقرر تلقين ثلاثي من الكائنات المشاغبة درساً لن ينسوه بعد أن أزعجوا سكينة الغابة وسكانها الودعاء.',
        director: 'ساتشا جويديبراندت',
        cast: 'أبطال الأنمي الهولندي',
        direct_source: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
        container_extension: 'mp4'
      },
      {
        num: 6,
        name: 'أفق الطبيعة وسحر الحياة (Flora 4K IMAX)',
        stream_type: 'movie',
        stream_id: 206,
        stream_icon: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=600&fit=crop',
        backdrop: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1280&h=720&fit=crop',
        rating: 8.7,
        year: '2024',
        duration: '1h 35m',
        durationSec: 5700,
        category_id: 'drama',
        plot: 'سيمفونية بصرية مذهلة تسجل تناغم فصول الطبيعة وسحر الحياة في أعماق الغابات الاستوائية النادرة.',
        director: 'لوك جاكيه',
        cast: 'فرانسيس هالي',
        direct_source: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        container_extension: 'mp4'
      },
      {
        num: 7,
        name: 'محارب الظل: الشفرة الأخيرة (Action Strike 4K)',
        stream_type: 'movie',
        stream_id: 207,
        stream_icon: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400&h=600&fit=crop',
        backdrop: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1280&h=720&fit=crop',
        rating: 8.9,
        year: '2024',
        duration: '2h 15m',
        durationSec: 8100,
        category_id: 'action',
        plot: 'ضابط عمليات خاصة متقاعد يُستدرج إلى مهمة دولية خطيرة لمنع منظمة سيبرانية غامضة من السيطرة على شبكات الطاقة.',
        director: 'كريستوفر ماكواري',
        cast: 'توم كروز، هنري كافيل، ريبيكا فيرجسون',
        direct_source: 'https://assets.afcdn.com/video49/20210722/v_645516.m3u8',
        container_extension: 'm3u8'
      },
      {
        num: 8,
        name: 'مواجهة المصير (The 300 Chronicles)',
        stream_type: 'movie',
        stream_id: 208,
        stream_icon: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop',
        backdrop: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1280&h=720&fit=crop',
        rating: 8.6,
        year: '2023',
        duration: '1h 50m',
        durationSec: 6600,
        category_id: 'action',
        plot: 'ملحمة المحاربين وتضحيتهم الأسطورية في مضيق الموت دفاعاً عن الشرف والحرية.',
        director: 'زاك شنايدر',
        cast: 'جيرارد بتلر، لينا هيدي',
        direct_source: 'https://media.w3.org/2010/05/video/movie_300.mp4',
        container_extension: 'mp4'
      }
    ];

    if (categoryId === 'all') return list;
    return list.filter(m => m.category_id === categoryId);
  }

  /**
   * Get Series Categories (fetches real categories from IPTV server or falls back to curated)
   */
  public static async getSeriesCategories(): Promise<{ category_id: string; category_name: string }[]> {
    if (this.seriesCategoriesCache && this.seriesCategoriesCache.length > 0) {
      return this.seriesCategoriesCache;
    }

    const account = ActivationService.getSavedAccount();
    if (account?.isLiveServer && account?.serverUrl && account?.username && account.serverUrl.startsWith('http')) {
      try {
        const baseUrl = account.serverUrl.replace(/\/+$/, '');
        const target = `${baseUrl}/player_api.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password || '')}&action=get_series_categories`;
        const res = await this.fetchWithTimeout(target, {}, 3500);
        if (res.ok) {
          const remoteCats = await res.json();
          if (Array.isArray(remoteCats) && remoteCats.length > 0) {
            const result = [
              { category_id: 'all', category_name: '★ جميع المسلسلات' },
              ...remoteCats.map((c: any) => ({
                category_id: String(c.category_id),
                category_name: c.category_name || `باقة ${c.category_id}`
              }))
            ];
            this.seriesCategoriesCache = result;
            return result;
          }
        }
      } catch (e) {
        console.warn('[XtreamService] Remote series categories fetch failed, using fallback:', e);
      }
    }

    const fallback = [
      { category_id: 'all', category_name: '★ جميع المسلسلات' },
      { category_id: 'fantasy', category_name: '⚔️ خيال ومغامرات أسطورية' },
      { category_id: 'sci-fi', category_name: '🚀 خيال علمي وفضاء 4K' },
      { category_id: 'drama', category_name: '🎭 دراما وتشويق سينمائي' },
      { category_id: 'animation', category_name: '✨ رسوم متحركة وأنمي 4K' }
    ];
    this.seriesCategoriesCache = fallback;
    return fallback;
  }

  /**
   * Get Series List (fetches real series list from IPTV server or falls back to curated)
   * Prevents large JSON download freezes by querying by category!
   */
  public static getCachedSeriesList(categoryId: string = 'all'): SeriesItem[] | null {
    const account = ActivationService.getSavedAccount();
    if (!account?.isLiveServer) {
      return null;
    }
    if (this.seriesListCache.has(categoryId)) {
      return this.seriesListCache.get(categoryId)!;
    }
    try {
      const raw = localStorage.getItem(`tizen_series_list_${categoryId}`);
      if (raw) {
        const parsed: SeriesItem[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.seriesListCache.set(categoryId, parsed);
          return parsed;
        }
      }
    } catch {}
    return null;
  }

  public static async getSeriesList(categoryId: string = 'all'): Promise<SeriesItem[]> {
    const cached = this.getCachedSeriesList(categoryId);
    if (cached && cached.length > 0) {
      return cached;
    }

    const account = ActivationService.getSavedAccount();
    if (account?.isLiveServer && account?.serverUrl && account?.username && account.serverUrl.startsWith('http')) {
      try {
        const baseUrl = account.serverUrl.replace(/\/+$/, '');
        let targetCatId = categoryId;
        if (categoryId === 'all') {
          const cats = await this.getSeriesCategories();
          const firstReal = cats.find(c => c.category_id !== 'all');
          if (firstReal) {
            targetCatId = firstReal.category_id;
          }
        }

        const catParam = targetCatId !== 'all' ? `&category_id=${encodeURIComponent(targetCatId)}` : '';
        const target = `${baseUrl}/player_api.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password || '')}&action=get_series${catParam}`;
        const res = await this.fetchWithTimeout(target, {}, 7000);
        if (res.ok) {
          const remoteSeries = await res.json();
          if (Array.isArray(remoteSeries) && remoteSeries.length > 0) {
            const mapped: SeriesItem[] = remoteSeries.map((s: any, idx: number) => 
              this.mapRawSeriesItem(s, idx, targetCatId)
            );

            this.seriesListCache.set(targetCatId, mapped);
            if (categoryId === 'all') {
              this.seriesListCache.set('all', mapped);
            }
            try {
              localStorage.setItem(`tizen_series_list_${targetCatId}`, JSON.stringify(mapped));
              if (categoryId === 'all') {
                localStorage.setItem('tizen_series_list_all', JSON.stringify(mapped));
              }
            } catch {}
            return mapped;
          }
        }
      } catch (e) {
        console.warn('[XtreamService] Remote series fetch failed, using fallback:', e);
      }
    }

    return this.getCuratedSeries(categoryId);
  }

  /**
   * Helper to map raw series item from Xtream API to typed SeriesItem
   */
  public static mapRawSeriesItem(s: any, idx: number, fallbackCatId = ''): SeriesItem {
    const seriesId = parseInt(s.series_id, 10) || (idx + 1);
    const rawRating = parseFloat(s.rating || s.rating_5based || '8.8');
    const rating = isNaN(rawRating) || rawRating <= 0 ? 8.8 : Math.round(rawRating * 10) / 10;
    const nameStr = s.name || `Series ${idx + 1}`;
    const yearMatch = nameStr.match(/\b(19\d\d|20\d\d)\b/);
    const releaseDate = s.releaseDate ? String(s.releaseDate).split('-')[0] : (yearMatch ? yearMatch[1] : '2024');

    return {
      series_id: seriesId,
      name: nameStr,
      cover: this.optimizeImageUrl(s.cover) || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop',
      backdrop: this.optimizeImageUrl((Array.isArray(s.backdrop_path) && s.backdrop_path[0]) || s.backdrop_path || s.cover),
      plot: s.plot || 'مسلسل درامي مميز بحلقات كاملة وجودة 4K من سيرفر IPTV.',
      cast: s.cast || undefined,
      director: s.director || undefined,
      genre: s.genre || 'دراما • إثارة • تشويق',
      releaseDate: String(releaseDate),
      rating,
      category_id: String(s.category_id || fallbackCatId),
      seasonsCount: parseInt(s.seasons_count || s.num_seasons || '1', 10) || 1,
      seasons: []
    };
  }

  /**
   * Pre-fetches and returns the complete master series catalog (all 10,000+ series across all categories).
   * Loaded in background to power global instant search across all series.
   */
  public static async getAllSeriesMaster(): Promise<SeriesItem[]> {
    if (this.allSeriesMaster && this.allSeriesMaster.length > 0) {
      return this.allSeriesMaster;
    }

    if (this.isFetchingSeriesMaster) {
      return new Promise<SeriesItem[]>((resolve) => {
        this.seriesMasterWaiters.push(resolve);
      });
    }

    this.isFetchingSeriesMaster = true;
    const account = ActivationService.getSavedAccount();
    if (account?.isLiveServer && account?.serverUrl && account?.username && account.serverUrl.startsWith('http')) {
      try {
        const baseUrl = account.serverUrl.replace(/\/+$/, '');
        const target = `${baseUrl}/player_api.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password || '')}&action=get_series`;
        const res = await this.fetchWithTimeout(target, {}, 12000);
        if (res.ok) {
          const remoteSeries = await res.json();
          if (Array.isArray(remoteSeries) && remoteSeries.length > 0) {
            const mapped = remoteSeries.map((s: any, idx: number) => 
              this.mapRawSeriesItem(s, idx)
            );
            this.allSeriesMaster = mapped;
            this.seriesMasterWaiters.forEach(cb => cb(mapped));
            this.seriesMasterWaiters = [];
            this.isFetchingSeriesMaster = false;
            return mapped;
          }
        }
      } catch (e) {
        console.warn('[XtreamService] Global Series master fetch error:', e);
      }
    }

    this.isFetchingSeriesMaster = false;
    const fallback = this.getCuratedSeries('all');
    this.seriesMasterWaiters.forEach(cb => cb(fallback));
    this.seriesMasterWaiters = [];
    return fallback;
  }

  /**
   * Global search across all series in the entire IPTV server library.
   */
  public static async searchSeriesGlobally(query: string): Promise<SeriesItem[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    // 1. Gather all currently cached series across all loaded categories
    const pool = new Map<number, SeriesItem>();
    this.seriesListCache.forEach((seriesList) => {
      seriesList.forEach(s => {
        if (!pool.has(s.series_id)) pool.set(s.series_id, s);
      });
    });

    // 2. Fetch or use master catalog if available
    try {
      const master = await this.getAllSeriesMaster();
      if (Array.isArray(master) && master.length > 0) {
        master.forEach(s => {
          if (!pool.has(s.series_id)) pool.set(s.series_id, s);
        });
      }
    } catch (e) {
      console.warn('[XtreamService] searchSeriesGlobally master error:', e);
    }

    const allItems = Array.from(pool.values());
    return allItems.filter(s => matchesItemMetadata(s, query));
  }

  /**
   * Curated offline fallback series list
   */
  private static getCuratedSeries(categoryId: string = 'all'): SeriesItem[] {
    const list: SeriesItem[] = [
      {
        series_id: 301,
        name: 'آل التنين (House of the Dragon 4K)',
        cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop',
        backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1280&h=720&fit=crop',
        plot: 'صراع عائلة التارجاريان الدامي على العرش الحديدي في ويستروس وحرب الرقص مع التنانين الأسطورية.',
        cast: 'مات سميث، إيما دارسي، أوليفيا كوك',
        director: 'ميغيل سابوجنيك',
        genre: 'خيال ملحمي • حروب عروش • دراما',
        releaseDate: '2024',
        rating: 8.9,
        category_id: 'fantasy',
        seasonsCount: 2,
        seasons: [
          {
            season_number: 1,
            name: 'الموسم 1: وريث العرش والرقص مع التنانين',
            episode_count: 4,
            episodes: [
              {
                id: '301-1-1',
                episode_num: 1,
                season_num: 1,
                title: 'ورثة التنين (The Heirs of the Dragon)',
                overview: 'الملك فيسيريس ينظم مبارزة ملكية للاحتفال بمولوده القادم، بينما تبدأ رينيرا في إدراك مسؤولياتها.',
                duration: '66 دقيقة',
                durationSec: 3960,
                stream_id: 30101,
                stream_icon: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=320&h=180&fit=crop',
                direct_source: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
                rating: 8.9,
                release_date: '2022-08-21'
              },
              {
                id: '301-1-2',
                episode_num: 2,
                season_num: 1,
                title: 'الأمير المارق (The Rogue Prince)',
                overview: 'دايمون يستولي على حجر التنين في تحدٍ سافر، ورينيرا تتدخل لمنع اندلاع مواجهة دموية مبكرة.',
                duration: '54 دقيقة',
                durationSec: 3240,
                stream_id: 30102,
                stream_icon: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=320&h=180&fit=crop',
                direct_source: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
                rating: 8.7,
                release_date: '2022-08-28'
              },
              {
                id: '301-1-3',
                episode_num: 3,
                season_num: 1,
                title: 'الثاني من اسمه (Second of His Name)',
                overview: 'رحلة صيد ملكية تتصاعد فيها التوترات السياسية، ودايمون يخوض حرباً طاحنة في جزر العتبات.',
                duration: '63 دقيقة',
                durationSec: 3780,
                stream_id: 30103,
                stream_icon: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=320&h=180&fit=crop',
                direct_source: 'https://content.jwplatform.com/manifests/vM7nH0Kl.m3u8',
                rating: 8.8,
                release_date: '2022-09-04'
              },
              {
                id: '301-1-4',
                episode_num: 4,
                season_num: 1,
                title: 'ملك البحر الضيق (King of the Narrow Sea)',
                overview: 'دايمون يعود منتصراً إلى كينجز لاندينج، وقرارات عاطفية تهدد بتغيير مصير الحكم والخلافة للأبد.',
                duration: '58 دقيقة',
                durationSec: 3480,
                stream_id: 30104,
                stream_icon: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=320&h=180&fit=crop',
                direct_source: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
                rating: 9.1,
                release_date: '2022-09-11'
              }
            ]
          },
          {
            season_number: 2,
            name: 'الموسم 2: نار ودم (Blood & Fire)',
            episode_count: 2,
            episodes: [
              {
                id: '301-2-1',
                episode_num: 1,
                season_num: 2,
                title: 'ابن مقابل ابن (A Son for a Son)',
                overview: 'رينيرا تحزن على خسارتها الفادحة، ودايمون يخطط لرد انتقامي مدمر يزلزل العاصمة.',
                duration: '64 دقيقة',
                durationSec: 3840,
                stream_id: 30121,
                stream_icon: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=320&h=180&fit=crop',
                direct_source: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
                rating: 9.4,
                release_date: '2024-06-16'
              },
              {
                id: '301-2-2',
                episode_num: 2,
                season_num: 2,
                title: 'التنين الأحمر والذهبي (The Red Dragon and the Gold)',
                overview: 'معركة استراحة الغراب: اشتباك جوي ملحمي بين كبار التنانين يغير موازين القوى.',
                duration: '56 دقيقة',
                durationSec: 3360,
                stream_id: 30122,
                stream_icon: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=320&h=180&fit=crop',
                direct_source: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
                rating: 9.7,
                release_date: '2024-07-07'
              }
            ]
          }
        ]
      },
      {
        series_id: 302,
        name: 'أفق الفضاء المظلم (Dark Horizon Odyssey 4K)',
        cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=600&fit=crop',
        backdrop: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1280&h=720&fit=crop',
        plot: 'فريق من رواد الفضاء يواجهون ظواهر فيزيائية مجهولة وثقوباً دودية تعيد كتابة مفهوم الزمان والمكان.',
        cast: 'كيليان ميرفي، إميلي بلانت، ماثيو ماكونهي',
        director: 'كريستوفر نولان',
        genre: 'خيال علمي • فضاء • ألغاز كونية',
        releaseDate: '2024',
        rating: 9.2,
        category_id: 'sci-fi',
        seasonsCount: 1,
        seasons: [
          {
            season_number: 1,
            name: 'الموسم 1: نداء ما بعد المدار',
            episode_count: 3,
            episodes: [
              {
                id: '302-1-1',
                episode_num: 1,
                season_num: 1,
                title: 'النداء الأول من زحل (The Saturn Signal)',
                overview: 'استقبال إشارة راديوية غامضة تنبعث من مدار كوكب زحل تحمل تسلسلاً رياضياً متطوراً.',
                duration: '58 دقيقة',
                durationSec: 3480,
                stream_id: 30201,
                stream_icon: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=320&h=180&fit=crop',
                direct_source: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8',
                rating: 9.0,
                release_date: '2024-01-10'
              },
              {
                id: '302-1-2',
                episode_num: 2,
                season_num: 1,
                title: 'العبور إلى المجهول (The Crossing)',
                overview: 'دخول السفينة الاستكشافية في فوهة الثقب الدودي وبدء تمدد الزمن المذهل لطاقم الرحلة.',
                duration: '52 دقيقة',
                durationSec: 3120,
                stream_id: 30202,
                stream_icon: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=320&h=180&fit=crop',
                direct_source: 'https://content.jwplatform.com/manifests/vM7nH0Kl.m3u8',
                rating: 9.3,
                release_date: '2024-01-17'
              },
              {
                id: '302-1-3',
                episode_num: 3,
                season_num: 1,
                title: 'عالم الأمواج العملاقة (Miller\'s Planet)',
                overview: 'الهبوط على كوكب مائي بالكامل حيث كل دقيقة تعادل عدة سنوات على سطح الأرض.',
                duration: '60 دقيقة',
                durationSec: 3600,
                stream_id: 30203,
                stream_icon: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=320&h=180&fit=crop',
                direct_source: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
                rating: 9.5,
                release_date: '2024-01-24'
              }
            ]
          }
        ]
      },
      {
        series_id: 303,
        name: 'أساطير الأنمي والمغامرة (Sintel Chronicles)',
        cover: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&h=600&fit=crop',
        backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&h=720&fit=crop',
        plot: 'ملحمة الأنمي الأسطورية في عالم السحر والتنانين، وصراع الأبطال لحماية قواهم الخارقة من القوى المظلمة.',
        cast: 'نجوم الدوبلاج العربي الأصلي',
        director: 'كولن ليفي',
        genre: 'أنمي • مغامرات • أساطير',
        releaseDate: '2024 Remastered',
        rating: 9.1,
        category_id: 'animation',
        seasonsCount: 1,
        seasons: [
          {
            season_number: 1,
            name: 'الموسم 1: عهد التنين',
            episode_count: 3,
            episodes: [
              {
                id: '303-1-1',
                episode_num: 1,
                season_num: 1,
                title: 'بداية الرحلة في وادي الثلج',
                overview: 'العثور على فرخ التنين المصاب وبداية الرابطة السحرية التي لا تنكسر.',
                duration: '45 دقيقة',
                durationSec: 2700,
                stream_id: 30301,
                stream_icon: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=320&h=180&fit=crop',
                direct_source: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
                rating: 9.0,
                release_date: '2024-03-01'
              },
              {
                id: '303-1-2',
                episode_num: 2,
                season_num: 1,
                title: 'الصحراء المشتعلة وحراس البوابة',
                overview: 'مواجهة جيش المرتزقة عند أسوار القلعة المهجورة وسط رمال الصحراء.',
                duration: '48 دقيقة',
                durationSec: 2880,
                stream_id: 30302,
                stream_icon: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=320&h=180&fit=crop',
                direct_source: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
                rating: 9.2,
                release_date: '2024-03-08'
              },
              {
                id: '303-1-3',
                episode_num: 3,
                season_num: 1,
                title: 'المعركة الحاسمة على قمة البركان',
                overview: 'المواجهة النهائية المؤثرة التي تكشف حقيقة التنين الأسود القديم.',
                duration: '52 دقيقة',
                durationSec: 3120,
                stream_id: 30303,
                stream_icon: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=320&h=180&fit=crop',
                direct_source: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
                rating: 9.6,
                release_date: '2024-03-15'
              }
            ]
          }
        ]
      }
    ];

    if (categoryId === 'all') return list;
    return list.filter(s => s.category_id === categoryId);
  }

  /**
   * Get full Series details including all Seasons & Episodes from Xtream Codes API
   */
  public static async getSeriesInfo(seriesId: number): Promise<SeriesItem | undefined> {
    const account = ActivationService.getSavedAccount();
    if (account?.serverUrl && account?.username && account.serverUrl.startsWith('http')) {
      try {
        const baseUrl = account.serverUrl.replace(/\/+$/, '');
        const target = `${baseUrl}/player_api.php?username=${encodeURIComponent(account.username)}&password=${encodeURIComponent(account.password || '')}&action=get_series_info&series_id=${seriesId}`;
        const res = await fetch(this.getProxiedUrl(target));
        if (res.ok) {
          const data = await res.json();
          if (data && (data.info || data.episodes)) {
            const info = data.info || {};
            const rawRating = parseFloat(info.rating || info.rating_5based || '8.8');
            const rating = isNaN(rawRating) || rawRating <= 0 ? 8.8 : Math.round(rawRating * 10) / 10;
            const seasonsRaw = Array.isArray(data.seasons) ? data.seasons : [];
            const episodesMap = data.episodes || {};

            const seasons: SeriesSeason[] = [];

            if (seasonsRaw.length > 0) {
              seasonsRaw.forEach((s: any) => {
                const sNum = parseInt(s.season_number, 10) || 1;
                const epsRaw = episodesMap[String(sNum)] || episodesMap[sNum] || [];
                const episodes: SeriesEpisode[] = Array.isArray(epsRaw) ? epsRaw.map((ep: any, eIdx: number) => {
                  const epNum = parseInt(ep.episode_num, 10) || (eIdx + 1);
                  const epId = ep.id || `${seriesId}-${sNum}-${epNum}`;
                  const containerExt = ep.container_extension || 'mp4';
                  const durSec = parseInt(ep.info?.duration_secs || '2700', 10) || 2700;
                  const mins = Math.round(durSec / 60);

                  return {
                    id: epId,
                    episode_num: epNum,
                    season_num: sNum,
                    title: ep.title || `الحلقة ${epNum}`,
                    overview: ep.info?.plot || ep.info?.overview || 'أحداث درامية مشوقة ومثيرة بجودة فائقة.',
                    duration: `${mins} دقيقة`,
                    durationSec: durSec,
                    stream_id: parseInt(epId, 10) || (eIdx + 1),
                    stream_icon: ep.info?.movie_image || info.cover || '',
                    direct_source: `${baseUrl}/series/${encodeURIComponent(account.username)}/${encodeURIComponent(account.password || '')}/${epId}.${containerExt}`,
                    rating: parseFloat(ep.info?.rating || '8.5') || 8.5,
                    release_date: ep.info?.releasedate || ''
                  };
                }) : [];

                seasons.push({
                  season_number: sNum,
                  name: s.name || `الموسم ${sNum}`,
                  episode_count: episodes.length || (parseInt(s.episode_count, 10) || 1),
                  episodes
                });
              });
            } else {
              Object.keys(episodesMap).forEach((seasonKey) => {
                const sNum = parseInt(seasonKey, 10) || 1;
                const epsRaw = episodesMap[seasonKey] || [];
                const episodes: SeriesEpisode[] = Array.isArray(epsRaw) ? epsRaw.map((ep: any, eIdx: number) => {
                  const epNum = parseInt(ep.episode_num, 10) || (eIdx + 1);
                  const epId = ep.id || `${seriesId}-${sNum}-${epNum}`;
                  const containerExt = ep.container_extension || 'mp4';
                  const durSec = parseInt(ep.info?.duration_secs || '2700', 10) || 2700;
                  const mins = Math.round(durSec / 60);

                  return {
                    id: epId,
                    episode_num: epNum,
                    season_num: sNum,
                    title: ep.title || `الحلقة ${epNum}`,
                    overview: ep.info?.plot || ep.info?.overview || 'أحداث درامية مشوقة ومثيرة بجودة فائقة.',
                    duration: `${mins} دقيقة`,
                    durationSec: durSec,
                    stream_id: parseInt(epId, 10) || (eIdx + 1),
                    stream_icon: ep.info?.movie_image || info.cover || '',
                    direct_source: `${baseUrl}/series/${encodeURIComponent(account.username)}/${encodeURIComponent(account.password || '')}/${epId}.${containerExt}`,
                    rating: parseFloat(ep.info?.rating || '8.5') || 8.5,
                    release_date: ep.info?.releasedate || ''
                  };
                }) : [];

                seasons.push({
                  season_number: sNum,
                  name: `الموسم ${sNum}`,
                  episode_count: episodes.length,
                  episodes
                });
              });
            }

            return {
              series_id: seriesId,
              name: info.name || `Series ${seriesId}`,
              cover: info.cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop',
              backdrop: (Array.isArray(info.backdrop_path) && info.backdrop_path[0]) || info.backdrop_path || info.cover,
              plot: info.plot || 'مسلسل درامي مميز بحلقات كاملة وجودة 4K.',
              cast: info.cast || undefined,
              director: info.director || undefined,
              genre: info.genre || 'دراما • إثارة • تشويق',
              releaseDate: info.releaseDate ? String(info.releaseDate).split('-')[0] : '2024',
              rating,
              category_id: String(info.category_id || 'all'),
              seasonsCount: seasons.length || 1,
              seasons
            };
          }
        }
      } catch (e) {
        console.warn(`[XtreamService] Remote series info fetch failed for #${seriesId}:`, e);
      }
    }

    const all = this.getCuratedSeries('all');
    return all.find(s => s.series_id === seriesId);
  }

  /**
   * Get Series by ID
   */
  public static async getSeriesById(seriesId: number): Promise<SeriesItem | undefined> {
    return this.getSeriesInfo(seriesId);
  }
}
