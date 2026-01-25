/**
 * Configuration Manager for The Spy Academy
 * Centralized game settings and responsive design utilities
 */

class GameConfig {
    constructor() {
        // Game Settings
        this.game = {
            name: 'The Spy Academy',
            version: '2.0.0',
            minPlayers: 3,
            maxPlayers: 8,
            defaultPlayerCount: 4
        };
        
        // Audio Settings
        this.audio = {
            defaultMasterVolume: 0.7,
            defaultSfxVolume: 0.8,
            defaultMusicVolume: 0.4,
            fadeInDuration: 2000,
            fadeOutDuration: 1000,
            timerTickInterval: 1000,
            maxRetries: 3
        };
        
        // Voice Settings
        this.voice = {
            rate: 1.0,
            pitch: 1.0,
            volume: 0.8,
            lang: 'en-US',
            fallbackVoices: ['female', 'default'],
            maxRetries: 2,
            speechDelay: 300
        };
        
        // UI Settings
        this.ui = {
            animationDuration: 500,
            fadeTransition: 300,
            mobileBreakpoint: 768,
            touchDelay: 100,
            scrollBehavior: 'smooth'
        };
        
        // Challenge Settings
        this.challenges = {
            firstImpressions: {
                votingTimePerPlayer: 30000, // 30 seconds
                instructionDelay: 1000,
                confirmationDelay: 2000
            },
            finalVoting: {
                discussionTime: 180000, // 3 minutes
                votingTime: 60000, // 1 minute
                revealDelay: 3000
            }
        };
        
        // Performance Settings
        this.performance = {
            debounceDelay: 300,
            throttleDelay: 100,
            maxConcurrentAnimations: 5,
            renderBudget: 16 // 60fps = 16ms per frame
        };
        
        // Development Settings
        this.dev = {
            enableDebugMode: this.isDebugMode(),
            enablePerformanceMonitoring: true,
            enableErrorReporting: true,
            mockAudio: false
        };
        
        // Device Detection
        this.device = {
            isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
            isAndroid: /Android/.test(navigator.userAgent),
            isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
            isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            isHighDPI: window.devicePixelRatio > 1
        };
        
        // Colors and Theming
        this.colors = {
            primary: '#00ffff',
            secondary: '#ff6b35',
            danger: '#ff3333',
            success: '#28a745',
            warning: '#ffc107',
            dark: '#000511',
            light: '#ffffff',
            playerColors: [
                '#ff0000', '#00ff00', '#0080ff', '#ffff00',
                '#ff8000', '#8000ff', '#ff0080', '#00ff80'
            ]
        };
        
        // 3D Scene Settings
        this.threeJS = {
            camera: {
                fov: 75,
                near: 0.1,
                far: 1000,
                position: { x: 0, y: 0, z: 5 }
            },
            renderer: {
                antialias: true,
                alpha: true,
                pixelRatio: Math.min(window.devicePixelRatio, 2)
            },
            diamond: {
                geometry: { radius: 1.5, detail: 2 },
                material: {
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.8,
                    shininess: 100
                },
                rotation: { x: 0.005, y: 0.01 }
            },
            particles: {
                count: this.device.isMobile ? 100 : 200,
                size: 0.02,
                opacity: 0.6,
                range: 20
            }
        };
        
        // Validation
        this.validate();
    }
    
    /**
     * Check if debug mode is enabled
     */
    isDebugMode() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.search.includes('debug=true') ||
               localStorage.getItem('debugMode') === 'true';
    }
    
    /**
     * Get configuration section
     */
    get(section, key = null) {
        if (!this[section]) {
            console.warn(`Configuration section '${section}' does not exist`);
            return null;
        }
        
        if (key === null) {
            return this[section];
        }
        
        if (!this[section][key]) {
            console.warn(`Configuration key '${key}' does not exist in section '${section}'`);
            return null;
        }
        
        return this[section][key];
    }
    
    /**
     * Set configuration value
     */
    set(section, key, value) {
        if (!this[section]) {
            this[section] = {};
        }
        
        this[section][key] = value;
        
        // Persist certain settings to localStorage
        if (section === 'audio' || section === 'ui') {
            this.persistSetting(section, key, value);
        }
    }
    
    /**
     * Persist setting to localStorage
     */
    persistSetting(section, key, value) {
        try {
            const storageKey = `gameConfig_${section}_${key}`;
            localStorage.setItem(storageKey, JSON.stringify(value));
        } catch (error) {
            console.warn('Failed to persist setting:', error);
        }
    }
    
    /**
     * Load persisted settings from localStorage
     */
    loadPersistedSettings() {
        const sections = ['audio', 'ui'];
        
        sections.forEach(section => {
            Object.keys(this[section]).forEach(key => {
                try {
                    const storageKey = `gameConfig_${section}_${key}`;
                    const stored = localStorage.getItem(storageKey);
                    if (stored !== null) {
                        this[section][key] = JSON.parse(stored);
                    }
                } catch (error) {
                    console.warn(`Failed to load persisted setting ${section}.${key}:`, error);
                }
            });
        });
    }
    
    /**
     * Validate configuration
     */
    validate() {
        // Validate player count constraints
        if (this.game.minPlayers > this.game.maxPlayers) {
            console.error('Invalid game configuration: minPlayers > maxPlayers');
        }
        
        // Validate audio volumes
        ['defaultMasterVolume', 'defaultSfxVolume', 'defaultMusicVolume'].forEach(key => {
            if (this.audio[key] < 0 || this.audio[key] > 1) {
                console.warn(`Audio volume ${key} should be between 0 and 1`);
                this.audio[key] = Math.max(0, Math.min(1, this.audio[key]));
            }
        });
        
        // Validate color array
        if (this.colors.playerColors.length < this.game.maxPlayers) {
            console.warn('Not enough player colors defined for maximum players');
        }
        
        // Adjust particle count for mobile
        if (this.device.isMobile && this.threeJS.particles.count > 150) {
            this.threeJS.particles.count = 100;
        }
    }
    
    /**
     * Get responsive font size based on device
     */
    getFontSize(baseSize, scaleFactor = 0.8) {
        if (this.device.isMobile) {
            return `${baseSize * scaleFactor}rem`;
        }
        return `${baseSize}rem`;
    }
    
    /**
     * Get responsive padding based on device
     */
    getPadding(basePadding, scaleFactor = 0.7) {
        if (this.device.isMobile) {
            return `${basePadding * scaleFactor}px`;
        }
        return `${basePadding}px`;
    }
    
    /**
     * Get optimized animation duration based on device performance
     */
    getAnimationDuration(baseDuration) {
        if (this.device.isMobile && !this.device.isHighDPI) {
            return baseDuration * 0.7; // Faster animations on lower-end mobile
        }
        return baseDuration;
    }
    
    /**
     * Debug method to display current configuration
     */
    debug() {
        console.group('🔧 Game Configuration');
        console.table(this.game);
        console.table(this.device);
        console.table(this.audio);
        console.groupEnd();
    }
    
    /**
     * Reset configuration to defaults
     */
    reset() {
        // Clear persisted settings
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('gameConfig_')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.warn('Failed to clear persisted settings:', error);
        }
        
        // Reinitialize by recreating the object
        const newConfig = new GameConfig();
        Object.assign(this, newConfig);
    }
}

// Create global configuration instance
window.gameConfig = new GameConfig();

// Load any persisted settings
window.gameConfig.loadPersistedSettings();

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConfig;
} 