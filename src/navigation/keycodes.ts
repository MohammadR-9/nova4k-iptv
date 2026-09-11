/**
 * Key codes mapping for Samsung Tizen Smart TV & PC Keyboard Emulation
 */

export const TV_KEYS = {
  // Navigation
  UP: 38,
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39,
  ENTER: 13,
  RETURN: 10009,   // Tizen TV hardware back key
  WEBOS_BACK: 461, // LG webOS Magic Remote Back key
  BACKSPACE: 8,    // PC back key fallback
  ESCAPE: 27,      // PC escape fallback

  // Media Playback
  PLAY: 415,
  PAUSE: 19,
  PLAY_PAUSE: 10252,
  STOP: 413,
  FAST_FORWARD: 417,
  REWIND: 412,

  // Channel Controls
  CHANNEL_UP: 427,
  CHANNEL_DOWN: 428,
  PAGE_UP: 33,
  PAGE_DOWN: 34,

  // TV Color Buttons
  COLOR_RED: 403,
  COLOR_GREEN: 404,
  COLOR_YELLOW: 405,
  COLOR_BLUE: 406,

  // PC Color Button fallbacks (Key codes for r, g, y, b)
  KEY_R: 82,
  KEY_G: 71,
  KEY_Y: 89,
  KEY_B: 66,

  // Diagnostics & Info
  INFO: 457,
  KEY_I: 73
};

/**
 * Register hardware keys with Tizen TV input device manager
 */
export function registerTizenHardwareKeys() {
  try {
    if (typeof window !== 'undefined' && (window as any).tizen && (window as any).tizen.tvinputdevice) {
      const tvInput = (window as any).tizen.tvinputdevice;
      const keysToRegister = [
        'MediaPlay',
        'MediaPause',
        'MediaPlayPause',
        'MediaStop',
        'MediaFastForward',
        'MediaRewind',
        'ColorF0Red',
        'ColorF1Green',
        'ColorF2Yellow',
        'ColorF3Blue',
        'ChannelUp',
        'ChannelDown',
        'Info'
      ];

      keysToRegister.forEach(keyName => {
        try {
          tvInput.registerKey(keyName);
        } catch (e) {
          console.warn(`[Tizen] Failed to register key ${keyName}:`, e);
        }
      });
      console.log('[Tizen] Hardware TV keys registered successfully.');
    }
  } catch (err) {
    console.warn('[Tizen] Non-Tizen environment, skipping hardware key registration.');
  }
}
