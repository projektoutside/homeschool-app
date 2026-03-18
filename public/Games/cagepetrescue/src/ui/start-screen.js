import { debugLog } from '../core/debug.js';

export function initializeStartScreen() {
    const gifImage = document.getElementById('animated-gif');

    if (!gifImage) {
        return;
    }

    const originalSrc = gifImage.src;
    const image = new Image();

    image.onload = () => {
        gifImage.style.animationDuration = '4s';
        gifImage.style.animationTimingFunction = 'linear';
        gifImage.style.animationIterationCount = 'infinite';
        debugLog('Initialized start screen animation timing');
    };

    image.src = originalSrc;
}
