/**
 * Mobile-Compatible 3D Main Menu Scene
 * Simplified for better mobile browser compatibility
 */

// Simple namespace for 3D scene
window.mainMenuScene = {
    scene: null,
    camera: null,
    renderer: null,
    diamond: null,
    animationId: null,
    initialized: false,
    
    init: function() {
        if (this.initialized) return;
        
        try {
            console.log('🎨 Initializing 3D main menu scene...');
            
            // Check for WebGL support with fallback
            if (!this.checkWebGLSupport()) {
                console.warn('WebGL not supported, skipping 3D scene');
                return;
            }
            
            const container = document.getElementById('three-container');
            if (!container) {
                console.warn('3D container not found');
                return;
            }
            
            this.setupScene();
            this.setupCamera();
            this.setupRenderer(container);
            this.createDiamond();
            this.setupLighting();
            this.setupInteraction();
            this.startAnimation();
            
            this.initialized = true;
            console.log('✅ 3D scene initialized successfully');
            
        } catch (error) {
            console.warn('3D scene initialization failed:', error);
            // Don't fail the entire app if 3D doesn't work
        }
    },
    
    checkWebGLSupport: function() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (
                canvas.getContext('webgl') || 
                canvas.getContext('experimental-webgl') ||
                canvas.getContext('webkit-3d') ||
                canvas.getContext('moz-webgl')
            ));
        } catch (e) {
            return false;
        }
    },
    
    setupScene: function() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000511);
    },
    
    setupCamera: function() {
        const container = document.getElementById('three-container');
        const aspect = container ? (container.clientWidth / container.clientHeight) : (window.innerWidth / window.innerHeight);
        
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.z = 5;
    },
    
    setupRenderer: function(container) {
        try {
            // Mobile-friendly renderer settings
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: false, // Disable for mobile performance
                alpha: true,
                powerPreference: 'low-power', // Better for mobile
                precision: 'mediump' // Medium precision for mobile
            });
            
            // Set size with pixel ratio consideration
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
            this.renderer.setPixelRatio(pixelRatio);
            this.renderer.setSize(container.clientWidth, container.clientHeight);
            
            // Mobile-friendly settings
            this.renderer.shadowMap.enabled = false; // Disable shadows for performance
            this.renderer.physicallyCorrectLights = false;
            
            container.appendChild(this.renderer.domElement);
            
            // Handle resize
            window.addEventListener('resize', this.handleResize.bind(this));
            window.addEventListener('orientationchange', function() {
                setTimeout(this.handleResize.bind(this), 100);
            }.bind(this));
            
        } catch (error) {
            console.error('Renderer setup failed:', error);
            throw error;
        }
    },
    
    createDiamond: function() {
        try {
            // Create a more detailed diamond with line textures
            const geometry = new THREE.OctahedronGeometry(1.5, 2); // Increased detail level
            
            // Create wireframe for line details
            const wireframeGeometry = new THREE.EdgesGeometry(geometry);
            const wireframeMaterial = new THREE.LineBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.8,
                linewidth: 2
            });
            const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
            
            // Main solid diamond with reduced opacity for layering effect
            const solidMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.3,
                wireframe: false
            });
            
            // Create inner crystal structure
            const innerGeometry = new THREE.OctahedronGeometry(1.2, 1);
            const innerWireframeGeometry = new THREE.EdgesGeometry(innerGeometry);
            const innerWireframeMaterial = new THREE.LineBasicMaterial({
                color: 0x4dffff,
                transparent: true,
                opacity: 0.6,
                linewidth: 1
            });
            const innerWireframe = new THREE.LineSegments(innerWireframeGeometry, innerWireframeMaterial);
            
            // Create core crystal
            const coreGeometry = new THREE.OctahedronGeometry(0.8, 0);
            const coreMaterial = new THREE.MeshBasicMaterial({
                color: 0x80ffff,
                transparent: true,
                opacity: 0.2
            });
            const core = new THREE.Mesh(coreGeometry, coreMaterial);
            
            // Combine all elements
            this.diamond = new THREE.Group();
            this.diamond.add(new THREE.Mesh(geometry, solidMaterial));
            this.diamond.add(wireframe);
            this.diamond.add(innerWireframe);
            this.diamond.add(core);
            
            // Add energy rings around the diamond
            for (let i = 0; i < 3; i++) {
                const ringGeometry = new THREE.RingGeometry(2 + i * 0.3, 2.1 + i * 0.3, 32);
                const ringMaterial = new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.4 - i * 0.1,
                    side: THREE.DoubleSide
                });
                const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                ring.rotation.x = Math.PI / 2;
                ring.userData = { rotationSpeed: 0.01 + i * 0.005 };
                this.diamond.add(ring);
            }
            
            this.diamond.userData = {
                hoverEffect: false,
                touchEffect: false
            };
            
            this.scene.add(this.diamond);
            
            // Create floating particles
            this.createFloatingParticles();
            
        } catch (error) {
            console.error('Diamond creation failed:', error);
            throw error;
        }
    },
    
    createFloatingParticles: function() {
        try {
            // Create particle system
            const particleCount = this.checkWebGLSupport() ? 150 : 75; // Reduce for lower-end devices
            const particles = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);
            const sizes = new Float32Array(particleCount);
            
            // Position particles in a sphere around the scene
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                
                // Random position in a sphere
                const radius = 8 + Math.random() * 12;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                
                positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
                positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
                positions[i3 + 2] = radius * Math.cos(phi);
                
                // Color variation (cyan to white)
                const colorIntensity = 0.5 + Math.random() * 0.5;
                colors[i3] = 0; // Red
                colors[i3 + 1] = colorIntensity; // Green (cyan component)
                colors[i3 + 2] = colorIntensity; // Blue (cyan component)
                
                // Random sizes
                sizes[i] = Math.random() * 3 + 1;
            }
            
            particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            
            // Particle material with glow effect
            const particleMaterial = new THREE.PointsMaterial({
                size: 0.1,
                transparent: true,
                opacity: 0.8,
                vertexColors: true,
                blending: THREE.AdditiveBlending,
                sizeAttenuation: true
            });
            
            this.particles = new THREE.Points(particles, particleMaterial);
            this.particles.userData = {
                originalPositions: positions.slice(),
                time: 0
            };
            
            this.scene.add(this.particles);
            
        } catch (error) {
            console.warn('Particle creation failed:', error);
            // Continue without particles
        }
    },
    
    setupLighting: function() {
        try {
            // Simple lighting for mobile performance
            const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
            this.scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0x00ffff, 0.5);
            directionalLight.position.set(1, 1, 1);
            this.scene.add(directionalLight);
            
        } catch (error) {
            console.warn('Lighting setup failed:', error);
            // Continue without fancy lighting
        }
    },
    
    setupInteraction: function() {
        try {
            const container = document.getElementById('three-container');
            const overlay = document.querySelector('.menu-overlay');
            
            if (!container) return;
            
            let isInteracting = false;
            
            // Mouse interaction for desktop
            container.addEventListener('mouseenter', function() {
                if (this.diamond && !isInteracting) {
                    isInteracting = true;
                    this.diamond.userData.hoverEffect = true;
                }
            }.bind(this));
            
            container.addEventListener('mouseleave', function() {
                if (this.diamond && isInteracting) {
                    isInteracting = false;
                    this.diamond.userData.hoverEffect = false;
                }
            }.bind(this));
            
            // Touch interaction for mobile
            if ('ontouchstart' in window) {
                container.addEventListener('touchstart', function(e) {
                    if (e.cancelable) {
                        e.preventDefault();
                    }
                    if (this.diamond) {
                        this.diamond.userData.touchEffect = true;
                        isInteracting = true;
                    }
                }.bind(this), { passive: false });
                
                container.addEventListener('touchend', function(e) {
                    if (e.cancelable) {
                        e.preventDefault();
                    }
                    if (this.diamond) {
                        this.diamond.userData.touchEffect = false;
                        isInteracting = false;
                    }
                }.bind(this), { passive: false });
            }
            
        } catch (error) {
            console.warn('Interaction setup failed:', error);
            // Continue without interactions
        }
    },
    
    startAnimation: function() {
        const animate = function() {
            this.animationId = requestAnimationFrame(animate.bind(this));
            
            try {
                if (this.diamond) {
                    // Base rotation
                    let rotationSpeedX = 0.005;
                    let rotationSpeedY = 0.01;
                    
                    // Increase rotation speed on hover or touch
                    if (this.diamond.userData.hoverEffect) {
                        rotationSpeedX *= 1.5;
                        rotationSpeedY *= 1.5;
                    }
                    
                    if (this.diamond.userData.touchEffect) {
                        rotationSpeedX *= 2;
                        rotationSpeedY *= 2;
                        
                        // Add subtle pulsing effect on touch
                        const scale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
                        this.diamond.scale.setScalar(scale);
                    } else {
                        this.diamond.scale.setScalar(1);
                    }
                    
                    this.diamond.rotation.x += rotationSpeedX;
                    this.diamond.rotation.y += rotationSpeedY;
                    
                    // Animate energy rings
                    this.diamond.children.forEach((child, index) => {
                        if (child.userData && child.userData.rotationSpeed) {
                            child.rotation.z += child.userData.rotationSpeed;
                            // Add pulsing opacity effect
                            const time = Date.now() * 0.001;
                            child.material.opacity = (0.4 - index * 0.1) + Math.sin(time + index) * 0.1;
                        }
                    });
                }
                
                // Animate floating particles
                if (this.particles) {
                    const time = Date.now() * 0.0005;
                    this.particles.userData.time = time;
                    
                    const positions = this.particles.geometry.attributes.position.array;
                    const originalPositions = this.particles.userData.originalPositions;
                    
                    for (let i = 0; i < positions.length; i += 3) {
                        const index = i / 3;
                        
                        // Create floating motion
                        positions[i] = originalPositions[i] + Math.sin(time + index * 0.1) * 0.5;
                        positions[i + 1] = originalPositions[i + 1] + Math.cos(time + index * 0.15) * 0.3;
                        positions[i + 2] = originalPositions[i + 2] + Math.sin(time + index * 0.08) * 0.4;
                    }
                    
                    this.particles.geometry.attributes.position.needsUpdate = true;
                    
                    // Slowly rotate the entire particle system
                    this.particles.rotation.y += 0.001;
                    this.particles.rotation.x += 0.0005;
                }
                
                if (this.renderer && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            } catch (error) {
                console.warn('Animation frame error:', error);
                this.stopAnimation();
            }
        }.bind(this);
        
        animate();
    },
    
    stopAnimation: function() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    },
    
    handleResize: function() {
        try {
            const container = document.getElementById('three-container');
            if (!container || !this.camera || !this.renderer) return;
            
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
            
        } catch (error) {
            console.warn('Resize handling failed:', error);
        }
    },
    
    cleanup: function() {
        try {
            this.stopAnimation();
            
            if (this.renderer) {
                this.renderer.dispose();
                const container = document.getElementById('three-container');
                if (container && this.renderer.domElement) {
                    container.removeChild(this.renderer.domElement);
                }
            }
            
            if (this.scene) {
                this.scene.clear();
            }
            
            this.initialized = false;
            
        } catch (error) {
            console.warn('Cleanup failed:', error);
        }
    }
};

