export type DeviceMode = 'tv' | 'mobile';

export class DeviceDetector {
  private static OVERRIDE_KEY = 'nova_device_mode_override';

  /**
   * Get current device mode: 'tv' or 'mobile'
   */
  public static getDeviceMode(): DeviceMode {
    if (typeof window === 'undefined') return 'tv';

    // 1. Check user manual override in localStorage
    const override = localStorage.getItem(this.OVERRIDE_KEY);
    if (override === 'tv' || override === 'mobile') {
      return override;
    }

    // 2. Hardware TV checks (Tizen, webOS, Android TV)
    if ((window as any).tizen || (window as any).webOS) return 'tv';

    const ua = navigator.userAgent || '';
    const tvKeywords = [
      'Tizen', 'SMART-TV', 'SmartTV', 'webOS', 'NetCast', 
      'BRAVIA', 'Viera', 'HbbTV', 'Android TV', 'AndroidTV', 
      'AFTM', 'AFTT', 'AFTB', 'AFTS', 'FireTV', 'Roku', 'AppleTV'
    ];
    const isTvUa = tvKeywords.some(kw => new RegExp(kw, 'i').test(ua));
    if (isTvUa) return 'tv';

    // 3. Large screens (> 1024px) always default to TV mode
    if (window.innerWidth > 1024) {
      return 'tv';
    }

    // 4. Mobile & Tablet screens (<= 1024px)
    return 'mobile';
  }

  public static isMobile(): boolean {
    return this.getDeviceMode() === 'mobile';
  }

  public static isTV(): boolean {
    return this.getDeviceMode() === 'tv';
  }

  public static setDeviceModeOverride(mode: DeviceMode | 'auto'): void {
    if (mode === 'auto') {
      localStorage.removeItem(this.OVERRIDE_KEY);
    } else {
      localStorage.setItem(this.OVERRIDE_KEY, mode);
    }
    const current = this.getDeviceMode();
    document.documentElement.setAttribute('data-device', current);
    window.dispatchEvent(new Event('device-mode-changed'));
  }

  public static getOverride(): string | null {
    return localStorage.getItem(this.OVERRIDE_KEY);
  }
}
