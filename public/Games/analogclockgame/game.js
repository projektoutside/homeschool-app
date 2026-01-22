/**
 * Analog Clock Learning Game - Complete System
 * Modern, responsive educational game with perfect clock functionality
 * Created with start menu, flawless hand movements, and no glitches
 */

/* =============================================
   GAME CONFIGURATION
   ============================================= */
const GAME_CONFIG = {
    LEVELS: [
        {
            id: 1,
            name: "O'Clock Hours Only",
            unlockScore: 0,
            formats: ["o'clock"],
            timeLimit: 300,
            hasAMPM: false,
            hasSeconds: false,
            scoring: { "o'clock": 10 }
        },
        {
            id: 2,
            name: "O'Clocks + Half Past",
            unlockScore: 50,
            formats: ["o'clock", "half_past"],
            timeLimit: 270,
            hasAMPM: false,
            hasSeconds: false,
            scoring: { "o'clock": 10, "half_past": 15 }
        },
        {
            id: 3,
            name: "O'Clocks + Half Past + Quarter Hours",
            unlockScore: 150,
            formats: ["o'clock", "half_past", "quarter_hours"],
            timeLimit: 240,
            hasAMPM: false,
            hasSeconds: false,
            scoring: { "o'clock": 10, "half_past": 15, "quarter_hours": 20 }
        },
        {
            id: 4,
            name: "O'Clocks + Half Past + Quarter Hours + Five-Minute Increments",
            unlockScore: 250,
            formats: ["o'clock", "half_past", "quarter_hours", "five_minutes"],
            timeLimit: 210,
            hasAMPM: false,
            hasSeconds: false,
            scoring: { "o'clock": 10, "half_past": 15, "quarter_hours": 20, "five_minutes": 25 }
        },
        {
            id: 5,
            name: "O'Clocks + Half Past + Quarter Hours + Five-Minute Increments + Full Minutes",
            unlockScore: 500,
            formats: ["o'clock", "half_past", "quarter_hours", "five_minutes", "full_minutes"],
            timeLimit: 180,
            hasAMPM: false,
            hasSeconds: false,
            scoring: { "o'clock": 10, "half_past": 15, "quarter_hours": 20, "five_minutes": 25, "full_minutes": 30 }
        },
        {
            id: 6,
            name: "All Previous + AM/PM Test Panel",
            unlockScore: 750,
            formats: ["o'clock", "half_past", "quarter_hours", "five_minutes", "full_minutes"],
            timeLimit: 150,
            hasAMPM: true,
            hasSeconds: false,
            scoring: { "o'clock": 15, "half_past": 20, "quarter_hours": 25, "five_minutes": 30, "full_minutes": 35 }
        },
        {
            id: 7,
            name: "Final Level — All Previous + Seconds Precision",
            unlockScore: 1200,
            formats: ["o'clock", "half_past", "quarter_hours", "five_minutes", "full_minutes"],
            timeLimit: 120,
            hasAMPM: true,
            hasSeconds: true,
            scoring: { "all": 50 } // Flat rate for final level
        }
    ],
    MAX_STARS: 3,
    DEBUG: true // Enable debug mode to track issues
};

const VISUAL_CONFIG = {
    SVG_SIZE: 500,         // Increased from 400
    CENTER_X: 250,         // Increased from 200 (half of SVG_SIZE)
    CENTER_Y: 250,         // Increased from 200 (half of SVG_SIZE)
    CLOCK_RADIUS: 230,     // Increased from 180
    HOUR_HAND_LENGTH: 90,  // Increased from 70
    MINUTE_HAND_LENGTH: 140, // Increased from 110
    SECONDS_HAND_LENGTH: 150, // Longest hand for precision
    COLORS: {
        HOUR_MARKS: '#FF9800',
        MINUTE_MARKS: '#B0B0B0',
        NUMBERS: '#2196F3',
        SPECIAL_NUMBERS: '#FF9800',
        HOUR_HAND: '#1976D2',
        MINUTE_HAND: '#D32F2F',
        SECONDS_HAND: '#FF9800'
    }
};

/* =============================================
   UTILITY FUNCTIONS
   ============================================= */
class GameUtils {
    static log(...args) {
        if (GAME_CONFIG.DEBUG) {
            console.log('[AnalogClock]', ...args);
        }
    }

    static error(...args) {
        console.error('[AnalogClock Error]', ...args);
    }

    static warn(...args) {
        console.warn('[AnalogClock Warning]', ...args);
    }

    static getRandomInt(min, max) {
        const range = max - min + 1;
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const randomBuffer = new Uint32Array(1);
            crypto.getRandomValues(randomBuffer);
            return Math.floor((randomBuffer[0] / (0xFFFFFFFF + 1)) * range) + min;
        }
        return Math.floor(Math.random() * range) + min;
    }

    static shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    static validateElement(element, name) {
        if (!element) {
            GameUtils.error(`Required element not found: ${name}`);
            return false;
        }
        return true;
    }

    static addTransition(element, property = 'all', duration = '0.3s', easing = 'ease-out') {
        if (element) {
            element.style.transition = `${property} ${duration} ${easing}`;
        }
    }

    static removeTransition(element) {
        if (element) {
            element.style.transition = 'none';
        }
    }

}

/* =============================================
   SOUND MANAGER (Web Audio API)
   ============================================= */
class SoundManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.context = null;
        this.isMuted = false;

        // Frequencies for sounds
        this.clickFreq = 800; // Hz
        this.correctFreqs = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
        this.wrongFreqs = [150, 140]; // Dissonant low tones
    }

    initAudio() {
        // Initialize AudioContext lazily on user interaction
        if (!this.context) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.context = new AudioContext();
            } else {
                GameUtils.warn('Web Audio API not supported in this browser');
            }
        }

        // Resume context if suspended (browser autoplay policy)
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    get isSoundEnabled() {
        const enabled = this.settingsManager ? this.settingsManager.getSetting('soundEnabled') : true;
        return enabled && !this.isMuted && this.context;
    }

    playTone(frequency, type, duration, startTime = 0, volume = 0.5) {
        if (!this.isSoundEnabled) return;

        try {
            const osc = this.context.createOscillator();
            const gainNode = this.context.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(frequency, this.context.currentTime + startTime);

            gainNode.gain.setValueAtTime(volume, this.context.currentTime + startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + startTime + duration);

            osc.connect(gainNode);
            gainNode.connect(this.context.destination);

            osc.start(this.context.currentTime + startTime);
            osc.stop(this.context.currentTime + startTime + duration);
        } catch (e) {
            GameUtils.error('Error playing sound:', e);
        }
    }

    playClick() {
        this.initAudio();
        // Short, high-pitch pop (Sine wave)
        this.playTone(800, 'sine', 0.1, 0, 0.3);
    }

    playCorrect() {
        this.initAudio();
        // Pleasant ascending major arpeggio
        this.correctFreqs.forEach((freq, index) => {
            this.playTone(freq, 'sine', 0.3, index * 0.08, 0.4);
        });
    }

    playWrong() {
        this.initAudio();
        // Dissonant descending buzz
        this.playTone(150, 'sawtooth', 0.4, 0, 0.4);
        this.playTone(130, 'sawtooth', 0.4, 0.1, 0.4);
    }
}

/* =============================================
   SETTINGS MANAGEMENT
   ============================================= */
class SettingsManager {
    constructor() {
        this.defaultSettings = {
            timeMultiplier: 5, // Now represents direct minutes instead of multiplier
            starCount: 3,
            soundEnabled: true
        };
        this.settings = this.loadSettings();
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('analogClockGameSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...this.defaultSettings, ...parsed };
            }
        } catch (error) {
            GameUtils.warn('Failed to load settings from localStorage:', error);
        }
        return { ...this.defaultSettings };
    }

    saveSettings() {
        try {
            localStorage.setItem('analogClockGameSettings', JSON.stringify(this.settings));
            GameUtils.log('Settings saved:', this.settings);
        } catch (error) {
            GameUtils.warn('Failed to save settings to localStorage:', error);
        }
    }

    updateSetting(key, value) {
        if (this.defaultSettings.hasOwnProperty(key)) {
            // Validate the value based on the setting type
            if (key === 'timeMultiplier') {
                value = Math.max(1, Math.min(15, parseInt(value) || 5));
            } else if (key === 'starCount') {
                value = Math.max(1, Math.min(10, parseInt(value) || 3));
            } else if (key === 'soundEnabled') {
                value = !!value; // Ensure boolean
            }

            this.settings[key] = value;
            GameUtils.log(`Setting updated: ${key} = ${value}`);
        } else {
            GameUtils.warn(`Unknown setting key: ${key}`);
        }
    }

    getSetting(key) {
        return this.settings[key] ?? this.defaultSettings[key];
    }

    resetToDefaults() {
        this.settings = { ...this.defaultSettings };
        GameUtils.log('Settings reset to defaults');
    }

    getAdjustedTimeLimit(originalTime) {
        const timeInMinutes = this.getSetting('timeMultiplier');
        return Math.max(30, timeInMinutes * 60); // Convert minutes to seconds, minimum 30 seconds
    }

    getMaxStars() {
        return this.getSetting('starCount');
    }

    applyToGameConfig() {
        // Update GAME_CONFIG with current settings
        GAME_CONFIG.MAX_STARS = this.getSetting('starCount');

        // Apply custom time limit to all levels
        GAME_CONFIG.LEVELS.forEach(level => {
            level.originalTimeLimit = level.originalTimeLimit || level.timeLimit;
            level.timeLimit = this.getAdjustedTimeLimit(level.originalTimeLimit);
        });

        GameUtils.log('Settings applied to game configuration');
    }
}

/* =============================================
   ENHANCED RANDOMNESS AND UNIQUENESS SYSTEM
   ============================================= */

class EnhancedRandomnessManager {
    constructor() {
        this.sessionUsedTimes = new Map(); // Track all times used in session with metadata
        this.levelUsedTimes = new Map(); // Track times per level
        this.formatWeights = new Map(); // Dynamic weights for format selection
        this.questionHistory = []; // Track recent questions for pattern avoidance
        this.cryptoSupport = typeof crypto !== 'undefined' && crypto.getRandomValues;

        this.initializeWeights();
    }

    initializeWeights() {
        // Initialize format weights for balanced distribution
        const formats = ["o'clock", "half_past", "quarter_hours", "five_minutes", "full_minutes"];
        formats.forEach(format => {
            this.formatWeights.set(format, 1.0);
        });
    }

    generateCryptographicRandom(min, max) {
        if (!this.cryptoSupport) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        const range = max - min + 1;
        const maxValidValue = Math.floor(0x100000000 / range) * range - 1;

        let randomValue;
        do {
            const randomBuffer = new Uint32Array(1);
            crypto.getRandomValues(randomBuffer);
            randomValue = randomBuffer[0];
        } while (randomValue > maxValidValue);

        return Math.floor(randomValue / (maxValidValue + 1) * range) + min;
    }

    selectWeightedFormat(availableFormats) {
        // Calculate total weight for available formats
        const totalWeight = availableFormats.reduce((sum, format) => {
            return sum + (this.formatWeights.get(format) || 1.0);
        }, 0);

        // Generate random number for selection
        let random = Math.random() * totalWeight;

        // Select format based on weights
        for (const format of availableFormats) {
            const weight = this.formatWeights.get(format) || 1.0;
            random -= weight;
            if (random <= 0) {
                return format;
            }
        }

        // Fallback to random selection
        return availableFormats[Math.floor(Math.random() * availableFormats.length)];
    }

    updateFormatWeights(usedFormat) {
        // Decrease weight of recently used format to encourage variety
        const currentWeight = this.formatWeights.get(usedFormat) || 1.0;
        this.formatWeights.set(usedFormat, Math.max(0.3, currentWeight * 0.8));

        // Gradually increase weights of other formats
        for (const [format, weight] of this.formatWeights.entries()) {
            if (format !== usedFormat) {
                this.formatWeights.set(format, Math.min(1.5, weight * 1.05));
            }
        }
    }

    generateUniqueTimeKey(hours, minutes, seconds, isAM, hasAMPM, hasSeconds) {
        let key = `${hours}:${minutes.toString().padStart(2, '0')}`;

        if (hasSeconds) {
            key += `:${seconds.toString().padStart(2, '0')}`;
        }

        if (hasAMPM) {
            key += `_${isAM ? 'AM' : 'PM'}`;
        }

        return key;
    }

    isTimeUsedInSession(timeKey) {
        return this.sessionUsedTimes.has(timeKey);
    }

    isTimeUsedInLevel(levelId, timeKey) {
        const levelTimes = this.levelUsedTimes.get(levelId) || new Set();
        return levelTimes.has(timeKey);
    }

    markTimeAsUsed(levelId, timeKey, timeData) {
        // Mark in session
        this.sessionUsedTimes.set(timeKey, {
            ...timeData,
            levelId,
            timestamp: Date.now()
        });

        // Mark in level
        if (!this.levelUsedTimes.has(levelId)) {
            this.levelUsedTimes.set(levelId, new Set());
        }
        this.levelUsedTimes.get(levelId).add(timeKey);

        // Update question history
        this.questionHistory.push({
            timeKey,
            timeData: { ...timeData },
            timestamp: Date.now()
        });

        // Keep only recent history (last 20 questions)
        if (this.questionHistory.length > 20) {
            this.questionHistory = this.questionHistory.slice(-20);
        }

        // Update format weights
        this.updateFormatWeights(timeData.timeFormat);
    }

    clearLevelProgress(levelId) {
        if (this.levelUsedTimes.has(levelId)) {
            this.levelUsedTimes.get(levelId).clear();
        }
    }

    resetSession() {
        this.sessionUsedTimes.clear();
        this.levelUsedTimes.clear();
        this.questionHistory = [];
        this.initializeWeights();
    }

    avoidRecentPatterns(newTime) {
        // Check if this time creates a pattern with recent questions
        if (this.questionHistory.length < 3) return true;

        const recentTimes = this.questionHistory.slice(-3);

        // Avoid same hour in consecutive questions
        const lastHour = recentTimes[recentTimes.length - 1]?.timeData?.hours;
        if (lastHour === newTime.hours) return false;

        // Avoid alternating patterns (A-B-A-B)
        if (recentTimes.length >= 2) {
            const penultimate = recentTimes[recentTimes.length - 2];
            const last = recentTimes[recentTimes.length - 1];

            if (penultimate.timeData.hours === newTime.hours &&
                penultimate.timeData.minutes === newTime.minutes &&
                last.timeData.hours !== newTime.hours) {
                return false;
            }
        }

        return true;
    }

    getTimePoolSize(level) {
        // Calculate theoretical maximum unique times for this level
        let totalCombinations = 0;

        for (const format of level.formats) {
            let minuteOptions = 0;

            switch (format) {
                case "o'clock":
                    minuteOptions = 1; // Only :00
                    break;
                case "half_past":
                    minuteOptions = 1; // Only :30
                    break;
                case "quarter_hours":
                    minuteOptions = 2; // :15, :45
                    break;
                case "five_minutes":
                    minuteOptions = 8; // 5,10,20,25,35,40,50,55
                    break;
                case "full_minutes":
                    minuteOptions = 48; // All other minutes (60 - 12 covered by other formats)
                    break;
            }

            totalCombinations += minuteOptions;
        }

        // Multiply by hours (12), AM/PM (2 if applicable), seconds (60 if applicable)
        totalCombinations *= 12;

        if (level.hasAMPM) {
            totalCombinations *= 2;
        }

        if (level.hasSeconds) {
            totalCombinations *= 60;
        }

        return totalCombinations;
    }

    shouldRefreshPool(levelId, level) {
        const levelTimes = this.levelUsedTimes.get(levelId) || new Set();
        const maxPool = this.getTimePoolSize(level);
        const usageRatio = levelTimes.size / maxPool;

        // Refresh if we've used more than 80% of available times
        return usageRatio > 0.8;
    }

    getStatistics() {
        return {
            sessionQuestionsCount: this.sessionUsedTimes.size,
            formatWeights: Object.fromEntries(this.formatWeights),
            recentPatterns: this.questionHistory.slice(-5),
            cryptoSupport: this.cryptoSupport
        };
    }
}

/* =============================================
   ENHANCED GAME STATE WITH RANDOMNESS MANAGER
   ============================================= */
class GameState {
    constructor(settingsManager = null) {
        this.settingsManager = settingsManager;
        this.randomnessManager = new EnhancedRandomnessManager();
        this.reset();
    }

    reset(startingLevel = 1) {
        this.currentLevel = startingLevel;
        // Always get fresh settings when resetting
        const maxStars = this.settingsManager ? this.settingsManager.getMaxStars() : GAME_CONFIG.MAX_STARS;
        this.stars = maxStars;
        this.points = 0;

        GameUtils.log(`Game reset with ${this.stars} lives (max: ${maxStars}) starting at level ${startingLevel}`);
        this.currentTime = { hours: 12, minutes: 0, seconds: 0 };
        this.currentTimeFormat = 'o\'clock';
        this.isAM = true;
        this.isGameActive = false;
        this.timeRemaining = 0;

        // Legacy support for existing code
        this.usedTimes = new Set();
        this.currentLevelUsedTimes = new Set();

        this.questionsAnswered = 0;
        this.correctAnswers = 0;
        this.isStartMenuVisible = true;
        this.clearTimer();

        // Reset randomness manager for new session
        this.randomnessManager.resetSession();
    }

    getCurrentLevel() {
        return GAME_CONFIG.LEVELS[this.currentLevel - 1];
    }

    decrementStars() {
        this.stars = Math.max(0, this.stars - 1);
    }

    shouldLevelUp() {
        if (this.currentLevel >= GAME_CONFIG.LEVELS.length) {
            return false;
        }

        // Find the next level that should be unlocked based on current score
        for (let i = this.currentLevel; i < GAME_CONFIG.LEVELS.length; i++) {
            const nextLevel = GAME_CONFIG.LEVELS[i];
            if (this.points >= nextLevel.unlockScore) {
                return true;
            } else {
                break;
            }
        }
        return false;
    }

    levelUp() {
        // Find the highest level that should be unlocked based on current score
        let newLevel = this.currentLevel;
        for (let i = 0; i < GAME_CONFIG.LEVELS.length; i++) {
            const level = GAME_CONFIG.LEVELS[i];
            if (this.points >= level.unlockScore) {
                newLevel = level.id;
            } else {
                break;
            }
        }

        if (newLevel > this.currentLevel) {
            this.currentLevel = newLevel;

            // Clear legacy level tracking
            this.currentLevelUsedTimes.clear();

            // Clear randomness manager level tracking
            this.randomnessManager.clearLevelProgress(newLevel);

            return true;
        }
        return false;
    }

    incrementScore(timeFormat) {
        const level = this.getCurrentLevel();
        let points = 0;

        if (level.scoring.all) {
            // Level 7 flat rate
            points = level.scoring.all;
        } else if (level.scoring[timeFormat]) {
            points = level.scoring[timeFormat];
        } else {
            // Fallback to lowest scoring if format not found
            points = Math.min(...Object.values(level.scoring));
        }

        this.points += points;
        GameUtils.log(`Added ${points} points for ${timeFormat}. Total: ${this.points}`);

        // Return the points earned for this answer
        return points;
    }

    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            GameUtils.log('Timer cleared successfully');
        }
    }

    addTime(seconds) {
        this.timeRemaining += seconds;
        GameUtils.log(`Added ${seconds} seconds to timer. New time remaining: ${this.timeRemaining}`);
    }

    destroy() {
        this.clearTimer();
        this.settingsManager = null;
        this.randomnessManager = null;
        GameUtils.log('GameState destroyed and cleaned up');
    }

    // Get randomness statistics for debugging
    getRandomnessStats() {
        return this.randomnessManager.getStatistics();
    }
}

/* =============================================
   DOM MANAGEMENT
   ============================================= */
class DOMManager {
    constructor() {
        this.elements = {};
        this.cacheElements();
        this.validateElements();
    }

    cacheElements() {
        this.elements = {
            // Game elements
            gameContainer: document.getElementById('game-container'),
            questionTitle: document.querySelector('#question-panel h1'),
            options: document.getElementById('options'),
            badge: document.querySelector('.badge'),
            stars: document.getElementById('stars'),
            timer: document.getElementById('timer'),
            points: document.getElementById('points'),
            clockStatus: document.getElementById('clock-status'),

            // AM/PM Panel elements (Level 6+)
            ampmPanel: document.getElementById('ampm-panel'),
            ampmIndicator: document.getElementById('ampm-indicator'),

            // Start menu elements
            startMenu: document.getElementById('start-menu'),
            startGameBtn: document.getElementById('start-game-btn'),
            instructionsBtn: document.getElementById('instructions-btn'),
            instructionsModal: document.getElementById('instructions-modal'),
            closeInstructionsBtn: document.getElementById('close-instructions'),
            startFromInstructionsBtn: document.getElementById('start-from-instructions'),

            // Settings elements
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            closeSettingsBtn: document.getElementById('close-settings'),
            saveSettingsBtn: document.getElementById('save-settings'),
            resetSettingsBtn: document.getElementById('reset-settings'),
            timeMultiplierSlider: document.getElementById('time-multiplier'),
            timeMultiplierValue: document.getElementById('time-multiplier-value'),
            starCountSlider: document.getElementById('star-count'),
            starCountValue: document.getElementById('star-count-value'),
            soundToggle: document.getElementById('sound-toggle'),
            previewTime: document.getElementById('preview-time'),
            starCountSlider: document.getElementById('star-count'),
            starCountValue: document.getElementById('star-count-value'),
            previewTime: document.getElementById('preview-time'),
            previewLives: document.getElementById('preview-lives'),

            // Level transition elements
            levelTransitionModal: document.getElementById('level-transition-modal'),
            levelTransitionTitle: document.getElementById('level-transition-title'),
            levelCelebrationText: document.getElementById('level-celebration-text'),
            nextLevelName: document.getElementById('next-level-name'),
            levelChallengeText: document.getElementById('level-challenge-text'),
            levelTimeLimit: document.getElementById('level-time-limit'),
            levelTip: document.getElementById('level-tip'),
            scoringBreakdown: document.getElementById('scoring-breakdown'),
            startNextLevelBtn: document.getElementById('start-next-level-btn'),
            rewardShopBtn: document.getElementById('reward-shop-btn'),

            // Total score display elements
            totalScoreDisplay: document.getElementById('total-score-display'),

            // Game Over Modal Elements
            gameOverModal: document.getElementById('game-over-modal'),
            finalScore: document.getElementById('final-score'),
            finalAccuracy: document.getElementById('final-accuracy'),
            finalQuestions: document.getElementById('final-questions'),
            gameOverCoins: document.getElementById('game-over-coins'), // New
            buyTimeBtn: document.getElementById('buy-time-btn'),       // New
            gameOverFeedback: document.getElementById('game-over-feedback'), // New
            leaderboardList: document.getElementById('leaderboard-list'),
            modalPlayAgain: document.getElementById('modal-play-again'),
            modalMenu: document.getElementById('modal-menu'),

            // Points popup elements  
            // Score and Coin popups
            scorePopup: document.getElementById('score-popup'),
            scorePopupText: document.getElementById('score-popup-text'),
            coinPopup: document.getElementById('coin-popup'),
            coinPopupText: document.getElementById('coin-popup-text')
        };
    }

