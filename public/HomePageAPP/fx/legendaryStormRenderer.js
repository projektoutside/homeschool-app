import * as THREE from 'three';
import { EffectComposer } from '../vendor/three-addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three-addons/postprocessing/RenderPass.js';
import { ShaderPass } from '../vendor/three-addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from '../vendor/three-addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/three-addons/postprocessing/OutputPass.js';

const ACTIVE_STORM_PHASES = new Set([
    'cloudFormation',
    'escalation',
    'transitionStrike',
    'postVideoStormHold',
    'targetedImpact',
    'boxMaterialize',
    'idleStormReveal',
    'stormDissipate'
]);

const LANDING_STORM_PHASES = new Set([
    'targetedImpact',
    'boxMaterialize',
    'idleStormReveal',
    'stormDissipate'
]);

const DEFAULT_STRIKE_TARGET = Object.freeze({ x: 0.5, y: 0.48 });
const FALLBACK_THEME = Object.freeze({
    overlayAccentA: 'rgba(245, 250, 255, 0.92)',
    overlayAccentB: 'rgba(180, 228, 255, 0.84)',
    overlayCloudColor: 'rgba(18, 31, 52, 0.92)',
    overlayCloudSheetColor: 'rgba(232, 242, 255, 0.9)',
    overlayGroundSpillColor: 'rgba(182, 224, 255, 0.76)'
});

const VIEWBOX_DEFAULT_IMPACT_Y = 1248;
const VEC2_A = new THREE.Vector2();
const VEC2_B = new THREE.Vector2();
const VEC3_A = new THREE.Vector3();
const COLOR_A = new THREE.Color();
const COLOR_B = new THREE.Color();
const COLOR_C = new THREE.Color();
const COLOR_D = new THREE.Color();

const FULLSCREEN_VERTEX_SHADER = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const CLOUD_FRAGMENT_SHADER = `
    varying vec2 vUv;
    uniform vec2 uResolution;
    uniform vec2 uStrikePos;
    uniform float uTime;
    uniform float uEnvironmentMix;
    uniform float uDarkness;
    uniform float uNightfallProgress;
    uniform float uCloudFlash;
    uniform float uCloudSheet;
    uniform float uFlash;
    uniform float uReturnStroke;
    uniform float uGroundGlow;
    uniform float uMist;
    uniform vec3 uThemeA;
    uniform vec3 uThemeB;
    uniform vec3 uCloudTint;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
        );
    }

    float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 5; i++) {
            value += amplitude * noise(p);
            p = p * 2.07 + vec2(11.3, -7.1);
            amplitude *= 0.53;
        }
        return value;
    }

    void main() {
        vec2 aspectUv = vec2(
            (vUv.x - 0.5) * (uResolution.x / max(uResolution.y, 1.0)),
            vUv.y
        );
        float t = uTime * 0.042;
        float skyMask = smoothstep(1.04, 0.04, vUv.y);
        float highSky = smoothstep(0.6, 0.02, vUv.y);
        float base = fbm(aspectUv * vec2(2.6, 1.85) + vec2(0.0, -t));
        float detail = fbm(aspectUv * vec2(5.9, 3.3) + vec2(t * 0.46, t * 0.14));
        float wisps = fbm(aspectUv * vec2(9.2, 5.1) + vec2(-t * 0.28, t * 0.12));
        float cloud = smoothstep(0.34, 0.86, base * 0.72 + detail * 0.38 + wisps * 0.18 + skyMask * 0.28);

        vec2 strike = vec2(uStrikePos.x, 1.0 - uStrikePos.y);
        float dx = (vUv.x - strike.x) * (uResolution.x / max(uResolution.y, 1.0));
        float dy = vUv.y - strike.y;
        float upperChannel = exp(-dx * dx * 22.0) * smoothstep(strike.y + 0.12, -0.02, vUv.y);
        float strikeDepth = max(0.0, strike.y - vUv.y);
        float strikeWake = exp(-(dx * dx * 12.5 + strikeDepth * strikeDepth * 9.6)) * smoothstep(strike.y + 0.06, -0.02, vUv.y);
        float strikeSpill = exp(-(dx * dx * 7.4 + strikeDepth * strikeDepth * 3.4)) * smoothstep(strike.y + 0.22, 0.0, vUv.y);
        float sheetBand = exp(-pow((vUv.y - min(0.14, strike.y * 0.42)) * 3.3, 2.0)) * (0.28 + 0.72 * exp(-dx * dx * 2.8));
        float mistBand = smoothstep(0.18, 1.0, vUv.y) * fbm(aspectUv * vec2(3.1, 2.2) + vec2(t * 0.24, -t * 0.18));
        float groundAura = exp(-(dx * dx * 10.0 + dy * dy * 26.0));

        float curtainEdge = mix(1.28, 0.14, clamp(uNightfallProgress, 0.0, 1.0));
        float topCurtain = smoothstep(curtainEdge - 0.18, curtainEdge + 0.1, vUv.y);
        float curtainFeather = topCurtain * (0.3 + cloud * 0.5 + highSky * 0.22);
        float ambientDark =
            uEnvironmentMix * (0.024 + cloud * 0.09 + topCurtain * 0.14 + highSky * 0.05) +
            uDarkness * (0.018 + cloud * 0.07 + curtainFeather * 0.5 + highSky * 0.05);
        float illumination =
            uCloudFlash * (strikeWake * 0.42 + strikeSpill * 0.26 + sheetBand * 0.46 + upperChannel * 0.22) +
            uCloudSheet * (sheetBand * 0.92 + upperChannel * 0.48 + strikeSpill * 0.18) +
            uReturnStroke * (strikeWake * 0.34 + upperChannel * 0.54 + strikeSpill * 0.22) +
            uGroundGlow * groundAura * 0.18;
        float whiteLift = uFlash * highSky * 0.08;

        vec3 darkColor = mix(vec3(0.02, 0.03, 0.05), uCloudTint * 0.34, 0.64);
        vec3 energyColor = mix(mix(uThemeB, uThemeA, 0.46), vec3(1.0), 0.58);
        vec3 color =
            darkColor * ambientDark +
            energyColor * illumination +
            vec3(1.0) * whiteLift +
            uThemeA * uMist * mistBand * 0.08;

        float alpha = clamp(ambientDark * 0.82 + illumination * 0.72 + uMist * mistBand * 0.12 + whiteLift, 0.0, 1.0);
        gl_FragColor = vec4(color, alpha);
    }
`;

const IMPACT_FRAGMENT_SHADER = `
    varying vec2 vUv;
    uniform float uIntensity;
    uniform float uCore;
    uniform float uRing;
    uniform float uTime;
    uniform vec3 uTint;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
        );
    }

    float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
            value += amplitude * noise(p);
            p = p * 2.12 + vec2(4.3, -5.7);
            amplitude *= 0.54;
        }
        return value;
    }

    void main() {
        vec2 p = vUv * 2.0 - 1.0;
        p.x *= 1.15;
        float r = length(p);
        float angle = atan(p.y, p.x);
        float blastNoise = fbm(vec2(angle * 1.8, r * 5.6 + uTime * 0.8));
        float bloom = smoothstep(1.08, 0.06, r);
        float whiteCore = exp(-r * r * 14.0) * (0.62 + uCore * 1.3);
        float detonation = pow(max(0.0, 1.0 - r), 0.42) * (0.22 + uIntensity * 1.24);
        float ring = exp(-pow((r - 0.42 - (blastNoise - 0.5) * 0.06) * 6.2, 2.0)) * (0.16 + uRing * 1.1);
        vec3 warmTint = mix(uTint, vec3(1.0, 0.94, 0.86), 0.62);
        vec3 color =
            vec3(1.0) * whiteCore * (1.25 + uCore * 1.14) +
            warmTint * detonation * 0.78 +
            mix(uTint, vec3(1.0), 0.38) * ring * 0.74;
        float alpha = clamp(whiteCore * 0.92 + detonation * 0.72 + ring * 0.52 + bloom * uIntensity * 0.04, 0.0, 1.0);
        gl_FragColor = vec4(color, alpha);
    }
`;

const CRATER_FRAGMENT_SHADER = `
    varying vec2 vUv;
    uniform float uStrength;
    uniform float uHeat;
    uniform float uTime;
    uniform vec3 uTint;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
        );
    }

    float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
            value += amplitude * noise(p);
            p = p * 2.03 + vec2(5.7, -3.1);
            amplitude *= 0.54;
        }
        return value;
    }

    void main() {
        vec2 p = vUv * 2.0 - 1.0;
        p.x *= 1.45;
        p.y *= 0.88;
        float r = length(p);
        float angle = atan(p.y, p.x);
        float crackField = fbm(vec2(angle * 2.9, r * 9.2 + uTime * 0.08));
        float radialNoise = fbm(vec2(p.x * 5.4, p.y * 5.4));
        float center = smoothstep(0.94, 0.1, r);
        float rim = exp(-pow((r - 0.54 - (radialNoise - 0.5) * 0.08) * 5.2, 2.0));
        float cracks = smoothstep(0.66, 0.94, crackField) * smoothstep(0.16, 0.54, r) * (1.0 - smoothstep(0.62, 0.94, r));
        vec3 ash = mix(vec3(0.02, 0.016, 0.012), uTint * 0.14, 0.42);
        vec3 hot = mix(uTint, vec3(1.0, 0.92, 0.78), 0.54);
        vec3 color = ash * (center * 0.94 + cracks * 0.55) + hot * rim * uHeat * 1.28;
        float alpha = clamp(uStrength * (center * 0.54 + rim * 0.64 + cracks * 0.32), 0.0, 1.0);
        gl_FragColor = vec4(color, alpha);
    }
`;

