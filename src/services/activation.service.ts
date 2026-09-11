import { UserAccount } from '../types/iptv.types';
import { SERVER_CONFIG } from '../config/server.config';
import { XtreamService } from './xtream.service';

interface RegisteredCodeInfo {
  username: string;
  name: string;
  status: 'Active';
  expDate: string;
  daysRemaining: number;
  maxConnections: number;
  packageType: string;
}

export class ActivationService {
  private static STORAGE_KEY = 'iptv_active_account';

  public static readonly REGISTERED_CODES: Record<string, RegisteredCodeInfo> = {
    'NOVA-4K': {
      username: 'VIP_NOVA_4K_ULTRA',
      name: 'باقة NOVA 4K ULTRA الملكية (سنة كاملة)',
      status: 'Active',
      expDate: '2027-09-09',
      daysRemaining: 365,
      maxConnections: 4,
      packageType: 'NOVA 4K ULTRA VIP'
    },
    'NOVA-ULTRA': {
      username: 'VIP_NOVA_ULTRA_CINEMA',
      name: 'باقة NOVA 4K السينمائية والرياضية (6 أشهر)',
      status: 'Active',
      expDate: '2027-03-09',
      daysRemaining: 180,
      maxConnections: 2,
      packageType: 'NOVA 4K Cinema'
    },
    '882419': {
      username: 'VIP_NOVA_8824',
      name: 'اشتراك NOVA 4K VIP الشامل (سنة كاملة)',
      status: 'Active',
      expDate: '2027-09-09',
      daysRemaining: 365,
      maxConnections: 2,
      packageType: 'VIP 4K Ultra'
    },
    'LOOK4K-PRO': {
      username: 'VIP_LOOK4K_PRO',
      name: 'باقة Look4k Pro سينما ورياضة (6 أشهر)',
      status: 'Active',
      expDate: '2027-03-09',
      daysRemaining: 180,
      maxConnections: 2,
      packageType: 'Pro 4K HDR'
    },
    'SHAMNA-VIP': {
      username: 'VIP_SHAMNA_SPORT',
      name: 'باقة شامنا بريميوم الرياضية (3 أشهر)',
      status: 'Active',
      expDate: '2026-12-09',
      daysRemaining: 90,
      maxConnections: 1,
      packageType: 'Shamna Sport'
    },
    'DEMO-2026': {
      username: 'TRIAL_USER_7788',
      name: 'حساب تجريبي مجاني (48 ساعة)',
      status: 'Active',
      expDate: '2026-09-11',
      daysRemaining: 2,
      maxConnections: 1,
      packageType: '48H Trial'
    }
  };

  // Officially Authorized Local Accounts for Credential Login (offline demo/testing)
  public static readonly REGISTERED_ACCOUNTS: Record<string, { pass: string; expDate: string; daysRemaining: number }> = {
    'vip_user': { pass: 'pass7788', expDate: '2027-09-09', daysRemaining: 365 },
    'look4k_admin': { pass: 'admin2026', expDate: '2027-12-31', daysRemaining: 480 }
  };

