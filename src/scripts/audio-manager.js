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

function startAmbient(){
  if(!enabled || started) return;
  started = true;
  sounds.ambient.play().catch(()=>{});
  sounds.ambient.volume = 0;
  let v = 0;
  const t = setInterval(()=>{ v+=.02; sounds.ambient.volume = Math.min(v,AMBIENT_TARGET_VOLUME); if(v>=AMBIENT_TARGET_VOLUME) clearInterval(t); }, 50);
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
  // Any pointer interaction (including dragging the loader's 3D scene)
  // counts as a user gesture and unlocks autoplay — start the ambient
  // track the moment that happens.
  document.addEventListener('pointerdown', ()=>startAmbient(), { once:true });

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