const PARTICLE_VERTEX_SHADER = `
    attribute float aSize;
    attribute float aAlpha;
    attribute vec3 aColor;
    varying float vAlpha;
    varying vec3 vColor;
    void main() {
        vAlpha = aAlpha;
        vColor = aColor;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize;
    }
`;

const PARTICLE_FRAGMENT_SHADER = `
    uniform sampler2D uMap;
    varying float vAlpha;
    varying vec3 vColor;
    void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        float alpha = tex.a * vAlpha;
        if (alpha <= 0.003) {
            discard;
        }
        gl_FragColor = vec4(vColor * tex.rgb, alpha);
    }
`;

const SHOCKWAVE_FRAGMENT_SHADER = `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform vec2 uShockCenter;
    uniform vec3 uSpillTint;
    uniform float uStrength;
    uniform float uRadius;
    uniform float uEdge;
    uniform float uReturnStroke;
    varying vec2 vUv;

    void main() {
        vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
        vec2 delta = vUv - uShockCenter;
        vec2 scaled = delta * aspect;
        float dist = length(scaled);
        float safeEdge = max(0.02, uEdge);
        float wave = exp(-pow((dist - uRadius) / safeEdge, 2.0));
        vec2 dir = dist > 0.0001 ? scaled / dist : vec2(0.0, -1.0);
        vec2 offset = (dir * wave * uStrength * 0.014) / aspect;
        vec4 color = texture2D(tDiffuse, vUv + offset);
        float spill = exp(-dist * 6.2) * (uStrength * 0.16 + uReturnStroke * 0.08) + wave * uStrength * 0.12;
        color.rgb += uSpillTint * spill + vec3(1.0) * uReturnStroke * wave * 0.05;
        gl_FragColor = color;
    }
`;

function clamp01(value) {
    return THREE.MathUtils.clamp(value, 0, 1);
}

function sanitizeNumber(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
}

function easeOutCubic(value) {
    const t = clamp01(value);
    return 1 - Math.pow(1 - t, 3);
}

function parseSvgPathPoints(path) {
    if (typeof path !== 'string' || !path.trim()) {
        return [];
    }
    const matches = path.match(/-?\\d*\\.?\\d+/g);
    if (!matches || matches.length < 2) {
        return [];
    }
    const points = [];
    for (let index = 0; index < matches.length - 1; index += 2) {
        const x = Number(matches[index]);
        const y = Number(matches[index + 1]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
            points.push(new THREE.Vector2(x, y));
        }
    }
    return points;
}