// Initialize function for backwards compatibility
window.initMainMenuScene = function() {
    if (typeof THREE === 'undefined') {
        console.warn('Three.js not loaded, skipping 3D scene');
        return;
    }
    
    window.mainMenuScene.init();
};

// ============================================
// MOBILE DEVICE DETECTION & INITIALIZATION
// ============================================

// Detect device type for better initialization
window.getDeviceType = function() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
    }
    
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile';
    }
    
    return 'desktop';
};

// Initialize with proper timing for different devices
window.initAppOnDevice = function() {
    const deviceType = window.getDeviceType();
    console.log('📱 Device type detected:', deviceType);
    
    // Different delays based on device type
    let delay = deviceType === 'mobile' ? 300 : 100;
    
    // Additional delay for slower devices
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
        delay += 200;
        console.log('🔧 Low-performance device detected, using extended delay');
    }
    
    setTimeout(() => {
        if (typeof THREE !== 'undefined') {
            window.initMainMenuScene();
        }
    }, delay);
};

// Global error handlers to prevent silent failures
window.addEventListener('error', (event) => {
    // Handle null errors gracefully (common with CORS/script loading issues)
    const error = event.error || event.message || 'Unknown error';
    console.error('🚨 Global JavaScript Error:', error);
    console.error('📍 Error details:', {
        message: event.message || 'No message available',
        filename: event.filename || 'Unknown file',
        lineno: event.lineno || 'Unknown line',
        colno: event.colno || 'Unknown column',
        stack: event.error?.stack || 'No stack trace available'
    });
    
    // Only show user-friendly error for actual runtime errors, not script loading issues
    if (event.error && window.gameManager && typeof window.gameManager.showError === 'function') {
        // Don't show error for CORS/script loading issues as they're often environmental
        if (!event.message || !event.message.includes('Script error')) {
            window.gameManager.showError('A technical error occurred. Please refresh the page if the game becomes unresponsive.');
        }
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
    console.error('📍 Promise:', event.promise);
    
    // Prevent the default browser behavior (console error)
    event.preventDefault();
    
    // Try to show user-friendly error if game manager is available
    if (window.gameManager && typeof window.gameManager.showError === 'function') {
        window.gameManager.showError('A technical error occurred. Please refresh the page if the game becomes unresponsive.');
    }
});

// Error boundary for async operations
window.safeAsync = function(asyncFunction, errorMessage = 'An error occurred') {
    return async function(...args) {
        try {
            return await asyncFunction.apply(this, args);
        } catch (error) {
            console.error('🚨 Safe Async Error:', error);
            console.error('📍 Error message:', errorMessage);
            
            if (window.gameManager && typeof window.gameManager.showError === 'function') {
                window.gameManager.showError(`${errorMessage}. Please try again or refresh the page.`);
            } else {
                alert(`${errorMessage}. Please refresh the page.`);
            }
            
            throw error; // Re-throw for debugging
        }
    };
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 DOM loaded, setting up main menu scene initialization...');
    
    // Try to initialize immediately if Three.js is already loaded
    if (typeof THREE !== 'undefined') {
        window.initMainMenuScene();
    } else {
        // Wait for Three.js to load
        setTimeout(window.initMainMenuScene, 1000);
    }
    
    // **TIMING OPTIMIZATION: Music is now handled perfectly by the main LightChallengeApp**
    // No duplicate music logic here to prevent timing conflicts
    
    // **REMOVED**: All duplicate music initialization to ensure perfect timing
    // Music timing is now perfectly controlled by the start button in index.html
    console.log('🎵 Music initialization delegated to main app for perfect timing');
});