    validateElements() {
        const requiredElements = [
            'gameContainer', 'questionTitle', 'options', 'badge', 'stars',
            'timer', 'points', 'clockStatus', 'startMenu', 'startGameBtn'
        ];

        const optionalElements = [
            'settingsBtn', 'settingsModal', 'saveSettingsBtn', 'resetSettingsBtn', 'soundToggle'
        ];

        const missingElements = requiredElements
            .filter(key => !this.elements[key])
            .map(key => key);

        // Debug: Log all elements found
        GameUtils.log('DOM Elements found:');
        Object.entries(this.elements).forEach(([key, element]) => {
            GameUtils.log(`  ${key}: ${element ? 'FOUND' : 'MISSING'}`);
        });

        // Validate optional settings elements
        if (GAME_CONFIG.DEBUG) {
            GameUtils.log('Settings buttons check:');
            GameUtils.log(`  Save button (save-settings): ${document.getElementById('save-settings') ? 'FOUND' : 'MISSING'}`);
            GameUtils.log(`  Reset button (reset-settings): ${document.getElementById('reset-settings') ? 'FOUND' : 'MISSING'}`);
        }

        if (missingElements.length > 0) {
            GameUtils.error('Missing DOM elements:', missingElements);
            return false;
        }
        return true;
    }

    get(elementKey) {
        return this.elements[elementKey];
    }

    safeUpdate(elementKey, updateFn) {
        const element = this.get(elementKey);
        if (element && typeof updateFn === 'function') {
            try {
                updateFn(element);
            } catch (error) {
                GameUtils.error(`Error updating element ${elementKey}:`, error);
            }
        } else {
            if (!element) {
                GameUtils.warn(`Element ${elementKey} not available for update`);
            }
            if (typeof updateFn !== 'function') {
                GameUtils.error(`Update function for ${elementKey} is not a function`);
            }
        }
    }

    showStartMenu() {
        this.safeUpdate('startMenu', el => {
            el.classList.remove('hidden');
            el.classList.add('visible');
        });
        this.safeUpdate('gameContainer', el => {
            el.classList.add('hidden');
            el.classList.remove('visible');
        });
    }

    hideStartMenu() {
        this.safeUpdate('startMenu', el => {
            el.classList.add('hidden');
            el.classList.remove('visible');
        });
        this.safeUpdate('gameContainer', el => {
            el.classList.remove('hidden');
            el.classList.add('visible');
        });
    }

    showInstructionsModal() {
        this.safeUpdate('instructionsModal', el => {
            el.classList.remove('hidden');
            el.classList.add('visible');
        });
    }

    hideInstructionsModal() {
        this.safeUpdate('instructionsModal', el => {
            el.classList.add('hidden');
            el.classList.remove('visible');
        });
    }

    showSettingsModal() {
        this.safeUpdate('settingsModal', el => {
            el.classList.remove('hidden');
            el.classList.add('visible');
        });
    }

    hideSettingsModal() {
        this.safeUpdate('settingsModal', el => {
            el.classList.add('hidden');
            el.classList.remove('visible');
        });
    }

