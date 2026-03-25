// Farmers Market Frenzy 3D - Main Entry Point
window.LAHSPointsBridge?.init({ gameId: 'math-farmers-market-frenzy' });

class Main {
    constructor() {
        this.gameManager = null;
        this.settingsManager = null;
        this.isInitialized = false;
        this.loadingProgress = 0;
        this.orientationWarningElement = null;
        this.orientationIntroTimer = null;
        this.hasShownOrientationHint = false;
        this.boundEnsureFullscreenOnInteraction = null;
        this.boundOnFullscreenChange = null;
        this.boundOnViewportChange = null;
        this.boundOnVisibilityRestore = null;
        this.requiresFullscreenRestore = true;
        this.lastFullscreenInteractionAt = 0;
        this.fullscreenInteractionCooldownMs = 850;
        this.boundEnsureFullscreenOnInteractionMouse = null;
        this.boundEnsureFullscreenOnInteractionTouch = null;
        this.wasPausedByPortraitLock = false;
        this.hudSettingsElements = null;
        this.boundHandleHUDSettingsOutsideClick = null;
        this.boundHandleHUDSettingsEscape = null;
        this.customerPanelElement = null;
        this.customerPanelResizeHandle = null;
        this.customerPanelResizeState = null;
        this.boundStartCustomerPanelResize = null;
        this.boundStartCustomerPanelResizeMouse = null;
        this.boundStartCustomerPanelResizeTouch = null;
        this.boundTrackCustomerPanelResize = null;
        this.boundTrackCustomerPanelResizeMouse = null;
        this.boundTrackCustomerPanelResizeTouch = null;
        this.boundStopCustomerPanelResize = null;
        this.boundStopCustomerPanelResizeMouse = null;
        this.boundStopCustomerPanelResizeTouch = null;
        this.boundSyncCustomerPanelResizeBounds = null;
    }

    async init() {
        try {
            console.log('🌽 Starting Farmers Market Frenzy 3D...');

            // Enforce strict landscape lock from startup
            this.initializeOrientationController();

            // Enforce fullscreen whenever possible; restore it on user interaction if it drops
            this.initializeFullscreenController();
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize all game systems comprehensively
            this.updateLoadingProgress(25);
            const systemsInitialized = await this.initializeGameSystems();
            
            if (!systemsInitialized) {
                throw new Error('Critical game systems failed to initialize');
            }
            
            this.updateLoadingProgress(75);
            
            // Setup global debug functions
            this.setupGlobalDebugFunctions();
            this.setupHUDQuickSettings();
            this.setupCustomerPanelResizer();
            this.updateLoadingProgress(100);
            
            // Hide loading screen and show difficulty selection
            setTimeout(() => {
                this.hideLoadingScreen();
                this.showDifficultySelection();
            }, 500);
            
            this.isInitialized = true;
            console.log('✅ Farmers Market Frenzy 3D initialized successfully!');
            
        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            this.showInitializationError(error);
        }
    }

    initializeOrientationController() {
        this.orientationWarningElement = document.getElementById('orientationWarning');
        this.enforceLandscapeLayoutLock();
        this.initializeOrientationLockListeners();
        this.handleViewportChange();
    }

    isPortraitOrientation() {
        if (window.matchMedia) {
            return window.matchMedia('(orientation: portrait)').matches;
        }
        return window.innerHeight > window.innerWidth;
    }

    showOrientationWarning() {
        if (!this.orientationWarningElement) return;
        const shouldPlayIntro = !this.hasShownOrientationHint;
        this.hasShownOrientationHint = true;

        this.orientationWarningElement.classList.add('active');
        this.orientationWarningElement.setAttribute('aria-hidden', 'false');
        this.orientationWarningElement.classList.toggle('intro', shouldPlayIntro);

        clearTimeout(this.orientationIntroTimer);
        if (shouldPlayIntro) {
            this.orientationIntroTimer = setTimeout(() => {
                if (this.orientationWarningElement) {
                    this.orientationWarningElement.classList.remove('intro');
                }
            }, 2000);
        }
    }

    hideOrientationWarning() {
        if (!this.orientationWarningElement) return;

        clearTimeout(this.orientationIntroTimer);
        this.orientationIntroTimer = null;
        this.orientationWarningElement.classList.remove('active', 'intro');
        this.orientationWarningElement.setAttribute('aria-hidden', 'true');
    }

    enforceLandscapeLayoutLock() {
        document.body.classList.add('landscape-ready');
        document.documentElement.classList.add('landscape-ready');
    }

    syncOrientationLockState() {
        const isPortrait = this.isPortraitOrientation();

        document.body.classList.toggle('portrait-locked', isPortrait);
        document.body.classList.toggle('landscape-locked', !isPortrait);
        document.documentElement.classList.toggle('portrait-locked', isPortrait);
        document.documentElement.classList.toggle('landscape-locked', !isPortrait);

        if (isPortrait) {
            this.showOrientationWarning();
        } else {
            this.hideOrientationWarning();
        }
        this.syncPortraitPauseState(isPortrait);

        return isPortrait;
    }

    syncPortraitPauseState(isPortrait) {
        if (!this.gameManager) return;
        const canPause = typeof this.gameManager.pauseGame === 'function';
        const canResume = typeof this.gameManager.resumeGame === 'function';
        if (!canPause || !canResume) return;

        if (isPortrait) {
            if (this.gameManager.isGameRunning && !this.gameManager.isPaused) {
                this.gameManager.pauseGame();
                this.wasPausedByPortraitLock = true;
            }
            return;
        }

        if (this.wasPausedByPortraitLock && this.gameManager.isGameRunning && this.gameManager.isPaused) {
            this.gameManager.resumeGame();
        }
        this.wasPausedByPortraitLock = false;
    }

    initializeOrientationLockListeners() {
        if (this.boundOnViewportChange) return;

        this.boundOnViewportChange = this.handleViewportChange.bind(this);
        this.boundOnVisibilityRestore = this.onVisibilityRestore.bind(this);

        window.addEventListener('orientationchange', this.boundOnViewportChange, { passive: true });
        window.addEventListener('resize', this.boundOnViewportChange, { passive: true });
        document.addEventListener('visibilitychange', this.boundOnVisibilityRestore);
    }

    handleViewportChange() {
        this.enforceLandscapeLayoutLock();
        const isPortrait = this.syncOrientationLockState();
        this.requestLandscapeOrientationLock();

        if (!isPortrait) {
            this.attemptEnterFullscreen();
        }
    }

    onVisibilityRestore() {
        if (document.visibilityState !== 'visible') return;
        this.handleViewportChange();
    }

    initializeFullscreenController() {
        if (this.boundEnsureFullscreenOnInteraction || !this.isFullscreenSupported()) return;

        this.boundEnsureFullscreenOnInteraction = this.ensureFullscreenOnInteraction.bind(this);
        this.boundEnsureFullscreenOnInteractionMouse = this.ensureFullscreenOnInteraction.bind(this);
        this.boundEnsureFullscreenOnInteractionTouch = this.ensureFullscreenOnInteraction.bind(this);
        this.boundOnFullscreenChange = this.onFullscreenChange.bind(this);

        document.addEventListener('fullscreenchange', this.boundOnFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this.boundOnFullscreenChange);
        document.addEventListener('MSFullscreenChange', this.boundOnFullscreenChange);

        const passiveOptions = { passive: true };
        if (window.PointerEvent) {
            window.addEventListener('pointerdown', this.boundEnsureFullscreenOnInteraction, passiveOptions);
        } else {
            window.addEventListener('mousedown', this.boundEnsureFullscreenOnInteractionMouse, passiveOptions);
            window.addEventListener('touchstart', this.boundEnsureFullscreenOnInteractionTouch, passiveOptions);
        }

        this.requestLandscapeOrientationLock();
        this.attemptEnterFullscreen();
    }

    isFullscreenSupported() {
        const root = document.documentElement;
        return Boolean(
            document.fullscreenEnabled ||
            document.webkitFullscreenEnabled ||
            document.msFullscreenEnabled ||
            root?.requestFullscreen ||
            root?.webkitRequestFullscreen ||
            root?.msRequestFullscreen
        );
    }

