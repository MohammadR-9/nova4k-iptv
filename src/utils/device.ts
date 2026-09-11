/**
 * Universal device detection: Mobile/Tablet vs Smart TV
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. Explicit TV User Agents (Samsung Tizen, LG webOS, Android TV, Fire TV)
  const ua = navigator.userAgent;
  const isTv = /Tizen|SmartTV|SMART-TV|webOS|NetCast|BRAVIA|Viera|HbbTV|Android TV|GoogleTV|LargeScreen|AFTB|AFTM|AFTT/i.test(ua);
  if (isTv) return false;

  // 2. Tizen or WebOS hardware SDKs
  if ((window as any).tizen || (window as any).webapis) return false;

  // 3. Document attribute override
  const attr = document.documentElement.getAttribute('data-device');
  if (attr === 'mobile') return true;
  if (attr === 'tv') return false;

  // 4. Mobile / Tablet user agents or touch screen or compact screen width (< 768px)
  const isMobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  const isCompact = window.innerWidth < 768 || (hasTouch && window.innerWidth <= 1024 && window.innerHeight <= 700);

  return Boolean(isMobileUa || isCompact);
};
