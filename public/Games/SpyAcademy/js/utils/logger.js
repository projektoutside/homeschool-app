/**
 * Centralized Logging Utility for The Spy Academy
 * Provides enhanced logging with categories and colors
 */

class Logger {
    constructor() {
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        
        this.currentLevel = this.getLogLevel();
        this.isProduction = this.isProductionEnvironment();
        
        // Emoji mapping for visual clarity
        this.emojis = {
            ERROR: '❌',
            WARN: '⚠️',
            INFO: 'ℹ️',
            DEBUG: '🐛',
            GAME: '🎮',
            AUDIO: '🔊',
            VOICE: '🎤',
            CHALLENGE: '🎯',
            ROLE: '🎭',
            NETWORK: '🌐',
            PERFORMANCE: '⚡'
        };
    }
    
    /**
     * Determine log level based on environment
     */
    getLogLevel() {
        // Check if development mode is explicitly set
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.search.includes('debug=true')) {
            return this.levels.DEBUG;
        }
        return this.levels.INFO;
    }
    
    /**
     * Check if running in production environment
     */
    isProductionEnvironment() {
        return !window.location.hostname.includes('localhost') && 
               !window.location.hostname.includes('127.0.0.1') &&
               !window.location.search.includes('debug=true');
    }
    
    /**
     * Core logging method
     */
    log(level, category, message, data = null) {
        if (this.levels[level] > this.currentLevel) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const emoji = this.emojis[category] || this.emojis[level];
        const prefix = `[${timestamp}] ${emoji}`;
        
        // In production, limit what gets logged
        if (this.isProduction && level === 'DEBUG') return;
        
        switch (level) {
            case 'ERROR':
                data ? console.error(prefix, message, data) : console.error(prefix, message);
                break;
            case 'WARN':
                data ? console.warn(prefix, message, data) : console.warn(prefix, message);
                break;
            case 'INFO':
                data ? console.info(prefix, message, data) : console.info(prefix, message);
                break;
            case 'DEBUG':
                data ? console.log(prefix, message, data) : console.log(prefix, message);
                break;
        }
    }
    
    // Convenience methods for different categories
    error(message, data = null) {
        this.log('ERROR', 'ERROR', message, data);
    }
    
    warn(message, data = null) {
        this.log('WARN', 'WARN', message, data);
    }
    
    info(message, data = null) {
        this.log('INFO', 'INFO', message, data);
    }
    
    debug(message, data = null) {
        this.log('DEBUG', 'DEBUG', message, data);
    }
    
    // Category-specific methods
    game(message, data = null) {
        this.log('INFO', 'GAME', message, data);
    }
    
    audio(message, data = null) {
        this.log('INFO', 'AUDIO', message, data);
    }
    
    voice(message, data = null) {
        this.log('INFO', 'VOICE', message, data);
    }
    
    challenge(message, data = null) {
        this.log('INFO', 'CHALLENGE', message, data);
    }
    
    role(message, data = null) {
        this.log('INFO', 'ROLE', message, data);
    }
    
    network(message, data = null) {
        this.log('INFO', 'NETWORK', message, data);
    }
    
    performance(message, data = null) {
        this.log('INFO', 'PERFORMANCE', message, data);
    }
    
    // Debug-specific category methods
    gameDebug(message, data = null) {
        this.log('DEBUG', 'GAME', message, data);
    }
    
    audioDebug(message, data = null) {
        this.log('DEBUG', 'AUDIO', message, data);
    }
    
    /**
     * Performance timing utility
     */
    time(label) {
        if (this.currentLevel >= this.levels.DEBUG) {
            console.time(`⚡ ${label}`);
        }
    }
    
    timeEnd(label) {
        if (this.currentLevel >= this.levels.DEBUG) {
            console.timeEnd(`⚡ ${label}`);
        }
    }
    
    /**
     * Group logging for complex operations
     */
    group(title) {
        if (this.currentLevel >= this.levels.DEBUG) {
            console.group(`📁 ${title}`);
        }
    }
    
    groupEnd() {
        if (this.currentLevel >= this.levels.DEBUG) {
            console.groupEnd();
        }
    }
    
    /**
     * Table logging for data structures
     */
    table(data, label = '') {
        if (this.currentLevel >= this.levels.DEBUG) {
            if (label) this.debug(label);
            console.table(data);
        }
    }
}

// Create global logger instance
window.logger = new Logger();

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
} 