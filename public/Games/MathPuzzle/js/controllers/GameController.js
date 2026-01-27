/**
 * Game Controller
 * Manages pages, navigation, and settings
 */
class GameController {
    constructor() {
        this.currentPage = 'mainMenu';
        this.selectedDifficulty = null;
        this.gameState = {
            level: null,
            score: 0,
            timeLimit: 0
        };
        this.savedSettings = null;
        this.settingsListenersSetup = false;
        this.loadSettings();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('singlePlayer')?.addEventListener('click', () => {
            this.showDifficultyPage();
        });

        document.getElementById('settings')?.addEventListener('click', () => {
            this.showSettings();
        });

        document.getElementById('backToMain')?.addEventListener('click', () => {
            this.showMainMenu();
        });

        document.querySelectorAll('.difficulty-button').forEach(button => {
            button.addEventListener('click', () => {
                this.selectDifficulty(button.dataset.difficulty, button);
            });
        });

        document.getElementById('startGame')?.addEventListener('click', () => {
            this.startCountdown();
        });

        // Game Over buttons
        document.getElementById('playAgainBtn')?.addEventListener('click', () => {
            this.hideFeedback();
            this.startGame();
        });

        document.getElementById('mainMenuBtn')?.addEventListener('click', () => {
            this.hideFeedback();
            this.showMainMenu();
        });
    }

    showMainMenu() {
        if (window.mathGameController) {
            window.mathGameController.cleanup();
            window.mathGameController = null;
        }

        this.currentPage = 'mainMenu';
        this.hideAllPages();
        const mainMenu = document.getElementById('mainMenu');
        if (mainMenu) {
            mainMenu.style.display = 'flex';
        }

        this.selectedDifficulty = null;
        document.querySelectorAll('.difficulty-button').forEach(btn => {
            btn.classList.remove('selected');
        });

        const startButton = document.getElementById('startGame');
        if (startButton) {
            startButton.style.display = 'none';
        }

        const feedbackOverlay = document.getElementById('feedbackOverlay');
        if (feedbackOverlay) {
            feedbackOverlay.style.display = 'none';
        }

        anime({
            targets: '#mainMenu .main-title, #mainMenu .game-button',
            opacity: [0, 1],
            translateY: [30, 0],
            duration: 800,
            delay: anime.stagger(100),
            easing: 'easeOutCubic'
        });
    }

    showDifficultyPage() {
        this.currentPage = 'difficultyPage';
        this.hideAllPages();
        const difficultyPage = document.getElementById('difficultyPage');
        if (difficultyPage) {
            difficultyPage.style.display = 'flex';
        }

        anime({
            targets: '#difficultyPage .page-title',
            opacity: [0, 1],
            translateY: [-30, 0],
            duration: 600,
            easing: 'easeOutCubic'
        });

        anime({
            targets: '.difficulty-button',
            opacity: [0, 1],
            translateY: [50, 0],
            scale: [0.9, 1],
            duration: 800,
            delay: anime.stagger(100, { start: 200 }),
            easing: 'easeOutCubic'
        });
    }

    showSettings() {
        this.currentPage = 'settingsPage';
        this.hideAllPages();
        const settingsPage = document.getElementById('settingsPage');
        if (settingsPage) {
            settingsPage.style.display = 'flex';
        }

        this.loadSettings();

        this.setupSettingsEventListeners();
    }

