/**
 * Music Controller
 * Manages background music with smooth fades and intelligent randomization
 * Also manages sound effects volume
 */
class MusicController {
    constructor() {
        // Audio elements
        this.mainMenuAudio = null;
        this.gameplayAudio = null;
        this.nextAudio = null;

        // Music configuration
        this.mainMenuMusicPath = 'Music/MainMenu.mp3';

        // Gameplay tracks - easy to add more without code changes!
        // Just add your files to Music/Gameplaymusic/ and list them here
        this.availableTracks = [
            'Music/Gameplaymusic/background1.mp3',
            'Music/Gameplaymusic/background2.mp3',
            'Music/Gameplaymusic/background3.mp3',
            'Music/Gameplaymusic/background4.mp3',
            'Music/Gameplaymusic/background5.mp3'
        ];

        // Track playback state
        this.playedTracks = [];
        this.currentTrackIndex = -1;
        this.shuffledTracks = [];

        // Audio settings
        this.masterVolume = 0.7;
        this.musicVolume = 0.7; // Music volume (0.0 to 1.0)
        this.sfxVolume = 0.8;   // Sound effects volume (0.0 to 1.0)
        this.isMuted = false;   // Global mute state
        this.fadeDuration = 2000; // 2 seconds for smooth fades

        // State
        this.isPlaying = false;
        this.currentMode = null; // 'mainMenu' | 'gameplay' | null

        // Initialize shuffled tracks
        this.shuffleTracks();

        // Load saved sound settings
        this.loadSoundSettings();
    }

    getStorageKey(baseKey) {
        if (typeof window.getWordPuzzleStorageKey === 'function') {
            const resolvedKey = window.getWordPuzzleStorageKey(baseKey);
            if (typeof resolvedKey === 'string' && resolvedKey) {
                return resolvedKey;
            }
        }

        return baseKey;
    }

