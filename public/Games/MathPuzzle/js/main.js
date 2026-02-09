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
