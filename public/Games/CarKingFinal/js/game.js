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
        this.isFirstTry = true; // Track if it's the first attempt on current car
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
        this.isMicWarm = false;
        this.isRecognitionActive = false;

        // Dynamic car database loading from local files
        // Fully populated with all available cars in CarFiles
        // Now supports multiple random images per car
        this.carDatabase = [
            {
                name: "Aston Martin",
                images: ["assets/cars/astonMartin/AstonMartin.png", "assets/cars/astonMartin/AstonMartin1.png"],
                voice: "assets/cars/astonMartin/astonMartin.mp3",
                keywords: ["aston", "martin", "james bond", "007"],
                funFact: "Aston Martin serves as the main car for James Bond!"
            },
            {
                name: "Audi R8",
                images: ["assets/cars/AudiR8/AudiR8.png"],
                voice: "assets/cars/AudiR8/AudiR8.mp3",
                keywords: ["audi", "r8", "sports car", "iron man"],
                funFact: "The Audi R8 shares many parts with a Lamborghini!"
            },
            {
                name: "BMW",
                images: ["assets/cars/BMW/BMW.jpg"],
                voice: "assets/cars/BMW/BMW.mp3",
                keywords: ["bmw", "bimmer", "german", "luxury"],
                funFact: "BMW started by making airplane engines before cars!"
            },
            {
                name: "Bentley",
                images: ["assets/cars/Bentley/Bentley.jpg"],
                voice: "assets/cars/Bentley/Bentley.mp3",
                keywords: ["bentley", "luxury", "british", "expensive"],
                funFact: "Bentley cars are super fancy and even have refrigerators inside!"
            },
            {
                name: "Bugatti",
                images: ["assets/cars/Bugatti/Bugatti.png"],
                voice: "assets/cars/Bugatti/Bugatti.mp3",
                keywords: ["bugatti", "ronaldo", "fastest", "supercar"],
                funFact: "The Bugatti is one of the fastest cars in the whole world!"
            },
            {
                name: "Corvette",
                images: ["assets/cars/Corvette/Corvette.png"],
                voice: "assets/cars/Corvette/Corvette.mp3",
                keywords: ["corvette", "chevy", "chevrolet", "stingray"],
                funFact: "The Corvette is an American sports car icon!"
            },
            {
                name: "Cybertruck",
                images: ["assets/cars/Cybertruck/Cybertruck.png"],
                voice: "assets/cars/Cybertruck/Cybertruck.mp3",
                keywords: ["cybertruck", "tesla", "truck", "electric"],
                funFact: "This truck looks like it came from a video game!"
            },
            {
                name: "Dodge Ram",
                images: ["assets/cars/DodgeRam/DodgeRam.png"],
                voice: "assets/cars/DodgeRam/DodgeRam.mp3",
                keywords: ["ram", "dodge", "truck", "pickup"],
                funFact: "Ram trucks are super strong and tough!"
            },
            {
                name: "Ferrari",
                images: ["assets/cars/ferrari/Ferrari.png", "assets/cars/ferrari/Ferrari1.jpg", "assets/cars/ferrari/ferrari.jpg"],
                voice: "assets/cars/ferrari/ferrari.mp3",
                keywords: ["ferrari", "horse", "red", "italian"],
                funFact: "Ferrari's logo is a prancing horse!"
            },
            {
                name: "Hellcat",
                images: ["assets/cars/Hellcat/Hellcat.png"],
                voice: "assets/cars/Hellcat/Hellcat.mp3",
                keywords: ["hellcat", "dodge", "challenger", "charger"],
                funFact: "The Hellcat engine makes a super loud roar!"
            },
            {
                name: "Honda Civic",
                images: ["assets/cars/HondaCivic/HondaCivic.png"],
                voice: "assets/cars/HondaCivic/HondaCivic.mp3",
                keywords: ["honda", "civic", "vtec", "type r"],
                funFact: "The Honda Civic is one of the most popular cars ever!"
            },
            {
                name: "Honda Pilot",
                images: ["assets/cars/HondaPilot/HondaPilot.jpg", "assets/cars/HondaPilot/HondaPilot.png"],
                voice: "assets/cars/HondaPilot/HondaPilot.mp3",
                keywords: ["honda", "pilot", "suv", "family"],
                funFact: "The Pilot is perfect for big family road trips!"
            },
            {
                name: "Jaguar",
                images: ["assets/cars/Jaguar/Jaguar.png"],
                voice: "assets/cars/Jaguar/Jaguar.mp3",
                keywords: ["jaguar", "jag", "cat", "english"],
                funFact: "Jaguars are named after a fast jungle cat!"
            },
            {
                name: "Lamborghini",
                images: ["assets/cars/Lamborghini/Lamborghini.png", "assets/cars/Lamborghini/Lamborghini1.jpg"],
                voice: "assets/cars/Lamborghini/Lamborghini.mp3",
                keywords: ["lamborghini", "lambo", "supercar", "fast"],
                funFact: "Lamborghini started because the owner was mad at Ferrari!"
            },
            {
                name: "Lancer Evo",
                images: ["assets/cars/LancerEvolution/LancerEvolution.png"],
                voice: "assets/cars/LancerEvolution/LancerEvolution.mp3",
                keywords: ["lancer", "evo", "mitsubishi", "rally"],
                funFact: "The Evo is a legendary rally racing car!"
            },
            {
                name: "Lotus",
                images: ["assets/cars/Lotus/Lotus.jpg"],
                voice: "assets/cars/Lotus/Lotus.mp3",
                keywords: ["lotus", "elise", "exige", "light"],
                funFact: "Lotus cars are super light and handle like go-karts!"
            },
            {
                name: "Maserati",
                images: ["assets/cars/Masarati/Masarati.png"],
                voice: "assets/cars/Masarati/Masarati.mp3",
                keywords: ["maserati", "trident", "italian"],
                funFact: "Maserati engines make a beautiful musical sound!"
            },
            {
                name: "Mazda Miata",
                images: ["assets/cars/MazdaMiata/MazdaMiata.png"],
                voice: "assets/cars/MazdaMiata/MazdaMiata.mp3",
                keywords: ["miata", "mazda", "mx5", "convertible"],
                funFact: "The Miata is the best-selling roadster in history!"
            },
            {
                name: "Mercedes",
                images: ["assets/cars/Mercedes/Mercedes.png", "assets/cars/Mercedes/Mercedes1.png", "assets/cars/Mercedes/Mercedes2.jpg"],
                voice: "assets/cars/Mercedes/Mercedes.mp3",
                keywords: ["mercedes", "benz", "amg", "luxury"],
                funFact: "Mercedes invented the very first car!"
            },
            {
                name: "Mini Cooper",
                images: ["assets/cars/MiniCooper/Minicooper.png"],
                voice: "assets/cars/MiniCooper/MiniCooper.mp3",
                keywords: ["mini", "cooper", "mr bean", "tiny"],
                funFact: "The Mini Cooper is small but super zippy!"
            },
            {
                name: "Porsche",
                images: ["assets/cars/Porshe/Porshe.jpg"],
                voice: "assets/cars/Porshe/Porshe.mp3",
                keywords: ["porsche", "911", "turbo", "german"],
                funFact: "Porsche keys go on the left side of the steering wheel!"
            },
            {
                name: "Nissan GT-R",
                images: ["assets/cars/SKylinGTR/SKylinGTR.png", "assets/cars/SKylinGTR/SKylinGTR1.jpg"],
                voice: "assets/cars/SKylinGTR/SKylinGTR.mp3",
                keywords: ["skyline", "gtr", "nissan", "godzilla"],
                funFact: "The GT-R is nicknamed 'Godzilla' because it's a monster!"
            },
            {
                name: "Subaru WRX",
                images: ["assets/cars/SubaruWRX/SubaruWRX.png", "assets/cars/SubaruWRX/SubaruWRX1.png"],
                voice: "assets/cars/SubaruWRX/SubaruWRX.mp3",
                keywords: ["subaru", "wrx", "sti", "rally"],
                funFact: "Subaru cars can drive easily on snow and dirt!"
            },
            {
                name: "Toyota Supra",
                images: ["assets/cars/Supra/Supra.png"],
                voice: "assets/cars/Supra/Supra.mp3",
                keywords: ["supra", "toyota", "mk4", "fast"],
                funFact: "The Supra is a movie star car from Fast & Furious!"
            },
            {
                name: "Tesla",
                images: ["assets/cars/tesla/Tesla.png", "assets/cars/tesla/Tesla1.png", "assets/cars/tesla/tesla.jpg"],
                voice: "assets/cars/tesla/tesla.mp3",
                keywords: ["tesla", "model s", "electric", "elon"],
                funFact: "Teslas don't need gas, they run on electricity!"
            },
            {
                name: "Toyota Camry",
                images: ["assets/cars/ToyotaCamry/ToyotaCamry.png"],
                voice: "assets/cars/ToyotaCamry/ToyotaCamry.mp3",
                keywords: ["camry", "toyota", "sedan"],
                funFact: "The Camry is one of the most reliable cars ever made!"
            },
            {
                name: "Toyota Tacoma",
                images: ["assets/cars/ToyotaTacoma/ToyotaTacoma.png"],
                voice: "assets/cars/ToyotaTacoma/ToyotaTacoma.mp3",
                keywords: ["toyota", "tacoma", "truck", "pickup"],
                funFact: "The Tacoma is so tough it can drive over volcanoes!"
            },
            {
                name: "Toyota Tundra",
                images: ["assets/cars/ToyotaTundra/ToyotaTundra.png"],
                voice: "assets/cars/ToyotaTundra/ToyotaTundra.mp3",
                keywords: ["tundra", "toyota", "truck", "big"],
                funFact: "The Tundra once pulled a giant space shuttle!"
            },
            {
                name: "Volkswagen",
                images: ["assets/cars/Volkswagon/Volkswagon.png", "assets/cars/Volkswagon/Volkswagon1.png"],
                voice: "assets/cars/Volkswagon/Volkswagon.mp3",
                keywords: ["vw", "volkswagen", "beetle", "bug"],
                funFact: "Volkswagen means 'People's Car' in German!"
            }
        ];

        // Enhanced repeat prevention system
        this.recentlyShownCars = []; // Track last 3 cars to prevent near-repeats
        this.maxRecentHistory = 3;

        // Initialize the game
        this.init();
    }

    async init() {
        console.log("🚗 Initializing Kids Car Guessing Game...");
        this.setupEventListeners();
        await this.initializeSpeech();
        this.initMainMenu();
        this.showStartScreen();
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
            return;
        }

        // SINGLETON PATTERN: Only create if doesn't exist
        if (!this.recognition) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();

            // 1. ROBUST SETTINGS
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 1;
            this.recognition.lang = 'en-US';

            this.setupRecognitionHandlers(micBtn, guessInput);
        }

        // Manual toggle 
        // Remove old listeners to prevent duplicates if recalled
        const newBtn = micBtn.cloneNode(true);
        micBtn.parentNode.replaceChild(newBtn, micBtn);

        newBtn.addEventListener('click', () => {
            if (this.isListeningForAnswer) {
                this.stopListening();
                document.getElementById('guessInput').placeholder = "Mic Paused";
            } else {
                this.startListening();
            }
        });

        // Initialize Settings Logic safely
        this.initMicSettings();
    }

    setupRecognitionHandlers(micBtn, guessInput) {
        this.recognition.onstart = () => {
            console.log("🎤 Mic started (Continuous Mode)");
            this.isRecognitionActive = true;
            if (this.isGameRunning || this.isListeningForAnswer) {
                this.toggleMicVisuals(true);
            }

            // INTENTIONAL: We do NOT close the globalPermStream here.
            // Keeping it open forces the browser to maintain the "Recording" status,
            // which prevents a second permission prompt for SpeechRecognition.
        };

        this.recognition.onend = () => {
            console.log("🎤 Mic stopped");
            this.isRecognitionActive = false;

            if (!this.isGameRunning) {
                this.toggleMicVisuals(false);
            }

            if (this.isGameRunning || this.isMicWarm) {
                console.log("🔄 Auto-restarting mic engine...");
                try {
                    this.recognition.start();
                } catch (e) { }
            }
        };

        this.recognition.onresult = (event) => {
            if (!this.isListeningForAnswer) return;

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
            }

            // 2. SILENCE DETECTOR (The "Leeway")
            this.silenceTimer = setTimeout(() => {
                console.log("⏳ Silence detected (3s). Submitting final guess...");
                if (this.isListeningForAnswer && input.value.trim().length > 0) {
                    // On manual submission (wrong/silence), the text remains what they said.
                    // e.g. "It is a potato" -> Shows "It is a potato"
                    this.submitGuess();
                }
            }, 3000);
        };

        this.recognition.onerror = (event) => {
            if (event.error !== 'no-speech') {
                console.warn("Mic Error:", event.error);
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
            showNamesBtn.textContent = 'Enable via localhost';
            showNamesBtn.disabled = true;
            micConfigSection.classList.remove('mic-status-ok');
            micConfigSection.classList.add('mic-status-error');
        }

        if (!this.micDevicesInitialized) {
            micSelect.addEventListener('change', (e) => {
                console.log("Input Device Selected:", e.target.value);
                this.selectedMicId = e.target.value;
            });

            showNamesBtn.addEventListener('click', async () => {
                try {
                    const statusEl = document.getElementById('micDeviceStatus');
                    if (statusEl) statusEl.textContent = "Activating microphone...";

                    // Explicitly request permission (like Test Button)
                    // We don't need a specific ID yet, just any audio permission
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                    // Success! Update UI immediately
                    const micConfigSection = document.getElementById('micConfigSection');
                    if (micConfigSection) {
                        micConfigSection.classList.add('mic-status-ok');
                        micConfigSection.classList.remove('mic-status-error');
                    }

                    // Keep this stream OPEN to persist the "Active" permission state.
                    // This prevents the browser from asking again when the game starts.
                    if (this.globalPermStream) {
                        this.globalPermStream.getTracks().forEach(track => track.stop());
                    }
                    this.globalPermStream = stream;
                    this.micPermissionGranted = true;
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

        try {
            this.recognition.start();
        } catch (err) {
            if (err?.error !== 'not-allowed' && err?.error !== 'service-not-allowed') {
                console.warn('Mic warm start failed:', err);
            }
        }
    }

    async ensureMicrophonePermissionForGame() {
        if (this.inputMode !== 'voice') return;
        if (!navigator.mediaDevices?.getUserMedia) return;
        if (!this.micPermissionGranted) return;
        if (this.globalPermStream) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.globalPermStream = stream;
        } catch (err) {
            console.warn('Microphone keep-alive failed:', err);
            this.micPermissionGranted = false;
            this.saveMicPermissionState();
        }
    }

    async refreshMicrophones(requestPermission = false) {
        const micSelect = document.getElementById('micSelect');
        const statusEl = document.getElementById('micDeviceStatus');
        const micConfigSection = document.getElementById('micConfigSection');

        // Safety check: ensure all required elements exist
        if (!micSelect || !navigator.mediaDevices?.enumerateDevices) return;

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

        let tempStream = null;

        try {
            // Ensure cache is initialized
            if (!this.micLabelCache) {
                this.micLabelCache = {};
            }

            // STEP 1: Temp stream for permission trigger
            if (requestPermission) {
                try {
                    tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                } catch (err) {
                    console.warn("Permission check failed:", err);
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
                const opt = document.createElement('option');
                opt.value = 'default';
                opt.text = "No microphones found";
                micSelect.add(opt);
                // Only show error status if we actually found nothing
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
            }

            // STEP 4: Update UI State
            const labelsVisible = audioInputs.some(d => d.label && d.label.trim().length > 0);
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
        } finally {
            if (tempStream) {
                try {
                    tempStream.getTracks().forEach(track => track.stop());
                } catch (e) { }
            }
        }
    }

    async startMicTest() {
        const visualizer = document.getElementById('testVisualizer');
        const testBtn = document.getElementById('testMicBtn');
        const status = document.getElementById('micTestStatus');

        try {
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
            const constraints = {
                audio: deviceId ? { deviceId: { exact: deviceId } } : true
            };

            this.testStream = await navigator.mediaDevices.getUserMedia(constraints);
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
        // We keep globalPermStream open intentionally to overlap with recognition.start()
        // This prevents the permission "gap" that causes a re-prompt.
        // Cleanup happens in recognition.onstart

        if (this.recognition) {
            try {
                this.recognition.start();
                console.log("🎤 Microphone Engine Activated");
            } catch (e) {
                if (e.error !== 'not-allowed' && e.error !== 'service-not-allowed') {
                    console.log("Mic already active or error:", e);
                }
            }
        }
    }

    // "Open Gate" - Show Visuals
    startListening() {
        this.isListeningForAnswer = true;
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

        // Ensure engine is running
        this.activateMicrophoneEngine();
    }

    // "Close Gate" - Hide Visuals
    stopListening() {
        this.isListeningForAnswer = false;
        this.toggleMicVisuals(false);

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
    }

    speak(text, options = {}) {
        if (!this.voiceSystem || !this.soundEnabled) return Promise.resolve();
        return this.voiceSystem.speak(text, options);
    }

    playSound(soundId) {
        if (!this.soundEnabled) return;

        const audio = document.getElementById(soundId);
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log("Sound play failed:", e));
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

        // Play the custom voice recording
        const startAudio = new Audio('assets/audio/voice/Start.mp3');
        startAudio.play().catch(e => console.warn("Audio playback failed:", e));

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
        let randomIndex;
        let attempts = 0;
        const maxAttempts = 50; // Prevent infinite loops

        // Enhanced repeat prevention - avoid last 3 cars shown
        if (this.carDatabase.length > this.maxRecentHistory) {
            do {
                randomIndex = Math.floor(Math.random() * this.carDatabase.length);
                attempts++;
            } while (
                this.recentlyShownCars.includes(randomIndex) &&
                attempts < maxAttempts
            );
        } else {
            // If we have fewer cars than history length, just avoid immediate repeat
            do {
                randomIndex = Math.floor(Math.random() * this.carDatabase.length);
                attempts++;
            } while (
                randomIndex === this.lastCarIndex &&
                attempts < maxAttempts &&
                this.carDatabase.length > 1
            );
        }

        // Update recent cars tracking
        this.recentlyShownCars.push(randomIndex);
        if (this.recentlyShownCars.length > this.maxRecentHistory) {
            this.recentlyShownCars.shift(); // Remove oldest entry
        }

        // Update last car index for backup prevention
        this.lastCarIndex = randomIndex;

        console.log(`🚗 Selected car ${randomIndex}: ${this.carDatabase[randomIndex].name}`);
        console.log(`📝 Recent cars history: [${this.recentlyShownCars.join(', ')}]`);

        return this.carDatabase[randomIndex];
    }

    startQuestionPhase() {
        const questionText = document.getElementById('questionText');
        questionText.textContent = "🤔 Can you guess this car?";

        // RESET FLAGS
        this.isFirstTry = true;
        this.isProcessingGuess = false; // Reset lock
        document.getElementById('guessInput').disabled = false;

        // Speak the question with natural variation
        if (this.voiceSystem) {
            this.voiceSystem.sayQuestion().then(() => {
                // Safety Delay: Wait 1.5s (increased) for audio echo to fade before opening mic
                setTimeout(() => {
                    this.startListening();
                }, 1500);
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

        // Brand is always weak if there's a model
        if (modelParts.length > 0) {
            weakTargets.add(brand);
            modelParts.forEach(p => strongTargets.add(p));
        } else {
            // If name is single word (BMW), it's strong
            strongTargets.add(brand);
        }

        // Process keywords
        car.keywords.forEach(k => {
            const kLower = k.toLowerCase();
            // If keyword is basically the brand, treat as weak (unless it's a single-word car)
            if (kLower === brand && modelParts.length > 0) {
                weakTargets.add(kLower);
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

        this.isFirstTry = false;
    }

    handleIncorrectGuess(guess) {
        // Mute mic during feedback
        this.stopListening();

        // Use new sequence: Random Wrong -> Car Voice
        if (this.voiceSystem) {
            console.log("🔊 Playing Wrong Sequence before Game Over...");
            this.voiceSystem.playWrongSequence(this.currentCar.voice).then(() => {
                console.log("🔊 Sequence finished. Now triggering Game Over.");
                this.gameOver();
            });
        } else {
            // Fallback if no voice system
            setTimeout(() => this.gameOver(), 1000);
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
        // Time ran out or empty guess -> Game Over
        console.log("⏰ Time ran out! Triggering Game Over.");

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

        if (this.voiceSystem) {
            this.voiceSystem.cancel();
        }

        // Stop all timers
        if (this.answerTimer) clearTimeout(this.answerTimer);
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.nextCarTimer) clearTimeout(this.nextCarTimer);

        this.switchScreen('startScreen');
    }

    gameOver() {
        this.isGameRunning = false;

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
