(function () {
    const TAU = Math.PI * 2;

    const DEFAULT_THEME = {
        laneTop: 'rgba(255, 255, 255, 0.56)',
        laneMid: 'rgba(205, 244, 255, 0.72)',
        laneBottom: 'rgba(255, 240, 194, 0.7)',
        hillTop: 'rgba(145, 224, 153, 0.3)',
        hillBottom: 'rgba(102, 190, 118, 0.44)',
        path: 'rgba(255, 255, 255, 0.56)',
        bubble: 'rgba(255, 255, 255, 0.4)'
    };

    // The looped sprite atlases already carry the real flap cycle, so the
    // extra motion here stays restrained and only adds float, banking, and lift.
    const DEFAULT_SMALL_MOTION = {
        bobAmplitude: 1.6,
        bobSpeed: 1.08,
        rotationDeg: 1.6,
        rotationSpeed: 0.95,
        driftX: 2.3,
        driftY: 0.75,
        driftSpeed: 0.72,
        scaleBreath: 0.006,
        scaleSpeed: 0.78,
        playbackRate: 1,
        phaseOffset: 1.15,
        phaseOffsetFrames: 10
    };

    const DEFAULT_LARGE_MOTION = {
        bobAmplitude: 1.2,
        bobSpeed: 0.84,
        rotationDeg: 1.1,
        rotationSpeed: 0.78,
        driftX: 1.5,
        driftY: 0.45,
        driftSpeed: 0.52,
        scaleBreath: 0.004,
        scaleSpeed: 0.62,
        playbackRate: 1,
        phaseOffset: 0.35,
        phaseOffsetFrames: 0
    };

    const DEFAULT_SMALL_ASPECT_RATIO = 500 / 300;
    const DEFAULT_LARGE_ASPECT_RATIO = 928 / 600;
    const DEFAULT_SMALL_HITBOX = { left: 0.14, right: 0.88 };
    const DEFAULT_LARGE_HITBOX = { left: 0.08, right: 0.95 };
    const DEFAULT_ATMOSPHERE = {
        enabled: true,
        windLines: 6,
        windOpacity: 0.15,
        windSpeed: 92,
        windLength: 110,
        cloudPuffs: 4,
        cloudOpacity: 0.11,
        cloudSpeed: 18,
        slipstreamOpacity: 0.18
    };

    const DEFAULTS = {
        birdScale: 1,
        smallBirdScale: 1,
        largeBirdScale: 1,
        bottomOffset: 8,
        facingDirection: 'right',
        easingDuration: 520,
        smallBirdX: null,
        largeBirdX: null,
        minGap: null,
        maxGap: null,
        correctStep: null,
        wrongStep: null,
        winOffsetThreshold: null,
        catchImpactDuration: 860,
        theme: DEFAULT_THEME,
        smallBirdSrc: null,
        largeBirdSrc: null,
        smallBirdAtlasSrc: null,
        largeBirdAtlasSrc: null,
        smallBirdAtlasMetaSrc: null,
        largeBirdAtlasMetaSrc: null,
        smallBirdMotion: DEFAULT_SMALL_MOTION,
        largeBirdMotion: DEFAULT_LARGE_MOTION,
        smallBirdHitbox: DEFAULT_SMALL_HITBOX,
        largeBirdHitbox: DEFAULT_LARGE_HITBOX,
        atmosphere: DEFAULT_ATMOSPHERE,
        debug: false,
        pauseOnHidden: true,
        pixelSnap: false
    };

    const imageCache = new Map();
    const jsonCache = new Map();
    const warnedMessages = new Set();

    function warnOnce(message) {
        if (warnedMessages.has(message)) return;
        warnedMessages.add(message);
        console.warn(message);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function lerp(from, to, amount) {
        return from + (to - from) * amount;
    }

    function easeOutCubic(value) {
        const clamped = clamp(value, 0, 1);
        return 1 - ((1 - clamped) ** 3);
    }

    function createElement(tagName, className) {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        return element;
    }

    function resolveAnchorX(value, fallback, laneWidth, birdWidth) {
        if (value == null) return fallback;
        if (typeof value === 'string') {
            const preset = value.trim().toLowerCase();
            if (preset === 'center') return (laneWidth - birdWidth) * 0.5;
            if (preset === 'left') return 8;
            if (preset === 'right') return laneWidth - birdWidth - 8;
        }
        return Number(value);
    }

    function mergeMotion(userMotion, fallbackMotion) {
        return {
            ...fallbackMotion,
            ...(userMotion || {})
        };
    }

    function loadImage(src) {
        if (!src) {
            return Promise.resolve({ src, status: 'missing', image: null });
        }
        if (imageCache.has(src)) return imageCache.get(src).promise;

        const image = new window.Image();
        image.decoding = 'async';

        const entry = {
            src,
            image,
            status: 'loading',
            error: null,
            promise: null
        };

        entry.promise = new Promise((resolve) => {
            let settled = false;
            const finish = (status, error) => {
                if (settled) return;
                settled = true;
                entry.status = status;
                entry.error = error || null;
                if (status === 'error') warnOnce(`[BirdEscape] Failed to load image asset: ${src}`);
                resolve(entry);
            };

            image.addEventListener('load', () => finish('loaded'), { once: true });
            image.addEventListener('error', (event) => finish('error', event), { once: true });
            image.src = src;

            if (image.complete) {
                finish(image.naturalWidth > 0 ? 'loaded' : 'error');
            }
        });

        imageCache.set(src, entry);
        return entry.promise;
    }

    function loadJson(src) {
        if (!src) {
            return Promise.resolve({ src, status: 'missing', data: null });
        }
        if (jsonCache.has(src)) return jsonCache.get(src).promise;

        const entry = {
            src,
            status: 'loading',
            data: null,
            error: null,
            promise: null
        };

        entry.promise = window.fetch(src)
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then((data) => {
                entry.status = 'loaded';
                entry.data = data;
                return entry;
            })
            .catch((error) => {
                entry.status = 'error';
                entry.error = error;
                warnOnce(`[BirdEscape] Failed to load sprite metadata: ${src}`);
                return entry;
            });

        jsonCache.set(src, entry);
        return entry.promise;
    }

    function createAssetRecord() {
        return {
            atlasSrc: '',
            atlasMetaSrc: '',
            fallbackSrc: '',
            atlasStatus: 'missing',
            metaStatus: 'missing',
            fallbackStatus: 'missing',
            readyMode: null,
            atlasImage: null,
            meta: null,
            fallbackImage: null,
            aspectRatio: null
        };
    }

    function createBirdEscapeSystem(userConfig = {}) {
        const config = {
            ...DEFAULTS,
            ...userConfig,
            theme: { ...DEFAULT_THEME, ...(userConfig.theme || {}) },
            atmosphere: { ...DEFAULT_ATMOSPHERE, ...(userConfig.atmosphere || {}) },
            smallBirdMotion: mergeMotion(userConfig.smallBirdMotion, DEFAULT_SMALL_MOTION),
            largeBirdMotion: mergeMotion(userConfig.largeBirdMotion, DEFAULT_LARGE_MOTION)
        };

        const state = {
            mounted: false,
            container: null,
            root: null,
            track: null,
            canvas: null,
            ctx: null,
            resizeObserver: null,
            rafId: 0,
            lastFrameTime: 0,
            motionTimeMs: 0,
            pixelRatio: 1,
            tween: null,
            debugEnabled: Boolean(config.debug),
            pauseRequested: false,
            hiddenPaused: false,
            preloadPromise: null,
            caught: false,
            capture: null,
            hasAdvanced: false,
            assets: {
                small: createAssetRecord(),
                large: createAssetRecord()
            },
            layout: {
                laneWidth: 0,
                laneHeight: 0,
                smallBirdX: 0,
                largeBirdX: 0,
                startLargeBirdX: 0,
                minGap: 0,
                maxGap: 0,
                correctStep: 0,
                wrongStep: 0,
                winOffsetThreshold: 0,
                catchX: 0,
                smallBirdWidth: 0,
                smallBirdHeight: 0,
                largeBirdWidth: 0,
                largeBirdHeight: 0
            },
            rendered: {
                smallMotion: null,
                largeMotion: null
            },
            handlers: {
                resize: null,
                visibilityChange: null
            }
        };

        function isPaused() {
            return state.pauseRequested || state.hiddenPaused;
        }

        function snap(value) {
            return config.pixelSnap ? Math.round(value) : value;
        }

        function applyTheme() {
            if (!state.root) return;
            state.root.style.setProperty('--bird-escape-lane-top', config.theme.laneTop);
            state.root.style.setProperty('--bird-escape-lane-mid', config.theme.laneMid);
            state.root.style.setProperty('--bird-escape-lane-bottom', config.theme.laneBottom);
            state.root.style.setProperty('--bird-escape-hill-top', config.theme.hillTop);
            state.root.style.setProperty('--bird-escape-hill-bottom', config.theme.hillBottom);
            state.root.style.setProperty('--bird-escape-path', config.theme.path);
            state.root.style.setProperty('--bird-escape-bubble', config.theme.bubble);
            state.root.dataset.facing = config.facingDirection === 'left' ? 'left' : 'right';
        }

        function areAssetsReady() {
            return Boolean(state.assets.small.readyMode && state.assets.large.readyMode);
        }

        function getAsset(kind) {
            return kind === 'large' ? state.assets.large : state.assets.small;
        }

        function getMotion(kind) {
            return kind === 'large' ? config.largeBirdMotion : config.smallBirdMotion;
        }

        function getHitbox(kind) {
            const source = kind === 'large' ? config.largeBirdHitbox : config.smallBirdHitbox;
            return {
                left: clamp(Number(source?.left) || 0, 0, 1),
                right: clamp(Number(source?.right) || 1, 0, 1)
            };
        }

        function applyRootFlags() {
            if (!state.root) return;
            state.root.dataset.debug = state.debugEnabled ? 'true' : 'false';
            state.root.dataset.ready = String(areAssetsReady());
            state.root.dataset.paused = String(isPaused());
            state.root.dataset.caught = String(state.caught);
        }

        function createMarkup() {
            const root = createElement('div', 'bird-escape-root');
            const track = createElement('div', 'bird-escape-track');
            const canvas = createElement('canvas', 'bird-escape-canvas');

            canvas.setAttribute('aria-hidden', 'true');
            root.append(track, canvas);

            state.root = root;
            state.track = track;
            state.canvas = canvas;
            state.ctx = canvas.getContext('2d', { alpha: true });

            if (!state.ctx) {
                warnOnce('[BirdEscape] Unable to acquire a 2D canvas context.');
            }

            applyTheme();
            applyRootFlags();
        }

        function getFallbackAspectRatio(kind) {
            const asset = getAsset(kind);
            if (asset.aspectRatio) return asset.aspectRatio;
            if (asset.fallbackImage?.naturalWidth && asset.fallbackImage?.naturalHeight) {
                return asset.fallbackImage.naturalWidth / asset.fallbackImage.naturalHeight;
            }
            return kind === 'large' ? DEFAULT_LARGE_ASPECT_RATIO : DEFAULT_SMALL_ASPECT_RATIO;
        }

        function updateAspectRatioFromAsset(kind) {
            const asset = getAsset(kind);
            if (asset.meta?.frameWidth && asset.meta?.frameHeight) {
                asset.aspectRatio = asset.meta.frameWidth / asset.meta.frameHeight;
                return;
            }
            if (asset.fallbackImage?.naturalWidth && asset.fallbackImage?.naturalHeight) {
                asset.aspectRatio = asset.fallbackImage.naturalWidth / asset.fallbackImage.naturalHeight;
                return;
            }
            asset.aspectRatio = kind === 'large' ? DEFAULT_LARGE_ASPECT_RATIO : DEFAULT_SMALL_ASPECT_RATIO;
        }

        function updateBirdAssets(kind, atlasEntry, metaEntry, fallbackEntry) {
            const asset = getAsset(kind);

            asset.atlasStatus = atlasEntry?.status || 'missing';
            asset.metaStatus = metaEntry?.status || 'missing';
            asset.fallbackStatus = fallbackEntry?.status || 'missing';
            asset.atlasImage = atlasEntry?.status === 'loaded' ? atlasEntry.image : null;
            asset.meta = metaEntry?.status === 'loaded' ? metaEntry.data : null;
            asset.fallbackImage = fallbackEntry?.status === 'loaded' ? fallbackEntry.image : null;

            if (asset.atlasImage && asset.meta) {
                asset.readyMode = 'sprite';
            } else if (asset.fallbackImage) {
                asset.readyMode = 'fallback';
            } else {
                asset.readyMode = null;
                warnOnce(`[BirdEscape] No usable visual loaded for the ${kind} bird.`);
            }

            updateAspectRatioFromAsset(kind);
            applyRootFlags();
            recalculateLayout();
            renderFrame();
        }

        function calculateLargeBirdRightAllowance() {
            const motion = getMotion('large');
            return Math.max(
                6,
                Math.abs(motion.driftX || 0) + Math.abs(motion.rotationDeg || 0) * 0.5
            );
        }

        function getLargeBirdMinX() {
            return -state.layout.winOffsetThreshold;
        }

        function getLargeBirdMaxX() {
            return state.layout.catchX;
        }

        function clearCapture() {
            state.caught = false;
            state.capture = null;
            applyRootFlags();
        }

        function resizeCanvas() {
            if (!state.canvas || !state.root) return;

            const width = Math.max(1, Math.round(state.root.clientWidth));
            const height = Math.max(1, Math.round(state.root.clientHeight));
            const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

            if (state.canvas.width !== width * pixelRatio || state.canvas.height !== height * pixelRatio) {
                state.canvas.width = width * pixelRatio;
                state.canvas.height = height * pixelRatio;
                state.canvas.style.width = `${width}px`;
                state.canvas.style.height = `${height}px`;
            }

            state.pixelRatio = pixelRatio;
        }

        function recalculateLayout() {
            if (!state.root) return;

            const previous = { ...state.layout };
            const hadLayout = previous.laneWidth > 0 && previous.laneHeight > 0;
            const previousMinX = hadLayout ? -previous.winOffsetThreshold : 0;
            const previousMaxX = hadLayout ? previous.smallBirdX - previous.minGap : 0;
            const previousRange = previousMaxX - previousMinX;
            const previousProgress = hadLayout && previousRange !== 0
                ? clamp((previousMaxX - previous.largeBirdX) / previousRange, 0, 1)
                : 0;

            state.layout.laneWidth = Math.max(1, state.root.clientWidth);
            state.layout.laneHeight = Math.max(1, state.root.clientHeight);

            const smallAspect = getFallbackAspectRatio('small');
            const largeAspect = getFallbackAspectRatio('large');

            const smallHeight = clamp(
                state.layout.laneHeight * 0.52 * config.birdScale * config.smallBirdScale,
                28,
                state.layout.laneHeight * 0.82
            );
            const largeHeight = clamp(
                state.layout.laneHeight * 0.8 * config.birdScale * config.largeBirdScale,
                42,
                state.layout.laneHeight * 0.98
            );

            state.layout.smallBirdHeight = smallHeight;
            state.layout.smallBirdWidth = smallHeight * smallAspect;
            state.layout.largeBirdHeight = largeHeight;
            state.layout.largeBirdWidth = largeHeight * largeAspect;

            const smallHitbox = getHitbox('small');
            const largeHitbox = getHitbox('large');
            const defaultSmallBirdX = (state.layout.laneWidth * 0.86) - (state.layout.smallBirdWidth * 0.5);
            const defaultLargeBirdX = (state.layout.laneWidth - state.layout.largeBirdWidth) * 0.5;

            state.layout.smallBirdX = clamp(
                resolveAnchorX(config.smallBirdX, defaultSmallBirdX, state.layout.laneWidth, state.layout.smallBirdWidth),
                8,
                state.layout.laneWidth - state.layout.smallBirdWidth - 8
            );

            state.layout.catchX = state.layout.smallBirdX
                + (state.layout.smallBirdWidth * smallHitbox.left)
                - (state.layout.largeBirdWidth * largeHitbox.right);
            state.layout.minGap = 0;
            state.layout.maxGap = config.maxGap == null
                ? state.layout.laneWidth + state.layout.largeBirdWidth + 16
                : Number(config.maxGap);
            state.layout.correctStep = config.correctStep == null
                ? Math.max(52, state.layout.laneWidth * 0.11)
                : Number(config.correctStep);
            state.layout.wrongStep = config.wrongStep == null
                ? Math.max(32, state.layout.laneWidth * 0.075)
                : Number(config.wrongStep);
            state.layout.winOffsetThreshold = config.winOffsetThreshold == null
                ? state.layout.largeBirdWidth + calculateLargeBirdRightAllowance() + 12
                : Number(config.winOffsetThreshold);

            const largeBirdMinX = getLargeBirdMinX();
            const largeBirdMaxX = getLargeBirdMaxX();

            state.layout.startLargeBirdX = clamp(
                resolveAnchorX(config.largeBirdX, defaultLargeBirdX, state.layout.laneWidth, state.layout.largeBirdWidth),
                largeBirdMinX,
                largeBirdMaxX
            );
            state.layout.largeBirdX = hadLayout && state.hasAdvanced
                ? clamp(lerp(largeBirdMaxX, largeBirdMinX, previousProgress), largeBirdMinX, largeBirdMaxX)
                : state.layout.startLargeBirdX;

            if (state.tween) {
                state.tween.fromX = clamp(state.tween.fromX, largeBirdMinX, largeBirdMaxX);
                state.tween.toX = clamp(state.tween.toX, largeBirdMinX, largeBirdMaxX);
            }

            resizeCanvas();
        }

        function evaluateMotion(kind) {
            const motion = getMotion(kind);
            const timeSeconds = state.motionTimeMs / 1000;
            const phase = motion.phaseOffset || 0;

            const bob = Math.sin((timeSeconds * motion.bobSpeed * TAU) + phase) * motion.bobAmplitude;
            const lift = Math.cos((timeSeconds * motion.bobSpeed * TAU * 0.5) + (phase * 0.6)) * motion.bobAmplitude * 0.26;
            const driftX = Math.sin((timeSeconds * motion.driftSpeed * TAU) + (phase * 1.2)) * motion.driftX;
            const driftY = Math.cos((timeSeconds * motion.driftSpeed * TAU * 0.83) + (phase * 0.8)) * motion.driftY;
            const rotationDeg = Math.sin((timeSeconds * motion.rotationSpeed * TAU) + (phase * 0.92)) * motion.rotationDeg;
            const scale = 1 + (Math.sin((timeSeconds * motion.scaleSpeed * TAU) + (phase * 1.1)) * motion.scaleBreath);

            return {
                x: driftX,
                y: bob + lift + driftY,
                rotationDeg,
                scale
            };
        }

        function getCurrentMotion(kind) {
            return kind === 'large'
                ? (state.rendered.largeMotion || evaluateMotion('large'))
                : (state.rendered.smallMotion || evaluateMotion('small'));
        }

        function getBirdBounds(kind, motion = getCurrentMotion(kind)) {
            const width = kind === 'large' ? state.layout.largeBirdWidth : state.layout.smallBirdWidth;
            const height = kind === 'large' ? state.layout.largeBirdHeight : state.layout.smallBirdHeight;
            const anchorX = kind === 'large' ? state.layout.largeBirdX : state.layout.smallBirdX;
            const hitbox = getHitbox(kind);
            const baseY = state.layout.laneHeight - config.bottomOffset;
            const drawX = anchorX + (motion?.x || 0);
            const drawY = (baseY - height) + (motion?.y || 0);
            return {
                left: drawX + (width * hitbox.left),
                right: drawX + (width * hitbox.right),
                top: drawY + (height * 0.18),
                bottom: drawY + (height * 0.82)
            };
        }

        function checkCaught() {
            if (state.caught) return true;
            const largeBounds = getBirdBounds('large');
            const smallBounds = getBirdBounds('small');
            return largeBounds.right >= smallBounds.left;
        }

        function alignLargeBirdToCatch() {
            const largeMotion = getCurrentMotion('large');
            const smallMotion = getCurrentMotion('small');
            const largeHitbox = getHitbox('large');
            const smallHitbox = getHitbox('small');
            const targetX = (
                state.layout.smallBirdX
                + (smallMotion.x || 0)
                + (state.layout.smallBirdWidth * smallHitbox.left)
            ) - (
                (largeMotion.x || 0)
                + (state.layout.largeBirdWidth * largeHitbox.right)
            );

            state.layout.largeBirdX = clamp(targetX, getLargeBirdMinX(), getLargeBirdMaxX());
        }

        function startCaptureImpact() {
            alignLargeBirdToCatch();
            const largeBounds = getBirdBounds('large');
            const smallBounds = getBirdBounds('small');
            state.caught = true;
            state.capture = {
                startedAtMs: state.motionTimeMs,
                duration: Math.max(220, Number(config.catchImpactDuration) || 860),
                contactX: (largeBounds.right + smallBounds.left) * 0.5,
                contactY: ((largeBounds.top + largeBounds.bottom) * 0.5 + (smallBounds.top + smallBounds.bottom) * 0.5) * 0.5
            };
            applyRootFlags();
        }

        function getCaptureProgress() {
            if (!state.capture) return 0;
            return clamp(
                (state.motionTimeMs - state.capture.startedAtMs) / Math.max(1, state.capture.duration),
                0,
                1
            );
        }

        function getCaptureAdjustments(kind) {
            if (!state.capture) {
                return { x: 0, y: 0, rotationDeg: 0, scaleX: 1, scaleY: 1 };
            }

            const progress = getCaptureProgress();
            const burst = Math.sin(progress * Math.PI);
            const wobble = Math.sin(progress * Math.PI * 5.5) * (1 - progress);

            if (kind === 'large') {
                return {
                    x: -(burst * 10) + (wobble * 4),
                    y: -(burst * 4.5),
                    rotationDeg: -(burst * 8) + (wobble * 5),
                    scaleX: 1 + (burst * 0.06),
                    scaleY: 1 - (burst * 0.05)
                };
            }

            return {
                x: (burst * 12) + (wobble * 5),
                y: -(burst * 9),
                rotationDeg: (burst * 12) - (wobble * 4),
                scaleX: 1 - (burst * 0.05),
                scaleY: 1 + (burst * 0.08)
            };
        }

        function drawWindRibbon(headX, y, length, thickness, alpha, curve) {
            if (!state.ctx) return;

            const startX = headX - length;
            const endX = headX;
            if (endX < -length || startX > state.layout.laneWidth + length) return;

            const gradient = state.ctx.createLinearGradient(startX, y, endX, y);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            gradient.addColorStop(0.18, `rgba(255, 255, 255, ${alpha * 0.35})`);
            gradient.addColorStop(0.58, `rgba(255, 255, 255, ${alpha})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            state.ctx.save();
            state.ctx.strokeStyle = gradient;
            state.ctx.lineWidth = thickness;
            state.ctx.lineCap = 'round';
            state.ctx.beginPath();
            state.ctx.moveTo(startX, y);
            state.ctx.quadraticCurveTo(
                startX + (length * 0.42),
                y - curve,
                endX,
                y + (curve * 0.18)
            );
            state.ctx.stroke();
            state.ctx.restore();
        }

        function drawCloudWisp(centerX, centerY, scale, alpha) {
            if (!state.ctx) return;

            state.ctx.save();
            state.ctx.globalAlpha = alpha;
            state.ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
            state.ctx.beginPath();
            state.ctx.arc(centerX - (18 * scale), centerY + (2 * scale), 13 * scale, Math.PI * 0.55, Math.PI * 1.9);
            state.ctx.arc(centerX, centerY - (5 * scale), 15 * scale, Math.PI, Math.PI * 2);
            state.ctx.arc(centerX + (18 * scale), centerY + (1 * scale), 12 * scale, Math.PI * 1.12, Math.PI * 0.18);
            state.ctx.closePath();
            state.ctx.fill();
            state.ctx.restore();
        }

        function drawAtmosphere() {
            if (!state.ctx || !config.atmosphere?.enabled) return;

            const timeSeconds = state.motionTimeMs / 1000;
            const laneWidth = state.layout.laneWidth;
            const laneHeight = state.layout.laneHeight;
            const tweenBoost = state.tween ? 1.18 : 1;

            for (let index = 0; index < config.atmosphere.windLines; index += 1) {
                const length = config.atmosphere.windLength + (index * 18) + (Math.sin(timeSeconds * 0.55 + index) * 9);
                const cycle = laneWidth + length + 150;
                const speed = (config.atmosphere.windSpeed + (index * 14)) * tweenBoost;
                const offset = (timeSeconds * speed) % cycle;
                const headX = laneWidth - offset;
                const y = (laneHeight * (0.18 + (index * 0.1))) + (Math.sin(timeSeconds * 1.3 + (index * 1.2)) * (2 + index * 0.35));
                const alpha = config.atmosphere.windOpacity * (0.72 + (Math.sin(timeSeconds * 1.8 + index) * 0.18));
                const curve = 4 + ((index % 3) * 1.5);
                const thickness = 1.4 + ((index + 1) % 3) * 0.65;

                drawWindRibbon(headX, y, length, thickness, alpha, curve);
                drawWindRibbon(headX + cycle, y, length, thickness, alpha, curve);
            }

            for (let index = 0; index < config.atmosphere.cloudPuffs; index += 1) {
                const scale = 0.56 + (index * 0.12);
                const width = 58 * scale;
                const cycle = laneWidth + width + 180;
                const speed = config.atmosphere.cloudSpeed + (index * 3.8);
                const offset = (timeSeconds * speed) % cycle;
                const x = laneWidth - offset;
                const y = (laneHeight * (0.22 + (index * 0.12))) + (Math.sin(timeSeconds * 0.62 + index) * 4.5);
                const alpha = config.atmosphere.cloudOpacity * (0.9 - (index * 0.08));

                drawCloudWisp(x, y, scale, alpha);
                drawCloudWisp(x + cycle, y, scale, alpha);
            }
        }

        function drawSlipstream(kind) {
            if (!state.ctx || !config.atmosphere?.enabled) return;

            const width = kind === 'large' ? state.layout.largeBirdWidth : state.layout.smallBirdWidth;
            const height = kind === 'large' ? state.layout.largeBirdHeight : state.layout.smallBirdHeight;
            const anchorX = kind === 'large' ? state.layout.largeBirdX : state.layout.smallBirdX;
            const motion = getCurrentMotion(kind);
            const capture = getCaptureAdjustments(kind);
            const timeSeconds = state.motionTimeMs / 1000;
            const drawX = anchorX + motion.x + capture.x;
            const drawY = (state.layout.laneHeight - config.bottomOffset - height) + motion.y + capture.y;
            const tailX = drawX + (width * 0.08);
            const midY = drawY + (height * 0.54);
            const trailLength = width * (kind === 'large' ? 0.44 : 0.35);
            const baseOpacity = config.atmosphere.slipstreamOpacity * (kind === 'large' ? 1 : 0.82);

            state.ctx.save();
            state.ctx.lineCap = 'round';

            for (let index = 0; index < 3; index += 1) {
                const yOffset = (index - 1) * height * 0.08;
                const wobble = Math.sin((timeSeconds * 4.6) + (index * 1.3) + (kind === 'large' ? 0 : 0.7)) * (2.2 + index);
                const startX = tailX - trailLength - (index * 10);
                const endX = tailX - (width * 0.02);
                const y = midY + yOffset + wobble;
                const gradient = state.ctx.createLinearGradient(startX, y, endX, y);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
                gradient.addColorStop(0.7, `rgba(255, 255, 255, ${baseOpacity * (0.7 - index * 0.12)})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                state.ctx.strokeStyle = gradient;
                state.ctx.lineWidth = 1.1 + ((2 - index) * 0.45);
                state.ctx.beginPath();
                state.ctx.moveTo(startX, y);
                state.ctx.quadraticCurveTo(
                    startX + (trailLength * 0.55),
                    y - (2.5 + index),
                    endX,
                    y
                );
                state.ctx.stroke();
            }

            state.ctx.restore();
        }

        function getSpriteFrameRect(asset, motion) {
            if (!asset?.meta || !asset.atlasImage) return null;

            const frameCount = Math.max(1, Number(asset.meta.frameCount) || 1);
            const fps = Math.max(1, Number(asset.meta.fps) || 24);
            const playbackRate = Math.max(0.01, Number(motion.playbackRate) || 1);
            const phaseOffsetFrames = Number(motion.phaseOffsetFrames) || 0;
            const rawFrame = Math.floor(((state.motionTimeMs / 1000) * fps * playbackRate) + phaseOffsetFrames);
            const frameIndex = ((rawFrame % frameCount) + frameCount) % frameCount;
            const columns = Math.max(1, Number(asset.meta.columns) || frameCount);
            const frameWidth = Math.max(1, Number(asset.meta.frameWidth) || asset.atlasImage.width);
            const frameHeight = Math.max(1, Number(asset.meta.frameHeight) || asset.atlasImage.height);
            const column = frameIndex % columns;
            const row = Math.floor(frameIndex / columns);

            return {
                sx: column * frameWidth,
                sy: row * frameHeight,
                sw: frameWidth,
                sh: frameHeight
            };
        }

        function drawBird(kind) {
            if (!state.ctx) return;

            const asset = getAsset(kind);
            if (!asset.readyMode) return;

            const width = kind === 'large' ? state.layout.largeBirdWidth : state.layout.smallBirdWidth;
            const height = kind === 'large' ? state.layout.largeBirdHeight : state.layout.smallBirdHeight;
            const motion = evaluateMotion(kind);
            const capture = getCaptureAdjustments(kind);
            const anchorX = kind === 'large' ? state.layout.largeBirdX : state.layout.smallBirdX;
            const baseY = state.layout.laneHeight - config.bottomOffset;
            const drawX = snap(anchorX + motion.x + capture.x);
            const drawY = snap((baseY - height) + motion.y + capture.y);
            const rotation = (motion.rotationDeg + capture.rotationDeg) * (Math.PI / 180);
            const scaleX = motion.scale * capture.scaleX;
            const scaleY = motion.scale * capture.scaleY;

            if (kind === 'large') {
                state.rendered.largeMotion = motion;
            } else {
                state.rendered.smallMotion = motion;
            }

            state.ctx.save();
            state.ctx.translate(drawX + (width * 0.5), drawY + (height * 0.62));
            if (config.facingDirection === 'left') {
                state.ctx.scale(-1, 1);
            }
            state.ctx.rotate(rotation);
            state.ctx.scale(scaleX, scaleY);
            state.ctx.translate(-(width * 0.5), -(height * 0.62));

            if (asset.readyMode === 'sprite') {
                const frame = getSpriteFrameRect(asset, getMotion(kind));
                if (frame) {
                    state.ctx.drawImage(
                        asset.atlasImage,
                        frame.sx,
                        frame.sy,
                        frame.sw,
                        frame.sh,
                        0,
                        0,
                        width,
                        height
                    );
                }
            } else if (asset.fallbackImage) {
                state.ctx.drawImage(asset.fallbackImage, 0, 0, width, height);
            }

            state.ctx.restore();

            if (!state.debugEnabled) return;

            const debugColor = kind === 'large'
                ? 'rgba(255, 126, 78, 0.9)'
                : 'rgba(92, 157, 255, 0.9)';

            state.ctx.save();
            state.ctx.strokeStyle = debugColor;
            state.ctx.lineWidth = 1.25;
            state.ctx.setLineDash([5, 4]);
            state.ctx.strokeRect(drawX, drawY, width, height);
            state.ctx.setLineDash([]);
            state.ctx.fillStyle = debugColor;
            state.ctx.beginPath();
            state.ctx.arc(anchorX, baseY, 4, 0, TAU);
            state.ctx.fill();
            state.ctx.restore();
        }

        function drawCaptureEffect() {
            if (!state.ctx || !state.capture) return;

            const progress = getCaptureProgress();
            const fade = 1 - progress;
            if (fade <= 0) return;

            const flashRadius = 18 + (progress * 34);
            const ringRadius = 20 + (progress * 52);
            const wobble = Math.sin(progress * Math.PI * 6) * (1 - progress);
            const centerX = state.capture.contactX + (wobble * 4);
            const centerY = state.capture.contactY - (progress * 6);

            state.ctx.save();

            const flash = state.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, flashRadius);
            flash.addColorStop(0, `rgba(255, 255, 255, ${0.92 * fade})`);
            flash.addColorStop(0.35, `rgba(255, 242, 135, ${0.72 * fade})`);
            flash.addColorStop(1, 'rgba(255, 162, 72, 0)');
            state.ctx.fillStyle = flash;
            state.ctx.beginPath();
            state.ctx.arc(centerX, centerY, flashRadius, 0, TAU);
            state.ctx.fill();

            state.ctx.strokeStyle = `rgba(255, 156, 72, ${0.8 * fade})`;
            state.ctx.lineWidth = 4.2 - (progress * 2.2);
            state.ctx.beginPath();
            state.ctx.arc(centerX, centerY, ringRadius, 0, TAU);
            state.ctx.stroke();

            state.ctx.fillStyle = `rgba(255, 208, 84, ${0.92 * fade})`;
            for (let index = 0; index < 8; index += 1) {
                const angle = (index / 8) * TAU + (progress * 1.2);
                const distance = 10 + (progress * 26);
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;
                state.ctx.beginPath();
                state.ctx.arc(x, y, 2.4 + ((1 - progress) * 1.8), 0, TAU);
                state.ctx.fill();
            }

            state.ctx.restore();
        }

        function renderFrame() {
            if (!state.ctx || !state.root) return;

            resizeCanvas();
            applyRootFlags();

            state.ctx.setTransform(state.pixelRatio, 0, 0, state.pixelRatio, 0, 0);
            state.ctx.clearRect(0, 0, state.layout.laneWidth, state.layout.laneHeight);
            state.ctx.imageSmoothingEnabled = true;
            state.ctx.imageSmoothingQuality = 'high';

            drawAtmosphere();
            drawSlipstream('large');
            drawSlipstream('small');
            drawBird('large');
            drawBird('small');
            drawCaptureEffect();
        }

        function finishTween() {
            if (!state.tween) return;
            const tween = state.tween;
            state.layout.largeBirdX = tween.toX;
            state.tween = null;
            renderFrame();
            tween.resolve?.(state.layout.largeBirdX);
        }

        function stepTween(deltaMs) {
            if (!state.tween) return;

            state.tween.elapsed += deltaMs;
            const progress = state.tween.duration <= 0
                ? 1
                : clamp(state.tween.elapsed / state.tween.duration, 0, 1);

            state.layout.largeBirdX = lerp(state.tween.fromX, state.tween.toX, easeOutCubic(progress));

            if (progress >= 1) {
                finishTween();
            }
        }

        function stepSimulation(deltaMs) {
            if (isPaused()) {
                renderFrame();
                return;
            }

            const safeDelta = clamp(deltaMs, 0, 64);
            state.motionTimeMs += safeDelta;
            stepTween(safeDelta);
            renderFrame();
        }

        function cancelAnimationFrameLoop() {
            if (!state.rafId) return;
            window.cancelAnimationFrame(state.rafId);
            state.rafId = 0;
        }

        function tick(frameTime) {
            if (!state.mounted) {
                state.rafId = 0;
                return;
            }

            if (!state.lastFrameTime) {
                state.lastFrameTime = frameTime;
            }

            const deltaMs = clamp(frameTime - state.lastFrameTime, 0, 48);
            state.lastFrameTime = frameTime;

            if (isPaused()) {
                renderFrame();
            } else {
                stepSimulation(deltaMs);
            }

            state.rafId = window.requestAnimationFrame(tick);
        }

        function ensureAnimationFrameLoop() {
            if (state.rafId || !state.mounted) return;
            state.lastFrameTime = 0;
            state.rafId = window.requestAnimationFrame(tick);
        }

        function animateLargeBird(targetX) {
            const minX = getLargeBirdMinX();
            const maxX = getLargeBirdMaxX();
            const clampedTarget = clamp(targetX, minX, maxX);

            if (!state.mounted || Math.abs(clampedTarget - state.layout.largeBirdX) < 0.2) {
                state.layout.largeBirdX = clampedTarget;
                renderFrame();
                return Promise.resolve(state.layout.largeBirdX);
            }

            if (state.tween?.resolve) {
                state.tween.resolve(state.layout.largeBirdX);
            }

            return new Promise((resolve) => {
                state.tween = {
                    fromX: state.layout.largeBirdX,
                    toX: clampedTarget,
                    elapsed: 0,
                    duration: Math.max(0, Number(config.easingDuration) || 0),
                    resolve
                };
                ensureAnimationFrameLoop();
                renderFrame();
            });
        }

        function onResize() {
            recalculateLayout();
            renderFrame();
        }

        function onVisibilityChange() {
            if (!config.pauseOnHidden) return;
            state.hiddenPaused = document.hidden;
            if (!state.hiddenPaused) state.lastFrameTime = 0;
            applyRootFlags();
            ensureAnimationFrameLoop();
            renderFrame();
        }

        function preloadAssets() {
            if (state.preloadPromise) return state.preloadPromise;

            state.assets.small.atlasSrc = config.smallBirdAtlasSrc || '';
            state.assets.small.atlasMetaSrc = config.smallBirdAtlasMetaSrc || '';
            state.assets.small.fallbackSrc = config.smallBirdSrc || '';
            state.assets.large.atlasSrc = config.largeBirdAtlasSrc || '';
            state.assets.large.atlasMetaSrc = config.largeBirdAtlasMetaSrc || '';
            state.assets.large.fallbackSrc = config.largeBirdSrc || '';

            state.preloadPromise = Promise.all([
                Promise.all([
                    loadImage(state.assets.small.atlasSrc),
                    loadJson(state.assets.small.atlasMetaSrc),
                    loadImage(state.assets.small.fallbackSrc)
                ]).then(([atlasEntry, metaEntry, fallbackEntry]) => {
                    updateBirdAssets('small', atlasEntry, metaEntry, fallbackEntry);
                }),
                Promise.all([
                    loadImage(state.assets.large.atlasSrc),
                    loadJson(state.assets.large.atlasMetaSrc),
                    loadImage(state.assets.large.fallbackSrc)
                ]).then(([atlasEntry, metaEntry, fallbackEntry]) => {
                    updateBirdAssets('large', atlasEntry, metaEntry, fallbackEntry);
                })
            ]).then(() => {
                applyRootFlags();
                renderFrame();
                return state.assets;
            });

            return state.preloadPromise;
        }

        function mount(container) {
            if (!container || !(container instanceof window.HTMLElement)) return api;

            if (state.mounted && state.container === container) {
                recalculateLayout();
                ensureAnimationFrameLoop();
                renderFrame();
                return api;
            }

            if (state.mounted) {
                destroy();
            }

            createMarkup();

            state.container = container;
            state.mounted = true;
            clearCapture();

            if (window.getComputedStyle(container).position === 'static') {
                container.style.position = 'relative';
            }

            container.replaceChildren(state.root);

            if ('ResizeObserver' in window) {
                state.resizeObserver = new window.ResizeObserver(onResize);
                state.resizeObserver.observe(container);
            } else {
                state.handlers.resize = onResize;
                window.addEventListener('resize', state.handlers.resize);
            }

            state.handlers.visibilityChange = onVisibilityChange;
            document.addEventListener('visibilitychange', state.handlers.visibilityChange);

            resizeCanvas();
            recalculateLayout();
            preloadAssets();
            ensureAnimationFrameLoop();
            renderFrame();

            return api;
        }

        function destroy() {
            if (state.resizeObserver) {
                state.resizeObserver.disconnect();
                state.resizeObserver = null;
            }

            if (state.handlers.resize) {
                window.removeEventListener('resize', state.handlers.resize);
                state.handlers.resize = null;
            }

            if (state.handlers.visibilityChange) {
                document.removeEventListener('visibilitychange', state.handlers.visibilityChange);
                state.handlers.visibilityChange = null;
            }

            cancelAnimationFrameLoop();

            if (state.root?.parentNode) {
                state.root.parentNode.removeChild(state.root);
            }

            state.mounted = false;
            state.container = null;
            state.root = null;
            state.track = null;
            state.canvas = null;
            state.ctx = null;
            state.tween = null;
            clearCapture();
            state.lastFrameTime = 0;

            return api;
        }

        function reset() {
            recalculateLayout();
            state.motionTimeMs = 0;
            state.tween = null;
            state.hasAdvanced = false;
            clearCapture();
            state.layout.largeBirdX = state.layout.startLargeBirdX;
            state.lastFrameTime = 0;
            renderFrame();
            return api;
        }

        function pause() {
            state.pauseRequested = true;
            applyRootFlags();
            renderFrame();
            return api;
        }

        function resume() {
            state.pauseRequested = false;
            state.lastFrameTime = 0;
            applyRootFlags();
            ensureAnimationFrameLoop();
            renderFrame();
            return api;
        }

        function setDebug(enabled) {
            state.debugEnabled = Boolean(enabled);
            applyRootFlags();
            renderFrame();
            return api;
        }

        function onCorrect() {
            if (state.caught) clearCapture();
            state.hasAdvanced = true;
            return animateLargeBird(state.layout.largeBirdX - state.layout.correctStep);
        }

        function onWrong() {
            if (state.caught) {
                return Promise.resolve({ caught: true, largeBirdX: state.layout.largeBirdX });
            }
            state.hasAdvanced = true;
            const targetX = state.layout.largeBirdX + state.layout.wrongStep;
            const catchTarget = getLargeBirdMaxX();
            const shouldCatch = targetX >= catchTarget - 0.2;
            return animateLargeBird(targetX).then(() => {
                if (shouldCatch || checkCaught()) {
                    startCaptureImpact();
                    renderFrame();
                    return {
                        caught: true,
                        largeBirdX: state.layout.largeBirdX,
                        catchX: state.layout.catchX
                    };
                }
                return {
                    caught: false,
                    largeBirdX: state.layout.largeBirdX,
                    catchX: state.layout.catchX
                };
            });
        }

        function setProgress(progress) {
            state.hasAdvanced = true;
            const amount = clamp(Number(progress) || 0, 0, 1);
            const x = lerp(getLargeBirdMaxX(), getLargeBirdMinX(), amount);
            state.layout.largeBirdX = clamp(x, getLargeBirdMinX(), getLargeBirdMaxX());
            state.tween = null;
            renderFrame();
            return api;
        }

        function setLargeBirdX(x) {
            state.hasAdvanced = true;
            state.layout.largeBirdX = clamp(Number(x) || 0, getLargeBirdMinX(), getLargeBirdMaxX());
            state.tween = null;
            renderFrame();
            return api;
        }

        function advanceTime(ms) {
            const deltaMs = Math.max(0, Number(ms) || 0);
            if (!deltaMs) {
                renderFrame();
                return api;
            }

            if (!isPaused()) {
                const maxStep = 32;
                let remaining = deltaMs;
                while (remaining > 0) {
                    const step = Math.min(maxStep, remaining);
                    state.motionTimeMs += step;
                    stepTween(step);
                    remaining -= step;
                }
            }

            state.lastFrameTime = 0;
            renderFrame();
            return api;
        }

        function checkWin() {
            const rightAllowance = calculateLargeBirdRightAllowance();
            const rightEdge = state.layout.largeBirdX + state.layout.largeBirdWidth + rightAllowance;
            return rightEdge <= 0;
        }

        function getState() {
            return {
                mounted: state.mounted,
                paused: isPaused(),
                debug: state.debugEnabled,
                assetsReady: areAssetsReady(),
                assets: {
                    small: {
                        mode: state.assets.small.readyMode,
                        atlasStatus: state.assets.small.atlasStatus,
                        metaStatus: state.assets.small.metaStatus,
                        fallbackStatus: state.assets.small.fallbackStatus,
                        atlasSrc: state.assets.small.atlasSrc,
                        metaSrc: state.assets.small.atlasMetaSrc,
                        fallbackSrc: state.assets.small.fallbackSrc
                    },
                    large: {
                        mode: state.assets.large.readyMode,
                        atlasStatus: state.assets.large.atlasStatus,
                        metaStatus: state.assets.large.metaStatus,
                        fallbackStatus: state.assets.large.fallbackStatus,
                        atlasSrc: state.assets.large.atlasSrc,
                        metaSrc: state.assets.large.atlasMetaSrc,
                        fallbackSrc: state.assets.large.fallbackSrc
                    }
                },
                laneWidth: state.layout.laneWidth,
                laneHeight: state.layout.laneHeight,
                smallBirdX: state.layout.smallBirdX,
                largeBirdX: state.layout.largeBirdX,
                minGap: state.layout.minGap,
                catchX: state.layout.catchX,
                caught: state.caught,
                maxGap: state.layout.maxGap,
                winReady: checkWin(),
                motionTimeMs: state.motionTimeMs
            };
        }

        const api = {
            mount,
            destroy,
            reset,
            onCorrect,
            onWrong,
            checkCaught,
            checkWin,
            setProgress,
            setLargeBirdX,
            advanceTime,
            pause,
            resume,
            setDebug,
            getState
        };

        return api;
    }

    window.createBirdEscapeSystem = createBirdEscapeSystem;
})();
