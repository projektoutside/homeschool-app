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
    let lastPlayedTrack = null;
    let crossfadeTimer = null;
    let crossfadeRunId = 0;

    const CROSSFADE_LEAD_SECONDS = 5;
    const CROSSFADE_DURATION_MS = 4000;
    const TRACK_MONITOR_INTERVAL_MS = 250;

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
    let menuAutoplayBlockedNotified = false;

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
                    const errName = String(err?.name || '');
                    const errMsg = String(err?.message || '');
                    const isAutoplayBlocked =
                        errName === 'NotAllowedError' ||
                        /notallowed|user\s+didn'?t\s+interact|play\(\)\s+failed/i.test(errMsg);

                    if (isAutoplayBlocked) {
                        if (!menuAutoplayBlockedNotified) {
                            menuAutoplayBlockedNotified = true;
                            console.info('Menu music will start after first user interaction.');
                        }

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
                        return;
                    }

                    console.warn('Menu music playback failed:', err);
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
        if (track.__fadeRafId) {
            cancelAnimationFrame(track.__fadeRafId);
            track.__fadeRafId = null;
        }

        const safeDuration = Math.max(1, Number(duration) || 1);
        const startTime = performance.now();
        track.volume = clamp(fromVol, 0, 1);

        const animate = (now) => {
            const progress = clamp((now - startTime) / safeDuration, 0, 1);
            const nextVol = fromVol + (toVol - fromVol) * progress;
            track.volume = clamp(nextVol, 0, 1);

            if (progress < 1) {
                track.__fadeRafId = requestAnimationFrame(animate);
                return;
            }

            track.__fadeRafId = null;
            track.volume = clamp(toVol, 0, 1);
            if (onComplete) onComplete();
        };

        track.__fadeRafId = requestAnimationFrame(animate);
        return track.__fadeRafId;
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

            const onTrackEnded = (track) => {
                if (!gameplayActive || track !== activeTrack) return;
                if (isCrossfading) return;
                // Fallback: if timing-based crossfade missed, continue anyway.
                beginCrossfade({ fromEnded: true });
            };

            const onTrackError = (track) => {
                if (!gameplayActive || track !== activeTrack) return;
                if (isCrossfading) return;
                console.warn('Active gameplay track error, skipping to next track.');
                beginCrossfade({ fromEnded: true });
            };

            gameplayTrackA.addEventListener('ended', () => onTrackEnded(gameplayTrackA));
            gameplayTrackB.addEventListener('ended', () => onTrackEnded(gameplayTrackB));
            gameplayTrackA.addEventListener('error', () => onTrackError(gameplayTrackA));
            gameplayTrackB.addEventListener('error', () => onTrackError(gameplayTrackB));

            activeTrack = gameplayTrackA;
            idleTrack = gameplayTrackB;
        }
    }

    function getNextTrack() {
        if (playlistQueue.length === 0) {
            playlistQueue = shuffle(PLAYLIST);
        }

        // Avoid immediate back-to-back repeat when queue reshuffles.
        if (playlistQueue.length > 1) {
            const peek = playlistQueue[playlistQueue.length - 1];
            if (peek === lastPlayedTrack) {
                const idx = playlistQueue.findIndex(track => track !== lastPlayedTrack);
                if (idx >= 0) {
                    const [swapIn] = playlistQueue.splice(idx, 1);
                    playlistQueue.push(swapIn);
                }
            }
        }

        const next = playlistQueue.pop();
        lastPlayedTrack = next;
        return next;
    }

    function cleanupTrackAfterFade(track) {
        if (!track) return;
        if (track.__fadeRafId) {
            cancelAnimationFrame(track.__fadeRafId);
            track.__fadeRafId = null;
        }
        track.pause();
        track.currentTime = 0;
    }

    function beginCrossfade(opts = {}) {
        if (!gameplayActive || isCrossfading || !activeTrack || !idleTrack) return;

        const fromEnded = !!opts.fromEnded;
        const runId = ++crossfadeRunId;
        isCrossfading = true;

        const outgoingTrack = activeTrack;
        const incomingTrack = idleTrack;
        const nextTrack = getNextTrack();
        const targetVol = getEffectiveVolume('music', 1);
        const fadeMs = fromEnded ? Math.min(1200, CROSSFADE_DURATION_MS) : CROSSFADE_DURATION_MS;

        incomingTrack.src = nextTrack;
        incomingTrack.currentTime = 0;
        incomingTrack.volume = 0;

        incomingTrack.play()
            .then(() => {
                if (!gameplayActive || runId !== crossfadeRunId) return;

                if (fromEnded) {
                    cleanupTrackAfterFade(outgoingTrack);
                } else {
                    fadeTrack(outgoingTrack, outgoingTrack.volume, 0, fadeMs, () => {
                        cleanupTrackAfterFade(outgoingTrack);
                    });
                }

                fadeTrack(incomingTrack, 0, targetVol, fadeMs, () => {
                    if (!gameplayActive || runId !== crossfadeRunId) return;
                    [activeTrack, idleTrack] = [incomingTrack, outgoingTrack];
                    isCrossfading = false;
                });
            })
            .catch(e => {
                console.warn('Next track failed to play:', e);
                isCrossfading = false;

                // Recovery path: keep music alive by retrying shortly.
                if (gameplayActive) {
                    setTimeout(() => {
                        if (gameplayActive && !isCrossfading) {
                            beginCrossfade({ fromEnded: true });
                        }
                    }, 600);
                }
            });
    }

    function startGameplayMusic(opts = {}) {
        if (gameplayActive && !opts.forceRestart) return Promise.resolve();

        initGameplayTracks();

        if (opts.forceRestart) {
            stopGameplayMusic({ immediate: true });
        }

        gameplayActive = true;
        isCrossfading = false;
        crossfadeRunId++;
        playlistQueue = [];
        lastPlayedTrack = null;

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
            if (!gameplayActive || !activeTrack) {
                return;
            }

            if (isCrossfading) return;

            if (activeTrack.ended) {
                beginCrossfade({ fromEnded: true });
                return;
            }

            if (activeTrack.paused) {
                // Recovery path: resume if possible, otherwise advance to next track.
                activeTrack.play().catch(() => {
                    beginCrossfade({ fromEnded: true });
                });
                return;
            }

            const duration = activeTrack.duration;
            const current = activeTrack.currentTime;
            const remaining = duration - current;

            // Start Crossfade at 5 seconds remaining
            if (Number.isFinite(remaining) && remaining > 0 && remaining <= CROSSFADE_LEAD_SECONDS && idleTrack.paused) {
                beginCrossfade({ fromEnded: false });
            }
        }, TRACK_MONITOR_INTERVAL_MS);
    }

    function stopGameplayMusic(opts = {}) {
        gameplayActive = false;
        isCrossfading = false;
        crossfadeRunId++;
        if (crossfadeTimer) {
            clearInterval(crossfadeTimer);
            crossfadeTimer = null;
        }

        const stopTrack = (track) => {
            if (track) {
                if (track.__fadeRafId) {
                    cancelAnimationFrame(track.__fadeRafId);
                    track.__fadeRafId = null;
                }
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