    updateSettingsDisplay(settings) {
        this.safeUpdate('timeMultiplierSlider', el => el.value = settings.timeMultiplier);
        this.safeUpdate('timeMultiplierValue', el => el.textContent = `${settings.timeMultiplier} minutes`);
        this.safeUpdate('starCountSlider', el => el.value = settings.starCount);
        this.safeUpdate('starCountValue', el => el.textContent = settings.starCount.toString());
        this.safeUpdate('soundToggle', el => el.checked = settings.soundEnabled);

        // Update preview
        const level1Time = settings.timeMultiplier * 60; // Direct time in seconds
        const minutes = Math.floor(level1Time / 60);
        const seconds = level1Time % 60;
        this.safeUpdate('previewTime', el => el.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`);
        this.safeUpdate('previewLives', el => el.textContent = '★'.repeat(settings.starCount));

        GameUtils.log(`Settings preview updated: ${settings.starCount} lives, ${minutes}:${seconds.toString().padStart(2, '0')} time`);
    }

    showLevelTransitionModal() {
        this.safeUpdate('levelTransitionModal', el => {
            el.classList.remove('hidden');
            el.classList.add('visible');
        });
    }

    hideLevelTransitionModal() {
        this.safeUpdate('levelTransitionModal', el => {
            el.classList.add('hidden');
            el.classList.remove('visible');
        });
    }

    updateLevelTransitionContent(currentLevel, nextLevel, gameState) {
        // Update title
        this.safeUpdate('levelTransitionTitle', el => el.textContent = `Level ${nextLevel.id} Unlocked!`);

        // Update celebration text
        this.safeUpdate('levelCelebrationText', el =>
            el.textContent = `Amazing! You've mastered Level ${currentLevel.id} and unlocked the next challenge!`);

        // Update next level name
        this.safeUpdate('nextLevelName', el => el.textContent = `Level ${nextLevel.id}: ${nextLevel.name}`);

        // Update challenge text
        const challengeTexts = {
            2: "Now you'll learn half past times (30 minutes)",
            3: "Quarter past (15 min) and quarter to (45 min) added",
            4: "Five-minute intervals for precise time reading",
            5: "Every single minute - the ultimate challenge!",
            6: "AM/PM times added for real-world practice",
            7: "Seconds precision - master every detail!"
        };
        this.safeUpdate('levelChallengeText', el =>
            el.textContent = challengeTexts[nextLevel.id] || "New time formats to master");

        // Update time limit
        const minutes = Math.floor(nextLevel.timeLimit / 60);
        const seconds = nextLevel.timeLimit % 60;
        this.safeUpdate('levelTimeLimit', el =>
            el.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`);

        // Update tip
        const tips = {
            2: "Half past means 30 minutes past the hour (e.g., 3:30)",
            3: "Quarter past = 15 min, Quarter to = 45 min",
            4: "Focus on 5-minute marks: :05, :10, :15, :20, etc.",
            5: "Every minute counts - use the minute marks carefully",
            6: "Morning (AM) vs Afternoon/Evening (PM) times",
            7: "Watch the thin orange seconds hand for precision!"
        };
        this.safeUpdate('levelTip', el =>
            el.textContent = tips[nextLevel.id] || "Take your time and read carefully");

        // Update scoring breakdown
        this.updateScoringBreakdown(nextLevel);
    }

    updateScoringBreakdown(level) {
        const scoringContainer = this.get('scoringBreakdown');
        if (!scoringContainer) return;

        scoringContainer.innerHTML = '';

        if (level.scoring.all) {
            // Level 7 has flat rate
            const item = document.createElement('div');
            item.className = 'scoring-item';
            item.innerHTML = `
                <span class="scoring-label">All Correct Answers</span>
                <span class="scoring-points">+${level.scoring.all} pts</span>
            `;
            scoringContainer.appendChild(item);
        } else {
            // Other levels have format-specific scoring
            Object.entries(level.scoring).forEach(([format, points]) => {
                const item = document.createElement('div');
                item.className = 'scoring-item';

                const formatNames = {
                    'o\'clock': "O'Clock Times",
                    'half_past': "Half Past Times",
                    'quarter_hours': "Quarter Hours",
                    'five_minutes': "5-Minute Times",
                    'full_minutes': "Any Minute"
                };

                item.innerHTML = `
                    <span class="scoring-label">${formatNames[format] || format}</span>
                    <span class="scoring-points">+${points} pts</span>
                `;
                scoringContainer.appendChild(item);
            });
        }
    }

    updateBadge(text) {
        this.safeUpdate('badge', el => el.textContent = text);
    }

    updateStars(starCount, maxStars = null) {
        // Use the actual max stars from settings or fall back to config
        const actualMaxStars = maxStars || GAME_CONFIG.MAX_STARS;
        const starText = '★'.repeat(starCount) + '☆'.repeat(actualMaxStars - starCount);
        this.safeUpdate('stars', el => el.textContent = starText);
        GameUtils.log(`Updated stars display: ${starCount}/${actualMaxStars} (${starText})`);
    }

    updateQuestionTitle(text) {
        this.safeUpdate('questionTitle', el => el.textContent = text);
    }

    updateTimer(minutes, seconds) {
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.safeUpdate('timer', el => el.textContent = formattedTime);
    }

    updatePoints(points) {
        this.safeUpdate('points', el => el.textContent = `${points} points`);
    }

    updateTotalScoreDisplay(points) {
        this.safeUpdate('totalScoreDisplay', el => el.textContent = points.toString());
    }

    showPointsPopup(points, coins = 0) {
        // Show Score Popup
        const scorePopup = this.get('scorePopup');
        const scorePopupText = this.get('scorePopupText');
        const pointsElement = this.get('points'); // Target to position near (stats panel)

        if (scorePopup && scorePopupText && pointsElement) {
            scorePopupText.textContent = `+${points}`;
            scorePopup.classList.remove('hidden'); // Ensure visible for measurement
            this.positionPopupNearElement(scorePopup, pointsElement);
            this.animatePopup(scorePopup);
        }

        // Show Coin Popup (if coins earned)
        if (coins > 0) {
            const coinPopup = this.get('coinPopup');
            const coinPopupText = this.get('coinPopupText');
            // Try desktop coin display first, then mobile
            const coinElement = document.getElementById('clockcoin-amount') || document.getElementById('mobile-clockcoin-amount');

            if (coinPopup && coinPopupText && coinElement) {
                // Ensure coin popup text includes the specific amount
                coinPopupText.textContent = `+${coins} 🪙`;
                coinPopup.classList.remove('hidden'); // Ensure visible for measurement
                this.positionPopupNearElement(coinPopup, coinElement);

                // Slight delay for cinematic feel
                setTimeout(() => {
                    this.animatePopup(coinPopup);
                }, 200);
            }
        }
    }

    positionPopupNearElement(popup, targetElement) {
        const rect = targetElement.getBoundingClientRect();
        // Center the popup on the target element
        const top = rect.top + (rect.height / 2) - (popup.offsetHeight / 2);
        const left = rect.left + (rect.width / 2) - (popup.offsetWidth / 2);

        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;
    }

    animatePopup(popup) {
        popup.classList.remove('show', 'hidden');
        popup.offsetHeight; // Force reflow
        popup.classList.add('show');

        setTimeout(() => {
            popup.classList.remove('show');
            popup.classList.add('hidden');
        }, 1500);

    }

    updateClockStatus(text) {
        this.safeUpdate('clockStatus', el => el.textContent = text);

        // Add randomness debugging info in debug mode
        if (GAME_CONFIG.DEBUG && window.analogClockGame) {
            const stats = window.analogClockGame.gameState?.getRandomnessStats();
            if (stats) {
                const debugInfo = ` (Q:${stats.sessionQuestionsCount})`;
                this.safeUpdate('clockStatus', el => {
                    if (!el.textContent.includes('(Q:')) {
                        el.textContent += debugInfo;
                    }
                });
            }
        }
    }

    updateClockStatusWithLevel(gameState) {
        if (gameState && gameState.isGameActive) {
            const level = gameState.getCurrentLevel();
            this.updateClockStatus(`Level ${level.id}: ${level.name}`);
        } else {
            this.updateClockStatus('Welcome! 🕐');
        }
    }

    showAMPMPanel() {
        this.safeUpdate('ampmPanel', el => {
            el.classList.remove('hidden');
            el.classList.add('visible');
        });
    }

    hideAMPMPanel() {
        this.safeUpdate('ampmPanel', el => {
            el.classList.add('hidden');
            el.classList.remove('visible');
        });
    }

    updateAMPMIndicator(isAM) {
        this.safeUpdate('ampmIndicator', el => {
            el.textContent = isAM ? 'Morning' : 'Afternoon';
        });
    }

    showSecondsHand() {
        const secondsHand = document.getElementById('seconds-hand');
        if (secondsHand) {
            secondsHand.classList.add('visible');
        }
    }

    hideSecondsHand() {
        const secondsHand = document.getElementById('seconds-hand');
        if (secondsHand) {
            secondsHand.classList.remove('visible');
        }
    }

    clearOptions() {
        this.safeUpdate('options', el => el.innerHTML = '');
    }

    addOption(text, onClick, className = null) {
        const optionsContainer = this.get('options');
        GameUtils.log(`Adding option: "${text}"`);
        GameUtils.log('Options container:', optionsContainer);

        if (!optionsContainer) {
            GameUtils.error('Options container not found!');
            return;
        }

        // Mobile device logging
        if (window.innerWidth <= 600) {
            GameUtils.log(`Mobile: Adding option "${text}"`);
        }

        const option = document.createElement('div');
        option.className = className ? `option ${className}` : 'option';
        option.textContent = text;
        option.setAttribute('tabindex', '0');
        option.setAttribute('role', 'button');
        option.setAttribute('aria-label', `Time option: ${text}`);

        // Mobile-specific attributes
        option.setAttribute('data-mobile-option', 'true');
        option.style.touchAction = 'manipulation';
        option.style.webkitTapHighlightColor = 'rgba(255, 255, 255, 0.2)';

        // Mobile styling optimizations
        if (window.innerWidth <= 600) {
            option.style.touchAction = 'manipulation';
            option.style.userSelect = 'none';
        }

        const handleClick = (e) => {
            e.preventDefault();
            if (onClick) {
                // Add haptic feedback for mobile devices
                if (navigator.vibrate && window.innerWidth <= 600) {
                    navigator.vibrate(50);
                }
                onClick();
            }
        };

        // Event handling for all devices
        option.addEventListener('click', handleClick);
        option.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(e);
            }
        });

        optionsContainer.appendChild(option);
        GameUtils.log(`Option "${text}" added successfully`);

        // Mobile verification
        if (window.innerWidth <= 600) {
            setTimeout(() => {
                const addedOption = optionsContainer.querySelector(`[aria-label="Time option: ${text}"]`);
                if (!addedOption) {
                    this.createMobileDebugInfo(`Option "${text}" missing from DOM`);
                }
            }, 100);
        }
    }

    // Mobile debug and emergency fallback system
    showGameOverModal(stats, leaderboard, currentCoins, onPlayAgain, onMenu, onBuyTime) {
        GameUtils.log('Trying to show Game Over Modal...');
        try {
            const modal = this.get('gameOverModal');
            if (!modal) {
                GameUtils.error('CRITICAL: Game Over Modal element NOT FOUND in DOM!');
                return;
            }

            // Force high z-index and visibility
            modal.style.zIndex = '10000';
            modal.classList.remove('hidden');
            modal.style.display = 'flex'; // Verify display property

            GameUtils.log('Game Over Modal visibility set to flex/visible');

            // Function to animate numbers
            const animateValue = (element, start, end, duration) => {
                if (!element) return;
                let startTimestamp = null;
                const step = (timestamp) => {
                    if (!startTimestamp) startTimestamp = timestamp;
                    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                    // Ease out quart
                    const easeValue = 1 - Math.pow(1 - progress, 4);
                    element.textContent = Math.floor(progress * (end - start) + start).toLocaleString();
                    if (progress < 1) {
                        window.requestAnimationFrame(step);
                    } else {
                        element.textContent = end.toLocaleString() + (element.id === 'final-accuracy' ? '%' : '');
                    }
                };
                window.requestAnimationFrame(step);
            };

            // Update stats with animation
            const scoreEl = this.get('finalScore');
            const accuracyEl = this.get('finalAccuracy');
            const questionsEl = this.get('finalQuestions');
            const coinsEl = this.get('gameOverCoins');

            GameUtils.log(`Updating stats: Score=${stats.score}, Accuracy=${stats.accuracy}`);

            if (scoreEl) animateValue(scoreEl, 0, stats.score || 0, 1500);
            if (accuracyEl) {
                accuracyEl.textContent = (stats.accuracy || 0) + '%';
            }
            if (questionsEl) questionsEl.textContent = stats.questions || 0;
            if (coinsEl) coinsEl.textContent = currentCoins || 0;

            // Setup Buy Time Button
            const buyTimeBtn = this.get('buyTimeBtn');
            const feedbackEl = this.get('gameOverFeedback');
            const TIME_COST = 10; // Cost for 1 minute

            if (buyTimeBtn) {
                // Remove old listeners
                const newBuyBtn = buyTimeBtn.cloneNode(true);
                buyTimeBtn.parentNode.replaceChild(newBuyBtn, buyTimeBtn);
                this.elements.buyTimeBtn = newBuyBtn;

                // Check affordability
                if (currentCoins < TIME_COST) {
                    newBuyBtn.classList.add('disabled');
                    newBuyBtn.title = "Not enough coins!";
                } else {
                    newBuyBtn.classList.remove('disabled');
                    newBuyBtn.title = "Buy 1 Minute";
                    newBuyBtn.addEventListener('click', () => {
                        if (onBuyTime) {
                            onBuyTime(TIME_COST, feedbackEl);
                        }
                    });
                }
            }

            // Populate Leaderboard
            const listEl = this.get('leaderboardList');
            if (listEl) {
                listEl.innerHTML = '';
                // Pad leaderboard if less than 3
                const displayBoard = Array.isArray(leaderboard) ? [...leaderboard] : [];

                // Safety: Ensure valid objects
                while (displayBoard.length < 3) {
                    displayBoard.push({ score: '-', date: '-' });
                }

                displayBoard.slice(0, 3).forEach((entry, index) => {
                    if (!entry) return;
                    const item = document.createElement('div');
                    item.className = 'leaderboard-item';

                    // Add staggered animation
                    item.style.animation = `fadeInUp 0.5s ease-out ${index * 0.1 + 0.5}s forwards`;
                    item.style.opacity = '0'; // Start invisible

                    const scoreDisplay = (entry.score === '-' || entry.score === undefined) ? '-' : parseInt(entry.score).toLocaleString();
                    const dateDisplay = entry.date || '-';

                    item.innerHTML = `
                        <div style="display: flex; align-items: center;">
                            <span class="leaderboard-rank rank-${index + 1}">${index + 1}</span>
                            <span class="leaderboard-date">${dateDisplay}</span>
                        </div>
                        <span class="leaderboard-score">${scoreDisplay}</span>
                    `;
                    listEl.appendChild(item);
                });
            } else {
                GameUtils.warn('Leaderboard list element not found');
            }

            // Add button listeners (remove old ones first or clone)
            const playAgainBtn = this.get('modalPlayAgain');
            const menuBtn = this.get('modalMenu');

            if (playAgainBtn && menuBtn) {
                // Clone to clear listeners
                const newPlayAgain = playAgainBtn.cloneNode(true);
                const newMenu = menuBtn.cloneNode(true);

                playAgainBtn.parentNode.replaceChild(newPlayAgain, playAgainBtn);
                menuBtn.parentNode.replaceChild(newMenu, menuBtn);

                // Update cache
                this.elements.modalPlayAgain = newPlayAgain;
                this.elements.modalMenu = newMenu;

                newPlayAgain.addEventListener('click', () => {
                    modal.classList.add('hidden');
                    modal.style.display = ''; // Reset inline display
                    if (onPlayAgain) onPlayAgain();
                });

                newMenu.addEventListener('click', () => {
                    modal.classList.add('hidden');
                    modal.style.display = ''; // Reset inline display
                    if (onMenu) onMenu();
                });
            } else {
                GameUtils.error('Game Over buttons not found!');
            }

        } catch (error) {
            GameUtils.error('Error showing Game Over Modal:', error);
            // Fallback: If modal fails, use alert or simple log so user isn't stuck
            alert(`Game Over! Score: ${stats.score}`);
            if (onMenu) onMenu();
        }
    }

    createMobileDebugInfo(message) {
        // DISABLED: Mobile debug panel removed to prevent UI interference on phone consoles
        // if (window.innerWidth > 600) return;
        // 
        // let debugInfo = document.querySelector('.mobile-debug-info');
        // if (!debugInfo) {
        //     debugInfo = document.createElement('div');
        //     debugInfo.className = 'mobile-debug-info';
        //     document.body.appendChild(debugInfo);
        // }
        // 
        // const timestamp = new Date().toLocaleTimeString();
        // debugInfo.innerHTML = `
        //     <strong>Mobile Debug</strong><br>
        //     ${timestamp}<br>
        //     ${message}<br>
        //     Screen: ${window.innerWidth}×${window.innerHeight}<br>
        //     Options: ${document.querySelectorAll('#options .option').length}
        // `;

        // Only log to console instead of showing UI panel
        if (window.innerWidth <= 600 && GAME_CONFIG.DEBUG) {
            GameUtils.log(`📱 Mobile Debug: ${message} (Screen: ${window.innerWidth}×${window.innerHeight})`);
        }
    }

    activateMobileEmergencyFallback() {
        if (window.innerWidth > 600) return;

        GameUtils.log('Activating mobile emergency fallback');
        document.body.classList.add('mobile-emergency-fallback');

        // Clean up any existing mobile debug panels
        this.cleanupMobileDebugPanels();

        // Log to console instead of showing UI panel
        GameUtils.log('📱 Mobile emergency fallback activated');
    }

    // Clean up any existing mobile debug panels
    cleanupMobileDebugPanels() {
        const existingDebugPanels = document.querySelectorAll('.mobile-debug-info');
        existingDebugPanels.forEach(panel => {
            if (panel.parentNode) {
                panel.parentNode.removeChild(panel);
                GameUtils.log('📱 Removed existing mobile debug panel');
            }
        });
    }

    // ✨ ANTI-RAPID-CLICK SYSTEM: Disable all options to prevent multiple clicks
    disableAllOptions() {
        this.safeUpdate('options', el => {
            const options = el.querySelectorAll('.option');
            options.forEach(option => {
                // Add disabled class for styling
                option.classList.add('disabled');
                option.setAttribute('aria-disabled', 'true');

                // Completely prevent any interaction
                option.style.pointerEvents = 'none';
                option.style.opacity = '0.6';
                option.style.cursor = 'not-allowed';

                // Add visual feedback that option is disabled
                option.style.backgroundColor = 'rgba(128, 128, 128, 0.3)';
                option.style.color = '#888';

                GameUtils.log(`🔒 Disabled option: "${option.textContent}"`);
            });

            GameUtils.log(`🔒 All ${options.length} options disabled to prevent rapid clicking`);
        });
    }

    // ✨ UTILITY: Enable all options (used when new question is generated)
    enableAllOptions() {
        this.safeUpdate('options', el => {
            const options = el.querySelectorAll('.option');
            options.forEach(option => {
                // Remove disabled class and attributes
                option.classList.remove('disabled');
                option.removeAttribute('aria-disabled');

                // Restore interaction capability
                option.style.pointerEvents = '';
                option.style.opacity = '';
                option.style.cursor = '';

                // Restore original styling
                option.style.backgroundColor = '';
                option.style.color = '';

                GameUtils.log(`🔓 Enabled option: "${option.textContent}"`);
            });

            GameUtils.log(`🔓 All ${options.length} options enabled and ready for interaction`);
        });
    }
}

/* =============================================
   PERFECT SVG CLOCK BUILDER
   ============================================= */
class PerfectClockBuilder {
    constructor() {
        this.svg = document.getElementById('analog-clock');
        this.hourHand = null;
        this.minuteHand = null;

        if (!GameUtils.validateElement(this.svg, 'analog-clock')) {
            return;
        }

        this.initializeHands();
        this.buildClockElements();

        // Ensure font consistency after a short delay (allows DOM to settle)
        setTimeout(() => {
            this.ensureConsistentFonts();
        }, 100);
    }

    initializeHands() {
        // Get fresh references from DOM
        this.hourHand = document.getElementById('hour-hand');
        this.minuteHand = document.getElementById('minute-hand');
        this.secondsHand = document.getElementById('seconds-hand');

        GameUtils.log('Initializing clock hands...');
        GameUtils.log(`Found hour hand: ${this.hourHand ? 'YES' : 'NO'}`);
        GameUtils.log(`Found minute hand: ${this.minuteHand ? 'YES' : 'NO'}`);
        GameUtils.log(`Found seconds hand: ${this.secondsHand ? 'YES' : 'NO'}`);

        if (!this.hourHand || !this.minuteHand || !this.secondsHand) {
            GameUtils.error('Failed to find clock hands in DOM');
            return false;
        }

        // CRITICAL: Ensure no transitions interfere with hand positioning
        this.hourHand.style.transition = 'none';
        this.minuteHand.style.transition = 'none';
        this.secondsHand.style.transition = 'none';

        // Force visibility for hour and minute hands
        this.hourHand.style.opacity = '1';
        this.hourHand.style.visibility = 'visible';

        this.minuteHand.style.opacity = '1';
        this.minuteHand.style.visibility = 'visible';

        // Seconds hand starts hidden (only visible in Level 7)
        this.secondsHand.style.opacity = '0';
        this.secondsHand.style.visibility = 'visible';

        GameUtils.log('Clock hands initialized successfully');
        return true;
    }

    buildClockElements() {
        this.createHourMarks();
        this.createMinuteMarks();
        this.createNumbers();
        this.ensureConsistentFonts();
    }

    createHourMarks() {
        const hourMarksGroup = document.getElementById('hour-marks');
        if (!hourMarksGroup) return;

        hourMarksGroup.innerHTML = '';

        for (let i = 0; i < 12; i++) {
            const angle = (i * 30) - 90; // Start from 12 o'clock
            const isQuarterHour = i % 3 === 0;

            const mark = this.createSVGElement('line', {
                ...this.calculateMarkPosition(angle, isQuarterHour ? 32 : 20),  // Increased mark lengths
                stroke: isQuarterHour ? VISUAL_CONFIG.COLORS.SPECIAL_NUMBERS : VISUAL_CONFIG.COLORS.HOUR_MARKS,
                'stroke-width': isQuarterHour ? 8 : 5,  // Increased stroke widths
                'stroke-linecap': 'round'
            });

            hourMarksGroup.appendChild(mark);
        }
    }

    createMinuteMarks() {
        const minuteMarksGroup = document.getElementById('minute-marks');
        if (!minuteMarksGroup) return;

        minuteMarksGroup.innerHTML = '';

        for (let i = 0; i < 60; i++) {
            if (i % 5 === 0) continue; // Skip hour mark positions

            const angle = (i * 6) - 90; // Start from 12 o'clock
            const mark = this.createSVGElement('line', {
                ...this.calculateMarkPosition(angle, 15),  // Increased minute mark length
                stroke: VISUAL_CONFIG.COLORS.MINUTE_MARKS,
                'stroke-width': '4',  // Increased stroke width
                'stroke-linecap': 'round',
                opacity: '0.8'
            });

            minuteMarksGroup.appendChild(mark);
        }
    }

    calculateMarkPosition(angle, markLength) {
        const radius = VISUAL_CONFIG.CLOCK_RADIUS - 10;
        const x1 = VISUAL_CONFIG.CENTER_X + (radius - markLength) * Math.cos(angle * Math.PI / 180);
        const y1 = VISUAL_CONFIG.CENTER_Y + (radius - markLength) * Math.sin(angle * Math.PI / 180);
        const x2 = VISUAL_CONFIG.CENTER_X + radius * Math.cos(angle * Math.PI / 180);
        const y2 = VISUAL_CONFIG.CENTER_Y + radius * Math.sin(angle * Math.PI / 180);

        return { x1, y1, x2, y2 };
    }

    createNumbers() {
        const numbersGroup = document.getElementById('clock-numbers');
        if (!numbersGroup) return;

        numbersGroup.innerHTML = '';

        for (let i = 1; i <= 12; i++) {
            const angle = (i * 30) - 90; // Start from 12 o'clock
            const radius = VISUAL_CONFIG.CLOCK_RADIUS - 65;
            const isSpecial = [12, 3, 6, 9].includes(i);

            const x = VISUAL_CONFIG.CENTER_X + radius * Math.cos(angle * Math.PI / 180);
            const y = VISUAL_CONFIG.CENTER_Y + radius * Math.sin(angle * Math.PI / 180);

            const text = this.createSVGElement('text', {
                x, y,
                'text-anchor': 'middle',
                'dominant-baseline': 'central',
                'font-family': "'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', 'Trebuchet MS', 'Verdana', 'Arial Black', cursive, sans-serif",
                'font-size': isSpecial ? '40' : '35',  // Increased from 32/28
                'font-weight': 'bold',
                fill: isSpecial ? VISUAL_CONFIG.COLORS.SPECIAL_NUMBERS : VISUAL_CONFIG.COLORS.NUMBERS,
                stroke: '#FFFFFF',
                'stroke-width': '0.6'  // Slightly increased stroke
            });

            text.textContent = i;
            numbersGroup.appendChild(text);
        }
    }

    // Ensure consistent font rendering across all platforms
    ensureConsistentFonts() {
        const numbersGroup = document.getElementById('clock-numbers');
        if (!numbersGroup) return;

        // Define the consistent font stack
        const consistentFontStack = "'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', 'Trebuchet MS', 'Verdana', 'Arial Black', cursive, sans-serif";

        // Apply to the group element
        numbersGroup.style.fontFamily = consistentFontStack;
        numbersGroup.style.fontWeight = 'bold';

        // Apply to all text elements within the group
        const textElements = numbersGroup.querySelectorAll('text');
        textElements.forEach(text => {
            text.setAttribute('font-family', consistentFontStack);
            text.style.fontFamily = consistentFontStack;
            text.style.fontWeight = 'bold';
            text.style.webkitFontSmoothing = 'antialiased';
            text.style.mozOsxFontSmoothing = 'grayscale';
        });

        GameUtils.log('✅ Clock font consistency applied across all platforms');
    }

    createSVGElement(tagName, attributes) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    }

    updateClockHands(hours, minutes, seconds = 0) {
        // Always get fresh references from DOM
        this.hourHand = document.getElementById('hour-hand');
        this.minuteHand = document.getElementById('minute-hand');
        this.secondsHand = document.getElementById('seconds-hand');

        if (!this.hourHand || !this.minuteHand || !this.secondsHand) {
            GameUtils.error('Clock hands missing from DOM!');
            GameUtils.error(`Hour hand: ${this.hourHand ? 'FOUND' : 'MISSING'}`);
            GameUtils.error(`Minute hand: ${this.minuteHand ? 'FOUND' : 'MISSING'}`);
            GameUtils.error(`Seconds hand: ${this.secondsHand ? 'FOUND' : 'MISSING'}`);
            return false;
        }

        // Validate input parameters
        if (typeof hours !== 'number' || typeof minutes !== 'number' || typeof seconds !== 'number') {
            GameUtils.error('Invalid time parameters:', { hours, minutes, seconds });
            return false;
        }

        // Normalize time values
        hours = Math.max(0, Math.min(24, Math.floor(hours)));
        minutes = Math.max(0, Math.min(59, Math.floor(minutes)));
        seconds = Math.max(0, Math.min(59, Math.floor(seconds)));

        // Calculate precise angles
        const normalizedHours = hours % 12;
        const hourAngle = (normalizedHours * 30) + (minutes * 0.5) + (seconds * 0.00833) - 90; // Hour hand moves gradually with minutes and seconds
        const minuteAngle = (minutes * 6) + (seconds * 0.1) - 90; // Minute hand moves gradually with seconds
        const secondsAngle = seconds * 6 - 90; // Seconds hand: each second = 6 degrees

        GameUtils.log(`Updating clock to ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        GameUtils.log(`Hour angle: ${hourAngle + 90}°, Minute angle: ${minuteAngle + 90}°, Seconds angle: ${secondsAngle + 90}°`);

        // Update all hands using the same line-based approach
        this.updateHourHand(hourAngle);
        this.updateMinuteHand(minuteAngle);
        this.updateSecondsHand(secondsAngle);

        GameUtils.log('Clock hands updated successfully');
        return true;
    }

    updateHourHand(angle) {
        if (!this.hourHand) {
            GameUtils.error('Hour hand not available for update');
            return;
        }

        try {
            const length = VISUAL_CONFIG.HOUR_HAND_LENGTH;
            const x = VISUAL_CONFIG.CENTER_X + length * Math.cos(angle * Math.PI / 180);
            const y = VISUAL_CONFIG.CENTER_Y + length * Math.sin(angle * Math.PI / 180);

            this.hourHand.setAttribute('x1', VISUAL_CONFIG.CENTER_X);
            this.hourHand.setAttribute('y1', VISUAL_CONFIG.CENTER_Y);
            this.hourHand.setAttribute('x2', Math.round(x));
            this.hourHand.setAttribute('y2', Math.round(y));
        } catch (error) {
            GameUtils.error('Error updating hour hand:', error);
        }
    }

    updateMinuteHand(angle) {
        if (!this.minuteHand) {
            GameUtils.error('Minute hand not available for update');
            return;
        }

        try {
            const length = VISUAL_CONFIG.MINUTE_HAND_LENGTH;
            const x = VISUAL_CONFIG.CENTER_X + length * Math.cos(angle * Math.PI / 180);
            const y = VISUAL_CONFIG.CENTER_Y + length * Math.sin(angle * Math.PI / 180);

            this.minuteHand.setAttribute('x1', VISUAL_CONFIG.CENTER_X);
            this.minuteHand.setAttribute('y1', VISUAL_CONFIG.CENTER_Y);
            this.minuteHand.setAttribute('x2', Math.round(x));
            this.minuteHand.setAttribute('y2', Math.round(y));

            GameUtils.log(`Minute hand updated to angle: ${angle + 90}°`);
        } catch (error) {
            GameUtils.error('Error updating minute hand:', error);
        }
    }

    updateSecondsHand(angle) {
        if (!this.secondsHand) {
            GameUtils.error('Seconds hand not available for update');
            return;
        }

        try {
            const length = VISUAL_CONFIG.SECONDS_HAND_LENGTH;
            const x = VISUAL_CONFIG.CENTER_X + length * Math.cos(angle * Math.PI / 180);
            const y = VISUAL_CONFIG.CENTER_Y + length * Math.sin(angle * Math.PI / 180);

            this.secondsHand.setAttribute('x1', VISUAL_CONFIG.CENTER_X);
            this.secondsHand.setAttribute('y1', VISUAL_CONFIG.CENTER_Y);
            this.secondsHand.setAttribute('x2', Math.round(x));
            this.secondsHand.setAttribute('y2', Math.round(y));

            GameUtils.log(`Seconds hand updated to angle: ${angle + 90}°`);
        } catch (error) {
            GameUtils.error('Error updating seconds hand:', error);
        }
    }

    // Method to test hand movements (used for debugging)
    testHandMovements() {
        const testTimes = [
            { h: 12, m: 0 }, { h: 3, m: 15 }, { h: 6, m: 30 }, { h: 9, m: 45 },
            { h: 1, m: 5 }, { h: 4, m: 20 }, { h: 7, m: 35 }, { h: 10, m: 50 }
        ];

        let index = 0;
        const testInterval = setInterval(() => {
            if (index >= testTimes.length) {
                clearInterval(testInterval);
                GameUtils.log('Hand movement test completed');
                this.updateClockHands(12, 0); // Reset to 12:00
                return;
            }

            const time = testTimes[index];
            GameUtils.log(`Testing time: ${time.h}:${time.m.toString().padStart(2, '0')}`);
            this.updateClockHands(time.h, time.m);
            index++;
        }, 1000);
    }

    // LEVEL 7 VALIDATION: Test minute hand accuracy with seconds precision
    validateLevel7MinuteHand() {
        GameUtils.log('🔍 STARTING LEVEL 7 MINUTE HAND VALIDATION');

        const criticalTestCases = [
            // Edge cases with high seconds (should push minute hand closer to next minute)
            { h: 2, m: 15, s: 55, desc: "High seconds - should be very close to 16-minute mark" },
            { h: 4, m: 30, s: 50, desc: "50 seconds - should be 5/6 way to 31-minute mark" },
            { h: 7, m: 45, s: 58, desc: "58 seconds - should be almost at 46-minute mark" },

            // Edge cases with low seconds (should be just past the minute mark)
            { h: 1, m: 20, s: 2, desc: "Low seconds - should be barely past 20-minute mark" },
            { h: 5, m: 35, s: 8, desc: "8 seconds - should be slightly past 35-minute mark" },
            { h: 12, m: 0, s: 5, desc: "5 seconds past 12:00 - minute hand should be slightly off 12" },

            // Mid-range seconds (should be halfway between minute marks)
            { h: 3, m: 10, s: 30, desc: "30 seconds - should be exactly halfway between 10 and 11" },
            { h: 6, m: 55, s: 30, desc: "30 seconds - should be exactly halfway between 55 and 56" },

            // Boundary cases
            { h: 11, m: 59, s: 59, desc: "Almost midnight - minute hand should be almost at 12" },
            { h: 12, m: 0, s: 0, desc: "Exact 12:00:00 - all hands should point to 12" },

            // Random precision tests
            { h: 8, m: 23, s: 17, desc: "Random precision test 1" },
            { h: 9, m: 42, s: 33, desc: "Random precision test 2" }
        ];

        let passedTests = 0;
        let failedTests = 0;

        criticalTestCases.forEach((testCase, index) => {
            const { h, m, s, desc } = testCase;

            GameUtils.log(`\n📋 Test ${index + 1}: ${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} - ${desc}`);

            // Calculate expected minute hand angle
            const expectedMinuteAngle = (m * 6) + (s * 0.1) - 90;
            const expectedDegrees = expectedMinuteAngle + 90; // Convert back to clock degrees

            // Update clock hands
            const success = this.updateClockHands(h, m, s);

            if (!success) {
                GameUtils.error(`❌ FAILED: Could not update clock hands for test ${index + 1}`);
                failedTests++;
                return;
            }

            // Validate SVG coordinates
            const minuteHand = document.getElementById('minute-hand');
            if (!minuteHand) {
                GameUtils.error(`❌ FAILED: Minute hand element not found for test ${index + 1}`);
                failedTests++;
                return;
            }

            // Get actual coordinates
            const actualX = parseFloat(minuteHand.getAttribute('x2'));
            const actualY = parseFloat(minuteHand.getAttribute('y2'));

            // Calculate expected coordinates
            const length = VISUAL_CONFIG.MINUTE_HAND_LENGTH;
            const expectedX = VISUAL_CONFIG.CENTER_X + length * Math.cos(expectedMinuteAngle * Math.PI / 180);
            const expectedY = VISUAL_CONFIG.CENTER_Y + length * Math.sin(expectedMinuteAngle * Math.PI / 180);

            // Account for rounding
            const roundedExpectedX = Math.round(expectedX);
            const roundedExpectedY = Math.round(expectedY);

            // Check accuracy (allow 1 pixel tolerance for rounding)
            const xError = Math.abs(actualX - roundedExpectedX);
            const yError = Math.abs(actualY - roundedExpectedY);
            const maxTolerance = 1;

            const isAccurate = xError <= maxTolerance && yError <= maxTolerance;

            // Calculate minute hand position for human understanding
            const minutePosition = (expectedDegrees / 6); // Convert degrees to minute position
            const wholeMinutes = Math.floor(minutePosition);
            const fractionPastMinute = (minutePosition - wholeMinutes) * 60; // Seconds equivalent

            GameUtils.log(`  📐 Expected angle: ${expectedDegrees.toFixed(2)}° (minute ${wholeMinutes} + ${fractionPastMinute.toFixed(1)}s)`);
            GameUtils.log(`  📍 Expected coords: (${roundedExpectedX}, ${roundedExpectedY})`);
            GameUtils.log(`  📍 Actual coords: (${actualX}, ${actualY})`);
            GameUtils.log(`  📏 Error: X=${xError.toFixed(2)}px, Y=${yError.toFixed(2)}px`);

            if (isAccurate) {
                GameUtils.log(`  ✅ PASSED: Minute hand position is accurate`);
                passedTests++;
            } else {
                GameUtils.error(`  ❌ FAILED: Minute hand position exceeds tolerance`);
                GameUtils.error(`    Expected: (${roundedExpectedX}, ${roundedExpectedY})`);
                GameUtils.error(`    Actual: (${actualX}, ${actualY})`);
                GameUtils.error(`    Error: X=${xError}px, Y=${yError}px (max: ${maxTolerance}px)`);
                failedTests++;
            }

            // Additional validation: Check answer key format
            const level7Config = GAME_CONFIG.LEVELS.find(level => level.id === 7);
            if (level7Config) {
                const timeData = { hours: h, minutes: m, seconds: s, isAM: true };
                const answerKey = this.formatTime ?
                    this.formatTime(timeData, level7Config) :
                    `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} AM`;

                const expectedFormat = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} AM`;

                if (answerKey === expectedFormat) {
                    GameUtils.log(`  ✅ Answer key format correct: "${answerKey}"`);
                } else {
                    GameUtils.error(`  ❌ Answer key format mismatch:`);
                    GameUtils.error(`    Expected: "${expectedFormat}"`);
                    GameUtils.error(`    Actual: "${answerKey}"`);
                    failedTests++;
                }
            }
        });

        // Final validation report
        GameUtils.log(`\n🎯 LEVEL 7 VALIDATION SUMMARY:`);
        GameUtils.log(`✅ Passed tests: ${passedTests}`);
        GameUtils.log(`❌ Failed tests: ${failedTests}`);
        GameUtils.log(`📊 Success rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

        if (failedTests === 0) {
            GameUtils.log(`🏆 ALL TESTS PASSED! Level 7 minute hand accuracy is 100%`);
        } else {
            GameUtils.error(`⚠️  ${failedTests} test(s) failed. Manual inspection recommended.`);
        }

        // Reset clock to neutral position
        this.updateClockHands(12, 0, 0);

        return failedTests === 0;
    }

    // Helper method for external access to formatTime (if not already accessible)
    formatTime(timeData, level) {
        // If this class doesn't have formatTime, reference the game logic's method
        if (window.analogClockGame && window.analogClockGame.gameLogic && window.analogClockGame.gameLogic.formatTime) {
            return window.analogClockGame.gameLogic.formatTime(timeData, level);
        }

        // Fallback implementation
        const { hours, minutes, seconds, isAM } = timeData;
        let timeString = `${hours}:${minutes.toString().padStart(2, '0')}`;

        if (level && level.hasSeconds) {
            timeString += `:${seconds.toString().padStart(2, '0')}`;
        }

        if (level && level.hasAMPM) {
            timeString += ` ${isAM ? 'AM' : 'PM'}`;
        }

        return timeString;
    }
}

/* =============================================
   PERFECT GAME LOGIC
   ============================================= */
class PerfectGameLogic {
    constructor(gameState, domManager, clockBuilder, soundManager = null) {
        this.gameState = gameState;
        this.domManager = domManager;
        this.clockBuilder = clockBuilder;
        this.soundManager = soundManager;
        this.currentCorrectAnswer = null;
        this.initialLevel = 1; // Track starting level for restart

        // ✨ ANTI-RAPID-CLICK SYSTEM: Add processing state to prevent multiple answer submissions
        this.isProcessingAnswer = false;
        this.answerProcessingStartTime = null;
        this.minProcessingDelay = 200; // Minimum delay between answer processing (200ms)
    }

    startGame(startingLevel = 1) {
        GameUtils.log(`Starting game at difficulty level ${startingLevel}...`);

        this.initialLevel = startingLevel; // Save for restart

        // Reset game state with the specified starting level
        this.gameState.reset(startingLevel);

        this.gameState.isGameActive = true;
        this.gameState.isStartMenuVisible = false;
        this.domManager.hideStartMenu();

        // Reset ClockCoins for new game
        if (this.rewardShop) {
            this.rewardShop.resetClockCoins();
        }

        GameUtils.log('Start menu hidden, game container should be visible');

        this.updateAllDisplays();
        this.generateQuestion();
        // Initialize the global timer for the new game
        this.startTimer(true);
        this.domManager.updateClockStatusWithLevel(this.gameState);

        GameUtils.log(`Game started successfully at level ${startingLevel} - question should be generated`);
    }

    generateQuestion() {
        if (!this.gameState.isGameActive) return;

        // ✨ UNLOCK: Reset processing state when generating new question
        this.isProcessingAnswer = false;
        this.answerProcessingStartTime = null;

        const level = this.gameState.getCurrentLevel();
        this.domManager.clearOptions();

        const newTime = this.generateUniqueTime(level);
        this.gameState.currentTime = newTime;
        this.gameState.currentTimeFormat = newTime.timeFormat;
        this.gameState.isAM = newTime.isAM;

        GameUtils.log(`Generated time: ${newTime.hours}:${newTime.minutes.toString().padStart(2, '0')}:${newTime.seconds.toString().padStart(2, '0')} ${newTime.isAM ? 'AM' : 'PM'} (${newTime.timeFormat})`);

        // Update level-specific UI elements
        this.updateLevelSpecificUI(level);

        // FIRST: Update clock display to show the correct time
        this.updateClockDisplay();

        // THEN: Update question title
        this.domManager.updateQuestionTitle("What time is it?");

        // FINALLY: Generate options that match the clock time (options will be enabled)
        this.generateOptions(newTime);

        GameUtils.log(`Clock should now show ${newTime.hours}:${newTime.minutes.toString().padStart(2, '0')}:${newTime.seconds.toString().padStart(2, '0')}`);
        GameUtils.log(`🔓 New question generated - options are now clickable`);
    }

    updateLevelSpecificUI(level) {
        // Show/hide AM/PM panel for levels 6+
        if (level.hasAMPM) {
            this.domManager.showAMPMPanel();
            this.domManager.updateAMPMIndicator(this.gameState.isAM);
        } else {
            this.domManager.hideAMPMPanel();
        }

        // Show/hide seconds hand for level 7
        if (level.hasSeconds) {
            this.domManager.showSecondsHand();
        } else {
            this.domManager.hideSecondsHand();
        }
    }

    generateUniqueTime(level) {
        const maxAttempts = 200; // Increased from 100 for better coverage
        let attempts = 0;
        const randomnessManager = this.gameState.randomnessManager;

        // Check if we should refresh the pool for this level
        if (randomnessManager.shouldRefreshPool(level.id, level)) {
            GameUtils.log(`Refreshing time pool for level ${level.id} - 80% exhausted`);
            randomnessManager.clearLevelProgress(level.id);
        }

        while (attempts < maxAttempts) {
            const time = this.generateEnhancedRandomTimeForLevel(level);
            const timeKey = randomnessManager.generateUniqueTimeKey(
                time.hours, time.minutes, time.seconds, time.isAM, level.hasAMPM, level.hasSeconds
            );

            // Check for uniqueness and pattern avoidance
            const isSessionUnique = !randomnessManager.isTimeUsedInSession(timeKey);
            const avoidsPatterns = randomnessManager.avoidRecentPatterns(time);

            if (isSessionUnique && avoidsPatterns) {
                // Mark time as used with comprehensive tracking
                randomnessManager.markTimeAsUsed(level.id, timeKey, time);

                // Update legacy tracking for compatibility
                this.gameState.currentLevelUsedTimes.add(timeKey);
                this.gameState.usedTimes.add(timeKey);

                GameUtils.log(`Generated unique time: ${timeKey} (attempt ${attempts + 1}/${maxAttempts})`);
                return time;
            }

            attempts++;
        }

        // Enhanced fallback strategy
        GameUtils.warn(`Could not generate unique time after ${maxAttempts} attempts - using smart fallback`);
        return this.generateFallbackTime(level);
    }

    generateEnhancedRandomTimeForLevel(level) {
        const randomnessManager = this.gameState.randomnessManager;

        // Use cryptographic randomness for hour selection
        const randomHour = randomnessManager.generateCryptographicRandom(1, 12);
        let randomMinutes = 0;
        let randomSeconds = 0;

        // Use weighted format selection for better distribution
        const selectedFormat = randomnessManager.selectWeightedFormat(level.formats);

        // Generate minutes based on format with enhanced randomness
        switch (selectedFormat) {
            case "o'clock":
                randomMinutes = 0;
                break;
            case "half_past":
                randomMinutes = 30;
                break;
            case "quarter_hours":
                const quarterOptions = [15, 45];
                randomMinutes = quarterOptions[randomnessManager.generateCryptographicRandom(0, 1)];
                break;
            case "five_minutes":
                const fiveMinOptions = [5, 10, 20, 25, 35, 40, 50, 55];
                randomMinutes = fiveMinOptions[randomnessManager.generateCryptographicRandom(0, fiveMinOptions.length - 1)];
                break;
            case "full_minutes":
                // Enhanced full_minutes with better distribution
                const excludedMinutes = new Set([0, 15, 30, 45, 5, 10, 20, 25, 35, 40, 50, 55]);
                const availableMinutes = [];
                for (let m = 1; m < 60; m++) {
                    if (!excludedMinutes.has(m)) {
                        availableMinutes.push(m);
                    }
                }
                randomMinutes = availableMinutes[randomnessManager.generateCryptographicRandom(0, availableMinutes.length - 1)];
                break;
        }

        // Enhanced AM/PM selection with bias toward realistic usage patterns
        let isAM = true;
        if (level.hasAMPM) {
            // Slight bias toward common times (7 AM - 11 PM more common)
            const timeScore = this.calculateTimeRealism(randomHour, randomMinutes);
            const amProbability = timeScore > 0.5 ? 0.6 : 0.4; // Bias toward realistic times
            isAM = Math.random() < amProbability;
        }

        // Enhanced seconds generation with natural distribution
        if (level.hasSeconds) {
            // Use bell curve-like distribution favoring round numbers
            const secondsWeights = this.generateSecondsWeights();
            randomSeconds = this.selectWeightedSeconds(secondsWeights, randomnessManager);
        }

        return {
            hours: randomHour,
            minutes: randomMinutes,
            seconds: randomSeconds,
            timeFormat: selectedFormat,
            isAM: isAM
        };
    }

    generateFallbackTime(level) {
        // Smart fallback that ensures variety even when pool is exhausted
        const randomnessManager = this.gameState.randomnessManager;

        // Get least recently used format
        const formatStats = randomnessManager.getStatistics().formatWeights;
        const availableFormats = level.formats;
        let leastUsedFormat = availableFormats[0];
        let highestWeight = 0;

        for (const format of availableFormats) {
            const weight = formatStats[format] || 1.0;
            if (weight > highestWeight) {
                highestWeight = weight;
                leastUsedFormat = format;
            }
        }

        // Generate time with least used format
        const time = this.generateSpecificFormatTime(level, leastUsedFormat);

        // Generate unique key and mark as used
        const timeKey = randomnessManager.generateUniqueTimeKey(
            time.hours, time.minutes, time.seconds, time.isAM, level.hasAMPM, level.hasSeconds
        );

        randomnessManager.markTimeAsUsed(level.id, timeKey, time);
        this.gameState.currentLevelUsedTimes.add(timeKey);
        this.gameState.usedTimes.add(timeKey);

        GameUtils.log(`Fallback time generated: ${timeKey} (format: ${leastUsedFormat})`);
        return time;
    }

    generateSpecificFormatTime(level, format) {
        const randomnessManager = this.gameState.randomnessManager;
        const randomHour = randomnessManager.generateCryptographicRandom(1, 12);
        let randomMinutes = 0;
        let randomSeconds = 0;

        switch (format) {
            case "o'clock":
                randomMinutes = 0;
                break;
            case "half_past":
                randomMinutes = 30;
                break;
            case "quarter_hours":
                randomMinutes = [15, 45][randomnessManager.generateCryptographicRandom(0, 1)];
                break;
            case "five_minutes":
                const fiveMin = [5, 10, 20, 25, 35, 40, 50, 55];
                randomMinutes = fiveMin[randomnessManager.generateCryptographicRandom(0, fiveMin.length - 1)];
                break;
            case "full_minutes":
                const excluded = new Set([0, 15, 30, 45, 5, 10, 20, 25, 35, 40, 50, 55]);
                const available = Array.from({ length: 60 }, (_, i) => i).filter(m => !excluded.has(m));
                randomMinutes = available[randomnessManager.generateCryptographicRandom(0, available.length - 1)];
                break;
        }

        const isAM = level.hasAMPM ? Math.random() < 0.5 : true;

        if (level.hasSeconds) {
            randomSeconds = randomnessManager.generateCryptographicRandom(0, 59);
        }

        return {
            hours: randomHour,
            minutes: randomMinutes,
            seconds: randomSeconds,
            timeFormat: format,
            isAM: isAM
        };
    }

    calculateTimeRealism(hours, minutes) {
        // Calculate how "realistic" or common a time is for everyday use
        // Returns 0.0 to 1.0, where 1.0 is most realistic

        // Common hours score (higher for typical waking hours)
        let hourScore = 0.5; // Default
        if (hours >= 7 && hours <= 11) hourScore = 1.0; // Morning hours
        else if (hours >= 12 && hours <= 6) hourScore = 0.9; // Afternoon/evening
        else if (hours >= 1 && hours <= 6) hourScore = 0.3; // Late night/early morning

        // Round minutes are more common
        let minuteScore = 0.7; // Default
        if (minutes === 0 || minutes === 30) minuteScore = 1.0; // O'clock and half past
        else if (minutes === 15 || minutes === 45) minuteScore = 0.9; // Quarter hours
        else if (minutes % 5 === 0) minuteScore = 0.8; // Five-minute intervals

        return (hourScore + minuteScore) / 2;
    }

    generateSecondsWeights() {
        // Create weights that favor round numbers and common intervals
        const weights = new Array(60).fill(1.0);

        // Boost round numbers (0, 15, 30, 45)
        weights[0] = 3.0;
        weights[15] = 2.5;
        weights[30] = 2.5;
        weights[45] = 2.5;

        // Boost five-second intervals
        for (let i = 0; i < 60; i += 5) {
            weights[i] = Math.max(weights[i], 2.0);
        }

        // Boost ten-second intervals
        for (let i = 0; i < 60; i += 10) {
            weights[i] = Math.max(weights[i], 2.2);
        }

        return weights;
    }

    selectWeightedSeconds(weights, randomnessManager) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return i;
            }
        }

        // Fallback
        return randomnessManager.generateCryptographicRandom(0, 59);
    }

    generateOptions(timeData) {
        const level = this.gameState.getCurrentLevel();
        const correctOption = this.formatTime(timeData, level);
        this.currentCorrectAnswer = correctOption;
        const options = [correctOption];
        const usedOptions = new Set([correctOption]);
        const randomnessManager = this.gameState.randomnessManager;

        // MOBILE DEBUG: Log option generation start
        if (window.innerWidth <= 768) {
            GameUtils.log('MOBILE: Starting option generation');
            GameUtils.log('MOBILE: Correct option:', correctOption);
            GameUtils.log('MOBILE: Options container exists:', !!this.domManager.get('options'));
        }

        // Generate 3 incorrect options with enhanced strategies
        const maxAttempts = 50; // Increased for better variety
        let attempts = 0;

        while (options.length < 4 && attempts < maxAttempts) {
            const incorrectOption = this.generateEnhancedIncorrectOption(timeData, level, usedOptions);
            if (!usedOptions.has(incorrectOption)) {
                options.push(incorrectOption);
                usedOptions.add(incorrectOption);
                GameUtils.log(`Generated incorrect option: ${incorrectOption}`);
            }
            attempts++;
        }

        // Enhanced fallback generation if needed
        while (options.length < 4) {
            const fallbackOption = this.generateFallbackIncorrectOption(timeData, level, usedOptions);
            if (!usedOptions.has(fallbackOption)) {
                options.push(fallbackOption);
                usedOptions.add(fallbackOption);
            }
        }

        // Ensure we have exactly 4 options
        if (options.length !== 4) {
            GameUtils.warn(`Expected 4 options, got ${options.length}. Padding with fallbacks.`);
            while (options.length < 4) {
                const paddingOption = this.generatePaddingOption(timeData, level, usedOptions);
                if (!usedOptions.has(paddingOption)) {
                    options.push(paddingOption);
                    usedOptions.add(paddingOption);
                }
            }
        }

        // Enhanced shuffle using crypto random if available
        const shuffledOptions = this.enhancedShuffle(options, randomnessManager);

        // MOBILE DEBUG: Log before adding options
        if (window.innerWidth <= 768) {
            GameUtils.log('MOBILE: About to add options to DOM');
            GameUtils.log('MOBILE: Options to add:', shuffledOptions);
            GameUtils.log('MOBILE: Options container state:', this.domManager.get('options'));
        }

        shuffledOptions.forEach((option, index) => {
            if (window.innerWidth <= 768) {
                GameUtils.log(`MOBILE: Adding option ${index + 1}/${shuffledOptions.length}: "${option}"`);
            }
            this.domManager.addOption(option, () => this.checkAnswer(option));
        });

        // ✨ UNLOCK: Ensure all new options are enabled and ready for interaction
        setTimeout(() => {
            this.domManager.enableAllOptions();
        }, 50); // Small delay to ensure DOM is updated

        // MOBILE DEBUG: Verify options were added
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                const addedOptions = document.querySelectorAll('#options .option');
                GameUtils.log(`MOBILE: Options added to DOM: ${addedOptions.length}/${shuffledOptions.length}`);

                if (addedOptions.length === 0) {
                    GameUtils.error('MOBILE CRITICAL: No options found in DOM after generation!');
                    this.domManager.createMobileDebugInfo('No options in DOM - activating fallback');
                    this.domManager.activateMobileEmergencyFallback();

                    // Try adding options again with emergency fallback
                    shuffledOptions.forEach(option => {
                        this.domManager.addOption(option, () => this.checkAnswer(option));
                    });
                } else if (addedOptions.length < shuffledOptions.length) {
                    GameUtils.warn(`MOBILE WARNING: Only ${addedOptions.length}/${shuffledOptions.length} options visible`);
                    this.domManager.createMobileDebugInfo(`Missing options: ${addedOptions.length}/${shuffledOptions.length} visible`);
                } else {
                    GameUtils.log('MOBILE SUCCESS: All options successfully added and visible');
                    this.domManager.createMobileDebugInfo('All options visible');
                }
            }, 200);
        }

        GameUtils.log(`Generated ${shuffledOptions.length} options: ${shuffledOptions.join(', ')}`);
        GameUtils.log(`Correct answer: ${correctOption}`);
    }

    generateEnhancedIncorrectOption(baseTimeData, level, usedOptions) {
        const randomnessManager = this.gameState.randomnessManager;

        // Enhanced strategies with weighted selection based on level complexity
        const strategies = [
            // Common hour confusions (weighted higher for early levels)
            {
                weight: level.id <= 3 ? 3.0 : 2.0,
                generate: () => this.formatTime({
                    ...baseTimeData,
                    hours: (baseTimeData.hours % 12) + 1
                }, level)
            },
            {
                weight: level.id <= 3 ? 3.0 : 2.0,
                generate: () => this.formatTime({
                    ...baseTimeData,
                    hours: baseTimeData.hours === 1 ? 12 : baseTimeData.hours - 1
                }, level)
            },

            // Minute confusions (context-aware)
            {
                weight: 2.5,
                generate: () => this.formatTime({
                    ...baseTimeData,
                    minutes: this.getConfusingMinute(baseTimeData.minutes, 'add')
                }, level)
            },
            {
                weight: 2.5,
                generate: () => this.formatTime({
                    ...baseTimeData,
                    minutes: this.getConfusingMinute(baseTimeData.minutes, 'subtract')
                }, level)
            },

            // Hand position confusion (common error)
            {
                weight: 3.0,
                generate: () => this.formatTime({
                    ...baseTimeData,
                    hours: this.getHandConfusionHour(baseTimeData.hours, baseTimeData.minutes)
                }, level)
            },

            // AM/PM variations (for levels 6+)
            {
                weight: level.hasAMPM ? 2.5 : 0,
                generate: () => level.hasAMPM ? this.formatTime({
                    ...baseTimeData,
                    isAM: !baseTimeData.isAM
                }, level) : null
            },

            // Seconds variations (for level 7)
            {
                weight: level.hasSeconds ? 2.0 : 0,
                generate: () => level.hasSeconds ? this.formatTime({
                    ...baseTimeData,
                    seconds: this.getConfusingSeconds(baseTimeData.seconds)
                }, level) : null
            },

            // Near-miss times (psychologically confusing)
            {
                weight: 2.0,
                generate: () => this.generateNearMissTime(baseTimeData, level)
            }
        ];

        // Filter out strategies with 0 weight and null generators
        const validStrategies = strategies.filter(s => s.weight > 0);

        // Select strategy using weighted randomness
        const totalWeight = validStrategies.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;

        for (const strategy of validStrategies) {
            random -= strategy.weight;
            if (random <= 0) {
                const result = strategy.generate();
                if (result && !usedOptions.has(result)) {
                    return result;
                }
                break;
            }
        }

        // Fallback to simple random strategy
        return this.generateIncorrectOption(baseTimeData, level);
    }

    getConfusingMinute(originalMinutes, operation) {
        // Generate minutes that are commonly confused with the original
        const confusionPairs = {
            0: [30, 15, 45],
            15: [45, 30, 0],
            30: [0, 15, 45],
            45: [15, 0, 30],
            5: [25, 35, 55],
            10: [50, 20, 40],
            20: [40, 10, 50],
            25: [35, 5, 55],
            35: [25, 55, 5],
            40: [20, 50, 10],
            50: [10, 40, 20],
            55: [5, 25, 35]
        };

        const confusions = confusionPairs[originalMinutes] || [
            (originalMinutes + 15) % 60,
            (originalMinutes + 30) % 60,
            (originalMinutes + 45) % 60
        ];

        return confusions[Math.floor(Math.random() * confusions.length)];
    }

    getHandConfusionHour(originalHour, minutes) {
        // Simulate common error of confusing hour hand position
        // When minute hand points to a number, people sometimes read that as the hour
        const minuteHandHour = Math.floor(minutes / 5) || 12;

        // If this would create a reasonable confusion, use it
        if (minuteHandHour !== originalHour && minuteHandHour >= 1 && minuteHandHour <= 12) {
            return minuteHandHour;
        }

        // Otherwise, return a nearby hour
        return originalHour === 12 ? 1 : originalHour + 1;
    }

    getConfusingSeconds(originalSeconds) {
        // Generate seconds that are commonly confused
        const roundToNearest = (value, interval) => Math.round(value / interval) * interval;

        const variations = [
            (originalSeconds + 15) % 60,
            (originalSeconds + 30) % 60,
            (originalSeconds + 45) % 60,
            roundToNearest(originalSeconds, 10),
            roundToNearest(originalSeconds, 15)
        ];

        const different = variations.filter(s => s !== originalSeconds);
        return different[Math.floor(Math.random() * different.length)] || (originalSeconds + 30) % 60;
    }

    generateNearMissTime(baseTimeData, level) {
        // Generate times that are very close but noticeably different
        const variations = [];

        // Slightly different hour
        if (Math.random() < 0.4) {
            const hourDelta = Math.random() < 0.5 ? 1 : -1;
            let newHour = baseTimeData.hours + hourDelta;
            if (newHour < 1) newHour = 12;
            if (newHour > 12) newHour = 1;

            variations.push({
                ...baseTimeData,
                hours: newHour
            });
        }

        // Slightly different minutes (if not o'clock)
        if (baseTimeData.minutes !== 0) {
            const minuteDelta = Math.random() < 0.5 ? 5 : -5;
            const newMinutes = Math.max(0, Math.min(59, baseTimeData.minutes + minuteDelta));

            variations.push({
                ...baseTimeData,
                minutes: newMinutes
            });
        }

        // Return random variation or fallback
        if (variations.length > 0) {
            const selectedVariation = variations[Math.floor(Math.random() * variations.length)];
            return this.formatTime(selectedVariation, level);
        }

        return this.generateIncorrectOption(baseTimeData, level);
    }

    generateFallbackIncorrectOption(baseTimeData, level, usedOptions) {
        const randomnessManager = this.gameState.randomnessManager;

        // Generate completely random but valid time
        const randomHour = randomnessManager.generateCryptographicRandom(1, 12);
        let randomMinutes, randomSeconds = 0;

        // Use valid minutes for the current level
        const availableFormats = level.formats;
        const selectedFormat = availableFormats[Math.floor(Math.random() * availableFormats.length)];

        switch (selectedFormat) {
            case "o'clock":
                randomMinutes = 0;
                break;
            case "half_past":
                randomMinutes = 30;
                break;
            case "quarter_hours":
                randomMinutes = [15, 45][Math.floor(Math.random() * 2)];
                break;
            case "five_minutes":
                const fiveMin = [5, 10, 20, 25, 35, 40, 50, 55];
                randomMinutes = fiveMin[Math.floor(Math.random() * fiveMin.length)];
                break;
            case "full_minutes":
                const excluded = new Set([0, 15, 30, 45, 5, 10, 20, 25, 35, 40, 50, 55]);
                const available = Array.from({ length: 60 }, (_, i) => i).filter(m => !excluded.has(m));
                randomMinutes = available[Math.floor(Math.random() * available.length)];
                break;
            default:
                randomMinutes = Math.floor(Math.random() * 60);
        }

        const isAM = level.hasAMPM ? Math.random() < 0.5 : baseTimeData.isAM;

        if (level.hasSeconds) {
            randomSeconds = randomnessManager.generateCryptographicRandom(0, 59);
        }

        return this.formatTime({
            hours: randomHour,
            minutes: randomMinutes,
            seconds: randomSeconds,
            isAM: isAM
        }, level);
    }

    generatePaddingOption(baseTimeData, level, usedOptions) {
        // Last resort: generate any different valid time
        const attempts = 20;

        for (let i = 0; i < attempts; i++) {
            const paddingTime = {
                hours: Math.floor(Math.random() * 12) + 1,
                minutes: Math.floor(Math.random() * 60),
                seconds: level.hasSeconds ? Math.floor(Math.random() * 60) : 0,
                isAM: level.hasAMPM ? Math.random() < 0.5 : true
            };

            const formatted = this.formatTime(paddingTime, level);
            if (!usedOptions.has(formatted)) {
                return formatted;
            }
        }

        // Absolute fallback
        return this.formatTime({
            hours: 6,
            minutes: 0,
            seconds: 0,
            isAM: true
        }, level);
    }

    enhancedShuffle(array, randomnessManager) {
        // Enhanced Fisher-Yates shuffle using crypto randomness when available
        const shuffled = [...array];

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = randomnessManager.generateCryptographicRandom(0, i);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }

    // Legacy method for backward compatibility
    generateIncorrectOption(baseTimeData, level) {
        const strategies = [
            // Hour variations
            () => this.formatTime({
                ...baseTimeData,
                hours: (baseTimeData.hours % 12) + 1
            }, level),
            () => this.formatTime({
                ...baseTimeData,
                hours: baseTimeData.hours === 1 ? 12 : baseTimeData.hours - 1
            }, level),

            // Minute variations
            () => this.formatTime({
                ...baseTimeData,
                minutes: (baseTimeData.minutes + 15) % 60
            }, level),
            () => this.formatTime({
                ...baseTimeData,
                minutes: (baseTimeData.minutes + 30) % 60
            }, level),
            () => this.formatTime({
                ...baseTimeData,
                minutes: Math.max(0, baseTimeData.minutes - 15)
            }, level),

            // AM/PM variations (for levels 6+)
            () => level.hasAMPM ? this.formatTime({
                ...baseTimeData,
                isAM: !baseTimeData.isAM
            }, level) : this.formatTime({
                ...baseTimeData,
                hours: (baseTimeData.hours % 12) + 1
            }, level),

            // Seconds variations (for level 7)
            () => level.hasSeconds ? this.formatTime({
                ...baseTimeData,
                seconds: (baseTimeData.seconds + 30) % 60
            }, level) : this.formatTime({
                ...baseTimeData,
                minutes: (baseTimeData.minutes + 5) % 60
            }, level)
        ];

        const strategy = strategies[Math.floor(Math.random() * strategies.length)];
        return strategy();
    }

    checkAnswer(selectedAnswer) {
        // ✨ CRITICAL FIX: Prevent rapid clicking by checking processing state
        if (this.isProcessingAnswer) {
            GameUtils.log('🚫 Answer processing in progress - ignoring rapid click');
            return;
        }

        if (!this.gameState.isGameActive) {
            GameUtils.log('🚫 Game not active - ignoring click');
            return;
        }

        // Play click sound
        if (this.soundManager) {
            this.soundManager.playClick();
        }

        // Prevent processing answers too quickly (additional safety)
        const now = Date.now();
        if (this.answerProcessingStartTime && (now - this.answerProcessingStartTime) < this.minProcessingDelay) {
            GameUtils.log(`🚫 Answer submitted too quickly (${now - this.answerProcessingStartTime}ms) - ignoring`);
            return;
        }

        // ✨ LOCK: Set processing state and disable all options immediately
        this.isProcessingAnswer = true;
        this.answerProcessingStartTime = now;
        this.domManager.disableAllOptions();

        GameUtils.log(`✅ Processing answer: "${selectedAnswer}" vs correct: "${this.currentCorrectAnswer}"`);
        this.gameState.questionsAnswered++;

        if (selectedAnswer === this.currentCorrectAnswer) {
            this.gameState.correctAnswers++;
            GameUtils.log('🎉 Answer is CORRECT!');
            this.handleCorrectAnswer();
            // handleCorrectAnswer now manages the next question generation and unlocking
        } else {
            GameUtils.log('❌ Answer is INCORRECT!');
            this.handleIncorrectAnswer();
            // Generate next question after a delay for incorrect answers (which will unlock options)
            setTimeout(() => {
                if (this.gameState.isGameActive) {
                    this.generateQuestion();
                }
            }, 1500);
        }
    }

    handleCorrectAnswer() {
        // Score and rewards are only processed once due to the lock above
        const pointsEarned = this.gameState.incrementScore(this.gameState.currentTimeFormat);

        // Play success sound
        if (this.soundManager) {
            this.soundManager.playCorrect();
        }

        this.showSuccessFeedback();
        this.domManager.updateClockStatus('Correct! ✨');

        // Award ClockCoin for correct answer (only once due to processing lock)
        if (this.rewardShop) {
            this.rewardShop.earnClockCoin();
        }

        // Show points popup with the points earned and 1 coin
        this.domManager.showPointsPopup(pointsEarned, 1);

        let feedbackDuration = 1500;
        let showLevelTransition = false;
        let previousLevel = null;

        if (this.gameState.shouldLevelUp()) {
            previousLevel = this.gameState.getCurrentLevel();
            const leveledUp = this.gameState.levelUp();
            if (leveledUp) {
                GameUtils.log(`Level up detected! Moving to level ${this.gameState.currentLevel}`);
                this.domManager.updateClockStatus(`Level ${this.gameState.currentLevel} Unlocked! 🎉`);
                feedbackDuration = 2500; // Longer display for level up message
                showLevelTransition = true;
            }
        }

        this.updateAllDisplays();

        // Show level transition or continue game
        setTimeout(() => {
            if (this.gameState.isGameActive) {
                if (showLevelTransition && this.levelTransitionManager) {
                    // Show level transition modal (options remain disabled until next question)
                    const currentLevel = this.gameState.getCurrentLevel();
                    this.levelTransitionManager.showLevelTransition(previousLevel, currentLevel, this.gameState);
                } else {
                    // Continue with next question (this will unlock options)
                    this.domManager.updateClockStatusWithLevel(this.gameState);
                    this.generateQuestion();
                }
            }
        }, feedbackDuration);
    }

    handleIncorrectAnswer() {
        this.gameState.decrementStars();

        // Play error sound
        if (this.soundManager) {
            this.soundManager.playWrong();
        }

        this.showErrorFeedback();
        this.domManager.updateClockStatus(`Try again! The correct answer was ${this.currentCorrectAnswer}`);

        if (this.gameState.stars <= 0) {
            this.handleGameOver();
        } else {
            // Return to showing current level after feedback (only if game continues)
            setTimeout(() => {
                if (this.gameState.isGameActive) {
                    this.domManager.updateClockStatusWithLevel(this.gameState);
                }
            }, 3000); // Longer duration for incorrect answer feedback
        }

        this.updateAllDisplays();
    }

    showSuccessFeedback() {
        // Simple visual feedback without problematic animations
        const clockContainer = document.querySelector('.clock-container');
        if (clockContainer) {
            clockContainer.style.transform = 'scale(1.05)';
            setTimeout(() => {
                clockContainer.style.transform = 'scale(1)';
            }, 300);
        }

        // Add green glowing effect to clock status panel
        const clockStatus = document.querySelector('.clock-status');
        if (clockStatus) {
            clockStatus.classList.add('glow-correct');
            // Remove the class after animation completes
            setTimeout(() => {
                clockStatus.classList.remove('glow-correct');
            }, 1500);
        }
    }

    showErrorFeedback() {
        // Simple shake effect without problematic animations
        const clockContainer = document.querySelector('.clock-container');
        if (clockContainer) {
            clockContainer.style.transform = 'translateX(-5px)';
            setTimeout(() => {
                clockContainer.style.transform = 'translateX(5px)';
                setTimeout(() => {
                    clockContainer.style.transform = 'translateX(0)';
                }, 100);
            }, 100);
        }

        // Add red glowing effect to clock status panel
        const clockStatus = document.querySelector('.clock-status');
        if (clockStatus) {
            clockStatus.classList.add('glow-incorrect');
            // Remove the class after animation completes
            setTimeout(() => {
                clockStatus.classList.remove('glow-incorrect');
            }, 1500);
        }
    }

    updateAllDisplays() {
        this.updateProgressDisplay();
        this.updatePointsDisplay();
        this.updateTotalScoreDisplay();
    }

    updateProgressDisplay() {
        const level = this.gameState.getCurrentLevel();
        this.domManager.updateBadge(`Level ${level.id}: ${level.name}`);

        // Get the correct max stars from settings
        const maxStars = this.gameState.settingsManager ?
            this.gameState.settingsManager.getMaxStars() :
            GAME_CONFIG.MAX_STARS;

        this.domManager.updateStars(this.gameState.stars, maxStars);
    }

    updatePointsDisplay() {
        this.domManager.updatePoints(this.gameState.points);
    }

    updateTotalScoreDisplay() {
        this.domManager.updateTotalScoreDisplay(this.gameState.points);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.gameState.timeRemaining / 60);
        const seconds = this.gameState.timeRemaining % 60;
        this.domManager.updateTimer(minutes, seconds);
    }

    updateClockDisplay() {
        const { hours, minutes, seconds } = this.gameState.currentTime;
        const level = this.gameState.getCurrentLevel();

        GameUtils.log(`Updating clock display to ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);

        // Enhanced logging for Level 7 with seconds precision
        if (level && level.hasSeconds) {
            const minuteAngle = (minutes * 6) + (seconds * 0.1) - 90;
            const expectedDegrees = minuteAngle + 90;
            const minutePosition = (expectedDegrees / 6);
            const wholeMinutes = Math.floor(minutePosition);
            const fractionPastMinute = (minutePosition - wholeMinutes) * 60;

            GameUtils.log(`🎯 LEVEL 7 PRECISION: Minute hand should be at ${expectedDegrees.toFixed(2)}° (minute ${wholeMinutes} + ${fractionPastMinute.toFixed(1)}s)`);
        }

        if (this.clockBuilder) {
            const success = this.clockBuilder.updateClockHands(hours, minutes, seconds);
            if (success) {
                GameUtils.log(`Clock hands updated successfully`);

                // Additional validation for Level 7
                if (level && level.hasSeconds && GAME_CONFIG.DEBUG) {
                    const minuteHand = document.getElementById('minute-hand');
                    if (minuteHand) {
                        const actualX = parseFloat(minuteHand.getAttribute('x2'));
                        const actualY = parseFloat(minuteHand.getAttribute('y2'));
                        GameUtils.log(`🔍 Level 7 Validation: Minute hand positioned at (${actualX}, ${actualY})`);
                    }
                }
            } else {
                GameUtils.error('Failed to update clock hands');
            }
        } else {
            GameUtils.error('Clock builder not available!');
        }
    }

    startTimer(isNewGame = false) {
        // Only set initial time if it's a new game (or restart)
        if (isNewGame) {
            // Use global time limit from settings (in minutes) converted to seconds
            // Default to 5 minutes if settings not available
            const timeInMinutes = this.gameState.settingsManager ?
                this.gameState.settingsManager.getSetting('timeMultiplier') : 5;
            this.gameState.timeRemaining = timeInMinutes * 60;
            GameUtils.log(`Global timer initialized: ${timeInMinutes} minutes (${this.gameState.timeRemaining}s)`);
        }

        this.updateTimerDisplay();

        // Clear any existing timer to avoid duplicates
        if (this.gameState.timer) {
            clearInterval(this.gameState.timer);
        }

        this.gameState.timer = setInterval(() => {
            this.gameState.timeRemaining--;
            this.updateTimerDisplay();

            if (this.gameState.timeRemaining <= 0) {
                this.handleGameOver();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.gameState.timer) {
            clearInterval(this.gameState.timer);
            this.gameState.timer = null;
        }
    }

    pauseTimer() {
        if (this.gameState.timer) {
            clearInterval(this.gameState.timer);
            this.gameState.timer = null;
            GameUtils.log('Timer paused');
        }
    }

    resumeTimer() {
        if (this.gameState.timer) return; // Already running
        if (!this.gameState.isGameActive) return; // Don't resume if game not active

        GameUtils.log('Timer resumed');
        this.gameState.timer = setInterval(() => {
            this.gameState.timeRemaining--;
            this.updateTimerDisplay();

            if (this.gameState.timeRemaining <= 0) {
                this.handleGameOver();
            }
        }, 1000);
    }

    handleGameOver(isWin = false) {
        if (!this.gameState.isGameActive) return;

        this.gameState.isGameActive = false;
        this.stopTimer();

        // Calculate final stats
        const accuracy = this.gameState.questionsAnswered > 0 ?
            Math.round((this.gameState.correctAnswers / this.gameState.questionsAnswered) * 100) : 0;

        // Update Leaderboard
        let isNewRecord = false;
        if (this.highScoreManager) {
            isNewRecord = this.highScoreManager.checkAndUpdateHighScore(this.gameState.points);
        }

        const stats = {
            score: this.gameState.points,
            accuracy: accuracy,
            questions: this.gameState.questionsAnswered
        };

        const leaderboard = this.highScoreManager ? this.highScoreManager.getLeaderboard() : [];
        const currentCoins = this.rewardShop ? this.rewardShop.getClockCoins() : 0;

        // Show Game Over Modal (replacing inline options)
        this.domManager.showGameOverModal(
            stats,
            leaderboard,
            currentCoins,
            () => this.restartGame(),     // Play Again Callback
            () => this.returnToMenu(),     // Menu Callback
            (cost, feedbackEl) => this.handleBuyTime(cost, feedbackEl) // Buy Time Callback
        );

        // Update status for background context (optional)
        const gameOverMessage = isNewRecord ? 'NEW HIGH SCORE! 🏆' : 'Game Over! 🎮';
        this.domManager.updateClockStatus(gameOverMessage);

        // Log game over stats
        GameUtils.log(`🎮 Game Over - Score: ${this.gameState.points}, Accuracy: ${accuracy}%`);
    }

    handleBuyTime(cost, feedbackEl) {
        if (!this.rewardShop || this.rewardShop.getClockCoins() < cost) {
            if (feedbackEl) {
                feedbackEl.textContent = "Not enough coins!";
                feedbackEl.className = "feedback-message error visible";
                setTimeout(() => feedbackEl.classList.add('hidden'), 2000);
            }
            return;
        }

        // Process purchase
        this.rewardShop.clockCoins -= cost;
        this.rewardShop.updateClockCoinDisplay();
        
        // Add time and resume
        const SECONDS_TO_ADD = 60;
        this.gameState.addTime(SECONDS_TO_ADD);
        this.gameState.isGameActive = true;
        this.resumeTimer();
        
        // Hide modal
        this.domManager.safeUpdate('gameOverModal', el => {
            el.classList.add('hidden');
            el.style.display = ''; 
        });

        // Show feedback
        GameUtils.log(`✅ Resumed game with +${SECONDS_TO_ADD}s for ${cost} coins`);
        this.domManager.updateClockStatus("Time Extended! Go! 🚀");
    }

    restartGame() {
        // Restart immediately with the same initial level
        GameUtils.log(`Restarting game at level ${this.initialLevel}...`);
        this.startGame(this.initialLevel);
    }

    returnToMenu() {
        this.gameState.reset();
        this.domManager.showStartMenu();
    }

    formatTime(timeData, level) {
        const { hours, minutes, seconds, isAM } = timeData;
        let timeString = `${hours}:${minutes.toString().padStart(2, '0')}`;

        // Add seconds for level 7
        if (level && level.hasSeconds) {
            timeString += `:${seconds.toString().padStart(2, '0')}`;
        }

        // Add AM/PM for levels 6+
        if (level && level.hasAMPM) {
            timeString += ` ${isAM ? 'AM' : 'PM'}`;
        }

        return timeString;
    }
}

/* =============================================
   SETTINGS MODAL MANAGER
   ============================================= */
class SettingsModalManager {
    constructor(domManager, settingsManager, gameLogic) {
        this.domManager = domManager;
        this.settingsManager = settingsManager;
        this.gameLogic = gameLogic;
        this.setupEventListeners();
        this.updateDisplay();
    }

    setupEventListeners() {
        // Slider event listeners
        const timeMultiplierSlider = this.domManager.get('timeMultiplierSlider');
        const starCountSlider = this.domManager.get('starCountSlider');

        if (timeMultiplierSlider) {
            timeMultiplierSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.settingsManager.updateSetting('timeMultiplier', value);
                this.updateDisplay();
            });
        }

        if (starCountSlider) {
            starCountSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.settingsManager.updateSetting('starCount', value);
                this.updateDisplay();
            });
        }

        // Sound toggle listener
        const soundToggle = this.domManager.get('soundToggle');
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                const value = e.target.checked;
                this.settingsManager.updateSetting('soundEnabled', value);
                this.updateDisplay();
            });
        }

        // Save settings button
        const saveBtn = this.domManager.get('saveSettingsBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }

        // Reset settings button
        const resetBtn = this.domManager.get('resetSettingsBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }

        // Close button
        const closeBtn = this.domManager.get('closeSettingsBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideSettings());
        }
    }

    updateDisplay() {
        this.domManager.updateSettingsDisplay(this.settingsManager.settings);

        // Update sound toggle
        const soundToggle = this.domManager.get('soundToggle');
        if (soundToggle) {
            soundToggle.checked = this.settingsManager.getSetting('soundEnabled');
        }

        this.updatePreviewStatus();
    }

    updatePreviewStatus() {
        // Add visual indicator if settings have been modified from defaults
        const isModified = this.settingsManager.settings.timeMultiplier !== 5 ||
            this.settingsManager.settings.starCount !== 3 ||
            this.settingsManager.settings.soundEnabled !== true;

        const previewSection = document.querySelector('.settings-preview');
        if (previewSection) {
            if (isModified) {
                previewSection.style.borderLeftColor = '#FF9800';
                previewSection.style.background = 'rgba(255, 152, 0, 0.05)';
            } else {
                previewSection.style.borderLeftColor = '#4CAF50';
                previewSection.style.background = 'var(--color-light)';
            }
        }
    }

    saveSettings() {
        // Show saving feedback
        const saveBtn = this.domManager.get('saveSettingsBtn');
        if (saveBtn) {
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<span class="button-text">Saving...</span><span class="button-icon">✓</span>';
            saveBtn.disabled = true;

            // Simulate save process
            setTimeout(() => {
                this.settingsManager.saveSettings();
                this.settingsManager.applyToGameConfig();

                // If there's an active game, update its display immediately
                if (window.analogClockGame && window.analogClockGame.gameLogic) {
                    window.analogClockGame.gameLogic.updateAllDisplays();
                }

                // Show success feedback
                saveBtn.innerHTML = '<span class="button-text">Saved!</span><span class="button-icon">✓</span>';
                saveBtn.style.background = 'linear-gradient(45deg, #4CAF50, #66BB6A)';

                setTimeout(() => {
                    this.hideSettings();

                    // Reset button state
                    setTimeout(() => {
                        saveBtn.innerHTML = originalText;
                        saveBtn.disabled = false;
                        saveBtn.style.background = '';
                    }, 300);
                }, 1000);

                GameUtils.log('Settings saved and applied!');
            }, 500);
        } else {
            // Fallback if button not found
            this.settingsManager.saveSettings();
            this.settingsManager.applyToGameConfig();
            this.hideSettings();
            GameUtils.log('Settings saved and applied!');
        }
    }

    resetSettings() {
        this.settingsManager.resetToDefaults();
        this.updateDisplay();
    }

    showSettings() {
        if (this.gameLogic) {
            this.gameLogic.pauseTimer();
        }
        this.updateDisplay();
        this.domManager.showSettingsModal();
    }

    hideSettings() {
        this.domManager.hideSettingsModal();
        if (this.gameLogic) {
            this.gameLogic.resumeTimer();
        }
    }
}

