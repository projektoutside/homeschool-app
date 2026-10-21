/**
 * Main Entry Point
 * Initializes all game systems
 */

const MATH_PUZZLE_TITLE_POINT_COLORS = ['white', 'blue', 'green', 'orange', 'red'];

function randomInt(max) {
    if (!Number.isInteger(max) || max <= 0) return 0;

    if (window.crypto?.getRandomValues) {
        const values = new Uint32Array(1);
        window.crypto.getRandomValues(values);
        return values[0] % max;
    }

    return Math.floor(Math.random() * max);
}

function chooseNextTitlePointColor(previousColor = null) {
    const availableColors = MATH_PUZZLE_TITLE_POINT_COLORS.filter((color) => color !== previousColor);
    return availableColors[randomInt(availableColors.length)] || MATH_PUZZLE_TITLE_POINT_COLORS[0];
}

function applyRandomTitlePointColors() {
    const titleWords = Array.from(document.querySelectorAll('.title-word'));
    if (titleWords.length === 0) return;

    let previousColor = null;
    let visibleLetterIndex = 0;

    titleWords.forEach((titleWord) => {
        const rawText = titleWord.dataset.originalText || titleWord.textContent || '';
        titleWord.dataset.originalText = rawText;
        titleWord.textContent = '';

        for (const char of rawText) {
            const letterSpan = document.createElement('span');
            letterSpan.className = 'title-letter';
            letterSpan.textContent = char;

            if (char.trim()) {
                const nextColor = chooseNextTitlePointColor(previousColor);
                letterSpan.classList.add(`title-letter--${nextColor}`);
                letterSpan.dataset.pointColor = nextColor;
                letterSpan.dataset.letter = char;
                letterSpan.style.setProperty('--title-glow-delay', `${((visibleLetterIndex * 0.11) + (randomInt(5) * 0.04)).toFixed(2)}s`);
                letterSpan.style.setProperty('--title-glow-duration', `${(4.6 + randomInt(7) * 0.28).toFixed(2)}s`);
                previousColor = nextColor;
                visibleLetterIndex += 1;
            } else {
                letterSpan.classList.add('title-letter--space');
            }

            titleWord.appendChild(letterSpan);
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Math Puzzle: Initializing...');

    try {
        window.LAHSPointsBridge?.init({ gameId: 'MathPuzzle' });
        applyRandomTitlePointColors();

        // 1. Initialize Device Detector first (critical for layout)
        window.deviceDetector = new DeviceDetector();
        console.log('DeviceDetector initialized');

        // 2. Initialize Three.js Background
        window.threeJsApp = new ThreeJsBackground(window.deviceDetector);
        console.log('ThreeJsBackground initialized');

        // 3. Initialize Animation Controller
        window.animationController = new AnimationController(window.deviceDetector);
        console.log('AnimationController initialized');

        // 4. Initialize Performance Monitor
        window.performanceMonitor = new PerformanceMonitor();
        console.log('PerformanceMonitor initialized');

        // 5. Initialize Game Controller (Manages UI and Game Logic)
        window.gameController = new GameController();
        console.log('GameController initialized');

        // 6. Initialize Music Controller (handles background music)
        window.musicController = new MusicController();
        console.log('MusicController initialized');

        // 7. Auto-start main menu music
        startMainMenuMusic();

        console.log('Math Puzzle: All systems initialized successfully');
    } catch (error) {
        console.error('Math Puzzle: Initialization error:', error);
    }
});

/**
 * Start main menu music - tries immediately, and if blocked by autoplay policy,
 * will retry on first user interaction
 */
function startMainMenuMusic() {
    if (!window.musicController) return;

    // Try to play immediately (will work if user has previously interacted with site,
    // otherwise will fail due to browser autoplay policy)
    window.musicController.startMainMenuMusic();

    // Set up listener to start on first user interaction (if autoplay was blocked)
    const tryStartOnInteraction = () => {
        // Start main menu music on any user interaction
        if (window.musicController && !window.musicController.isPlaying) {
            console.log('Music: User interaction detected, starting main menu music...');
            window.musicController.startMainMenuMusic();
        }
        // Remove listeners after first interaction
        document.removeEventListener('click', tryStartOnInteraction);
        document.removeEventListener('touchstart', tryStartOnInteraction);
        document.removeEventListener('keydown', tryStartOnInteraction);
    };

    // Add listeners for user interaction
    document.addEventListener('click', tryStartOnInteraction);
    document.addEventListener('touchstart', tryStartOnInteraction);
    document.addEventListener('keydown', tryStartOnInteraction);
}