    /**
     * Load sound settings from localStorage
     */
    loadSoundSettings() {
        try {
            const savedSettings = localStorage.getItem(this.getStorageKey('wordGameSettings'));
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                
                // Load music volume (convert from percentage 0-100 to 0.0-1.0)
                if (settings.musicVolume !== undefined) {
                    this.musicVolume = Math.max(0, Math.min(1, settings.musicVolume / 100));
                }
                
                // Load SFX volume (convert from percentage 0-100 to 0.0-1.0)
                if (settings.sfxVolume !== undefined) {
                    this.sfxVolume = Math.max(0, Math.min(1, settings.sfxVolume / 100));
                }
                
                // Load mute state
                if (settings.muteAll !== undefined) {
                    this.isMuted = settings.muteAll;
                }
                
                // Apply loaded settings
                this.applySoundSettings();
                console.log('MusicController: Sound settings loaded', { 
                    musicVolume: this.musicVolume, 
                    sfxVolume: this.sfxVolume, 
                    isMuted: this.isMuted 
                });
            }
        } catch (e) {
            console.warn('MusicController: Failed to load sound settings:', e);
        }
    }

    /**
     * Apply current sound settings to active audio
     */
    applySoundSettings() {
        // Calculate effective volume (apply mute)
        const effectiveMusicVolume = this.isMuted ? 0 : this.musicVolume;
        const effectiveSfxVolume = this.isMuted ? 0 : this.sfxVolume;

        // Update master volume reference
        this.masterVolume = effectiveMusicVolume;

        // Apply to currently playing audio
        if (this.mainMenuAudio) {
            this.mainMenuAudio.volume = this.currentMode === 'mainMenu' ? effectiveMusicVolume : 0;
        }

        if (this.gameplayAudio) {
            this.gameplayAudio.volume = this.currentMode === 'gameplay' ? effectiveMusicVolume : 0;
        }

        console.log('MusicController: Sound settings applied', {
            effectiveMusicVolume,
            effectiveSfxVolume,
            isMuted: this.isMuted
        });
    }

    /**
     * Update sound settings from settings panel
     */
    updateSoundSettings(musicVolumePercent, sfxVolumePercent, isMuted) {
        this.musicVolume = Math.max(0, Math.min(1, musicVolumePercent / 100));
        this.sfxVolume = Math.max(0, Math.min(1, sfxVolumePercent / 100));
        this.isMuted = isMuted;
        
        this.applySoundSettings();
        console.log('MusicController: Sound settings updated');
    }

    /**
     * Get current sound settings for saving
     */
    getSoundSettings() {
        return {
            musicVolume: Math.round(this.musicVolume * 100),
            sfxVolume: Math.round(this.sfxVolume * 100),
            muteAll: this.isMuted
        };
    }

    /**
     * Shuffle tracks using Fisher-Yates algorithm
     */
    shuffleTracks() {
        this.shuffledTracks = [...this.availableTracks];
        for (let i = this.shuffledTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shuffledTracks[i], this.shuffledTracks[j]] = [this.shuffledTracks[j], this.shuffledTracks[i]];
        }
        this.playedTracks = [];
        this.currentTrackIndex = -1;
        console.log('MusicController: Tracks shuffled');
    }

    /**
     * Get the next gameplay track (randomized, no repeats until all played)
     */
    getNextGameplayTrack() {
        if (this.shuffledTracks.length === 0) {
            console.warn('MusicController: No gameplay tracks available');
            return null;
        }

        // Move to next track
        this.currentTrackIndex++;

        // If we've played all tracks, reshuffle
        if (this.currentTrackIndex >= this.shuffledTracks.length) {
            this.shuffleTracks();
            this.currentTrackIndex = 0;
        }

        const nextTrack = this.shuffledTracks[this.currentTrackIndex];
        console.log('MusicController: Next track selected:', nextTrack);
        return nextTrack;
    }

    /**
     * Create and configure an audio element
     */
    createAudioElement(src, loop = false) {
        const audio = new Audio(src);
        audio.loop = loop;
        audio.volume = 0;
        audio.preload = 'auto';

        // Handle audio ending for non-looping tracks
        audio.addEventListener('ended', () => {
            if (!loop && this.currentMode === 'gameplay') {
                this.playNextGameplayTrack();
            }
        });

        // Handle errors gracefully
        audio.addEventListener('error', (e) => {
            console.warn('MusicController: Audio error for', src, e);
        });

        return audio;
    }

    /**
     * Fade volume of an audio element
     */
    fadeAudio(audio, targetVolume, duration = this.fadeDuration, onComplete = null) {
        if (!audio) return;

        const startVolume = audio.volume;
        const volumeDiff = targetVolume - startVolume;
        const startTime = performance.now();

        const fade = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Use ease-in-out curve for smooth fading
            const easeProgress = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            audio.volume = Math.max(0, Math.min(1, startVolume + (volumeDiff * easeProgress)));

            if (progress < 1) {
                requestAnimationFrame(fade);
            } else {
                if (targetVolume === 0) {
                    audio.pause();
                    audio.currentTime = 0;
                }
                if (onComplete) onComplete();
            }
        };

        requestAnimationFrame(fade);
    }

    /**
     * Start playing main menu music
     */
    startMainMenuMusic() {
        // Allow retry if autoplay was previously blocked
        if (this.currentMode === 'mainMenu' && this.mainMenuAudio && !this.mainMenuAudio.paused) return;

        // Clean any stale audio instance before retrying
        if (this.mainMenuAudio && this.mainMenuAudio.paused) {
            this.mainMenuAudio = null;
        }

        console.log('MusicController: Starting main menu music');
        this.currentMode = 'mainMenu';
        this.isPlaying = true;

        // Stop any existing gameplay music
        if (this.gameplayAudio) {
            this.fadeAudio(this.gameplayAudio, 0, this.fadeDuration, () => {
                this.gameplayAudio = null;
            });
        }

        // Create and play main menu music
        this.mainMenuAudio = this.createAudioElement(this.mainMenuMusicPath, true);
        this.mainMenuAudio.volume = 0;

        const effectiveVolume = this.isMuted ? 0 : this.musicVolume;

        this.mainMenuAudio.play().then(() => {
            this.fadeAudio(this.mainMenuAudio, effectiveVolume, this.fadeDuration);
            console.log('MusicController: Main menu music playing');
        }).catch(error => {
            // Silently handle autoplay restriction - this is expected on first load
            // Music will start on user interaction via the event listeners in main.js
            this.isPlaying = false;
            this.currentMode = null;
            this.mainMenuAudio = null;
        });
    }

    /**
     * Fade out main menu music (called when Start Game is clicked)
     */
    fadeOutMainMenuMusic() {
        console.log('MusicController: Fading out main menu music');

        if (this.mainMenuAudio) {
            this.fadeAudio(this.mainMenuAudio, 0, this.fadeDuration, () => {
                this.mainMenuAudio = null;
            });
        }
    }

    /**
     * Start gameplay music after countdown
     */
    startGameplayMusic() {
        if (this.currentMode === 'gameplay') return;

        console.log('MusicController: Starting gameplay music');
        this.currentMode = 'gameplay';
        this.isPlaying = true;

        // Stop main menu music if still playing
        if (this.mainMenuAudio) {
            this.fadeAudio(this.mainMenuAudio, 0, this.fadeDuration / 2, () => {
                this.mainMenuAudio = null;
            });
        }

        // Start the first gameplay track
        this.playNextGameplayTrack();
    }

    /**
     * Play the next gameplay track with smooth crossfade
     */
    playNextGameplayTrack() {
        const trackPath = this.getNextGameplayTrack();
        if (!trackPath) return;

        // Prepare the next audio element
        this.nextAudio = this.createAudioElement(trackPath, false);

        // If there's current gameplay audio playing, crossfade
        if (this.gameplayAudio && !this.gameplayAudio.paused) {
            this.crossfadeToNext();
        } else {
            // No current audio, just start playing
            this.gameplayAudio = this.nextAudio;
            this.nextAudio = null;

            const effectiveVolume = this.isMuted ? 0 : this.musicVolume;

            this.gameplayAudio.play().then(() => {
                this.fadeAudio(this.gameplayAudio, effectiveVolume, this.fadeDuration);
                console.log('MusicController: Gameplay track playing');
            }).catch(error => {
                console.warn('MusicController: Failed to play gameplay track:', error.message);
                // Try next track if this one fails
                setTimeout(() => this.playNextGameplayTrack(), 100);
            });
        }
    }

    /**
     * Crossfade from current track to next track
     */
    crossfadeToNext() {
        const oldAudio = this.gameplayAudio;
        const newAudio = this.nextAudio;

        this.gameplayAudio = newAudio;
        this.nextAudio = null;

        const effectiveVolume = this.isMuted ? 0 : this.musicVolume;

        // Fade out old audio
        this.fadeAudio(oldAudio, 0, this.fadeDuration, () => {
            // Cleanup handled in fadeAudio
        });

        // Fade in new audio
        newAudio.play().then(() => {
            this.fadeAudio(newAudio, effectiveVolume, this.fadeDuration);
            console.log('MusicController: Crossfaded to new track');
        }).catch(error => {
            console.warn('MusicController: Failed to play next track:', error.message);
            // Revert to old audio if new one fails
            this.gameplayAudio = oldAudio;
            if (oldAudio) {
                this.fadeAudio(oldAudio, effectiveVolume, this.fadeDuration / 2);
            }
        });
    }

    /**
     * Stop all music
     */
    stopAllMusic() {
        console.log('MusicController: Stopping all music');

        if (this.mainMenuAudio) {
            this.fadeAudio(this.mainMenuAudio, 0, this.fadeDuration / 2, () => {
                this.mainMenuAudio = null;
            });
        }

        if (this.gameplayAudio) {
            this.fadeAudio(this.gameplayAudio, 0, this.fadeDuration / 2, () => {
                this.gameplayAudio = null;
            });
        }

        this.currentMode = null;
        this.isPlaying = false;
    }

    /**
     * Set master volume (0.0 to 1.0)
     */
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));

        if (this.mainMenuAudio) {
            this.mainMenuAudio.volume = this.currentMode === 'mainMenu' ? this.masterVolume : 0;
        }

        if (this.gameplayAudio) {
            this.gameplayAudio.volume = this.currentMode === 'gameplay' ? this.masterVolume : 0;
        }
    }

    /**
     * Get current volume
     */
    getVolume() {
        return this.masterVolume;
    }

    /**
     * Mute/unmute all music
     */
    toggleMute() {
        if (this.isMuted) {
            // Unmute
            this.isMuted = false;
            this.applySoundSettings();
        } else {
            // Mute
            this.isMuted = true;
            this.applySoundSettings();
        }
        return this.isMuted;
    }

    /**
     * Set music volume specifically
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.applySoundSettings();
    }

    /**
     * Set SFX volume
     */
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Get SFX volume (for playing sound effects)
     */
    getSfxVolume() {
        return this.isMuted ? 0 : this.sfxVolume;
    }

    /**
     * Play a sound effect (if SFX system is implemented elsewhere)
     * This provides the volume control for SFX
     */
    playSoundEffect(audioElement) {
        if (!audioElement) return;
        
        const effectiveVolume = this.isMuted ? 0 : this.sfxVolume;
        audioElement.volume = effectiveVolume;
        
        if (effectiveVolume > 0) {
            audioElement.play().catch(e => {
                // Silently ignore autoplay errors
            });
        }
    }

    /**
     * Add a new gameplay track to the playlist
     * Call this if you want to add tracks dynamically
     */
    addGameplayTrack(trackPath) {
        if (!this.availableTracks.includes(trackPath)) {
            this.availableTracks.push(trackPath);
            this.shuffleTracks();
            console.log('MusicController: Added new track:', trackPath);
        }
    }

    /**
     * Get list of available tracks (for debugging)
     */
    getAvailableTracks() {
        return [...this.availableTracks];
    }
}