    getFullscreenElement() {
        return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null;
    }

    requestLandscapeOrientationLock() {
        const orientationApi = window.screen?.orientation;
        if (!orientationApi || typeof orientationApi.lock !== 'function') return;

        try {
            const lockAttempt = orientationApi.lock('landscape');
            if (lockAttempt && typeof lockAttempt.catch === 'function') {
                lockAttempt.catch(() => { });
            }
        } catch (error) {
            console.warn('Landscape orientation lock failed:', error?.message || error);
        }
    }

    attemptEnterFullscreen() {
        if (!this.isFullscreenSupported()) return;

        if (this.getFullscreenElement()) {
            this.requiresFullscreenRestore = false;
            return;
        }

        const root = document.documentElement;

        try {
            if (root.requestFullscreen) {
                const request = root.requestFullscreen();
                if (request && typeof request.then === 'function') {
                    request.then(() => this.requestLandscapeOrientationLock()).catch(() => { });
                }
                if (request && typeof request.catch === 'function') {
                    request.catch(() => { });
                }
            } else if (root.webkitRequestFullscreen) {
                root.webkitRequestFullscreen();
                this.requestLandscapeOrientationLock();
            } else if (root.msRequestFullscreen) {
                root.msRequestFullscreen();
                this.requestLandscapeOrientationLock();
            }
        } catch (error) {
            console.warn('Fullscreen request failed:', error?.message || error);
        }
    }

    onFullscreenChange() {
        this.requiresFullscreenRestore = !Boolean(this.getFullscreenElement());
        if (!this.requiresFullscreenRestore) {
            this.requestLandscapeOrientationLock();
        }
    }

    ensureFullscreenOnInteraction(event) {
        if (!this.isFullscreenSupported()) return;

        const now = (window.performance?.now?.() ?? Date.now());
        if ((now - this.lastFullscreenInteractionAt) < this.fullscreenInteractionCooldownMs) {
            return;
        }

        if (this.requiresFullscreenRestore || !this.getFullscreenElement()) {
            this.lastFullscreenInteractionAt = now;
            this.attemptEnterFullscreen();
            this.requestLandscapeOrientationLock();
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    updateLoadingProgress(percent) {
        const progressBar = document.getElementById('loadingProgress');
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        this.loadingProgress = percent;
    }

    async initializeSettings() {
        try {
            this.settingsManager = new SettingsManager();
            await this.settingsManager.initialize();
            
            // Make settings manager globally available for cross-component access
            // Note: This is needed for backwards compatibility with existing code
            window.settingsManager = this.settingsManager;
            
            console.log('✅ Settings manager initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize settings manager:', error);
            // Continue without settings manager - use defaults
        }
    }

    showDifficultySelection() {
        const difficultyScreen = document.getElementById('difficultyScreen');
        if (difficultyScreen) {
            difficultyScreen.style.display = 'flex';
            this.setupDifficultySelection();
        }
    }

    setupDifficultySelection() {
        // Setup difficulty card selection
        const difficultyCards = document.querySelectorAll('.difficulty-card');
        const startGameBtn = document.getElementById('startGameBtnDifficulty');
        let selectedDifficulty = null;

        difficultyCards.forEach(card => {
            card.addEventListener('click', () => {
                // Remove selection from all cards
                difficultyCards.forEach(c => c.classList.remove('selected'));
                
                // Add selection to clicked card
                card.classList.add('selected');
                
                // Get selected difficulty
                selectedDifficulty = card.dataset.difficulty;
                
                // Enable start button
                if (startGameBtn) {
                    startGameBtn.disabled = false;
                }
                
                console.log(`Difficulty selected: ${selectedDifficulty}`);
            });
        });

        // Setup start game button
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                if (selectedDifficulty && this.gameManager) {
                    this.startGameWithDifficulty(selectedDifficulty);
                }
            });
        }

