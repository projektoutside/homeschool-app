/**
 * Sound Manager for Escape Room Challenge
 * Handles background music, sound effects, and audio feedback
 * Enhanced for cross-platform compatibility and improved structure
 */

class SoundManager {
    constructor() {
        // Initialize utilities
        this.logger = window.logger;
        this.config = window.gameConfig;
        this.helpers = window.gameHelpers;
        
        // Audio state
        this.sounds = {};
        this.backgroundMusic = null;
        this.introMusic = null; // For intro background music
        this.pendingIntroMusic = null; // For intro music waiting for user interaction
        this.audioContext = null;
        this.isEnabled = true;
        this.timerTickInterval = null;
        this._resumePromise = null;
        
        // Volume settings from config or defaults
        this.masterVolume = this.config?.audio.defaultMasterVolume || 0.7;
        this.sfxVolume = this.config?.audio.defaultSfxVolume || 0.8;
        this.musicVolume = this.config?.audio.defaultMusicVolume || 0.4;
        this.isMuted = false;
        
        // Device detection from config
        this.device = this.config?.device || {
            isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
            isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
        };
        
        // Initialize audio system
        this.initAudioContext();
        this.createSynthSounds();
        this.setupPageVisibilityHandling();
        
        this.logger?.audio('Sound Manager initialized with cross-platform support');
    }
    
    /**
     * Initialize Web Audio API context with enhanced error handling
     */
    initAudioContext() {
        try {
            // Use prefixed versions for older browsers
            const AudioContextClass = window.AudioContext || 
                                    window.webkitAudioContext || 
                                    window.mozAudioContext ||
                                    window.msAudioContext;
            
            if (AudioContextClass) {
                this.audioContext = new AudioContextClass();
                
                // Handle iOS audio context restrictions
                if (this.device.isIOS || this.device.isMobile) {
                    // Audio context starts suspended on mobile, will be resumed on user interaction
                    if (this.audioContext.state === 'suspended') {
                        this.logger?.audioDebug('Audio context suspended (normal on mobile)');
                    }
                }
                
                this.logger?.audio('Audio context created successfully');
            } else {
                this.logger?.warn('Web Audio API not supported, audio disabled');
                this.isEnabled = false;
            }
        } catch (error) {
            this.logger?.error('Audio context creation failed', error);
            this.isEnabled = false;
        }
    }
    
