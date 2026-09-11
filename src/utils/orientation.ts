/**
 * ScreenOrientationManager
 * 
 * Manages screen orientation locking and immersive fullscreen.
 * Works seamlessly across Android Native APK (via AndroidNative bridge in MainActivity & Capacitor plugin),
 * and Modern Web / PWA.
 */

export const ScreenOrientationManager = {
  /**
   * Forces the device into Landscape orientation and enters Immersive Fullscreen.
   * Hides the status bar (clock, battery, notifications) and navigation bar.
   * Works on Android even if the user has disabled auto-rotate in system settings!
   */
  enterLandscapeImmersive: async () => {
    // Set global DOM state flag
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-fullscreen', 'true');
      }
    } catch {}

    // 1. Capacitor Plugin Bridge
    try {
      const cap = (window as any).Capacitor;
      if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
        if (cap.Plugins?.AndroidNative?.enterImmersiveLandscape) {
          await cap.Plugins.AndroidNative.enterImmersiveLandscape();
        }
      }
    } catch (e) {
      console.warn('[ScreenOrientation] Capacitor AndroidNative enter failed:', e);
    }

    // 2. Android Native JavascriptInterface (MainActivity.java webView.addJavascriptInterface)
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidNative?.enterImmersiveLandscape) {
        (window as any).AndroidNative.enterImmersiveLandscape();
      }
    } catch (e) {
      console.warn('[ScreenOrientation] AndroidNative enter failed:', e);
    }

    // 3. Web Screen Orientation API (Supported in Chrome/Edge/Android WebViews)
    try {
      if (typeof screen !== 'undefined' && screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch {}

    // 4. Document Fullscreen API (Hides browser chrome)
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen && !document.fullscreenElement) {
        await docEl.requestFullscreen().catch(() => {});
      } else if ((docEl as any).webkitRequestFullscreen && !(document as any).webkitFullscreenElement) {
        await (docEl as any).webkitRequestFullscreen();
      }
    } catch {}
  },

  /**
   * Restores normal device orientation and exits Immersive mode.
   * Restores the status bar, clock, notifications, and navigation bar.
   */
  exitLandscapeImmersive: async () => {
    // Remove global DOM state flag
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.removeAttribute('data-fullscreen');
      }
    } catch {}

    // 1. Capacitor Plugin Bridge
    try {
      const cap = (window as any).Capacitor;
      if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
        if (cap.Plugins?.AndroidNative?.exitImmersiveLandscape) {
          await cap.Plugins.AndroidNative.exitImmersiveLandscape();
        }
      }
    } catch (e) {
      console.warn('[ScreenOrientation] Capacitor AndroidNative exit failed:', e);
    }

    // 2. Android Native JavascriptInterface (MainActivity.java)
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidNative?.exitImmersiveLandscape) {
        (window as any).AndroidNative.exitImmersiveLandscape();
      }
    } catch (e) {
      console.warn('[ScreenOrientation] AndroidNative exit failed:', e);
    }

    // 3. Web Screen Orientation API unlock
    try {
      if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    } catch {}

    // 4. Document Exit Fullscreen
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitFullscreenElement && (document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
    } catch {}
  }
};
