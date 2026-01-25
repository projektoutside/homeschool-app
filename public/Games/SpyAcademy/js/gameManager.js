/**
 * Game Manager for The Spy Academy
 * Centralized game state management and coordination
 */

class GameManager {
    constructor() {
        // Initialize utilities
        this.logger = window.logger;
        this.config = window.gameConfig;
        this.helpers = window.gameHelpers;
        
        // Game state with validation
        this.gameState = {
            playerCount: 0,
            playerColors: [],
            currentChallenge: 0,
            gameStarted: false,
            isInitialized: false
        };
        
        // Manager references
        this.roleManager = null;
        this.voiceManager = null;
        this.soundManager = null;
        
        // Initialization tracking
        this.initPromise = null;
        
        this.logger?.game('Game Manager initialized');
    }
    
    /**
     * Initialize all managers and dependencies
     */
    async initializeManagers() {
        if (this.gameState.isInitialized) {
            this.logger?.gameDebug('Managers already initialized');
            return;
        }
        
        try {
            this.logger?.game('Starting manager initialization...');
            
            // Initialize sound manager with timeout
            if (window.soundManager) {
                this.soundManager = window.soundManager;
                this.logger?.audio('Sound Manager connected to Game Manager');
            } else {
                this.logger?.warn('Sound Manager not available, continuing without audio');
            }
            
            // Initialize role manager with error handling
            if (typeof RoleManager !== 'undefined') {
                try {
                    this.roleManager = new RoleManager(this);
                    this.logger?.role('Role Manager connected');
                } catch (roleError) {
                    this.logger?.error('Failed to initialize Role Manager:', roleError);
                    throw new Error('Role Manager initialization failed');
                }
            } else {
                this.logger?.error('RoleManager class not available');
                throw new Error('RoleManager class not loaded');
            }
            
            // Initialize voice manager (use AudioManager from window if available)
            if (window.audioManager) {
                this.voiceManager = window.audioManager;
                this.logger?.voice('AudioManager (Web Speech API) connected');

                // Connect voice manager to role manager safely
                if (this.roleManager && typeof this.roleManager.setVoiceManager === 'function') {
                    this.roleManager.setVoiceManager(this.voiceManager);
                    this.logger?.voice('AudioManager connected to Role Manager');
                } else {
                    this.logger?.warn('Could not connect AudioManager to Role Manager');
                }
            } else {
                this.logger?.warn('AudioManager not available, continuing without voice features');
                this.voiceManager = null;
            }
            
            // Connect sound manager to role manager for sound effects
            if (this.soundManager && this.roleManager && typeof this.roleManager.setSoundManager === 'function') {
                this.roleManager.setSoundManager(this.soundManager);
                this.logger?.audio('Sound Manager connected to Role Manager');
            }
            
            // Validate critical components
            if (!this.roleManager) {
                throw new Error('Role Manager is required but failed to initialize');
            }
            
            this.gameState.isInitialized = true;
            this.logger?.game('All managers initialized successfully');
            
        } catch (error) {
            this.logger?.error('Failed to initialize managers', error);
            this.gameState.isInitialized = false;
            
            // Show user-friendly error
            this.showError(`Failed to initialize game components: ${error.message}. Please refresh the page.`);
            throw error;
        }
    }
    
    /**
     * Handle completion of a challenge
     * @param {boolean} success - Whether the challenge was completed successfully
     * @param {Object} results - Challenge results data
     */
    async handleChallengeComplete(success, results = {}) {
        this.logger?.challenge(`Challenge ${this.gameState.currentChallenge} completed`, { 
            success, 
            results 
        });
        
        try {
            // Hide challenge container with animation
            const challengeContainer = document.getElementById('challenge-container');
            if (challengeContainer) {
                await this.helpers?.hideElement(challengeContainer, this.config?.ui.fadeTransition);
            }
            
            // Play appropriate audio feedback
            if (this.soundManager) {
                if (success) {
                    this.soundManager.playVictory();
                } else {
                    this.soundManager.playDefeat();
                }
            }
            
            // Show appropriate end screen
            await this.helpers?.wait(1000); // Brief pause for effect
            
            if (success) {
                await this.showVictoryScreen();
            } else {
                await this.showGameOverScreen();
            }
            
        } catch (error) {
            this.logger?.error('Error handling challenge completion', error);
        }
    }
    
