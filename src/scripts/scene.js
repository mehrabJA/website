import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const qs = (s) => document.querySelector(s);
const qsa = (s) => [...document.querySelectorAll(s)];

// --- custom cursor -----------------------------------------------------
function initCursor(){
  const cursor = qs('#cursor');
  if(!cursor) return;
  let mx = innerWidth/2, my = innerHeight/2, cx = mx, cy = my;
  window.addEventListener('pointermove', e=>{ mx=e.clientX; my=e.clientY; cursor.style.opacity=1; }, {passive:true});
  (function loop(){
    cx += (mx-cx)*.18; cy += (my-cy)*.18;
    cursor.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();
  qsa('.magnetic,a,button').forEach(el=>{
    el.addEventListener('mouseenter', ()=>cursor.classList.add('big'));
    el.addEventListener('mouseleave', ()=>cursor.classList.remove('big'));
  });
}

// --- nav clock -----------------------------------------------------------
function initClock(){
  const clock = qs('#clock');
  if(!clock) return;
  const tick = () => { clock.textContent = new Date().toLocaleTimeString('en-GB',{hour12:false}); };
  tick();
  setInterval(tick, 1000);
}

// --- nav active-pill + scroll-spy + glare --------------------------------
function initNav(){
  const navShell = qs('#navShell'), navPill = qs('#navPill'), activePill = qs('#activePill');
  if(!navPill || !activePill) return;

  function moveActive(btn, smooth=true){
    if(!btn) return;
    activePill.style.transition = smooth
      ? 'transform .5s cubic-bezier(.34,1.2,.64,1),width .5s cubic-bezier(.34,1.2,.64,1)'
      : 'none';
    activePill.style.width = btn.offsetWidth+'px';
    activePill.style.transform = 'translateX('+btn.offsetLeft+'px)';
  }
  function setNavActive(id){
    const btn = qs('.nav-pill a[href="#'+id+'"]');
    if(!btn) return;
    qsa('.nav-pill a').forEach(a=>a.classList.toggle('active', a===btn));
    moveActive(btn, true);
  }

  const initialNav = qs('.nav-pill a.active');
  if(initialNav) setTimeout(()=>moveActive(initialNav,false), 40);

  qsa('.nav-pill a').forEach(a=>a.addEventListener('click', e=>{
    const t = qs(a.getAttribute('href'));
    if(t){ e.preventDefault(); setNavActive(t.id); t.scrollIntoView({behavior:'smooth'}); }
  }));

  window.addEventListener('resize', ()=>moveActive(qs('.nav-pill a.active'), false));

  if(navShell){
    navShell.addEventListener('pointermove', e=>{
      const r = navShell.getBoundingClientRect();
      navShell.style.setProperty('--navx', ((e.clientX-r.left)/r.width*100)+'%');
      navShell.style.setProperty('--navy', ((e.clientY-r.top)/r.height*100)+'%');
    });
  }

  const navSections = ['home','about','projects','research','contact'].map(id=>qs('#'+id)).filter(Boolean);
  const navIO = new IntersectionObserver(entries=>{
    entries.forEach(en=>{ if(en.isIntersecting && en.intersectionRatio>.38) setNavActive(en.target.id); });
  }, { threshold:[.38,.6] });
  navSections.forEach(s=>navIO.observe(s));
}

// --- magnetic project rows -------------------------------------------------
function initMagnetic(){
  qsa('.project-row').forEach(row=>{
    row.addEventListener('pointermove', e=>{
      if(innerWidth<900) return;
      const r = row.getBoundingClientRect();
      gsap.to(row, { x:(e.clientX-r.left-r.width/2)*.015, y:(e.clientY-r.top-r.height/2)*.02, duration:.35, overwrite:true });
    });
    row.addEventListener('pointerleave', ()=>gsap.to(row, { x:0, y:0, duration:.45, ease:'power3.out' }));
  });
}

// --- contact form (no backend — confirms locally instead of reloading) ----
function initContactForm(){
  const form = qs('.contact-form');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const btn = form.querySelector('.contact-send');
    if(!btn) return;
    const original = btn.textContent;
    btn.textContent = 'Message sent ✓';
    btn.disabled = true;
    setTimeout(()=>{ btn.textContent = original; btn.disabled = false; form.reset(); }, 2600);
  });
}

