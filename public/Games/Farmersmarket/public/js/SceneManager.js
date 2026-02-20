// Farmers Market Frenzy 3D - Scene Manager
class SceneManager {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.animationId = null;

        // Scene objects
        this.marketStand = null;
        this.productBins = [];
        this.customers = [];
        this.marketWorkers = [];
        this.lighting = {};

        // Customer line management
        this.playerCustomerLine = [];
        this.aiCustomerLine = [];
        this.maxLineLength = 8;

        // Animation mixers
        this.mixers = [];

        // Scene state
        this.isInitialized = false;
        this.isDayTime = true;

        // Performance tracking
        this.lastRenderTime = 0;
        this.lastResizeWidth = 0;
        this.lastResizeHeight = 0;

        // Check if Three.js is available
        if (typeof THREE === 'undefined') {
            console.error('❌ THREE.js not loaded! Cannot initialize 3D scene.');
            this.showThreeJSError();
            return;
        }

        this.clock = new THREE.Clock();
        this.init();
    }

    showThreeJSError() {
        if (this.container) {
            this.container.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    background: linear-gradient(135deg, #ff6b6b, #ffa500);
                    color: white;
                    text-align: center;
                    font-family: Arial, sans-serif;
                    flex-direction: column;
                    padding: 20px;
                ">
                    <h2>🚫 3D Graphics Not Available</h2>
                    <p>The 3D graphics library failed to load. Please check your internet connection and refresh the page.</p>
                    <button onclick="window.location.reload()" style="
                        background: white;
                        color: #ff6b6b;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                        margin-top: 20px;
                    ">🔄 Refresh Page</button>
                </div>
            `;
        }
    }

    showWebGLError() {
        if (this.container) {
            this.container.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    background: linear-gradient(135deg, #e74c3c, #c0392b);
                    color: white;
                    text-align: center;
                    font-family: Arial, sans-serif;
                    flex-direction: column;
                    padding: 20px;
                ">
                    <h2>🖥️ WebGL Not Supported</h2>
                    <p>Your browser doesn't support WebGL or it's disabled. The 3D market scene cannot be displayed.</p>
                    <p style="font-size: 14px; margin-top: 20px;">
                        Try:<br>
                        • Updating your browser<br>
                        • Enabling hardware acceleration<br>
                        • Using a different browser (Chrome, Firefox, Edge)
                    </p>
                    <button onclick="window.location.reload()" style="
                        background: white;
                        color: #e74c3c;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                        margin-top: 20px;
                    ">🔄 Try Again</button>
                </div>
            `;
        }
    }

    init() {
        try {
            console.log('🎬 Initializing 3D scene...');

            this.createScene();
            this.createCamera();
            this.createRenderer();

            // Check if renderer was created successfully
            if (!this.renderer) {
                throw new Error('Renderer creation failed');
            }

            this.createLighting();
            this.createEnvironment();
            this.createMarketStand();
            this.createBackgroundPeople();
            this.createCustomerLines();
            this.setupEventListeners();

            this.isInitialized = true;
            this.startRenderLoop();

            // Force an immediate render to ensure everything is working
            this.forceInitialRender();

            console.log('✅ 3D scene initialization completed successfully');
            return true;

        } catch (error) {
            console.error('❌ Failed to initialize 3D scene:', error);
            this.isInitialized = false;

            // Show error to user
            if (error.message.includes('WebGL')) {
                this.showWebGLError();
            } else {
                this.showThreeJSError();
            }

            // Don't throw - let the game continue in 2D mode
            return false;
        }
    }

    forceInitialRender() {
        // Ensure the renderer has proper dimensions
        if (this.renderer && this.scene && this.camera) {
            // Force a render immediately
            this.renderer.render(this.scene, this.camera);
            console.log('🎬 Forced initial render completed');

            // Schedule additional checks
            this.scheduleRenderValidation();
        }
    }

    scheduleRenderValidation() {
        let attempts = 0;
        const maxAttempts = 10;

        const validateRender = () => {
            attempts++;
            const canvas = this.renderer.domElement;

            console.log(`🔍 Render validation attempt ${attempts}: Canvas size ${canvas.width}x${canvas.height}`);

            if (canvas.width === 0 || canvas.height === 0) {
                if (attempts < maxAttempts) {
                    // Try to fix the size
                    this.onWindowResize();
                    this.renderer.render(this.scene, this.camera);

                    // Check again after a delay
                    setTimeout(validateRender, 200);
                } else {
                    console.warn('⚠️ Failed to validate render after', maxAttempts, 'attempts');
                }
            } else {
                console.log('✅ Render validation successful: Canvas size', canvas.width + 'x' + canvas.height);
            }
        };

        // Start validation after a short delay
        setTimeout(validateRender, 100);
    }

    createScene() {
        this.scene = new THREE.Scene();

        // Set background to sky gradient
        this.scene.background = new THREE.Color(0x87CEEB);

        // Add fog for depth
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    }

    createCamera() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const aspect = width / height;

        // Create the camera now; we will immediately adjust its FOV/position
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);

        // Apply scaling so everything looks slightly smaller & fits all tablets
        this.adjustCameraForViewport(width, height);
        this.camera.lookAt(0, 1.8, 0); // Keep focus on the counter and customer flow lane

        console.log('📷 Camera positioned at:', this.camera.position);
        console.log('📷 Camera looking at: (0, 1.8, 0)');
    }

    createRenderer() {
        try {
            // Check WebGL support first
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

            if (!gl) {
                throw new Error('WebGL not supported');
            }

            // Detect mobile devices for performance optimization
            const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                ('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0);

            this.renderer = new THREE.WebGLRenderer({
                antialias: !isMobile, // Disable antialiasing on mobile for better performance
                alpha: false,
                powerPreference: isMobile ? "low-power" : "high-performance",
                preserveDrawingBuffer: false,
                premultipliedAlpha: false
            });

            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setClearColor(0x87CEEB, 1);
            this.renderer.autoClear = true;

            // Adaptive shadow quality based on device capability
            this.renderer.shadowMap.enabled = true;
            if (isMobile) {
                this.renderer.shadowMap.type = THREE.BasicShadowMap; // Faster shadows for mobile
            } else {
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // High quality shadows for desktop
            }
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.2;

            // Ensure container is visible and has proper styling
            this.ensureContainerVisible();

            // Append renderer to container
            this.container.appendChild(this.renderer.domElement);
            this.renderer.domElement.style.background = '#87CEEB';
            this.renderer.domElement.style.display = 'block';

            // Store mobile detection for other methods
            this.isMobileDevice = isMobile;

            // Set adaptive frame rate target
            this.targetFPS = isMobile ? 30 : 60;
            this.frameInterval = 1000 / this.targetFPS;
            this.lastFrameTime = 0;

            // Performance monitoring
            this.frameCount = 0;
            this.lastFPSCheck = performance.now();
            this.currentFPS = 0;

            console.log(`✅ WebGL renderer created successfully (Mobile: ${isMobile}, Target FPS: ${this.targetFPS})`);
            console.log(`📐 Renderer size: ${this.renderer.domElement.width}x${this.renderer.domElement.height}`);

        } catch (error) {
            console.error('❌ Failed to create WebGL renderer:', error);

            if (error.message.includes('WebGL')) {
                this.showWebGLError();
            } else {
                this.showThreeJSError();
            }

            // Don't throw - allow graceful degradation
            this.renderer = null;
            return;
        }
    }

    ensureContainerVisible() {
        // Walk up the DOM tree to find hidden parents
        let element = this.container;
        const hiddenElements = [];

        while (element && element !== document.body) {
            const style = window.getComputedStyle(element);
            if (style.display === 'none') {
                hiddenElements.push({
                    element: element,
                    originalDisplay: element.style.display
                });
                element.style.display = 'block';
                console.log('🔍 Temporarily showing hidden element:', element.id || element.className);
            }
            element = element.parentElement;
        }

        this.hiddenElements = hiddenElements;
        return hiddenElements.length > 0;
    }

    restoreContainerVisibility() {
        if (this.hiddenElements) {
            this.hiddenElements.forEach(({ element, originalDisplay }) => {
                element.style.display = originalDisplay;
                console.log('🔄 Restored visibility for element:', element.id || element.className);
            });
            this.hiddenElements = null;
        }
    }

    createLighting() {
        // Ambient light for overall illumination
        this.lighting.ambient = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(this.lighting.ambient);

        // Directional light (sun)
        this.lighting.sun = new THREE.DirectionalLight(0xFFFFE0, 1.2);
        this.lighting.sun.position.set(50, 50, 50);
        this.lighting.sun.castShadow = true;

        // Configure shadow properties
        this.lighting.sun.shadow.mapSize.width = 2048;
        this.lighting.sun.shadow.mapSize.height = 2048;
        this.lighting.sun.shadow.camera.near = 0.5;
        this.lighting.sun.shadow.camera.far = 500;
        this.lighting.sun.shadow.camera.left = -50;
        this.lighting.sun.shadow.camera.right = 50;
        this.lighting.sun.shadow.camera.top = 50;
        this.lighting.sun.shadow.camera.bottom = -50;

        this.scene.add(this.lighting.sun);

        // Point lights for market atmosphere
        const pointLight1 = new THREE.PointLight(0xFFE4B5, 0.8, 30);
        pointLight1.position.set(-10, 10, 10);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xFFE4B5, 0.8, 30);
        pointLight2.position.set(10, 10, -10);
        this.scene.add(pointLight2);
    }

    createEnvironment() {
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshLambertMaterial({
            color: 0x90EE90,
            transparent: true,
            opacity: 0.8
        });

        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Create market environment elements
        this.createTrees();
        this.createMarketStalls();
        this.createDecorations();
        // Add floating clouds last so they render above everything
        this.createClouds();
    }

    createTrees() {
        const treePositions = [
            [-20, 0, -15], [20, 0, -15], [-25, 0, 5], [25, 0, 5],
            [-15, 0, 20], [15, 0, 20]
        ];

        treePositions.forEach(position => {
            const tree = this.createTree();
            tree.position.set(...position);
            this.scene.add(tree);
        });
    }

    createTree() {
        const treeGroup = new THREE.Group();

        // --- Trunk ---
        const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.6, 5, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B5A2B });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2.5;
        trunk.castShadow = true;
        treeGroup.add(trunk);

        // --- Layered foliage (stylised pine) ---
        const foliageColors = [0x2E8B57, 0x2F9B5F, 0x30AB67]; // subtle gradient
        const layerHeights = [3, 2.4, 1.8];
        const layerRadii = [2.8, 2.0, 1.3];

        layerHeights.forEach((h, idx) => {
            const coneGeom = new THREE.ConeGeometry(layerRadii[idx], h, 16, 8);
            const coneMat = new THREE.MeshLambertMaterial({ color: foliageColors[idx] });
            const cone = new THREE.Mesh(coneGeom, coneMat);
            cone.position.y = 2.5 + (idx === 0 ? 2.5 : 2.5 + layerHeights.slice(0, idx).reduce((a, b) => a + b, 0) - h * 0.4);
            cone.castShadow = true;
            cone.receiveShadow = true;
            treeGroup.add(cone);
        });

        return treeGroup;
    }

    createMarketStalls() {
        const stallPositions = [
            [-15, 0, -8], [15, 0, -8], [-15, 0, 8], [15, 0, 8]
        ];

        stallPositions.forEach(position => {
            const stall = this.createSimpleStall();
            stall.position.set(...position);
            this.scene.add(stall);
        });
    }

    createSimpleStall() {
        const stallGroup = new THREE.Group();

        // Table
        const tableGeometry = new THREE.BoxGeometry(6, 0.2, 4);
        const tableMaterial = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.y = 1.5;
        table.castShadow = true;
        stallGroup.add(table);

        // Table legs
        const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });

        const legPositions = [[-2.8, 0.75, -1.8], [2.8, 0.75, -1.8], [-2.8, 0.75, 1.8], [2.8, 0.75, 1.8]];
        legPositions.forEach(position => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(...position);
            leg.castShadow = true;
            stallGroup.add(leg);
        });

        // Canopy
        const canopyGeometry = new THREE.ConeGeometry(4, 3, 8);
        const canopyMaterial = new THREE.MeshLambertMaterial({
            color: 0xFF6B6B,
            transparent: true,
            opacity: 0.8
        });
        const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
        canopy.position.y = 4;
        canopy.castShadow = true;
        stallGroup.add(canopy);

        return stallGroup;
    }

    createMarketStand() {
        this.marketStand = new THREE.Group();

        // Main counter - wider to serve both sides
        const counterGeometry = new THREE.BoxGeometry(12, 1, 4);
        const counterMaterial = new THREE.MeshLambertMaterial({ color: 0xDEB887 });
        const counter = new THREE.Mesh(counterGeometry, counterMaterial);
        counter.position.y = 1;
        counter.castShadow = true;
        counter.receiveShadow = true;
        this.marketStand.add(counter);

        // Player side register (left)
        const playerRegisterGeometry = new THREE.BoxGeometry(1, 0.5, 1);
        const playerRegisterMaterial = new THREE.MeshLambertMaterial({ color: 0x2C3E50 });
        const playerRegister = new THREE.Mesh(playerRegisterGeometry, playerRegisterMaterial);
        playerRegister.position.set(-3, 1.75, 0);
        playerRegister.castShadow = true;
        this.marketStand.add(playerRegister);

        // AI side register (right)
        const aiRegisterGeometry = new THREE.BoxGeometry(1, 0.5, 1);
        const aiRegisterMaterial = new THREE.MeshLambertMaterial({ color: 0x34495E });
        const aiRegister = new THREE.Mesh(aiRegisterGeometry, aiRegisterMaterial);
        aiRegister.position.set(3, 1.75, 0);
        aiRegister.castShadow = true;
        this.marketStand.add(aiRegister);

        // Central divider
        const dividerGeometry = new THREE.BoxGeometry(0.2, 0.8, 3);
        const dividerMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const divider = new THREE.Mesh(dividerGeometry, dividerMaterial);
        divider.position.set(0, 1.4, 0);
        divider.castShadow = true;
        this.marketStand.add(divider);

        // Product display bins
        this.createProductBins();

        // Create tent-style roof instead of flat canopy
        this.createTentRoof();

        // Create the fancy 3D market sign
        this.createMarketSign();

        // Add market workers behind the counter
        this.createMarketWorkers();

        // Support poles - adjusted to match tent height
        const poleGeometry = new THREE.CylinderGeometry(0.15, 0.15, 8); // Adjusted height for new tent position
        const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });

        const polePositions = [[-6, 4, -3], [6, 4, -3], [-6, 4, 3], [6, 4, 3]]; // Adjusted height to match tent
        polePositions.forEach(position => {
            const pole = new THREE.Mesh(poleGeometry, poleMaterial);
            pole.position.set(...position);
            pole.castShadow = true;
            this.marketStand.add(pole);
        });

        this.scene.add(this.marketStand);
    }

    createProductBins() {
        // Wider layout for unified market - more bins spread across both sides
        const binPositions = [
            // Player side (left)
            [-4.5, 1.5, -1.2], [-4.5, 1.5, 0], [-4.5, 1.5, 1.2],
            [-2.5, 1.5, -1.2], [-2.5, 1.5, 1.2],
            // AI side (right)
            [2.5, 1.5, -1.2], [2.5, 1.5, 1.2],
            [4.5, 1.5, -1.2], [4.5, 1.5, 0], [4.5, 1.5, 1.2]
        ];

        const binColors = [0xFF6347, 0xFF8C00, 0x32CD32, 0x9370DB, 0xFFD700, 0xFF69B4, 0x20B2AA, 0xDDA0DD, 0xF0E68C, 0xFA8072];

        binPositions.forEach((position, index) => {
            const binGroup = new THREE.Group();

            // Bin container
            const binGeometry = new THREE.BoxGeometry(1.2, 0.8, 1.0);
            const binMaterial = new THREE.MeshLambertMaterial({
                color: binColors[index % binColors.length],
                transparent: true,
                opacity: 0.7
            });
            const bin = new THREE.Mesh(binGeometry, binMaterial);
            bin.castShadow = true;
            binGroup.add(bin);

            // Add some product representations
            this.addProductsTobin(binGroup, index);

            binGroup.position.set(...position);
            this.productBins.push(binGroup);
            this.marketStand.add(binGroup);
        });
    }

    addProductsTobin(binGroup, binIndex) {
        const productCount = 3 + Math.floor(Math.random() * 3);

        for (let i = 0; i < productCount; i++) {
            const productGeometry = new THREE.SphereGeometry(0.15, 8, 6);
            const productMaterial = new THREE.MeshLambertMaterial({
                color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6)
            });
            const product = new THREE.Mesh(productGeometry, productMaterial);

            product.position.set(
                (Math.random() - 0.5) * 1.2,
                0.3 + Math.random() * 0.3,
                (Math.random() - 0.5) * 1
            );

            product.castShadow = true;
            binGroup.add(product);
        }
    }

    createTentRoof() {
        // Create a tent-style roof using a cone shape - much higher for better interior view
        const tentGeometry = new THREE.ConeGeometry(10, 6, 8);
        const tentMaterial = new THREE.MeshLambertMaterial({
            // Vibrant golden-orange so the tent clearly pops against green ground
            color: 0xFF8C00
        });
        const tent = new THREE.Mesh(tentGeometry, tentMaterial);
        tent.position.y = 10; // Lowered slightly from 12 to 10
        tent.castShadow = true;
        tent.receiveShadow = false;
        this.marketStand.add(tent);

        // Add tent peak decoration - adjusted to match tent
        const peakGeometry = new THREE.SphereGeometry(0.4, 8, 6);
        const peakMaterial = new THREE.MeshLambertMaterial({ color: 0x2C3E50 });
        const peak = new THREE.Mesh(peakGeometry, peakMaterial);
        peak.position.y = 13; // Lowered from 15 to 13
        peak.castShadow = true;
        this.marketStand.add(peak);

        // Add tent stripes for more realistic appearance - adjusted for higher tent
        const stripeGeometry = new THREE.RingGeometry(8, 8.5, 8);
        const stripeMaterial = new THREE.MeshLambertMaterial({
            // Crisp white accent stripes for high contrast
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.6
        });
        const stripe1 = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe1.position.y = 9; // Lowered from 11 to 9
        stripe1.rotation.x = -Math.PI / 2;
        this.marketStand.add(stripe1);

        const stripe2 = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe2.position.y = 7.5; // Lowered from 9.5 to 7.5
        stripe2.rotation.x = -Math.PI / 2;
        stripe2.scale.setScalar(0.7);
        this.marketStand.add(stripe2);

        console.log('⛺ Created high tent-style roof for better interior view');
    }

    createMarketSign() {
        // Create a larger, more prominent sign board background - positioned lower and more forward
        const signBoardGeometry = new THREE.BoxGeometry(12, 2.5, 0.4);
        const signBoardMaterial = new THREE.MeshLambertMaterial({
            color: 0x1B4332, // Deep forest green background
        });
        const signBoard = new THREE.Mesh(signBoardGeometry, signBoardMaterial);
        signBoard.position.set(-4, 10, 8); // Moved left and higher to clear the tent completely
        signBoard.castShadow = true;
        signBoard.receiveShadow = true;
        this.marketStand.add(signBoard);

        // Create a beautiful wooden frame effect
        const frameGeometry = new THREE.BoxGeometry(12.5, 3, 0.35);
        const frameMaterial = new THREE.MeshLambertMaterial({
            color: 0x8B4513, // Rich brown wood frame
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.set(-4, 10, 7.95); // Matching new position
        frame.castShadow = true;
        this.marketStand.add(frame);

        // Add golden decorative border
        const borderGeometry = new THREE.BoxGeometry(12.8, 3.3, 0.3);
        const borderMaterial = new THREE.MeshLambertMaterial({
            color: 0xFFD700, // Bright gold border
        });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.set(-4, 10, 7.9); // Matching new position
        border.castShadow = true;
        this.marketStand.add(border);

        // Create large, prominent 3D text
        this.create3DText();

        // Add beautiful decorative elements
        this.addSignDecorations();

        console.log('🪧 Beautiful large 3D market sign positioned lower and more forward');
    }

    create3DText() {
        // Create 2D text using canvas texture for readable "FARMERS MARKET FRENZY"
        this.createTextTexture();

        console.log('✨ 2D text "FARMERS MARKET FRENZY" created with canvas texture');
    }

    createTextTexture() {
        // Create a canvas for the text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Set canvas size for high resolution
        canvas.width = 1024;
        canvas.height = 512;

        // Fill background (transparent)
        context.fillStyle = 'rgba(0, 0, 0, 0)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Set text properties
        context.fillStyle = '#FFFAF0'; // Cream white
        context.strokeStyle = '#FFD700'; // Gold outline
        context.lineWidth = 8;
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // First line: "FARMERS MARKET"
        context.font = 'bold 80px Arial, sans-serif';
        const line1 = 'FARMERS MARKET';
        context.strokeText(line1, canvas.width / 2, canvas.height / 2 - 60);
        context.fillText(line1, canvas.width / 2, canvas.height / 2 - 60);

        // Second line: "FRENZY"
        context.font = 'bold 100px Arial, sans-serif';
        const line2 = 'FRENZY';
        context.strokeText(line2, canvas.width / 2, canvas.height / 2 + 80);
        context.fillText(line2, canvas.width / 2, canvas.height / 2 + 80);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        // Create material with the text texture
        const textMaterial = new THREE.MeshLambertMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1
        });

        // Create a plane to display the text
        const textGeometry = new THREE.PlaneGeometry(10, 5);
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(-4, 10, 8.3); // Position in front of the new sign board location
        textMesh.castShadow = true;

        this.marketStand.add(textMesh);

        // Add a subtle drop shadow plane behind the text
        const shadowCanvas = document.createElement('canvas');
        const shadowContext = shadowCanvas.getContext('2d');
        shadowCanvas.width = 1024;
        shadowCanvas.height = 512;

        // Create shadow effect
        shadowContext.fillStyle = 'rgba(0, 0, 0, 0.5)';
        shadowContext.font = 'bold 80px Arial, sans-serif';
        shadowContext.textAlign = 'center';
        shadowContext.textBaseline = 'middle';
        shadowContext.fillText('FARMERS MARKET', shadowCanvas.width / 2, shadowCanvas.height / 2 - 60);

        shadowContext.font = 'bold 100px Arial, sans-serif';
        shadowContext.fillText('FRENZY', shadowCanvas.width / 2, shadowCanvas.height / 2 + 80);

        const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
        const shadowMaterial = new THREE.MeshLambertMaterial({
            map: shadowTexture,
            transparent: true,
            opacity: 0.3
        });

        const shadowGeometry = new THREE.PlaneGeometry(10, 5);
        const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadowMesh.position.set(-3.9, 9.9, 8.25); // Slightly offset behind the main text at new location

        this.marketStand.add(shadowMesh);
    }

    addSignDecorations() {
        // Add elegant corner ornaments - repositioned for lower sign
        const cornerSize = 0.2;
        const cornerGeometry = new THREE.SphereGeometry(cornerSize, 12, 8);
        const cornerMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 }); // Bright gold corners

        const corners = [
            [-10, 11.4, 8.3],   // Top left - repositioned for left-shifted sign
            [-2, 11.4, 8.3],    // Top right - repositioned for left-shifted sign
            [-10, 8.6, 8.3],    // Bottom left - repositioned for left-shifted sign
            [-2, 8.6, 8.3]      // Bottom right - repositioned for left-shifted sign
        ];

        corners.forEach(pos => {
            const corner = new THREE.Mesh(cornerGeometry, cornerMaterial);
            corner.position.set(pos[0], pos[1], pos[2]);
            corner.castShadow = true;
            this.marketStand.add(corner);
        });

        // Add beautiful produce decorations around the sign - repositioned
        const decorElements = [
            // Top decorations
            { pos: [-9, 11.8, 8.4], color: 0xFF4500, size: 0.18, type: 'carrot' }, // Orange carrot
            { pos: [-1, 11.8, 8.4], color: 0xFF0000, size: 0.18, type: 'apple' },   // Red apple
            { pos: [-4, 12.2, 8.4], color: 0xFFD700, size: 0.15, type: 'star' },    // Golden star crown

            // Side decorations
            { pos: [-10.5, 10, 8.4], color: 0x32CD32, size: 0.15, type: 'lettuce' }, // Green lettuce
            { pos: [2.5, 10, 8.4], color: 0x8A2BE2, size: 0.15, type: 'eggplant' }, // Purple eggplant

            // Bottom decorations
            { pos: [-8, 8.2, 8.4], color: 0xFFA500, size: 0.12, type: 'orange' },  // Orange
            { pos: [0, 8.2, 8.4], color: 0x228B22, size: 0.12, type: 'lime' },     // Lime
            { pos: [-4, 8, 8.4], color: 0xDC143C, size: 0.1, type: 'cherry' },    // Cherry
        ];

        decorElements.forEach((elem, index) => {
            let decorGeometry;
            switch (elem.type) {
                case 'star':
                    decorGeometry = new THREE.ConeGeometry(elem.size, elem.size * 2, 5);
                    break;
                case 'carrot':
                    decorGeometry = new THREE.ConeGeometry(elem.size * 0.7, elem.size * 2, 6);
                    break;
                default:
                    decorGeometry = new THREE.SphereGeometry(elem.size, 8, 6);
            }

            const decorMaterial = new THREE.MeshLambertMaterial({ color: elem.color });
            const decoration = new THREE.Mesh(decorGeometry, decorMaterial);
            decoration.position.set(elem.pos[0], elem.pos[1], elem.pos[2]);
            decoration.castShadow = true;
            this.marketStand.add(decoration);
        });

        // Add elegant hanging ribbon banners - repositioned
        const bannerGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.08);
        const bannerMaterial = new THREE.MeshLambertMaterial({
            color: 0xDC143C, // Deep red banners
            transparent: true,
            opacity: 0.9
        });

        const bannerPositions = [
            [-7.5, 8.8, 8.2],  // Left banner - repositioned for left-shifted sign
            [0.5, 8.8, 8.2]    // Right banner - repositioned for left-shifted sign
        ];

        bannerPositions.forEach(pos => {
            const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
            banner.position.set(pos[0], pos[1], pos[2]);
            banner.castShadow = true;
            this.marketStand.add(banner);
        });

        // Add decorative rope/chain connecting the corners - repositioned
        const ropeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 12, 8);
        const ropeMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown rope

        // Top rope
        const topRope = new THREE.Mesh(ropeGeometry, ropeMaterial);
        topRope.rotation.z = Math.PI / 2;
        topRope.position.set(-4, 11.4, 8.3); // Repositioned for left-shifted sign
        this.marketStand.add(topRope);

        // Bottom rope
        const bottomRope = new THREE.Mesh(ropeGeometry, ropeMaterial);
        bottomRope.rotation.z = Math.PI / 2;
        bottomRope.position.set(-4, 8.6, 8.3); // Repositioned for left-shifted sign
        this.marketStand.add(bottomRope);

        console.log('🎨 Sign decorations repositioned for lower, more forward sign placement');
    }

    createMarketWorkers() {
        // Create two animated market workers behind the counter
        this.marketWorkers = [];

        // Worker 1 - Player side (left) - positioned behind counter
        const worker1 = this.createMarketWorker(-2, 'Sarah', 0xe74c3c); // Red shirt
        const worker1Scale = 1.6;
        worker1.position.set(-3.5, 0.65 * worker1Scale, -2.8); // Shoes touch ground at y=0
        worker1.userData.originalPosition = worker1.position.clone(); // Set after positioning
        this.marketStand.add(worker1);
        this.marketWorkers.push(worker1);

        // Worker 2 - AI side (right) - positioned behind counter
        const worker2 = this.createMarketWorker(2, 'Mike', 0x3498db); // Blue shirt
        const worker2Scale = 1.6;
        worker2.position.set(3.5, 0.65 * worker2Scale, -2.8); // Shoes touch ground at y=0
        worker2.userData.originalPosition = worker2.position.clone(); // Set after positioning
        this.marketStand.add(worker2);
        this.marketWorkers.push(worker2);

        console.log('👥 Created 2 animated market workers behind the counter under the tent');
    }

    createMarketWorker(side, name, shirtColor) {
        const workerGroup = new THREE.Group();

        // Body - matching background people dimensions
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: shirtColor });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        body.receiveShadow = true;
        workerGroup.add(body);

        // Head with realistic skin tone
        const skinTones = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffeaa7];
        const headGeometry = new THREE.SphereGeometry(0.25, 12, 8);
        const headMaterial = new THREE.MeshLambertMaterial({
            color: skinTones[Math.floor(Math.random() * skinTones.length)]
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.5;
        head.castShadow = true;
        head.receiveShadow = true;
        workerGroup.add(head);

        // Add realistic facial features
        this.addFacialFeatures(workerGroup, head);

        // Add hair (but not hat since they'll have aprons)
        this.addHair(workerGroup, head);

        // Add shoulders to connect body and arms naturally - more square and extended
        const shoulderGeometry = new THREE.BoxGeometry(0.25, 0.2, 0.2); // Rectangular/square shape
        const shoulderMaterial = new THREE.MeshLambertMaterial({
            color: bodyMaterial.color // Match shirt color
        });

        // Left shoulder - extended further out
        const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        leftShoulder.position.set(-0.42, 1.1, 0); // Extended from -0.32 to -0.42
        leftShoulder.castShadow = true;
        workerGroup.add(leftShoulder);

        // Right shoulder - extended further out
        const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        rightShoulder.position.set(0.42, 1.1, 0); // Extended from 0.32 to 0.42
        rightShoulder.castShadow = true;
        workerGroup.add(rightShoulder);

        // Natural hanging arms (not sticking up)
        const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
        const armMaterial = new THREE.MeshLambertMaterial({
            color: headMaterial.color // Use skin color for arms
        });

        // Left arm - hanging naturally at side with slight work position
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.4, 0.6, 0);
        leftArm.rotation.z = Math.PI / 8; // Slight work angle
        leftArm.castShadow = true;
        workerGroup.add(leftArm);

        // Right arm - hanging naturally at side with slight work position
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.4, 0.6, 0);
        rightArm.rotation.z = -Math.PI / 8; // Slight work angle
        rightArm.castShadow = true;
        workerGroup.add(rightArm);

        // Add hands
        const handGeometry = new THREE.SphereGeometry(0.06, 6, 4);
        const handMaterial = new THREE.MeshLambertMaterial({ color: headMaterial.color });

        const leftHand = new THREE.Mesh(handGeometry, handMaterial);
        leftHand.position.set(-0.42, 0.18, 0);
        leftHand.castShadow = true;
        workerGroup.add(leftHand);

        const rightHand = new THREE.Mesh(handGeometry, handMaterial);
        rightHand.position.set(0.42, 0.18, 0);
        rightHand.castShadow = true;
        workerGroup.add(rightHand);

        // Legs with varied pants colors
        const legGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8);
        const legMaterial = new THREE.MeshLambertMaterial({
            color: this.getRandomPantsColor()
        });

        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.15, -0.2, 0);
        leftLeg.castShadow = true;
        workerGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.15, -0.2, 0);
        rightLeg.castShadow = true;
        workerGroup.add(rightLeg);

        // Add shoes
        const shoeGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3);
        const shoeMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });

        const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        leftShoe.position.set(-0.15, -0.65, 0.05);
        leftShoe.castShadow = true;
        workerGroup.add(leftShoe);

        const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        rightShoe.position.set(0.15, -0.65, 0.05);
        rightShoe.castShadow = true;
        workerGroup.add(rightShoe);

        // Add an apron for more market worker authenticity
        const apronGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.05);
        const apronMaterial = new THREE.MeshLambertMaterial({
            color: 0xFFFFFF, // White apron
            transparent: true,
            opacity: 0.9
        });
        const apron = new THREE.Mesh(apronGeometry, apronMaterial);
        apron.position.set(0, 0.6, 0.32);
        apron.castShadow = true;
        workerGroup.add(apron);

        // Add a simple hat over the hair
        const hatGeometry = new THREE.CylinderGeometry(0.27, 0.24, 0.12, 8);
        const hatMaterial = new THREE.MeshLambertMaterial({
            color: 0x8B4513 // Brown hat
        });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.y = 1.78; // Positioned over hair
        hat.castShadow = true;
        workerGroup.add(hat);

        // Scale to match background people (make them tall like walking people)
        const scale = 1.6; // Upper range of background people scale for tall workers
        workerGroup.scale.setScalar(scale);

        // Face the counter (turn toward front)
        workerGroup.rotation.y = Math.PI;

        // Store worker data for in-place animation
        workerGroup.userData = {
            name: name,
            side: side,
            isWorker: true,
            isStationary: true,
            // Animation data for in-place movement
            animationSpeed: 0.5 + Math.random() * 0.3,
            animationOffset: Math.random() * Math.PI * 2,
            swayAmount: 0.1 + Math.random() * 0.05,
            bobAmount: 0.05 + Math.random() * 0.03,
            rotateAmount: 0.1 + Math.random() * 0.05
            // originalPosition will be set after positioning in createMarketWorkers
        };

        return workerGroup;
    }

    updateMarketWorkers(deltaTime) {
        if (!this.marketWorkers || this.marketWorkers.length === 0) return;

        const currentTime = performance.now() * 0.001; // Convert to seconds

        this.marketWorkers.forEach(worker => {
            if (!worker.userData.originalPosition) return;

            const data = worker.userData;
            const timeOffset = currentTime + data.animationOffset;

            // Subtle in-place animations for market workers
            // Gentle swaying side to side
            const swayX = Math.sin(timeOffset * data.animationSpeed) * data.swayAmount;

            // Gentle bobbing up and down
            const bobY = Math.sin(timeOffset * data.animationSpeed * 1.5) * data.bobAmount;

            // Slight rotation (like they're working/looking around)
            const rotateY = Math.sin(timeOffset * data.animationSpeed * 0.7) * data.rotateAmount;

            // Apply the animations
            worker.position.x = data.originalPosition.x + swayX;
            worker.position.y = data.originalPosition.y + bobY;
            worker.position.z = data.originalPosition.z;

            // Add subtle rotation while maintaining facing direction
            worker.rotation.y = Math.PI + rotateY; // Math.PI makes them face forward

            // Occasionally make them "work" by moving their arms slightly
            const workTime = currentTime * 0.3 + data.animationOffset;
            const armMovement = Math.sin(workTime) * 0.2;

            // Find and animate the arms if they exist
            worker.children.forEach(child => {
                if (child.position.x < -0.3) { // Left arm
                    child.rotation.z = Math.PI / 6 + armMovement;
                } else if (child.position.x > 0.3) { // Right arm
                    child.rotation.z = -Math.PI / 6 - armMovement;
                }
            });
        });
    }

    createDecorations() {
        // Add some decorative elements
        this.createBenches();
        this.createSignage();
    }

    createBenches() {
        const benchPositions = [[-8, 0, 12], [8, 0, 12], [0, 0, -18]];

        benchPositions.forEach(position => {
            const benchGroup = new THREE.Group();

            // Bench seat
            const seatGeometry = new THREE.BoxGeometry(4, 0.3, 1);
            const seatMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const seat = new THREE.Mesh(seatGeometry, seatMaterial);
            seat.position.y = 1;
            seat.castShadow = true;
            benchGroup.add(seat);

            // Bench back
            const backGeometry = new THREE.BoxGeometry(4, 1.5, 0.2);
            const back = new THREE.Mesh(backGeometry, seatMaterial);
            back.position.set(0, 1.75, -0.4);
            back.castShadow = true;
            benchGroup.add(back);

            // Legs
            const legGeometry = new THREE.BoxGeometry(0.3, 1, 0.3);
            const legPositions = [[-1.5, 0.5, -0.3], [1.5, 0.5, -0.3], [-1.5, 0.5, 0.3], [1.5, 0.5, 0.3]];

            legPositions.forEach(legPos => {
                const leg = new THREE.Mesh(legGeometry, seatMaterial);
                leg.position.set(...legPos);
                leg.castShadow = true;
                benchGroup.add(leg);
            });

            benchGroup.position.set(...position);
            this.scene.add(benchGroup);
        });
    }

    createSignage() {
        // Market sign
        const signGroup = new THREE.Group();

        // Sign post
        const postGeometry = new THREE.CylinderGeometry(0.2, 0.2, 6);
        const postMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.y = 3;
        post.castShadow = true;
        signGroup.add(post);

        // Sign board
        const signGeometry = new THREE.BoxGeometry(6, 2, 0.2);
        const signMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.y = 5;
        sign.castShadow = true;
        signGroup.add(sign);

        signGroup.position.set(0, 0, -12);
        this.scene.add(signGroup);
    }

    createBackgroundPeople() {
        console.log('🚶 Creating background people...');

        // Array to store background people
        this.backgroundPeople = [];

        // Create 5-8 background people walking around
        const peopleCount = 5 + Math.floor(Math.random() * 4);

        for (let i = 0; i < peopleCount; i++) {
            this.createBackgroundPerson(i);
        }

        // Start the walking animation loop
        this.startBackgroundAnimation();

        console.log(`✅ Created ${peopleCount} background people`);
        console.log(`🔍 Scene now has ${this.scene.children.length} total objects`);
        console.log(`🔍 Background people array has ${this.backgroundPeople.length} people`);
    }

    createCustomerLines() {
        console.log('👥 Creating customer lines...');

        // Create customer lines for both player and AI
        this.createPlayerCustomerLine();
        this.createAICustomerLine();

        console.log(`✅ Created customer lines with ${this.playerCustomerLine.length} player customers and ${this.aiCustomerLine.length} AI customers`);
    }

    createPlayerCustomerLine() {
        // Create 6-8 customers in line for the player (left side)
        const lineLength = 6 + Math.floor(Math.random() * 3);

        for (let i = 0; i < lineLength; i++) {
            const customer = this.createLineCustomer(false, i);

            // Position customers in a line facing the market stand
            // Left side of market, closer to center, facing toward the left counter person
            const baseX = -4; // Moved closer to center (was -8)
            const spacing = 1.5; // Distance between customers
            const lineZ = 6 + (i * spacing); // Line starts closer to market (was 8)

            customer.position.set(baseX, 0.65 * customer.userData.scale, lineZ);
            customer.rotation.y = Math.PI; // Face exact opposite direction (south direction, 180 degrees)

            // Add subtle idle animations
            this.addLineIdleAnimation(customer, i);

            this.scene.add(customer);
            this.playerCustomerLine.push(customer);
        }
    }

    createAICustomerLine() {
        // Create 6-8 customers in line for the AI (right side)
        const lineLength = 6 + Math.floor(Math.random() * 3);

        for (let i = 0; i < lineLength; i++) {
            const customer = this.createLineCustomer(true, i);

            // Position customers in a line facing the market stand
            // Right side of market, closer to center, facing toward the right counter person
            const baseX = 4; // Moved closer to center (was 8)
            const spacing = 1.5; // Distance between customers
            const lineZ = 6 + (i * spacing); // Line starts closer to market (was 8)

            customer.position.set(baseX, 0.65 * customer.userData.scale, lineZ);
            customer.rotation.y = -Math.PI * 0.25 + Math.PI; // Face exact opposite direction (southeast direction, 135 degrees)

            // Add subtle idle animations
            this.addLineIdleAnimation(customer, i);

            this.scene.add(customer);
            this.aiCustomerLine.push(customer);
        }
    }

    createLineCustomer(isAI, linePosition) {
        // Create a customer using the existing customer creation logic
        const customerData = {
            name: `Customer ${linePosition + 1}`,
            avatar: '👤',
            patience: 100,
            order: []
        };

        const customer = this.createCustomer(customerData, isAI);

        // Mark as line customer
        customer.userData.isLineCustomer = true;
        customer.userData.linePosition = linePosition;
        customer.userData.originalLinePosition = linePosition;

        return customer;
    }

    addLineIdleAnimation(customer, index) {
        // Add subtle idle animations to make customers look alive
        const delay = index * 200; // Stagger animations

        setTimeout(() => {
            // Subtle swaying motion
            anime({
                targets: customer.rotation,
                y: customer.rotation.y + (Math.random() - 0.5) * 0.1,
                duration: 3000 + Math.random() * 2000,
                direction: 'alternate',
                loop: true,
                easing: 'easeInOutSine'
            });

            // Occasional head bob
            if (Math.random() < 0.3) {
                const headBob = () => {
                    anime({
                        targets: customer.position,
                        y: customer.position.y + 0.05,
                        duration: 500,
                        direction: 'alternate',
                        easing: 'easeInOutQuad',
                        complete: () => {
                            // Random chance to bob again
                            if (Math.random() < 0.2) {
                                setTimeout(headBob, 2000 + Math.random() * 5000);
                            }
                        }
                    });
                };
                setTimeout(headBob, Math.random() * 5000);
            }
        }, delay);
    }

    // Method to move line forward when a customer is served
    advancePlayerLine() {
        console.log(`🔄 Advancing player line (current length: ${this.playerCustomerLine.length})`);

        if (this.playerCustomerLine.length === 0) {
            console.log('⚠️ Player line is empty - cannot advance');
            return;
        }

        // Remove the first customer (who was just served)
        const servedCustomer = this.playerCustomerLine.shift();
        console.log(`👋 Removed served customer from player line. New length: ${this.playerCustomerLine.length}`);
        this.removeCustomerFromLine(servedCustomer);

        // Move all remaining customers forward
        this.playerCustomerLine.forEach((customer, index) => {
            const baseX = -4; // Updated to match new positioning
            const spacing = 1.5;
            const newZ = 6 + (index * spacing); // Updated to match new positioning

            // Animate movement to new position
            anime({
                targets: customer.position,
                z: newZ,
                duration: 1500,
                easing: 'easeInOutQuad'
            });

            customer.userData.linePosition = index;
        });

        console.log(`📏 Moved ${this.playerCustomerLine.length} remaining customers forward`);

        // Add a new customer to the back of the line
        this.addNewCustomerToPlayerLine();
    }

    advanceAILine() {
        console.log(`🔄 Advancing AI line (current length: ${this.aiCustomerLine.length})`);

        if (this.aiCustomerLine.length === 0) {
            console.log('⚠️ AI line is empty - cannot advance');
            return;
        }

        // Remove the first customer (who was just served)
        const servedCustomer = this.aiCustomerLine.shift();
        console.log(`👋 Removed served customer from AI line. New length: ${this.aiCustomerLine.length}`);
        this.removeCustomerFromLine(servedCustomer);

        // Move all remaining customers forward
        this.aiCustomerLine.forEach((customer, index) => {
            const baseX = 4; // Updated to match new positioning
            const spacing = 1.5;
            const newZ = 6 + (index * spacing); // Updated to match new positioning

            // Animate movement to new position
            anime({
                targets: customer.position,
                z: newZ,
                duration: 1500,
                easing: 'easeInOutQuad'
            });

            customer.userData.linePosition = index;
        });

        console.log(`📏 Moved ${this.aiCustomerLine.length} remaining customers forward`);

        // Add a new customer to the back of the line
        this.addNewCustomerToAILine();
    }

    removeCustomerFromLine(customer) {
        // Animate customer walking away
        const exitDirection = Math.random() < 0.5 ? -1 : 1; // Left or right exit
        const exitX = customer.position.x + (exitDirection * 15);
        const exitZ = customer.position.z + 10; // Walk away from market

        anime({
            targets: customer.position,
            x: exitX,
            z: exitZ,
            duration: 2000,
            easing: 'easeInOutQuad',
            complete: () => {
                // Remove from scene
                this.scene.remove(customer);

                // Clean up geometry and materials
                customer.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
        });

        // Add walking animation while exiting
        const walkingBob = anime({
            targets: customer.position,
            y: [customer.position.y, customer.position.y + 0.08, customer.position.y],
            duration: 400,
            direction: 'alternate',
            loop: true,
            easing: 'easeInOutSine'
        });

        // Stop walking animation when exit is complete
        setTimeout(() => {
            walkingBob.pause();
        }, 2000);
    }

    addNewCustomerToPlayerLine() {
        // Always add a new customer when called, unless we're at absolute maximum
        if (this.playerCustomerLine.length >= this.maxLineLength) {
            console.log(`🚫 Player line at maximum length (${this.maxLineLength}) - cannot add more customers`);
            return;
        }

        const newPosition = this.playerCustomerLine.length;
        console.log(`🆕 Adding new customer to player line at position ${newPosition} (current length: ${this.playerCustomerLine.length})`);

        const customer = this.createLineCustomer(false, newPosition);

        // Position at the back of the line
        const baseX = -4; // Updated to match new positioning
        const spacing = 1.5;
        const lineZ = 6 + (newPosition * spacing); // Updated to match new positioning

        // Start from off-screen and walk into position
        customer.position.set(baseX - 5, 0.65 * customer.userData.scale, lineZ + 5);
        customer.rotation.y = Math.PI; // Face exact opposite direction (south direction)

        this.scene.add(customer);
        this.playerCustomerLine.push(customer);

        console.log(`✅ New player customer added. Line length now: ${this.playerCustomerLine.length}`);

        // Animate walking into position
        anime({
            targets: customer.position,
            x: baseX,
            z: lineZ,
            duration: 2000,
            easing: 'easeInOutQuad',
            complete: () => {
                this.addLineIdleAnimation(customer, newPosition);
            }
        });

        // Add walking animation during entry
        const walkingBob = anime({
            targets: customer.position,
            y: [customer.position.y, customer.position.y + 0.08, customer.position.y],
            duration: 400,
            direction: 'alternate',
            loop: true,
            easing: 'easeInOutSine'
        });

        // Stop walking animation when in position
        setTimeout(() => {
            walkingBob.pause();
        }, 2000);
    }

    addNewCustomerToAILine() {
        // Always add a new customer when called, unless we're at absolute maximum
        if (this.aiCustomerLine.length >= this.maxLineLength) {
            console.log(`🚫 AI line at maximum length (${this.maxLineLength}) - cannot add more customers`);
            return;
        }

        const newPosition = this.aiCustomerLine.length;
        console.log(`🆕 Adding new customer to AI line at position ${newPosition} (current length: ${this.aiCustomerLine.length})`);

        const customer = this.createLineCustomer(true, newPosition);

        // Position at the back of the line
        const baseX = 4; // Updated to match new positioning
        const spacing = 1.5;
        const lineZ = 6 + (newPosition * spacing); // Updated to match new positioning

        // Start from off-screen and walk into position
        customer.position.set(baseX + 5, 0.65 * customer.userData.scale, lineZ + 5);
        customer.rotation.y = -Math.PI * 0.25 + Math.PI; // Face exact opposite direction (southeast direction)

        this.scene.add(customer);
        this.aiCustomerLine.push(customer);

        console.log(`✅ New AI customer added. Line length now: ${this.aiCustomerLine.length}`);

        // Animate walking into position
        anime({
            targets: customer.position,
            x: baseX,
            z: lineZ,
            duration: 2000,
            easing: 'easeInOutQuad',
            complete: () => {
                this.addLineIdleAnimation(customer, newPosition);
            }
        });

        // Add walking animation during entry
        const walkingBob = anime({
            targets: customer.position,
            y: [customer.position.y, customer.position.y + 0.08, customer.position.y],
            duration: 400,
            direction: 'alternate',
            loop: true,
            easing: 'easeInOutSine'
        });

        // Stop walking animation when in position
        setTimeout(() => {
            walkingBob.pause();
        }, 2000);
    }

    // Public methods for game managers to call
    getNextPlayerCustomer() {
        const customer = this.playerCustomerLine.length > 0 ? this.playerCustomerLine[0] : null;
        console.log(`👤 getNextPlayerCustomer() called - ${customer ? 'customer available' : 'no customer available'} (line length: ${this.playerCustomerLine.length})`);
        return customer;
    }

    getNextAICustomer() {
        const customer = this.aiCustomerLine.length > 0 ? this.aiCustomerLine[0] : null;
        console.log(`🤖 getNextAICustomer() called - ${customer ? 'customer available' : 'no customer available'} (line length: ${this.aiCustomerLine.length})`);
        return customer;
    }

    servePlayerCustomer() {
        console.log('🎯 servePlayerCustomer() called - advancing player line');
        this.advancePlayerLine();
    }

    serveAICustomer() {
        console.log('🎯 serveAICustomer() called - advancing AI line');
        this.advanceAILine();
    }

    // Debug method to visualize customer lines
    debugCustomerLines() {
        console.log('=== CUSTOMER LINES DEBUG ===');
        console.log(`Player line: ${this.playerCustomerLine.length} customers (max: ${this.maxLineLength})`);
        this.playerCustomerLine.forEach((customer, index) => {
            console.log(`  ${index}: ${customer.name} at (${customer.position.x.toFixed(1)}, ${customer.position.z.toFixed(1)})`);
        });

        console.log(`AI line: ${this.aiCustomerLine.length} customers (max: ${this.maxLineLength})`);
        this.aiCustomerLine.forEach((customer, index) => {
            console.log(`  ${index}: ${customer.name} at (${customer.position.x.toFixed(1)}, ${customer.position.z.toFixed(1)})`);
        });

        // Check if lines need replenishment
        if (this.playerCustomerLine.length < this.maxLineLength) {
            console.log(`🔄 Player line needs ${this.maxLineLength - this.playerCustomerLine.length} more customers`);
        }
        if (this.aiCustomerLine.length < this.maxLineLength) {
            console.log(`🔄 AI line needs ${this.maxLineLength - this.aiCustomerLine.length} more customers`);
        }

        console.log('============================');
    }

    createBackgroundPerson(index) {
        // Create a realistic person using detailed geometry
        const personGroup = new THREE.Group();

        // Body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({
            color: this.getRandomPersonColor()
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        personGroup.add(body);

        // Head (sphere) with better skin tone variation
        const skinTones = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffeaa7];
        const headGeometry = new THREE.SphereGeometry(0.25, 12, 8);
        const headMaterial = new THREE.MeshLambertMaterial({
            color: skinTones[Math.floor(Math.random() * skinTones.length)]
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.5;
        head.castShadow = true;
        personGroup.add(head);

        // Add realistic facial features
        this.addFacialFeatures(personGroup, head);

        // Add hair
        this.addHair(personGroup, head);

        // Add shoulders to connect body and arms naturally - more square and extended
        const shoulderGeometry = new THREE.BoxGeometry(0.25, 0.2, 0.2); // Rectangular/square shape
        const shoulderMaterial = new THREE.MeshLambertMaterial({
            color: bodyMaterial.color // Match shirt color
        });

        // Left shoulder - extended further out
        const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        leftShoulder.position.set(-0.42, 1.1, 0); // Extended from -0.32 to -0.42
        leftShoulder.castShadow = true;
        personGroup.add(leftShoulder);

        // Right shoulder - extended further out
        const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        rightShoulder.position.set(0.42, 1.1, 0); // Extended from 0.32 to 0.42
        rightShoulder.castShadow = true;
        personGroup.add(rightShoulder);

        // Natural hanging arms (not sticking up)
        const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
        const armMaterial = new THREE.MeshLambertMaterial({
            color: headMaterial.color // Use skin color for arms
        });

        // Left arm - hanging naturally at side, positioned from shoulder
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.4, 0.6, 0);
        leftArm.rotation.z = Math.PI / 12; // Slight angle, not straight up
        leftArm.castShadow = true;
        personGroup.add(leftArm);

        // Right arm - hanging naturally at side, positioned from shoulder
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.4, 0.6, 0);
        rightArm.rotation.z = -Math.PI / 12; // Slight angle, not straight up
        rightArm.castShadow = true;
        personGroup.add(rightArm);

        // Add hands
        const handGeometry = new THREE.SphereGeometry(0.06, 6, 4);
        const handMaterial = new THREE.MeshLambertMaterial({ color: headMaterial.color });

        const leftHand = new THREE.Mesh(handGeometry, handMaterial);
        leftHand.position.set(-0.42, 0.18, 0);
        leftHand.castShadow = true;
        personGroup.add(leftHand);

        const rightHand = new THREE.Mesh(handGeometry, handMaterial);
        rightHand.position.set(0.42, 0.18, 0);
        rightHand.castShadow = true;
        personGroup.add(rightHand);

        // Legs with better proportions
        const legGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8);
        const legMaterial = new THREE.MeshLambertMaterial({
            color: this.getRandomPantsColor()
        });

        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.15, -0.2, 0);
        leftLeg.castShadow = true;
        personGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.15, -0.2, 0);
        rightLeg.castShadow = true;
        personGroup.add(rightLeg);

        // Add shoes
        const shoeGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3);
        const shoeMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });

        const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        leftShoe.position.set(-0.15, -0.65, 0.05);
        leftShoe.castShadow = true;
        personGroup.add(leftShoe);

        const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        rightShoe.position.set(0.15, -0.65, 0.05);
        rightShoe.castShadow = true;
        personGroup.add(rightShoe);

        // Position person in background area
        const angle = (index / 8) * Math.PI * 2;
        const radius = 15 + Math.random() * 10; // Behind the market area
        personGroup.position.x = Math.cos(angle) * radius;
        personGroup.position.z = Math.sin(angle) * radius;

        // Make people larger and more visible
        const scale = 1.2 + Math.random() * 0.6; // Increased from 0.8-1.2 to 1.2-1.8

        // Position so feet touch the ground at y=0
        // The shoes are at y=-0.65 relative to person center, so we need to offset
        personGroup.position.y = 0.65 * scale; // Lift person so shoes touch ground at y=0
        personGroup.scale.setScalar(scale);

        // Store animation data with realistic walking behavior
        personGroup.userData = {
            walkSpeed: 0.3 + Math.random() * 0.4, // Slower, more realistic walking speed
            direction: this.getRealisticDirection(personGroup.position),
            changeDirectionTime: Math.random() * 8000 + 5000, // 5-13 seconds (longer, more natural)
            lastDirectionChange: Date.now(),
            originalPosition: personGroup.position.clone(),
            walkRadius: 8 + Math.random() * 12,
            walkingPattern: this.getWalkingPattern(), // Add walking patterns
            patternStartTime: Date.now(),
            isExploring: Math.random() < 0.3 // 30% chance to be exploring vs casual walking
        };

        this.scene.add(personGroup);
        this.backgroundPeople.push(personGroup);

        console.log(`🚶 Created realistic background person ${index + 1} at position (${personGroup.position.x.toFixed(1)}, ${personGroup.position.y.toFixed(1)}, ${personGroup.position.z.toFixed(1)})`);
    }

    getRandomPersonColor() {
        const colors = [
            0x3498db, // Blue
            0xe74c3c, // Red
            0x2ecc71, // Green
            0xf39c12, // Orange
            0x9b59b6, // Purple
            0x1abc9c, // Teal
            0xf1c40f, // Yellow
            0xff69b4, // Hot pink
            0x00ff00, // Bright green
            0xff4500  // Orange red
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    getRandomPantsColor() {
        const pantsColors = [
            0x2c3e50, // Dark blue
            0x34495e, // Dark gray
            0x8b4513, // Brown
            0x000000, // Black
            0x708090, // Slate gray
            0x556b2f, // Dark olive
            0x483d8b  // Dark slate blue
        ];
        return pantsColors[Math.floor(Math.random() * pantsColors.length)];
    }

    addFacialFeatures(personGroup, head) {
        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.03, 6, 4);
        const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.08, 1.55, 0.22);
        personGroup.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.08, 1.55, 0.22);
        personGroup.add(rightEye);

        // Nose
        const noseGeometry = new THREE.SphereGeometry(0.02, 6, 4);
        const noseMaterial = new THREE.MeshLambertMaterial({ color: head.material.color });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 1.48, 0.24);
        personGroup.add(nose);

        // Mouth
        const mouthGeometry = new THREE.BoxGeometry(0.08, 0.02, 0.01);
        const mouthMaterial = new THREE.MeshLambertMaterial({ color: 0x8b0000 });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, 1.42, 0.23);
        personGroup.add(mouth);
    }

    addHair(personGroup, head) {
        const hairColors = [
            0x8b4513, // Brown
            0x000000, // Black
            0xffd700, // Blonde
            0xa0522d, // Auburn
            0x696969, // Gray
            0xdc143c, // Red
            0x2f4f4f  // Dark gray
        ];

        const hairColor = hairColors[Math.floor(Math.random() * hairColors.length)];
        const hairMaterial = new THREE.MeshLambertMaterial({ color: hairColor });

        // Random hair style - enhanced for better back view visibility
        const hairStyle = Math.floor(Math.random() * 4);

        switch (hairStyle) {
            case 0: // Short hair with prominent back coverage
                const shortHairGeometry = new THREE.SphereGeometry(0.3, 8, 6);
                const shortHair = new THREE.Mesh(shortHairGeometry, hairMaterial);
                shortHair.position.set(0, 1.65, 0);
                shortHair.scale.set(1.2, 0.8, 1.3); // Extended back coverage
                personGroup.add(shortHair);

                // Add neck hair coverage
                const neckHairGeometry = new THREE.SphereGeometry(0.18, 6, 4);
                const neckHair = new THREE.Mesh(neckHairGeometry, hairMaterial);
                neckHair.position.set(0, 1.35, -0.15);
                neckHair.scale.set(1.1, 0.6, 1.2);
                personGroup.add(neckHair);
                break;

            case 1: // Medium hair with extended back
                const mediumHairGeometry = new THREE.SphereGeometry(0.32, 8, 6);
                const mediumHair = new THREE.Mesh(mediumHairGeometry, hairMaterial);
                mediumHair.position.set(0, 1.68, 0);
                mediumHair.scale.set(1.3, 0.9, 1.4); // More prominent back
                personGroup.add(mediumHair);

                // Back hair extension
                const mediumBackGeometry = new THREE.SphereGeometry(0.2, 6, 4);
                const mediumBack = new THREE.Mesh(mediumBackGeometry, hairMaterial);
                mediumBack.position.set(0, 1.4, -0.25);
                mediumBack.scale.set(1.2, 1.0, 1.1);
                personGroup.add(mediumBack);

                // Neck coverage
                const mediumNeckGeometry = new THREE.SphereGeometry(0.15, 6, 4);
                const mediumNeck = new THREE.Mesh(mediumNeckGeometry, hairMaterial);
                mediumNeck.position.set(0, 1.25, -0.18);
                mediumNeck.scale.set(1.0, 0.7, 1.1);
                personGroup.add(mediumNeck);
                break;

            case 2: // Long hair with dramatic back coverage
                const longHairGeometry = new THREE.SphereGeometry(0.35, 8, 6);
                const longHair = new THREE.Mesh(longHairGeometry, hairMaterial);
                longHair.position.set(0, 1.7, 0);
                longHair.scale.set(1.4, 1.1, 1.5); // Very prominent
                personGroup.add(longHair);

                // Main back hair mass
                const longBackGeometry = new THREE.SphereGeometry(0.25, 6, 4);
                const longBack = new THREE.Mesh(longBackGeometry, hairMaterial);
                longBack.position.set(0, 1.35, -0.35);
                longBack.scale.set(1.3, 1.8, 1.0); // Extends down the back
                personGroup.add(longBack);

                // Lower back hair
                const lowerBackGeometry = new THREE.SphereGeometry(0.18, 6, 4);
                const lowerBack = new THREE.Mesh(lowerBackGeometry, hairMaterial);
                lowerBack.position.set(0, 1.0, -0.3);
                lowerBack.scale.set(1.1, 1.2, 0.9);
                personGroup.add(lowerBack);

                // Full neck coverage
                const longNeckGeometry = new THREE.SphereGeometry(0.16, 6, 4);
                const longNeck = new THREE.Mesh(longNeckGeometry, hairMaterial);
                longNeck.position.set(0, 1.2, -0.2);
                longNeck.scale.set(1.2, 0.8, 1.2);
                personGroup.add(longNeck);
                break;

            case 3: // Voluminous hair with maximum back visibility
                const volumeHairGeometry = new THREE.SphereGeometry(0.38, 8, 6);
                const volumeHair = new THREE.Mesh(volumeHairGeometry, hairMaterial);
                volumeHair.position.set(0, 1.72, 0);
                volumeHair.scale.set(1.5, 1.0, 1.6); // Very wide and deep
                personGroup.add(volumeHair);

                // Prominent back volume
                const backVolumeGeometry = new THREE.SphereGeometry(0.28, 6, 4);
                const backVolume = new THREE.Mesh(backVolumeGeometry, hairMaterial);
                backVolume.position.set(0, 1.45, -0.4);
                backVolume.scale.set(1.4, 1.5, 1.2);
                personGroup.add(backVolume);

                // Side back coverage
                const leftSideGeometry = new THREE.SphereGeometry(0.2, 6, 4);
                const leftSide = new THREE.Mesh(leftSideGeometry, hairMaterial);
                leftSide.position.set(-0.2, 1.4, -0.3);
                leftSide.scale.set(0.8, 1.3, 1.1);
                personGroup.add(leftSide);

                const rightSideGeometry = new THREE.SphereGeometry(0.2, 6, 4);
                const rightSide = new THREE.Mesh(rightSideGeometry, hairMaterial);
                rightSide.position.set(0.2, 1.4, -0.3);
                rightSide.scale.set(0.8, 1.3, 1.1);
                personGroup.add(rightSide);

                // Complete neck coverage
                const volumeNeckGeometry = new THREE.SphereGeometry(0.17, 6, 4);
                const volumeNeck = new THREE.Mesh(volumeNeckGeometry, hairMaterial);
                volumeNeck.position.set(0, 1.18, -0.22);
                volumeNeck.scale.set(1.3, 0.9, 1.3);
                personGroup.add(volumeNeck);
                break;
        }

        // Add a hat or head covering for some customers (10% chance)
        if (Math.random() < 0.1) {
            const hatGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 8);
            const hatColors = [0x000080, 0x8B4513, 0x000000, 0x2F4F4F, 0x800000];
            const hatColor = hatColors[Math.floor(Math.random() * hatColors.length)];
            const hatMaterial = new THREE.MeshLambertMaterial({ color: hatColor });
            const hat = new THREE.Mesh(hatGeometry, hatMaterial);
            hat.position.set(0, 1.85, 0);
            hat.castShadow = true;
            personGroup.add(hat);

            // Hat brim for back visibility
            const brimGeometry = new THREE.CylinderGeometry(0.45, 0.45, 0.03, 8);
            const brim = new THREE.Mesh(brimGeometry, hatMaterial);
            brim.position.set(0, 1.78, 0);
            brim.castShadow = true;
            personGroup.add(brim);
        }
    }

    getRealisticDirection(position) {
        // Create more natural initial directions based on position
        const marketCenter = { x: 0, z: 0 };

        // Calculate angle from market center
        const angleFromCenter = Math.atan2(position.z - marketCenter.z, position.x - marketCenter.x);

        // Add some randomness but bias toward realistic directions
        const patterns = [
            angleFromCenter + Math.PI / 2, // Walk perpendicular to center (circular pattern)
            angleFromCenter - Math.PI / 2, // Walk perpendicular to center (opposite)
            angleFromCenter + Math.PI,     // Walk toward center
            Math.random() * Math.PI * 2    // Occasional random direction
        ];

        return patterns[Math.floor(Math.random() * patterns.length)];
    }

    getWalkingPattern() {
        const patterns = [
            'casual',      // Slow, meandering walk
            'purposeful',  // Walking toward a destination
            'browsing',    // Stop-and-go, looking around
            'circular',    // Walking in gentle curves
            'exploring'    // More adventurous, varied directions
        ];

        return patterns[Math.floor(Math.random() * patterns.length)];
    }

    getNextDirection(person, data) {
        const currentPos = person.position;
        const marketCenter = { x: 0, z: 0 };

        switch (data.walkingPattern) {
            case 'casual':
                // Gentle direction changes, avoid sharp turns
                return data.direction + (Math.random() - 0.5) * Math.PI / 3;

            case 'purposeful':
                // Walk toward market center or interesting areas
                if (Math.random() < 0.7) {
                    return Math.atan2(marketCenter.z - currentPos.z, marketCenter.x - currentPos.x) +
                        (Math.random() - 0.5) * Math.PI / 4;
                }
                return data.direction + (Math.random() - 0.5) * Math.PI / 6;

            case 'browsing':
                // More erratic, stop-and-go behavior
                if (Math.random() < 0.4) {
                    // Sometimes stop by setting very slow speed temporarily
                    data.walkSpeed = 0.1;
                    return data.direction;
                } else {
                    data.walkSpeed = 0.3 + Math.random() * 0.4; // Reset normal speed
                    return Math.random() * Math.PI * 2; // Random new direction
                }

            case 'circular':
                // Walk in gentle curves around the market
                const angleFromCenter = Math.atan2(currentPos.z, currentPos.x);
                return angleFromCenter + Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 8;

            case 'exploring':
                // More adventurous, but still somewhat logical
                const distanceFromCenter = Math.sqrt(currentPos.x * currentPos.x + currentPos.z * currentPos.z);
                if (distanceFromCenter > 20) {
                    // If too far, head back toward center
                    return Math.atan2(-currentPos.z, -currentPos.x) + (Math.random() - 0.5) * Math.PI / 3;
                } else {
                    // Explore freely
                    return Math.random() * Math.PI * 2;
                }

            default:
                return data.direction + (Math.random() - 0.5) * Math.PI / 2;
        }
    }

    getNextChangeTime(pattern) {
        switch (pattern) {
            case 'casual':
                return Math.random() * 10000 + 8000; // 8-18 seconds
            case 'purposeful':
                return Math.random() * 6000 + 4000;  // 4-10 seconds
            case 'browsing':
                return Math.random() * 4000 + 2000;  // 2-6 seconds (frequent changes)
            case 'circular':
                return Math.random() * 8000 + 6000;  // 6-14 seconds
            case 'exploring':
                return Math.random() * 7000 + 5000;  // 5-12 seconds
            default:
                return Math.random() * 8000 + 5000;  // 5-13 seconds
        }
    }

    getAvoidanceDirection(person, data) {
        const currentPos = person.position;
        const currentDirection = data.direction;

        // Try different directions to avoid obstacles
        const avoidanceOptions = [
            currentDirection + Math.PI / 2,  // Turn right
            currentDirection - Math.PI / 2,  // Turn left
            currentDirection + Math.PI,      // Turn around
            currentDirection + Math.PI / 4,  // Slight right
            currentDirection - Math.PI / 4   // Slight left
        ];

        // Test each direction to find a clear path
        for (const testDirection of avoidanceOptions) {
            const testDistance = 2.0; // Look ahead distance
            const testPos = {
                x: currentPos.x + Math.cos(testDirection) * testDistance,
                z: currentPos.z + Math.sin(testDirection) * testDistance
            };

            if (!this.checkCollision(testPos)) {
                return testDirection; // Found a clear direction
            }
        }

        // If all directions blocked, turn around
        return currentDirection + Math.PI;
    }

    startBackgroundAnimation() {
        // Background people animation is now handled in the main render loop
        console.log('🚶 Background people animation started');
    }

    updateBackgroundPeople(deltaTime) {
        if (!this.backgroundPeople || this.backgroundPeople.length === 0) return;

        const currentTime = Date.now();

        this.backgroundPeople.forEach(person => {
            if (!person.userData) return;

            const data = person.userData;

            // Check if it's time to change direction based on walking pattern
            if (currentTime - data.lastDirectionChange > data.changeDirectionTime) {
                data.direction = this.getNextDirection(person, data);
                data.lastDirectionChange = currentTime;
                data.changeDirectionTime = this.getNextChangeTime(data.walkingPattern);
            }

            // Calculate movement
            const moveX = Math.cos(data.direction) * data.walkSpeed * deltaTime;
            const moveZ = Math.sin(data.direction) * data.walkSpeed * deltaTime;

            // Store current position for collision checking
            const oldPosition = person.position.clone();
            const newPosition = {
                x: person.position.x + moveX,
                z: person.position.z + moveZ
            };

            // Check for collisions before moving
            if (!this.checkCollision(newPosition)) {
                // Move person if no collision
                person.position.x = newPosition.x;
                person.position.z = newPosition.z;
            } else {
                // Collision detected - change direction intelligently
                data.direction = this.getAvoidanceDirection(person, data);
                data.lastDirectionChange = currentTime;
            }

            // Keep people within bounds (circular area around market)
            const distanceFromCenter = Math.sqrt(
                person.position.x * person.position.x +
                person.position.z * person.position.z
            );

            if (distanceFromCenter > 25) {
                // Turn back toward center
                const angleToCenter = Math.atan2(-person.position.z, -person.position.x);
                data.direction = angleToCenter + (Math.random() - 0.5) * Math.PI / 2;
            }

            // Rotate person to face walking direction
            person.rotation.y = data.direction + Math.PI;

            // Add subtle walking animation (bobbing) - maintain proper ground positioning
            const scale = person.scale.x; // Get the person's scale
            const baseY = 0.65 * scale; // Shoes touch ground at y=0
            const bobAmount = Math.sin(currentTime * 0.01 * data.walkSpeed) * 0.05;
            person.position.y = baseY + bobAmount;
        });

        // Update market workers with in-place animations
        if (this.marketWorkers && this.marketWorkers.length > 0) {
            this.marketWorkers.forEach(worker => {
                if (!worker.userData || !worker.userData.isStationary) return;

                const data = worker.userData;

                // Subtle swaying motion
                const swayAmount = Math.sin(currentTime * 0.002 * data.animationSpeed + data.animationOffset) * 0.02;
                worker.position.x = data.originalPosition.x + swayAmount;

                // Subtle bobbing motion - maintain proper ground positioning
                const workerScale = 1.6; // Workers are scaled to 1.6
                const baseY = 0.65 * workerScale; // Shoes touch ground at y=0
                const bobAmount = Math.sin(currentTime * 0.003 * data.animationSpeed + data.animationOffset) * 0.03;
                worker.position.y = baseY + bobAmount;

                // Slight rotation variation
                const rotationAmount = Math.sin(currentTime * 0.001 * data.animationSpeed + data.animationOffset) * 0.05;
                worker.rotation.y = Math.PI + rotationAmount;
            });
        }
    }

    // Collision detection for background people
    checkCollision(position) {
        const personRadius = 1.0; // Collision radius for people

        // Define collision zones for major 3D objects
        const collisionZones = [
            // Market stand area (tent and counter)
            { x: 0, z: -2, radius: 6 },

            // Trees (approximate positions)
            { x: -8, z: -8, radius: 2 },
            { x: 8, z: -8, radius: 2 },
            { x: -10, z: 10, radius: 2 },
            { x: 10, z: 10, radius: 2 },

            // Benches and decorations area
            { x: -6, z: 6, radius: 1.5 },
            { x: 6, z: 6, radius: 1.5 },

            // Sign area (left side where sign is positioned)
            { x: -4, z: 8, radius: 2 },

            // Customer areas (keep people away from customer zones)
            { x: -4, z: 4, radius: 2 }, // Player customer area
            { x: 4, z: 4, radius: 2 },  // AI customer area
        ];

        // Check collision with each zone
        for (const zone of collisionZones) {
            const distance = Math.sqrt(
                Math.pow(position.x - zone.x, 2) +
                Math.pow(position.z - zone.z, 2)
            );

            if (distance < zone.radius + personRadius) {
                return true; // Collision detected
            }
        }

        // Check collision with other people
        if (this.backgroundPeople) {
            for (const otherPerson of this.backgroundPeople) {
                if (!otherPerson.position) continue;

                const distance = Math.sqrt(
                    Math.pow(position.x - otherPerson.position.x, 2) +
                    Math.pow(position.z - otherPerson.position.z, 2)
                );

                if (distance < personRadius * 2 && distance > 0.1) {
                    return true; // Too close to another person
                }
            }
        }

        return false; // No collision
    }

    // Customer management (DEPRECATED - now using customer lines)
    spawnCustomer(customerData, isAICustomer = false) {
        const customer = this.createCustomer(customerData, isAICustomer);

        // Position customer at realistic entrance based on type with proper ground positioning
        const customerScale = customer.userData.scale;
        const groundY = 0.65 * customerScale; // Feet touch ground at y=0

        if (isAICustomer) {
            // AI customers come from the right side of the market
            customer.position.set(15, groundY, 10);
            customer.rotation.y = Math.PI; // Face toward market initially
        } else {
            // Player customers come from the left side of the market
            customer.position.set(-15, groundY, 10);
            customer.rotation.y = 0; // Face toward market initially
        }

        // Initialize customer arrays if needed
        if (!this.customers) {
            this.customers = [];
        }

        this.customers.push(customer);
        this.scene.add(customer);

        // Animate customer walking to counter
        this.animateCustomerToCounter(customer, isAICustomer);

        console.log(`🛒 ${isAICustomer ? 'AI' : 'Player'} customer "${customerData.name}" spawned and walking to counter`);

        return customer;
    }

    createCustomer(customerData, isAICustomer = false) {
        // Create a realistic customer using the same detailed geometry as background people
        const customerGroup = new THREE.Group();

        // Body (cylinder) - different colors for AI vs Player customers
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8);
        let bodyColor;
        if (isAICustomer) {
            // AI customers have cooler colors (blues, purples, teals)
            const aiColors = [0x3498db, 0x9b59b6, 0x1abc9c, 0x2980b9, 0x8e44ad, 0x16a085];
            bodyColor = aiColors[Math.floor(Math.random() * aiColors.length)];
        } else {
            // Player customers have warmer colors (reds, oranges, yellows, greens)
            const playerColors = [0xe74c3c, 0xf39c12, 0xf1c40f, 0x2ecc71, 0xe67e22, 0x27ae60];
            bodyColor = playerColors[Math.floor(Math.random() * playerColors.length)];
        }

        const bodyMaterial = new THREE.MeshLambertMaterial({ color: bodyColor });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        customerGroup.add(body);

        // Head (sphere) with realistic skin tone
        const skinTones = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffeaa7];
        const headGeometry = new THREE.SphereGeometry(0.25, 12, 8);
        const headMaterial = new THREE.MeshLambertMaterial({
            color: skinTones[Math.floor(Math.random() * skinTones.length)]
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.5;
        head.castShadow = true;
        customerGroup.add(head);

        // Add realistic facial features
        this.addFacialFeatures(customerGroup, head);

        // Add hair
        this.addHair(customerGroup, head);

        // Add shoulders to connect body and arms naturally
        const shoulderGeometry = new THREE.BoxGeometry(0.25, 0.2, 0.2);
        const shoulderMaterial = new THREE.MeshLambertMaterial({
            color: bodyColor // Match shirt color
        });

        // Left shoulder
        const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        leftShoulder.position.set(-0.42, 1.1, 0);
        leftShoulder.castShadow = true;
        customerGroup.add(leftShoulder);

        // Right shoulder
        const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        rightShoulder.position.set(0.42, 1.1, 0);
        rightShoulder.castShadow = true;
        customerGroup.add(rightShoulder);

        // Natural hanging arms
        const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
        const armMaterial = new THREE.MeshLambertMaterial({
            color: headMaterial.color // Use skin color for arms
        });

        // Left arm - hanging naturally at side
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.4, 0.6, 0);
        leftArm.rotation.z = Math.PI / 12; // Slight angle
        leftArm.castShadow = true;
        customerGroup.add(leftArm);

        // Right arm - hanging naturally at side
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.4, 0.6, 0);
        rightArm.rotation.z = -Math.PI / 12; // Slight angle
        rightArm.castShadow = true;
        customerGroup.add(rightArm);

        // Add hands
        const handGeometry = new THREE.SphereGeometry(0.06, 6, 4);
        const handMaterial = new THREE.MeshLambertMaterial({ color: headMaterial.color });

        const leftHand = new THREE.Mesh(handGeometry, handMaterial);
        leftHand.position.set(-0.42, 0.18, 0);
        leftHand.castShadow = true;
        customerGroup.add(leftHand);

        const rightHand = new THREE.Mesh(handGeometry, handMaterial);
        rightHand.position.set(0.42, 0.18, 0);
        rightHand.castShadow = true;
        customerGroup.add(rightHand);

        // Legs with varied pants colors
        const legGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8);
        const legMaterial = new THREE.MeshLambertMaterial({
            color: this.getRandomPantsColor()
        });

        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.15, -0.2, 0);
        leftLeg.castShadow = true;
        customerGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.15, -0.2, 0);
        rightLeg.castShadow = true;
        customerGroup.add(rightLeg);

        // Add shoes
        const shoeGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3);
        const shoeMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });

        const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        leftShoe.position.set(-0.15, -0.65, 0.05);
        leftShoe.castShadow = true;
        customerGroup.add(leftShoe);

        const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        rightShoe.position.set(0.15, -0.65, 0.05);
        rightShoe.castShadow = true;
        customerGroup.add(rightShoe);

        // Add a subtle indicator for AI customers (floating above head)
        if (isAICustomer) {
            const indicatorGeometry = new THREE.SphereGeometry(0.08);
            const indicatorMaterial = new THREE.MeshLambertMaterial({
                color: 0x00FFFF,
                transparent: true,
                opacity: 0.8
            });
            const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
            indicator.position.set(0, 2.0, 0); // Above the head
            customerGroup.add(indicator);

            // Make the indicator glow/pulse
            const pulseAnimation = () => {
                anime({
                    targets: indicator.scale,
                    x: [1, 1.3, 1],
                    y: [1, 1.3, 1],
                    z: [1, 1.3, 1],
                    duration: 2000,
                    easing: 'easeInOutSine',
                    loop: true
                });
            };
            pulseAnimation();
        }

        // Scale customer to be slightly larger than background people
        const customerScale = 1.4 + Math.random() * 0.3; // 1.4-1.7x scale
        customerGroup.scale.setScalar(customerScale);

        // Name tag (for debugging/identification)
        customerGroup.name = customerData.name + (isAICustomer ? ' (AI)' : ' (Player)');

        // Store customer-specific data
        customerGroup.userData = {
            ...customerData,
            isAI: isAICustomer,
            isCustomer: true,
            scale: customerScale
        };

        return customerGroup;
    }

    animateCustomerToCounter(customer, isAICustomer = false) {
        const customerScale = customer.userData.scale;
        const groundY = 0.65 * customerScale; // Maintain proper ground positioning
        let targetPosition, targetRotation;

        if (isAICustomer) {
            // AI customers go to the right side of the market counter
            targetPosition = { x: 5, y: groundY, z: 2 };
            targetRotation = Math.PI * 0.75; // Face toward the counter/market center
        } else {
            // Player customers go to the left side of the market counter
            targetPosition = { x: -5, y: groundY, z: 2 };
            targetRotation = Math.PI * 0.25; // Face toward the counter/market center
        }

        // Add walking animation with realistic movement
        const walkingDuration = 3000; // 3 seconds to walk to counter

        // Start walking animation (bobbing motion)
        const startWalkingAnimation = () => {
            const walkingBob = anime({
                targets: customer.position,
                y: [groundY, groundY + 0.08, groundY],
                duration: 400,
                direction: 'alternate',
                loop: true,
                easing: 'easeInOutSine'
            });

            // Store the walking animation reference to stop it later
            customer.userData.walkingAnimation = walkingBob;
        };

        // Stop walking animation
        const stopWalkingAnimation = () => {
            if (customer.userData.walkingAnimation) {
                customer.userData.walkingAnimation.pause();
                customer.position.y = groundY; // Reset to ground level
            }
        };

        // Start walking animation
        startWalkingAnimation();

        // Animate customer walking to counter position
        anime({
            targets: customer.position,
            x: targetPosition.x,
            z: targetPosition.z,
            duration: walkingDuration,
            easing: 'easeInOutQuad',
            complete: () => {
                // Stop walking animation
                stopWalkingAnimation();

                // Customer reached counter, start idle animation
                this.startCustomerIdleAnimation(customer);
            }
        });

        // Gradually rotate customer to face the counter as they approach
        anime({
            targets: customer.rotation,
            y: targetRotation,
            duration: walkingDuration * 0.8, // Rotate slightly before reaching counter
            easing: 'easeInOutQuad'
        });

        console.log(`🚶 Customer walking to ${isAICustomer ? 'AI' : 'Player'} side of counter`);
    }

    startCustomerIdleAnimation(customer) {
        // Gentle idle animation while waiting at counter
        const customerScale = customer.userData.scale;
        const groundY = 0.65 * customerScale; // Maintain proper ground positioning

        // Subtle bobbing animation while waiting
        const idleAnimation = anime({
            targets: customer.position,
            y: [groundY, groundY + 0.05, groundY], // Very gentle bobbing
            duration: 2000, // Slower, more relaxed
            direction: 'alternate',
            loop: true,
            easing: 'easeInOutSine'
        });

        // Store the idle animation reference
        customer.userData.idleAnimation = idleAnimation;

        console.log(`😊 Customer "${customer.userData.name}" is now waiting at the counter`);
    }

    removeCustomer(customer) {
        // Stop any ongoing animations
        if (customer.userData.walkingAnimation) {
            customer.userData.walkingAnimation.pause();
        }
        if (customer.userData.idleAnimation) {
            customer.userData.idleAnimation.pause();
        }

        // Determine exit direction based on customer type
        const isAICustomer = customer.userData && customer.userData.isAI;
        const customerScale = customer.userData.scale;
        const groundY = 0.65 * customerScale;
        const exitX = isAICustomer ? 15 : -15; // AI exits right, Player exits left

        // Start walking animation for exit
        const exitWalkingAnimation = anime({
            targets: customer.position,
            y: [groundY, groundY + 0.08, groundY],
            duration: 400,
            direction: 'alternate',
            loop: true,
            easing: 'easeInOutSine'
        });

        // Rotate customer to face exit direction
        const exitRotation = isAICustomer ? 0 : Math.PI;
        anime({
            targets: customer.rotation,
            y: exitRotation,
            duration: 500,
            easing: 'easeInOutQuad'
        });

        // Animate customer leaving
        anime({
            targets: customer.position,
            x: exitX,
            z: 12, // Walk further back before disappearing
            duration: 2500,
            easing: 'easeInQuad',
            complete: () => {
                // Stop walking animation
                exitWalkingAnimation.pause();

                // Remove from scene
                this.scene.remove(customer);
                const index = this.customers.indexOf(customer);
                if (index > -1) {
                    this.customers.splice(index, 1);
                }

                console.log(`👋 Customer "${customer.userData.name}" has left the market`);
            }
        });

        console.log(`🚶‍♂️ Customer "${customer.userData.name}" is leaving the market`);
    }

    // Environmental effects
    setTimeOfDay(isDay) {
        this.isDayTime = isDay;

        if (isDay) {
            // Day lighting
            this.scene.background = new THREE.Color(0x87CEEB);
            this.scene.fog.color = new THREE.Color(0x87CEEB);
            this.lighting.sun.color = new THREE.Color(0xFFFFE0);
            this.lighting.sun.intensity = 1.2;
            this.lighting.ambient.intensity = 0.4;
        } else {
            // Night lighting
            this.scene.background = new THREE.Color(0x191970);
            this.scene.fog.color = new THREE.Color(0x191970);
            this.lighting.sun.color = new THREE.Color(0x4169E1);
            this.lighting.sun.intensity = 0.3;
            this.lighting.ambient.intensity = 0.6;
        }
    }

    addParticleEffect(position, type = 'success') {
        const particleCount = 20;
        const particles = new THREE.Group();

        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05);
            let particleMaterial;

            switch (type) {
                case 'success':
                    particleMaterial = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
                    break;
                case 'error':
                    particleMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
                    break;
                default:
                    particleMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
            }

            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            particles.add(particle);

            // Animate particles
            anime({
                targets: particle.position,
                x: position.x + (Math.random() - 0.5) * 4,
                y: position.y + Math.random() * 3 + 1,
                z: position.z + (Math.random() - 0.5) * 4,
                duration: 1500,
                easing: 'easeOutQuart'
            });

            anime({
                targets: particle.material,
                opacity: 0,
                duration: 1500,
                easing: 'easeOutQuart',
                complete: () => {
                    particles.remove(particle);
                }
            });
        }

        this.scene.add(particles);

        // Clean up after animation
        setTimeout(() => {
            this.scene.remove(particles);
        }, 2000);
    }

    // Event handlers
    setupEventListeners() {
        // Store bound function reference for proper cleanup
        this.boundOnWindowResize = this.onWindowResize.bind(this);
        window.addEventListener('resize', this.boundOnWindowResize);
    }

    onWindowResize() {
        if (!this.renderer || !this.camera || !this.container) return;

        // Get container dimensions with fallback
        const containerWidth = this.container.clientWidth || window.innerWidth;
        const containerHeight = this.container.clientHeight || window.innerHeight;

        // Ensure minimum size (1px) to prevent division by zero or errors
        const width = Math.max(containerWidth, 1);
        const height = Math.max(containerHeight, 1);
        if (width === this.lastResizeWidth && height === this.lastResizeHeight) {
            return;
        }
        this.lastResizeWidth = width;
        this.lastResizeHeight = height;

        this.camera.aspect = width / height;
        // Re-scale camera based on new viewport
        this.adjustCameraForViewport(width, height);

        this.renderer.setSize(width, height);
    }

    scheduleResizeCheck() {
        // Check if container is visible and properly sized after initialization
        const checkResize = () => {
            if (this.container.clientWidth > 0 && this.container.clientHeight > 0) {
                // Container is now visible, resize to proper dimensions
                this.onWindowResize();
                console.log('✅ 3D Scene resized to proper dimensions:', this.container.clientWidth, 'x', this.container.clientHeight);
            } else {
                // Container still not visible, check again
                setTimeout(checkResize, 100);
            }
        };

        // Start checking after a short delay to let the DOM settle
        setTimeout(checkResize, 50);
    }

    // Animation loop
    startRenderLoop() {
        this.animate();
    }

    animate() {
        if (!this.scene || !this.camera || !this.renderer) {
            return;
        }

        this.animationId = requestAnimationFrame(() => this.animate());

        const currentTime = performance.now();
        const deltaTime = this.clock.getDelta();

        // Adaptive frame rate limiting based on device
        const targetInterval = this.frameInterval || (1000 / 60);
        if (this.lastFrameTime && (currentTime - this.lastFrameTime) < targetInterval) {
            return;
        }
        this.lastFrameTime = currentTime;

        // Performance monitoring
        this.frameCount++;
        if (currentTime - this.lastFPSCheck >= 1000) {
            this.currentFPS = this.frameCount;
            this.frameCount = 0;
            this.lastFPSCheck = currentTime;

            // Log performance on mobile devices for debugging
            if (this.isMobileDevice && this.currentFPS < this.targetFPS * 0.8) {
                console.warn(`⚠️ Performance warning: ${this.currentFPS}fps (target: ${this.targetFPS}fps)`);
            }
        }

        // Update animations only if needed
        let sceneNeedsUpdate = false;

        // Update animation mixers
        if (this.mixers.length > 0) {
            this.mixers.forEach(mixer => {
                if (mixer) {
                    mixer.update(deltaTime);
                    sceneNeedsUpdate = true;
                }
            });
        }

        // Update background people (less frequently for performance)
        if (this.backgroundPeople && this.backgroundPeople.length > 0) {
            this.updateBackgroundPeople(deltaTime);
            sceneNeedsUpdate = true;
        }

        // Update market workers
        if (this.marketWorkers && this.marketWorkers.length > 0) {
            this.updateMarketWorkers(deltaTime);
            sceneNeedsUpdate = true;
        }

        // === Update drifting clouds ===
        if (this.clouds && this.clouds.length > 0) {
            this.updateClouds(deltaTime);
            sceneNeedsUpdate = true;
        }

        // Only render if scene has changed or it's been a while since last render
        if (sceneNeedsUpdate || (Date.now() - this.lastRenderTime > 100)) {
            this.renderer.render(this.scene, this.camera);
            this.lastRenderTime = Date.now();
        }
    }

    // Cleanup
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Dispose of animation mixers first to prevent memory leaks
        if (this.mixers && this.mixers.length > 0) {
            this.mixers.forEach(mixer => {
                if (mixer && typeof mixer.uncacheRoot === 'function') {
                    mixer.uncacheRoot();
                }
            });
            this.mixers = [];
        }

        // Dispose of Three.js resources with error handling
        if (this.scene) {
            this.scene.traverse((object) => {
                try {
                    if (object.geometry && typeof object.geometry.dispose === 'function') {
                        object.geometry.dispose();
                    }
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => {
                                if (material && typeof material.dispose === 'function') {
                                    material.dispose();
                                }
                            });
                        } else if (typeof object.material.dispose === 'function') {
                            object.material.dispose();
                        }
                    }
                } catch (error) {
                    console.warn('Error disposing object:', error);
                }
            });
        }

        if (this.renderer && typeof this.renderer.dispose === 'function') {
            this.renderer.dispose();
        }

        // Clean up background people
        if (this.backgroundPeople) {
            this.backgroundPeople.forEach(person => {
                if (person.parent) {
                    person.parent.remove(person);
                }
            });
            this.backgroundPeople = [];
        }

        // Clean up market workers
        if (this.marketWorkers) {
            this.marketWorkers.forEach(worker => {
                if (worker.parent) {
                    worker.parent.remove(worker);
                }
            });
            this.marketWorkers = [];
        }

        if (this.container && this.renderer.domElement) {
            this.container.removeChild(this.renderer.domElement);
        }

        // Remove event listener using stored bound function reference
        if (this.boundOnWindowResize) {
            window.removeEventListener('resize', this.boundOnWindowResize);
        }
    }

    // Force resize when container becomes visible
    forceResize() {
        console.log('🔄 Forcing 3D scene resize...');
        this.debugSceneStatus();
        this.onWindowResize();

        // Force a render after resize
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
            console.log('🎬 Forced render after resize');
        }
    }

    debugSceneStatus() {
        const canvas = this.renderer?.domElement;
        console.log('🔍 Scene Debug Status:');
        console.log('  Container dimensions:', this.container.clientWidth + 'x' + this.container.clientHeight);
        console.log('  Canvas dimensions:', canvas ? (canvas.width + 'x' + canvas.height) : 'No canvas');
        console.log('  Container visible:', window.getComputedStyle(this.container).display !== 'none');
        console.log('  Renderer initialized:', !!this.renderer);
        console.log('  Scene initialized:', !!this.scene);
        console.log('  Camera initialized:', !!this.camera);

        // Check parent visibility
        let element = this.container.parentElement;
        while (element && element !== document.body) {
            const style = window.getComputedStyle(element);
            if (style.display === 'none') {
                console.log('  Hidden parent found:', element.id || element.className);
            }
            element = element.parentElement;
        }
    }

    // Debug function to check background people
    debugBackgroundPeople() {
        console.log('🔍 Debug: Background People Status');
        console.log('  Background people array length:', this.backgroundPeople?.length || 0);

        if (this.backgroundPeople && this.backgroundPeople.length > 0) {
            this.backgroundPeople.forEach((person, index) => {
                console.log(`  Person ${index + 1}:`, {
                    position: person.position,
                    visible: person.visible,
                    inScene: this.scene.children.includes(person),
                    userData: person.userData
                });
            });
        }

        console.log('  Total scene children:', this.scene.children.length);
        console.log('  Camera position:', this.camera.position);
    }

    // Getters
    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    getRenderer() {
        return this.renderer;
    }

    /**
     * Procedurally generate soft white clouds that drift across the sky.
     */
    createClouds() {
        this.clouds = [];
        const cloudCount = 6;

        for (let i = 0; i < cloudCount; i++) {
            const cloud = new THREE.Group();

            const puffCount = 4 + Math.floor(Math.random() * 3);
            for (let p = 0; p < puffCount; p++) {
                const radius = 0.8 + Math.random() * 1.2;
                const puffGeo = new THREE.SphereGeometry(radius, 12, 10);
                const puffMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
                const puff = new THREE.Mesh(puffGeo, puffMat);
                puff.position.set((Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 2.5);
                cloud.add(puff);
            }

            // Position the cloud somewhere in the sky behind the scene
            cloud.position.set(-60 + Math.random() * 120, 25 + Math.random() * 8, -40 - Math.random() * 20);
            cloud.userData = { speed: 0.5 + Math.random() * 0.5 };

            this.clouds.push(cloud);
            this.scene.add(cloud);
        }
    }

    /**
     * Move clouds gently across the sky; loop them when they exit view.
     */
    updateClouds(deltaTime) {
        if (!this.clouds) return;
        const limit = 65;
        this.clouds.forEach(cloud => {
            cloud.position.x += cloud.userData.speed * deltaTime * 10; // scale factor for visibility
            if (cloud.position.x > limit) {
                cloud.position.x = -limit;
            }
        });
    }

    /**
     * Re-calculate camera FOV & distance based on viewport so the scene scales
     * down gracefully on tablets / small laptops while avoiding empty space.
     */
    adjustCameraForViewport(viewportWidth, viewportHeight) {
        if (!this.camera) return;

        // Normalised scale (1 = desktop HD ~1080px height)
        const reference = 1080;
        const scale = Math.min(viewportWidth, viewportHeight) / reference;
        const clampedScale = Math.max(scale, 0.65);

        // Keep a tighter gameplay framing (less sky/background), then gently zoom out on smaller screens.
        const baseFov = 50;
        const maxExtra = 14;
        this.camera.fov = baseFov + maxExtra * (1 - Math.min(clampedScale, 1));

        // Bring the camera closer while preserving visibility for narrow/short viewports.
        const basePos = { x: -11, y: 8.5, z: 14 };
        const distanceMultiplier = 1 / clampedScale;
        this.camera.position.set(
            basePos.x * distanceMultiplier,
            basePos.y * distanceMultiplier,
            basePos.z * distanceMultiplier
        );
        this.camera.lookAt(0, 1.8, 0);

        this.camera.updateProjectionMatrix();
    }

    // Force replenish customer lines if they get too low
    replenishCustomerLines() {
        console.log('🔄 Checking customer line replenishment...');

        // Replenish player line if it's getting low
        while (this.playerCustomerLine.length < this.maxLineLength) {
            console.log(`➕ Force adding customer to player line (current: ${this.playerCustomerLine.length}/${this.maxLineLength})`);
            this.addNewCustomerToPlayerLine();
        }

        // Replenish AI line if it's getting low
        while (this.aiCustomerLine.length < this.maxLineLength) {
            console.log(`➕ Force adding customer to AI line (current: ${this.aiCustomerLine.length}/${this.maxLineLength})`);
            this.addNewCustomerToAILine();
        }

        console.log(`✅ Customer lines replenished - Player: ${this.playerCustomerLine.length}, AI: ${this.aiCustomerLine.length}`);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SceneManager;
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.SceneManager = SceneManager;

    // Add debug functions to global scope
    window.debugBackgroundPeople = function () {
        if (window.gameManager && window.gameManager.sceneManager) {
            window.gameManager.sceneManager.debugBackgroundPeople();
        } else {
            console.log('Game manager or scene manager not available');
        }
    };

    // Add camera control functions for testing different views
    window.setCameraView = function (preset) {
        if (!window.gameManager || !window.gameManager.sceneManager) {
            console.log('Game manager or scene manager not available');
            return;
        }

        const camera = window.gameManager.sceneManager.camera;

        switch (preset) {
            case 'inside':
                // Close-up view inside the market
                camera.position.set(-8, 8, 12);
                camera.lookAt(0, 2, 0);
                console.log('📷 Camera set to inside market view');
                break;
            case 'overview':
                // High overview of the entire market and background
                camera.position.set(0, 20, 25);
                camera.lookAt(0, 0, 0);
                console.log('📷 Camera set to overview');
                break;
            case 'customer':
                // View from customer perspective
                camera.position.set(-6, 4, 8);
                camera.lookAt(0, 1, 0);
                console.log('📷 Camera set to customer view');
                break;
            case 'side':
                // Side view of the market
                camera.position.set(15, 10, 0);
                camera.lookAt(0, 2, 0);
                console.log('📷 Camera set to side view');
                break;
            default:
                console.log('Available presets: inside, overview, customer, side');
        }
    };
}
