// Fix for mobile address bar height and viewport issues
function fixMobileViewport() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Add safe area insets to CSS variables
    if ('CSS' in window && 'supports' in window.CSS && window.CSS.supports('padding-top: env(safe-area-inset-top)')) {
        const div = document.createElement('div');
        div.style.paddingTop = 'env(safe-area-inset-top)';
        div.style.paddingBottom = 'env(safe-area-inset-bottom)';
        div.style.position = 'fixed';
        div.style.visibility = 'hidden';
        document.body.appendChild(div);
        
        const style = window.getComputedStyle(div);
        document.documentElement.style.setProperty('--safe-area-top', style.paddingTop);
        document.documentElement.style.setProperty('--safe-area-bottom', style.paddingBottom);
        
        document.body.removeChild(div);
    }
}

// Ensure the fix runs on load and resize
window.addEventListener('load', fixMobileViewport);
window.addEventListener('resize', fixMobileViewport);
window.addEventListener('orientationchange', () => {
    setTimeout(fixMobileViewport, 100);
});

// Run immediately
fixMobileViewport();

// Detect touch capability and add class to body
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.body.classList.add('touch-device');
}

// Standard helper for all dynamic overlays to ensure they are scrollable and fit viewport
window.createSafeOverlay = function(id, className = 'challenge-overlay') {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = className;
    
    // Core styling to ensure perfect fit and scrollability on all devices
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        height: calc(var(--vh, 1vh) * 100);
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        z-index: 10000;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: env(safe-area-inset-top, 20px) 15px calc(env(safe-area-inset-bottom, 20px) + 60px);
        box-sizing: border-box;
    `;
    
    return overlay;
};

// Standard helper for standard content containers inside overlays
window.createSafeContent = function(styleOverride = '') {
    const content = document.createElement('div');
    content.style.cssText = `
        max-width: 800px;
        width: 100%;
        margin: auto 0;
        flex-shrink: 0;
        text-align: center;
        ${styleOverride}
    `;
    return content;
};