/* =============================================
   LEVEL TRANSITION MANAGER
   ============================================= */
class LevelTransitionManager {
    constructor(domManager, gameLogic) {
        this.domManager = domManager;
        this.gameLogic = gameLogic;
        this.rewardShop = null; // Will be set by AnalogClockGame
        this.setupEventListeners();
    }

    get gameState() {
        return this.gameLogic ? this.gameLogic.gameState : null;
    }

    setupEventListeners() {
        const startNextLevelBtn = this.domManager.get('startNextLevelBtn');
        if (startNextLevelBtn) {
            startNextLevelBtn.addEventListener('click', () => this.startNextLevel());
        }

        const rewardShopBtn = this.domManager.get('rewardShopBtn');
        if (rewardShopBtn) {
            rewardShopBtn.addEventListener('click', () => this.showRewardShopOverlay());
        }

        // Close modal when clicking outside (optional)
        const modal = this.domManager.get('levelTransitionModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    // Don't close on outside click - force user to click Start
                    // this.startNextLevel();
                }
            });
        }
    }

    showLevelTransition(currentLevel, nextLevel, gameState) {
        // Update modal content
        this.domManager.updateLevelTransitionContent(currentLevel, nextLevel, gameState);

        // Update reward shop button with current ClockCoin count
        this.updateRewardShopButton();

        // Show the modal
        this.domManager.showLevelTransitionModal();

        GameUtils.log(`Showing level transition from ${currentLevel.id} to ${nextLevel.id}`);

        // Pause timer while in transition
        if (this.gameLogic) {
            this.gameLogic.pauseTimer();
        }
    }

    startNextLevel() {
        // Hide the modal
        this.domManager.hideLevelTransitionModal();

        // Continue the game
        if (this.gameLogic) {
            // ✨ UNLOCK: Reset processing state before generating new question
            this.gameLogic.isProcessingAnswer = false;
            this.gameLogic.answerProcessingStartTime = null;

            // Resume the global timer (do NOT reset it)
            this.gameLogic.resumeTimer();

            // Generate new question for the new level
            setTimeout(() => {
                this.gameLogic.generateQuestion();
            }, 300);
        }

        GameUtils.log('Starting next level from transition screen');
    }

    updateRewardShopButton() {
        const rewardShopBtn = this.domManager.get('rewardShopBtn');
        if (rewardShopBtn && this.rewardShop) {
            const clockCoins = this.rewardShop.getClockCoins();
            const buttonText = rewardShopBtn.querySelector('.button-text');
            if (buttonText) {
                buttonText.textContent = `Reward Shop (${clockCoins} 🪙)`;
            }
        }
    }

    showRewardShopOverlay() {
        if (!this.rewardShop) {
            GameUtils.warn('Reward shop not available');
            return;
        }

        // Create overlay for the reward shop
        const overlay = this.createRewardShopOverlay();
        document.body.appendChild(overlay);

        // Show with animation
        setTimeout(() => {
            overlay.classList.add('visible');
        }, 50);

        GameUtils.log('Showing reward shop overlay during level transition');
    }

    createRewardShopOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'reward-shop-overlay hidden';
        overlay.innerHTML = `
            <div class="shop-overlay-content">
                <div class="shop-overlay-header">
                    <h2>🏪 Reward Shop</h2>
                    <div class="shop-overlay-stats">
                        <div class="score-display">
                            <span class="score-icon">🏆</span>
                            <span id="overlay-score-amount">${this.gameState ? this.gameState.points : 0}</span>
                            <span class="score-label">Score</span>
                        </div>
                        <div class="clockcoin-balance">
                            <span class="coin-icon">🪙</span>
                            <span id="overlay-clockcoin-amount">${this.rewardShop.getClockCoins()}</span>
                            <span class="coin-label">ClockCoins</span>
                        </div>
                    </div>
                    <button class="close-shop-overlay" aria-label="Close shop">✕</button>
                </div>
                <div class="shop-overlay-body">
                    ${this.createShopItemsHTML()}
                </div>
                <div class="shop-overlay-footer">
                    <p>💡 Tip: Purchase strategic items to help with the upcoming level!</p>
                    <button class="continue-level-btn">Continue to Level →</button>
                </div>
            </div>
        `;

        // Add event listeners
        this.setupOverlayEventListeners(overlay);

        return overlay;
    }

    createShopItemsHTML() {
        const items = [
            { effect: 'points', value: 10, cost: 1, name: '+10 Points', description: 'Quick boost', icon: '🌟' },
            { effect: 'points', value: 60, cost: 5, name: '+60 Points', description: 'Good boost', icon: '⭐' },
            { effect: 'points', value: 100, cost: 8, name: '+100 Points', description: 'Great boost', icon: '✨' },
            { effect: 'time', value: 60, cost: 10, name: '+1 Extra Minute', description: '+60s', icon: '⏰' },
            { effect: 'life', value: 1, cost: 10, name: '+1 Extra Life', description: '+1 ❤️', icon: '❤️' },
            { effect: 'points', value: 500, cost: 25, name: '+500 Points', description: 'Mega boost!', icon: '💫' }
        ];

        return `
            <div class="shop-items-overlay">
                ${items.map(item => `
                    <div class="shop-item-overlay" 
                         data-effect="${item.effect}" 
                         data-value="${item.value}" 
                         data-cost="${item.cost}">
                        <div class="item-icon">${item.icon}</div>
                        <div class="item-info">
                            <div class="item-name">${item.name}</div>
                            <div class="item-description">${item.description}</div>
                        </div>
                        <div class="item-cost">
                            <span class="cost-amount">${item.cost}</span>
                            <span class="cost-icon">🪙</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    setupOverlayEventListeners(overlay) {
        // Close button
        const closeBtn = overlay.querySelector('.close-shop-overlay');
        closeBtn?.addEventListener('click', () => this.hideRewardShopOverlay(overlay));

        // Continue button
        const continueBtn = overlay.querySelector('.continue-level-btn');
        continueBtn?.addEventListener('click', () => this.hideRewardShopOverlay(overlay));

        // Shop items
        const shopItems = overlay.querySelectorAll('.shop-item-overlay');
        shopItems.forEach(item => {
            item.addEventListener('click', () => this.handleOverlayPurchase(item, overlay));
        });

        // Close on outside click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.hideRewardShopOverlay(overlay);
            }
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideRewardShopOverlay(overlay);
            }
        });
    }

    handleOverlayPurchase(shopItem, overlay) {
        if (!this.rewardShop) return;

        const cost = parseInt(shopItem.dataset.cost);
        const effect = shopItem.dataset.effect;
        const value = parseInt(shopItem.dataset.value);
        const itemName = shopItem.querySelector('.item-name').textContent;

        if (this.rewardShop.getClockCoins() < cost) {
            this.showOverlayFeedback('Not enough ClockCoins!', 'error', overlay);
            this.highlightInsufficientFunds(shopItem);
            return;
        }

        // Process the purchase
        this.rewardShop.clockCoins -= cost;
        this.rewardShop.applyPurchaseEffect(effect, value);

        // CRITICAL: Update both overlay AND main shop displays to ensure synchronization
        this.updateOverlayClockCoinDisplay(overlay);
        this.updateOverlayScoreDisplay(overlay);
        this.updateRewardShopButton();
        this.updateOverlayShopAvailability(overlay);

        // Update main reward shop displays to ensure state consistency
        this.rewardShop.updateClockCoinDisplay();
        this.rewardShop.updateShopAvailability();

        // Show success feedback
        this.showOverlayFeedback(`Purchased ${itemName}!`, 'success', overlay);
        this.animateOverlayPurchase(shopItem);

        GameUtils.log(`Purchased ${itemName} for ${cost} ClockCoins during level transition - ClockCoins remaining: ${this.rewardShop.clockCoins}`);
    }

    updateOverlayClockCoinDisplay(overlay) {
        const coinDisplay = overlay.querySelector('#overlay-clockcoin-amount');
        if (coinDisplay && this.rewardShop) {
            coinDisplay.textContent = this.rewardShop.getClockCoins();
            this.animateClockCoinUpdate(coinDisplay);
        }
    }

    updateOverlayScoreDisplay(overlay) {
        const scoreDisplay = overlay.querySelector('#overlay-score-amount');
        if (scoreDisplay && this.gameState) {
            scoreDisplay.textContent = this.gameState.points;
            // Use a simple animation since we don't have animateScoreUpdate in this class
            this.animateScoreUpdate(scoreDisplay);
        }
    }

    updateOverlayShopAvailability(overlay) {
        const shopItems = overlay.querySelectorAll('.shop-item-overlay');
        shopItems.forEach(item => {
            const cost = parseInt(item.dataset.cost);
            if (this.rewardShop.getClockCoins() < cost) {
                item.classList.add('insufficient-funds');
            } else {
                item.classList.remove('insufficient-funds');
            }
        });
    }

    showOverlayFeedback(message, type, overlay) {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.className = `overlay-feedback ${type}`;
        feedback.textContent = message;
        feedback.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${type === 'success' ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)'};
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-weight: bold;
            z-index: 10001;
            animation: overlayFeedback 2s ease-out forwards;
        `;

        overlay.appendChild(feedback);
        setTimeout(() => feedback.remove(), 2000);
    }

    animateOverlayPurchase(shopItem) {
        shopItem.style.transform = 'scale(0.95)';
        shopItem.style.background = 'rgba(76, 175, 80, 0.3)';
        setTimeout(() => {
            shopItem.style.transform = '';
            shopItem.style.background = '';
        }, 500);
    }

    animateClockCoinUpdate(element) {
        element.style.transform = 'scale(1.2)';
        element.style.color = '#FFD700';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 300);
    }

    // Add the missing animateScoreUpdate method
    animateScoreUpdate(element) {
        element.style.transform = 'scale(1.1)';
        element.style.color = '#4CAF50';
        element.style.fontWeight = 'bold';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '';
            element.style.fontWeight = '';
        }, 400);
    }

    highlightInsufficientFunds(shopItem) {
        shopItem.style.background = 'rgba(244, 67, 54, 0.2)';
        shopItem.style.borderColor = 'rgba(244, 67, 54, 0.5)';
        setTimeout(() => {
            shopItem.style.background = '';
            shopItem.style.borderColor = '';
        }, 1000);
    }

    hideRewardShopOverlay(overlay) {
        overlay.classList.remove('visible');
        overlay.classList.add('hidden');
        setTimeout(() => {
            overlay.remove();
        }, 300);

        GameUtils.log('Closed reward shop overlay');
    }
}

/* =============================================
   START MENU MANAGER
   ============================================= */
class StartMenuManager {
    constructor(domManager, gameLogic, settingsModalManager) {
        this.domManager = domManager;
        this.gameLogic = gameLogic;
        this.settingsModalManager = settingsModalManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Start game button
        const startBtn = this.domManager.get('startGameBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }

        // Instructions button
        const instructionsBtn = this.domManager.get('instructionsBtn');
        if (instructionsBtn) {
            instructionsBtn.addEventListener('click', () => this.showInstructions());
        }

        // Settings button
        const settingsBtn = this.domManager.get('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }

        // Close instructions button
        const closeBtn = this.domManager.get('closeInstructionsBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideInstructions());
        }

        // Start from instructions button
        const startFromInstructionsBtn = this.domManager.get('startFromInstructionsBtn');
        if (startFromInstructionsBtn) {
            startFromInstructionsBtn.addEventListener('click', () => {
                this.hideInstructions();
                this.startGame();
            });
        }

        // Close modal when clicking outside
        const modal = this.domManager.get('instructionsModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideInstructions();
                }
            });
        }

        // Close settings modal when clicking outside
        const settingsModal = this.domManager.get('settingsModal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    this.settingsModalManager.hideSettings();
                }
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideInstructions();
                this.settingsModalManager.hideSettings();
            }
        });
    }

    startGame() {
        if (this.gameLogic) {
            // Get selected difficulty
            const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
            let selectedDifficulty = 'easy'; // default

            for (const radio of difficultyRadios) {
                if (radio.checked) {
                    selectedDifficulty = radio.value;
                    break;
                }
            }

            // Map difficulty to starting level
            const difficultyMapping = {
                'easy': 1,
                'medium': 3,
                'hard': 5
            };

            const startingLevel = difficultyMapping[selectedDifficulty] || 1;
            GameUtils.log(`Selected difficulty: ${selectedDifficulty}, starting at level ${startingLevel}`);

            this.gameLogic.startGame(startingLevel);
        }
    }

    showInstructions() {
        this.domManager.showInstructionsModal();
    }

    hideInstructions() {
        this.domManager.hideInstructionsModal();
    }

    showSettings() {
        if (this.settingsModalManager) {
            this.settingsModalManager.showSettings();
        }
    }
}

/* =============================================
   REWARD SHOP SYSTEM
   ============================================= */
class RewardShop {
    constructor(gameState, domManager, gameLogic) {
        this.gameState = gameState;
        this.domManager = domManager;
        this.gameLogic = gameLogic;
        this.clockCoins = 0;
        this.initializeShop();
    }

    initializeShop() {
        this.setupEventListeners();
        this.setupMobileToggle();
        this.updateClockCoinDisplay();
        this.updateShopAvailability();

        // Ensure tablets get the full reward shop experience
        this.ensureTabletRewardShopVisibility();
    }

    setupEventListeners() {
        const shopItems = document.querySelectorAll('.shop-item');
        shopItems.forEach(item => {
            // Enhanced mobile support for shop item clicks
            const handlePurchaseClick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Add visual feedback for mobile interaction
                item.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    item.style.transform = '';
                }, 150);

                // Add haptic feedback for mobile devices
                if (navigator.vibrate && window.innerWidth <= 600) {
                    navigator.vibrate(30);
                }

                this.handlePurchase(item);
            };

            // Add both click and touchend events for better mobile support
            item.addEventListener('click', handlePurchaseClick);

            // Enhanced mobile styling
            if (window.innerWidth <= 600) {
                item.style.touchAction = 'manipulation';
                item.style.webkitTapHighlightColor = 'rgba(255, 255, 255, 0.2)';
                item.style.userSelect = 'none';
                item.style.webkitUserSelect = 'none';

                // Add touchend for mobile devices
                item.addEventListener('touchend', handlePurchaseClick);
            }
        });

        GameUtils.log(`📱 Enhanced shop event listeners set up for ${shopItems.length} items`);

        // Close Shop Button Listener
        const closeShopBtn = document.getElementById('close-shop-btn');
        if (closeShopBtn) {
            closeShopBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent bubbling
                this.toggleMobileShop(); // Re-use toggle logic which handles animation/state/timer
            });

            // Touch support
            closeShopBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMobileShop();
            });
        }
    }

    setupMobileToggle() {
        // Universal Shop Toggle Setup (All Devices)
        const mobileToggle = document.getElementById('mobile-shop-toggle');
        const shopItemsContainer = document.getElementById('shop-items-container');

        if (mobileToggle && shopItemsContainer) {
            // Apply initial state only if not set
            if (!mobileToggle.hasAttribute('aria-expanded')) {
                mobileToggle.setAttribute('aria-expanded', 'false');
                shopItemsContainer.setAttribute('aria-hidden', 'true');
            }

            // Ensure toggle is visible (override any legacy hiding)
            mobileToggle.style.display = 'flex';
            mobileToggle.style.removeProperty('visibility');

            // Add interaction listeners if not already present (simple idempotency check handling)
            // We use a custom property on the element to track if listeners are added
            if (!mobileToggle.dataset.hasListeners) {
                const handleToggleClick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleMobileShop();
                };

                mobileToggle.addEventListener('click', handleToggleClick);
                mobileToggle.addEventListener('touchend', handleToggleClick);

                // Keyboard support
                mobileToggle.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.toggleMobileShop();
                    }
                });

                mobileToggle.dataset.hasListeners = 'true';
            }

            // Mobile-specific optimizations
            if (window.innerWidth <= 600) {
                this.optimizeForMobilePhone();
            }

            GameUtils.log('🏪 Shop toggle initialized for current viewport');
        } else {
            GameUtils.warn('Shop toggle elements not found');
        }
    }

    toggleMobileShop() {
        const mobileToggle = document.getElementById('mobile-shop-toggle');
        const shopItemsContainer = document.getElementById('shop-items-container');

        if (!mobileToggle || !shopItemsContainer) {
            GameUtils.warn('📱 Cannot toggle mobile shop - elements not found');
            return;
        }

        const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
        const newState = !isExpanded;

        // Update ARIA attributes
        mobileToggle.setAttribute('aria-expanded', newState.toString());
        shopItemsContainer.setAttribute('aria-hidden', (!newState).toString());

        // Update ARIA label
        mobileToggle.setAttribute('aria-label', newState ? 'Close Reward Shop' : 'Open Reward Shop');

        // Pause/Resume timer based on shop state
        if (this.gameLogic) {
            if (newState) {
                this.gameLogic.pauseTimer();
            } else {
                this.gameLogic.resumeTimer();
            }
        }

        // Add visual feedback for mobile interaction
        if (newState) {
            // Expanding - add expanded styling
            mobileToggle.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
            mobileToggle.style.borderColor = '#4CAF50';
        } else {
            // Collapsing - restore original styling
            setTimeout(() => {
                mobileToggle.style.backgroundColor = '';
                mobileToggle.style.borderColor = '';
            }, 300);
        }

        // Add haptic feedback for mobile devices
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        // Ensure shop items are properly clickable when expanded
        if (newState) {
            setTimeout(() => {
                const shopItems = shopItemsContainer.querySelectorAll('.shop-item');
                shopItems.forEach(item => {
                    item.style.touchAction = 'manipulation';
                    item.style.webkitTapHighlightColor = 'rgba(255, 255, 255, 0.2)';
                });
            }, 100);
        }

        GameUtils.log(`📱 Mobile reward shop ${newState ? 'expanded' : 'collapsed'} - ${shopItemsContainer.querySelectorAll('.shop-item').length} items available`);
    }

    // Mobile phone specific optimizations
    optimizeForMobilePhone() {
        if (window.innerWidth > 600) return;

        GameUtils.log('📱 Applying mobile phone optimizations...');

        // Optimize all touch targets for phone interaction
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.height = '100vh';
            gameContainer.style.height = '100dvh'; // Dynamic viewport height
            gameContainer.style.overflow = 'hidden';
        }

        // Optimize options for perfect mobile interaction
        const options = document.querySelectorAll('.option');
        options.forEach(option => {
            option.style.touchAction = 'manipulation';
            option.style.webkitTapHighlightColor = 'rgba(255, 255, 255, 0.2)';
            option.style.userSelect = 'none';
            option.style.webkitUserSelect = 'none';

            // Enhanced mobile feedback
            option.addEventListener('touchstart', (e) => {
                option.style.transform = 'scale(0.98)';
            }, { passive: true });

            option.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    option.style.transform = '';
                }, 150);
            }, { passive: true });
        });

        // Optimize question panel for mobile reading
        const questionPanel = document.getElementById('question-panel');
        if (questionPanel) {
            questionPanel.style.overflowY = 'hidden';
            questionPanel.style.webkitOverflowScrolling = 'touch';
        }

        // Prevent zoom on mobile
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // Prevent pull-to-refresh
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // Add mobile-specific viewport meta tag if not present
        let viewportMeta = document.querySelector('meta[name="viewport"]');
        if (!viewportMeta) {
            viewportMeta = document.createElement('meta');
            viewportMeta.name = 'viewport';
            document.head.appendChild(viewportMeta);
        }
        viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

        // Add mobile body class for CSS targeting
        document.body.classList.add('mobile-device');

        GameUtils.log('📱 Mobile phone optimizations applied successfully');
    }

    earnClockCoin() {
        this.clockCoins++;
        this.updateClockCoinDisplay();
        this.updateShopAvailability();
        // Feedback is handled by showPointsPopup in handleCorrectAnswer to avoid duplicates
        // this.showCoinEarnedFeedback();
        GameUtils.log(`💰 Earned 1 ClockCoin! Total: ${this.clockCoins}`);
    }

    handlePurchase(shopItem) {
        const cost = parseInt(shopItem.dataset.cost);
        const effect = shopItem.dataset.effect;
        const value = shopItem.dataset.value ? parseInt(shopItem.dataset.value) : null;
        const itemName = shopItem.querySelector('.item-name').textContent;

        if (this.clockCoins < cost) {
            this.showPurchaseFeedback('Not enough ClockCoins!', 'error');
            this.highlightInsufficientFunds(shopItem);
            return;
        }

        // Deduct coins
        this.clockCoins -= cost;
        this.updateClockCoinDisplay();
        this.updateShopAvailability();

        // Apply effect
        this.applyPurchaseEffect(effect, value);

        // Show success feedback
        this.showPurchaseFeedback(`${itemName} purchased!`, 'success');
        this.animatePurchase(shopItem);

        GameUtils.log(`🛒 Purchased ${itemName} for ${cost} ClockCoins`);
    }

    applyPurchaseEffect(effect, value) {
        switch (effect) {
            case 'time':
                this.addExtraTime(60); // Add 1 minute (60 seconds)
                break;
            case 'points':
                this.addPoints(value);
                break;
            case 'life':
                this.addExtraLife();
                break;
        }
    }

    addExtraTime(seconds) {
        if (this.gameState) {
            this.gameState.addTime(seconds);
            this.gameLogic.updateTimerDisplay();
            GameUtils.log(`⏰ Added ${seconds} seconds to timer`);
        }
    }

    addPoints(points) {
        this.gameState.points += points;
        this.gameLogic.updatePointsDisplay();
        this.gameLogic.updateTotalScoreDisplay();
        this.domManager.showPointsPopup(points);
        GameUtils.log(`⭐ Added ${points} points to score. New total: ${this.gameState.points}`);

        // Check for level up after purchasing points
        this.checkForLevelUp();
    }

    checkForLevelUp() {
        if (this.gameState.shouldLevelUp()) {
            const previousLevel = this.gameState.getCurrentLevel();
            const leveledUp = this.gameState.levelUp();
            if (leveledUp) {
                const newLevel = this.gameState.getCurrentLevel();
                GameUtils.log(`🎉 Level up triggered by ClockCoin purchase! Moving to level ${this.gameState.currentLevel}`);

                // Update displays to reflect the new level
                this.gameLogic.updateAllDisplays();
                this.domManager.updateClockStatus(`Level ${this.gameState.currentLevel} Unlocked! 🎉`);

                // Show level transition modal if level transition manager is available
                if (this.gameLogic.levelTransitionManager) {
                    // Delay to allow purchase feedback to show first
                    setTimeout(() => {
                        this.gameLogic.levelTransitionManager.showLevelTransition(previousLevel, newLevel, this.gameState);
                    }, 1500);
                }
            }
        }
    }

    addExtraLife() {
        const maxStars = this.gameState.settingsManager.getMaxStars();
        if (this.gameState.stars < maxStars) {
            this.gameState.stars++;
            this.gameLogic.updateProgressDisplay();
            GameUtils.log(`❤️ Added 1 extra life`);
        } else {
            // Convert to points if at max lives
            this.addPoints(50);
            GameUtils.log(`❤️ Max lives reached - converted to 50 points instead`);
        }
    }

    updateClockCoinDisplay() {
        // Update desktop/tablet display
        const coinDisplay = document.getElementById('clockcoin-amount');
        if (coinDisplay) {
            coinDisplay.textContent = this.clockCoins;
            this.animateClockCoinUpdate(coinDisplay);
        }

        // Update mobile display (phone consoles only)
        const mobileCoinDisplay = document.getElementById('mobile-clockcoin-amount');
        if (mobileCoinDisplay) {
            mobileCoinDisplay.textContent = this.clockCoins;
            this.animateClockCoinUpdate(mobileCoinDisplay);
        }
    }

    updateShopAvailability() {
        const shopItems = document.querySelectorAll('.shop-item');
        shopItems.forEach(item => {
            const cost = parseInt(item.dataset.cost);
            if (this.clockCoins < cost) {
                item.classList.add('insufficient-funds');
            } else {
                item.classList.remove('insufficient-funds');
            }
        });
    }

    showPurchaseFeedback(message, type) {
        const feedback = document.getElementById('purchase-feedback');
        const feedbackText = document.getElementById('feedback-text');

        if (feedback && feedbackText) {
            feedbackText.textContent = message;
            feedback.className = `purchase-feedback ${type}`;

            // Show feedback
            setTimeout(() => {
                feedback.classList.remove('hidden');
            }, 50);

            // Hide after delay
            setTimeout(() => {
                feedback.classList.add('hidden');
            }, 3000);
        }
    }

    showCoinEarnedFeedback() {
        // Create temporary coin popup
        const popup = document.createElement('div');
        popup.className = 'coin-popup';
        popup.innerHTML = '<span class="coin-icon">🪙</span><span>+1</span>';
        popup.style.cssText = `
            position: fixed;
            top: 20%;
            right: 20px;
            background: rgba(255, 215, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-weight: bold;
            z-index: 10000;
            animation: coinPopup 2s ease-out forwards;
            box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
            border: 2px solid rgba(255, 215, 0, 0.6);
        `;

        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 2000);
    }

    animateClockCoinUpdate(element) {
        element.style.transform = 'scale(1.2)';
        element.style.color = '#FFD700';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 300);
    }

    animateScoreUpdate(element) {
        element.style.transform = 'scale(1.15)';
        element.style.color = '#4CAF50';
        element.style.fontWeight = 'bold';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '';
            element.style.fontWeight = '';
        }, 400);
    }

    animatePurchase(shopItem) {
        shopItem.style.transform = 'scale(0.95)';
        shopItem.style.background = 'rgba(76, 175, 80, 0.3)';
        setTimeout(() => {
            shopItem.style.transform = '';
            shopItem.style.background = '';
        }, 500);
    }

    highlightInsufficientFunds(shopItem) {
        shopItem.style.background = 'rgba(244, 67, 54, 0.2)';
        shopItem.style.borderColor = 'rgba(244, 67, 54, 0.5)';
        setTimeout(() => {
            shopItem.style.background = '';
            shopItem.style.borderColor = '';
        }, 1000);
    }

    resetClockCoins() {
        this.clockCoins = 0;
        this.updateClockCoinDisplay();
        this.updateShopAvailability();
    }

    getClockCoins() {
        return this.clockCoins;
    }

    // Ensure tablets and desktops always show the full reward shop
    ensureTabletRewardShopVisibility() {
        // Disabled: We now use the toggle button for all screen sizes per user request
        // This method is kept empty to preserve the interface if called elsewhere
    }

    // Handle window resize to ensure proper mobile/tablet/desktop display
    handleResize() {
        // Re-setup reward shop display based on current screen size
        this.setupMobileToggle();

        // Additional logging for debugging
        if (window.innerWidth <= 600) {
            GameUtils.log('📱 Resized to phone console - mobile toggle active');
        } else if (window.innerWidth <= 1024) {
            GameUtils.log('📱 Resized to tablet console - full reward shop active');
        } else {
            GameUtils.log('💻 Resized to desktop console - full reward shop active');
        }
    }
}

/* =============================================
   HIGH SCORE MANAGER
   ============================================= */
class HighScoreManager {
    constructor() {
        this.LEADERBOARD_KEY = 'analogClockGame_leaderboard';
        this.HIGH_SCORE_KEY = 'analogClockGame_highScore'; // Legacy key
        this.leaderboard = this.loadLeaderboard();
        this.highScoreElement = null;
        this.initializeDisplay();
    }

    loadLeaderboard() {
        try {
            const stored = localStorage.getItem(this.LEADERBOARD_KEY);
            if (stored) {
                return JSON.parse(stored);
            }

            // Migration: Check for legacy high score
            const legacyScore = localStorage.getItem(this.HIGH_SCORE_KEY);
            if (legacyScore) {
                const score = parseInt(legacyScore, 10);
                if (score > 0) {
                    const initialLeaderboard = [{ score: score, date: new Date().toLocaleDateString() }];
                    this.saveLeaderboard(initialLeaderboard);
                    return initialLeaderboard;
                }
            }

            return [];
        } catch (error) {
            GameUtils.warn('Failed to load leaderboard:', error);
            return [];
        }
    }

    saveLeaderboard(leaderboard) {
        try {
            localStorage.setItem(this.LEADERBOARD_KEY, JSON.stringify(leaderboard));
            // Keep legacy key updated with top score for safety
            if (leaderboard.length > 0) {
                localStorage.setItem(this.HIGH_SCORE_KEY, leaderboard[0].score.toString());
            }
        } catch (error) {
            GameUtils.error('Failed to save leaderboard:', error);
        }
    }

    getLeaderboard() {
        return this.leaderboard;
    }

    checkAndUpdateHighScore(currentScore) {
        const entry = {
            score: currentScore,
            date: new Date().toLocaleDateString()
        };

        // Add new score
        const newLeaderboard = [...this.leaderboard, entry];

        // Sort descending
        newLeaderboard.sort((a, b) => b.score - a.score);

        // Keep top 3
        const top3 = newLeaderboard.slice(0, 3);

        // Check if we have a new record (current score makes it into the list)
        // We compare against the *previous* leaderboard state
        const isNewRecord = this.leaderboard.length < 3 || currentScore > this.leaderboard[this.leaderboard.length - 1].score;
        const isTopScore = top3.length > 0 && currentScore === top3[0].score;

        if (JSON.stringify(top3) !== JSON.stringify(this.leaderboard)) {
            this.leaderboard = top3;
            this.saveLeaderboard(this.leaderboard);
            this.updateDisplay();

            if (isTopScore) {
                this.animateNewRecord();
                GameUtils.log(`🏆 NEW HIGH SCORE! Top of the leaderboard: ${currentScore}`);
            } else if (isNewRecord) {
                GameUtils.log(`🥈 New Leaderboard Entry: ${currentScore}`);
            }

            return isNewRecord; // Return true if it made the board
        }

        return false;
    }

    getHighScore() {
        return this.leaderboard.length > 0 ? this.leaderboard[0].score : 0;
    }

    resetHighScore() {
        this.leaderboard = [];
        this.saveLeaderboard([]);
        this.updateDisplay();
        GameUtils.log('Leaderboard reset');
    }

    initializeDisplay() {
        // Find and cache the high score display element
        this.highScoreElement = document.getElementById('high-score-value');
        if (this.highScoreElement) {
            this.updateDisplay();
        } else {
            // If element not found, try again after a short delay
            setTimeout(() => {
                this.highScoreElement = document.getElementById('high-score-value');
                if (this.highScoreElement) {
                    this.updateDisplay();
                }
            }, 100);
        }
    }

    updateDisplay() {
        if (this.highScoreElement) {
            const topScore = this.getHighScore();
            this.highScoreElement.textContent = (typeof topScore === 'number') ? topScore.toLocaleString() : '0';
        }
    }

    animateNewRecord() {
        if (this.highScoreElement) {
            this.highScoreElement.classList.remove('new-record');
            // Force reflow to restart animation
            this.highScoreElement.offsetHeight;
            this.highScoreElement.classList.add('new-record');

            // Show congratulatory message
            this.showNewRecordMessage();
        }
    }

    showNewRecordMessage() {
        // Create and show a temporary high score celebration
        const celebration = document.createElement('div');
        celebration.className = 'high-score-celebration';
        celebration.innerHTML = `
            <div class="celebration-content">
                <div class="celebration-icon">🏆</div>
                <div class="celebration-text">
                    <div class="celebration-title">NEW HIGH SCORE!</div>
                    <div class="celebration-score">${this.formatScore(this.highScore)}</div>
                </div>
            </div>
        `;

        celebration.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.5s ease-out;
        `;

        const content = celebration.querySelector('.celebration-content');
        content.style.cssText = `
            background: linear-gradient(45deg, #FFD700, #FFA500);
            color: white;
            padding: 2rem;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(255, 215, 0, 0.4);
            animation: celebrationBounce 0.6s ease-out;
        `;

        content.querySelector('.celebration-icon').style.cssText = `
            font-size: 4rem;
            margin-bottom: 1rem;
            animation: trophy-spin 2s ease-in-out infinite;
        `;

        content.querySelector('.celebration-title').style.cssText = `
            font-size: 1.8rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        `;

        content.querySelector('.celebration-score').style.cssText = `
            font-size: 2.5rem;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        `;

        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes celebrationBounce {
                0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
                50% { transform: scale(1.1) rotate(5deg); }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes trophy-spin {
                0%, 100% { transform: rotateY(0deg); }
                50% { transform: rotateY(180deg); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(celebration);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            celebration.style.animation = 'fadeOut 0.5s ease-out forwards';
            setTimeout(() => {
                document.body.removeChild(celebration);
                document.head.removeChild(style);
            }, 500);
        }, 3000);

        // Allow clicking to dismiss
        celebration.addEventListener('click', () => {
            celebration.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (document.body.contains(celebration)) {
                    document.body.removeChild(celebration);
                    document.head.removeChild(style);
                }
            }, 300);
        });
    }

    getHighScore() {
        return this.highScore;
    }

    resetHighScore() {
        this.highScore = 0;
        this.saveHighScore(0);
        this.updateDisplay();
        GameUtils.log('High score reset to 0');
    }
}