    setupSettingsEventListeners() {
        if (this.settingsListenersSetup) {
            return;
        }
        this.settingsListenersSetup = true;

        document.getElementById('backToMainFromSettings')?.addEventListener('click', () => {
            this.showMainMenu();
        });

        const timeLimitSlider = document.getElementById('customTimeLimit');
        const timeLimitValue = document.getElementById('timeLimitValue');
        if (timeLimitSlider && timeLimitValue) {
            timeLimitSlider.addEventListener('input', (e) => {
                timeLimitValue.textContent = e.target.value;
            });
        }

        document.querySelectorAll('.preset-button').forEach(button => {
            button.addEventListener('click', () => {
                const time = parseInt(button.dataset.time);
                if (timeLimitSlider) {
                    timeLimitSlider.value = time;
                    if (timeLimitValue) {
                        timeLimitValue.textContent = time;
                    }
                }
            });
        });

        document.getElementById('saveSettings')?.addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('resetSettings')?.addEventListener('click', () => {
            this.resetSettings();
        });
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('mathGameSettings');
        let settings = {
            customTimeLimit: 60,
            enableHints: true,
            enableSkip: true,
            hintLimit: 3,
            skipLimit: 3
        };

        if (savedSettings) {
            try {
                settings = { ...settings, ...JSON.parse(savedSettings) };
            } catch (e) {
                console.warn('Failed to load settings:', e);
            }
        }

        const timeLimitSlider = document.getElementById('customTimeLimit');
        const timeLimitValue = document.getElementById('timeLimitValue');
        const enableHints = document.getElementById('enableHints');
        const enableSkip = document.getElementById('enableSkip');

        if (timeLimitSlider) {
            timeLimitSlider.value = settings.customTimeLimit;
        }
        if (timeLimitValue) {
            timeLimitValue.textContent = settings.customTimeLimit;
        }
        if (enableHints) {
            enableHints.checked = settings.enableHints;
        }
        if (enableSkip) {
            enableSkip.checked = settings.enableSkip;
        }

        const hintLimitInput = document.getElementById('hintLimit');
        const skipLimitInput = document.getElementById('skipLimit');

        if (hintLimitInput) hintLimitInput.value = settings.hintLimit || 3;
        if (skipLimitInput) skipLimitInput.value = settings.skipLimit || 3;

        this.savedSettings = settings;
    }

    saveSettings() {
        const timeLimitSlider = document.getElementById('customTimeLimit');
        const enableHints = document.getElementById('enableHints');
        const enableSkip = document.getElementById('enableSkip');
        const hintLimit = document.getElementById('hintLimit');
        const skipLimit = document.getElementById('skipLimit');

        const settings = {
            customTimeLimit: timeLimitSlider ? parseInt(timeLimitSlider.value) : 60,
            enableHints: enableHints ? enableHints.checked : true,
            enableSkip: enableSkip ? enableSkip.checked : true,
            hintLimit: hintLimit ? parseInt(hintLimit.value) : 3,
            skipLimit: skipLimit ? parseInt(skipLimit.value) : 3
        };

        const confirmOverlay = document.getElementById('confirmOverlay');
        const confirmBtn = document.getElementById('confirmSaveBtn');
        const cancelBtn = document.getElementById('cancelSaveBtn');

        if (confirmOverlay && confirmBtn && cancelBtn) {
            // Show custom modal
            confirmOverlay.style.display = 'flex';

            const handleConfirm = () => {
                try {
                    localStorage.setItem('mathGameSettings', JSON.stringify(settings));
                    this.savedSettings = settings;
                    this.showFeedback('Settings', 'Settings saved successfully!', '✅');

                    setTimeout(() => {
                        this.hideFeedback();
                    }, 2000);
                } catch (e) {
                    this.showFeedback('Error', 'Failed to save settings', '❌');
                }
                cleanup();
            };

            const handleCancel = () => {
                cleanup();
            };

            const cleanup = () => {
                confirmOverlay.style.display = 'none';
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
            };

            // Remove existing listeners first to prevent duplicates
            // Cloning nodes is a quick way to clear listeners if we don't track the bounded functions
            const newConfirmBtn = confirmBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            newConfirmBtn.addEventListener('click', handleConfirm);
            newCancelBtn.addEventListener('click', handleCancel);

        } else {
            // Fallback if modal elements missing
            if (confirm("Are you sure you want to save these settings? 💾")) {
                try {
                    localStorage.setItem('mathGameSettings', JSON.stringify(settings));
                    this.savedSettings = settings;
                    this.showFeedback('Settings', 'Settings saved successfully!', '✅');

                    setTimeout(() => {
                        this.hideFeedback();
                    }, 2000);
                } catch (e) {
                    this.showFeedback('Error', 'Failed to save settings', '❌');
                }
            }
        }
    }

