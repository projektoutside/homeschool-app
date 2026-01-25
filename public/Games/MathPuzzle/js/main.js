/**
 * Main Entry Point
 * Initializes all game systems
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Device Detector first (critical for layout)
    window.deviceDetector = new DeviceDetector();

    // 2. Initialize Three.js Background
    window.threeJsApp = new ThreeJsBackground(window.deviceDetector);

    // 3. Initialize Animation Controller
    window.animationController = new AnimationController(window.deviceDetector);

    // 4. Initialize Performance Monitor
    window.performanceMonitor = new PerformanceMonitor();

    // 5. Initialize Game Controller (Manages UI and Game Logic)
    window.gameController = new GameController();
});
