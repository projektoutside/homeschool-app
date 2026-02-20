// Farmers Market Frenzy 3D - Game Manager
class GameManager {
    constructor() {
        // Core managers
        this.sceneManager = null;
        this.customerManager = null;
        this.productManager = null;
        this.moneyManager = null;
        this.timerManager = null;
        this.settingsManager = null;
        this.vsModeManager = null;

        // Game state
        this.isGameRunning = false;
        this.isPaused = false;
        this.gameStartTime = null;
        this.totalScore = 0;
        this.popularity = GameConfig.GAME_SETTINGS.STARTING_POPULARITY;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.difficulty = 'medium'; // Default difficulty

        // Performance tracking
        this.customersServed = 0;
        this.totalEarnings = 0;
        this.perfectSales = 0;
        this.averageRating = 0;
        this.totalRatings = 0;

        // Game session data
        this.sessionStartTime = null;
        this.lastSaveTime = null;
        this.autoSaveInterval = null;

        // Centralized DOM element cache
        this.domElements = {};

        // Don't auto-initialize - let Main.js control initialization
        console.log('GameManager constructor completed');

        this.synchronizedSpawnTimer = null;
        this.playerSpawnTimer = null;

        // Debugging state for first customer spawn
        this.firstCustomersSpawned = {
            player: false,
            ai: false,
            timerStarted: false
        };
        this.firstCustomersSpawned = {
            player: false,
            ai: false,
            timerStarted: false
        };
        this.tutorialStep = 0; // Initialize tutorial step

        // Orientation state tracking
        this.wasPausedByOrientation = false;
        this.orientationLocked = false;
        this.boundOnWindowClose = this.onWindowClose.bind(this);
        this.boundOnVisibilityChange = this.onVisibilityChange.bind(this);
    }

    async initialize() {
        try {
            console.log('Initializing Farmers Market Frenzy 3D...');

            // Initialize DOM elements first
            this.initializeDOMElements();

            // Load saved game data
            this.loadGameData();

            // Initialize managers with proper error handling
            const managersInitialized = await this.initializeManagers();
            if (!managersInitialized) {
                throw new Error('Critical managers failed to initialize');
            }

            // Setup event listeners
            this.setupEventListeners();

            // Setup auto-save
            this.setupAutoSave();

            // Show tutorial or start game
            this.showTutorial();

            console.log('✅ Game initialization complete!');
            return true;

        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            this.showError('Failed to load game. Please refresh the page.');
            return false;
        }
    }

    initializeDOMElements() {
        // Cache all DOM elements used throughout the game
        this.domElements = {
            // Main containers
            gameContainer: document.getElementById('gameContainer'),
            loadingScreen: document.getElementById('loadingScreen'),
            gameHUD: document.getElementById('gameHUD'),
            tutorialOverlay: document.getElementById('tutorialOverlay'),
            pauseMenu: document.getElementById('pauseMenu'),
            reviewPanel: document.getElementById('reviewPanel'),

            // VS Mode scoring elements (used instead of traditional HUD)
            customersScorePlayer: document.getElementById('customersScorePlayer'),
            earningsScorePlayer: document.getElementById('earningsScorePlayer'),
            serviceScorePlayer: document.getElementById('serviceScorePlayer'),

            // Review elements
            reviewStars: document.getElementById('reviewStars'),
            reviewText: document.getElementById('reviewText'),
            reviewImpact: document.getElementById('reviewImpact'),
            nextCustomerBtn: document.getElementById('nextCustomerBtn'),

            // Control buttons
            pauseBtn: document.getElementById('pauseBtn'),
            resumeBtn: document.getElementById('resumeBtn'),
            restartBtn: document.getElementById('restartBtn'),
            tutorialBtn: document.getElementById('tutorialBtn'),

            // Tutorial navigation
            prevStepBtn: document.getElementById('prevStepBtn'),
            nextStepBtn: document.getElementById('nextStepBtn'),
            startGameBtn: document.getElementById('startGameBtn'),

            // Product display grid (for order display)
            productDisplayGrid: document.getElementById('orderItems'),

            // Panel Minimize Controls
            aiPanelToggleBtn: document.getElementById('aiPanelToggleBtn'),
            aiStatsPanel: document.getElementById('aiStatsPanel'),
            scoringPanel: document.getElementById('scoringPanel'),
            scoringPanelToggleBtn: document.getElementById('scoringPanelToggleBtn')
        };

        // Validate critical elements and throw error if missing
        const criticalElements = ['gameContainer'];

        for (const elementName of criticalElements) {
            if (!this.domElements[elementName]) {
                throw new Error(`Critical DOM element '${elementName}' not found`);
            }
        }

        console.log('✅ DOM elements initialized successfully');
    }

    async initializeManagers() {
        try {
            const sceneContainer = document.getElementById('sceneContainer');

            // Initialize settings manager (get reference from global if available)
            this.settingsManager = window.settingsManager || null;

            // Initialize scene manager with proper error handling
            try {
                // Ensure SceneManager class is available before instantiating
                if (typeof SceneManager !== 'undefined') {
                    this.sceneManager = new SceneManager(sceneContainer);
                    if (!this.sceneManager.isInitialized) {
                        console.warn('SceneManager failed to initialize - continuing without 3D features');
                    }
                } else {
                    console.warn('SceneManager class not found - continuing without 3D features');
                    this.sceneManager = null;
                }
            } catch (error) {
                console.warn('SceneManager initialization failed:', error);
                this.sceneManager = null;
            }

            // Initialize product manager
            this.productManager = new ProductManager(this);

            // Initialize money manager
            this.moneyManager = new MoneyManager(this);

            // Initialize customer manager (after scene is ready)
            try {
                this.customerManager = new CustomerManager(this, this.sceneManager);
                console.log('✅ Customer Manager initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize Customer Manager:', error);
                throw error; // This is critical for game functionality
            }

            // Initialize timer manager
            this.timerManager = new TimerManager(this);
            const timerInitialized = await this.timerManager.initialize();

            // Setup timer callbacks only if timer was initialized successfully
            if (timerInitialized) {
                this.timerManager.setOnTimerWarning((timeRemaining) => {
                    this.onTimerWarning(timeRemaining);
                });

                this.timerManager.setOnTimerExpired(() => {
                    this.onTimerExpired();
                });

                this.timerManager.setOnTimerTick((timeRemaining, formattedTime) => {
                    // Optional: Add any per-tick logic here
                });

                // Set default game mode
                this.timerManager.setGameMode('single');

                // Refresh settings if SettingsManager is already available
                if (this.settingsManager) {
                    setTimeout(() => {
                        this.timerManager.refreshSettings();
                        console.log('✅ Timer settings refreshed after initialization');
                    }, 100);
                }
            } else {
                console.warn('Timer not available - continuing without timer functionality');
            }

            // Initialize AI Opponent Manager (but don't auto-start competition)
            try {
                if (typeof AIOpponentManager !== 'undefined') {
                    this.aiOpponentManager = new AIOpponentManager(this);
                    this.aiOpponentManager.init();
                    console.log('✅ AI Opponent Manager initialized');
                } else {
                    console.warn('AIOpponentManager not available - no AI competition');
                }
            } catch (error) {
                console.warn('Failed to initialize AI Opponent Manager:', error);
                this.aiOpponentManager = null;
            }

            // Initialize VS Mode Manager (but don't auto-enable)
            try {
                if (typeof VSModeManager !== 'undefined') {
                    this.vsModeManager = new VSModeManager(this);
                    this.vsModeManager.init();
                    console.log('✅ VS Mode Manager initialized');
                } else {
                    console.warn('VSModeManager not available - VS mode features disabled');
                }
            } catch (error) {
                console.warn('Failed to initialize VS Mode Manager:', error);
                this.vsModeManager = null;
            }

            // Initialize product display for orders (optional)
            this.initializeProductDisplay();

            console.log('✅ All managers initialized successfully');

            return true;

        } catch (error) {
            console.error('❌ Manager initialization failed:', error);
            return false;
        }
    }

