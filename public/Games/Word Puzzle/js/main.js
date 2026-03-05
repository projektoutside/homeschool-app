/**
 * Main Entry Point
 * Initializes all game systems
 */

const WORD_PUZZLE_GAME_ID = 'word-puzzle-game';
const WORD_PUZZLE_USER_CONTEXT_BOOTSTRAP_KEY = 'LAHS_WORD_PUZZLE_USER_CONTEXT_BOOTSTRAP';
const WORD_PUZZLE_USER_CONTEXT_SYNC = 'LAHS_WORD_PUZZLE_USER_CONTEXT_SYNC';
const WORD_PUZZLE_USER_CONTEXT_REQUEST = 'LAHS_WORD_PUZZLE_USER_CONTEXT_REQUEST';
const WORD_PUZZLE_TITLE_POINT_COLORS = ['white', 'blue', 'green', 'orange', 'red'];

function getWordPuzzleHostTargetOrigin() {
    return window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')
        ? window.location.origin
        : '*';
}

function sanitizeWordPuzzleUserContext(rawContext) {
    const userId = typeof rawContext?.userId === 'string' && rawContext.userId.trim()
        ? rawContext.userId.trim()
        : null;
    const username = typeof rawContext?.username === 'string' && rawContext.username.trim()
        ? rawContext.username.trim()
        : null;

    return {
        userId,
        username,
        isAuthenticated: Boolean(userId && rawContext?.isAuthenticated),
        storageScope: userId ? `supabase-user:${userId}` : 'anonymous-test'
    };
}

function readWordPuzzleBootstrapContext() {
    try {
        const rawValue = sessionStorage.getItem(WORD_PUZZLE_USER_CONTEXT_BOOTSTRAP_KEY);
        if (!rawValue) {
            return sanitizeWordPuzzleUserContext(null);
        }

        return sanitizeWordPuzzleUserContext(JSON.parse(rawValue));
    } catch (_error) {
        return sanitizeWordPuzzleUserContext(null);
    }
}

function persistWordPuzzleBootstrapContext(context) {
    try {
        sessionStorage.setItem(WORD_PUZZLE_USER_CONTEXT_BOOTSTRAP_KEY, JSON.stringify(context));
    } catch (_error) {
        // Ignore bootstrap persistence failures and fall back to anonymous keys.
    }
}

function setWordPuzzleUserContext(nextContext) {
    const sanitizedContext = sanitizeWordPuzzleUserContext(nextContext);
    window.wordPuzzleUserContext = sanitizedContext;
    persistWordPuzzleBootstrapContext(sanitizedContext);
    window.dispatchEvent(new CustomEvent('wordPuzzleUserContextChanged', {
        detail: sanitizedContext
    }));
    return sanitizedContext;
}

function getWordPuzzleStorageKey(baseKey) {
    if (typeof baseKey !== 'string' || !baseKey) {
        return baseKey;
    }

    const currentContext = window.wordPuzzleUserContext || readWordPuzzleBootstrapContext();
    return currentContext?.userId ? `${baseKey}:${currentContext.userId}` : baseKey;
}

function requestWordPuzzleUserContext() {
    if (!window.parent || window.parent === window) return;

    try {
        window.parent.postMessage({
            type: WORD_PUZZLE_USER_CONTEXT_REQUEST,
            gameId: WORD_PUZZLE_GAME_ID
        }, getWordPuzzleHostTargetOrigin());
    } catch (error) {
        console.warn('Word Puzzle: Unable to request host user context:', error);
    }
}

window.wordPuzzleUserContext = readWordPuzzleBootstrapContext();
window.setWordPuzzleUserContext = setWordPuzzleUserContext;
window.getWordPuzzleStorageKey = getWordPuzzleStorageKey;

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
    const availableColors = WORD_PUZZLE_TITLE_POINT_COLORS.filter((color) => color !== previousColor);
    return availableColors[randomInt(availableColors.length)] || WORD_PUZZLE_TITLE_POINT_COLORS[0];
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

window.addEventListener('message', (event) => {
    if (!event?.data || typeof event.data !== 'object') return;
    if (event.origin && event.origin !== window.location.origin && event.origin !== 'null') return;

    const message = event.data;
    if (message.type !== WORD_PUZZLE_USER_CONTEXT_SYNC) return;
    if (message.gameId && message.gameId !== WORD_PUZZLE_GAME_ID) return;

    setWordPuzzleUserContext(message);
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Word Puzzle: Initializing...');

    try {
        requestWordPuzzleUserContext();
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

        console.log('Word Puzzle: All systems initialized successfully');
    } catch (error) {
        console.error('Word Puzzle: Initialization error:', error);
    }
});

/**
 * Enable fullscreen mode for the game
 * Requests fullscreen on the document body to hide browser UI
 */
function enableFullscreen() {
    const docElm = document.documentElement;
    let requestResult;
    
    try {
        if (docElm.requestFullscreen) {
            requestResult = docElm.requestFullscreen();
        } else if (docElm.mozRequestFullScreen) { // Firefox
            requestResult = docElm.mozRequestFullScreen();
        } else if (docElm.webkitRequestFullscreen) { // Chrome, Safari, Opera
            requestResult = docElm.webkitRequestFullscreen();
        } else if (docElm.msRequestFullscreen) { // IE/Edge
            requestResult = docElm.msRequestFullscreen();
        }
    } catch (_error) {
        return;
    }

    // Modern browsers can reject fullscreen requests unless triggered by user gesture.
    if (requestResult && typeof requestResult.catch === 'function') {
        requestResult.catch(() => {});
    }
    
    console.log('Fullscreen mode enabled');
}

/**
 * Exit fullscreen mode
 */
function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

function hasTrustedUserActivation() {
    return !navigator.userActivation || navigator.userActivation.isActive;
}

/**
 * Toggle fullscreen mode on user interaction
 * Browsers require user interaction to enter fullscreen
 */
document.addEventListener('click', () => {
    if (!hasTrustedUserActivation()) return;
    if (!document.fullscreenElement && 
        !document.mozFullScreenElement && 
        !document.webkitFullscreenElement && 
        !document.msFullscreenElement) {
        enableFullscreen();
    }
}, { once: true });

// Also try to enable fullscreen on any key press (backup method)
document.addEventListener('keydown', () => {
    if (!hasTrustedUserActivation()) return;
    if (!document.fullscreenElement && 
        !document.mozFullScreenElement && 
        !document.webkitFullscreenElement && 
        !document.msFullscreenElement) {
        enableFullscreen();
    }
}, { once: true });

// Enable fullscreen on touch (for mobile devices)
document.addEventListener('touchstart', () => {
    if (!hasTrustedUserActivation()) return;
    if (!document.fullscreenElement && 
        !document.mozFullScreenElement && 
        !document.webkitFullscreenElement && 
        !document.msFullscreenElement) {
        enableFullscreen();
    }
}, { once: true });

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
