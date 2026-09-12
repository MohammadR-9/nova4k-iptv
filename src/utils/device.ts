/**
 * Universal device detection: Mobile/Tablet vs Smart TV
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 0. Explicit user preference override from settings ('auto' | 'tv' | 'mobile')
  try {
    const userMode = localStorage.getItem('nova_ui_mode');
    if (userMode === 'tv') return false;
    if (userMode === 'mobile') return true;
  } catch {}

  // 1. Injected Android Native TV check
  if ((window as any).IS_TV_DEVICE === true) return false;

  // 2. Explicit TV User Agents (Samsung Tizen, LG webOS, Android TV, Fire TV, LargeScreen)
  const ua = navigator.userAgent;
  const isTv = /Tizen|SmartTV|SMART-TV|webOS|NetCast|BRAVIA|Viera|HbbTV|Android TV|GoogleTV|LargeScreen|AFTB|AFTM|AFTT/i.test(ua);
  if (isTv) return false;

  // 3. Tizen or WebOS hardware SDKs
  if ((window as any).tizen || (window as any).webapis) return false;

  // 4. Document attribute override
  const attr = document.documentElement.getAttribute('data-device');
  if (attr === 'mobile') return true;
  if (attr === 'tv') return false;

  // 5. Touchscreen check:
  // TV Boxes, STBs, Smart TVs, and Consoles DO NOT have a physical touchscreen!
  // Any Android device without a touchscreen is strictly a TV / TV Box.
  const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  if (!hasTouch) {
    return false;
  }

  // 6. Mobile / Tablet with touchscreen
  const isMobileUa = /iPhone|iPad|iPod/i.test(ua) || (/Android/i.test(ua) && hasTouch && Math.min(window.innerWidth, window.innerHeight) < 768);
  const isCompact = window.innerWidth < 768 || (hasTouch && window.innerWidth <= 1024 && window.innerHeight <= 700);

  return Boolean(isMobileUa || isCompact);
};