    resetSettings() {
        const defaultSettings = {
            customTimeLimit: 60,
            enableHints: true,
            enableSkip: true,
            hintLimit: 3,
            skipLimit: 3
        };

        const timeLimitSlider = document.getElementById('customTimeLimit');
        const timeLimitValue = document.getElementById('timeLimitValue');
        const enableHints = document.getElementById('enableHints');
        const enableSkip = document.getElementById('enableSkip');

        if (timeLimitSlider) {
            timeLimitSlider.value = defaultSettings.customTimeLimit;
        }
        if (timeLimitValue) {
            timeLimitValue.textContent = defaultSettings.customTimeLimit;
        }
        if (enableHints) {
            enableHints.checked = defaultSettings.enableHints;
        }
        if (enableSkip) {
            enableSkip.checked = defaultSettings.enableSkip;
        }

        const hintLimitInput = document.getElementById('hintLimit');
        const skipLimitInput = document.getElementById('skipLimit');
        if (hintLimitInput) hintLimitInput.value = defaultSettings.hintLimit;
        if (skipLimitInput) skipLimitInput.value = defaultSettings.skipLimit;

        try {
            localStorage.setItem('mathGameSettings', JSON.stringify(defaultSettings));
            this.savedSettings = defaultSettings;
            this.showFeedback('Settings', 'Settings reset to defaults!', '🔄');

            setTimeout(() => {
                this.hideFeedback();
            }, 2000);
        } catch (e) {
            this.showFeedback('Error', 'Failed to reset settings', '❌');
        }
    }

    getCustomTimeLimit() {
        if (this.savedSettings && this.savedSettings.customTimeLimit) {
            return this.savedSettings.customTimeLimit;
        }
        return null;
    }

    showFeedback(title, message, icon) {
        const overlay = document.getElementById('feedbackOverlay');
        const iconEl = document.getElementById('feedbackIcon');
        const messageEl = document.getElementById('feedbackMessage');
        const actionsEl = document.getElementById('feedbackActions');

        if (overlay && iconEl && messageEl) {
            iconEl.textContent = icon;
            messageEl.textContent = `${title}: ${message}`;

            // Hide action buttons for transient feedback
            if (actionsEl) actionsEl.style.display = 'none';

            overlay.style.display = 'flex';

            setTimeout(() => {
                // Only hide if we aren't showing the persistent game over screen
                // We check if actions are hidden to know it's a transient message
                if (actionsEl && actionsEl.style.display === 'none') {
                    overlay.style.display = 'none';
                }
            }, 1000);
        }
    }

