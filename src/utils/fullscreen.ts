/**
 * Fullscreen utility helper for Web and Smart TV browsers
 */
export const FullscreenUtil = {
  isFullscreen(): boolean {
    const doc = document as any;
    return !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
  },

  async requestFullscreen(element?: HTMLElement | null): Promise<boolean> {
    const target = (element || document.documentElement) as any;
    try {
      if (target.requestFullscreen) {
        await target.requestFullscreen();
        return true;
      } else if (target.webkitRequestFullscreen) {
        await target.webkitRequestFullscreen();
        return true;
      } else if (target.mozRequestFullScreen) {
        await target.mozRequestFullScreen();
        return true;
      } else if (target.msRequestFullscreen) {
        await target.msRequestFullscreen();
        return true;
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
    return false;
  },

  async exitFullscreen(): Promise<boolean> {
    const doc = document as any;
    try {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
        return true;
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
        return true;
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
        return true;
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
        return true;
      }
    } catch (err) {
      console.warn('Exit fullscreen failed:', err);
    }
    return false;
  },

  async toggleFullscreen(element?: HTMLElement | null): Promise<boolean> {
    if (this.isFullscreen()) {
      await this.exitFullscreen();
      return false;
    } else {
      return await this.requestFullscreen(element);
    }
  }
};
