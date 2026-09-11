/**
 * ScreenOrientationManager
 * 
 * Manages screen orientation locking and immersive fullscreen.
 * Works seamlessly across Android Native APK (via AndroidNative bridge in MainActivity),
 * Capacitor, and Modern Web / PWA.
 */

export const ScreenOrientationManager = {
  /**
   * Forces the device into Landscape orientation and enters Immersive Fullscreen.
   * Hides the status bar (clock, battery, notifications) and navigation bar.
   * Works on Android even if the user has disabled auto-rotate in system settings!
   */
  enterLandscapeImmersive: async () => {
    // 1. Android Native Bridge (MainActivity.java)
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidNative?.enterImmersiveLandscape) {
        (window as any).AndroidNative.enterImmersiveLandscape();
      }
    } catch (e) {
      console.warn('[ScreenOrientation] AndroidNative enter failed:', e);
    }

    // 2. Web Screen Orientation API (Supported in Chrome/Edge/Android WebViews)
    try {
      if (typeof screen !== 'undefined' && screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch (e) {
      // Ignore: lock may fail if user hasn't interacted yet
    }

    // 3. Document Fullscreen API (Hides browser chrome)
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen && !document.fullscreenElement) {
        await docEl.requestFullscreen().catch(() => {});
      } else if ((docEl as any).webkitRequestFullscreen && !(document as any).webkitFullscreenElement) {
        await (docEl as any).webkitRequestFullscreen();
      }
    } catch (e) {
      // Ignore
    }
  },

  /**
   * Restores normal device orientation and exits Immersive mode.
   * Restores the status bar, clock, notifications, and navigation bar.
   */
  exitLandscapeImmersive: async () => {
    // 1. Android Native Bridge (MainActivity.java)
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidNative?.exitImmersiveLandscape) {
        (window as any).AndroidNative.exitImmersiveLandscape();
      }
    } catch (e) {
      console.warn('[ScreenOrientation] AndroidNative exit failed:', e);
    }

    // 2. Web Screen Orientation API unlock
    try {
      if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    } catch (e) {
      // Ignore
    }

    // 3. Document Exit Fullscreen
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitFullscreenElement && (document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
    } catch (e) {
      // Ignore
    }
  }
};
