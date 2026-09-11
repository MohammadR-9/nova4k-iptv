/**
 * LG webOS Platform Adapter & Magic Remote Integration
 * Provides native compatibility for LG Smart TVs running webOS 3.0+ to 24+
 * Supports Magic Remote Air Mouse, Scroll Wheel, webOS Back Key (461), and lifecycle events.
 */

export interface WebOSDeviceInfo {
  isWebOS: boolean;
  modelName?: string;
  version?: string;
  sdkVersion?: string;
  screenResolution?: { width: number; height: number };
  hasMagicRemote: boolean;
}

export class WebOSAdapter {
  private static instance: WebOSAdapter | null = null;
  private isWebOSPlatform = false;
  private pointerActive = false;
  private lastScrollTime = 0;

  // webOS Hardware Specific Keycodes
  public static readonly KEY_CODES = {
    BACK: 461,          // LG webOS native Return / Back button
    ENTER: 13,          // Magic Remote Wheel Click (OK)
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    RED: 403,
    GREEN: 404,
    YELLOW: 405,
    BLUE: 406,
    PLAY: 415,
    PAUSE: 19,
    STOP: 413,
    FAST_FORWARD: 417,
    REWIND: 412,
    CHANNEL_UP: 427,
    CHANNEL_DOWN: 428,
    VOLUME_UP: 447,
    VOLUME_DOWN: 448,
    MUTE: 449
  };

  private constructor() {
    this.detectPlatform();
    this.initMagicRemotePointer();
    this.initWheelScroll();
    this.initLifecycleListeners();
  }

  public static getInstance(): WebOSAdapter {
    if (!WebOSAdapter.instance) {
      WebOSAdapter.instance = new WebOSAdapter();
    }
    return WebOSAdapter.instance;
  }

  /**
   * Detects if current environment is an LG Smart TV running webOS
   */
  private detectPlatform(): void {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || '';
    const hasWebOSObj = !!(window as any).webOS;
    const isWebOSUa = /Web0S|webOS/i.test(ua);

    this.isWebOSPlatform = hasWebOSObj || isWebOSUa;

    if (this.isWebOSPlatform) {
      console.log('[webOS Adapter] Detected LG webOS Smart TV Platform');
      document.documentElement.classList.add('platform-webos');
    }
  }

  public isWebOS(): boolean {
    return this.isWebOSPlatform;
  }

  /**
   * Initializes LG Magic Remote Air Mouse cursor tracking
   */
  private initMagicRemotePointer(): void {
    if (typeof window === 'undefined') return;

    // Detect mouse move events from LG Magic Remote pointer
    window.addEventListener('mousemove', (_e) => {
      if (!this.pointerActive) {
        this.pointerActive = true;
        document.body.classList.add('webos-pointer-mode');
      }
    }, { passive: true });

    // When D-Pad arrow key is pressed, disable pointer mode to restore clean spatial TV focus
    window.addEventListener('keydown', (e) => {
      if ([37, 38, 39, 40].includes(e.keyCode)) {
        if (this.pointerActive) {
          this.pointerActive = false;
          document.body.classList.remove('webos-pointer-mode');
        }
      }
    }, { passive: true });
  }

  /**
   * Handles LG Magic Remote Wheel scrolling (Up/Down)
   */
  private initWheelScroll(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('wheel', (e) => {
      const now = Date.now();
      if (now - this.lastScrollTime < 180) return; // Throttle wheel events
      this.lastScrollTime = now;

      // Dispatch virtual KeyDown for Channel / List Navigation
      const isScrollDown = e.deltaY > 0;
      const syntheticKeyCode = isScrollDown ? WebOSAdapter.KEY_CODES.DOWN : WebOSAdapter.KEY_CODES.UP;

      const syntheticEvent = new KeyboardEvent('keydown', {
        keyCode: syntheticKeyCode,
        which: syntheticKeyCode,
        bubbles: true,
        cancelable: true
      });
      window.dispatchEvent(syntheticEvent);
    }, { passive: true });
  }

  /**
   * Subscribes to LG webOS app lifecycle events
   */
  private initLifecycleListeners(): void {
    if (typeof window === 'undefined') return;

    // webOS app launch / resume
    document.addEventListener('webOSLaunch', () => {
      console.log('[webOS Adapter] App Launched on LG webOS');
    });

    // webOS app visibility change
    document.addEventListener('webOSVisibilityChange', (e: any) => {
      if (e.detail && e.detail.hidden) {
        console.log('[webOS Adapter] App Hidden/Suspended');
      } else {
        console.log('[webOS Adapter] App Resumed/Visible');
      }
    });
  }

  /**
   * Translates incoming event keycode ensuring LG webOS Return (461) maps to back action
   */
  public isBackKey(keyCode: number): boolean {
    return (
      keyCode === WebOSAdapter.KEY_CODES.BACK || // webOS 461
      keyCode === 10009 ||                       // Tizen RETURN
      keyCode === 27 ||                          // ESCAPE
      keyCode === 8                              // BACKSPACE
    );
  }

  /**
   * Programmatically closes the application on LG webOS
   */
  public exitApp(): void {
    try {
      if ((window as any).webOS && typeof (window as any).webOS.platformBack === 'function') {
        (window as any).webOS.platformBack();
      } else if (typeof window.close === 'function') {
        window.close();
      }
    } catch (e) {
      console.warn('[webOS Adapter] Unable to exit app automatically:', e);
    }
  }

  /**
   * Retrieves device information from webOS system APIs
   */
  public getDeviceInfo(): WebOSDeviceInfo {
    return {
      isWebOS: this.isWebOSPlatform,
      modelName: typeof navigator !== 'undefined' ? navigator.userAgent : 'LG Smart TV',
      hasMagicRemote: true,
      screenResolution: typeof window !== 'undefined' 
        ? { width: window.innerWidth, height: window.innerHeight } 
        : { width: 1920, height: 1080 }
    };
  }
}

export const webOSAdapter = WebOSAdapter.getInstance();
