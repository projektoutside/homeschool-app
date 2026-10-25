import '../analogclockgame/three.min.js';
import { coinArtUrl, prepareCoinArt } from './coin-art.js';
import { ORDER } from './game-core.mjs';
import { REST_TILT, dropPose, reconcileCoins } from './coin-motion.mjs';

const T = globalThis.THREE;
const SPECS = {
  penny: { diameter: 19.05, thickness: 1.52, color: 0xc18558, reeds: 0 },
  nickel: { diameter: 21.21, thickness: 1.95, color: 0xb6b8b6, reeds: 0 },
  dime: { diameter: 17.91, thickness: 1.35, color: 0xbfc4c5, reeds: 118 },
  quarter: { diameter: 24.26, thickness: 1.75, color: 0xc1c5c5, reeds: 119 },
};

function studioEnvironment(renderer) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const base = ctx.createLinearGradient(0, 0, 0, 512);
  base.addColorStop(0, '#dde7ec'); base.addColorStop(.55, '#8a969c'); base.addColorStop(1, '#30383c');
  ctx.fillStyle = base; ctx.fillRect(0, 0, 1024, 512);
  for (const [x, width, color] of [[105, 140, '#fffdf7'], [460, 65, '#ffffff'], [740, 180, '#ebf4ff']]) {
    ctx.fillStyle = color; ctx.fillRect(x, 60, width, 300);
  }
  const texture = new T.CanvasTexture(canvas); texture.mapping = T.EquirectangularReflectionMapping; texture.colorSpace = T.SRGBColorSpace;
  const generator = new T.PMREMGenerator(renderer), target = generator.fromEquirectangular(texture);
  texture.dispose(); generator.dispose(); return target;
}

function edgeTexture(reeds) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 32;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#bababa'; ctx.fillRect(0, 0, 512, 32);
  if (reeds) for (let n = 0; n < reeds; n++) {
    ctx.fillStyle = '#575757'; ctx.fillRect(n * 512 / reeds, 0, 1.3, 32);
    ctx.fillStyle = '#f3f3f3'; ctx.fillRect(n * 512 / reeds + 1.5, 0, 1, 32);
  }
  return new T.CanvasTexture(canvas);
}

function shadowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(37,42,30,.3)'); gradient.addColorStop(.55, 'rgba(37,42,30,.15)'); gradient.addColorStop(1, 'rgba(37,42,30,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64); return new T.CanvasTexture(canvas);
}