    /**
     * Set up page visibility handling for mobile optimization
     */
    setupPageVisibilityHandling() {
        // Handle page visibility changes to manage audio on mobile
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page hidden - pause audio context to save battery
                if (this.audioContext && this.audioContext.state === 'running') {
                    this.audioContext.suspend();
                }
            } else {
                // Page visible - resume audio context if needed
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.resumeAudioContext();
                }
            }
        });
        
        // Handle app pause/resume events on mobile
        window.addEventListener('pagehide', () => {
            if (this.audioContext && this.audioContext.state === 'running') {
                this.audioContext.suspend();
            }
        });
        
        window.addEventListener('pageshow', () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.resumeAudioContext();
            }
        });
    }
    
    /**
     * Create synthetic sounds using Web Audio API
     */
    createSynthSounds() {
        // Create synthetic sounds using Web Audio API for immediate availability
        this.synthSounds = {
            click: () => this.playTone(800, 0.1, 'sine'),
            hover: () => this.playTone(600, 0.05, 'sine'),
            select: () => this.playTone(1000, 0.15, 'triangle'),
            submit: () => this.playChord([523, 659, 784], 0.3, 'triangle'), // C major chord
            correct: () => this.playSequence([523, 659, 784, 1047], 0.1, 'sine'), // Success melody
            incorrect: () => this.playTone(200, 0.4, 'sawtooth'),
            victory: () => this.playVictoryFanfare(),
            defeat: () => this.playDefeatSound(),
            warning: () => this.playTone(440, 0.2, 'square'),
            tick: () => this.playTone(1200, 0.03, 'sine'),
            popup: () => this.playTone(880, 0.2, 'triangle'),
            clear: () => this.playTone(300, 0.2, 'triangle')
        };
    }
    
    /**
     * Play a tone with specified parameters - iPad Enhanced
     */
    playTone(frequency, duration, waveType = 'sine', volume = 0.3) {
        if (!this.isEnabled || !this.audioContext || this.isMuted) return;
        
        try {
            // **IPAD CRITICAL FIX: Ensure audio context is running before playing tones**
            if (this.audioContext.state === 'suspended') {
                // Try to resume audio context and then retry the tone
                this.resumeAudioContext().then((resumed) => {
                    if (resumed && this.audioContext.state === 'running') {
                        // Retry the tone after successfully resuming context
                        this.playToneImmediate(frequency, duration, waveType, volume);
                    } else {
                        this.logger?.audioDebug('Cannot play tone: audio context could not be resumed for iPad');
                    }
                }).catch(error => {
                    this.logger?.audioDebug('Failed to resume audio context for tone on iPad:', error);
                });
                return; // Exit here, retry will happen in promise
            }
            
            // If audio context is already running, play immediately
            this.playToneImmediate(frequency, duration, waveType, volume);
            
        } catch (error) {
            this.logger?.audioDebug('Error playing tone on iPad', error);
        }
    }
    
    /**
     * Play tone immediately (internal method for retry logic)
     */
    playToneImmediate(frequency, duration, waveType = 'sine', volume = 0.3) {
        try {
            // **IPAD SAFETY CHECK: Verify audio context is ready**
            if (!this.audioContext || this.audioContext.state !== 'running') {
                this.logger?.audioDebug('Cannot play tone immediately: audio context not ready on iPad');
                return;
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = waveType;
            
            const finalVolume = volume * this.sfxVolume * this.masterVolume;
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(finalVolume, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
            
            this.logger?.audioDebug('Tone played successfully on iPad:', frequency + 'Hz');
        } catch (error) {
            this.logger?.audioDebug('Error in playToneImmediate on iPad:', error);
        }
    }
    
    /**
     * Play multiple tones simultaneously (chord)
     */
    playChord(frequencies, duration, waveType = 'sine', volume = 0.2) {
        if (!this.isEnabled || !this.audioContext || this.isMuted) return;
        
        frequencies.forEach(freq => {
            this.playTone(freq, duration, waveType, volume / frequencies.length);
        });
    }
    
    /**
     * Play a sequence of tones
     */
    playSequence(frequencies, noteDuration, waveType = 'sine', volume = 0.3) {
        if (!this.isEnabled || !this.audioContext || this.isMuted) return;
        
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.playTone(freq, noteDuration, waveType, volume);
            }, index * noteDuration * 1000);
        });
    }
    
    /**
     * Play victory fanfare
     */
    playVictoryFanfare() {
        if (!this.isEnabled || !this.audioContext || this.isMuted) return;
        
        try {
            // Play a triumphant fanfare
            const melody = [523, 659, 784, 1047, 1319, 1047, 784, 1047];
            this.playSequence(melody, 0.15, 'triangle', 0.4);
            
            // Add harmony
            setTimeout(() => {
                const harmony = [262, 330, 392, 523, 659, 523, 392, 523];
                this.playSequence(harmony, 0.15, 'sine', 0.2);
            }, 50);
        } catch (error) {
            this.logger?.audioDebug('Error playing victory fanfare', error);
        }
    }
    
    /**
     * Play defeat sound
     */
    playDefeatSound() {
        if (!this.isEnabled || !this.audioContext || this.isMuted) return;
        
        try {
            // Play a descending defeat sound
            const melody = [440, 392, 349, 294, 262];
            this.playSequence(melody, 0.3, 'sawtooth', 0.3);
        } catch (error) {
            this.logger?.audioDebug('Error playing defeat sound', error);
        }
    }
    
    /**
     * Play background music with enhanced error handling
     */
    playBackgroundMusic(type = 'ambient') {
        if (!this.isEnabled || !this.audioContext || this.isMuted) {
            this.logger?.audioDebug('Background music skipped: audio disabled or muted');
            return;
        }
        
        // Check audio context state before proceeding
        if (this.audioContext.state !== 'running') {
            this.logger?.warn('Cannot play background music: audio context not running, state is', this.audioContext.state);
            return;
        }
        
        try {
            this.logger?.audio('Starting background music:', type);
            
            // Stop current background music
            this.stopBackgroundMusic();
            
            // Create appropriate background music based on type
            switch (type) {
                case 'ambient':
                    this.createAmbientMusic();
                    break;
                case 'tension':
                    this.createTensionMusic();
                    break;
                default:
                    this.createAmbientMusic();
            }
        } catch (error) {
            this.logger?.error('Error playing background music', error);
        }
    }
    
    /**
     * Create ambient background music
     */
    createAmbientMusic() {
        if (!this.audioContext || this.audioContext.state !== 'running') {
            this.logger?.warn('Cannot create ambient music: audio context not running');
            return;
        }
        
        try {
            // Create a simple ambient drone using multiple oscillators
            const oscillators = [];
            const gainNodes = [];
            
            // Base frequencies for ambient sound
            const frequencies = [55, 82.4, 110, 164.8]; // A1, E2, A2, E3
            
            frequencies.forEach((freq, index) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();
                
                osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                osc.type = 'sine';
                
                // Set up filter for warmer sound
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(800 + (index * 200), this.audioContext.currentTime);
                filter.Q.setValueAtTime(1, this.audioContext.currentTime);
                
                // Very low volume for ambient background
                const finalVolume = (0.03 + (index * 0.01)) * this.musicVolume * this.masterVolume;
                gain.gain.setValueAtTime(0, this.audioContext.currentTime);
                gain.gain.linearRampToValueAtTime(finalVolume, this.audioContext.currentTime + 2);
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.start();
                
                oscillators.push(osc);
                gainNodes.push(gain);
            });
            
            this.backgroundMusic = { oscillators, gainNodes, type: 'ambient' };
            this.logger?.audio('Ambient background music started successfully');
        } catch (error) {
            this.logger?.error('Error creating ambient music', error);
        }
    }
    
    /**
     * Create tension background music
     */
    createTensionMusic() {
        if (!this.audioContext || this.audioContext.state !== 'running') {
            this.logger?.warn('Cannot create tension music: audio context not running');
            return;
        }
        
        try {
            // Create tension music with dissonant intervals and tremolo
            const oscillators = [];
            const gainNodes = [];
            
            // Dissonant frequencies for tension
            const frequencies = [73.4, 77.8, 98, 103.8]; // D2, Eb2, G2, Ab2 (tritone intervals)
            
            frequencies.forEach((freq, index) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                const tremolo = this.audioContext.createOscillator();
                const tremoloGain = this.audioContext.createGain();
                
                osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                osc.type = 'sawtooth';
                
                // Set up tremolo for unsettling effect
                tremolo.frequency.setValueAtTime(6 + (index * 2), this.audioContext.currentTime);
                tremolo.type = 'sine';
                tremoloGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                
                tremolo.connect(tremoloGain);
                tremoloGain.connect(gain.gain);
                
                // Slightly higher volume for tension music
                const finalVolume = (0.04 + (index * 0.01)) * this.musicVolume * this.masterVolume;
                gain.gain.setValueAtTime(0, this.audioContext.currentTime);
                gain.gain.linearRampToValueAtTime(finalVolume, this.audioContext.currentTime + 3);
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.start();
                tremolo.start();
                
                oscillators.push(osc, tremolo);
                gainNodes.push(gain, tremoloGain);
            });
            
            this.backgroundMusic = { oscillators, gainNodes, type: 'tension' };
            this.logger?.audio('Tension background music started successfully');
        } catch (error) {
            this.logger?.error('Error creating tension music', error);
        }
    }
    
    /**
     * Stop background music with fade out
     */
    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            try {
                const fadeTime = (this.config?.audio.fadeOutDuration || 1000) / 1000;
                const currentTime = this.audioContext.currentTime;
                
                this.backgroundMusic.gainNodes.forEach(gain => {
                    gain.gain.exponentialRampToValueAtTime(0.001, currentTime + fadeTime);
                });
                
                setTimeout(() => {
                    if (this.backgroundMusic) {
                        this.backgroundMusic.oscillators.forEach(osc => {
                            try {
                                osc.stop();
                            } catch (e) {
                                // Oscillator may already be stopped
                            }
                        });
                        this.backgroundMusic = null;
                    }
                }, fadeTime * 1000);
                
                this.logger?.audio('Background music stopped');
            } catch (error) {
                this.logger?.error('Error stopping background music', error);
            }
        }
    }
    
    // Sound effect wrapper methods with error handling
    playClick() { 
        try { this.synthSounds.click(); } catch (e) { this.logger?.audioDebug('Audio error:', e); }
    }
    
    playHover() { 
        try { this.synthSounds.hover(); } catch (e) { this.logger?.audioDebug('Audio error:', e); }
    }
    
    playSelect() { 
        try { this.synthSounds.select(); } catch (e) { this.logger?.audioDebug('Audio error:', e); }
    }
    
    playSubmit() { 
        try { this.synthSounds.submit(); } catch (e) { this.logger?.audioDebug('Audio error:', e); }
    }
    
    playCorrect() { 
        try { this.synthSounds.correct(); } catch (e) { this.logger?.audioDebug('Audio error:', e); }
    }
    
    playIncorrect() { 
        try { this.synthSounds.incorrect(); } catch (e) { this.logger?.audioDebug('Audio error:', e); }
    }
    
    playVictory() { 
        try { this.synthSounds.victory(); } catch (e) { this.logger?.audioDebug('Audio error:', e); }
    }
    
    playDefeat() { 
        try { this.synthSounds.defeat(); } catch (e) { this.logger?.audioDebug('Audio error:', e); }
    }
    
    playWarning() { 
        try { this.synthSounds.warning(); } catch (e) { this.logger?.audioDebug('Audio error:', e); }
    }
    
    playTick() { 
        try { this.synthSounds.tick(); } catch (e) { this.logger?.audioDebug('Audio error:', e); }
    }
    
    playPopup() { 
        try { this.synthSounds.popup(); } catch (e) { this.logger?.audioDebug('Audio error:', e); }
    }
    
    playClear() { 
        try { this.synthSounds.clear(); } catch (e) { this.logger?.audioDebug('Audio error:', e); }
    }
    
    /**
     * Start timer tick sound
     */
    startTimerTick(interval = null) {
        const tickInterval = interval || this.config?.audio.timerTickInterval || 1000;
        this.stopTimerTick();
        this.timerTickInterval = setInterval(() => {
            this.playTick();
        }, tickInterval);
    }
    
    /**
     * Stop timer tick sound
     */
    stopTimerTick() {
        if (this.timerTickInterval) {
            clearInterval(this.timerTickInterval);
            this.timerTickInterval = null;
        }
    }
    
    /**
     * Volume control methods with persistence
     */
    setMasterVolume(volume) {
        this.masterVolume = this.helpers?.clamp(volume, 0, 1) || Math.max(0, Math.min(1, volume));
        this.config?.set('audio', 'defaultMasterVolume', this.masterVolume);
    }

    setSFXVolume(volume) {
        this.sfxVolume = this.helpers?.clamp(volume, 0, 1) || Math.max(0, Math.min(1, volume));
        this.config?.set('audio', 'defaultSfxVolume', this.sfxVolume);
    }

    setMusicVolume(volume) {
        this.musicVolume = this.helpers?.clamp(volume, 0, 1) || Math.max(0, Math.min(1, volume));
        this.config?.set('audio', 'defaultMusicVolume', this.musicVolume);
        this.updateBackgroundMusicVolume();
        this.updateIntroMusicVolume(); // Also update intro music volume
    }

    /**
     * Update background music volume
     */
    updateBackgroundMusicVolume() {
        if (this.backgroundMusic && this.backgroundMusic.gainNodes) {
            try {
                this.backgroundMusic.gainNodes.forEach((gain, index) => {
                    const baseVolume = this.backgroundMusic.type === 'tension' ? 0.04 : 0.03;
                    const finalVolume = (baseVolume + (index * 0.01)) * this.musicVolume * this.masterVolume;
                    gain.gain.linearRampToValueAtTime(finalVolume, this.audioContext.currentTime + 0.1);
                });
            } catch (error) {
                this.logger?.error('Error updating background music volume', error);
            }
        }
    }

    /**
     * Toggle mute with better state management
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            this.stopBackgroundMusic();
            this.stopIntroMusic(); // Also stop intro music when muted
            this.stopTimerTick();
        }
        
        // Persist mute state
        this.config?.set('audio', 'isMuted', this.isMuted);
        
        return this.isMuted;
    }

    /**
     * Resume audio context with improved promise handling - iPad Enhanced
     */
    async resumeAudioContext() {
        // Create AudioContext if it doesn't exist
        if (!this.audioContext) {
            this.logger?.audio('AudioContext not found, creating new one...');
            this.initAudioContext();
            if (!this.audioContext) {
                this.logger?.error('Failed to create AudioContext');
                return false;
            }
        }
        
        // Return existing promise if resume is already in progress
        if (this._resumePromise) {
            return this._resumePromise;
        }
        
        if (this.audioContext.state === 'suspended') {
            this.logger?.audio('Attempting to resume audio context for iPad...');
            
            this._resumePromise = this.audioContext.resume().then(() => {
                this.logger?.audio('✅ Audio context resumed successfully on iPad');
                this._resumePromise = null;
                
                // **IPAD ENHANCEMENT: Verify the context is truly running**
                if (this.audioContext.state === 'running') {
                    // Try to start pending intro music if available
                    this.startPendingIntroMusic();
                    
                    // **TIMING: Prime the audio system for perfect playback**
                    this.primeAudioSystemForPerfectPlayback();
                    
                    return true;
                } else {
                    this.logger?.warn('iPad audio context resumed but not running:', this.audioContext.state);
                    return false;
                }
            }).catch(error => {
                this.logger?.error('Failed to resume audio context on iPad', error);
                this._resumePromise = null;
                return false;
            });
            
            return this._resumePromise;
        } else if (this.audioContext.state === 'running') {
            this.logger?.audioDebug('Audio context already active on iPad');
            
            // Try to start pending intro music even if context is active
            this.startPendingIntroMusic();
            
            // **TIMING: Ensure audio system is primed for perfect playback**
            this.primeAudioSystemForPerfectPlayback();
            
            return true;
        } else {
            this.logger?.warn('iPad audio context in unexpected state:', this.audioContext.state);
            return false;
        }
    }

    /**
     * Prime audio system for immediate perfect playback
     */
    primeAudioSystemForPerfectPlayback() {
        try {
            // **AUDIO SYSTEM OPTIMIZATION: Warm up the audio system for perfect timing**
            if (this.audioContext && this.audioContext.state === 'running') {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
                oscillator.type = 'sine';
                
                // Very low volume, very short duration - just to prime the system
                gainNode.gain.setValueAtTime(0.001, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + 0.01);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.01);
                
                this.logger?.audioDebug('Audio system primed for perfect playback timing');
            }
        } catch (error) {
            this.logger?.audioDebug('Audio priming failed (non-critical):', error);
        }
    }

    /**
     * Play any audio file with perfect timing from the beginning
     */
    playAudioFileWithPerfectTiming(filePath, volume = null) {
        if (!this.isEnabled || this.isMuted) return null;
        
        try {
            const audio = new Audio(filePath);
            
            // **PERFECT TIMING SETUP**
            audio.currentTime = 0; // Ensure we start from absolute beginning
            audio.volume = volume !== null ? volume : (this.sfxVolume * this.masterVolume);
            
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.logger?.audioDebug(`Audio file playing perfectly from start: ${filePath}`);
                    
                    // **TIMING VERIFICATION**
                    if (audio.currentTime > 0.1) {
                        console.log(`🎵 ⚠️ Correcting ${filePath} to start from beginning`);
                        audio.currentTime = 0;
                    }
                }).catch(error => {
                    this.logger?.audioDebug(`Error playing ${filePath}:`, error);
                });
            }
            
            return audio; // Return audio element for further control if needed
        } catch (error) {
            this.logger?.audioDebug(`Error loading ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Start pending intro music after user interaction - FIXED for perfect timing
     */
    startPendingIntroMusic() {
        if (this.pendingIntroMusic && !this.introMusic) {
            try {
                console.log('🎵 Starting pending intro music after user interaction');
                
                const audio = this.pendingIntroMusic;
                
                // **CRITICAL FIX: Reset to beginning before playing**
                audio.currentTime = 0;
                console.log('🎵 Reset pending music to start from beginning');
                
                this.introMusic = audio;
                this.pendingIntroMusic = null;
                
                const playPromise = audio.play();
                
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('🎵 ✅ Pending intro music started perfectly from beginning!');;
                        
                        // **VERIFICATION: Double-check timing**
                        if (audio.currentTime > 0.1) {
                            console.log('🎵 ⚠️ Correcting audio position to start');
                            audio.currentTime = 0;
                        }
                    }).catch(error => {
                        console.warn('🎵 Still cannot play intro music:', error);
                    });
                }
                
            } catch (error) {
                console.error('🎵 Error starting pending intro music:', error);
                this.pendingIntroMusic = null;
            }
        }
    }

    /**
     * Clean up all audio resources
     */
    cleanup() {
        try {
            this.stopBackgroundMusic();
            this.stopIntroMusic(); // Also clean up intro music
            this.stopTimerTick();
            
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
            
            this.logger?.audio('Sound manager cleaned up');
        } catch (error) {
            this.logger?.error('Error during sound manager cleanup', error);
        }
    }

    /**
     * Play enhanced battle victory sound for rock paper scissors
     */
    playBattleVictory() {
        if (!this.isEnabled || !this.audioContext || this.isMuted) return;
        
        try {
            // Epic victory fanfare with multiple layers
            const mainMelody = [523, 659, 784, 1047, 1319, 1568, 1319, 1047]; // C major scale ascending
            const harmony = [262, 330, 392, 523, 659, 784, 659, 523]; // Lower harmony
            const bass = [131, 165, 196, 262, 330, 392, 330, 262]; // Bass line
            
            // Play main triumphant melody
            this.playSequence(mainMelody, 0.12, 'triangle', 0.5);
            
            // Add harmony layer slightly delayed
            setTimeout(() => {
                this.playSequence(harmony, 0.12, 'sine', 0.3);
            }, 30);
            
            // Add bass foundation
            setTimeout(() => {
                this.playSequence(bass, 0.12, 'sawtooth', 0.2);
            }, 60);
            
            // Add celebratory chord at the end
            setTimeout(() => {
                this.playChord([523, 659, 784, 1047], 0.8, 'triangle', 0.4); // C major chord
            }, 1000);
            
        } catch (error) {
            this.logger?.audioDebug('Error playing battle victory sound', error);
        }
    }
    
    /**
     * Play enhanced battle defeat sound for rock paper scissors
     */
    playBattleDefeat() {
        if (!this.isEnabled || !this.audioContext || this.isMuted) return;
        
        try {
            // Dramatic descending defeat melody
            const mainMelody = [523, 466, 415, 370, 330, 294, 262]; // Descending chromatic
            const darkHarmony = [262, 233, 208, 185, 165, 147, 131]; // Lower dark harmony
            
            // Play main defeat melody with dramatic effect
            this.playSequence(mainMelody, 0.25, 'sawtooth', 0.4);
            
            // Add dark harmony for more dramatic effect
            setTimeout(() => {
                this.playSequence(darkHarmony, 0.25, 'square', 0.2);
            }, 100);
            
            // Final doom chord
            setTimeout(() => {
                this.playChord([147, 175, 208, 262], 1.0, 'sawtooth', 0.3); // Dark minor chord
            }, 1800);
            
        } catch (error) {
            this.logger?.audioDebug('Error playing battle defeat sound', error);
        }
    }

    /**
     * Play Rock Paper Scissors Shoot chant sound
     */
    playRPSChant() {
        this.playAudioFileWithPerfectTiming('sounds/rockpapersscissorsshoot.mp3');
        this.logger?.audioDebug('Playing Rock Paper Scissors Shoot chant');
    }

    /**
     * Play countdown beep sound for epic battle timer
     */
    playCountdownBeep(number) {
        if (!this.isEnabled || !this.audioContext || this.isMuted) return;
        
        try {
            // Higher pitch for early numbers, lower for final countdown
            const frequencies = {
                3: 800,  // High beep for 3
                2: 700,  // Medium beep for 2  
                1: 600   // Lower beep for 1
            };
            
            const frequency = frequencies[number] || 600;
            
            // Create a sharp, attention-grabbing beep
            this.playTone(frequency, 0.15, 'square', 0.3);
            
            // Add harmonic for richer sound
            setTimeout(() => {
                this.playTone(frequency * 1.5, 0.1, 'sine', 0.15);
            }, 20);
            
        } catch (error) {
            this.logger?.audioDebug('Error playing countdown beep sound', error);
        }
    }

    /**
     * Play Good Team win sound from sounds folder - PERFECT TIMING  
     */
    playGoodTeamWin() {
        // Randomly select between goodteamwin.mp3 and goodteamwin2.mp3 for variety
        const goodWinSounds = ['sounds/goodteamwin.mp3', 'sounds/goodteamwin2.mp3'];
        const selectedSound = goodWinSounds[Math.floor(Math.random() * goodWinSounds.length)];
        
        // Use the perfect timing audio loader
        this.playAudioFileWithPerfectTiming(selectedSound);
        this.logger?.audioDebug(`Playing good team win sound with perfect timing: ${selectedSound}`);
    }

    /**
     * Play Bad Team win sound from sounds folder - PERFECT TIMING
     */
    playBadTeamWin() {
        // Use the perfect timing audio loader
        this.playAudioFileWithPerfectTiming('sounds/badteamwin.mp3');
        this.logger?.audioDebug('Playing bad team win sound with perfect timing');
    }

    /**
     * Play random intro background music (ONE track only) - FIXED for perfect timing
     */
    playRandomIntroMusic() {
        if (!this.isEnabled || this.isMuted) {
            console.log('🎵 Intro music skipped: audio disabled or muted');
            return;
        }
        
        // **CRITICAL FIX: Prevent multiple simultaneous music instances**
        if (this.introMusic && !this.introMusic.paused) {
            console.log('🎵 Intro music already playing - skipping duplicate request');
            return;
        }
        
        if (this.pendingIntroMusic) {
            console.log('🎵 Intro music already pending - skipping duplicate request');
            return;
        }
        
        try {
            // CRITICAL: Stop any existing intro music first
            this.stopIntroMusic();
            
            // Array of intro music files
            const introTracks = [
                'sounds/introbackground1.mp3',
                'sounds/introbackground2.mp3', 
                'sounds/introbackground3.mp3',
                'sounds/introbackground4.mp3'
            ];
            
            // Randomly select ONE track only
            const randomIndex = Math.floor(Math.random() * introTracks.length);
            const selectedTrack = introTracks[randomIndex];
            
            console.log('🎵 Playing ONE random intro track:', selectedTrack, `(${randomIndex + 1}/${introTracks.length})`);
            
            // **FIXED: Create audio element with perfect timing configuration**
            const audio = new Audio();
            
            // **CRITICAL FIX: Configure for perfect start timing**
            audio.src = selectedTrack;
            audio.loop = true;
            audio.preload = 'auto';
            audio.currentTime = 0; // ENSURE we start from beginning
            
            // **VOLUME FIX: Start with proper volume immediately**
            const targetVolume = this.musicVolume * this.masterVolume * 0.6;
            audio.volume = targetVolume; // Start at target volume for immediate playback
            
            let hasStartedPlaying = false;
            
            // **TIMING FIX: Simple immediate playback without volume ramping delays**
            const setupPerfectPlayback = () => {
                console.log('🎵 Setting up perfect playback at volume:', targetVolume);
                
                // Ensure we're starting from the very beginning
                if (audio.currentTime !== 0) {
                    audio.currentTime = 0;
                    console.log('🎵 Reset audio to start from beginning');
                }
                
                // Set volume immediately for perfect start
                audio.volume = targetVolume;
                console.log('🎵 Volume set to', audio.volume, 'for immediate perfect playback');
            };
            
            // **FIXED: Event listeners for perfect timing**
            audio.addEventListener('loadstart', () => {
                console.log('🎵 Loading intro track:', selectedTrack);
            });
            
            audio.addEventListener('canplaythrough', () => {
                console.log('🎵 Intro track ready - attempting perfect play');
                if (!hasStartedPlaying) {
                    setupPerfectPlayback();
                    this.attemptPerfectPlay(audio, selectedTrack);
                }
            });
            
            audio.addEventListener('playing', () => {
                console.log('🎵 ✅ Intro music playing perfectly from start:', selectedTrack);
                hasStartedPlaying = true;
                this.introMusic = audio;
            });
            
            audio.addEventListener('ended', () => {
                console.log('🎵 Intro track ended (should loop)');
            });
            
            audio.addEventListener('error', (e) => {
                console.error('🎵 ❌ iPad intro music error:', e);
                console.error('🎵 iPad error details:', {
                    code: audio.error?.code,
                    message: audio.error?.message,
                    src: audio.src
                });
                
                if (this.introMusic === audio) {
                    this.introMusic = null;
                }
                if (this.pendingIntroMusic === audio) {
                    this.pendingIntroMusic = null;
                }
            });
            
            // **TIMING FIX: Single immediate play attempt for perfect start**
            setupPerfectPlayback();
            this.attemptPerfectPlay(audio, selectedTrack);
            
        } catch (error) {
            console.error('🎵 ❌ Error setting up iPad intro music:', error);
        }
    }

    /**
     * Perfect play attempt for immediate start from beginning
     */
    attemptPerfectPlay(audio, selectedTrack) {
        try {
            // **CRITICAL: Ensure we start from absolute beginning**
            audio.currentTime = 0;
            
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('🎵 ✅ Music started perfectly from beginning!');
                    this.introMusic = audio;
                    this.logger?.audio('Perfect intro music playing:', selectedTrack);
                    
                    // **DOUBLE CHECK: Verify we're at the start**
                    if (audio.currentTime > 0.1) {
                        console.log('🎵 ⚠️ Audio not at start, resetting to 0');
                        audio.currentTime = 0;
                    }
                }).catch(error => {
                    console.log('🎵 Play blocked by autoplay policy:', error.name);
                    console.log('🎵 Music will start on next user interaction');
                    this.pendingIntroMusic = audio;
                });
            }
        } catch (error) {
            console.log('🎵 Play attempt failed:', error);
            this.pendingIntroMusic = audio;
        }
    }

    /**
     * Stop intro background music with smooth fade out - Enhanced cleanup
     */
    stopIntroMusic() {
        // **IPAD FIX: Clean up ALL intro music instances**
        if (this.introMusic) {
            try {
                const fadeOutDuration = 1500; // Shorter fade for better responsiveness
                const fadeSteps = 30; // Smooth fade
                const fadeInterval = fadeOutDuration / fadeSteps;
                const initialVolume = this.introMusic.volume;
                const volumeStep = initialVolume / fadeSteps;
                
                let currentStep = 0;
                
                this.logger?.audio('Starting intro music fade out');
                
                const fadeOutInterval = setInterval(() => {
                    currentStep++;
                    
                    if (currentStep >= fadeSteps || !this.introMusic) {
                        // Fade out complete - stop and cleanup
                        clearInterval(fadeOutInterval);
                        if (this.introMusic) {
                            try {
                                this.introMusic.pause();
                                this.introMusic.currentTime = 0;
                                // **IPAD CLEANUP: Remove src to fully release the audio**
                                this.introMusic.src = '';
                                this.introMusic = null;
                                this.logger?.audio('Intro music stopped and cleaned up completely');
                            } catch (cleanupError) {
                                this.logger?.audioDebug('Error during intro music cleanup:', cleanupError);
                                this.introMusic = null; // Force cleanup
                            }
                        }
                    } else {
                        // Reduce volume gradually
                        const newVolume = initialVolume - (volumeStep * currentStep);
                        if (this.introMusic) {
                            this.introMusic.volume = Math.max(0, newVolume);
                        }
                    }
                }, fadeInterval);
                
            } catch (error) {
                this.logger?.audioDebug('Error during intro music fade out', error);
                // Fallback - just stop immediately
                if (this.introMusic) {
                    try {
                        this.introMusic.pause();
                        this.introMusic.currentTime = 0;
                        this.introMusic.src = '';
                    } catch (e) {
                        // Silent fail
                    }
                    this.introMusic = null;
                }
            }
        }
        
        // **IPAD FIX: Also clear any pending intro music**
        if (this.pendingIntroMusic) {
            try {
                this.pendingIntroMusic.pause();
                this.pendingIntroMusic.currentTime = 0;
                this.pendingIntroMusic.src = '';
            } catch (e) {
                // Silent fail
            }
            this.pendingIntroMusic = null;
            this.logger?.audio('Cleared pending intro music');
        }
    }

    /**
     * Update intro music volume when master/music volume changes
     */
    updateIntroMusicVolume() {
        if (this.introMusic) {
            try {
                this.introMusic.volume = this.musicVolume * this.masterVolume * 0.6;
            } catch (error) {
                this.logger?.audioDebug('Error updating intro music volume', error);
            }
        }
    }

    /**
     * Prime audio system for immediate playback
     */
    primeAudioSystem() {
        if (!this.isEnabled || this.isMuted) return;
        
        try {
            console.log('🎵 PRIMING: Preparing audio system for immediate playback...');
            
            // Create a very brief, silent tone to activate audio context
            if (this.audioContext && this.audioContext.state === 'suspended') {
                // Try to resume audio context preemptively
                this.audioContext.resume().then(() => {
                    console.log('🎵 PRIMING: Audio context resumed preemptively');
                }).catch(error => {
                    console.log('🎵 PRIMING: Cannot resume audio context yet:', error.name);
                });
            }
            
            // Create a silent audio element to "warm up" the audio system
            const silentAudio = new Audio();
            silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IAAAAAEAAQBEDQAAhA0AAAIAEAA='; // Silent audio data
            silentAudio.volume = 0;
            
            silentAudio.play().then(() => {
                console.log('🎵 PRIMING: Silent audio played - system primed');
                silentAudio.pause();
            }).catch(() => {
                console.log('🎵 PRIMING: Silent audio blocked - normal behavior');
            });
            
        } catch (error) {
            console.log('🎵 PRIMING: Error during audio priming:', error);
        }
    }

    /**
     * Test intro music functionality for iPad
     */
    testIntroMusicForIpad() {
        console.log('🧪 Testing intro music for iPad compatibility...');
        
        // Test audio context state
        if (this.audioContext) {
            console.log('🧪 Audio context state:', this.audioContext.state);
        } else {
            console.log('🧪 No audio context available');
        }
        
        // Test intro music state
        if (this.introMusic) {
            console.log('🧪 Intro music active:', {
                src: this.introMusic.src,
                paused: this.introMusic.paused,
                volume: this.introMusic.volume,
                loop: this.introMusic.loop
            });
        } else {
            console.log('🧪 No active intro music');
        }
        
        // Test pending intro music
        if (this.pendingIntroMusic) {
            console.log('🧪 Pending intro music available:', this.pendingIntroMusic.src);
        } else {
            console.log('🧪 No pending intro music');
        }
        
        // Test intro music start
        if (!this.introMusic && !this.pendingIntroMusic) {
            console.log('🧪 Starting test intro music for iPad...');
            this.playRandomIntroMusic();
        }
        
        // Test fade out after 3 seconds
        setTimeout(() => {
            if (this.introMusic) {
                console.log('🧪 Testing intro music fade out...');
                this.stopIntroMusic();
            }
        }, 3000);
    }

    /**
     * Comprehensive audio test for iPad - Tests all sound effects and voice coordination
     */
    testAllAudioForIpad() {
        console.log('🧪 Testing ALL audio functionality for iPad...');
        
        // Test 1: Audio context state
        console.log('🧪 Test 1: Audio Context State');
        if (this.audioContext) {
            console.log('  ✅ Audio context exists:', this.audioContext.state);
            if (this.audioContext.state === 'running') {
                console.log('  ✅ Audio context is running - ready for iPad');
            } else {
                console.log('  ⚠️ Audio context not running - may need user interaction');
            }
        } else {
            console.log('  ❌ No audio context available');
        }
        
        // Test 2: Sound effects
        console.log('🧪 Test 2: Sound Effects');
        const soundTests = [
            { name: 'Click', method: 'playClick' },
            { name: 'Select', method: 'playSelect' },
            { name: 'Correct', method: 'playCorrect' },
            { name: 'Victory', method: 'playVictory' }
        ];
        
        soundTests.forEach((test, index) => {
            setTimeout(() => {
                try {
                    this[test.method]();
                    console.log(`  ✅ ${test.name} sound test passed`);
                } catch (error) {
                    console.log(`  ❌ ${test.name} sound test failed:`, error);
                }
            }, index * 800); // Space out tests
        });
        
        // Test 3: Team win sounds
        setTimeout(() => {
            console.log('🧪 Test 3: Team Win Sounds');
            try {
                this.playGoodTeamWin();
                console.log('  ✅ Good team win sound test passed');
            } catch (error) {
                console.log('  ❌ Good team win sound test failed:', error);
            }
        }, 3500);
        
        setTimeout(() => {
            try {
                this.playBadTeamWin();
                console.log('  ✅ Bad team win sound test passed');
            } catch (error) {
                console.log('  ❌ Bad team win sound test failed:', error);
            }
        }, 4000);
        
        // Test 4: Intro music
        setTimeout(() => {
            console.log('🧪 Test 4: Intro Music');
            try {
                if (this.introMusic) {
                    console.log('  ✅ Intro music is playing:', this.introMusic.src);
                    console.log('    Volume:', this.introMusic.volume);
                    console.log('    Paused:', this.introMusic.paused);
                    console.log('    Loop:', this.introMusic.loop);
                } else if (this.pendingIntroMusic) {
                    console.log('  ⚠️ Intro music is pending (waiting for interaction)');
                } else {
                    console.log('  ⚠️ No intro music detected - attempting to start...');
                    this.playRandomIntroMusic();
                }
            } catch (error) {
                console.log('  ❌ Intro music test failed:', error);
            }
        }, 4500);
        
        // Test 5: Voice manager coordination
        setTimeout(() => {
            console.log('🧪 Test 5: Voice Manager Coordination');
            if (window.voiceManager) {
                console.log('  ✅ Voice manager available');
                console.log('    Rate setting:', window.voiceManager.rate); // Should be 1.0
                console.log('    Voice enabled:', window.voiceManager.isEnabled);
                
                if (window.voiceManager.rate === 1.0) {
                    console.log('  ✅ Voice rate is consistent (1.0) for iPad');
                } else {
                    console.log('  ❌ Voice rate is not consistent:', window.voiceManager.rate);
                }
                
                // Test voice speech
                if (typeof window.voiceManager.testVoice === 'function') {
                    console.log('  🧪 Running voice test...');
                    window.voiceManager.testVoice();
                }
            } else {
                console.log('  ❌ Voice manager not available');
            }
        }, 5000);
        
        // Test 6: Volume controls
        setTimeout(() => {
            console.log('🧪 Test 6: Volume Controls');
            console.log('  Master Volume:', this.masterVolume);
            console.log('  SFX Volume:', this.sfxVolume);
            console.log('  Music Volume:', this.musicVolume);
            console.log('  Is Muted:', this.isMuted);
            console.log('  ✅ Volume control test completed');
        }, 5500);
        
        // Final summary
        setTimeout(() => {
            console.log('🧪 ✅ Perfect Timing Audio Test Complete!');
            console.log('🧪 If you heard sounds and voice with perfect timing, all systems are working correctly');
            console.log('🧪 If some tests failed, check the console errors above');
        }, 6000);
    }
}

// Make SoundManager available globally
window.SoundManager = SoundManager;
