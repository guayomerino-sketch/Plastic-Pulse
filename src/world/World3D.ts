import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { mergeVertices, mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * The living 3D world: the Home Biome (floating island + the Guardian) and the shared Earth.
 * React talks to it through a tiny API: setView, setHealth, purify, pollute, setPaused, dispose.
 */
export type WorldView = 'biome' | 'earth';

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const C = (h: string) => new THREE.Color(h);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hash(x: number, y: number, z: number) { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c = (a: number, b: number, d: number) => hash(xi + a, yi + b, zi + d);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), u), x10 = lerp(c(0, 1, 0), c(1, 1, 0), u), x01 = lerp(c(0, 0, 1), c(1, 0, 1), u), x11 = lerp(c(0, 1, 1), c(1, 1, 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w) * 2 - 1;
}
const fbm = (x: number, y: number, z: number) => vnoise(x, y, z) * 0.55 + vnoise(x * 2.1, y * 2.1, z * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.17;
const heartbeat = (t: number) => { const p = ((t % 1.2) + 1.2) % 1.2, q = (((t - 0.22) % 1.2) + 1.2) % 1.2; return Math.exp(-p * 7) + 0.6 * Math.exp(-q * 7); };

function glowSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export interface WorldOptions { lowQuality?: boolean; reduceMotion?: boolean }

export class World3D {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloom: UnrealBloomPass;
  private biome = new THREE.Scene();
  private earth = new THREE.Scene();
  private view: WorldView = 'biome';
  private raf = 0;
  private paused = false;
  private clock0 = performance.now();
  private lastT = 0;
  private low: boolean;
  private reduceMotion: boolean;
  private pixelRatio: number;
  private frames = 0;
  private fpsT = performance.now();
  private adapted = false;
  private fly: THREE.Vector3 | null = null;
  private onResize = () => this.resize();

  // state
  private targetHealth = 0.62;
  private shown = 0.62;
  private burst = 0;
  private sag = 0;

  // scene parts (assigned in builders)
  private u: Record<string, any> = {};

  constructor(private host: HTMLElement, opts: WorldOptions = {}) {
    this.low = opts.lowQuality ?? false;
    this.reduceMotion = opts.reduceMotion ?? false;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.low ? 1.25 : 2);

    this.renderer = new THREE.WebGLRenderer({ antialias: !this.low, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(host.clientWidth, host.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(48, host.clientWidth / host.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 4.8, 18);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.enablePan = false;
    this.controls.minDistance = 8; this.controls.maxDistance = 26; this.controls.maxPolarAngle = 1.52;
    this.controls.autoRotate = true; this.controls.autoRotateSpeed = this.reduceMotion ? 0.12 : 0.35;
    this.controls.target.set(0, 3, 0);

    const sprite = glowSprite();
    this.u.sprite = sprite;
    this.buildBiome(sprite);
    this.buildEarth(sprite);

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.pixelRatio);
    this.renderPass = new RenderPass(this.biome, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), 1.0, 0.6, 0.14);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    window.addEventListener('resize', this.onResize);
    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
  }

  /* ---------------- public API ---------------- */
  setView(v: WorldView) {
    if (v === this.view) return;
    this.view = v;
    this.renderPass.scene = v === 'biome' ? this.biome : this.earth;
    const pos = v === 'biome' ? new THREE.Vector3(0, 4.8, 18) : new THREE.Vector3(0, 3, 17);
    this.controls.target.set(0, v === 'biome' ? 3 : 0, 0);
    this.controls.maxDistance = v === 'biome' ? 26 : 28;
    this.camera.position.copy(pos.clone().multiplyScalar(1.5));
    this.fly = pos;
  }
  setHealth(h: number) { this.targetHealth = Math.min(1, Math.max(0, h)); }
  /** A refusal or reuse: light ripples out, she lifts her arms, your city glows brighter on Earth. */
  purify(strength = 1) {
    this.burst = Math.max(this.burst, strength);
    this.u.ocean.uniforms.uRipple.value = this.now();
    for (const b of this.u.beacons) if (b.home) b.base += 0.12 * strength;
  }
  /** Plastic used: smog ring, leaves fall, camera moves in to the Guardian. */
  pollute() {
    this.sag = 1;
    this.u.ocean.uniforms.uSmog.value = this.now();
    this.dropLeaves(14);
    if (this.view === 'biome') {
      const dir = this.camera.position.clone().sub(this.controls.target); dir.y = 0; dir.normalize();
      this.fly = new THREE.Vector3(0, 4.6, 0).addScaledVector(dir, 10.5);
    }
  }
  setPaused(p: boolean) {
    if (p === this.paused) return;
    this.paused = p;
    if (!p) { this.lastT = this.now(); this.raf = requestAnimationFrame(this.tick); }
  }
  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  /* ---------------- internals ---------------- */
  private now() { return (performance.now() - this.clock0) / 1000; }
  private resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h); this.composer.setSize(w, h);
  }

  private makeStars(n: number, sprite: THREE.Texture) {
    const g = new THREE.BufferGeometry(); const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(rand(250, 380)); if (v.y < -40) v.y *= -1; p.set([v.x, v.y, v.z], i * 3); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ size: 1.5, map: sprite, transparent: true, depthWrite: false, color: 0xcfefff, fog: false, blending: THREE.AdditiveBlending }));
  }

  private buildBiome(sprite: THREE.Texture) {
    const low = this.low, biome = this.biome, u = this.u;
    u.fogHealthy = C('#05202a'); u.fogSick = C('#1d1626'); u.fogC = new THREE.Color();
    biome.fog = new THREE.FogExp2(u.fogHealthy.clone(), 0.026);
    const moonDir = new THREE.Vector3(0.25, 0.32, -1).normalize();

    u.sky = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, uniforms: { uHealth: { value: 0.62 }, uTime: { value: 0 } },
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float uHealth,uTime; varying vec3 vP;
        void main(){ float h = vP.y; float az = atan(vP.z, vP.x);
          vec3 top = vec3(0.01,0.016,0.045);
          vec3 hor = mix(vec3(0.10,0.07,0.12), vec3(0.02,0.15,0.19), uHealth);
          vec3 col = mix(hor, top, smoothstep(-0.05,0.55,h));
          float band = smoothstep(.06,.22,h)*smoothstep(.55,.25,h);
          float rib = .5+.5*sin(az*5.+uTime*.06+sin(az*11.+uTime*.1)*1.4);
          col += mix(vec3(.08,.7,.55), vec3(.35,.2,.7), .5+.5*sin(az*2.+uTime*.05))*band*pow(rib,3.)*.22*uHealth;
          gl_FragColor = vec4(col,1.); }`,
    });
    biome.add(new THREE.Mesh(new THREE.SphereGeometry(420, 48, 24), u.sky));
    biome.add(this.makeStars(low ? 600 : 1400, sprite));
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0xd9f6ff, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    moon.position.copy(moonDir).multiplyScalar(300); moon.scale.setScalar(46); biome.add(moon);
    biome.add(new THREE.HemisphereLight(0x67e8f9, 0x2a1440, 0.5));
    const key = new THREE.DirectionalLight(0xbfe6ff, 1.25); key.position.set(-8, 14, 9); biome.add(key);
    const rim = new THREE.DirectionalLight(0x22d3ee, 1.4); rim.position.set(5, 8, -14); biome.add(rim);

    // ocean
    u.ocean = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uHealth: { value: 0.62 }, uRipple: { value: -99 }, uSmog: { value: -99 }, uFog: { value: u.fogHealthy.clone() }, uFogD: { value: 0.026 }, uMoon: { value: moonDir } },
      vertexShader: `uniform float uTime; varying vec2 vXZ; varying float vD; varying float vH; varying vec3 vN; varying vec3 vW;
        void main(){ vec3 p = position; float t = uTime;
          float h = sin(p.x*.25+t*.8)*.25 + sin(p.z*.3+t*.6)*.2 + sin((p.x+p.z)*.6+t*1.3)*.08;
          float dx = .0625*cos(p.x*.25+t*.8) + .048*cos((p.x+p.z)*.6+t*1.3);
          float dz = .06*cos(p.z*.3+t*.6) + .048*cos((p.x+p.z)*.6+t*1.3);
          p.y += h; vH = h; vXZ = p.xz; vN = normalize(vec3(-dx,1.,-dz));
          vec4 w = modelMatrix*vec4(p,1.); vW = w.xyz; vec4 mv = viewMatrix*w; vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float uTime,uHealth,uRipple,uSmog,uFogD; uniform vec3 uFog,uMoon; varying vec2 vXZ; varying float vD; varying float vH; varying vec3 vN; varying vec3 vW;
        void main(){ float r = length(vXZ);
          vec3 N = normalize(vN + vec3(.07*sin(vXZ.x*3.1+uTime*2.), 0., .07*cos(vXZ.y*3.4+uTime*1.7)));
          vec3 V = normalize(cameraPosition - vW);
          float fres = pow(1.-max(dot(N,V),0.),4.);
          float spec = pow(max(dot(reflect(-V,N), uMoon),0.), 140.);
          float c = sin(vXZ.x*1.3+uTime*.7+sin(vXZ.y*.9+uTime*.5)) * sin(vXZ.y*1.1-uTime*.6+sin(vXZ.x*.7+uTime*.3));
          c = smoothstep(.55,1.,c);
          vec3 deep = mix(vec3(.04,.03,.05), vec3(.006,.035,.06), uHealth);
          vec3 glow = mix(vec3(.3,.2,.36), vec3(.06,.9,.75), uHealth);
          float near = exp(-r*.06);
          vec3 col = deep + glow*c*(.12+1.0*uHealth)*near + glow*.15*max(vH,0.)*uHealth;
          col += mix(vec3(.1,.08,.12), vec3(.05,.2,.24), uHealth)*fres*.8 + vec3(.8,.95,1.)*spec*2.2;
          float age = uTime-uRipple; float ring = exp(-pow((r-age*9.)*1.1,2.))*exp(-age*.55)*step(0.,age);
          col += vec3(.35,1.,.75)*ring*3.;
          float a2 = uTime-uSmog; float ring2 = exp(-pow((r-a2*6.)*.8,2.))*exp(-a2*.45)*step(0.,a2);
          col = mix(col, vec3(.13,.1,.16), clamp(ring2,0.,1.)*.85); col += vec3(.3,.2,.35)*ring2*.35;
          float f = 1.-exp(-pow(uFogD*vD,2.)); col = mix(col,uFog,f);
          gl_FragColor = vec4(col,1.); }`,
    });
    const oceanGeo = new THREE.PlaneGeometry(260, 260, low ? 100 : 180, low ? 100 : 180); oceanGeo.rotateX(-Math.PI / 2);
    const ocean = new THREE.Mesh(oceanGeo, u.ocean); ocean.position.y = -7; biome.add(ocean);

    // island
    const island = new THREE.Group(); island.position.y = 0.6; biome.add(island); u.island = island;
    const Rth = (th: number) => 5.6 * (1 + 0.1 * Math.sin(3 * th + 1.3) + 0.05 * Math.sin(7 * th + 0.4));
    const H = (px: number, pz: number) => { const th = Math.atan2(pz, px); const q = Math.min(1, Math.hypot(px, pz) / Rth(th)); return 0.8 * Math.sqrt(Math.max(0, 1 - q * q)) + 0.38 * fbm(px * 0.42, 3.1, pz * 0.42) * sstep(0, 0.35, 1 - q); };
    let iGeo: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, low ? 26 : 42); iGeo.deleteAttribute('normal'); iGeo.deleteAttribute('uv'); iGeo = mergeVertices(iGeo);
    const underVerts: number[] = [];
    {
      const pos = iGeo.attributes.position as THREE.BufferAttribute; const col = new Float32Array(pos.count * 3); const c = new THREE.Color();
      const moss1 = C('#0d3527'), moss2 = C('#1c5e45'), rockA = C('#463a55'), rockB = C('#1b1624'), lich = C('#2a6b55');
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const th = Math.atan2(z, x); const rh = Math.hypot(x, z); const R = Rth(th);
        let X: number, Y: number, Z: number;
        if (y >= 0) { X = x * R; Z = z * R; Y = H(X, Z); c.copy(moss1).lerp(moss2, 0.5 + 0.5 * fbm(X * 0.6, 1, Z * 0.6)); if (rh > 0.93) c.lerp(rockA, ((rh - 0.93) / 0.07) * 0.6); }
        else {
          const d = -y; const n = fbm(x * 2.6, y * 2.6, z * 2.6);
          const hr = R * Math.pow(1 - d, 1.25) * (1 + 0.22 * n * sstep(0, 0.12, d)) + 0.05;
          const k = rh > 1e-4 ? hr / rh : 0; X = x * k; Z = z * k; Y = -d * 7.2 * (1 + 0.08 * n) + 0.25 * vnoise(x * 6, y * 6, z * 6) * sstep(0, 0.1, d);
          c.copy(rockA).lerp(rockB, Math.min(1, d * 1.3)).multiplyScalar(0.82 + 0.18 * Math.sin(Y * 4.5 + n * 3));
          if (d < 0.1 || fbm(X * 0.8, Y * 0.8, Z * 0.8) > 0.35) c.lerp(lich, 0.55);
          if (d > 0.12 && Math.random() < 0.02) underVerts.push(i);
        }
        pos.setXYZ(i, X, Y, Z); col.set([c.r, c.g, c.b], i * 3);
      }
      iGeo.setAttribute('color', new THREE.BufferAttribute(col, 3)); iGeo.computeVertexNormals();
    }
    u.islandMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, emissive: C('#07261f'), emissiveIntensity: 0.5 });
    island.add(new THREE.Mesh(iGeo, u.islandMat));

    // cliff crystals
    u.crystalMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const NC = Math.min(underVerts.length, low ? 34 : 60);
    const cliffCr = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.16, 0), u.crystalMat, NC); cliffCr.frustumCulled = false;
    { const o = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3(), cols = [C('#22d3ee'), C('#a78bfa'), C('#5eead4')];
      for (let i = 0; i < NC; i++) { const vi = underVerts[i]; o.position.fromBufferAttribute(iGeo.attributes.position as THREE.BufferAttribute, vi); nrm.fromBufferAttribute(iGeo.attributes.normal as THREE.BufferAttribute, vi);
        nrm.y -= 0.6; nrm.normalize(); o.quaternion.setFromUnitVectors(up, nrm); const s = rand(0.6, 1.8); o.scale.set(s, s * rand(2.5, 4.5), s); o.position.addScaledVector(nrm, 0.15 * s); o.updateMatrix(); cliffCr.setMatrixAt(i, o.matrix); cliffCr.setColorAt(i, cols[i % 3]); } }
    island.add(cliffCr);

    // grass
    const NG = low ? 3800 : 9000;
    const bladeGeo = new THREE.PlaneGeometry(0.06, 1, 1, 5); bladeGeo.translate(0, 0.5, 0);
    { const p = bladeGeo.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * 0.92)); p.setZ(i, y * y * 0.18); } }
    u.grass = new THREE.ShaderMaterial({ side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uHealth: { value: 0.62 }, uBurst: { value: 0 }, uFog: { value: u.fogHealthy.clone() }, uFogD: { value: 0.026 } },
      vertexShader: `uniform float uTime; varying float vY; varying vec3 vCol; varying float vD;
        void main(){ vY = uv.y; vec4 wp = modelMatrix*instanceMatrix*vec4(position,1.);
          float w = sin(uTime*1.5+wp.x*.7+wp.z*.5)*.12 + sin(uTime*2.6+wp.x*1.9)*.035; wp.x += w*vY*vY; wp.z += w*.6*vY*vY;
          #ifdef USE_INSTANCING_COLOR
          vCol = instanceColor;
          #else
          vCol = vec3(.2,1.,.8);
          #endif
          vec4 mv = viewMatrix*wp; vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float uHealth,uBurst,uFogD; uniform vec3 uFog; varying float vY; varying vec3 vCol; varying float vD;
        void main(){ vec3 base = mix(vec3(.03,.045,.035), vec3(.015,.10,.07), uHealth);
          vec3 tip = mix(vec3(.2,.16,.1), vCol*(.25+1.5*uHealth+uBurst*1.5), uHealth);
          vec3 col = mix(base, tip, smoothstep(.3,1.,vY));
          float f = 1.-exp(-pow(uFogD*vD,2.)); gl_FragColor = vec4(mix(col,uFog,f),1.); }` });
    const grass = new THREE.InstancedMesh(bladeGeo, u.grass, NG); grass.frustumCulled = false;
    { const o = new THREE.Object3D(), gc = [C('#2dd4bf'), C('#34d399'), C('#22d3ee'), C('#a3e635')];
      let i = 0; while (i < NG) { const a = rand(0, 6.283), r = Math.sqrt(Math.random()) * Rth(a) * 0.93; if (r < 1.3) continue;
        const x = Math.cos(a) * r, z = Math.sin(a) * r; o.position.set(x, H(x, z) - 0.02, z); o.rotation.set(rand(-0.15, 0.15), rand(0, 6.283), rand(-0.15, 0.15));
        const tall = Math.random() < 0.08; o.scale.set(rand(0.8, 1.4), tall ? rand(0.8, 1.3) : rand(0.2, 0.55), 1); o.updateMatrix(); grass.setMatrixAt(i, o.matrix); grass.setColorAt(i, gc[(Math.random() * 4) | 0]); i++; } }
    island.add(grass);

    // lumen bulbs
    const NB = low ? 40 : 75;
    u.stemB = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.022, 1, 5), new THREE.MeshStandardMaterial({ color: '#16302a', roughness: 0.8 }), NB);
    u.bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    u.bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 14, 10), u.bulbMat, NB);
    u.stemB.frustumCulled = u.bulbs.frustumCulled = false;
    u.bulbData = [] as { x: number; z: number; y: number; h: number; ph: number }[];
    { const bc = [C('#67e8f9'), C('#5eead4'), C('#f0abfc'), C('#bef264')];
      for (let i = 0; i < NB; i++) { const a = rand(0, 6.283), r = rand(1.6, Rth(a) * 0.9); const x = Math.cos(a) * r, z = Math.sin(a) * r;
        u.bulbData.push({ x, z, y: H(x, z), h: rand(0.6, 1.9), ph: rand(0, 6) }); u.bulbs.setColorAt(i, bc[i % 4]); } }
    island.add(u.stemB, u.bulbs);

    // vines
    { const NV = low ? 30 : 50; const seg: number[] = [], tips: number[] = []; const pos = iGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < NV; i++) { let vi = 0, tries = 0; do { vi = (Math.random() * pos.count) | 0; tries++; } while (pos.getY(vi) > -0.4 && tries < 200);
        const x = pos.getX(vi) * 0.97, y = pos.getY(vi), z = pos.getZ(vi) * 0.97, L = rand(1, 3.5);
        seg.push(x, y, z, x + rand(-0.25, 0.25), y - L, z + rand(-0.25, 0.25)); tips.push(seg[seg.length - 3], seg[seg.length - 2], seg[seg.length - 1]); }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
      island.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.35 })));
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tips, 3));
      island.add(new THREE.Points(tg, new THREE.PointsMaterial({ size: 0.45, map: sprite, color: 0x67e8f9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))); }

    this.buildGuardian(island, H, sprite);

    // spores
    const NS = low ? 700 : 1500; u.NS = NS;
    u.spGeo = new THREE.BufferGeometry(); { const p = new Float32Array(NS * 3), s = new Float32Array(NS);
      for (let i = 0; i < NS; i++) { const r = Math.sqrt(Math.random()) * 16, a = rand(0, 6.283); p.set([Math.cos(a) * r, rand(-7, 11), Math.sin(a) * r], i * 3); s[i] = Math.random(); }
      u.spGeo.setAttribute('position', new THREE.BufferAttribute(p, 3)); u.spGeo.setAttribute('aSeed', new THREE.BufferAttribute(s, 1)); }
    u.spores = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uHealth: { value: 0.62 }, uBurst: { value: 0 }, uPx: { value: this.pixelRatio }, uTex: { value: sprite } },
      vertexShader: `attribute float aSeed; uniform float uTime,uBurst,uHealth,uPx; varying float vA; varying float vS;
        void main(){ vec3 p = position; p.y = mod(p.y + uTime*(.2+aSeed*.45) + 7., 18.) - 7.;
          p.x += sin(uTime*.5+aSeed*20.)*.5; p.z += cos(uTime*.4+aSeed*15.)*.5;
          vec4 mv = modelViewMatrix*vec4(p,1.);
          gl_PointSize = (1.4+aSeed*2.8)*(1.+uBurst*1.6)*uPx*(28./-mv.z);
          vA = (.2+.8*uHealth)*(.55+.45*sin(uTime*2.+aSeed*30.)); vS = aSeed; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D uTex; uniform float uBurst; varying float vA; varying float vS;
        void main(){ vec4 t = texture2D(uTex, gl_PointCoord); vec3 col = vS>.88 ? vec3(.95,.55,1.) : (vS>.5 ? vec3(.35,1.,.8) : vec3(.45,.9,1.));
          gl_FragColor = vec4(col*(1.+uBurst*2.), t.a*vA); }` });
    biome.add(new THREE.Points(u.spGeo, u.spores));

    // drifters
    u.drifters = [];
    const dcol = [C('#22d3ee'), C('#c4b5fd'), C('#5eead4'), C('#34d399')];
    for (let i = 0; i < (low ? 5 : 8); i++) {
      const g = new THREE.Group(); const col = dcol[i % 4];
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 12, 0, 6.283, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      g.add(bell); const t: number[] = [];
      for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.283; t.push(Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24, Math.cos(a) * 0.16, -rand(0.9, 1.8), Math.sin(a) * 0.16); }
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(t, 3));
      g.add(new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending })));
      biome.add(g); u.drifters.push({ g, bell, r: rand(8, 13), y: rand(2, 8), sp: rand(0.04, 0.1) * (i % 2 ? 1 : -1), ph: rand(0, 6) });
    }

    // plastic debris (ocean + around her roots)
    u.ND = 70;
    const debrisGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.4, 10);
    const debrisMat = new THREE.MeshStandardMaterial({ color: '#dbe4ee', roughness: 0.3, transparent: true, opacity: 0.8 });
    u.debris = new THREE.InstancedMesh(debrisGeo, debrisMat, u.ND); u.debris.frustumCulled = false;
    u.deb = Array.from({ length: u.ND }, () => { const r = rand(7, 26), a = rand(0, 6.283); return { x: Math.cos(a) * r, z: Math.sin(a) * r, ph: rand(0, 6), rx: rand(0, 3), ry: rand(0, 3) }; });
    biome.add(u.debris);
    u.NID = 28;
    u.islandDebris = new THREE.InstancedMesh(debrisGeo, debrisMat, u.NID); u.islandDebris.frustumCulled = false;
    { const o = new THREE.Object3D(); for (let i = 0; i < u.NID; i++) { const a = rand(0, 6.283), r = rand(1.5, 4.3); const x = Math.cos(a) * r, z = Math.sin(a) * r;
      o.position.set(x, H(x, z) + 0.07, z); o.rotation.set(rand(-0.3, 0.3), rand(0, 6.28), Math.PI / 2); o.scale.setScalar(rand(0.8, 1.3)); o.updateMatrix(); u.islandDebris.setMatrixAt(i, o.matrix); } }
    island.add(u.islandDebris);
  }

  /** The Guardian: a woman of living wood, arms raised, her long dress becoming roots. */
  private buildGuardian(island: THREE.Group, H: (x: number, z: number) => number, sprite: THREE.Texture) {
    const u = this.u, low = this.low;
    const barkTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2b2236'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { const x = Math.random() * w; g.strokeStyle = Math.random() < 0.5 ? 'rgba(15,10,22,.55)' : 'rgba(90,72,110,.35)'; g.lineWidth = rand(0.5, 2.5);
        g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 4, y); g.stroke(); } });
    barkTex.colorSpace = THREE.SRGBColorSpace;
    u.veinTex = canvasTex(256, 512, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) { const x0 = ((i + 0.5) * w) / 16; const ph = rand(0, 6);
        g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1.5; g.beginPath(); for (let y = 0; y <= h; y += 8) { const x = x0 + Math.sin(y * 0.03 + ph) * 6; if (y) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
        for (let k = 0; k < 3; k++) { const yc = rand(0, h), L = rand(30, 70); const gr = g.createLinearGradient(0, yc - L, 0, yc + L); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.strokeStyle = gr; g.lineWidth = 3; g.beginPath(); for (let y = yc - L; y <= yc + L; y += 4) { const x = x0 + Math.sin(y * 0.03 + ph) * 6; if (y === yc - L) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); } } });
    u.veinTex.repeat.set(3, 1.4);
    u.wood = new THREE.MeshStandardMaterial({ map: barkTex, emissiveMap: u.veinTex, emissive: C('#2dd4bf'), emissiveIntensity: 1.2, roughness: 0.72, metalness: 0.05 });
    u.woodSick = C('#5b4a6b'); u.woodWell = C('#2dd4bf'); u.hairSick = C('#4b4358'); u.hairWell = C('#5eead4');

    // plastic creeping up her body (shader injection)
    u.plastic = { uPlasticY: { value: -10 }, uPlasticOn: { value: 0 } };
    u.wood.onBeforeCompile = (sh: any) => {
      Object.assign(sh.uniforms, u.plastic);
      sh.vertexShader = 'varying float vWY;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vWY = (modelMatrix * vec4(transformed, 1.0)).y;');
      sh.fragmentShader = 'uniform float uPlasticY;\nuniform float uPlasticOn;\nvarying float vWY;\n' + sh.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>\n  float pCov = (1.0 - smoothstep(uPlasticY - 0.1, uPlasticY + 0.1, vWY)) * uPlasticOn;\n  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.80, 0.83, 0.88), pCov * 0.88);')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.16, pCov);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance *= (1.0 - pCov * 0.97);\n  totalEmissiveRadiance += vec3(0.8, 0.72, 1.0) * exp(-pow((vWY - uPlasticY) * 7.0, 2.0)) * 0.7 * uPlasticOn;');
    };

    const lady = new THREE.Group(); lady.position.y = H(0, 0) - 0.15; island.add(lady); u.lady = lady;
    { const prof = [[1.55, -0.05], [1.35, 0.12], [1.08, 0.45], [0.88, 0.95], [0.72, 1.5], [0.58, 2.1], [0.46, 2.7], [0.36, 3.2], [0.3, 3.45], [0.33, 3.72], [0.37, 3.95], [0.33, 4.12], [0.24, 4.24], [0.12, 4.32], [0.105, 4.5], [0, 4.52]].map((p) => new THREE.Vector2(p[0], p[1]));
      const g = new THREE.LatheGeometry(prof, low ? 48 : 80); const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); let r = Math.hypot(x, z); let a = Math.atan2(z, x);
        const fold = 1 + 0.07 * Math.sin(9 * a + y * 0.9) * sstep(3.4, 1.0, y);
        const roots = 1 + 0.35 * Math.pow(Math.max(0, Math.sin(6 * a + 1)), 3) * sstep(0.6, 0, y);
        r *= fold * roots; a += y * 0.12; p.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r * (y > 3.3 ? 0.82 : 1)); }
      g.computeVertexNormals(); lady.add(new THREE.Mesh(g, u.wood)); }

    const head = new THREE.Group(); head.position.set(0, 4.72, 0.02); lady.add(head); u.head = head;
    { const hg = new THREE.SphereGeometry(0.26, 32, 24); hg.scale(0.82, 1.05, 0.92); head.add(new THREE.Mesh(hg, u.wood));
      const strands: THREE.BufferGeometry[] = [];
      for (let i = 0; i < (low ? 26 : 44); i++) { const sx = rand(-1, 1);
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * 0.12, 0.18, -0.05), new THREE.Vector3(sx * 0.35, 0.55, -0.35), new THREE.Vector3(sx * 0.75, 0.95 + rand(-0.1, 0.2), -0.75), new THREE.Vector3(sx * 1.2 + rand(-0.2, 0.2), 1.15 + rand(-0.3, 0.4), -1.25 + rand(-0.3, 0.2))]);
        strands.push(new THREE.TubeGeometry(curve, 20, rand(0.008, 0.018), 4)); }
      u.hairMat = new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.85 });
      head.add(new THREE.Mesh(mergeGeometries(strands), u.hairMat)); }
    u.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0x5eead4, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    u.halo.position.set(0, 0.5, -0.7); u.halo.scale.setScalar(3.4); head.add(u.halo);

    u.arms = [];
    for (const s of [-1, 1]) {
      const shoulder = new THREE.Group(); shoulder.position.set(s * 0.33, 4.08, 0); lady.add(shoulder);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.092, 1.05, 18), u.wood); upper.position.y = 0.52; shoulder.add(upper);
      const elbow = new THREE.Group(); elbow.position.y = 1.03; shoulder.add(elbow);
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.98, 16), u.wood); fore.position.y = 0.49; elbow.add(fore);
      const hand = new THREE.Group(); hand.position.y = 0.97; elbow.add(hand);
      for (let k = 0; k < 5; k++) { const f = new THREE.Group(); f.rotation.z = (k - 2) * 0.32 * -s + rand(-0.08, 0.08); f.rotation.x = rand(-0.35, 0.35); hand.add(f);
        const L = rand(0.55, 0.95); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.03, L, 8), u.wood); m.position.y = L / 2; f.add(m);
        const tw = new THREE.Group(); tw.position.y = L * 0.6; tw.rotation.z = rand(0.5, 0.8) * (Math.random() < 0.5 ? -1 : 1); f.add(tw);
        const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.014, L * 0.5, 6), u.wood); m2.position.y = L * 0.25; tw.add(m2); }
      const leafAnchor = new THREE.Object3D(); leafAnchor.position.y = 0.55; hand.add(leafAnchor);
      u.arms.push({ s, shoulder, elbow, hand, leafAnchor });
    }
    u.crown = new THREE.Object3D(); u.crown.position.set(0, 1.0, -0.75); head.add(u.crown);
    u.ladyLight = new THREE.PointLight(0x2dd4bf, 20, 14, 1.6); u.ladyLight.position.set(0, 5.4, 1.4); lady.add(u.ladyLight);

    // leaves and blossoms that live on her hands and hair
    const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(0.09, 0.13, 0, 0.3); leafShape.quadraticCurveTo(-0.09, 0.13, 0, 0);
    const leafGeo = new THREE.ShapeGeometry(leafShape, 6);
    u.NL = low ? 260 : 520;
    u.leafMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
    u.leaves = new THREE.InstancedMesh(leafGeo, u.leafMat, u.NL); u.leaves.frustumCulled = false; this.biome.add(u.leaves);
    u.leafData = [];
    { const lc = [C('#5eead4'), C('#34d399'), C('#22d3ee'), C('#f0abfc'), C('#a7f3d0')];
      for (let i = 0; i < u.NL; i++) { const anchor = i % 3 === 2 ? 'crown' : i % 3;
        const off = anchor === 'crown' ? new THREE.Vector3(rand(-1.1, 1.1), rand(-0.5, 0.6), rand(-0.6, 0.5)) : new THREE.Vector3().randomDirection().multiplyScalar(Math.cbrt(Math.random()) * 0.75);
        u.leafData.push({ anchor, off, rot: new THREE.Euler(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28)), ph: rand(0, 6), s: rand(0.6, 1.3) }); u.leaves.setColorAt(i, lc[i % 5]); } }
    u.NF = 36;
    u.falling = new THREE.InstancedMesh(leafGeo, new THREE.MeshBasicMaterial({ color: 0x6b5a45, side: THREE.DoubleSide }), u.NF); u.falling.frustumCulled = false; this.biome.add(u.falling);
    u.fallData = Array.from({ length: u.NF }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler() }));
  }

  private dropLeaves(n: number) {
    const u = this.u; const tmp = new THREE.Vector3(); let k = 0;
    for (const f of u.fallData) { if (k >= n) break; if (f.life > 0) continue;
      const src = Math.random() < 0.5 ? u.arms[(Math.random() * 2) | 0].leafAnchor : u.crown; src.getWorldPosition(f.p); f.p.add(tmp.randomDirection().multiplyScalar(rand(0, 0.6)));
      f.v.set(rand(-0.3, 0.3), rand(-0.2, 0), rand(-0.3, 0.3)); f.r.set(rand(0, 6), rand(0, 6), rand(0, 6)); f.life = 1; k++; }
  }

  private buildEarth(sprite: THREE.Texture) {
    const low = this.low, earth = this.earth, u = this.u;
    earth.add(this.makeStars(low ? 700 : 1500, sprite));
    const loader = new THREE.TextureLoader();
    const day = loader.load('/textures/earth-day.jpg'), night = loader.load('/textures/earth-night.jpg');
    day.colorSpace = night.colorSpace = THREE.SRGBColorSpace;
    const sunDir = new THREE.Vector3(-1, 0.35, 0.6).normalize();
    const earthMat = new THREE.ShaderMaterial({
      uniforms: { uDay: { value: day }, uNight: { value: night }, uSun: { value: sunDir } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix)*normal);
        vec4 w = modelMatrix*vec4(position,1.); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform sampler2D uDay,uNight; uniform vec3 uSun; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ float l = dot(vN,uSun); float m = smoothstep(-.15,.3,l);
          vec3 d = texture2D(uDay,vUv).rgb*(.15+max(l,0.)*1.1)*vec3(.85,1.,1.05);
          vec3 n = texture2D(uNight,vUv).rgb*vec3(.5,1.3,1.4)*1.8;
          vec3 col = mix(n,d,m);
          float fr = pow(1.-max(dot(vN,vV),0.),3.); col += vec3(.1,.85,.8)*fr*.9;
          gl_FragColor = vec4(col,1.); }`,
    });
    const globe = new THREE.Group(); earth.add(globe); u.globe = globe;
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(5, low ? 64 : 96, low ? 48 : 72), earthMat));
    earth.add(new THREE.Mesh(new THREE.SphereGeometry(5.6, 64, 48), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec3 vN; void main(){ float i = clamp(pow(max(0., .7 - dot(vN, vec3(0,0,1.))), 3.), 0., 1.); gl_FragColor = vec4(vec3(.15,.9,.85)*i*.9, i); }` })));
    const ll = (lat: number, lng: number, r: number) => { const phi = ((90 - lat) * Math.PI) / 180, th = ((lng + 180) * Math.PI) / 180; return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)); };
    // Sample community lights until Phase 2 brings real data. The first one is "home".
    const cities: [number, number, number][] = [[34.05, -118.24, 1.0], [19.43, -99.13, 0.8], [9.93, -84.08, 0.7], [14.6, 120.98, 0.85], [-1.29, 36.82, 0.65], [38.72, -9.14, 0.5], [-23.55, -46.63, 0.75], [51.5, -0.12, 0.7], [35.68, 139.69, 0.9], [28.7, 77.1, 0.8], [-33.87, 151.2, 0.55], [6.52, 3.38, 0.6], [40.71, -74.0, 0.85], [1.35, 103.82, 0.5]];
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    u.beacons = []; const glowPts: number[] = [];
    cities.forEach(([la, lo, v], i) => {
      const n = ll(la, lo, 1).normalize(); const h = 0.4 + v * 1.1;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 1, 6), beamMat); m.position.copy(n.clone().multiplyScalar(5 + h / 2)); m.scale.y = h;
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); globe.add(m);
      const tip = n.clone().multiplyScalar(5 + h); glowPts.push(tip.x, tip.y, tip.z); u.beacons.push({ m, n, base: h, home: i === 0 });
    });
    const gp = new THREE.BufferGeometry(); gp.setAttribute('position', new THREE.Float32BufferAttribute(glowPts, 3));
    u.glowP = new THREE.Points(gp, new THREE.PointsMaterial({ size: 0.9, map: sprite, color: 0x99f6e4, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); globe.add(u.glowP);
    u.arcs = [];
    [[0, 2], [2, 6], [3, 8], [4, 5], [12, 7], [9, 3], [1, 12], [10, 13]].forEach(([a, b]) => {
      const A = ll(cities[a][0], cities[a][1], 5.02), B = ll(cities[b][0], cities[b][1], 5.02);
      const mid = A.clone().add(B).multiplyScalar(0.5).normalize().multiplyScalar(5 + A.distanceTo(B) * 0.35);
      const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)), new THREE.LineBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending })));
      const comet = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color: 0xccfbf1, blending: THREE.AdditiveBlending, depthWrite: false })); comet.scale.setScalar(0.45); globe.add(comet);
      u.arcs.push({ curve, comet, t: Math.random(), sp: rand(0.12, 0.25) });
    });
    globe.rotation.y = 1.9;
  }

  private tick() {
    if (this.paused) return;
    const u = this.u; const t = this.now(); const dt = Math.min(0.05, t - this.lastT); this.lastT = t;
    this.shown += (this.targetHealth - this.shown) * 0.035; const h = this.shown;
    this.burst *= 0.965; this.sag *= 0.97;
    this.controls.update();
    if (this.fly) { this.camera.position.lerp(this.fly, 0.05); if (this.camera.position.distanceTo(this.fly) < 0.05) this.fly = null; }

    if (this.view === 'biome') {
      const fog = this.biome.fog as THREE.FogExp2;
      u.fogC.copy(u.fogSick).lerp(u.fogHealthy, h); fog.color.copy(u.fogC); fog.density = 0.026 + (1 - h) * 0.025;
      for (const m of [u.ocean, u.grass]) { m.uniforms.uFog.value.copy(u.fogC); m.uniforms.uFogD.value = fog.density; m.uniforms.uTime.value = t; m.uniforms.uHealth.value = h; }
      u.grass.uniforms.uBurst.value = this.burst;
      u.sky.uniforms.uHealth.value = h; u.sky.uniforms.uTime.value = t;
      u.spores.uniforms.uTime.value = t; u.spores.uniforms.uHealth.value = h; u.spores.uniforms.uBurst.value = this.burst;
      u.spGeo.setDrawRange(0, Math.floor(u.NS * (0.25 + 0.75 * h)));
      u.island.position.y = 0.6 + Math.sin(t * 0.55) * 0.16;
      u.islandMat.emissiveIntensity = 0.15 + 0.5 * h;
      u.crystalMat.color.setScalar(0.25 + 0.9 * h + this.burst * 0.6); u.bulbMat.color.setScalar(0.25 + 0.95 * h + this.burst * 0.8);

      // the Guardian's pose and glow follow the biome's health
      const hb = heartbeat(t);
      const lift = Math.min(1.15, Math.max(0, h * 1.1 - this.sag * 0.35 + this.burst * 0.25));
      for (const a of u.arms) {
        const sway = Math.sin(t * 0.8 + a.s) * 0.04;
        a.shoulder.rotation.z = -a.s * lerp(2.55, 0.38, lift) + sway; a.shoulder.rotation.x = lerp(0.35, -0.12, lift);
        a.elbow.rotation.z = a.s * lerp(-0.35, 0.28, lift); a.hand.rotation.z = a.s * lerp(-0.2, 0.15, lift) + sway;
      }
      u.head.rotation.x = lerp(0.5, -0.38, Math.min(1, lift)); u.lady.rotation.y = Math.sin(t * 0.2) * 0.08;
      u.veinTex.offset.y -= dt * (0.05 + 0.25 * h + this.burst * 0.8);
      u.wood.emissive.copy(u.woodSick).lerp(u.woodWell, h); u.wood.emissiveIntensity = (0.25 + 1.5 * h) * (0.75 + 0.4 * hb) + this.burst * 2.2;
      u.hairMat.color.copy(u.hairSick).lerp(u.hairWell, h).multiplyScalar(0.6 + 0.7 * h + this.burst);
      u.halo.material.opacity = 0.08 + 0.45 * h + this.burst * 0.5; u.halo.scale.setScalar(3 + 1.2 * h + this.burst * 1.5);
      u.ladyLight.intensity = (3 + 24 * h) * (0.8 + 0.3 * hb) + this.burst * 30;
      u.island.updateMatrixWorld(true);
      const pv = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), m4 = new THREE.Matrix4();
      u.plastic.uPlasticOn.value = sstep(0.84, 0.74, h);
      u.plastic.uPlasticY.value = u.lady.getWorldPosition(pv).y - 0.3 + Math.max(0, (0.8 - h) / 0.8) * 7.6;
      u.islandDebris.count = Math.round(u.NID * Math.max(0, (0.78 - h) / 0.7));

      const nLeaves = Math.floor(u.NL * (0.15 + 0.85 * h)); u.leaves.count = nLeaves; u.leafMat.color.setScalar(0.35 + 0.9 * h + this.burst * 0.9);
      const bloomS = 1 + this.burst * 0.35;
      for (let i = 0; i < nLeaves; i++) { const L = u.leafData[i]; const anc = L.anchor === 'crown' ? u.crown : u.arms[L.anchor].leafAnchor;
        pv.copy(L.off).multiplyScalar(bloomS); pv.x += Math.sin(t * 1.3 + L.ph) * 0.05; pv.y += Math.cos(t * 1.1 + L.ph) * 0.04; anc.localToWorld(pv);
        q.setFromEuler(L.rot); sc.setScalar(L.s * (0.7 + 0.3 * h) * bloomS); m4.compose(pv, q, sc); u.leaves.setMatrixAt(i, m4); }
      u.leaves.instanceMatrix.needsUpdate = true;
      u.fallData.forEach((f: any, i: number) => { if (f.life > 0) { f.life -= dt * 0.3; f.v.y -= dt * 0.25; f.p.addScaledVector(f.v, dt); f.p.x += Math.sin(t * 2 + i) * dt * 0.3; f.r.x += dt * 2; f.r.z += dt * 1.3; }
        q.setFromEuler(f.r); sc.setScalar(Math.max(0, f.life)); m4.compose(f.p, q, sc); u.falling.setMatrixAt(i, m4); });
      u.falling.instanceMatrix.needsUpdate = true;

      const o = new THREE.Object3D();
      u.bulbData.forEach((b: any, i: number) => { const sway = Math.sin(t * 1.2 + b.ph) * 0.07; const hh = b.h * (0.6 + 0.4 * h) * (1 + this.burst * 0.25);
        o.position.set(b.x, b.y + hh / 2, b.z); o.rotation.set(sway, 0, sway * 0.7); o.scale.set(1, hh, 1); o.updateMatrix(); u.stemB.setMatrixAt(i, o.matrix);
        o.position.set(b.x, b.y + hh, b.z); o.rotation.set(0, 0, 0); o.scale.setScalar(0.8 + 0.5 * h + this.burst * 0.5); o.updateMatrix(); u.bulbs.setMatrixAt(i, o.matrix); });
      u.stemB.instanceMatrix.needsUpdate = u.bulbs.instanceMatrix.needsUpdate = true;
      u.drifters.forEach((d: any, i: number) => { const a = t * d.sp + d.ph; d.g.position.set(Math.cos(a) * d.r, d.y + Math.sin(t * 0.7 + d.ph) * 0.6, Math.sin(a) * d.r);
        const pulse = 1 + 0.12 * Math.sin(t * 3 + d.ph); d.bell.scale.set(pulse, 1 / pulse, pulse); d.g.visible = i < Math.round(u.drifters.length * (0.2 + 0.8 * h)); d.bell.material.opacity = 0.2 + 0.4 * h; });
      u.debris.count = Math.round(u.ND * Math.max(0, (0.75 - h) / 0.7));
      for (let i = 0; i < u.debris.count; i++) { const d = u.deb[i]; o.position.set(d.x, -6.8 + Math.sin(t + d.ph) * 0.2, d.z); o.rotation.set(d.rx + t * 0.1, d.ry, Math.PI / 2); o.scale.setScalar(1); o.updateMatrix(); u.debris.setMatrixAt(i, o.matrix); }
      u.debris.instanceMatrix.needsUpdate = true;
      this.bloom.strength = 0.75 + 0.45 * h + this.burst * 0.6;
    } else {
      u.globe.rotation.y += this.reduceMotion ? 0.0005 : 0.0015;
      const hb = heartbeat(t);
      u.beacons.forEach((b: any, i: number) => { const k = b.base * (1 + 0.08 * Math.sin(t * 2 + i)); b.m.scale.y = k; b.m.position.copy(b.n).multiplyScalar(5 + k / 2); });
      u.glowP.material.size = 0.8 + 0.35 * hb;
      u.arcs.forEach((a: any) => { a.t = (a.t + a.sp * dt) % 1; a.comet.position.copy(a.curve.getPoint(a.t)); });
      this.bloom.strength = 0.85;
    }
    this.composer.render();

    this.frames++;
    if (!this.adapted && performance.now() - this.fpsT > 3000) {
      const fps = this.frames / ((performance.now() - this.fpsT) / 1000); this.adapted = true;
      if (fps < 38 && this.pixelRatio > 1) { this.pixelRatio = 1; this.renderer.setPixelRatio(1); this.composer.setPixelRatio(1); u.spores.uniforms.uPx.value = 1; }
    }
    this.raf = requestAnimationFrame(this.tick);
  }
}

export function isWebGLAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
