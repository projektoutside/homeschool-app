// ============================================
// DEVICE INTELLIGENCE & VIEWPORT MANAGEMENT
// Real-time Device Detection and Adaptation
// ============================================

class DeviceIntelligence {
    constructor() {
        this.device = {};
        this.viewport = {};
        this.init();
    }

    init() {
        console.log('📱 Initializing Device Intelligence System...');

        // Detect device on load
        this.detectDevice();
        this.updateViewportInfo();
        this.applyDeviceAttributes();

        // Listen for viewport changes
        this.setupListeners();

        console.log('✅ Device Intelligence Active:', this.device);
    }

    detectDevice() {
        const ua = navigator.userAgent;
        const platform = navigator.platform;

        // Device Type Detection
        this.device.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        this.device.isTablet = /(iPad|tablet|playbook|silk)|(android(?!.*mobile))/i.test(ua);
        this.device.isPhone = this.device.isMobile && !this.device.isTablet;
        this.device.isDesktop = !this.device.isMobile && !this.device.isTablet;

        // OS Detection
        this.device.isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
        this.device.isAndroid = /Android/i.test(ua);
        this.device.isWindows = /Win/i.test(platform);
        this.device.isMac = /Mac/i.test(platform);

        // Browser Detection
        this.device.isChrome = /Chrome/i.test(ua) && !/Edge/i.test(ua);
        this.device.isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua);
        this.device.isFirefox = /Firefox/i.test(ua);
        this.device.isEdge = /Edge/i.test(ua);

        // Input Detection
        this.device.hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.device.hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        // Screen Info
        this.device.screenWidth = window.screen.width;
        this.device.screenHeight = window.screen.height;
        this.device.pixelRatio = window.devicePixelRatio || 1;

        // Device Category
        if (this.device.isPhone) {
            this.device.category = 'phone';
        } else if (this.device.isTablet) {
            this.device.category = 'tablet';
        } else {
            this.device.category = 'desktop';
        }
    }

    updateViewportInfo() {
        // Get accurate viewport dimensions
        this.viewport.width = window.innerWidth;
        this.viewport.height = window.innerHeight;
        this.viewport.aspectRatio = (this.viewport.width / this.viewport.height).toFixed(2);

        // Orientation
        this.viewport.orientation = this.viewport.width > this.viewport.height ? 'landscape' : 'portrait';

        // Size category
        if (this.viewport.width < 480) {
            this.viewport.sizeCategory = 'xs'; // Extra small (phones)
        } else if (this.viewport.width < 768) {
            this.viewport.sizeCategory = 'sm'; // Small (large phones, small tablets)
        } else if (this.viewport.width < 1024) {
            this.viewport.sizeCategory = 'md'; // Medium (tablets)
        } else if (this.viewport.width < 1440) {
            this.viewport.sizeCategory = 'lg'; // Large (laptops)
        } else {
            this.viewport.sizeCategory = 'xl'; // Extra large (desktops)
        }

        // Safe area (for notched devices)
        const style = getComputedStyle(document.documentElement);
        this.viewport.safeAreaTop = style.getPropertyValue('env(safe-area-inset-top)') || '0px';
        this.viewport.safeAreaBottom = style.getPropertyValue('env(safe-area-inset-bottom)') || '0px';
    }

    applyDeviceAttributes() {
        const body = document.body;

        // Apply data attributes for CSS targeting
        body.dataset.device = this.device.category;
        body.dataset.os = this.getOS();
        body.dataset.orientation = this.viewport.orientation;
        body.dataset.size = this.viewport.sizeCategory;
        body.dataset.touch = this.device.hasTouch ? 'true' : 'false';

        // Apply CSS classes for easy styling
        body.classList.add(`device-${this.device.category}`);
        body.classList.add(`os-${this.getOS()}`);
        body.classList.add(`orientation-${this.viewport.orientation}`);
        body.classList.add(`size-${this.viewport.sizeCategory}`);

        if (this.device.hasTouch) {
            body.classList.add('has-touch');
        }

        if (this.device.hasMouse) {
            body.classList.add('has-mouse');
        }

        console.log(`📐 Viewport: ${this.viewport.width}x${this.viewport.height} (${this.viewport.orientation})`);
        console.log(`📱 Device: ${this.device.category} | OS: ${this.getOS()} | Size: ${this.viewport.sizeCategory}`);
    }

    getOS() {
        if (this.device.isIOS) return 'ios';
        if (this.device.isAndroid) return 'android';
        if (this.device.isWindows) return 'windows';
        if (this.device.isMac) return 'mac';
        return 'other';
    }

    setupListeners() {
        // Handle resize events (including rotation)
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleViewportChange();
            }, 150); // Debounce for performance
        });

        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            // Slight delay to ensure measurements are accurate after rotation
            setTimeout(() => {
                this.handleViewportChange();
            }, 200);
        });

        // Prevent double-tap zoom on iOS
        if (this.device.isIOS) {
            let lastTouchEnd = 0;
            document.addEventListener('touchend', (e) => {
                const now = Date.now();
                if (now - lastTouchEnd <= 300) {
                    e.preventDefault();
                }
                lastTouchEnd = now;
            }, { passive: false });
        }

        // Prevent pinch zoom
        if (this.device.hasTouch) {
            document.addEventListener('touchmove', (e) => {
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
    }

    handleViewportChange() {
        const previousOrientation = this.viewport.orientation;
        const previousSize = this.viewport.sizeCategory;

        // Update viewport info
        this.updateViewportInfo();

        // Check if orientation changed
        if (this.viewport.orientation !== previousOrientation) {
            console.log(`🔄 Orientation changed: ${previousOrientation} → ${this.viewport.orientation}`);

            // Remove old orientation class
            document.body.classList.remove(`orientation-${previousOrientation}`);
            document.body.classList.add(`orientation-${this.viewport.orientation}`);
            document.body.dataset.orientation = this.viewport.orientation;

            // Dispatch custom event for game logic to respond if needed
            window.dispatchEvent(new CustomEvent('orientationchange', {
                detail: {
                    orientation: this.viewport.orientation,
                    width: this.viewport.width,
                    height: this.viewport.height
                }
            }));
        }

        // Check if size category changed
        if (this.viewport.sizeCategory !== previousSize) {
            console.log(`📏 Size category changed: ${previousSize} → ${this.viewport.sizeCategory}`);

            // Remove old size class
            document.body.classList.remove(`size-${previousSize}`);
            document.body.classList.add(`size-${this.viewport.sizeCategory}`);
            document.body.dataset.size = this.viewport.sizeCategory;
        }

        console.log(`📐 Viewport updated: ${this.viewport.width}x${this.viewport.height}`);
    }

    // Public API
    getDeviceInfo() {
        return {
            ...this.device,
            viewport: this.viewport
        };
    }

    isLandscape() {
        return this.viewport.orientation === 'landscape';
    }

    isPortrait() {
        return this.viewport.orientation === 'portrait';
    }

    getViewportSize() {
        return {
            width: this.viewport.width,
            height: this.viewport.height
        };
    }
}

// Initialize Device Intelligence as soon as possible
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.deviceIntelligence = new DeviceIntelligence();
    });
} else {
    window.deviceIntelligence = new DeviceIntelligence();
}

// Add viewport height CSS variable for dynamic viewport units
function updateViewportHeight() {
    // Use actual viewport height for mobile browsers (accounts for URL bar)
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

updateViewportHeight();
window.addEventListener('resize', updateViewportHeight);
window.addEventListener('orientationchange', () => {
    setTimeout(updateViewportHeight, 200);
});

console.log('🎯 Device Intelligence Module Loaded');
