/**
 * Three.js Background Scene
 * Interactive 3D background with particles and geometric shapes
 */
class ThreeJsBackground {
    constructor(deviceDetector) {
        this.deviceDetector = deviceDetector;
        this.container = document.getElementById('three-container');
        if (!this.container) return;
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.particles = [];
        this.geometricShapes = [];
        
        this.init();
        this.createParticles();
        this.createGeometricShapes();
        this.animate();

        window.addEventListener('lowFPS', () => this.optimizeForLowFPS());
        window.addEventListener('layoutChanged', () => this.onWindowResize());
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        this.camera.position.z = 50;

        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);
    }

    createParticles() {
        const particleCount = (this.deviceDetector?.device?.isMobile) ? 50 : 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        const colorPalette = [
            new THREE.Color(0xff6b6b),
            new THREE.Color(0x4ecdc4),
            new THREE.Color(0x45b7d1),
            new THREE.Color(0x96ceb4),
            new THREE.Color(0xffeaa7)
        ];

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 100;
            positions[i3 + 1] = (Math.random() - 0.5) * 100;
            positions[i3 + 2] = (Math.random() - 0.5) * 50;

            const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;

            sizes[i] = Math.random() * 2 + 0.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
            uniforms: { time: { value: 0 } },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float time;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z) * (1.0 + sin(time + position.x * 0.01) * 0.1);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                void main() {
                    float r = distance(gl_PointCoord, vec2(0.5, 0.5));
                    if (r > 0.5) discard;
                    float alpha = 1.0 - smoothstep(0.0, 0.5, r);
                    gl_FragColor = vec4(vColor, alpha * 0.8);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
    }

    createGeometricShapes() {
        const shapeCount = (this.deviceDetector?.device?.isMobile) ? 3 : 6;
        
        for (let i = 0; i < shapeCount; i++) {
            let geometry;
            const shapeType = Math.floor(Math.random() * 3);
            const size = Math.random() * 3 + 1;
            
            switch (shapeType) {
                case 0: geometry = new THREE.OctahedronGeometry(size); break;
                case 1: geometry = new THREE.IcosahedronGeometry(size); break;
                default: geometry = new THREE.TetrahedronGeometry(size); break;
            }

            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
                transparent: true,
                opacity: 0.1,
                wireframe: true
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(
                (Math.random() - 0.5) * 80,
                (Math.random() - 0.5) * 80,
                (Math.random() - 0.5) * 40
            );
            
            mesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            mesh.userData = {
                rotationSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.01,
                    (Math.random() - 0.5) * 0.01
                ),
                floatSpeed: Math.random() * 0.02 + 0.01,
                floatAmplitude: Math.random() * 2 + 1
            };

            this.geometricShapes.push(mesh);
            this.scene.add(mesh);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = Date.now() * 0.001;

        if (this.particleSystem) {
            this.particleSystem.material.uniforms.time.value = time;
            this.particleSystem.rotation.y = time * 0.1;
            
            const positions = this.particleSystem.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += Math.sin(time + positions[i] * 0.01) * 0.01;
            }
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
        }

        this.geometricShapes.forEach((shape, index) => {
            shape.rotation.x += shape.userData.rotationSpeed.x;
            shape.rotation.y += shape.userData.rotationSpeed.y;
            shape.rotation.z += shape.userData.rotationSpeed.z;
            shape.position.y += Math.sin(time * shape.userData.floatSpeed + index) * shape.userData.floatAmplitude * 0.01;
        });

        this.camera.position.x = Math.sin(time * 0.1) * 2;
        this.camera.position.y = Math.cos(time * 0.1) * 1;
        this.camera.lookAt(this.scene.position);

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    optimizeForLowFPS() {
        if (this.renderer.getPixelRatio() > 1) {
            this.renderer.setPixelRatio(1);
        }
    }
}
