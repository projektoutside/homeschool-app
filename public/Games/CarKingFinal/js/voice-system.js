// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM MP3 VOICE SYSTEM
// Manages playback of pre-recorded MP3 files for the car guessing game.
// ═══════════════════════════════════════════════════════════════════════════════

class AdvancedVoiceSystem {
    constructor() {
        this.currentAudio = null;
        this.currentAudioElement = null;
        this.currentSourceNode = null;
        this.enabled = true;
        this.audioContext = null;
        this.masterGain = null;
        this.normalGain = 1;
        this.duckedGain = 0.35;
        this.isListeningMode = false;
        this.clipCache = new Map();
        this.protectedPlaybackToken = null;

        // List of available MP3 files for the "asking" phase (What car is this?)
        this.askingClips = [
            "ElevenLabs_2026-01-30T22_10_51_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_12_09_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_13_06_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_14_38_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_16_43_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_17_52_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_19_05_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_20_50_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_21_45_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_22_07_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_22_51_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_24_44_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_25_41_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_27_03_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_28_14_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_29_38_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_32_53_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_33_44_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_35_40_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_37_51_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_39_29_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_39_56_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_41_46_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_42_39_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_44_14_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_44_52_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_46_16_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_48_54_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_50_36_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_51_29_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_53_24_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_54_25_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_55_15_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_58_37_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T22_59_34_funnyasian_gen_sp98_s50_sb75_v3.mp3"
        ];

        this.cache = {}; // Simple cache for preloaded audio

        // History tracking to prevent repetition
        this.recentClips = [];
        this.historySize = 15; // Remember last 15 clips to ensure variety (approx 40% of pool)

        // Correct Answer Clips
        this.correctClips = [
            "ElevenLabs_2026-01-30T23_05_00_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_05_28_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_05_55_funnyasian_gen_sp98_s50_sb75_v3 (1).mp3",
            "ElevenLabs_2026-01-30T23_05_55_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_08_07_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_08_29_funnyasian_gen_sp98_s50_sb75_v3 (1).mp3",
            "ElevenLabs_2026-01-30T23_08_29_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_08_58_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_09_22_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_09_46_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_10_46_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_11_33_funnyasian_gen_sp98_s50_sb75_v3 (1).mp3",
            "ElevenLabs_2026-01-30T23_11_33_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_12_55_funnyasian_gen_sp98_s50_sb75_v3 (1).mp3",
            "ElevenLabs_2026-01-30T23_12_55_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_14_01_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_15_03_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_19_17_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_22_08_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_23_16_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_23_50_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_24_30_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_25_20_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_25_55_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_27_08_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_27_56_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_29_02_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_29_22_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_29_51_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_30_46_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_31_27_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_32_01_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_32_31_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_33_06_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-01-30T23_34_12_funnyasian_gen_sp98_s50_sb75_v3.mp3"
        ];

        // Wrong Answer Clips
        this.wrongClips = [
            "ElevenLabs_2026-02-01T22_43_42_funnyasian_gen_sp98_s50_sb75_v3 (1).mp3",
            "ElevenLabs_2026-02-01T22_43_42_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T22_44_45_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T22_47_38_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T22_49_23_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T22_51_13_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T22_51_56_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T22_53_19_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T22_53_46_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T22_54_39_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T22_56_15_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T22_56_41_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T22_58_42_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T23_00_17_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T23_01_35_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T23_02_09_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T23_03_03_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T23_03_48_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T23_05_02_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T23_07_32_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T23_07_53_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T23_10_39_funnyasian_gen_sp98_s50_sb75_v3.mp3",
            "ElevenLabs_2026-02-01T23_10_51_funnyasian_gen_sp98_s50_sb75_v3.mp3"
        ];
    }

    async ensureAudioGraph() {
        if (!window.AudioContext && !window.webkitAudioContext) {
            return;
        }

        if (!this.audioContext) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new Ctx();
        }

        if (!this.masterGain) {
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.normalGain;
            this.masterGain.connect(this.audioContext.destination);
        }

