// Singularity loader — ported from the original site's CodePen-based
// accretion-disk intro (VoXelo/VYKMNwE), re-themed to the site's violet
// palette. Text overlay removed (this build has none), and the once-empty
// event horizon now carries a small glowing core (soft violet glow + a
// bright nucleus dot) so it doesn't read as a blank hole in the middle.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';

function revealNow(loader, renderer, controls){
  loader.classList.add('hide');
  loader.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-loading');
  document.body.style.overflow = '';
  window.dispatchEvent(new CustomEvent('loader:done'));
  setTimeout(() => {
    try {
      renderer?.dispose();
      controls?.dispose();
      if (renderer?.domElement?.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    } catch(e){}
  }, 1300);
}

export function initLoader(){
  const loader = document.querySelector('#loader');
  if(!loader) return;

  // BUGFIX (kept from the previous build): if WebGL isn't available
  // (sandboxed preview iframes, some embedded browsers), constructing the
  // renderer throws. Everything below is wrapped so a failure here can
  // never leave the loading screen — which sits on top of the whole page —
  // stuck forever.
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 1000);
    camera.position.set(60, 30, 60);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.zIndex = '1';
    loader.insertBefore(renderer.domElement, loader.firstChild);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.03;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.enableZoom = false;
    controls.enablePan = false;

    const noiseChunk = `
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
      }
    `;

    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Event horizon
    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    coreGroup.add(new THREE.Mesh(new THREE.SphereGeometry(4, 64, 64), bhMat));

    // AI core: a small glowing nucleus so the center never reads as an
    // empty hole while the disk is still forming/orbiting.
    const coreGlowMat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending
    });
    coreGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.25, 48, 48), coreGlowMat));

    const coreDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
    );
    coreGroup.add(coreDot);

    const auraMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uIntensity: { value: 1.0 } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-(modelViewMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uIntensity;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 4.0);
          gl_FragColor = vec4(vec3(0.65, 0.48, 1.0) * rim * uIntensity * 4.2, 1.0);
        }
      `,
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending
    });
    coreGroup.add(new THREE.Mesh(new THREE.SphereGeometry(4.25, 64, 64), auraMat));

    const instanceCount = 3800;
    const streakGeo = new THREE.CylinderGeometry(0.01, 0.12, 2.2, 3);
    streakGeo.rotateX(Math.PI / 2);

    const diskMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 0.1 },
        uCompression: { value: 1.0 },
        uIntensity: { value: 1.0 },
        uOrbitScale: { value: 1.0 }
      },
      vertexShader: `
        ${noiseChunk}
        uniform float uTime;
        uniform float uMorph;
        uniform float uCompression;
        uniform float uIntensity;
        uniform float uOrbitScale;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float rOriginal = length(instPos.xz);
          float r = rOriginal * uCompression;
          float initialAngle = atan(instPos.z, instPos.x);
          float orbitalVelocity = (1.5 / sqrt(rOriginal)) * uOrbitScale;
          float currentAngle = initialAngle + (uTime * orbitalVelocity);
          vec3 morphedWorldPos = vec3(cos(currentAngle) * r, instPos.y, sin(currentAngle) * r);
          float noise = snoise(vec3(morphedWorldPos.x * 0.08, morphedWorldPos.z * 0.08, uTime * 0.3));
          morphedWorldPos.y += noise * uMorph * 4.0;
          vec3 viewDir = normalize(cameraPosition - morphedWorldPos);
          vec3 orbitDir = normalize(vec3(-sin(currentAngle), 0.0, cos(currentAngle)));
          float doppler = dot(orbitDir, viewDir);
          vec3 hot = vec3(0.92, 0.88, 1.0);
          vec3 warm = vec3(0.72, 0.55, 0.98);
          vec3 cool = vec3(0.22, 0.14, 0.42);
          vec3 color = mix(cool, warm, smoothstep(42.0, 11.0, r));
          color = mix(color, hot, smoothstep(9.0, 4.2, r));
          vColor = color * (1.3 + doppler * 0.7) * uIntensity;
          vOpacity = (smoothstep(3.8, 5.5, r) * (1.0 - smoothstep(38.0, 48.0, r))) * 0.8;
          float deltaAngle = currentAngle - initialAngle;
          float c = cos(deltaAngle);
          float s = sin(deltaAngle);
          mat3 rotY = mat3(c, 0, s, 0, 1, 0, -s, 0, c);
          vec3 localPos = (instanceMatrix * vec4(position, 0.0)).xyz;
          vec3 rotatedLocalPos = rotY * localPos;
          gl_Position = projectionMatrix * viewMatrix * vec4(morphedWorldPos + rotatedLocalPos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          gl_FragColor = vec4(vColor, vOpacity);
        }
      `,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });

    const instancedDisk = new THREE.InstancedMesh(streakGeo, diskMaterial, instanceCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < instanceCount; i++) {
      const r = 5 + Math.pow(Math.random(), 1.3) * 40;
      const angle = Math.random() * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * (8 / r), Math.sin(angle) * r);
      dummy.lookAt(dummy.position.x + Math.sin(angle), dummy.position.y, dummy.position.z - Math.cos(angle));
      dummy.updateMatrix();
      instancedDisk.setMatrixAt(i, dummy.matrix);
    }
    scene.add(instancedDisk);

    const config = [
      { morph: 0.15, compress: 1.0, intensity: 1.0, rotate: 0.35, camY: 28, camDist: 82, orbit: 1.0 },
      { morph: 2.2, compress: 1.08, intensity: 1.25, rotate: 0.85, camY: 36, camDist: 88, orbit: 1.35 },
      { morph: 0.6, compress: 0.72, intensity: 1.7, rotate: 1.6, camY: 22, camDist: 68, orbit: 2.1 }
    ];

    let stateIdx = 0;
    const camControl = { distance: 85 };

    function transition() {
      stateIdx = (stateIdx + 1) % config.length;
      const s = config[stateIdx];
      const tl = gsap.timeline({ defaults: { duration: 3.8, ease: 'power2.inOut' } });
      tl.to(diskMaterial.uniforms.uMorph, { value: s.morph }, 0);
      tl.to(diskMaterial.uniforms.uCompression, { value: s.compress }, 0);
      tl.to(diskMaterial.uniforms.uIntensity, { value: s.intensity }, 0);
      tl.to(diskMaterial.uniforms.uOrbitScale, { value: s.orbit }, 0);
      tl.to(auraMat.uniforms.uIntensity, { value: s.intensity }, 0);
      tl.to(controls, { autoRotateSpeed: s.rotate }, 0);
      tl.to(camera.position, { y: s.camY }, 0);
      tl.to(camControl, { distance: s.camDist }, 0);
    }

    let active = true;
    const timers = [];

    // Two state transitions then hand off to the page (~9.2s total, then
    // the loader itself fades over another 1.15s — see .loader.hide CSS).
    timers.push(setTimeout(transition, 3200));
    timers.push(setTimeout(transition, 7200));
    timers.push(setTimeout(() => {
      active = false;

      loader.classList.add('hide');
      loader.setAttribute('aria-hidden', 'true');

      const nav = document.querySelector('.nav');
      const heroContent = document.querySelector('.hero-content');
      const enterTargets = [nav, heroContent].filter(Boolean);
      const rest = document.querySelectorAll('main > .section, .marquee, footer');

      enterTargets.forEach(el => {
        el.style.opacity = '0';
        el.style.visibility = 'visible';
        el.style.pointerEvents = 'auto';
        el.style.transform = 'translateY(28px)';
      });
      rest.forEach(el => { el.style.opacity = '0'; el.style.visibility = 'visible'; });

      document.body.classList.remove('is-loading');
      document.body.style.overflow = '';

      // Cue the "boot" chime and give the ambient track another chance
      // to start, right as the site becomes visible.
      window.dispatchEvent(new CustomEvent('loader:done'));

      gsap.to(enterTargets, {
        opacity: 1, y: 0, duration: 1.35, ease: 'power3.out',
        stagger: 0.14, delay: 0.2, clearProps: 'transform'
      });
      gsap.to(rest, { opacity: 1, duration: 1.2, ease: 'power2.out', delay: 0.45 });

      setTimeout(() => {
        try {
          renderer.dispose();
          controls.dispose();
          if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
        } catch(e){}
      }, 1300);
    }, 9200));

    const clock = new THREE.Clock();
    function animate() {
      if (!active) return;
      try {
        const time = clock.getElapsedTime();
        diskMaterial.uniforms.uTime.value = time;
        auraMat.uniforms.uTime.value = time;
        instancedDisk.rotation.y += 0.0005;
        const currentDir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
        camera.position.x = controls.target.x + currentDir.x * camControl.distance;
        camera.position.z = controls.target.z + currentDir.z * camControl.distance;
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      } catch (err) {
        active = false;
        timers.forEach(clearTimeout);
        revealNow(loader, renderer, controls);
      }
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
  } catch (err) {
    // WebGL / three.js unavailable — skip the 3D intro entirely
    // instead of leaving the page stuck behind the loading screen.
    revealNow(loader);
  }
}