  /**
   * Activate via Activation Code (Look4k / Shamna Pattern)
   * Connects to Look4k server (http://look4k.net:8080) first.
   * If recognized by the live server, logs in as live subscriber.
   * If server rejects (401 INVALID_AUTH), checks registered VIP demo records.
   */
  public static async activateByCode(activationCode: string, serverUrl?: string): Promise<UserAccount> {
    const cleanCode = activationCode.trim().toUpperCase();
    if (!cleanCode) {
      throw new Error('يرجى كتابة كود التفعيل أولاً.');
    }

    const host = serverUrl?.trim() || SERVER_CONFIG.DEFAULT_PORTAL_URL;

    // 1. Attempt Live Server Authentication against Look4k (or specified server)
    try {
      const authData = await XtreamService.authenticate(host, cleanCode, cleanCode);
      if (authData?.user_info && authData.user_info.auth === 1) {
        const expTimestamp = parseInt(authData.user_info.exp_date, 10);
        const expDate = isNaN(expTimestamp) ? '2027-09-09' : new Date(expTimestamp * 1000).toISOString().split('T')[0];
        const daysRemaining = isNaN(expTimestamp) ? 365 : Math.max(0, Math.ceil((expTimestamp * 1000 - Date.now()) / (1000 * 60 * 60 * 24)));

        const account: UserAccount = {
          username: authData.user_info.username || cleanCode,
          password: cleanCode,
          authType: 'code',
          status: (authData.user_info.status === 'Active' ? 'Active' : 'Expired') as any,
          expDate,
          daysRemaining,
          maxConnections: parseInt(authData.user_info.max_connections || '1', 10),
          activeConnections: parseInt(authData.user_info.active_cons || '0', 10),
          serverUrl: host,
          isLiveServer: true,
          serverName: host.includes('look4k') ? 'سيرفر Look4k الرسمي (مباشر)' : 'سيرفر خارجي (مباشر)'
        };
        this.saveAccount(account);
        return account;
      }
    } catch (err: any) {
      console.log(`[ActivationService] Live server authentication attempt on ${host} returned:`, err?.message);
    }

    // 2. Fallback to STRICT REGISTERED VIP DATABASE for simulation/testing
    const matchedRecord = this.REGISTERED_CODES[cleanCode];
    if (matchedRecord) {
      const account: UserAccount = {
        username: matchedRecord.username,
        password: cleanCode,
        authType: 'code',
        status: matchedRecord.status,
        expDate: matchedRecord.expDate,
        daysRemaining: matchedRecord.daysRemaining,
        maxConnections: matchedRecord.maxConnections,
        activeConnections: 1,
        serverUrl: host,
        isLiveServer: false,
        serverName: 'NOVA 4K ULTRA VIP (بث مباشر ملكي)'
      };

      this.saveAccount(account);
      return account;
    }

    // Reject any unregistered or random input
    const cleanHost = host.replace(/^https?:\/\//, '');
    throw new Error(
      `كود التفعيل غير صالح على سيرفر (${cleanHost}). يرجى التحقق من الاشتراك أو تجربة أحد أكواد الـ VIP المعتمدة.`
    );
  }

  /**
   * Activate via Xtream Username & Password
   * Connects to Look4k server (http://look4k.net:8080) first.
   * If credentials are valid, logs in as live subscriber.
   * If server rejects, checks registered system accounts.
   */
  public static async activateByCredentials(username: string, pass: string, serverUrl?: string): Promise<UserAccount> {
    const user = username.trim();
    const password = pass.trim();
    const host = serverUrl?.trim() || SERVER_CONFIG.DEFAULT_PORTAL_URL;

    if (!user || !password) {
      throw new Error('يرجى إدخال اسم المستخدم وكلمة المرور.');
    }

    // 1. Attempt Live Server Authentication against Look4k
    try {
      const authData = await XtreamService.authenticate(host, user, password);
      if (authData?.user_info && authData.user_info.auth === 1) {
        const expTimestamp = parseInt(authData.user_info.exp_date, 10);
        const expDate = isNaN(expTimestamp) ? '2027-09-09' : new Date(expTimestamp * 1000).toISOString().split('T')[0];
        const daysRemaining = isNaN(expTimestamp) ? 365 : Math.max(0, Math.ceil((expTimestamp * 1000 - Date.now()) / (1000 * 60 * 60 * 24)));

        const account: UserAccount = {
          username: authData.user_info.username || user,
          password: password,
          authType: 'credentials',
          status: (authData.user_info.status === 'Active' ? 'Active' : 'Expired') as any,
          expDate,
          daysRemaining,
          maxConnections: parseInt(authData.user_info.max_connections || '1', 10),
          activeConnections: parseInt(authData.user_info.active_cons || '0', 10),
          serverUrl: host,
          isLiveServer: true,
          serverName: host.includes('look4k') ? 'سيرفر Look4k الرسمي (مباشر)' : 'سيرفر خارجي (مباشر)'
        };
        this.saveAccount(account);
        return account;
      }
    } catch (err: any) {
      console.log(`[ActivationService] Live server authentication attempt on ${host} returned:`, err?.message);
    }

    // 2. Fallback to STRICT LOCAL ACCOUNTS CHECK
    const registered = this.REGISTERED_ACCOUNTS[user];
    if (registered && registered.pass === password) {
      const account: UserAccount = {
        username: user,
        password: password,
        authType: 'credentials',
        status: 'Active',
        expDate: registered.expDate,
        daysRemaining: registered.daysRemaining,
        maxConnections: 2,
        activeConnections: 1,
        serverUrl: host,
        isLiveServer: false,
        serverName: 'حساب VIP الافتراضي (تجريبي)'
      };

      this.saveAccount(account);
      return account;
    }

    const cleanHost = host.replace(/^https?:\/\//, '');
    throw new Error(
      `بيانات الدخول غير صحيحة على سيرفر (${cleanHost}). يرجى التأكد من البيانات أو استخدام حساب التجربة (vip_user / pass7788).`
    );
  }

  public static getSavedAccount(): UserAccount | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const acc = JSON.parse(data);
        return acc;
      }
      return null;
    } catch {
      return null;
    }
  }

  public static saveAccount(account: UserAccount): void {
    try {
      const prevRaw = localStorage.getItem(this.STORAGE_KEY);
      if (prevRaw) {
        try {
          const prev = JSON.parse(prevRaw);
          if (prev.username !== account.username || prev.isLiveServer !== account.isLiveServer) {
            this.clearContentCache();
          }
        } catch {}
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(account));
    } catch (e) {
      console.error('[ActivationService] Failed to save account to localStorage:', e);
    }
  }

  public static clearContentCache(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('tizen_live_chs_') ||
          key.startsWith('tizen_vod_movies_') ||
          key.startsWith('tizen_series_') ||
          key.startsWith('tizen_vod_details_') ||
          key.startsWith('tizen_series_info_')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      XtreamService.clearCache();
    } catch {}
  }

  public static logout(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.clearContentCache();
    } catch {}
  }
}