/* =============================================
   MAIN GAME APPLICATION
   ============================================= */
class AnalogClockGame {
    constructor() {
        this.settingsManager = new SettingsManager();
        this.soundManager = new SoundManager(this.settingsManager);
        this.gameState = new GameState(this.settingsManager);
        this.domManager = new DOMManager();
        this.clockBuilder = new PerfectClockBuilder();
        this.gameLogic = new PerfectGameLogic(this.gameState, this.domManager, this.clockBuilder, this.soundManager);
        this.rewardShop = new RewardShop(this.gameState, this.domManager, this.gameLogic);
        this.levelTransitionManager = new LevelTransitionManager(this.domManager, this.gameLogic);
        this.settingsModalManager = new SettingsModalManager(this.domManager, this.settingsManager, this.gameLogic);
        this.startMenuManager = new StartMenuManager(this.domManager, this.gameLogic, this.settingsModalManager);
        this.highScoreManager = new HighScoreManager();

        // Connect reward shop to game logic
        this.gameLogic.rewardShop = this.rewardShop;

        // Connect sound manager to DOM manager for click sounds
        this.domManager.soundManager = this.soundManager;

        // Connect level transition manager to game logic
        this.gameLogic.levelTransitionManager = this.levelTransitionManager;

        // Connect reward shop to level transition manager
        this.levelTransitionManager.rewardShop = this.rewardShop;

        // Connect high score manager to game logic
        this.gameLogic.highScoreManager = this.highScoreManager;

        this.initialized = false;
        this.isPausedByOrientation = false;
    }

