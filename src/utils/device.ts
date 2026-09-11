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

    // 2. Hardware TV checks (Tizen, webOS)
    if ((window as any).tizen) return 'tv';
    if ((window as any).webOS) return 'tv';

    const ua = navigator.userAgent || '';

    // Smart TV User-Agents
    const tvKeywords = [
      'Tizen', 'SMART-TV', 'SmartTV', 'webOS', 'NetCast', 
      'BRAVIA', 'Viera', 'HbbTV', 'Android TV', 'AndroidTV', 
      'AFTM', 'AFTT', 'AFTB', 'AFTS', 'FireTV', 'Roku', 'AppleTV'
    ];
    const isTvUa = tvKeywords.some(kw => new RegExp(kw, 'i').test(ua));
    if (isTvUa) return 'tv';

    // 3. Mobile / Tablet checks
    const mobileKeywords = ['Android', 'iPhone', 'iPad', 'iPod', 'Mobile', 'Tablet'];
    const isMobileUa = mobileKeywords.some(kw => new RegExp(kw, 'i').test(ua));

    // Touch device with screen width <= 1024px or mobile UA
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isSmallScreen = window.innerWidth <= 1024;

    if (isMobileUa || (isTouch && isSmallScreen)) {
      return 'mobile';
    }

    // Default for desktop browsers and big screens:
    // If width < 900 -> mobile, else -> tv
    return window.innerWidth <= 900 ? 'mobile' : 'tv';
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
    // Update data-device attribute on html element
    const current = this.getDeviceMode();
    document.documentElement.setAttribute('data-device', current);
    window.dispatchEvent(new Event('device-mode-changed'));
  }

  public static getOverride(): string | null {
    return localStorage.getItem(this.OVERRIDE_KEY);
  }
}
