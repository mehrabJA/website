// Device / browser detection — runs first, before any other module, so
// everything downstream (the two WebGL scenes, the audio manager, CSS)
// can branch on real capability instead of guessing from viewport width
// alone. Two things get set:
//
//   1. A handful of classes on <html> (is-mobile, is-tablet, is-desktop,
//      is-touch, is-ios, is-safari, is-firefox, is-low-power,
//      is-reduced-motion) so global.css / Layout.astro can target them
//      directly, the same way you'd target a media query.
//   2. `window.__device`, a small plain object other scripts import via
//      getDevice() and use to pick numeric settings (particle counts,
//      pixel ratio, etc.) per device tier.
//
// Detection here is feature/UA based, not a media-query proxy: a phone
// held sideways at a "desktop" width is still detected as mobile, and a
// touch laptop isn't misclassified as a phone.

function detectDevice(){
  const ua = navigator.userAgent || '';
  const uaData = navigator.userAgentData;

  const isIOS = /iphone|ipad|ipod/i.test(ua) ||
    (uaData ? uaData.platform === 'iOS' : (/Mac/.test(navigator.platform) && navigator.maxTouchPoints > 1));
  const isAndroid = /android/i.test(ua);

  const coarsePointer = matchMedia('(pointer: coarse)').matches;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Tablet: touch + coarse pointer but a wide-enough viewport that it's
  // clearly not a phone (also covers iPadOS, which reports as "Mac" UA).
  const isTablet = (isIOS || isAndroid || coarsePointer) && Math.min(innerWidth, innerHeight) >= 600;
  const isMobile = (isIOS || isAndroid || coarsePointer || hasTouch) && !isTablet && Math.min(innerWidth, innerHeight) < 600;
  const isDesktop = !isMobile && !isTablet;

  // Browser engine — only the cases that actually need special-casing
  // here (Safari's autoplay/WebGL quirks, Firefox's shader compile cost).
  const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
  const isFirefox = /firefox|fxios/i.test(ua);
  const isChrome = /chrome|crios/i.test(ua) && !/edg/i.test(ua);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection?.saveData === true;
  const slowConnection = ['slow-2g','2g','3g'].includes(navigator.connection?.effectiveType);
  const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4;
  const fewCores = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;

  // "Low power" drives how heavy the two WebGL scenes are allowed to be.
  // Any phone counts (mobile GPUs/thermals), plus any device that flags
  // itself as memory/CPU constrained or on a metered connection.
  const lowPower = isMobile || saveData || slowConnection || (lowMemory && fewCores);

  const maxDPR = isMobile ? 1 : isTablet ? 1.5 : 2;

  return {
    isIOS, isAndroid, isMobile, isTablet, isDesktop,
    isSafari, isFirefox, isChrome,
    hasTouch, reducedMotion, lowPower, maxDPR,
    tier: lowPower ? 'low' : (isTablet ? 'mid' : 'high')
  };
}

let cached = null;

export function getDevice(){
  if(!cached) cached = detectDevice();
  return cached;
}

export function initDevice(){
  const d = getDevice();
  const c = document.documentElement.classList;
  c.toggle('is-mobile', d.isMobile);
  c.toggle('is-tablet', d.isTablet);
  c.toggle('is-desktop', d.isDesktop);
  c.toggle('is-touch', d.hasTouch);
  c.toggle('is-ios', d.isIOS);
  c.toggle('is-android', d.isAndroid);
  c.toggle('is-safari', d.isSafari);
  c.toggle('is-firefox', d.isFirefox);
  c.toggle('is-low-power', d.lowPower);
  c.toggle('is-reduced-motion', d.reducedMotion);
  document.documentElement.setAttribute('data-perf-tier', d.tier);
  return d;
}
