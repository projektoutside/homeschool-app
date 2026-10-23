(function () {
    const GAME_EXIT_TO_HOME_MESSAGE = 'LAHS_GAME_EXIT_TO_HOME';
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const activities = window.PreschoolActivities;
    const ACTIVITY_TYPES = activities.types;
    const TOKEN_POOL = ['🚂', '🦆', '🦋', '🍓', '🌼', '🎵', '⭐', '🌈', '🫧', '🧸'];
    const ACTIVITY_META = {
        alphabet: {
            pill: 'Alphabet Parade',
            prompt: 'Find the missing letter.',
            description: 'Tap or drag the right one.',
            hint: 'Tap or drag.',
            coachTip: 'Sing the letters if you want a hint.',
            successEmoji: '🎉',
            successTitle: 'Alphabet Hero!'
        },
        counting: {
            pill: 'Counting Carnival',
            prompt: 'Find the missing number.',
            description: 'Tap or drag the right one.',
            hint: 'Tap or drag.',
            coachTip: 'Count the pictures one by one.',
            successEmoji: '🌟',
            successTitle: 'Counting Champ!'
        },
        pattern: {
            pill: 'Pattern Party',
            prompt: 'Find the missing picture.',
            description: 'Tap or drag the right one.',
            hint: 'Tap or drag.',
            coachTip: 'Look for the part that repeats.',
            successEmoji: '🪩',
            successTitle: 'Pattern Pro!'
        }
    };
    const CHEERS = [
        'Ready to play.',
        'Find what is missing.',
        'Tap or drag one.',
        'You can do it.'
    ];
    Object.assign(ACTIVITY_META, {
        quantity: { pill: 'Garden Counter', prompt: 'How many pictures?', description: 'Count each picture once.', hint: 'Count, then choose.', coachTip: 'Touch each picture with your finger as you count.', successEmoji: '🌻', successTitle: 'Counting Explorer!' },
        matching: { pill: 'Picture Pairs', prompt: 'Find the matching picture.', description: 'Look for its exact twin.', hint: 'Find its twin.', coachTip: 'Look for the same shape and color.', successEmoji: '🦋', successTitle: 'Perfect Pair!' },
        odd: { pill: 'Picture Detective', prompt: 'Which picture is different?', description: 'One picture does not match the others.', hint: 'Spot the different one.', coachTip: 'Three pictures match. Find the other one.', successEmoji: '🔎', successTitle: 'Super Detective!' }
    });
    const CORRECT_LINES = [
        'You got it!',
        'That fits just right.',
        'Great job!',
        'Puzzle solved!'
    ];
    const WRONG_LINES = [
        'Try another one.',
        'Not yet.',
        'Look again.',
        'Almost.'
    ];
    const COLORS = ['#ff6ea8', '#ffb34d', '#ffd94f', '#56d18c', '#4aa7ff', '#7d74ff'];
    const BLANK_MARKER = '_';
    const SYMBOL_SHAPE_STYLES = [
        { front: '#ff665b', frontDark: '#ff3b2f', highlight: '#ffd9d2', side: '#d92e24', base: '#ac2119', rim: 'rgba(255, 255, 255, 0.94)', plate: '#ffd63f', plateDark: '#ffb905', plateHighlight: '#fff5b5', plateSide: '#eb9800', plateBase: '#ca6e00' },
        { front: '#55c7ff', frontDark: '#1297fa', highlight: '#dff3ff', side: '#0b6dd5', base: '#084c9c', rim: 'rgba(255, 255, 255, 0.94)', plate: '#ffd63f', plateDark: '#ffb905', plateHighlight: '#fff5b5', plateSide: '#eb9800', plateBase: '#ca6e00' },
        { front: '#ffe953', frontDark: '#ffc91b', highlight: '#fffbd0', side: '#eda201', base: '#c47800', rim: 'rgba(255, 255, 255, 0.92)', plate: '#4cb4ff', plateDark: '#1d84f2', plateHighlight: '#e8f7ff', plateSide: '#1468cb', plateBase: '#0d4c97' },
        { front: '#9ae12a', frontDark: '#69ca1d', highlight: '#f1ffc2', side: '#45a911', base: '#2f780b', rim: 'rgba(255, 255, 255, 0.93)', plate: '#ffd63f', plateDark: '#ffb905', plateHighlight: '#fff5b5', plateSide: '#eb9800', plateBase: '#ca6e00' },
        { front: '#ffaf31', frontDark: '#ff8118', highlight: '#fff0ca', side: '#eb6e08', base: '#b94c05', rim: 'rgba(255, 255, 255, 0.94)', plate: '#8f7eff', plateDark: '#6b53f1', plateHighlight: '#efeaff', plateSide: '#5038cc', plateBase: '#3c2799' },
        { front: '#a084ff', frontDark: '#7557f4', highlight: '#efe9ff', side: '#5937cd', base: '#40269a', rim: 'rgba(255, 255, 255, 0.94)', plate: '#ffd63f', plateDark: '#ffb905', plateHighlight: '#fff5b5', plateSide: '#eb9800', plateBase: '#ca6e00' }
    ];
    const IDLE_AMBIENT_MIN_MS = 8500;
    const IDLE_AMBIENT_MAX_MS = 14000;
    const POINTER_DRAG_DISTANCE_PX = 12;
    const DROP_TARGET_PADDING_PX = 24;
    const SUPPRESSED_CLICK_MS = 450;
    const PRESCHOOL_CORRECT_POINTS = 10;

    window.LAHSPointsBridge?.init({ gameId: 'preschool-fun-game' });

    const dom = {
        canvas: document.getElementById('sky-canvas'),
        startOverlay: document.getElementById('start-overlay'),
        startButton: document.getElementById('start-button'),
        modePicker: document.getElementById('mode-picker'),
        modeNote: document.getElementById('mode-note'),
        chooseMode: document.getElementById('choose-mode-button'),
        challengePanel: document.getElementById('challenge-panel'),
        challengeStages: document.getElementById('challenge-stages'),
        challengeDetails: document.getElementById('challenge-details'),
        challengeSave: document.getElementById('challenge-save'),
        masterBadge: document.getElementById('master-badge'),
        flightTitle: document.getElementById('flight-title'),
        tutorialListen: document.getElementById('tutorial-listen'),
        questionListen: document.getElementById('question-listen'),
        autoVoice: document.getElementById('auto-voice'),
        gameShell: document.querySelector('.game-shell'),
        helpButton: document.getElementById('help-button'),
        feedback: document.getElementById('answer-feedback'),
        flightMessage: document.getElementById('flight-message'),
        flightStats: document.getElementById('flight-stats'),
        practiceCheck: document.getElementById('practice-check'),
        practiceGap: document.getElementById('practice-gap'),
        practiceFeedback: document.getElementById('practice-feedback'),
        soundToggle: document.getElementById('sound-toggle'),
        homeButton: document.getElementById('home-button'),
        roundValue: document.getElementById('round-value'),
        starsValue: document.getElementById('stars-value'),
        streakValue: document.getElementById('streak-value'),
        mascotTitle: document.getElementById('mascot-title'),
        mascotMessage: document.getElementById('mascot-message'),
        mascotMouth: document.getElementById('mascot-mouth'),
        activityPill: document.getElementById('activity-pill'),
        promptHint: document.getElementById('prompt-hint'),
        promptTitle: document.getElementById('prompt-title'),
        promptDescription: document.getElementById('prompt-description'),
        sequenceTrack: document.getElementById('sequence-track'),
        activityDisplay: document.getElementById('activity-display'),
        skillCollection: document.getElementById('skill-collection'),
        storyVisual: document.getElementById('story-visual'),
        coachTip: document.getElementById('coach-tip'),
        choicesGrid: document.getElementById('choices-grid'),
        birdEscapeLane: document.getElementById('bird-escape-lane'),
        statusText: document.getElementById('status-text'),
        submitButton: document.getElementById('submit-button'),
        nextButton: document.getElementById('next-button'),
        celebrationOverlay: document.getElementById('celebration-overlay'),
        celebrationEmoji: document.getElementById('celebration-emoji'),
        celebrationTitle: document.getElementById('celebration-title'),
        celebrationCopy: document.getElementById('celebration-copy'),
        sessionWinOverlay: document.getElementById('session-win-overlay'),
        sessionWinEmoji: document.getElementById('session-win-emoji'),
        sessionWinTitle: document.getElementById('session-win-title'),
        sessionWinCopy: document.getElementById('session-win-copy'),
        sessionPlayAgainButton: document.getElementById('session-play-again-button'),
        sessionMainMenuButton: document.getElementById('session-main-menu-button'),
        sessionLoseOverlay: document.getElementById('session-lose-overlay'),
        sessionLoseEmoji: document.getElementById('session-lose-emoji'),
        sessionLoseTitle: document.getElementById('session-lose-title'),
        sessionLoseCopy: document.getElementById('session-lose-copy'),
        sessionTryAgainButton: document.getElementById('session-try-again-button'),
        sessionLoseMainMenuButton: document.getElementById('session-lose-main-menu-button'),
        srStatus: document.getElementById('sr-status')
    };

    const challenge = window.PreschoolChallenge;
    let progressStorage;
    try { progressStorage = window.localStorage; } catch (_) { /* Session-only progress. */ }
    const state = {
        playMode: 'free',
        challengeLevel: 0,
        challengeCompleted: challenge.readProgress(progressStorage),
        challengeRun: null,
        challengeCatching: false,
        started: false,
        tutorialVisible: true,
        voiceEnabled: true,
        hostPaused: false,
        pendingAdvance: false,
        practiceChoice: null,
        wrongChoices: [],
        round: 1,
        stars: 0,
        streak: 0,
        currentPuzzle: null,
        draggedChoiceId: null,
        chosenChoiceId: null,
        locked: false,
        audioUnlocked: false,
        ambientTimer: randomRange(IDLE_AMBIENT_MIN_MS, IDLE_AMBIENT_MAX_MS),
        confetti: [],
        activityCursor: 0,
        activityDeck: [],
        lastActivity: null,
        missionNumber: 0,
        patternCursor: 0,
        recentPuzzles: [],
        skillFeathers: new Set(),
        cheerCursor: 0,
        autoAdvanceTimer: null,
        birdEscape: null,
        sessionWon: false,
        sessionActive: false,
        sessionLost: false,
        sessionWinOverlayVisible: false,
        sessionLoseOverlayVisible: false,
        lossOverlayTimer: null,
        lossPauseTimer: null,
        lossShakeTimer: null,
        lossFlashTimer: null,
        puzzleToken: 0,
        sound: {
            muted: false,
            musicVolume: 0.2,
            sfxVolume: 0.75
        }
    };
    let pointerDrag = null;
    let activeDropSlot = null;
    let suppressedClick = { choiceId: null, until: 0 };

    const background = {
        ctx: dom.canvas.getContext('2d'),
        width: 1,
        height: 1,
        time: 0,
        clouds: [],
        sparkles: [],
        lastFrame: 0
    };

    const sound = createSoundEngine();
    const choicePieceRenderer = createChoicePieceRenderer();

    function createSoundEngine() {
        return window.createPreschoolAudio({
            getSettings: () => state.sound,
            canPlay: () => !state.hostPaused && !document.hidden,
            isPlaying: () => state.started && state.sessionActive && !state.tutorialVisible,
            onVoiceChange: refreshVoiceControls
        });
    }

    function createChoicePieceRenderer() {
        const T = window.THREE;
        if (!T) {
            return {
                cancel() {},
                renderChoices() {}
            };
        }

        const GlossMaterial = T.MeshPhysicalMaterial || T.MeshStandardMaterial;
        const cache = new Map();
        const planeGeometry = new T.PlaneGeometry(3.5, 3.5);
        const fontsReady = document.fonts?.ready ?? Promise.resolve();
        let renderer = null;
        let scene = null;
        let camera = null;
        let batchId = 0;

        function ensureRenderer() {
            if (renderer) return true;
            try {
                renderer = new T.WebGLRenderer({
                    alpha: true,
                    antialias: true,
                    powerPreference: 'low-power',
                    premultipliedAlpha: true,
                    preserveDrawingBuffer: true
                });
            } catch {
                return false;
            }

            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
            renderer.setClearColor(0x000000, 0);
            if ('outputColorSpace' in renderer && T.SRGBColorSpace) {
                renderer.outputColorSpace = T.SRGBColorSpace;
            } else if ('outputEncoding' in renderer && T.sRGBEncoding) {
                renderer.outputEncoding = T.sRGBEncoding;
            }

            scene = new T.Scene();
            camera = new T.PerspectiveCamera(18, 1, 0.1, 48);
            camera.position.set(0.1, 0.16, 9.05);
            camera.lookAt(0, 0, 0);

            scene.add(new T.AmbientLight(0xffffff, 1.35));
            if (T.HemisphereLight) {
                scene.add(new T.HemisphereLight(0xffffff, 0xffc763, 1.08));
            }

            const keyLight = new T.DirectionalLight(0xffffff, 1.55);
            keyLight.position.set(3.4, 5.2, 6.8);
            scene.add(keyLight);

            const fillLight = new T.DirectionalLight(0xfff1c8, 0.95);
            fillLight.position.set(-4.6, 1.6, 4.2);
            scene.add(fillLight);

            const coolLight = new T.DirectionalLight(0xc7e5ff, 0.58);
            coolLight.position.set(-1.2, -3.2, 5.4);
            scene.add(coolLight);

            return true;
        }

        function renderChoices(puzzle, entries) {
            const currentBatch = ++batchId;
            entries.forEach(({ choice }) => {
                const stage = choice.querySelector('.choice-stage');
                const image = choice.querySelector('.choice-three-image');
                const fallback = choice.querySelector('.choice-three-fallback');
                stage?.classList.remove('is-ready');
                if (image) {
                    image.removeAttribute('src');
                    image.hidden = true;
                }
                if (fallback) fallback.hidden = false;
            });

            Promise.resolve(fontsReady).then(() => {
                if (currentBatch !== batchId) return;
                entries.forEach(({ choice, option, index }) => {
                    const stage = choice.querySelector('.choice-stage');
                    const image = choice.querySelector('.choice-three-image');
                    const fallback = choice.querySelector('.choice-three-fallback');
                    if (!stage || !image) return;
                    const style = getSymbolShapeStyle(index, puzzle.type);
                    const src = renderGlyphImage(option.value, style, index);
                    if (!src || currentBatch !== batchId) return;
                    image.src = src;
                    image.hidden = false;
                    fallback && (fallback.hidden = true);
                    stage.classList.add('is-ready');
                });
            }).catch(() => {});
        }

        function cancel() {
            batchId += 1;
        }

        function renderGlyphImage(glyph, style, index) {
            const size = window.innerWidth < 520 ? 320 : 400;
            const pose = getGlyphPose(glyph);
            const cacheKey = [
                glyph,
                size,
                style.front,
                style.frontDark,
                style.side,
                style.base,
                style.plate,
                style.plateDark,
                style.plateSide,
                style.plateBase,
                pose.fontScale,
                pose.yOffset,
                index % 2
            ].join(':');
            if (cache.has(cacheKey)) return cache.get(cacheKey);
            if (!ensureRenderer()) return null;

            renderer.setSize(size, size, false);

            const frontAlphaTexture = canvasToTexture(drawGlyphCanvas(glyph, size, (ctx, dimension) => {
                drawGlyph(ctx, glyph, dimension, {
                    fill: '#ffffff',
                    fontScale: pose.fontScale,
                    yOffset: pose.yOffset
                });
            }));

            const plateAlphaTexture = canvasToTexture(drawGlyphCanvas(glyph, size, (ctx, dimension) => {
                drawGlyph(ctx, glyph, dimension, {
                    fill: '#ffffff',
                    stroke: '#ffffff',
                    strokeWidth: dimension * pose.plateStrokeWidth,
                    fontScale: pose.fontScale,
                    yOffset: pose.yOffset
                });
            }));

            const plateFaceTexture = canvasToTexture(drawGlyphCanvas(glyph, size, (ctx, dimension) => {
                drawGlyph(ctx, glyph, dimension, {
                    stroke: style.plateSide,
                    strokeWidth: dimension * pose.plateStrokeWidth,
                    fillGradient: [style.plateHighlight, style.plate, style.plateDark],
                    fontScale: pose.fontScale,
                    yOffset: pose.yOffset
                });
            }));

            const frontFaceTexture = canvasToTexture(drawGlyphCanvas(glyph, size, (ctx, dimension) => {
                drawGlyph(ctx, glyph, dimension, {
                    stroke: style.rim,
                    strokeWidth: dimension * 0.028,
                    fillGradient: [style.highlight, style.front, style.frontDark],
                    fontScale: pose.fontScale,
                    yOffset: pose.yOffset
                });
            }));

            const group = buildGlyphGroup({
                pose,
                style,
                index,
                plateAlphaTexture,
                plateFaceTexture,
                frontAlphaTexture,
                frontFaceTexture
            });
            scene.add(group);
            renderer.render(scene, camera);
            const dataUrl = renderer.domElement.toDataURL('image/png');
            cache.set(cacheKey, dataUrl);

            scene.remove(group);
            disposeGroup(group);
            plateAlphaTexture.dispose();
            plateFaceTexture.dispose();
            frontAlphaTexture.dispose();
            frontFaceTexture.dispose();

            if (cache.size > 140) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }

            return dataUrl;
        }

        function buildGlyphGroup(config) {
            const {
                pose,
                style,
                index,
                plateAlphaTexture,
                plateFaceTexture,
                frontAlphaTexture,
                frontFaceTexture
            } = config;
            const group = new T.Group();
            const plateRoot = new T.Group();
            const frontRoot = new T.Group();
            const materials = [];

            plateRoot.position.set(0, -0.015, -0.08);
            plateRoot.scale.setScalar(pose.scale * 1.035);
            frontRoot.position.set(0, 0, 0.11);
            frontRoot.scale.setScalar(pose.scale);

            addExtrudedStack(plateRoot, {
                alphaTexture: plateAlphaTexture,
                faceTexture: plateFaceTexture,
                sideStart: style.plateSide,
                sideEnd: style.plateBase,
                depthCount: 9,
                xStep: 0.008,
                yStep: -0.012,
                zStep: -0.028,
                scaleShrink: 0.001,
                faceOffsetZ: 0.04,
                roughness: 0.62,
                clearcoat: 0,
                materials
            });

            addExtrudedStack(frontRoot, {
                alphaTexture: frontAlphaTexture,
                faceTexture: frontFaceTexture,
                sideStart: style.side,
                sideEnd: style.base,
                depthCount: 5,
                xStep: 0.005,
                yStep: -0.008,
                zStep: -0.02,
                scaleShrink: 0.001,
                faceOffsetZ: 0.06,
                roughness: 0.54,
                clearcoat: 0,
                materials
            });

            group.add(plateRoot);
            group.add(frontRoot);

            group.rotation.x = -0.025;
            group.rotation.y = index % 2 === 0 ? -0.035 : 0.03;
            group.rotation.z = index % 2 === 0 ? 0.004 : -0.003;
            group.position.set(pose.offsetX, pose.offsetY, 0);
            group.scale.setScalar(pose.groupScale);
            group.userData.materials = materials;
            return group;
        }

        function addExtrudedStack(root, options) {
            const {
                alphaTexture,
                faceTexture,
                sideStart,
                sideEnd,
                depthCount,
                xStep,
                yStep,
                zStep,
                scaleShrink,
                faceOffsetZ,
                roughness,
                clearcoat,
                materials
            } = options;

            for (let depth = depthCount; depth >= 1; depth -= 1) {
                const mix = depth / depthCount;
                const color = new T.Color(sideStart).lerp(new T.Color(sideEnd), mix * 0.74);
                const material = new T.MeshStandardMaterial({
                    color,
                    alphaMap: alphaTexture,
                    transparent: true,
                    alphaTest: 0.16,
                    roughness: clamp(roughness + 0.26, 0, 1),
                    metalness: 0.02,
                    side: T.DoubleSide
                });
                materials.push(material);
                const mesh = new T.Mesh(planeGeometry, material);
                const shrink = 1 - ((depthCount - depth) * scaleShrink);
                mesh.scale.setScalar(shrink);
                mesh.position.set(depth * xStep, depth * yStep, depth * zStep);
                root.add(mesh);
            }

            const faceMaterial = new GlossMaterial({
                map: faceTexture,
                alphaMap: faceTexture,
                transparent: true,
                alphaTest: 0.1,
                roughness,
                metalness: 0.03,
                side: T.DoubleSide
            });
            if ('clearcoat' in faceMaterial) {
                faceMaterial.clearcoat = clearcoat;
                faceMaterial.clearcoatRoughness = 1;
            }
            materials.push(faceMaterial);
            const faceMesh = new T.Mesh(planeGeometry, faceMaterial);
            faceMesh.position.z = faceOffsetZ;
            root.add(faceMesh);
        }

        function getGlyphPose(glyph) {
            if (glyph === '1') {
                return { fontScale: 0.7, yOffset: 0.565, plateStrokeWidth: 0.124, scale: 1.12, groupScale: 1.03, offsetX: 0.06, offsetY: -0.01 };
            }
            if (glyph === '2') {
                return { fontScale: 0.655, yOffset: 0.555, plateStrokeWidth: 0.116, scale: 1.08, groupScale: 1.03, offsetX: 0.03, offsetY: -0.01 };
            }
            if (glyph === '7') {
                return { fontScale: 0.625, yOffset: 0.565, plateStrokeWidth: 0.11, scale: 1.04, groupScale: 1.01, offsetX: 0.02, offsetY: -0.02 };
            }
            if (/^[0-9]$/.test(glyph)) {
                return { fontScale: 0.635, yOffset: 0.555, plateStrokeWidth: 0.11, scale: 1.05, groupScale: 1.01, offsetX: 0.01, offsetY: -0.01 };
            }
            if (/[A-Z]/.test(glyph)) {
                return { fontScale: 0.64, yOffset: 0.548, plateStrokeWidth: 0.108, scale: 1.04, groupScale: 1.01, offsetX: 0, offsetY: -0.01 };
            }
            return { fontScale: 0.63, yOffset: 0.552, plateStrokeWidth: 0.108, scale: 1.03, groupScale: 1.01, offsetX: 0, offsetY: -0.01 };
        }

        function disposeGroup(group) {
            const materials = group.userData.materials ?? [];
            materials.forEach((material) => material.dispose());
        }

        function canvasToTexture(canvas) {
            const texture = new T.CanvasTexture(canvas);
            texture.needsUpdate = true;
            texture.minFilter = T.LinearFilter;
            texture.magFilter = T.LinearFilter;
            texture.generateMipmaps = false;
            return texture;
        }

        function drawGlyphCanvas(glyph, size, painter) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            painter(ctx, size, glyph);
            return canvas;
        }

        function drawGlyph(ctx, glyph, size, options) {
            const x = size / 2;
            const y = size * (options.yOffset ?? 0.54);
            ctx.clearRect(0, 0, size, size);
            ctx.font = `800 ${Math.floor(size * (options.fontScale ?? 0.66))}px "Baloo 2"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.miterLimit = 2;

            if (options.stroke) {
                ctx.lineWidth = options.strokeWidth;
                ctx.strokeStyle = options.stroke;
                ctx.strokeText(glyph, x, y);
            }

            if (options.fillGradient) {
                const gradient = ctx.createLinearGradient(size * 0.18, size * 0.1, size * 0.82, size * 0.9);
                gradient.addColorStop(0, options.fillGradient[0]);
                gradient.addColorStop(0.42, options.fillGradient[1]);
                gradient.addColorStop(1, options.fillGradient[2]);
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = options.fill;
            }

            ctx.fillText(glyph, x, y);

            if (options.withShine) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.translate(x, y + (options.shineOffsetY ?? -size * 0.16));
                ctx.rotate(options.shineRotate ?? -0.15);
                const shine = ctx.createLinearGradient(-size * 0.28, 0, size * 0.28, 0);
                shine.addColorStop(0, 'rgba(255, 255, 255, 0)');
                shine.addColorStop(0.5, `rgba(255, 255, 255, ${options.shineOpacity ?? 0.38})`);
                shine.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = shine;
                ctx.fillRect(
                    -size * (options.shineWidth ?? 0.25),
                    -size * (options.shineHeight ?? 0.05),
                    size * ((options.shineWidth ?? 0.25) * 2),
                    size * ((options.shineHeight ?? 0.05) * 2)
                );
                ctx.restore();
            }
        }

        return {
            cancel,
            renderChoices
        };
    }

    function init() {
        setupBackground();
        registerUi();
        exposeHooks();
        updateSoundToggle();
        showStartScreen();
        requestAnimationFrame(tick);
    }

    function registerUi() {
        renderModePicker();
        document.querySelectorAll('[data-play-mode]').forEach(button => button.addEventListener('click', () => {
            if (state.started) return;
            sound.stopVoice(); state.playMode = button.dataset.playMode; renderModePicker();
        }));
        dom.challengeStages.addEventListener('click', event => {
            const button = event.target.closest('[data-stage]');
            if (!button || state.started || button.disabled) return;
            const level = Number(button.dataset.stage);
            if (level < 0 || level > Math.min(state.challengeCompleted, challenge.levels.length - 1)) return;
            state.challengeLevel = level; sound.stopVoice(); renderModePicker();
        });
        dom.chooseMode.addEventListener('click', showStartScreen);
        document.querySelectorAll('[data-choose-mode]').forEach(button => button.addEventListener('click', showStartScreen));
        dom.tutorialListen.addEventListener('click', () => {
            unlockAudio();
            if (sound.describe().voice.kind === 'tutorial') sound.stopVoice();
            else sound.speak([state.playMode === 'challenge' ? 'challenge-tutorial' : 'tutorial'], 'tutorial', () => state.tutorialVisible);
        });
        dom.questionListen.addEventListener('click', () => {
            unlockAudio();
            if (sound.describe().voice.kind === 'question') sound.stopVoice();
            else readQuestion(true);
        });
        dom.autoVoice.addEventListener('click', () => {
            unlockAudio(); state.voiceEnabled = !state.voiceEnabled;
            sound.stopVoice(); refreshVoiceControls();
            if (state.voiceEnabled) readQuestion();
        });
        dom.startButton.addEventListener('click', () => {
            unlockAudio();
            sound.boop();
            if (state.started) closeTutorial();
            else startGame();
        });
        dom.helpButton.addEventListener('click', openTutorial);
        document.querySelectorAll('[data-practice-choice]').forEach(button => button.addEventListener('click', () => {
            unlockAudio(); sound.drop();
            state.practiceChoice = button.dataset.practiceChoice;
            dom.practiceGap.textContent = state.practiceChoice;
            document.querySelectorAll('[data-practice-choice]').forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
            dom.practiceCheck.disabled = false;
            if (state.voiceEnabled) sound.speak([`letter-${state.practiceChoice}`, 'check'], 'practice', () => state.tutorialVisible);
        }));
        dom.practiceCheck.addEventListener('click', () => {
            const correct = state.practiceChoice === 'B';
            document.getElementById('tutorial-flight').classList.toggle('is-boosted', correct);
            dom.practiceFeedback.textContent = correct ? 'Yes! B fits. Our little bird has more room to fly!' : 'Try B. It fits between A and C.';
            if (correct) sound.success(); else sound.wrong();
            if (state.voiceEnabled) sound.speak([correct ? 'practice-yes' : 'practice-retry'], 'practice', () => state.tutorialVisible);
        });
        dom.soundToggle.addEventListener('click', () => {
            unlockAudio();
            state.sound.muted = !state.sound.muted;
            updateSoundToggle();
            announce(state.sound.muted ? 'Sound off.' : 'Sound on.');
            if (!state.sound.muted) sound.boop();
        });
        dom.homeButton.addEventListener('click', exitToGames);
        dom.submitButton.addEventListener('click', () => {
            submitChoice();
        });
        dom.nextButton.addEventListener('click', () => {
            if (!state.started) return;
            unlockAudio();
            sound.boop();
            createPuzzle(true);
        });
        dom.sessionPlayAgainButton.addEventListener('click', () => {
            if (state.playMode === 'challenge' && state.sessionWon && state.challengeLevel < challenge.levels.length - 1) {
                state.challengeLevel++; state.birdEscape?.destroy(); state.birdEscape = null;
            }
            unlockAudio();
            sound.boop();
            restartSession();
        });
        dom.sessionMainMenuButton.addEventListener('click', () => {
            unlockAudio();
            sound.boop();
            exitToGames();
        });
        dom.sessionTryAgainButton.addEventListener('click', () => {
            unlockAudio();
            sound.boop();
            restartSession();
        });
        dom.sessionLoseMainMenuButton.addEventListener('click', () => {
            unlockAudio();
            sound.boop();
            exitToGames();
        });
        ['pointerdown', 'touchstart', 'keydown'].forEach((eventName) => {
            window.addEventListener(eventName, unlockAudio, { passive: true });
        });
        window.addEventListener('resize', resizeCanvas, { passive: true });
        window.addEventListener('message', handleHostSoundMessage);
        document.addEventListener('visibilitychange', syncPauseState);
        window.addEventListener('pagehide', event => { if (!event.persisted) sound.dispose(); });
        document.addEventListener('keydown', event => {
            if (!state.tutorialVisible) return;
            if (event.key === 'Escape' && state.started) { event.preventDefault(); closeTutorial(); return; }
            if (event.key !== 'Tab') return;
            const targets = [...dom.startOverlay.querySelectorAll('button:not(:disabled), [tabindex="0"]')];
            const first = targets[0], last = targets[targets.length - 1];
            if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
                event.preventDefault(); (event.shiftKey ? last : first).focus();
            }
        });
    }

    function exposeHooks() {
        window.setAudioMuted = (muted) => {
            state.sound.muted = Boolean(muted);
            updateSoundToggle();
        };
        window.setMusicVolume = (volume) => { state.sound.musicVolume = clamp(Number(volume) || 0, 0, 1); sound.sync(); };
        window.setSfxVolume = (volume) => { state.sound.sfxVolume = clamp(Number(volume) || 0, 0, 1); sound.sync(); refreshVoiceControls(); };
        window.setBirdEscapeDebug = (enabled) => { state.birdEscape?.setDebug?.(Boolean(enabled)); };
        window.setBirdEscapePaused = (paused) => {
            state.hostPaused = Boolean(paused); syncPauseState();
        };
        window.render_game_to_text = () => {
            const birdState = state.birdEscape?.getState?.() ?? null;
            return JSON.stringify(
                state.started
                    ? {
                        mode: state.currentPuzzle?.type ?? 'idle',
                        playMode: state.playMode,
                        challenge: state.challengeRun?.describe() ?? null,
                        challengeCompleted: state.challengeCompleted,
                        variant: state.currentPuzzle?.variant ?? null,
                        answerKind: state.currentPuzzle?.answerKind ?? null,
                        display: (state.currentPuzzle?.display ?? []).map(item => ({ value: item.value, label: item.label })),
                        feathers: [...state.skillFeathers],
                        voiceInstruction: state.currentPuzzle?.voiceInstruction ?? state.currentPuzzle?.type,
                        voiceSequence: state.currentPuzzle?.voiceSequence !== false,
                        round: state.round,
                        stars: state.stars,
                        streak: state.streak,
                        locked: state.locked,
                        puzzleId: state.puzzleToken,
                        eliminated: [...state.wrongChoices],
                        tutorialVisible: state.tutorialVisible,
                        voiceEnabled: state.voiceEnabled,
                        paused: isPaused(),
                        sound: sound.describe(),
                        prompt: state.currentPuzzle?.prompt ?? '',
                        sequence: (state.currentPuzzle?.sequence ?? []).map((item) => ({
                            value: item.missing
                                ? (getSelectedChoice()?.value ?? BLANK_MARKER)
                                : item.value,
                            label: item.label,
                            missing: item.missing
                        })),
                        options: (state.currentPuzzle?.options ?? []).map((option) => ({ id: option.id, value: option.value, label: option.label })),
                        answer: state.currentPuzzle?.answer?.value ?? null,
                        selectedChoice: getSelectedChoice()?.value ?? null,
                        canSubmit: !dom.submitButton.disabled,
                        status: dom.statusText.textContent,
                        sessionWon: state.sessionWon,
                        sessionLost: state.sessionLost,
                        winOverlayVisible: state.sessionWinOverlayVisible,
                        loseOverlayVisible: state.sessionLoseOverlayVisible,
                        bird: birdState
                            ? {
                                smallBirdX: birdState.smallBirdX,
                                largeBirdX: birdState.largeBirdX,
                                minGap: birdState.minGap,
                                catchX: birdState.catchX,
                                caught: birdState.caught,
                                winReady: birdState.winReady,
                                sessionWon: state.sessionWon,
                                sessionLost: state.sessionLost,
                                paused: birdState.paused,
                                debug: birdState.debug,
                                assetsReady: birdState.assetsReady,
                                assets: birdState.assets
                            }
                            : {
                                smallBirdX: null,
                                largeBirdX: null,
                                minGap: null,
                                catchX: null,
                                caught: false,
                                winReady: false,
                                sessionWon: state.sessionWon,
                                sessionLost: state.sessionLost,
                                paused: false,
                                debug: false,
                                assetsReady: false,
                                assets: null
                            },
                        coordinateSystem: 'DOM left-to-right sequence with the Bird Escape flight lane below the Pick One panel.'
                    }
                    : {
                        mode: 'start', playMode: state.playMode, challengeLevel: state.challengeLevel, challengeCompleted: state.challengeCompleted,
                        tutorialVisible: true,
                        voiceEnabled: state.voiceEnabled,
                        sound: sound.describe(),
                        prompt: 'Tap start to play.',
                        status: 'Start screen visible.',
                        options: [{ id: 'start-button', value: 'Start Playing', label: 'Start Playing' }],
                        coordinateSystem: 'Large start button centered on the screen.'
                    }
            );
        };
        window.advanceTime = (ms) => {
            const deltaMs = Math.max(0, Number(ms) || 0);
            updateAmbient(deltaMs);
            updateConfetti(deltaMs / 1000);
            drawBackground(deltaMs / 1000);
            for (let elapsed = 0; elapsed < deltaMs; elapsed += 32) {
                const step = Math.min(32, deltaMs - elapsed);
                updateChallenge(step); state.birdEscape?.advanceTime?.(step);
            }
        };
    }

    function handleHostSoundMessage(event) {
        if (!event?.data || typeof event.data !== 'object' || event.source !== window.parent || window.parent === window) return;
        let parentOrigin = window.location.origin;
        try { if (document.referrer) parentOrigin = new URL(document.referrer).origin; } catch (_) { /* Use local origin. */ }
        if (event.origin !== parentOrigin) return;
        if (event.data.type === 'LAHS_HOST_LIFECYCLE') {
            if (!['pause', 'resume'].includes(event.data.phase)) return;
            state.hostPaused = event.data.phase === 'pause'; syncPauseState(); return;
        }
        if (event.data.type !== 'APP_SOUND_SETTINGS_UPDATE') return;
        const payload = event.data.payload ?? {};
        if (typeof payload.muted === 'boolean') state.sound.muted = payload.muted;
        if (typeof payload.musicVolume === 'number') state.sound.musicVolume = clamp(payload.musicVolume, 0, 1);
        if (typeof payload.sfxVolume === 'number') state.sound.sfxVolume = clamp(payload.sfxVolume, 0, 1);
        updateSoundToggle();
    }

    function unlockAudio() {
        if (!sound.ensure()) return;
        state.audioUnlocked = true;
    }

    function updateSoundToggle() {
        const on = !state.sound.muted;
        dom.soundToggle.setAttribute('aria-pressed', String(on));
        dom.soundToggle.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
        dom.soundToggle.querySelector('.icon-pill__emoji').textContent = on ? '🔊' : '🔇';
        dom.soundToggle.querySelector('.icon-pill__label').textContent = on ? 'Sound On' : 'Sound Off';
        sound.sync();
        refreshVoiceControls();
    }

    function refreshVoiceControls() {
        const audio = sound.describe(), voice = audio.voice;
        const available = audio.supported && !state.sound.muted && state.sound.sfxVolume > 0;
        for (const [button, kind, label] of [[dom.tutorialListen, 'tutorial', 'Listen to the story'], [dom.questionListen, 'question', 'Listen']]) {
            const busy = voice.kind === kind && voice.state !== 'idle';
            button.disabled = !available || (kind === 'question' && (!state.sessionActive || state.locked));
            button.setAttribute('aria-pressed', String(busy));
            button.querySelector('span').textContent = !audio.supported ? 'Voice unavailable' : !available ? 'Sound off' : busy ? 'Stop voice' : label;
            button.setAttribute('aria-label', busy ? 'Stop reading aloud' : kind === 'tutorial' ? 'Read the tutorial aloud' : 'Read the question aloud');
            button.title = voice.error || '';
        }
        dom.autoVoice.textContent = `Auto voice: ${state.voiceEnabled ? 'On' : 'Off'}`;
        dom.autoVoice.setAttribute('aria-pressed', String(state.voiceEnabled));
        dom.autoVoice.setAttribute('aria-label', `Automatic reading ${state.voiceEnabled ? 'on. Turn automatic reading off.' : 'off. Turn automatic reading on.'}`);
    }

    function voiceKey(item, type) {
        if (type === 'alphabet') return `letter-${item.value}`;
        if (type === 'counting' || type === 'quantity') return `number-${item.value}`;
        return item.label.replaceAll(' ', '-');
    }

    function readQuestion(manual = false) {
        if ((!manual && !state.voiceEnabled) || isPaused() || !state.sessionActive || state.locked || !state.currentPuzzle) return;
        const puzzle = state.currentPuzzle, token = state.puzzleToken;
        const row = puzzle.voiceSequence === false ? [] : puzzle.sequence.map(item => item.missing ? 'blank' : voiceKey(item, puzzle.answerKind));
        const ids = [puzzle.voiceInstruction || puzzle.type, ...row, 'choose'];
        sound.speak(ids, 'question', () => token === state.puzzleToken && state.sessionActive && !state.locked && !isPaused());
    }

    function isPaused() { return state.hostPaused || document.hidden || state.tutorialVisible; }

    function syncPauseState() {
        background.lastFrame = 0;
        if (state.hostPaused || document.hidden || (!state.sessionActive && !state.tutorialVisible)) sound.stopVoice();
        if (isPaused() || !state.sessionActive) state.birdEscape?.pause?.();
        else state.birdEscape?.resume?.();
        sound.sync();
        if (!isPaused() && state.pendingAdvance && state.sessionActive) {
            state.pendingAdvance = false; createPuzzle(false);
        }
    }

    function renderModePicker() {
        dom.modePicker.hidden = state.started; dom.chooseMode.hidden = !state.started;
        document.querySelectorAll('[data-play-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.playMode === state.playMode)));
        dom.challengePanel.hidden = state.playMode !== 'challenge';
        dom.challengeStages.replaceChildren(...challenge.levels.map((level, index) => {
            const button = document.createElement('button');
            const complete = index < state.challengeCompleted;
            button.type = 'button'; button.dataset.stage = String(index);
            button.disabled = index > state.challengeCompleted;
            button.setAttribute('aria-pressed', String(index === state.challengeLevel));
            button.setAttribute('aria-label', `Stage ${index + 1}: ${level.name}. ${complete ? 'Completed' : button.disabled ? 'Locked' : 'Available'}`);
            button.innerHTML = `<strong>${complete ? '✓' : index + 1}</strong><span>${level.name}</span><small>${button.disabled ? 'Locked' : level.speed + '× chase'}</small>`;
            return button;
        }));
        const level = challenge.levels[state.challengeLevel];
        dom.challengeDetails.textContent = `Stage ${state.challengeLevel + 1}: ${level.name} · ${level.goal} correct answers · ${level.speed}× chase speed`;
        dom.masterBadge.hidden = state.challengeCompleted < challenge.levels.length;
        dom.masterBadge.innerHTML = challenge.crown + '<span>Ultimate Master</span>';
        dom.modeNote.textContent = state.playMode === 'challenge' ? 'The blue bird keeps coming! Correct answers push it back. Listening and Help pause the chase.' : 'Take your time. There’s no countdown.';
        if (!state.started) dom.startButton.textContent = state.playMode === 'challenge' ? `Start stage ${state.challengeLevel + 1}` : 'Start Playing';
    }

    function updateChallengeHud() {
        dom.flightTitle.textContent = state.challengeRun ? `Challenge ${state.challengeLevel + 1}/8` : 'Fly to safety!';
        if (state.challengeRun) {
            const run = state.challengeRun.describe(), level = challenge.levels[state.challengeLevel];
            dom.flightStats.textContent = `${run.correct}/${level.goal} solved · ${level.speed}× chase`;
        }
    }

    function updateChallenge(deltaMs) {
        if (!state.challengeRun || !state.sessionActive || isPaused() || state.challengeCatching) return;
        const bird = state.birdEscape?.getState();
        if (!bird?.assetsReady || !bird.laneWidth) return;
        const voice = sound.describe().voice;
        const racing = !state.locked && !(voice.kind === 'question' && voice.state !== 'idle');
        const run = state.challengeRun.advance(deltaMs, racing);
        const safeX = bird.laneWidth * .03;
        state.birdEscape.setLargeBirdX(safeX + (bird.catchX - safeX) * run.visualDanger);
        updateChallengeHud();
        if (run.caught) {
            state.challengeCatching = true; state.locked = true;
            cleanupPointerDrag(); sound.stopVoice(); updateActionButtons();
            const token = state.puzzleToken;
            Promise.resolve(state.birdEscape.onWrong()).then(() => {
                if (state.sessionActive && state.puzzleToken === token && state.challengeCatching) handleSessionLose();
            });
        }
    }

    function openTutorial() {
        if (!state.started || !state.sessionActive || state.locked) return;
        unlockAudio(); sound.boop(); sound.stopVoice();
        cleanupPointerDrag(); state.tutorialVisible = true;
        dom.gameShell.inert = true; dom.startOverlay.inert = false;
        dom.startOverlay.classList.remove('is-hidden'); dom.startOverlay.setAttribute('aria-hidden', 'false');
        dom.startButton.textContent = 'Back to game';
        dom.modePicker.hidden = true; dom.chooseMode.hidden = false;
        syncPauseState(); dom.startButton.focus({ preventScroll: true });
    }

    function closeTutorial() {
        sound.stopVoice();
        state.tutorialVisible = false; dom.gameShell.inert = false;
        dom.startOverlay.inert = true; dom.startOverlay.classList.add('is-hidden'); dom.startOverlay.setAttribute('aria-hidden', 'true');
        syncPauseState(); readQuestion(); dom.helpButton.focus({ preventScroll: true });
    }

    function showStartScreen() {
        sound.stopVoice();
        state.sessionActive = false;
        state.sessionWon = false;
        state.sessionLost = false;
        state.sessionWinOverlayVisible = false;
        state.sessionLoseOverlayVisible = false;
        state.puzzleToken += 1;
        window.clearTimeout(state.autoAdvanceTimer);
        state.autoAdvanceTimer = null;
        cleanupPointerDrag();
        hideCelebration();
        hideSessionWinOverlay();
        clearLoseEffects();
        state.birdEscape?.destroy(); state.birdEscape = null;
        state.challengeRun = null; state.challengeCatching = false;
        state.started = false;
        state.tutorialVisible = true;
        dom.gameShell.inert = true;
        dom.startOverlay.inert = false;
        renderModePicker();
        document.body.classList.remove('is-started');
        dom.startOverlay.classList.remove('is-hidden');
        dom.startOverlay.setAttribute('aria-hidden', 'false');
        setStatus('Tap start to play.');
        updateActionButtons();
        announce('Tap start to play Preschool Fun.');
        syncPauseState(); dom.startButton.focus({ preventScroll: true });
    }

    function startGame() {
        if (state.started) return;
        sound.stopVoice();
        state.started = true;
        state.tutorialVisible = false;
        dom.gameShell.inert = false;
        dom.startOverlay.inert = true;
        state.sessionActive = true;
        if (document.activeElement instanceof HTMLElement && dom.startOverlay.contains(document.activeElement)) {
            document.activeElement.blur();
        }
        document.body.classList.add('is-started');
        dom.startOverlay.classList.add('is-hidden');
        dom.startOverlay.setAttribute('aria-hidden', 'true');
        mountBirdEscape();
        resetSessionProgress();
        createPuzzle(false);
        syncPauseState();
    }

    function mountBirdEscape() {
        if (!dom.birdEscapeLane || typeof window.createBirdEscapeSystem !== 'function') return;
        if (!state.birdEscape) {
            state.birdEscape = window.createBirdEscapeSystem({
                birdScale: 0.97,
                bottomOffset: 2,
                easingDuration: 520,
                catchImpactDuration: 920,
                largeBirdX: 'center',
                smallBirdAtlasSrc: 'generated/smallbird-flight-atlas.webp',
                smallBirdAtlasMetaSrc: 'generated/smallbird-flight-meta.json',
                largeBirdAtlasSrc: 'generated/bigbird-flight-atlas.webp',
                largeBirdAtlasMetaSrc: 'generated/bigbird-flight-meta.json',
                smallBirdSrc: 'smallbirdpng.png',
                largeBirdSrc: 'bigbirdpng.png',
                smallBirdMotion: {
                    bobAmplitude: 1.9,
                    bobSpeed: 1.04,
                    rotationDeg: 1.1,
                    rotationSpeed: 0.88,
                    driftX: 2.4,
                    driftY: 0.85,
                    driftSpeed: 0.58,
                    scaleBreath: 0.005,
                    scaleSpeed: 0.7,
                    playbackRate: 1,
                    phaseOffset: 1.28,
                    phaseOffsetFrames: 8
                },
                largeBirdMotion: {
                    bobAmplitude: 1.5,
                    bobSpeed: 0.82,
                    rotationDeg: 0.85,
                    rotationSpeed: 0.7,
                    driftX: 1.9,
                    driftY: 0.55,
                    driftSpeed: 0.42,
                    scaleBreath: 0.0035,
                    scaleSpeed: 0.5,
                    playbackRate: state.playMode === 'challenge' ? challenge.levels[state.challengeLevel].flapRate : 1,
                    phaseOffset: 0.34,
                    phaseOffsetFrames: 0
                },
                theme: {
                    laneTop: 'rgba(255, 255, 255, 0.62)',
                    laneMid: 'rgba(202, 244, 255, 0.76)',
                    laneBottom: 'rgba(255, 239, 188, 0.78)',
                    hillTop: 'rgba(136, 214, 146, 0.28)',
                    hillBottom: 'rgba(93, 186, 112, 0.42)',
                    path: 'rgba(255, 255, 255, 0.6)',
                    bubble: 'rgba(255, 255, 255, 0.42)'
                },
                atmosphere: {
                    windLines: 5,
                    windOpacity: 0.12,
                    windSpeed: state.playMode === 'challenge' ? 88 * challenge.levels[state.challengeLevel].flapRate : 88,
                    windLength: 104,
                    cloudPuffs: 3,
                    cloudOpacity: 0.085,
                    cloudSpeed: 15,
                    slipstreamOpacity: 0.14
                }
            });
        }
        state.birdEscape.mount(dom.birdEscapeLane);
    }

    function resetSessionProgress() {
        sound.stopVoice();
        state.puzzleToken += 1;
        window.clearTimeout(state.autoAdvanceTimer);
        state.autoAdvanceTimer = null;
        cleanupPointerDrag();
        hideCelebration();
        hideSessionWinOverlay();
        clearLoseEffects();
        state.challengeRun = state.playMode === 'challenge' ? challenge.createRun(state.challengeLevel) : null;
        state.challengeCatching = false;
        state.round = 1;
        state.stars = 0;
        state.streak = 0;
        state.currentPuzzle = null;
        state.draggedChoiceId = null;
        state.chosenChoiceId = null;
        state.locked = false;
        state.wrongChoices = [];
        state.pendingAdvance = false;
        state.confetti = [];
        state.activityCursor = 0;
        state.missionNumber += 1;
        state.cheerCursor = 0;
        state.sessionWon = false;
        state.sessionLost = false;
        state.sessionActive = true;
        state.sessionWinOverlayVisible = false;
        state.sessionLoseOverlayVisible = false;
        suppressedClick = { choiceId: null, until: 0 };
        state.birdEscape?.resume?.();
        state.birdEscape?.reset();
        updateChallenge(0);
        updateHud();
        updateActionButtons();
        dom.flightMessage.textContent = 'Each correct answer gives our bird more room.';
        syncPauseState();
    }

    function restartSession() {
        if (!state.started) return;
        mountBirdEscape();
        resetSessionProgress();
        createPuzzle(false);
    }

    function showSessionWinOverlay() {
        dom.sessionWinOverlay.classList.add('is-visible');
        dom.sessionWinOverlay.setAttribute('aria-hidden', 'false');
    }

    function hideSessionWinOverlay() {
        dom.sessionWinOverlay.classList.remove('is-visible');
        dom.sessionWinOverlay.setAttribute('aria-hidden', 'true');
    }

    function showSessionLoseOverlay() {
        dom.sessionLoseOverlay.classList.add('is-visible');
        dom.sessionLoseOverlay.setAttribute('aria-hidden', 'false');
    }

    function hideSessionLoseOverlay() {
        dom.sessionLoseOverlay.classList.remove('is-visible');
        dom.sessionLoseOverlay.setAttribute('aria-hidden', 'true');
    }

    function clearLoseTimers() {
        window.clearTimeout(state.lossOverlayTimer);
        window.clearTimeout(state.lossPauseTimer);
        window.clearTimeout(state.lossShakeTimer);
        window.clearTimeout(state.lossFlashTimer);
        state.lossOverlayTimer = null;
        state.lossPauseTimer = null;
        state.lossShakeTimer = null;
        state.lossFlashTimer = null;
    }

    function clearLoseEffects() {
        clearLoseTimers();
        document.body.classList.remove('is-loss-shaking', 'is-loss-flashing');
        hideSessionLoseOverlay();
    }

    function triggerLossScreenShake() {
        clearLoseTimers();
        document.body.classList.add('is-loss-shaking', 'is-loss-flashing');
        state.lossShakeTimer = window.setTimeout(() => {
            document.body.classList.remove('is-loss-shaking');
            state.lossShakeTimer = null;
        }, 680);
        state.lossFlashTimer = window.setTimeout(() => {
            document.body.classList.remove('is-loss-flashing');
            state.lossFlashTimer = null;
        }, 420);
    }

    function handleSessionWin() {
        sound.stopVoice();
        if (state.sessionWon || state.sessionLost) return;
        state.sessionWon = true;
        state.sessionActive = false;
        state.sessionLoseOverlayVisible = false;
        state.sessionWinOverlayVisible = true;
        state.locked = true;
        state.puzzleToken += 1;
        window.clearTimeout(state.autoAdvanceTimer);
        state.autoAdvanceTimer = null;
        hideCelebration();
        hideSessionLoseOverlay();
        dom.sessionWinEmoji.textContent = '🐦';
        dom.sessionPlayAgainButton.textContent = 'Play Again';
        dom.sessionWinTitle.textContent = 'You helped the little bird escape!';
        dom.sessionWinCopy.textContent = `The big bird flew off screen after ${state.stars} great answers.`;
        if (state.playMode === 'challenge') {
            state.challengeCompleted = Math.max(state.challengeCompleted, state.challengeLevel + 1);
            const saved = challenge.writeProgress(progressStorage, state.challengeCompleted);
            dom.challengeSave.textContent = saved ? 'Progress saved on this device.' : 'Progress is available for this visit. Device storage is unavailable.';
            const final = state.challengeLevel === challenge.levels.length - 1;
            dom.sessionWinTitle.textContent = final ? 'You are an Ultimate Master!' : `Stage ${state.challengeLevel + 1} complete!`;
            dom.sessionWinCopy.textContent = final ? 'Eight flight challenges conquered! You earned the Ultimate Master crown.' : `${challenge.levels[state.challengeLevel].name} conquered! The next blue bird flies faster. Ready for your next adventure?`;
            if (final) dom.sessionWinEmoji.innerHTML = challenge.crown;
            dom.sessionPlayAgainButton.textContent = final ? 'Replay final challenge' : 'Next stage';
        }
        setMascot('The little bird is safe now. Great thinking!', 'cheer', 'Sunny Buddy');
        setStatus('Bird Escape complete!');
        updateActionButtons();
        showSessionWinOverlay();
        sound.win(); sound.sync();
        if (state.playMode === 'challenge' && state.challengeLevel === challenge.levels.length - 1 && state.voiceEnabled) {
            sound.speak(['challenge-master'], 'result', () => state.sessionWon && !state.tutorialVisible);
        }
        announce('Bird Escape complete! You helped the little bird get away.');
    }

    function birdImpactBurst() {
        const rect = dom.birdEscapeLane?.getBoundingClientRect?.();
        const originX = rect ? rect.left + (rect.width * 0.66) : background.width * 0.66;
        const originY = rect ? rect.top + (rect.height * 0.52) : background.height * 0.72;
        const palette = ['#ffce54', '#ff8c42', '#ff5f5f', '#fff2a6', '#ffd94f', '#ff7d6a'];
        for (let index = 0; index < 28; index += 1) {
            state.confetti.push({
                x: originX + randomRange(-26, 26),
                y: originY + randomRange(-16, 18),
                vx: randomRange(-140, 150),
                vy: randomRange(-165, -48),
                rotation: randomRange(0, Math.PI * 2),
                spin: randomRange(-9, 9),
                size: randomRange(7, 13),
                color: palette[index % palette.length],
                life: randomRange(0.52, 1.04)
            });
        }
    }

    function handleSessionLose() {
        sound.stopVoice();
        if (state.sessionLost || state.sessionWon) return;
        state.sessionLost = true;
        state.sessionActive = false;
        state.sessionLoseOverlayVisible = false;
        state.locked = true;
        state.puzzleToken += 1;
        window.clearTimeout(state.autoAdvanceTimer);
        state.autoAdvanceTimer = null;
        cleanupPointerDrag();
        hideCelebration();
        triggerLossScreenShake();
        birdImpactBurst();
        sound.loss();
        sound.sync();
        dom.sessionLoseEmoji.textContent = '💥';
        dom.sessionLoseTitle.textContent = 'The big bird caught up!';
        dom.sessionLoseCopy.textContent = 'Tap Try Again and help the little bird escape on the next round.';
        setMascot('Oops! The big bird bumped into the little bird. Let’s try again!', 'thinking', 'Sunny Buddy');
        setStatus('The big bird caught the little bird.');
        updateActionButtons();
        announce('Oh no! The big bird caught the little bird. Tap Try Again to play another round.');
        state.lossPauseTimer = window.setTimeout(() => {
            state.birdEscape?.pause?.();
            state.lossPauseTimer = null;
        }, 940);
        state.lossOverlayTimer = window.setTimeout(() => {
            state.sessionLoseOverlayVisible = true;
            showSessionLoseOverlay();
            updateActionButtons();
            state.lossOverlayTimer = null;
        }, 620);
    }

    function setupBackground() {
        resizeCanvas();
        background.clouds = Array.from({ length: 7 }, (_, index) => ({
            x: Math.random() * background.width,
            y: 80 + Math.random() * background.height * 0.35,
            radius: 56 + Math.random() * 62,
            speed: 7 + Math.random() * 14,
            opacity: 0.14 + Math.random() * 0.13,
            drift: 0.6 + Math.random() * 0.7,
            phase: index * 0.9
        }));
        background.sparkles = Array.from({ length: 46 }, (_, index) => ({
            x: Math.random() * background.width,
            y: Math.random() * background.height,
            radius: 1.5 + Math.random() * 2.4,
            alpha: 0.24 + Math.random() * 0.36,
            pulse: 1.5 + Math.random() * 3,
            phase: index * 0.44
        }));
    }

    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        background.width = window.innerWidth;
        background.height = window.innerHeight;
        dom.canvas.width = Math.floor(background.width * dpr);
        dom.canvas.height = Math.floor(background.height * dpr);
        dom.canvas.style.width = `${background.width}px`;
        dom.canvas.style.height = `${background.height}px`;
        background.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function tick(now) {
        if (!background.lastFrame) background.lastFrame = now;
        const elapsedMs = Math.max(0, Math.min(100, now - background.lastFrame));
        const dt = Math.min(0.032, elapsedMs / 1000);
        background.lastFrame = now;
        if (!state.hostPaused && !document.hidden) {
            if (!state.tutorialVisible) updateAmbient(dt * 1000);
            updateChallenge(elapsedMs);
            updateConfetti(dt); drawBackground(dt);
        }
        requestAnimationFrame(tick);
    }

    function updateAmbient(deltaMs) {
        state.ambientTimer -= deltaMs;
        if (state.ambientTimer > 0 || !state.started || !state.sessionActive || isPaused() || !state.audioUnlocked || state.sound.muted || state.locked) return;
        sound.ambient();
        state.ambientTimer = randomRange(IDLE_AMBIENT_MIN_MS, IDLE_AMBIENT_MAX_MS);
    }

    function updateConfetti(dt) {
        state.confetti = state.confetti
            .map((piece) => ({
                ...piece,
                life: piece.life - dt,
                x: piece.x + piece.vx * dt,
                y: piece.y + piece.vy * dt,
                rotation: piece.rotation + piece.spin * dt,
                vy: piece.vy + 36 * dt
            }))
            .filter((piece) => piece.life > 0);
    }

    function drawBackground(dt) {
        background.time += dt;
        const ctx = background.ctx;
        ctx.clearRect(0, 0, background.width, background.height);

        const gradient = ctx.createLinearGradient(0, 0, 0, background.height);
        gradient.addColorStop(0, '#7ad8ff');
        gradient.addColorStop(0.52, '#c8f4ff');
        gradient.addColorStop(1, '#fff4bf');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, background.width, background.height);

        const sunGlow = ctx.createRadialGradient(background.width * 0.78, background.height * 0.2, 10, background.width * 0.78, background.height * 0.2, 160);
        sunGlow.addColorStop(0, 'rgba(255,255,255,0.96)');
        sunGlow.addColorStop(0.36, 'rgba(255,238,176,0.72)');
        sunGlow.addColorStop(1, 'rgba(255,238,176,0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(background.width * 0.78, background.height * 0.2, 160, 0, Math.PI * 2);
        ctx.fill();

        background.clouds.forEach((cloud) => {
            cloud.x += cloud.speed * dt;
            if (cloud.x - cloud.radius * 1.6 > background.width) cloud.x = -cloud.radius * 1.8;
            drawCloud(ctx, cloud.x, cloud.y + Math.sin(background.time * cloud.drift + cloud.phase) * 5, cloud.radius, cloud.opacity);
        });

        background.sparkles.forEach((sparkle) => {
            const alpha = sparkle.alpha + Math.sin(background.time * sparkle.pulse + sparkle.phase) * 0.1;
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(sparkle.x, sparkle.y, sparkle.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        drawHills(ctx);
        drawConfetti(ctx);
    }

    function drawCloud(ctx, x, y, radius, opacity) {
        ctx.fillStyle = `rgba(255,255,255,${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.5, Math.PI * 0.5, Math.PI * 1.5);
        ctx.arc(x + radius * 0.5, y - radius * 0.34, radius * 0.42, Math.PI, Math.PI * 2);
        ctx.arc(x + radius * 0.95, y, radius * 0.5, Math.PI * 1.5, Math.PI * 0.5);
        ctx.closePath();
        ctx.fill();
    }

    function drawHills(ctx) {
        ctx.fillStyle = 'rgba(78, 195, 120, 0.36)';
        ctx.beginPath();
        ctx.moveTo(0, background.height);
        ctx.quadraticCurveTo(background.width * 0.22, background.height * 0.72, background.width * 0.44, background.height * 0.82);
        ctx.quadraticCurveTo(background.width * 0.68, background.height * 0.93, background.width, background.height * 0.74);
        ctx.lineTo(background.width, background.height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(115, 215, 123, 0.45)';
        ctx.beginPath();
        ctx.moveTo(0, background.height);
        ctx.quadraticCurveTo(background.width * 0.18, background.height * 0.8, background.width * 0.34, background.height * 0.88);
        ctx.quadraticCurveTo(background.width * 0.64, background.height * 0.98, background.width, background.height * 0.82);
        ctx.lineTo(background.width, background.height);
        ctx.closePath();
        ctx.fill();
    }

    function drawConfetti(ctx) {
        state.confetti.forEach((piece) => {
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate(piece.rotation);
            ctx.fillStyle = piece.color;
            ctx.fillRect(-piece.size * 0.5, -piece.size * 0.5, piece.size, piece.size * 0.7);
            ctx.restore();
        });
    }

    function createPuzzle(withSound) {
        if (!state.started || !state.sessionActive || state.sessionWon || state.sessionLost) return;
        sound.stopVoice();
        state.puzzleToken += 1;
        window.clearTimeout(state.autoAdvanceTimer);
        state.autoAdvanceTimer = null;
        cleanupPointerDrag();
        const shouldSmoothScroll = state.round > 1 || withSound;
        state.locked = false;
        state.chosenChoiceId = null;
        state.wrongChoices = [];
        state.draggedChoiceId = null;
        suppressedClick = { choiceId: null, until: 0 };
        hideCelebration();

        if (state.activityCursor >= 3 || state.missionNumber > 1) {
            if (!state.activityDeck.length) state.activityDeck = activities.deck(randomInt, state.lastActivity, state.activityCursor === 3 && state.missionNumber === 1);
        }
        const type = state.missionNumber === 1 && state.activityCursor < 3 ? ACTIVITY_TYPES[state.activityCursor] : state.activityDeck.shift();
        state.activityCursor += 1;
        state.lastActivity = type;
        let puzzle, signature;
        for (let attempt = 0; attempt < 8; attempt++) {
            puzzle = buildPuzzle(type);
            signature = JSON.stringify([type, puzzle.variant, puzzle.sequence.map(item => [item.value, item.missing]), puzzle.display?.map(item => item.value)]);
            if (!state.recentPuzzles.includes(signature)) break;
        }
        state.recentPuzzles.push(signature); if (state.recentPuzzles.length > 12) state.recentPuzzles.shift();
        state.currentPuzzle = puzzle;
        renderPuzzle();
        readQuestion();
        updateHud();
        setMascot(CHEERS[state.cheerCursor % CHEERS.length], 'happy', 'Sunny Buddy');
        state.cheerCursor += 1;
        setStatus(['quantity', 'matching', 'odd'].includes(type) ? 'Pick your answer, then check it.' : 'Find what is missing.');
        announce(`${state.currentPuzzle.prompt} ${sequenceForAnnouncement()}`);
        focusPuzzleArea(shouldSmoothScroll);
        if (withSound) sound.boop();
    }

    function buildPuzzle(type) {
        if (type === 'alphabet') return buildAlphabetPuzzle();
        if (type === 'counting') return buildCountingPuzzle();
        if (type === 'pattern') return buildPatternPuzzle();
        const data = activities.visual(type, randomInt, puzzleDifficulty());
        return { ...finalizePuzzle(type, data.sequence, data.answer, data.distractors, []), answerKind: data.answerKind, display: data.display || [], voiceSequence: type === 'matching' };
    }

    function puzzleDifficulty() { return state.stars + (state.playMode === 'challenge' ? Math.floor(state.challengeLevel * 1.3) : Math.max(0, state.missionNumber - 1) * 2); }

    function buildAlphabetPuzzle() {
        const start = state.missionNumber === 1 && state.activityCursor === 1 ? 0 : randomInt(Math.min(18, 4 + puzzleDifficulty() * 2));
        const length = state.stars < 6 ? 4 : 4 + randomInt(2);
        const sequence = Array.from({ length }, (_, index) => {
            const value = ALPHABET[start + index];
            return { value, label: `Letter ${value}`, icon: null, missing: false };
        });
        const missingIndex = 1 + randomInt(length - 2);
        const answer = option(sequence[missingIndex].value, sequence[missingIndex].label, sequence[missingIndex].icon);
        sequence[missingIndex].missing = true;
        const visibleValues = new Set(sequence.filter((item) => !item.missing).map((item) => item.value));
        const distractorValues = collectDistractorValues(
            [-4, -3, -2, -1, 1, 2, 3, 4]
                .map((offset) => start + missingIndex + offset)
                .filter((index) => index >= 0 && index < ALPHABET.length)
                .map((index) => ALPHABET[index]),
            ALPHABET,
            visibleValues,
            answer.value
        );
        const distractors = distractorValues
            .slice(0, 3)
            .map((value) => option(value, `Letter ${value}`, null));
        return finalizePuzzle('alphabet', sequence, answer, distractors, []);
    }

    function buildCountingPuzzle() {
        const start = state.missionNumber === 1 && state.activityCursor === 2 ? 1 : 1 + randomInt(3);
        const step = puzzleDifficulty() >= 6 && randomInt(3) === 0 ? 2 : 1;
        const length = state.stars < 6 ? 4 : 4 + randomInt(2);
        const sequence = Array.from({ length }, (_, index) => {
            const value = String(start + index * step);
            return { value, label: value, icon: null, missing: false };
        });
        const missingIndex = 1 + randomInt(length - 2);
        const answerNumber = start + missingIndex * step;
        const answer = option(String(answerNumber), `${answerNumber}`, null);
        sequence[missingIndex].missing = true;
        const visibleValues = new Set(sequence.filter((item) => !item.missing).map((item) => item.value));
        const countingPool = Array.from({ length: 12 }, (_, index) => String(index + 1));
        const distractorValues = collectDistractorValues(
            [answerNumber - 3, answerNumber - 2, answerNumber - 1, answerNumber + 1, answerNumber + 2, answerNumber + 3]
                .filter((value) => value > 0)
                .map(String),
            countingPool,
            visibleValues,
            answer.value
        );
        const distractors = distractorValues
            .slice(0, 3)
            .map((value) => option(value, `${value}`, null));
        const puzzle = finalizePuzzle('counting', sequence, answer, distractors, []);
        if (step === 2) { puzzle.prompt = 'Count by twos. What is missing?'; puzzle.coachTip = 'Say two more each time.'; puzzle.voiceInstruction = 'counting-twos'; puzzle.variant = 'twos'; }
        return puzzle;
    }

    function buildPatternPuzzle() {
        const data = activities.pattern(randomInt, puzzleDifficulty(), state.patternCursor++);
        return { ...finalizePuzzle('pattern', data.sequence, data.answer, data.distractors, []), variant: data.rule };
    }

    function finalizePuzzle(type, sequence, answer, distractors, storyVisual) {
        const meta = ACTIVITY_META[type];
        const choicePrefix = `puzzle-${state.puzzleToken}-choice`;
        return {
            id: state.puzzleToken,
            type,
            answerKind: type === 'alphabet' || type === 'counting' ? type : 'picture',
            prompt: meta.prompt,
            description: meta.description,
            hint: meta.hint,
            coachTip: meta.coachTip,
            sequence,
            answer: { ...answer, id: `${choicePrefix}-0` },
            options: shuffle([
                { ...answer, id: `${choicePrefix}-0` },
                ...distractors.map((item, index) => ({ ...item, id: `${choicePrefix}-${index + 1}` }))
            ]),
            storyVisual
        };
    }

    function option(value, label, icon) {
        return { value, label, icon, id: '' };
    }

    function collectDistractorValues(preferredValues, fallbackValues, blockedValues, answerValue, limit = 3) {
        const taken = new Set([...blockedValues, answerValue]);
        const picked = [];
        [...preferredValues, ...fallbackValues].forEach((value) => {
            if (picked.length >= limit || taken.has(value)) return;
            taken.add(value);
            picked.push(value);
        });
        return picked;
    }

    function getSymbolShapeStyle(index, type) {
        const offset = type === 'alphabet' ? 0 : type === 'counting' ? 2 : 4;
        return SYMBOL_SHAPE_STYLES[(offset + index) % SYMBOL_SHAPE_STYLES.length];
    }

    function renderChoiceMarkup(item, puzzle, symbolOnlyMode, index) {
        if (puzzle.answerKind === 'picture') {
            const floatDuration = 3400 + (index * 140);
            const floatDelay = index * -180;
            const floatLift = 4 + ((index + 2) % 3);
            return `
                <span
                    class="choice-stage choice-stage--pattern"
                    style="--float-duration:${floatDuration}ms; --float-delay:${floatDelay}ms; --float-lift:${floatLift}px; --float-sway:0deg;"
                    aria-hidden="true"
                >
                    <span class="choice-value choice-value--pattern">${activities.symbol(item.value)}</span>
                </span>
            `;
        }

        const shapeStyle = getSymbolShapeStyle(index, puzzle.type);
        const floatDuration = 3600 + (index * 180);
        const floatDelay = index * -260;
        const floatLift = 6 + ((index + 1) % 3) * 2;
        const floatSway = index % 2 === 0 ? '3deg' : '-2.6deg';
        return `
            <span
                class="choice-stage"
                style="--float-duration:${floatDuration}ms; --float-delay:${floatDelay}ms; --float-lift:${floatLift}px; --float-sway:${floatSway};"
                aria-hidden="true"
            >
                <span class="choice-three-shell" aria-hidden="true">
                    <img class="choice-three-image" alt="" draggable="false" hidden>
                    <span
                        class="choice-three-fallback"
                        style="--fallback-highlight:${shapeStyle.highlight}; --fallback-front:${shapeStyle.front}; --fallback-dark:${shapeStyle.frontDark}; --fallback-rim:${shapeStyle.rim}; --fallback-plate:${shapeStyle.plate}; --fallback-plate-dark:${shapeStyle.plateDark};"
                    >${item.value}</span>
                </span>
            </span>
        `;
    }

    function renderPuzzle() {
        const puzzle = state.currentPuzzle;
        const meta = ACTIVITY_META[puzzle.type];
        const symbolOnlyMode = puzzle.answerKind !== 'picture';
        const patternMode = puzzle.answerKind === 'picture';
        const selectedChoice = getSelectedChoice();
        dom.activityPill.textContent = meta.pill;
        dom.promptHint.textContent = puzzle.hint;
        dom.promptTitle.textContent = puzzle.prompt;
        dom.promptDescription.textContent = puzzle.description;
        dom.coachTip.textContent = puzzle.coachTip;

        dom.activityDisplay.hidden = !puzzle.display?.length;
        dom.activityDisplay.parentElement.classList.toggle('has-activity-display', !dom.activityDisplay.hidden);
        dom.activityDisplay.setAttribute('aria-label', puzzle.type === 'quantity' ? 'Pictures to count' : 'Find the different picture');
        dom.activityDisplay.innerHTML = (puzzle.display || []).map(item => `<span class="display-symbol" role="img" aria-label="${item.label}">${activities.symbol(item.value)}</span>`).join('');

        dom.sequenceTrack.innerHTML = '';
        dom.sequenceTrack.style.setProperty('--sequence-count', puzzle.sequence.length);
        puzzle.sequence.forEach((item) => {
            const slot = document.createElement('div');
            slot.className = 'slot-card';
            if (symbolOnlyMode) slot.classList.add('is-symbol-only');
            if (patternMode) slot.classList.add('is-pattern-token');
            if (item.missing) slot.classList.add('is-missing');
            if (item.missing && selectedChoice && !state.locked) slot.classList.add('is-preview-filled');
            if (item.missing && state.locked && state.chosenChoiceId === puzzle.answer.id) slot.classList.add('is-filled-correct');
            const showBlankMarker = item.missing && !selectedChoice;
            const slotValueMarkup = showBlankMarker
                ? '<span class="slot-blank" aria-hidden="true"></span><span class="sr-only">blank</span>'
                : (patternMode ? activities.symbol(item.missing && selectedChoice ? selectedChoice.value : item.value) : item.missing && selectedChoice ? selectedChoice.value : item.value);
            if (!showBlankMarker && patternMode) slot.setAttribute('aria-label', item.missing && selectedChoice ? selectedChoice.label : item.label);
            slot.innerHTML = `
                <div class="slot-value${patternMode ? ' slot-value--pattern' : ''}">${slotValueMarkup}</div>
            `;
            dom.sequenceTrack.appendChild(slot);
        });
        activeDropSlot = dom.sequenceTrack.querySelector('.slot-card.is-missing');

        dom.storyVisual.innerHTML = '';
        puzzle.storyVisual.forEach((item) => {
            const token = document.createElement('div');
            token.className = 'story-token';
            token.textContent = item.value;
            token.setAttribute('aria-label', item.label);
            dom.storyVisual.appendChild(token);
        });

        dom.choicesGrid.innerHTML = '';
        const symbolChoices = [];
        puzzle.options.forEach((item, index) => {
            const puzzleToken = puzzle.id;
            const choice = document.createElement('button');
            choice.type = 'button';
            choice.className = 'choice-card';
            if (symbolOnlyMode) choice.classList.add('is-symbol-only');
            if (patternMode) choice.classList.add('is-pattern-token');
            if (item.id === state.chosenChoiceId) choice.classList.add('is-selected');
            if (state.locked) choice.classList.add('is-disabled');
            choice.disabled = state.locked || state.wrongChoices.includes(item.id);
            if (state.wrongChoices.includes(item.id)) choice.classList.add('is-eliminated');
            choice.dataset.choiceId = item.id;
            choice.dataset.puzzleId = String(puzzleToken);
            choice.setAttribute('draggable', 'false');
            choice.setAttribute('aria-label', item.label);
            choice.innerHTML = renderChoiceMarkup(item, puzzle, symbolOnlyMode, index);
            choice.addEventListener('click', event => { if (event.detail === 0 && choice.isConnected) choose(item.id, { puzzleToken }); });
            choice.addEventListener('pointerdown', onChoicePointerDown);
            choice.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                if (!event.repeat && choice.isConnected) choose(item.id, { puzzleToken });
            });
            dom.choicesGrid.appendChild(choice);
            if (symbolOnlyMode) {
                symbolChoices.push({ choice, option: item, index });
            }
        });
        if (symbolOnlyMode) {
            choicePieceRenderer.renderChoices(puzzle, symbolChoices);
        } else {
            choicePieceRenderer.cancel();
        }
        updateActionButtons();
    }

    function updateHud() {
        updateChallengeHud();
        dom.roundValue.textContent = String(state.round);
        dom.starsValue.textContent = String(state.stars);
        dom.streakValue.textContent = String(state.streak);
        if (!state.challengeRun) dom.flightStats.textContent = `Puzzle ${state.round} · ${state.stars} stars · ${state.streak} in a row`;
        dom.skillCollection.innerHTML = `${activities.feather}<span>${state.skillFeathers.size}/6</span>`;
        dom.skillCollection.setAttribute('aria-label', `${state.skillFeathers.size} of 6 skill feathers collected`);
    }

    function onChoicePointerDown(event) {
        if (isPaused() || pointerDrag || Number(event.currentTarget.dataset.puzzleId) !== state.puzzleToken) return;
        if (state.locked) return;
        if (!state.started) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        cleanupPointerDrag();
        const source = event.currentTarget;
        const pointerId = event.pointerId;
        pointerDrag = {
            puzzleToken: state.puzzleToken,
            choiceId: source.dataset.choiceId,
            pointerId,
            source,
            startX: event.clientX,
            startY: event.clientY,
            captureActive: false,
            moved: false,
            ghost: null
        };
        unlockAudio();
        source.setPointerCapture?.(pointerId);
        pointerDrag.captureActive = true;
        document.addEventListener('pointermove', onChoicePointerMove, { passive: false });
        document.addEventListener('pointerup', onChoicePointerUp, { passive: false });
        document.addEventListener('pointercancel', onChoicePointerCancel, { passive: false });
    }

    function onChoicePointerMove(event) {
        if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;
        if (pointerDrag.puzzleToken !== state.puzzleToken) { cleanupPointerDrag(); return; }
        const movedDistance = Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY);
        const movedEnough = movedDistance > POINTER_DRAG_DISTANCE_PX;
        if (!movedEnough && !pointerDrag.moved) return;
        event.preventDefault();
        if (!pointerDrag.moved) {
            beginPointerDrag();
        }
        pointerDrag.ghost.style.left = `${event.clientX}px`;
        pointerDrag.ghost.style.top = `${event.clientY}px`;
        updateDropTargetFromPoint(event.clientX, event.clientY);
    }

    function onChoicePointerUp(event) {
        if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;
        const moved = pointerDrag.moved;
        const choiceId = pointerDrag.choiceId;
        const puzzleToken = pointerDrag.puzzleToken;
        const shouldDrop = moved && isPointInsideDropSlot(event.clientX, event.clientY);
        cleanupPointerDrag();
        suppressedClick = { choiceId, until: Date.now() + SUPPRESSED_CLICK_MS };
        if (!moved) {
            choose(choiceId, { fromPointer: true, puzzleToken });
            return;
        }
        if (shouldDrop) {
            choose(choiceId, { fromDrag: true, puzzleToken });
        }
    }

    function onChoicePointerCancel(event) {
        if (!pointerDrag || event.pointerId !== pointerDrag.pointerId) return;
        cleanupPointerDrag();
    }

    function buildDragGhost(source) {
        const ghost = source.cloneNode(true);
        ghost.classList.add('drag-ghost');
        ghost.classList.remove('choice-card', 'is-correct', 'is-wrong', 'is-dragging');
        ghost.classList.add('choice-card');
        ghost.removeAttribute('draggable');
        ghost.setAttribute('aria-hidden', 'true');
        return ghost;
    }

    function beginPointerDrag() {
        if (!pointerDrag || pointerDrag.moved) return;
        pointerDrag.moved = true;
        pointerDrag.source.classList.add('is-dragging');
        pointerDrag.ghost = buildDragGhost(pointerDrag.source);
        document.body.appendChild(pointerDrag.ghost);
    }

    function cleanupPointerDrag() {
        if (!pointerDrag) return;
        if (pointerDrag.captureActive) {
            try {
                pointerDrag.source.releasePointerCapture?.(pointerDrag.pointerId);
            } catch {
                // Pointer capture can already be released by the browser.
            }
        }
        pointerDrag.source.classList.remove('is-dragging');
        pointerDrag.ghost?.remove();
        activeDropSlot?.classList.remove('is-drop-target');
        document.removeEventListener('pointermove', onChoicePointerMove);
        document.removeEventListener('pointerup', onChoicePointerUp);
        document.removeEventListener('pointercancel', onChoicePointerCancel);
        pointerDrag = null;
    }

    function updateDropTargetFromPoint(clientX, clientY) {
        if (!activeDropSlot) return;
        activeDropSlot.classList.toggle('is-drop-target', isPointInsideDropSlot(clientX, clientY));
    }

    function isPointInsideDropSlot(clientX, clientY) {
        if (!activeDropSlot) return false;
        const rect = activeDropSlot.getBoundingClientRect();
        return clientX >= rect.left - DROP_TARGET_PADDING_PX
            && clientX <= rect.right + DROP_TARGET_PADDING_PX
            && clientY >= rect.top - DROP_TARGET_PADDING_PX
            && clientY <= rect.bottom + DROP_TARGET_PADDING_PX;
    }

    function choose(choiceId, options = {}) {
        if (options.puzzleToken !== state.puzzleToken || !state.currentPuzzle?.options.some(item => item.id === choiceId)) return;
        if (isPaused() || state.wrongChoices.includes(choiceId)) return;
        if (!state.started) return;
        if (!state.sessionActive || state.sessionWon || state.sessionLost || state.sessionWinOverlayVisible || state.sessionLoseOverlayVisible) return;
        if (state.locked) return;
        if (!options.fromDrag && !options.fromPointer && suppressedClick.choiceId === choiceId && Date.now() < suppressedClick.until) return;
        unlockAudio();
        sound.drop();
        sound.stopVoice();
        state.chosenChoiceId = choiceId;
        renderPuzzle();
        setStatus('Ready? Tap Check answer.');
        announce(`${getSelectedChoice()?.label ?? 'Answer placed'}. Tap Check answer.`);
        if (state.voiceEnabled) {
            const token = state.puzzleToken;
            sound.speak([voiceKey(getSelectedChoice(), state.currentPuzzle.answerKind), 'check'], 'answer', () => token === state.puzzleToken && state.chosenChoiceId === choiceId && !state.locked && !isPaused());
        }
    }

    function submitChoice() {
        if (isPaused()) return;
        if (!state.started || !state.sessionActive || state.sessionWon || state.sessionLost || state.sessionWinOverlayVisible || state.sessionLoseOverlayVisible) return;
        if (state.locked) return;
        if (!getSelectedChoice()) return;
        unlockAudio();
        sound.stopVoice();
        const choiceId = state.chosenChoiceId;
        const correct = choiceId === state.currentPuzzle.answer.id;
        if (correct) {
            const puzzleToken = state.puzzleToken;
            state.locked = true;
            state.stars += 1;
            state.streak += 1;
            state.round += 1;
            const newFeather = !state.skillFeathers.has(state.currentPuzzle.type);
            state.skillFeathers.add(state.currentPuzzle.type);
            window.LAHSPointsBridge?.awardPoints(PRESCHOOL_CORRECT_POINTS, {
                label: 'Correct Answer',
                meta: {
                    activityType: state.currentPuzzle?.type || null,
                    round: state.round
                }
            });
            updateHud();
            renderPuzzle();
            flashChoice(choiceId, true);
            sound.success();
            sound.boost();
            if (newFeather || state.streak % 3 === 0) sound.streak();
            dom.flightMessage.textContent = state.streak % 3 === 0 ? `${state.streak} in a row! Keep those wings flying!` : 'Great thinking! Our little bird has more room to fly.';
            if (newFeather) dom.flightMessage.textContent = `${state.skillFeathers.size}/6 feathers! ${ACTIVITY_META[state.currentPuzzle.type].successTitle}`;
            confettiBurst();
            setMascot('We did it! That answer fits perfectly!', 'cheer', 'Sunny Buddy is cheering!');
            showCelebration(
                ACTIVITY_META[state.currentPuzzle.type].successEmoji,
                ACTIVITY_META[state.currentPuzzle.type].successTitle,
                CORRECT_LINES[randomInt(CORRECT_LINES.length)]
            );
            setStatus(state.streak % 3 === 0 ? `${state.streak} in a row! +${PRESCHOOL_CORRECT_POINTS} points!` : `Correct! +${PRESCHOOL_CORRECT_POINTS} points!`);
            announce(`Correct! Great job. +${PRESCHOOL_CORRECT_POINTS} points.`);
            const movement = state.challengeRun ? state.challengeRun.answer(true) : state.birdEscape?.onCorrect?.();
            updateChallengeHud();
            Promise.resolve(movement).then(() => {
                if (!state.started || state.puzzleToken !== puzzleToken) return;
                if (state.challengeRun ? state.challengeRun.describe().won : state.birdEscape?.checkWin?.()) {
                    handleSessionWin();
                    return;
                }
                state.autoAdvanceTimer = window.setTimeout(() => {
                    if (!state.started || !state.sessionActive || state.sessionWon || state.puzzleToken !== puzzleToken) return;
                    if (isPaused()) { state.pendingAdvance = true; return; }
                    createPuzzle(false);
                }, 1500);
            });
            return;
        }

        const puzzleToken = state.puzzleToken;
        state.locked = true;
        state.chosenChoiceId = null;
        state.wrongChoices.push(choiceId);
        state.streak = 0;
        updateHud();
        renderPuzzle();
        flashChoice(choiceId, false);
        sound.wrong();
        setMascot(WRONG_LINES[randomInt(WRONG_LINES.length)], 'thinking', 'Sunny Buddy');
        setStatus(`${state.currentPuzzle.coachTip} Try another answer.`);
        dom.flightMessage.textContent = 'The blue bird moved closer. You can still do it!';
        announce('That one does not fit. Try again.');
        Promise.resolve(state.challengeRun ? state.challengeRun.answer(false) : (state.birdEscape?.onWrong?.() ?? { caught: false })).then((result) => {
            if (!state.started || state.puzzleToken !== puzzleToken) return;
            if (result?.caught) {
                handleSessionLose();
                return;
            }
            state.locked = false;
            renderPuzzle();
            updateActionButtons();
        });
    }

    function flashChoice(choiceId, correct) {
        const choice = dom.choicesGrid.querySelector(`[data-choice-id="${CSS.escape(choiceId)}"]`);
        if (!choice) return;
        choice.classList.remove('is-correct', 'is-wrong');
        void choice.offsetWidth;
        choice.classList.add(correct ? 'is-correct' : 'is-wrong');
    }

    function setMascot(message, mood, title) {
        dom.mascotTitle.textContent = title;
        dom.mascotMessage.textContent = message;
        dom.mascotMouth.classList.toggle('is-cheer', mood === 'cheer');
        dom.mascotMouth.classList.toggle('is-thinking', mood === 'thinking');
    }

    function setStatus(text) {
        dom.statusText.textContent = text;
        dom.feedback.textContent = text;
    }

    function updateActionButtons() {
        const canSubmit = state.started
            && state.sessionActive
            && !state.sessionWon
            && !state.sessionLost
            && !state.sessionWinOverlayVisible
            && !state.sessionLoseOverlayVisible
            && !state.locked
            && Boolean(getSelectedChoice());
        dom.submitButton.disabled = !canSubmit;
        dom.submitButton.setAttribute('aria-disabled', String(!canSubmit));
        refreshVoiceControls();
    }

    function showCelebration(emoji, title, copy) {
        dom.celebrationEmoji.textContent = emoji;
        dom.celebrationTitle.textContent = title;
        dom.celebrationCopy.textContent = copy;
        dom.celebrationOverlay.classList.add('is-visible');
        dom.celebrationOverlay.setAttribute('aria-hidden', 'false');
    }

    function hideCelebration() {
        dom.celebrationOverlay.classList.remove('is-visible');
        dom.celebrationOverlay.setAttribute('aria-hidden', 'true');
    }

    function confettiBurst() {
        const cx = background.width * 0.5;
        const cy = background.height * 0.28;
        for (let i = 0; i < 30; i += 1) {
            state.confetti.push({
                x: cx + randomRange(-80, 80),
                y: cy + randomRange(-30, 40),
                vx: randomRange(-90, 90),
                vy: randomRange(-210, -80),
                life: randomRange(0.8, 1.4),
                rotation: randomRange(0, Math.PI * 2),
                spin: randomRange(-5, 5),
                size: randomRange(8, 16),
                color: COLORS[randomInt(COLORS.length)]
            });
        }
    }

    function sequenceForAnnouncement() {
        return state.currentPuzzle.sequence.map((item) => (item.missing ? 'blank' : item.value)).join(', ');
    }

    function getSelectedChoice() {
        if (!state.currentPuzzle || !state.chosenChoiceId) return null;
        return state.currentPuzzle.options.find((option) => option.id === state.chosenChoiceId) ?? null;
    }

    function announce(text) {
        dom.srStatus.textContent = text;
    }

    function focusPuzzleArea(smooth) {
        if (document.documentElement.scrollHeight <= innerHeight + 1) return;
        const top = dom.promptTitle.getBoundingClientRect().top + window.scrollY - 12;
        window.scrollTo({
            top: Math.max(0, top),
            behavior: smooth ? 'smooth' : 'auto'
        });
    }

    function exitToGames() {
        sound.stopVoice();
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: GAME_EXIT_TO_HOME_MESSAGE, tab: 'games' }, '*');
                return;
            }
        } catch {
            // Fall through to local navigation.
        }
        window.location.href = '../../apps';
    }

    function tokenFor(seed) {
        const text = String(seed);
        let hash = 0;
        for (let i = 0; i < text.length; i += 1) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash |= 0;
        }
        return TOKEN_POOL[Math.abs(hash) % TOKEN_POOL.length];
    }

    function randomInt(max) {
        if (max <= 0) return 0;
        if (window.crypto?.getRandomValues) {
            const values = new Uint32Array(1);
            window.crypto.getRandomValues(values);
            return values[0] % max;
        }
        return Math.floor(Math.random() * max);
    }

    function randomRange(min, max) {
        return min + Math.random() * (max - min);
    }

    function shuffle(items) {
        const copy = items.slice();
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = randomInt(i + 1);
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    document.addEventListener('DOMContentLoaded', init);
})();