function buildRibbonGeometry(points, startWidth, endWidth) {
    const count = Array.isArray(points) ? points.length : 0;
    const geometry = new THREE.BufferGeometry();
    if (count < 2) {
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
        return geometry;
    }
    const positions = new Float32Array(count * 2 * 3);
    const uvs = new Float32Array(count * 2 * 2);
    const indices = new Uint16Array((count - 1) * 6);
    for (let index = 0; index < count; index += 1) {
        const point = points[index];
        const prev = points[Math.max(0, index - 1)];
        const next = points[Math.min(count - 1, index + 1)];
        VEC2_A.copy(next).sub(prev);
        if (VEC2_A.lengthSq() <= 1e-5) {
            VEC2_A.set(0, -1);
        } else {
            VEC2_A.normalize();
        }
        VEC2_B.set(-VEC2_A.y, VEC2_A.x);
        const width = THREE.MathUtils.lerp(startWidth, endWidth, count > 1 ? index / (count - 1) : 0);
        const leftX = point.x + VEC2_B.x * width * 0.5;
        const leftY = point.y + VEC2_B.y * width * 0.5;
        const rightX = point.x - VEC2_B.x * width * 0.5;
        const rightY = point.y - VEC2_B.y * width * 0.5;
        const positionOffset = index * 6;
        positions[positionOffset] = leftX;
        positions[positionOffset + 1] = leftY;
        positions[positionOffset + 2] = 0;
        positions[positionOffset + 3] = rightX;
        positions[positionOffset + 4] = rightY;
        positions[positionOffset + 5] = 0;
        const uvOffset = index * 4;
        const v = count > 1 ? index / (count - 1) : 0;
        uvs[uvOffset] = 0;
        uvs[uvOffset + 1] = v;
        uvs[uvOffset + 2] = 1;
        uvs[uvOffset + 3] = v;
        if (index < count - 1) {
            const quad = index * 6;
            const base = index * 2;
            indices[quad] = base;
            indices[quad + 1] = base + 1;
            indices[quad + 2] = base + 2;
            indices[quad + 3] = base + 1;
            indices[quad + 4] = base + 3;
            indices[quad + 5] = base + 2;
        }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeBoundingSphere();
    return geometry;
}

function buildPolygonGeometry(points) {
    if (!Array.isArray(points) || points.length < 3) {
        return new THREE.BufferGeometry();
    }
    const shape = new THREE.Shape(points.map((point) => new THREE.Vector2(point.x, point.y)));
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.computeBoundingSphere();
    return geometry;
}

function normalizeColorStyle(style, fallback = '#ffffff') {
    const source = typeof style === 'string' && style.trim() ? style.trim() : fallback;
    const match = source.match(/^rgba?\((.+)\)$/i);
    if (!match) {
        return source;
    }
    const channels = match[1]
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    if (channels.length < 3) {
        return source;
    }
    return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`;
}

function makeColorFromStyle(style, fallback = '#ffffff', intensity = 1) {
    const target = new THREE.Color();
    try {
        target.setStyle(normalizeColorStyle(style, fallback));
    } catch (_) {
        target.setStyle(normalizeColorStyle(fallback, '#ffffff'));
    }
    if (Number.isFinite(intensity) && intensity !== 1) {
        target.multiplyScalar(intensity);
    }
    return target;
}

function lerpColor(out, from, to, alpha) {
    out.copy(from).lerp(to, clamp01(alpha));
    return out;
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function createSoftParticleTexture(size = 128, mode = 'smoke') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) {
        return null;
    }
    const gradient = context.createRadialGradient(size * 0.5, size * 0.5, size * 0.06, size * 0.5, size * 0.5, size * 0.5);
    if (mode === 'spark') {
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.18, 'rgba(255,255,255,0.96)');
        gradient.addColorStop(0.42, 'rgba(255,255,255,0.36)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
    } else {
        gradient.addColorStop(0, 'rgba(255,255,255,0.94)');
        gradient.addColorStop(0.18, 'rgba(255,255,255,0.84)');
        gradient.addColorStop(0.42, 'rgba(255,255,255,0.34)');
        gradient.addColorStop(0.72, 'rgba(255,255,255,0.1)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
    }
    context.clearRect(0, 0, size, size);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    if (mode === 'smoke') {
        context.globalCompositeOperation = 'destination-in';
        for (let index = 0; index < 42; index += 1) {
            const radius = randomBetween(size * 0.05, size * 0.16);
            const x = randomBetween(radius, size - radius);
            const y = randomBetween(radius, size - radius);
            const alpha = randomBetween(0.08, 0.28);
            const blob = context.createRadialGradient(x, y, radius * 0.12, x, y, radius);
            blob.addColorStop(0, `rgba(255,255,255,${alpha})`);
            blob.addColorStop(1, 'rgba(255,255,255,0)');
            context.fillStyle = blob;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
        context.globalCompositeOperation = 'source-over';
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

class OverlayParticleField {
    constructor({
        maxParticles = 32,
        texture = null,
        blending = THREE.NormalBlending,
        transparent = true
    } = {}) {
        this.maxParticles = maxParticles;
        this.particles = Array.from({ length: maxParticles }, () => ({
            active: false,
            x: 0,
            y: 0,
            z: 0,
            vx: 0,
            vy: 0,
            drag: 0,
            gravity: 0,
            turbulence: 0,
            swirl: 0,
            phase: 0,
            age: 0,
            life: 1,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaPeak: 1,
            alphaEnd: 0,
            peakPoint: 0.35,
            colorStart: new THREE.Color(1, 1, 1),
            colorEnd: new THREE.Color(1, 1, 1)
        }));
        this.positions = new Float32Array(maxParticles * 3);
        this.sizes = new Float32Array(maxParticles);
        this.alphas = new Float32Array(maxParticles);
        this.colors = new Float32Array(maxParticles * 3);
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
        this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
        this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));
        this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
        this.geometry.setDrawRange(0, 0);
        this.material = new THREE.ShaderMaterial({
            transparent,
            depthTest: false,
            depthWrite: false,
            blending,
            uniforms: {
                uMap: { value: texture }
            },
            vertexShader: PARTICLE_VERTEX_SHADER,
            fragmentShader: PARTICLE_FRAGMENT_SHADER
        });
        this.points = new THREE.Points(this.geometry, this.material);
        this.points.frustumCulled = false;
        this.points.visible = false;
        this.points.renderOrder = 40;
    }

    clear() {
        for (const particle of this.particles) {
            particle.active = false;
        }
        this.geometry.setDrawRange(0, 0);
        this.points.visible = false;
    }

    emit(configBuilder, count) {
        if (typeof configBuilder !== 'function' || count <= 0) {
            return;
        }
        let emitted = 0;
        for (let index = 0; index < this.particles.length && emitted < count; index += 1) {
            const particle = this.particles[index];
            if (particle.active) {
                continue;
            }
            const config = configBuilder(emitted, particle) || null;
            if (!config) {
                continue;
            }
            particle.active = true;
            particle.x = Number.isFinite(config.x) ? config.x : 0;
            particle.y = Number.isFinite(config.y) ? config.y : 0;
            particle.z = Number.isFinite(config.z) ? config.z : 0;
            particle.vx = Number.isFinite(config.vx) ? config.vx : 0;
            particle.vy = Number.isFinite(config.vy) ? config.vy : 0;
            particle.drag = Number.isFinite(config.drag) ? config.drag : 0;
            particle.gravity = Number.isFinite(config.gravity) ? config.gravity : 0;
            particle.turbulence = Number.isFinite(config.turbulence) ? config.turbulence : 0;
            particle.swirl = Number.isFinite(config.swirl) ? config.swirl : 0;
            particle.phase = Number.isFinite(config.phase) ? config.phase : 0;
            particle.age = 0;
            particle.life = Math.max(0.08, Number.isFinite(config.life) ? config.life : 0.8);
            particle.sizeStart = Math.max(1, Number.isFinite(config.sizeStart) ? config.sizeStart : 12);
            particle.sizeEnd = Math.max(1, Number.isFinite(config.sizeEnd) ? config.sizeEnd : particle.sizeStart);
            particle.alphaStart = Number.isFinite(config.alphaStart) ? config.alphaStart : 0;
            particle.alphaPeak = Number.isFinite(config.alphaPeak) ? config.alphaPeak : 1;
            particle.alphaEnd = Number.isFinite(config.alphaEnd) ? config.alphaEnd : 0;
            particle.peakPoint = clamp01(Number.isFinite(config.peakPoint) ? config.peakPoint : 0.3);
            particle.colorStart.copy(config.colorStart || particle.colorStart);
            particle.colorEnd.copy(config.colorEnd || particle.colorEnd);
            emitted += 1;
        }
    }

    update(dt) {
        let activeCount = 0;
        for (const particle of this.particles) {
            if (!particle.active) {
                continue;
            }
            particle.age += dt;
            const lifeProgress = particle.age / particle.life;
            if (lifeProgress >= 1) {
                particle.active = false;
                continue;
            }
            const dragFactor = Math.exp(-particle.drag * dt);
            particle.phase += dt * (1.7 + particle.turbulence * 0.06);
            particle.vx = (particle.vx + Math.cos(particle.phase * 2.4) * particle.turbulence * 0.18 * dt - Math.sin(particle.phase * 1.7) * particle.swirl * 0.08 * dt) * dragFactor;
            particle.vy = (particle.vy + particle.gravity * dt + Math.sin(particle.phase * 2.2) * particle.swirl * 0.03 * dt) * dragFactor;
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            const eased = easeOutCubic(lifeProgress);
            const peak = Math.max(0.001, particle.peakPoint);
            const alpha = lifeProgress <= peak
                ? THREE.MathUtils.lerp(particle.alphaStart, particle.alphaPeak, lifeProgress / peak)
                : THREE.MathUtils.lerp(particle.alphaPeak, particle.alphaEnd, (lifeProgress - peak) / Math.max(0.001, 1 - peak));
            const size = THREE.MathUtils.lerp(particle.sizeStart, particle.sizeEnd, eased);
            const color = lerpColor(COLOR_D, particle.colorStart, particle.colorEnd, eased);
            const positionOffset = activeCount * 3;
            this.positions[positionOffset] = particle.x;
            this.positions[positionOffset + 1] = particle.y;
            this.positions[positionOffset + 2] = particle.z;
            this.sizes[activeCount] = size;
            this.alphas[activeCount] = Math.max(0, alpha);
            this.colors[positionOffset] = color.r;
            this.colors[positionOffset + 1] = color.g;
            this.colors[positionOffset + 2] = color.b;
            activeCount += 1;
        }
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.aSize.needsUpdate = true;
        this.geometry.attributes.aAlpha.needsUpdate = true;
        this.geometry.attributes.aColor.needsUpdate = true;
        this.geometry.setDrawRange(0, activeCount);
        this.points.visible = activeCount > 0;
        return activeCount;
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }
}

function createShockwavePass() {
    return new ShaderPass({
        uniforms: {
            tDiffuse: { value: null },
            uResolution: { value: new THREE.Vector2(1, 1) },
            uShockCenter: { value: new THREE.Vector2(0.5, 0.5) },
            uSpillTint: { value: new THREE.Color(0xffffff) },
            uStrength: { value: 0 },
            uRadius: { value: 0.1 },
            uEdge: { value: 0.05 },
            uReturnStroke: { value: 0 }
        },
        vertexShader: FULLSCREEN_VERTEX_SHADER,
        fragmentShader: SHOCKWAVE_FRAGMENT_SHADER
    });
}

const STRIKE_VERTEX_SHADER = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const STRIKE_FRAGMENT_SHADER = `
    varying vec2 vUv;
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uPulse;
    uniform float uCoreBoost;
    uniform float uSoftness;

    void main() {
        vec2 uv = vUv;
        float lateral = abs(uv.x - 0.5) * 2.0;
        float widthFalloff = clamp(1.0 - lateral, 0.0, 1.0);
        float softness = clamp(uSoftness, 0.02, 1.0);
        float feather = pow(widthFalloff, mix(2.4, 0.62, softness));
        float core = pow(widthFalloff, mix(13.0, 4.8, softness)) * (1.0 + uCoreBoost * 1.55);
        float travelBands = 0.88 + 0.12 * sin((uv.y * 12.0 + uPulse * 0.72) * 6.28318530718);
        float microFlicker = 0.9 + 0.1 * sin((uv.y * 28.0 + uPulse * 1.34) * 6.28318530718 + lateral * 4.0);
        float returnSnap = smoothstep(0.18, 1.0, uPulse) * (0.64 + 0.36 * sin((uv.y * 7.5 + uPulse * 2.2) * 6.28318530718));
        float tipHeat = smoothstep(0.72, 1.0, uv.y) * (0.18 + uPulse * 0.28);
        float glow = feather * travelBands * microFlicker;
        float alpha = uOpacity * (glow * (0.7 + returnSnap * 0.24) + core * (0.5 + tipHeat * 0.3));
        if (alpha <= 0.001) {
            discard;
        }
        vec3 color =
            uColor * (0.72 + glow * 0.34 + returnSnap * 0.24) +
            vec3(1.0) * core * (0.26 + uCoreBoost * 0.22 + uPulse * 0.14 + tipHeat * 0.16);
        gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
    }
`;

function createStrikeMaterial(
    color = new THREE.Color(1, 1, 1),
    blending = THREE.AdditiveBlending,
    {
        softness = 0.5,
        coreBoost = 1
    } = {}
) {
    const material = new THREE.ShaderMaterial({
        transparent: true,
        blending,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
            uColor: { value: color.clone() },
            uOpacity: { value: 0 },
            uPulse: { value: 0 },
            uCoreBoost: { value: coreBoost },
            uSoftness: { value: softness }
        },
        vertexShader: STRIKE_VERTEX_SHADER,
        fragmentShader: STRIKE_FRAGMENT_SHADER
    });
    material.userData.baseSoftness = softness;
    material.userData.baseCoreBoost = coreBoost;
    return material;
}

function setStrikeMaterialColor(material, color) {
    if (!material?.uniforms?.uColor?.value || !color) {
        return;
    }
    material.uniforms.uColor.value.copy(color);
}

function setStrikeMaterialState(
    material,
    opacity,
    pulse = 0,
    coreBoostScale = 1,
    softnessOverride = null
) {
    if (!material?.uniforms) {
        return;
    }
    material.uniforms.uOpacity.value = clamp01(opacity);
    material.uniforms.uPulse.value = clamp01(pulse);
    material.uniforms.uCoreBoost.value = (material.userData?.baseCoreBoost ?? 1) * Math.max(0, coreBoostScale);
    material.uniforms.uSoftness.value = softnessOverride ?? (material.userData?.baseSoftness ?? 0.5);
}

export class LegendaryStormFxRenderer {
    constructor({ overlayElement } = {}) {
        this.overlayElement = overlayElement || null;
        this.isAvailable = false;
        this.canvas = null;
        this.renderer = null;
        this.composer = null;
        this.camera = null;
        this.scene = null;
        this.renderPass = null;
        this.bloomPass = null;
        this.shockwavePass = null;
        this.outputPass = null;
        this.cloudMesh = null;
        this.impactMesh = null;
        this.craterMesh = null;
        this.strikeGroup = null;
        this.strikeMeshes = {
            trunkCorona: null,
            trunkHalo: null,
            trunkCore: null,
            trunkReturn: null,
            branchesGlow: [],
            branchesCore: [],
            tipGlow: null,
            tipCore: null
        };
        this.smokeField = null;
        this.vaporField = null;
        this.sparkField = null;
        this.qualityKey = '';
        this.resolutionScale = 1;
        this.width = 0;
        this.height = 0;
        this.devicePixelRatio = 1;
        this.lastPhase = 'idle';
        this.lastToken = 0;
        this.lastStrikeGeometry = null;
        this.lastStrikeVariant = 'none';
        this.lastOverlayActive = false;
        this.landingBurstTriggered = false;
        this.craterPersistence = 0;
        this.ambientParticleCarry = 0;
        this.impactAnchor = new THREE.Vector2(0, 0);
        this.projectedStrike = new THREE.Vector2(DEFAULT_STRIKE_TARGET.x, DEFAULT_STRIKE_TARGET.y);

        if (!this.overlayElement) {
            return;
        }

        try {
            this.#initRenderer();
            this.isAvailable = true;
        } catch (error) {
            console.warn('Legendary storm FX renderer unavailable. Falling back to DOM storm overlay.', error);
            this.dispose();
        }
    }

    #initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.setPixelRatio(1);
        this.renderer.setSize(1, 1, false);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.08;
        this.renderer.domElement.className = 'legendary-storm-fx-layer';
        this.renderer.domElement.setAttribute('aria-hidden', 'true');
        const flashLayer = this.overlayElement.querySelector('.legendary-storm-flash');
        if (flashLayer && flashLayer.parentNode === this.overlayElement) {
            this.overlayElement.insertBefore(this.renderer.domElement, flashLayer);
        } else {
            this.overlayElement.appendChild(this.renderer.domElement);
        }
        this.canvas = this.renderer.domElement;
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(0, 1, 0, 1, -100, 100);
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);
        this.cloudMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.ShaderMaterial({
                transparent: true,
                depthTest: false,
                depthWrite: false,
                blending: THREE.NormalBlending,
                toneMapped: false,
                uniforms: {
                    uResolution: { value: new THREE.Vector2(1, 1) },
                    uStrikePos: { value: new THREE.Vector2(DEFAULT_STRIKE_TARGET.x, DEFAULT_STRIKE_TARGET.y) },
                    uTime: { value: 0 },
                    uEnvironmentMix: { value: 0 },
                    uDarkness: { value: 0 },
                    uNightfallProgress: { value: 0 },
                    uCloudFlash: { value: 0 },
                    uCloudSheet: { value: 0 },
                    uFlash: { value: 0 },
                    uReturnStroke: { value: 0 },
                    uGroundGlow: { value: 0 },
                    uMist: { value: 0 },
                    uThemeA: { value: new THREE.Color(0xffffff) },
                    uThemeB: { value: new THREE.Color(0xffffff) },
                    uCloudTint: { value: new THREE.Color(0x0c1828) }
                },
                vertexShader: FULLSCREEN_VERTEX_SHADER,
                fragmentShader: CLOUD_FRAGMENT_SHADER
            })
        );
        this.cloudMesh.position.set(0.5, 0.5, -20);
        this.cloudMesh.frustumCulled = false;
        this.cloudMesh.renderOrder = 1;
        this.scene.add(this.cloudMesh);

        this.craterMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.ShaderMaterial({
                transparent: true,
                depthTest: false,
                depthWrite: false,
                blending: THREE.NormalBlending,
                toneMapped: false,
                uniforms: {
                    uStrength: { value: 0 },
                    uHeat: { value: 0 },
                    uTime: { value: 0 },
                    uTint: { value: new THREE.Color(0xffffff) }
                },
                vertexShader: FULLSCREEN_VERTEX_SHADER,
                fragmentShader: CRATER_FRAGMENT_SHADER
            })
        );
        this.craterMesh.visible = false;
        this.craterMesh.renderOrder = 10;
        this.scene.add(this.craterMesh);

        this.impactMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.ShaderMaterial({
                transparent: true,
                depthTest: false,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                toneMapped: false,
                uniforms: {
                    uIntensity: { value: 0 },
                    uCore: { value: 0 },
                    uRing: { value: 0 },
                    uTime: { value: 0 },
                    uTint: { value: new THREE.Color(0xffffff) }
                },
                vertexShader: FULLSCREEN_VERTEX_SHADER,
                fragmentShader: IMPACT_FRAGMENT_SHADER
            })
        );
        this.impactMesh.visible = false;
        this.impactMesh.renderOrder = 24;
        this.scene.add(this.impactMesh);

        this.strikeGroup = new THREE.Group();
        this.strikeGroup.renderOrder = 18;
        this.scene.add(this.strikeGroup);

        const smokeTexture = createSoftParticleTexture(128, 'smoke');
        const sparkTexture = createSoftParticleTexture(128, 'spark');
        this.vaporField = new OverlayParticleField({
            maxParticles: 32,
            texture: sparkTexture,
            blending: THREE.AdditiveBlending
        });
        this.vaporField.points.renderOrder = 28;
        this.scene.add(this.vaporField.points);
        this.smokeField = new OverlayParticleField({
            maxParticles: 88,
            texture: smokeTexture,
            blending: THREE.NormalBlending
        });
        this.smokeField.points.renderOrder = 26;
        this.scene.add(this.smokeField.points);
        this.sparkField = new OverlayParticleField({
            maxParticles: 40,
            texture: sparkTexture,
            blending: THREE.AdditiveBlending
        });
        this.sparkField.points.renderOrder = 30;
        this.scene.add(this.sparkField.points);

        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.renderPass.clear = true;
        this.renderPass.clearAlpha = 0;
        this.shockwavePass = createShockwavePass();
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.35, 0.45, 0.06);
        this.outputPass = new OutputPass();
        this.composer.addPass(this.renderPass);
        this.composer.addPass(this.shockwavePass);
        this.composer.addPass(this.bloomPass);
        this.composer.addPass(this.outputPass);
        this.#setCanvasVisible(false);
    }

    #setCanvasVisible(visible) {
        if (!this.canvas) {
            return;
        }
        this.canvas.style.opacity = visible ? '1' : '0';
        this.canvas.style.visibility = visible ? 'visible' : 'hidden';
        this.overlayElement?.classList.toggle('legendary-storm-renderer-live', Boolean(visible));
        document.body?.classList.toggle('legendary-storm-renderer-live', Boolean(visible));
    }

    #resolveQuality(stormState) {
        const reduced = Boolean(stormState?.reducedMotion);
        const lightweight = Boolean(stormState?.lightweightMode);
        const nextKey = reduced ? 'reduced' : lightweight ? 'lightweight' : 'cinematic';
        if (this.qualityKey === nextKey) {
            return nextKey;
        }
        this.qualityKey = nextKey;
        this.resolutionScale = reduced ? 0.56 : lightweight ? 0.62 : 1;
        this.bloomPass.strength = reduced ? 0.9 : lightweight ? 1.05 : 1.45;
        this.bloomPass.radius = reduced ? 0.28 : lightweight ? 0.34 : 0.46;
        this.bloomPass.threshold = reduced ? 0.08 : lightweight ? 0.07 : 0.045;
        return nextKey;
    }

    #ensureSize() {
        if (!this.overlayElement || !this.renderer || !this.composer || !this.camera) {
            return;
        }
        const rect = this.overlayElement.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2)) * this.resolutionScale;
        if (width === this.width && height === this.height && Math.abs(this.devicePixelRatio - dpr) < 0.01) {
            return;
        }
        this.width = width;
        this.height = height;
        this.devicePixelRatio = dpr;
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(width, height, false);
        this.composer.setPixelRatio(dpr);
        this.composer.setSize(width, height);
        this.camera.left = 0;
        this.camera.right = width;
        this.camera.top = 0;
        this.camera.bottom = height;
        this.camera.updateProjectionMatrix();
        this.cloudMesh.position.set(width * 0.5, height * 0.5, -20);
        this.cloudMesh.scale.set(width, height, 1);
        this.cloudMesh.material.uniforms.uResolution.value.set(width, height);
        this.shockwavePass.uniforms.uResolution.value.set(width, height);
    }

    #disposeStrikeMeshes() {
        if (!this.strikeGroup) {
            return;
        }
        while (this.strikeGroup.children.length) {
            const child = this.strikeGroup.children[this.strikeGroup.children.length - 1];
            this.strikeGroup.remove(child);
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (Array.isArray(child.material)) {
                child.material.forEach((material) => material?.dispose?.());
            } else if (child.material?.dispose) {
                child.material.dispose();
            }
        }
        this.strikeGroup.userData.metrics = { topOffset: 1, width: 1 };
        this.strikeMeshes.trunkCorona = null;
        this.strikeMeshes.trunkHalo = null;
        this.strikeMeshes.trunkCore = null;
        this.strikeMeshes.trunkReturn = null;
        this.strikeMeshes.branchesGlow = [];
        this.strikeMeshes.branchesCore = [];
        this.strikeMeshes.tipGlow = null;
        this.strikeMeshes.tipCore = null;
        this.lastStrikeGeometry = null;
        this.lastStrikeVariant = 'none';
    }

    #createStrikeMesh(geometry, material, renderOrder) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        mesh.renderOrder = renderOrder;
        return mesh;
    }

    #setStrikeGeometry(geometry, variant) {
        this.#disposeStrikeMeshes();
        if (!geometry || !this.strikeGroup) {
            return;
        }
        const tipPointsAbsolute = parseSvgPathPoints(geometry.tipPath);
        const tipGlowPointsAbsolute = parseSvgPathPoints(geometry.tipGlowPath);
        const impactPoint = tipPointsAbsolute[0] || new THREE.Vector2(160, VIEWBOX_DEFAULT_IMPACT_Y);
        const toLocal = (point) => new THREE.Vector2(point.x - impactPoint.x, point.y - impactPoint.y);
        const trunkPoints = parseSvgPathPoints(geometry.trunkPath).map(toLocal);
        const branchPoints = Array.isArray(geometry.branchPaths) ? geometry.branchPaths.map((branchPath) => parseSvgPathPoints(branchPath).map(toLocal)).filter((points) => points.length > 1) : [];
        const tipPoints = tipPointsAbsolute.map(toLocal);
        const tipGlowPoints = tipGlowPointsAbsolute.map(toLocal);

        const materials = {
            trunkCorona: createStrikeMaterial(new THREE.Color(1.12, 1.18, 1.24), THREE.AdditiveBlending, { softness: 0.98, coreBoost: 0.36 }),
            trunkHalo: createStrikeMaterial(new THREE.Color(1.48, 1.56, 1.68), THREE.AdditiveBlending, { softness: 0.74, coreBoost: 0.64 }),
            trunkCore: createStrikeMaterial(new THREE.Color(3.18, 3.26, 3.42), THREE.AdditiveBlending, { softness: 0.18, coreBoost: 1.18 }),
            trunkReturn: createStrikeMaterial(new THREE.Color(4.7, 4.85, 5.08), THREE.AdditiveBlending, { softness: 0.1, coreBoost: 1.64 }),
            branchGlow: createStrikeMaterial(new THREE.Color(1.14, 1.2, 1.3), THREE.AdditiveBlending, { softness: 0.8, coreBoost: 0.44 }),
            branchCore: createStrikeMaterial(new THREE.Color(2.28, 2.38, 2.52), THREE.AdditiveBlending, { softness: 0.22, coreBoost: 0.92 }),
            tipGlow: createStrikeMaterial(new THREE.Color(1.92, 2.0, 2.12), THREE.AdditiveBlending, { softness: 0.56, coreBoost: 0.9 }),
            tipCore: createStrikeMaterial(new THREE.Color(5.0, 5.12, 5.28), THREE.AdditiveBlending, { softness: 0.08, coreBoost: 1.9 })
        };

        const widths = variant === 'landing'
            ? { corona: [172, 72], halo: [98, 40], core: [24, 8.4], strike: [42, 14.2], branchGlow: [34, 12.6], branchCore: [12.4, 5] }
            : variant === 'transition'
                ? { corona: [154, 64], halo: [88, 36], core: [18, 6.4], strike: [32, 10.8], branchGlow: [28, 10.6], branchCore: [9.8, 4.1] }
                : variant === 'escalation'
                    ? { corona: [126, 52], halo: [70, 28], core: [12.4, 4.6], strike: [22, 7.8], branchGlow: [20, 7.8], branchCore: [7.2, 3] }
                    : variant === 'persistent'
                        ? { corona: [104, 44], halo: [56, 24], core: [9.6, 3.5], strike: [16, 5.8], branchGlow: [15.4, 6.4], branchCore: [5.8, 2.5] }
                        : variant === 'anticipation'
                            ? { corona: [84, 36], halo: [46, 20], core: [8, 3], strike: [14, 4.8], branchGlow: [14, 5.8], branchCore: [5.2, 2.4] }
                            : { corona: [138, 58], halo: [78, 32], core: [15, 5.4], strike: [27, 9.2], branchGlow: [24, 8.8], branchCore: [8.4, 3.5] };

        this.strikeMeshes.trunkCorona = this.#createStrikeMesh(buildRibbonGeometry(trunkPoints, widths.corona[0], widths.corona[1]), materials.trunkCorona, 18);
        this.strikeMeshes.trunkHalo = this.#createStrikeMesh(buildRibbonGeometry(trunkPoints, widths.halo[0], widths.halo[1]), materials.trunkHalo, 19);
        this.strikeMeshes.trunkReturn = this.#createStrikeMesh(buildRibbonGeometry(trunkPoints, widths.strike[0], widths.strike[1]), materials.trunkReturn, 21);
        this.strikeMeshes.trunkCore = this.#createStrikeMesh(buildRibbonGeometry(trunkPoints, widths.core[0], widths.core[1]), materials.trunkCore, 22);
        this.strikeMeshes.tipGlow = this.#createStrikeMesh(buildPolygonGeometry(tipGlowPoints), materials.tipGlow, 23);
        this.strikeMeshes.tipCore = this.#createStrikeMesh(buildPolygonGeometry(tipPoints), materials.tipCore, 24);
        this.strikeGroup.add(this.strikeMeshes.trunkCorona, this.strikeMeshes.trunkHalo, this.strikeMeshes.trunkReturn, this.strikeMeshes.trunkCore, this.strikeMeshes.tipGlow, this.strikeMeshes.tipCore);

        for (const branch of branchPoints) {
            const glowMesh = this.#createStrikeMesh(buildRibbonGeometry(branch, widths.branchGlow[0], widths.branchGlow[1]), materials.branchGlow.clone(), 20);
            const coreMesh = this.#createStrikeMesh(buildRibbonGeometry(branch, widths.branchCore[0], widths.branchCore[1]), materials.branchCore.clone(), 21);
            this.strikeGroup.add(glowMesh, coreMesh);
            this.strikeMeshes.branchesGlow.push(glowMesh);
            this.strikeMeshes.branchesCore.push(coreMesh);
        }

        let minY = 0;
        let maxX = 0;
        let minX = 0;
        for (const point of trunkPoints) {
            minY = Math.min(minY, point.y);
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
        }
        for (const branch of branchPoints) {
            for (const point of branch) {
                minY = Math.min(minY, point.y);
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
            }
        }
        this.strikeGroup.userData.metrics = {
            topOffset: Math.max(1, Math.abs(minY)),
            width: Math.max(1, maxX - minX)
        };
        this.lastStrikeGeometry = geometry;
        this.lastStrikeVariant = variant || geometry.variant || 'intro';
    }

    #applyTheme(theme) {
        const resolvedTheme = theme || FALLBACK_THEME;
        const accentA = makeColorFromStyle(resolvedTheme.overlayAccentA, FALLBACK_THEME.overlayAccentA, 1.18);
        const accentB = makeColorFromStyle(resolvedTheme.overlayAccentB, FALLBACK_THEME.overlayAccentB, 1.12);
        const cloudTint = makeColorFromStyle(resolvedTheme.overlayCloudColor, FALLBACK_THEME.overlayCloudColor, 1);
        const sheetTint = makeColorFromStyle(resolvedTheme.overlayCloudSheetColor, FALLBACK_THEME.overlayCloudSheetColor, 1.08);
        const groundTint = makeColorFromStyle(resolvedTheme.overlayGroundSpillColor, FALLBACK_THEME.overlayGroundSpillColor, 1.04);
        this.cloudMesh.material.uniforms.uThemeA.value.copy(accentA);
        this.cloudMesh.material.uniforms.uThemeB.value.copy(accentB);
        this.cloudMesh.material.uniforms.uCloudTint.value.copy(cloudTint);
        this.impactMesh.material.uniforms.uTint.value.copy(groundTint);
        this.craterMesh.material.uniforms.uTint.value.copy(groundTint);
        this.shockwavePass.uniforms.uSpillTint.value.copy(groundTint);

        const haloColor = COLOR_A.copy(accentA).lerp(sheetTint, 0.35).multiplyScalar(1.05);
        const coronaColor = COLOR_B.copy(accentB).lerp(new THREE.Color(1.25, 1.28, 1.35), 0.44);
        const branchColor = COLOR_C.copy(haloColor).multiplyScalar(0.94);
        if (this.strikeMeshes.trunkCorona?.material) {
            setStrikeMaterialColor(this.strikeMeshes.trunkCorona.material, coronaColor);
        }
        if (this.strikeMeshes.trunkHalo?.material) {
            setStrikeMaterialColor(this.strikeMeshes.trunkHalo.material, haloColor);
        }
        for (const mesh of this.strikeMeshes.branchesGlow) {
            setStrikeMaterialColor(mesh.material, branchColor);
        }
        if (this.strikeMeshes.tipGlow?.material) {
            setStrikeMaterialColor(this.strikeMeshes.tipGlow.material, COLOR_A.copy(haloColor).multiplyScalar(1.18));
        }
    }

    #resolveStrikeTarget(stormState, camera) {
        if (!stormState) {
            return DEFAULT_STRIKE_TARGET;
        }
        const strikeTarget = this.projectedStrike;
        strikeTarget.set(
            Number.isFinite(stormState.strikeScreenX) ? stormState.strikeScreenX : DEFAULT_STRIKE_TARGET.x,
            Number.isFinite(stormState.strikeScreenY) ? stormState.strikeScreenY : DEFAULT_STRIKE_TARGET.y
        );
        if (camera && LANDING_STORM_PHASES.has(stormState.phase) && stormState.target) {
            VEC3_A.copy(stormState.target).project(camera);
            if (Number.isFinite(VEC3_A.x) && Number.isFinite(VEC3_A.y)) {
                strikeTarget.set(
                    THREE.MathUtils.clamp((VEC3_A.x + 1) * 0.5, 0.1, 0.9),
                    THREE.MathUtils.clamp((1 - VEC3_A.y) * 0.5, 0.18, 0.9)
                );
            }
        }
        return strikeTarget;
    }

    #updateStrikeTransform(stormState, strikeTarget) {
        if (!this.strikeGroup) {
            return;
        }
        const metrics = this.strikeGroup.userData.metrics || { topOffset: 1, width: 1 };
        const variant = stormState?.strikeVariant || this.lastStrikeVariant || 'intro';
        const width = this.width || 1;
        const height = this.height || 1;
        const targetX = strikeTarget.x * width;
        const targetY = strikeTarget.y * height;
        const widthPx = variant === 'landing'
            ? THREE.MathUtils.clamp(width * 0.28, 320, 620)
            : variant === 'transition'
                ? THREE.MathUtils.clamp(width * 0.25, 280, 520)
                : variant === 'escalation'
                    ? THREE.MathUtils.clamp(width * 0.19, 196, 360)
                    : variant === 'persistent'
                        ? THREE.MathUtils.clamp(width * 0.15, 156, 280)
                        : variant === 'anticipation'
                            ? THREE.MathUtils.clamp(width * 0.12, 128, 220)
                            : THREE.MathUtils.clamp(width * 0.23, 240, 430);
        const desiredTop = variant === 'anticipation'
            ? -height * 0.18
            : variant === 'persistent'
                ? -height * 0.22
                : variant === 'escalation'
                    ? -height * 0.28
                    : variant === 'transition'
                        ? -height * 0.4
                        : variant === 'landing'
                            ? -height * 0.46
                            : -height * 0.34;
        const targetHeight = Math.max(160, targetY - desiredTop);
        const scaleX = (widthPx / Math.max(1, metrics.width)) * (stormState?.boltScale || 1);
        const scaleY = (targetHeight / Math.max(1, metrics.topOffset)) * (stormState?.boltHeightScale || 1);
        this.strikeGroup.position.set(targetX, targetY, 0);
        this.strikeGroup.scale.set(scaleX, scaleY, 1);
        const visibleIntensity = Math.max(
            stormState?.boltOpacity || 0,
            stormState?.boltGlowOpacity || 0,
            stormState?.returnStroke || 0,
            stormState?.cloudFlash || 0
        );
        this.strikeGroup.visible = visibleIntensity > 0.001;
    }

    #updateStrikeMaterialOpacities(stormState) {
        const boltOpacity = clamp01(stormState?.boltOpacity || 0);
        const boltGlow = clamp01(stormState?.boltGlowOpacity || 0);
        const branchOpacity = clamp01(stormState?.boltBranchOpacity || 0);
        const returnStroke = clamp01(stormState?.returnStroke || 0);
        const flash = clamp01(stormState?.flash || 0);
        const cloudSheet = clamp01(stormState?.cloudSheet || 0);
        const variant = stormState?.strikeVariant || 'intro';
        const landingBoost = variant === 'landing'
            ? 1.48
            : variant === 'transition'
                ? 1.26
                : variant === 'escalation'
                    ? 1.08
                    : variant === 'persistent'
                        ? 0.92
                        : variant === 'anticipation'
                            ? 0.94
                            : 1.18;
        const energyPulse = clamp01(returnStroke * 1.18 + flash * 0.48 + cloudSheet * 0.26 + boltOpacity * 0.16);
        const coronaPulse = clamp01(energyPulse * 0.76 + cloudSheet * 0.34);
        const haloPulse = clamp01(energyPulse * 0.94 + boltGlow * 0.18);
        const corePulse = clamp01(energyPulse * 1.08 + boltOpacity * 0.16);
        const branchPulse = clamp01(energyPulse * 0.64 + branchOpacity * 0.18);
        const returnPulse = clamp01(returnStroke * 1.3 + flash * 0.12);
        if (this.strikeMeshes.trunkCorona?.material) {
            setStrikeMaterialState(
                this.strikeMeshes.trunkCorona.material,
                (boltGlow * 0.76 + cloudSheet * 0.34 + returnStroke * 0.22) * landingBoost,
                clamp01(coronaPulse * 1.08 + cloudSheet * 0.08),
                1.08 + energyPulse * 0.42
            );
        }
        if (this.strikeMeshes.trunkHalo?.material) {
            setStrikeMaterialState(
                this.strikeMeshes.trunkHalo.material,
                (boltGlow * 0.94 + returnStroke * 0.28 + flash * 0.12 + cloudSheet * 0.08) * landingBoost,
                clamp01(haloPulse * 1.06 + cloudSheet * 0.06),
                1.16 + energyPulse * 0.58
            );
        }
        if (this.strikeMeshes.trunkCore?.material) {
            setStrikeMaterialState(
                this.strikeMeshes.trunkCore.material,
                (boltOpacity * 1.02 + returnStroke * 0.56 + flash * 0.1) * landingBoost,
                corePulse,
                1.06 + energyPulse * 0.62,
                variant === 'anticipation' ? 0.2 : 0.16
            );
        }
        if (this.strikeMeshes.trunkReturn?.material) {
            setStrikeMaterialState(
                this.strikeMeshes.trunkReturn.material,
                returnStroke * (variant === 'anticipation' ? 0.62 : 1.02),
                returnPulse,
                1.14 + returnPulse * 0.66,
                0.08
            );
        }
        const tipGlowGain = variant === 'landing'
            ? { opacity: 0.52, returnStroke: 0.16, flash: 0.06 }
            : variant === 'transition'
                ? { opacity: 0.3, returnStroke: 0.12, flash: 0.04 }
                : variant === 'escalation'
                    ? { opacity: 0.24, returnStroke: 0.1, flash: 0.03 }
                    : variant === 'persistent'
                        ? { opacity: 0.12, returnStroke: 0.06, flash: 0.01 }
                        : variant === 'anticipation'
                            ? { opacity: 0.18, returnStroke: 0.08, flash: 0.02 }
                            : { opacity: 0.24, returnStroke: 0.1, flash: 0.03 };
        const tipCoreGain = variant === 'landing'
            ? { opacity: 0.84, returnStroke: 0.28, flash: 0.04 }
            : variant === 'transition'
                ? { opacity: 0.46, returnStroke: 0.18, flash: 0.03 }
                : variant === 'escalation'
                    ? { opacity: 0.4, returnStroke: 0.15, flash: 0.02 }
                    : variant === 'persistent'
                        ? { opacity: 0.24, returnStroke: 0.08, flash: 0.01 }
                        : variant === 'anticipation'
                            ? { opacity: 0.3, returnStroke: 0.12, flash: 0.02 }
                            : { opacity: 0.38, returnStroke: 0.14, flash: 0.02 };
        if (this.strikeMeshes.tipGlow?.material) {
            setStrikeMaterialState(
                this.strikeMeshes.tipGlow.material,
                (boltGlow * tipGlowGain.opacity + returnStroke * tipGlowGain.returnStroke + flash * tipGlowGain.flash) * landingBoost,
                clamp01(haloPulse * 1.04 + returnPulse * 0.18),
                1.08 + energyPulse * 0.44,
                0.48
            );
        }
        if (this.strikeMeshes.tipCore?.material) {
            setStrikeMaterialState(
                this.strikeMeshes.tipCore.material,
                (boltOpacity * tipCoreGain.opacity + returnStroke * tipCoreGain.returnStroke + flash * tipCoreGain.flash) * landingBoost,
                clamp01(corePulse * 1.08 + returnPulse * 0.14),
                1.12 + energyPulse * 0.74,
                0.08
            );
        }
        for (const branch of this.strikeMeshes.branchesGlow) {
            setStrikeMaterialState(
                branch.material,
                (branchOpacity * 0.56 + returnStroke * 0.14) * landingBoost,
                branchPulse,
                0.96 + branchPulse * 0.3,
                0.74
            );
        }
        for (const branch of this.strikeMeshes.branchesCore) {
            setStrikeMaterialState(
                branch.material,
                (branchOpacity * 0.9 + returnStroke * 0.12) * landingBoost,
                clamp01(branchPulse * 0.94 + returnPulse * 0.08),
                1 + branchPulse * 0.44,
                0.2
            );
        }
    }

    #updateStormMedia(stormState, theme, strikeTarget, t, dt = 1 / 60) {
        const environmentMix = clamp01(stormState?.environmentMix || 0);
        const darkness = clamp01(stormState?.darkness || 0);
        const cloudFlash = clamp01(stormState?.cloudFlash || 0);
        const cloudSheet = clamp01(stormState?.cloudSheet || 0);
        const flash = clamp01(stormState?.flash || 0);
        const returnStroke = clamp01(stormState?.returnStroke || 0);
        const landingPhase = LANDING_STORM_PHASES.has(stormState?.phase);
        const groundGlow = clamp01(stormState?.groundGlow || 0);
        const impactBloomGain = Math.max(0.7, theme?.impactBloomGain || 1);
        const groundSpillGain = Math.max(0.75, theme?.groundSpillGain || 1);
        const landingGroundGlow = landingPhase ? groundGlow : 0;
        const mist = clamp01(stormState?.mist || 0);
        this.cloudMesh.material.uniforms.uTime.value = t;
        this.cloudMesh.material.uniforms.uStrikePos.value.set(strikeTarget.x, strikeTarget.y);
        this.cloudMesh.material.uniforms.uEnvironmentMix.value = environmentMix;
        this.cloudMesh.material.uniforms.uDarkness.value = darkness;
        this.cloudMesh.material.uniforms.uNightfallProgress.value = clamp01(stormState?.nightfallProgress || 0);
        this.cloudMesh.material.uniforms.uCloudFlash.value = cloudFlash;
        this.cloudMesh.material.uniforms.uCloudSheet.value = cloudSheet;
        this.cloudMesh.material.uniforms.uFlash.value = flash;
        this.cloudMesh.material.uniforms.uReturnStroke.value = returnStroke;
        this.cloudMesh.material.uniforms.uGroundGlow.value = landingGroundGlow;
        this.cloudMesh.material.uniforms.uMist.value = mist;

        const impactIntensity = landingPhase
            ? clamp01(Math.max(
                landingGroundGlow * (0.85 + groundSpillGain * 0.08),
                (stormState?.impactBloom || 0) * impactBloomGain,
                stormState?.impactCore || 0,
                stormState?.impactRing || 0
            ))
            : 0;
        const impactScale = stormState?.strikeVariant === 'landing'
            ? THREE.MathUtils.lerp(this.height * 0.24, this.height * (0.46 + groundSpillGain * 0.04), clamp01((stormState?.impactRadius || 0) * 0.94 + impactIntensity * 0.14))
            : THREE.MathUtils.lerp(this.height * 0.12, this.height * 0.2, impactIntensity);
        const impactX = strikeTarget.x * this.width;
        const impactY = strikeTarget.y * this.height + (landingPhase ? this.height * 0.018 : this.height * 0.008);
        this.impactAnchor.set(impactX, impactY);
        this.impactMesh.position.set(impactX, impactY, 0);
        this.impactMesh.scale.set(impactScale * 1.72, impactScale, 1);
        this.impactMesh.material.uniforms.uIntensity.value = impactIntensity;
        this.impactMesh.material.uniforms.uCore.value = clamp01(stormState?.impactCore || 0);
        this.impactMesh.material.uniforms.uRing.value = clamp01(stormState?.impactRing || 0);
        this.impactMesh.material.uniforms.uTime.value = t;
        this.impactMesh.visible = landingPhase && impactIntensity > 0.002;

        const decayDt = Number.isFinite(dt) && dt > 0 ? dt : 1 / 60;
        const craterDecay = stormState?.phase === 'stormDissipate'
            ? 1.36
            : stormState?.phase === 'idleStormReveal'
                ? 0.18
                : stormState?.phase === 'boxMaterialize'
                    ? 0.24
                    : 0.72;
        this.craterPersistence = Math.max(
            this.craterPersistence * Math.exp(-craterDecay * decayDt),
            landingPhase
                ? clamp01((stormState?.impactCore || 0) * 1.18 + (stormState?.impactRing || 0) * 0.62 + (stormState?.groundGlow || 0) * (0.3 + groundSpillGain * 0.08))
                : this.craterPersistence * 0.96
        );
        const craterStrength = clamp01(this.craterPersistence * (stormState?.phase === 'stormDissipate' ? 0.92 : 1));
        const craterScale = THREE.MathUtils.lerp(this.height * 0.14, this.height * (0.28 + groundSpillGain * 0.04), craterStrength);
        this.craterMesh.position.set(impactX, impactY + craterScale * 0.08, 0);
        this.craterMesh.scale.set(craterScale * 1.78, craterScale * 0.98, 1);
        this.craterMesh.material.uniforms.uStrength.value = craterStrength;
        this.craterMesh.material.uniforms.uHeat.value = clamp01(Math.max(stormState?.impactCore || 0, (stormState?.impactBloom || 0) * 0.8 * impactBloomGain));
        this.craterMesh.material.uniforms.uTime.value = t;
        this.craterMesh.visible = craterStrength > 0.015 && landingPhase;

        const shockStrength = landingPhase
            ? clamp01(Math.max(stormState?.impactRing || 0, (stormState?.impactBloom || 0) * 0.7, (stormState?.returnStroke || 0) * 0.48))
            : 0;
        const shockRadius = landingPhase
            ? THREE.MathUtils.lerp(0.06, 0.38, clamp01((stormState?.impactRadius || 0) * 0.9 + shockStrength * 0.26))
            : 0;
        this.shockwavePass.uniforms.uShockCenter.value.set(strikeTarget.x, 1 - strikeTarget.y);
        this.shockwavePass.uniforms.uStrength.value = shockStrength * (stormState?.reducedMotion ? 0.45 : stormState?.lightweightMode ? 0.72 : 1);
        this.shockwavePass.uniforms.uRadius.value = shockRadius;
        this.shockwavePass.uniforms.uEdge.value = landingPhase ? 0.09 : 0.04;
        this.shockwavePass.uniforms.uReturnStroke.value = returnStroke;

        const peakLightning = clamp01(Math.max(returnStroke, cloudSheet, flash, landingGroundGlow * groundSpillGain, (stormState?.impactCore || 0) * impactBloomGain));
        const bloomBase = this.qualityKey === 'reduced' ? 0.82 : this.qualityKey === 'lightweight' ? 1.02 : 1.34;
        const bloomBoost = stormState?.strikeVariant === 'landing'
            ? (this.qualityKey === 'cinematic' ? 0.84 : 0.5)
            : this.qualityKey === 'cinematic'
                ? 0.68
                : 0.38;
        this.bloomPass.strength = bloomBase + peakLightning * bloomBoost * impactBloomGain;
    }

    #emitLandingBurst(theme, stormState) {
        const accent = makeColorFromStyle(theme?.overlayAccentA, FALLBACK_THEME.overlayAccentA, 1.2);
        const spill = makeColorFromStyle(theme?.overlayGroundSpillColor, FALLBACK_THEME.overlayGroundSpillColor, 1.12);
        const whiteHot = new THREE.Color(4.8, 4.9, 5.05);
        const widthFactor = this.qualityKey === 'cinematic' ? 1 : this.qualityKey === 'lightweight' ? 0.76 : 0.62;
        const impactX = this.impactAnchor.x;
        const impactY = this.impactAnchor.y;
        const smokeCount = this.qualityKey === 'cinematic' ? 60 : this.qualityKey === 'lightweight' ? 34 : 22;
        const vaporCount = this.qualityKey === 'cinematic' ? 26 : this.qualityKey === 'lightweight' ? 16 : 10;
        const sparkCount = this.qualityKey === 'cinematic' ? 30 : this.qualityKey === 'lightweight' ? 18 : 12;

        this.vaporField.emit(() => {
            const angle = randomBetween(-Math.PI, 0);
            const speed = randomBetween(104, 208) * widthFactor;
            return {
                x: impactX + randomBetween(-22, 22),
                y: impactY + randomBetween(-14, 10),
                vx: Math.cos(angle) * speed * 0.38,
                vy: Math.sin(angle) * speed * 0.48 - randomBetween(48, 102),
                drag: 2.8,
                gravity: randomBetween(26, 54),
                turbulence: randomBetween(5, 12),
                swirl: randomBetween(4, 12),
                phase: Math.random() * Math.PI * 2,
                life: randomBetween(0.26, 0.52),
                sizeStart: randomBetween(48, 92) * widthFactor,
                sizeEnd: randomBetween(112, 178) * widthFactor,
                alphaStart: 0,
                alphaPeak: randomBetween(0.68, 0.98),
                alphaEnd: 0,
                peakPoint: 0.16,
                colorStart: whiteHot,
                colorEnd: spill
            };
        }, vaporCount);

        this.smokeField.emit(() => {
            const angle = randomBetween(-Math.PI, Math.PI);
            const ringSpeed = randomBetween(48, 144) * widthFactor;
            const rise = randomBetween(22, 68);
            const offsetRadius = randomBetween(0, 16);
            return {
                x: impactX + Math.cos(angle) * offsetRadius,
                y: impactY + Math.sin(angle) * offsetRadius * 0.26 + randomBetween(-8, 8),
                vx: Math.cos(angle) * ringSpeed,
                vy: Math.sin(angle) * ringSpeed * 0.3 - rise,
                drag: 1.28,
                gravity: randomBetween(-6, 10),
                turbulence: randomBetween(10, 22),
                swirl: randomBetween(12, 28),
                phase: Math.random() * Math.PI * 2,
                life: randomBetween(0.86, 1.82),
                sizeStart: randomBetween(30, 56) * widthFactor,
                sizeEnd: randomBetween(126, 212) * widthFactor,
                alphaStart: 0,
                alphaPeak: randomBetween(0.28, 0.52),
                alphaEnd: 0,
                peakPoint: 0.2,
                colorStart: spill,
                colorEnd: accent
            };
        }, smokeCount);

        this.sparkField.emit(() => {
            const angle = randomBetween(-Math.PI * 1.08, Math.PI * 0.08);
            const speed = randomBetween(110, 260) * widthFactor;
            return {
                x: impactX + randomBetween(-18, 18),
                y: impactY + randomBetween(-12, 6),
                vx: Math.cos(angle) * speed * randomBetween(0.5, 1),
                vy: Math.sin(angle) * speed - randomBetween(36, 112),
                drag: 4.4,
                gravity: randomBetween(96, 188),
                turbulence: randomBetween(4, 11),
                swirl: randomBetween(0, 8),
                phase: Math.random() * Math.PI * 2,
                life: randomBetween(0.32, 0.82),
                sizeStart: randomBetween(9, 18) * widthFactor,
                sizeEnd: randomBetween(4, 10) * widthFactor,
                alphaStart: 0,
                alphaPeak: randomBetween(0.64, 0.9),
                alphaEnd: 0,
                peakPoint: 0.1,
                colorStart: whiteHot,
                colorEnd: spill
            };
        }, sparkCount);

        this.sparkField.points.material.opacity = stormState?.reducedMotion ? 0.58 : 0.94;
    }

    #emitAmbientAtmosphere(theme, stormState, dt) {
        const phase = stormState?.phase || 'idle';
        if (!(phase === 'boxMaterialize' || phase === 'idleStormReveal' || phase === 'stormDissipate')) {
            return;
        }
        const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 1 / 60;
        const qualityScale = this.qualityKey === 'cinematic' ? 1 : this.qualityKey === 'lightweight' ? 0.72 : 0.52;
        const ambientRate = Math.max(0, stormState?.revealEnergy || 0) * Math.max(0.6, theme?.ambientSparkRate || 1);
        if (ambientRate <= 0.02) {
            return;
        }
        this.ambientParticleCarry += ambientRate * qualityScale * safeDt * 14;
        const emissionCount = Math.min(8, Math.floor(this.ambientParticleCarry));
        if (emissionCount <= 0) {
            return;
        }
        this.ambientParticleCarry -= emissionCount;

        const accent = makeColorFromStyle(theme?.overlayAccentA, FALLBACK_THEME.overlayAccentA, 1.08);
        const spill = makeColorFromStyle(theme?.overlayGroundSpillColor, FALLBACK_THEME.overlayGroundSpillColor, 1.08);
        const widthFactor = this.qualityKey === 'cinematic' ? 1 : this.qualityKey === 'lightweight' ? 0.82 : 0.66;
        const impactX = this.impactAnchor.x;
        const impactY = this.impactAnchor.y;
        const emberDrift = phase === 'stormDissipate' ? 0.82 : 1;

        this.smokeField.emit(() => {
            const angle = randomBetween(-Math.PI, Math.PI);
            const radius = randomBetween(8, 34) * widthFactor;
            return {
                x: impactX + Math.cos(angle) * radius,
                y: impactY + randomBetween(-6, 22),
                vx: Math.cos(angle) * randomBetween(12, 34) * emberDrift,
                vy: -randomBetween(14, 36) * emberDrift,
                drag: 1.12,
                gravity: randomBetween(-8, 4),
                turbulence: randomBetween(6, 16),
                swirl: randomBetween(6, 20),
                phase: Math.random() * Math.PI * 2,
                life: randomBetween(0.7, 1.6),
                sizeStart: randomBetween(20, 34) * widthFactor,
                sizeEnd: randomBetween(72, 126) * widthFactor,
                alphaStart: 0,
                alphaPeak: randomBetween(0.14, 0.24),
                alphaEnd: 0,
                peakPoint: 0.24,
                colorStart: spill,
                colorEnd: accent
            };
        }, Math.max(1, Math.ceil(emissionCount * 0.7)));

        this.sparkField.emit(() => {
            const angle = randomBetween(-Math.PI, Math.PI);
            const speed = randomBetween(28, 72) * widthFactor;
            return {
                x: impactX + randomBetween(-24, 24),
                y: impactY + randomBetween(-8, 18),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed * 0.4 - randomBetween(18, 46),
                drag: 2.4,
                gravity: randomBetween(28, 72),
                turbulence: randomBetween(2, 8),
                swirl: randomBetween(0, 6),
                phase: Math.random() * Math.PI * 2,
                life: randomBetween(0.36, 0.9),
                sizeStart: randomBetween(6, 12) * widthFactor,
                sizeEnd: randomBetween(2, 6) * widthFactor,
                alphaStart: 0,
                alphaPeak: randomBetween(0.24, 0.48),
                alphaEnd: 0,
                peakPoint: 0.12,
                colorStart: accent,
                colorEnd: spill
            };
        }, emissionCount);
    }

    #updateParticles(dt) {
        this.vaporField.update(dt);
        this.smokeField.update(dt);
        this.sparkField.update(dt);
    }

    render({
        dt = 0,
        t = 0,
        stormState = null,
        theme = null,
        overlayActive = false,
        camera = null
    } = {}) {
        if (!this.isAvailable || !this.renderer || !this.composer) {
            return;
        }
        if (stormState?.startupToken && stormState.startupToken !== this.lastToken) {
            this.lastToken = stormState.startupToken;
            this.lastPhase = 'idle';
            this.landingBurstTriggered = false;
            this.craterPersistence = 0;
            this.ambientParticleCarry = 0;
            this.vaporField.clear();
            this.smokeField.clear();
            this.sparkField.clear();
            this.#disposeStrikeMeshes();
        }

        this.#resolveQuality(stormState);
        this.#ensureSize();

        const hasLiveParticles = this.vaporField.points.visible || this.smokeField.points.visible || this.sparkField.points.visible || this.craterPersistence > 0.014;
        const shouldRender = Boolean(
            overlayActive &&
            (
                (stormState?.active && ACTIVE_STORM_PHASES.has(stormState.phase)) ||
                hasLiveParticles
            )
        );

        if (!shouldRender) {
            if (this.lastOverlayActive) {
                this.renderer.clear();
            }
            this.lastOverlayActive = false;
            this.#setCanvasVisible(false);
            return;
        }

        this.#setCanvasVisible(true);
        this.lastOverlayActive = true;

        if (stormState?.strikeGeometry !== this.lastStrikeGeometry || stormState?.strikeVariant !== this.lastStrikeVariant) {
            this.#setStrikeGeometry(stormState?.strikeGeometry || null, stormState?.strikeVariant || 'none');
        }
        this.#applyTheme(theme);

        const strikeTarget = this.#resolveStrikeTarget(stormState, camera);
        this.#updateStrikeTransform(stormState, strikeTarget);
        this.#updateStrikeMaterialOpacities(stormState);
        this.#updateStormMedia(stormState, theme, strikeTarget, t, dt);

        if (stormState?.phase !== this.lastPhase) {
            if (stormState?.phase === 'targetedImpact') {
                this.landingBurstTriggered = false;
            }
            if (!ACTIVE_STORM_PHASES.has(stormState?.phase)) {
                this.#disposeStrikeMeshes();
            }
            this.lastPhase = stormState?.phase || 'idle';
        }

        const landingPulse = LANDING_STORM_PHASES.has(stormState?.phase)
            ? clamp01(Math.max(stormState?.impactCore || 0, (stormState?.impactBloom || 0) * 0.82, (stormState?.returnStroke || 0) * 0.64))
            : 0;
        if (!this.landingBurstTriggered && stormState?.phase === 'targetedImpact' && landingPulse >= 0.34) {
            this.#emitLandingBurst(theme, stormState);
            this.landingBurstTriggered = true;
        }
        this.#emitAmbientAtmosphere(theme, stormState, dt);
        this.#updateParticles(Math.max(0, dt));
        this.composer.render(Math.max(0, dt));
    }

    getDebugSnapshot() {
        const vaporCount = this.vaporField?.geometry?.drawRange?.count ?? 0;
        const smokeCount = this.smokeField?.geometry?.drawRange?.count ?? 0;
        const sparkCount = this.sparkField?.geometry?.drawRange?.count ?? 0;
        return {
            isAvailable: Boolean(this.isAvailable),
            qualityKey: this.qualityKey || 'uninitialized',
            resolutionScale: this.resolutionScale,
            width: this.width,
            height: this.height,
            devicePixelRatio: this.devicePixelRatio,
            lastPhase: this.lastPhase,
            lastToken: this.lastToken,
            lastStrikeVariant: this.lastStrikeVariant,
            lastOverlayActive: Boolean(this.lastOverlayActive),
            canvasVisible: Boolean(
                this.canvas &&
                this.canvas.style.visibility !== 'hidden' &&
                this.canvas.style.opacity !== '0'
            ),
            landingBurstTriggered: Boolean(this.landingBurstTriggered),
            craterPersistence: sanitizeNumber(this.craterPersistence, 0),
            impactAnchor: {
                x: sanitizeNumber(this.impactAnchor?.x, 0),
                y: sanitizeNumber(this.impactAnchor?.y, 0)
            },
            projectedStrike: {
                x: sanitizeNumber(this.projectedStrike?.x, DEFAULT_STRIKE_TARGET.x),
                y: sanitizeNumber(this.projectedStrike?.y, DEFAULT_STRIKE_TARGET.y)
            },
            particles: {
                vaporVisible: Boolean(this.vaporField?.points?.visible),
                vaporCount,
                smokeVisible: Boolean(this.smokeField?.points?.visible),
                smokeCount,
                sparkVisible: Boolean(this.sparkField?.points?.visible),
                sparkCount
            }
        };
    }

    dispose() {
        try {
            this.#disposeStrikeMeshes();
            this.vaporField?.dispose();
            this.smokeField?.dispose();
            this.sparkField?.dispose();
            this.cloudMesh?.geometry?.dispose();
            this.cloudMesh?.material?.dispose();
            this.impactMesh?.geometry?.dispose();
            this.impactMesh?.material?.dispose();
            this.craterMesh?.geometry?.dispose();
            this.craterMesh?.material?.dispose();
            this.composer?.dispose?.();
            this.renderer?.dispose?.();
        } catch (_) {}
        if (this.canvas?.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.overlayElement?.classList.remove('legendary-storm-renderer-live');
        this.isAvailable = false;
    }
}