    /**
     * Show victory screen with animation
     */
    async showVictoryScreen() {
        try {
            const victoryScreen = document.getElementById('victory');
            if (victoryScreen) {
                await this.helpers?.showElement(victoryScreen, this.config?.ui.fadeTransition);
                
                // Optional: Change background music to victory theme
                if (this.soundManager) {
                    this.soundManager.stopBackgroundMusic();
                    // Could add victory music here
                }
            }
        } catch (error) {
            this.logger?.error('Error showing victory screen', error);
        }
    }
    
    /**
     * Show game over screen with animation
     */
    async showGameOverScreen() {
        try {
            const gameOverScreen = document.getElementById('game-over');
            if (gameOverScreen) {
                await this.helpers?.showElement(gameOverScreen, this.config?.ui.fadeTransition);
                
                // Optional: Change background music to defeat theme
                if (this.soundManager) {
                    this.soundManager.stopBackgroundMusic();
                    // Could add defeat music here
                }
            }
        } catch (error) {
            this.logger?.error('Error showing game over screen', error);
        }
    }
    
    /**
     * Set up game state for a new game
     * @param {number} playerCount - Number of players
     * @param {Array} playersData - Array of player objects with {name, color, colorName}
     */
    async setupGame(playerCount, playersData) {
        try {
            // Validate inputs
            if (!this.validateGameSetup(playerCount, playersData)) {
                throw new Error('Invalid game setup parameters');
            }
            
            // Hide color selection page immediately
            const colorSelection = document.getElementById('color-selection');
            if (colorSelection && this.helpers) {
                await this.helpers.hideElement(colorSelection, 300);
            }
            
            // Update game state with player data including names
            this.gameState.playerCount = playerCount;
            this.gameState.playersData = [...playersData]; // Store complete player data
            this.gameState.playerColors = playersData.map(p => ({ color: p.color, name: p.colorName })); // Legacy format for compatibility
            this.gameState.currentChallenge = 1;
            this.gameState.gameStarted = true;
            
            this.logger?.game('Game setup complete', this.gameState);
            
            // Ensure managers are initialized
            if (!this.gameState.isInitialized) {
                await this.initializeManagers();
            }
            
            // Start role assignment with complete player data
            if (this.roleManager) {
                this.logger?.role('Starting role assignment process...');
                await this.roleManager.startRoleAssignment(playersData);
            } else {
                throw new Error('Role Manager not available');
            }
            
        } catch (error) {
            this.logger?.error('Error setting up game', error);
            this.showError('Failed to start the game. Please refresh and try again.');
            throw error;
        }
    }
    
    /**
     * Start the game with player data
     * Entry point for the self-contained system
     * @param {Array} playersData - Array of player objects with {name, color}
     */
    async startGame(playersData = null) {
        try {
            this.logger?.game('Game start requested');
            
            // If playersData is provided, use it; otherwise use existing player data
            let gamePlayersData;
            
            if (playersData && Array.isArray(playersData)) {
                // Convert self-contained format to expected format
                gamePlayersData = playersData.map((player, index) => ({
                    name: player.name,
                    color: player.color,
                    colorName: this.getColorName(player.color) // Convert hex to name
                }));
            } else if (this.players && Array.isArray(this.players)) {
                // Use existing player data from self-contained system
                gamePlayersData = this.players.map((player, index) => ({
                    name: player.name,
                    color: player.color,
                    colorName: this.getColorName(player.color)
                }));
            } else {
                throw new Error('No player data available to start game');
            }
            
            this.logger?.game('Starting game with converted player data:', gamePlayersData);
            
            // Use setupGame to start the actual game
            await this.setupGame(gamePlayersData.length, gamePlayersData);
            
        } catch (error) {
            this.logger?.error('Error starting game', error);
            this.showError('Failed to start the game. Please refresh and try again.');
            throw error;
        }
    }
    
    /**
     * Convert hex color to color name for compatibility
     * @param {string} hexColor - Hex color value (e.g., '#ff0000')
     * @returns {string} Color name
     */
    getColorName(hexColor) {
        const colorMap = {
            '#ff0000': 'Red',
            '#00ff00': 'Green',
            '#0080ff': 'Blue',
            '#ffff00': 'Yellow',
            '#ff8000': 'Orange',
            '#8000ff': 'Purple',
            '#ff0080': 'Pink',
            '#00ff80': 'Cyan'
        };
        
        return colorMap[hexColor] || 'Unknown';
    }
    