    init() {
        try {
            if (this.initialized) {
                GameUtils.warn('Game already initialized');
                return;
            }

            // Setup orientation listeners
            this.setupOrientationListeners();

            // Apply settings to game configuration
            this.settingsManager.applyToGameConfig();

            this.setupInitialState();

            // Initialize Fullscreen Toggle
            this.setupFullScreenToggle();

            // Test clock hands if in debug mode
            if (GAME_CONFIG.DEBUG) {
                this.testClockFunctionality();
            }

            this.initialized = true;
            GameUtils.log('Analog Clock Game initialized successfully!');

        } catch (error) {
            GameUtils.error('Failed to initialize game:', error);
        }
    }

    setupInitialState() {
        // Show start menu initially
        this.domManager.showStartMenu();

        // Initialize clock to 12:00 - but don't call updateClockHands yet
        // Let the clock stay at its default position until game starts
        this.domManager.updateClockStatusWithLevel(this.gameState);

        // Initialize UI displays
        this.gameLogic.updateAllDisplays();
        this.gameLogic.updateTimerDisplay();

        // Initialize the total score display
        this.domManager.updateTotalScoreDisplay(0);
    }

    testClockFunctionality() {
        GameUtils.log('Running clock functionality test...');
        // Disabled to prevent clock spinning
        // setTimeout(() => {
        //     this.clockBuilder.testHandMovements();
        // }, 2000);
    }

