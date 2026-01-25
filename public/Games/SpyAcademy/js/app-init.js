/**
 * Cross-Device Compatible Application Initialization
 * Simplified for maximum compatibility across all browsers and devices
 */

(function() {
    'use strict';
    
    console.log('🚀 App initialization starting...');
    
    // Create global app namespace
    window.LightChallengeApp = window.LightChallengeApp || {
        initialized: false,
        audioContextStarted: false,
        resizeTimer: null
    };
    
    /**
     * Main initialization function
     */
    function initializeApp() {
        console.log('🎮 Initializing The Spy Academy...');
        
        // Update loading progress
        updateLoadingProgress('Checking compatibility...');
        
        // Set up device-specific optimizations
        setupDeviceOptimizations();
        
        // Wait for all scripts to load
        waitForDependencies()
            .then(function() {
                updateLoadingProgress('Setting up game systems...');
                return setupGameSystems();
            })
            .then(function() {
                updateLoadingProgress('Preparing interface...');
                return setupUI();
            })
            .then(function() {
                updateLoadingProgress('Starting game...');
                return showMainMenu();
            })
            .then(function() {
                window.LightChallengeApp.initialized = true;
                console.log('✅ App initialized successfully');
            })
            .catch(function(error) {
                console.error('❌ Initialization failed:', error);
                showError('Failed to start the game. Please refresh the page.');
            });
    }
    
    /**
     * Update loading screen progress
     */
    function updateLoadingProgress(message) {
        var progressEl = document.getElementById('loading-progress');
        if (progressEl) {
            progressEl.textContent = message;
        }
        console.log('📊', message);
    }
    
    /**
     * Wait for required dependencies
     */
    function waitForDependencies() {
        return new Promise(function(resolve) {
            var maxAttempts = 50;
            var attempts = 0;
            
            function check() {
                attempts++;
                
                // Check for required dependencies
                var hasLogger = typeof window.logger !== 'undefined';
                var hasConfig = typeof window.gameConfig !== 'undefined';
                var hasHelpers = typeof window.gameHelpers !== 'undefined';
                
                if (hasLogger && hasConfig && hasHelpers) {
                    console.log('✅ All core dependencies loaded');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.warn('⚠️ Some dependencies missing, continuing anyway');
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            }
            
            check();
        });
    }
    
    /**
     * Setup game systems
     */
    function setupGameSystems() {
        return new Promise(function(resolve) {
            try {
                // Initialize sound manager if available
                if (typeof SoundManager !== 'undefined' && !window.soundManager) {
                    window.soundManager = new SoundManager();
                    console.log('🔊 Sound manager initialized');
                }
                
                // Initialize voice manager (AudioManager/VoiceManager) if available
                if (typeof VoiceManager !== 'undefined' && !window.audioManager) {
                    window.audioManager = new VoiceManager();
                    console.log('🎤 Voice manager (AI narration) initialized');
                }
                
                // Set up first user interaction handlers for audio
                setupAudioInteraction();
                
                // Initialize 3D scene if THREE.js is available
                if (typeof THREE !== 'undefined' && window.mainMenuScene) {
                    try {
                        window.mainMenuScene.init();
                        console.log('🎨 3D scene initialized');
                    } catch (e) {
                        console.warn('⚠️ 3D scene failed:', e);
                    }
                }
                
                resolve();
            } catch (error) {
                console.error('❌ Game systems setup failed:', error);
                resolve(); // Continue anyway
            }
        });
    }
    
    /**
     * Setup audio interaction handlers
     */
    function setupAudioInteraction() {
        var audioUnlocked = false;
        
        function unlockAudio(e) {
            if (audioUnlocked) return;
            
            console.log('🎵 First user interaction detected:', e.type);
            
            if (window.soundManager && typeof window.soundManager.resumeAudioContext === 'function') {
                window.soundManager.resumeAudioContext()
                    .then(function() {
                        audioUnlocked = true;
                        window.LightChallengeApp.audioContextStarted = true;
                        console.log('✅ Audio context ready');
                    })
                    .catch(function(err) {
                        console.warn('⚠️ Audio context failed:', err);
                    });
            }
        }
        
        // Listen for first interaction
        document.addEventListener('click', unlockAudio, { once: true });
        document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
        document.addEventListener('keydown', unlockAudio, { once: true });
    }
    
    /**
     * Setup UI controls and interactions
     */
    function setupUI() {
        return new Promise(function(resolve) {
            try {
                // Set up start button
                var startBtn = document.getElementById('start-game-btn');
                if (startBtn) {
                    startBtn.addEventListener('click', handleStartGame);
                    startBtn.addEventListener('touchend', function(e) {
                        e.preventDefault();
                        handleStartGame();
                    });
                    console.log('✅ Start button configured');
                }
                
                // Set up volume controls
                setupVolumeControls();
                
                // Set up fullscreen toggle
                setupFullscreenToggle();
                
                // Set up skip voting checkbox
                setupSkipVotingCheckbox();

                // Set up voice settings button
                setupVoiceSettingsButton();
                
                resolve();
            } catch (error) {
                console.error('❌ UI setup failed:', error);
                resolve(); // Continue anyway
            }
        });
    }
    
    /**
     * Handle start game button click
     */
    function handleStartGame() {
        console.log('🎮 Starting game...');
        
        var startBtn = document.getElementById('start-game-btn');
        if (!startBtn) return;
        
        // Visual feedback
        startBtn.disabled = true;
        startBtn.style.opacity = '0.7';
        startBtn.textContent = 'STARTING...';
        
        // Start audio if available
        if (window.soundManager) {
            if (typeof window.soundManager.playClick === 'function') {
                window.soundManager.playClick();
            }
            
            // Start music after a brief delay
            setTimeout(function() {
                if (typeof window.soundManager.playRandomIntroMusic === 'function') {
                    window.soundManager.playRandomIntroMusic();
                }
            }, 100);
        }
        
        // Transition to player selection
        setTimeout(function() {
            transitionToPlayerSelection();
        }, 500);
    }
    
    /**
     * Transition to player selection screen
     */
    function transitionToPlayerSelection() {
        var mainMenu = document.getElementById('main-menu');
        var playerSelection = document.getElementById('player-selection');
        
        if (!mainMenu || !playerSelection) {
            console.error('❌ Required scenes not found');
            return;
        }
        
        // Hide main menu
        mainMenu.classList.remove('active');
        mainMenu.style.opacity = '0';
        
        setTimeout(function() {
            mainMenu.style.display = 'none';
            playerSelection.style.display = 'block';
            playerSelection.classList.add('active');
            
            // Set up player selection buttons
            setupPlayerSelection();
        }, 600);
    }
    
    /**
     * Setup player selection buttons
     */
    function setupPlayerSelection() {
        var buttons = document.querySelectorAll('.player-btn');
        
        buttons.forEach(function(button) {
            var handler = function() {
                var count = parseInt(button.getAttribute('data-count'));
                if (!count) return;
                
                console.log('👥 Selected', count, 'players');
                
                if (window.soundManager && typeof window.soundManager.playSelect === 'function') {
                    window.soundManager.playSelect();
                }
                
                // Visual feedback
                buttons.forEach(function(btn) { btn.classList.remove('selected'); });
                button.classList.add('selected');
                
                // Transition to color selection
                setTimeout(function() {
                    transitionToColorSelection(count);
                }, 500);
            };
            
            button.addEventListener('click', handler);
            button.addEventListener('touchend', function(e) {
                e.preventDefault();
                handler();
            });
        });
    }
    
    /**
     * Transition to color selection
     */
    function transitionToColorSelection(playerCount) {
        var playerSelection = document.getElementById('player-selection');
        var colorSelection = document.getElementById('color-selection');
        
        if (!playerSelection || !colorSelection) {
            console.error('❌ Required scenes not found');
            return;
        }
        
        playerSelection.classList.remove('active');
        playerSelection.style.opacity = '0';
        
        setTimeout(function() {
            playerSelection.style.display = 'none';
            colorSelection.style.display = 'block';
            colorSelection.classList.add('active');
            
            // Set up color selection
            setupColorSelection(playerCount);
        }, 600);
    }
    
    /**
     * Setup color selection interface
     */
    function setupColorSelection(playerCount) {
        var colorGrid = document.getElementById('color-grid');
        var confirmBtn = document.getElementById('confirm-colors');
        
        if (!colorGrid || !confirmBtn) {
            console.error('❌ Color selection elements not found');
            return;
        }
        
        var colors = [
            { color: '#ff0000', name: 'Red', emoji: '🔴' },
            { color: '#00ff00', name: 'Green', emoji: '🟢' },
            { color: '#0080ff', name: 'Blue', emoji: '🔵' },
            { color: '#ffff00', name: 'Yellow', emoji: '🟡' },
            { color: '#ff8000', name: 'Orange', emoji: '🟠' },
            { color: '#8000ff', name: 'Purple', emoji: '🟣' },
            { color: '#ff0080', name: 'Pink', emoji: '🌸' },
            { color: '#00ff80', name: 'Cyan', emoji: '💎' }
        ];
        
        var selectedColors = [];
        var playerNames = [];
        
        // Build UI with Dropdown Selection
        var html = '';
        for (var i = 0; i < playerCount; i++) {
            html += '<div class="player-color-row">';
            html += '<div class="player-name-section">';
            html += '<input type="text" class="player-name-input" data-player="' + i + '" ';
            html += 'placeholder="Enter Player ' + (i + 1) + ' Name" value="Player ' + (i + 1) + '" maxlength="20">';
            html += '</div>';
            html += '<div class="color-dropdown-section">';
            html += '<select class="color-select" data-player="' + i + '">';
            html += '<option value="" disabled selected>Select Team Color</option>';
            
            colors.forEach(function(c) {
                html += '<option value="' + c.color + '" data-name="' + c.name + '">' + c.emoji + ' ' + c.name.toUpperCase() + '</option>';
            });
            
            html += '</select></div></div>';
        }
        
        colorGrid.innerHTML = html;
        
        // Set up name inputs
        var nameInputs = colorGrid.querySelectorAll('.player-name-input');
        nameInputs.forEach(function(input) {
            var playerIdx = parseInt(input.getAttribute('data-player'));
            playerNames[playerIdx] = input.value;
            
            input.addEventListener('input', function() {
                playerNames[playerIdx] = input.value.trim() || 'Player ' + (playerIdx + 1);
                checkColorSelectionComplete();
            });
        });
        
        // Set up dropdown selection
        var colorSelects = colorGrid.querySelectorAll('.color-select');
        colorSelects.forEach(function(select) {
            select.addEventListener('change', function() {
                var playerIdx = parseInt(this.getAttribute('data-player'));
                var color = this.value;
                
                // If empty or placeholder selected, clear the selection
                if (!color || color === '') {
                    selectedColors[playerIdx] = null;
                    delete selectedColors[playerIdx];
                    updateColorStates();
                    checkColorSelectionComplete();
                    return;
                }
                
                var colorName = this.options[this.selectedIndex].getAttribute('data-name');
                
                // Check if color already selected by another player
                var alreadySelected = selectedColors.some(function(sc, idx) {
                    return sc && sc.color === color && idx !== playerIdx;
                });
                
                if (alreadySelected) {
                    if (window.soundManager && typeof window.soundManager.playWarning === 'function') {
                        window.soundManager.playWarning();
                    }
                    // Reset to previous selection or empty
                    this.value = selectedColors[playerIdx] ? selectedColors[playerIdx].color : "";
                    if (!selectedColors[playerIdx]) {
                        selectedColors[playerIdx] = null;
                        delete selectedColors[playerIdx];
                    }
                    alert("This color is already claimed by another agent!");
                    updateColorStates();
                    checkColorSelectionComplete();
                    return;
                }
                
                // Select color
                selectedColors[playerIdx] = { color: color, name: colorName };
                
                if (window.soundManager && typeof window.soundManager.playSelect === 'function') {
                    window.soundManager.playSelect();
                }
                
                updateColorStates();
                checkColorSelectionComplete();
            });
        });
        
        function updateColorStates() {
            // Get all currently selected values
            var currentlySelectedValues = selectedColors
                .filter(function(sc) { return sc && sc.color; })
                .map(function(sc) { return sc.color; });

            colorSelects.forEach(function(select) {
                var playerIdx = parseInt(select.getAttribute('data-player'));
                var currentValue = select.value;
                
                // 1. Manage visibility/availability of options
                Array.from(select.options).forEach(function(option) {
                    if (!option.value) return; // Skip placeholder
                    
                    var isSelectedByOthers = currentlySelectedValues.includes(option.value) && option.value !== currentValue;
                    
                    if (isSelectedByOthers) {
                        option.disabled = true;
                        option.style.display = 'none';
                    } else {
                        option.disabled = false;
                        option.style.display = 'block';
                    }
                });

                // 2. Dynamic styling for the dropdown based on selected color
                if (selectedColors[playerIdx]) {
                    var color = selectedColors[playerIdx].color;
                    select.style.backgroundColor = color;
                    select.style.color = getContrastColor(color);
                    select.style.borderColor = color;
                    
                    // Also update name input color to match
                    var nameInput = colorGrid.querySelector('.player-name-input[data-player="' + playerIdx + '"]');
                    if (nameInput) {
                        nameInput.style.backgroundColor = color;
                        nameInput.style.color = getContrastColor(color);
                        nameInput.style.borderColor = color;
                    }
                }
            });
        }
        
        function checkColorSelectionComplete() {
            // Check each player's color selection directly from the DOM
            var allSelected = true;
            var missingIndices = [];
            
            for (var i = 0; i < playerCount; i++) {
                var select = colorGrid.querySelector('.color-select[data-player="' + i + '"]');
                if (!select || !select.value || select.value === '') {
                    allSelected = false;
                    missingIndices.push(i);
                }
            }
            
            if (allSelected) {
                confirmBtn.style.display = 'block';
                confirmBtn.style.visibility = 'visible';
                confirmBtn.disabled = false;
                confirmBtn.style.pointerEvents = 'auto';
                confirmBtn.style.opacity = '1';
                console.log('✅ All colors selected - button enabled');
            } else {
                confirmBtn.style.display = 'none';
                confirmBtn.disabled = true;
                console.log('⏳ Waiting for colors:', missingIndices.map(function(idx) { return 'Player ' + (idx + 1); }).join(', '));
            }
        }
        
        // Confirm button handler
        var confirmHandler = function() {
            // Prevent double-clicks
            if (confirmBtn.disabled) {
                console.log('⚠️ Button is disabled, ignoring click');
                return;
            }
            
            // Validate that all colors are selected by checking DOM directly
            var allSelected = true;
            var missingColors = [];
            for (var i = 0; i < playerCount; i++) {
                var select = colorGrid.querySelector('.color-select[data-player="' + i + '"]');
                if (!select || !select.value || select.value === '') {
                    allSelected = false;
                    missingColors.push(i + 1);
                }
            }
            
            if (!allSelected) {
                console.warn('⚠️ Cannot confirm: not all colors selected. Missing players:', missingColors);
                if (window.soundManager && typeof window.soundManager.playWarning === 'function') {
                    window.soundManager.playWarning();
                }
                // Re-check and update button state
                checkColorSelectionComplete();
                return;
            }
            
            // Disable button to prevent double-clicks
            confirmBtn.disabled = true;
            
            // Build player data from DOM selections (most reliable)
            var playerData = [];
            for (var i = 0; i < playerCount; i++) {
                var select = colorGrid.querySelector('.color-select[data-player="' + i + '"]');
                var nameInput = colorGrid.querySelector('.player-name-input[data-player="' + i + '"]');
                
                if (!select || !select.value) {
                    console.error('❌ Missing color for player', i);
                    confirmBtn.disabled = false;
                    return;
                }
                
                var color = select.value;
                var colorName = select.options[select.selectedIndex].getAttribute('data-name');
                var playerName = nameInput ? (nameInput.value.trim() || 'Player ' + (i + 1)) : 'Player ' + (i + 1);
                
                playerData.push({
                    name: playerName,
                    color: color,
                    colorName: colorName
                });
            }
            
            console.log('✅ Players configured:', playerData);
            
            if (window.soundManager && typeof window.soundManager.playClick === 'function') {
                window.soundManager.playClick();
            }
            
            // Fade out intro music
            if (window.soundManager && window.soundManager.stopIntroMusic) {
                window.soundManager.stopIntroMusic();
            }
            
            // Hide color selection scene before starting game
            var colorSelection = document.getElementById('color-selection');
            if (colorSelection) {
                colorSelection.classList.remove('active');
                colorSelection.style.opacity = '0';
                
                setTimeout(function() {
                    colorSelection.style.display = 'none';
                    
                    // Now start the game with game manager
                    // This will show the role assignment scene with voice instructions
                    startGameWithPlayers(playerData);
                }, 600);
            } else {
                // If scene not found, start immediately
                startGameWithPlayers(playerData);
            }
        };
        
        // Add click handler with better error handling
        confirmBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 Confirm button clicked');
            confirmHandler();
        });
        
        confirmBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 Confirm button touched');
            confirmHandler();
        });
        
        // Also add mousedown for better mobile support
        confirmBtn.addEventListener('mousedown', function(e) {
            e.preventDefault();
        });
        
        // Initial check to set button state
        checkColorSelectionComplete();
        
        // Debug helper function
        window.debugColorSelection = function() {
            console.log('🔍 Color Selection Debug:');
            console.log('  Player Count:', playerCount);
            console.log('  Selected Colors Array:', selectedColors);
            console.log('  Player Names:', playerNames);
            
            for (var i = 0; i < playerCount; i++) {
                var select = colorGrid.querySelector('.color-select[data-player="' + i + '"]');
                var nameInput = colorGrid.querySelector('.player-name-input[data-player="' + i + '"]');
                console.log('  Player ' + (i + 1) + ':', {
                    selectExists: !!select,
                    selectedValue: select ? select.value : 'N/A',
                    name: nameInput ? nameInput.value : 'N/A',
                    arrayValue: selectedColors[i] || 'not set'
                });
            }
            
            console.log('  Button State:', {
                display: confirmBtn.style.display,
                disabled: confirmBtn.disabled,
                visible: confirmBtn.offsetParent !== null
            });
            
            checkColorSelectionComplete();
            console.log('  After re-check, button display:', confirmBtn.style.display);
        };
    }
    
    /**
     * Start game with player data - integrates with full game flow
     */
    function startGameWithPlayers(playerData) {
        console.log('🎮 Starting game with', playerData.length, 'players');
        
        // Wait for game manager to be ready
        var attempts = 0;
        var maxAttempts = 50;
        
        function tryStart() {
            attempts++;
            
            // Check if GameManager class exists
            if (typeof GameManager !== 'undefined') {
                // Initialize game manager if not already done
                if (!window.gameManager) {
                    console.log('📦 Initializing Game Manager...');
                    window.gameManager = new GameManager();
                }
                
                // Initialize all managers (including voice manager)
                if (typeof window.gameManager.initializeManagers === 'function') {
                    window.gameManager.initializeManagers()
                        .then(function() {
                            console.log('✅ Managers initialized');
                            
                            // Start the game with proper role assignment and voice instructions
                            if (typeof window.gameManager.setupGame === 'function') {
                                return window.gameManager.setupGame(playerData.length, playerData);
                            } else {
                                throw new Error('setupGame method not found');
                            }
                        })
                        .then(function() {
                            console.log('✅ Game started successfully with voice instructions');
                        })
                        .catch(function(error) {
                            console.error('❌ Game start failed:', error);
                            showError('Failed to start game. Please refresh the page.');
                        });
                } else {
                    // Fallback: try direct setup
                    console.warn('⚠️ initializeManagers not found, trying direct setup');
                    if (typeof window.gameManager.setupGame === 'function') {
                        window.gameManager.setupGame(playerData.length, playerData)
                            .then(function() {
                                console.log('✅ Game started successfully');
                            })
                            .catch(function(error) {
                                console.error('❌ Game start failed:', error);
                                showError('Failed to start game. Please refresh the page.');
                            });
                    }
                }
            } else if (attempts < maxAttempts) {
                setTimeout(tryStart, 100);
            } else {
                console.error('❌ GameManager not available after', maxAttempts, 'attempts');
                showError('Game system not ready. Please refresh the page.');
            }
        }
        
        tryStart();
    }
    
    /**
     * Get contrast color for text
     */
    function getContrastColor(hexColor) {
        var r = parseInt(hexColor.substr(1, 2), 16);
        var g = parseInt(hexColor.substr(3, 2), 16);
        var b = parseInt(hexColor.substr(5, 2), 16);
        var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
    
    /**
     * Setup volume controls
     */
    function setupVolumeControls() {
        var toggle = document.getElementById('volume-toggle');
        var control = document.getElementById('volume-control');
        var close = document.getElementById('close-volume');
        
        if (toggle && control) {
            toggle.addEventListener('click', function() {
                control.classList.toggle('show');
            });
        }
        
        if (close && control) {
            close.addEventListener('click', function() {
                control.classList.remove('show');
            });
        }
        
        // Set up sliders
        var masterSlider = document.getElementById('master-volume');
        var sfxSlider = document.getElementById('sfx-volume');
        var musicSlider = document.getElementById('music-volume');
        var muteBtn = document.getElementById('mute-btn');
        
        if (masterSlider && window.soundManager) {
            masterSlider.addEventListener('input', function(e) {
                var volume = e.target.value / 100;
                if (window.soundManager.setMasterVolume) {
                    window.soundManager.setMasterVolume(volume);
                }
            });
        }
        
        if (sfxSlider && window.soundManager) {
            sfxSlider.addEventListener('input', function(e) {
                var volume = e.target.value / 100;
                if (window.soundManager.setSFXVolume) {
                    window.soundManager.setSFXVolume(volume);
                }
            });
        }
        
        if (musicSlider && window.soundManager) {
            musicSlider.addEventListener('input', function(e) {
                var volume = e.target.value / 100;
                if (window.soundManager.setMusicVolume) {
                    window.soundManager.setMusicVolume(volume);
                }
            });
        }
        
        if (muteBtn && window.soundManager) {
            muteBtn.addEventListener('click', function() {
                if (window.soundManager.toggleMute) {
                    var isMuted = window.soundManager.toggleMute();
                    muteBtn.textContent = isMuted ? 'Unmute All' : 'Mute All';
                }
            });
        }
    }
    
    /**
     * Setup robust cross-browser fullscreen toggle
     */
    function setupFullscreenToggle() {
        var btn = document.getElementById('fullscreen-toggle');
        if (!btn) return;

        // Function to check if currently in fullscreen
        function isFullscreen() {
            return !!(document.fullscreenElement || 
                     document.webkitFullscreenElement || 
                     document.mozFullScreenElement || 
                     document.msFullscreenElement);
        }

        // Update button UI based on state
        function updateUI() {
            if (isFullscreen()) {
                btn.innerHTML = '🗗';
                btn.title = 'Exit Fullscreen';
                btn.classList.add('active');
            } else {
                btn.innerHTML = '⛶';
                btn.title = 'Enter Fullscreen';
                btn.classList.remove('active');
            }
        }

        // Handle the toggle action
        function toggleFullscreen() {
            try {
                if (window.soundManager) window.soundManager.playClick();
                
                if (!isFullscreen()) {
                    var el = document.documentElement;
                    var requestMethod = el.requestFullscreen || 
                                       el.webkitRequestFullscreen || 
                                       el.webkitRequestFullScreen || 
                                       el.mozRequestFullScreen || 
                                       el.msRequestFullscreen;

                    if (requestMethod) {
                        requestMethod.call(el).catch(function(err) {
                            console.warn('Fullscreen request rejected:', err);
                        });
                    } else if (typeof window.ActiveXObject !== "undefined") { // Old IE
                        var wscript = new ActiveXObject("WScript.Shell");
                        if (wscript !== null) wscript.SendKeys("{F11}");
                    }
                } else {
                    var exitMethod = document.exitFullscreen || 
                                    document.webkitExitFullscreen || 
                                    document.mozCancelFullScreen || 
                                    document.msExitFullscreen;
                    
                    if (exitMethod) {
                        exitMethod.call(document).catch(function(err) {
                            console.warn('Exit fullscreen failed:', err);
                        });
                    }
                }
            } catch (error) {
                console.error('Fullscreen toggle error:', error);
            }
        }

        // Event Listeners
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleFullscreen();
        });

        btn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            toggleFullscreen();
        }, { passive: false });

        // Listen for fullscreen change events (handles ESC key and system changes)
        [
            'fullscreenchange', 
            'webkitfullscreenchange', 
            'mozfullscreenchange', 
            'MSFullscreenChange'
        ].forEach(function(evt) {
            document.addEventListener(evt, updateUI);
        });

        // Initial UI state
        updateUI();
        console.log('✅ Robust Fullscreen toggle configured');
    }
    
    /**
     * Setup skip voting checkbox
     */
    function setupSkipVotingCheckbox() {
        var checkbox = document.getElementById('skip-voting-checkbox');
        var container = document.querySelector('.skip-voting-container');
        
        if (!checkbox || !container) return;
        
        // Load saved preference
        var saved = localStorage.getItem('skipVotingScene');
        if (saved === 'true') {
            checkbox.checked = true;
            container.classList.add('enabled');
        }
        
        // Save on change
        checkbox.addEventListener('change', function() {
            container.classList.toggle('enabled', checkbox.checked);
            localStorage.setItem('skipVotingScene', checkbox.checked);
            window.gameSettings = window.gameSettings || {};
            window.gameSettings.skipVotingScene = checkbox.checked;
        });
    }
    
    /**
     * Setup voice settings button
     */
    function setupVoiceSettingsButton() {
        var voiceBtn = document.getElementById('voice-settings-toggle');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (window.voiceConfig) {
                    window.voiceConfig.showConfig();
                    if (window.soundManager) window.soundManager.playClick();
                }
            });
            
            // Add touch event for mobile
            voiceBtn.addEventListener('touchstart', function(e) {
                e.preventDefault();
                this.click();
            }, { passive: false });
            
            console.log('✅ Voice settings button configured');
        }
    }

    /**
     * Show main menu
     */
    function showMainMenu() {
        return new Promise(function(resolve) {
            var loading = document.getElementById('loading-screen');
            var mainMenu = document.getElementById('main-menu');
            
            if (loading) {
                loading.style.opacity = '0';
                setTimeout(function() {
                    loading.style.display = 'none';
                }, 500);
            }
            
            if (mainMenu) {
                mainMenu.style.display = 'block';
                setTimeout(function() {
                    mainMenu.classList.add('active');
                    mainMenu.style.opacity = '1';
                    resolve();
                }, 100);
            } else {
                resolve();
            }
        });
    }
    
    /**
     * Show error message
     */
    function showError(message) {
        alert(message);
    }
    
    /**
     * Setup device-specific optimizations
     */
    function setupDeviceOptimizations() {
        // Set up viewport height fix for mobile
        function setViewportHeight() {
            var vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', vh + 'px');
        }
        
        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', function() {
            setTimeout(setViewportHeight, 100);
        });
        
        console.log('📱 Device optimizations configured');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        // DOM already loaded
        setTimeout(initializeApp, 100);
    }
    
    console.log('✅ App initialization module loaded');
    
})();
