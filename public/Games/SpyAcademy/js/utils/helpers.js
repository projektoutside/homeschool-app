/**
 * Helper Utilities for The Light Challenge
 * Common functions used across the game
 */

class GameHelpers {
    constructor() {
        this.config = window.gameConfig;
        this.logger = window.logger;
    }
    
    /**
     * Debounce function to limit rapid function calls
     */
    debounce(func, delay = 300) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
    
    /**
     * Throttle function to limit function execution rate
     */
    throttle(func, delay = 100) {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    }
    
    /**
     * Create smooth transitions between values
     */
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    /**
     * Generate random number between min and max
     */
    random(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    /**
     * Generate random integer between min and max (inclusive)
     */
    randomInt(min, max) {
        return Math.floor(this.random(min, max + 1));
    }
    
    /**
     * Shuffle array using Fisher-Yates algorithm
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    /**
     * Deep clone an object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
    }
    
    /**
     * Wait for specified milliseconds
     */
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Create element with properties and styles
     */
    createElement(tag, properties = {}, styles = {}) {
        const element = document.createElement(tag);
        
        // Set properties
        Object.keys(properties).forEach(key => {
            if (key === 'innerHTML' || key === 'textContent') {
                element[key] = properties[key];
            } else {
                element.setAttribute(key, properties[key]);
            }
        });
        
        // Set styles
        Object.keys(styles).forEach(key => {
            element.style[key] = styles[key];
        });
        
        return element;
    }
    
    /**
     * Add universal event listener (simplified for maximum compatibility)
     */
    addUniversalEventListener(element, callback, options = {}) {
        if (!element) return;
        
        let touchHandled = false;
        let touchTimeout = null;
        
        // Simple click handler
        const clickHandler = (e) => {
            // If touch was recently handled, ignore click
            if (touchHandled) {
                e.preventDefault();
                return;
            }
            callback(e);
        };
        
        // Simple touch handlers
        const touchStartHandler = (e) => {
            touchHandled = true;
            
            // Add visual feedback
            if (element.classList) {
                element.classList.add('touching');
            }
            
            // Clear any existing timeout
            if (touchTimeout) {
                clearTimeout(touchTimeout);
            }
        };
        
        const touchEndHandler = (e) => {
            // Remove visual feedback
            if (element.classList) {
                element.classList.remove('touching');
            }
            
            // Trigger callback immediately
            callback(e);
            
            // Reset touch state after delay
            touchTimeout = setTimeout(() => {
                touchHandled = false;
            }, 300);
        };
        
        // Add event listeners
        try {
            // Always add click event
            element.addEventListener('click', clickHandler);
            
            // Add touch events if supported
            if ('ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0)) {
                element.addEventListener('touchstart', touchStartHandler, { passive: true });
                element.addEventListener('touchend', touchEndHandler, { passive: true });
                
                // Prevent context menu on long press for mobile
                element.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                });
            }
        } catch (error) {
            console.warn('Error adding event listeners:', error);
            // Fallback to basic click only
            element.addEventListener('click', callback);
        }
        
