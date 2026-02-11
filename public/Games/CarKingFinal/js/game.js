// Kids Car Guessing Game - Main JavaScript File
class CarGuessingGame {
    constructor() {
        this.currentScreen = 'start';
        this.score = 0;
        this.streak = 0;
        this.currentCarIndex = 0;
        this.isGameRunning = false;
        this.soundEnabled = true;
        this.gameTimer = null;
        this.answerTimer = null;
        this.currentCar = null;
        this.lastCarIndex = -1; // Track last car to prevent immediate repeats
        this.gameMode = 'challenger'; // 'challenger' or 'continuous'

        this.voiceSystem = null; // Advanced voice system
        this.transitionTimer = null; // Timer for revealed answer delay
        this.nextCarTimer = null; // Timer for loading next car
        this.menuMusic = null; // Main menu background music
        this.menuMusicDefaultVolume = 0.7;
        this.menuMusicFadeDuration = 1200;
        this.isStartingGame = false;
        this.micDevicesInitialized = false;
        this.micLabelCache = this.loadMicLabelCache();
        this.micPermissionGranted = this.loadMicPermissionState();
        this.micPermissionState = 'unknown';
        this.micPermissionRequestInFlight = null;
        this.globalPermStream = null;
        this.isMicWarm = false;
        this.isRecognitionActive = false;
        this.isListeningForAnswer = false;
        this.micState = 'idle';
        this.recognitionRestartAttempts = 0;
        this.maxRecognitionRestarts = 4;
        this.recognitionRestartCooldownMs = 650;
        this.lastSpeechResultAt = 0;
        this.micHealthMonitorTimer = null;
        this.micNoSpeechTimeoutMs = 5500;
        this.selectedMicId = this.loadSelectedMicId();
        this.supportsContinuousRecognition = true;


        // Dynamic car database loading from local files
        // Fully populated with all available cars in CarFiles
        // Now supports multiple random images per car
        this.carDatabase = window.CAR_DATABASE || [];

        // Perfect No-Repeat System
        // We act like a deck of cards: shuffle all cars, pick until empty, then reshuffle.
        this.availableCarIndices = [];

        // Initialize the game
        this.init();
    }

    async init() {
        console.log("🚗 Initializing Kids Car Guessing Game...");
        this.setupEventListeners();
        this.setupPermissionWatchers();
        this.initMainMenu();
        this.showStartScreen();

        // IMPORTANT: initialize speech/AudioContext in a non-blocking way.
        // On some devices/browsers, resuming AudioContext before a user gesture can hang,
        // which previously blocked initMainMenu/showStartScreen from finishing.
        this.initializeSpeech().catch((err) => {
            console.warn('Voice system initialization failed (continuing without blocking UI):', err);
            this.speechSupported = false;
        });
    }

    setupPermissionWatchers() {
        // Keep browser permission state in sync where supported.
        if (!navigator.permissions?.query) return;

        navigator.permissions.query({ name: 'microphone' }).then((status) => {
            this.micPermissionState = status.state;
            if (status.state === 'granted') {
                this.micPermissionGranted = true;
                this.saveMicPermissionState();
            }

            status.onchange = () => {
                this.micPermissionState = status.state;
                const granted = status.state === 'granted';
                this.micPermissionGranted = granted;
                this.saveMicPermissionState();

                // If permission is revoked while app is open, release keep-alive stream safely.
                if (!granted && this.globalPermStream) {
                    this.stopMediaStream(this.globalPermStream);
                    this.globalPermStream = null;
                }
            };
        }).catch(() => {
            // Permissions API is not consistent on all browsers (especially iOS WebKit).
        });
    }

    stopMediaStream(stream) {
        if (!stream) return;
        try {
            stream.getTracks().forEach(track => track.stop());
        } catch (e) { }
    }

    attachGlobalPermStream(stream) {
        if (!stream) return;
        if (this.globalPermStream && this.globalPermStream !== stream) {
            this.stopMediaStream(this.globalPermStream);
        }
        this.globalPermStream = stream;
    }

    isAudioStreamUsable(stream) {
        if (!stream || !stream.active) return false;
        const tracks = stream.getAudioTracks?.() || [];
        return tracks.some(track => track.readyState === 'live');
    }

    getPreferredAudioConstraints(deviceId = null) {
        const isIOS = !!window.deviceIntelligence?.device?.isIOS;
        const isAndroid = !!window.deviceIntelligence?.device?.isAndroid;
        const isMobile = !!window.deviceIntelligence?.device?.isMobile;

        // Adaptive constraints: conservative on mobile/tablet for better compatibility.
        const base = isIOS
            ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: false,
                channelCount: 1
            }
            : {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 1,
                sampleRate: isAndroid ? { ideal: 48000 } : { ideal: 44100 }
            };

        if (!deviceId || deviceId === 'default') {
            return { audio: isMobile ? base : { ...base, latency: { ideal: 0.02 } } };
        }