export class CoinScene {
  constructor({ onLand = () => {} } = {}) {
    this.onLand = onLand; this.coins = []; this.objects = new Map(); this.models = new Map(); this.resources = new Set(); this.uid = 0;
    this.motion = matchMedia('(prefers-reduced-motion: reduce)'); this.paused = false; this.disposed = false;
    this.resize = () => { this.settle(); this.scheduleLayout(); };
    this.layoutObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.scheduleLayout()) : null;
    this.motionChange = () => { this.settle(); this.draw(); };
    this.motion.addEventListener('change', this.motionChange);
    window.addEventListener('resize', this.resize);
    document.fonts?.ready.then(() => { if (!this.disposed) this.resize(); });
  }
  dropFrom(id, rect) {
    this.origin = { id, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, radius: Math.min(rect.width, rect.height) / 2 };
  }
  async initialize() {
    if (this.initializing || this.failed || this.disposed) return this.initializing;
    this.initializing = (async () => {
      try {
        await prepareCoinArt(); if (this.disposed) return;
        this.renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
        this.renderer.outputColorSpace = T.SRGBColorSpace; this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
        this.canvas = this.renderer.domElement; this.canvas.className = 'coin-renderer'; this.canvas.setAttribute('aria-hidden', 'true');
        document.body.append(this.canvas);
        this.scene = new T.Scene(); this.camera = new T.OrthographicCamera(0, innerWidth, innerHeight, 0, .1, 3000); this.camera.position.z = 1000;
        this.environment = studioEnvironment(this.renderer); this.scene.environment = this.environment.texture;
        this.scene.add(new T.HemisphereLight(0xffffff, 0xa8a59a, .85));
        const key = new T.DirectionalLight(0xfff6e9, 1.8); key.position.set(-200, 500, 700); this.scene.add(key);
        const fill = new T.DirectionalLight(0xe2eeff, .8); fill.position.set(500, -100, 500); this.scene.add(fill);
        const loader = new T.TextureLoader();
        for (const id of ORDER) {
          const textures = await Promise.all([false, true].map(reverse => loader.loadAsync(coinArtUrl(id, reverse))));
          if (this.disposed) { textures.forEach(texture => texture.dispose()); return; }
          textures.forEach(texture => { texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy()); this.resources.add(texture); });
          this.models.set(id, this.model(id, textures));
        }
        this.shadowMap = shadowTexture(); this.resources.add(this.shadowMap);
        this.shadowMaterial = new T.MeshBasicMaterial({ map: this.shadowMap, transparent: true, depthWrite: false }); this.resources.add(this.shadowMaterial);
        this.shadowGeometry = new T.PlaneGeometry(1, 1); this.resources.add(this.shadowGeometry);
        this.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.contextLost = true; this.settle(); this.fallback(); });
        this.canvas.addEventListener('webglcontextrestored', () => { this.contextLost = false; this.sync(this.state, true); this.observeLayout(); this.scheduleLayout(); });
        this.ready = true; this.sync(this.state, true); this.observeLayout(); this.scheduleLayout();
      } catch { this.failed = true; this.fallback(); this.release(); }
    })();
    return this.initializing;
  }
  model(id, textures) {
    const spec = SPECS[id], h = spec.thickness / spec.diameter;
    const profile = [[.002, -h], [.94, -h], [.983, -h + .012], [1, -h + .035], [1, h - .035], [.983, h - .012], [.94, h], [.002, h]].map(([x, y]) => new T.Vector2(x, y));
    const bodyGeometry = new T.LatheGeometry(profile, 96); bodyGeometry.rotateX(Math.PI / 2); this.resources.add(bodyGeometry);
    const edge = edgeTexture(spec.reeds); this.resources.add(edge);
    const bodyMaterial = new T.MeshStandardMaterial({ color: spec.color, metalness: .94, roughness: .28, bumpMap: edge, bumpScale: spec.reeds ? .025 : 0, envMapIntensity: 1.1 }); this.resources.add(bodyMaterial);
    const group = new T.Group(); group.add(new T.Mesh(bodyGeometry, bodyMaterial));
    const faceGeometry = new T.CircleGeometry(.953, 96); this.resources.add(faceGeometry);
    for (let side = 0; side < 2; side++) {
      const material = new T.MeshStandardMaterial({ color: id === 'penny' ? 0xe2aa7f : 0xc1c8cc, map: textures[side], transparent: true, alphaTest: .1, metalness: .48, roughness: .38, bumpMap: textures[side], bumpScale: .008, envMapIntensity: .38 }); this.resources.add(material);
      const face = new T.Mesh(faceGeometry, material); face.position.z = side ? -h - .001 : h + .001;
      if (side) { face.rotation.y = Math.PI; face.rotation.z = Math.PI; }
      group.add(face);
    }
    if (spec.reeds) {
      const geometry = new T.CylinderGeometry(.999, .999, h * .62, 96, 1, true); geometry.rotateX(Math.PI / 2); this.resources.add(geometry);
      const material = new T.MeshStandardMaterial({ color: 0xb77e57, metalness: .88, roughness: .38 }); this.resources.add(material);
      group.add(new T.Mesh(geometry, material));
    }
    return group;
  }
  sync(state, layoutOnly = false) {
    if (!state || this.disposed) return;
    this.state = state;
    this.paused = state.paused === true;
    if (state.view !== 'play') { this.coins = []; this.origin = null; this.settle(); this.fallback(); return; }
    if (!this.ready) { this.coins = reconcileCoins(this.coins, state.selection, () => ++this.uid); void this.initialize(); return; }
    if (this.failed || this.contextLost) return;
    if (this.width !== innerWidth || this.height !== innerHeight) {
      this.width = innerWidth; this.height = innerHeight;
      this.renderer.setSize(innerWidth, innerHeight, false);
      this.camera.right = innerWidth; this.camera.top = innerHeight; this.camera.updateProjectionMatrix();
    }
    const next = reconcileCoins(this.coins, state.selection, () => ++this.uid), wanted = new Set();
    const now = performance.now();
    const anchors = [...document.querySelectorAll('#main [data-art]')];
    for (const [index, element] of anchors.entries()) {
      if (element.closest('.tray-slot')) continue;
      const rect = element.getBoundingClientRect(); if (!rect.width || !rect.height) continue;
      const key = `static-${index}-${element.dataset.art}`;
      this.target(key, element.dataset.art, rect, 0, 0, wanted);
    }
    for (const id of ORDER) {
      const stack = next.filter(coin => coin.id === id), element = document.querySelector(`.tray-slot[data-id="${id}"] [data-art]`);
      if (!element) continue;
      const rect = element.getBoundingClientRect(), spacing = Math.min(3, rect.height * .22 / Math.max(1, stack.length - 1));
      stack.forEach((coin, index) => {
        const key = `selected-${coin.key}`, object = this.target(key, id, rect, (index - (stack.length - 1) / 2) * spacing, index, wanted);
        if (coin.fresh && this.origin?.id === id && !layoutOnly && !this.motion.matches && !this.paused) {
          const source = this.origin?.id === id ? this.origin : this.bankOrigin(id, rect);
          object.flight = { from: source, started: now }; this.origin = null;
        }
        coin.fresh = false;
      });
    }
    for (const [key, object] of this.objects) if (!wanted.has(key)) { this.scene.remove(object.mesh, object.shadow); this.objects.delete(key); }
    this.coins = next;
    this.origin = null;
    if (this.paused) this.settle();
    this.canvas.hidden = false; document.documentElement.dataset.coins3d = 'ready'; this.draw();
    if (!layoutOnly) { this.observeLayout(); this.scheduleLayout(); }
  }
  observeLayout() {
    if (!this.layoutObserver) return;
    this.layoutObserver.disconnect();
    for (const element of document.querySelectorAll('#main,.mini-board,.treasure-map,.memory-grid,.sorting-jars,.sort-pedestal,.coin-bank,.selected-coins,.question-stage,.coin-choices,.amount-choices')) this.layoutObserver.observe(element);
  }
  scheduleLayout() {
    if (!this.ready || this.disposed || this.layoutFrame || this.state?.view !== 'play') return;
    this.layoutFrame = requestAnimationFrame(() => { this.layoutFrame = null; this.sync(this.state, true); });
  }
  bankOrigin(id, fallback) {
    const r = document.querySelector(`[data-action="add"][data-id="${id}"] [data-art]`)?.getBoundingClientRect() || fallback;
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, radius: Math.min(r.width, r.height) / 2 };
  }
  target(key, id, rect, offset, depth, wanted) {
    wanted.add(key); let object = this.objects.get(key);
    if (!object) {
      const mesh = this.models.get(id).clone(true), shadow = new T.Mesh(this.shadowGeometry, this.shadowMaterial);
      this.scene.add(mesh, shadow); object = { mesh, shadow, id, selected: key.startsWith('selected-') }; this.objects.set(key, object);
    }
    object.to = { x: rect.x + rect.width / 2 + offset * .22, y: rect.y + rect.height / 2 - offset, radius: Math.min(rect.width, rect.height) / 2, rz: depth ? Math.sin(depth * 3.1) * .07 : -.025, depth };
    return object;
  }
  draw() {
    if (!this.ready || this.contextLost || this.disposed || this.state?.view !== 'play' || document.hidden) return;
    cancelAnimationFrame(this.frame); this.frame = null;
    let moving = false;
    for (const object of this.objects.values()) {
      let pose = { ...object.to, rx: REST_TILT.x, ry: REST_TILT.y };
      if (object.flight) {
        pose = dropPose(object.flight.from, object.to, performance.now() - object.flight.started);
        if (pose.done || this.motion.matches || this.paused) { object.flight = null; pose = { ...object.to, rx: REST_TILT.x, ry: REST_TILT.y }; if (!this.paused && !this.motion.matches) this.onLand(); }
        else moving = true;
      }
      const layer = pose.radius * SPECS[object.id].thickness / SPECS[object.id].diameter * 2 + .7;
      object.mesh.position.set(pose.x, innerHeight - pose.y, 100 + object.to.depth * layer + (object.flight ? 150 : 0));
      object.mesh.rotation.set(pose.rx, pose.ry, pose.rz); object.mesh.scale.setScalar(pose.radius);
      object.shadow.position.set(pose.x + 3, innerHeight - pose.y - 5, 90 + object.to.depth * 4); object.shadow.scale.set(pose.radius * 2.6, pose.radius * 2.2, 1);
      object.shadow.visible = !object.flight && (!object.selected || !object.to.depth);
    }
    this.renderer.render(this.scene, this.camera);
    this.canvas.dataset.moving = String(moving); this.canvas.dataset.coins = String(this.coins.length);
    if (moving && !this.paused) this.frame = requestAnimationFrame(() => this.draw());
  }
  settle() { cancelAnimationFrame(this.frame); cancelAnimationFrame(this.layoutFrame); this.frame = null; this.layoutFrame = null; for (const object of this.objects.values()) object.flight = null; }
  pause(value) { this.paused = value; if (this.state) this.state.paused = value; if (value) { this.settle(); this.draw(); } else this.sync(this.state, true); }
  fallback() { delete document.documentElement.dataset.coins3d; if (this.canvas) this.canvas.hidden = true; }
  release() { this.settle(); this.environment?.dispose(); for (const resource of this.resources) resource.dispose(); this.resources.clear(); this.renderer?.dispose(); this.canvas?.remove(); }
  dispose() { this.disposed = true; this.layoutObserver?.disconnect(); this.fallback(); this.release(); window.removeEventListener('resize', this.resize); this.motion.removeEventListener('change', this.motionChange); }
}