// --- ambient WebGL background (behind hero / whole page) ------------------
function initBackground(){
  const canvas = qs('#webgl');
  if(!canvas) return;

  try {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, innerWidth/innerHeight, .1, 100);
  camera.position.set(0,0,7);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const group = new THREE.Group();
  scene.add(group);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.75,7),
    new THREE.ShaderMaterial({
      transparent:true,
      uniforms:{ uTime:{value:0}, uHover:{value:new THREE.Vector2()} },
      vertexShader:`varying vec3 vPos; uniform float uTime; void main(){vPos=position; vec3 p=position; float n=sin(p.x*3.1+uTime*1.1)+sin(p.y*4.2-uTime*.9)+sin(p.z*5.0+uTime*.7); p += normalize(p)*n*.025; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
      fragmentShader:`varying vec3 vPos; uniform float uTime; void main(){float a=.58+.18*sin(uTime+vPos.y*4.); vec3 c=mix(vec3(0.08,0.08,0.08),vec3(1.0),smoothstep(-.2,1.,vPos.y)); gl_FragColor=vec4(c,a*.26);}`
    })
  );
  group.add(core);

  const count = 2600;
  const pts = new THREE.BufferGeometry();
  const pos = new Float32Array(count*3);
  const col = new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const r = 2.15+Math.random()*.55;
    const a = Math.random()*Math.PI*2;
    const b = Math.acos(THREE.MathUtils.randFloatSpread(2));
    pos[i*3]=r*Math.sin(b)*Math.cos(a);
    pos[i*3+1]=r*Math.sin(b)*Math.sin(a);
    pos[i*3+2]=r*Math.cos(b);
    col[i*3]=.72+Math.random()*.2;
    col[i*3+1]=.62+Math.random()*.25;
    col[i*3+2]=.98;
  }
  pts.setAttribute('position', new THREE.BufferAttribute(pos,3));
  pts.setAttribute('color', new THREE.BufferAttribute(col,3));
  const particles = new THREE.Points(pts, new THREE.PointsMaterial({ size:.025, vertexColors:true, transparent:true, opacity:.8, blending:THREE.AdditiveBlending }));
  group.add(particles);

  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.55,.008,8,220), new THREE.MeshBasicMaterial({ color:0xd8ff47, transparent:true, opacity:.24 }));
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.95,.005,8,220), new THREE.MeshBasicMaterial({ color:0xf3f0e8, transparent:true, opacity:.1 }));
  ring1.rotation.set(.58,.35,0);
  ring2.rotation.set(-.42,0,.65);
  group.add(ring1, ring2);

  const starCount = 700;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount*3);
  for(let i=0;i<starCount;i++){
    const r=8+Math.random()*15, a=Math.random()*Math.PI*2, y=(Math.random()-.5)*10;
    starPos[i*3]=Math.cos(a)*r; starPos[i*3+1]=y; starPos[i*3+2]=Math.sin(a)*r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos,3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size:.01, color:0xffffff, opacity:.25, transparent:true })));

  let targetRX=0, targetRY=0;
  window.addEventListener('pointermove', e=>{
    targetRY = (e.clientX/innerWidth-.5)*.8;
    targetRX = (e.clientY/innerHeight-.5)*.45;
  }, {passive:true});

  function resize(){
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }
  window.addEventListener('resize', resize);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom=false; controls.enablePan=false; controls.enableDamping=true; controls.dampingFactor=.08; controls.autoRotate=false;
  controls.minPolarAngle=Math.PI/2-.55; controls.maxPolarAngle=Math.PI/2+.55;
  renderer.domElement.style.pointerEvents='auto';
  controls.target.set(0,0,0);

  const research = qs('#research');
  if(research){
    gsap.to(group.rotation, { y:Math.PI*.85, ease:'none', scrollTrigger:{ trigger:research, start:'top top', end:'bottom bottom', scrub:1 } });
  }
  if(qs('#skillsWheel')){
    gsap.to('#skillsWheel', { rotation:-360, ease:'none', scrollTrigger:{ trigger:'#research', start:'top top', end:'bottom bottom', scrub:1.2 } });
  }

  let t0 = performance.now();
  function render(now){
    const t = (now-t0)*.001;
    core.material.uniforms.uTime.value = t;
    group.rotation.x += (targetRX-group.rotation.x)*.02;
    group.rotation.y += (targetRY-group.rotation.y)*.02;
    particles.rotation.y = t*.025;
    particles.rotation.x = Math.sin(t*.18)*.08;
    ring1.rotation.z = t*.09;
    ring2.rotation.y = -t*.06;
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  render(performance.now());
  } catch (err){
    // No WebGL / three.js failure here should ever break the rest of
    // the page's interactivity (cursor, nav, form, etc.) — just skip
    // the ambient background scene.
    console.warn('Background scene disabled:', err);
  }
}

export function initScene(){
  initCursor();
  initClock();
  initNav();
  initMagnetic();
  initContactForm();
  initBackground();
  ScrollTrigger.refresh();
}
