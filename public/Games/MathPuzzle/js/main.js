/**
 * Main Entry Point
 * Initializes all game systems
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Math Puzzle: Initializing...');

    try {
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