        if (this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (e) {
                // Ignore; browser may require additional user gesture in edge cases.
            }
        }
    }

    async createManagedAudio(path) {
        const safePath = encodeURI(path);
        const audio = new Audio(safePath);
        audio.preload = 'auto';
        audio.playsInline = true;
        audio.crossOrigin = 'anonymous';

        await this.ensureAudioGraph();

        if (this.audioContext && this.masterGain) {
            try {
                const source = this.audioContext.createMediaElementSource(audio);
                source.connect(this.masterGain);
                audio.__sourceNode = source;
            } catch (e) {
                // Some browsers can throw if element is already connected or blocked.
                // Fallback to normal HTMLAudio playback path.
            }
        }

        return audio;
    }

    async preloadClip(path) {
        if (!path) return null;
        const normalizedPath = encodeURI(path);

        const cached = this.clipCache.get(normalizedPath);
        if (cached && cached.ready && cached.audio) {
            return cached.audio;
        }

        const audio = await this.createManagedAudio(normalizedPath);

        return new Promise((resolve) => {
            let settled = false;
            const done = (ready) => {
                if (settled) return;
                settled = true;
                cleanup();
                this.clipCache.set(normalizedPath, { audio, ready });
                resolve(audio);
            };

            const cleanup = () => {
                audio.removeEventListener('canplaythrough', onReady);
                audio.removeEventListener('loadeddata', onReady);
                audio.removeEventListener('error', onError);
            };

            const onReady = () => done(true);
            const onError = () => done(false);

            audio.addEventListener('canplaythrough', onReady, { once: true });
            audio.addEventListener('loadeddata', onReady, { once: true });
            audio.addEventListener('error', onError, { once: true });
            audio.preload = 'auto';
            audio.load();

            // Safety: never hang preload.
            setTimeout(() => done(audio.readyState >= 2), 1200);
        });
    }

    async setOutputGain(targetGain, fadeMs = 120) {
        await this.ensureAudioGraph();
        if (!this.masterGain || !this.audioContext) return;

        const now = this.audioContext.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(targetGain, now + (fadeMs / 1000));
    }

    setListeningMode(isListening) {
        this.isListeningMode = !!isListening;
        const gain = this.isListeningMode ? this.duckedGain : this.normalGain;
        this.setOutputGain(gain, 140);
    }

    // Helper to play two clips in sequence seamlessly
    playSequence(firstPath, secondPath) {
        if (!this.enabled) return Promise.resolve();
        this.cancel();

        return new Promise(async (resolve) => {
            const audio1 = await this.createManagedAudio(firstPath);
            const audio2 = await this.createManagedAudio(secondPath);

            // Preload both for seamless transition
            audio1.load();
            audio2.load();

            let firstFinished = false;

            audio1.onended = () => {
                firstFinished = true;
                console.log(`🔊 Seq part 1 done, playing part 2: ${secondPath}`);

                // CRITICAL FIX: Update currentAudio to the new track so it can be cancelled
                this.currentAudio = audio2;
                this.currentAudioElement = audio2;
                this.currentSourceNode = audio2.__sourceNode || null;

                const playPromise2 = audio2.play();
                if (playPromise2 !== undefined) {
                    playPromise2.catch(e => {
                        console.warn("Audio 2 failed:", e);
                        this.currentAudio = null;
                        resolve();
                    });
                }
            };

            audio2.onended = () => {
                this.currentAudio = null;
                this.currentAudioElement = null;
                this.currentSourceNode = null;
                resolve();
            };

            // Error handling fallback
            audio1.onerror = () => {
                console.warn("Audio 1 error, skipping to Audio 2");
                this.currentAudio = audio2;
                this.currentAudioElement = audio2;
                this.currentSourceNode = audio2.__sourceNode || null;
                audio2.play().catch(() => {
                    this.currentAudio = null;
                    this.currentAudioElement = null;
                    this.currentSourceNode = null;
                    resolve();
                });
            };

            // Start sequence
            this.currentAudio = audio1;
            this.currentAudioElement = audio1;
            this.currentSourceNode = audio1.__sourceNode || null;
            const playPromise = audio1.play();

            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn("Audio 1 playback failed, skipping to Audio 2:", e);
                    this.currentAudio = audio2;
                    this.currentAudioElement = audio2;
                    this.currentSourceNode = audio2.__sourceNode || null;
                    audio2.play().catch(() => {
                        this.currentAudio = null;
                        this.currentAudioElement = null;
                        this.currentSourceNode = null;
                        resolve();
                    });
                });
            }
        });
    }

    playCorrectSequence(carVoicePath) {
        if (this.correctClips.length === 0) {
            return this.playClip(carVoicePath);
        }

        const randomClip = this.correctClips[Math.floor(Math.random() * this.correctClips.length)];
        const path = `assets/audio/voice/correctanswers/${randomClip}`;

        console.log(`🎤 Playing Correct Sequence: ${randomClip} -> ${carVoicePath}`);
        return this.playSequence(path, carVoicePath);
    }

    playWrongSequence(carVoicePath) {
        if (this.wrongClips.length === 0) {
            console.log("⚠️ No wrong clips found, playing car voice directly.");
            return this.playClip(carVoicePath);
        }

        // Initialize history if needed
        if (!this.recentWrongClips) {
            this.recentWrongClips = [];
        }

        // Filter out recently played clips
        let availableClips = this.wrongClips.filter(clip => !this.recentWrongClips.includes(clip));

        // Safety fallback: if exhausted, reset
        if (availableClips.length === 0) {
            availableClips = this.wrongClips;
            this.recentWrongClips = [];
        }

        const randomClip = availableClips[Math.floor(Math.random() * availableClips.length)];

        // Update history (keep last 5 to ensure variety without exhausting pool too fast)
        this.recentWrongClips.push(randomClip);
        if (this.recentWrongClips.length > 5) {
            this.recentWrongClips.shift();
        }

        const path = `assets/audio/voice/wronganswers/${randomClip}`;

        console.log(`🎤 Playing Wrong Sequence: ${randomClip} -> ${carVoicePath}`);
        return this.playSequence(path, carVoicePath);
    }

    async init() {
        await this.ensureAudioGraph();
        console.log("✅ Custom MP3 Voice System initialized!");
    }

    // Play a specific audio file
    playClip(path, options = {}) {
        if (!this.enabled) return Promise.resolve();

        const {
            protectFromCancel = false,
            forceCancelExisting = false,
            reusePreloaded = true,
            onPlaybackStart = null,
            onPlaybackReady = null,
            onPlaybackEnd = null,
            readyLeadMs = 0
        } = options;

        this.cancel({ force: !!forceCancelExisting }); // Stop any currently playing audio

        const playbackToken = Symbol('voice-playback-token');
        if (protectFromCancel) {
            this.protectedPlaybackToken = playbackToken;
        }

        return new Promise(async (resolve) => {
            const normalizedPath = encodeURI(path);

            let managedAudio = null;
            if (reusePreloaded) {
                const cached = this.clipCache.get(normalizedPath);
                if (cached?.audio) {
                    managedAudio = cached.audio;
                }
            }

            if (!managedAudio) {
                managedAudio = await this.createManagedAudio(normalizedPath);
            }

            this.currentAudio = managedAudio;
            this.currentAudioElement = this.currentAudio;
            this.currentSourceNode = this.currentAudio.__sourceNode || null;

            let playbackStarted = false;
            let playbackReady = false;
            let readyTimer = null;

            const clearProtectionIfOwned = () => {
                if (this.protectedPlaybackToken === playbackToken) {
                    this.protectedPlaybackToken = null;
                }
            };

            const clearReadyTimer = () => {
                if (readyTimer) {
                    clearTimeout(readyTimer);
                    readyTimer = null;
                }
            };

            const markPlaybackStarted = () => {
                if (playbackStarted) return;
                playbackStarted = true;
                if (typeof onPlaybackStart === 'function') {
                    try {
                        onPlaybackStart({ at: performance.now(), path: normalizedPath });
                    } catch (e) {
                        console.warn('onPlaybackStart callback failed:', e);
                    }
                }
                schedulePlaybackReady();
            };

            const markPlaybackReady = () => {
                if (playbackReady) return;
                playbackReady = true;
                clearReadyTimer();
                if (typeof onPlaybackReady === 'function') {
                    try {
                        onPlaybackReady({
                            at: performance.now(),
                            path: normalizedPath,
                            duration: this.currentAudio?.duration || 0,
                            currentTime: this.currentAudio?.currentTime || 0
                        });
                    } catch (e) {
                        console.warn('onPlaybackReady callback failed:', e);
                    }
                }
            };

            const schedulePlaybackReady = () => {
                if (playbackReady || typeof onPlaybackReady !== 'function') return;

                const audio = this.currentAudio;
                const duration = audio?.duration;
                if (!Number.isFinite(duration) || duration <= 0) return;

                const remainingMs = Math.max(((duration - (audio.currentTime || 0)) * 1000) - readyLeadMs, 0);
                clearReadyTimer();
                readyTimer = setTimeout(() => {
                    if (!this.currentAudio || this.currentAudio !== audio) return;
                    markPlaybackReady();
                }, remainingMs);
            };

            this.currentAudio.onplaying = () => {
                markPlaybackStarted();
            };

            this.currentAudio.onloadedmetadata = () => {
                schedulePlaybackReady();
            };

            this.currentAudio.ondurationchange = () => {
                schedulePlaybackReady();
            };

            // Handle completion
            this.currentAudio.onended = () => {
                clearReadyTimer();
                this.currentAudio = null;
                this.currentAudioElement = null;
                this.currentSourceNode = null;
                clearProtectionIfOwned();
                if (typeof onPlaybackEnd === 'function') {
                    try {
                        onPlaybackEnd({ at: performance.now(), path: normalizedPath });
                    } catch (e) {
                        console.warn('onPlaybackEnd callback failed:', e);
                    }
                }
                resolve();
            };

            // Handle errors
            this.currentAudio.onerror = (e) => {
                console.warn(`⚠️ Failed to play audio file: ${path}`, e);
                clearReadyTimer();
                this.currentAudio = null;
                this.currentAudioElement = null;
                this.currentSourceNode = null;
                clearProtectionIfOwned();
                resolve();
            };

            // Play
            this.currentAudio.preload = 'auto';
            this.currentAudio.load(); // Ensure it's loaded
            const playPromise = this.currentAudio.play();

            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn(`⚠️ Audio playback interrupted or failed: ${path}`, e);
                    clearReadyTimer();
                    this.currentAudio = null;
                    this.currentAudioElement = null;
                    this.currentSourceNode = null;
                    clearProtectionIfOwned();
                    resolve();
                });
            }

            // Safety watchdog: some mobile browsers can skip onplaying callback.
            setTimeout(() => {
                if (!playbackStarted && this.currentAudio && !this.currentAudio.paused) {
                    markPlaybackStarted();
                }
            }, 240);
        });
    }

    cancel(options = {}) {
        const { force = false } = options;
        if (this.protectedPlaybackToken && !force) {
            return;
        }

        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        this.currentAudioElement = null;
        this.currentSourceNode = null;
        this.protectedPlaybackToken = null;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GAME PLAYBACK METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    sayQuestion(options = {}) {
        if (this.askingClips.length === 0) {
            console.warn("⚠️ No asking clips available");
            return Promise.resolve();
        }

        // Filter out recently played clips to ensure variety
        let availableClips = this.askingClips.filter(clip => !this.recentClips.includes(clip));

        // Safety fallback: if for some reason we exhausted options (shouldn't happen with logic size), reset
        if (availableClips.length === 0) {
            availableClips = this.askingClips;
            this.recentClips = [];
        }

        // Pick a random clip from the generated pool
        const randomClip = availableClips[Math.floor(Math.random() * availableClips.length)];

        // Update history
        this.recentClips.push(randomClip);
        if (this.recentClips.length > this.historySize) {
            this.recentClips.shift(); // Remove oldest clip
        }

        const path = `assets/audio/voice/asking/${randomClip}`;

        console.log(`🎤 Attempting to play question: ${randomClip}`);
        return this.playClip(path, options);
    }

    // Methods below are intentionally empty to remove AI voice generation.
    // They return Promises to maintain compatibility with script.js which expects async behavior.



















    // Configuration methods
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) this.cancel();
    }


}

// Make globally available
window.AdvancedVoiceSystem = AdvancedVoiceSystem;