        // Setup settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }
    }

    async startGameWithDifficulty(difficulty) {
        try {
            console.log(`Player selected ${difficulty} difficulty - showing character selection`);
            this.closeHUDSettingsMenu();
            
            // Store selected difficulty for later use
            this.selectedDifficulty = difficulty;
            
            // Hide difficulty selection and show character selection
            const difficultyScreen = document.getElementById('difficultyScreen');
            if (difficultyScreen) {
                difficultyScreen.style.display = 'none';
            }
            
            this.showCharacterSelection();
            
        } catch (error) {
            console.error('Failed to show character selection:', error);
            this.showError('Failed to show character selection. Please try again.');
        }
    }

    showCharacterSelection() {
        this.closeHUDSettingsMenu();

        const characterScreen = document.getElementById('characterScreen');
        if (characterScreen) {
            characterScreen.style.display = 'flex';
            this.setupCharacterSelection();
        }
    }

    setupCharacterSelection() {
        // Setup character card selection
        const characterCards = document.querySelectorAll('.character-card');
        const startCompetitionBtn = document.getElementById('startCompetitionBtnCharacter');
        const backToDifficultyBtn = document.getElementById('backTodifficultyBtn');
        const progressivePlayBtn = document.getElementById('progressivePlayBtn');
        const randomOpponentBtn = document.getElementById('randomOpponentBtn');
        let selectedCharacter = null;
        let selectedAIDifficulty = null;

        characterCards.forEach(card => {
            card.addEventListener('click', () => {
                // Remove selection from all cards
                characterCards.forEach(c => c.classList.remove('selected'));
                
                // Add selection to clicked card
                card.classList.add('selected');
                
                // Get selected character and AI difficulty
                selectedCharacter = card.dataset.character;
                selectedAIDifficulty = card.dataset.aiDifficulty;
                
                // Enable start competition button
                if (startCompetitionBtn) {
                    startCompetitionBtn.disabled = false;
                }
                
                console.log(`Character selected: ${selectedCharacter} (AI Difficulty: ${selectedAIDifficulty})`);
            });
        });

        // Setup start competition button
        if (startCompetitionBtn) {
            startCompetitionBtn.addEventListener('click', () => {
                if (selectedCharacter && selectedAIDifficulty && this.gameManager) {
                    this.startVSModeGame(selectedCharacter, selectedAIDifficulty);
                }
            });
        }

        // Setup Progressive Play button
        if (progressivePlayBtn) {
            progressivePlayBtn.addEventListener('click', () => {
                this.startProgressivePlay();
            });
        }

        // Setup Random Opponent button
        if (randomOpponentBtn) {
            randomOpponentBtn.addEventListener('click', () => {
                this.startRandomOpponent();
            });
        }

        // Setup back button
        if (backToDifficultyBtn) {
            backToDifficultyBtn.addEventListener('click', () => {
                this.backToDifficultySelection();
            });
        }
    }

    backToDifficultySelection() {
        // Hide character selection
        const characterScreen = document.getElementById('characterScreen');
        if (characterScreen) {
            characterScreen.style.display = 'none';
        }
        
        // Show difficulty selection again
        this.showDifficultySelection();
    }

    async startVSModeGame(character, aiDifficulty, gameMode = 'normal') {
        console.log(`🎮 Starting VS Mode game with character: ${character}, AI difficulty: ${aiDifficulty}, Mode: ${gameMode}`);
        this.closeHUDSettingsMenu();
        
        try {
            // Hide character selection
            const characterScreen = document.querySelector('.character-screen');
            if (characterScreen) {
                characterScreen.style.display = 'none';
            }
            
            // Use the player's selected pricing difficulty, NOT the AI character's behavioral difficulty
            let gameDifficulty = this.selectedDifficulty; // Use player's pricing choice
            console.log(`🎯 Using player's selected pricing difficulty: ${gameDifficulty} (AI character behavior: ${aiDifficulty})`);
            
            if (this.gameManager && typeof this.gameManager.setDifficulty === 'function') {
                this.gameManager.setDifficulty(gameDifficulty);
                console.log(`💰 Game pricing set to: ${gameDifficulty} mode`);
            }
            
            // Enable VS Mode BEFORE starting the game
            if (this.gameManager?.vsModeManager) {
                // Enable VS Mode
                this.gameManager.vsModeManager.toggleVSMode(true);
                
                // Set game mode and timer duration
                this.gameManager.vsModeManager.setGameMode(gameMode);
                if (this.gameManager.timerManager) {
                    // Set the game mode for the timer
                    this.gameManager.timerManager.setGameMode(gameMode);
                    
                    // Ensure timer uses the latest custom settings from user preferences
                    if (this.gameManager.ensureLatestTimerSettings) {
                        this.gameManager.ensureLatestTimerSettings(gameMode);
                    }
                }
                
                // Set AI character info (for behavior only, not pricing)
                const characterInfo = {
                    name: character,
                    difficulty: aiDifficulty // This affects AI behavior speed/accuracy, not pricing
                };
                
                if (this.gameManager.aiOpponentManager) {
                    this.gameManager.aiOpponentManager.setCharacterInfo(characterInfo);
                    // AI difficulty is already set via characterInfo, no need to set again
                    console.log(`🤖 AI character set to ${character} with ${aiDifficulty} behavior`);
                }
                
                console.log('🤖 VS Mode enabled and AI character configured');
            }
            
            // Start the game (this will automatically start competition in VS mode)
            if (this.gameManager && typeof this.gameManager.startGame === 'function') {
                await this.gameManager.startGame();
                console.log('🎮 VS Mode game started successfully');
                
                // Start competition immediately now that we fixed the double initialization
                if (this.gameManager.vsModeManager) {
                    this.gameManager.vsModeManager.startCompetition();
                    console.log('🏁 Competition started automatically');
                }
            }
            
        } catch (error) {
            console.error('Failed to start VS Mode game:', error);
            this.showError('Failed to start VS Mode game. Please try again.');
        }
    }

    async startProgressivePlay() {
        console.log('🎯 Starting Progressive Play mode');
        
        try {
            // Get all AI characters ordered by difficulty
            const aiCharacters = this.getAICharactersOrderedByDifficulty();
            
            if (aiCharacters.length === 0) {
                this.showError('No AI characters available for Progressive Play');
                return;
            }
            
            // Start with the first (easiest) character
            const firstCharacter = aiCharacters[0];
            
            // Set progressive play mode
            this.gameMode = 'progressive';
            this.progressivePlayCharacters = aiCharacters;
            this.currentProgressiveIndex = 0;
            
            // Start the game with progressive mode timer
            await this.startVSModeGame(firstCharacter.name, firstCharacter.difficulty, 'progressive');
            
        } catch (error) {
            console.error('Failed to start Progressive Play:', error);
            this.showError('Failed to start Progressive Play. Please try again.');
        }
    }

    async startRandomOpponent() {
        console.log('🎲 Starting Random Opponent mode');
        
        try {
            // Get all AI characters
            const aiCharacters = this.getAllAICharacters();
            
            if (aiCharacters.length === 0) {
                this.showError('No AI characters available for Random Opponent');
                return;
            }
            
            // Select a random character
            const randomIndex = Math.floor(Math.random() * aiCharacters.length);
            const randomCharacter = aiCharacters[randomIndex];
            
            console.log(`🎲 Randomly selected: ${randomCharacter.name} (${randomCharacter.difficulty})`);
            
            // Set random opponent mode
            this.gameMode = 'random';
            
            // Start the game with random mode timer
            await this.startVSModeGame(randomCharacter.name, randomCharacter.difficulty, 'random');
            
        } catch (error) {
            console.error('Failed to start Random Opponent:', error);
            this.showError('Failed to start Random Opponent. Please try again.');
        }
    }

    getAICharactersOrderedByDifficulty() {
        // Return AI characters ordered from easiest to hardest
        return [
            // Easy characters (Green)
            { name: 'Abby', difficulty: 'easy' },
            { name: 'Diego', difficulty: 'easy' },
            { name: 'Stacy', difficulty: 'easy' },
            
            // Medium characters (Orange)
            { name: 'Chase', difficulty: 'medium' },
            { name: 'Luna', difficulty: 'medium' },
            { name: 'Bill', difficulty: 'medium' },
            
            // Hard characters (Red)
            { name: 'Max', difficulty: 'hard' },
            { name: 'Becky', difficulty: 'hard' }
        ];
    }

    getAllAICharacters() {
        // Return all AI characters
        return [
            { name: 'Abby', difficulty: 'easy' },
            { name: 'Diego', difficulty: 'easy' },
            { name: 'Stacy', difficulty: 'easy' },
            { name: 'Chase', difficulty: 'medium' },
            { name: 'Luna', difficulty: 'medium' },
            { name: 'Bill', difficulty: 'medium' },
            { name: 'Max', difficulty: 'hard' },
            { name: 'Becky', difficulty: 'hard' }
        ];
    }

    async advanceProgressivePlay() {
        if (this.gameMode !== 'progressive' || !this.progressivePlayCharacters) {
            return;
        }
        
        this.currentProgressiveIndex++;
        
        if (this.currentProgressiveIndex >= this.progressivePlayCharacters.length) {
            // Player has beaten all characters!
            this.showProgressivePlayComplete();
            return;
        }
        
        // Start next character
        const nextCharacter = this.progressivePlayCharacters[this.currentProgressiveIndex];
        console.log(`🎯 Progressive Play: Advancing to ${nextCharacter.name} (${nextCharacter.difficulty})`);
        
        // Ensure timer is properly reset and ready for next opponent
        if (this.gameManager?.timerManager) {
            // Stop any running timer first
            this.gameManager.timerManager.stopTimer();
            
            // Set the game mode to ensure correct duration
            this.gameManager.timerManager.setGameMode('progressive');
            
            // Ensure timer uses the latest custom settings from user preferences
            if (this.gameManager.ensureLatestTimerSettings) {
                this.gameManager.ensureLatestTimerSettings('progressive');
            }
            
            // Reset the timer state
            this.gameManager.timerManager.resetTimer();
            
            // Force restart the timer to ensure it's working
            setTimeout(() => {
                if (this.gameManager?.timerManager && !this.gameManager.timerManager.isTimerRunning()) {
                    console.log('⚠️ Timer not running after reset, force restarting...');
                    this.gameManager.timerManager.forceRestartTimer();
                }
            }, 50);
            
            console.log('⏰ Timer reset and configured for next Progressive Play opponent');
        }
        
        // Start the next battle with progressive mode timer
        console.log(`🎯 Starting battle against ${nextCharacter.name}...`);
        await this.startVSModeGame(nextCharacter.name, nextCharacter.difficulty, 'progressive');
        
        // Additional delay to ensure AI is fully ready
        setTimeout(() => {
            if (this.gameManager?.aiOpponentManager) {
                console.log(`🤖 Verifying AI opponent ${nextCharacter.name} is ready...`);
                const aiReady = this.gameManager.aiOpponentManager.isActive && 
                               !this.gameManager.aiOpponentManager.processingOrder;
                console.log(`🤖 AI opponent ready status: ${aiReady}`);
            }
        }, 500);
    }

    showProgressivePlayComplete() {
        console.log('🏆 Progressive Play Complete! Player defeated all AI opponents!');
        
        // Create celebration modal
        const celebrationDiv = document.createElement('div');
        celebrationDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Comic Sans MS', Arial, sans-serif;
        `;
        
        celebrationDiv.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #FFD700, #FFA500);
                color: #2c3e50;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                max-width: 500px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            ">
                <h2 style="font-size: 2.5rem; margin-bottom: 20px;">🏆 CHAMPION! 🏆</h2>
                <p style="font-size: 1.3rem; margin-bottom: 30px;">
                    Congratulations! You've defeated all 8 AI opponents in Progressive Play mode!
                </p>
                <div style="margin-bottom: 30px;">
                    <div style="font-size: 3rem; margin-bottom: 10px;">🎉 🎊 🏅 🎊 🎉</div>
                    <p style="font-size: 1.1rem; color: #8B4513;">
                        You are the ultimate Farmers Market champion!
                    </p>
                </div>
                <button onclick="this.parentElement.parentElement.remove(); main.backToDifficultySelection();" style="
                    background: linear-gradient(135deg, #27ae60, #2ecc71);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 15px;
                    cursor: pointer;
                    font-size: 1.2rem;
                    font-weight: bold;
                    margin-right: 10px;
                ">Play Again</button>
                <button onclick="this.parentElement.parentElement.remove();" style="
                    background: linear-gradient(135deg, #95a5a6, #7f8c8d);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 15px;
                    cursor: pointer;
                    font-size: 1.2rem;
                    font-weight: bold;
                ">Close</button>
            </div>
        `;
        
        document.body.appendChild(celebrationDiv);
    }

    showSettings() {
        if (this.settingsManager && typeof this.settingsManager.openSettings === 'function') {
            this.settingsManager.openSettings();
        } else {
            console.warn('Settings manager not available');
        }
    }

    setupHUDQuickSettings() {
        this.teardownHUDQuickSettings();

        const root = document.getElementById('hudQuickSettings');
        const toggleBtn = document.getElementById('hudSettingsToggleBtn');
        const menu = document.getElementById('hudSettingsMenu');
        const soundToggle = document.getElementById('hudSoundToggle');
        const volumeSlider = document.getElementById('hudVolumeSlider');
        const mainMenuBtn = document.getElementById('hudMainMenuBtn');
        const exitGameBtn = document.getElementById('hudExitGameBtn');

        if (!root || !toggleBtn || !menu || !soundToggle || !volumeSlider || !mainMenuBtn || !exitGameBtn) {
            console.warn('HUD quick settings elements not found');
            return;
        }

        this.hudSettingsElements = {
            root,
            toggleBtn,
            menu,
            soundToggle,
            volumeSlider,
            mainMenuBtn,
            exitGameBtn
        };

        // Always start closed when entering or returning to a match.
        this.closeHUDSettingsMenu();
        this.syncHUDQuickSettingsFromSavedSettings();

        toggleBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.toggleHUDSettingsMenu();
        });

        soundToggle.addEventListener('change', () => {
            const volume = parseInt(volumeSlider.value, 10);
            this.applyHUDSoundSettings(soundToggle.checked, volume, { persist: true });
        });

        volumeSlider.addEventListener('input', () => {
            const volume = parseInt(volumeSlider.value, 10);
            this.applyHUDSoundSettings(soundToggle.checked, volume, { persist: false });
        });

        volumeSlider.addEventListener('change', () => {
            const volume = parseInt(volumeSlider.value, 10);
            this.applyHUDSoundSettings(soundToggle.checked, volume, { persist: true });
        });

        mainMenuBtn.addEventListener('click', () => {
            this.returnToMainMenu();
        });

        exitGameBtn.addEventListener('click', () => {
            this.exitGame();
        });

        this.boundHandleHUDSettingsOutsideClick = this.handleHUDSettingsOutsideClick.bind(this);
        this.boundHandleHUDSettingsEscape = this.handleHUDSettingsEscape.bind(this);

        document.addEventListener('click', this.boundHandleHUDSettingsOutsideClick, true);
        document.addEventListener('keydown', this.boundHandleHUDSettingsEscape, true);
    }

    teardownHUDQuickSettings() {
        if (this.boundHandleHUDSettingsOutsideClick) {
            document.removeEventListener('click', this.boundHandleHUDSettingsOutsideClick, true);
        }

        if (this.boundHandleHUDSettingsEscape) {
            document.removeEventListener('keydown', this.boundHandleHUDSettingsEscape, true);
        }

        this.boundHandleHUDSettingsOutsideClick = null;
        this.boundHandleHUDSettingsEscape = null;
        this.hudSettingsElements = null;
    }

    setupCustomerPanelResizer() {
        this.teardownCustomerPanelResizer();

        const panel = document.getElementById('customerPanel');
        const handle = document.getElementById('customerPanelResizeHandle');
        if (!panel || !handle) {
            return;
        }

        this.customerPanelElement = panel;
        this.customerPanelResizeHandle = handle;
        this.customerPanelResizeState = {
            isResizing: false,
            activeInputMode: null,
            pointerId: null,
            touchId: null,
            startX: 0,
            startY: 0,
            startWidth: 0,
            startHeight: 0,
            latestX: 0,
            latestY: 0,
            frameRequestId: null,
            bounds: null
        };

        this.boundStartCustomerPanelResize = this.startCustomerPanelResize.bind(this);
        this.boundStartCustomerPanelResizeMouse = this.startCustomerPanelResizeMouse.bind(this);
        this.boundStartCustomerPanelResizeTouch = this.startCustomerPanelResizeTouch.bind(this);
        this.boundTrackCustomerPanelResize = this.trackCustomerPanelResize.bind(this);
        this.boundTrackCustomerPanelResizeMouse = this.trackCustomerPanelResizeMouse.bind(this);
        this.boundTrackCustomerPanelResizeTouch = this.trackCustomerPanelResizeTouch.bind(this);
        this.boundStopCustomerPanelResize = this.stopCustomerPanelResize.bind(this);
        this.boundStopCustomerPanelResizeMouse = this.stopCustomerPanelResizeMouse.bind(this);
        this.boundStopCustomerPanelResizeTouch = this.stopCustomerPanelResizeTouch.bind(this);
        this.boundSyncCustomerPanelResizeBounds = this.syncCustomerPanelResizeBounds.bind(this);

        if (window.PointerEvent) {
            this.customerPanelResizeHandle.addEventListener('pointerdown', this.boundStartCustomerPanelResize);
        } else {
            this.customerPanelResizeHandle.addEventListener('mousedown', this.boundStartCustomerPanelResizeMouse);
            this.customerPanelResizeHandle.addEventListener('touchstart', this.boundStartCustomerPanelResizeTouch, { passive: false });
        }
        window.addEventListener('resize', this.boundSyncCustomerPanelResizeBounds, { passive: true });

        this.syncCustomerPanelResizeBounds();
    }

    teardownCustomerPanelResizer() {
        if (this.customerPanelResizeHandle) {
            if (this.boundStartCustomerPanelResize) {
                this.customerPanelResizeHandle.removeEventListener('pointerdown', this.boundStartCustomerPanelResize);
            }

            if (this.boundStartCustomerPanelResizeMouse) {
                this.customerPanelResizeHandle.removeEventListener('mousedown', this.boundStartCustomerPanelResizeMouse);
            }

            if (this.boundStartCustomerPanelResizeTouch) {
                this.customerPanelResizeHandle.removeEventListener('touchstart', this.boundStartCustomerPanelResizeTouch);
            }
        }

        if (this.boundSyncCustomerPanelResizeBounds) {
            window.removeEventListener('resize', this.boundSyncCustomerPanelResizeBounds);
        }

        this.detachCustomerPanelResizeTrackingListeners();
        this.cancelPendingCustomerPanelResizeFrame();

        if (this.customerPanelElement) {
            this.customerPanelElement.classList.remove('resizing');
        }

        this.customerPanelElement = null;
        this.customerPanelResizeHandle = null;
        this.customerPanelResizeState = null;
        this.boundStartCustomerPanelResize = null;
        this.boundStartCustomerPanelResizeMouse = null;
        this.boundStartCustomerPanelResizeTouch = null;
        this.boundTrackCustomerPanelResize = null;
        this.boundTrackCustomerPanelResizeMouse = null;
        this.boundTrackCustomerPanelResizeTouch = null;
        this.boundStopCustomerPanelResize = null;
        this.boundStopCustomerPanelResizeMouse = null;
        this.boundStopCustomerPanelResizeTouch = null;
        this.boundSyncCustomerPanelResizeBounds = null;
    }

    startCustomerPanelResize(event) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        if (!this.beginCustomerPanelResize(event.clientX, event.clientY, 'pointer', { pointerId: event.pointerId })) {
            return;
        }

        event.preventDefault();

        if (this.customerPanelResizeHandle && typeof this.customerPanelResizeHandle.setPointerCapture === 'function') {
            try {
                this.customerPanelResizeHandle.setPointerCapture(event.pointerId);
            } catch (error) {
                console.warn('Customer panel resize pointer capture failed:', error?.message || error);
            }
        }

        this.attachCustomerPanelResizeTrackingListeners('pointer');
    }

    startCustomerPanelResizeMouse(event) {
        if (!event || event.button !== 0) return;

        if (!this.beginCustomerPanelResize(event.clientX, event.clientY, 'mouse')) {
            return;
        }

        event.preventDefault();
        this.attachCustomerPanelResizeTrackingListeners('mouse');
    }

    startCustomerPanelResizeTouch(event) {
        const touch = event.changedTouches?.[0] || event.touches?.[0];
        if (!touch) return;

        if (!this.beginCustomerPanelResize(touch.clientX, touch.clientY, 'touch', { touchId: touch.identifier })) {
            return;
        }

        event.preventDefault();
        this.attachCustomerPanelResizeTrackingListeners('touch');
    }

    trackCustomerPanelResize(event) {
        const state = this.customerPanelResizeState;
        if (!state || !state.isResizing || state.activeInputMode !== 'pointer' || event.pointerId !== state.pointerId) {
            return;
        }

        event.preventDefault();
        this.queueCustomerPanelResize(event.clientX, event.clientY);
    }

    trackCustomerPanelResizeMouse(event) {
        const state = this.customerPanelResizeState;
        if (!state || !state.isResizing || state.activeInputMode !== 'mouse') {
            return;
        }

        if (typeof event.buttons === 'number' && event.buttons === 0) {
            this.endCustomerPanelResize();
            return;
        }

        event.preventDefault();
        this.queueCustomerPanelResize(event.clientX, event.clientY);
    }

    trackCustomerPanelResizeTouch(event) {
        const state = this.customerPanelResizeState;
        if (!state || !state.isResizing || state.activeInputMode !== 'touch') {
            return;
        }

        const touch = this.findTouchById(event.touches, state.touchId);
        if (!touch) return;

        event.preventDefault();
        this.queueCustomerPanelResize(touch.clientX, touch.clientY);
    }

    stopCustomerPanelResize(event) {
        const state = this.customerPanelResizeState;
        if (!state || !state.isResizing || state.activeInputMode !== 'pointer') return;

        if (event?.pointerId != null && state.pointerId != null && event.pointerId !== state.pointerId) {
            return;
        }

        this.endCustomerPanelResize();
    }

    stopCustomerPanelResizeMouse() {
        const state = this.customerPanelResizeState;
        if (!state || !state.isResizing || state.activeInputMode !== 'mouse') return;
        this.endCustomerPanelResize();
    }

    stopCustomerPanelResizeTouch(event) {
        const state = this.customerPanelResizeState;
        if (!state || !state.isResizing || state.activeInputMode !== 'touch') return;

        if (event?.changedTouches && !this.findTouchById(event.changedTouches, state.touchId)) {
            return;
        }

        this.endCustomerPanelResize();
    }

    beginCustomerPanelResize(clientX, clientY, inputMode, { pointerId = null, touchId = null } = {}) {
        if (!this.customerPanelElement || !this.customerPanelResizeState) return false;
        if (document.body.classList.contains('portrait-locked')) return false;

        const bounds = this.getCustomerPanelResizeBounds();
        if (!bounds) return false;

        const panelRect = this.customerPanelElement.getBoundingClientRect();
        const state = this.customerPanelResizeState;
        state.isResizing = true;
        state.activeInputMode = inputMode;
        state.pointerId = pointerId;
        state.touchId = touchId;
        state.startX = clientX;
        state.startY = clientY;
        state.startWidth = panelRect.width;
        state.startHeight = panelRect.height;
        state.latestX = clientX;
        state.latestY = clientY;
        state.bounds = bounds;
        state.frameRequestId = null;

        if (this.customerPanelElement) {
            this.customerPanelElement.classList.add('resizing');
        }

        return true;
    }

    endCustomerPanelResize() {
        const state = this.customerPanelResizeState;
        if (!state || !state.isResizing) return;

        this.cancelPendingCustomerPanelResizeFrame();

        if (
            state.activeInputMode === 'pointer' &&
            this.customerPanelResizeHandle &&
            state.pointerId != null &&
            typeof this.customerPanelResizeHandle.releasePointerCapture === 'function'
        ) {
            try {
                if (this.customerPanelResizeHandle.hasPointerCapture?.(state.pointerId)) {
                    this.customerPanelResizeHandle.releasePointerCapture(state.pointerId);
                }
            } catch (error) {
                console.warn('Customer panel resize pointer release failed:', error?.message || error);
            }
        }

        state.isResizing = false;
        state.activeInputMode = null;
        state.pointerId = null;
        state.touchId = null;
        state.bounds = null;

        this.detachCustomerPanelResizeTrackingListeners();

        if (this.customerPanelElement) {
            this.customerPanelElement.classList.remove('resizing');
        }

        this.syncCustomerPanelResizeBounds();
    }

    attachCustomerPanelResizeTrackingListeners(inputMode) {
        if (inputMode === 'pointer') {
            window.addEventListener('pointermove', this.boundTrackCustomerPanelResize);
            window.addEventListener('pointerup', this.boundStopCustomerPanelResize);
            window.addEventListener('pointercancel', this.boundStopCustomerPanelResize);
            return;
        }

        if (inputMode === 'mouse') {
            window.addEventListener('mousemove', this.boundTrackCustomerPanelResizeMouse);
            window.addEventListener('mouseup', this.boundStopCustomerPanelResizeMouse);
            return;
        }

        if (inputMode === 'touch') {
            window.addEventListener('touchmove', this.boundTrackCustomerPanelResizeTouch, { passive: false });
            window.addEventListener('touchend', this.boundStopCustomerPanelResizeTouch);
            window.addEventListener('touchcancel', this.boundStopCustomerPanelResizeTouch);
        }
    }

    detachCustomerPanelResizeTrackingListeners() {
        window.removeEventListener('pointermove', this.boundTrackCustomerPanelResize);
        window.removeEventListener('pointerup', this.boundStopCustomerPanelResize);
        window.removeEventListener('pointercancel', this.boundStopCustomerPanelResize);
        window.removeEventListener('mousemove', this.boundTrackCustomerPanelResizeMouse);
        window.removeEventListener('mouseup', this.boundStopCustomerPanelResizeMouse);
        window.removeEventListener('touchmove', this.boundTrackCustomerPanelResizeTouch);
        window.removeEventListener('touchend', this.boundStopCustomerPanelResizeTouch);
        window.removeEventListener('touchcancel', this.boundStopCustomerPanelResizeTouch);
    }

    queueCustomerPanelResize(clientX, clientY) {
        const state = this.customerPanelResizeState;
        if (!state || !state.isResizing) return;

        state.latestX = clientX;
        state.latestY = clientY;

        if (state.frameRequestId !== null) {
            return;
        }

        state.frameRequestId = window.requestAnimationFrame(() => {
            state.frameRequestId = null;
            this.applyQueuedCustomerPanelResize();
        });
    }

    applyQueuedCustomerPanelResize() {
        const state = this.customerPanelResizeState;
        if (!state || !state.isResizing || !state.bounds || !this.customerPanelElement) {
            return;
        }

        const minWidth = Math.min(state.bounds.minWidth, state.bounds.maxWidth);
        const minHeight = Math.min(state.bounds.minHeight, state.bounds.maxHeight);
        const nextWidth = this.clampPanelResizeValue(
            state.startWidth + (state.latestX - state.startX),
            minWidth,
            state.bounds.maxWidth
        );
        const nextHeight = this.clampPanelResizeValue(
            state.startHeight + (state.latestY - state.startY),
            minHeight,
            state.bounds.maxHeight
        );

        this.customerPanelElement.style.setProperty('--fm-customer-panel-width', `${nextWidth.toFixed(2)}px`);
        this.customerPanelElement.style.setProperty('--fm-customer-panel-height', `${nextHeight.toFixed(2)}px`);
    }

    cancelPendingCustomerPanelResizeFrame() {
        const state = this.customerPanelResizeState;
        if (!state || state.frameRequestId === null) return;

        window.cancelAnimationFrame(state.frameRequestId);
        state.frameRequestId = null;
    }

    findTouchById(touchList, touchId) {
        if (!touchList || touchId == null) return null;

        for (let index = 0; index < touchList.length; index += 1) {
            const touch = touchList[index];
            if (touch.identifier === touchId) {
                return touch;
            }
        }

        return null;
    }

    syncCustomerPanelResizeBounds() {
        if (!this.customerPanelElement) return;

        const currentWidth = this.parsePanelPixelValue(
            this.customerPanelElement.style.getPropertyValue('--fm-customer-panel-width')
        );
        const currentHeight = this.parsePanelPixelValue(
            this.customerPanelElement.style.getPropertyValue('--fm-customer-panel-height')
        );

        if (currentWidth === null && currentHeight === null) {
            return;
        }

        const bounds = this.getCustomerPanelResizeBounds();
        if (!bounds) return;

        const minWidth = Math.min(bounds.minWidth, bounds.maxWidth);
        const minHeight = Math.min(bounds.minHeight, bounds.maxHeight);

        if (currentWidth !== null) {
            const clampedWidth = this.clampPanelResizeValue(currentWidth, minWidth, bounds.maxWidth);
            this.customerPanelElement.style.setProperty('--fm-customer-panel-width', `${Math.round(clampedWidth)}px`);
        }

        if (currentHeight !== null) {
            const clampedHeight = this.clampPanelResizeValue(currentHeight, minHeight, bounds.maxHeight);
            this.customerPanelElement.style.setProperty('--fm-customer-panel-height', `${Math.round(clampedHeight)}px`);
        }
    }

    getCustomerPanelResizeBounds() {
        if (!this.customerPanelElement) return null;

        const panel = this.customerPanelElement;
        const existingWidth = panel.style.getPropertyValue('--fm-customer-panel-width');
        const existingHeight = panel.style.getPropertyValue('--fm-customer-panel-height');

        if (existingWidth) {
            panel.style.removeProperty('--fm-customer-panel-width');
        }

        if (existingHeight) {
            panel.style.removeProperty('--fm-customer-panel-height');
        }

        const computedStyles = window.getComputedStyle(panel);
        const panelRect = panel.getBoundingClientRect();
        const computedMaxWidth = this.parsePanelPixelValue(computedStyles.maxWidth);
        const computedMaxHeight = this.parsePanelPixelValue(computedStyles.maxHeight);
        const fallbackMaxWidth = Math.max(220, window.innerWidth - panelRect.left - 10);
        const fallbackMaxHeight = Math.max(220, window.innerHeight - panelRect.top - 10);
        const maxWidth = computedMaxWidth !== null ? computedMaxWidth : fallbackMaxWidth;
        const maxHeight = computedMaxHeight !== null ? computedMaxHeight : fallbackMaxHeight;

        if (existingWidth) {
            panel.style.setProperty('--fm-customer-panel-width', existingWidth);
        }

        if (existingHeight) {
            panel.style.setProperty('--fm-customer-panel-height', existingHeight);
        }

        return {
            minWidth: Math.max(260, Math.min(320, maxWidth)),
            minHeight: Math.max(220, Math.min(280, maxHeight)),
            maxWidth,
            maxHeight
        };
    }

    parsePanelPixelValue(value) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    clampPanelResizeValue(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    getSavedSoundSettings() {
        const settings = this.settingsManager?.getSettings?.() || {};
        const enableSound = settings.enableSound !== false;
        const parsedVolume = Number.parseInt(settings.volume, 10);
        const volume = Number.isFinite(parsedVolume) ? parsedVolume : 70;
        return {
            enableSound,
            volume: Math.max(0, Math.min(100, volume))
        };
    }

    syncHUDQuickSettingsFromSavedSettings() {
        if (!this.hudSettingsElements) return;

        const { soundToggle, volumeSlider } = this.hudSettingsElements;
        const { enableSound, volume } = this.getSavedSoundSettings();

        soundToggle.checked = enableSound;
        volumeSlider.value = String(volume);
        this.applyHUDSoundSettings(enableSound, volume, { persist: false });
    }

    applyHUDSoundSettings(enableSound, volume, { persist = true } = {}) {
        const safeVolume = Math.max(0, Math.min(100, Number.parseInt(volume, 10) || 0));
        const soundEnabled = Boolean(enableSound);

        if (this.hudSettingsElements) {
            const { soundToggle, volumeSlider } = this.hudSettingsElements;
            soundToggle.checked = soundEnabled;
            volumeSlider.value = String(safeVolume);
            volumeSlider.disabled = !soundEnabled;
        }

        const settingsSoundToggle = document.getElementById('enableSoundSetting');
        const settingsVolumeSlider = document.getElementById('volumeSetting');
        if (settingsSoundToggle) settingsSoundToggle.checked = soundEnabled;
        if (settingsVolumeSlider) settingsVolumeSlider.value = String(safeVolume);

        if (this.settingsManager) {
            if (!this.settingsManager.gameSettings) {
                this.settingsManager.gameSettings = this.settingsManager.getDefaultSettings?.() || {};
            }
            this.settingsManager.gameSettings.enableSound = soundEnabled;
            this.settingsManager.gameSettings.volume = safeVolume;
            if (persist && typeof this.settingsManager.saveGameSettings === 'function') {
                this.settingsManager.saveGameSettings();
            }
        }

        if (this.gameManager?.moneyManager) {
            if (typeof this.gameManager.moneyManager.setSoundEnabled === 'function') {
                this.gameManager.moneyManager.setSoundEnabled(soundEnabled);
            }
            if (typeof this.gameManager.moneyManager.setMasterVolume === 'function') {
                this.gameManager.moneyManager.setMasterVolume(safeVolume);
            }
        }

        const gameAudio = document.getElementById('gameAudio');
        if (gameAudio) {
            gameAudio.muted = !soundEnabled;
            gameAudio.volume = safeVolume / 100;
        }
    }

    toggleHUDSettingsMenu(forceOpen = null) {
        if (!this.hudSettingsElements) return;

        const { menu, toggleBtn } = this.hudSettingsElements;
        const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : menu.hidden;

        menu.hidden = !shouldOpen;
        toggleBtn.setAttribute('aria-expanded', String(shouldOpen));
    }

    closeHUDSettingsMenu() {
        this.toggleHUDSettingsMenu(false);
    }

    handleHUDSettingsOutsideClick(event) {
        if (!this.hudSettingsElements) return;

        const { root, menu } = this.hudSettingsElements;
        if (menu.hidden) return;

        if (!root.contains(event.target)) {
            this.closeHUDSettingsMenu();
        }
    }

    handleHUDSettingsEscape(event) {
        if (!this.hudSettingsElements || event.key !== 'Escape') return;

        const { menu } = this.hudSettingsElements;
        if (menu.hidden) return;

        event.preventDefault();
        event.stopPropagation();
        this.closeHUDSettingsMenu();
    }

    stopCurrentGameSession() {
        if (!this.gameManager) return;

        try {
            const gameManager = this.gameManager;
            gameManager.isGameRunning = false;
            gameManager.isPaused = false;

            gameManager.stopSynchronizedCustomerSpawning?.();
            gameManager.customerManager?.stopCustomerSpawning?.();
            gameManager.customerManager?.pauseCustomers?.();
            gameManager.aiOpponentManager?.stopCompetition?.();

            if (gameManager.vsModeManager?.isCompetitionActive?.()) {
                gameManager.vsModeManager.endCompetition(true);
            }

            if (gameManager.vsModeManager?.isInVSMode?.()) {
                gameManager.vsModeManager.toggleVSMode(false);
            }

            gameManager.timerManager?.stopTimer?.();
            gameManager.timerManager?.resetTimer?.();
            gameManager.hidePauseMenu?.();
            gameManager.hideTutorial?.();
            gameManager.moneyManager?.hideMentalMathInterface?.();
            gameManager.moneyManager?.hidePaymentInterface?.();
            gameManager.resetGameState?.();
        } catch (error) {
            console.error('Failed to stop current game session:', error);
        }
    }

    returnToMainMenu() {
        this.closeHUDSettingsMenu();
        this.stopCurrentGameSession();

        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.style.display = 'none';
        }

        const characterScreen = document.getElementById('characterScreen');
        if (characterScreen) {
            characterScreen.style.display = 'none';
        }

        const settingsPanel = document.getElementById('settingsPanel');
        if (settingsPanel) {
            settingsPanel.classList.remove('active');
        }

        document.querySelectorAll('.game-end-modal').forEach(modal => modal.remove());
        this.showDifficultySelection();
    }

    getMainAppHomePath() {
        const pathname = window.location.pathname || '';
        const gamesSegmentIndex = pathname.toLowerCase().indexOf('/games/');
        const basePath = gamesSegmentIndex >= 0 ? pathname.slice(0, gamesSegmentIndex) : '';
        const normalizedBase = basePath ? (basePath.endsWith('/') ? basePath : `${basePath}/`) : '/';
        return normalizedBase;
    }

    navigateToMainAppHome() {
        const targetPath = this.getMainAppHomePath();
        const payload = {
            type: 'LAHS_GAME_EXIT_TO_HOME',
            source: 'farmersmarket',
            targetPath
        };

        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(payload, '*');
            }
        } catch (error) {
            console.warn('Failed to notify parent window for home navigation:', error);
        }

        try {
            if (window.top && window.top !== window) {
                window.top.location.assign(targetPath);
                return true;
            }
        } catch (error) {
            console.warn('Failed to navigate top window to home:', error);
        }

        try {
            window.location.assign(targetPath);
            return true;
        } catch (error) {
            console.warn('Failed to navigate current window to home:', error);
        }

        return false;
    }

    exitGame() {
        const confirmed = confirm('Exit Farmers Market Frenzy?');
        if (!confirmed) return;

        this.closeHUDSettingsMenu();
        this.stopCurrentGameSession();

        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.style.display = 'none';
        }

        try {
            if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
                const exitPromise = document.exitFullscreen();
                if (exitPromise && typeof exitPromise.catch === 'function') {
                    exitPromise.catch(() => { });
                }
            }
        } catch (error) {
            console.warn('Fullscreen exit failed:', error);
        }

        if (!this.navigateToMainAppHome()) {
            this.showError('Could not return to Homepage. Please open Homepage from the app tabs.');
        }
    }

    showError(message) {
        console.error('Game Error:', message);
        
        // Create simple error dialog
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #f44336;
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            text-align: center;
            max-width: 400px;
        `;
        errorDiv.innerHTML = `
            <h3>Error</h3>
            <p>${message}</p>
            <button onclick="this.parentElement.remove()" style="
                background: white;
                color: #f44336;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">OK</button>
        `;
        
        document.body.appendChild(errorDiv);
    }

    setupGlobalDebugFunctions() {
        // Create global debug functions for testing and development
        window.debugGame = {
            // Game state functions
            getGameState: () => {
                if (!this.gameManager) return null;
                return {
                    isRunning: this.gameManager.isGameRunning,
                    isPaused: this.gameManager.isPaused,
                    difficulty: this.gameManager.getDifficulty(),
                    score: this.gameManager.getTotalScore(),
                    popularity: this.gameManager.getPopularity(),
                    customersServed: this.gameManager.getCustomersServed()
                };
            },

            // Customer functions
            getCurrentCustomer: () => {
                return this.gameManager?.customerManager?.getCurrentCustomer() || null;
            },

            skipCustomer: () => {
                if (this.gameManager?.customerManager) {
                    this.gameManager.customerManager.skipCurrentCustomer();
                    console.log('✅ Customer skipped');
                } else {
                    console.log('❌ No customer manager available');
                }
            },

            spawnCustomer: () => {
                if (this.gameManager?.customerManager) {
                    this.gameManager.customerManager.spawnNextCustomer();
                    console.log('✅ Customer spawned');
                } else {
                    console.log('❌ No customer manager available');
                }
            },

            debugCustomerLines: () => {
                if (this.gameManager?.sceneManager) {
                    this.gameManager.sceneManager.debugCustomerLines();
                    console.log('✅ Customer lines debug info displayed');
                } else {
                    console.log('❌ No scene manager available');
                }
            },

            testPatienceBar: () => {
                if (this.gameManager?.customerManager) {
                    this.gameManager.customerManager.testPatienceBar();
                    console.log('✅ Patience bar test started');
                } else {
                    console.log('❌ No customer manager available');
                }
            },

            // Pricing functions

            setDifficulty: (difficulty) => {
                if (!['easy', 'medium', 'hard'].includes(difficulty)) {
                    console.log('❌ Invalid difficulty. Use: easy, medium, hard');
                    return;
                }
                
                if (this.gameManager) {
                    this.gameManager.setDifficulty(difficulty);
                    console.log(`✅ Difficulty set to ${difficulty}`);
                } else {
                    console.log('❌ Game manager not available');
                }
            },

            // Validation functions
            validateOrder: () => {
                if (this.gameManager) {
                    this.gameManager.validateCurrentOrder();
                } else {
                    console.log('❌ Game manager not available');
                }
            },

            // Timer debugging functions
            getTimerStatus: () => {
                if (this.gameManager?.timerManager) {
                    const tm = this.gameManager.timerManager;
                    return {
                        isRunning: tm.isTimerRunning(),
                        isPaused: tm.isTimerPaused(),
                        timeRemaining: tm.getTimeRemaining(),
                        formattedTime: tm.getFormattedTimeRemaining(),
                        gameMode: tm.getCurrentGameMode(),
                        duration: tm.getDuration(),
                        enabled: tm.enabled
                    };
                }
                return null;
            },
            forceRestartTimer: () => {
                if (this.gameManager?.timerManager) {
                    this.gameManager.timerManager.forceRestartTimer();
                }
            },
            resetTimer: () => {
                if (this.gameManager?.timerManager) {
                    this.gameManager.timerManager.resetTimer();
                }
            },

            // Money functions
            showChangeHint: () => {
                if (this.gameManager?.moneyManager) {
                    this.gameManager.moneyManager.showChangeHint();
                } else {
                    console.log('❌ Money manager not available');
                }
            },

            getPaymentState: () => {
                return this.gameManager?.moneyManager?.getPaymentState() || null;
            },

            // Settings functions
            showSettings: () => {
                this.showSettings();
            },
            
            // Cross-platform testing functions
            testCrossPlatform: () => {
                if (this.gameManager?.moneyManager) {
                    return this.gameManager.moneyManager.testCrossPlatformFeatures();
                } else {
                    console.log('❌ Money manager not available for testing');
                    return null;
                }
            },
            
            getDeviceInfo: () => {
                if (this.gameManager?.moneyManager) {
                    return this.gameManager.moneyManager.getDeviceInfo();
                } else {
                    console.log('❌ Money manager not available');
                    return null;
                }
            },

            // Help function
            help: () => {
                console.log(`
🎮 FARMERS MARKET DEBUG COMMANDS:

📊 Game State:
• debugGame.getGameState() - Get current game state
• debugGame.setDifficulty('easy'|'medium'|'hard') - Change difficulty

👥 Customer Management:
• debugGame.getCurrentCustomer() - Get current customer info
• debugGame.skipCustomer() - Skip current customer
• debugGame.spawnCustomer() - Force spawn new customer
• debugGame.debugCustomerLines() - Show customer line positions
• debugGame.testPatienceBar() - Test patience bar animation

💰 Pricing & Orders:
• debugGame.validateOrder() - Validate current customer order

💸 Money & Payment:
• debugGame.showChangeHint() - Show optimal change hint
• debugGame.getPaymentState() - Get payment info

⚙️ Settings:
• debugGame.showSettings() - Open settings panel

🌐 Cross-Platform Testing:
• debugGame.testCrossPlatform() - Test all cross-platform features
• debugGame.getDeviceInfo() - Get detailed device information

❓ Help:
• debugGame.help() - Show this help message
                `);
            }
        };

        console.log('🔧 Debug functions loaded! Type debugGame.help() for commands.');
    }

    // Public methods for external access
    getGameManager() {
        return this.gameManager;
    }

    getSettingsManager() {
        return this.settingsManager;
    }

    isGameInitialized() {
        return this.isInitialized;
    }

    restart() {
        console.log('Restarting game...');
        this.teardownHUDQuickSettings();
        this.teardownCustomerPanelResizer();
        
        // Dispose current managers
        if (this.gameManager && typeof this.gameManager.dispose === 'function') {
            this.gameManager.dispose();
        }
        
        if (this.settingsManager && typeof this.settingsManager.dispose === 'function') {
            this.settingsManager.dispose();
        }
        
        // Clear global references
        window.gameManager = null;
        window.settingsManager = null;
        window.debugGame = null;
        
        // Reset state
        this.gameManager = null;
        this.settingsManager = null;
        this.isInitialized = false;
        this.loadingProgress = 0;
        
        // Reinitialize
        setTimeout(() => {
            this.init();
        }, 100);
    }

    dispose() {
        console.log('🧹 Disposing main application...');
        
        try {
            this.teardownHUDQuickSettings();
            this.teardownCustomerPanelResizer();
            this.cleanupFullscreenController();

            // Remove orientation listeners and timers
            this.cleanupOrientationController();

            // Remove event listeners to prevent memory leaks
            this.removeEventListeners();
            
            // Clear global references to prevent memory leaks
            if (window.settingsManager === this.settingsManager) {
                window.settingsManager = null;
            }
            if (window.gameManager === this.gameManager) {
                window.gameManager = null;
            }
            
            // Dispose of managers in reverse order
            if (this.gameManager && typeof this.gameManager.dispose === 'function') {
                this.gameManager.dispose();
                this.gameManager = null;
            }
            
            if (this.settingsManager && typeof this.settingsManager.dispose === 'function') {
                this.settingsManager.dispose();
                this.settingsManager = null;
            }
            
            // Clear additional global references
            window.debugGame = null;
            window.main = null;
            
            // Clear loading progress
            this.loadingProgress = 0;
            this.isInitialized = false;
            
            console.log('✅ Main application disposed successfully');
        } catch (error) {
            console.error('Error during disposal:', error);
        }
    }

    cleanupOrientationController() {
        clearTimeout(this.orientationIntroTimer);
        this.orientationIntroTimer = null;
        this.hideOrientationWarning();
        this.wasPausedByPortraitLock = false;
        document.body.classList.remove('portrait-locked', 'landscape-locked');
        document.documentElement.classList.remove('portrait-locked', 'landscape-locked');

        if (this.boundOnViewportChange) {
            window.removeEventListener('orientationchange', this.boundOnViewportChange);
            window.removeEventListener('resize', this.boundOnViewportChange);
        }

        if (this.boundOnVisibilityRestore) {
            document.removeEventListener('visibilitychange', this.boundOnVisibilityRestore);
        }

        this.boundOnViewportChange = null;
        this.boundOnVisibilityRestore = null;
    }

    cleanupFullscreenController() {
        if (this.boundEnsureFullscreenOnInteraction) {
            window.removeEventListener('pointerdown', this.boundEnsureFullscreenOnInteraction);
        }

        if (this.boundEnsureFullscreenOnInteractionMouse) {
            window.removeEventListener('mousedown', this.boundEnsureFullscreenOnInteractionMouse);
        }

        if (this.boundEnsureFullscreenOnInteractionTouch) {
            window.removeEventListener('touchstart', this.boundEnsureFullscreenOnInteractionTouch);
        }

        if (this.boundOnFullscreenChange) {
            document.removeEventListener('fullscreenchange', this.boundOnFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', this.boundOnFullscreenChange);
            document.removeEventListener('MSFullscreenChange', this.boundOnFullscreenChange);
        }

        this.boundEnsureFullscreenOnInteraction = null;
        this.boundEnsureFullscreenOnInteractionMouse = null;
        this.boundEnsureFullscreenOnInteractionTouch = null;
        this.boundOnFullscreenChange = null;
        this.requiresFullscreenRestore = false;
        this.lastFullscreenInteractionAt = 0;
    }

    removeEventListeners() {
        // Remove event listeners from difficulty cards
        const difficultyCards = document.querySelectorAll('.difficulty-card');
        difficultyCards.forEach(card => {
            // Clone and replace to remove all event listeners
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
        });

        // Remove event listeners from character cards
        const characterCards = document.querySelectorAll('.character-card');
        characterCards.forEach(card => {
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
        });

        // Remove event listeners from buttons
        const buttons = [
            'startGameBtnDifficulty',
            'settingsBtn',
            'startCompetitionBtnCharacter',
            'backTodifficultyBtn',
            'hudSettingsToggleBtn',
            'hudMainMenuBtn',
            'hudExitGameBtn'
        ];
        
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
            }
        });

        const hudFormControls = ['hudSoundToggle', 'hudVolumeSlider'];
        hudFormControls.forEach(controlId => {
            const control = document.getElementById(controlId);
            if (control) {
                const newControl = control.cloneNode(true);
                control.parentNode.replaceChild(newControl, control);
            }
        });
    }

    async initializeGameSystems() {
        try {
            console.log('🔧 Initializing game systems...');
            
            // Initialize settings manager first
            await this.initializeSettings();
            
            // Initialize game manager with proper error handling
            this.gameManager = new GameManager();
            
            // Use consistent initialization method name
            const gameInitialized = await this.gameManager.initialize();
            if (!gameInitialized) {
                throw new Error('GameManager initialization failed');
            }
            
            // Connect systems after successful initialization
            this.connectGameSystems();
            
            // Systems connected successfully
            
            console.log('✅ All game systems initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Game systems initialization failed:', error);
            return false;
        }
    }

    connectGameSystems() {
        if (!this.gameManager) {
            console.error('Cannot connect game systems - GameManager not initialized');
            return;
        }
        
        // Connect settings manager to game manager
        if (this.settingsManager && this.gameManager) {
            this.gameManager.settingsManager = this.settingsManager;
            console.log('🔗 Connected SettingsManager to GameManager');
        }
        
        // Connect product manager to settings for item updates
        if (this.gameManager.productManager && this.settingsManager) {
            // Listen for settings changes to update product inventory
            // This could be improved with a proper event system in the future
            console.log('🔗 Connected ProductManager to SettingsManager');
        }
        
        console.log('✅ Game systems connected');
    }

    showInitializationError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'initialization-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h2>🚨 Game Initialization Error</h2>
                <p>The game failed to initialize properly. Please refresh the page and try again.</p>
                <details>
                    <summary>Technical Details</summary>
                    <pre>${error.message}\n${error.stack}</pre>
                </details>
                <button onclick="location.reload()" class="retry-btn">🔄 Retry</button>
            </div>
        `;
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(errorDiv);
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOM loaded, initializing Farmers Market Frenzy 3D...');
        
        // Create and initialize main application
        window.main = new Main();
        await window.main.init();
        
    } catch (error) {
        console.error('Fatal error during initialization:', error);
        
        // Show user-friendly error message
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #1a1a1a;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
            z-index: 10000;
        `;
        errorMessage.innerHTML = `
            <div style="text-align: center; max-width: 500px; padding: 40px;">
                <h1 style="color: #f44336; margin-bottom: 20px;">🚨 Game Failed to Load</h1>
                <p style="margin-bottom: 20px;">
                    Sorry, there was an error loading Farmers Market Frenzy 3D.
                </p>
                <p style="margin-bottom: 30px; color: #888;">
                    Error: ${error.message || 'Unknown error'}
                </p>
                <button onclick="location.reload()" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                ">🔄 Reload Page</button>
            </div>
        `;
        
        document.body.appendChild(errorMessage);
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.main && typeof window.main.dispose === 'function') {
        window.main.dispose();
    }
});

// Export for global access
window.Main = Main;
