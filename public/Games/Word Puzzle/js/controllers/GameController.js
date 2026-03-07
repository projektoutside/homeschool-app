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
        this.gameplaySoundListenersSetup = false;
        this.countdownTimer = null;
        this.feedbackHideTimeout = null;
        this.correctAnswerFxTimeout = null;
        this.incorrectAnswerFxTimeout = null;
        this.userContextChangeHandler = () => {
            this.loadSettings();
            if (window.musicController && typeof window.musicController.loadSoundSettings === 'function') {
                window.musicController.loadSoundSettings();
            }
        };
        this.loadSettings();
        this.setupEventListeners();
        window.addEventListener('wordPuzzleUserContextChanged', this.userContextChangeHandler);
    }

    getStorageKey(baseKey) {
        if (typeof window.getWordPuzzleStorageKey === 'function') {
            const resolvedKey = window.getWordPuzzleStorageKey(baseKey);
            if (typeof resolvedKey === 'string' && resolvedKey) {
                return resolvedKey;
            }
        }

        return baseKey;
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
            // Fade out main menu music when Start Game is clicked
            if (window.musicController) {
                window.musicController.fadeOutMainMenuMusic();
            }
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

        // Gameplay quick action buttons
        document.getElementById('gameplayMainMenuBtn')?.addEventListener('click', () => {
            this.openGameplayMainMenuConfirm();
        });

        document.getElementById('gameplaySettingsBtn')?.addEventListener('click', () => {
            this.openGameplaySoundSettings();
        });

        document.getElementById('confirmGameplayMainMenuBtn')?.addEventListener('click', () => {
            this.closeGameplayMainMenuConfirm();
            this.showMainMenu();
        });

        document.getElementById('cancelGameplayMainMenuBtn')?.addEventListener('click', () => {
            this.closeGameplayMainMenuConfirm();
        });

        document.getElementById('closeGameplaySoundBtn')?.addEventListener('click', () => {
            this.closeGameplaySoundSettings();
        });

        document.getElementById('saveGameplaySoundBtn')?.addEventListener('click', () => {
            this.saveGameplaySoundSettings();
        });
    }

    showMainMenu() {
        if (window.wordGameController) {
            window.wordGameController.cleanup();
            window.wordGameController = null;
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

        const correctAnswerFx = document.getElementById('correctAnswerFx');
        if (correctAnswerFx) {
            correctAnswerFx.style.display = 'none';
        }

        const incorrectAnswerFx = document.getElementById('incorrectAnswerFx');
        if (incorrectAnswerFx) {
            incorrectAnswerFx.style.display = 'none';
        }

        if (this.correctAnswerFxTimeout) {
            clearTimeout(this.correctAnswerFxTimeout);
            this.correctAnswerFxTimeout = null;
        }

        if (this.incorrectAnswerFxTimeout) {
            clearTimeout(this.incorrectAnswerFxTimeout);
            this.incorrectAnswerFxTimeout = null;
        }

        // Start main menu music when returning to main menu
        if (window.musicController) {
            window.musicController.startMainMenuMusic();
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

        // Time limit slider
        const timeLimitSlider = document.getElementById('customTimeLimit');
        const timeLimitValue = document.getElementById('timeLimitValue');
        if (timeLimitSlider && timeLimitValue) {
            timeLimitSlider.addEventListener('input', (e) => {
                timeLimitValue.textContent = e.target.value;
            });
        }

        // Preset buttons for time limit
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

        // Sound settings event listeners
        this.setupSoundSettingsListeners();

        document.getElementById('saveSettings')?.addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('resetSettings')?.addEventListener('click', () => {
            this.resetSettings();
        });
    }

    setupSoundSettingsListeners() {
        // Music volume slider
        const musicVolumeSlider = document.getElementById('musicVolume');
        const musicVolumeValue = document.getElementById('musicVolumeValue');
        if (musicVolumeSlider && musicVolumeValue) {
            musicVolumeSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                musicVolumeValue.textContent = value;
                // Apply volume in real-time
                if (window.musicController) {
                    window.musicController.setMusicVolume(value / 100);
                }
            });
        }

        // SFX volume slider
        const sfxVolumeSlider = document.getElementById('sfxVolume');
        const sfxVolumeValue = document.getElementById('sfxVolumeValue');
        if (sfxVolumeSlider && sfxVolumeValue) {
            sfxVolumeSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                sfxVolumeValue.textContent = value;
                // Apply volume in real-time
                if (window.musicController) {
                    window.musicController.setSfxVolume(value / 100);
                }
            });
        }

        // Mute all checkbox
        const muteAllCheckbox = document.getElementById('muteAll');
        if (muteAllCheckbox) {
            muteAllCheckbox.addEventListener('change', (e) => {
                const isMuted = e.target.checked;
                // Apply mute state in real-time
                if (window.musicController) {
                    if (isMuted) {
                        window.musicController.isMuted = true;
                        window.musicController.applySoundSettings();
                    } else {
                        window.musicController.isMuted = false;
                        window.musicController.applySoundSettings();
                    }
                }
            });
        }
    }

    loadSettings() {
        const savedSettings = localStorage.getItem(this.getStorageKey('wordGameSettings'));
        let settings = {
            customTimeLimit: 60,
            enableHints: true,
            enableSkip: true,
            hintLimit: 3,
            skipLimit: 3,
            musicVolume: 70,
            sfxVolume: 80,
            muteAll: false
        };

        if (savedSettings) {
            try {
                settings = { ...settings, ...JSON.parse(savedSettings) };
            } catch (e) {
                console.warn('Failed to load settings:', e);
            }
        }

        // Timer settings
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

        // Sound settings
        const musicVolumeSlider = document.getElementById('musicVolume');
        const musicVolumeValue = document.getElementById('musicVolumeValue');
        const sfxVolumeSlider = document.getElementById('sfxVolume');
        const sfxVolumeValue = document.getElementById('sfxVolumeValue');
        const muteAllCheckbox = document.getElementById('muteAll');

        if (musicVolumeSlider) {
            musicVolumeSlider.value = settings.musicVolume !== undefined ? settings.musicVolume : 70;
        }
        if (musicVolumeValue) {
            musicVolumeValue.textContent = settings.musicVolume !== undefined ? settings.musicVolume : 70;
        }
        if (sfxVolumeSlider) {
            sfxVolumeSlider.value = settings.sfxVolume !== undefined ? settings.sfxVolume : 80;
        }
        if (sfxVolumeValue) {
            sfxVolumeValue.textContent = settings.sfxVolume !== undefined ? settings.sfxVolume : 80;
        }
        if (muteAllCheckbox) {
            muteAllCheckbox.checked = settings.muteAll !== undefined ? settings.muteAll : false;
        }

        this.populateGameplaySoundSettings(settings);

        this.savedSettings = settings;
    }

    populateGameplaySoundSettings(settings = this.savedSettings || {}) {
        const gameplayMusic = document.getElementById('gameplayMusicVolume');
        const gameplayMusicValue = document.getElementById('gameplayMusicVolumeValue');
        const gameplaySfx = document.getElementById('gameplaySfxVolume');
        const gameplaySfxValue = document.getElementById('gameplaySfxVolumeValue');
        const gameplayMute = document.getElementById('gameplayMuteAll');

        const musicVolume = settings.musicVolume !== undefined ? settings.musicVolume : 70;
        const sfxVolume = settings.sfxVolume !== undefined ? settings.sfxVolume : 80;
        const muteAll = settings.muteAll !== undefined ? settings.muteAll : false;

        if (gameplayMusic) gameplayMusic.value = musicVolume;
        if (gameplayMusicValue) gameplayMusicValue.textContent = musicVolume;
        if (gameplaySfx) gameplaySfx.value = sfxVolume;
        if (gameplaySfxValue) gameplaySfxValue.textContent = sfxVolume;
        if (gameplayMute) gameplayMute.checked = muteAll;
    }

    setupGameplaySoundListeners() {
        if (this.gameplaySoundListenersSetup) return;
        this.gameplaySoundListenersSetup = true;

        const gameplayMusic = document.getElementById('gameplayMusicVolume');
        const gameplayMusicValue = document.getElementById('gameplayMusicVolumeValue');
        const gameplaySfx = document.getElementById('gameplaySfxVolume');
        const gameplaySfxValue = document.getElementById('gameplaySfxVolumeValue');
        const gameplayMute = document.getElementById('gameplayMuteAll');

        if (gameplayMusic && gameplayMusicValue) {
            gameplayMusic.addEventListener('input', (e) => {
                const value = parseInt(e.target.value, 10);
                gameplayMusicValue.textContent = value;
                if (window.musicController) {
                    window.musicController.setMusicVolume(value / 100);
                }
            });
        }

        if (gameplaySfx && gameplaySfxValue) {
            gameplaySfx.addEventListener('input', (e) => {
                const value = parseInt(e.target.value, 10);
                gameplaySfxValue.textContent = value;
                if (window.musicController) {
                    window.musicController.setSfxVolume(value / 100);
                }
            });
        }

        if (gameplayMute) {
            gameplayMute.addEventListener('change', (e) => {
                if (window.musicController) {
                    window.musicController.isMuted = !!e.target.checked;
                    window.musicController.applySoundSettings();
                }
            });
        }
    }

    openGameplayMainMenuConfirm() {
        const overlay = document.getElementById('gameplayMainMenuOverlay');
        if (overlay) overlay.style.display = 'flex';
    }

    closeGameplayMainMenuConfirm() {
        const overlay = document.getElementById('gameplayMainMenuOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    openGameplaySoundSettings() {
        this.loadSettings();
        this.setupGameplaySoundListeners();
        const overlay = document.getElementById('gameplaySoundOverlay');
        if (overlay) overlay.style.display = 'flex';
    }

    closeGameplaySoundSettings() {
        const overlay = document.getElementById('gameplaySoundOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    saveGameplaySoundSettings() {
        const gameplayMusic = document.getElementById('gameplayMusicVolume');
        const gameplaySfx = document.getElementById('gameplaySfxVolume');
        const gameplayMute = document.getElementById('gameplayMuteAll');

        const settings = {
            ...(this.savedSettings || {}),
            musicVolume: gameplayMusic ? parseInt(gameplayMusic.value, 10) : 70,
            sfxVolume: gameplaySfx ? parseInt(gameplaySfx.value, 10) : 80,
            muteAll: gameplayMute ? gameplayMute.checked : false
        };

        try {
            localStorage.setItem(this.getStorageKey('wordGameSettings'), JSON.stringify(settings));
            this.savedSettings = settings;

            // Keep full settings page controls in sync
            const musicVolumeSlider = document.getElementById('musicVolume');
            const musicVolumeValue = document.getElementById('musicVolumeValue');
            const sfxVolumeSlider = document.getElementById('sfxVolume');
            const sfxVolumeValue = document.getElementById('sfxVolumeValue');
            const muteAllCheckbox = document.getElementById('muteAll');

            if (musicVolumeSlider) musicVolumeSlider.value = settings.musicVolume;
            if (musicVolumeValue) musicVolumeValue.textContent = settings.musicVolume;
            if (sfxVolumeSlider) sfxVolumeSlider.value = settings.sfxVolume;
            if (sfxVolumeValue) sfxVolumeValue.textContent = settings.sfxVolume;
            if (muteAllCheckbox) muteAllCheckbox.checked = settings.muteAll;

            if (window.musicController) {
                window.musicController.updateSoundSettings(
                    settings.musicVolume,
                    settings.sfxVolume,
                    settings.muteAll
                );
            }

            this.closeGameplaySoundSettings();
            this.showFeedback('Settings', 'Sound settings saved!', '🔊');
        } catch (e) {
            this.showFeedback('Error', 'Failed to save sound settings', '❌');
        }
    }

    saveSettings() {
        // Get timer settings
        const timeLimitSlider = document.getElementById('customTimeLimit');
        const enableHints = document.getElementById('enableHints');
        const enableSkip = document.getElementById('enableSkip');
        const hintLimit = document.getElementById('hintLimit');
        const skipLimit = document.getElementById('skipLimit');

        // Get sound settings
        const musicVolumeSlider = document.getElementById('musicVolume');
        const sfxVolumeSlider = document.getElementById('sfxVolume');
        const muteAllCheckbox = document.getElementById('muteAll');

        const settings = {
            // Timer and game settings
            customTimeLimit: timeLimitSlider ? parseInt(timeLimitSlider.value) : 60,
            enableHints: enableHints ? enableHints.checked : true,
            enableSkip: enableSkip ? enableSkip.checked : true,
            hintLimit: hintLimit ? parseInt(hintLimit.value) : 3,
            skipLimit: skipLimit ? parseInt(skipLimit.value) : 3,
            // Sound settings
            musicVolume: musicVolumeSlider ? parseInt(musicVolumeSlider.value) : 70,
            sfxVolume: sfxVolumeSlider ? parseInt(sfxVolumeSlider.value) : 80,
            muteAll: muteAllCheckbox ? muteAllCheckbox.checked : false
        };

        // Apply sound settings to MusicController before saving
        if (window.musicController) {
            window.musicController.updateSoundSettings(
                settings.musicVolume,
                settings.sfxVolume,
                settings.muteAll
            );
        }

        const confirmOverlay = document.getElementById('confirmOverlay');
        const confirmBtn = document.getElementById('confirmSaveBtn');
        const cancelBtn = document.getElementById('cancelSaveBtn');

        if (confirmOverlay && confirmBtn && cancelBtn) {
            // Show custom modal
            confirmOverlay.style.display = 'flex';

            const handleConfirm = () => {
                try {
                    localStorage.setItem(this.getStorageKey('wordGameSettings'), JSON.stringify(settings));
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
                    localStorage.setItem(this.getStorageKey('wordGameSettings'), JSON.stringify(settings));
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
            skipLimit: 3,
            musicVolume: 70,
            sfxVolume: 80,
            muteAll: false
        };

        // Reset UI elements
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

        // Reset sound settings UI
        const musicVolumeSlider = document.getElementById('musicVolume');
        const musicVolumeValue = document.getElementById('musicVolumeValue');
        const sfxVolumeSlider = document.getElementById('sfxVolume');
        const sfxVolumeValue = document.getElementById('sfxVolumeValue');
        const muteAllCheckbox = document.getElementById('muteAll');

        if (musicVolumeSlider) musicVolumeSlider.value = defaultSettings.musicVolume;
        if (musicVolumeValue) musicVolumeValue.textContent = defaultSettings.musicVolume;
        if (sfxVolumeSlider) sfxVolumeSlider.value = defaultSettings.sfxVolume;
        if (sfxVolumeValue) sfxVolumeValue.textContent = defaultSettings.sfxVolume;
        if (muteAllCheckbox) muteAllCheckbox.checked = defaultSettings.muteAll;

        // Apply default sound settings immediately
        if (window.musicController) {
            window.musicController.updateSoundSettings(
                defaultSettings.musicVolume,
                defaultSettings.sfxVolume,
                defaultSettings.muteAll
            );
        }

        try {
            localStorage.setItem(this.getStorageKey('wordGameSettings'), JSON.stringify(defaultSettings));
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

    showFeedback(title, message, icon, options = null) {
        const overlay = document.getElementById('feedbackOverlay');
        const iconEl = document.getElementById('feedbackIcon');
        const messageEl = document.getElementById('feedbackMessage');
        const actionsEl = document.getElementById('feedbackActions');
        const scoreSequenceEl = document.getElementById('feedbackScoreSequence');
        const pointsEarnedEl = document.getElementById('feedbackPointsEarned');
        const oldScoreEl = document.getElementById('feedbackOldScore');
        const pointsValueEl = document.getElementById('feedbackPointsValue');
        const newScoreEl = document.getElementById('feedbackNewScore');
        const scoreHeaderEl = document.getElementById('currentScore');
        const correctAnswerFxEl = document.getElementById('correctAnswerFx');
        const correctAnswerTextEl = document.getElementById('correctAnswerText');
        const correctAnswerPointsEl = document.getElementById('correctAnswerPoints');
        const incorrectAnswerFxEl = document.getElementById('incorrectAnswerFx');
        const incorrectAnswerTextEl = document.getElementById('incorrectAnswerText');
        const incorrectAnswerWordEl = document.getElementById('incorrectAnswerWord');

        const scoreGain = options && options.scoreGain ? options.scoreGain : null;
        const incorrectAnswerFx = options && options.incorrectAnswerFx ? options.incorrectAnswerFx : null;

        if (scoreGain && correctAnswerFxEl && correctAnswerTextEl && correctAnswerPointsEl) {
            const oldScore = Number(scoreGain.oldScore || 0);
            const pointsEarned = Number(scoreGain.pointsEarned || 0);
            const newScore = Number(scoreGain.newScore || oldScore + pointsEarned);

            if (this.feedbackHideTimeout) {
                clearTimeout(this.feedbackHideTimeout);
                this.feedbackHideTimeout = null;
            }

            if (this.correctAnswerFxTimeout) {
                clearTimeout(this.correctAnswerFxTimeout);
                this.correctAnswerFxTimeout = null;
            }

            if (overlay && actionsEl && actionsEl.style.display === 'none') {
                overlay.style.display = 'none';
            }

            correctAnswerTextEl.textContent = scoreGain.celebrationText || 'Correct!';
            correctAnswerPointsEl.textContent = scoreGain.pointsLabel || `+${pointsEarned} points`;
            correctAnswerFxEl.style.display = 'flex';

            if (scoreHeaderEl) {
                scoreHeaderEl.textContent = oldScore;
            }

            if (typeof anime !== 'undefined') {
                anime.remove([correctAnswerFxEl, correctAnswerTextEl, correctAnswerPointsEl]);

                const scoreCounter = { value: oldScore };

                anime({
                    targets: correctAnswerFxEl,
                    opacity: [0, 1],
                    duration: 180,
                    easing: 'easeOutQuad'
                });

                anime({
                    targets: correctAnswerTextEl,
                    opacity: [0, 1],
                    scale: [0.68, 1.18, 1],
                    translateY: [8, 0],
                    duration: 360,
                    easing: 'easeOutBack'
                });

                anime({
                    targets: correctAnswerPointsEl,
                    opacity: [0, 1],
                    scale: [0.86, 1.08, 1],
                    translateY: [10, 0],
                    delay: 230,
                    duration: 360,
                    easing: 'easeOutBack'
                });

                anime({
                    targets: scoreCounter,
                    value: newScore,
                    delay: 230,
                    duration: 430,
                    easing: 'easeOutCubic',
                    update: () => {
                        if (scoreHeaderEl) {
                            scoreHeaderEl.textContent = Math.round(scoreCounter.value);
                        }
                    }
                });

                anime({
                    targets: correctAnswerFxEl,
                    opacity: [1, 0],
                    delay: 980,
                    duration: 250,
                    easing: 'easeInQuad'
                });
            } else if (scoreHeaderEl) {
                scoreHeaderEl.textContent = newScore;
            }

            this.correctAnswerFxTimeout = setTimeout(() => {
                correctAnswerFxEl.style.display = 'none';
                this.correctAnswerFxTimeout = null;
            }, 1240);

            return;
        }

        if (incorrectAnswerFx && incorrectAnswerFxEl && incorrectAnswerTextEl && incorrectAnswerWordEl) {
            if (this.feedbackHideTimeout) {
                clearTimeout(this.feedbackHideTimeout);
                this.feedbackHideTimeout = null;
            }

            if (this.correctAnswerFxTimeout) {
                clearTimeout(this.correctAnswerFxTimeout);
                this.correctAnswerFxTimeout = null;
            }

            if (this.incorrectAnswerFxTimeout) {
                clearTimeout(this.incorrectAnswerFxTimeout);
                this.incorrectAnswerFxTimeout = null;
            }

            if (overlay && actionsEl && actionsEl.style.display === 'none') {
                overlay.style.display = 'none';
            }

            const incorrectWord = incorrectAnswerFx.word || incorrectAnswerFx.title || 'ANSWER';
            const incorrectRevealText = typeof incorrectAnswerFx.revealText === 'string'
                ? incorrectAnswerFx.revealText.trim()
                : '';
            const showRevealLine = incorrectRevealText.length > 0;

            incorrectAnswerTextEl.textContent = incorrectWord;
            incorrectAnswerWordEl.textContent = incorrectRevealText;
            incorrectAnswerWordEl.style.display = showRevealLine ? 'block' : 'none';
            incorrectAnswerFxEl.style.display = 'flex';

            if (typeof anime !== 'undefined') {
                anime.remove([incorrectAnswerFxEl, incorrectAnswerTextEl, incorrectAnswerWordEl]);

                anime({
                    targets: incorrectAnswerFxEl,
                    opacity: [0, 1],
                    duration: 160,
                    easing: 'easeOutQuad'
                });

                anime({
                    targets: incorrectAnswerTextEl,
                    opacity: [0, 1],
                    scale: [0.72, 1.12, 1],
                    translateY: [12, 0],
                    duration: 360,
                    easing: 'easeOutBack'
                });

                if (showRevealLine) {
                    anime({
                        targets: incorrectAnswerWordEl,
                        opacity: [0, 1],
                        scale: [0.84, 1.06, 1],
                        translateY: [14, 0],
                        delay: 160,
                        duration: 360,
                        easing: 'easeOutBack'
                    });
                }

                anime({
                    targets: incorrectAnswerFxEl,
                    opacity: [1, 0],
                    delay: incorrectAnswerFx.durationMs || 1120,
                    duration: 260,
                    easing: 'easeInQuad'
                });
            } else {
                incorrectAnswerFxEl.style.opacity = '1';
                incorrectAnswerTextEl.style.opacity = '1';
                incorrectAnswerWordEl.style.opacity = showRevealLine ? '1' : '';
            }

            this.incorrectAnswerFxTimeout = setTimeout(() => {
                incorrectAnswerFxEl.style.display = 'none';
                incorrectAnswerFxEl.style.opacity = '';
                incorrectAnswerTextEl.style.opacity = '';
                incorrectAnswerWordEl.style.opacity = '';
                this.incorrectAnswerFxTimeout = null;
            }, (incorrectAnswerFx.durationMs || 1120) + 280);

            return;
        }

        if (overlay && iconEl && messageEl) {
            if (this.feedbackHideTimeout) {
                clearTimeout(this.feedbackHideTimeout);
                this.feedbackHideTimeout = null;
            }

            iconEl.textContent = icon;
            messageEl.textContent = `${title}: ${message}`;

            // Hide action buttons for transient feedback
            if (actionsEl) actionsEl.style.display = 'none';

            if (scoreSequenceEl && pointsEarnedEl && oldScoreEl && pointsValueEl && newScoreEl && scoreGain) {
                const oldScore = Number(scoreGain.oldScore || 0);
                const pointsEarned = Number(scoreGain.pointsEarned || 0);
                const newScore = Number(scoreGain.newScore || oldScore + pointsEarned);

                scoreSequenceEl.style.display = 'flex';
                pointsEarnedEl.textContent = `+${pointsEarned} points`;
                oldScoreEl.textContent = oldScore;
                pointsValueEl.textContent = pointsEarned;
                newScoreEl.textContent = oldScore;

                if (scoreHeaderEl) {
                    scoreHeaderEl.textContent = oldScore;
                }

                const scoreCounter = { value: oldScore };

                if (typeof anime !== 'undefined') {
                    anime.remove([pointsEarnedEl, oldScoreEl, pointsValueEl, newScoreEl]);

                    anime({
                        targets: pointsEarnedEl,
                        opacity: [0.5, 1],
                        scale: [0.82, 1.05, 1],
                        duration: 260,
                        easing: 'easeOutBack'
                    });

                    anime({
                        targets: scoreCounter,
                        value: newScore,
                        delay: 110,
                        duration: 420,
                        easing: 'easeOutCubic',
                        update: () => {
                            const currentValue = Math.round(scoreCounter.value);
                            newScoreEl.textContent = currentValue;
                            if (scoreHeaderEl) scoreHeaderEl.textContent = currentValue;
                        }
                    });

                    anime({
                        targets: newScoreEl,
                        delay: 110,
                        duration: 420,
                        scale: [1, 1.14, 1],
                        easing: 'easeOutBack'
                    });
                } else {
                    newScoreEl.textContent = newScore;
                    if (scoreHeaderEl) scoreHeaderEl.textContent = newScore;
                }
            } else if (scoreSequenceEl) {
                scoreSequenceEl.style.display = 'none';
            }

            overlay.style.display = 'flex';

            this.feedbackHideTimeout = setTimeout(() => {
                // Only hide if we aren't showing the persistent game over screen
                // We check if actions are hidden to know it's a transient message
                if (actionsEl && actionsEl.style.display === 'none') {
                    overlay.style.display = 'none';
                }
                this.feedbackHideTimeout = null;
            }, scoreGain ? 1050 : 1000);
        }
    }

    hideFeedback() {
        if (this.feedbackHideTimeout) {
            clearTimeout(this.feedbackHideTimeout);
            this.feedbackHideTimeout = null;
        }

        if (this.correctAnswerFxTimeout) {
            clearTimeout(this.correctAnswerFxTimeout);
            this.correctAnswerFxTimeout = null;
        }

        if (this.incorrectAnswerFxTimeout) {
            clearTimeout(this.incorrectAnswerFxTimeout);
            this.incorrectAnswerFxTimeout = null;
        }

        const overlay = document.getElementById('feedbackOverlay');
        const scoreSequenceEl = document.getElementById('feedbackScoreSequence');
        const correctAnswerFxEl = document.getElementById('correctAnswerFx');
        const correctAnswerTextEl = document.getElementById('correctAnswerText');
        const correctAnswerPointsEl = document.getElementById('correctAnswerPoints');
        const incorrectAnswerFxEl = document.getElementById('incorrectAnswerFx');
        const incorrectAnswerTextEl = document.getElementById('incorrectAnswerText');
        const incorrectAnswerWordEl = document.getElementById('incorrectAnswerWord');

        if (typeof anime !== 'undefined') {
            anime.remove([
                correctAnswerFxEl,
                correctAnswerTextEl,
                correctAnswerPointsEl,
                incorrectAnswerFxEl,
                incorrectAnswerTextEl,
                incorrectAnswerWordEl
            ]);
        }

        if (overlay) {
            overlay.style.display = 'none';
        }
        if (scoreSequenceEl) {
            scoreSequenceEl.style.display = 'none';
        }
        if (correctAnswerFxEl) {
            correctAnswerFxEl.style.display = 'none';
            correctAnswerFxEl.style.opacity = '';
        }

        if (incorrectAnswerFxEl) {
            incorrectAnswerFxEl.style.display = 'none';
            incorrectAnswerFxEl.style.opacity = '';
        }

        if (incorrectAnswerTextEl) {
            incorrectAnswerTextEl.textContent = 'APPLE';
            incorrectAnswerTextEl.style.opacity = '';
        }

        if (incorrectAnswerWordEl) {
            incorrectAnswerWordEl.textContent = '';
            incorrectAnswerWordEl.style.display = 'none';
            incorrectAnswerWordEl.style.opacity = '';
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

        // Ensure previous countdown is fully cleared
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
            this.countdownTimer = null;
        }

        this.currentPage = 'countdownPage';
        this.hideAllPages();
        const countdownPage = document.getElementById('countdownPage');
        if (countdownPage) {
            countdownPage.style.display = 'flex';
        }

        const countdownNumber = document.getElementById('countdownNumber');
        const countdownMessage = document.getElementById('countdownMessage');
        if (!countdownNumber || !countdownMessage) return;

        countdownMessage.textContent = 'Get Ready!';

        let count = 3;

        const runCountdown = () => {
            if (count > 0) {
                countdownNumber.textContent = count;
                countdownMessage.textContent = 'Get Ready!';

                countdownNumber.style.animation = 'none';
                void countdownNumber.offsetHeight;
                countdownNumber.style.animation = 'countdownPulse 1s ease-in-out';

                count--;
                this.countdownTimer = setTimeout(runCountdown, 1000);
            } else {
                countdownNumber.textContent = 'GO!';
                countdownMessage.textContent = 'Let\'s Go!';

                countdownNumber.style.animation = 'none';
                void countdownNumber.offsetHeight;
                countdownNumber.style.animation = 'countdownPulse 1s ease-in-out';

                // Start gameplay music right after GO! appears
                if (window.musicController) {
                    window.musicController.startGameplayMusic();
                }

                this.countdownTimer = setTimeout(() => {
                    this.countdownTimer = null;
                    this.startGame();
                }, 1000);
            }
        };

        runCountdown();
    }

    startGame() {
        if (!this.selectedDifficulty) return;

        if (window.wordGameController) {
            window.wordGameController.cleanup();
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

        window.wordGameController = new WordGameController(this.gameState, {
            onGameEnd: (finalScore) => this.handleGameEnd(finalScore),
            showFeedback: (title, msg, icon, options) => this.showFeedback(title, msg, icon, options)
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

        if (window.wordGameController) {
            window.wordGameController.startNewRound();
        }
    }

    hideAllPages() {
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
        });
    }
}