    /**
     * Validate game setup parameters
     */
    validateGameSetup(playerCount, playersData) {
        const minPlayers = this.config?.game.minPlayers || 2;
        const maxPlayers = this.config?.game.maxPlayers || 8;
        
        if (typeof playerCount !== 'number' || playerCount < minPlayers || playerCount > maxPlayers) {
            this.logger?.error(`Invalid player count: ${playerCount}. Must be between ${minPlayers} and ${maxPlayers}`);
            return false;
        }
        
        if (!Array.isArray(playersData) || playersData.length !== playerCount) {
            this.logger?.error('Players data array length does not match player count');
            return false;
        }
        
        // Validate each player object
        for (let i = 0; i < playersData.length; i++) {
            const player = playersData[i];
            if (!player.name || !player.color || !player.colorName) {
                this.logger?.error(`Invalid player data at index ${i}:`, player);
                return false;
            }
            if (typeof player.name !== 'string' || player.name.trim().length === 0) {
                this.logger?.error(`Invalid player name at index ${i}:`, player.name);
                return false;
            }
        }
        
        // Check for duplicate colors
        const colors = playersData.map(p => p.color);
        const uniqueColors = new Set(colors);
        if (uniqueColors.size !== colors.length) {
            this.logger?.error('Duplicate player colors detected');
            return false;
        }
        
        // Check for duplicate names (warn but don't fail)
        const names = playersData.map(p => p.name.trim().toLowerCase());
        const uniqueNames = new Set(names);
        if (uniqueNames.size !== names.length) {
            this.logger?.warn('Duplicate player names detected - this may cause confusion');
        }
        
        return true;
    }
    
    /**
     * Show error message with improved UI
     * @param {string} message - Error message to display
     * @param {boolean} showReload - Whether to show reload button
     */
    showError(message, showReload = true) {
        try {
            const challengeContainer = document.getElementById('challenge-container');
            if (challengeContainer) {
                challengeContainer.style.display = 'block';
                challengeContainer.classList.add('active');
                
                const errorContent = this.helpers?.createElement('div', {}, {
                    textAlign: 'center',
                    padding: this.helpers?.getResponsiveValue('30px', '50px'),
                    color: this.config?.colors.danger || '#ff3333',
                    fontFamily: 'inherit'
                });
                
                const title = this.helpers?.createElement('h2', {
                    textContent: 'Error'
                }, {
                    marginBottom: '20px',
                    color: this.config?.colors.danger || '#ff3333'
                });
                
                const messageEl = this.helpers?.createElement('p', {
                    textContent: message
                }, {
                    marginBottom: showReload ? '30px' : '0',
                    fontSize: this.config?.getFontSize(1.1),
                    lineHeight: '1.6'
                });
                
                errorContent.appendChild(title);
                errorContent.appendChild(messageEl);
                
                if (showReload) {
                    const reloadBtn = this.helpers?.createElement('button', {
                        textContent: 'Reload Page'
                    }, {
                        padding: '15px 30px',
                        background: this.config?.colors.danger || '#ff3333',
                        color: this.config?.colors.light || 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: this.config?.getFontSize(1.1),
                        fontFamily: 'inherit',
                        transition: 'all 0.3s ease'
                    });
                    
                    reloadBtn.onclick = () => window.location.reload();
                    errorContent.appendChild(reloadBtn);
                }
                
                this.helpers?.clearElement(challengeContainer);
                challengeContainer.appendChild(errorContent);
            }
        } catch (error) {
            this.logger?.error('Error showing error message', error);
            // Fallback to alert if DOM manipulation fails
            alert(message);
        }
    }
    
    /**
     * Get secret roles from role manager with validation
     * @returns {Array} Array of player objects with roles and colors
     */
    getSecretRoles() {
        if (this.roleManager?.players) {
            return this.roleManager.players;
        }
        this.logger?.warn('Role manager or players not available');
        return [];
    }
    
    /**
     * Get the villain player
     * @returns {Object|null} The villain player object
     */
    getVillain() {
        return this.roleManager?.getVillain() || null;
    }
    
    /**
     * Get all Bad players
     * @returns {Array} Array of Bad player objects
     */
    getBadPlayers() {
        return this.roleManager?.getBadPlayers() || [];
    }
    