        // Store handlers for cleanup
        if (!element._universalHandlers) {
            element._universalHandlers = [];
        }
        element._universalHandlers.push({
            click: clickHandler,
            touchstart: touchStartHandler,
            touchend: touchEndHandler
        });
    }
    
    /**
     * Remove universal event listener
     */
    removeUniversalEventListener(element) {
        if (!element || !element._universalHandlers) return;
        
        element._universalHandlers.forEach(handlers => {
            try {
                element.removeEventListener('click', handlers.click);
                if (handlers.touchstart) element.removeEventListener('touchstart', handlers.touchstart);
                if (handlers.touchend) element.removeEventListener('touchend', handlers.touchend);
            } catch (error) {
                console.warn('Error removing event listeners:', error);
            }
        });
        
        element._universalHandlers = [];
    }
    
    /**
     * Add drag/swipe support for touch devices
     */
    addSwipeListener(element, callbacks = {}) {
        if (!element) return;
        
        let startX = 0;
        let startY = 0;
        let startTime = 0;
        const minSwipeDistance = 50;
        const maxSwipeTime = 500;
        
        const handleTouchStart = (e) => {
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            startTime = Date.now();
        };
        
        const handleTouchEnd = (e) => {
            if (!startTime) return;
            
            const touch = e.changedTouches[0];
            const endX = touch.clientX;
            const endY = touch.clientY;
            const endTime = Date.now();
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const deltaTime = endTime - startTime;
            
            // Check if this qualifies as a swipe
            if (deltaTime <= maxSwipeTime) {
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (distance >= minSwipeDistance) {
                    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
                    
                    // Determine swipe direction
                    if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        // Horizontal swipe
                        if (deltaX > 0 && callbacks.onSwipeRight) {
                            callbacks.onSwipeRight(e);
                        } else if (deltaX < 0 && callbacks.onSwipeLeft) {
                            callbacks.onSwipeLeft(e);
                        }
                    } else {
                        // Vertical swipe
                        if (deltaY > 0 && callbacks.onSwipeDown) {
                            callbacks.onSwipeDown(e);
                        } else if (deltaY < 0 && callbacks.onSwipeUp) {
                            callbacks.onSwipeUp(e);
                        }
                    }
                    
                    // General swipe callback
                    if (callbacks.onSwipe) {
                        callbacks.onSwipe(e, { deltaX, deltaY, distance, angle });
                    }
                }
            }
            
            // Reset
            startTime = 0;
        };
        
        if (this.config?.device.isTouchDevice) {
            element.addEventListener('touchstart', handleTouchStart, { passive: true });
            element.addEventListener('touchend', handleTouchEnd, { passive: true });
        }
    }
    
    /**
     * Remove all children from element
     */
    clearElement(element) {
        if (element) {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }
    }
    
    /**
     * Show element with fade-in animation
     */
    async showElement(element, duration = 300) {
        if (!element) return;
        
        // Check if this is a scene element and add active class
        if (element.classList.contains('scene')) {
            element.classList.add('active');
        }
        
        element.style.display = 'block';
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease-in-out`;
        
        // Force reflow
        element.offsetHeight;
        
        element.style.opacity = '1';
        
        return this.wait(duration);
    }
    
    /**
     * Hide element with fade-out animation
     */
    async hideElement(element, duration = 300) {
        if (!element) return;
        
        element.style.transition = `opacity ${duration}ms ease-in-out`;
        element.style.opacity = '0';
        
        await this.wait(duration);
        element.style.display = 'none';
        
        // Check if this is a scene element and remove active class
        if (element.classList.contains('scene')) {
            element.classList.remove('active');
        }
    }
    
    /**
     * Toggle element visibility
     */
    async toggleElement(element, show = null, duration = 300) {
        if (!element) return;
        
        const isVisible = element.style.display !== 'none' && element.style.opacity !== '0';
        const shouldShow = show !== null ? show : !isVisible;
        
        if (shouldShow) {
            await this.showElement(element, duration);
        } else {
            await this.hideElement(element, duration);
        }
    }
    
    /**
     * Format time in MM:SS format
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Get contrast color (black or white) for background
     */
    getContrastColor(hexColor) {
        // Remove # if present
        const color = hexColor.replace('#', '');
        
        // Convert to RGB
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
    
    /**
     * Lighten or darken a hex color
     */
    adjustColor(hexColor, percent) {
        const color = hexColor.replace('#', '');
        const num = parseInt(color, 16);
        
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    }
    
    /**
     * Convert hex color to rgba
     */
    hexToRgba(hex, alpha = 1) {
        const color = hex.replace('#', '');
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Capitalize first letter of string
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Generate unique ID
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Check if element is in viewport
     */
    isInViewport(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    
    /**
     * Smooth scroll to element
     */
    scrollToElement(element, offset = 0) {
        if (!element) return;
        
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition + offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
    
    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                textArea.remove();
                return true;
            } catch (err) {
                textArea.remove();
                return false;
            }
        }
    }
    
    /**
     * Get responsive values based on device
     */
    getResponsiveValue(mobileValue, desktopValue) {
        return this.config?.device.isMobile ? mobileValue : desktopValue;
    }
    
    /**
     * Performance-friendly animation frame request
     */
    requestAnimationFrame(callback) {
        if (window.requestAnimationFrame) {
            return window.requestAnimationFrame(callback);
        }
        // Fallback for older browsers
        return setTimeout(callback, 16);
    }
    
    /**
     * Cancel animation frame
     */
    cancelAnimationFrame(id) {
        if (window.cancelAnimationFrame) {
            window.cancelAnimationFrame(id);
        } else {
            clearTimeout(id);
        }
    }
    
    /**
     * Get device-specific CSS transform for better performance
     */
    getTransform(x = 0, y = 0, z = 0, rotateX = 0, rotateY = 0, rotateZ = 0) {
        return `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
    }
    
    /**
     * Feature detection utilities
     */
    supports = {
        webGL: () => {
            try {
                const canvas = document.createElement('canvas');
                return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
            } catch (e) {
                return false;
            }
        },
        
        localStorage: () => {
            try {
                const test = 'test';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) {
                return false;
            }
        },
        
        webAudio: () => {
            return !!(window.AudioContext || window.webkitAudioContext);
        },
        
        speechSynthesis: () => {
            return 'speechSynthesis' in window;
        },
        
        vibration: () => {
            return 'vibrate' in navigator;
        }
    };
}

// Create global helpers instance
window.gameHelpers = new GameHelpers();

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameHelpers;
} 