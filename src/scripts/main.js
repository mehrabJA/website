// Astro performance entry
import { initDevice } from './device.js';

// Runs synchronously, before anything else: tags <html> with
// is-mobile/is-tablet/is-desktop/is-ios/is-safari/is-low-power/etc. so
// both the CSS below and the WebGL modules imported further down can
// branch on real device/browser capability rather than viewport width
// alone.
const device = initDevice();
const reduce = device.reducedMotion;

// Checks real DOM state rather than a module-local flag, since the
// normal animated hand-off lives inside loader-three.js (a separate
// module) and can itself remove "is-loading" before this ever runs.
// That keeps the safety-net timeout below from re-triggering the
// "loader:done" audio cue (boot chime + ambient start) a second time
// after a normal, already-completed intro.
function revealImmediately(){
  if (!document.body.classList.contains('is-loading')) return;
  document.getElementById('loader')?.classList.add('hide');
  document.body.classList.remove('is-loading');
  window.dispatchEvent(new CustomEvent('loader:done'));
}

// Hard safety net: whatever else happens (WebGL unavailable, a script
// chunk failing to load, an unexpected runtime error), the loading
// screen must never stay up forever and lock the whole page. This
// fires regardless of any other code path below.
//
// The singularity intro itself runs on fixed timers (two state
// transitions, then hand-off at 9.2s + a 1.15s fade), so this net is set
// comfortably past that instead of the old 4s — otherwise it would yank
// the loader away mid-animation on every normal page load.
setTimeout(revealImmediately, 11000);

if (!reduce) {
  import('./loader-three.js')
    .then(m => m.initLoader())
    .catch(() => revealImmediately());
} else {
  // Users with "reduce motion" enabled skip the 3D intro entirely —
  // reveal the page as soon as it's loaded instead of waiting on a
  // script that's never imported.
  window.addEventListener('load', revealImmediately, { once: true });
}

import('./animations.js').then(m => m.initAnimations()).catch(()=>{});
import('./scene.js').then(m => m.initScene()).catch(()=>{});
import('./audio-manager.js').then(m => m.initAudio()).catch(()=>{});
import('./smooth-scroll.js').then(m => m.initSmoothScroll()).catch(()=>{});
