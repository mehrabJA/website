export function initSmoothScroll() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) return;

  let current = window.scrollY;
  let target  = window.scrollY;
  let rafId   = null;
  const SPEED = 0.03;
  const STEP  = 30;

  function onWheel(e) {
    e.preventDefault();
    const delta = Math.sign(e.deltaY) * STEP;
    target = Math.max(0, Math.min(target + delta, maxScroll()));
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  function maxScroll() {
    return document.documentElement.scrollHeight - window.innerHeight;
  }

  function loop() {
    const diff = target - current;
    if (Math.abs(diff) < 0.5) {
      current = target;
      rafId = null;
      return;
    }
    current += diff * SPEED;
    window.scrollTo(0, current);
    rafId = requestAnimationFrame(loop);
  }

  window.addEventListener('scroll', () => {
    if (!rafId) current = window.scrollY;
  }, { passive: true });

  window.addEventListener('wheel', onWheel, { passive: false });
}
