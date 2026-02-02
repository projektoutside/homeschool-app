// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM MP3 VOICE SYSTEM
// Manages playback of pre-recorded MP3 files for the car guessing game.
// ═══════════════════════════════════════════════════════════════════════════════

class AdvancedVoiceSystem {
    constructor() {
        this.currentAudio = null;
        this.enabled = true;

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

    // Helper to play two clips in sequence seamlessly
    playSequence(firstPath, secondPath) {
        if (!this.enabled) return Promise.resolve();
        this.cancel();

        return new Promise((resolve) => {
            const audio1 = new Audio(encodeURI(firstPath));
            const audio2 = new Audio(encodeURI(secondPath));

            // Preload both for seamless transition
            audio1.load();
            audio2.load();

            let firstFinished = false;

            audio1.onended = () => {
                firstFinished = true;
                console.log(`🔊 Seq part 1 done, playing part 2: ${secondPath}`);

                // CRITICAL FIX: Update currentAudio to the new track so it can be cancelled
                this.currentAudio = audio2;

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
                resolve();
            };

            // Error handling fallback
            audio1.onerror = () => {
                console.warn("Audio 1 error, skipping to Audio 2");
                this.currentAudio = audio2;
                audio2.play().catch(() => {
                    this.currentAudio = null;
                    resolve();
                });
            };

            // Start sequence
            this.currentAudio = audio1;
            const playPromise = audio1.play();

            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn("Audio 1 playback failed, skipping to Audio 2:", e);
                    this.currentAudio = audio2;
                    audio2.play().catch(() => {
                        this.currentAudio = null;
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
        console.log("✅ Custom MP3 Voice System initialized!");
    }

    // Play a specific audio file
    playClip(path) {
        if (!this.enabled) return Promise.resolve();

        this.cancel(); // Stop any currently playing audio

        return new Promise((resolve) => {
            // Encode the path to handle spaces or special characters safely
            const safePath = encodeURI(path);
            this.currentAudio = new Audio(safePath);

            // Handle completion
            this.currentAudio.onended = () => {
                this.currentAudio = null;
                resolve();
            };

            // Handle errors
            this.currentAudio.onerror = (e) => {
                console.warn(`⚠️ Failed to play audio file: ${safePath}`, e);
                this.currentAudio = null;
                resolve();
            };

            // Play
            this.currentAudio.load(); // Ensure it's loaded
            const playPromise = this.currentAudio.play();

            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn(`⚠️ Audio playback interrupted or failed: ${safePath}`, e);
                    this.currentAudio = null;
                    resolve();
                });
            }
        });
    }

    cancel() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GAME PLAYBACK METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    sayQuestion() {
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
        return this.playClip(path);
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
