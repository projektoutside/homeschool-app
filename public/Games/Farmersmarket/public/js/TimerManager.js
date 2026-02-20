// Farmers Market Frenzy 3D - Enhanced Timer Manager
class TimerManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        
        // Core timer state
        this.isRunning = false;
        this.isPaused = false;
        this.timeRemaining = 0; // in seconds
        this.duration = 300; // 5 minutes default
        this.warningThreshold = 30; // 30 seconds warning (red)
        this.alertThreshold = 60; // 60 seconds alert (orange)
        
        // High-precision timing
        this.startTime = null;
        this.pauseTime = null;
        this.lastTickTime = null;
        this.interval = null;
        this.animationFrame = null;
        
        // Game mode specific settings
        this.gameModeSettings = {
            progressive: { duration: 180, warningThreshold: 30, alertThreshold: 60 },
            single: { duration: 300, warningThreshold: 30, alertThreshold: 60 },
            normal: { duration: 300, warningThreshold: 30, alertThreshold: 60 },
            vs: { duration: 300, warningThreshold: 30, alertThreshold: 60 },
            custom: { duration: 300, warningThreshold: 30, alertThreshold: 60 }
        };
        
        // Settings
        this.enabled = true;
        this.showWarning = true;
        this.currentGameMode = 'single';
        
        // DOM elements
        this.timerDisplay = null;
        this.timerTime = null;
        
        // Audio context for timer sounds
        this.audioContext = null;
        this.warningSound = null;
        this.endSound = null;
        
        // Callbacks
        this.onTimerWarning = null;
        this.onTimerExpired = null;
        this.onTimerTick = null;
        
        // State tracking for fail-safes
        this.lastState = null;
        this.stateHistory = [];
        this.maxStateHistory = 10;
        
        // Synchronization
        this.syncInterval = null;
        this.lastSyncTime = null;
        
        console.log('Enhanced TimerManager created');
    }
    
    async initialize() {
        try {
            // Cache DOM elements
            this.timerDisplay = document.getElementById('timerDisplay');
            this.timerTime = document.getElementById('timerTime');
            
            if (!this.timerDisplay || !this.timerTime) {
                console.warn('Timer DOM elements not found - timer will be disabled');
                this.enabled = false;
                return false;
            }
            
            // Load settings
            this.loadSettings();
            
            // Initialize audio
            this.initializeAudio();
            
            // Setup synchronization
            this.setupSynchronization();
            
            // Update display
            this.updateDisplay();
            
            console.log('✅ Enhanced TimerManager initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Enhanced TimerManager initialization failed:', error);
            this.enabled = false;
            return false;
        }
    }
    
    initializeAudio() {
        try {
            // Create audio context for timer sounds
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create warning sound (beep)
            this.warningSound = this.createBeepSound(800, 0.2, 0.1);
            
            // Create end sound (longer beep)
            this.endSound = this.createBeepSound(400, 0.5, 0.3);
            
        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
    }
    
    createBeepSound(frequency, duration, volume) {
        if (!this.audioContext) return null;
        
        return () => {
            try {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + duration);
                
            } catch (error) {
                console.warn('Failed to play timer sound:', error);
            }
        };
    }
    
    setupSynchronization() {
        // Periodic synchronization to prevent drift
        this.syncInterval = setInterval(() => {
            this.synchronizeTimer();
        }, 5000); // Sync every 5 seconds
    }
    
    synchronizeTimer() {
        if (!this.isRunning || this.isPaused) return;
        
        const now = performance.now();
        const expectedElapsed = (now - this.startTime) / 1000;
        const actualElapsed = this.duration - this.timeRemaining;
        const drift = Math.abs(expectedElapsed - actualElapsed);
        
        // If drift is more than 1 second, correct it
        if (drift > 1) {
            console.warn(`Timer drift detected: ${drift.toFixed(2)}s, correcting...`);
            this.timeRemaining = Math.max(0, this.duration - expectedElapsed);
            this.updateDisplay();
        }
        
        this.lastSyncTime = now;
    }
    
    loadSettings() {
        try {
            console.log('📂 TimerManager loading settings...');
            
            // Use default settings if SettingsManager isn't ready
            let settings = {
                enableTimer: true,
                timerDuration: 5,
                timerWarning: true,
                unifiedTimer: 5,
                gameModeTimers: {
                    progressive: 3,
                    single: 5,
                    normal: 5,
                    vs: 5,
                    custom: 5
                }
            };
            
            // Try to get settings from SettingsManager if available
            if (this.gameManager?.settingsManager?.getSettings) {
                const managerSettings = this.gameManager.settingsManager.getSettings();
                if (managerSettings) {
                    settings = { ...settings, ...managerSettings };
                    console.log('✅ Settings loaded from SettingsManager:', {
                        enableTimer: settings.enableTimer,
                        unifiedTimer: settings.unifiedTimer,
                        gameModeTimers: settings.gameModeTimers
                    });
                } else {
                    console.log('ℹ️ No settings from SettingsManager, using defaults');
                }
            } else {
                console.log('ℹ️ SettingsManager not available, using defaults');
            }
            
            this.enabled = settings.enableTimer !== undefined ? settings.enableTimer : true;
            this.showWarning = settings.timerWarning !== undefined ? settings.timerWarning : true;
            
            console.log('⏰ Basic timer settings loaded:', {
                enabled: this.enabled,
                showWarning: this.showWarning
            });
            
            // Use unifiedTimer if available, otherwise fall back to individual game mode settings
            if (settings.unifiedTimer) {
                console.log(`🎮 Using unified timer setting: ${settings.unifiedTimer} minutes`);
                const unifiedDurationSeconds = settings.unifiedTimer * 60;
                
                // Apply unified timer to all game modes
                Object.keys(this.gameModeSettings).forEach(mode => {
                    this.gameModeSettings[mode].duration = unifiedDurationSeconds;
                    console.log(`✅ ${mode} mode timer set to ${settings.unifiedTimer} minutes (unified setting)`);
                });
            } else if (settings.gameModeTimers) {
                console.log('🎮 Loading individual game mode timers:', settings.gameModeTimers);
                Object.keys(settings.gameModeTimers).forEach(mode => {
                    if (this.gameModeSettings[mode]) {
                        const durationMinutes = settings.gameModeTimers[mode];
                        const durationSeconds = durationMinutes * 60;
                        this.gameModeSettings[mode].duration = durationSeconds;
                        console.log(`✅ ${mode} mode timer set to ${durationMinutes} minutes (${durationSeconds} seconds)`);
                    } else {
                        console.warn(`⚠️ Unknown game mode: ${mode}`);
                    }
                });
            }
            
            // Set default duration
            this.duration = this.gameModeSettings[this.currentGameMode].duration;
            console.log(`🎯 Current game mode (${this.currentGameMode}) duration: ${Math.floor(this.duration/60)}:${(this.duration%60).toString().padStart(2,'0')}`);
            
        } catch (error) {
            console.warn('Failed to load timer settings, using defaults:', error);
            // Use safe defaults
            this.enabled = true;
            this.duration = 300; // 5 minutes
            this.showWarning = true;
        }
    }
    
    // Force reload settings - useful when SettingsManager becomes available later
    refreshSettings() {
        console.log('🔄 Refreshing timer settings...');
        this.loadSettings();
        
        // Update current timer if needed
        if (this.currentGameMode) {
            this.setGameMode(this.currentGameMode);
        }
    }
    
    setGameMode(gameMode) {
        console.log(`🔄 Setting timer game mode to: ${gameMode}`);
        
        this.currentGameMode = gameMode;
        
        // Update settings for the new game mode
        if (this.gameModeSettings[gameMode]) {
            const settings = this.gameModeSettings[gameMode];
            this.duration = settings.duration;
            this.warningThreshold = settings.warningThreshold;
            this.alertThreshold = settings.alertThreshold;
            
            console.log(`✅ ${gameMode} mode settings applied:`, {
                duration: `${Math.floor(settings.duration/60)}:${(settings.duration%60).toString().padStart(2,'0')}`,
                warningThreshold: `${settings.warningThreshold}s`,
                alertThreshold: `${settings.alertThreshold}s`
            });
        } else {
            console.warn(`⚠️ Unknown game mode: ${gameMode}, using default settings`);
        }
        
        // Reset timer if not running
        if (!this.isRunning) {
            this.timeRemaining = this.duration;
            this.updateDisplay();
            console.log(`📺 Timer display updated for new game mode`);
        }
        
        console.log(`Timer game mode set to: ${gameMode} (${this.formatTime(this.duration)})`);
    }
    
    startTimer(duration = null, gameMode = null) {
        try {
            if (!this.enabled) {
                this.hide();
                return;
            }
            
            // Set game mode if provided
            if (gameMode) {
                this.setGameMode(gameMode);
            }
            
            // Set duration if provided
            if (duration !== null) {
                this.duration = duration;
            }
            
            // Reset timer state
            this.timeRemaining = this.duration;
            this.isRunning = true;
            this.isPaused = false;
            this.startTime = performance.now();
            this.lastTickTime = this.startTime;
            
            // Clear any existing intervals to prevent memory leaks
            this.clearTimers();
            
            // Show timer
            this.show();
            
            // Start high-precision countdown
            this.startHighPrecisionTimer();
            
            // Update display immediately
            this.updateDisplay();
            
            // Record state
            this.recordState('started');
            
            console.log(`✅ Timer started: ${this.formatTime(this.timeRemaining)} (${this.currentGameMode} mode)`);
        console.log(`📊 Timer state: running=${this.isRunning}, paused=${this.isPaused}, enabled=${this.enabled}`);
        } catch (error) {
            console.error('Failed to start timer:', error);
            this.enabled = false;
        }
    }
    
    startHighPrecisionTimer() {
        console.log('🔄 Starting high-precision timer...');
        
        const tick = () => {
            if (!this.isRunning || this.isPaused) {
                console.log('⏸️ Timer tick skipped - not running or paused');
                return;
            }
            
            const now = performance.now();
            const elapsed = (now - this.startTime) / 1000;
            this.timeRemaining = Math.max(0, this.duration - elapsed);
            
            // Check for warning threshold with range to prevent missing trigger due to precision
            if (this.timeRemaining <= this.warningThreshold && this.timeRemaining > this.warningThreshold - 0.1 && this.showWarning) {
                this.triggerWarning();
            }
            
            // Check for expiration
            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                this.triggerExpiration();
                return;
            }
            
            this.updateDisplay();
            this.lastTickTime = now;
            
            // Continue with next frame
            this.animationFrame = requestAnimationFrame(tick);
        };
        
        this.animationFrame = requestAnimationFrame(tick);
        console.log('✅ High-precision timer started successfully');
    }
    
    pauseTimer() {
        if (!this.isRunning) return;
        
        this.isPaused = true;
        this.pauseTime = performance.now();
        
        this.clearTimers();
        
        this.updateDisplay();
        this.recordState('paused');
        console.log('Timer paused');
    }
    
    resumeTimer() {
        if (!this.isRunning || !this.isPaused) return;
        
        this.isPaused = false;
        
        // Adjust start time to account for pause duration
        const pauseDuration = (performance.now() - this.pauseTime) / 1000;
        this.startTime += pauseDuration * 1000;
        
        // Restart high-precision countdown
        this.startHighPrecisionTimer();
        
        this.updateDisplay();
        this.recordState('resumed');
        console.log('Timer resumed');
    }
    
    stopTimer() {
        this.isRunning = false;
        this.isPaused = false;
        
        this.clearTimers();
        
        this.updateDisplay();
        this.recordState('stopped');
        console.log('Timer stopped');
    }
    
    resetTimer() {
        console.log('🔄 Resetting timer...');
        this.stopTimer();
        this.timeRemaining = this.duration;
        this.updateDisplay();
        this.recordState('reset');
        console.log(`✅ Timer reset to ${this.formatTime(this.timeRemaining)} (${this.currentGameMode} mode)`);
    }
    
    clearTimers() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    triggerWarning() {
        // Add warning class
        if (this.timerDisplay) {
            this.timerDisplay.classList.add('urgent');
        }
        
        // Play warning sound
        if (this.warningSound && this.gameManager?.settingsManager?.getSettings()?.enableSound) {
            this.warningSound();
        }
        
        // Call warning callback
        if (this.onTimerWarning) {
            this.onTimerWarning(this.timeRemaining);
        }
        
        console.log('⚠️ Timer warning triggered');
    }
    
    triggerExpiration() {
        // Stop timer
        this.isRunning = false;
        this.clearTimers();
        
        // Add expired class
        if (this.timerDisplay) {
            this.timerDisplay.classList.remove('urgent', 'warning');
            this.timerDisplay.classList.add('expired');
        }
        
        // Play end sound
        if (this.endSound && this.gameManager?.settingsManager?.getSettings()?.enableSound) {
            this.endSound();
        }
        
        // Call expiration callback
        if (this.onTimerExpired) {
            this.onTimerExpired();
        }
        
        this.updateDisplay();
        this.recordState('expired');
        console.log('⏰ Timer expired');
    }
    
    updateDisplay() {
        if (!this.timerTime) return;
        
        const timeString = this.formatTime(this.timeRemaining);
        this.timerTime.textContent = timeString;
        
        // Update classes based on state
        if (this.timerDisplay) {
            const isUrgent = this.timeRemaining <= this.warningThreshold && this.timeRemaining > 0;
            const isWarning = this.timeRemaining <= this.alertThreshold && this.timeRemaining > this.warningThreshold;

            this.timerDisplay.classList.toggle('urgent', isUrgent);
            this.timerDisplay.classList.toggle('warning', isWarning);
            this.timerDisplay.classList.toggle('expired', this.timeRemaining <= 0);
        }
        
        // Call tick callback
        if (this.onTimerTick) {
            this.onTimerTick(this.timeRemaining, timeString);
        }
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    show() {
        if (this.timerDisplay && this.enabled) {
            this.timerDisplay.style.display = 'flex';
        }
    }
    
    hide() {
        if (this.timerDisplay) {
            this.timerDisplay.style.display = 'none';
        }
    }
    
    // Settings methods
    setDuration(duration, gameMode = null) {
        // Always treat the duration parameter as seconds
        this.duration = duration;
        
        // Update game mode settings if specified
        if (gameMode && this.gameModeSettings[gameMode]) {
            this.gameModeSettings[gameMode].duration = duration;
        }
        
        if (!this.isRunning) {
            this.timeRemaining = this.duration;
            this.updateDisplay();
        }
        
        console.log(`Timer duration set to ${this.duration} seconds (${Math.floor(this.duration/60)}:${(this.duration%60).toString().padStart(2,'0')})`);
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled) {
            this.show();
        } else {
            this.hide();
        }
    }
    
    setWarningEnabled(enabled) {
        this.showWarning = enabled;
    }
    
    setWarningThreshold(seconds) {
        this.warningThreshold = seconds;
    }
    
    setAlertThreshold(seconds) {
        this.alertThreshold = seconds;
    }
    
    // Custom timer settings for game modes
    setGameModeTimer(gameMode, duration, warningThreshold = 30, alertThreshold = 60) {
        console.log(`🔄 Setting ${gameMode} mode timer: ${Math.floor(duration/60)}:${(duration%60).toString().padStart(2,'0')} (${duration} seconds)`);
        
        if (this.gameModeSettings[gameMode]) {
            this.gameModeSettings[gameMode] = {
                duration: duration,
                warningThreshold: warningThreshold,
                alertThreshold: alertThreshold
            };
            
            console.log(`✅ ${gameMode} mode timer settings updated:`, {
                duration: `${Math.floor(duration/60)}:${(duration%60).toString().padStart(2,'0')}`,
                warningThreshold: `${warningThreshold}s`,
                alertThreshold: `${alertThreshold}s`
            });
            
            // Update current settings if this is the active game mode
            if (this.currentGameMode === gameMode) {
                this.duration = duration;
                this.warningThreshold = warningThreshold;
                this.alertThreshold = alertThreshold;
                console.log(`🎯 Current game mode updated to match new settings`);
                
                // Update display if timer is not running
                if (!this.isRunning) {
                    this.timeRemaining = this.duration;
                    this.updateDisplay();
                    console.log(`📺 Timer display updated for new duration`);
                }
            }
            
            console.log(`Game mode timer updated: ${gameMode} - ${Math.floor(duration/60)}:${(duration%60).toString().padStart(2,'0')}`);
        } else {
            console.warn(`⚠️ Unknown game mode: ${gameMode}`);
        }
    }
    
    // Test method to verify timer settings are working
    testTimerSettings() {
        console.log('🧪 Testing timer settings...');
        
        // Test 1: Check if settings are loaded
        console.log('\n📋 Test 1: Settings Loading');
        this.debugTimerSettings();
        
        // Test 2: Test changing game mode timers
        console.log('\n🔄 Test 2: Changing Game Mode Timers');
        const testDurations = {
            progressive: 120, // 2 minutes
            single: 180,      // 3 minutes
            vs: 240,          // 4 minutes
            custom: 300       // 5 minutes
        };
        
        Object.keys(testDurations).forEach(mode => {
            const duration = testDurations[mode];
            console.log(`Testing ${mode} mode: ${Math.floor(duration/60)}:${(duration%60).toString().padStart(2,'0')}`);
            this.setGameModeTimer(mode, duration);
        });
        
        // Test 3: Verify settings were applied
        console.log('\n✅ Test 3: Verifying Settings');
        Object.keys(testDurations).forEach(mode => {
            const settings = this.getGameModeSettings(mode);
            if (settings) {
                const expected = testDurations[mode];
                const actual = settings.duration;
                const match = expected === actual;
                console.log(`${mode}: ${match ? '✅' : '❌'} Expected ${Math.floor(expected/60)}:${(expected%60).toString().padStart(2,'0')}, Got ${Math.floor(actual/60)}:${(actual%60).toString().padStart(2,'0')}`);
            } else {
                console.log(`${mode}: ❌ No settings found`);
            }
        });
        
        // Test 4: Test game mode switching
        console.log('\n🎮 Test 4: Game Mode Switching');
        const testModes = ['progressive', 'single', 'vs', 'custom'];
        testModes.forEach(mode => {
            console.log(`Switching to ${mode} mode...`);
            this.setGameMode(mode);
            const currentDuration = this.getDuration();
            const expectedDuration = testDurations[mode];
            const match = currentDuration === expectedDuration;
            console.log(`${mode}: ${match ? '✅' : '❌'} Duration ${Math.floor(currentDuration/60)}:${(currentDuration%60).toString().padStart(2,'0')}`);
        });
        
        console.log('\n🧪 Timer settings test completed');
    }

    // Debug method to validate timer settings
    debugTimerSettings() {
        console.log('=== TIMER SETTINGS DEBUG ===');
        console.log(`Current game mode: ${this.currentGameMode}`);
        console.log(`Timer enabled: ${this.enabled}`);
        console.log(`Timer warning enabled: ${this.showWarning}`);
        console.log(`Current duration: ${Math.floor(this.duration/60)}:${(this.duration%60).toString().padStart(2,'0')} (${this.duration}s)`);
        console.log(`Time remaining: ${Math.floor(this.timeRemaining/60)}:${(this.timeRemaining%60).toString().padStart(2,'0')} (${this.timeRemaining}s)`);
        console.log(`Timer running: ${this.isRunning}`);
        console.log(`Timer paused: ${this.isPaused}`);
        
        console.log('\nGame mode settings:');
        Object.keys(this.gameModeSettings).forEach(mode => {
            const settings = this.gameModeSettings[mode];
            console.log(`  ${mode}: ${Math.floor(settings.duration/60)}:${(settings.duration%60).toString().padStart(2,'0')} (${settings.duration}s)`);
        });
        
        // Check if settings are loaded from SettingsManager
        if (this.gameManager?.settingsManager?.getSettings) {
            const settings = this.gameManager.settingsManager.getSettings();
            console.log('\nSettingsManager settings:');
            console.log(`  enableTimer: ${settings.enableTimer}`);
            console.log(`  timerWarning: ${settings.timerWarning}`);
            console.log(`  gameModeTimers:`, settings.gameModeTimers);
        } else {
            console.log('\nSettingsManager not available');
        }
        
        console.log('===========================');
    }

    // Force restart timer (for debugging)
    forceRestartTimer() {
        console.log('🔄 Force restarting timer...');
        this.stopTimer();
        this.clearTimers();
        this.timeRemaining = this.duration;
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = performance.now();
        this.lastTickTime = this.startTime;
        this.show();
        this.startHighPrecisionTimer();
        this.updateDisplay();
        this.recordState('force_restart');
        console.log(`✅ Timer force restarted: ${this.formatTime(this.timeRemaining)}`);
    }
    
    // Getters
    getTimeRemaining() {
        return this.timeRemaining;
    }
    
    getDuration() {
        return this.duration;
    }
    
    isTimerRunning() {
        return this.isRunning;
    }
    
    isTimerPaused() {
        return this.isPaused;
    }
    
    isTimerExpired() {
        return this.timeRemaining <= 0;
    }
    
    getFormattedTimeRemaining() {
        return this.formatTime(this.timeRemaining);
    }
    
    getCurrentGameMode() {
        return this.currentGameMode;
    }
    
    getGameModeSettings(gameMode) {
        return this.gameModeSettings[gameMode] || null;
    }
    
    // Callback setters
    setOnTimerWarning(callback) {
        this.onTimerWarning = callback;
    }
    
    setOnTimerExpired(callback) {
        this.onTimerExpired = callback;
    }
    
    setOnTimerTick(callback) {
        this.onTimerTick = callback;
    }
    
    // State tracking for debugging and fail-safes
    recordState(action) {
        const state = {
            action: action,
            timestamp: Date.now(),
            timeRemaining: this.timeRemaining,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            gameMode: this.currentGameMode
        };
        
        this.stateHistory.push(state);
        
        // Keep only the last N states
        if (this.stateHistory.length > this.maxStateHistory) {
            this.stateHistory.shift();
        }
        
        this.lastState = state;
    }
    
    getStateHistory() {
        return [...this.stateHistory];
    }
    
    // Cleanup
    dispose() {
        console.log('🧹 Disposing Enhanced TimerManager...');
        
        // Clear any running timers
        this.stopTimer();
        
        // Clear synchronization
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        // Clear callbacks to prevent memory leaks
        this.onTimerWarning = null;
        this.onTimerExpired = null;
        this.onTimerTick = null;
        
        // Close audio context if it exists
        if (this.audioContext && this.audioContext.state !== 'closed') {
            try {
                this.audioContext.close();
            } catch (error) {
                console.warn('Failed to close audio context:', error);
            }
        }
        this.audioContext = null;
        this.warningSound = null;
        this.endSound = null;
        
        // Clear DOM references
        this.timerDisplay = null;
        this.timerTime = null;
        
        // Clear state history
        this.stateHistory = [];
        this.lastState = null;
        
        console.log('✅ Enhanced TimerManager disposed successfully');
    }
}

// Export for global access
window.TimerManager = TimerManager; 