    /**
     * Get all good players
     * @returns {Array} Array of good player objects
     */
    getGoodPlayers() {
        return this.roleManager?.getGoodPlayers() || [];
    }
    
    /**
     * Get Bad players that know each other (6 and 7 player games)
     * @returns {Array} Array of Bad player objects that have partners
     */
    getBadPlayerPartners() {
        return this.roleManager?.getBadPlayerPartners() || [];
    }
    
    /**
     * Check if Bad players know each other in current game
     * @returns {boolean} True if Bad players know each other
     */
    doBadPlayersKnowEachOther() {
        return this.roleManager?.doBadPlayersKnowEachOther() || false;
    }
    
    /**
     * Start the First Impressions Challenge
     */
    async startFirstImpressionsChallenge() {
        try {
            this.logger?.challenge('Starting First Impressions Challenge');
            
            // Ensure challenge module is loaded
            if (typeof FirstImpressionsChallenge === 'undefined') {
                throw new Error('FirstImpressionsChallenge class not loaded');
            }
            
            // Create and initialize the challenge
            const challenge = new FirstImpressionsChallenge(this);
            await challenge.init();
            
        } catch (error) {
            this.logger?.error('Error starting First Impressions Challenge', error);
            this.showError('Failed to start the challenge. Please refresh and try again.');
            throw error;
        }
    }
    
    /**
     * Start the next challenge in sequence
     */
    async startFirstChallenge() {
        try {
            this.logger?.challenge('Starting enhanced Rock Paper Scissors challenge system');
            
            // Start the enhanced multi-round Rock Paper Scissors challenge
            if (typeof RockPaperScissorsChallenge !== 'undefined') {
                this.logger?.challenge('Starting Enhanced Rock Paper Scissors Challenge');
                const challenge = new RockPaperScissorsChallenge(this);
                await challenge.init();
            } else {
                this.logger?.error('RockPaperScissorsChallenge not available');
                this.showError('Failed to load the main challenge.');
            }
            
        } catch (error) {
            this.logger?.error('Error starting enhanced challenge', error);
            this.showError('Failed to start the main challenge.');
            throw error;
        }
    }
    
    /**
     * Debug method to display current game state
     */
    debug() {
        if (!this.logger) return;
        
        this.logger.group('Game Manager Debug Info');
        this.logger.table(this.gameState, 'Game State');
        this.logger.gameDebug('Role Manager:', !!this.roleManager);
        this.logger.gameDebug('Voice Manager:', !!this.voiceManager);
        this.logger.gameDebug('Sound Manager:', !!this.soundManager);
        
        if (this.roleManager?.players) {
            this.logger.table(this.roleManager.players, 'Players');
        }
        
        this.logger.groupEnd();
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        try {
            // Clean up managers
            if (this.roleManager?.cleanup) {
                this.roleManager.cleanup();
            }
            
            if (this.voiceManager?.cleanup) {
                this.voiceManager.cleanup();
            }
            
            if (this.soundManager?.cleanup) {
                this.soundManager.cleanup();
            }
            
            // Reset state
            this.gameState = {
                playerCount: 0,
                playerColors: [],
                currentChallenge: 0,
                gameStarted: false,
                isInitialized: false
            };
            
            this.logger?.game('Game Manager cleaned up');
            
        } catch (error) {
            this.logger?.error('Error during cleanup', error);
        }
    }
    
    /**
     * Reset game state for replay without reinitializing managers
     * This is called when users click "Play Again"
     */
    resetForReplay() {
        try {
            this.logger?.game('Resetting game state for replay');
            
            // Reset game state but keep managers initialized
            this.gameState = {
                playerCount: 0,
                playerColors: [],
                playersData: [],
                currentChallenge: 0,
                gameStarted: false,
                isInitialized: true, // Keep this true to avoid reinitializing managers
                secretRoles: []
            };
            
            // Reset role manager players if available
            if (this.roleManager) {
                this.roleManager.players = [];
                this.roleManager.currentPlayerIndex = 0;
                this.roleManager.isAssigningRoles = false;
            }
            
            this.logger?.game('Game state reset for replay');
            
        } catch (error) {
            this.logger?.error('Error during replay reset', error);
        }
    }
}

// Create global game manager instance
window.gameManager = new GameManager();
