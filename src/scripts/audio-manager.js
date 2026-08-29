const sounds = {
  ambient: new Audio('/audio/ambient-core.mp3'),
  hover: new Audio('/audio/ui-hover.wav'),
  click: new Audio('/audio/ui-click.wav'),
  boot: new Audio('/audio/core-boot.wav')
};

// Sound defaults to ON (ambient music + loader chime) unless the visitor
// has explicitly switched it off before — that choice is remembered via
// localStorage. Browsers still require a user gesture before any audio
// with sound can actually play, so playback itself is kicked off on the
// first pointerdown / the loader hand-off, whichever comes first.
let enabled = localStorage.getItem('sound') !== 'off';
let started = false;
Object.values(sounds).forEach(a => { a.preload = 'auto'; });

// The ambient loop is a proper mixed/mastered pad track now (regenerated
// — the previous file was a near-silent 3-second stub), so it needs less
// help from JS-side gain than before; this is the volume it fades up to.
const AMBIENT_TARGET_VOLUME = 0.16;

function setVolume(){
  sounds.ambient.loop = true;
  sounds.ambient.volume = AMBIENT_TARGET_VOLUME;
  sounds.hover.volume = .35;
  sounds.click.volume = .4;
  sounds.boot.volume = .55;
}

// BUGFIX: hook into the real nav sound buttons (#sound / #soundDesk)
// instead of creating a brand-new floating button — the previous version
// ignored the nav entirely and injected a duplicate control into <body>.
function updateButtons(){
  document.querySelectorAll('#sound, #soundDesk').forEach(btn=>{
    btn.textContent = enabled ? 'SOUND ON' : 'SOUND OFF';
    btn.classList.toggle('on', enabled);
  });
}

function toggle(){
  enabled = !enabled;
  localStorage.setItem('sound', enabled ? 'on' : 'off');
  updateButtons();
  if(enabled) startAmbient(); else sounds.ambient.pause();
}

let removeGestureListeners = ()=>{};

function startAmbient(){
  // BUGFIX: `started` used to be set to true *before* we knew whether
  // play() actually succeeded. The very first attempt (fired from
  // loader:done) usually has no real user gesture behind it yet, so
  // the browser silently rejects it — but the old code had already
  // locked `started` to true, so every later attempt (including a
  // real click) short-circuited here and did nothing. That's why the
  // track would sometimes never start even after clicking, and why it
  // almost never started on mobile (where visitors rarely drag the
  // loader scene, so the very first — and only — attempt was the
  // gesture-less one that got rejected and then locked out forever).
  if(!enabled || started) return;
  sounds.ambient.volume = 0;
  sounds.ambient.play().then(()=>{
    started = true;
    removeGestureListeners();
    let v = 0;
    const t = setInterval(()=>{ v+=.02; sounds.ambient.volume = Math.min(v,AMBIENT_TARGET_VOLUME); if(v>=AMBIENT_TARGET_VOLUME) clearInterval(t); }, 50);
  }).catch(()=>{
    // Still blocked (no real user gesture yet) — leave `started` as
    // false so the next gesture (click/tap/key) can retry.
  });
}

function play(name){
  if(enabled){ sounds[name].currentTime = 0; sounds[name].play().catch(()=>{}); }
}

export function initAudio(){
  setVolume();
  updateButtons();
  document.querySelectorAll('#sound, #soundDesk').forEach(btn=>btn.addEventListener('click', toggle));
  document.querySelectorAll('button,a').forEach(el=>{
    el.addEventListener('mouseenter', ()=>play('hover'));
    el.addEventListener('click', ()=>play('click'));
  });
  // Any pointer/touch/keyboard interaction (including dragging the
  // loader's 3D scene) counts as a user gesture and unlocks autoplay.
  // These are NOT { once:true } anymore: since startAmbient() now only
  // flips `started` on a *successful* play(), a rejected first attempt
  // needs a real chance to retry on the next gesture instead of being
  // permanently deaf. Each handler removes itself only once playback
  // has actually started, which also covers mobile (touchstart is the
  // gesture that actually fires there, pointerdown support varies more
  // across older mobile WebViews).
  const gestureEvents = ['pointerdown', 'touchstart', 'keydown'];
  function onGesture(){ startAmbient(); }
  removeGestureListeners = () => gestureEvents.forEach(ev => document.removeEventListener(ev, onGesture));
  gestureEvents.forEach(ev => document.addEventListener(ev, onGesture, { passive:true }));

  // Fired by the loader right as it hands off to the main page: a short
  // "boot" chime marks the transition, and we also take this as another
  // chance to kick off the ambient track (it'll only succeed if a user
  // gesture has already happened — otherwise the pointerdown listener
  // above will catch it on the visitor's first interaction).
  window.addEventListener('loader:done', () => {
    play('boot');
    startAmbient();
  }, { once: true });
}
