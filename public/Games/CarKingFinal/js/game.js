// Kids Car Guessing Game - Main JavaScript File
const CAR_KING_MIC_PREF_SYNC = 'LAHS_CAR_KING_MIC_PREF_SYNC';
const CAR_KING_MIC_PREF_REQUEST = 'LAHS_CAR_KING_MIC_PREF_REQUEST';
const CAR_KING_MIC_PREF_SAVE = 'LAHS_CAR_KING_MIC_PREF_SAVE';
const CAR_KING_MIC_PREF_SAVE_RESULT = 'LAHS_CAR_KING_MIC_PREF_SAVE_RESULT';
const CAR_KING_SPEECH_CONTROL = 'LAHS_CAR_KING_SPEECH_CONTROL';
const CAR_KING_SPEECH_EVENT = 'LAHS_CAR_KING_SPEECH_EVENT';
const CAR_KING_VALID_MIC_PREFERENCES = new Set(['ask', 'session', 'always']);
const CAR_KING_CORRECT_POINTS = 10;

window.LAHSPointsBridge?.init({ gameId: 'math-car-king' });

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
        this.isAnswerAcceptanceOpen = false;
        this.micState = 'idle';
        this.recognitionRestartAttempts = 0;
        this.maxRecognitionRestarts = 3;
        this.recognitionHardResetAttempts = 0;
        this.maxRecognitionHardResets = 2;
        this.recognitionRecoveryWindowStartedAt = 0;
        this.recognitionRecoveryWindowMs = 9000;
        this.recognitionRestartCooldownMs = 650;
        this.pendingRecognitionRestartTimer = null;
        this.pendingRecognitionRestartReason = null;
        this.recognitionStartInFlight = false;
        this.recognitionStartTimeout = null;
        this.recognitionAbortRequested = false;
        this.recognitionHardResetInFlight = false;
        this.recognitionUiRefs = null;
        this.micBtnClickHandler = null;
        this.micTestBtnHandler = null;
        this.micDeviceChangeHandler = null;
        this.visibilityRecoveryHandlerBound = false;
        this.lastSpeechResultAt = 0;
        this.lastRecognitionStartAt = 0;
        this.lastRecognitionAudioAt = 0;
        this.lastRecognitionSpeechAt = 0;
        this.lastRecognitionAudioEndAt = 0;
        this.micHealthMonitorTimer = null;
        this.micNoSpeechTimeoutMs = 5500;
        this.micDeafGraceMs = 4200;
        this.selectedMicId = this.loadSelectedMicId();
        this.supportsContinuousRecognition = true;
        this.micAccessPreference = this.loadMicAccessPreference();
        this.pendingMicAction = null;
        this.hostBridgeInitialized = false;
        this.hostMicPreference = 'ask';
        this.hostUserId = null;
        this.hostSpeechAvailable = false;
        this.hostSpeechEngine = 'unsupported';
        this.hostSpeechSessionId = null;
        this.hostSpeechRoundId = null;
        this.hostSpeechLastOptions = null;
        this.hostSpeechSupportsLocalProcessing = false;
        this.hostSpeechOnDevice = false;
        this.hostSpeechLevel = 0;
        this.micPermissionDialogInitialized = false;
        this.startClipPath = 'assets/audio/voice/Start.mp3';
        this.startSequenceLeadInMs = 120;
        this.startSequenceCountdownMs = 4000;
        this.startSequenceGoHoldMs = 500;
        this.currentQuestionToken = 0;
        this.questionPreArmLeadMs = 700;
        this.answerWindowMs = 15000;
        this.startSequence = {
            token: 0,
            isActive: false,
            rafId: null,
            audioWatchdogTimer: null,
            audioStartAt: 0,
            timelineAnchorAt: 0,
            visualPhase: -1,
            fallbackAudio: null
        };


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
        this.setupHostBridge();
        this.setupRecognitionLifecycleHandlers();
        this.initMainMenu();
        this.showStartScreen();
        this.updateMicPreferenceSummary();

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

    sanitizeMicAccessPreference(value) {
        return CAR_KING_VALID_MIC_PREFERENCES.has(value) ? value : 'ask';
    }

    getHostTargetOrigin() {
        return window.location.origin && window.location.origin !== 'null'
            ? window.location.origin
            : '*';
    }

    isHostSpeechEnabled() {
        return Boolean(this.hostSpeechAvailable && window.parent && window.parent !== window);
    }

    buildSpeechContextualPhrasesForCar(car = this.currentCar) {
        if (!car) return [];

        const candidates = [
            car.name,
            ...(car.actualWords || []),
            ...(car.speechAliases || []),
            ...(car.contextualPhrases || []),
            ...(car.keywords || [])
        ];

        const seen = new Set();
        return candidates.filter((value) => {
            const normalized = `${value || ''}`.trim();
            if (!normalized) return false;

            const key = normalized.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, 24);
    }

    buildHostedSpeechSessionOptions() {
        const roundId = this.getHostedSpeechSessionId();
        return {
            roundId,
            language: 'en-US',
            partialResults: true,
            silenceMs: 1800,
            prewarmLeadMs: this.questionPreArmLeadMs,
            continuousHotMic: this.hostSpeechEngine === 'native',
            contextualPhrases: this.buildSpeechContextualPhrasesForCar()
        };
    }

    getHostedSpeechSessionId() {
        if (!this.hostSpeechSessionId) {
            this.hostSpeechSessionId = `host-session:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
        }

        return this.hostSpeechSessionId;
    }

    clearHostedSpeechSessionId() {
        this.hostSpeechSessionId = null;
    }

    postSpeechControlToHost(command, options = undefined) {
        if (!window.parent || window.parent === window) return;

        const payload = {
            type: CAR_KING_SPEECH_CONTROL,
            gameId: 'math-car-king',
            command
        };

        if (options) {
            payload.options = options;
        }

        try {
            window.parent.postMessage(payload, this.getHostTargetOrigin());
        } catch (err) {
            console.warn('Unable to post speech control to host app:', err);
        }
    }

    loadMicAccessPreference() {
        try {
            const sessionPreference = this.sanitizeMicAccessPreference(
                sessionStorage.getItem('carKingMicAccessPreferenceSession')
            );
            if (sessionPreference === 'session') {
                return 'session';
            }
        } catch (err) {
            console.warn('Unable to load microphone access preference:', err);
        }

        return 'ask';
    }

    persistMicAccessPreference(preference) {
        try {
            if (preference === 'session') {
                sessionStorage.setItem('carKingMicAccessPreferenceSession', 'session');
            } else {
                sessionStorage.removeItem('carKingMicAccessPreferenceSession');
            }
        } catch (err) {
            console.warn('Unable to persist microphone access preference:', err);
        }
    }

    setMicAccessPreference(preference, options = {}) {
        const { syncToHost = false } = options;
        const normalized = this.sanitizeMicAccessPreference(preference);
        this.micAccessPreference = normalized;
        this.persistMicAccessPreference(normalized);

        if (syncToHost) {
            const remotePreference = normalized === 'always' ? 'always' : 'ask';
            this.postMicPreferenceToHost(remotePreference);
        }

        this.updateMicPreferenceSummary();
    }

    updateMicPreferenceSummary(statusMessage = '') {
        const summaryEl = document.getElementById('micPreferenceSummary');
        const manageBtn = document.getElementById('micPreferenceManageBtn');
        if (!summaryEl && !manageBtn) return;

        let summary = 'Car King will ask before turning on the microphone until you choose a preference.';
        let buttonLabel = 'Choose Session or Always';

        if (this.micAccessPreference === 'always') {
            summary = 'Microphone access is remembered for this account when browser/site permission is available.';
            buttonLabel = 'Change Saved Preference';
        } else if (this.micAccessPreference === 'session') {
            summary = 'Microphone access stays on only for this browser session. You will be asked again next time.';
            buttonLabel = 'Switch Session or Always';
        }

        if (statusMessage) {
            summary = `${summary} ${statusMessage}`;
        }

        if (summaryEl) {
            summaryEl.textContent = summary;
        }
        if (manageBtn) {
            manageBtn.textContent = buttonLabel;
        }
    }

    setMicPermissionHelp(message = '', isError = false) {
        const helpEl = document.getElementById('micPermissionHelp');
        if (!helpEl) return;

        if (!message) {
            helpEl.textContent = '';
            helpEl.classList.add('hidden');
            helpEl.classList.remove('is-error');
            return;
        }

        helpEl.textContent = message;
        helpEl.classList.remove('hidden');
        helpEl.classList.toggle('is-error', Boolean(isError));
    }

    postMicPreferenceToHost(preference) {
        if (!window.parent || window.parent === window) return;

        try {
            window.parent.postMessage(
                {
                    type: CAR_KING_MIC_PREF_SAVE,
                    gameId: 'math-car-king',
                    preference: this.sanitizeMicAccessPreference(preference)
                },
                this.getHostTargetOrigin()
            );
        } catch (err) {
            console.warn('Unable to post microphone preference to host app:', err);
        }
    }

    setupHostBridge() {
        if (this.hostBridgeInitialized) return;
        this.hostBridgeInitialized = true;

        window.addEventListener('message', (event) => {
            if (!event?.data || typeof event.data !== 'object') return;
            if (event.origin && event.origin !== window.location.origin && event.origin !== 'null') return;

            const message = event.data;

            if (message.type === CAR_KING_SPEECH_EVENT) {
                this.handleHostedSpeechEvent(message);
                return;
            }

            if (message.type === CAR_KING_MIC_PREF_SYNC) {
                const preference = this.sanitizeMicAccessPreference(message.preference);
                this.hostMicPreference = preference;
                this.hostUserId = typeof message.userId === 'string' ? message.userId : null;

                if (preference === 'always') {
                    this.setMicAccessPreference('always');
                } else if (this.micAccessPreference !== 'session' && this.micAccessPreference !== 'always') {
                    this.setMicAccessPreference(preference);
                } else {
                    this.updateMicPreferenceSummary();
                }

                return;
            }

            if (message.type === CAR_KING_MIC_PREF_SAVE_RESULT) {
                if (message.success) {
                    const persistedMode = message.persisted === 'supabase' ? 'supabase' : 'local';
                    const savedPreference = this.sanitizeMicAccessPreference(
                        message.requestedPreference || message.preference || this.micAccessPreference
                    );
                    let saveMessage = 'Microphone preference updated.';

                    if (savedPreference === 'always') {
                        saveMessage = persistedMode === 'supabase'
                            ? 'Always-on microphone was saved to this account.'
                            : 'Always-on microphone was saved locally for testing.';
                    } else if (savedPreference === 'session') {
                        saveMessage = 'Session-only microphone access is active for this visit.';
                    } else if (savedPreference === 'ask') {
                        saveMessage = persistedMode === 'supabase'
                            ? 'Saved-account microphone memory was cleared for this user.'
                            : 'Saved-account microphone memory was cleared locally.';
                    }

                    this.setMicPermissionHelp(saveMessage, false);
                    this.updateMicPreferenceSummary(saveMessage);
                } else if (message.error) {
                    this.setMicPermissionHelp(message.error, true);
                }
            }
        });

        if (window.parent && window.parent !== window) {
            try {
                window.parent.postMessage(
                    {
                        type: CAR_KING_MIC_PREF_REQUEST,
                        gameId: 'math-car-king'
                    },
                    this.getHostTargetOrigin()
                );
            } catch (err) {
                console.warn('Unable to request microphone preference sync:', err);
            }
        }
    }

    initMicPermissionDialog() {
        if (this.micPermissionDialogInitialized) return;

        const overlay = document.getElementById('micPermissionOverlay');
        const sessionBtn = document.getElementById('micSessionOnlyBtn');
        const alwaysBtn = document.getElementById('micAlwaysOnBtn');
        const retryBtn = document.getElementById('micPermissionRetryBtn');
        const openSettingsBtn = document.getElementById('micPermissionOpenSettingsBtn');
        const closeBtn = document.getElementById('micPermissionCloseBtn');

        if (!overlay || !sessionBtn || !alwaysBtn || !retryBtn || !openSettingsBtn || !closeBtn) {
            return;
        }

        sessionBtn.addEventListener('click', async () => {
            await this.handleMicPreferenceSelection('session');
        });

        alwaysBtn.addEventListener('click', async () => {
            await this.handleMicPreferenceSelection('always');
        });

        retryBtn.addEventListener('click', async () => {
            const action = this.pendingMicAction || 'mic-settings';
            const granted = await this.prepareMicrophoneForAction(action);
            if (granted) {
                this.hideMicPermissionDialog();
            }
        });

        openSettingsBtn.addEventListener('click', async () => {
            const settingsOverlay = document.getElementById('settingsOverlay');
            if (settingsOverlay) {
                settingsOverlay.classList.add('visible');
            }
            await this.refreshMicrophones(false);
        });

        closeBtn.addEventListener('click', () => {
            this.hideMicPermissionDialog();
            this.pendingMicAction = null;
        });

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                this.hideMicPermissionDialog();
            }
        });

        this.micPermissionDialogInitialized = true;
    }

    showMicPreferenceDialog(action = 'preference-only') {
        this.initMicPermissionDialog();
        this.pendingMicAction = action;

        const overlay = document.getElementById('micPermissionOverlay');
        const titleEl = document.getElementById('micPermissionTitle');
        const messageEl = document.getElementById('micPermissionMessage');
        const choiceActions = document.getElementById('micPermissionChoiceActions');
        const retryActions = document.getElementById('micPermissionRetryActions');
        const closeBtn = document.getElementById('micPermissionCloseBtn');
        const deviceStatus = document.getElementById('micDeviceStatus');

        if (!overlay || !titleEl || !messageEl || !choiceActions || !retryActions || !closeBtn) {
            return;
        }

        titleEl.textContent = 'How should Car King use the microphone?';
        messageEl.textContent = 'Choose whether microphone access should stay on for this session only or be remembered for this account.';
        closeBtn.textContent = action === 'start-game' ? 'Cancel Start' : 'Not Now';
        choiceActions.classList.remove('hidden');
        retryActions.classList.add('hidden');
        this.setMicPermissionHelp('Car King only listens while voice mode is active.', false);
        if (deviceStatus) {
            deviceStatus.textContent = 'Choose whether microphone access should be session-only or always on for this account.';
            deviceStatus.style.color = 'var(--text-muted)';
        }

        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
    }

    showMicPermissionDiagnosis(action = 'mic-settings', permissionState = 'unknown', err = null) {
        this.initMicPermissionDialog();
        this.pendingMicAction = action;

        const overlay = document.getElementById('micPermissionOverlay');
        const titleEl = document.getElementById('micPermissionTitle');
        const messageEl = document.getElementById('micPermissionMessage');
        const choiceActions = document.getElementById('micPermissionChoiceActions');
        const retryActions = document.getElementById('micPermissionRetryActions');
        const closeBtn = document.getElementById('micPermissionCloseBtn');
        const deviceStatus = document.getElementById('micDeviceStatus');

        if (!overlay || !titleEl || !messageEl || !choiceActions || !retryActions || !closeBtn) {
            return;
        }

        let title = 'Microphone access is needed';
        let message = 'Turn on microphone permission for this app so Car King can hear spoken answers.';
        let help = 'After you allow microphone access in your browser or device settings, tap Try Again.';

        if (permissionState === 'denied') {
            title = 'Microphone access is turned off';
            message = 'Car King cannot start voice mode because microphone permission is blocked for this app.';
            help = 'Open your browser site settings, allow microphone access for this app, then return and tap Try Again.';
        } else if (err?.message === 'getUserMedia-not-supported') {
            title = 'This device cannot provide microphone access';
            message = 'The current browser or device does not expose the microphone tools Car King needs.';
            help = 'Try the latest Chrome, Edge, Safari, or another supported browser with microphone access enabled.';
        }

        titleEl.textContent = title;
        messageEl.textContent = message;
        closeBtn.textContent = action === 'start-game' ? 'Stay on Menu' : 'Not Now';
        choiceActions.classList.add('hidden');
        retryActions.classList.remove('hidden');
        this.setMicPermissionHelp(help, permissionState === 'denied');

        if (deviceStatus) {
            deviceStatus.textContent = permissionState === 'denied'
                ? 'Microphone blocked. Turn it on in browser/site settings for this game.'
                : message;
            deviceStatus.style.color = permissionState === 'denied' ? 'var(--accent)' : 'var(--text-muted)';
        }

        this.updateMicStatusMessage('Microphone permission is required before voice mode can start.');
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
    }

    hideMicPermissionDialog() {
        const overlay = document.getElementById('micPermissionOverlay');
        if (!overlay) return;

        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
        this.setMicPermissionHelp();
    }

    async queryMicrophonePermissionState() {
        if (this.isAudioStreamUsable(this.globalPermStream)) {
            this.micPermissionState = 'granted';
            this.micPermissionGranted = true;
            this.saveMicPermissionState();
            return 'granted';
        }

        if (navigator.permissions?.query) {
            try {
                const status = await navigator.permissions.query({ name: 'microphone' });
                this.micPermissionState = status.state;
                this.micPermissionGranted = status.state === 'granted';
                if (this.micPermissionGranted) {
                    this.saveMicPermissionState();
                }
                return status.state;
            } catch (err) {
                console.warn('Microphone permission query failed:', err);
            }
        }

        if (this.micPermissionGranted) {
            return 'granted';
        }

        return 'unknown';
    }

    async prepareMicrophoneForAction(action = 'mic-settings') {
        if (this.inputMode !== 'voice' && action !== 'preference-only') return true;
        if (this.isHostSpeechEnabled() && (action === 'start-game' || action === 'manual-mic')) {
            return true;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            const unsupportedError = new Error('getUserMedia-not-supported');
            this.showMicPermissionDiagnosis(action, 'unsupported', unsupportedError);
            return false;
        }

        const permissionState = await this.queryMicrophonePermissionState();

        if (permissionState === 'granted') {
            const ready = await this.ensureMicrophonePermissionForGame(true, {
                allowPrompt: false,
                reason: action,
                showDiagnostics: false
            });
            if (!ready) {
                this.showMicPermissionDiagnosis(action, await this.queryMicrophonePermissionState());
            }
            return ready;
        }

        if (permissionState === 'denied') {
            this.showMicPermissionDiagnosis(action, permissionState);
            return false;
        }

        if (this.micAccessPreference === 'ask') {
            this.showMicPreferenceDialog(action);
            return false;
        }

        const granted = await this.ensureMicrophonePermissionForGame(true, {
            allowPrompt: true,
            reason: action,
            showDiagnostics: true
        });

        if (!granted) {
            this.showMicPermissionDiagnosis(action, await this.queryMicrophonePermissionState());
            return false;
        }

        return true;
    }

    async handleMicPreferenceSelection(preference) {
        const normalized = this.sanitizeMicAccessPreference(preference);
        const pendingAction = this.pendingMicAction || 'preference-only';

        this.setMicAccessPreference(normalized, { syncToHost: true });

        if (normalized === 'session') {
            this.setMicPermissionHelp('Car King will remember microphone access only until this app session ends.', false);
        } else if (normalized === 'always') {
            this.setMicPermissionHelp('Saving always-on microphone preference for this account...', false);
        }

        if (pendingAction === 'preference-only') {
            this.pendingMicAction = null;
            this.hideMicPermissionDialog();
            return;
        }

        const permissionState = await this.queryMicrophonePermissionState();
        const granted = await this.ensureMicrophonePermissionForGame(true, {
            allowPrompt: permissionState !== 'granted',
            reason: pendingAction,
            showDiagnostics: true
        });

        if (!granted) {
            this.showMicPermissionDiagnosis(pendingAction, await this.queryMicrophonePermissionState());
            return;
        }

        this.pendingMicAction = null;
        this.hideMicPermissionDialog();

        if (pendingAction === 'start-game') {
            await this.handleStartGameClick();
        } else if (pendingAction === 'mic-test') {
            await this.startMicTest();
        } else if (pendingAction === 'mic-settings') {
            await this.refreshMicrophones(false);
        } else if (pendingAction === 'manual-mic') {
            this.resetRecognitionRecoveryState();
            this.startListening({ reason: 'manual-mic' });
        }
    }

    setupRecognitionLifecycleHandlers() {
        if (this.visibilityRecoveryHandlerBound) return;
        this.visibilityRecoveryHandlerBound = true;

        const tryRecoverMic = (reason) => {
            if (this.isHostSpeechEnabled() && this.isListeningForAnswer && this.hostSpeechLastOptions) {
                this.postSpeechControlToHost(
                    this.isAnswerAcceptanceOpen ? 'start' : 'prewarm',
                    this.hostSpeechLastOptions
                );
                return;
            }

            if (!this.shouldAutoRecoverRecognition()) return;
            this.restartRecognitionEngine(reason, { forceHardReset: true });
        };

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                tryRecoverMic('visibility-visible');
            }
        });

        window.addEventListener('pageshow', () => {
            tryRecoverMic('pageshow');
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

    releaseRecognitionStartLock() {
        if (this.recognitionStartTimeout) {
            clearTimeout(this.recognitionStartTimeout);
            this.recognitionStartTimeout = null;
        }
        this.recognitionStartInFlight = false;
    }

    clearPendingRecognitionRestart() {
        if (this.pendingRecognitionRestartTimer) {
            clearTimeout(this.pendingRecognitionRestartTimer);
            this.pendingRecognitionRestartTimer = null;
        }
        this.pendingRecognitionRestartReason = null;
    }

    resetRecognitionRecoveryState() {
        this.recognitionRestartAttempts = 0;
        this.recognitionHardResetAttempts = 0;
        this.recognitionRecoveryWindowStartedAt = 0;
    }

    shouldAutoRecoverRecognition() {
        if (this.isHostSpeechEnabled()) return false;
        if (this.inputMode !== 'voice') return false;
        if (!this.recognition && !this.recognitionUiRefs) return false;
        if (!(this.isGameRunning || this.isMicWarm)) return false;
        if (!(this.isListeningForAnswer || this.isMicWarm)) return false;
        if (document.visibilityState === 'hidden') return false;
        return true;
    }

    getRecognitionRecoveryStrategy(forceHardReset = false) {
        if (forceHardReset) {
            if (this.recognitionHardResetAttempts < this.maxRecognitionHardResets) {
                this.recognitionHardResetAttempts += 1;
                return 'hard';
            }
            return 'blocked';
        }

        const now = Date.now();
        if (
            !this.recognitionRecoveryWindowStartedAt ||
            (now - this.recognitionRecoveryWindowStartedAt) > this.recognitionRecoveryWindowMs
        ) {
            this.recognitionRecoveryWindowStartedAt = now;
            this.recognitionRestartAttempts = 0;
            this.recognitionHardResetAttempts = 0;
        }

        if (this.recognitionRestartAttempts < this.maxRecognitionRestarts) {
            this.recognitionRestartAttempts += 1;
            return 'soft';
        }

        if (this.recognitionHardResetAttempts < this.maxRecognitionHardResets) {
            this.recognitionHardResetAttempts += 1;
            return 'hard';
        }

        return 'blocked';
    }

    async rebuildSpeechRecognition(reason = 'hard-reset') {
        if (!this.recognitionUiRefs) return false;

        const { micBtn, guessInput } = this.recognitionUiRefs;
        const currentRecognition = this.recognition;

        this.recognitionHardResetInFlight = true;
        this.clearPendingRecognitionRestart();
        this.releaseRecognitionStartLock();
        this.recognitionAbortRequested = true;

        if (currentRecognition) {
            currentRecognition.onstart = null;
            currentRecognition.onend = null;
            currentRecognition.onresult = null;
            currentRecognition.onerror = null;
            currentRecognition.onaudiostart = null;
            currentRecognition.onaudioend = null;
            currentRecognition.onspeechstart = null;
            currentRecognition.onspeechend = null;

            try {
                currentRecognition.abort();
            } catch (err) {
                console.warn('Recognition abort during rebuild failed:', err);
            }
        }

        this.recognition = null;
        this.isRecognitionActive = false;

        const permissionReady = await this.ensureMicrophonePermissionForGame(true, {
            allowPrompt: true,
            reason: 'game',
            showDiagnostics: false
        });

        if (!permissionReady) {
            this.recognitionHardResetInFlight = false;
            this.recognitionAbortRequested = false;
            this.setMicState('error');
            this.updateMicStatusMessage('Microphone permission needed. Tap the mic to try again.');
            return false;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            this.recognitionHardResetInFlight = false;
            this.recognitionAbortRequested = false;
            return false;
        }

        this.createSpeechRecognitionInstance(micBtn, guessInput);
        this.recognitionHardResetInFlight = false;
        this.recognitionAbortRequested = false;

        if (this.shouldAutoRecoverRecognition()) {
            this.updateMicStatusMessage('Listening... mic refreshed.');
            this.activateMicrophoneEngine(`hard-reset-${reason}`);
        }

        return true;
    }

    restartRecognitionEngine(reason = 'unknown', options = {}) {
        const { forceHardReset = false } = options;

        if (!this.shouldAutoRecoverRecognition()) return;
        if (this.pendingRecognitionRestartTimer || this.recognitionHardResetInFlight) return;
        if (this.recognitionStartInFlight && !forceHardReset) return;

        const strategy = this.getRecognitionRecoveryStrategy(forceHardReset);
        if (strategy === 'blocked') {
            console.warn('🛑 Recognition recovery exhausted. Waiting for manual retry.');
            this.setMicState('error');
            this.updateMicStatusMessage('Microphone needs a quick reset. Tap the mic to try again.');
            return;
        }

        this.pendingRecognitionRestartReason = reason;
        const recoveryLabel = strategy === 'hard'
            ? `hard reset ${this.recognitionHardResetAttempts}/${this.maxRecognitionHardResets}`
            : `restart ${this.recognitionRestartAttempts}/${this.maxRecognitionRestarts}`;
        console.log(`🔄 Scheduling recognition ${recoveryLabel} due to: ${reason}`);

        this.pendingRecognitionRestartTimer = setTimeout(async () => {
            const scheduledReason = this.pendingRecognitionRestartReason || reason;
            this.pendingRecognitionRestartTimer = null;
            this.pendingRecognitionRestartReason = null;

            if (!this.shouldAutoRecoverRecognition()) return;

            if (strategy === 'hard') {
                this.updateMicStatusMessage('Try again, you still have time.');
                const rebuilt = await this.rebuildSpeechRecognition(scheduledReason);
                if (!rebuilt) {
                    this.setMicState('error');
                    this.updateMicStatusMessage('Microphone needs a quick reset. Tap the mic to try again.');
                }
                return;
            }

            this.updateMicStatusMessage('Listening... reconnecting mic.');
            this.activateMicrophoneEngine(`restart-${scheduledReason}`);
        }, this.recognitionRestartCooldownMs);
    }

    clearAnswerTimers() {
        if (this.answerTimer) {
            clearTimeout(this.answerTimer);
            this.answerTimer = null;
        }
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    handleHostedSpeechEvent(message) {
        if (!message || message.gameId && message.gameId !== 'math-car-king') {
            return;
        }

        if (message.event === 'availability') {
            this.hostSpeechAvailable = Boolean(message.available);
            this.hostSpeechEngine = typeof message.engine === 'string' ? message.engine : 'unsupported';
            this.hostSpeechSupportsLocalProcessing = Boolean(message.processLocally);
            this.hostSpeechOnDevice = Boolean(message.onDevice);
            this.supportsContinuousRecognition = this.hostSpeechAvailable || this.supportsContinuousRecognition;
            return;
        }

        if (message.roundId && message.roundId !== this.hostSpeechRoundId) {
            return;
        }

        if (message.event === 'state') {
            if (message.state) {
                this.setMicState(message.state === 'prewarming' ? 'starting' : message.state);
            }
            if (message.message && this.isListeningForAnswer) {
                this.updateMicStatusMessage(message.message);
            }
            return;
        }

        if (message.event === 'level') {
            this.hostSpeechLevel = Number(message.level) || 0;
            return;
        }

        if (message.event === 'partial' || message.event === 'final') {
            this.consumeHostedSpeechSnapshot({
                candidates: Array.isArray(message.matches) ? message.matches : [],
                displayText: message.text || (Array.isArray(message.matches) ? message.matches[0] : '') || '',
                buffered: Boolean(message.buffered),
                isFinal: message.event === 'final'
            });
            return;
        }

        if (message.event === 'error') {
            this.setMicState('error');
            this.updateMicStatusMessage(message.message || 'Microphone needs attention.');
        }
    }

    consumeHostedSpeechSnapshot(snapshot) {
        if (!this.isListeningForAnswer) return;

        const displayedSpeech = snapshot.displayText || snapshot.candidates[0] || '';
        const formatted = this.formatTranscriptForDisplay(displayedSpeech);
        const input = document.getElementById('guessInput');

        if (formatted && input) {
            input.value = formatted;
            input.classList.add('listening-active');
        }

        if (!this.isAnswerAcceptanceOpen) {
            return;
        }

        const now = Date.now();
        this.lastSpeechResultAt = now;
        this.lastRecognitionSpeechAt = now;

        if (formatted) {
            this.updateListeningTranscript(`I heard "${formatted}".${snapshot.buffered ? ' You started early, nice job!' : snapshot.isFinal ? '' : ' Keep going!'}`);
        }

        const match = this.getGuessMatchResult(snapshot.candidates);
        if (match.matched) {
            if (input) {
                input.value = this.currentCar.name;
            }
            this.updateListeningTranscript(`I heard "${this.currentCar.name}"!`);
            this.submitGuess();
            return;
        }

        if (!formatted) {
            this.updateListeningTranscript('Listening... say the car name when you are ready.');
        }
    }

    startMicHealthMonitor() {
        if (this.isHostSpeechEnabled()) {
            return;
        }

        this.stopMicHealthMonitor();
        this.micHealthMonitorTimer = setInterval(() => {
            if (!this.isListeningForAnswer || !this.isGameRunning) return;
            if (document.visibilityState === 'hidden') return;
            if (this.recognitionHardResetInFlight) return;
            if (this.pendingRecognitionRestartTimer) return;

            if (!this.isRecognitionActive) {
                if (!this.recognitionStartInFlight) {
                    console.warn('🎤 Recognition became inactive while listening was expected. Restarting recognition engine.');
                    this.restartRecognitionEngine('health-check-inactive');
                }
                return;
            }

            if (!this.isAnswerAcceptanceOpen) return;

            const now = Date.now();
            const hasCaptureStarted = this.lastRecognitionAudioAt >= this.lastRecognitionStartAt;
            const sinceGateOpened = now - this.lastSpeechResultAt;
            const sinceRecognitionStart = now - this.lastRecognitionStartAt;

            if (!hasCaptureStarted && sinceRecognitionStart > this.micDeafGraceMs) {
                console.warn('🎤 Recognition stayed active without audio capture. Forcing hard reset.');
                this.restartRecognitionEngine('health-check-deaf', { forceHardReset: true });
                return;
            }

            if (
                hasCaptureStarted &&
                this.lastRecognitionAudioEndAt > this.lastRecognitionAudioAt &&
                sinceGateOpened > this.micNoSpeechTimeoutMs
            ) {
                console.warn('🎤 Recognition lost audio capture while the round was still active. Forcing hard reset.');
                this.restartRecognitionEngine('health-check-audio-ended', { forceHardReset: true });
            }
        }, 1500);
    }

    stopMicHealthMonitor() {
        if (this.micHealthMonitorTimer) {
            clearInterval(this.micHealthMonitorTimer);
            this.micHealthMonitorTimer = null;
        }
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
                if (this.isTestingMic) {
                    this.stopMicTest();
                }
                if (this.isHostSpeechEnabled()) {
                    await this.warmStartRecognition();
                    settingsOverlay.classList.remove('visible');
                    return;
                }

                const permissionReady = await this.ensureMicrophonePermissionForGame(false, {
                    allowPrompt: false,
                    reason: 'settings-close',
                    showDiagnostics: false
                });
                if (permissionReady) {
                    await this.warmStartRecognition();
                }
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
        if (this.isTestingMic) {
            this.stopMicTest();
        }
        if (this.inputMode === 'voice') {
            if (!this.isHostSpeechEnabled()) {
                const micReady = await this.prepareMicrophoneForAction('start-game');
                if (!micReady) {
                    this.isStartingGame = false;
                    return;
                }

                await this.refreshMicrophones(false);
                await this.warmStartRecognition();
            } else {
                this.getHostedSpeechSessionId();
                this.setMicState('ready');
            }
        }
        if (this.voiceSystem?.preloadClip) {
            try {
                await this.voiceSystem.preloadClip(this.startClipPath);
            } catch (err) {
                console.warn('Start clip preload failed:', err);
            }
        }
        const startGame = () => {
            this.startCountdown();
        };
        if (this.menuMusic && !this.menuMusic.paused) {
            this.fadeOutMenuMusic().then(startGame);
        } else {
            startGame();
        }
    }

    createStartSequenceToken() {
        this.startSequence.token += 1;
        return this.startSequence.token;
    }

    clearStartSequenceTimers() {
        if (this.startSequence.rafId) {
            cancelAnimationFrame(this.startSequence.rafId);
            this.startSequence.rafId = null;
        }
        if (this.startSequence.audioWatchdogTimer) {
            clearTimeout(this.startSequence.audioWatchdogTimer);
            this.startSequence.audioWatchdogTimer = null;
        }
    }

    invalidateStartSequence(reason = 'unknown', options = {}) {
        const { forceCancelAudio = false } = options;
        this.clearStartSequenceTimers();
        this.startSequence.isActive = false;
        this.startSequence.visualPhase = -1;
        this.startSequence.audioStartAt = 0;
        this.startSequence.timelineAnchorAt = 0;

        if (this.startSequence.fallbackAudio) {
            try {
                this.startSequence.fallbackAudio.pause();
                this.startSequence.fallbackAudio.currentTime = 0;
            } catch (e) { }
            this.startSequence.fallbackAudio = null;
        }

        if (forceCancelAudio && this.voiceSystem?.cancel) {
            this.voiceSystem.cancel({ force: true });
        }

        if (reason) {
            console.log(`🧩 Start sequence invalidated: ${reason}`);
        }
    }

    animateCountdownStep(countdownElement, value) {
        if (!countdownElement) return;
        countdownElement.textContent = value;
        countdownElement.style.animation = 'none';
        countdownElement.offsetHeight;
        countdownElement.style.animation = 'countdownPulse 1s ease-in-out';
    }

    renderStartSequenceFrame(token, now) {
        if (!this.startSequence.isActive || token !== this.startSequence.token) return;

        const countdownElement = document.getElementById('countdownNumber');
        if (!countdownElement) {
            this.invalidateStartSequence('countdown-element-missing', { forceCancelAudio: true });
            return;
        }

        const elapsed = Math.max(0, now - this.startSequence.timelineAnchorAt);
        let nextPhase = 0;
        if (elapsed >= 3000) nextPhase = 3;
        else if (elapsed >= 2000) nextPhase = 2;
        else if (elapsed >= 1000) nextPhase = 1;

        // Drift-safe phase snapping: always render from elapsed bucket, never increment blindly.
        if (nextPhase !== this.startSequence.visualPhase) {
            this.startSequence.visualPhase = nextPhase;
            if (nextPhase === 0) this.animateCountdownStep(countdownElement, '3');
            else if (nextPhase === 1) this.animateCountdownStep(countdownElement, '2');
            else if (nextPhase === 2) this.animateCountdownStep(countdownElement, '1');
            else this.animateCountdownStep(countdownElement, 'GO!');
        }

        const doneAt = this.startSequenceCountdownMs + this.startSequenceGoHoldMs;
        if (elapsed >= doneAt) {
            this.clearStartSequenceTimers();
            this.startSequence.isActive = false;
            this.startGame();
            return;
        }

        this.startSequence.rafId = requestAnimationFrame((frameNow) => {
            this.renderStartSequenceFrame(token, frameNow);
        });
    }

    armStartAudioWatchdog(token) {
        this.startSequence.audioWatchdogTimer = setTimeout(() => {
            if (!this.startSequence.isActive || token !== this.startSequence.token) return;

            // If audio start callback was missed on this device/browser, keep timeline stable.
            if (!this.startSequence.audioStartAt) {
                console.warn('⏱️ Start audio onplaying callback delayed/missed. Using pre-anchored timeline.');
            }
        }, 550);
    }

    createSpeechRecognitionInstance(micBtn, guessInput) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            return null;
        }

        const recognition = new SpeechRecognition();
        const isIOS = !!window.deviceIntelligence?.device?.isIOS;

        recognition.continuous = !isIOS;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognition.lang = 'en-US';

        this.recognition = recognition;
        this.recognitionUiRefs = { micBtn, guessInput };
        this.setupRecognitionHandlers(micBtn, guessInput);

        return recognition;
    }

    setupSpeechRecognition(micBtn, guessInput) {
        const localSpeechSupported = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);

        this.recognitionUiRefs = { micBtn, guessInput };

        // SINGLETON PATTERN: Only create if doesn't exist
        if (!this.recognition && localSpeechSupported) {
            this.createSpeechRecognitionInstance(micBtn, guessInput);
        }
        this.supportsContinuousRecognition = localSpeechSupported || this.isHostSpeechEnabled();

        // Manual toggle
        // Ensure we do not stack duplicate click listeners across re-inits.
        if (this.micBtnClickHandler) {
            micBtn.removeEventListener('click', this.micBtnClickHandler);
        }
        this.micBtnClickHandler = () => {
            if (this.isListeningForAnswer) {
                this.stopListening();
                document.getElementById('guessInput').placeholder = "Mic Paused";
            } else {
                if (this.isHostSpeechEnabled()) {
                    this.resetRecognitionRecoveryState();
                    this.startListening({ reason: 'manual-mic' });
                    return;
                }

                this.prepareMicrophoneForAction('manual-mic').then((granted) => {
                    if (!granted) return;
                    this.resetRecognitionRecoveryState();
                    this.startListening({ reason: 'manual-mic' });
                });
            }
        };
        micBtn.addEventListener('click', this.micBtnClickHandler);

        // Initialize Settings Logic safely
        this.initMicSettings();
    }

    setupRecognitionHandlers(micBtn, guessInput) {
        this.recognition.onstart = () => {
            console.log("🎤 Mic started");
            this.recognitionAbortRequested = false;
            this.isRecognitionActive = true;
            this.clearPendingRecognitionRestart();
            this.releaseRecognitionStartLock();
            this.setMicState('listening');
            this.resetRecognitionRecoveryState();
            this.lastRecognitionStartAt = Date.now();
            this.lastRecognitionAudioAt = 0;
            this.lastRecognitionAudioEndAt = 0;
            this.lastRecognitionSpeechAt = this.lastRecognitionStartAt;
            if (this.isAnswerAcceptanceOpen) {
                this.lastSpeechResultAt = this.lastRecognitionStartAt;
            }
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

        this.recognition.onaudiostart = () => {
            this.lastRecognitionAudioAt = Date.now();
        };

        this.recognition.onaudioend = () => {
            this.lastRecognitionAudioEndAt = Date.now();
        };

        this.recognition.onspeechstart = () => {
            const now = Date.now();
            this.lastRecognitionSpeechAt = now;
            if (this.isAnswerAcceptanceOpen) {
                this.lastSpeechResultAt = now;
            }
        };

        this.recognition.onspeechend = () => {
            this.lastRecognitionSpeechAt = Date.now();
        };

        this.recognition.onend = () => {
            console.log("🎤 Mic stopped");
            const intentionalAbort = this.recognitionAbortRequested;
            this.recognitionAbortRequested = false;
            this.isRecognitionActive = false;
            this.releaseRecognitionStartLock();
            if (!this.isListeningForAnswer) {
                this.setMicState('ready');
            }

            if (!this.isGameRunning) {
                this.toggleMicVisuals(false);
            }

            if (document.visibilityState === 'hidden') {
                return;
            }

            if (!intentionalAbort && this.shouldAutoRecoverRecognition()) {
                this.restartRecognitionEngine('onend');
            }
        };

        this.recognition.onresult = (event) => {
            if (!this.isListeningForAnswer) return;
            const speechSnapshot = this.buildSpeechCandidatesFromEvent(event);
            const displayedSpeech = speechSnapshot.displayText || speechSnapshot.candidates[0] || '';
            const formatted = this.formatTranscriptForDisplay(displayedSpeech);
            const input = document.getElementById('guessInput');

            if (formatted && input) {
                input.value = formatted;
                input.classList.add('listening-active');
            }

            if (!this.isAnswerAcceptanceOpen) {
                return;
            }

            const now = Date.now();
            this.lastSpeechResultAt = now;
            this.lastRecognitionSpeechAt = now;

            if (formatted) {
                this.updateListeningTranscript(`I heard "${formatted}".`);
            }

            const match = this.getGuessMatchResult(speechSnapshot.candidates);
            if (match.matched) {
                console.log("✅ Keyword Detected! Immediate Submit.");
                if (input) {
                    input.value = this.currentCar.name;
                }
                this.updateListeningTranscript(`I heard "${this.currentCar.name}"!`);
                this.submitGuess();
                return;
            }

            if (formatted) {
                this.updateListeningTranscript(`I heard "${formatted}". Keep going!`);
            } else {
                this.updateListeningTranscript('Listening... say the car name when you are ready.');
            }
        };

        this.recognition.onerror = (event) => {
            this.releaseRecognitionStartLock();
            if (event.error !== 'no-speech') {
                console.warn("Mic Error:", event.error);
            }

            const intentionalAbort = this.recognitionAbortRequested && event.error === 'aborted';
            if (intentionalAbort) {
                this.recognitionAbortRequested = false;
                return;
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
                this.stopListening();
                return;
            }

            if (document.visibilityState === 'hidden') {
                return;
            }

            if (event.error === 'aborted' || event.error === 'network' || event.error === 'no-speech') {
                this.restartRecognitionEngine(`error-${event.error}`);
                return;
            }

            this.restartRecognitionEngine(`error-${event.error}`, { forceHardReset: true });
        };
    }

    // --- NEW MICROPHONE SETTINGS & TESTING ---
    async initMicSettings() {
        const micSelect = document.getElementById('micSelect');
        const testBtn = document.getElementById('testMicBtn');
        const showNamesBtn = document.getElementById('showMicNamesBtn');
        const managePreferenceBtn = document.getElementById('micPreferenceManageBtn');
        const micConfigSection = document.getElementById('micConfigSection');

        if (!micSelect || !testBtn || !showNamesBtn || !managePreferenceBtn || !micConfigSection) return;

        this.initMicPermissionDialog();

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

                    const granted = await this.prepareMicrophoneForAction('mic-settings');
                    if (!granted) {
                        return;
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

            managePreferenceBtn.addEventListener('click', () => {
                this.showMicPreferenceDialog('preference-only');
            });

            if (navigator.mediaDevices?.addEventListener) {
                this.micDeviceChangeHandler = this.micDeviceChangeHandler || (() => {
                    this.refreshMicrophones(false);
                });
                navigator.mediaDevices.addEventListener('devicechange', this.micDeviceChangeHandler);
            }

            this.micDevicesInitialized = true;
        }

        await this.refreshMicrophones(false);

        // 2. Test Logic
        if (this.micTestBtnHandler) {
            testBtn.removeEventListener('click', this.micTestBtnHandler);
        }
        this.micTestBtnHandler = () => {
            if (this.isTestingMic) {
                this.stopMicTest();
            } else {
                this.startMicTest();
            }
        };
        testBtn.addEventListener('click', this.micTestBtnHandler);
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
        if (this.isHostSpeechEnabled()) {
            this.isMicWarm = true;
            this.setMicState('warming');
            return;
        }
        if (!this.recognition) return;
        if (this.isRecognitionActive) return;

        this.isMicWarm = true;
        this.setMicState('warming');

        try {
            await this.activateMicrophoneEngine('warm-start');
        } catch (err) {
            if (err?.error !== 'not-allowed' && err?.error !== 'service-not-allowed') {
                console.warn('Mic warm start failed:', err);
            }
        }
    }

    async ensureMicrophonePermissionForGame(force = false, options = {}) {
        const {
            allowPrompt = force,
            reason = 'game',
            showDiagnostics = force
        } = options;

        if (!force && this.inputMode !== 'voice') return true;
        if (!navigator.mediaDevices?.getUserMedia) return false;

        // Reuse an already-active stream to avoid repeated permission prompts.
        if (this.globalPermStream?.active) {
            this.micPermissionGranted = true;
            this.saveMicPermissionState();
            return true;
        }

        const permissionState = await this.queryMicrophonePermissionState();

        if (permissionState === 'denied') {
            this.micPermissionGranted = false;
            this.saveMicPermissionState();
            if (showDiagnostics) {
                this.showMicPermissionDiagnosis(reason, permissionState);
            }
            return false;
        }

        if (!allowPrompt && permissionState !== 'granted') {
            return false;
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
                this.updateMicPreferenceSummary();
                return true;
            } catch (err) {
                console.warn('Microphone permission request failed:', err);
                this.micPermissionGranted = false;
                this.saveMicPermissionState();
                if (showDiagnostics) {
                    const blockedState = err?.name === 'NotAllowedError'
                        ? 'denied'
                        : await this.queryMicrophonePermissionState();
                    this.showMicPermissionDiagnosis(reason, blockedState, err);
                }
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
            const granted = await this.prepareMicrophoneForAction('mic-test');
            if (!granted) {
                return;
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

    // Called once when game flow needs the recognition engine active.
    async activateMicrophoneEngine(reason = 'manual-start') {
        if (this.inputMode !== 'voice') return;
        if (this.isHostSpeechEnabled()) {
            this.isMicWarm = true;
            this.setMicState(this.isAnswerAcceptanceOpen ? 'listening' : 'starting');
            return;
        }
        if (!this.recognition && this.recognitionUiRefs) {
            this.createSpeechRecognitionInstance(this.recognitionUiRefs.micBtn, this.recognitionUiRefs.guessInput);
        }
        if (!this.recognition) return;
        if (this.isRecognitionActive) return;
        if (document.visibilityState === 'hidden') return;
        if (this.recognitionStartInFlight || this.recognitionHardResetInFlight) return;

        this.recognitionStartInFlight = true;
        if (this.recognitionStartTimeout) {
            clearTimeout(this.recognitionStartTimeout);
        }
        this.recognitionStartTimeout = setTimeout(() => {
            this.recognitionStartTimeout = null;
            this.recognitionStartInFlight = false;
        }, 1800);

        const permissionReady = await this.ensureMicrophonePermissionForGame();
        if (!permissionReady) {
            this.releaseRecognitionStartLock();
            this.setMicState('error');
            this.updateMicStatusMessage('Microphone permission needed. Tap mic button to retry.');
            return;
        }

        this.setMicState('starting');
        this.recognitionAbortRequested = false;

        try {
            this.recognition.start();
            console.log(`🎤 Microphone Engine Activated (${reason})`);
        } catch (e) {
            this.releaseRecognitionStartLock();
            if (e?.name === 'InvalidStateError') {
                return;
            }
            if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
                this.setMicState('error');
                this.updateMicStatusMessage('Microphone permission blocked. Check browser settings.');
                return;
            }
            if (this.shouldAutoRecoverRecognition()) {
                this.restartRecognitionEngine(`start-failed-${reason}`, { forceHardReset: true });
            } else if (e?.name !== 'InvalidStateError' && e?.error !== 'not-allowed' && e?.error !== 'service-not-allowed') {
                console.log("Mic already active or error:", e);
            }
        }
    }

    updateListeningTranscript(message) {
        const transcriptEl = document.getElementById('liveTranscript');
        if (!transcriptEl) return;
        transcriptEl.textContent = message;
        transcriptEl.classList.remove('hidden');
        transcriptEl.classList.add('active');
    }

    beginAnswerWindow() {
        this.clearAnswerTimers();
        this.lastSpeechResultAt = Date.now();
        this.startTimer();
        this.answerTimer = setTimeout(() => {
            if (!this.isProcessingGuess) {
                this.revealAnswer();
            }
        }, this.answerWindowMs);
    }

    openListeningGate(reason = 'question-ended') {
        if (this.inputMode !== 'voice') return;

        if (!this.isListeningForAnswer) {
            this.startListening({ deferAcceptance: false, reason });
            return;
        }

        if (this.isAnswerAcceptanceOpen) return;

        this.isAnswerAcceptanceOpen = true;
        this.lastSpeechResultAt = Date.now();
        this.setMicState('listening');
        this.updateListeningTranscript('Listening... say the car name.');

        const guessInput = document.getElementById('guessInput');
        if (guessInput) {
            guessInput.placeholder = "Say the car name...";
            guessInput.focus();
        }

        if (this.isHostSpeechEnabled() && this.hostSpeechLastOptions) {
            this.postSpeechControlToHost('start', this.hostSpeechLastOptions);
        }

        this.beginAnswerWindow();
    }

    // "Open Gate" - Show Visuals
    startListening(options = {}) {
        if (this.inputMode !== 'voice') return;

        const {
            deferAcceptance = false,
            reason = 'manual-start'
        } = options;
        const hostedSpeech = this.isHostSpeechEnabled();

        this.isListeningForAnswer = true;
        this.isAnswerAcceptanceOpen = !deferAcceptance;
        this.clearPendingRecognitionRestart();
        this.setMicState(deferAcceptance ? 'starting' : 'listening');
        this.toggleMicVisuals(true);
        this.hostSpeechLastOptions = this.buildHostedSpeechSessionOptions();
        this.hostSpeechRoundId = this.hostSpeechLastOptions.roundId;

        const guessInput = document.getElementById('guessInput');

        if (guessInput) {
            guessInput.placeholder = deferAcceptance ? "Get ready to answer..." : "Say the car name...";
            guessInput.value = "";
            guessInput.focus();
        }

        this.updateListeningTranscript(deferAcceptance ? 'Get ready... the mic is opening early for you.' : 'Listening... say the car name.');

        if (this.voiceSystem?.setListeningMode) {
            this.voiceSystem.setListeningMode(true);
        }

        if (hostedSpeech) {
            this.isMicWarm = true;
            this.postSpeechControlToHost(
                deferAcceptance ? 'prewarm' : 'start',
                this.hostSpeechLastOptions
            );
            if (this.isAnswerAcceptanceOpen) {
                this.beginAnswerWindow();
            }
            return;
        }

        this.startMicHealthMonitor();
        if (this.isAnswerAcceptanceOpen) {
            this.beginAnswerWindow();
        }

        // Ensure engine is running
        this.activateMicrophoneEngine(reason);
    }

    // "Close Gate" - Hide Visuals
    stopListening(options = {}) {
        const {
            preserveHostSession = this.isHostSpeechEnabled() && this.isGameRunning
        } = options;

        this.isListeningForAnswer = false;
        this.isAnswerAcceptanceOpen = false;
        this.currentQuestionToken += 1;
        this.clearPendingRecognitionRestart();
        this.clearAnswerTimers();
        this.releaseRecognitionStartLock();
        this.setMicState('ready');
        this.toggleMicVisuals(false);
        this.stopMicHealthMonitor();

        if (this.voiceSystem?.setListeningMode) {
            this.voiceSystem.setListeningMode(false);
        }

        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }

        if (this.isHostSpeechEnabled()) {
            const hostControlOptions = this.hostSpeechSessionId
                ? {
                    ...(this.hostSpeechLastOptions || this.buildHostedSpeechSessionOptions()),
                    roundId: this.hostSpeechSessionId,
                    keepAlive: preserveHostSession
                }
                : this.hostSpeechLastOptions;

            this.postSpeechControlToHost(preserveHostSession ? 'abort' : 'stop', hostControlOptions);
            this.hostSpeechRoundId = null;
            this.hostSpeechLastOptions = null;
            if (!preserveHostSession) {
                this.clearHostedSpeechSessionId();
            }
        }

        if (this.recognition) {
            this.recognitionAbortRequested = true;
            try {
                this.recognition.abort();
            } catch (err) {
                console.warn('Recognition abort failed during stopListening:', err);
            }
        }

        const transcriptEl = document.getElementById('liveTranscript');
        if (transcriptEl) {
            transcriptEl.textContent = '';
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
        if (this.startSequence.isActive) return;

        // Stop any previous AI speech (like the welcome message)
        if (this.voiceSystem) {
            this.voiceSystem.cancel({ force: true });
        }

        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.setAttribute('aria-disabled', 'true');
        }

        this.switchScreen('countdownScreen');
        const countdownElement = document.getElementById('countdownNumber');
        if (!countdownElement) {
            this.isStartingGame = false;
            this.startGame();
            return;
        }

        const token = this.createStartSequenceToken();
        this.startSequence.isActive = true;
        this.startSequence.visualPhase = -1;

        const anchorAt = performance.now() + this.startSequenceLeadInMs;
        this.startSequence.timelineAnchorAt = anchorAt;

        this.animateCountdownStep(countdownElement, '3');
        this.startSequence.visualPhase = 0;

        this.startSequence.rafId = requestAnimationFrame((frameNow) => {
            this.renderStartSequenceFrame(token, frameNow);
        });

        this.armStartAudioWatchdog(token);

        // Play Start.mp3 in protected mode so it cannot be cut by intermediate cancel calls.
        if (this.voiceSystem?.playClip) {
            this.voiceSystem.playClip(this.startClipPath, {
                protectFromCancel: true,
                forceCancelExisting: true,
                reusePreloaded: true,
                onPlaybackStart: ({ at }) => {
                    if (!this.startSequence.isActive || token !== this.startSequence.token) return;
                    this.startSequence.audioStartAt = at;
                    this.startSequence.timelineAnchorAt = at;
                }
            }).catch(e => {
                console.warn("Start audio failed:", e);
            });
        } else {
            const startAudio = new Audio(this.startClipPath);
            startAudio.preload = 'auto';
            startAudio.playsInline = true;
            this.startSequence.fallbackAudio = startAudio;

            startAudio.onplaying = () => {
                if (!this.startSequence.isActive || token !== this.startSequence.token) return;
                this.startSequence.audioStartAt = performance.now();
                this.startSequence.timelineAnchorAt = this.startSequence.audioStartAt;
            };

            startAudio.play().catch(e => console.warn("Audio playback failed:", e));
        }
    }

    startGame() {
        this.clearStartSequenceTimers();
        this.startSequence.isActive = false;
        console.log("🎮 Starting game...");
        this.isGameRunning = true;
        this.isMicWarm = false;
        this.switchScreen('gameScreen');

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
        this.clearAnswerTimers();
        this.isAnswerAcceptanceOpen = false;

        const questionToken = ++this.currentQuestionToken;

        const beginVoiceWindow = () => {
            if (questionToken !== this.currentQuestionToken) return;
            if (this.inputMode !== 'voice') return;
            this.openListeningGate('question-ended');
        };

        // Speak the question with natural variation
        if (this.inputMode === 'voice' && this.voiceSystem) {
            this.voiceSystem.setListeningMode(false);
            this.voiceSystem.sayQuestion({
                readyLeadMs: this.questionPreArmLeadMs,
                onPlaybackReady: () => {
                    if (questionToken !== this.currentQuestionToken) return;
                    this.startListening({
                        deferAcceptance: true,
                        reason: 'question-prearm'
                    });
                },
                onPlaybackEnd: () => {
                    beginVoiceWindow();
                }
            }).then(() => {
                beginVoiceWindow();
            }).catch(() => {
                beginVoiceWindow();
            });
            return;
        }

        if (this.inputMode === 'voice') {
            this.startListening({ reason: 'question-fallback' });
            return;
        }

        this.beginAnswerWindow();
    }

    startTimer() {
        const timerFill = document.getElementById('timerFill');
        if (!timerFill) {
            return;
        }

        let width = 100;

        const totalSteps = Math.max(Math.round(this.answerWindowMs / 100), 1);
        const decrement = 100 / totalSteps;

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

    buildSpeechCandidatesFromEvent(event) {
        const candidates = new Set();
        const displayParts = [];

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (!result || result.length === 0) continue;

            const topTranscript = (result[0]?.transcript || '').trim();
            if (topTranscript) {
                displayParts.push(topTranscript);
                candidates.add(topTranscript);
            }

            const alternativeCount = Math.min(result.length, 3);
            for (let altIndex = 0; altIndex < alternativeCount; altIndex += 1) {
                const transcript = (result[altIndex]?.transcript || '').trim();
                if (transcript) {
                    candidates.add(transcript);
                }
            }
        }

        const displayText = displayParts.join(' ').trim();
        if (displayText) {
            candidates.add(displayText);
        }

        return {
            displayText,
            candidates: [...candidates]
        };
    }

    formatTranscriptForDisplay(text) {
        const trimmed = `${text || ''}`.trim().replace(/[.,!?]$/, '');
        if (!trimmed) return '';
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }

    collapseSpeechTokens(tokens) {
        const collapsed = [];
        let run = [];

        const flushRun = () => {
            if (run.length === 0) return;

            const canCollapse = run.length > 1 && run.length <= 5 && run.every(token => /^[a-z0-9]+$/.test(token) && token.length <= 3);
            if (canCollapse) {
                collapsed.push(run.join(''));
            } else {
                collapsed.push(...run);
            }

            run = [];
        };

        tokens.forEach((token) => {
            if ((/^[a-z]$/.test(token) || /^\d+$/.test(token)) && token.length <= 3) {
                run.push(token);
                return;
            }

            flushRun();
            collapsed.push(token);
        });

        flushRun();
        return collapsed;
    }

    normalizeSpeechText(text, options = {}) {
        const { removeFillers = true } = options;
        const fillerWords = new Set([
            'a', 'an', 'and', 'are', 'car', 'guess', 'i', 'is', 'it', 'its',
            'know', 'like', 'looks', 'maybe', 'my', 'see', 'that', 'the',
            'this', 'think', 'uh', 'um', 'you'
        ]);

        const phraseReplacements = [
            [/\baldi\b/g, 'audi'],
            [/\baudii\b/g, 'audi'],
            [/\bbee em double u\b/g, 'bmw'],
            [/\bbee em w\b/g, 'bmw'],
            [/\bpor sha\b/g, 'porsche'],
            [/\bpor she\b/g, 'porsche'],
            [/\bporsha\b/g, 'porsche'],
            [/\bsky line\b/g, 'skyline'],
            [/\bf one fifty\b/g, 'f150'],
            [/\beff one fifty\b/g, 'f150'],
            [/\bf one five zero\b/g, 'f150'],
            [/\bthree seventy zee\b/g, '370z'],
            [/\bthree seventy z\b/g, '370z'],
            [/\bare eight\b/g, 'r8'],
            [/\br eight\b/g, 'r8'],
            [/\bto yo ta\b/g, 'toyota'],
            [/\bni ssan\b/g, 'nissan'],
            [/\bcam ree\b/g, 'camry'],
            [/\bta coma\b/g, 'tacoma'],
            [/\btun dra\b/g, 'tundra'],
            [/\btondra\b/g, 'tundra'],
            [/\bsivic\b/g, 'civic'],
            [/\bexplora\b/g, 'explorer'],
            [/\bgod zilla\b/g, 'godzilla']
        ];

        let normalized = `${text || ''}`.toLowerCase();
        normalized = normalized.replace(/['’]/g, '');
        normalized = normalized.replace(/&/g, ' and ');
        normalized = normalized.replace(/[-/]/g, ' ');
        normalized = normalized.replace(/[.,!?;:()[\]{}"\\]/g, ' ');

        phraseReplacements.forEach(([pattern, value]) => {
            normalized = normalized.replace(pattern, value);
        });

        let tokens = normalized.split(/\s+/).filter(Boolean);
        tokens = this.collapseSpeechTokens(tokens);
        tokens = tokens.filter((token, index) => token && token !== tokens[index - 1]);

        if (removeFillers) {
            tokens = tokens.filter(token => !fillerWords.has(token));
        }

        return {
            text: tokens.join(' ').trim(),
            compact: tokens.join(''),
            tokens
        };
    }

    getLevenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];
        for (let i = 0; i <= b.length; i += 1) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j += 1) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i += 1) {
            for (let j = 1; j <= a.length; j += 1) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    isFuzzySpeechMatch(value, target, strictShort = false) {
        if (!value || !target) return false;
        if (value === target) return true;

        const maxLen = Math.max(value.length, target.length);
        let maxEdits = 1;
        if (maxLen >= 6) maxEdits = 2;
        if (maxLen >= 10) maxEdits = 3;
        if (strictShort && maxLen <= 4) maxEdits = 1;
        if (maxLen <= 3) maxEdits = 0;

        return this.getLevenshteinDistance(value, target) <= maxEdits;
    }

    buildCurrentCarSpeechProfile() {
        const car = this.currentCar;
        if (!car) return null;

        const nameParts = car.name.split(/\s+/);
        const brand = this.normalizeSpeechText(nameParts[0], { removeFillers: false });
        const model = this.normalizeSpeechText(nameParts.slice(1).join(' '), { removeFillers: false });
        const phraseMap = new Map();

        const addPhrase = (value, source) => {
            const normalized = this.normalizeSpeechText(value);
            if (!normalized.text) return;

            const priority = source === 'official' || source === 'actual'
                ? 4
                : source === 'alias'
                    ? 3
                    : 2;

            const key = normalized.compact || normalized.text;
            const existing = phraseMap.get(key);
            const containsModelToken = model.tokens.length === 0
                ? normalized.compact === brand.compact
                : model.tokens.some(token => normalized.tokens.includes(token));

            if (existing) {
                existing.priority = Math.max(existing.priority, priority);
                existing.isBrandOnly = existing.isBrandOnly && normalized.compact === brand.compact;
                existing.hasModelEvidence = existing.hasModelEvidence || containsModelToken;
                existing.sources.add(source);
                return;
            }

            phraseMap.set(key, {
                text: normalized.text,
                compact: normalized.compact,
                tokens: normalized.tokens,
                priority,
                isBrandOnly: normalized.compact === brand.compact,
                hasModelEvidence: containsModelToken,
                sources: new Set([source])
            });
        };

        addPhrase(car.name, 'official');
        (car.actualWords || []).forEach(word => addPhrase(word, 'actual'));
        (car.speechAliases || []).forEach(alias => addPhrase(alias, 'alias'));
        (car.keywords || []).forEach(keyword => addPhrase(keyword, 'keyword'));

        const carsWithBrand = this.carDatabase.filter((entry) => {
            const entryBrand = this.normalizeSpeechText(entry.name.split(/\s+/)[0], { removeFillers: false });
            return entryBrand.compact === brand.compact;
        });

        const phrases = [...phraseMap.values()].sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return b.text.length - a.text.length;
        });

        return {
            brand,
            model,
            isBrandUnique: carsWithBrand.length === 1,
            phrases,
            modelPhrases: phrases.filter(phrase => !phrase.isBrandOnly)
        };
    }

    getGuessMatchResult(candidates) {
        const profile = this.buildCurrentCarSpeechProfile();
        if (!profile) {
            return { matched: false };
        }

        const uniqueCandidates = [...new Set((Array.isArray(candidates) ? candidates : [candidates]).filter(Boolean))];

        for (const candidate of uniqueCandidates) {
            const normalized = this.normalizeSpeechText(candidate);
            if (!normalized.text) continue;

            const brandMatched = normalized.tokens.some(token => this.isFuzzySpeechMatch(token, profile.brand.compact, true))
                || this.isFuzzySpeechMatch(normalized.compact, profile.brand.compact, true);
            const hasNonBrandToken = normalized.tokens.some(
                token => !this.isFuzzySpeechMatch(token, profile.brand.compact, true)
            );

            for (const target of profile.phrases) {
                if (target.isBrandOnly && !profile.isBrandUnique) {
                    continue;
                }

                const phraseContainsTarget = normalized.text.includes(target.text);
                const targetContainsGuess = hasNonBrandToken && target.text.includes(normalized.text);
                const fuzzyPhraseMatch = this.isFuzzySpeechMatch(normalized.compact, target.compact);
                const tokenCoverage = target.tokens.every(targetToken =>
                    normalized.tokens.some(guessToken => this.isFuzzySpeechMatch(guessToken, targetToken, true))
                );

                if (phraseContainsTarget || targetContainsGuess || fuzzyPhraseMatch || tokenCoverage) {
                    if (!target.isBrandOnly) {
                        return { matched: true, guess: normalized.text, target: target.text };
                    }

                    if (profile.isBrandUnique) {
                        return { matched: true, guess: normalized.text, target: target.text };
                    }
                }
            }

            if (brandMatched && profile.isBrandUnique) {
                return { matched: true, guess: normalized.text, target: profile.brand.text };
            }

            if (brandMatched && !profile.isBrandUnique) {
                const hasModelEvidence = profile.modelPhrases.some(target => {
                    if (target.tokens.every(targetToken =>
                        normalized.tokens.some(guessToken => this.isFuzzySpeechMatch(guessToken, targetToken, true))
                    )) {
                        return true;
                    }

                    if (normalized.text.includes(target.text)) {
                        return true;
                    }

                    return this.isFuzzySpeechMatch(normalized.compact, target.compact);
                });

                if (hasModelEvidence) {
                    return { matched: true, guess: normalized.text, target: profile.model.text || profile.brand.text };
                }
            }
        }

        return { matched: false };
    }

    isGuessCorrect(guess) {
        return this.getGuessMatchResult([guess]).matched;
    }

    handleCorrectGuess() {
        // Mute mic during celebration
        this.stopListening();

        this.score += CAR_KING_CORRECT_POINTS;
        this.streak += 1;
        window.LAHSPointsBridge?.awardPoints(CAR_KING_CORRECT_POINTS, {
            label: 'Correct Guess',
            meta: {
                carName: this.currentCar?.name || null,
                gameMode: this.gameMode
            }
        });

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
        this.invalidateStartSequence('reset-game', { forceCancelAudio: true });
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
        this.releaseRecognitionStartLock();

        this.stopMicHealthMonitor();
        this.stopListening();
        this.setMicState('idle');
        this.resetRecognitionRecoveryState();

        if (this.isTestingMic) {
            this.stopMicTest();
        }
        if (this.globalPermStream) {
            this.stopMediaStream(this.globalPermStream);
            this.globalPermStream = null;
        }

        if (this.voiceSystem) {
            this.voiceSystem.cancel({ force: true });
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
        this.invalidateStartSequence('game-over', { forceCancelAudio: true });
        this.isGameRunning = false;
        this.stopMicHealthMonitor();
        this.releaseRecognitionStartLock();

        // Stop all timers
        if (this.answerTimer) clearTimeout(this.answerTimer);
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.nextCarTimer) clearTimeout(this.nextCarTimer);

        // Stop Mic
        this.stopListening();
        this.setMicState('idle');
        if (this.isTestingMic) {
            this.stopMicTest();
        }
        if (this.globalPermStream) {
            this.stopMediaStream(this.globalPermStream);
            this.globalPermStream = null;
        }
        if (this.voiceSystem) this.voiceSystem.cancel({ force: true });

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
