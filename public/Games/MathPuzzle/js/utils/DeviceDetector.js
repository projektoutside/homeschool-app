/**
 * Device Detection and Adaptive Features
 * Handles responsive layout adjustments and device capability detection
 */
class DeviceDetector {
    constructor() {
        this.device = this.detectDevice();
        this.orientation = this.getOrientation();
        this.viewport = this.getViewport();
        this.resizeTimeout = null;
        this.setupEventListeners();
        this.adaptLayout();
    }

    detectDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
        const isTablet = /tablet|ipad/i.test(userAgent) || (isMobile && width > 768 && width < 1024);
        const isDesktop = !isMobile && !isTablet;

        return {
            isMobile: isMobile && !isTablet,
            isTablet,
            isDesktop,
            hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            pixelRatio: window.devicePixelRatio || 1,
            width,
            height: window.innerHeight
        };
    }

    getOrientation() {
        if (screen.orientation) {
            return screen.orientation.angle === 90 || screen.orientation.angle === -90 ? 'landscape' : 'portrait';
        }
        return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    }

    getViewport() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            aspectRatio: window.innerWidth / window.innerHeight
        };
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => this.handleResize(), 150);
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleOrientationChange(), 200);
        });

        if (screen.orientation) {
            screen.orientation.addEventListener('change', () => {
                setTimeout(() => this.handleOrientationChange(), 100);
            });
        }

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => this.handleViewportChange());
        }

        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    handleResize() {
        this.device = this.detectDevice();
        this.viewport = this.getViewport();
        this.adaptLayout();
    }

    handleOrientationChange() {
        this.orientation = this.getOrientation();
        this.device = this.detectDevice();
        this.viewport = this.getViewport();
        this.adaptLayout();
    }

    handleViewportChange() {
        if (window.visualViewport) {
            this.viewport = {
                width: window.visualViewport.width,
                height: window.visualViewport.height,
                aspectRatio: window.visualViewport.width / window.visualViewport.height
            };
            this.adaptLayout();
        }
    }

    adaptLayout() {
        const deviceType = this.device.isMobile ? 'mobile' : this.device.isTablet ? 'tablet' : 'desktop';
        document.body.setAttribute('data-device', deviceType);
        document.body.setAttribute('data-orientation', this.orientation);
        document.body.setAttribute('data-viewport-width', this.viewport.width);
        document.body.setAttribute('data-viewport-height', this.viewport.height);
        
        document.documentElement.style.setProperty('--viewport-width', `${this.viewport.width}px`);
        document.documentElement.style.setProperty('--viewport-height', `${this.viewport.height}px`);
        document.documentElement.style.setProperty('--viewport-aspect', this.viewport.aspectRatio);
        
        window.dispatchEvent(new CustomEvent('layoutChanged', { detail: { 
            device: this.device, 
            viewport: this.viewport, 
            orientation: this.orientation 
        }}));
        
        this.ensureViewportFit();
        
        if (window.mathGameController) {
            setTimeout(() => window.mathGameController.optimizeEquationLayout(), 200);
        }
    }

    ensureViewportFit() {
        document.body.style.maxWidth = '100vw';
        document.body.style.overflowX = 'hidden';
        
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            if (page.style.display !== 'none') {
                const rect = page.getBoundingClientRect();
                if (rect.width > window.innerWidth) {
                    page.style.width = '100vw';
                    page.style.maxWidth = '100vw';
                }
                if (rect.height > window.innerHeight) {
                    page.style.maxHeight = '100vh';
                    page.style.maxHeight = '100dvh';
                }
            }
        });
    }
}
