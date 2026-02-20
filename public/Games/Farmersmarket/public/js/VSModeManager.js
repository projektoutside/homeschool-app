// Farmers Market Frenzy 3D - VS Mode Manager
class VSModeManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.aiOpponent = null;
        
        // Competition state
        this.isVSMode = false;
        this.competitionActive = false;
        this.competitionStartTime = null;
        // Removed hardcoded competitionDuration, will be set dynamically
        // this.competitionDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.competitionDuration = 0; // Initialize to 0, will be set on first use
        
        // Game mode tracking
        this.gameMode = 'normal'; // 'normal', 'progressive', 'random'
        
        // Scoring categories
        this.categories = {
            CUSTOMERS_SERVED: 'customers',
            TOTAL_EARNINGS: 'earnings', 
            CUSTOMER_SERVICE: 'service'
        };
        
        // Competition results
        this.playerWins = 0;
        this.aiWins = 0;
        this.currentRoundResults = {};
        
        // UI elements
        this.domElements = {};
        
        // Update intervals
        this.updateInterval = null;
        this.competitionTimer = null;
        
        // Debug mode for troubleshooting - DISABLED BY DEFAULT
        this.debugMode = false;
        
        // Last known stats for comparison
        this.lastPlayerStats = { customersServed: 0, totalEarnings: 0, averageRating: 0 };
        this.lastAIStats = { customersServed: 0, totalEarnings: 0, averageRating: 0 };
        
        // Progressive Play state management (simplified)
        
        console.log('VS Mode Manager initialized with enhanced real-time tracking');
    }
    
    init() {
        try {
            console.log('🔧 Initializing VSModeManager...');
            this.cacheDOM();
            this.setupEventListeners();
            console.log('✅ VSModeManager initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ VSModeManager initialization failed:', error);
            return false;
        }
    }
    
    cacheDOM() {
        this.domElements = {
            // Mode selection (removed from UI)
            vsModeToggle: null,
            singlePlayerMode: null,
            vsCompetitionMode: null,
            
            // Competition UI (removed from UI)
            competitionHUD: null,
            competitionTimer: null,
            
            // Player stats
            playerStatsPanel: document.getElementById('playerStatsPanel'),
            playerCustomersServed: document.getElementById('playerCustomersServed'),
            playerTotalEarnings: document.getElementById('playerTotalEarnings'),
            playerAverageRating: document.getElementById('playerAverageRating'),
            
            // AI stats
            aiStatsPanel: document.getElementById('aiStatsPanel'),
            aiCustomersServed: document.getElementById('aiCustomersServed'),
            aiTotalEarnings: document.getElementById('aiTotalEarnings'),
            aiAverageRating: document.getElementById('aiAverageRating'),
            
            // Competition scoring
            scoringPanel: document.getElementById('scoringPanel'),
            customersScorePlayer: document.getElementById('customersScorePlayer'),
            customersScoreAI: document.getElementById('customersScoreAI'),
            earningsScorePlayer: document.getElementById('earningsScorePlayer'),
            earningsScoreAI: document.getElementById('earningsScoreAI'),
            serviceScorePlayer: document.getElementById('serviceScorePlayer'),
            serviceScoreAI: document.getElementById('serviceScoreAI'),
            
            // Round indicators
            customersRoundWinner: document.getElementById('customersRoundWinner'),
            earningsRoundWinner: document.getElementById('earningsRoundWinner'),
            serviceRoundWinner: document.getElementById('serviceRoundWinner'),
            
            // Competition results
            competitionResults: document.getElementById('competitionResults'),
            finalWinner: document.getElementById('finalWinner'),
            winnerMessage: document.getElementById('winnerMessage'),
            categoryBreakdown: document.getElementById('categoryBreakdown'),
            
            // Controls (removed from UI)
            startCompetitionBtn: null,
            endCompetitionBtn: null,
            newCompetitionBtn: null,
            closeCompetitionBtn: null,
            
            // AI difficulty (removed from UI)
            aiDifficultySelect: null
        };
    }
    
    setupEventListeners() {
        // Mode toggle
        if (this.domElements.vsModeToggle) {
            this.domElements.vsModeToggle.addEventListener('change', (e) => {
                this.toggleVSMode(e.target.checked);
            });
        }
        
        // Competition controls (removed from UI - handled elsewhere)
        if (this.domElements.startCompetitionBtn) {
            console.log('✅ Start Competition button found, adding event listener');
            this.domElements.startCompetitionBtn.addEventListener('click', () => {
                console.log('🖱️ Start Competition button clicked!');
                this.startCompetition();
            });
        }
        
        if (this.domElements.endCompetitionBtn) {
            this.domElements.endCompetitionBtn.addEventListener('click', () => {
                this.endCompetition();
            });
        }
        
        if (this.domElements.newCompetitionBtn) {
            this.domElements.newCompetitionBtn.addEventListener('click', () => {
                console.log('🔄 New Competition button clicked!');
                this.startNewCompetition();
            });
        }
        
        if (this.domElements.closeCompetitionBtn) {
            this.domElements.closeCompetitionBtn.addEventListener('click', () => {
                console.log('❌ Close Competition button clicked!');
                this.closeCompetitionResults();
            });
        }
        
        // Add close button handler for competition results
        this.setupCompetitionResultsHandlers();
        
        // AI difficulty
        if (this.domElements.aiDifficultySelect) {
            this.domElements.aiDifficultySelect.addEventListener('change', (e) => {
                this.setAIDifficulty(e.target.value);
            });
        }
    }
    
    setupCompetitionResultsHandlers() {
        // Handle competition results modal buttons
        const competitionResults = document.getElementById('competitionResults');
        if (competitionResults) {
            // Find all buttons in the results modal
            const resultButtons = competitionResults.querySelectorAll('button');
            
            resultButtons.forEach(button => {
                // Add new listener with proper binding
                button.addEventListener('click', (e) => {
                    this.handleResultButtonClick(e);
                });
            });
            
            console.log('✅ Competition results button handlers setup');
        }
    }
    
    handleResultButtonClick(event) {
        const button = event.target;
        const buttonText = button.textContent.trim();
        
        console.log('🖱️ Competition results button clicked:', buttonText);
        
        if (buttonText.includes('New Competition') || button.id === 'newCompetitionBtn' || buttonText.includes('Retry')) {
            console.log('🔄 Starting new competition (retry)...');
            this.startNewCompetition();
        } else if (buttonText.includes('Close') || button.classList.contains('secondary')) {
            console.log('❌ Closing competition results...');
            this.closeCompetitionResults();
        } else if (button.id === 'selectOpponentBtn' || buttonText.includes('Select Different Opponent')) {
            console.log('👥 Selecting different opponent...');
            // Close modal
            this.closeCompetitionResults();
            // End VS mode and go back to character selection
            if (this.competitionActive) {
                this.endCompetition();
            }
            // Dispose current game to prevent overlap
            if (window.gameManager) {
                window.gameManager.restartGame();
            }
            if (window.main && typeof window.main.showCharacterSelection === 'function') {
                window.main.showCharacterSelection();
            } else if (window.main && typeof window.main.backToDifficultySelection === 'function') {
                window.main.backToDifficultySelection();
            }
        }
    }
    
    closeCompetitionResults() {
        if (this.domElements.competitionResults) {
            this.domElements.competitionResults.style.display = 'none';
            console.log('✅ Competition results modal closed');
            
            // Progressive Play continuity is handled automatically now
        }
    }
    
    toggleVSMode(enabled) {
        this.isVSMode = enabled;
        
        if (enabled) {
            this.enableVSMode();
        } else {
            this.disableVSMode();
        }
        
        console.log(`VS Mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    enableVSMode() {
        // Use existing AI opponent from GameManager instead of creating new one
        if (this.gameManager && this.gameManager.aiOpponentManager) {
            this.aiOpponent = this.gameManager.aiOpponentManager;
            console.log('✅ Using existing AI opponent from GameManager');
        } else {
            // Fallback: Initialize AI opponent if not already done
            console.warn('⚠️ No AI opponent found in GameManager, creating new one');
            this.aiOpponent = new AIOpponentManager(this.gameManager);
            this.aiOpponent.init();
        }
        
        // Set initial competition duration based on settings
        if (window.SettingsManager && typeof window.SettingsManager.getSettings === 'function') {
            try {
                const settings = window.SettingsManager.getSettings();
                if (settings && settings.unifiedTimer) {
                    this.competitionDuration = settings.unifiedTimer * 60 * 1000;
                    console.log(`VS Mode enabled. Initial competition duration set to ${settings.unifiedTimer} minutes.`);
                } else {
                    console.warn('SettingsManager or unifiedTimer not found, using default competition duration.');
                }
            } catch (error) {
                console.warn('Error accessing SettingsManager:', error);
            }
        } else {
            console.warn('SettingsManager not available, using default competition duration.');
        }

        // Show VS mode interface elements
        this.showVSInterface();
        
        // Start real-time scoring updates immediately
        this.startUpdateLoop();
        
        console.log('VS Mode enabled with unified scene and real-time scoring');
    }
    
    disableVSMode() {
        // Hide VS mode interface elements
        this.hideVSInterface();
        
        // Stop any active competition
        if (this.competitionActive) {
            this.endCompetition();
        }
        
        // Clean up AI opponent
        if (this.aiOpponent) {
            this.aiOpponent.dispose();
            this.aiOpponent = null;
        }
        
        console.log('VS Mode disabled');
    }
    
    showVSInterface() {
        // Show competition HUD
        if (this.domElements.competitionHUD) {
            this.domElements.competitionHUD.style.display = 'block';
        }
        
        // Show AI stats panel
        if (this.domElements.aiStatsPanel) {
            this.domElements.aiStatsPanel.style.display = 'block';
        }
        
        // Show scoring panel
        if (this.domElements.scoringPanel) {
            this.domElements.scoringPanel.style.display = 'block';
        }
        
        // Update mode indicators
        if (this.domElements.vsCompetitionMode) {
            this.domElements.vsCompetitionMode.classList.add('active');
        }
        
        if (this.domElements.singlePlayerMode) {
            this.domElements.singlePlayerMode.classList.remove('active');
        }
    }
    
    hideVSInterface() {
        // Hide competition HUD
        if (this.domElements.competitionHUD) {
            this.domElements.competitionHUD.style.display = 'none';
        }
        
        // Hide AI stats panel
        if (this.domElements.aiStatsPanel) {
            this.domElements.aiStatsPanel.style.display = 'none';
        }
        
        // Hide scoring panel
        if (this.domElements.scoringPanel) {
            this.domElements.scoringPanel.style.display = 'none';
        }
        
        // Hide results
        if (this.domElements.competitionResults) {
            this.domElements.competitionResults.style.display = 'none';
        }
        
        // Update mode indicators
        if (this.domElements.vsCompetitionMode) {
            this.domElements.vsCompetitionMode.classList.remove('active');
        }
        
        if (this.domElements.singlePlayerMode) {
            this.domElements.singlePlayerMode.classList.add('active');
        }
    }
    
    startCompetition() {
        console.log('🚀 Start Competition button clicked!');
        console.log('VS Mode enabled:', this.isVSMode);
        console.log('Competition active:', this.competitionActive);
        
        // Auto-enable VS mode if not already enabled
        if (!this.isVSMode) {
            console.log('⚠️ VS Mode not enabled, enabling automatically...');
            this.toggleVSMode(true);
            
            // Update the toggle UI if it exists
            if (this.domElements.vsModeToggle) {
                this.domElements.vsModeToggle.checked = true;
            }
        }
        
        // Stop any existing competition first
        if (this.competitionActive) {
            this.endCompetition(true); // Pass true to suppress results display
        }
        
        this.competitionActive = true;
        // this.competitionStartTime = Date.now(); // This will be set when timer starts
        
        // Reset stats
        this.resetCompetitionStats();
        
        // Clear any existing timers
        this.stopCompetitionTimer();
        this.stopUpdateLoop();
        
        // Start AI opponent
        if (this.aiOpponent) {
            this.aiOpponent.startCompetition();
            console.log('✅ AI opponent started');
        } else {
            console.warn('⚠️ AI opponent not available');
        }
        
        // NOTE: Game should already be started by Main.js - no need to call startGame() again
        // This was causing the customer panel to flicker due to double initialization
        console.log('✅ Using already started game for competition');
        
        // DO NOT start competition timer immediately - wait for both customers to spawn
        console.log('⏳ Competition timer will start when both first customers are spawned');
        
        // Start update loop
        this.startUpdateLoop();
        console.log('✅ Update loop started');
        
        // Update UI
        this.updateCompetitionControls();
        
        // Set competition duration dynamically before starting timer
        if (window.SettingsManager && window.SettingsManager.getSettings) {
            const settings = window.SettingsManager.getSettings();
            if (settings && settings.unifiedTimer) {
                this.competitionDuration = settings.unifiedTimer * 60 * 1000;
                console.log(`Competition started. Competition duration set to ${settings.unifiedTimer} minutes.`);
            } else {
                console.warn('SettingsManager or unifiedTimer not found, using current competition duration.');
            }
        } else {
            console.warn('SettingsManager not available, using current competition duration.');
        }
        
        console.log('🎮 Competition started successfully! Waiting for first customers to spawn...');
    }
    
    endCompetition(suppressResults = false) {
        if (!this.competitionActive) return;
        
        this.competitionActive = false;
        
        // Stop AI opponent
        if (this.aiOpponent) {
            this.aiOpponent.stopCompetition();
        }
        
        // Gracefully stop the main game but skip the generic results modal – VS mode will show its own
        if (this.gameManager && typeof this.gameManager.endGameDueToTimer === 'function') {
            this.gameManager.endGameDueToTimer(false);
        }
        
        // Stop timers / loops specific to VS mode
        this.stopCompetitionTimer();
        this.stopUpdateLoop();
        
        // Calculate final competition results
        const results = this.calculateFinalResults();
        
        // Handle progressive play advancement or show regular results
        if (!suppressResults) {
            if (this.gameMode === 'progressive') {
                this.handleProgressivePlayResult(results);
            } else {
                this.showCompetitionResults();
            }
        }
        
        // Update any UI controls
        this.updateCompetitionControls();
        
        console.log('Competition ended!');
    }
    
    startNewCompetition() {
        console.log('🔄 Starting new competition...');
        
        // Hide results
        if (this.domElements.competitionResults) {
            this.domElements.competitionResults.style.display = 'none';
            console.log('✅ Competition results hidden');
        }
        
        // Reset round wins
        this.playerWins = 0;
        this.aiWins = 0;
        console.log('✅ Round wins reset');
        
        // Clear previous results
        this.currentRoundResults = null;
        
        // Start new competition
        console.log('🚀 Launching new competition...');
        this.startCompetition();
    }
    
    resetCompetitionStats() {
        // Reset player stats through game manager
        this.gameManager.resetGameState();
        
        // Reset AI stats
        if (this.aiOpponent) {
            this.aiOpponent.resetStats();
        }
        
        // Reset round results
        this.currentRoundResults = {};
        
        // Clear round winners
        this.clearRoundWinners();
    }
    
    startCompetitionTimer() {
        this.updateCompetitionTimer();
        
        this.competitionTimer = setInterval(() => {
            this.updateCompetitionTimer();
            
            const elapsed = Date.now() - this.competitionStartTime;
            if (elapsed >= this.competitionDuration) {
                this.endCompetition();
            }
        }, 1000);
    }
    
    stopCompetitionTimer() {
        if (this.competitionTimer) {
            clearInterval(this.competitionTimer);
            this.competitionTimer = null;
        }
    }
    
    updateCompetitionTimer() {
        if (!this.competitionStartTime || !this.domElements.competitionTimer) return;
        
        const elapsed = Date.now() - this.competitionStartTime;
        const remaining = Math.max(0, this.competitionDuration - elapsed);
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        this.domElements.competitionTimer.textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Add warning styles for last minute
        if (remaining <= 60000) {
            this.domElements.competitionTimer.classList.add('warning');
        } else {
            this.domElements.competitionTimer.classList.remove('warning');
        }
    }
    
    startUpdateLoop() {
        this.updateInterval = setInterval(() => {
            this.updateCompetitionDisplay();
        }, 250); // Update every 250ms for more responsive tracking
        
        console.log('📊 Real-time scoring update loop started (250ms intervals)');
    }
    
    stopUpdateLoop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('📊 Real-time scoring update loop stopped');
        }
    }
    
    updateCompetitionDisplay() {
        if (!this.competitionActive) {
            if (this.debugMode) {
                console.log('⚠️ Competition not active, skipping display update');
            }
            return;
        }
        
        // Get current stats
        const playerStats = this.getPlayerStats();
        const aiStats = this.getAIStats();
        
        // Enhanced debug logging
        if (this.debugMode) {
            console.log('📊 DETAILED STATS UPDATE:', {
                timestamp: new Date().toLocaleTimeString(),
                player: playerStats,
                ai: aiStats,
                aiOpponentExists: !!this.gameManager?.aiOpponentManager,
                aiOpponentActive: this.gameManager?.aiOpponentManager?.isActive,
                aiProcessingOrder: this.gameManager?.aiOpponentManager?.processingOrder,
                aiCurrentCustomer: !!this.gameManager?.aiOpponentManager?.currentCustomer
            });
        }
        
        // Update player stats display
        this.updatePlayerStatsDisplay(playerStats);
        
        // Force AI display update to ensure it's current
        if (this.aiOpponent && typeof this.aiOpponent.updateAIDisplay === 'function') {
            this.aiOpponent.updateAIDisplay();
        }
        
        // Update scoring comparison
        this.updateScoringDisplay(playerStats, aiStats);
        
        // Update timer display if exists
        this.updateCompetitionTimer();
    }
    
    getPlayerStats() {
        return {
            customersServed: this.gameManager.getCustomersServed(),
            totalEarnings: this.gameManager.getTotalEarnings(),
            averageRating: this.gameManager.averageRating || 0
        };
    }
    
    getAIStats() {
        // Use the AI opponent from GameManager for consistent stats
        const aiOpponent = this.gameManager?.aiOpponentManager || this.aiOpponent;
        
        if (!aiOpponent) {
            if (this.debugMode) {
                console.warn('⚠️ No AI opponent available for stats - GameManager AI:', !!this.gameManager?.aiOpponentManager, 'Local AI:', !!this.aiOpponent);
            }
            return { customersServed: 0, totalEarnings: 0, averageRating: 0 };
        }
        
        const stats = {
            customersServed: (typeof aiOpponent.getCustomersServed === 'function') ? aiOpponent.getCustomersServed() : 0,
            totalEarnings: (typeof aiOpponent.getTotalEarnings === 'function') ? aiOpponent.getTotalEarnings() : 0,
            averageRating: (typeof aiOpponent.getAverageRating === 'function') ? aiOpponent.getAverageRating() : 0
        };
        
        if (this.debugMode) {
            console.log('🤖 AI Stats Retrieved:', stats, 'from', aiOpponent === this.gameManager?.aiOpponentManager ? 'GameManager' : 'Local');
        }
        
        return stats;
    }
    
    updatePlayerStatsDisplay(stats) {
        if (this.domElements.playerCustomersServed) {
            this.domElements.playerCustomersServed.textContent = stats.customersServed;
        }
        
        if (this.domElements.playerTotalEarnings) {
            this.domElements.playerTotalEarnings.textContent = GameConfig.formatMoney(stats.totalEarnings);
        }
        
        if (this.domElements.playerAverageRating) {
            this.domElements.playerAverageRating.textContent = stats.averageRating.toFixed(1);
        }
    }
    
    updateScoringDisplay(playerStats, aiStats) {
        // Validate stats before updating
        const validPlayerStats = {
            customersServed: playerStats.customersServed || 0,
            totalEarnings: playerStats.totalEarnings || 0,
            averageRating: playerStats.averageRating || 0
        };
        
        const validAIStats = {
            customersServed: aiStats.customersServed || 0,
            totalEarnings: aiStats.totalEarnings || 0,
            averageRating: aiStats.averageRating || 0
        };
        
        // Update customers served comparison
        this.updateCategoryScore('customers', validPlayerStats.customersServed, validAIStats.customersServed);
        
        // Update earnings comparison
        this.updateCategoryScore('earnings', validPlayerStats.totalEarnings, validAIStats.totalEarnings);
        
        // Update service rating comparison
        this.updateCategoryScore('service', validPlayerStats.averageRating, validAIStats.averageRating);
        
        // Log successful update if debug mode is on
        if (this.debugMode) {
            console.log('📊 Scoring display updated successfully');
        }
    }
    
    updateCategoryScore(category, playerValue, aiValue) {
        const playerElement = this.domElements[`${category}ScorePlayer`];
        const aiElement = this.domElements[`${category}ScoreAI`];
        const winnerElement = this.domElements[`${category}RoundWinner`];
        
        // Ensure values are valid numbers
        const safePlayerValue = isNaN(playerValue) ? 0 : Number(playerValue);
        const safeAIValue = isNaN(aiValue) ? 0 : Number(aiValue);
        
        // Update player score display
        if (playerElement) {
            let displayValue;
            if (category === 'earnings') {
                displayValue = GameConfig.formatMoney(safePlayerValue);
            } else if (category === 'service') {
                displayValue = safePlayerValue.toFixed(1);
            } else {
                displayValue = safePlayerValue.toString();
            }
            playerElement.textContent = displayValue;
            
            // Smooth update without flash animation
        }
        
        // Update AI score display
        if (aiElement) {
            let displayValue;
            if (category === 'earnings') {
                displayValue = GameConfig.formatMoney(safeAIValue);
            } else if (category === 'service') {
                displayValue = safeAIValue.toFixed(1);
            } else {
                displayValue = safeAIValue.toString();
            }
            aiElement.textContent = displayValue;
            
            // Smooth update without flash animation
        }
        
        // Determine current leader with proper comparison
        if (winnerElement) {
            let winnerText, winnerClass;
            
            if (safePlayerValue > safeAIValue) {
                winnerText = '👤 Player Leading';
                winnerClass = 'round-winner player-leading';
            } else if (safeAIValue > safePlayerValue) {
                winnerText = '🤖 AI Leading';
                winnerClass = 'round-winner ai-leading';
            } else {
                winnerText = '🤝 Tied';
                winnerClass = 'round-winner tied';
            }
            
            // Only update if the winner status has actually changed
            if (winnerElement.textContent !== winnerText) {
                winnerElement.textContent = winnerText;
                winnerElement.className = winnerClass;
                
                // Smooth winner status update without flash animation
            }
        }
    }
    
    calculateFinalResults() {
        const playerStats = this.getPlayerStats();
        const aiStats = this.getAIStats();
        
        // Determine winner for each category
        const results = {
            customers: this.determineWinner(playerStats.customersServed, aiStats.customersServed),
            earnings: this.determineWinner(playerStats.totalEarnings, aiStats.totalEarnings),
            service: this.determineWinner(playerStats.averageRating, aiStats.averageRating)
        };
        
        // Count wins
        const playerWins = Object.values(results).filter(result => result === 'player').length;
        const aiWins = Object.values(results).filter(result => result === 'ai').length;
        
        // Determine overall winner (best 2 out of 3)
        let overallWinner = 'tie';
        if (playerWins >= 2) {
            overallWinner = 'player';
            this.playerWins++;
        } else if (aiWins >= 2) {
            overallWinner = 'ai';
            this.aiWins++;
        }
        
        this.currentRoundResults = {
            categories: results,
            playerWins,
            aiWins,
            overallWinner,
            playerStats,
            aiStats
        };
        
        console.log('Final results calculated:', this.currentRoundResults);
        
        // Return the results so other game modes (e.g., Progressive Play) can act on them
        return this.currentRoundResults;
    }
    
    determineWinner(playerValue, aiValue) {
        if (playerValue > aiValue) return 'player';
        if (aiValue > playerValue) return 'ai';
        return 'tie';
    }
    
    showCompetitionResults() {
        if (!this.domElements.competitionResults || !this.currentRoundResults) return;
        
        // Add enhanced styles for competition results
        this.addCompetitionResultsStyles();
        
        // Show results panel
        this.domElements.competitionResults.style.display = 'block';
        
        // Update winner display
        this.updateWinnerDisplay();
        
        // Update category breakdown
        this.updateCategoryBreakdown();
        
        // Update final round winners
        this.updateFinalRoundWinners();
        
        // Ensure button handlers are set up
        this.setupCompetitionResultsHandlers();
        
        console.log('🏆 Competition results displayed');
    }

    addCompetitionResultsStyles() {
        // Check if styles already exist
        if (document.getElementById('vs-competition-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'vs-competition-styles';
        style.textContent = `
            .category-result {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 20px;
                margin: 15px 0;
                border-left: 5px solid #ddd;
                transition: all 0.3s ease;
            }
            
            .category-result.player {
                border-left-color: #27ae60;
                background: linear-gradient(135deg, #d5f4e6, #e8f5e8);
            }
            
            .category-result.ai {
                border-left-color: #e74c3c;
                background: linear-gradient(135deg, #fadbd8, #fdf2f2);
            }
            
            .category-result.tie {
                border-left-color: #f39c12;
                background: linear-gradient(135deg, #fef9e7, #fdfef7);
            }
            
            .category-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 15px;
            }
            
            .category-header h4 {
                margin: 0;
                font-size: 1.1rem;
                font-weight: bold;
                color: #2c3e50;
            }
            
            .category-status {
                font-weight: bold;
                font-size: 0.9rem;
                padding: 5px 10px;
                border-radius: 8px;
            }
            
            .category-status.player {
                background: #27ae60;
                color: white;
            }
            
            .category-status.ai {
                background: #e74c3c;
                color: white;
            }
            
            .category-status.tie {
                background: #f39c12;
                color: white;
            }
            
            .stat-comparison {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            
            .player-stat, .ai-stat {
                display: flex;
                flex-direction: column;
                align-items: center;
                flex: 1;
            }
            
            .stat-label {
                font-size: 0.8rem;
                color: #666;
                margin-bottom: 5px;
            }
            
            .stat-value {
                font-weight: bold;
                font-size: 1.1rem;
                color: #2c3e50;
            }
            
            .vs-indicator {
                font-weight: bold;
                color: #7f8c8d;
                margin: 0 15px;
                font-size: 0.9rem;
            }
            
            .category-difference {
                text-align: center;
                font-size: 0.9rem;
                font-weight: bold;
                padding: 8px;
                border-radius: 6px;
                margin-top: 10px;
            }
            
            .difference-win {
                color: #27ae60;
                background: rgba(39, 174, 96, 0.1);
            }
            
            .difference-loss {
                color: #e74c3c;
                background: rgba(231, 76, 60, 0.1);
            }
            
            .difference-tie {
                color: #f39c12;
                background: rgba(243, 156, 18, 0.1);
            }
        `;
        document.head.appendChild(style);
    }
    
    updateWinnerDisplay() {
        const { overallWinner } = this.currentRoundResults;
        
        if (this.domElements.finalWinner) {
            let winnerText = '';
            let winnerClass = '';
            
            if (overallWinner === 'player') {
                winnerText = '🎉 You Win!';
                winnerClass = 'player-winner';
            } else if (overallWinner === 'ai') {
                winnerText = '🤖 AI Wins!';
                winnerClass = 'ai-winner';
                // Add positive encouragement
                if (this.domElements.winnerMessage) {
                    this.domElements.winnerMessage.textContent = 'Great effort! Keep practicing and try again!';
                }
            } else {
                winnerText = '🤝 It\'s a Tie!';
                winnerClass = 'tie-result';
            }
            
            this.domElements.finalWinner.textContent = winnerText;
            this.domElements.finalWinner.className = `final-winner ${winnerClass}`;
        }
        
        if (this.domElements.winnerMessage) {
            const { playerWins, aiWins } = this.currentRoundResults;
            this.domElements.winnerMessage.textContent = 
                `Best 2 out of 3 categories: Player ${playerWins} - ${aiWins} AI`;
        }
    }
    
    updateCategoryBreakdown() {
        if (!this.domElements.categoryBreakdown) return;
        
        const { categories, playerStats, aiStats } = this.currentRoundResults;
        
        const breakdown = `
            <div class="category-result ${categories.customers}">
                <div class="category-header">
                    <h4>👥 Customers Served</h4>
                    <span class="category-status ${categories.customers}">
                        ${categories.customers === 'player' ? '✅ You Won!' : categories.customers === 'ai' ? '❌ AI Won' : '🤝 Tie'}
                    </span>
                </div>
                <div class="category-stats">
                    <div class="stat-comparison">
                        <div class="player-stat">
                            <span class="stat-label">You:</span>
                            <span class="stat-value">${playerStats.customersServed} customers</span>
                        </div>
                        <div class="vs-indicator">vs</div>
                        <div class="ai-stat">
                            <span class="stat-label">AI:</span>
                            <span class="stat-value">${aiStats.customersServed} customers</span>
                        </div>
                    </div>
                </div>
                <div class="category-difference">
                    ${this.getCategoryDifferenceText('customers', playerStats.customersServed, aiStats.customersServed)}
                </div>
            </div>
            
            <div class="category-result ${categories.earnings}">
                <div class="category-header">
                    <h4>💰 Total Earnings</h4>
                    <span class="category-status ${categories.earnings}">
                        ${categories.earnings === 'player' ? '✅ You Won!' : categories.earnings === 'ai' ? '❌ AI Won' : '🤝 Tie'}
                    </span>
                </div>
                <div class="category-stats">
                    <div class="stat-comparison">
                        <div class="player-stat">
                            <span class="stat-label">You:</span>
                            <span class="stat-value">${GameConfig.formatMoney(playerStats.totalEarnings)}</span>
                        </div>
                        <div class="vs-indicator">vs</div>
                        <div class="ai-stat">
                            <span class="stat-label">AI:</span>
                            <span class="stat-value">${GameConfig.formatMoney(aiStats.totalEarnings)}</span>
                        </div>
                    </div>
                </div>
                <div class="category-difference">
                    ${this.getCategoryDifferenceText('earnings', playerStats.totalEarnings, aiStats.totalEarnings)}
                </div>
            </div>
            
            <div class="category-result ${categories.service}">
                <div class="category-header">
                    <h4>⭐ Customer Service</h4>
                    <span class="category-status ${categories.service}">
                        ${categories.service === 'player' ? '✅ You Won!' : categories.service === 'ai' ? '❌ AI Won' : '🤝 Tie'}
                    </span>
                </div>
                <div class="category-stats">
                    <div class="stat-comparison">
                        <div class="player-stat">
                            <span class="stat-label">You:</span>
                            <span class="stat-value">${playerStats.averageRating.toFixed(1)} ⭐</span>
                        </div>
                        <div class="vs-indicator">vs</div>
                        <div class="ai-stat">
                            <span class="stat-label">AI:</span>
                            <span class="stat-value">${aiStats.averageRating.toFixed(1)} ⭐</span>
                        </div>
                    </div>
                </div>
                <div class="category-difference">
                    ${this.getCategoryDifferenceText('service', playerStats.averageRating, aiStats.averageRating)}
                </div>
            </div>
        `;
        
        this.domElements.categoryBreakdown.innerHTML = breakdown;
    }
    
    getCategoryWinnerText(winner) {
        switch (winner) {
            case 'player': return '👤 Player Wins!';
            case 'ai': return '🤖 AI Wins!';
            case 'tie': return '🤝 Tie!';
            default: return '';
        }
    }

    getCategoryDifferenceText(category, playerValue, aiValue) {
        const difference = playerValue - aiValue;
        const absDifference = Math.abs(difference);
        
        if (difference === 0) {
            return '<span class="difference-tie">🤝 Exactly tied!</span>';
        }
        
        const isPlayerWinning = difference > 0;
        const differenceText = this.formatDifference(category, absDifference);
        
        if (isPlayerWinning) {
            return `<span class="difference-win">🎯 You're ahead by ${differenceText}</span>`;
        } else {
            return `<span class="difference-loss">📉 AI is ahead by ${differenceText}</span>`;
        }
    }

    formatDifference(category, difference) {
        switch (category) {
            case 'customers':
                return `${difference} customer${difference === 1 ? '' : 's'}`;
            case 'earnings':
                return `$${difference.toFixed(2)}`;
            case 'service':
                return `${difference.toFixed(1)} star${difference === 1 ? '' : 's'}`;
            default:
                return difference.toString();
        }
    }
    
    updateFinalRoundWinners() {
        const { categories } = this.currentRoundResults;
        
        // Update round winner displays with final results
        Object.keys(categories).forEach(category => {
            const winnerElement = this.domElements[`${category}RoundWinner`];
            if (winnerElement) {
                const winner = categories[category];
                winnerElement.textContent = this.getCategoryWinnerText(winner);
                winnerElement.className = `round-winner final-result ${winner}`;
            }
        });
    }
    
    clearRoundWinners() {
        ['customers', 'earnings', 'service'].forEach(category => {
            const winnerElement = this.domElements[`${category}RoundWinner`];
            if (winnerElement) {
                winnerElement.textContent = '🤝 Even';
                winnerElement.className = 'round-winner';
            }
        });
    }
    
    updateCompetitionControls() {
        if (this.domElements.startCompetitionBtn) {
            this.domElements.startCompetitionBtn.style.display = 
                this.competitionActive ? 'none' : 'block';
        }
        
        if (this.domElements.endCompetitionBtn) {
            this.domElements.endCompetitionBtn.style.display = 
                this.competitionActive ? 'block' : 'none';
        }
        
        if (this.domElements.newCompetitionBtn) {
            this.domElements.newCompetitionBtn.style.display = 
                (!this.competitionActive && this.currentRoundResults) ? 'block' : 'none';
        }
    }
    
    setAIDifficulty(difficulty) {
        if (this.aiOpponent) {
            this.aiOpponent.setDifficulty(difficulty);
            console.log(`AI difficulty set to: ${difficulty}`);
        }
    }
    
    // Debug methods for troubleshooting
    enableDebugMode() {
        this.debugMode = true;
        console.log('🐛 VS Mode debug mode enabled - detailed logging activated');
    }
    
    disableDebugMode() {
        this.debugMode = false;
        console.log('🐛 VS Mode debug mode disabled');
    }
    
    logCurrentStats() {
        const playerStats = this.getPlayerStats();
        const aiStats = this.getAIStats();
        
        console.log('📊 Current Competition Stats:', {
            competition: {
                active: this.competitionActive,
                timeRemaining: this.competitionActive ? this.getRemainingTime() : 'N/A'
            },
            player: playerStats,
            ai: aiStats,
            lastUpdate: new Date().toLocaleTimeString()
        });
        
        return { player: playerStats, ai: aiStats };
    }
    
    getRemainingTime() {
        if (!this.competitionActive || !this.competitionStartTime) return 0;
        
        const elapsed = Date.now() - this.competitionStartTime;
        const remaining = Math.max(0, this.competitionDuration - elapsed);
        
        return Math.ceil(remaining / 1000); // Return seconds remaining
    }
    
    // Force immediate update of all displays
    forceUpdateDisplays() {
        console.log('🔄 Forcing immediate update of all scoring displays...');
        this.updateCompetitionDisplay();
        console.log('✅ Forced update completed');
    }
    
    // Update competition timer display
    updateCompetitionTimer() {
        if (!this.competitionActive) return;
        
        const timerElement = document.getElementById('competition-timer');
        if (timerElement) {
            const remaining = this.getRemainingTime();
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Add urgency styling when time is running low
            if (remaining <= 30) {
                timerElement.classList.add('timer-urgent');
            } else if (remaining <= 60) {
                timerElement.classList.add('timer-warning');
            } else {
                timerElement.classList.remove('timer-urgent', 'timer-warning');
            }
        }
    }
    
    isCompetitionActive() {
        return this.competitionActive;
    }
    
    isInVSMode() {
        return this.isVSMode;
    }
    
    setGameMode(mode) {
        this.gameMode = mode;
        console.log(`🎮 Game mode set to: ${mode}`);
        
        // Special handling for Progressive Play mode
        if (mode === 'progressive') {
            console.log('🏆 Progressive Play mode activated - setting up enhanced state management');
            
            // Ensure VS mode is enabled for Progressive Play
            if (!this.isVSMode) {
                this.enableVSMode();
            }
        }
    }
    
    ensureProgressivePlayContinuity() {
        if (this.gameMode !== 'progressive') return;
        
        console.log('🔄 Ensuring Progressive Play continuity...');
        
        // Ensure timer is running
        if (window.main && window.main.gameManager && window.main.gameManager.timerManager) {
            const timerManager = window.main.gameManager.timerManager;
            
            if (!timerManager.isTimerRunning() && !timerManager.isTimerPaused()) {
                console.log('🔄 Restarting timer for Progressive Play...');
                timerManager.startTimer();
            } else if (timerManager.isTimerPaused()) {
                console.log('⏸️ Resuming paused timer for Progressive Play...');
                timerManager.resumeTimer();
            }
        }
        
        // Ensure VS mode is active
        if (!this.isVSMode) {
            console.log('🔄 Re-enabling VS mode for Progressive Play...');
            this.enableVSMode();
        }
        
        // Ensure competition is active
        if (!this.competitionActive) {
            console.log('🔄 Re-activating competition for Progressive Play...');
            this.startCompetition();
        }
        
        // Ensure game manager is properly configured
        if (window.main && window.main.gameManager) {
            const gameManager = window.main.gameManager;
            
            // Resume game if it was paused
            if (gameManager.isPaused) {
                console.log('🔄 Resuming game for Progressive Play...');
                gameManager.resumeGame();
            }
            
            // Ensure customer spawning continues
            if (gameManager.customerManager) {
                console.log('🔄 Ensuring customer spawning continues...');
                // Use the correct method name from CustomerManager
                if (typeof gameManager.customerManager.startCustomerSpawning === 'function') {
                    gameManager.customerManager.startCustomerSpawning();
                } else {
                    console.warn('⚠️ Customer spawning method not available');
                }
            }
        }
        
        console.log('✅ Progressive Play continuity ensured');
    }

    handleProgressivePlayResult(results) {
        // Store the results for detailed display in victory/defeat screens
        this.currentRoundResults = results;
        console.log('📊 Progressive Play: Stored round results for detailed display:', results);
        
        // Use the overallWinner field returned by calculateFinalResults()
        // to determine whether the player won this round.
        const playerWon = results.overallWinner === 'player';
        
        if (playerWon) {
            console.log('🎯 Progressive Play: Player won this round!');
            
            // Check if there are more opponents
            if (window.main && typeof window.main.advanceProgressivePlay === 'function') {
                // Show enhanced victory message with detailed statistics
                this.showProgressiveVictory(() => {
                    window.main.advanceProgressivePlay();
                });
            } else {
                // Fallback - show regular results
                this.showCompetitionResults();
            }
        } else {
            console.log('🎯 Progressive Play: Player lost - showing enhanced defeat message');
            this.showProgressiveDefeat();
        }
    }

    showProgressiveVictory(onContinue) {
        // Get the current round results for detailed display
        const currentResults = this.currentRoundResults;
        const playerStats = currentResults ? currentResults.playerStats : null;
        const aiStats = currentResults ? currentResults.aiStats : null;
        const categories = currentResults ? currentResults.categories : null;
        
        const victoryDiv = document.createElement('div');
        victoryDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Comic Sans MS', Arial, sans-serif;
            animation: modalFadeIn 0.5s ease-out;
        `;
        
        // Calculate remaining opponents
        const remainingOpponents = window.main && window.main.progressivePlayCharacters ? 
            window.main.progressivePlayCharacters.length - (window.main.currentProgressiveIndex + 1) : 0;
        
        victoryDiv.innerHTML = `
            <div style="
                background: white;
                color: #2c3e50;
                padding: 30px;
                border-radius: 25px;
                text-align: center;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                font-family: 'Comic Sans MS', Arial, sans-serif;
            ">
                <div style="
                    background: linear-gradient(135deg, #27ae60, #2ecc71);
                    color: white;
                    padding: 15px;
                    border-radius: 15px;
                    margin-bottom: 20px;
                ">
                    <h2 style="font-size: 2rem; margin-bottom: 8px;">🎉 Victory! 🎉</h2>
                    <p style="font-size: 1.1rem; margin-bottom: 8px;">
                        Great job! You defeated this opponent!
                    </p>
                    <p style="font-size: 1rem; margin-bottom: 0;">
                        ${remainingOpponents > 0 ? `Only ${remainingOpponents} opponent${remainingOpponents > 1 ? 's' : ''} left!` : 'Final opponent defeated!'}
                    </p>
                </div>
                
                ${playerStats && aiStats ? `
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 1.2rem;">📊 Quick Stats</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #27ae60;">
                            <h4 style="margin: 0 0 8px 0; color: #27ae60; font-size: 1rem;">👤 You</h4>
                            <div style="font-size: 0.85rem; line-height: 1.3;">
                                <div>👥 ${playerStats.customersServed} customers</div>
                                <div>💰 ${GameConfig.formatMoney(playerStats.totalEarnings)}</div>
                                <div>⭐ ${playerStats.averageRating.toFixed(1)} rating</div>
                            </div>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #e74c3c;">
                            <h4 style="margin: 0 0 8px 0; color: #e74c3c; font-size: 1rem;">🤖 AI</h4>
                            <div style="font-size: 0.85rem; line-height: 1.3;">
                                <div>👥 ${aiStats.customersServed} customers</div>
                                <div>💰 ${GameConfig.formatMoney(aiStats.totalEarnings)}</div>
                                <div>⭐ ${aiStats.averageRating.toFixed(1)} rating</div>
                            </div>
                        </div>
                    </div>
                    
                    ${categories ? `
                    <div style="background: #ecf0f1; padding: 15px; border-radius: 8px;">
                        <h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 1rem;">🏆 Categories Won</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                            <div style="text-align: center; padding: 8px; border-radius: 6px; background: ${categories.customers === 'player' ? '#d5f4e6' : categories.customers === 'ai' ? '#fadbd8' : '#fef9e7'};">
                                <div style="font-weight: bold; margin-bottom: 3px; font-size: 0.9rem;">👥</div>
                                <div style="font-size: 1.1rem;">${categories.customers === 'player' ? '✅' : categories.customers === 'ai' ? '❌' : '🤝'}</div>
                            </div>
                            <div style="text-align: center; padding: 8px; border-radius: 6px; background: ${categories.earnings === 'player' ? '#d5f4e6' : categories.earnings === 'ai' ? '#fadbd8' : '#fef9e7'};">
                                <div style="font-weight: bold; margin-bottom: 3px; font-size: 0.9rem;">💰</div>
                                <div style="font-size: 1.1rem;">${categories.earnings === 'player' ? '✅' : categories.earnings === 'ai' ? '❌' : '🤝'}</div>
                            </div>
                            <div style="text-align: center; padding: 8px; border-radius: 6px; background: ${categories.service === 'player' ? '#d5f4e6' : categories.service === 'ai' ? '#fadbd8' : '#fef9e7'};">
                                <div style="font-weight: bold; margin-bottom: 3px; font-size: 0.9rem;">⭐</div>
                                <div style="font-size: 1.1rem;">${categories.service === 'player' ? '✅' : categories.service === 'ai' ? '❌' : '🤝'}</div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <button id="continueBtn" style="
                        background: linear-gradient(135deg, #27ae60, #2ecc71);
                        color: white;
                        border: none;
                        padding: 12px 25px;
                        border-radius: 12px;
                        cursor: pointer;
                        font-size: 1.1rem;
                        font-weight: bold;
                        transition: all 0.3s ease;
                        min-width: 140px;
                    ">🚀 Start Next Level</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(victoryDiv);
        
        // Add enhanced styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes modalFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
            #continueBtn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
        `;
        document.head.appendChild(style);
        
        // Handle button clicks
        const continueBtn = victoryDiv.querySelector('#continueBtn');
        
        const advance = () => {
            victoryDiv.remove();
            if (onContinue) onContinue();
        };
        
        continueBtn.addEventListener('click', advance);
    }

    showProgressiveDefeat() {
        // Get the current round results for detailed display
        const currentResults = this.currentRoundResults;
        const playerStats = currentResults ? currentResults.playerStats : null;
        const aiStats = currentResults ? currentResults.aiStats : null;
        const categories = currentResults ? currentResults.categories : null;
        
        const defeatDiv = document.createElement('div');
        defeatDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Comic Sans MS', Arial, sans-serif;
            animation: modalFadeIn 0.5s ease-out;
        `;
        
        defeatDiv.innerHTML = `
            <div style="
                background: white;
                color: #2c3e50;
                padding: 30px;
                border-radius: 25px;
                text-align: center;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                font-family: 'Comic Sans MS', Arial, sans-serif;
            ">
                <div style="
                    background: linear-gradient(135deg, #e74c3c, #c0392b);
                    color: white;
                    padding: 15px;
                    border-radius: 15px;
                    margin-bottom: 20px;
                ">
                    <h2 style="font-size: 2rem; margin-bottom: 8px;">💪 Good Job So Far! 💪</h2>
                    <p style="font-size: 1.1rem; margin-bottom: 8px;">
                        You didn't win this time, but every defeat is a step towards success!
                    </p>
                    <p style="font-size: 1rem; margin-bottom: 0;">
                        Progressive Play has ended. Ready to try again?
                    </p>
                </div>
                
                ${playerStats && aiStats ? `
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 1.2rem;">📊 Final Round Stats</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #27ae60;">
                            <h4 style="margin: 0 0 8px 0; color: #27ae60; font-size: 1rem;">👤 You</h4>
                            <div style="font-size: 0.85rem; line-height: 1.3;">
                                <div>👥 ${playerStats.customersServed} customers</div>
                                <div>💰 ${GameConfig.formatMoney(playerStats.totalEarnings)}</div>
                                <div>⭐ ${playerStats.averageRating.toFixed(1)} rating</div>
                            </div>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; border-left: 4px solid #e74c3c;">
                            <h4 style="margin: 0 0 8px 0; color: #e74c3c; font-size: 1rem;">🤖 AI</h4>
                            <div style="font-size: 0.85rem; line-height: 1.3;">
                                <div>👥 ${aiStats.customersServed} customers</div>
                                <div>💰 ${GameConfig.formatMoney(aiStats.totalEarnings)}</div>
                                <div>⭐ ${aiStats.averageRating.toFixed(1)} rating</div>
                            </div>
                        </div>
                    </div>
                    
                    ${categories ? `
                    <div style="background: #ecf0f1; padding: 15px; border-radius: 8px;">
                        <h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 1rem;">🏆 Categories Won</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                            <div style="text-align: center; padding: 8px; border-radius: 6px; background: ${categories.customers === 'player' ? '#d5f4e6' : categories.customers === 'ai' ? '#fadbd8' : '#fef9e7'};">
                                <div style="font-weight: bold; margin-bottom: 3px; font-size: 0.9rem;">👥</div>
                                <div style="font-size: 1.1rem;">${categories.customers === 'player' ? '✅' : categories.customers === 'ai' ? '❌' : '🤝'}</div>
                            </div>
                            <div style="text-align: center; padding: 8px; border-radius: 6px; background: ${categories.earnings === 'player' ? '#d5f4e6' : categories.earnings === 'ai' ? '#fadbd8' : '#fef9e7'};">
                                <div style="font-weight: bold; margin-bottom: 3px; font-size: 0.9rem;">💰</div>
                                <div style="font-size: 1.1rem;">${categories.earnings === 'player' ? '✅' : categories.earnings === 'ai' ? '❌' : '🤝'}</div>
                            </div>
                            <div style="text-align: center; padding: 8px; border-radius: 6px; background: ${categories.service === 'player' ? '#d5f4e6' : categories.service === 'ai' ? '#fadbd8' : '#fef9e7'};">
                                <div style="font-weight: bold; margin-bottom: 3px; font-size: 0.9rem;">⭐</div>
                                <div style="font-size: 1.1rem;">${categories.service === 'player' ? '✅' : categories.service === 'ai' ? '❌' : '🤝'}</div>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                
                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <button id="tryAgainBtn" style="
                        background: linear-gradient(135deg, #27ae60, #2ecc71);
                        color: white;
                        border: none;
                        padding: 12px 25px;
                        border-radius: 12px;
                        cursor: pointer;
                        font-size: 1.1rem;
                        font-weight: bold;
                        transition: all 0.3s ease;
                        min-width: 140px;
                    ">🔄 Try Again</button>
                    
                    <button id="backToMenuBtn" style="
                        background: rgba(255,255,255,0.2);
                        color: #2c3e50;
                        border: 2px solid #2c3e50;
                        padding: 12px 25px;
                        border-radius: 12px;
                        cursor: pointer;
                        font-size: 1.1rem;
                        font-weight: bold;
                        transition: all 0.3s ease;
                        min-width: 140px;
                    ">🏠 Menu</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(defeatDiv);
        
        // Add enhanced styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes modalFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
            #tryAgainBtn:hover, #backToMenuBtn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
        `;
        document.head.appendChild(style);
        
        // Handle button clicks
        const tryAgainBtn = defeatDiv.querySelector('#tryAgainBtn');
        const backToMenuBtn = defeatDiv.querySelector('#backToMenuBtn');
        
        const tryAgain = () => {
            defeatDiv.remove();
            if (window.main && window.main.startProgressivePlay) {
                window.main.startProgressivePlay();
            }
        };
        
        const backToMenu = () => {
            defeatDiv.remove();
            if (window.main && window.main.backToDifficultySelection) {
                window.main.backToDifficultySelection();
            }
        };
        
        tryAgainBtn.addEventListener('click', tryAgain);
        backToMenuBtn.addEventListener('click', backToMenu);
    }
    
    dispose() {
        this.disableVSMode();
        
        if (this.aiOpponent) {
            this.aiOpponent.dispose();
            this.aiOpponent = null;
        }
        
        this.stopCompetitionTimer();
        this.stopUpdateLoop();
        
        this.domElements = {};
        
        console.log('VS Mode Manager disposed');
    }
    
    // Method called by GameManager when both first customers are spawned
    startCompetitionTimerNow() {
        if (!this.competitionActive) {
            console.log('⚠️ Cannot start timer - competition not active');
            return;
        }
        
        if (this.competitionTimer) {
            console.log('⚠️ Competition timer already started');
            return;
        }
        
        console.log('🎯 Starting competition timer NOW - both customers are ready!');
        this.competitionStartTime = Date.now(); // Reset start time to now
        this.startCompetitionTimer();
        console.log('✅ Competition timer started successfully');
    }
}

// Export for global access
window.VSModeManager = VSModeManager;
