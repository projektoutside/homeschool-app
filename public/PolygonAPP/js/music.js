/**
 * Polygon Audio System - Production Ready V3
 * Clean, simple, bulletproof implementation
 */

(() => {
    'use strict';

    // ==================== CONFIGURATION ====================

    const STORAGE_KEY = 'polygonAudio_v3';
    const DEFAULT_MUSIC_VOLUME = 0.7;
    const DEFAULT_SFX_VOLUME = 0.75;

    const PLAYLIST = [
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

    // ==================== STATE ====================

    const state = {
        musicVolume: DEFAULT_MUSIC_VOLUME,
        sfxVolume: DEFAULT_SFX_VOLUME,
        muted: false
    };

    const audioElements = new Set(); // Track all audio for volume updates
    let saveTimer = null;

    // Menu music
    let menuAudio = null;
    let menuFadeTimer = null;

    // Gameplay music
    let gameplayActive = false;
    let gameplayTrackA = null;
    let gameplayTrackB = null;
    let activeTrack = null;
    let idleTrack = null;
    let playlistQueue = [];
    let crossfadeTimer = null;

    // ==================== HELPERS ====================

    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    function shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // ==================== STORAGE ====================

    function loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                if (typeof data.musicVolume === 'number') state.musicVolume = clamp(data.musicVolume, 0, 1);
                if (typeof data.sfxVolume === 'number') state.sfxVolume = clamp(data.sfxVolume, 0, 1);
                if (typeof data.muted === 'boolean') state.muted = data.muted;
            }
        } catch (e) {
            console.warn('Failed to load audio settings:', e);
        }
    }

    function saveSettings() {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (e) {
                console.warn('Failed to save audio settings:', e);
            }
        }, 300);
    }

    // ==================== VOLUME MANAGEMENT ====================

    function getEffectiveVolume(type, baseVolume = 1) {
        if (state.muted) return 0;
        const master = type === 'music' ? state.musicVolume : state.sfxVolume;
        return clamp(master * baseVolume, 0, 1);
    }

    function updateAllVolumes() {
        audioElements.forEach(audioData => {
            if (audioData && audioData.element) {
                const effectiveVol = getEffectiveVolume(audioData.type, audioData.baseVol);
                audioData.element.volume = effectiveVol;
            }
        });

        // Dispatch event for UI sync
        window.dispatchEvent(new CustomEvent('audio-settings-changed', {
            detail: { ...state }
        }));
    }

    function registerAudio(element, type, baseVol = 1) {
        const data = { element, type, baseVol };
        audioElements.add(data);

        // Set initial volume
        element.volume = getEffectiveVolume(type, baseVol);

        // Auto-cleanup
        const cleanup = () => audioElements.delete(data);
        element.addEventListener('ended', cleanup, { once: true });
        element.addEventListener('error', cleanup, { once: true });

        return element;
    }

    // ==================== PUBLIC API ====================

    function setMusicVolume(vol) {
        state.musicVolume = clamp(Number(vol) || 0, 0, 1);
        updateAllVolumes();
        saveSettings();
    }

    function setSfxVolume(vol) {
        state.sfxVolume = clamp(Number(vol) || 0, 0, 1);
        updateAllVolumes();
        saveSettings();
    }

    function setAudioMuted(muted) {
        state.muted = !!muted;
        updateAllVolumes();
        saveSettings();
    }

    function getAudioSettings() {
        return { ...state };
    }

    function playSfx(path, opts = {}) {
        if (!path) return null;
        const audio = new Audio(path);
        registerAudio(audio, 'sfx', opts.volume || 1);
        audio.play().catch(() => { });
        return audio;
    }

    // ==================== MENU MUSIC ====================

    function initMenuMusic() {
        if (!menuAudio) {
            menuAudio = new Audio('Music/MainMenu.mp3');
            menuAudio.loop = true;
            menuAudio.preload = 'auto';

            // Keep persistent
            const data = { element: menuAudio, type: 'music', baseVol: 1 };
            audioElements.add(data);
            menuAudio.volume = getEffectiveVolume('music', 1);
        }
    }

    let audioUnlockListenersBound = false;

    function playBackgroundMusic(opts = {}) {
        initMenuMusic();

        if (gameplayActive) return Promise.resolve();

        // Ensure volume is up-to-date
        menuAudio.volume = getEffectiveVolume('music', 1);

        const promise = menuAudio.play();

        if (promise !== undefined) {
            return promise
                .then(() => {
                    // Success
                })
                .catch(err => {
                    console.warn('Menu music autoplay blocked. Waiting for interaction...', err);
                    if (!audioUnlockListenersBound) {
                        audioUnlockListenersBound = true;
                        const unlock = () => {
                            // Only try if still in menu mode
                            if (!gameplayActive) {
                                playBackgroundMusic({ immediate: true });
                            }
                            audioUnlockListenersBound = false;
                            ['click', 'touchstart', 'keydown'].forEach(e =>
                                document.removeEventListener(e, unlock)
                            );
                        };
                        ['click', 'touchstart', 'keydown'].forEach(e =>
                            document.addEventListener(e, unlock, { once: true })
                        );
                    }
                });
        }
        return Promise.resolve();
    }

    function stopBackgroundMusic() {
        if (menuAudio) {
            menuAudio.pause();
            menuAudio.currentTime = 0;
        }
    }

    function fadeOutBackgroundMusic(durationMs = 800) {
        if (!menuAudio || menuAudio.paused) return Promise.resolve();

        // Simple fade: just stop for now
        return new Promise(resolve => {
            setTimeout(() => {
                stopBackgroundMusic();
                resolve();
            }, durationMs);
        });
    }

    // ==================== GAMEPLAY MUSIC ====================

    // ==================== FADING HELPERS ====================

    function fadeTrack(track, fromVol, toVol, duration, onComplete) {
        if (!track) return;
        const steps = 20;
        const stepTime = duration / steps;
        const volStep = (toVol - fromVol) / steps;
        let currentStep = 0;

        track.volume = fromVol;

        const fadeInterval = setInterval(() => {
            currentStep++;
            const newVol = fromVol + (volStep * currentStep);
            track.volume = clamp(newVol, 0, 1);

            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                track.volume = toVol;
                if (onComplete) onComplete();
            }
        }, stepTime);

        return fadeInterval;
    }

    // ==================== GAMEPLAY MUSIC ====================

    function initGameplayTracks() {
        if (!gameplayTrackA) {
            gameplayTrackA = new Audio();
            gameplayTrackA.preload = 'auto';
            const dataA = { element: gameplayTrackA, type: 'music', baseVol: 1 };
            audioElements.add(dataA);

            gameplayTrackB = new Audio();
            gameplayTrackB.preload = 'auto';
            const dataB = { element: gameplayTrackB, type: 'music', baseVol: 1 };
            audioElements.add(dataB);

            activeTrack = gameplayTrackA;
            idleTrack = gameplayTrackB;
        }
    }

    function getNextTrack() {
        if (playlistQueue.length === 0) {
            playlistQueue = shuffle(PLAYLIST);
        }
        return playlistQueue.pop();
    }

    function startGameplayMusic(opts = {}) {
        if (gameplayActive && !opts.forceRestart) return Promise.resolve();

        initGameplayTracks();
        gameplayActive = true;

        // Stop menu music
        fadeOutBackgroundMusic(500);

        // Load first track
        const firstTrack = getNextTrack();
        activeTrack.src = firstTrack;
        activeTrack.currentTime = 0;

        const targetVol = getEffectiveVolume('music', 1);
        const fadeInDuration = opts.fadeInMs || 2000; // Default to 2s fade in

        // Start silent then fade in
        activeTrack.volume = 0;

        return activeTrack.play()
            .then(() => {
                // Fade In
                fadeTrack(activeTrack, 0, targetVol, fadeInDuration);
                // Monitor for track end
                monitorGameplayMusic();
            })
            .catch(err => {
                console.warn('Gameplay music failed:', err);
                gameplayActive = false;
            });
    }

    let isCrossfading = false;

    function monitorGameplayMusic() {
        if (crossfadeTimer) clearInterval(crossfadeTimer);
        isCrossfading = false;

        crossfadeTimer = setInterval(() => {
            if (!gameplayActive || !activeTrack || activeTrack.paused) {
                if (crossfadeTimer) clearInterval(crossfadeTimer);
                return;
            }

            if (isCrossfading) return;

            const duration = activeTrack.duration;
            const current = activeTrack.currentTime;
            const remaining = duration - current;

            // Start Crossfade at 5 seconds remaining
            if (remaining > 0 && remaining < 5 && idleTrack.paused) {
                isCrossfading = true;

                const nextTrack = getNextTrack();
                idleTrack.src = nextTrack;
                idleTrack.currentTime = 0;
                const targetVol = getEffectiveVolume('music', 1);
                idleTrack.volume = 0;

                idleTrack.play().then(() => {
                    // Crossfade: Fade OUT active, Fade IN idle
                    fadeTrack(activeTrack, activeTrack.volume, 0, 4000);
                    fadeTrack(idleTrack, 0, targetVol, 4000, () => {
                        // After fade complete
                        activeTrack.pause();
                        activeTrack.currentTime = 0;
                        // Swap
                        [activeTrack, idleTrack] = [idleTrack, activeTrack];
                        isCrossfading = false;
                    });
                }).catch(e => {
                    console.warn('Next track failed to play:', e);
                    isCrossfading = false;
                });
            }
        }, 500);
    }

    function stopGameplayMusic(opts = {}) {
        gameplayActive = false;
        if (crossfadeTimer) {
            clearInterval(crossfadeTimer);
            crossfadeTimer = null;
        }

        const stopTrack = (track) => {
            if (track) {
                if (opts.fadeOutMs) {
                    fadeTrack(track, track.volume, 0, opts.fadeOutMs, () => {
                        track.pause();
                        track.currentTime = 0;
                    });
                } else {
                    track.pause();
                    track.currentTime = 0;
                }
            }
        };

        stopTrack(gameplayTrackA);
        stopTrack(gameplayTrackB);

        return Promise.resolve();
    }

    // ==================== EXPOSE API ====================

    window.setMusicVolume = setMusicVolume;
    window.setSfxVolume = setSfxVolume;
    window.setAudioMuted = setAudioMuted;
    window.toggleAudioMuted = () => setAudioMuted(!state.muted);
    window.getAudioSettings = getAudioSettings;
    window.playSfx = playSfx;

    window.playBackgroundMusic = playBackgroundMusic;
    window.stopBackgroundMusic = stopBackgroundMusic;
    window.fadeOutBackgroundMusic = fadeOutBackgroundMusic;
    window.restartBackgroundMusic = (opts) => {
        if (menuAudio) menuAudio.currentTime = 0;
        return playBackgroundMusic(opts);
    };

    window.startGameplayMusic = startGameplayMusic;
    window.stopGameplayMusic = stopGameplayMusic;
    window.isGameplayMusicActive = () => gameplayActive;
    window.stopMusicImmediate = () => {
        stopBackgroundMusic();
        stopGameplayMusic({ immediate: true });
    };

    // ==================== INIT ====================

    loadSettings();
    updateAllVolumes();

    // Auto-start menu music
    function tryAutoplay() {
        if (!gameplayActive && (!menuAudio || menuAudio.paused)) {
            playBackgroundMusic({ immediate: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(tryAutoplay, 100);
        });
    } else {
        setTimeout(tryAutoplay, 100);
    }

    // Recover on visibility change
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && menuAudio && menuAudio.paused && !gameplayActive) {
            playBackgroundMusic({ immediate: true });
        }
    });

    console.log('[Audio] System initialized v3');

})();
