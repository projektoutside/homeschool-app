/**
 * Viewport Detection and Adaptation Module
 * Handles device detection, orientation changes, and dynamic layout adjustments
 * for cross-platform responsive behavior
 */

(function() {
  'use strict';

  // ========================================================================
  // VIEWPORT STATE
  // ========================================================================
  const ViewportState = {
    width: window.innerWidth,
    height: window.innerHeight,
    orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
    deviceType: 'desktop',
    isTouch: false,
    pixelRatio: window.devicePixelRatio || 1,
    safeAreaInsets: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  };

  // ========================================================================
  // DEVICE DETECTION
  // ========================================================================
  function detectDeviceType() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);
    
    // Check for touch capability
    ViewportState.isTouch = (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0 ||
      window.matchMedia('(hover: none)').matches
    );

    // Device type detection based on screen size and touch capability
    if (minDimension < 480) {
      ViewportState.deviceType = 'mobile-small';
    } else if (minDimension < 768) {
      ViewportState.deviceType = 'mobile';
    } else if (minDimension < 1024 && ViewportState.isTouch) {
      ViewportState.deviceType = 'tablet';
    } else if (minDimension >= 1024 && ViewportState.isTouch) {
      ViewportState.deviceType = 'tablet-large';
    } else if (maxDimension >= 1920) {
      ViewportState.deviceType = 'desktop-large';
    } else {
      ViewportState.deviceType = 'desktop';
    }

    // Add device class to body
    document.body.classList.remove(
      'device-mobile-small', 'device-mobile', 'device-tablet',
      'device-tablet-large', 'device-desktop', 'device-desktop-large'
    );
    document.body.classList.add(`device-${ViewportState.deviceType}`);
    
    // Add touch class
    document.body.classList.toggle('touch-device', ViewportState.isTouch);
    document.body.classList.toggle('pointer-device', !ViewportState.isTouch);

    return ViewportState.deviceType;
  }

  // ========================================================================
  // ORIENTATION DETECTION
  // ========================================================================
  function detectOrientation() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    ViewportState.width = width;
    ViewportState.height = height;
    ViewportState.orientation = height > width ? 'portrait' : 'landscape';

    // Update body classes
    document.body.classList.remove('orientation-portrait', 'orientation-landscape');
    document.body.classList.add(`orientation-${ViewportState.orientation}`);

    // Dispatch custom event for orientation change
    window.dispatchEvent(new CustomEvent('viewportOrientationChange', {
      detail: {
        orientation: ViewportState.orientation,
        width: width,
        height: height
      }
    }));

    return ViewportState.orientation;
  }

  // ========================================================================
  // SAFE AREA INSETS (for notches, Dynamic Island, etc.)
  // ========================================================================
  function detectSafeAreaInsets() {
    // Create a temporary element to measure CSS env() values
    const testEl = document.createElement('div');
    testEl.style.cssText = `
      position: fixed;
      top: env(safe-area-inset-top, 0px);
      right: env(safe-area-inset-right, 0px);
      bottom: env(safe-area-inset-bottom, 0px);
      left: env(safe-area-inset-left, 0px);
      pointer-events: none;
      visibility: hidden;
    `;
    document.body.appendChild(testEl);
    
    const computed = window.getComputedStyle(testEl);
    ViewportState.safeAreaInsets = {
      top: parseFloat(computed.top) || 0,
      right: parseFloat(computed.right) || 0,
      bottom: parseFloat(computed.bottom) || 0,
      left: parseFloat(computed.left) || 0
    };
    
    document.body.removeChild(testEl);
    
    // Set CSS custom properties for safe areas
    const root = document.documentElement;
    root.style.setProperty('--safe-area-top', `${ViewportState.safeAreaInsets.top}px`);
    root.style.setProperty('--safe-area-right', `${ViewportState.safeAreaInsets.right}px`);
    root.style.setProperty('--safe-area-bottom', `${ViewportState.safeAreaInsets.bottom}px`);
    root.style.setProperty('--safe-area-left', `${ViewportState.safeAreaInsets.left}px`);
  }

  // ========================================================================
  // DYNAMIC VIEWPORT HEIGHT FIX (iOS Safari 100vh issue)
  // ========================================================================
  function updateViewportHeight() {
    // Get the actual viewport height
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
    document.documentElement.style.setProperty('--viewport-width', `${window.innerWidth}px`);
  }

  // ========================================================================
  // CANVAS RESIZE HANDLER
  // ========================================================================
  function resizeAllCanvases() {
    // Find all game canvases and trigger resize
    const canvases = document.querySelectorAll(
      '#handwriting-canvas, #work-canvas, #p1-canvas, #p2-canvas, #p1-work-canvas, #p2-work-canvas'
    );
    
    canvases.forEach(canvas => {
      if (canvas && canvas.offsetParent !== null) {
        // Trigger resize event for canvas handlers
        const resizeEvent = new Event('resize', { bubbles: false });
        canvas.dispatchEvent(resizeEvent);
      }
    });

    // Dispatch global canvas resize event
    window.dispatchEvent(new CustomEvent('canvasResize', {
      detail: {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1
      }
    }));
  }

  // ========================================================================
  // KEYBOARD VISIBILITY DETECTION (for mobile)
  // ========================================================================
  let lastViewportHeight = window.innerHeight;
  
  function detectKeyboardVisibility() {
    const currentHeight = window.innerHeight;
    const heightDiff = lastViewportHeight - currentHeight;
    
    // If height decreased significantly, keyboard is likely visible
    const keyboardVisible = heightDiff > 150;
    
    document.body.classList.toggle('keyboard-visible', keyboardVisible);
    
    if (keyboardVisible !== document.body.classList.contains('keyboard-was-visible')) {
      document.body.classList.toggle('keyboard-was-visible', keyboardVisible);
      window.dispatchEvent(new CustomEvent('keyboardVisibilityChange', {
        detail: { visible: keyboardVisible, heightDiff: heightDiff }
      }));
    }
    
    lastViewportHeight = currentHeight;
  }

  // ========================================================================
  // PERFORMANCE-OPTIMIZED RESIZE HANDLER
  // ========================================================================
  let resizeTimeout = null;
  let orientationChangeTimeout = null;

  function handleResize() {
    // Immediate updates for critical layout
    updateViewportHeight();
    
    // Debounced updates for expensive operations
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    
    resizeTimeout = setTimeout(() => {
      detectDeviceType();
      detectOrientation();
      detectSafeAreaInsets();
      resizeAllCanvases();
      detectKeyboardVisibility();
      
      // Dispatch viewport update event
      window.dispatchEvent(new CustomEvent('viewportUpdate', {
        detail: { ...ViewportState }
      }));
    }, 100);
  }

  function handleOrientationChange() {
    // iOS needs a delay for orientation change to complete
    if (orientationChangeTimeout) {
      clearTimeout(orientationChangeTimeout);
    }
    
    orientationChangeTimeout = setTimeout(() => {
      handleResize();
    }, 150);
  }

  // ========================================================================
  // PREVENT ZOOM ON DOUBLE TAP (for game canvases)
  // ========================================================================
  function preventDoubleTapZoom() {
    let lastTouchEnd = 0;
    
    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        // Check if the target is a canvas or button
        const target = event.target;
        if (target.tagName === 'CANVAS' || target.tagName === 'BUTTON') {
          event.preventDefault();
        }
      }
      lastTouchEnd = now;
    }, { passive: false });
  }

  // ========================================================================
  // SCROLL LOCK FOR MODALS
  // ========================================================================
  let scrollPosition = 0;

  window.lockScroll = function() {
    scrollPosition = window.pageYOffset;
    document.body.classList.add('no-scroll');
    document.body.style.top = `-${scrollPosition}px`;
  };

  window.unlockScroll = function() {
    document.body.classList.remove('no-scroll');
    document.body.style.top = '';
    window.scrollTo(0, scrollPosition);
  };

  // ========================================================================
  // INITIALIZATION
  // ========================================================================
  function init() {
    // Initial detection
    updateViewportHeight();
    detectDeviceType();
    detectOrientation();
    detectSafeAreaInsets();

    // Event listeners
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Visual viewport API for better mobile support
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', updateViewportHeight);
    }

    // Prevent double-tap zoom on interactive elements
    preventDoubleTapZoom();

    // Initial canvas resize after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(resizeAllCanvases, 100);
      });
    } else {
      setTimeout(resizeAllCanvases, 100);
    }

    // Log viewport info in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('[Viewport] Initialized:', ViewportState);
    }
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================
  window.ViewportManager = {
    getState: () => ({ ...ViewportState }),
    getDeviceType: () => ViewportState.deviceType,
    getOrientation: () => ViewportState.orientation,
    isTouch: () => ViewportState.isTouch,
    isMobile: () => ['mobile-small', 'mobile'].includes(ViewportState.deviceType),
    isTablet: () => ['tablet', 'tablet-large'].includes(ViewportState.deviceType),
    isDesktop: () => ['desktop', 'desktop-large'].includes(ViewportState.deviceType),
    isLandscape: () => ViewportState.orientation === 'landscape',
    isPortrait: () => ViewportState.orientation === 'portrait',
    refresh: handleResize,
    lockScroll: window.lockScroll,
    unlockScroll: window.unlockScroll
  };

  // Initialize on load
  init();

})();