        return {
            audio: {
                ...base,
                // 'ideal' is more cross-platform than 'exact' for mobile browsers
                deviceId: { ideal: deviceId }
            }
        };
    }

    loadSelectedMicId() {
        try {
            const value = localStorage.getItem('carGuessingSelectedMicId');
            if (!value || value === 'default') return null;
            return value;
        } catch (err) {
            console.warn('Unable to load selected microphone:', err);
            return null;
        }
    }

    saveSelectedMicId(deviceId) {
        try {
            const normalized = !deviceId || deviceId === 'default' ? 'default' : deviceId;
            localStorage.setItem('carGuessingSelectedMicId', normalized);
        } catch (err) {
            console.warn('Unable to save selected microphone:', err);
        }
    }

    setMicState(nextState) {
        this.micState = nextState;
        const micStatus = document.getElementById('micStatus');
        if (micStatus) {
            micStatus.dataset.state = nextState;
        }
    }

    updateMicStatusMessage(message) {
        const transcriptEl = document.getElementById('liveTranscript');
        if (!transcriptEl) return;
        transcriptEl.textContent = message;
        transcriptEl.classList.remove('hidden');
        transcriptEl.classList.add('active');
    }

    startMicHealthMonitor() {
        this.stopMicHealthMonitor();
        this.micHealthMonitorTimer = setInterval(() => {
            if (!this.isListeningForAnswer || !this.isGameRunning) return;

            const now = Date.now();
            const idleFor = now - (this.lastSpeechResultAt || 0);
            if (idleFor >= this.micNoSpeechTimeoutMs) {
                console.warn('🎤 No speech detected for prolonged period. Restarting recognition engine.');
                this.lastSpeechResultAt = now;
                this.restartRecognitionEngine('health-check-no-speech');
            }
        }, 1500);
    }

    stopMicHealthMonitor() {
        if (this.micHealthMonitorTimer) {
            clearInterval(this.micHealthMonitorTimer);
            this.micHealthMonitorTimer = null;
        }
    }

    canRestartRecognition() {
        return this.recognitionRestartAttempts < this.maxRecognitionRestarts;
    }

    restartRecognitionEngine(reason = 'unknown') {
        if (!this.recognition) return;
        if (!this.isGameRunning && !this.isMicWarm) return;
        if (!this.canRestartRecognition()) {
            console.warn('🛑 Mic restart limit reached. Falling back to text/choice mode messaging.');
            this.updateMicStatusMessage('Microphone unstable. Tap mic button to retry.');
            return;
        }

        this.recognitionRestartAttempts += 1;
        console.log(`🔄 Restarting recognition (${this.recognitionRestartAttempts}/${this.maxRecognitionRestarts}) due to: ${reason}`);

        setTimeout(() => {
            try {
                this.recognition.start();
            } catch (e) {
                console.warn('Recognition restart failed:', e);
            }
        }, this.recognitionRestartCooldownMs);
    }

    async getMicrophoneStream(deviceId = null) {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('getUserMedia-not-supported');
        }

        const attempts = [];

        // Attempt 1: preferred constraints
        attempts.push(this.getPreferredAudioConstraints(deviceId));

        // Attempt 2: minimal + optional device preference
        if (deviceId && deviceId !== 'default') {
            attempts.push({
                audio: {
                    deviceId: { ideal: deviceId }
                }
            });
        }

        // Attempt 3: absolute fallback
        attempts.push({ audio: true });

        let lastError = null;

        for (const constraints of attempts) {
            try {
                return await navigator.mediaDevices.getUserMedia(constraints);
            } catch (err) {
                lastError = err;
                console.warn('getUserMedia attempt failed with constraints:', constraints, err);
            }
        }

        throw lastError || new Error('microphone-stream-failed');
    }

    setupEventListeners() {
        // Start button
        document.getElementById('startBtn').addEventListener('click', async () => {
            await this.handleStartGameClick();
        });

        // New game button
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.resetGame();
        });

        // Submit guess button
        document.getElementById('submitGuess').addEventListener('click', () => {
            this.submitGuess();
        });

        // Enter key for guess input
        document.getElementById('guessInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitGuess();
            }
        });

        // Sound toggle
        document.getElementById('soundToggle').addEventListener('click', () => {
            this.toggleSound();
        });

        // Prevent form submission
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
            }
        });

        // --- NEW SETTINGS & MODE LOGIC ---
        this.inputMode = 'voice'; // Default mode

        const settingsBtn = document.getElementById('settingsBtn');
        const settingsOverlay = document.getElementById('settingsOverlay');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const settingOptions = document.querySelectorAll('.setting-option');
        const micBtn = document.getElementById('micBtn');
        const guessInput = document.getElementById('guessInput');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                settingsOverlay.classList.add('visible');
                this.refreshMicrophones(false);
            });
        }

        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', async () => {
                await this.ensureMicrophonePermissionForGame();
                await this.warmStartRecognition();
                settingsOverlay.classList.remove('visible');
            });
        }

        settingOptions.forEach(option => {
            option.addEventListener('click', () => {
                settingOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                this.inputMode = option.dataset.mode;
                console.log(`Mode switched to: ${this.inputMode}`);
            });
        });

        if (micBtn) {
            this.setupSpeechRecognition(micBtn, guessInput);
        }

        this.setupGameOverListeners();
    }

    setupGameOverListeners() {
        const playAgainBtn = document.getElementById('playAgainBtn');
        const mainMenuBtn = document.getElementById('mainMenuBtn');

        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                // Manually reset game state for instant replay
                this.score = 0;
                this.streak = 0;
                this.updateScore();
                this.isGameRunning = false;
                this.isStartingGame = false; // Reset start flag

                // Clear any running timers or processes
                if (this.answerTimer) clearTimeout(this.answerTimer);
                if (this.timerInterval) clearInterval(this.timerInterval);
                if (this.nextCarTimer) clearTimeout(this.nextCarTimer);
                if (this.voiceSystem) this.voiceSystem.cancel();

                // Start game immediately
                this.handleStartGameClick();
            });
        }

        if (mainMenuBtn) {
            mainMenuBtn.addEventListener('click', () => {
                this.resetGame();
                this.showStartScreen();
            });
        }
    }

    initMainMenu() {
        const startScreen = document.getElementById('startScreen');
        const menuPanel = startScreen?.querySelector('.menu-panel');
        const clickHint = startScreen?.querySelector('.menu-click');
        this.menuMusic = document.getElementById('menuMusic');

        if (this.menuMusic) {
            this.menuMusic.volume = this.menuMusicDefaultVolume;
        }

        // Logic for Game Mode Toggle
        const gameModeBtn = document.getElementById('gameModeBtn');
        if (gameModeBtn) {
            gameModeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent bubbling issues
                if (this.gameMode === 'challenger') {
                    this.gameMode = 'continuous';
                    gameModeBtn.textContent = 'Mode: Continuous ♾️';
                } else {
                    this.gameMode = 'challenger';
                    gameModeBtn.textContent = 'Mode: Challenger 🏆';
                }
                console.log(`Game Mode toggled to: ${this.gameMode}`);
            });
        }

        if (!startScreen || !menuPanel) return;

        const revealMenu = (event) => {
            if (startScreen.classList.contains('menu-revealed')) {
                return;
            }
            const target = event.target;
            if (target.closest('.menu-panel')) {
                return;
            }

            startScreen.classList.add('menu-revealed');
            menuPanel.setAttribute('aria-hidden', 'false');
            if (clickHint) {
                clickHint.setAttribute('aria-hidden', 'true');
            }
            this.playMenuMusic();
        };

        if (this.menuRevealHandler) {
            startScreen.removeEventListener('click', this.menuRevealHandler);
        }
        this.menuRevealHandler = revealMenu;
        startScreen.addEventListener('click', revealMenu);
    }

    playMenuMusic() {
        if (!this.menuMusic || !this.soundEnabled) return;
        if (this.menuMusic.paused) {
            this.menuMusic.volume = this.menuMusicDefaultVolume;
            this.menuMusic.play().catch((e) => {
                console.warn("Menu music playback failed:", e);
            });
        }
    }

    stopMenuMusic() {
        if (!this.menuMusic) return;
        this.menuMusic.pause();
        this.menuMusic.currentTime = 0;
        this.menuMusic.volume = this.menuMusicDefaultVolume;
    }

    fadeOutMenuMusic(duration = this.menuMusicFadeDuration) {
        return new Promise((resolve) => {
            if (!this.menuMusic || this.menuMusic.paused) {
                resolve();
                return;
            }
            const startVolume = this.menuMusic.volume;
            const startTime = performance.now();
            const step = (now) => {
                const progress = Math.min((now - startTime) / duration, 1);
                this.menuMusic.volume = startVolume * (1 - progress);
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    this.menuMusic.pause();
                    this.menuMusic.currentTime = 0;
                    this.menuMusic.volume = startVolume;
                    resolve();
                }
            };
            requestAnimationFrame(step);
        });
    }

    async handleStartGameClick() {
        if (this.isStartingGame) return;
        this.isStartingGame = true;
        await this.ensureMicrophonePermissionForGame();
        await this.warmStartRecognition();
        const startGame = () => {
            this.startCountdown();
        };
        if (this.menuMusic && !this.menuMusic.paused) {
            this.fadeOutMenuMusic().then(startGame);
        } else {
            startGame();
        }
    }

    setupSpeechRecognition(micBtn, guessInput) {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            micBtn.style.display = 'none';
            this.supportsContinuousRecognition = false;
            return;
        }

        // SINGLETON PATTERN: Only create if doesn't exist
        if (!this.recognition) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.supportsContinuousRecognition = true;

            // 1. ROBUST SETTINGS (adaptive per platform)
            const isIOS = !!window.deviceIntelligence?.device?.isIOS;
            this.recognition.continuous = !isIOS;
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 1;
            this.recognition.lang = 'en-US';

            this.setupRecognitionHandlers(micBtn, guessInput);
        }

        // Manual toggle 
        // Remove old listeners to prevent duplicates if recalled
        micBtn.addEventListener('click', () => {
            if (this.isListeningForAnswer) {
                this.stopListening();
                document.getElementById('guessInput').placeholder = "Mic Paused";
            } else {
                this.recognitionRestartAttempts = 0;
                this.startListening();
            }
        });

        // Initialize Settings Logic safely
        this.initMicSettings();
    }

    setupRecognitionHandlers(micBtn, guessInput) {
        this.recognition.onstart = () => {
            console.log("🎤 Mic started");
            this.isRecognitionActive = true;
            this.setMicState('listening');
            this.recognitionRestartAttempts = 0;
            if (this.isGameRunning || this.isListeningForAnswer) {
                this.toggleMicVisuals(true);
            }

            // Reduce speaker level while listening so prompts don't bleed back into mic.
            if (this.voiceSystem?.setListeningMode) {
                this.voiceSystem.setListeningMode(true);
            }

            // Release keep-alive stream once recognition is active to avoid capture conflicts.
            if (this.globalPermStream) {
                this.stopMediaStream(this.globalPermStream);
                this.globalPermStream = null;
            }
        };

        this.recognition.onend = () => {
            console.log("🎤 Mic stopped");
            this.isRecognitionActive = false;
            if (!this.isListeningForAnswer) {
                this.setMicState('ready');
            }

            if (!this.isGameRunning) {
                this.toggleMicVisuals(false);
            }

            if ((this.isGameRunning || this.isMicWarm) && (this.isListeningForAnswer || this.isMicWarm)) {
                this.restartRecognitionEngine('onend');
            }
        };

        this.recognition.onresult = (event) => {
            if (!this.isListeningForAnswer) return;
            this.lastSpeechResultAt = Date.now();

            // Clear any previous "Silence" timer because user is talking
            if (this.silenceTimer) clearTimeout(this.silenceTimer);

            let interimString = '';
            let finalString = '';

            // Combine all available results
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalString += event.results[i][0].transcript;
                } else {
                    interimString += event.results[i][0].transcript;
                }
            }

            // Normalization
            const fullSpeech = (finalString + interimString).trim();
            const input = document.getElementById('guessInput');
            const transcriptEl = document.getElementById('liveTranscript');

            // LIVE FEEDBACK: Show what is being said (briefly)
            if (fullSpeech) {
                // Formatting: Capitalize first letter
                const formatted = fullSpeech.charAt(0).toUpperCase() + fullSpeech.slice(1).replace(/[.,!?]$/, "");

                input.value = formatted;
                input.classList.add('listening-active');

                if (transcriptEl) {
                    transcriptEl.textContent = `"${formatted}"`;
                    transcriptEl.classList.remove('hidden');
                    transcriptEl.classList.add('active');
                }
            }

            const isWinner = this.isGuessCorrect(fullSpeech);

            // 1. SMART KEYWORD CHECK (Instant Win)
            // if they say "Bug" and it matches "Bugatti", SNAP the text to "Bugatti" and submit.
            if (isWinner) {
                console.log("✅ Keyword Detected! Immediate Submit.");

                // FORCE UI TO SHOW CLEAN CORRECT ANSWER
                // This prevents "Bug" from showing when it should be "Bugatti"
                input.value = this.currentCar.name;
                if (transcriptEl) {
                    transcriptEl.textContent = `"${this.currentCar.name}"`;
                }

                this.submitGuess(); // Wins immediately
                return; // Stop processing
            } else {
                console.log("❌ Incorrect guess. Ignoring submission. Waiting for correct answer...");
                // Visual feedback for wrong guess (optional, but requested to just show transcript)
                // The transcriptEl is already updated above with what they said.
                // We simply DO NOT call submitGuess() and do NOT set a timer.
                // The user must keep speaking until they say the right name or time runs out.
            }
        };

        this.recognition.onerror = (event) => {
            if (event.error !== 'no-speech') {
                console.warn("Mic Error:", event.error);
            }

            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                this.setMicState('error');
                this.updateMicStatusMessage('Microphone permission blocked. Check browser settings.');
                this.stopListening();
                return;
            }

            if (event.error === 'audio-capture') {
                this.setMicState('error');
                this.updateMicStatusMessage('No audio capture detected. Try selecting another microphone.');
            }

            if (event.error === 'aborted' || event.error === 'network' || event.error === 'no-speech') {
                this.restartRecognitionEngine(`error-${event.error}`);
            }
        };
    }

    // --- NEW MICROPHONE SETTINGS & TESTING ---
    async initMicSettings() {
        const micSelect = document.getElementById('micSelect');
        const testBtn = document.getElementById('testMicBtn');
        const showNamesBtn = document.getElementById('showMicNamesBtn');
        const micConfigSection = document.getElementById('micConfigSection');

        if (!micSelect || !testBtn || !showNamesBtn || !micConfigSection) return;

        const isSecureContext = window.isSecureContext && window.location.protocol !== 'file:';
        if (!isSecureContext) {
            showNamesBtn.textContent = 'Turn On Microphone';
            showNamesBtn.disabled = false;
            micConfigSection.classList.remove('mic-status-ok');
            micConfigSection.classList.add('mic-status-error');
            const statusEl = document.getElementById('micDeviceStatus');
            if (statusEl) {
                statusEl.textContent = '⚠️ HTTPS is recommended for mobile microphone access.';
                statusEl.style.color = 'var(--accent)';
            }
        }

        if (!this.micDevicesInitialized) {
            micSelect.addEventListener('change', (e) => {
                console.log("Input Device Selected:", e.target.value);
                this.selectedMicId = e.target.value === 'default' ? null : e.target.value;
                this.saveSelectedMicId(this.selectedMicId);
                if (this.isListeningForAnswer) {
                    this.restartRecognitionEngine('device-change');
                }
            });

            showNamesBtn.addEventListener('click', async () => {
                try {
                    const statusEl = document.getElementById('micDeviceStatus');
                    if (statusEl) statusEl.textContent = "Activating microphone...";

                    // Request permission through unified flow (single prompt behavior)
                    const granted = await this.ensureMicrophonePermissionForGame(true);
                    if (!granted) {
                        throw new Error('microphone-permission-denied');
                    }

                    // Success! Update UI immediately
                    const micConfigSection = document.getElementById('micConfigSection');
                    if (micConfigSection) {
                        micConfigSection.classList.add('mic-status-ok');
                        micConfigSection.classList.remove('mic-status-error');
                    }

                    this.micPermissionGranted = true;
                    this.micPermissionState = 'granted';
                    this.saveMicPermissionState();

                    // Refresh list now that we have access
                    await this.refreshMicrophones(false);

                    // Note: We do NOT stop the stream here. We keep it active so the
                    // browser considers the site "trusted" for audio capture.
                    // We will clean it up when the game's SpeechRecognition starts.

                } catch (err) {
                    console.warn("Activation failed:", err);
                    this.micPermissionGranted = false;
                    this.saveMicPermissionState();
                    const micConfigSection = document.getElementById('micConfigSection');
                    const statusEl = document.getElementById('micDeviceStatus');

                    if (micConfigSection) {
                        micConfigSection.classList.remove('mic-status-ok');
                        micConfigSection.classList.add('mic-status-error');
                    }
                    if (statusEl) {
                        statusEl.textContent = "Access denied. Check browser settings.";
                        statusEl.style.color = 'var(--accent)';
                    }
                }
            });

            if (navigator.mediaDevices?.addEventListener) {
                navigator.mediaDevices.addEventListener('devicechange', () => {
                    this.refreshMicrophones(false);
                });
            }

            this.micDevicesInitialized = true;
        }

        await this.refreshMicrophones(false);

        // 2. Test Logic
        testBtn.addEventListener('click', () => {
            if (this.isTestingMic) {
                this.stopMicTest();
            } else {
                this.startMicTest();
            }
        });
    }

    loadMicLabelCache() {
        try {
            return JSON.parse(localStorage.getItem('carGuessingMicLabels') || '{}');
        } catch (err) {
            console.warn('Unable to load microphone label cache:', err);
            return {};
        }
    }

    loadMicPermissionState() {
        try {
            return localStorage.getItem('carGuessingMicPermissionGranted') === 'true';
        } catch (err) {
            console.warn('Unable to load mic permission state:', err);
            return false;
        }
    }

    saveMicPermissionState() {
        try {
            localStorage.setItem(
                'carGuessingMicPermissionGranted',
                this.micPermissionGranted ? 'true' : 'false'
            );
        } catch (err) {
            console.warn('Unable to save mic permission state:', err);
        }
    }

    saveMicLabelCache() {
        try {
            localStorage.setItem('carGuessingMicLabels', JSON.stringify(this.micLabelCache || {}));
        } catch (err) {
            console.warn('Unable to save microphone label cache:', err);
        }
    }

    async warmStartRecognition() {
        if (this.inputMode !== 'voice') return;
        if (!this.recognition) return;
        if (this.isRecognitionActive) return;

        this.isMicWarm = true;
        this.setMicState('warming');

        try {
            this.recognition.start();
        } catch (err) {
            if (err?.error !== 'not-allowed' && err?.error !== 'service-not-allowed') {
                console.warn('Mic warm start failed:', err);
            }
        }
    }

    async ensureMicrophonePermissionForGame(force = false) {
        if (!force && this.inputMode !== 'voice') return true;
        if (!navigator.mediaDevices?.getUserMedia) return false;

        // Reuse an already-active stream to avoid repeated permission prompts.
        if (this.globalPermStream?.active) {
            this.micPermissionGranted = true;
            this.saveMicPermissionState();
            return true;
        }

        // If browser explicitly reports denied, avoid re-prompt loops.
        if (navigator.permissions?.query) {
            try {
                const status = await navigator.permissions.query({ name: 'microphone' });
                this.micPermissionState = status.state;
                if (status.state === 'denied') {
                    this.micPermissionGranted = false;
                    this.saveMicPermissionState();
                    return false;
                }
            } catch (e) {
                // Continue with getUserMedia fallback path.
            }
        }

        // De-duplicate concurrent permission requests from multiple UI actions.
        if (this.micPermissionRequestInFlight) {
            return this.micPermissionRequestInFlight;
        }

        this.micPermissionRequestInFlight = (async () => {
            try {
                const stream = await this.getMicrophoneStream();
                this.attachGlobalPermStream(stream);
                this.micPermissionGranted = true;
                this.micPermissionState = 'granted';
                this.saveMicPermissionState();
                return true;
            } catch (err) {
                console.warn('Microphone permission request failed:', err);
                this.micPermissionGranted = false;
                this.saveMicPermissionState();
                return false;
            } finally {
                this.micPermissionRequestInFlight = null;
            }
        })();

        return this.micPermissionRequestInFlight;
    }

    async refreshMicrophones(requestPermission = false) {
        const micSelect = document.getElementById('micSelect');
        const statusEl = document.getElementById('micDeviceStatus');
        const micConfigSection = document.getElementById('micConfigSection');

        // Safety check: ensure all required elements exist
        if (!micSelect) return;

        // Helper to update status text
        const setStatus = (text, isError = false) => {
            if (statusEl) {
                statusEl.textContent = text;
                statusEl.style.color = isError ? 'var(--accent)' : 'var(--text-muted)';
            }
        };

        // Only show "Scanning" if we are explicitly requesting or if it's the first load
        // Avoid overwriting "Ready" status during silent refreshes unless necessary
        if (requestPermission) {
            setStatus('Scanning for microphones...');
        }

        if (!navigator.mediaDevices?.enumerateDevices) {
            if (this.isAudioStreamUsable(this.globalPermStream)) {
                micSelect.innerHTML = '';
                const opt = document.createElement('option');
                opt.value = 'default';
                opt.text = 'Active microphone (device hidden by browser)';
                micSelect.add(opt);
                this.selectedMicId = null;
                setStatus('✅ Microphone active. Device names not available on this browser.', false);
                if (micConfigSection) {
                    micConfigSection.classList.add('mic-status-ok');
                    micConfigSection.classList.remove('mic-status-error');
                }
                return;
            }

            setStatus('Microphone tools unavailable on this browser/device.', true);
            if (micConfigSection) {
                micConfigSection.classList.remove('mic-status-ok');
                micConfigSection.classList.add('mic-status-error');
            }
            return;
        }

        try {
            // Ensure cache is initialized
            if (!this.micLabelCache) {
                this.micLabelCache = {};
            }

            // STEP 1: Permission trigger (only when explicitly requested by user action)
            if (requestPermission) {
                const granted = await this.ensureMicrophonePermissionForGame(true);
                if (!granted) {
                    setStatus('Microphone access denied.', true);
                    return; // Stop if we explicitly asked for permission and got denied
                }
            }

            // STEP 2: Enumerate with retry
            let devices = [];
            let audioInputs = [];
            let hasLabels = false;

            for (let i = 0; i < 3; i++) {
                try {
                    devices = await navigator.mediaDevices.enumerateDevices();
                    audioInputs = devices.filter(device => device.kind === 'audioinput');
                    hasLabels = audioInputs.some(d => d.label && d.label.trim().length > 0);
                    if (hasLabels || audioInputs.length === 0) break;
                    await new Promise(r => setTimeout(r, 200));
                } catch (e) {
                    console.warn("Enumeration attempt failed:", e);
                }
            }

            // STEP 3: Populate Dropdown
            const currentVal = micSelect.value;
            micSelect.innerHTML = '';

            if (audioInputs.length === 0) {
                const showNamesBtn = document.getElementById('showMicNamesBtn');

                // On many phones, enumerateDevices may be empty until permission is granted.
                if (!requestPermission && !this.micPermissionGranted) {
                    const opt = document.createElement('option');
                    opt.value = 'default';
                    opt.text = 'Tap "Turn On Microphone" first';
                    micSelect.add(opt);
                    setStatus('Microphone permission needed on this device.', false);
                    if (showNamesBtn) {
                        showNamesBtn.textContent = 'Turn On Microphone';
                        showNamesBtn.disabled = false;
                        showNamesBtn.style.opacity = '1';
                    }
                    return;
                }

                const opt = document.createElement('option');
                opt.value = 'default';
                opt.text = "No microphones found";
                micSelect.add(opt);

                // iOS/Safari can hide enumerateDevices even when capture is active.
                if (this.isAudioStreamUsable(this.globalPermStream)) {
                    opt.text = 'Active microphone (device hidden by browser)';
                    this.selectedMicId = null;
                    setStatus('✅ Microphone active. Browser did not expose device list.', false);
                    if (micConfigSection) {
                        micConfigSection.classList.add('mic-status-ok');
                        micConfigSection.classList.remove('mic-status-error');
                    }
                    return;
                }

                setStatus('No microphone hardware detected.', true);
                return;
            }

            // Populate options
            audioInputs.forEach((device, index) => {
                let label = device.label?.trim();
                const deviceId = device.deviceId;

                // Update cache if we have a real label
                if (label && label.length > 0) {
                    this.micLabelCache[deviceId] = label;
                }

                // Fallback to cache or generic name
                const displayLabel = this.micLabelCache[deviceId] || label || `Microphone ${index + 1}`;

                const option = document.createElement('option');
                option.value = deviceId;
                option.text = displayLabel;
                micSelect.appendChild(option);
            });

            this.saveMicLabelCache();

            // Restore selection
            if (this.selectedMicId && Array.from(micSelect.options).some(o => o.value === this.selectedMicId)) {
                micSelect.value = this.selectedMicId;
            } else if (currentVal && Array.from(micSelect.options).some(o => o.value === currentVal)) {
                micSelect.value = currentVal;
            } else if (micSelect.options.length > 0) {
                micSelect.selectedIndex = 0;
                this.selectedMicId = micSelect.value === 'default' ? null : micSelect.value;
            }
            this.saveSelectedMicId(this.selectedMicId);

            // STEP 4: Update UI State
            const labelsVisible = audioInputs.some(d => d.label && d.label.trim().length > 0);
            const streamActive = this.isAudioStreamUsable(this.globalPermStream);
            const permissionLikelyGranted = this.micPermissionGranted || this.micPermissionState === 'granted' || streamActive;
            const showNamesBtn = document.getElementById('showMicNamesBtn');

            if (labelsVisible) {
                setStatus(`✅ Ready! ${audioInputs.length} device(s) found.`);

                // Success State: Turn Green & Lock Button
                if (micConfigSection) {
                    micConfigSection.classList.add('mic-status-ok');
                    micConfigSection.classList.remove('mic-status-error');
                }

                if (showNamesBtn) {
                    showNamesBtn.innerHTML = '✅ Microphone Ready';
                    showNamesBtn.disabled = true;
                    showNamesBtn.style.opacity = '1';
                    showNamesBtn.style.background = 'var(--success)';
                    showNamesBtn.style.borderColor = 'var(--success)';
                    showNamesBtn.style.color = '#fff';
                }
            } else if (audioInputs.length > 0 && permissionLikelyGranted) {
                // Mobile Safari/Chrome can return audioinput devices without labels
                // even after permission is granted. Treat this as success, not failure.
                setStatus(`✅ Microphone active. ${audioInputs.length} input(s) detected (labels hidden by browser).`);

                if (micConfigSection) {
                    micConfigSection.classList.add('mic-status-ok');
                    micConfigSection.classList.remove('mic-status-error');
                }

                if (showNamesBtn) {
                    showNamesBtn.innerHTML = '✅ Microphone Ready';
                    showNamesBtn.disabled = true;
                    showNamesBtn.style.opacity = '1';
                    showNamesBtn.style.background = 'var(--success)';
                    showNamesBtn.style.borderColor = 'var(--success)';
                    showNamesBtn.style.color = '#fff';
                }
            } else {
                setStatus('Microphone access needed.', false);
                if (showNamesBtn) {
                    showNamesBtn.textContent = 'Turn On Microphone';
                    showNamesBtn.disabled = false;
                    showNamesBtn.style.opacity = '1';
                }
            }

        } catch (err) {
            console.error("Error refreshing microphones:", err);
            // Only set critical error status if we aren't just doing a background refresh
            if (requestPermission) {
                setStatus('Error accessing audio subsystem.', true);
            }
        }
    }

    async startMicTest() {
        const visualizer = document.getElementById('testVisualizer');
        const testBtn = document.getElementById('testMicBtn');
        const status = document.getElementById('micTestStatus');

        try {
            // Ensure permission is obtained once through the shared path.
            const granted = await this.ensureMicrophonePermissionForGame(true);
            if (!granted) {
                throw new Error('microphone-permission-denied');
            }

            this.isTestingMic = true;
            testBtn.classList.add('testing');
            testBtn.innerHTML = '<span class="btn-icon">⏹️</span> Stop Test';
            status.textContent = "Speak now! Watch the bars move...";
            visualizer.classList.add('active');

            const micConfigSection = document.getElementById('micConfigSection');
            if (micConfigSection) {
                micConfigSection.classList.add('mic-status-ok');
                micConfigSection.classList.remove('mic-status-error');
            }

            const deviceId = document.getElementById('micSelect').value;
            const normalizedDeviceId = deviceId === 'default' ? null : deviceId;
            this.testStream = await this.getMicrophoneStream(normalizedDeviceId);
            await this.refreshMicrophones(false);
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(this.testStream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 32;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            const bars = document.querySelectorAll('.test-bar');

            const updateBars = () => {
                if (!this.isTestingMic) {
                    audioContext.close();
                    return;
                }
                requestAnimationFrame(updateBars);
                analyser.getByteFrequencyData(dataArray);

                // Update bars based on volume
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / bufferLength;

                bars.forEach((bar, i) => {
                    // Create a wave effect
                    const val = dataArray[i] / 255;
                    bar.style.height = `${Math.max(10, val * 100)}%`;
                });
            };
            updateBars();

        } catch (e) {
            console.error("Test failed:", e);
            status.textContent = "Error accessing mic. Check permissions.";
            const deviceStatus = document.getElementById('micDeviceStatus');
            if (deviceStatus) {
                deviceStatus.textContent = 'Microphone access denied. Allow access to show device names.';
            }
            const micConfigSection = document.getElementById('micConfigSection');
            if (micConfigSection) {
                micConfigSection.classList.remove('mic-status-ok');
                micConfigSection.classList.add('mic-status-error');
            }
            this.stopMicTest();
        }
    }

    stopMicTest() {
        this.isTestingMic = false;
        const testBtn = document.getElementById('testMicBtn');
        const visualizer = document.getElementById('testVisualizer');
        const status = document.getElementById('micTestStatus');

        if (testBtn) {
            testBtn.classList.remove('testing');
            testBtn.innerHTML = '<span class="btn-icon">🎙️</span> Test Check';
        }
        if (visualizer) visualizer.classList.remove('active');
        if (status) status.textContent = "Click to test if your mic is working";

        if (this.testStream) {
            this.testStream.getTracks().forEach(track => track.stop());
            this.testStream = null;
        }
    }

    // Called ONCE at start of game
    // Called ONCE at start of game
    activateMicrophoneEngine() {
        if (!this.recognition) return;
        if (this.isRecognitionActive) return;

        this.setMicState('starting');

        try {
            this.recognition.start();
            console.log("🎤 Microphone Engine Activated");
        } catch (e) {
            if (e?.name !== 'InvalidStateError' && e?.error !== 'not-allowed' && e?.error !== 'service-not-allowed') {
                console.log("Mic already active or error:", e);
            }
        }
    }

    // "Open Gate" - Show Visuals
    startListening() {
        if (this.inputMode !== 'voice') return;
        this.isListeningForAnswer = true;
        this.lastSpeechResultAt = Date.now();
        this.setMicState('listening');
        this.toggleMicVisuals(true);

        const guessInput = document.getElementById('guessInput');
        const transcriptEl = document.getElementById('liveTranscript');

        if (guessInput) {
            guessInput.placeholder = "Say the car name...";
            guessInput.value = "";
            guessInput.focus();
        }

        if (transcriptEl) {
            transcriptEl.textContent = "Listening...";
            transcriptEl.classList.remove('hidden');
            transcriptEl.classList.add('active');
        }

        if (this.voiceSystem?.setListeningMode) {
            this.voiceSystem.setListeningMode(true);
        }

        this.startMicHealthMonitor();

        // Ensure engine is running
        this.activateMicrophoneEngine();
    }

    // "Close Gate" - Hide Visuals
    stopListening() {
        this.isListeningForAnswer = false;
        this.setMicState('ready');
        this.toggleMicVisuals(false);
        this.stopMicHealthMonitor();

        if (this.voiceSystem?.setListeningMode) {
            this.voiceSystem.setListeningMode(false);
        }

        const transcriptEl = document.getElementById('liveTranscript');
        if (transcriptEl) {
            transcriptEl.textContent = "";
            transcriptEl.classList.add('hidden');
            transcriptEl.classList.remove('active');
        }
    }

    toggleMicVisuals(isActive) {
        const micBtn = document.getElementById('micBtn');
        const micStatus = document.getElementById('micStatus');
        const guessInput = document.getElementById('guessInput');

        if (isActive) {
            if (micBtn) micBtn.classList.add('listening');
            if (micStatus) micStatus.classList.add('active');
            if (guessInput) guessInput.classList.add('listening-active');
        } else {
            if (micBtn) micBtn.classList.remove('listening');
            if (micStatus) micStatus.classList.remove('active');
            if (guessInput) guessInput.classList.remove('listening-active');
        }
    }

    generateChoices() {
        const choicesSection = document.getElementById('choicesSection');
        choicesSection.innerHTML = '';

        const correctCar = this.currentCar;
        // Get 3 distinct wrong cars
        let wrongCars = this.carDatabase.filter(c => c.name !== correctCar.name);
        wrongCars.sort(() => 0.5 - Math.random());
        let choices = wrongCars.slice(0, 3);

        // Add correct car and shuffle
        choices.push(correctCar);
        choices.sort(() => 0.5 - Math.random());

        choices.forEach(car => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = car.name;
            btn.addEventListener('click', () => {
                if (car.name === this.currentCar.name) {
                    this.handleCorrectGuess();
                } else {
                    this.handleIncorrectGuess(car.name);
                }
            });
            choicesSection.appendChild(btn);
        });
    }

    async initializeSpeech() {
        try {
            // Initialize the advanced voice system
            if (window.AdvancedVoiceSystem) {
                this.voiceSystem = new AdvancedVoiceSystem();
                await this.voiceSystem.init();
                this.speechSupported = true;
                console.log("✅ Advanced Voice System initialized!");
            } else {
                this.speechSupported = false;
                console.log("❌ Advanced Voice System not available");
            }
        } catch (err) {
            this.speechSupported = false;
            console.warn('Advanced voice system init error:', err);
        }
    }





    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const soundBtn = document.getElementById('soundToggle');

        if (this.soundEnabled) {
            soundBtn.textContent = '🔊';
            soundBtn.classList.remove('muted');
            if (this.voiceSystem) {
                this.voiceSystem.setEnabled(true);

            }
            if (this.currentScreen === 'startScreen' && document.getElementById('startScreen')?.classList.contains('menu-revealed')) {
                this.playMenuMusic();
            }
        } else {
            soundBtn.textContent = '🔇';
            soundBtn.classList.add('muted');
            if (this.voiceSystem) {
                this.voiceSystem.setEnabled(false);
            }
            this.stopMenuMusic();
        }
    }

    showStartScreen() {
        this.switchScreen('startScreen');
        const startScreen = document.getElementById('startScreen');
        const menuPanel = startScreen?.querySelector('.menu-panel');
        const clickHint = startScreen?.querySelector('.menu-click');
        const startBtn = document.getElementById('startBtn');

        if (startScreen) {
            startScreen.classList.remove('menu-revealed');
        }
        if (menuPanel) {
            menuPanel.setAttribute('aria-hidden', 'true');
        }
        if (clickHint) {
            clickHint.setAttribute('aria-hidden', 'false');
        }
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.removeAttribute('aria-disabled');
        }
        this.isStartingGame = false;
        this.stopMenuMusic();

    }

    startCountdown() {
        // Stop any previous AI speech (like the welcome message)
        if (this.voiceSystem) {
            this.voiceSystem.cancel();
        }

        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.setAttribute('aria-disabled', 'true');
        }

        this.switchScreen('countdownScreen');

        // Play the custom voice recording via VoiceSystem to ensure trackability/cancellation
        if (this.voiceSystem) {
            this.voiceSystem.playClip('assets/audio/voice/Start.mp3').catch(e => console.warn("Start audio failed:", e));
        } else {
            const startAudio = new Audio('assets/audio/voice/Start.mp3');
            startAudio.play().catch(e => console.warn("Audio playback failed:", e));
        }

        let count = 3;
        const countdownElement = document.getElementById('countdownNumber');

        // Initial visual state
        countdownElement.textContent = count;

        // Run visual countdown simultaneously with audio
        const countdownInterval = setInterval(() => {
            // Display current count (3, 2, 1) or prepare for GO
            if (count > 0) {
                countdownElement.textContent = count;
            }

            countdownElement.style.animation = 'none';

            // Trigger reflow and restart animation
            countdownElement.offsetHeight;
            countdownElement.style.animation = 'countdownPulse 1s ease-in-out';

            count--;

            if (count < 0) {
                clearInterval(countdownInterval);
                countdownElement.textContent = 'GO!';
                countdownElement.style.animation = 'countdownPulse 1s ease-in-out';

                setTimeout(() => this.startGame(), 500);
            }
        }, 1000);
    }

    startGame() {
        console.log("🎮 Starting game...");
        this.isGameRunning = true;
        this.isMicWarm = false;
        this.switchScreen('gameScreen');

        // One-time activation of the continuous mic engine
        this.activateMicrophoneEngine();

        this.loadNextCar();
    }

    switchScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });

        // Show target screen
        setTimeout(() => {
            document.getElementById(screenId).classList.remove('hidden');
        }, 100);

        this.currentScreen = screenId;
    }

    loadNextCar() {
        if (!this.isGameRunning) return;

        // Show loading state
        const carImage = document.getElementById('carImage');
        const loadingSpinner = document.querySelector('.loading-spinner');
        const questionText = document.getElementById('questionText');
        const answerText = document.getElementById('answerText');
        const guessInput = document.getElementById('guessInput');
        const timerFill = document.getElementById('timerFill');

        // Reset UI elements
        carImage.style.opacity = '0';
        loadingSpinner.style.display = 'block';
        answerText.classList.add('hidden');
        guessInput.value = '';
        guessInput.disabled = false;
        timerFill.style.width = '100%';

        // --- MODE SWITCHING UI ---
        const inputSection = document.getElementById('inputSection');
        const choicesSection = document.getElementById('choicesSection');
        const micBtn = document.getElementById('micBtn');

        if (this.inputMode === 'choice') {
            inputSection.classList.add('hidden');
            choicesSection.classList.remove('hidden');
            choicesSection.innerHTML = ''; // Clear old buttons
        } else {
            // Voice/Text mode
            inputSection.classList.remove('hidden');
            choicesSection.classList.add('hidden');
            if (micBtn) micBtn.classList.remove('hidden');

            // REMOVED SUBMIT BUTTON as it is redundant with Auto-Mic
            const submitBtn = document.getElementById('submitGuess');
            if (submitBtn) submitBtn.classList.add('hidden');
        }

        // Clear any existing timers
        if (this.answerTimer) {
            clearTimeout(this.answerTimer);
        }
        if (this.transitionTimer) {
            clearTimeout(this.transitionTimer);
        }
        if (this.nextCarTimer) {
            clearTimeout(this.nextCarTimer);
        }

        // Get random car
        this.currentCar = this.getRandomCar();

        // Ensure currentCar.images exists and is an array
        const images = this.currentCar.images || [this.currentCar.image];
        const randomImage = images[Math.floor(Math.random() * images.length)];

        // Load image with enhanced error handling
        const img = new Image();
        img.onload = () => {
            console.log(`✅ Successfully loaded: ${this.currentCar.name}`);
            carImage.src = img.src;
            carImage.style.opacity = '1';
            loadingSpinner.style.display = 'none';

            // Start the question phase
            this.startQuestionPhase();

            // Generate choices if needed
            if (this.inputMode === 'choice') {
                this.generateChoices();
            }
        };

        img.onerror = () => {
            console.log(`❌ Failed to load image for ${this.currentCar.name}, trying next car...`);
            // Get a different car and try again
            this.loadNextCar();
        };

        console.log(`🔄 Loading image for: ${this.currentCar.name} (${randomImage})`);
        img.src = randomImage;
    }

    getRandomCar() {
        // 1. If we have no cars left to show, refill the deck
        if (!this.availableCarIndices || this.availableCarIndices.length === 0) {
            console.log("🔄 Cycle complete! Reshuffling all cars for a fresh deck.");
            // Create array [0, 1, 2, ... N]
            this.availableCarIndices = this.carDatabase.map((_, index) => index);

            // Fisher-Yates Shuffle
            for (let i = this.availableCarIndices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.availableCarIndices[i], this.availableCarIndices[j]] =
                    [this.availableCarIndices[j], this.availableCarIndices[i]];
            }
        }

        // 2. Pop the next unique index
        const randomIndex = this.availableCarIndices.pop();
        const car = this.carDatabase[randomIndex];

        console.log(`🚗 Selected Car: ${car.name} (Index: ${randomIndex})`);
        console.log(`📚 Remaining in deck: ${this.availableCarIndices.length}`);

        return car;
    }

    startQuestionPhase() {
        const questionText = document.getElementById('questionText');
        questionText.textContent = "🤔 Can you guess this car?";

        // RESET FLAGS
        this.isProcessingGuess = false; // Reset lock
        document.getElementById('guessInput').disabled = false;

        // Speak the question with natural variation
        if (this.voiceSystem) {
            this.voiceSystem.setListeningMode(false);
            this.voiceSystem.sayQuestion().then(() => {
                // Safety delay helps avoid prompt bleed into speech recognition on phones/tablets.
                setTimeout(() => {
                    this.startListening();
                }, 1200);
            });
        }

        // Start timer for auto-reveal
        this.startTimer();

        // Auto-reveal answer after 15 seconds
        this.answerTimer = setTimeout(() => {
            if (!this.isProcessingGuess) {
                this.revealAnswer();
            }
        }, 15000);
    }

    startTimer() {
        const timerFill = document.getElementById('timerFill');
        let width = 100;

        // 15 seconds * 10 steps/sec = 150 steps
        // 100% / 150 steps = ~0.66% per step
        const decrement = 100 / 150;

        const timerInterval = setInterval(() => {
            width -= decrement;
            timerFill.style.width = width + '%';

            if (width <= 0) {
                clearInterval(timerInterval);
            }
        }, 100);

        // Store interval to clear it if needed
        this.timerInterval = timerInterval;
    }

    submitGuess() {
        // LOCKING MECHANISM: Prevent multiple submissions
        if (this.isProcessingGuess) return;
        this.isProcessingGuess = true;

        if (this.silenceTimer) clearTimeout(this.silenceTimer);

        const guessInput = document.getElementById('guessInput');

        // Disable immediately
        guessInput.disabled = true;

        const guess = guessInput.value.trim().toLowerCase();

        // If empty, just reveal (counts as skip/wrong)
        if (!guess) {
            this.revealAnswer();
            return;
        }

        this.checkGuess(guess);
    }

    checkGuess(guess) {
        // Stop timers
        if (this.answerTimer) clearTimeout(this.answerTimer);
        if (this.timerInterval) clearInterval(this.timerInterval);

        const isCorrect = this.isGuessCorrect(guess);

        if (isCorrect) {
            this.handleCorrectGuess();
        } else {
            this.handleIncorrectGuess(guess);
        }
    }

    isGuessCorrect(guess) {
        const car = this.currentCar;
        // 1. Clean and tokenize the guess
        const cleanGuess = guess.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
        const guessWords = cleanGuess.split(/\s+/).filter(w => w.length > 0);

        // 2. Identify Brand vs Model
        // Assumption: First word of name is Brand, rest is Model
        const nameParts = car.name.toLowerCase().split(/\s+/);
        const brand = nameParts[0];
        const modelParts = nameParts.slice(1); // can be empty for simple names like "BMW"

        // 3. Classify Targets
        let strongTargets = new Set();
        let weakTargets = new Set();

        // SMART CHECK: Is this the ONLY car of this brand in the database?
        // If so, saying just the brand should count as a win (Strong Match).
        const carsWithBrand = this.carDatabase.filter(c =>
            c.name.toLowerCase().split(/\s+/)[0] === brand
        );
        const isBrandUnique = carsWithBrand.length === 1;

        // Brand is always weak if there's a model AND other cars share this brand
        if (modelParts.length > 0 && !isBrandUnique) {
            weakTargets.add(brand);
            modelParts.forEach(p => strongTargets.add(p));
        } else {
            // If name is single word (BMW) OR brand is unique (Jeep), treat brand as Strong
            strongTargets.add(brand);
            modelParts.forEach(p => strongTargets.add(p)); // Add model parts too
        }

        // Process keywords
        car.keywords.forEach(k => {
            const kLower = k.toLowerCase();
            // If keyword is matching the brand...
            if (kLower === brand) {
                // Only demote to weak if we have a model AND brand is NOT unique
                if (modelParts.length > 0 && !isBrandUnique) {
                    weakTargets.add(kLower);
                } else {
                    strongTargets.add(kLower);
                }
            } else {
                strongTargets.add(kLower);
                // Also add parts of multi-word keywords as strong? 
                // Careful: "James Bond" -> "Bond" is strong.
                kLower.split(/\s+/).forEach(sub => {
                    if (sub !== brand) strongTargets.add(sub);
                });
            }
        });

        // Helper: Levenshtein Distance
        const getDistance = (a, b) => {
            if (a.length === 0) return b.length;
            if (b.length === 0) return a.length;
            const matrix = [];
            for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
            for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
            for (let i = 1; i <= b.length; i++) {
                for (let j = 1; j <= a.length; j++) {
                    if (b.charAt(i - 1) === a.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                    }
                }
            }
            return matrix[b.length][a.length];
        };

        const isMatch = (word, target) => {
            // Adaptive limit
            let maxEdits = 1;
            if (target.length > 4) maxEdits = 2;
            if (target.length > 8) maxEdits = 3;
            if (target.length < 3) return word === target;
            return getDistance(word, target) <= maxEdits;
        };

        // --- ACTUAL KEY WORD DETECTION SECTION ---
        if (car.actualWords && car.actualWords.length > 0) {
            console.log(`🔒 Rigid Check Mode for: ${car.name}`);
            const guessNorm = cleanGuess.trim();

            for (let word of car.actualWords) {
                const target = word.toLowerCase();

                // 1. Direct Include Check (Handles "It is a Toyota Tundra")
                if (guessNorm.includes(target)) {
                    console.log(`✅ Actual Word Match (Exact Inclusion): "${target}"`);
                    return true;
                }

                // 2. Fuzzy Match on the full phrase
                if (isMatch(guessNorm, target)) {
                    console.log(`✅ Actual Word Match (Fuzzy Full): "${target}"`);
                    return true;
                }
            }
            console.log("❌ Strict Mode: No match found.");
            return false;
        }
        // -----------------------------------------

        // 4. Evaluate Guess
        let hasStrongMatch = false;
        let hasWeakMatch = false;
        let unmatchedWordCount = 0;

        for (let gWord of guessWords) {
            if (gWord.length < 2) continue; // Skip noise

            let matched = false;

            // Check Strong
            for (let target of strongTargets) {
                if (isMatch(gWord, target)) {
                    hasStrongMatch = true;
                    matched = true;
                    console.log(`✅ Strong Match: "${gWord}" ~ "${target}"`);
                    break;
                }
            }

            if (matched) continue;

            // Check Weak
            for (let target of weakTargets) {
                if (isMatch(gWord, target)) {
                    hasWeakMatch = true;
                    matched = true;
                    console.log(`⚠️ Weak Match (Brand): "${gWord}" ~ "${target}"`);
                    break;
                }
            }

            if (!matched) {
                // If it's a common filler word, ignore it
                const fillers = ['the', 'is', 'it', 'its', 'a', 'an', 'car', 'this', 'guess', 'know', 'think', 'maybe'];
                if (!fillers.includes(gWord)) {
                    unmatchedWordCount++;
                }
            }
        }

        // 5. Decision Logic

        // CASE A: Strong Match Found -> WIN
        // e.g. "Tacoma", "Toyota Tacoma", "Red Tacoma"
        if (hasStrongMatch) {
            return true;
        }

        // CASE B: Concatenated Match (Strong) -> WIN
        // e.g. "Supercar"
        const guessNoSpaces = cleanGuess.replace(/\s+/g, '');
        for (let target of strongTargets) {
            const targetNoSpaces = target.replace(/\s+/g, '');
            if (targetNoSpaces.length < 4) continue;

            let maxEdits = 2;
            if (targetNoSpaces.length > 8) maxEdits = 3;

            if (getDistance(guessNoSpaces, targetNoSpaces) <= maxEdits) {
                console.log(`✅ Concatenated Strong Match: "${guessNoSpaces}" ~ "${targetNoSpaces}"`);
                return true;
            }
        }

        // CASE C: Only Weak Match Found
        // e.g. "Toyota" -> WIN (if simple)
        // e.g. "Toyota Tundra" -> FAIL (because "Tundra" is unmatched)
        if (hasWeakMatch) {
            // If the guess is just the brand (e.g. "Toyota"), we might want to prompt "Which Toyota?" 
            // But traditionally in this game, it might count as correct or just ignored. 
            // To prevent "Toyota Tundra" -> Correct, we MUST enforce no conflicts.

            if (unmatchedWordCount === 0) {
                // Pure Brand match ("It matches Toyota")
                // OPTIONAL: Return false to force them to say the model?
                // The user said "Please lets not make these mistakes".
                // If I say "Toyota", and it's a Tacoma, is that a mistake?
                // Usually yes. "Toyota" is too vague.
                // But for "Ferrari", it's distinct enough.

                // Heuristic: If there are OTHER cars with the same brand in the DB, "Toyota" is definitely insufficient.
                // Since we can't easily check the whole DB here, let's be strict:
                // If the car has a Model Name (modelParts.length > 0), then just "Brand" is NOT enough.

                if (modelParts.length > 0) {
                    console.log("❌ Brand match only, but Model required.");
                    return false;
                }

                console.log("✅ Brand Match Accepted (Single-word brand name)");
                return true;
            } else {
                console.log("❌ Weak/Brand Match REJECTED (Conflicting words found)");
                return false;
            }
        }

        return false;
    }

    handleCorrectGuess() {
        // Mute mic during celebration
        this.stopListening();

        this.score += 10;
        this.streak += 1;

        this.updateScore();
        this.showFeedback("🎉 Amazing! It IS a " + this.currentCar.name + "! 🎉", 'correct');

        // Use new sequence: Random Correct -> Car Voice
        if (this.voiceSystem) {
            // sayCorrectGuess replacement
            this.voiceSystem.playCorrectSequence(this.currentCar.voice).then(() => {
                // After sequence finishes, move to next car? 
                // Or wait a bit? The sequence includes the car name, so it acts as the reveal.
                this.nextCarTimer = setTimeout(() => {
                    this.loadNextCar();
                }, 2000);
            });
        }

        // Stop timers
        if (this.answerTimer) clearTimeout(this.answerTimer);
        if (this.timerInterval) clearInterval(this.timerInterval);


    }

    handleIncorrectGuess(guess) {
        // Mute mic during feedback
        this.stopListening();

        // Ensure input is locked (if entered via submitGuess, it's already locked, but good for safety)
        this.isProcessingGuess = true;

        const onComplete = () => {
            if (this.gameMode === 'continuous') {
                // Continuous Mode: Move to next car
                this.loadNextCar();
            } else {
                // Challenger Mode: Game Over
                this.gameOver();
            }
        };

        // Use new sequence: Random Wrong -> Car Voice
        if (this.voiceSystem) {
            console.log("🔊 Playing Wrong Sequence...");
            this.voiceSystem.playWrongSequence(this.currentCar.voice).then(() => {
                console.log("🔊 Sequence finished. Proceeding...");
                onComplete();
            });
        } else {
            // Fallback if no voice system
            setTimeout(() => onComplete(), 1000);
        }
    }

    showFeedback(message, type) {
        const feedback = document.getElementById('feedback');
        feedback.textContent = message;
        feedback.className = `feedback ${type}`;
        feedback.classList.remove('hidden');

        // Hide feedback after 3 seconds
        setTimeout(() => {
            feedback.classList.add('hidden');
        }, 3000);
    }

    // Adjusted revealAnswer - mainly for timeout reveals if user doesn't guess?
    revealAnswer() {
        // PREVENT RACE CONDITIONS: Lock immediately
        if (this.isProcessingGuess) return;
        this.isProcessingGuess = true;
        this.stopListening();

        // Time ran out or empty guess -> Game Over
        console.log("⏰ Time ran out! Mode:", this.gameMode);

        if (this.gameMode === 'continuous') {
            // Continuous Mode: Reveal -> Wrong Voice -> Next Car
            this.streak = 0; // Reset streak on timeout
            this.updateScore();

            const message = `Time's up! It was a ${this.currentCar.name}`;
            this.showFeedback(message, 'incorrect');

            // Force reveal of the car text immediately so they see it
            const input = document.getElementById('guessInput');
            if (input) input.value = this.currentCar.name;

            if (this.voiceSystem) {
                this.voiceSystem.playWrongSequence(this.currentCar.voice).then(() => {
                    setTimeout(() => this.loadNextCar(), 1500);
                });
            } else {
                setTimeout(() => this.loadNextCar(), 2000);
            }

        } else {
            // Challenger Mode: Game Over
            if (this.voiceSystem) {
                console.log("🔊 Playing Wrong Sequence (Timeout) before Game Over...");
                // Treat timeout as a wrong answer
                this.voiceSystem.playWrongSequence(this.currentCar.voice).then(() => {
                    console.log("🔊 Sequence finished. Now triggering Game Over.");
                    this.gameOver();
                });
            } else {
                setTimeout(() => this.gameOver(), 1000);
            }
        }
    }

    updateScore() {
        document.getElementById('scoreValue').textContent = this.score;
        document.getElementById('streakValue').textContent = this.streak;
    }

    resetGame() {
        this.score = 0;
        this.streak = 0;
        this.updateScore();
        this.isGameRunning = false;
        this.isMicWarm = false;

        if (this.recognition && this.isRecognitionActive) {
            try {
                this.recognition.stop();
            } catch (e) { }
        }

        this.stopMicHealthMonitor();
        this.setMicState('idle');
        this.recognitionRestartAttempts = 0;

        if (this.voiceSystem) {
            this.voiceSystem.cancel();
            if (this.voiceSystem.setListeningMode) {
                this.voiceSystem.setListeningMode(false);
            }
        }

        // Stop all timers
        if (this.answerTimer) clearTimeout(this.answerTimer);
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.nextCarTimer) clearTimeout(this.nextCarTimer);

        this.switchScreen('startScreen');
    }

    gameOver() {
        this.isGameRunning = false;
        this.stopMicHealthMonitor();
        this.setMicState('idle');

        // Stop all timers
        if (this.answerTimer) clearTimeout(this.answerTimer);
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.nextCarTimer) clearTimeout(this.nextCarTimer);

        // Stop Mic
        this.stopListening();
        if (this.voiceSystem) this.voiceSystem.cancel();

        // Save Score
        this.saveHighScores(this.score);

        // Update UI
        document.getElementById('finalScoreDisplay').textContent = this.score;
        this.updateLeaderboardUI();

        // Switch Screen
        this.switchScreen('gameOverScreen');
    }

    getHighScores() {
        try {
            const stored = localStorage.getItem('carGuessingLeaderboard');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn("Failed to load leaderboard", e);
        }
        return [];
    }

    saveHighScores(newScore) {
        if (newScore === 0) return; // Don't save zero scores? Or maybe we should? Let's skip 0.

        let scores = this.getHighScores();

        // Add new score
        const dateStr = new Date().toLocaleDateString();
        scores.push({ score: newScore, date: dateStr });

        // Sort descending
        scores.sort((a, b) => b.score - a.score);

        // Keep top 3
        scores = scores.slice(0, 3);

        localStorage.setItem('carGuessingLeaderboard', JSON.stringify(scores));
    }

    updateLeaderboardUI() {
        const list = document.getElementById('leaderboardList');
        if (!list) return;

        const scores = this.getHighScores();

        // Create HTML
        let html = '';
        const medals = ['🥇', '🥈', '🥉'];

        // Ensure we show 3 slots even if empty
        for (let i = 0; i < 3; i++) {
            const entry = scores[i];
            const rank = i + 1;
            const medal = medals[i];

            if (entry) {
                html += `
                    <div class="leaderboard-item">
                        <span>${medal} #${rank}</span>
                        <span>${entry.score} pts</span>
                    </div>
                `;
            } else {
                html += `
                    <div class="leaderboard-item" style="opacity: 0.5;">
                        <span>${medal} #${rank}</span>
                        <span>---</span>
                    </div>
                `;
            }
        }

        list.innerHTML = html;
    }
}

// Start the game when window loads
window.addEventListener('load', () => {
    window.game = new CarGuessingGame();
});
