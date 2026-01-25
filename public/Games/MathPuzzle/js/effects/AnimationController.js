/**
 * Animation Controller
 * Handles UI animations using anime.js
 */
class AnimationController {
    constructor(deviceDetector) {
        this.deviceDetector = deviceDetector;
        this.initializeAnimations();
        this.setupButtonAnimations();
    }

    initializeAnimations() {
        anime({
            targets: '.title-word',
            translateY: [-50, 0],
            opacity: [0, 1],
            scale: [0.8, 1],
            duration: 1500,
            delay: anime.stagger(200),
            easing: 'easeOutElastic(1, .8)'
        });

        anime({
            targets: '.game-button',
            translateY: [30, 0],
            opacity: [0, 1],
            scale: [0.9, 1],
            duration: 800,
            delay: anime.stagger(150, {start: 800}),
            easing: 'easeOutCubic'
        });

        anime({
            targets: '.title-word',
            textShadow: [
                '0 0 20px rgba(255, 107, 107, 0.5), 0 0 40px rgba(78, 205, 196, 0.3)',
                '0 0 30px rgba(78, 205, 196, 0.7), 0 0 50px rgba(255, 107, 107, 0.4)',
                '0 0 20px rgba(255, 107, 107, 0.5), 0 0 40px rgba(78, 205, 196, 0.3)'
            ],
            duration: 3000,
            loop: true,
            easing: 'easeInOutSine'
        });
    }

    setupButtonAnimations() {
        const buttons = document.querySelectorAll('.game-button');
        const hasTouch = this.deviceDetector?.device?.hasTouch || 
                        ('ontouchstart' in window) || 
                        (navigator.maxTouchPoints > 0);
        
        buttons.forEach(button => {
            if (!hasTouch) {
                button.addEventListener('mouseenter', () => {
                    anime({ targets: button, scale: 1.05, translateY: -5, duration: 300, easing: 'easeOutCubic' });
                });

                button.addEventListener('mouseleave', () => {
                    anime({ targets: button, scale: 1, translateY: 0, duration: 300, easing: 'easeOutCubic' });
                });
            }

            button.addEventListener('click', (e) => {
                this.createRippleEffect(e, button);
                this.animateButtonPress(button);
            });

            if (hasTouch) {
                button.addEventListener('touchstart', () => {
                    anime({ targets: button, scale: 0.98, duration: 150, easing: 'easeOutCubic' });
                });

                button.addEventListener('touchend', () => {
                    anime({ targets: button, scale: 1, duration: 150, easing: 'easeOutCubic' });
                });
            }
        });
    }

    createRippleEffect(e, button) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const clientX = e.clientX || (e.touches && e.touches[0].clientX) || rect.left + rect.width / 2;
        const clientY = e.clientY || (e.touches && e.touches[0].clientY) || rect.top + rect.height / 2;
        
        const x = clientX - rect.left - size / 2;
        const y = clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }

    animateButtonPress(button) {
        anime({
            targets: button,
            scale: 0.95,
            duration: 150,
            easing: 'easeOutCubic',
            complete: () => {
                anime({
                    targets: button,
                    scale: 1,
                    duration: 150,
                    easing: 'easeOutCubic'
                });
            }
        });
    }
}