    destroy() {
        this.gameState.clearTimer();
        this.gameState.destroy();
        this.levelTransitionManager = null;
        this.settingsModalManager = null;
        this.startMenuManager = null;
        this.gameLogic = null;
        this.clockBuilder = null;
        this.domManager = null;
        this.settingsManager = null;
        this.initialized = false;
        GameUtils.log('Game destroyed and cleaned up');
    }

    // Public API for external access
    getGameState() {
        return this.gameState;
    }

    getCurrentLevel() {
        return this.gameState.getCurrentLevel();
    }

    isGameActive() {
        return this.gameState.isGameActive;
    }

    // Convenience method to run Level 7 validation test
    testLevel7Accuracy() {
        if (this.clockBuilder && this.clockBuilder.validateLevel7MinuteHand) {
            GameUtils.log('🔍 Running Level 7 minute hand accuracy test...');
            return this.clockBuilder.validateLevel7MinuteHand();
        } else {
            GameUtils.error('Clock builder not available for Level 7 validation');
            return false;
        }
    }

    setupFullScreenToggle() {
        const toggleBtn = document.getElementById('fullscreen-toggle');
        if (!toggleBtn) return;

        toggleBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                // Enter fullscreen
                document.documentElement.requestFullscreen().catch(err => {
                    GameUtils.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                // Exit fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });

        // Update icon based on state
        document.addEventListener('fullscreenchange', () => {
            const icon = toggleBtn.querySelector('.icon');
            if (document.fullscreenElement) {
                icon.textContent = '✖'; // Clear Exit Icon
                toggleBtn.setAttribute('aria-label', 'Exit Fullscreen');
                GameUtils.log('Entered Fullscreen');
            } else {
                icon.textContent = '⛶'; // Restore Expand Icon
                toggleBtn.setAttribute('aria-label', 'Enter Fullscreen');
                GameUtils.log('Exited Fullscreen');
            }
        });
    }

    setupOrientationListeners() {
        // Check orientation on resize and orientation change
        window.addEventListener('resize', () => this.checkOrientation());
        window.addEventListener('orientationchange', () => setTimeout(() => this.checkOrientation(), 100));

        // Initial check
        this.checkOrientation();
    }

    checkOrientation() {
        // Logic should match CSS media query (orientation: portrait)
        const isPortrait = window.innerHeight > window.innerWidth;

        if (isPortrait) {
            if (!this.isPausedByOrientation) {
                this.isPausedByOrientation = true;
                if (this.gameLogic && this.gameState.isGameActive) {
                    this.gameLogic.pauseTimer();
                    GameUtils.log('⏸️ Game paused due to portrait orientation');
                }
            }
        } else {
            if (this.isPausedByOrientation) {
                this.isPausedByOrientation = false;
                if (this.gameLogic && this.gameState.isGameActive) {
                    this.gameLogic.resumeTimer();
                    GameUtils.log('▶️ Game resumed from portrait orientation');
                }
            }
        }
    }
}

/* =============================================
   GAME INITIALIZATION AND STARTUP
   ============================================= */
function initializeGame() {
    const initialize = () => {
        try {
            // Mobile-specific initialization
            if (window.innerWidth <= 600) {
                // Clean up any existing mobile debug panels first
                const existingDebugPanels = document.querySelectorAll('.mobile-debug-info');
                existingDebugPanels.forEach(panel => {
                    if (panel.parentNode) {
                        panel.parentNode.removeChild(panel);
                        GameUtils.log('📱 Cleaned up existing mobile debug panel during initialization');
                    }
                });

                // Prevent zoom on mobile
                document.addEventListener('touchstart', (e) => {
                    if (e.touches.length > 1) {
                        e.preventDefault();
                    }
                }, { passive: false });

                // Prevent double-tap zoom
                let lastTouchEnd = 0;
                document.addEventListener('touchend', (e) => {
                    const now = (new Date()).getTime();
                    if (now - lastTouchEnd <= 300) {
                        e.preventDefault();
                    }
                    lastTouchEnd = now;
                }, { passive: false });

                // Add mobile-specific body class
                document.body.classList.add('mobile-device');

                // AGGRESSIVE MOBILE SETUP: Force game container visibility
                setTimeout(() => {
                    const gameContainer = document.getElementById('game-container');
                    const optionsContainer = document.getElementById('options');

                    if (gameContainer) {
                        gameContainer.style.display = 'flex';
                        gameContainer.style.flexDirection = 'column';
                        gameContainer.style.width = '100vw';
                        gameContainer.style.height = '100vh';
                        gameContainer.style.position = 'fixed';
                        gameContainer.style.top = '0';
                        gameContainer.style.left = '0';
                        gameContainer.style.zIndex = '1000';
                        gameContainer.style.background = 'transparent';
                        gameContainer.style.overflow = 'hidden';

                        GameUtils.log('MOBILE: Applied aggressive game container styling');
                    }

                    if (optionsContainer) {
                        optionsContainer.style.display = 'block';
                        optionsContainer.style.minHeight = '200px';
                        optionsContainer.style.width = '100%';
                        optionsContainer.style.padding = '10px';
                        optionsContainer.style.margin = '10px 0';
                        optionsContainer.style.background = 'transparent';
                        optionsContainer.style.border = 'none';
                        optionsContainer.style.boxSizing = 'border-box';
                        optionsContainer.style.overflow = 'visible';
                        optionsContainer.style.position = 'relative';
                        optionsContainer.style.zIndex = '1001';

                        GameUtils.log('MOBILE: Applied aggressive options container styling');
                    }
                }, 100);

                GameUtils.log('Mobile-specific optimizations applied');
            }

            // Create global game instance
            window.analogClockGame = new AnalogClockGame();
            window.analogClockGame.init();

            // Mobile viewport adjustment
            if (window.innerWidth <= 600) {
                setTimeout(() => {
                    // Force layout recalculation after initialization
                    const gameContainer = document.getElementById('game-container');
                    if (gameContainer) {
                        gameContainer.style.height = '100vh';
                        gameContainer.style.height = '100dvh';
                        gameContainer.offsetHeight; // Force reflow
                    }
                }, 100);
            }

            GameUtils.log('Game initialization completed successfully');

        } catch (error) {
            GameUtils.error('Critical error during game initialization:', error);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
}

// Auto-initialize the game when script loads
initializeGame();

// Handle page cleanup
window.addEventListener('beforeunload', () => {
    if (window.analogClockGame) {
        window.analogClockGame.destroy();
        window.analogClockGame = null;
    }
});

// Handle page visibility change for better performance
document.addEventListener('visibilitychange', () => {
    if (window.analogClockGame && window.analogClockGame.isGameActive()) {
        if (document.hidden) {
            // Pause the game when page is hidden
            GameUtils.log('Page hidden - game performance optimized');
        } else {
            // Resume when page becomes visible
            GameUtils.log('Page visible - game resumed');
        }
    }
});

// Handle window resize for mobile reward shop toggle
window.addEventListener('resize', () => {
    if (window.analogClockGame && window.analogClockGame.rewardShop) {
        window.analogClockGame.rewardShop.handleResize();
    }
});

// Expose utilities for debugging (in debug mode only)
if (GAME_CONFIG.DEBUG) {
    window.GameUtils = GameUtils;
    window.GAME_CONFIG = GAME_CONFIG;
    window.VISUAL_CONFIG = VISUAL_CONFIG;

    // Enhanced debugging features for randomness system
    window.debugRandomness = function () {
        if (window.analogClockGame && window.analogClockGame.gameState) {
            const stats = window.analogClockGame.gameState.getRandomnessStats();
            console.log('=== RANDOMNESS SYSTEM STATISTICS ===');
            console.log('Session Questions Count:', stats.sessionQuestionsCount);
            console.log('Format Weights:', stats.formatWeights);
            console.log('Recent Patterns:', stats.recentPatterns);
            console.log('Crypto Support:', stats.cryptoSupport);
            console.log('=====================================');
            return stats;
        } else {
            console.log('Game not initialized or active');
            return null;
        }
    };

    window.resetRandomness = function () {
        if (window.analogClockGame && window.analogClockGame.gameState) {
            window.analogClockGame.gameState.randomnessManager.resetSession();
            console.log('Randomness system reset');
        } else {
            console.log('Game not initialized');
        }
    };

    // Level 7 validation test
    window.testLevel7 = function () {
        if (window.analogClockGame) {
            return window.analogClockGame.testLevel7Accuracy();
        } else {
            console.log('Game not initialized');
            return false;
        }
    };

    // ✨ ANTI-RAPID-CLICK SYSTEM: Test rapid clicking prevention
    window.testRapidClickPrevention = function () {
        if (!window.analogClockGame || !window.analogClockGame.gameLogic) {
            console.log('Game not initialized or active');
            return false;
        }

        const gameLogic = window.analogClockGame.gameLogic;
        console.log('🧪 TESTING RAPID CLICK PREVENTION SYSTEM');
        console.log('========================================');

        // Test 1: Check processing state initialization
        console.log(`1️⃣ Processing state initialized: ${gameLogic.isProcessingAnswer === false ? '✅ PASS' : '❌ FAIL'}`);

        // Test 2: Simulate rapid clicks
        let clickCount = 0;
        let blockedClicks = 0;

        const originalLog = GameUtils.log;
        GameUtils.log = function (...args) {
            const message = args.join(' ');
            if (message.includes('🚫 Answer processing in progress')) {
                blockedClicks++;
            }
            originalLog(...args);
        };

        // Simulate 10 rapid clicks
        console.log('2️⃣ Simulating 10 rapid clicks...');
        for (let i = 0; i < 10; i++) {
            clickCount++;
            gameLogic.checkAnswer('test');
        }

        // Restore original log function
        GameUtils.log = originalLog;

        console.log(`   Total clicks: ${clickCount}`);
        console.log(`   Blocked clicks: ${blockedClicks}`);
        console.log(`   Result: ${blockedClicks >= 9 ? '✅ PASS - Rapid clicks properly blocked' : '❌ FAIL - Some rapid clicks got through'}`);

        // Test 3: Check options are disabled
        const options = document.querySelectorAll('#options .option');
        const disabledOptions = document.querySelectorAll('#options .option.disabled');
        console.log(`3️⃣ Options disabled: ${options.length > 0 && disabledOptions.length === options.length ? '✅ PASS' : '❌ FAIL'}`);

        // Test 4: Check processing state is locked
        console.log(`4️⃣ Processing state locked: ${gameLogic.isProcessingAnswer === true ? '✅ PASS' : '❌ FAIL'}`);

        // Reset for next test
        gameLogic.isProcessingAnswer = false;
        gameLogic.answerProcessingStartTime = null;
        if (window.analogClockGame.domManager.enableAllOptions) {
            window.analogClockGame.domManager.enableAllOptions();
        }

        console.log('========================================');
        console.log('🧪 Test completed - system reset for normal gameplay');

        return {
            passed: blockedClicks >= 9,
            totalClicks: clickCount,
            blockedClicks: blockedClicks,
            optionsDisabled: disabledOptions.length === options.length
        };
    };

    // Mobile debugging function
    window.debugMobile = function () {
        console.log('=== MOBILE DEBUG INFORMATION ===');
        console.log('Screen size:', window.innerWidth + 'x' + window.innerHeight);
        console.log('Is mobile:', window.innerWidth <= 600);
        console.log('User agent:', navigator.userAgent);

        const gameContainer = document.getElementById('game-container');
        const optionsContainer = document.getElementById('options');
        const options = document.querySelectorAll('#options .option');

        console.log('Game container:', gameContainer ? 'Found' : 'Missing');
        if (gameContainer) {
            const style = window.getComputedStyle(gameContainer);
            console.log('  Display:', style.display);
            console.log('  Visibility:', style.visibility);
            console.log('  Position:', style.position);
            console.log('  Z-index:', style.zIndex);
        }

        console.log('Options container:', optionsContainer ? 'Found' : 'Missing');
        if (optionsContainer) {
            const style = window.getComputedStyle(optionsContainer);
            console.log('  Display:', style.display);
            console.log('  Visibility:', style.visibility);
            console.log('  Height:', style.height);
            console.log('  Width:', style.width);
            console.log('  Position:', style.position);
            console.log('  Z-index:', style.zIndex);
            console.log('  Background:', style.background);
            console.log('  Border:', style.border);
        }

        console.log('Options found:', options.length);
        options.forEach((option, index) => {
            const style = window.getComputedStyle(option);
            console.log(`  Option ${index + 1}:`, option.textContent);
            console.log(`    Display: ${style.display}`);
            console.log(`    Visibility: ${style.visibility}`);
            console.log(`    Height: ${style.height}`);
            console.log(`    Width: ${style.width}`);
        });

        console.log('Mobile classes:', document.body.className);

        // Mobile reward shop debug
        const mobileToggle = document.getElementById('mobile-shop-toggle');
        const shopItemsContainer = document.getElementById('shop-items-container');
        const desktopHeader = document.querySelector('.desktop-shop-header');

        console.log('--- MOBILE REWARD SHOP DEBUG ---');
        console.log('Mobile toggle:', mobileToggle ? 'Found' : 'Missing');
        if (mobileToggle) {
            const style = window.getComputedStyle(mobileToggle);
            console.log('  Display:', style.display);
            console.log('  Visibility:', style.visibility);
            console.log('  Expanded:', mobileToggle.getAttribute('aria-expanded'));
            console.log('  Touch Action:', style.touchAction);
            console.log('  User Select:', style.userSelect);
        }

        console.log('Shop items container:', shopItemsContainer ? 'Found' : 'Missing');
        if (shopItemsContainer) {
            const style = window.getComputedStyle(shopItemsContainer);
            console.log('  Max-height:', style.maxHeight);
            console.log('  Opacity:', style.opacity);
            console.log('  Hidden:', shopItemsContainer.getAttribute('aria-hidden'));

            const shopItems = shopItemsContainer.querySelectorAll('.shop-item');
            console.log('  Shop items found:', shopItems.length);
            shopItems.forEach((item, index) => {
                const itemStyle = window.getComputedStyle(item);
                console.log(`    Item ${index + 1}: ${item.querySelector('.item-name')?.textContent || 'Unknown'}`);
                console.log(`      Touch Action: ${itemStyle.touchAction}`);
                console.log(`      User Select: ${itemStyle.userSelect}`);
            });
        }

        console.log('Desktop header:', desktopHeader ? 'Found' : 'Missing');
        if (desktopHeader) {
            const style = window.getComputedStyle(desktopHeader);
            console.log('  Display:', style.display);
        }

        // Check for mobile debug panels (should be none)
        const debugPanels = document.querySelectorAll('.mobile-debug-info');
        console.log('Mobile debug panels found:', debugPanels.length, '(should be 0)');

        console.log('================================');

        // Force emergency fallback if no options visible
        if (window.innerWidth <= 600 && options.length === 0) {
            console.log('ACTIVATING EMERGENCY FALLBACK...');
            if (window.analogClockGame && window.analogClockGame.domManager) {
                window.analogClockGame.domManager.activateMobileEmergencyFallback();
            }
        }

        return {
            isMobile: window.innerWidth <= 600,
            gameContainer: !!gameContainer,
            optionsContainer: !!optionsContainer,
            optionsCount: options.length,
            mobileShopToggle: !!mobileToggle,
            shopItemsContainer: !!shopItemsContainer,
            debugPanelsFound: debugPanels.length
        };
    };

    // Test tablet reward shop visibility
    window.testTabletShop = function () {
        if (window.innerWidth <= 600) {
            console.log('❌ Not on a tablet/desktop - this test is for larger screens');
            return false;
        }

        if (!window.analogClockGame || !window.analogClockGame.rewardShop) {
            console.log('❌ Game not initialized');
            return false;
        }

        console.log('🧪 TESTING TABLET/DESKTOP REWARD SHOP VISIBILITY');
        console.log('================================================');

        const mobileToggle = document.getElementById('mobile-shop-toggle');
        const shopItemsContainer = document.getElementById('shop-items-container');
        const desktopHeader = document.querySelector('.desktop-shop-header');
        const rewardShopPanel = document.getElementById('reward-shop-panel');

        console.log(`1️⃣ Screen size: ${window.innerWidth}px (${window.innerWidth <= 1024 ? 'tablet' : 'desktop'})`);

        // Test mobile toggle is hidden
        const toggleHidden = !mobileToggle || window.getComputedStyle(mobileToggle).display === 'none';
        console.log(`2️⃣ Mobile toggle hidden: ${toggleHidden ? '✅ PASS' : '❌ FAIL'}`);

        // Test desktop header is visible
        const headerVisible = desktopHeader && window.getComputedStyle(desktopHeader).display !== 'none';
        console.log(`3️⃣ Desktop header visible: ${headerVisible ? '✅ PASS' : '❌ FAIL'}`);

        // Test shop items container is visible
        const containerVisible = shopItemsContainer &&
            window.getComputedStyle(shopItemsContainer).opacity === '1' &&
            window.getComputedStyle(shopItemsContainer).visibility !== 'hidden';
        console.log(`4️⃣ Shop items container visible: ${containerVisible ? '✅ PASS' : '❌ FAIL'}`);

        // Test shop items are visible
        const shopItems = document.querySelectorAll('.shop-item');
        const itemsVisible = shopItems.length > 0 &&
            Array.from(shopItems).every(item =>
                window.getComputedStyle(item).display !== 'none');
        console.log(`5️⃣ Shop items visible: ${itemsVisible ? '✅ PASS' : '❌ FAIL'} (${shopItems.length} items)`);

        // Test reward shop panel is visible
        const panelVisible = rewardShopPanel && window.getComputedStyle(rewardShopPanel).display !== 'none';
        console.log(`6️⃣ Reward shop panel visible: ${panelVisible ? '✅ PASS' : '❌ FAIL'}`);

        console.log('================================================');

        const allPassed = toggleHidden && headerVisible && containerVisible && itemsVisible && panelVisible;
        console.log(`🎯 Overall result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

        if (!allPassed) {
            console.log('🔧 Attempting to force tablet reward shop visibility...');
            window.analogClockGame.rewardShop.ensureTabletRewardShopVisibility();
        }

        return {
            screenSize: window.innerWidth,
            deviceType: window.innerWidth <= 1024 ? 'tablet' : 'desktop',
            toggleHidden,
            headerVisible,
            containerVisible,
            itemsVisible,
            panelVisible,
            allPassed
        };
    };

    // Test comprehensive mobile phone functionality
    window.testMobilePhone = function () {
        if (window.innerWidth > 600) {
            console.log('❌ Not on a phone console - mobile tests not applicable');
            console.log(`📱 Current screen width: ${window.innerWidth}px (needs ≤600px for phone)`);
            return false;
        }

        console.log('🧪 TESTING COMPREHENSIVE MOBILE PHONE FUNCTIONALITY');
        console.log('===================================================');

        let testResults = {
            screenSize: false,
            gameContainer: false,
            mobileShopToggle: false,
            optionsLayout: false,
            touchOptimization: false,
            viewportOptimization: false,
            overallSuccess: false
        };

        // Test 1: Screen size validation
        testResults.screenSize = window.innerWidth <= 600;
        console.log(`1️⃣ Screen size test: ${window.innerWidth}px`);
        console.log(`   Expected: ≤600px for phone console`);
        console.log(`   Result: ${testResults.screenSize ? '✅ PASS' : '❌ FAIL'}`);

        // Test 2: Game container optimization
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            const containerStyle = window.getComputedStyle(gameContainer);
            testResults.gameContainer = containerStyle.flexDirection === 'column' &&
                containerStyle.height.includes('100') &&
                containerStyle.overflow === 'hidden';
            console.log(`2️⃣ Game container optimization:`);
            console.log(`   Flex direction: ${containerStyle.flexDirection} (expected: column)`);
            console.log(`   Height: ${containerStyle.height} (expected: 100vh/100dvh)`);
            console.log(`   Overflow: ${containerStyle.overflow} (expected: hidden)`);
            console.log(`   Result: ${testResults.gameContainer ? '✅ PASS' : '❌ FAIL'}`);
        }

        // Test 3: Mobile shop toggle functionality
        const mobileToggle = document.getElementById('mobile-shop-toggle');
        const shopItemsContainer = document.getElementById('shop-items-container');
        if (mobileToggle && shopItemsContainer) {
            const initialExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
            const initialHidden = shopItemsContainer.getAttribute('aria-hidden') === 'true';
            const hasProperStyling = mobileToggle.style.touchAction === 'manipulation';

            testResults.mobileShopToggle = !initialExpanded && initialHidden && hasProperStyling;
            console.log(`3️⃣ Mobile shop toggle test:`);
            console.log(`   Initial state: expanded=${initialExpanded}, hidden=${initialHidden}`);
            console.log(`   Touch optimization: ${hasProperStyling}`);
            console.log(`   Result: ${testResults.mobileShopToggle ? '✅ PASS' : '❌ FAIL'}`);
        }

        // Test 4: Options layout optimization
        const optionsContainer = document.getElementById('options');
        if (optionsContainer) {
            const optionsStyle = window.getComputedStyle(optionsContainer);
            const gridColumns = optionsStyle.gridTemplateColumns;
            const isSingleColumn = gridColumns.includes('1fr') && !gridColumns.includes('1fr 1fr');

            testResults.optionsLayout = isSingleColumn;
            console.log(`4️⃣ Options layout test:`);
            console.log(`   Grid template columns: ${gridColumns}`);
            console.log(`   Expected: Single column (1fr) for phone`);
            console.log(`   Result: ${testResults.optionsLayout ? '✅ PASS' : '❌ FAIL'}`);
        }

        // Test 5: Touch optimization for options
        const options = document.querySelectorAll('.option');
        let touchOptimizedCount = 0;
        options.forEach(option => {
            if (option.style.touchAction === 'manipulation' &&
                option.style.userSelect === 'none') {
                touchOptimizedCount++;
            }
        });

        testResults.touchOptimization = touchOptimizedCount === options.length && options.length >= 4;
        console.log(`5️⃣ Touch optimization test:`);
        console.log(`   Total options: ${options.length}`);
        console.log(`   Touch optimized: ${touchOptimizedCount}`);
        console.log(`   Expected: All 4 options optimized`);
        console.log(`   Result: ${testResults.touchOptimization ? '✅ PASS' : '❌ FAIL'}`);

        // Test 6: Viewport optimization
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        const hasMobileClass = document.body.classList.contains('mobile-device');
        const viewportOptimized = viewportMeta &&
            viewportMeta.content.includes('user-scalable=no') &&
            viewportMeta.content.includes('viewport-fit=cover');

        testResults.viewportOptimization = viewportOptimized && hasMobileClass;
        console.log(`6️⃣ Viewport optimization test:`);
        console.log(`   Viewport meta: ${viewportOptimized ? 'Properly configured' : 'Missing or incomplete'}`);
        console.log(`   Mobile body class: ${hasMobileClass}`);
        console.log(`   Result: ${testResults.viewportOptimization ? '✅ PASS' : '❌ FAIL'}`);

        // Overall success calculation
        testResults.overallSuccess = Object.values(testResults).slice(0, -1).every(test => test);

        console.log('📊 MOBILE PHONE TEST SUMMARY:');
        console.log('============================');
        console.log(`Screen Size: ${testResults.screenSize ? '✅' : '❌'}`);
        console.log(`Game Container: ${testResults.gameContainer ? '✅' : '❌'}`);
        console.log(`Mobile Shop Toggle: ${testResults.mobileShopToggle ? '✅' : '❌'}`);
        console.log(`Options Layout: ${testResults.optionsLayout ? '✅' : '❌'}`);
        console.log(`Touch Optimization: ${testResults.touchOptimization ? '✅' : '❌'}`);
        console.log(`Viewport Optimization: ${testResults.viewportOptimization ? '✅' : '❌'}`);
        console.log(`OVERALL: ${testResults.overallSuccess ? '🎉 SUCCESS' : '❌ NEEDS IMPROVEMENT'}`);

        return testResults;
    };

    // Test mobile reward shop toggle (legacy function for backward compatibility)
    window.testMobileShop = function () {
        if (window.innerWidth > 600) {
            console.log('❌ Not on a phone console - mobile shop toggle not available');
            console.log('💡 Use testTabletShop() for tablet/desktop testing');
            console.log('💡 Use testMobilePhone() for comprehensive mobile testing');
            return false;
        }

        if (!window.analogClockGame || !window.analogClockGame.rewardShop) {
            console.log('❌ Game not initialized');
            return false;
        }

        console.log('🧪 TESTING ENHANCED MOBILE REWARD SHOP TOGGLE');
        console.log('==============================================');

        const mobileToggle = document.getElementById('mobile-shop-toggle');
        const shopItemsContainer = document.getElementById('shop-items-container');

        if (!mobileToggle || !shopItemsContainer) {
            console.log('❌ Mobile shop elements not found');
            return false;
        }

        // Test initial state
        const initialExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
        const initialHidden = shopItemsContainer.getAttribute('aria-hidden') === 'true';

        console.log(`1️⃣ Initial state: expanded=${initialExpanded}, hidden=${initialHidden}`);
        console.log(`   Expected: expanded=false, hidden=true`);
        console.log(`   Result: ${!initialExpanded && initialHidden ? '✅ PASS' : '❌ FAIL'}`);

        // Test mobile enhancements
        console.log('2️⃣ Testing mobile enhancements...');
        const toggleStyle = window.getComputedStyle(mobileToggle);
        const hasTouchAction = toggleStyle.touchAction === 'manipulation';
        const hasUserSelect = toggleStyle.userSelect === 'none' || toggleStyle.webkitUserSelect === 'none';

        console.log(`   Touch action: ${toggleStyle.touchAction} (${hasTouchAction ? '✅ PASS' : '❌ FAIL'})`);
        console.log(`   User select: ${toggleStyle.userSelect} (${hasUserSelect ? '✅ PASS' : '❌ FAIL'})`);

        // Test toggle functionality
        console.log('3️⃣ Testing toggle functionality...');
        window.analogClockGame.rewardShop.toggleMobileShop();

        const afterToggleExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
        const afterToggleHidden = shopItemsContainer.getAttribute('aria-hidden') === 'true';

        console.log(`   After toggle: expanded=${afterToggleExpanded}, hidden=${afterToggleHidden}`);
        console.log(`   Expected: expanded=true, hidden=false`);
        console.log(`   Result: ${afterToggleExpanded && !afterToggleHidden ? '✅ PASS' : '❌ FAIL'}`);

        // Test shop items enhancement
        console.log('4️⃣ Testing shop items enhancement...');
        const shopItems = shopItemsContainer.querySelectorAll('.shop-item');
        let itemsEnhanced = 0;

        shopItems.forEach((item, index) => {
            const itemStyle = window.getComputedStyle(item);
            const hasItemTouchAction = itemStyle.touchAction === 'manipulation';
            const hasItemUserSelect = itemStyle.userSelect === 'none' || itemStyle.webkitUserSelect === 'none';

            if (hasItemTouchAction && hasItemUserSelect) {
                itemsEnhanced++;
            }

            console.log(`   Item ${index + 1}: touch=${hasItemTouchAction}, select=${hasItemUserSelect}`);
        });

        const allItemsEnhanced = itemsEnhanced === shopItems.length;
        console.log(`   Enhanced items: ${itemsEnhanced}/${shopItems.length} (${allItemsEnhanced ? '✅ PASS' : '❌ FAIL'})`);

        // Test toggle back
        console.log('5️⃣ Testing toggle back...');
        window.analogClockGame.rewardShop.toggleMobileShop();

        const afterSecondToggleExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
        const afterSecondToggleHidden = shopItemsContainer.getAttribute('aria-hidden') === 'true';

        console.log(`   After second toggle: expanded=${afterSecondToggleExpanded}, hidden=${afterSecondToggleHidden}`);
        console.log(`   Expected: expanded=false, hidden=true`);
        console.log(`   Result: ${!afterSecondToggleExpanded && afterSecondToggleHidden ? '✅ PASS' : '❌ FAIL'}`);

        console.log('==============================================');
        console.log('🧪 Enhanced mobile reward shop toggle test completed');

        return {
            initialStateCorrect: !initialExpanded && initialHidden,
            mobileEnhancementsApplied: hasTouchAction && hasUserSelect,
            toggleWorking: afterToggleExpanded && !afterToggleHidden,
            shopItemsEnhanced: allItemsEnhanced,
            toggleBackWorking: !afterSecondToggleExpanded && afterSecondToggleHidden,
            overallSuccess: !initialExpanded && initialHidden && hasTouchAction && hasUserSelect &&
                afterToggleExpanded && !afterToggleHidden && allItemsEnhanced &&
                !afterSecondToggleExpanded && afterSecondToggleHidden
        };
    };

    // Font consistency test
    window.testFonts = function () {
        if (window.analogClockGame && window.analogClockGame.clockBuilder) {
            const numbersGroup = document.getElementById('clock-numbers');
            if (numbersGroup) {
                const textElements = numbersGroup.querySelectorAll('text');
                console.log('📝 CLOCK FONT ANALYSIS:');
                console.log(`Group font-family: ${numbersGroup.style.fontFamily}`);
                console.log(`Number of text elements: ${textElements.length}`);

                textElements.forEach((text, index) => {
                    const computedStyle = window.getComputedStyle(text);
                    console.log(`Text ${text.textContent}: font-family = ${computedStyle.fontFamily}`);
                });

                // Re-apply font consistency
                window.analogClockGame.clockBuilder.ensureConsistentFonts();
                console.log('✅ Font consistency re-applied');
                return true;
            } else {
                console.log('Clock numbers group not found');
                return false;
            }
        } else {
            console.log('Game not initialized');
            return false;
        }
    };

    console.log('Debug functions available:');
    console.log('- debugRandomness(): Show current randomness statistics');
    console.log('- resetRandomness(): Reset the randomness system');
    console.log('- testLevel7(): Test Level 7 minute hand accuracy with comprehensive validation');
    console.log('- testFonts(): Analyze and fix clock number font consistency across platforms');
    console.log('- debugMobile(): Comprehensive mobile debugging (debug panels disabled for clean UI)');
    console.log('- testMobilePhone(): Comprehensive mobile phone functionality test (phone consoles only)');
    console.log('- testMobileShop(): Test enhanced mobile reward shop toggle functionality (phone consoles only)');
    console.log('- testTabletShop(): Test tablet/desktop reward shop full visibility (tablets/desktops only)');
    console.log('- testRapidClickPrevention(): Test anti-rapid-click system to prevent double scoring');
}