    hideFeedback() {
        const overlay = document.getElementById('feedbackOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    selectDifficulty(difficulty, buttonElement) {
        document.querySelectorAll('.difficulty-button').forEach(btn => {
            btn.classList.remove('selected');
        });

        buttonElement.classList.add('selected');
        this.selectedDifficulty = difficulty;

        const startButton = document.getElementById('startGame');
        if (startButton) {
            startButton.style.display = 'block';

            anime({
                targets: startButton,
                opacity: [0, 1],
                scale: [0.8, 1],
                translateY: [30, 0],
                duration: 600,
                easing: 'easeOutElastic(1, .8)'
            });
        }

        this.setGameParameters(difficulty);
    }

    setGameParameters(difficulty) {
        const difficultySettings = {
            easy: { level: 1, timeLimit: 60 },
            medium: { level: 2, timeLimit: 45 },
            hard: { level: 3, timeLimit: 30 },
            extreme: { level: 4, timeLimit: 20 }
        };

        const settings = difficultySettings[difficulty];
        if (settings) {
            this.gameState.level = settings.level;
            const customTimeLimit = this.getCustomTimeLimit();
            if (customTimeLimit && customTimeLimit > 0) {
                this.gameState.timeLimit = customTimeLimit;
            } else {
                this.gameState.timeLimit = settings.timeLimit;
            }
        } else {
            this.gameState.level = 1;
            const customTimeLimit = this.getCustomTimeLimit();
            if (customTimeLimit && customTimeLimit > 0) {
                this.gameState.timeLimit = customTimeLimit;
            } else {
                this.gameState.timeLimit = 60;
            }
        }

        if (!this.gameState.timeLimit || this.gameState.timeLimit <= 0) {
            this.gameState.timeLimit = 60;
        }
    }

    startCountdown() {
        if (!this.selectedDifficulty) return;

        this.currentPage = 'countdownPage';
        this.hideAllPages();
        const countdownPage = document.getElementById('countdownPage');
        if (countdownPage) {
            countdownPage.style.display = 'flex';
        }

        const countdownNumber = document.getElementById('countdownNumber');
        const countdownMessage = document.getElementById('countdownMessage');
        if (!countdownNumber || !countdownMessage) return;

        let count = 3;

        const runCountdown = () => {
            if (count > 0) {
                countdownNumber.textContent = count;
                countdownMessage.textContent = '';

                countdownNumber.style.animation = 'none';
                void countdownNumber.offsetHeight;
                countdownNumber.style.animation = 'countdownPulse 1s ease-in-out';

                count--;
                setTimeout(runCountdown, 1000);
            } else {
                countdownNumber.textContent = 'GO!';
                countdownMessage.textContent = '';

                countdownNumber.style.animation = 'none';
                void countdownNumber.offsetHeight;
                countdownNumber.style.animation = 'countdownPulse 1s ease-in-out';

                setTimeout(() => this.startGame(), 1000);
            }
        };

        runCountdown();
    }

    startGame() {
        if (!this.selectedDifficulty) return;

        if (window.mathGameController) {
            window.mathGameController.cleanup();
        }

        if (!this.gameState.timeLimit || this.gameState.timeLimit <= 0) {
            this.setGameParameters(this.selectedDifficulty);
        }

        if (this.savedSettings) {
            this.gameState.hintLimit = this.savedSettings.enableHints ? (this.savedSettings.hintLimit || 3) : 0;
            this.gameState.skipLimit = this.savedSettings.enableSkip ? (this.savedSettings.skipLimit || 3) : 0;
        } else {
            // Fallback defaults if no settings loaded
            this.gameState.hintLimit = 3;
            this.gameState.skipLimit = 3;
        }

        window.mathGameController = new MathGameController(this.gameState, {
            onGameEnd: (finalScore) => this.handleGameEnd(finalScore),
            showFeedback: (title, msg, icon) => this.showFeedback(title, msg, icon)
        });

        this.showGameplayPage();
    }

    handleGameEnd(finalScore) {
        // Show persistent game over screen
        const overlay = document.getElementById('feedbackOverlay');
        const iconEl = document.getElementById('feedbackIcon');
        const messageEl = document.getElementById('feedbackMessage');
        const actionsEl = document.getElementById('feedbackActions');

        if (overlay && iconEl && messageEl && actionsEl) {
            iconEl.textContent = '⏰';
            messageEl.textContent = `Time's up! Final Score: ${finalScore}`;
            actionsEl.style.display = 'flex'; // Show buttons
            overlay.style.display = 'flex';

            // Do NOT set a timeout to hide it. It stays until user clicks a button.
        }
    }

    showGameplayPage() {
        this.currentPage = 'gameplayPage';
        this.hideAllPages();
        const gameplayPage = document.getElementById('gameplayPage');
        if (gameplayPage) {
            gameplayPage.style.display = 'flex';
        }

        if (window.mathGameController) {
            window.mathGameController.startNewRound();
        }
    }

    hideAllPages() {
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
        });
    }
}