// Debug helper
window.debug = function() {
    console.log('🔍 Debug Info:');
    console.log('THREE.js available:', typeof THREE !== 'undefined');
    console.log('Main Menu Scene:', window.mainMenuScene);
    console.log('Game Manager available:', !!window.gameManager);
    console.log('Sound Manager available:', !!window.soundManager);
    
    if (window.soundManager) {
        console.log('🎵 Sound Manager Status:');
        console.log('  - Enabled:', window.soundManager.isEnabled);
        console.log('  - Muted:', window.soundManager.isMuted);
        console.log('  - Master Volume:', window.soundManager.masterVolume);
        console.log('  - Music Volume:', window.soundManager.musicVolume);
        console.log('  - Intro Music Active:', !!window.soundManager.introMusic);
        console.log('  - Pending Intro Music:', !!window.soundManager.pendingIntroMusic);
        console.log('  - Audio Context State:', window.soundManager.audioContext?.state);
    }
    
    if (window.gameManager) {
        window.gameManager.debug();
    }
};

// Test function for perfect intro music timing (call from console)
window.testPerfectIntroMusic = async function() {
    console.log('🧪 Perfect intro music test starting...');
    
    if (!window.soundManager) {
        console.error('🧪 Sound manager not available');
        return;
    }
    
    try {
        // Stop any existing intro music
        if (window.soundManager.introMusic) {
            window.soundManager.stopIntroMusic();
        }
        
        // Clear pending music
        window.soundManager.pendingIntroMusic = null;
        
        // Resume audio context if needed
        if (window.soundManager.audioContext && window.soundManager.audioContext.state === 'suspended') {
            console.log('🧪 Resuming audio context for perfect timing...');
            await window.soundManager.audioContext.resume();
            console.log('🧪 Audio context state:', window.soundManager.audioContext.state);
        }
        
        // Try to start intro music with perfect timing
        console.log('🧪 Starting intro music with perfect timing from beginning...');
        window.soundManager.playRandomIntroMusic();
        
        setTimeout(() => {
            console.log('🧪 Perfect timing test complete. Checking results...');
            console.log('🧪 Intro music active:', !!window.soundManager.introMusic);
            console.log('🧪 Pending intro music:', !!window.soundManager.pendingIntroMusic);
            if (window.soundManager.introMusic) {
                console.log('🧪 Current playback time:', window.soundManager.introMusic.currentTime);
                console.log('🧪 ✅ Music should be playing from the very beginning!');
            }
        }, 1000);
        
    } catch (error) {
        console.error('🧪 Perfect timing test failed:', error);
    }
};




