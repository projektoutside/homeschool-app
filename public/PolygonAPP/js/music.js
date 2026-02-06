(() => {
    const PLAYLIST_TRACKS = [
        'Music/RandomPlaylist/PolygonCHILL.mp3',
        'Music/RandomPlaylist/PolygonCHILL (1).mp3',
        'Music/RandomPlaylist/PolygonCHILL (2).mp3',
        'Music/RandomPlaylist/PolygonCHILL (3).mp3',
        'Music/RandomPlaylist/PolygonCHILL (4).mp3',
        'Music/RandomPlaylist/PolygonCHILL (5).mp3',
        'Music/RandomPlaylist/PolygonCHILL (6).mp3',
        'Music/RandomPlaylist/PolygonCHILL (7).mp3',
        'Music/RandomPlaylist/PolygonCHILL (8).mp3',
        'Music/RandomPlaylist/PolygonCHILL (9).mp3',
        'Music/RandomPlaylist/PolygonCHILL (10).mp3',
        'Music/RandomPlaylist/PolygonCHILL (11).mp3',
        'Music/RandomPlaylist/PolygonCHILL (12).mp3',
        'Music/RandomPlaylist/PolygonCHILL (13).mp3',
        'Music/RandomPlaylist/PolygonCHILL (14).mp3',
        'Music/RandomPlaylist/PolygonCHILL (15).mp3',
        'Music/RandomPlaylist/PolygonCHILL (16).mp3',
        'Music/RandomPlaylist/PolygonCHILL (17).mp3'
    ];

    const STORAGE_KEY = 'polygonAudioSettings_v1';
    const DEFAULT_SETTINGS = {
        musicVolume: 0.7,
        sfxVolume: 0.75,
        muted: false
    };

    const getStorage = () => (window.SafeStorage && typeof window.SafeStorage.getItem === 'function')
        ? window.SafeStorage
        : window.localStorage;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const toNum = (value, fallback) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };

    const shuffle = (arr) => {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };

    const loadSettings = () => {
        try {
            const raw = getStorage().getItem(STORAGE_KEY);
            if (!raw) return { ...DEFAULT_SETTINGS };
            const parsed = JSON.parse(raw);
            return {
                musicVolume: clamp(toNum(parsed.musicVolume, DEFAULT_SETTINGS.musicVolume), 0, 1),
                sfxVolume: clamp(toNum(parsed.sfxVolume, DEFAULT_SETTINGS.sfxVolume), 0, 1),
                muted: !!parsed.muted
            };
        } catch (e) {
            return { ...DEFAULT_SETTINGS };
        }
    };

    const settings = loadSettings();
    const registeredAudio = new Set();

    const persistSettings = () => {
        try {
            getStorage().setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            // no-op
        }
    };

    const effectiveVolumeFor = (type, base = 1) => {
        if (settings.muted) return 0;
        const master = type === 'music' ? settings.musicVolume : settings.sfxVolume;
        return clamp(master * base, 0, 1);
    };

    const registerAudio = (audio, type = 'sfx', baseVolume = 1) => {
        if (!audio) return audio;
        audio.__audioRole = type;
        audio.__baseVolume = clamp(toNum(baseVolume, 1), 0, 1);
        registeredAudio.add(audio);
        audio.addEventListener('ended', () => registeredAudio.delete(audio), { once: true });
        audio.addEventListener('error', () => registeredAudio.delete(audio), { once: true });
        audio.volume = effectiveVolumeFor(type, audio.__baseVolume);
        return audio;
    };

    const applyVolumes = () => {
        registeredAudio.forEach((audio) => {
            if (!audio) return;
            const role = audio.__audioRole || 'sfx';
            const base = clamp(toNum(audio.__baseVolume, 1), 0, 1);
            audio.volume = effectiveVolumeFor(role, base);
        });
        window.dispatchEvent(new CustomEvent('audio-settings-changed', { detail: { ...settings } }));
    };

    const setMusicVolume = (v) => {
        settings.musicVolume = clamp(toNum(v, settings.musicVolume), 0, 1);
        persistSettings();
        applyVolumes();
    };

    const setSfxVolume = (v) => {
        settings.sfxVolume = clamp(toNum(v, settings.sfxVolume), 0, 1);
        persistSettings();
        applyVolumes();
    };

    const setAudioMuted = (muted) => {
        settings.muted = !!muted;
        persistSettings();
        applyVolumes();
    };

    const getAudioSettings = () => ({ ...settings });

    const playSfx = (path, opts = {}) => {
        if (!path) return null;
        const audio = registerAudio(new Audio(path), 'sfx', toNum(opts.volume, 1));
        audio.preload = 'auto';
        audio.currentTime = 0;
        audio.play().catch(() => { });
        return audio;
    };

    const menuAudio = registerAudio(new Audio('Music/MainMenu.mp3'), 'music', 1);
    menuAudio.loop = true;
    menuAudio.preload = 'auto';
    let pendingMenuAutoplay = false;

    let menuFadeInterval = null;
    let menuFading = false;

    const clearMenuFade = () => {
        if (menuFadeInterval) {
            clearInterval(menuFadeInterval);
            menuFadeInterval = null;
        }
        menuFading = false;
    };

    const fadeMenuTo = (target, duration = 800, stopAfter = false) => new Promise((resolve) => {
        clearMenuFade();
        menuFading = true;
        const start = menuAudio.volume;
        const end = clamp(target, 0, 1);
        const startAt = performance.now();
        const tickMs = 30;

        menuFadeInterval = setInterval(() => {
            const t = clamp((performance.now() - startAt) / Math.max(1, duration), 0, 1);
            menuAudio.volume = start + (end - start) * t;
            if (t >= 1) {
                clearMenuFade();
                if (stopAfter) {
                    menuAudio.pause();
                    menuAudio.currentTime = 0;
                }
                resolve();
            }
        }, tickMs);
    });

    const stopMusicImmediate = () => {
        clearMenuFade();
        pendingMenuAutoplay = false;
        menuAudio.pause();
        menuAudio.currentTime = 0;
        stopGameplayMusic({ immediate: true });
    };

    // Gameplay music engine (no repeat until full cycle is played)
    const gameplayA = registerAudio(new Audio(), 'music', 1);
    const gameplayB = registerAudio(new Audio(), 'music', 1);
    gameplayA.preload = 'auto';
    gameplayB.preload = 'auto';

    let gameplayQueue = [];
    let gameplayModeActive = false;
    let activeGameplayAudio = gameplayA;
    let idleGameplayAudio = gameplayB;
    let gameplayCrossfadeMs = 3800;
    let gameplayTransitioning = false;
    let gameplayMonitor = null;

    const nextTrackFromQueue = () => {
        if (gameplayQueue.length === 0) {
            gameplayQueue = shuffle(PLAYLIST_TRACKS);
        }
        return gameplayQueue.shift();
    };

    const fadePair = (fromAudio, toAudio, durationMs) => new Promise((resolve) => {
        const startAt = performance.now();
        const fromStart = fromAudio ? fromAudio.volume : 0;
        const toStart = toAudio ? toAudio.volume : 0;
        const targetMusic = effectiveVolumeFor('music', 1);

        const step = () => {
            const t = clamp((performance.now() - startAt) / Math.max(1, durationMs), 0, 1);
            if (fromAudio) fromAudio.volume = fromStart + (0 - fromStart) * t;
            if (toAudio) toAudio.volume = toStart + (targetMusic - toStart) * t;
            if (t >= 1) {
                resolve();
                return;
            }
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    });

    const clearGameplayMonitor = () => {
        if (gameplayMonitor) {
            clearInterval(gameplayMonitor);
            gameplayMonitor = null;
        }
    };

    const startGameplayMonitor = () => {
        clearGameplayMonitor();
        gameplayMonitor = setInterval(async () => {
            if (!gameplayModeActive || gameplayTransitioning) return;
            const current = activeGameplayAudio;
            if (!current || current.paused) return;
            const duration = Number.isFinite(current.duration) ? current.duration : 0;
            if (!duration || duration <= 0) return;
            const remaining = duration - current.currentTime;
            if (remaining <= gameplayCrossfadeMs / 1000) {
                gameplayTransitioning = true;
                const nextTrack = nextTrackFromQueue();
                idleGameplayAudio.src = nextTrack;
                idleGameplayAudio.currentTime = 0;
                idleGameplayAudio.volume = 0;
                await idleGameplayAudio.play().catch(() => { gameplayTransitioning = false; });
                await fadePair(current, idleGameplayAudio, gameplayCrossfadeMs);
                current.pause();
                current.currentTime = 0;
                [activeGameplayAudio, idleGameplayAudio] = [idleGameplayAudio, activeGameplayAudio];
                gameplayTransitioning = false;
            }
        }, 250);
    };

    const stopGameplayMusic = async (opts = {}) => {
        gameplayModeActive = false;
        clearGameplayMonitor();
        const immediate = !!opts.immediate;
        if (!immediate) {
            await fadePair(gameplayA, null, toNum(opts.fadeOutMs, 900));
            await fadePair(gameplayB, null, toNum(opts.fadeOutMs, 900));
        }
        gameplayA.pause(); gameplayA.currentTime = 0;
        gameplayB.pause(); gameplayB.currentTime = 0;
        gameplayA.src = '';
        gameplayB.src = '';
    };

    const startGameplayMusic = async (opts = {}) => {
        if (!opts.forceRestart && gameplayModeActive && activeGameplayAudio && !activeGameplayAudio.paused && activeGameplayAudio.src) {
            return;
        }
        const fadeInMs = toNum(opts.fadeInMs, 1600);
        gameplayCrossfadeMs = clamp(toNum(opts.crossfadeMs, gameplayCrossfadeMs), 1400, 9000);

        await fadeOutBackgroundMusic(500).catch(() => { });
        gameplayModeActive = true;
        gameplayTransitioning = false;

        activeGameplayAudio.pause();
        idleGameplayAudio.pause();
        activeGameplayAudio.currentTime = 0;
        idleGameplayAudio.currentTime = 0;

        const firstTrack = nextTrackFromQueue();
        activeGameplayAudio.src = firstTrack;
        activeGameplayAudio.volume = 0;

        await activeGameplayAudio.play().catch(() => { });
        await fadePair(null, activeGameplayAudio, fadeInMs);
        startGameplayMonitor();
    };

    const playBackgroundMusic = async (opts = {}) => {
        const fadeInMs = toNum(opts.fadeInMs, 1200);
        const immediateStart = !!opts.immediate;
        await stopGameplayMusic({ fadeOutMs: 300 });
        clearMenuFade();
        menuAudio.__baseVolume = 1;
        menuAudio.volume = immediateStart ? effectiveVolumeFor('music', 1) : 0;
        try {
            await menuAudio.play();
            pendingMenuAutoplay = false;
        } catch (e) {
            pendingMenuAutoplay = true;
            return;
        }
        if (immediateStart) {
            return;
        }
        return fadeMenuTo(effectiveVolumeFor('music', 1), fadeInMs, false);
    };

    const restartBackgroundMusic = async (opts = {}) => {
        menuAudio.currentTime = 0;
        return playBackgroundMusic(opts);
    };

    const fadeOutBackgroundMusic = (duration = 1200) => {
        if (menuAudio.paused) return Promise.resolve();
        return fadeMenuTo(0, duration, true);
    };

    const stopBackgroundMusic = () => {
        pendingMenuAutoplay = false;
        fadeOutBackgroundMusic(900).catch(() => { });
    };

    const isMainMenuVisible = () => {
        const menu = document.getElementById('mainMenuOverlay');
        if (!menu) return false;
        if (menu.classList.contains('hidden')) return false;
        if (menu.style.display === 'none') return false;
        return true;
    };

    const recoverPendingMenuAutoplay = () => {
        if (!pendingMenuAutoplay) return;
        if (gameplayModeActive) return;
        if (!isMainMenuVisible()) return;
        playBackgroundMusic({ immediate: true }).catch(() => { });
    };

    const isMusicPlaying = () => {
        const menuPlaying = !menuAudio.paused && !menuAudio.ended;
        const gameplayPlaying = (!gameplayA.paused && !!gameplayA.src) || (!gameplayB.paused && !!gameplayB.src);
        return menuPlaying || gameplayPlaying;
    };

    const isMusicFading = () => menuFading || gameplayTransitioning;

    window.getAudioSettings = getAudioSettings;
    window.setMusicVolume = setMusicVolume;
    window.setSfxVolume = setSfxVolume;
    window.setAudioMuted = setAudioMuted;
    window.toggleAudioMuted = () => setAudioMuted(!settings.muted);
    window.playSfx = playSfx;
    window.applyAudioPreferencesToElement = (audio, type = 'sfx', baseVolume = 1) => registerAudio(audio, type, baseVolume);

    // Compatibility + existing callsites
    window.stopBackgroundMusic = stopBackgroundMusic;
    window.fadeOutBackgroundMusic = fadeOutBackgroundMusic;
    window.playBackgroundMusic = playBackgroundMusic;
    window.restartBackgroundMusic = restartBackgroundMusic;
    window.stopMusicImmediate = stopMusicImmediate;
    window.isMusicPlaying = isMusicPlaying;
    window.isMusicFading = isMusicFading;

    // New gameplay API
    window.startGameplayMusic = startGameplayMusic;
    window.stopGameplayMusic = stopGameplayMusic;
    window.isGameplayMusicActive = () => gameplayModeActive;

    applyVolumes();

    const bootMenuMusic = () => {
        if (gameplayModeActive) return;
        playBackgroundMusic({ immediate: true }).catch(() => { });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootMenuMusic, { once: true });
    } else {
        setTimeout(bootMenuMusic, 0);
    }

    let menuAutoplayRetryTimer = null;
    const startAutoplayRetryLoop = () => {
        if (menuAutoplayRetryTimer) return;
        menuAutoplayRetryTimer = setInterval(() => {
            if (!pendingMenuAutoplay || gameplayModeActive || !isMainMenuVisible()) {
                return;
            }
            playBackgroundMusic({ immediate: true }).catch(() => { });
        }, 700);
    };
    startAutoplayRetryLoop();

    ['pageshow', 'visibilitychange', 'focus'].forEach((evt) => {
        window.addEventListener(evt, () => {
            if (evt === 'visibilitychange' && document.visibilityState !== 'visible') return;
            recoverPendingMenuAutoplay();
        });
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            recoverPendingMenuAutoplay();
        }
    });
})();