    setupEventListeners() {
        // Tutorial navigation
        if (this.domElements.prevStepBtn) {
            this.domElements.prevStepBtn.addEventListener('click', this.prevTutorialStep.bind(this));
        }
        if (this.domElements.nextStepBtn) {
            this.domElements.nextStepBtn.addEventListener('click', this.nextTutorialStep.bind(this));
        }
        if (this.domElements.startGameBtn) {
            this.domElements.startGameBtn.addEventListener('click', this.startGame.bind(this));
        }

        // Pause menu
        if (this.domElements.pauseBtn) {
            this.domElements.pauseBtn.addEventListener('click', this.togglePause.bind(this));
        }
        if (this.domElements.resumeBtn) {
            this.domElements.resumeBtn.addEventListener('click', this.resumeGame.bind(this));
        }
        if (this.domElements.restartBtn) {
            this.domElements.restartBtn.addEventListener('click', this.restartGame.bind(this));
        }
        if (this.domElements.tutorialBtn) {
            this.domElements.tutorialBtn.addEventListener('click', this.showTutorial.bind(this));
        }

        // Review panel
        if (this.domElements.nextCustomerBtn) {
            this.domElements.nextCustomerBtn.addEventListener('click', this.onReviewComplete.bind(this));
        }

        // AI Panel Minimize Toggle
        if (this.domElements.aiPanelToggleBtn) {
            this.domElements.aiPanelToggleBtn.addEventListener('click', this.toggleAiPanel.bind(this));
            // Also allow clicking header to toggle (if not clicking button directly)
            const aiHeader = this.domElements.aiStatsPanel?.querySelector('.ai-panel-header');
            if (aiHeader) {
                aiHeader.addEventListener('click', (e) => {
                    if (e.target !== this.domElements.aiPanelToggleBtn) {
                        this.toggleAiPanel();
                    }
                });
            }
        }

        // Competition Scoreboard Minimize Toggle
        if (this.domElements.scoringPanelToggleBtn) {
            this.domElements.scoringPanelToggleBtn.addEventListener('click', this.toggleScoringPanel.bind(this));
        }

        // Ensure scoreboard toggle button reflects current state after listeners are attached
        if (this.domElements.scoringPanel) {
            this.toggleScoringPanel(this.domElements.scoringPanel.classList.contains('minimized'));
        }

        // Auto-minimize on mobile start
        this.checkMobileAutoMinimize();

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));

        // Window events
        window.addEventListener('beforeunload', this.boundOnWindowClose);
        window.addEventListener('visibilitychange', this.boundOnVisibilityChange);

    }

    handleKeyboard(event) {
        if (!this.isGameRunning) return;

        switch (event.key) {
            case ' ':
                event.preventDefault();
                this.togglePause();
                break;
            case 'Escape':
                event.preventDefault();
                if (!this.isPaused) this.pauseGame();
                break;
            case 'h':
                if (event.ctrlKey && this.moneyManager) {
                    event.preventDefault();
                    this.moneyManager.showChangeHint();
                }
                break;
        }
    }

    // Game flow control
    async startGame() {
        console.log('Starting Farmers Market Frenzy 3D!');

        // Reset game state to start fresh
        this.resetGameState();

        this.hideTutorial();
        this.hideLoadingScreen();
        this.showGameContainer();

        // CRITICAL FIX: Force layout reflow to ensure container is visible
        // before creating 3D scene
        const gameContainer = this.domElements.gameContainer;
        if (gameContainer) {
            // Force browser to recalculate layout
            gameContainer.offsetHeight;

            // Add small delay to ensure container is fully rendered
            await new Promise(resolve => setTimeout(resolve, 100));

            // Double-check container dimensions
            const sceneContainer = document.getElementById('sceneContainer');
            if (sceneContainer) {
                console.log('🔍 Container dimensions before 3D scene creation:',
                    sceneContainer.clientWidth + 'x' + sceneContainer.clientHeight);

                // If still 0x0, force minimum dimensions temporarily
                if (sceneContainer.clientWidth === 0 || sceneContainer.clientHeight === 0) {
                    console.log('⚠️ Container still hidden, forcing dimensions...');
                    sceneContainer.style.width = '100vw';
                    sceneContainer.style.height = '100vh';
                    sceneContainer.style.position = 'absolute';
                    sceneContainer.style.top = '0';
                    sceneContainer.style.left = '0';
                }
            }
        }

        // Create 3D scene now that container is definitely visible
        const sceneCreated = await this.createSceneManager();

        this.isGameRunning = true;
        this.isPaused = false;
        this.gameStartTime = Date.now();
        this.sessionStartTime = Date.now();

        // Start synchronized customer spawning (only if scene was created successfully)
        if (this.customerManager) {
            this.startSynchronizedCustomerSpawning();
        }

        // Start timer with appropriate game mode
        if (this.timerManager) {
            // Check if we're in VS mode and use the appropriate game mode
            let gameMode = 'single';
            if (this.vsModeManager && this.vsModeManager.isInVSMode()) {
                gameMode = this.vsModeManager.gameMode || 'vs';
                console.log(`🎮 Starting timer for ${gameMode} mode`);
            }

            // Ensure the timer uses the latest saved settings before starting
            this.ensureLatestTimerSettings(gameMode);

            // Ensure the timer is properly configured and started
            this.timerManager.startTimer(null, gameMode);

            // Add a small delay to ensure timer starts properly
            setTimeout(() => {
                if (this.timerManager && !this.timerManager.isTimerRunning()) {
                    console.warn('⚠️ Timer not running after start, attempting restart...');
                    this.timerManager.startTimer(null, gameMode);
                }
            }, 100);
        }

        // Update HUD
        this.updateHUD();

        if (sceneCreated) {
            console.log('✅ Game started successfully with 3D scene!');
        } else {
            console.log('⚠️ Game started in 2D mode (3D scene failed to load)');
        }
    }

    // Method to create and initialize the SceneManager
    async createSceneManager() {
        console.log('Creating SceneManager...');
        try {
            const sceneContainer = document.getElementById('sceneContainer');
            if (!sceneContainer) {
                console.error('❌ Scene container not found!');
                return false;
            }

            // Ensure SceneManager class is available
            if (typeof SceneManager === 'undefined') {
                console.error('❌ SceneManager class is not defined!');
                return false;
            }

            // Instantiate SceneManager
            this.sceneManager = new SceneManager(sceneContainer);

            // Initialize SceneManager
            const initialized = this.sceneManager.init();

            if (initialized) {
                console.log('✅ SceneManager created and initialized successfully');
                return true;
            } else {
                console.warn('⚠️ SceneManager failed to initialize properly, continuing without 3D scene.');
                this.sceneManager = null; // Ensure it's null if initialization failed
                return false;
            }
        } catch (error) {
            console.error('❌ Error creating or initializing SceneManager:', error);
            this.sceneManager = null; // Ensure it's null on error
            return false;
        }
    }

    resetGameState() {
        // Reset all counters and state
        this.totalScore = 0;
        this.popularity = GameConfig.GAME_SETTINGS.STARTING_POPULARITY;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.customersServed = 0;
        this.totalEarnings = 0;
        this.perfectSales = 0;
        this.averageRating = 0;
        this.totalRatings = 0;

        // Reset timers
        this.gameStartTime = null;
        this.sessionStartTime = null;

        // Reset managers if they exist
        if (this.customerManager) {
            this.customerManager.resetCustomers();
        }
        if (this.moneyManager) {
            this.moneyManager.resetAll();
        }
        if (this.timerManager) {
            this.timerManager.resetTimer();
        }

        console.log('Game state reset');
    }

    pauseGame() {
        try {
            if (!this.isGameRunning || this.isPaused) return;

            this.isPaused = true;

            // Pause managers
            if (this.customerManager) {
                this.customerManager.pauseCustomers();
            }

            // Pause timer
            if (this.timerManager) {
                this.timerManager.pauseTimer();
            }

            // Pause AI processing so competitions cannot progress in background
            if (this.aiOpponentManager && typeof this.aiOpponentManager.pauseCompetition === 'function') {
                this.aiOpponentManager.pauseCompetition();
            }

            // Stop VS update loop while paused
            if (this.vsModeManager && typeof this.vsModeManager.stopUpdateLoop === 'function') {
                this.vsModeManager.stopUpdateLoop();
            }

            // Pause synchronized spawns entirely
            this.stopSynchronizedCustomerSpawning();

            this.showPauseMenu();
            this.updatePauseMenu();

            console.log('Game paused');
        } catch (error) {
            console.error('Failed to pause game:', error);
        }
    }

    resumeGame() {
        if (!this.isGameRunning || !this.isPaused) return;

        this.isPaused = false;

        // Resume managers
        if (this.customerManager) {
            this.customerManager.resumeCustomers();
        }

        // Resume timer
        if (this.timerManager) {
            this.timerManager.resumeTimer();
        }

        // Resume AI processing if VS mode is active
        if (this.aiOpponentManager && typeof this.aiOpponentManager.resumeCompetition === 'function') {
            this.aiOpponentManager.resumeCompetition();
        }

        // Restore synchronized customer spawning loop
        this.ensureSynchronizedSpawnTimerRunning();

        // Resume VS scoreboard updates if a competition is active
        const vsCompetitionActive = this.vsModeManager &&
            typeof this.vsModeManager.isCompetitionActive === 'function' &&
            this.vsModeManager.isCompetitionActive();
        if (vsCompetitionActive && typeof this.vsModeManager.startUpdateLoop === 'function') {
            this.vsModeManager.startUpdateLoop();
        }

        this.hidePauseMenu();

        console.log('Game resumed');
    }

    togglePause() {
        if (this.isPaused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }

    toggleFullscreen() {
        const mainApp = window.main;
        if (mainApp && typeof mainApp.attemptEnterFullscreen === 'function') {
            mainApp.attemptEnterFullscreen();
            return;
        }

        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn(`Error attempting to enable fullscreen: ${err.message}`);
            });
        }
    }

    toggleAiPanel() {
        if (this.domElements.aiStatsPanel) {
            this.domElements.aiStatsPanel.classList.toggle('minimized');
            const isMinimized = this.domElements.aiStatsPanel.classList.contains('minimized');

            // Update button text
            if (this.domElements.aiPanelToggleBtn) {
                this.domElements.aiPanelToggleBtn.textContent = isMinimized ? '+' : '_';
                this.domElements.aiPanelToggleBtn.setAttribute('aria-label', isMinimized ? 'Expand Scoreboard' : 'Minimize Scoreboard');
            }
        }
    }

    checkMobileAutoMinimize() {
        // If on small screen (mobile landscape), auto-minimize to show game view
        if (window.innerWidth <= 900 && this.domElements.aiStatsPanel) {
            this.domElements.aiStatsPanel.classList.add('minimized');
            if (this.domElements.aiPanelToggleBtn) {
                this.domElements.aiPanelToggleBtn.textContent = '+';
            }
        }
    }

    toggleScoringPanel(forceMinimized = null) {
        const scoringPanel = this.domElements.scoringPanel;
        if (!scoringPanel) return;

        const isCurrentlyMinimized = scoringPanel.classList.contains('minimized');
        const shouldMinimize = typeof forceMinimized === 'boolean'
            ? forceMinimized
            : !isCurrentlyMinimized;

        scoringPanel.classList.toggle('minimized', shouldMinimize);
        document.body.classList.toggle('scoreboard-minimized', shouldMinimize);

        if (this.domElements.scoringPanelToggleBtn) {
            this.domElements.scoringPanelToggleBtn.textContent = shouldMinimize ? '+' : '-';
            this.domElements.scoringPanelToggleBtn.setAttribute(
                'aria-label',
                shouldMinimize ? 'Expand competition scoreboard' : 'Minimize competition scoreboard'
            );
            this.domElements.scoringPanelToggleBtn.setAttribute('aria-expanded', String(!shouldMinimize));
        }
    }

    setOrientationLocked(isLocked) {
        // Orientation lock was removed; keep this method for backwards compatibility.
        this.orientationLocked = false;
        this.wasPausedByOrientation = false;
    }

    checkOrientation() {
        return false;
    }

    // Timer callbacks
    onTimerWarning(timeRemaining) {
        console.log(`⚠️ Timer warning: ${this.timerManager.formatTime(timeRemaining)} remaining`);

        // Could add visual warning effects here
        // For now, the timer display itself shows the warning
    }

    onTimerExpired() {
        console.log('⏰ Game timer expired');

        // If we are in an active VS competition, delegate ending logic to VSModeManager
        if (this.vsModeManager && this.vsModeManager.isCompetitionActive && this.vsModeManager.isCompetitionActive()) {
            console.log('🏁 Delegating timer expiration to VSModeManager…');
            this.vsModeManager.endCompetition();
        } else {
            // Fallback – normal single-player flow
            this.endGameDueToTimer();
        }
    }

    endGameDueToTimer(showResults = true) {
        console.log('Ending game due to timer expiration...');

        // Stop the game
        this.isGameRunning = false;
        this.isPaused = false;

        // Stop managers
        if (this.customerManager) {
            this.customerManager.pauseCustomers();
        }

        // Show final results (unless another manager will handle UI)
        if (showResults) {
            this.showGameEndResults();
        }
    }

    showGameEndResults() {
        // Calculate performance metrics and determine win/loss status
        const performanceMetrics = this.calculatePerformanceMetrics();

        // Create and show game end modal with results
        const endModal = this.createGameEndModal();
        document.body.appendChild(endModal);

        // Show the modal
        setTimeout(() => {
            endModal.classList.add('active');
        }, 100);
    }

    createGameEndModal() {
        // Calculate performance metrics and determine win/loss status
        const performanceMetrics = this.calculatePerformanceMetrics();

        const modal = document.createElement('div');
        modal.className = 'game-end-modal';
        modal.innerHTML = `
            <div class="game-end-content">
                <h2>⏰ Time's Up!</h2>
                
                <div class="performance-summary">
                    <h3>📊 Your Performance Summary</h3>
                    <div class="overall-result ${performanceMetrics.overallResult}">
                        <span class="result-icon">${performanceMetrics.resultIcon}</span>
                        <span class="result-text">${performanceMetrics.resultText}</span>
                    </div>
                </div>
                
                <div class="category-breakdown">
                    <h4>🏆 Category Results</h4>
                    
                    <div class="category-item ${performanceMetrics.customersServed.status}">
                        <div class="category-header">
                            <span class="category-icon">👥</span>
                            <span class="category-name">Customers Served</span>
                            <span class="category-status">${performanceMetrics.customersServed.icon} ${performanceMetrics.customersServed.statusText}</span>
                        </div>
                        <div class="category-details">
                            <span class="category-value">${this.customersServed} customers</span>
                            <span class="category-target">Target: ${performanceMetrics.customersServed.target}+</span>
                        </div>
                    </div>
                    
                    <div class="category-item ${performanceMetrics.totalEarnings.status}">
                        <div class="category-header">
                            <span class="category-icon">💰</span>
                            <span class="category-name">Total Earnings</span>
                            <span class="category-status">${performanceMetrics.totalEarnings.icon} ${performanceMetrics.totalEarnings.statusText}</span>
                        </div>
                        <div class="category-details">
                            <span class="category-value">$${this.totalEarnings.toFixed(2)}</span>
                            <span class="category-target">Target: $${performanceMetrics.totalEarnings.target}+</span>
                        </div>
                    </div>
                    
                    <div class="category-item ${performanceMetrics.averageRating.status}">
                        <div class="category-header">
                            <span class="category-icon">⭐</span>
                            <span class="category-name">Customer Service</span>
                            <span class="category-status">${performanceMetrics.averageRating.icon} ${performanceMetrics.averageRating.statusText}</span>
                        </div>
                        <div class="category-details">
                            <span class="category-value">${this.averageRating.toFixed(1)} stars</span>
                            <span class="category-target">Target: ${performanceMetrics.averageRating.target}+</span>
                        </div>
                    </div>
                </div>
                
                <div class="final-stats">
                    <h4>📈 Additional Stats</h4>
                    <div class="stat-item">
                        <span class="stat-label">Best Streak:</span>
                        <span class="stat-value">${this.bestStreak}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Perfect Sales:</span>
                        <span class="stat-value">${this.perfectSales}</span>
                    </div>
                    <div class="stat-label">Final Popularity:</div>
                    <div class="popularity-display">
                        <span class="popularity-value">${this.popularity.toFixed(1)}</span>
                        <span class="popularity-stars">${'⭐'.repeat(Math.floor(this.popularity))}${this.popularity % 1 >= 0.5 ? '⭐' : ''}</span>
                    </div>
                </div>
                
                <div class="game-end-buttons">
                    <button class="restart-btn" onclick="this.closest('.game-end-modal').remove(); window.gameManager.restartGame();">
                        🔄 Play Again
                    </button>
                    <button class="close-btn" onclick="this.closest('.game-end-modal').remove();">
                        ✖️ Close
                    </button>
                </div>
            </div>
        `;

        // Add styles
        modal.style.cssText = `
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
            z-index: 200;
            opacity: 0;
            transition: opacity 0.3s ease;
            animation: modalFadeIn 0.5s ease-out;
        `;

        modal.querySelector('.game-end-content').style.cssText = `
            background: white;
            border-radius: 25px;
            padding: 40px;
            max-width: 600px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            font-family: 'Comic Sans MS', Arial, sans-serif;
        `;

        // Add styles for the enhanced modal elements
        const style = document.createElement('style');
        style.textContent = `
            .game-end-modal .performance-summary {
                margin-bottom: 30px;
            }
            
            .game-end-modal .overall-result {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 15px;
                border-radius: 15px;
                margin: 15px 0;
                font-size: 1.2rem;
                font-weight: bold;
            }
            
            .game-end-modal .overall-result.victory {
                background: linear-gradient(135deg, #27ae60, #2ecc71);
                color: white;
            }
            
            .game-end-modal .overall-result.partial {
                background: linear-gradient(135deg, #f39c12, #e67e22);
                color: white;
            }
            
            .game-end-modal .overall-result.defeat {
                background: linear-gradient(135deg, #e74c3c, #c0392b);
                color: white;
            }
            
            .game-end-modal .category-breakdown {
                margin-bottom: 30px;
            }
            
            .game-end-modal .category-item {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 15px;
                margin: 10px 0;
                border-left: 5px solid #ddd;
                transition: all 0.3s ease;
            }
            
            .game-end-modal .category-item.win {
                border-left-color: #27ae60;
                background: linear-gradient(135deg, #d5f4e6, #e8f5e8);
            }
            
            .game-end-modal .category-item.loss {
                border-left-color: #e74c3c;
                background: linear-gradient(135deg, #fadbd8, #fdf2f2);
            }
            
            .game-end-modal .category-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            
            .game-end-modal .category-icon {
                font-size: 1.2rem;
                margin-right: 8px;
            }
            
            .game-end-modal .category-name {
                font-weight: bold;
                flex-grow: 1;
                text-align: left;
            }
            
            .game-end-modal .category-status {
                font-weight: bold;
                font-size: 0.9rem;
            }
            
            .game-end-modal .category-details {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.9rem;
                color: #666;
            }
            
            .game-end-modal .category-value {
                font-weight: bold;
                color: #2c3e50;
            }
            
            .game-end-modal .category-target {
                font-style: italic;
            }
            
            .game-end-modal .final-stats {
                background: #ecf0f1;
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
            }
            
            .game-end-modal .popularity-display {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                margin-top: 10px;
            }
            
            .game-end-modal .popularity-value {
                font-weight: bold;
                font-size: 1.1rem;
            }
            
            .game-end-modal .popularity-stars {
                color: #f39c12;
                font-size: 1.2rem;
            }
            
            .game-end-modal .game-end-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin-top: 30px;
            }
            
            .game-end-modal .restart-btn,
            .game-end-modal .close-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .game-end-modal .restart-btn {
                background: linear-gradient(135deg, #27ae60, #2ecc71);
                color: white;
            }
            
            .game-end-modal .restart-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
            }
            
            .game-end-modal .close-btn {
                background: linear-gradient(135deg, #95a5a6, #7f8c8d);
                color: white;
            }
            
            .game-end-modal .close-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(149, 165, 166, 0.3);
            }
        `;

        // Add animation keyframes
        const animationStyle = document.createElement('style');
        animationStyle.textContent = `
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
            
            @keyframes categorySlideIn {
                from {
                    opacity: 0;
                    transform: translateX(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            .game-end-modal .category-item {
                animation: categorySlideIn 0.6s ease-out;
                animation-fill-mode: both;
            }
            
            .game-end-modal .category-item:nth-child(1) { animation-delay: 0.1s; }
            .game-end-modal .category-item:nth-child(2) { animation-delay: 0.2s; }
            .game-end-modal .category-item:nth-child(3) { animation-delay: 0.3s; }
        `;
        document.head.appendChild(style);
        document.head.appendChild(animationStyle);

        return modal;
    }

    calculatePerformanceMetrics() {
        // Define performance targets based on difficulty
        const difficulty = this.getDifficulty();
        let targets = {
            customersServed: 5,
            totalEarnings: 25.00,
            averageRating: 3.5
        };

        // Adjust targets based on difficulty
        switch (difficulty) {
            case 'easy':
                targets = {
                    customersServed: 3,
                    totalEarnings: 15.00,
                    averageRating: 3.0
                };
                break;
            case 'medium':
                targets = {
                    customersServed: 5,
                    totalEarnings: 25.00,
                    averageRating: 3.5
                };
                break;
            case 'hard':
                targets = {
                    customersServed: 7,
                    totalEarnings: 35.00,
                    averageRating: 4.0
                };
                break;
        }

        // Calculate category results
        const customersServed = {
            value: this.customersServed,
            target: targets.customersServed,
            status: this.customersServed >= targets.customersServed ? 'win' : 'loss',
            statusText: this.customersServed >= targets.customersServed ? 'Excellent!' : 'Need more customers',
            icon: this.customersServed >= targets.customersServed ? '✅' : '❌'
        };

        const totalEarnings = {
            value: this.totalEarnings,
            target: targets.totalEarnings,
            status: this.totalEarnings >= targets.totalEarnings ? 'win' : 'loss',
            statusText: this.totalEarnings >= targets.totalEarnings ? 'Great earnings!' : 'Need higher sales',
            icon: this.totalEarnings >= targets.totalEarnings ? '✅' : '❌'
        };

        const averageRating = {
            value: this.averageRating,
            target: targets.averageRating,
            status: this.averageRating >= targets.averageRating ? 'win' : 'loss',
            statusText: this.averageRating >= targets.averageRating ? 'Outstanding service!' : 'Improve customer satisfaction',
            icon: this.averageRating >= targets.averageRating ? '✅' : '❌'
        };

        // Calculate overall result (win if 2+ categories are won)
        const wins = [customersServed, totalEarnings, averageRating].filter(cat => cat.status === 'win').length;
        let overallResult, resultIcon, resultText;

        if (wins >= 2) {
            overallResult = 'victory';
            resultIcon = '🎉';
            resultText = 'Congratulations! You\'re a Market Master!';
        } else if (wins === 1) {
            overallResult = 'partial';
            resultIcon = '👍';
            resultText = 'Good effort! Keep practicing to improve!';
        } else {
            overallResult = 'defeat';
            resultIcon = '💪';
            resultText = 'Don\'t give up! Practice makes perfect!';
        }

        return {
            overallResult,
            resultIcon,
            resultText,
            customersServed,
            totalEarnings,
            averageRating,
            wins,
            totalCategories: 3
        };
    }

    startSynchronizedCustomerSpawning() {
        const spawnInterval = GameConfig.GAME_SETTINGS.CUSTOMER_SPAWN_INTERVAL;
        console.log(`🔄 Starting synchronized customer spawning (interval: ${spawnInterval}ms)`);

        // Clear any existing spawn timer
        if (this.synchronizedSpawnTimer) {
            clearInterval(this.synchronizedSpawnTimer);
        }

        // Track first customer spawning for timer synchronization
        this.firstCustomersSpawned = {
            player: false,
            ai: false,
            timerStarted: false
        };

        // Spawn first customers immediately and simultaneously
        console.log('🚀 Spawning first customers immediately for synchronized start');
        this.spawnFirstCustomers();

        // Start AI synchronized timer
        this.synchronizedSpawnTimer = setInterval(() => {
            if (this.isPaused || !this.isGameRunning) return;
            this.spawnSynchronizedCustomers();
        }, spawnInterval);

        console.log('⏰ Synchronized customer spawning initialized - first customers spawned, timer will start when both are ready');
    }

    spawnFirstCustomers() {
        console.log('🎯 Attempting to spawn first customers simultaneously');

        // Add a small delay to ensure both managers are fully initialized
        setTimeout(() => {
            this.attemptFirstSpawn();
        }, 500); // 500ms delay to ensure initialization
    }

    attemptFirstSpawn() {
        if (this.isPaused || !this.isGameRunning) {
            console.log('⏸️ Skipping first spawn attempt while game is paused or not running');
            return;
        }

        console.log('🚀 Executing first customer spawn attempt');

        let playerSpawned = false;
        let aiSpawned = false;

        // Try to spawn player customer
        if (this.customerManager && this.customerManager.canSpawnCustomer()) {
            console.log('✅ Spawning first player customer');
            this.customerManager.spawnNextCustomer();
            playerSpawned = true;
            this.firstCustomersSpawned.player = true;
        } else {
            console.log('🚫 Cannot spawn first player customer - not ready');
            console.log('CustomerManager exists:', !!this.customerManager);
            console.log('Can spawn customer:', this.customerManager ? this.customerManager.canSpawnCustomer() : 'N/A');
        }

        // Try to spawn AI customer if AI opponent is active
        if (this.aiOpponentManager) {
            // Ensure AI opponent is activated for VS mode
            if (!this.aiOpponentManager.isActive && this.vsModeManager && this.vsModeManager.isCompetitionActive()) {
                console.log('🔧 Activating AI opponent for competition...');
                this.aiOpponentManager.startCompetition();
            }

            if (this.aiOpponentManager.canSpawnCustomer()) {
                console.log('✅ Spawning first AI customer');
                this.aiOpponentManager.spawnAICustomer();
                aiSpawned = true;
                this.firstCustomersSpawned.ai = true;
            } else {
                console.log('🚫 Cannot spawn first AI customer - not ready');
                console.log('AI Opponent exists:', !!this.aiOpponentManager);
                console.log('Can spawn customer:', this.aiOpponentManager ? this.aiOpponentManager.canSpawnCustomer() : 'N/A');
                console.log('AI is active:', this.aiOpponentManager ? this.aiOpponentManager.isActive : 'N/A');
                console.log('AI processing order:', this.aiOpponentManager ? this.aiOpponentManager.processingOrder : 'N/A');
                console.log('AI current customer:', this.aiOpponentManager ? !!this.aiOpponentManager.currentCustomer : 'N/A');
            }
        } else {
            // If no AI opponent, consider AI as "spawned" for timer purposes
            console.log('ℹ️ No AI opponent - treating as spawned for timer sync');
            this.firstCustomersSpawned.ai = true;
        }

        console.log(`🎯 First spawn result: Player=${playerSpawned}, AI=${aiSpawned}`);

        // If neither spawned, try again after a short delay
        if (!playerSpawned && !aiSpawned && this.aiOpponentManager) {
            console.log('⚠️ Neither customer spawned, retrying in 1 second...');
            setTimeout(() => {
                this.attemptFirstSpawn();
            }, 1000);
            return;
        }

        // Check if we can start the competition timer now
        this.checkAndStartCompetitionTimer();
    }

    spawnSynchronizedCustomers() {
        console.log('⏰ Synchronized spawn timer tick - checking both sides');

        // Check and replenish customer lines if needed
        if (this.sceneManager && typeof this.sceneManager.replenishCustomerLines === 'function') {
            this.sceneManager.replenishCustomerLines();
        }

        // Spawn player customer if ready
        if (this.customerManager && this.customerManager.canSpawnCustomer()) {
            console.log('✅ Spawning player customer');
            this.customerManager.spawnNextCustomer();
        }

        // Spawn AI customer if ready
        if (this.aiOpponentManager && this.aiOpponentManager.canSpawnCustomer()) {
            console.log('✅ Spawning AI customer');
            this.aiOpponentManager.spawnAICustomer();
        }
    }

    stopSynchronizedCustomerSpawning() {
        if (this.synchronizedSpawnTimer) {
            clearInterval(this.synchronizedSpawnTimer);
            this.synchronizedSpawnTimer = null;
            console.log('🛑 Synchronized customer spawning stopped');
        }
    }

    ensureSynchronizedSpawnTimerRunning() {
        if (this.synchronizedSpawnTimer || !this.isGameRunning) return;

        const spawnInterval = GameConfig.GAME_SETTINGS.CUSTOMER_SPAWN_INTERVAL;
        this.synchronizedSpawnTimer = setInterval(() => {
            if (this.isPaused || !this.isGameRunning) return;
            this.spawnSynchronizedCustomers();
        }, spawnInterval);

        console.log('▶️ Synchronized customer spawning resumed');
    }

    restartGame() {
        console.log('Restarting game...');

        // Remove any game end modals
        document.querySelectorAll('.game-end-modal').forEach(modal => modal.remove());

        // Stop current game
        this.isGameRunning = false;
        this.isPaused = false;

        // Stop synchronized customer spawning
        this.stopSynchronizedCustomerSpawning();

        // Stop individual customer managers
        if (this.customerManager) {
            this.customerManager.stopCustomerSpawning();
        }

        // Stop AI opponent
        if (this.aiOpponentManager) {
            this.aiOpponentManager.stopCompetition();
        }

        // Reset everything
        this.resetGameState();
        this.hidePauseMenu();

        // Start fresh
        this.startGame();
    }

    // Customer interaction callbacks
    onCustomerOrderReady() {
        // Show mental math interface when customer order is ready
        if (this.moneyManager) {
            this.moneyManager.showMentalMathInterface();
        }
    }

    onTotalCalculated(calculatedTotal) {
        console.log('\n🧮 TOTAL CALCULATION VALIDATION 🧮');
        console.log('=================================');

        if (!this.customerManager || !this.customerManager.currentCustomer) {
            console.error('❌ No current customer for total validation');
            return false;
        }

        const customer = this.customerManager.currentCustomer;
        const expectedTotal = customer.orderTotal;
        const tolerance = GameConfig.GAME_SETTINGS.MONEY_TOLERANCE;

        console.log(`👤 Customer: ${customer.name}`);
        console.log(`📋 Order Items (${customer.order.length}):`);
        customer.order.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.emoji} ${item.name} - $${item.price.toFixed(2)} x ${item.quantity} = $${(item.price * item.quantity).toFixed(2)}`);
        });

        console.log(`\n💰 PRICING BREAKDOWN:`);
        console.log(`   Expected Total: $${expectedTotal.toFixed(2)}`);
        console.log(`   Student Entered: $${calculatedTotal.toFixed(2)}`);
        console.log(`   Difference: $${Math.abs(expectedTotal - calculatedTotal).toFixed(2)}`);
        console.log(`   Tolerance: $${tolerance.toFixed(2)}`);

        const isCorrect = Math.abs(calculatedTotal - expectedTotal) <= tolerance;
        console.log(`   Result: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
        console.log('=================================\n');

        if (isCorrect) {
            this.onCorrectCalculation(calculatedTotal);
            return true;
        } else {
            this.onIncorrectCalculation();
            return false;
        }
    }

    onCorrectCalculation(total) {
        console.log('✅ Correct calculation! Proceeding to payment...');

        // Hide mental math interface
        if (this.moneyManager) {
            this.moneyManager.hideMentalMathInterface();
        }

        // Let CustomerManager handle the payment generation and notify us
        if (this.customerManager) {
            this.customerManager.onCorrectTotal(total);

            // Start payment process with the generated payment
            const paymentAmount = this.customerManager.getCustomerPaymentAmount();
            const expectedChange = this.customerManager.getExpectedChange();
            const orderTotal = this.customerManager.getCurrentCustomer()?.orderTotal || 0;

            if (this.moneyManager && paymentAmount > 0) {
                this.moneyManager.startPaymentProcess(paymentAmount, expectedChange, orderTotal);
            }
        }
    }

    onIncorrectCalculation() {
        console.log('❌ Incorrect calculation. Showing hint and allowing retry...');

        // Apply zap damage through CustomerManager
        if (this.customerManager) {
            const currentCustomer = this.customerManager.getCurrentCustomer();
            if (currentCustomer) {
                this.customerManager.onIncorrectTotal(0, currentCustomer.orderTotal); // Pass dummy values for logging
            }
        }

        // Mental math interface remains open for retry
        // Error feedback is handled by MoneyManager
    }

    onPaymentProcessed(changeGiven) {
        console.log(`💸 Payment processed. Change given: $${changeGiven.toFixed(2)}`);

        // Let CustomerManager handle the payment validation and completion
        if (this.customerManager) {
            const isCorrect = this.customerManager.onPaymentProcessed(changeGiven);
            if (isCorrect) {
                console.log('✅ Payment completed successfully');
            } else {
                console.log('❌ Payment had errors');
            }
        }

        return true;
    }

    showChangeError(given, expected) {
        console.log(`💸 Change Error - Given: $${given.toFixed(2)}, Expected: $${expected.toFixed(2)}`);
    }

    onCustomerCompleted() {
        console.log('👋 Customer completed transaction');

        // Update customers served counter
        this.customersServed++;

        // NOTE: HUD will be updated after the review is processed so that
        // average rating and other stats are fully up-to-date. Removing the
        // premature update prevents a brief flicker where the Customer Service
        // average displays an outdated value.

        console.log(`📊 Stats updated - Customers: ${this.customersServed}, Earnings: ${GameConfig.formatMoney(this.totalEarnings)}, Score: ${this.totalScore}`);
    }

    generateCustomerReview() {
        // Simulate review generation based on service quality
        const accuracy = Math.random() > 0.3 ? 1.0 : Math.random(); // 70% perfect accuracy
        const speed = Math.random(); // Random speed factor

        return GameConfig.calculateReview(accuracy, speed);
    }

    showCustomerReview(review) {
        // We no longer display the review panel to avoid extra pop-ups after
        // correct change.  Instead, we silently process the review data and
        // immediately continue gameplay.

        // Update game statistics and HUD as usual.
        this.updateGameStatistics(review);
        this.updateHUD();

        // Immediately proceed to the next customer without waiting for user
        // interaction.
        this.onReviewComplete();
    }

    hideCustomerReview() {
        if (this.domElements.reviewPanel) {
            this.domElements.reviewPanel.classList.remove('active');
        }
    }

    onReviewComplete() {
        console.log('🔄 Review complete - preparing next customer');
        this.hideCustomerReview();

        // Ensure customer cleanup is complete before spawning next
        if (this.customerManager) {
            // Force cleanup of any lingering state
            this.customerManager.stopPatienceTimer();
        }

        // MOBILE FIX: Force replenish customer lines before spawning
        if (this.sceneManager && typeof this.sceneManager.replenishCustomerLines === 'function') {
            console.log('📱 iPad Fix: Force replenishing customer lines before next spawn');
            this.sceneManager.replenishCustomerLines();
        }

        setTimeout(() => {
            console.log('⏰ Break over – player quick spawn');

            if (this.customerManager && this.customerManager.canSpawnCustomer()) {
                this.customerManager.spawnNextCustomer();
            } else {
                // MOBILE FIX: If can't spawn, try again after a short delay
                console.log('📱 iPad Fix: Cannot spawn customer, retrying in 500ms');
                setTimeout(() => {
                    if (this.customerManager && this.customerManager.canSpawnCustomer()) {
                        console.log('📱 iPad Fix: Retry spawn successful');
                        this.customerManager.spawnNextCustomer();
                    } else {
                        console.warn('📱 iPad Fix: Still cannot spawn customer after retry');
                        // Force debug the customer line state
                        if (this.sceneManager && typeof this.sceneManager.debugCustomerLines === 'function') {
                            this.sceneManager.debugCustomerLines();
                        }
                    }
                }, 500);
            }
        }, 300); // Quick 300ms transition for smooth user experience
    }

    updateGameStatistics(review) {
        // Update popularity
        if (review.stars >= 5) {
            this.popularity += GameConfig.GAME_SETTINGS.POPULARITY_GAIN_PERFECT;
            this.perfectSales++;
            this.currentStreak++;
        } else if (review.stars >= 4) {
            this.popularity += GameConfig.GAME_SETTINGS.POPULARITY_GAIN_GOOD;
            this.currentStreak++;
        } else {
            this.popularity += GameConfig.GAME_SETTINGS.POPULARITY_LOSS_ERROR;
            this.currentStreak = 0; // Reset streak
        }

        // Keep popularity within bounds
        this.popularity = Math.max(
            GameConfig.GAME_SETTINGS.MIN_POPULARITY,
            Math.min(GameConfig.GAME_SETTINGS.MAX_POPULARITY, this.popularity)
        );

        // Update best streak
        if (this.currentStreak > this.bestStreak) {
            this.bestStreak = this.currentStreak;
        }

        // Calculate score
        const baseScore = GameConfig.GAME_SETTINGS.BASE_SCORE_PER_SALE;
        const bonusScore = GameConfig.calculateScore(baseScore, review.accuracy, review.speed, this.currentStreak);
        this.totalScore += bonusScore;

        // Update rating average
        this.totalRatings += review.stars;
        this.averageRating = this.totalRatings / this.customersServed;

        console.log(`Statistics updated - Score: ${this.totalScore}, Popularity: ${this.popularity.toFixed(1)}, Streak: ${this.currentStreak}`);
    }

    updateHUD() {
        // Update customers served in scoring panel
        if (this.domElements.customersScorePlayer) {
            this.domElements.customersScorePlayer.textContent = this.customersServed;
        }

        // Update player earnings in scoring panel
        if (this.domElements.earningsScorePlayer) {
            this.domElements.earningsScorePlayer.textContent = GameConfig.formatMoney(this.totalEarnings);
        }

        // Update average rating in service category
        if (this.domElements.serviceScorePlayer) {
            this.domElements.serviceScorePlayer.textContent = this.averageRating.toFixed(1);
        }
    }

    updatePauseMenu() {
        // Update pause menu statistics
        const customersServed = document.getElementById('customersServed');
        const averageRating = document.getElementById('averageRating');
        const totalEarnings = document.getElementById('totalEarnings');

        if (customersServed) customersServed.textContent = this.customersServed;
        if (averageRating) averageRating.textContent = this.averageRating.toFixed(1);
        if (totalEarnings) totalEarnings.textContent = GameConfig.formatMoney(this.totalEarnings);
    }

    // UI Management
    showGameContainer() {
        if (this.domElements.gameContainer) {
            this.domElements.gameContainer.style.display = 'block';
        }
    }

    hideLoadingScreen() {
        if (this.domElements.loadingScreen) {
            this.domElements.loadingScreen.style.display = 'none';
        }
    }

    showPauseMenu() {
        if (this.domElements.pauseMenu) {
            this.domElements.pauseMenu.classList.add('active');
        }
    }

    hidePauseMenu() {
        if (this.domElements.pauseMenu) {
            this.domElements.pauseMenu.classList.remove('active');
        }
    }

    showError(message) {
        console.error('Game Error:', message);
        alert(message); // Simple error display for now
    }

    showTutorial() {
        if (this.domElements.tutorialOverlay) {
            this.domElements.tutorialOverlay.classList.add('active');
        }
        this.tutorialStep = 0;
        this.updateTutorialStep();
    }

    hideTutorial() {
        if (this.domElements.tutorialOverlay) {
            this.domElements.tutorialOverlay.classList.remove('active');
        }
    }

    nextTutorialStep() {
        this.tutorialStep = Math.min(this.tutorialStep + 1, 3);
        this.updateTutorialStep();
    }

    prevTutorialStep() {
        this.tutorialStep = Math.max(this.tutorialStep - 1, 0);
        this.updateTutorialStep();
    }

    updateTutorialStep() {
        const steps = document.querySelectorAll('.tutorial-step');
        const prevBtn = this.domElements.prevStepBtn;
        const nextBtn = this.domElements.nextStepBtn;
        const startBtn = this.domElements.startGameBtn;

        steps.forEach((step, index) => {
            step.classList.toggle('active', index === this.tutorialStep);
        });

        if (prevBtn) prevBtn.style.display = this.tutorialStep === 0 ? 'none' : 'inline-block';
        if (nextBtn) nextBtn.style.display = this.tutorialStep === 3 ? 'none' : 'inline-block';
        if (startBtn) startBtn.style.display = this.tutorialStep === 3 ? 'inline-block' : 'none';
    }

    initializeProductDisplay() {
        if (!this.domElements.productDisplayGrid) {
            console.log('Product display grid not available - skipping product display initialization');
            return;
        }

        try {
            let availableProducts = [];

            // Try to get products from ProductManager first
            if (this.productManager && typeof this.productManager.getAvailableProducts === 'function') {
                availableProducts = this.productManager.getAvailableProducts();
            }

            // Fallback to default products if ProductManager unavailable or returns empty
            if (!availableProducts || availableProducts.length === 0) {
                console.warn('Using fallback product list');
                availableProducts = [
                    { name: "Tomatoes", emoji: "🍅", currentPrice: 3.00 },
                    { name: "Apples", emoji: "🍎", currentPrice: 3.00 },
                    { name: "Bananas", emoji: "🍌", currentPrice: 1.00 },
                    { name: "Fresh Bread", emoji: "🍞", currentPrice: 4.00 },
                    { name: "Cookies", emoji: "🍪", currentPrice: 2.00 },
                    { name: "Honey", emoji: "🍯", currentPrice: 7.00 }
                ];
            }

            this.domElements.productDisplayGrid.innerHTML = '';

            availableProducts.forEach(product => {
                if (product && product.currentPrice !== undefined) {
                    const productItem = document.createElement('div');
                    productItem.className = 'product-item';

                    productItem.innerHTML = `
                        <span class="product-emoji">${product.emoji || '❓'}</span>
                        <div class="product-name">${product.name || 'Unknown'}</div>
                        <div class="product-price">$${product.currentPrice.toFixed(2)}</div>
                    `;

                    this.domElements.productDisplayGrid.appendChild(productItem);
                }
            });

            console.log('✅ Product display initialized');

        } catch (error) {
            console.error('❌ Failed to initialize product display:', error);
        }
    }

    updateProductDisplayForDifficulty() {
        console.log('🔄 Updating product display for difficulty change...');

        if (this.productManager && typeof this.productManager.updateProductDisplay === 'function') {
            this.productManager.updateProductDisplay();
        } else {
            // Fallback to reinitializing our display
            this.initializeProductDisplay();
        }

        console.log('✅ Product display updated for difficulty');
    }

    // Auto-save functionality
    setupAutoSave() {
        const AUTOSAVE_INTERVAL = 30000; // 30 seconds
        this.autoSaveInterval = setInterval(() => {
            this.saveGameData();
        }, AUTOSAVE_INTERVAL);
    }

    saveGameData() {
        const gameData = {
            totalScore: this.totalScore,
            popularity: this.popularity,
            customersServed: this.customersServed,
            totalEarnings: this.totalEarnings,
            perfectSales: this.perfectSales,
            averageRating: this.averageRating,
            bestStreak: this.bestStreak,
            difficulty: this.difficulty,
            lastSaved: Date.now()
        };

        try {
            GameConfig.saveGameData(gameData);
            this.lastSaveTime = Date.now();
            console.log('Game data saved successfully');
        } catch (error) {
            console.error('Failed to save game data:', error);
        }
    }

    loadGameData() {
        try {
            const savedData = GameConfig.loadGameData();
            if (savedData) {
                this.totalScore = savedData.totalScore || 0;
                this.popularity = savedData.popularity || GameConfig.GAME_SETTINGS.STARTING_POPULARITY;
                this.customersServed = savedData.customersServed || 0;
                this.totalEarnings = savedData.totalEarnings || 0;
                this.perfectSales = savedData.perfectSales || 0;
                this.averageRating = savedData.averageRating || 0;
                this.bestStreak = savedData.bestStreak || 0;
                this.difficulty = savedData.difficulty || 'medium';

                console.log('Game data loaded successfully');
            }
        } catch (error) {
            console.warn('Failed to load game data:', error);
        }
    }

    // Window event handlers
    onWindowClose(event) {
        this.saveGameData();
    }

    onVisibilityChange() {
        if (document.hidden && this.isGameRunning && !this.isPaused) {
            this.pauseGame();
        }
    }

    // Public getters
    isGameActive() {
        return this.isGameRunning && !this.isPaused;
    }

    getPopularity() {
        return this.popularity;
    }

    getTotalScore() {
        return this.totalScore;
    }

    getCustomersServed() {
        return this.customersServed;
    }

    getTotalEarnings() {
        return this.totalEarnings;
    }

    // Difficulty management
    setDifficulty(difficulty) {
        console.log(`🎯 GameManager: Setting game difficulty to ${difficulty}`);

        this.difficulty = difficulty;

        // Update all managers with new difficulty
        if (this.productManager && typeof this.productManager.setDifficulty === 'function') {
            this.productManager.setDifficulty(difficulty);
        }

        if (this.moneyManager && typeof this.moneyManager.setDifficulty === 'function') {
            this.moneyManager.setDifficulty(difficulty);
        }

        // Update product display to show new prices
        this.updateProductDisplayForDifficulty();

        console.log(`✅ GameManager: Difficulty set to ${difficulty}`);
    }

    getDifficulty() {
        return this.difficulty;
    }

    // Debug and testing methods
    testDifficultyPricing() {
        console.log('\n🧪 TESTING DIFFICULTY PRICING 🧪');
        console.log('=====================================');

        if (this.productManager) {
            ['easy', 'medium', 'hard'].forEach(difficulty => {
                console.log(`\n--- ${difficulty.toUpperCase()} MODE ---`);
                this.productManager.setDifficulty(difficulty);

                const products = this.productManager.getAvailableProducts();
                products.forEach(product => {
                    console.log(`${product.emoji} ${product.name}: $${product.currentPrice.toFixed(2)}`);
                });
            });
        }

        console.log('\n=====================================\n');
    }

    validateCurrentOrder() {
        if (!this.customerManager || !this.customerManager.currentCustomer) {
            console.log('❌ No current customer to validate');
            return;
        }

        const customer = this.customerManager.currentCustomer;
        console.log('\n🔍 CURRENT ORDER VALIDATION 🔍');
        console.log('==============================');
        console.log(`Customer: ${customer.name}`);
        console.log(`Order Total: $${customer.orderTotal.toFixed(2)}`);
        console.log('Items:');

        let calculatedTotal = 0;
        customer.order.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            calculatedTotal += itemTotal;
            console.log(`  ${index + 1}. ${item.emoji} ${item.name} - $${item.price.toFixed(2)} x ${item.quantity} = $${itemTotal.toFixed(2)}`);
        });

        console.log(`Calculated Total: $${calculatedTotal.toFixed(2)}`);
        console.log(`Expected Total: $${customer.orderTotal.toFixed(2)}`);
        console.log(`Match: ${calculatedTotal === customer.orderTotal ? '✅ YES' : '❌ NO'}`);
        console.log('==============================\n');
    }

    // Debug method to track customer flow
    debugCustomerFlow() {
        console.log('=== CUSTOMER FLOW DEBUG ===');

        // Check customer manager status
        if (this.customerManager) {
            console.log(`👤 Player Customer Manager:`);
            console.log(`  - Current customer: ${this.customerManager.currentCustomer?.name || 'none'}`);
            console.log(`  - Current state: ${this.customerManager.currentState}`);
            console.log(`  - Can spawn: ${this.customerManager.canSpawnCustomer()}`);
            console.log(`  - Total served: ${this.customerManager.totalCustomersServed}`);
        }

        // Check AI opponent status
        if (this.aiOpponentManager) {
            console.log(`🤖 AI Opponent Manager:`);
            console.log(`  - Is active: ${this.aiOpponentManager.isActive}`);
            console.log(`  - Processing order: ${this.aiOpponentManager.processingOrder}`);
            console.log(`  - Current customer: ${this.aiOpponentManager.currentCustomer?.name || 'none'}`);
            console.log(`  - Can spawn: ${this.aiOpponentManager.canSpawnCustomer()}`);
            console.log(`  - Total served: ${this.aiOpponentManager.customersServed}`);
        }

        // Check scene manager customer lines
        if (this.sceneManager) {
            this.sceneManager.debugCustomerLines();
        }

        console.log('===========================');
    }

    // Method to be called when a customer is successfully spawned to check timer start
    onCustomerSpawned(isAICustomer = false) {
        if (!this.firstCustomersSpawned) return;

        if (isAICustomer) {
            if (!this.firstCustomersSpawned.ai) {
                this.firstCustomersSpawned.ai = true;
                console.log('🤖 First AI customer confirmed spawned');
            }
        } else {
            if (!this.firstCustomersSpawned.player) {
                this.firstCustomersSpawned.player = true;
                console.log('👤 First player customer confirmed spawned');
            }
        }

        // Check if we can start the timer now
        this.checkAndStartCompetitionTimer();
    }

    ensureLatestTimerSettings(gameMode) {
        console.log(`🔄 Ensuring latest timer settings for ${gameMode} mode...`);

        // Get the latest settings from SettingsManager
        if (window.settingsManager && window.settingsManager.gameSettings) {
            const settings = window.settingsManager.gameSettings;

            // Apply timer enabled/disabled state
            this.timerManager.setEnabled(settings.enableTimer);
            this.timerManager.setWarningEnabled(settings.timerWarning);

            // Apply unified timer duration to all modes
            if (settings.unifiedTimer) {
                const durationSeconds = settings.unifiedTimer * 60;
                console.log(`⏰ Applying unified timer setting: ${settings.unifiedTimer} minutes (${durationSeconds} seconds)`);

                // Update all game mode timers
                Object.keys(settings.gameModeTimers || {}).forEach(mode => {
                    this.timerManager.setGameModeTimer(mode, durationSeconds);
                });

                // Ensure current game mode uses the updated setting
                this.timerManager.setGameMode(gameMode);

                console.log(`✅ Timer settings applied for ${gameMode} mode: ${Math.floor(this.timerManager.getDuration() / 60)}:${(this.timerManager.getDuration() % 60).toString().padStart(2, '0')}`);
            }
        } else {
            console.warn('⚠️ SettingsManager not available, using default timer settings');
        }
    }

    checkAndStartCompetitionTimer() {
        // Start the competition timer only if both player and AI customers have spawned
        // and the timer hasn't started yet.
        if (this.firstCustomersSpawned && this.firstCustomersSpawned.player && this.firstCustomersSpawned.ai && !this.firstCustomersSpawned.timerStarted) {
            console.log('✅ Both customers spawned, starting competition timer...');
            this.firstCustomersSpawned.timerStarted = true;

            // Start the timer if it's a VS mode game
            if (this.vsModeManager && this.vsModeManager.isInVSMode()) {
                let gameMode = this.vsModeManager.gameMode || 'vs';
                if (this.timerManager) {
                    // Ensure latest timer settings are applied before starting
                    this.ensureLatestTimerSettings(gameMode);
                    this.timerManager.startTimer(null, gameMode);
                    console.log(`🎮 Timer started for VS mode: ${gameMode}`);
                }
            } else {
                // If not VS mode, the timer should have already started in startGame()
                console.log('ℹ️ Not in VS mode, timer should already be running.');
            }
        }
    }
}

// Export for global access
window.GameManager = GameManager;