// Skip Voting Suspicion Scene - Ultra Simple Implementation
(function() {
    console.log('🎯 Starting Skip Voting Checkbox Setup...');
    
    let initialized = false;
    
    function setupSkipVoting() {
        if (initialized) return;
        
        console.log('🔧 Setting up Skip Voting...');
        
        // Find elements
        const checkbox = document.getElementById('skip-voting-checkbox');
        const container = document.querySelector('.skip-voting-container');
        
        if (!checkbox) {
            console.error('❌ Checkbox not found!');
            return;
        }
        
        if (!container) {
            console.error('❌ Container not found!');
            return;
        }
        
        console.log('✅ Found checkbox and container');
        
        // Initialize settings
        window.gameSettings = window.gameSettings || {};
        
        // Load saved preference
        const saved = localStorage.getItem('skipVotingScene');
        if (saved === 'true') {
            checkbox.checked = true;
            container.classList.add('enabled');
            window.gameSettings.skipVotingScene = true;
        } else {
            checkbox.checked = false;
            container.classList.remove('enabled');
            window.gameSettings.skipVotingScene = false;
        }
        
        console.log('📂 Loaded saved state:', checkbox.checked);
        
        // Toggle function
        function toggleCheckbox() {
            console.log('🔄 Toggle called - current state:', checkbox.checked);
            
            // Toggle the checkbox
            checkbox.checked = !checkbox.checked;
            
            console.log('🔄 New state:', checkbox.checked);
            
            // Update visual state
            if (checkbox.checked) {
                container.classList.add('enabled');
                console.log('✅ Added enabled class');
                showDebugMessage('✅ Skip Voting Scene ENABLED');
            } else {
                container.classList.remove('enabled');
                console.log('❌ Removed enabled class');
                showDebugMessage('❌ Skip Voting Scene DISABLED');
            }
            
            // Save setting
            window.gameSettings.skipVotingScene = checkbox.checked;
            localStorage.setItem('skipVotingScene', checkbox.checked.toString());
            
            console.log('💾 Saved to localStorage:', checkbox.checked);
        }
        
        // Show debug message on screen
        function showDebugMessage(message) {
            const debugDiv = document.createElement('div');
            debugDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                color: #00ffff;
                padding: 20px;
                border-radius: 10px;
                font-size: 1.2rem;
                z-index: 10000;
                border: 2px solid #00ffff;
                box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
            `;
            debugDiv.textContent = message;
            document.body.appendChild(debugDiv);
            
            setTimeout(function() {
                document.body.removeChild(debugDiv);
            }, 2000);
        }
        
        // Add click listeners with detailed debugging
        container.addEventListener('click', function(e) {
            console.log('🖱️ Container clicked!');
            console.log('🔍 Click event details:', {
                target: e.target,
                currentTarget: e.currentTarget,
                type: e.type,
                bubbles: e.bubbles,
                clientX: e.clientX,
                clientY: e.clientY
            });
            e.preventDefault();
            e.stopPropagation();
            toggleCheckbox();
        });
        
        // Also add mousedown event for additional debugging
        container.addEventListener('mousedown', function(e) {
            console.log('👇 Mouse down on container!');
            e.preventDefault();
            e.stopPropagation();
        });
        
        // Add event listeners to the entire document to see what's capturing clicks
        document.addEventListener('click', function(e) {
            console.log('🌐 Document click:', e.target.tagName, e.target.className);
        }, true);
        
        checkbox.addEventListener('click', function(e) {
            console.log('☑️ Checkbox clicked directly!');
            e.stopPropagation();
            // The checkbox state will change automatically, so just update visuals
            setTimeout(function() {
                if (checkbox.checked) {
                    container.classList.add('enabled');
                } else {
                    container.classList.remove('enabled');
                }
                window.gameSettings.skipVotingScene = checkbox.checked;
                localStorage.setItem('skipVotingScene', checkbox.checked.toString());
            }, 10);
        });
        
        // Test function
        window.testSkipVoting = function() {
            console.log('🧪 Manual test triggered');
            toggleCheckbox();
        };
        
        initialized = true;
        console.log('🎉 Skip Voting setup complete!');
    }
    
    // Try multiple ways to initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupSkipVoting);
    } else {
        setupSkipVoting();
    }
    
    // Backup initialization
    setTimeout(setupSkipVoting, 500);
    setTimeout(setupSkipVoting, 1500);
    setTimeout(setupSkipVoting, 3000);
})();

// Voice debugging function
window.debugVoiceSystem = function() {
    console.log('🔍 Voice System Debug Info:');
    
    if (!window.speechSynthesis) {
        console.error('❌ Speech synthesis not available');
        return;
    }
    
    const voices = window.speechSynthesis.getVoices();
    console.log('📢 Available voices:', voices.length);
    
    voices.forEach((voice, index) => {
        console.log(`${index + 1}. ${voice.name} (${voice.lang}) [${voice.localService ? 'Local' : 'Remote'}]`);
    });
    
    if (window.gameManager && window.gameManager.voiceManager) {
        const vm = window.gameManager.voiceManager;
        console.log('🎤 Voice Manager Configuration:');
        console.log('  - Selected Voice:', vm.voice ? vm.voice.name : 'None');
        console.log('  - Rate:', vm.rate);
        console.log('  - Pitch:', vm.pitch);
        console.log('  - Volume:', vm.volume);
        console.log('  - Premium Services:');
        console.log('    - ElevenLabs:', vm.voiceServices.elevenlabs.enabled);
        console.log('    - Azure:', vm.voiceServices.azure.enabled);
        console.log('    - Google:', vm.voiceServices.google.enabled);
    }
};

// Test function for perfect team win sounds timing (call from console)
window.testPerfectTeamWinSounds = function() {
    console.log('🧪 Perfect Team Win Sounds Test Starting...');
    
    if (!window.soundManager) {
        console.error('🧪 Sound manager not available');
        return;
    }
    
    console.log('🧪 Testing Good Team Win Sound with perfect timing...');
    window.soundManager.playGoodTeamWin();
    
    setTimeout(() => {
        console.log('🧪 Testing Bad Team Win Sound with perfect timing...');
        window.soundManager.playBadTeamWin();
    }, 2000);
    
    console.log('🧪 Perfect team win sounds test complete! Both sounds should play from beginning.');
};
