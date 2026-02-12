/**
 * Viewport Safety Utility
 * =======================
 * Runtime viewport adjustments for mobile devices
 * Ensures content never extends beyond the visible screen
 * 
 * Usage:
 *   <script src="/js/viewport-safety.js"></script>
 *   <script>ViewportSafety.init();</script>
 */

(function(global) {
  'use strict';

  /**
   * Viewport Safety System
   */
  const ViewportSafety = {
    // Configuration
    config: {
      debug: false,
      minScale: 0.5,
      maxScale: 1.0,
      bottomObstructionThreshold: 50, // pixels
      resizeDebounceMs: 100,
      checkIntervalMs: 500
    },

    // State
    state: {
      isInitialized: false,
      lastViewportHeight: 0,
      lastViewportWidth: 0,
      resizeTimeout: null,
      checkInterval: null,
      safeAreaInsets: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    },

    /**
     * Initialize the viewport safety system
     */
    init: function(options) {
      if (this.state.isInitialized) {
        this.log('ViewportSafety already initialized');
        return this;
      }

      // Merge options
      if (options) {
        Object.assign(this.config, options);
      }

      this.log('Initializing ViewportSafety...');

      // Detect safe area insets
      this.detectSafeAreaInsets();

      // Set up event listeners
      this.setupEventListeners();

      // Apply initial safety measures
      this.applySafetyMeasures();

      // Start periodic checks
      this.startPeriodicChecks();

      this.state.isInitialized = true;
      this.log('ViewportSafety initialized');

      return this;
    },

    /**
     * Log messages (only in debug mode)
     */
    log: function(...args) {
      if (this.config.debug) {
        console.log('[ViewportSafety]', ...args);
      }
    },

    /**
     * Detect safe area insets using CSS env() variables
     */
    detectSafeAreaInsets: function() {
      // Create a test element to measure safe areas
      const testEl = document.createElement('div');
      testEl.style.cssText = `
        position: fixed;
        inset: 0;
        padding-top: env(safe-area-inset-top, 0px);
        padding-right: env(safe-area-inset-right, 0px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
        padding-left: env(safe-area-inset-left, 0px);
        visibility: hidden;
        pointer-events: none;
        z-index: -1;
      `;
      document.body.appendChild(testEl);

      // Get computed styles
      const styles = window.getComputedStyle(testEl);
      this.state.safeAreaInsets = {
        top: parseInt(styles.paddingTop) || 0,
        right: parseInt(styles.paddingRight) || 0,
        bottom: parseInt(styles.paddingBottom) || 0,
        left: parseInt(styles.paddingLeft) || 0
      };

      document.body.removeChild(testEl);

      this.log('Safe area insets detected:', this.state.safeAreaInsets);
    },

    /**
     * Set up event listeners for viewport changes
     */
    setupEventListeners: function() {
      const self = this;

      // Handle resize events with debouncing
      window.addEventListener('resize', function() {
        clearTimeout(self.state.resizeTimeout);
        self.state.resizeTimeout = setTimeout(function() {
          self.handleViewportChange();
        }, self.config.resizeDebounceMs);
      }, { passive: true });

      // Handle orientation changes
      window.addEventListener('orientationchange', function() {
        // Wait for orientation change to complete
        setTimeout(function() {
          self.handleViewportChange();
        }, 300);
      }, { passive: true });

      // Handle visual viewport changes (mobile browser chrome show/hide)
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', function() {
          self.handleViewportChange();
        }, { passive: true });
      }

      // Handle fullscreen changes
      document.addEventListener('fullscreenchange', function() {
        self.handleViewportChange();
      });
      document.addEventListener('webkitfullscreenchange', function() {
        self.handleViewportChange();
      });

      this.log('Event listeners set up');
    },

    /**
     * Handle viewport changes
     */
    handleViewportChange: function() {
      const currentHeight = this.getViewportHeight();
      const currentWidth = this.getViewportWidth();

      // Check if viewport actually changed
      if (currentHeight === this.state.lastViewportHeight &&
          currentWidth === this.state.lastViewportWidth) {
        return;
      }

      this.log('Viewport changed:', { 
        width: currentWidth, 
        height: currentHeight,
        previousHeight: this.state.lastViewportHeight
      });

      this.state.lastViewportHeight = currentHeight;
      this.state.lastViewportWidth = currentWidth;

      this.applySafetyMeasures();
    },

    /**
     * Get the current viewport height
     */
    getViewportHeight: function() {
      // Use visualViewport if available (accounts for mobile browser chrome)
      if (window.visualViewport) {
        return window.visualViewport.height;
      }
      // Fallback to window inner height
      return window.innerHeight;
    },

    /**
     * Get the current viewport width
     */
    getViewportWidth: function() {
      if (window.visualViewport) {
        return window.visualViewport.width;
      }
      return window.innerWidth;
    },

    /**
     * Apply safety measures to prevent overflow
     */
    applySafetyMeasures: function() {
      const viewportHeight = this.getViewportHeight();
      const viewportWidth = this.getViewportWidth();
      const insets = this.state.safeAreaInsets;

      // Calculate available space
      const availableHeight = viewportHeight - insets.top - insets.bottom;
      const availableWidth = viewportWidth - insets.left - insets.right;

      this.log('Available space:', { 
        width: availableWidth, 
        height: availableHeight 
      });

      // Update CSS custom properties
      this.updateCSSProperties(viewportHeight, viewportWidth, availableHeight, availableWidth);

      // Check for overflow
      this.checkForOverflow();

      // Adjust fixed elements
      this.adjustFixedElements();

      // Adjust iframe containers
      this.adjustIframeContainers();
    },

    /**
     * Update CSS custom properties for viewport dimensions
     */
    updateCSSProperties: function(viewportHeight, viewportWidth, availableHeight, availableWidth) {
      const root = document.documentElement;

      // Viewport dimensions
      root.style.setProperty('--viewport-height', viewportHeight + 'px');
      root.style.setProperty('--viewport-width', viewportWidth + 'px');
      root.style.setProperty('--available-height', availableHeight + 'px');
      root.style.setProperty('--available-width', availableWidth + 'px');

      // Safe area insets
      root.style.setProperty('--safe-area-top', this.state.safeAreaInsets.top + 'px');
      root.style.setProperty('--safe-area-right', this.state.safeAreaInsets.right + 'px');
      root.style.setProperty('--safe-area-bottom', this.state.safeAreaInsets.bottom + 'px');
      root.style.setProperty('--safe-area-left', this.state.safeAreaInsets.left + 'px');

      // Bottom obstruction (mobile browser chrome)
      const layoutHeight = window.innerHeight;
      const visualHeight = viewportHeight;
      const bottomObstruction = Math.max(0, layoutHeight - visualHeight);
      root.style.setProperty('--viewport-bottom-obstruction', bottomObstruction + 'px');
    },

    /**
     * Check for elements that might overflow the viewport
     */
    checkForOverflow: function() {
      const viewportHeight = this.getViewportHeight();
      const viewportWidth = this.getViewportWidth();
      const insets = this.state.safeAreaInsets;

      // Check body/html overflow
      const body = document.body;
      const html = document.documentElement;

      // Check if body/html are larger than viewport
      const bodyHeight = Math.max(body.scrollHeight, body.offsetHeight);
      const bodyWidth = Math.max(body.scrollWidth, body.offsetWidth);

      if (bodyHeight > viewportHeight + 10) {
        this.log('Warning: Body height exceeds viewport:', bodyHeight, '>', viewportHeight);
        
        // Add overflow protection
        body.style.maxHeight = viewportHeight + 'px';
        body.style.overflowY = 'auto';
      }

      if (bodyWidth > viewportWidth + 10) {
        this.log('Warning: Body width exceeds viewport:', bodyWidth, '>', viewportWidth);
        
        body.style.maxWidth = viewportWidth + 'px';
        body.style.overflowX = 'hidden';
      }

      // Check fixed position elements
      const fixedElements = document.querySelectorAll('[style*="position: fixed"], .fixed, [class*="fixed"]');
      fixedElements.forEach(function(el) {
        const rect = el.getBoundingClientRect();
        
        // Check if element extends beyond viewport
        if (rect.bottom > viewportHeight - insets.bottom) {
          this.log('Warning: Fixed element extends below viewport:', el);
          el.style.maxHeight = (viewportHeight - insets.top - insets.bottom - rect.top) + 'px';
          el.style.overflowY = 'auto';
        }
      }.bind(this));
    },

    /**
     * Adjust fixed position elements to respect safe areas
     */
    adjustFixedElements: function() {
      const insets = this.state.safeAreaInsets;
      const fixedElements = document.querySelectorAll('[style*="position: fixed"], .fixed');

      fixedElements.forEach(function(el) {
        const computedStyle = window.getComputedStyle(el);
        
        // Skip if already has safe area handling
        if (el.hasAttribute('data-safe-area-handled')) {
          return;
        }

        // Check position
        const top = parseInt(computedStyle.top);
        const bottom = parseInt(computedStyle.bottom);
        const left = parseInt(computedStyle.left);
        const right = parseInt(computedStyle.right);

        // Adjust based on position
        if (top === 0) {
          el.style.top = insets.top + 'px';
        }
        if (bottom === 0) {
          el.style.bottom = insets.bottom + 'px';
        }
        if (left === 0) {
          el.style.left = insets.left + 'px';
        }
        if (right === 0) {
          el.style.right = insets.right + 'px';
        }

        el.setAttribute('data-safe-area-handled', 'true');
      });
    },

    /**
     * Adjust iframe containers to prevent overflow
     */
    adjustIframeContainers: function() {
      const viewportHeight = this.getViewportHeight();
      const insets = this.state.safeAreaInsets;
      const availableHeight = viewportHeight - insets.top - insets.bottom;

      const iframes = document.querySelectorAll('iframe, .iframe-container, [class*="iframe"]');

      iframes.forEach(function(iframe) {
        // Check if iframe is larger than available space
        const rect = iframe.getBoundingClientRect();
        
        if (rect.height > availableHeight) {
          this.log('Adjusting iframe height to fit viewport');
          iframe.style.height = availableHeight + 'px';
          iframe.style.maxHeight = availableHeight + 'px';
        }
      }.bind(this));
    },

    /**
     * Start periodic checks for viewport changes
     */
    startPeriodicChecks: function() {
      if (this.state.checkInterval) {
        clearInterval(this.state.checkInterval);
      }

      this.state.checkInterval = setInterval(function() {
        this.handleViewportChange();
      }.bind(this), this.config.checkIntervalMs);
    },

    /**
     * Stop periodic checks
     */
    stopPeriodicChecks: function() {
      if (this.state.checkInterval) {
        clearInterval(this.state.checkInterval);
        this.state.checkInterval = null;
      }
    },

    /**
     * Force a viewport recalculation
     */
    refresh: function() {
      this.detectSafeAreaInsets();
      this.handleViewportChange();
      return this;
    },

    /**
     * Enable debug mode
     */
    enableDebug: function() {
      this.config.debug = true;
      document.documentElement.classList.add('debug-safe-areas');
      this.log('Debug mode enabled');
      return this;
    },

    /**
     * Disable debug mode
     */
    disableDebug: function() {
      this.config.debug = false;
      document.documentElement.classList.remove('debug-safe-areas');
      return this;
    },

    /**
     * Get current safe area insets
     */
    getSafeAreaInsets: function() {
      return { ...this.state.safeAreaInsets };
    },

    /**
     * Get current viewport dimensions
     */
    getViewportDimensions: function() {
      return {
        width: this.getViewportWidth(),
        height: this.getViewportHeight(),
        availableWidth: this.getViewportWidth() - this.state.safeAreaInsets.left - this.state.safeAreaInsets.right,
        availableHeight: this.getViewportHeight() - this.state.safeAreaInsets.top - this.state.safeAreaInsets.bottom
      };
    },

    /**
     * Destroy the viewport safety system
     */
    destroy: function() {
      this.stopPeriodicChecks();
      clearTimeout(this.state.resizeTimeout);
      this.state.isInitialized = false;
      this.log('ViewportSafety destroyed');
      return this;
    }
  };

  // Expose to global scope
  global.ViewportSafety = ViewportSafety;

  // Auto-initialize if data-auto-init attribute is present
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      if (document.querySelector('[data-viewport-safety-auto]')) {
        ViewportSafety.init();
      }
    });
  } else {
    if (document.querySelector('[data-viewport-safety-auto]')) {
      ViewportSafety.init();
    }
  }

})(window);
