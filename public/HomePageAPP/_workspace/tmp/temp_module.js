
        import * as THREE from 'three';
        import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

        // --- CONSTANTS ---
        const SVG_DATA = {
            viewBox: { x: 0, y: 0, w: 200, h: 200 },
            body: { cx: 100, cy: 100, r: 28 },
            wingRight: "M110,90 Q170,40 200,70 Q160,120 115,100",
            wingLeft: "M90,90 Q30,40 0,70 Q40,120 85,100"
        };
        const SCALE = 0.1;

        // --- SCENE SETUP ---
        const container = document.getElementById('game-container');
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 140);
        camera.position.set(0, 1.2, 20);
        const raycaster = new THREE.Raycaster();
        const pointerNdc = new THREE.Vector2();

        // --- LIGHTING (Daylight palette inspired by reference) ---
        const ambientLight = new THREE.AmbientLight(0xe4ffe0, 0.9);
        scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0x8fd0ff, 0x6ca245, 1.2);
        scene.add(hemiLight);

        const sunLight = new THREE.DirectionalLight(0xfff6d3, 2.1);
        sunLight.position.set(20, 26, 10);
        scene.add(sunLight);

        const fillLight = new THREE.DirectionalLight(0xe6ffd1, 0.65);
        fillLight.position.set(-16, 10, 8);
        scene.add(fillLight);

        const petRim = new THREE.PointLight(0x9de8ff, 8, 55);
        petRim.position.set(0, 2, -8);
        scene.add(petRim);

        // --- BACKGROUND WORLD ---
        const worldGroup = new THREE.Group();
        scene.add(worldGroup);

        function createSkyDome() {
            const geometry = new THREE.SphereGeometry(90, 40, 28);
            const material = new THREE.ShaderMaterial({
                side: THREE.BackSide,
                uniforms: {
                    topColor: { value: new THREE.Color(0x4da4ff) },
                    midColor: { value: new THREE.Color(0x9cdaff) },
                    bottomColor: { value: new THREE.Color(0xd8f4ff) }
                },
                vertexShader: `
                    varying vec3 vWorldPosition;
                    void main() {
                        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                        vWorldPosition = worldPosition.xyz;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec3 vWorldPosition;
                    uniform vec3 topColor;
                    uniform vec3 midColor;
                    uniform vec3 bottomColor;
                    void main() {
                        float h = normalize(vWorldPosition + vec3(0.0, 28.0, 0.0)).y;
                        vec3 colorA = mix(bottomColor, midColor, smoothstep(-0.25, 0.3, h));
                        vec3 colorB = mix(midColor, topColor, smoothstep(0.15, 0.9, h));
                        vec3 finalColor = mix(colorA, colorB, smoothstep(0.0, 1.0, h));
                        gl_FragColor = vec4(finalColor, 1.0);
                    }
                `
            });
            const dome = new THREE.Mesh(geometry, material);
            dome.position.y = 4;
            return dome;
        }
        worldGroup.add(createSkyDome());

        function createSunSprite() {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');

            const g = ctx.createRadialGradient(256, 256, 12, 256, 256, 250);
            g.addColorStop(0, 'rgba(255,255,230,1)');
            g.addColorStop(0.2, 'rgba(255,244,200,0.9)');
            g.addColorStop(0.45, 'rgba(255,240,190,0.35)');
            g.addColorStop(1, 'rgba(255,220,170,0)');

            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 512, 512);

            const tex = new THREE.CanvasTexture(canvas);
            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
            const sprite = new THREE.Sprite(mat);
            sprite.position.set(18, 20, -36);
            sprite.scale.set(11.5, 11.5, 1);
            return sprite;
        }
        const sunSprite = createSunSprite();
        worldGroup.add(sunSprite);

        function createCloudTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');

            for (let i = 0; i < 22; i++) {
                const x = Math.random() * canvas.width;
                const y = 90 + Math.random() * 320;
                const r = 45 + Math.random() * 80;
                const alpha = 0.12 + Math.random() * 0.18;
                const grad = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
                grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
                grad.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }

            const tex = new THREE.CanvasTexture(canvas);
            tex.needsUpdate = true;
            return tex;
        }

        const cloudTexture = createCloudTexture();
        const cloudPlanes = [];
        for (let i = 0; i < 6; i++) {
            const cloud = new THREE.Mesh(
                new THREE.PlaneGeometry(16 + Math.random() * 10, 7 + Math.random() * 4),
                new THREE.MeshBasicMaterial({ map: cloudTexture, transparent: true, depthWrite: false, opacity: 0.68 })
            );
            cloud.position.set(-20 + i * 8 + Math.random() * 3, 12 + Math.random() * 4, -42 - i * 1.2);
            cloud.rotation.y = 0.06;
            worldGroup.add(cloud);
            cloudPlanes.push({ mesh: cloud, speed: 0.06 + Math.random() * 0.04 });
        }

        function createGroundTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');

            const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
            gradient.addColorStop(0, '#9fd05c');
            gradient.addColorStop(0.5, '#85bf4d');
            gradient.addColorStop(1, '#6ca53c');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 1024, 1024);

            for (let i = 0; i < 1800; i++) {
                const x = Math.random() * 1024;
                const y = Math.random() * 1024;
                const s = 1 + Math.random() * 3;
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(175,220,100,0.3)' : 'rgba(95,145,50,0.35)';
                ctx.fillRect(x, y, s, s);
            }

            const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(6, 5);
            return tex;
        }

        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(86, 50, 1, 1),
            new THREE.MeshStandardMaterial({ map: createGroundTexture(), roughness: 0.9, metalness: 0.0 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, -3.1, -16);
        worldGroup.add(ground);

        function createBuilding() {
            const building = new THREE.Group();

            const main = new THREE.Mesh(
                new THREE.BoxGeometry(15, 4.5, 3.2),
                new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.85 })
            );
            main.position.set(0, 0, 0);
            building.add(main);

            const center = new THREE.Mesh(
                new THREE.BoxGeometry(3.4, 5.4, 3.7),
                new THREE.MeshStandardMaterial({ color: 0xf0e8d8, roughness: 0.8 })
            );
            center.position.set(0, 0.45, 0.25);
            building.add(center);

            const roof = new THREE.Mesh(
                new THREE.ConeGeometry(2.8, 1.3, 4),
                new THREE.MeshStandardMaterial({ color: 0x9f8469, roughness: 0.75 })
            );
            roof.position.set(0, 3.7, 0.28);
            roof.rotation.y = Math.PI * 0.25;
            building.add(roof);

            for (let i = -6; i <= 6; i += 2.2) {
                const windowPane = new THREE.Mesh(
                    new THREE.PlaneGeometry(1.1, 0.75),
                    new THREE.MeshBasicMaterial({ color: 0x8cb9df, transparent: true, opacity: 0.8 })
                );
                windowPane.position.set(i, 0.8, 1.63);
                building.add(windowPane);
            }

            const path = new THREE.Mesh(
                new THREE.PlaneGeometry(4, 22),
                new THREE.MeshStandardMaterial({ color: 0xd8d2c8, roughness: 0.9 })
            );
            path.rotation.x = -Math.PI / 2;
            path.position.set(0, -2.22, 9);
            building.add(path);

            building.scale.set(1.08, 1.08, 1.08);
            building.position.set(0, -0.1, -30);
            return building;
        }
        worldGroup.add(createBuilding());

        function createTree() {
            const tree = new THREE.Group();

            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.28, 3.5, 8),
                new THREE.MeshStandardMaterial({ color: 0x6c4b2c, roughness: 0.95 })
            );
            trunk.position.y = 1.7;
            tree.add(trunk);

            const leavesMat = new THREE.MeshStandardMaterial({ color: 0x71b63d, roughness: 0.9 });
            const leaf1 = new THREE.Mesh(new THREE.SphereGeometry(1.25, 12, 10), leavesMat);
            const leaf2 = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10), leavesMat);
            const leaf3 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 10), leavesMat);
            leaf1.position.set(0, 3.9, 0);
            leaf2.position.set(-0.6, 3.5, 0.4);
            leaf3.position.set(0.55, 3.35, -0.25);
            tree.add(leaf1, leaf2, leaf3);

            return tree;
        }

        const treeGroup = new THREE.Group();
        worldGroup.add(treeGroup);
        const treeInstances = [];
        for (let i = 0; i < 22; i++) {
            const tree = createTree();
            const side = Math.random() > 0.5 ? 1 : -1;
            const x = side * (10 + Math.random() * 22);
            const z = -12 - Math.random() * 28;
            const s = 0.9 + Math.random() * 0.8;
            tree.position.set(x, -2.2, z);
            tree.scale.set(s, s, s);
            treeGroup.add(tree);
            treeInstances.push({
                tree,
                phase: Math.random() * Math.PI * 2,
                sway: 0.01 + Math.random() * 0.01
            });
        }

        // Moving grass blades
        const grassGroup = new THREE.Group();
        scene.add(grassGroup);
        const grassBladeGeometry = new THREE.PlaneGeometry(0.08, 0.9, 1, 4);
        grassBladeGeometry.translate(0, 0.45, 0);
        const grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x5ea93f,
            roughness: 0.9,
            metalness: 0,
            side: THREE.DoubleSide
        });

        const grassBlades = [];
        for (let i = 0; i < 900; i++) {
            const blade = new THREE.Mesh(grassBladeGeometry, grassMaterial);
            const x = (Math.random() - 0.5) * 28;
            const z = -4 - Math.random() * 24;
            const y = -2.95 + (Math.random() - 0.5) * 0.08;
            blade.position.set(x, y, z);
            blade.scale.set(0.8 + Math.random() * 1.3, 0.7 + Math.random() * 1.5, 1);
            blade.rotation.y = Math.random() * Math.PI;
            grassGroup.add(blade);
            grassBlades.push({
                blade,
                phase: Math.random() * Math.PI * 2,
                speed: 0.8 + Math.random() * 1.1,
                sway: 0.08 + Math.random() * 0.06
            });
        }

        // Floating pollen / tiny light particles
        const pollenGeometry = new THREE.BufferGeometry();
        const pollenCount = 240;
        const pollenPos = new Float32Array(pollenCount * 3);
        for (let i = 0; i < pollenCount; i++) {
            pollenPos[i * 3] = (Math.random() - 0.5) * 30;
            pollenPos[i * 3 + 1] = -1 + Math.random() * 15;
            pollenPos[i * 3 + 2] = -5 - Math.random() * 36;
        }
        pollenGeometry.setAttribute('position', new THREE.BufferAttribute(pollenPos, 3));
        const pollenDotTexture = (() => {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
            grad.addColorStop(0.0, 'rgba(255,255,255,1)');
            grad.addColorStop(0.45, 'rgba(255,255,255,0.95)');
            grad.addColorStop(0.85, 'rgba(255,255,255,0.12)');
            grad.addColorStop(1.0, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 64, 64);
            const tex = new THREE.CanvasTexture(canvas);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
            return tex;
        })();
        const pollenMaterial = new THREE.PointsMaterial({
            color: 0xfff8d8,
            map: pollenDotTexture,
            alphaMap: pollenDotTexture,
            size: 0.05,
            sizeAttenuation: true,
            transparent: true,
            alphaTest: 0.12,
            opacity: 0.55,
            depthWrite: false
        });
        const pollen = new THREE.Points(pollenGeometry, pollenMaterial);
        scene.add(pollen);

        function createSoftHaloSprite({ size = 10, inner = 'rgba(75, 225, 255, 0.42)', mid = 'rgba(65, 180, 255, 0.2)', outer = 'rgba(20, 90, 180, 0)' } = {}) {
            const glowCanvas = document.createElement('canvas');
            glowCanvas.width = 512;
            glowCanvas.height = 512;
            const ctx = glowCanvas.getContext('2d');

            const g = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
            g.addColorStop(0.0, inner);
            g.addColorStop(0.45, mid);
            g.addColorStop(1.0, outer);

            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 512, 512);

            const tex = new THREE.CanvasTexture(glowCanvas);
            tex.colorSpace = THREE.SRGBColorSpace;
            const mat = new THREE.SpriteMaterial({
                map: tex,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(size, size, 1);
            return sprite;
        }

        // --- CREATURE OBJECTS ---
        const stuntRig = new THREE.Group();
        scene.add(stuntRig);
        const creatureGroup = new THREE.Group();
        const BASE_CREATURE_SCALE = 0.45;
        creatureGroup.scale.setScalar(BASE_CREATURE_SCALE);
        stuntRig.add(creatureGroup);

        const geometryBody = new THREE.SphereGeometry(SVG_DATA.body.r * SCALE, 64, 64);
        const materialBody = new THREE.MeshPhysicalMaterial({
            color: 0x4b2aa8,
            emissive: 0x13002b,
            emissiveIntensity: 0.45,
            roughness: 0.42,
            metalness: 0.03,
            clearcoat: 0.32,
            clearcoatRoughness: 0.62,
            reflectivity: 0.18
        });
        const bodyMesh = new THREE.Mesh(geometryBody, materialBody);
        bodyMesh.userData = bodyMesh.userData || {};
        bodyMesh.userData.previewRole = 'body';
        creatureGroup.add(bodyMesh);

        const haloCore = createSoftHaloSprite({
            size: 11,
            inner: 'rgba(90, 236, 255, 0.42)',
            mid: 'rgba(60, 176, 255, 0.2)',
            outer: 'rgba(14, 70, 170, 0.0)'
        });
        haloCore.position.set(0, 0.2, -2.0);
        creatureGroup.add(haloCore);

        const haloWide = createSoftHaloSprite({
            size: 16,
            inner: 'rgba(52, 160, 255, 0.12)',
            mid: 'rgba(32, 118, 230, 0.08)',
            outer: 'rgba(8, 44, 130, 0.0)'
        });
        haloWide.position.set(0, 0.15, -2.4);
        creatureGroup.add(haloWide);

        const contactShadowTexture = (() => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
            grad.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
            grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.36)');
            grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.12)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 512, 512);
            const tex = new THREE.CanvasTexture(canvas);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
            return tex;
        })();

        const shadowAnchor = new THREE.Group();
        shadowAnchor.position.set(0.3, -6.35, -5.8);
        shadowAnchor.rotation.x = -Math.PI / 2;
        shadowAnchor.renderOrder = 1;
        scene.add(shadowAnchor);

        const contactShadow = new THREE.Mesh(
            new THREE.CircleGeometry(3.0, 64),
            new THREE.MeshBasicMaterial({
                map: contactShadowTexture,
                transparent: true,
                opacity: 0.56,
                depthWrite: false,
                depthTest: false
            })
        );
        const CONTACT_SHADOW_OPACITY = 0.56;
        const CONTACT_SHADOW_SOFT_OPACITY = 0.34;
        const setContactShadowFade = (fade = 1) => {
            const alpha = THREE.MathUtils.clamp(fade, 0, 1);
            contactShadow.material.opacity = CONTACT_SHADOW_OPACITY * alpha;
            contactShadowSoft.material.opacity = CONTACT_SHADOW_SOFT_OPACITY * alpha;
            contactShadow.visible = alpha > 0.001;
            contactShadowSoft.visible = alpha > 0.001;
        };

        contactShadow.scale.set(1.25, 0.78, 1);
        shadowAnchor.add(contactShadow);

        const contactShadowSoft = new THREE.Mesh(
            new THREE.CircleGeometry(4.4, 64),
            new THREE.MeshBasicMaterial({
                map: contactShadowTexture,
                transparent: true,
                opacity: 0.34,
                depthWrite: false,
                depthTest: false
            })
        );
        contactShadowSoft.scale.set(1.45, 0.9, 1);
        contactShadowSoft.position.z = -0.01;
        shadowAnchor.add(contactShadowSoft);

        function createWingMesh(pathStr, layerName) {
            const loader = new SVGLoader();
            const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="${pathStr}" /></svg>`;
            const data = loader.parse(svgMarkup);
            const shapePath = data.paths[0];
            const shapes = shapePath.toShapes(true);
            const extrudeSettings = { steps: 2, depth: 1.2, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.25, bevelSegments: 4, curveSegments: 24 };

            const geometry = new THREE.ExtrudeGeometry(shapes, extrudeSettings);
            let pivotX = layerName === 'right' ? 110 : 90;
            const pivotY = 90;
            geometry.translate(-pivotX, -pivotY, 0);
            geometry.rotateX(Math.PI);

            const faceMat = new THREE.MeshPhysicalMaterial({
                color: 0x72ffff,
                emissive: 0x13cfff,
                emissiveIntensity: 0.28,
                transmission: 0.7,
                opacity: 0.34,
                transparent: true,
                roughness: 0.5,
                metalness: 0.0,
                side: THREE.DoubleSide
            });

            const edgeMat = new THREE.MeshStandardMaterial({
                color: 0x4cf7ff,
                emissive: 0x4cf7ff,
                emissiveIntensity: 1.8,
                roughness: 0.5,
                metalness: 0.0
            });

            const mesh = new THREE.Mesh(geometry, [faceMat, edgeMat]);
            mesh.scale.set(SCALE, SCALE, SCALE);
            return mesh;
        }

        const leftWingGroup = new THREE.Group();
        leftWingGroup.position.set(-1.05, 0.95, -0.1);
        creatureGroup.add(leftWingGroup);
        const leftWingBaseMesh = createWingMesh(SVG_DATA.wingLeft, 'left');
        leftWingBaseMesh.userData = leftWingBaseMesh.userData || {};
        leftWingBaseMesh.userData.previewWingBase = 'left';
        leftWingGroup.add(leftWingBaseMesh);

        const rightWingGroup = new THREE.Group();
        rightWingGroup.position.set(1.05, 0.95, -0.1);
        creatureGroup.add(rightWingGroup);
        const rightWingBaseMesh = createWingMesh(SVG_DATA.wingRight, 'right');
        rightWingBaseMesh.userData = rightWingBaseMesh.userData || {};
        rightWingBaseMesh.userData.previewWingBase = 'right';
        rightWingGroup.add(rightWingBaseMesh);

        class ReferenceEye {
            constructor() {
                this.group = new THREE.Group();
                this.look = new THREE.Vector2(0, 0);

                const scleraGeo = new THREE.SphereGeometry(7.2 * SCALE, 42, 42);
                this.scleraMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.0, clearcoat: 0.18, clearcoatRoughness: 0.75 });
                const sclera = new THREE.Mesh(scleraGeo, this.scleraMat);
                sclera.userData = sclera.userData || {};
                sclera.userData.previewEyePart = 'sclera';
                sclera.scale.set(1.0, 1.04, 0.86);
                this.group.add(sclera);

                this.irisRig = new THREE.Group();
                this.irisRig.position.z = 0.74;
                this.group.add(this.irisRig);

                this.irisMat = new THREE.MeshStandardMaterial({
                    color: 0x2a4ac4,
                    emissive: 0x000000,
                    emissiveIntensity: 0.0,
                    roughness: 0.6,
                    metalness: 0.0
                });
                this.iris = new THREE.Mesh(new THREE.CircleGeometry(0.38, 48), this.irisMat);
                this.iris.userData = this.iris.userData || {};
                this.iris.userData.previewEyePart = 'iris';
                this.irisRig.add(this.iris);

                this.pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
                this.pupil = new THREE.Mesh(new THREE.CircleGeometry(0.23, 44), this.pupilMat);
                this.pupil.userData = this.pupil.userData || {};
                this.pupil.userData.previewEyePart = 'pupil';
                this.pupil.position.z = 0.005;
                this.irisRig.add(this.pupil);

                this.shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });
                const shine = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), this.shineMat);
                shine.userData = shine.userData || {};
                shine.userData.previewEyePart = 'shine';
                shine.position.set(-0.14, 0.14, 0.01);
                this.irisRig.add(shine);

                this.shine2Mat = new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.6 });
                const shine2 = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), this.shine2Mat);
                shine2.userData = shine2.userData || {};
                shine2.userData.previewEyePart = 'shine2';
                shine2.position.set(0.12, -0.12, 0.01);
                this.irisRig.add(shine2);
            }

            setAppearance(style = {}) {
                const {
                    scleraColor = 0xffffff,
                    irisColor = 0x2a4ac4,
                    irisMap = null,
                    irisEmissive = 0x000000,
                    irisEmissiveIntensity = 0,
                    pupilColor = 0x000000,
                    pupilScaleX = 1,
                    pupilScaleY = 1,
                    pupilOffsetX = 0,
                    pupilOffsetY = 0,
                    shineOpacity = 1,
                    secondaryShineColor = 0xaaccff,
                    secondaryShineOpacity = 0.6
                } = style;

                this.scleraMat.color.setHex(scleraColor);
                this.irisMat.color.setHex(irisColor);
                this.irisMat.emissive.setHex(irisEmissive);
                this.irisMat.emissiveIntensity = irisEmissiveIntensity;
                this.irisMat.map = irisMap;
                this.irisMat.needsUpdate = true;

                this.pupilMat.color.setHex(pupilColor);
                this.pupil.scale.set(pupilScaleX, pupilScaleY, 1);
                this.pupil.position.set(pupilOffsetX, pupilOffsetY, 0.005);

                this.shineMat.opacity = shineOpacity;
                this.shine2Mat.color.setHex(secondaryShineColor);
                this.shine2Mat.opacity = secondaryShineOpacity;
            }

            update(targetX, targetY, dt) {
                this.look.x += (targetX - this.look.x) * Math.min(1, dt * 10);
                this.look.y += (targetY - this.look.y) * Math.min(1, dt * 10);
                this.irisRig.position.x = this.look.x;
                this.irisRig.position.y = this.look.y;
            }
        }

        const leftEye = new ReferenceEye();
        leftEye.group.userData = leftEye.group.userData || {};
        leftEye.group.userData.previewEyeSide = 'left';
        const leftEyeGroup = new THREE.Group();
        leftEyeGroup.position.set(-0.82, 0.33, 2.36);
        leftEyeGroup.rotation.y = 0.07;
        leftEyeGroup.add(leftEye.group);
        creatureGroup.add(leftEyeGroup);

        const rightEye = new ReferenceEye();
        rightEye.group.userData = rightEye.group.userData || {};
        rightEye.group.userData.previewEyeSide = 'right';
        const rightEyeGroup = new THREE.Group();
        rightEyeGroup.position.set(0.82, 0.33, 2.36);
        rightEyeGroup.rotation.y = -0.07;
        rightEyeGroup.add(rightEye.group);
        creatureGroup.add(rightEyeGroup);

        const mouthGroup = new THREE.Group();
        mouthGroup.position.set(0, -0.34, 2.48);
        creatureGroup.add(mouthGroup);

        const mouthDark = new THREE.Mesh(
            new THREE.SphereGeometry(0.32, 30, 20, 0, Math.PI * 2, 0.22, Math.PI * 0.42),
            new THREE.MeshStandardMaterial({
                color: 0x0d0710,
                roughness: 0.74,
                metalness: 0.02
            })
        );
        mouthDark.scale.set(1.18, 0.48, 0.22);
        mouthDark.rotation.x = -0.12;
        mouthGroup.add(mouthDark);

        const lipRim = new THREE.Mesh(
            new THREE.TorusGeometry(0.34, 0.024, 12, 46, Math.PI),
            new THREE.MeshPhysicalMaterial({
                color: 0x3f2e62,
                emissive: 0x1b1038,
                emissiveIntensity: 0.26,
                roughness: 0.38,
                metalness: 0.14,
                clearcoat: 0.42,
                clearcoatRoughness: 0.22
            })
        );
        lipRim.rotation.set(Math.PI * 0.96, 0, Math.PI);
        lipRim.position.set(0, 0.02, 0.035);
        mouthGroup.add(lipRim);

        const mouthGlow = new THREE.Mesh(
            new THREE.CircleGeometry(0.15, 28),
            new THREE.MeshBasicMaterial({
                color: 0x9a5eff,
                transparent: true,
                opacity: 0.12,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                toneMapped: false
            })
        );
        mouthGlow.position.set(0, 0.0, 0.05);
        mouthGroup.add(mouthGlow);

        function makeProceduralIrisTexture({
            size = 512,
            baseInner = '#ffffff',
            baseOuter = '#2a4ac4',
            limbColor = 'rgba(0, 0, 0, 0.45)',
            fiberColor = 'rgba(255, 255, 255, 0.22)',
            seedBase = 12345,
            starfield = false,
            runeRing = false
        } = {}) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            let seed = seedBase >>> 0;
            const rand = () => {
                seed = (seed * 1664525 + 1013904223) >>> 0;
                return seed / 4294967296;
            };

            const center = size * 0.5;
            const baseGrad = ctx.createRadialGradient(center, center, size * 0.06, center, center, size * 0.48);
            baseGrad.addColorStop(0.0, baseInner);
            baseGrad.addColorStop(0.52, baseOuter);
            baseGrad.addColorStop(1.0, '#04060f');
            ctx.fillStyle = baseGrad;
            ctx.fillRect(0, 0, size, size);

            ctx.lineCap = 'round';
            for (let i = 0; i < 180; i++) {
                const angle = rand() * Math.PI * 2;
                const r0 = size * (0.08 + rand() * 0.08);
                const r1 = size * (0.32 + rand() * 0.14);
                const x0 = center + Math.cos(angle) * r0;
                const y0 = center + Math.sin(angle) * r0;
                const x1 = center + Math.cos(angle + (rand() - 0.5) * 0.22) * r1;
                const y1 = center + Math.sin(angle + (rand() - 0.5) * 0.22) * r1;
                ctx.strokeStyle = fiberColor;
                ctx.lineWidth = 0.6 + rand() * 1.4;
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.quadraticCurveTo(
                    center + Math.cos(angle) * (r0 + r1) * 0.5,
                    center + Math.sin(angle) * (r0 + r1) * 0.5,
                    x1,
                    y1
                );
                ctx.stroke();
            }

            const limbRing = ctx.createRadialGradient(center, center, size * 0.32, center, center, size * 0.5);
            limbRing.addColorStop(0.0, 'rgba(0,0,0,0)');
            limbRing.addColorStop(1.0, limbColor);
            ctx.fillStyle = limbRing;
            ctx.fillRect(0, 0, size, size);

            if (runeRing) {
                ctx.strokeStyle = 'rgba(170, 245, 255, 0.6)';
                ctx.lineWidth = size * 0.012;
                ctx.beginPath();
                ctx.arc(center, center, size * 0.3, 0, Math.PI * 2);
                ctx.stroke();

                for (let i = 0; i < 12; i++) {
                    const a = (i / 12) * Math.PI * 2;
                    const x = center + Math.cos(a) * size * 0.3;
                    const y = center + Math.sin(a) * size * 0.3;
                    ctx.fillStyle = i % 2 === 0 ? 'rgba(143, 248, 255, 0.9)' : 'rgba(214, 152, 255, 0.9)';
                    ctx.fillRect(x - 2, y - 2, 4, 4);
                }
            }

            if (starfield) {
                for (let i = 0; i < 56; i++) {
                    const x = rand() * size;
                    const y = rand() * size;
                    const r = 0.8 + rand() * 2.2;
                    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
                    g.addColorStop(0, 'rgba(255,255,255,0.95)');
                    g.addColorStop(1, 'rgba(255,255,255,0)');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            const tex = new THREE.CanvasTexture(canvas);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
            return tex;
        }

        const eyeIrisTextures = {
            catEyes: makeProceduralIrisTexture({
                baseInner: '#ffe7a0',
                baseOuter: '#e5952e',
                limbColor: 'rgba(60, 20, 0, 0.65)',
                fiberColor: 'rgba(255, 246, 212, 0.34)',
                seedBase: 41371
            }),
            arcaneEyes: makeProceduralIrisTexture({
                baseInner: '#d9f8ff',
                baseOuter: '#5a7bff',
                limbColor: 'rgba(7, 16, 52, 0.65)',
                fiberColor: 'rgba(162, 238, 255, 0.34)',
                seedBase: 99173,
                runeRing: true
            }),
            demonEyes: makeProceduralIrisTexture({
                baseInner: '#ffc7a8',
                baseOuter: '#d7261f',
                limbColor: 'rgba(28, 0, 0, 0.75)',
                fiberColor: 'rgba(255, 188, 166, 0.28)',
                seedBase: 67241
            }),
            cosmicEyes: makeProceduralIrisTexture({
                baseInner: '#d8f0ff',
                baseOuter: '#3b46bb',
                limbColor: 'rgba(3, 6, 30, 0.72)',
                fiberColor: 'rgba(181, 203, 255, 0.24)',
                seedBase: 81911,
                starfield: true
            })
        };

        const EYE_APPEARANCE_PRESETS = {
            default: {
                scleraColor: 0xffffff,
                irisColor: 0x2a4ac4,
                irisMap: null,
                irisEmissive: 0x000000,
                irisEmissiveIntensity: 0,
                pupilColor: 0x000000,
                pupilScaleX: 1,
                pupilScaleY: 1,
                pupilOffsetX: 0,
                pupilOffsetY: 0,
                secondaryShineColor: 0xaaccff,
                secondaryShineOpacity: 0.6,
                shineOpacity: 1
            },
            catEyes: {
                scleraColor: 0xfff8e6,
                irisColor: 0xffffff,
                irisMap: eyeIrisTextures.catEyes,
                irisEmissive: 0x2d1f06,
                irisEmissiveIntensity: 0.14,
                pupilColor: 0x060700,
                pupilScaleX: 0.34,
                pupilScaleY: 1.5,
                pupilOffsetX: 0,
                pupilOffsetY: 0,
                secondaryShineColor: 0xffeeb8,
                secondaryShineOpacity: 0.8,
                shineOpacity: 0.95
            },
            arcaneEyes: {
                scleraColor: 0xe8f6ff,
                irisColor: 0xffffff,
                irisMap: eyeIrisTextures.arcaneEyes,
                irisEmissive: 0x48b8ff,
                irisEmissiveIntensity: 1.1,
                pupilColor: 0x080f22,
                pupilScaleX: 0.7,
                pupilScaleY: 1.06,
                pupilOffsetX: 0,
                pupilOffsetY: 0,
                secondaryShineColor: 0xb3f7ff,
                secondaryShineOpacity: 0.9,
                shineOpacity: 1
            },
            demonEyes: {
                scleraColor: 0x14090a,
                irisColor: 0xffffff,
                irisMap: eyeIrisTextures.demonEyes,
                irisEmissive: 0xff301e,
                irisEmissiveIntensity: 1.18,
                pupilColor: 0x000000,
                pupilScaleX: 0.42,
                pupilScaleY: 1.38,
                pupilOffsetX: 0,
                pupilOffsetY: 0,
                secondaryShineColor: 0xffa890,
                secondaryShineOpacity: 0.42,
                shineOpacity: 0.62
            },
            cosmicEyes: {
                scleraColor: 0xf3fbff,
                irisColor: 0xffffff,
                irisMap: eyeIrisTextures.cosmicEyes,
                irisEmissive: 0x6e7bff,
                irisEmissiveIntensity: 1.02,
                pupilColor: 0x040413,
                pupilScaleX: 0.84,
                pupilScaleY: 0.96,
                pupilOffsetX: 0,
                pupilOffsetY: 0,
                secondaryShineColor: 0xffffff,
                secondaryShineOpacity: 0.88,
                shineOpacity: 1
            }
        };

        let activeEyeAppearanceKey = 'default';
        function applyEyeAppearancePreset(presetKey = 'default') {
            const preset = EYE_APPEARANCE_PRESETS[presetKey] || EYE_APPEARANCE_PRESETS.default;
            leftEye.setAppearance(preset);
            rightEye.setAppearance(preset);
            activeEyeAppearanceKey = presetKey in EYE_APPEARANCE_PRESETS ? presetKey : 'default';
        }

        applyEyeAppearancePreset('default');

        // Keep generated world assets off so the cloud GIF remains the main background layer.
        worldGroup.visible = false;
        grassGroup.visible = false;

        // --- EQUIPPABLE PROPS ---
        const propsRig = new THREE.Group();
        propsRig.position.set(0, 0, 0);
        creatureGroup.add(propsRig);

        function makeOmegaMembraneMaps() {
            const size = 1024;
            const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

            const diffuseCanvas = document.createElement('canvas');
            diffuseCanvas.width = size;
            diffuseCanvas.height = size;
            const dCtx = diffuseCanvas.getContext('2d');

            const emissiveCanvas = document.createElement('canvas');
            emissiveCanvas.width = size;
            emissiveCanvas.height = size;
            const eCtx = emissiveCanvas.getContext('2d');

            const alphaCanvas = document.createElement('canvas');
            alphaCanvas.width = size;
            alphaCanvas.height = size;
            const aCtx = alphaCanvas.getContext('2d');

            let seed = 19771337;
            const rand = () => {
                seed = (seed * 1664525 + 1013904223) >>> 0;
                return seed / 4294967296;
            };

            const baseGradient = dCtx.createLinearGradient(0, 0, 0, size);
            baseGradient.addColorStop(0.0, '#12070b');
            baseGradient.addColorStop(0.28, '#241016');
            baseGradient.addColorStop(0.56, '#5f2418');
            baseGradient.addColorStop(0.85, '#b04c1f');
            baseGradient.addColorStop(1.0, '#ff952f');
            dCtx.fillStyle = baseGradient;
            dCtx.fillRect(0, 0, size, size);

            for (let i = 0; i < 260; i++) {
                const x = rand() * size;
                const y = rand() * size;
                const r = 20 + rand() * 96;
                const g = dCtx.createRadialGradient(x, y, 1, x, y, r);
                const alpha = 0.03 + rand() * 0.09;
                g.addColorStop(0, `rgba(255,185,132,${alpha})`);
                g.addColorStop(1, 'rgba(26,8,8,0)');
                dCtx.fillStyle = g;
                dCtx.beginPath();
                dCtx.arc(x, y, r, 0, Math.PI * 2);
                dCtx.fill();
            }

            dCtx.lineCap = 'round';
            for (let i = 0; i < 56; i++) {
                const startX = 120 + rand() * 250;
                const startY = 470 + rand() * 300;
                let x = startX;
                let y = startY;
                dCtx.beginPath();
                dCtx.moveTo(x, y);
                const branchCount = 6 + Math.floor(rand() * 5);
                for (let j = 0; j < branchCount; j++) {
                    x += 65 + rand() * 90;
                    y += (rand() - 0.62) * 150;
                    dCtx.quadraticCurveTo(
                        x - 30 + rand() * 60,
                        y - 20 + rand() * 40,
                        x,
                        y
                    );
                }
                dCtx.strokeStyle = `rgba(255,188,132,${0.07 + rand() * 0.12})`;
                dCtx.lineWidth = 0.7 + rand() * 2.4;
                dCtx.stroke();
            }

            const darkVignette = dCtx.createRadialGradient(size * 0.55, size * 0.45, 60, size * 0.55, size * 0.45, size * 0.95);
            darkVignette.addColorStop(0, 'rgba(0,0,0,0)');
            darkVignette.addColorStop(1, 'rgba(6,2,2,0.45)');
            dCtx.fillStyle = darkVignette;
            dCtx.fillRect(0, 0, size, size);

            eCtx.fillStyle = '#070103';
            eCtx.fillRect(0, 0, size, size);
            const lowerGlow = eCtx.createLinearGradient(0, size * 0.32, 0, size);
            lowerGlow.addColorStop(0, 'rgba(255,70,18,0.05)');
            lowerGlow.addColorStop(0.6, 'rgba(255,113,34,0.36)');
            lowerGlow.addColorStop(1, 'rgba(255,180,72,0.92)');
            eCtx.fillStyle = lowerGlow;
            eCtx.fillRect(0, 0, size, size);

            for (let i = 0; i < 22; i++) {
                const x = size * (0.46 + rand() * 0.48);
                const y = size * (0.55 + rand() * 0.37);
                const r = 24 + rand() * 95;
                const g = eCtx.createRadialGradient(x, y, 2, x, y, r);
                g.addColorStop(0, 'rgba(255,220,150,0.92)');
                g.addColorStop(0.35, 'rgba(255,124,42,0.58)');
                g.addColorStop(1, 'rgba(25,6,4,0)');
                eCtx.fillStyle = g;
                eCtx.beginPath();
                eCtx.arc(x, y, r, 0, Math.PI * 2);
                eCtx.fill();
            }

            eCtx.strokeStyle = 'rgba(255,138,52,0.25)';
            eCtx.lineCap = 'round';
            for (let i = 0; i < 34; i++) {
                const x0 = 180 + rand() * 190;
                const y0 = 520 + rand() * 260;
                const x1 = x0 + 330 + rand() * 260;
                const y1 = y0 + (rand() - 0.7) * 240;
                eCtx.beginPath();
                eCtx.moveTo(x0, y0);
                eCtx.quadraticCurveTo((x0 + x1) * 0.5, Math.min(size - 10, y0 + y1 * 0.2), x1, y1);
                eCtx.lineWidth = 1.5 + rand() * 2.2;
                eCtx.stroke();
            }

            aCtx.fillStyle = '#ffffff';
            aCtx.fillRect(0, 0, size, size);
            for (let i = 0; i < 52; i++) {
                const x = size * (0.58 + rand() * 0.42);
                const y = size * (0.58 + rand() * 0.4);
                const r = 12 + rand() * 42;
                const g = aCtx.createRadialGradient(x, y, 0, x, y, r);
                g.addColorStop(0, 'rgba(0,0,0,0.95)');
                g.addColorStop(1, 'rgba(255,255,255,0)');
                aCtx.fillStyle = g;
                aCtx.beginPath();
                aCtx.arc(x, y, r, 0, Math.PI * 2);
                aCtx.fill();
            }

            const diffuse = new THREE.CanvasTexture(diffuseCanvas);
            diffuse.colorSpace = THREE.SRGBColorSpace;
            diffuse.anisotropy = maxAnisotropy;
            diffuse.needsUpdate = true;

            const emissive = new THREE.CanvasTexture(emissiveCanvas);
            emissive.colorSpace = THREE.SRGBColorSpace;
            emissive.anisotropy = maxAnisotropy;
            emissive.needsUpdate = true;

            const alpha = new THREE.CanvasTexture(alphaCanvas);
            alpha.anisotropy = maxAnisotropy;
            alpha.needsUpdate = true;

            return { diffuse, emissive, alpha };
        }

        function makeBoneBetween(start, end, radiusStart, radiusEnd, material, radialSegments = 12) {
            const delta = new THREE.Vector3().subVectors(end, start);
            const length = Math.max(0.0001, delta.length());
            const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusEnd, radiusStart, length, radialSegments), material);
            mesh.position.copy(start).addScaledVector(delta, 0.5);
            mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
            return mesh;
        }

        function makeOmegaWingShape(dir) {
            const shape = new THREE.Shape();
            const mx = (x) => x * dir;

            // Curved demonic wing profile tuned to match reference silhouette:
            // broader span, higher crown arc, and sharper trailing scallops.
            shape.moveTo(mx(0.05), 0.3);

            // Primary upper arc to top tip.
            shape.quadraticCurveTo(mx(0.94), 1.48, mx(2.24), 2.5);
            shape.quadraticCurveTo(mx(4.08), 3.54, mx(6.24), 3.92);
            shape.quadraticCurveTo(mx(7.52), 3.98, mx(8.32), 3.62);

            // Folded upper trailing edge toward mid structure.
            shape.quadraticCurveTo(mx(7.78), 3.16, mx(7.06), 2.52);
            shape.quadraticCurveTo(mx(6.48), 2.0, mx(6.08), 1.46);

            // Finger-led membrane scallops.
            shape.quadraticCurveTo(mx(7.26), 1.24, mx(8.08), 0.96);
            shape.quadraticCurveTo(mx(7.0), 0.48, mx(5.58), 0.14);
            shape.quadraticCurveTo(mx(7.06), -0.04, mx(7.9), -0.46);
            shape.quadraticCurveTo(mx(6.58), -1.06, mx(5.04), -1.26);
            shape.quadraticCurveTo(mx(6.32), -1.64, mx(7.0), -2.08);

            // Lower contour back to root.
            shape.quadraticCurveTo(mx(5.38), -2.36, mx(3.46), -2.36);
            shape.quadraticCurveTo(mx(2.08), -2.34, mx(1.04), -2.2);
            shape.quadraticCurveTo(mx(0.34), -1.98, mx(0.02), -1.56);
            shape.quadraticCurveTo(mx(-0.16), -1.06, mx(-0.12), -0.52);
            shape.quadraticCurveTo(mx(-0.08), -0.12, mx(0.05), 0.3);

            shape.closePath();
            return shape;
        }

        function makeOmegaWingSide(side = 'left', sharedMaps) {
            const dir = side === 'left' ? -1 : 1;
            const wing = new THREE.Group();
            wing.position.set(dir * 0.3, -0.34, -1.0);
            wing.rotation.set(-0.05, dir * 0.08, 0.04 * dir);
            wing.scale.set(1.3, 1.3, 1.3);

            const boneMat = new THREE.MeshPhysicalMaterial({
                color: 0x28150f,
                emissive: 0x150804,
                emissiveIntensity: 0.38,
                metalness: 0.55,
                roughness: 0.42,
                clearcoat: 0.24,
                clearcoatRoughness: 0.34,
                envMapIntensity: 0.5
            });
            const clawMat = new THREE.MeshPhysicalMaterial({
                color: 0x120b09,
                emissive: 0x1a0904,
                emissiveIntensity: 0.22,
                metalness: 0.62,
                roughness: 0.32,
                clearcoat: 0.2,
                clearcoatRoughness: 0.4,
                envMapIntensity: 0.42
            });
            const membraneMat = new THREE.MeshPhysicalMaterial({
                color: 0x9c4225,
                map: sharedMaps.diffuse,
                emissive: 0xff7c2c,
                emissiveMap: sharedMaps.emissive,
                emissiveIntensity: 1.24,
                metalness: 0.03,
                roughness: 0.76,
                transmission: 0.05,
                thickness: 0.48,
                alphaMap: sharedMaps.alpha,
                alphaTest: 0.16,
                transparent: true,
                opacity: 0.98,
                side: THREE.DoubleSide
            });

            const membraneShape = makeOmegaWingShape(dir);
            const membraneGeo = new THREE.ShapeGeometry(membraneShape, 104);
            membraneGeo.computeBoundingBox();
            const bounds = membraneGeo.boundingBox;
            const minAbsX = Math.min(Math.abs(bounds.min.x), Math.abs(bounds.max.x));
            const maxAbsX = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x));
            const spanAbsX = Math.max(0.001, maxAbsX - minAbsX);
            const spanY = Math.max(0.001, bounds.max.y - bounds.min.y);
            const pos = membraneGeo.attributes.position;
            const uv = new Float32Array(pos.count * 2);
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                const nx = THREE.MathUtils.clamp((Math.abs(x) - minAbsX) / spanAbsX, 0, 1);
                const ny = THREE.MathUtils.clamp((y - bounds.min.y) / spanY, 0, 1);
                const camber = (0.08 + nx * 0.32) - Math.pow(ny, 1.75) * 0.08;
                const wrinkle = Math.sin(nx * 10.4 + ny * 4.2) * 0.018 + Math.cos(nx * 4.6 - ny * 9.1) * 0.014;
                pos.setZ(i, camber + wrinkle);
                uv[i * 2] = nx;
                uv[i * 2 + 1] = 1 - ny;
            }
            membraneGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
            pos.needsUpdate = true;
            membraneGeo.computeVertexNormals();
            const membrane = new THREE.Mesh(membraneGeo, membraneMat);
            membrane.renderOrder = 2;
            wing.add(membrane);

            const root = new THREE.Vector3(dir * 0.14, 0.22, 0.27);
            const topTip = new THREE.Vector3(dir * 8.24, 3.56, 0.52);
            const midTip = new THREE.Vector3(dir * 8.0, 0.94, 0.32);
            const lowerTip = new THREE.Vector3(dir * 6.96, -2.02, 0.16);

            wing.add(makeBoneBetween(root, topTip, 0.18, 0.08, boneMat, 16));
            wing.add(makeBoneBetween(root, midTip, 0.16, 0.07, boneMat, 14));
            wing.add(makeBoneBetween(root, lowerTip, 0.14, 0.06, boneMat, 14));

            const ribTargets = [
                [dir * 5.86, 2.82, 0.42],
                [dir * 5.54, 1.92, 0.36],
                [dir * 5.06, 1.02, 0.28],
                [dir * 4.62, 0.12, 0.23],
                [dir * 4.2, -0.84, 0.18],
                [dir * 3.74, -1.72, 0.14]
            ];
            const ribOrigins = [
                [dir * 0.86, 0.74, 0.27],
                [dir * 1.0, 0.58, 0.26],
                [dir * 1.12, 0.4, 0.25],
                [dir * 1.22, 0.22, 0.23],
                [dir * 1.28, 0.04, 0.21],
                [dir * 1.34, -0.16, 0.19]
            ];
            for (let i = 0; i < ribTargets.length; i++) {
                const a = new THREE.Vector3(...ribOrigins[i]);
                const b = new THREE.Vector3(...ribTargets[i]);
                wing.add(makeBoneBetween(a, b, 0.11 - i * 0.01, 0.045, boneMat, 12));
            }

            const knuckles = [
                [dir * 0.38, 0.48, 0.33, 0.18],
                [dir * 0.7, 0.38, 0.3, 0.16],
                [dir * 0.98, 0.24, 0.27, 0.15],
                [dir * 1.2, 0.08, 0.24, 0.13],
                [dir * 1.34, -0.08, 0.22, 0.12]
            ];
            for (const [x, y, z, r] of knuckles) {
                const orb = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 14), boneMat);
                orb.position.set(x, y, z);
                wing.add(orb);
            }

            for (let i = 0; i < 3; i++) {
                const dorsalSpike = new THREE.Mesh(new THREE.ConeGeometry(0.1 - i * 0.01, 0.34 - i * 0.03, 10), clawMat);
                dorsalSpike.position.set(dir * (0.24 + i * 0.2), 0.58 + i * 0.07, 0.3 - i * 0.03);
                dorsalSpike.rotation.set(-0.35, 0.0, dir > 0 ? -Math.PI * 0.7 : Math.PI * 0.7);
                wing.add(dorsalSpike);
            }

            const topClaw = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.84, 12), clawMat);
            topClaw.position.set(dir * 8.24, 3.52, 0.54);
            topClaw.rotation.set(0.1, 0, dir > 0 ? -Math.PI * 0.58 : Math.PI * 0.58);
            wing.add(topClaw);

            const midClaw = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.76, 12), clawMat);
            midClaw.position.set(dir * 8.02, 0.92, 0.34);
            midClaw.rotation.set(0.06, 0, dir > 0 ? -Math.PI * 0.5 : Math.PI * 0.5);
            wing.add(midClaw);

            const lowerClaw = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.66, 12), clawMat);
            lowerClaw.position.set(dir * 6.96, -2.02, 0.18);
            lowerClaw.rotation.set(-0.05, 0, dir > 0 ? -Math.PI * 0.42 : Math.PI * 0.42);
            wing.add(lowerClaw);

            const emberMat = new THREE.MeshStandardMaterial({
                color: 0xffa458,
                emissive: 0xff6a24,
                emissiveIntensity: 1.9,
                roughness: 0.44,
                metalness: 0.0
            });
            const emberPositions = [
                [dir * 6.12, -1.38, 0.25],
                [dir * 5.42, -1.58, 0.2],
                [dir * 4.78, -1.78, 0.17],
                [dir * 6.74, 0.74, 0.25]
            ];
            const embers = [];
            for (let i = 0; i < emberPositions.length; i++) {
                const [x, y, z] = emberPositions[i];
                const ember = new THREE.Mesh(new THREE.SphereGeometry(0.06 + i * 0.012, 12, 10), emberMat);
                ember.position.set(x, y, z);
                ember.userData.baseZ = z;
                wing.add(ember);
                embers.push(ember);
            }

            const wingFireLight = new THREE.PointLight(0xff7e30, 1.4, 10.2, 2);
            wingFireLight.position.set(dir * 5.18, -0.8, 0.62);
            wing.add(wingFireLight);

            wing.userData.fireMats = [membraneMat];
            wing.userData.embers = embers;
            wing.userData.fireLights = [wingFireLight];
            return wing;
        }

        function makeOmegaWingsProp() {
            const g = new THREE.Group();
            const omegaMaps = makeOmegaMembraneMaps();
            const left = makeOmegaWingSide('left', omegaMaps);
            const right = makeOmegaWingSide('right', omegaMaps);
            left.visible = false;
            right.visible = false;
            leftWingGroup.add(left);
            rightWingGroup.add(right);
            g.userData.left = left;
            g.userData.right = right;
            g.userData.fireMats = [
                ...(left.userData.fireMats || []),
                ...(right.userData.fireMats || [])
            ];
            g.userData.embers = [
                ...(left.userData.embers || []),
                ...(right.userData.embers || [])
            ];
            g.userData.fireLights = [
                ...(left.userData.fireLights || []),
                ...(right.userData.fireLights || [])
            ];
            return g;
        }

        function makeRoboticWingSide(side = 'left') {
            const dir = side === 'left' ? -1 : 1;
            const wing = new THREE.Group();
            wing.position.set(dir * 0.58, -0.34, 0.3);
            wing.rotation.set(0.02, dir * 0.02, -0.02 * dir);
            wing.scale.set(2.58, 2.58, 2.58);

            const chromeMat = new THREE.MeshPhysicalMaterial({
                color: 0xd7e5f4,
                metalness: 0.98,
                roughness: 0.18,
                clearcoat: 1.0,
                clearcoatRoughness: 0.09,
                envMapIntensity: 0.8
            });
            const steelMat = new THREE.MeshPhysicalMaterial({
                color: 0x3a4b65,
                metalness: 0.94,
                roughness: 0.28,
                clearcoat: 0.5,
                clearcoatRoughness: 0.25,
                envMapIntensity: 0.62
            });
            const cyanMat = new THREE.MeshStandardMaterial({
                color: 0x5ce8ff,
                emissive: 0x37d8ff,
                emissiveIntensity: 1.35,
                metalness: 0.12,
                roughness: 0.24
            });
            const finMat = new THREE.MeshPhysicalMaterial({
                color: 0x7ff3ff,
                emissive: 0x2fe5ff,
                emissiveIntensity: 0.5,
                transmission: 0.68,
                thickness: 0.32,
                roughness: 0.21,
                metalness: 0.03,
                transparent: true,
                opacity: 0.72,
                ior: 1.2,
                side: THREE.DoubleSide
            });

            const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.66, 22), steelMat);
            shoulder.rotation.z = Math.PI * 0.5;
            shoulder.position.set(dir * 0.32, 0.1, -0.07);
            wing.add(shoulder);

            const spine = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.02, 10, 16), chromeMat);
            spine.rotation.z = Math.PI * 0.5;
            spine.position.set(dir * 0.9, 0.2, -0.06);
            wing.add(spine);

            const armorShell = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 1.55, 10, 18), chromeMat);
            armorShell.rotation.z = Math.PI * 0.5;
            armorShell.position.set(dir * 1.65, 0.6, -0.03);
            armorShell.scale.set(1.22, 0.78, 0.74);
            wing.add(armorShell);

            const armorCut = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 1.2, 8, 14), steelMat);
            armorCut.rotation.z = Math.PI * 0.5;
            armorCut.position.set(dir * 1.62, 0.56, -0.25);
            armorCut.scale.set(1.05, 0.7, 0.55);
            wing.add(armorCut);

            const upperBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.34, 2.75, 10, 1), chromeMat);
            upperBlade.rotation.z = dir > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
            upperBlade.position.set(dir * 1.92, 0.77, -0.02);
            wing.add(upperBlade);

            const upperBladeBack = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.22, 2.5, 8, 1), steelMat);
            upperBladeBack.rotation.z = upperBlade.rotation.z;
            upperBladeBack.position.set(dir * 1.74, 0.52, -0.26);
            wing.add(upperBladeBack);

            const lowerBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.24, 2.3, 10, 1), steelMat);
            lowerBlade.rotation.z = dir > 0 ? -Math.PI * 0.56 : Math.PI * 0.56;
            lowerBlade.position.set(dir * 1.56, -0.36, -0.18);
            wing.add(lowerBlade);

            const sideSpike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.82, 8), chromeMat);
            sideSpike.rotation.z = dir > 0 ? -Math.PI * 0.42 : Math.PI * 0.42;
            sideSpike.rotation.x = Math.PI * 0.15;
            sideSpike.position.set(dir * 1.28, -0.06, 0.22);
            wing.add(sideSpike);

            const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.1, 0.36), steelMat);
            sidePlate.position.set(dir * 1.72, 0.02, -0.02);
            sidePlate.rotation.set(0.12, 0.24 * dir, dir > 0 ? -0.48 : 0.48);
            wing.add(sidePlate);

            const ringLarge = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 18, 36), steelMat);
            ringLarge.rotation.y = Math.PI * 0.5;
            ringLarge.position.set(dir * 1.08, 0.08, 0.12);
            wing.add(ringLarge);

            const ringCore = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), cyanMat);
            ringCore.position.copy(ringLarge.position);
            wing.add(ringCore);

            const ringSmall = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 16, 28), steelMat);
            ringSmall.rotation.y = Math.PI * 0.5;
            ringSmall.position.set(dir * 1.74, -0.62, 0.06);
            wing.add(ringSmall);

            const ringSmallCore = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), cyanMat);
            ringSmallCore.position.copy(ringSmall.position);
            wing.add(ringSmallCore);

            const tipCore = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 14), cyanMat);
            tipCore.position.set(dir * 2.84, 0.98, 0.05);
            wing.add(tipCore);

            const finUpper = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.95, 10), finMat);
            finUpper.rotation.z = dir > 0 ? -Math.PI * 0.4 : Math.PI * 0.4;
            finUpper.position.set(dir * 2.44, 1.24, 0.22);
            finUpper.scale.set(1.05, 1.65, 0.5);
            wing.add(finUpper);

            const finLower = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.1, 10), finMat);
            finLower.rotation.z = dir > 0 ? -Math.PI * 0.62 : Math.PI * 0.62;
            finLower.position.set(dir * 2.04, -0.62, 0.12);
            finLower.scale.set(1, 1.45, 0.5);
            wing.add(finLower);

            const finRear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.92, 10), finMat);
            finRear.rotation.z = dir > 0 ? -Math.PI * 0.28 : Math.PI * 0.28;
            finRear.position.set(dir * 2.58, 0.66, -0.16);
            finRear.scale.set(0.95, 1.2, 0.45);
            wing.add(finRear);

            const glowBar = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.62, 6, 12), cyanMat);
            glowBar.rotation.z = dir > 0 ? -Math.PI * 0.62 : Math.PI * 0.62;
            glowBar.position.set(dir * 2.2, -0.52, 0.2);
            wing.add(glowBar);

            const edgeStrip = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 1.0, 6, 12), cyanMat);
            edgeStrip.rotation.z = dir > 0 ? -Math.PI * 0.44 : Math.PI * 0.44;
            edgeStrip.position.set(dir * 2.38, 0.72, 0.24);
            wing.add(edgeStrip);

            const microBoltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8);
            for (let i = 0; i < 7; i++) {
                const bolt = new THREE.Mesh(microBoltGeo, steelMat);
                bolt.rotation.x = Math.PI * 0.5;
                bolt.position.set(dir * (0.72 + i * 0.25), 0.31 - i * 0.08, 0.19);
                wing.add(bolt);
            }

            const wingBlueLight = new THREE.PointLight(0x58ecff, 0.75, 5.2, 2);
            wingBlueLight.position.set(dir * 1.5, 0.2, 0.35);
            wing.add(wingBlueLight);

            wing.userData.emitters = [ringCore, ringSmallCore, tipCore, glowBar, edgeStrip];
            return wing;
        }

        function makeRoboticWingsProp() {
            const g = new THREE.Group();
            const left = makeRoboticWingSide('left');
            const right = makeRoboticWingSide('right');
            left.visible = false;
            right.visible = false;
            leftWingGroup.add(left);
            rightWingGroup.add(right);
            g.userData.left = left;
            g.userData.right = right;
            g.userData.emitters = [
                ...(left.userData.emitters || []),
                ...(right.userData.emitters || [])
            ];
            return g;
        }

        function makeAlphaWingTextures() {
            const size = 1024;
            const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

            function makePanelTexture({ baseA, baseB, edgeTint, stripeA, stripeB, seedBase }) {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');

                let seed = seedBase >>> 0;
                const rand = () => {
                    seed = (seed * 1664525 + 1013904223) >>> 0;
                    return seed / 4294967296;
                };

                const base = ctx.createLinearGradient(0, 0, size, size);
                base.addColorStop(0.0, baseA);
                base.addColorStop(0.54, baseB);
                base.addColorStop(1.0, '#0f1636');
                ctx.fillStyle = base;
                ctx.fillRect(0, 0, size, size);

                for (let i = 0; i < 3; i++) {
                    const y = size * (0.26 + i * 0.18 + rand() * 0.04);
                    const alpha = 0.2 + rand() * 0.16;
                    ctx.strokeStyle = `rgba(235,248,255,${alpha})`;
                    ctx.lineWidth = 6 + rand() * 5;
                    ctx.beginPath();
                    ctx.moveTo(size * 0.04, y);
                    ctx.lineTo(size * 0.95, y + (rand() - 0.5) * 26);
                    ctx.stroke();
                }

                for (let i = 0; i < 6; i++) {
                    const x = size * (0.04 + rand() * 0.84);
                    const y = size * (0.08 + rand() * 0.82);
                    const w = 140 + rand() * 230;
                    const h = 4 + rand() * 8;
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(-0.2 + rand() * 0.4);
                    ctx.fillStyle = i % 2 === 0 ? stripeA : stripeB;
                    ctx.fillRect(0, 0, w, h);
                    ctx.fillStyle = edgeTint;
                    ctx.fillRect(2, 2, Math.max(6, w * 0.35), Math.max(2, h * 0.38));
                    ctx.restore();
                }

                const vignette = ctx.createRadialGradient(size * 0.54, size * 0.48, 80, size * 0.54, size * 0.48, size * 0.76);
                vignette.addColorStop(0, 'rgba(0,0,0,0)');
                vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
                ctx.fillStyle = vignette;
                ctx.fillRect(0, 0, size, size);

                const tex = new THREE.CanvasTexture(canvas);
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.anisotropy = maxAnisotropy;
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(1.0, 1.0);
                tex.needsUpdate = true;
                return tex;
            }

            const sparkCanvas = document.createElement('canvas');
            sparkCanvas.width = 128;
            sparkCanvas.height = 128;
            const sCtx = sparkCanvas.getContext('2d');
            const sparkGrad = sCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
            sparkGrad.addColorStop(0.0, 'rgba(255,255,255,1)');
            sparkGrad.addColorStop(0.24, 'rgba(181,242,255,0.95)');
            sparkGrad.addColorStop(0.58, 'rgba(255,124,232,0.78)');
            sparkGrad.addColorStop(1.0, 'rgba(255,255,255,0)');
            sCtx.fillStyle = sparkGrad;
            sCtx.fillRect(0, 0, 128, 128);

            const sparkTexture = new THREE.CanvasTexture(sparkCanvas);
            sparkTexture.colorSpace = THREE.SRGBColorSpace;
            sparkTexture.needsUpdate = true;

            return {
                cyanPanel: makePanelTexture({
                    baseA: '#0f2a56',
                    baseB: '#1a417f',
                    edgeTint: 'rgba(215,251,255,0.55)',
                    stripeA: 'rgba(64,229,255,0.84)',
                    stripeB: 'rgba(153,242,255,0.72)',
                    seedBase: 9733
                }),
                magentaPanel: makePanelTexture({
                    baseA: '#2a1454',
                    baseB: '#4a1f7a',
                    edgeTint: 'rgba(255,214,255,0.52)',
                    stripeA: 'rgba(255,84,219,0.86)',
                    stripeB: 'rgba(204,112,255,0.72)',
                    seedBase: 48179
                }),
                sparkTexture
            };
        }

        function makeAlphaBladeGeometry(dir, options = {}) {
            const {
                length = 3.2,
                rootWidth = 0.58,
                tipWidth = 0.2,
                thickness = 0.07,
                camber = 0.12,
                droop = 0,
                sweep = 0.1,
                twist = 0.05
            } = options;

            const mx = (x) => x * dir;
            const shape = new THREE.Shape();
            shape.moveTo(mx(0), -rootWidth * 0.5);
            shape.bezierCurveTo(
                mx(length * 0.34),
                -rootWidth * 0.68 + sweep * 0.18,
                mx(length * 0.88),
                -tipWidth * 0.62 + sweep,
                mx(length),
                -tipWidth * 0.46 + sweep
            );
            shape.quadraticCurveTo(mx(length * 1.03), sweep * 0.82, mx(length), tipWidth * 0.48 + sweep);
            shape.bezierCurveTo(
                mx(length * 0.9),
                tipWidth * 0.72 + sweep,
                mx(length * 0.38),
                rootWidth * 0.66 + sweep * 0.14,
                mx(0),
                rootWidth * 0.5
            );
            shape.closePath();

            const geo = new THREE.ExtrudeGeometry(shape, {
                steps: 1,
                depth: thickness,
                bevelEnabled: true,
                bevelSize: 0.015,
                bevelThickness: 0.015,
                bevelSegments: 2,
                curveSegments: 42
            });
            geo.translate(0, 0, -thickness * 0.5);

            const pos = geo.attributes.position;
            const uv = new Float32Array(pos.count * 2);
            const halfRoot = Math.max(0.001, rootWidth * 0.5);
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                const z = pos.getZ(i);
                const nx = THREE.MathUtils.clamp(Math.abs(x) / Math.max(0.001, length), 0, 1);
                const ny = THREE.MathUtils.clamp(y / halfRoot, -1, 1);
                const camberOffset = Math.sin(nx * Math.PI) * camber;
                const twistOffset = ny * twist * Math.pow(nx, 1.2);
                const droopOffset = Math.pow(nx, 1.45) * droop;
                pos.setXYZ(i, x, y + droopOffset, z + camberOffset + twistOffset);
                uv[i * 2] = nx;
                uv[i * 2 + 1] = THREE.MathUtils.clamp((ny + 1) * 0.5, 0, 1);
            }
            geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
            pos.needsUpdate = true;
            geo.computeVertexNormals();
            return geo;
        }

        function makeAlphaSparkSystem(dir, sparkTexture) {
            const count = 16;
            const positions = new Float32Array(count * 3);
            const basePositions = new Float32Array(count * 3);
            const phases = new Float32Array(count);

            let seed = dir > 0 ? 13579 : 35791;
            const rand = () => {
                seed = (seed * 1103515245 + 12345) >>> 0;
                return (seed & 0x7fffffff) / 0x7fffffff;
            };

            for (let i = 0; i < count; i++) {
                const idx = i * 3;
                const x = dir * (0.56 + rand() * 3.1);
                const y = -1.2 + rand() * 3.5;
                const z = -0.06 + rand() * 0.46;
                positions[idx] = basePositions[idx] = x;
                positions[idx + 1] = basePositions[idx + 1] = y;
                positions[idx + 2] = basePositions[idx + 2] = z;
                phases[i] = rand() * Math.PI * 2;
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const mat = new THREE.PointsMaterial({
                color: 0xffc2ff,
                map: sparkTexture,
                alphaMap: sparkTexture,
                size: 0.052,
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.56,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });

            const points = new THREE.Points(geo, mat);
            return {
                points,
                basePositions,
                phases,
                speed: 2.6 + rand() * 0.8,
                drift: 0.016 + rand() * 0.012,
                phaseOffset: rand() * Math.PI * 2
            };
        }

        function makeAlphaWingSide(side = 'left', shared) {
            const dir = side === 'left' ? -1 : 1;
            const wing = new THREE.Group();
            wing.position.set(dir * 0.66, -0.2, 0.24);
            wing.rotation.set(0.02, dir * 0.04, -0.01 * dir);
            wing.scale.set(1.68, 1.68, 1.68);

            const emitters = [];
            const lights = [];

            const rootBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 22), shared.frameDark);
            rootBase.rotation.z = Math.PI * 0.5;
            rootBase.position.set(dir * 0.2, 0.02, -0.02);
            wing.add(rootBase);

            const rootCollar = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.045, 14, 34), shared.alloyDark);
            rootCollar.rotation.y = Math.PI * 0.5;
            rootCollar.position.set(dir * 0.46, 0.03, 0.08);
            wing.add(rootCollar);

            const hubRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 18, 44), shared.alloyBright);
            hubRing.rotation.y = Math.PI * 0.5;
            hubRing.position.set(dir * 0.62, 0.06, 0.2);
            wing.add(hubRing);

            const hubCore = new THREE.Mesh(new THREE.SphereGeometry(0.16, 22, 18), shared.coreCyan);
            hubCore.position.copy(hubRing.position);
            wing.add(hubCore);
            emitters.push(hubCore);

            const auxCore = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), shared.coreMagenta);
            auxCore.position.set(dir * 0.92, -0.18, 0.15);
            wing.add(auxCore);
            emitters.push(auxCore);

            const hubLens = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), shared.lensCyan);
            hubLens.position.set(dir * 0.74, 0.06, 0.28);
            wing.add(hubLens);

            const topHousing = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 1.04, 8, 12), shared.alloyBright);
            topHousing.rotation.z = dir > 0 ? -Math.PI * 0.56 : Math.PI * 0.56;
            topHousing.position.set(dir * 1.28, 0.96, -0.03);
            topHousing.scale.set(1.44, 0.68, 0.52);
            wing.add(topHousing);

            const midHousing = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.8, 8, 12), shared.alloyDark);
            midHousing.rotation.z = dir > 0 ? -Math.PI * 0.4 : Math.PI * 0.4;
            midHousing.position.set(dir * 1.08, 0.14, -0.07);
            midHousing.scale.set(1.34, 0.65, 0.5);
            wing.add(midHousing);

            const lowerHousing = new THREE.Mesh(new THREE.CapsuleGeometry(0.086, 0.62, 8, 10), shared.alloyBright);
            lowerHousing.rotation.z = dir > 0 ? -Math.PI * 0.3 : Math.PI * 0.3;
            lowerHousing.position.set(dir * 0.94, -0.66, -0.09);
            lowerHousing.scale.set(1.28, 0.6, 0.48);
            wing.add(lowerHousing);

            const bladeConfigs = [
                {
                    length: 5.05,
                    rootWidth: 0.84,
                    tipWidth: 0.22,
                    thickness: 0.067,
                    camber: 0.21,
                    droop: 1.06,
                    sweep: 0.84,
                    twist: 0.07,
                    position: [dir * 1.08, 2.44, -0.12],
                    rotation: [0.19, dir * 0.24, dir > 0 ? -0.76 : 0.76],
                    shell: shared.edgeViolet,
                    glow: shared.glowMagenta,
                    core: shared.coreMagenta,
                    strip: shared.stripMagenta
                },
                {
                    length: 4.72,
                    rootWidth: 0.78,
                    tipWidth: 0.23,
                    thickness: 0.066,
                    camber: 0.18,
                    droop: 0.44,
                    sweep: 0.42,
                    twist: 0.058,
                    position: [dir * 1.08, 1.56, 0.18],
                    rotation: [0.13, dir * 0.14, dir > 0 ? -0.43 : 0.43],
                    shell: shared.alloyBright,
                    glow: shared.glowCyan,
                    core: shared.coreCyan,
                    strip: shared.stripCyan
                },
                {
                    length: 4.22,
                    rootWidth: 0.72,
                    tipWidth: 0.22,
                    thickness: 0.064,
                    camber: 0.14,
                    droop: 0.12,
                    sweep: 0.16,
                    twist: 0.05,
                    position: [dir * 1.02, 0.56, 0.22],
                    rotation: [0.04, dir * 0.1, dir > 0 ? -0.22 : 0.22],
                    shell: shared.alloyDark,
                    glow: shared.glowCyan,
                    core: shared.coreCyan,
                    strip: shared.stripCyan
                },
                {
                    length: 3.84,
                    rootWidth: 0.66,
                    tipWidth: 0.22,
                    thickness: 0.062,
                    camber: 0.12,
                    droop: -0.22,
                    sweep: -0.16,
                    twist: 0.044,
                    position: [dir * 0.84, -0.28, 0.17],
                    rotation: [-0.08, dir * 0.08, dir > 0 ? 0.18 : -0.18],
                    shell: shared.edgeViolet,
                    glow: shared.glowMagenta,
                    core: shared.coreMagenta,
                    strip: shared.stripMagenta
                },
                {
                    length: 3.38,
                    rootWidth: 0.58,
                    tipWidth: 0.2,
                    thickness: 0.06,
                    camber: 0.1,
                    droop: -0.52,
                    sweep: -0.34,
                    twist: 0.04,
                    position: [dir * 0.68, -0.98, 0.12],
                    rotation: [-0.18, dir * 0.06, dir > 0 ? 0.34 : -0.34],
                    shell: shared.alloyBright,
                    glow: shared.glowCyan,
                    core: shared.coreCyan,
                    strip: shared.stripCyan
                },
                {
                    length: 2.96,
                    rootWidth: 0.5,
                    tipWidth: 0.18,
                    thickness: 0.058,
                    camber: 0.09,
                    droop: -0.74,
                    sweep: -0.5,
                    twist: 0.034,
                    position: [dir * 0.54, -1.56, 0.02],
                    rotation: [-0.27, dir * 0.04, dir > 0 ? 0.5 : -0.5],
                    shell: shared.edgeViolet,
                    glow: shared.glowMagenta,
                    core: shared.coreMagenta,
                    strip: shared.stripMagenta
                }
            ];

            for (const cfg of bladeConfigs) {
                const bladeGroup = new THREE.Group();
                bladeGroup.position.set(cfg.position[0], cfg.position[1], cfg.position[2]);
                bladeGroup.rotation.set(cfg.rotation[0], cfg.rotation[1], cfg.rotation[2]);

                const shellGeo = makeAlphaBladeGeometry(dir, cfg);
                const shellMesh = new THREE.Mesh(shellGeo, cfg.shell);
                bladeGroup.add(shellMesh);

                const inlayGeo = makeAlphaBladeGeometry(dir, {
                    length: cfg.length * 0.78,
                    rootWidth: cfg.rootWidth * 0.42,
                    tipWidth: cfg.tipWidth * 0.36,
                    thickness: cfg.thickness * 0.45,
                    camber: cfg.camber * 0.5,
                    droop: cfg.droop * 0.78,
                    sweep: cfg.sweep,
                    twist: cfg.twist * 0.52
                });
                const inlayMesh = new THREE.Mesh(inlayGeo, cfg.glow);
                inlayMesh.position.set(dir * 0.16, cfg.sweep * 0.05, 0.028);
                inlayMesh.renderOrder = 3;
                shellMesh.add(inlayMesh);
                emitters.push(inlayMesh);

                const strip = makeBoneBetween(
                    new THREE.Vector3(dir * 0.18, cfg.sweep * 0.02, 0.04),
                    new THREE.Vector3(dir * (cfg.length * 0.38), cfg.sweep * 0.34, 0.06),
                    0.011,
                    0.0044,
                    cfg.strip,
                    7
                );
                strip.visible = false;
                shellMesh.add(strip);

                wing.add(bladeGroup);
            }

            const microBoltGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.026, 8);
            for (let i = 0; i < 6; i++) {
                const bolt = new THREE.Mesh(microBoltGeo, shared.alloyDark);
                bolt.rotation.x = Math.PI * 0.5;
                bolt.position.set(dir * (0.9 + i * 0.18), 0.84 - i * 0.08, 0.16);
                wing.add(bolt);
            }

            const cyanLight = new THREE.PointLight(0x59ebff, 0.68, 5.0, 2);
            cyanLight.position.set(dir * 1.18, 0.18, 0.48);
            wing.add(cyanLight);
            lights.push(cyanLight);

            const magentaLight = new THREE.PointLight(0xff54db, 0.58, 4.3, 2);
            magentaLight.position.set(dir * 1.82, -0.12, 0.32);
            wing.add(magentaLight);
            lights.push(magentaLight);

            const tipLight = new THREE.PointLight(0x72ecff, 0.26, 2.8, 2);
            tipLight.position.set(dir * 3.34, 1.76, 0.38);
            wing.add(tipLight);
            lights.push(tipLight);

            const sparkSystem = makeAlphaSparkSystem(dir, shared.sparkTexture);
            wing.add(sparkSystem.points);

            wing.userData.emitters = emitters;
            wing.userData.lights = lights;
            wing.userData.sparkSystem = sparkSystem;
            return wing;
        }

        function makeAlphaWingsProp() {
            const textures = makeAlphaWingTextures();

            const shared = {
                frameDark: new THREE.MeshPhysicalMaterial({
                    color: 0x2c3962,
                    emissive: 0x090f25,
                    emissiveIntensity: 0.14,
                    metalness: 0.96,
                    roughness: 0.28,
                    clearcoat: 0.64,
                    clearcoatRoughness: 0.22,
                    envMapIntensity: 0.84
                }),
                alloyBright: new THREE.MeshPhysicalMaterial({
                    color: 0xd9e6f8,
                    emissive: 0x102140,
                    emissiveIntensity: 0.11,
                    metalness: 0.95,
                    roughness: 0.17,
                    clearcoat: 1,
                    clearcoatRoughness: 0.1,
                    envMapIntensity: 0.92
                }),
                alloyDark: new THREE.MeshPhysicalMaterial({
                    color: 0x6e84a8,
                    emissive: 0x111a35,
                    emissiveIntensity: 0.08,
                    metalness: 0.92,
                    roughness: 0.22,
                    clearcoat: 0.82,
                    clearcoatRoughness: 0.16,
                    envMapIntensity: 0.88
                }),
                edgeViolet: new THREE.MeshPhysicalMaterial({
                    color: 0x4a3c92,
                    emissive: 0x1f1360,
                    emissiveIntensity: 0.16,
                    metalness: 0.86,
                    roughness: 0.2,
                    clearcoat: 0.9,
                    clearcoatRoughness: 0.18,
                    envMapIntensity: 0.82
                }),
                coreCyan: new THREE.MeshStandardMaterial({
                    color: 0x8af7ff,
                    emissive: 0x45ddff,
                    emissiveIntensity: 1.58,
                    roughness: 0.2,
                    metalness: 0.12
                }),
                coreMagenta: new THREE.MeshStandardMaterial({
                    color: 0xffa3f6,
                    emissive: 0xff53dc,
                    emissiveIntensity: 1.38,
                    roughness: 0.24,
                    metalness: 0.08
                }),
                lensCyan: new THREE.MeshPhysicalMaterial({
                    color: 0x98ffff,
                    emissive: 0x33dcff,
                    emissiveIntensity: 1.1,
                    transmission: 0.78,
                    thickness: 0.24,
                    ior: 1.23,
                    roughness: 0.08,
                    metalness: 0.02,
                    transparent: true,
                    opacity: 0.85
                }),
                stripCyan: new THREE.MeshBasicMaterial({
                    color: 0x9cfdff,
                    transparent: true,
                    opacity: 0.92,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                }),
                stripMagenta: new THREE.MeshBasicMaterial({
                    color: 0xff9cf8,
                    transparent: true,
                    opacity: 0.9,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                }),
                glowCyan: new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    map: textures.cyanPanel,
                    emissiveMap: textures.cyanPanel,
                    emissive: 0x45ebff,
                    emissiveIntensity: 1.5,
                    transparent: true,
                    opacity: 0.74,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    polygonOffset: true,
                    polygonOffsetFactor: -1,
                    polygonOffsetUnits: -2,
                    side: THREE.DoubleSide
                }),
                glowMagenta: new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    map: textures.magentaPanel,
                    emissiveMap: textures.magentaPanel,
                    emissive: 0xff50df,
                    emissiveIntensity: 1.4,
                    transparent: true,
                    opacity: 0.72,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    polygonOffset: true,
                    polygonOffsetFactor: -1,
                    polygonOffsetUnits: -2,
                    side: THREE.DoubleSide
                }),
                crystalMagenta: new THREE.MeshPhysicalMaterial({
                    color: 0xff8cf6,
                    emissive: 0xff4cdc,
                    emissiveIntensity: 1.5,
                    transmission: 0.45,
                    thickness: 0.32,
                    roughness: 0.14,
                    metalness: 0.05,
                    transparent: true,
                    opacity: 0.9
                }),
                crystalCyan: new THREE.MeshPhysicalMaterial({
                    color: 0x8cf5ff,
                    emissive: 0x47e7ff,
                    emissiveIntensity: 1.36,
                    transmission: 0.5,
                    thickness: 0.28,
                    roughness: 0.12,
                    metalness: 0.04,
                    transparent: true,
                    opacity: 0.88
                }),
                sparkTexture: textures.sparkTexture
            };

            shared.coreCyan.userData.channel = 'cyan';
            shared.coreMagenta.userData.channel = 'magenta';
            shared.stripCyan.userData.channel = 'cyan';
            shared.stripMagenta.userData.channel = 'magenta';
            shared.glowCyan.userData.channel = 'cyan';
            shared.glowMagenta.userData.channel = 'magenta';
            shared.crystalMagenta.userData.channel = 'magenta';
            shared.crystalCyan.userData.channel = 'cyan';

            const g = new THREE.Group();
            const left = makeAlphaWingSide('left', shared);
            const right = makeAlphaWingSide('right', shared);
            left.visible = false;
            right.visible = false;
            leftWingGroup.add(left);
            rightWingGroup.add(right);

            g.userData.left = left;
            g.userData.right = right;
            g.userData.emitters = [
                ...(left.userData.emitters || []),
                ...(right.userData.emitters || [])
            ];
            g.userData.lightEmitters = [
                ...(left.userData.lights || []),
                ...(right.userData.lights || [])
            ];
            g.userData.sparkSystems = [left.userData.sparkSystem, right.userData.sparkSystem].filter(Boolean);
            g.userData.glowMats = [
                shared.coreCyan,
                shared.coreMagenta,
                shared.stripCyan,
                shared.stripMagenta,
                shared.glowCyan,
                shared.glowMagenta,
                shared.crystalMagenta,
                shared.crystalCyan
            ];
            return g;
        }

        function makeRainbowWingTextures() {
            const size = 1024;
            const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

            const membraneCanvas = document.createElement('canvas');
            membraneCanvas.width = size;
            membraneCanvas.height = size;
            const mCtx = membraneCanvas.getContext('2d');

            let seed = 17062026;
            const rand = () => {
                seed = (seed * 1664525 + 1013904223) >>> 0;
                return seed / 4294967296;
            };

            const rainbow = mCtx.createLinearGradient(0, size * 0.94, size, size * 0.06);
            rainbow.addColorStop(0.0, '#ff5fc8');
            rainbow.addColorStop(0.16, '#ff79d4');
            rainbow.addColorStop(0.34, '#5f9dff');
            rainbow.addColorStop(0.5, '#4ad8ff');
            rainbow.addColorStop(0.68, '#ffd251');
            rainbow.addColorStop(0.84, '#ff82c3');
            rainbow.addColorStop(1.0, '#8d63ff');
            mCtx.fillStyle = rainbow;
            mCtx.fillRect(0, 0, size, size);

            const innerGlow = mCtx.createRadialGradient(size * 0.16, size * 0.68, 30, size * 0.16, size * 0.68, size * 0.62);
            innerGlow.addColorStop(0, 'rgba(255,245,200,0.96)');
            innerGlow.addColorStop(0.35, 'rgba(255,224,156,0.5)');
            innerGlow.addColorStop(1, 'rgba(255,215,150,0)');
            mCtx.fillStyle = innerGlow;
            mCtx.fillRect(0, 0, size, size);

            const tipGlow = mCtx.createRadialGradient(size * 0.82, size * 0.2, 24, size * 0.82, size * 0.2, size * 0.36);
            tipGlow.addColorStop(0, 'rgba(225,240,255,0.62)');
            tipGlow.addColorStop(0.45, 'rgba(180,220,255,0.24)');
            tipGlow.addColorStop(1, 'rgba(130,186,255,0)');
            mCtx.fillStyle = tipGlow;
            mCtx.fillRect(0, 0, size, size);

            mCtx.lineCap = 'round';
            for (let i = 0; i < 34; i++) {
                const y = size * (0.08 + rand() * 0.84);
                const amp = 10 + rand() * 26;
                const alpha = 0.012 + rand() * 0.04;
                mCtx.strokeStyle = `rgba(255,255,255,${alpha})`;
                mCtx.lineWidth = 1 + rand() * 3;
                mCtx.beginPath();
                mCtx.moveTo(size * 0.02, y);
                mCtx.bezierCurveTo(
                    size * (0.24 + rand() * 0.12), y + (rand() - 0.5) * amp,
                    size * (0.58 + rand() * 0.16), y + (rand() - 0.5) * amp,
                    size * (0.92 + rand() * 0.06), y + (rand() - 0.5) * amp * 0.44
                );
                mCtx.stroke();
            }

            for (let i = 0; i < 120; i++) {
                const x = rand() * size;
                const y = rand() * size;
                const r = 1 + rand() * 3.8;
                const s = mCtx.createRadialGradient(x, y, 0, x, y, r);
                s.addColorStop(0, 'rgba(255,255,255,0.95)');
                s.addColorStop(0.4, 'rgba(255,246,255,0.66)');
                s.addColorStop(1, 'rgba(255,255,255,0)');
                mCtx.fillStyle = s;
                mCtx.beginPath();
                mCtx.arc(x, y, r, 0, Math.PI * 2);
                mCtx.fill();
            }

            mCtx.globalCompositeOperation = 'multiply';
            const saturationPass = mCtx.createLinearGradient(0, size, size, 0);
            saturationPass.addColorStop(0.0, '#ff76cb');
            saturationPass.addColorStop(0.2, '#b66aff');
            saturationPass.addColorStop(0.4, '#5a92ff');
            saturationPass.addColorStop(0.6, '#4cdfff');
            saturationPass.addColorStop(0.78, '#ffcc5c');
            saturationPass.addColorStop(1.0, '#ff86c6');
            mCtx.fillStyle = saturationPass;
            mCtx.fillRect(0, 0, size, size);
            mCtx.globalCompositeOperation = 'source-over';

            const sparkleCanvas = document.createElement('canvas');
            sparkleCanvas.width = 128;
            sparkleCanvas.height = 128;
            const sCtx = sparkleCanvas.getContext('2d');
            const sg = sCtx.createRadialGradient(64, 64, 2, 64, 64, 62);
            sg.addColorStop(0.0, 'rgba(255,255,255,1)');
            sg.addColorStop(0.26, 'rgba(255,245,255,0.96)');
            sg.addColorStop(1.0, 'rgba(255,255,255,0)');
            sCtx.fillStyle = sg;
            sCtx.fillRect(0, 0, 128, 128);
            sCtx.strokeStyle = 'rgba(255,255,255,0.92)';
            sCtx.lineWidth = 2.8;
            sCtx.beginPath();
            sCtx.moveTo(16, 64);
            sCtx.lineTo(112, 64);
            sCtx.moveTo(64, 16);
            sCtx.lineTo(64, 112);
            sCtx.stroke();

            const flowerCanvas = document.createElement('canvas');
            flowerCanvas.width = 128;
            flowerCanvas.height = 128;
            const fCtx = flowerCanvas.getContext('2d');
            fCtx.translate(64, 64);
            for (let i = 0; i < 5; i++) {
                fCtx.save();
                fCtx.rotate((i / 5) * Math.PI * 2);
                const petal = fCtx.createRadialGradient(0, 26, 3, 0, 26, 28);
                petal.addColorStop(0, 'rgba(255,255,255,0.96)');
                petal.addColorStop(0.38, 'rgba(255,188,232,0.92)');
                petal.addColorStop(1, 'rgba(255,156,220,0)');
                fCtx.fillStyle = petal;
                fCtx.beginPath();
                fCtx.ellipse(0, 26, 16, 26, 0, 0, Math.PI * 2);
                fCtx.fill();
                fCtx.restore();
            }
            const flowerCore = fCtx.createRadialGradient(0, 0, 2, 0, 0, 18);
            flowerCore.addColorStop(0, 'rgba(255,253,188,1)');
            flowerCore.addColorStop(0.58, 'rgba(255,226,130,0.9)');
            flowerCore.addColorStop(1, 'rgba(255,220,120,0)');
            fCtx.fillStyle = flowerCore;
            fCtx.beginPath();
            fCtx.arc(0, 0, 18, 0, Math.PI * 2);
            fCtx.fill();

            const membraneTex = new THREE.CanvasTexture(membraneCanvas);
            membraneTex.colorSpace = THREE.SRGBColorSpace;
            membraneTex.anisotropy = maxAnisotropy;
            membraneTex.needsUpdate = true;

            const sparkleTex = new THREE.CanvasTexture(sparkleCanvas);
            sparkleTex.colorSpace = THREE.SRGBColorSpace;
            sparkleTex.needsUpdate = true;

            const flowerTex = new THREE.CanvasTexture(flowerCanvas);
            flowerTex.colorSpace = THREE.SRGBColorSpace;
            flowerTex.needsUpdate = true;

            return { membraneTex, sparkleTex, flowerTex };
        }

        function makeRainbowFeatherGeometry(dir, options = {}) {
            const {
                length = 4.6,
                rootWidth = 0.86,
                tipWidth = 0.18,
                rise = 1.1,
                camber = 0.12,
                droop = 0,
                twist = 0.05,
                curl = 0.2
            } = options;

            const mx = (x) => x * dir;
            const shape = new THREE.Shape();
            shape.moveTo(mx(0), -rootWidth * 0.5);
            shape.bezierCurveTo(
                mx(length * 0.24), -rootWidth * 0.74,
                mx(length * 0.82), rise - tipWidth * 0.54,
                mx(length), rise - tipWidth * 0.14
            );
            shape.quadraticCurveTo(
                mx(length * (1.06 + curl * 0.1)),
                rise + tipWidth * (0.5 + curl * 0.8),
                mx(length * (0.94 + curl * 0.06)),
                rise + tipWidth * 1.04
            );
            shape.bezierCurveTo(
                mx(length * 0.72), rise + tipWidth * 1.2,
                mx(length * 0.24), rootWidth * 0.76,
                mx(0), rootWidth * 0.5
            );
            shape.closePath();

            const geo = new THREE.ShapeGeometry(shape, 92);
            const pos = geo.attributes.position;
            const uv = new Float32Array(pos.count * 2);
            const heightRef = rootWidth + Math.abs(rise) * 0.95;

            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                const nx = THREE.MathUtils.clamp(Math.abs(x) / Math.max(0.001, length), 0, 1);
                const ny = THREE.MathUtils.clamp((y - rise * 0.36) / Math.max(0.001, heightRef), -1, 1);
                const edgeSoft = 1 - Math.abs(ny);
                const z = Math.sin(nx * Math.PI) * camber * (0.54 + edgeSoft * 0.46)
                    + ny * twist * Math.pow(nx, 1.22)
                    + Math.pow(nx, 1.34) * droop
                    + Math.sin(nx * 11.2 + ny * 3.6) * 0.006;

                pos.setXYZ(
                    i,
                    x + dir * Math.pow(nx, 2.08) * curl * 0.24 * (0.16 + Math.abs(ny)),
                    y,
                    z
                );

                uv[i * 2] = nx;
                uv[i * 2 + 1] = THREE.MathUtils.clamp((ny + 1) * 0.5, 0, 1);
            }

            geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
            pos.needsUpdate = true;
            geo.computeVertexNormals();
            return geo;
        }

        function makeRainbowSparkSystem(dir, texture, options = {}) {
            const {
                count = 24,
                size = 0.07,
                opacity = 0.72,
                spreadMin = 0.7,
                spreadMax = 4.2,
                yOffset = 0,
                drift = 0.036
            } = options;

            const positions = new Float32Array(count * 3);
            const basePositions = new Float32Array(count * 3);
            const phases = new Float32Array(count);
            const colors = new Float32Array(count * 3);
            const palette = [0xffd2f5, 0xffe7a8, 0xb8ddff, 0xbefaff, 0xffc1df, 0xd4bbff, 0xffffff];

            let seed = dir > 0 ? 908731 : 187349;
            const rand = () => {
                seed = (seed * 1103515245 + 12345) >>> 0;
                return (seed & 0x7fffffff) / 0x7fffffff;
            };

            for (let i = 0; i < count; i++) {
                const idx = i * 3;
                const span = spreadMin + rand() * (spreadMax - spreadMin);
                const arc = -1.05 + rand() * 2.2;
                const x = dir * (0.46 + Math.cos(arc) * span);
                const y = yOffset + Math.sin(arc) * (span * 0.78) + (rand() - 0.5) * 0.64;
                const z = 0.14 + rand() * 0.5;

                positions[idx] = basePositions[idx] = x;
                positions[idx + 1] = basePositions[idx + 1] = y;
                positions[idx + 2] = basePositions[idx + 2] = z;
                phases[i] = rand() * Math.PI * 2;

                const c = new THREE.Color(palette[Math.floor(rand() * palette.length)]);
                colors[idx] = c.r;
                colors[idx + 1] = c.g;
                colors[idx + 2] = c.b;
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const mat = new THREE.PointsMaterial({
                map: texture,
                alphaMap: texture,
                vertexColors: true,
                size,
                sizeAttenuation: true,
                transparent: true,
                opacity,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });

            return {
                points: new THREE.Points(geo, mat),
                basePositions,
                phases,
                speed: 1.8 + rand() * 1.1,
                drift,
                phaseOffset: rand() * Math.PI * 2
            };
        }

        function makeRainbowWingSide(side = 'left', shared) {
            const dir = side === 'left' ? -1 : 1;
            const wing = new THREE.Group();
            wing.position.set(dir * 0.86, -0.12, -0.16);
            wing.rotation.set(0.0, dir * 0.045, -0.015 * dir);
            wing.scale.set(2.32, 2.32, 2.32);

            const wingLights = [];
            const sparkSystems = [];
            const trailDrops = [];
            const iridescentMats = [];

            const rootPearl = new THREE.Mesh(new THREE.SphereGeometry(0.21, 18, 14), shared.rootPearl);
            rootPearl.position.set(dir * 0.16, 0.06, 0.18);
            wing.add(rootPearl);

            const rootCrystal = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), shared.rootCrystal);
            rootCrystal.position.set(dir * 0.32, 0.02, 0.24);
            wing.add(rootCrystal);

            const panelConfigs = [
                { len: 5.96, root: 1.02, tip: 0.29, rise: 2.78, camber: 0.2, droop: 0.48, twist: 0.062, curl: 1.22, pos: [0.9, 2.28, -0.06], rot: [0.2, 0.19, -0.9], color: 0xffa9df, emissive: 0xff7ad2, channel: 'warm', vein: 0.018 },
                { len: 5.3, root: 0.94, tip: 0.28, rise: 2.06, camber: 0.18, droop: 0.3, twist: 0.056, curl: 0.74, pos: [0.98, 1.76, -0.02], rot: [0.14, 0.15, -0.62], color: 0xc094ff, emissive: 0xa46eff, channel: 'warm', vein: 0.016 },
                { len: 4.92, root: 0.86, tip: 0.27, rise: 1.42, camber: 0.16, droop: 0.16, twist: 0.05, curl: 0.36, pos: [1.06, 1.2, 0.03], rot: [0.08, 0.1, -0.38], color: 0x89b9ff, emissive: 0x6ca4ff, channel: 'cool', vein: 0.014 },
                { len: 4.6, root: 0.8, tip: 0.27, rise: 0.84, camber: 0.14, droop: 0.04, twist: 0.046, curl: 0.24, pos: [1.01, 0.66, 0.06], rot: [0.02, 0.08, -0.18], color: 0x71dbff, emissive: 0x53cbff, channel: 'cool', vein: 0.013 },
                { len: 4.26, root: 0.74, tip: 0.26, rise: 0.28, camber: 0.12, droop: -0.02, twist: 0.04, curl: 0.16, pos: [0.9, 0.18, 0.08], rot: [-0.04, 0.06, -0.03], color: 0x67cfff, emissive: 0x45beff, channel: 'cool', vein: 0.012 },
                { len: 3.84, root: 0.66, tip: 0.25, rise: -0.28, camber: 0.1, droop: -0.14, twist: 0.036, curl: 0.11, pos: [0.8, -0.34, 0.08], rot: [-0.1, 0.05, 0.1], color: 0xffb9da, emissive: 0xff8ccb, channel: 'warm', vein: 0.01 },
                { len: 3.36, root: 0.58, tip: 0.24, rise: -0.84, camber: 0.09, droop: -0.3, twist: 0.032, curl: 0.08, pos: [0.64, -0.82, 0.06], rot: [-0.16, 0.04, 0.3], color: 0xffcabc, emissive: 0xffb083, channel: 'warm', vein: 0.009 },
                { len: 3.02, root: 0.52, tip: 0.23, rise: -1.2, camber: 0.08, droop: -0.46, twist: 0.028, curl: 0.06, pos: [0.5, -1.18, 0.04], rot: [-0.23, 0.02, 0.46], color: 0xffdfb2, emissive: 0xffc782, channel: 'warm', vein: 0.008 }
            ];

            for (const cfg of panelConfigs) {
                const geo = makeRainbowFeatherGeometry(dir, {
                    length: cfg.len,
                    rootWidth: cfg.root,
                    tipWidth: cfg.tip,
                    rise: cfg.rise,
                    camber: cfg.camber,
                    droop: cfg.droop,
                    twist: cfg.twist,
                    curl: cfg.curl
                });

                const mat = new THREE.MeshStandardMaterial({
                    color: cfg.color,
                    map: shared.membraneTex,
                    emissiveMap: shared.membraneTex,
                    emissive: cfg.emissive,
                    emissiveIntensity: cfg.channel === 'cool' ? 0.52 : 0.6,
                    roughness: 0.84,
                    metalness: 0.0,
                    transparent: true,
                    opacity: 0.96,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                mat.userData.channel = cfg.channel;

                const panel = new THREE.Mesh(geo, mat);
                panel.position.set(dir * cfg.pos[0], cfg.pos[1], cfg.pos[2]);
                panel.rotation.set(cfg.rot[0], cfg.rot[1] * dir, cfg.rot[2] * dir);
                panel.renderOrder = 2;
                wing.add(panel);
                iridescentMats.push(mat);

                const rim = new THREE.Mesh(geo.clone(), shared.rimMat);
                rim.position.copy(panel.position);
                rim.rotation.copy(panel.rotation);
                rim.scale.set(1.008, 1.008, 1.008);
                rim.renderOrder = 3;
                wing.add(rim);

                const vein = makeBoneBetween(
                    new THREE.Vector3(dir * 0.3, 0.07, 0.22),
                    new THREE.Vector3(dir * (cfg.pos[0] + cfg.len * 0.74), cfg.pos[1] + cfg.rise * 0.57, cfg.pos[2] + 0.06),
                    cfg.vein,
                    cfg.vein * 0.44,
                    cfg.channel === 'cool' ? shared.veinCool : shared.veinWarm,
                    7
                );
                vein.renderOrder = 3;
                wing.add(vein);
            }

            const topCurlPoints = [];
            for (let i = 0; i < 20; i++) {
                const u = i / 19;
                const a = (0.34 + u * 1.6) * Math.PI;
                const r = 0.7 * (1 - u * 0.62);
                topCurlPoints.push(new THREE.Vector3(
                    dir * (5.24 + Math.cos(a) * r),
                    3.86 + Math.sin(a) * r + u * 0.44,
                    0.24 + u * 0.1
                ));
            }
            wing.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(topCurlPoints), 72, 0.02, 10, false), shared.curlMat));

            const lowerLobeConfigs = [
                { len: 2.64, root: 0.66, tip: 0.2, rise: -0.96, camber: 0.08, droop: -0.44, twist: 0.026, curl: 0.04, pos: [0.7, -0.98, 0.16], rot: [-0.16, 0.03, 0.44], color: 0xffc8ef, emissive: 0xff9fe0, channel: 'warm' },
                { len: 2.32, root: 0.58, tip: 0.18, rise: -1.08, camber: 0.07, droop: -0.52, twist: 0.022, curl: 0.03, pos: [0.56, -1.18, 0.14], rot: [-0.21, 0.02, 0.58], color: 0xd6ecff, emissive: 0xbbe0ff, channel: 'cool' }
            ];
            for (const l of lowerLobeConfigs) {
                const lobeGeo = makeRainbowFeatherGeometry(dir, {
                    length: l.len,
                    rootWidth: l.root,
                    tipWidth: l.tip,
                    rise: l.rise,
                    camber: l.camber,
                    droop: l.droop,
                    twist: l.twist,
                    curl: l.curl
                });
                const lobeMat = new THREE.MeshStandardMaterial({
                    color: l.color,
                    map: shared.membraneTex,
                    emissiveMap: shared.membraneTex,
                    emissive: l.emissive,
                    emissiveIntensity: 0.46,
                    roughness: 0.88,
                    metalness: 0.0,
                    transparent: true,
                    opacity: 0.84,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                lobeMat.userData.channel = l.channel;
                const lobe = new THREE.Mesh(lobeGeo, lobeMat);
                lobe.position.set(dir * l.pos[0], l.pos[1], l.pos[2]);
                lobe.rotation.set(l.rot[0], l.rot[1] * dir, l.rot[2] * dir);
                lobe.renderOrder = 2;
                wing.add(lobe);
                iridescentMats.push(lobeMat);
            }

            const tailStart = [
                { x: 2.3, y: -1.0, len: 1.46 },
                { x: 2.95, y: -1.22, len: 1.64 }
            ];
            for (let i = 0; i < tailStart.length; i++) {
                const tail = tailStart[i];
                const points = [];
                for (let j = 0; j < 12; j++) {
                    const u = j / 11;
                    points.push(new THREE.Vector3(
                        dir * (tail.x + Math.sin(u * Math.PI * (1.2 + i * 0.2)) * 0.18),
                        tail.y - u * tail.len,
                        0.18 + Math.cos(u * Math.PI * 1.4) * 0.03
                    ));
                }
                wing.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, 0.012, 7, false), shared.tailLineMat));

                const drop = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), shared.dropGlow);
                drop.position.set(dir * tail.x, tail.y - tail.len - 0.06, 0.2);
                wing.add(drop);
                trailDrops.push(drop);
            }

            const warmLight = new THREE.PointLight(0xffdba0, 0.82, 6.4, 2);
            warmLight.position.set(dir * 1.1, 0.12, 0.56);
            wing.add(warmLight);
            wingLights.push(warmLight);

            const coolLight = new THREE.PointLight(0x9be9ff, 0.68, 6.0, 2);
            coolLight.position.set(dir * 2.0, 1.0, 0.5);
            wing.add(coolLight);
            wingLights.push(coolLight);

            const sparkleSystem = makeRainbowSparkSystem(dir, shared.sparkleTexture, {
                count: 28,
                size: 0.07,
                opacity: 0.72,
                spreadMin: 0.8,
                spreadMax: 4.6,
                yOffset: 0.14,
                drift: 0.036
            });
            wing.add(sparkleSystem.points);
            sparkSystems.push(sparkleSystem);

            const flowerSystem = makeRainbowSparkSystem(dir, shared.flowerTexture, {
                count: 10,
                size: 0.118,
                opacity: 0.58,
                spreadMin: 0.7,
                spreadMax: 3.2,
                yOffset: -0.74,
                drift: 0.03
            });
            wing.add(flowerSystem.points);
            sparkSystems.push(flowerSystem);

            wing.userData.sparkSystems = sparkSystems;
            wing.userData.wingLights = wingLights;
            wing.userData.trailDrops = trailDrops;
            wing.userData.iridescentMats = iridescentMats;
            return wing;
        }

        function makeRainbowWingsProp() {
            const textures = makeRainbowWingTextures();

            const shared = {
                membraneTex: textures.membraneTex,
                sparkleTexture: textures.sparkleTex,
                flowerTexture: textures.flowerTex,
                rimMat: new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.08,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                }),
                veinWarm: new THREE.MeshBasicMaterial({
                    color: 0xffeeb6,
                    transparent: true,
                    opacity: 0.62,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                }),
                veinCool: new THREE.MeshBasicMaterial({
                    color: 0xb7f3ff,
                    transparent: true,
                    opacity: 0.58,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                }),
                curlMat: new THREE.MeshBasicMaterial({
                    color: 0xf7c4ff,
                    transparent: true,
                    opacity: 0.8,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                }),
                tailLineMat: new THREE.MeshBasicMaterial({
                    color: 0xffdfa6,
                    transparent: true,
                    opacity: 0.86,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                }),
                rootPearl: new THREE.MeshPhysicalMaterial({
                    color: 0xffd8f8,
                    emissive: 0xffa8ea,
                    emissiveIntensity: 0.96,
                    transmission: 0.38,
                    thickness: 0.22,
                    roughness: 0.2,
                    metalness: 0.02,
                    clearcoat: 0.3,
                    clearcoatRoughness: 0.26
                }),
                rootCrystal: new THREE.MeshPhysicalMaterial({
                    color: 0xfff2c9,
                    emissive: 0xffcf7f,
                    emissiveIntensity: 0.9,
                    transmission: 0.42,
                    thickness: 0.2,
                    roughness: 0.18,
                    metalness: 0.02,
                    clearcoat: 0.28,
                    clearcoatRoughness: 0.24
                }),
                dropGlow: new THREE.MeshStandardMaterial({
                    color: 0xffdfab,
                    emissive: 0xffcd76,
                    emissiveIntensity: 1.34,
                    roughness: 0.32,
                    metalness: 0.0
                })
            };

            shared.rootPearl.userData.channel = 'warm';
            shared.rootCrystal.userData.channel = 'cool';

            const g = new THREE.Group();
            const left = makeRainbowWingSide('left', shared);
            const right = makeRainbowWingSide('right', shared);
            left.visible = false;
            right.visible = false;
            leftWingGroup.add(left);
            rightWingGroup.add(right);

            g.userData.left = left;
            g.userData.right = right;
            g.userData.iridescentMats = [
                ...(left.userData.iridescentMats || []),
                ...(right.userData.iridescentMats || []),
                shared.rootPearl,
                shared.rootCrystal
            ];
            g.userData.sparkSystems = [
                ...(left.userData.sparkSystems || []),
                ...(right.userData.sparkSystems || [])
            ];
            g.userData.wingLights = [
                ...(left.userData.wingLights || []),
                ...(right.userData.wingLights || [])
            ];
            g.userData.trailDrops = [
                ...(left.userData.trailDrops || []),
                ...(right.userData.trailDrops || [])
            ];
            return g;
        }

        function makeSimpleGoldCrown() {
            const g = new THREE.Group();

            const goldMat = new THREE.MeshPhysicalMaterial({
                color: 0xfff12a,
                emissive: 0x8a7a00,
                emissiveIntensity: 0.26,
                metalness: 0.58,
                roughness: 0.24,
                clearcoat: 0.42,
                clearcoatRoughness: 0.18,
                reflectivity: 0.56,
                envMapIntensity: 0.35
            });
            const goldInnerMat = new THREE.MeshPhysicalMaterial({
                color: 0xffe81d,
                emissive: 0x756800,
                emissiveIntensity: 0.2,
                metalness: 0.46,
                roughness: 0.3,
                clearcoat: 0.22,
                clearcoatRoughness: 0.28,
                envMapIntensity: 0.28
            });

            const outerGeo = new THREE.CylinderGeometry(1.52, 1.62, 1.14, 144, 14, true);
            const outerPos = outerGeo.attributes.position;
            for (let i = 0; i < outerPos.count; i++) {
                const x = outerPos.getX(i);
                const y = outerPos.getY(i);
                const z = outerPos.getZ(i);
                const theta = Math.atan2(z, x);
                const v = (y + 0.57) / 1.14;
                const peakWave = Math.pow((Math.cos(theta * 3.0) * 0.5 + 0.5), 3.35);
                const tipBoost = Math.pow(Math.max(0, Math.cos(theta * 3.0)), 9.0) * 0.12;
                const crest = peakWave * 0.46 + tipBoost;
                const crestWeight = THREE.MathUtils.smoothstep(v, 0.52, 1.0);
                const ny = y + crest * crestWeight;
                const radialScale = 1 + crest * 0.02 * crestWeight;
                outerPos.setXYZ(i, x * radialScale, ny, z * radialScale);
            }
            outerPos.needsUpdate = true;
            outerGeo.computeVertexNormals();
            const outerShell = new THREE.Mesh(outerGeo, goldMat);
            g.add(outerShell);

            const innerGeo = new THREE.CylinderGeometry(1.36, 1.46, 1.08, 128, 12, true);
            const innerPos = innerGeo.attributes.position;
            for (let i = 0; i < innerPos.count; i++) {
                const x = innerPos.getX(i);
                const y = innerPos.getY(i);
                const z = innerPos.getZ(i);
                const theta = Math.atan2(z, x);
                const v = (y + 0.54) / 1.08;
                const peakWave = Math.pow((Math.cos(theta * 3.0) * 0.5 + 0.5), 3.0);
                const tipBoost = Math.pow(Math.max(0, Math.cos(theta * 3.0)), 8.0) * 0.08;
                const crest = peakWave * 0.38 + tipBoost;
                const crestWeight = THREE.MathUtils.smoothstep(v, 0.54, 1.0);
                const ny = y + crest * crestWeight - 0.05;
                innerPos.setXYZ(i, x, ny, z);
            }
            innerPos.needsUpdate = true;
            innerGeo.computeVertexNormals();
            const innerShell = new THREE.Mesh(innerGeo, goldInnerMat);
            innerShell.material.side = THREE.BackSide;
            g.add(innerShell);

            const lowerBand = new THREE.Mesh(
                new THREE.TorusGeometry(1.54, 0.085, 22, 180),
                goldMat
            );
            lowerBand.rotation.x = Math.PI * 0.5;
            lowerBand.position.y = -0.56;
            g.add(lowerBand);

            const topRim = new THREE.Mesh(
                new THREE.TorusGeometry(1.48, 0.044, 16, 180),
                goldMat
            );
            topRim.rotation.x = Math.PI * 0.5;
            topRim.position.y = 0.41;
            g.add(topRim);

            const beadMat = new THREE.MeshPhysicalMaterial({
                color: 0xfff43d,
                emissive: 0x7c7000,
                emissiveIntensity: 0.22,
                metalness: 0.62,
                roughness: 0.22,
                clearcoat: 0.4,
                clearcoatRoughness: 0.2,
                envMapIntensity: 0.3
            });
            const beadGeo = new THREE.SphereGeometry(0.021, 8, 6);
            const beadCount = 88;
            const beads = new THREE.InstancedMesh(beadGeo, beadMat, beadCount);
            const beadMatrix = new THREE.Matrix4();
            for (let i = 0; i < beadCount; i++) {
                const a = (i / beadCount) * Math.PI * 2;
                beadMatrix.makeTranslation(Math.cos(a) * 1.548, -0.29, Math.sin(a) * 1.548);
                beads.setMatrixAt(i, beadMatrix);
            }
            beads.instanceMatrix.needsUpdate = true;
            g.add(beads);

            g.scale.set(0.94, 0.94, 0.94);
            g.position.set(0, 2.36, 0.08);
            g.rotation.set(0.04, Math.PI * 1.5, 0);

            const crownWarmFill = new THREE.PointLight(0xffd43a, 1.1, 10, 2);
            crownWarmFill.position.set(0, 0.8, 1.1);
            g.add(crownWarmFill);
            return g;
        }

        function makeWizardHatProp() {
            const g = new THREE.Group();
            const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

            const fabricCanvas = document.createElement('canvas');
            fabricCanvas.width = 512;
            fabricCanvas.height = 512;
            const fCtx = fabricCanvas.getContext('2d');

            const base = fCtx.createLinearGradient(0, 0, 512, 512);
            base.addColorStop(0.0, '#190d34');
            base.addColorStop(0.44, '#2f1762');
            base.addColorStop(0.82, '#411f7f');
            base.addColorStop(1.0, '#25134f');
            fCtx.fillStyle = base;
            fCtx.fillRect(0, 0, 512, 512);

            for (let i = 0; i < 1200; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const s = 1 + Math.random() * 2;
                const a = 0.04 + Math.random() * 0.09;
                fCtx.fillStyle = `rgba(220, 194, 255, ${a})`;
                fCtx.fillRect(x, y, s, 1);
            }

            const fabricTex = new THREE.CanvasTexture(fabricCanvas);
            fabricTex.colorSpace = THREE.SRGBColorSpace;
            fabricTex.anisotropy = maxAnisotropy;
            fabricTex.wrapS = fabricTex.wrapT = THREE.RepeatWrapping;
            fabricTex.repeat.set(1.3, 1.3);
            fabricTex.needsUpdate = true;

            const feltMat = new THREE.MeshPhysicalMaterial({
                color: 0x3d1a7a,
                map: fabricTex,
                emissive: 0x15082b,
                emissiveIntensity: 0.24,
                roughness: 0.8,
                metalness: 0.0,
                clearcoat: 0.08,
                clearcoatRoughness: 0.72
            });
            const trimMat = new THREE.MeshPhysicalMaterial({
                color: 0x47306f,
                emissive: 0x1b1134,
                emissiveIntensity: 0.12,
                roughness: 0.56,
                metalness: 0.12,
                clearcoat: 0.22,
                clearcoatRoughness: 0.36
            });
            const gemMat = new THREE.MeshPhysicalMaterial({
                color: 0x8ef1ff,
                emissive: 0x2bdbff,
                emissiveIntensity: 1.36,
                transmission: 0.52,
                thickness: 0.26,
                roughness: 0.12,
                metalness: 0.04,
                clearcoat: 0.62,
                clearcoatRoughness: 0.18
            });

            const brimGeo = new THREE.TorusGeometry(1.74, 0.31, 22, 156);
            brimGeo.rotateX(Math.PI * 0.5);
            const brimPos = brimGeo.attributes.position;
            for (let i = 0; i < brimPos.count; i++) {
                const x = brimPos.getX(i);
                const y = brimPos.getY(i);
                const z = brimPos.getZ(i);
                const angle = Math.atan2(z, x);
                const r = Math.sqrt(x * x + z * z);
                const ripple = Math.sin(angle * 6.0 + r * 2.0) * 0.055;
                const sag = THREE.MathUtils.smoothstep(r, 1.5, 2.1) * 0.04;
                brimPos.setY(i, y * 0.42 + ripple - sag);
            }
            brimPos.needsUpdate = true;
            brimGeo.computeVertexNormals();
            const brim = new THREE.Mesh(brimGeo, feltMat);
            brim.position.y = 0.02;
            g.add(brim);

            const coneGeo = new THREE.ConeGeometry(1.08, 3.2, 64, 24, true);
            const conePos = coneGeo.attributes.position;
            for (let i = 0; i < conePos.count; i++) {
                const x = conePos.getX(i);
                const y = conePos.getY(i);
                const z = conePos.getZ(i);
                const v = THREE.MathUtils.clamp((y + 1.6) / 3.2, 0, 1);
                const bend = Math.pow(v, 1.5);
                const swirl = Math.sin(v * 4.6 + z * 1.8) * 0.11 * bend;
                conePos.setXYZ(
                    i,
                    x + swirl + bend * 0.32,
                    y + Math.sin(x * 3.8 + z * 3.1) * 0.02 * (1 - v),
                    z + Math.cos(v * 3.7 + x * 1.6) * 0.07 * bend
                );
            }
            conePos.needsUpdate = true;
            coneGeo.computeVertexNormals();
            const cone = new THREE.Mesh(coneGeo, feltMat);
            cone.position.set(-0.06, 1.3, 0.08);
            cone.rotation.z = 0.14;
            g.add(cone);

            const band = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.075, 16, 96), trimMat);
            band.rotation.x = Math.PI * 0.5;
            band.position.set(-0.08, 0.66, 0.14);
            g.add(band);

            const buckle = new THREE.Mesh(
                new THREE.BoxGeometry(0.34, 0.16, 0.07),
                new THREE.MeshPhysicalMaterial({
                    color: 0xc7b8ff,
                    emissive: 0x2f2a54,
                    emissiveIntensity: 0.2,
                    metalness: 0.82,
                    roughness: 0.24,
                    clearcoat: 0.4,
                    clearcoatRoughness: 0.16
                })
            );
            buckle.position.set(-0.08, 0.66, 1.03);
            g.add(buckle);

            const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), gemMat);
            gem.position.set(-0.08, 0.66, 1.08);
            g.add(gem);

            const starGeo = new THREE.IcosahedronGeometry(0.028, 0);
            const starMat = new THREE.MeshBasicMaterial({
                color: 0xd3f7ff,
                transparent: true,
                opacity: 0.82,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const starCount = 22;
            const stars = new THREE.InstancedMesh(starGeo, starMat, starCount);
            const starData = [];
            const starMatrix = new THREE.Matrix4();
            const starScale = new THREE.Vector3();
            const starQuat = new THREE.Quaternion();
            const starPosVec = new THREE.Vector3();
            for (let i = 0; i < starCount; i++) {
                const u = i / starCount;
                const a = u * Math.PI * 2;
                const y = 0.82 + u * 1.65;
                const radius = 0.78 - u * 0.4;
                starPosVec.set(Math.cos(a) * radius - 0.08, y, Math.sin(a) * radius + 0.08);
                starQuat.setFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI));
                const s = 0.8 + Math.random() * 1.35;
                starScale.set(s, s, s);
                starMatrix.compose(starPosVec, starQuat, starScale);
                stars.setMatrixAt(i, starMatrix);
                starData.push({
                    angle: a,
                    radius,
                    y,
                    phase: Math.random() * Math.PI * 2,
                    spin: (Math.random() - 0.5) * 1.8,
                    scale: s
                });
            }
            stars.instanceMatrix.needsUpdate = true;
            g.add(stars);

            const magicLight = new THREE.PointLight(0x78e2ff, 0.7, 7.8, 2);
            magicLight.position.set(-0.08, 1.4, 0.88);
            g.add(magicLight);

            g.scale.set(0.94, 0.94, 0.94);
            g.position.set(0, 2.46, 0.08);
            g.rotation.y = Math.PI * 1.42;
            g.userData.magicGem = gem;
            g.userData.magicLight = magicLight;
            g.userData.starField = stars;
            g.userData.starFieldData = starData;
            return g;
        }

        function makeCelestialHaloProp() {
            const g = new THREE.Group();

            const alloyMat = new THREE.MeshPhysicalMaterial({
                color: 0xffecb7,
                emissive: 0x7e5f18,
                emissiveIntensity: 0.34,
                metalness: 0.94,
                roughness: 0.16,
                clearcoat: 1,
                clearcoatRoughness: 0.08,
                envMapIntensity: 0.64
            });
            const runeMat = new THREE.MeshBasicMaterial({
                color: 0xa6f5ff,
                transparent: true,
                opacity: 0.78,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const orbMat = new THREE.MeshStandardMaterial({
                color: 0xe3f7ff,
                emissive: 0x8de6ff,
                emissiveIntensity: 1.24,
                roughness: 0.18,
                metalness: 0.06
            });

            const ring = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.11, 20, 120), alloyMat);
            ring.rotation.x = Math.PI * 0.5;
            g.add(ring);

            const energyRingMat = new THREE.MeshBasicMaterial({
                color: 0x87f3ff,
                transparent: true,
                opacity: 0.46,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const energyRing = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.07, 14, 120), energyRingMat);
            energyRing.rotation.x = Math.PI * 0.5;
            g.add(energyRing);

            const runeGeo = new THREE.BoxGeometry(0.08, 0.018, 0.03);
            const runeCount = 24;
            const runes = new THREE.InstancedMesh(runeGeo, runeMat, runeCount);
            const runeMatrix = new THREE.Matrix4();
            const runePos = new THREE.Vector3();
            const runeQuat = new THREE.Quaternion();
            const runeScale = new THREE.Vector3(1, 1, 1);
            for (let i = 0; i < runeCount; i++) {
                const a = (i / runeCount) * Math.PI * 2;
                runePos.set(Math.cos(a) * 1.22, 0, Math.sin(a) * 1.22);
                runeQuat.setFromEuler(new THREE.Euler(0, -a, 0));
                runeMatrix.compose(runePos, runeQuat, runeScale);
                runes.setMatrixAt(i, runeMatrix);
            }
            runes.instanceMatrix.needsUpdate = true;
            g.add(runes);

            const orbGroup = new THREE.Group();
            const orbiters = [];
            for (let i = 0; i < 10; i++) {
                const orb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), orbMat);
                const a = (i / 10) * Math.PI * 2;
                const r = 1.34 + (i % 2) * 0.12;
                orb.position.set(Math.cos(a) * r, (i % 2 ? 0.08 : -0.08), Math.sin(a) * r);
                orb.userData.phase = a;
                orb.userData.baseY = orb.position.y;
                orbiters.push(orb);
                orbGroup.add(orb);
            }
            g.add(orbGroup);

            const haloGlow = createSoftHaloSprite({
                size: 3.4,
                inner: 'rgba(122, 237, 255, 0.44)',
                mid: 'rgba(98, 198, 255, 0.18)',
                outer: 'rgba(30, 98, 176, 0.0)'
            });
            haloGlow.position.set(0, 0, 0);
            g.add(haloGlow);

            const haloLight = new THREE.PointLight(0x92ebff, 1.05, 9.6, 2);
            haloLight.position.set(0, 0.12, 0.14);
            g.add(haloLight);

            g.position.set(0, 2.72, 0.08);
            g.rotation.x = 0.18;
            g.userData.energyRing = energyRing;
            g.userData.haloLight = haloLight;
            g.userData.orbiters = orbiters;
            g.userData.haloGlow = haloGlow;
            g.userData.runeRing = runes;
            return g;
        }

        function makeSegmentedHornChain(points, {
            material,
            radiusStart = 0.16,
            radiusEnd = 0.03,
            segments = 20,
            ridgeEvery = 2,
            ridgeMaterial = material
        } = {}) {
            const g = new THREE.Group();
            const curve = new THREE.CatmullRomCurve3(points);
            for (let i = 0; i < segments; i++) {
                const t0 = i / segments;
                const t1 = (i + 1) / segments;
                const p0 = curve.getPoint(t0);
                const p1 = curve.getPoint(t1);
                const r0 = THREE.MathUtils.lerp(radiusStart, radiusEnd, t0);
                const r1 = THREE.MathUtils.lerp(radiusStart, radiusEnd, t1);
                const section = makeBoneBetween(p0, p1, r0, r1, material, 14);
                g.add(section);

                if (ridgeEvery > 0 && i % ridgeEvery === 0 && i > 0 && i < segments - 2) {
                    const ring = new THREE.Mesh(
                        new THREE.TorusGeometry(r1 * 1.04, Math.max(0.006, r1 * 0.15), 8, 20),
                        ridgeMaterial
                    );
                    ring.position.copy(p1);
                    ring.quaternion.setFromUnitVectors(
                        new THREE.Vector3(0, 0, 1),
                        p1.clone().sub(p0).normalize()
                    );
                    g.add(ring);
                }
            }

            const tipPos = curve.getPoint(1);
            const tipDir = curve.getTangent(1).normalize();
            const tip = new THREE.Mesh(
                new THREE.ConeGeometry(Math.max(0.01, radiusEnd * 1.35), Math.max(0.04, radiusEnd * 4.8), 10),
                material
            );
            tip.position.copy(tipPos).addScaledVector(tipDir, radiusEnd * 1.2);
            tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tipDir);
            g.add(tip);
            return g;
        }

        function makeRamHornsProp() {
            const g = new THREE.Group();

            const hornMat = new THREE.MeshPhysicalMaterial({
                color: 0xb89e7e,
                emissive: 0x2f1e12,
                emissiveIntensity: 0.12,
                roughness: 0.78,
                metalness: 0.04,
                clearcoat: 0.06,
                clearcoatRoughness: 0.68
            });
            const ridgeMat = new THREE.MeshStandardMaterial({
                color: 0x8d745a,
                roughness: 0.86,
                metalness: 0.0
            });
            const cuffMat = new THREE.MeshPhysicalMaterial({
                color: 0x6f4b2f,
                emissive: 0x211206,
                emissiveIntensity: 0.08,
                roughness: 0.58,
                metalness: 0.16,
                clearcoat: 0.2,
                clearcoatRoughness: 0.34
            });

            function makeSide(dir) {
                const points = [
                    new THREE.Vector3(dir * 0.64, 2.06, 0.24),
                    new THREE.Vector3(dir * 1.08, 2.26, 0.04),
                    new THREE.Vector3(dir * 1.36, 2.02, -0.56),
                    new THREE.Vector3(dir * 1.28, 1.56, -1.04),
                    new THREE.Vector3(dir * 0.94, 1.04, -1.2),
                    new THREE.Vector3(dir * 0.52, 0.82, -0.96)
                ];
                const horn = makeSegmentedHornChain(points, {
                    material: hornMat,
                    radiusStart: 0.26,
                    radiusEnd: 0.05,
                    segments: 26,
                    ridgeEvery: 1,
                    ridgeMaterial: ridgeMat
                });

                const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.034, 10, 28), cuffMat);
                cuff.position.set(dir * 0.64, 2.02, 0.24);
                cuff.rotation.y = Math.PI * 0.5;
                horn.add(cuff);
                return horn;
            }

            g.add(makeSide(-1), makeSide(1));
            g.userData.hornMaterial = hornMat;
            return g;
        }

        function makeDevilHornsProp() {
            const g = new THREE.Group();

            const obsidianMat = new THREE.MeshPhysicalMaterial({
                color: 0x220b0b,
                emissive: 0x220503,
                emissiveIntensity: 0.26,
                roughness: 0.38,
                metalness: 0.32,
                clearcoat: 0.52,
                clearcoatRoughness: 0.24,
                envMapIntensity: 0.42
            });
            const ridgeMat = new THREE.MeshStandardMaterial({
                color: 0x3b1512,
                roughness: 0.54,
                metalness: 0.12
            });
            const lavaMat = new THREE.MeshBasicMaterial({
                color: 0xff6a2a,
                transparent: true,
                opacity: 0.86,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            const emberLights = [];
            const lavaMats = [lavaMat];

            function makeSide(dir) {
                const points = [
                    new THREE.Vector3(dir * 0.46, 2.22, 0.26),
                    new THREE.Vector3(dir * 0.76, 2.62, 0.1),
                    new THREE.Vector3(dir * 0.9, 3.08, -0.2),
                    new THREE.Vector3(dir * 0.78, 3.5, -0.46)
                ];
                const horn = makeSegmentedHornChain(points, {
                    material: obsidianMat,
                    radiusStart: 0.22,
                    radiusEnd: 0.04,
                    segments: 18,
                    ridgeEvery: 2,
                    ridgeMaterial: ridgeMat
                });

                const crackPoints = points.map((p, idx) => new THREE.Vector3(
                    p.x + dir * (0.015 + idx * 0.005),
                    p.y - idx * 0.02,
                    p.z + 0.03 + idx * 0.008
                ));
                const crackCurve = new THREE.CatmullRomCurve3(crackPoints);
                const crack = new THREE.Mesh(new THREE.TubeGeometry(crackCurve, 56, 0.009, 8, false), lavaMat);
                horn.add(crack);

                const emberLight = new THREE.PointLight(0xff6e2a, 0.58, 4.2, 2);
                emberLight.position.set(dir * 0.64, 2.78, 0.08);
                horn.add(emberLight);
                emberLights.push(emberLight);

                return horn;
            }

            g.add(makeSide(-1), makeSide(1));
            g.userData.emberLights = emberLights;
            g.userData.lavaMats = lavaMats;
            g.userData.obsidianMat = obsidianMat;
            return g;
        }

        function makeUnicornHornProp() {
            const g = new THREE.Group();

            const coreMat = new THREE.MeshPhysicalMaterial({
                color: 0xfff4ff,
                emissive: 0x8e65ff,
                emissiveIntensity: 0.46,
                transmission: 0.34,
                thickness: 0.36,
                roughness: 0.16,
                metalness: 0.06,
                clearcoat: 0.54,
                clearcoatRoughness: 0.2,
                ior: 1.28
            });
            const spiralMat = new THREE.MeshPhysicalMaterial({
                color: 0xa3f6ff,
                emissive: 0x6de2ff,
                emissiveIntensity: 0.92,
                roughness: 0.22,
                metalness: 0.2,
                clearcoat: 0.64,
                clearcoatRoughness: 0.18
            });
            const tipMat = new THREE.MeshPhysicalMaterial({
                color: 0xffd6ff,
                emissive: 0xff8ee8,
                emissiveIntensity: 1.15,
                transmission: 0.55,
                thickness: 0.2,
                roughness: 0.1,
                metalness: 0.04,
                clearcoat: 0.7,
                clearcoatRoughness: 0.12
            });

            const coreGeo = new THREE.ConeGeometry(0.24, 1.88, 52, 24);
            const corePos = coreGeo.attributes.position;
            for (let i = 0; i < corePos.count; i++) {
                const x = corePos.getX(i);
                const y = corePos.getY(i);
                const z = corePos.getZ(i);
                const v = THREE.MathUtils.clamp((y + 0.94) / 1.88, 0, 1);
                corePos.setXYZ(
                    i,
                    x + Math.sin(v * 8.2 + z * 9.0) * 0.008,
                    y,
                    z + Math.cos(v * 7.4 + x * 8.5) * 0.008
                );
            }
            corePos.needsUpdate = true;
            coreGeo.computeVertexNormals();
            const core = new THREE.Mesh(coreGeo, coreMat);
            core.position.y = 0.94;
            g.add(core);

            const spiralGroup = new THREE.Group();
            for (let s = 0; s < 3; s++) {
                const helixPoints = [];
                for (let i = 0; i <= 76; i++) {
                    const t = i / 76;
                    const angle = t * Math.PI * 2 * 4.5 + s * ((Math.PI * 2) / 3);
                    const radius = THREE.MathUtils.lerp(0.24, 0.04, t);
                    helixPoints.push(new THREE.Vector3(
                        Math.cos(angle) * radius,
                        t * 1.86,
                        Math.sin(angle) * radius
                    ));
                }
                const helix = new THREE.Mesh(
                    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPoints), 84, 0.011, 10, false),
                    spiralMat
                );
                spiralGroup.add(helix);
            }
            g.add(spiralGroup);

            const baseCollar = new THREE.Mesh(
                new THREE.TorusGeometry(0.25, 0.038, 10, 32),
                new THREE.MeshPhysicalMaterial({
                    color: 0xb39bff,
                    emissive: 0x5c41b8,
                    emissiveIntensity: 0.34,
                    metalness: 0.4,
                    roughness: 0.34,
                    clearcoat: 0.42,
                    clearcoatRoughness: 0.22
                })
            );
            baseCollar.rotation.x = Math.PI * 0.5;
            baseCollar.position.y = 0.02;
            g.add(baseCollar);

            const tipGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.095, 1), tipMat);
            tipGem.position.y = 1.94;
            g.add(tipGem);

            const prismLight = new THREE.PointLight(0xc2a2ff, 0.76, 5.6, 2);
            prismLight.position.set(0, 0.92, 0.16);
            g.add(prismLight);

            g.position.set(0, 2.14, 0.64);
            g.scale.set(1.08, 1.08, 1.08);
            g.rotation.set(0.12, 0, 0);
            g.userData.prismMats = [coreMat, spiralMat, tipMat];
            g.userData.prismLight = prismLight;
            g.userData.spiralGroup = spiralGroup;
            g.userData.tipGem = tipGem;
            g.userData.excludeFromHeadTilt = true;
            return g;
        }

        function makeProtectorRingBodyProp() {
            const g = new THREE.Group();
            const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

            let seed = 130977;
            const rand = () => {
                seed = (seed * 1664525 + 1013904223) >>> 0;
                return seed / 4294967296;
            };

            const goldCanvas = document.createElement('canvas');
            goldCanvas.width = 1024;
            goldCanvas.height = 1024;
            const gCtx = goldCanvas.getContext('2d');

            const goldBase = gCtx.createLinearGradient(0, 0, 1024, 1024);
            goldBase.addColorStop(0.0, '#fff4cb');
            goldBase.addColorStop(0.24, '#efcb85');
            goldBase.addColorStop(0.56, '#ce9b56');
            goldBase.addColorStop(0.84, '#8d5a2c');
            goldBase.addColorStop(1.0, '#573218');
            gCtx.fillStyle = goldBase;
            gCtx.fillRect(0, 0, 1024, 1024);

            for (let i = 0; i < 1100; i++) {
                const x = rand() * 1024;
                const y = rand() * 1024;
                const len = 18 + rand() * 120;
                const alpha = 0.03 + rand() * 0.11;
                gCtx.strokeStyle = `rgba(255,239,186,${alpha})`;
                gCtx.lineWidth = 0.6 + rand() * 1.8;
                gCtx.beginPath();
                gCtx.moveTo(x, y);
                gCtx.lineTo(x + len, y + (rand() - 0.5) * 7);
                gCtx.stroke();
            }

            for (let i = 0; i < 180; i++) {
                const x = rand() * 1024;
                const y = rand() * 1024;
                const r = 14 + rand() * 64;
                const halo = gCtx.createRadialGradient(x, y, 1, x, y, r);
                halo.addColorStop(0, `rgba(255,255,240,${0.06 + rand() * 0.12})`);
                halo.addColorStop(1, 'rgba(66,36,12,0)');
                gCtx.fillStyle = halo;
                gCtx.beginPath();
                gCtx.arc(x, y, r, 0, Math.PI * 2);
                gCtx.fill();
            }

            const violetCanvas = document.createElement('canvas');
            violetCanvas.width = 1024;
            violetCanvas.height = 1024;
            const vCtx = violetCanvas.getContext('2d');

            const violetBase = vCtx.createRadialGradient(530, 190, 60, 512, 512, 760);
            violetBase.addColorStop(0.0, '#7d4cff');
            violetBase.addColorStop(0.28, '#5a35ca');
            violetBase.addColorStop(0.62, '#37218f');
            violetBase.addColorStop(1.0, '#1d124f');
            vCtx.fillStyle = violetBase;
            vCtx.fillRect(0, 0, 1024, 1024);

            for (let i = 0; i < 1800; i++) {
                const x = rand() * 1024;
                const y = rand() * 1024;
                const s = 1 + rand() * 2;
                const a = 0.02 + rand() * 0.08;
                vCtx.fillStyle = `rgba(196,170,255,${a})`;
                vCtx.fillRect(x, y, s, s);
            }

            vCtx.lineCap = 'round';
            for (let i = 0; i < 120; i++) {
                const x0 = rand() * 1024;
                const y0 = rand() * 1024;
                const x1 = x0 + 40 + rand() * 160;
                const y1 = y0 + (rand() - 0.5) * 120;
                vCtx.strokeStyle = `rgba(214,196,255,${0.04 + rand() * 0.08})`;
                vCtx.lineWidth = 0.8 + rand() * 2.6;
                vCtx.beginPath();
                vCtx.moveTo(x0, y0);
                vCtx.quadraticCurveTo((x0 + x1) * 0.52, y0 - (16 + rand() * 60), x1, y1);
                vCtx.stroke();
            }

            const goldTex = new THREE.CanvasTexture(goldCanvas);
            goldTex.colorSpace = THREE.SRGBColorSpace;
            goldTex.anisotropy = maxAnisotropy;
            goldTex.wrapS = goldTex.wrapT = THREE.RepeatWrapping;
            goldTex.repeat.set(1.25, 1.0);
            goldTex.needsUpdate = true;

            const violetTex = new THREE.CanvasTexture(violetCanvas);
            violetTex.colorSpace = THREE.SRGBColorSpace;
            violetTex.anisotropy = maxAnisotropy;
            violetTex.wrapS = violetTex.wrapT = THREE.RepeatWrapping;
            violetTex.repeat.set(1.18, 1.02);
            violetTex.needsUpdate = true;

            const frameGoldMat = new THREE.MeshPhysicalMaterial({
                color: 0xf0ca84,
                map: goldTex,
                emissive: 0x7b4d1f,
                emissiveIntensity: 0.24,
                metalness: 0.96,
                roughness: 0.17,
                clearcoat: 1,
                clearcoatRoughness: 0.1,
                envMapIntensity: 0.88
            });
            const frameGoldDarkMat = new THREE.MeshPhysicalMaterial({
                color: 0xaf7a46,
                map: goldTex,
                emissive: 0x4d2e14,
                emissiveIntensity: 0.2,
                metalness: 0.9,
                roughness: 0.26,
                clearcoat: 0.74,
                clearcoatRoughness: 0.18,
                envMapIntensity: 0.66
            });
            const inlayMat = new THREE.MeshPhysicalMaterial({
                color: 0x372487,
                map: violetTex,
                emissive: 0x1b1052,
                emissiveIntensity: 0.36,
                metalness: 0.16,
                roughness: 0.32,
                clearcoat: 0.54,
                clearcoatRoughness: 0.18
            });
            const inlayShadowMat = new THREE.MeshPhysicalMaterial({
                color: 0x261861,
                map: violetTex,
                emissive: 0x110837,
                emissiveIntensity: 0.28,
                metalness: 0.12,
                roughness: 0.44,
                clearcoat: 0.3,
                clearcoatRoughness: 0.28
            });
            const gemFrameMat = new THREE.MeshPhysicalMaterial({
                color: 0xefd59a,
                emissive: 0x6e5324,
                emissiveIntensity: 0.2,
                metalness: 0.94,
                roughness: 0.16,
                clearcoat: 0.92,
                clearcoatRoughness: 0.1
            });
            const gemMat = new THREE.MeshPhysicalMaterial({
                color: 0x8ce2ff,
                emissive: 0x44c9ff,
                emissiveIntensity: 1.46,
                transmission: 0.72,
                thickness: 0.3,
                roughness: 0.06,
                metalness: 0.03,
                clearcoat: 0.95,
                clearcoatRoughness: 0.08,
                ior: 1.2
            });
            const gemCoreMat = new THREE.MeshBasicMaterial({
                color: 0xe9fbff,
                transparent: true,
                opacity: 0.84,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                toneMapped: false
            });

            function addFrontTubeArc({ radius = 2.2, y = -0.76, zOffset = 0.08, arc = 1.14, tube = 0.065, material = frameGoldMat } = {}) {
                const points = [];
                const segments = 56;
                for (let i = 0; i <= segments; i++) {
                    const t = i / segments;
                    const a = THREE.MathUtils.lerp(-arc, arc, t);
                    const x = Math.sin(a) * radius;
                    const z = Math.cos(a) * radius + zOffset;
                    const dip = Math.pow(Math.abs(a) / arc, 1.7) * 0.045;
                    points.push(new THREE.Vector3(x, y - dip, z));
                }
                return new THREE.Mesh(
                    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 72, tube, 14, false),
                    material
                );
            }

            const ringInlayGeo = new THREE.CylinderGeometry(2.18, 2.32, 0.9, 180, 10, true);
            const ringPos = ringInlayGeo.attributes.position;
            for (let i = 0; i < ringPos.count; i++) {
                const x = ringPos.getX(i);
                const y = ringPos.getY(i);
                const z = ringPos.getZ(i);
                const theta = Math.atan2(z, x);
                const v = (y + 0.45) / 0.9;
                const front = Math.max(0, Math.sin(theta));
                const back = Math.max(0, -Math.sin(theta));
                const sidePocket = Math.exp(-Math.pow(Math.abs(theta) - 1.18, 2.0) * 7.4);
                const crest = Math.pow(Math.max(0, Math.cos(theta * 2.0)), 4.0);
                const smileDip = front * Math.exp(-Math.pow((v - 0.64) * 4.6, 2)) * 0.2;
                const lowerPull = front * Math.pow(1 - v, 1.65) * 0.05;
                const radial = 1 + front * 0.08 + back * 0.02 + crest * 0.02 - sidePocket * 0.06;
                ringPos.setXYZ(
                    i,
                    x * radial,
                    y - smileDip + lowerPull + crest * 0.03 * v,
                    z * (1 + front * 0.09 - sidePocket * 0.05)
                );
            }
            ringPos.needsUpdate = true;
            ringInlayGeo.computeVertexNormals();

            const ringInlay = new THREE.Mesh(ringInlayGeo, inlayMat);
            ringInlay.position.set(0, -1.08, 0.06);
            g.add(ringInlay);

            const ringInnerShadow = new THREE.Mesh(
                new THREE.CylinderGeometry(1.96, 2.06, 0.62, 160, 6, true),
                inlayShadowMat
            );
            ringInnerShadow.position.set(0, -1.08, 0.02);
            g.add(ringInnerShadow);

            const topTrim = new THREE.Mesh(new THREE.TorusGeometry(2.24, 0.1, 18, 188), frameGoldMat);
            topTrim.rotation.x = Math.PI * 0.5;
            topTrim.position.set(0, -0.65, 0.08);
            g.add(topTrim);

            const lowerTrim = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.11, 18, 188), frameGoldMat);
            lowerTrim.rotation.x = Math.PI * 0.5;
            lowerTrim.position.set(0, -1.49, 0.06);
            g.add(lowerTrim);

            const innerTrim = new THREE.Mesh(new THREE.TorusGeometry(1.98, 0.08, 14, 156), frameGoldDarkMat);
            innerTrim.rotation.x = Math.PI * 0.5;
            innerTrim.position.set(0, -0.9, 0.06);
            g.add(innerTrim);

            const frontUpperRail = addFrontTubeArc({
                radius: 2.2,
                y: -0.72,
                zOffset: 0.1,
                arc: 1.05,
                tube: 0.07,
                material: frameGoldMat
            });
            g.add(frontUpperRail);

            const frontLowerRail = addFrontTubeArc({
                radius: 2.22,
                y: -1.5,
                zOffset: 0.06,
                arc: 1.08,
                tube: 0.072,
                material: frameGoldDarkMat
            });
            g.add(frontLowerRail);

            function makeSideInset(dir) {
                const sideGroup = new THREE.Group();
                const insetShape = new THREE.Shape();
                insetShape.moveTo(-0.58, 0.0);
                insetShape.bezierCurveTo(-0.52, 0.2, -0.34, 0.36, -0.06, 0.38);
                insetShape.quadraticCurveTo(0.32, 0.4, 0.58, 0.25);
                insetShape.bezierCurveTo(0.8, 0.1, 0.87, -0.08, 0.8, -0.24);
                insetShape.quadraticCurveTo(0.68, -0.42, 0.32, -0.5);
                insetShape.quadraticCurveTo(-0.02, -0.55, -0.32, -0.46);
                insetShape.bezierCurveTo(-0.58, -0.38, -0.76, -0.22, -0.82, -0.02);
                insetShape.quadraticCurveTo(-0.8, 0.02, -0.58, 0.0);
                insetShape.closePath();

                const rimGeo = new THREE.ExtrudeGeometry(insetShape, {
                    depth: 0.11,
                    bevelEnabled: true,
                    bevelThickness: 0.026,
                    bevelSize: 0.024,
                    bevelSegments: 2,
                    curveSegments: 44
                });
                rimGeo.translate(0, 0, -0.055);

                const rim = new THREE.Mesh(rimGeo, frameGoldMat);
                rim.scale.set(1.02, 1.06, 1.0);
                sideGroup.add(rim);

                const fill = new THREE.Mesh(rimGeo.clone(), inlayShadowMat);
                fill.scale.set(0.88, 0.82, 0.66);
                fill.position.z = 0.04;
                sideGroup.add(fill);

                sideGroup.position.set(dir * 1.64, -1.12, 1.56);
                sideGroup.rotation.y = dir * 0.56;
                sideGroup.rotation.z = dir * -0.05;
                g.add(sideGroup);
            }
            makeSideInset(-1);
            makeSideInset(1);

            for (const dir of [-1, 1]) {
                const crestWing = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.64, 14, 1, true), frameGoldMat);
                crestWing.position.set(dir * 0.76, -1.17, 2.03);
                crestWing.rotation.set(Math.PI * 0.5, 0, dir > 0 ? -0.92 : 0.92);
                crestWing.scale.set(1, 1, 0.46);
                g.add(crestWing);
            }

            function makeDiamondBadgeGeometry(width = 1.06, height = 1.42, depth = 0.24, bevelSize = 0.05) {
                const shape = new THREE.Shape();
                shape.moveTo(0, height * 0.5);
                shape.lineTo(width * 0.5, 0);
                shape.lineTo(0, -height * 0.5);
                shape.lineTo(-width * 0.5, 0);
                shape.closePath();

                const geo = new THREE.ExtrudeGeometry(shape, {
                    depth,
                    bevelEnabled: true,
                    bevelThickness: bevelSize,
                    bevelSize,
                    bevelSegments: 3,
                    curveSegments: 48
                });
                geo.translate(0, 0, -depth * 0.5);

                const pos = geo.attributes.position;
                for (let i = 0; i < pos.count; i++) {
                    const x = pos.getX(i);
                    const y = pos.getY(i);
                    const z = pos.getZ(i);
                    const nx = THREE.MathUtils.clamp(Math.abs(x) / Math.max(0.001, width * 0.5), 0, 1);
                    const ny = THREE.MathUtils.clamp(Math.abs(y) / Math.max(0.001, height * 0.5), 0, 1);
                    const facet = (1 - nx * 0.72) * (1 - ny * 0.5) * 0.11;
                    pos.setZ(i, z + facet);
                }
                pos.needsUpdate = true;
                geo.computeVertexNormals();
                return geo;
            }

            const gemFrame = new THREE.Mesh(makeDiamondBadgeGeometry(1.04, 1.46, 0.25, 0.055), gemFrameMat);
            gemFrame.position.set(0, -1.24, 2.22);
            g.add(gemFrame);

            const gemCrystal = new THREE.Mesh(makeDiamondBadgeGeometry(0.74, 1.12, 0.18, 0.038), gemMat);
            gemCrystal.position.set(0, -1.23, 2.3);
            g.add(gemCrystal);

            const gemCore = new THREE.Mesh(makeDiamondBadgeGeometry(0.44, 0.68, 0.09, 0.02), gemCoreMat);
            gemCore.position.copy(gemCrystal.position);
            gemCore.position.z += 0.03;
            g.add(gemCore);

            const lowerSpur = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.44, 12), frameGoldDarkMat);
            lowerSpur.position.set(0, -1.92, 2.08);
            lowerSpur.rotation.x = Math.PI;
            g.add(lowerSpur);

            const gemLight = new THREE.PointLight(0x76ddff, 0.98, 8.6, 2);
            gemLight.position.set(0, -1.14, 2.5);
            g.add(gemLight);

            const gemHalo = createSoftHaloSprite({
                size: 1.42,
                inner: 'rgba(164, 238, 255, 0.66)',
                mid: 'rgba(87, 190, 255, 0.3)',
                outer: 'rgba(24, 96, 186, 0)'
            });
            gemHalo.position.set(0, -1.24, 2.34);
            gemHalo.material.opacity = 0.64;
            gemHalo.userData.baseScale = gemHalo.scale.x;
            gemHalo.userData.baseOpacity = gemHalo.material.opacity;
            g.add(gemHalo);

            const sideAuraLeft = createSoftHaloSprite({
                size: 0.94,
                inner: 'rgba(161, 228, 255, 0.5)',
                mid: 'rgba(98, 170, 255, 0.22)',
                outer: 'rgba(28, 82, 168, 0)'
            });
            sideAuraLeft.position.set(-2.26, -1.04, 1.12);
            sideAuraLeft.material.opacity = 0.3;
            sideAuraLeft.userData.baseScale = sideAuraLeft.scale.x;
            sideAuraLeft.userData.baseOpacity = sideAuraLeft.material.opacity;
            g.add(sideAuraLeft);

            const sideAuraRight = createSoftHaloSprite({
                size: 0.94,
                inner: 'rgba(161, 228, 255, 0.5)',
                mid: 'rgba(98, 170, 255, 0.22)',
                outer: 'rgba(28, 82, 168, 0)'
            });
            sideAuraRight.position.set(2.26, -1.04, 1.12);
            sideAuraRight.material.opacity = 0.3;
            sideAuraRight.userData.baseScale = sideAuraRight.scale.x;
            sideAuraRight.userData.baseOpacity = sideAuraRight.material.opacity;
            g.add(sideAuraRight);

            g.position.set(0, 0, 0.02);
            g.userData.gemMats = [gemMat];
            g.userData.gemCoreMats = [gemCoreMat];
            g.userData.gemLight = gemLight;
            g.userData.frameMats = [frameGoldMat, frameGoldDarkMat, gemFrameMat];
            g.userData.auraSprites = [gemHalo, sideAuraLeft, sideAuraRight];
            return g;
        }

        function makeArchonBodyProp() {
            const g = new THREE.Group();
            const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

            const cloakCanvas = document.createElement('canvas');
            cloakCanvas.width = 1024;
            cloakCanvas.height = 1024;
            const cCtx = cloakCanvas.getContext('2d');

            const cloakBase = cCtx.createLinearGradient(0, 0, 0, 1024);
            cloakBase.addColorStop(0.0, '#1f1b53');
            cloakBase.addColorStop(0.34, '#181446');
            cloakBase.addColorStop(0.72, '#101138');
            cloakBase.addColorStop(1.0, '#090b28');
            cCtx.fillStyle = cloakBase;
            cCtx.fillRect(0, 0, 1024, 1024);

            for (let i = 0; i < 44; i++) {
                const x = 32 + Math.random() * 940;
                const width = 24 + Math.random() * 84;
                const grad = cCtx.createLinearGradient(x, 0, x + width, 1024);
                grad.addColorStop(0, `rgba(150, 154, 241, ${0.03 + Math.random() * 0.07})`);
                grad.addColorStop(0.5, 'rgba(255,255,255,0)');
                grad.addColorStop(1, `rgba(40, 58, 170, ${0.03 + Math.random() * 0.06})`);
                cCtx.fillStyle = grad;
                cCtx.fillRect(x, 0, width, 1024);
            }

            for (let i = 0; i < 2100; i++) {
                const x = Math.random() * 1024;
                const y = Math.random() * 1024;
                const s = 1 + Math.random() * 2;
                const a = 0.015 + Math.random() * 0.05;
                cCtx.fillStyle = `rgba(220, 230, 255, ${a})`;
                cCtx.fillRect(x, y, s, s);
            }

            const cloakTex = new THREE.CanvasTexture(cloakCanvas);
            cloakTex.colorSpace = THREE.SRGBColorSpace;
            cloakTex.anisotropy = maxAnisotropy;
            cloakTex.wrapS = cloakTex.wrapT = THREE.RepeatWrapping;
            cloakTex.repeat.set(1.2, 1.45);
            cloakTex.needsUpdate = true;

            const ivoryCanvas = document.createElement('canvas');
            ivoryCanvas.width = 512;
            ivoryCanvas.height = 1024;
            const iCtx = ivoryCanvas.getContext('2d');

            const ivoryBase = iCtx.createLinearGradient(0, 0, 0, 1024);
            ivoryBase.addColorStop(0.0, '#fffdff');
            ivoryBase.addColorStop(0.5, '#f0eef9');
            ivoryBase.addColorStop(1.0, '#d6d8ea');
            iCtx.fillStyle = ivoryBase;
            iCtx.fillRect(0, 0, 512, 1024);

            for (let i = 0; i < 1200; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 1024;
                const alpha = 0.03 + Math.random() * 0.05;
                iCtx.fillStyle = `rgba(255,255,255,${alpha})`;
                iCtx.fillRect(x, y, 1, 2 + Math.random() * 2);
            }

            const ivoryTex = new THREE.CanvasTexture(ivoryCanvas);
            ivoryTex.colorSpace = THREE.SRGBColorSpace;
            ivoryTex.anisotropy = maxAnisotropy;
            ivoryTex.wrapS = ivoryTex.wrapT = THREE.RepeatWrapping;
            ivoryTex.repeat.set(1.0, 1.45);
            ivoryTex.needsUpdate = true;

            const flameCanvas = document.createElement('canvas');
            flameCanvas.width = 256;
            flameCanvas.height = 512;
            const fCtx = flameCanvas.getContext('2d');
            fCtx.clearRect(0, 0, 256, 512);

            const flameGrad = fCtx.createLinearGradient(0, 512, 0, 0);
            flameGrad.addColorStop(0.0, 'rgba(56, 142, 255, 0.0)');
            flameGrad.addColorStop(0.28, 'rgba(96, 189, 255, 0.28)');
            flameGrad.addColorStop(0.64, 'rgba(140, 227, 255, 0.82)');
            flameGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.96)');
            fCtx.fillStyle = flameGrad;
            fCtx.beginPath();
            fCtx.moveTo(128, 18);
            fCtx.bezierCurveTo(182, 96, 216, 194, 184, 302);
            fCtx.bezierCurveTo(170, 354, 162, 410, 176, 492);
            fCtx.bezierCurveTo(136, 452, 122, 400, 108, 334);
            fCtx.bezierCurveTo(94, 408, 88, 452, 78, 494);
            fCtx.bezierCurveTo(66, 402, 70, 336, 48, 278);
            fCtx.bezierCurveTo(16, 196, 60, 96, 128, 18);
            fCtx.closePath();
            fCtx.fill();

            for (let i = 0; i < 14; i++) {
                const x = 60 + Math.random() * 136;
                const y = 44 + Math.random() * 408;
                const r = 18 + Math.random() * 38;
                const gRad = fCtx.createRadialGradient(x, y, 1, x, y, r);
                gRad.addColorStop(0, 'rgba(220, 248, 255, 0.72)');
                gRad.addColorStop(1, 'rgba(90, 180, 255, 0)');
                fCtx.fillStyle = gRad;
                fCtx.beginPath();
                fCtx.arc(x, y, r, 0, Math.PI * 2);
                fCtx.fill();
            }

            const flameTex = new THREE.CanvasTexture(flameCanvas);
            flameTex.colorSpace = THREE.SRGBColorSpace;
            flameTex.anisotropy = maxAnisotropy;
            flameTex.needsUpdate = true;

            const goldMat = new THREE.MeshPhysicalMaterial({
                color: 0xf6d48c,
                emissive: 0x8d6226,
                emissiveIntensity: 0.3,
                metalness: 0.98,
                roughness: 0.16,
                clearcoat: 1,
                clearcoatRoughness: 0.07,
                envMapIntensity: 0.9
            });
            const goldDarkMat = new THREE.MeshPhysicalMaterial({
                color: 0xc19355,
                emissive: 0x5b3412,
                emissiveIntensity: 0.24,
                metalness: 0.9,
                roughness: 0.24,
                clearcoat: 0.68,
                clearcoatRoughness: 0.14,
                envMapIntensity: 0.62
            });
            const armorMat = new THREE.MeshPhysicalMaterial({
                color: 0x2c2a78,
                emissive: 0x19194a,
                emissiveIntensity: 0.34,
                map: cloakTex,
                roughness: 0.44,
                metalness: 0.22,
                clearcoat: 0.3,
                clearcoatRoughness: 0.28
            });
            const cloakMat = new THREE.MeshPhysicalMaterial({
                color: 0x1f2168,
                emissive: 0x161b4f,
                emissiveIntensity: 0.3,
                map: cloakTex,
                roughness: 0.56,
                metalness: 0.08,
                clearcoat: 0.2,
                clearcoatRoughness: 0.44,
                side: THREE.DoubleSide
            });
            const innerMat = new THREE.MeshPhysicalMaterial({
                color: 0xf9f8ff,
                emissive: 0x3c3f5e,
                emissiveIntensity: 0.14,
                map: ivoryTex,
                roughness: 0.42,
                metalness: 0.03,
                clearcoat: 0.32,
                clearcoatRoughness: 0.22,
                side: THREE.DoubleSide
            });
            const crystalFrameMat = new THREE.MeshPhysicalMaterial({
                color: 0xead19d,
                emissive: 0x6e4f1d,
                emissiveIntensity: 0.2,
                metalness: 0.92,
                roughness: 0.22,
                clearcoat: 0.84,
                clearcoatRoughness: 0.16
            });
            const crystalMat = new THREE.MeshPhysicalMaterial({
                color: 0x96f0ff,
                emissive: 0x51dcff,
                emissiveIntensity: 1.65,
                transmission: 0.56,
                thickness: 0.38,
                roughness: 0.05,
                metalness: 0.04,
                clearcoat: 0.86,
                clearcoatRoughness: 0.08,
                ior: 1.18
            });
            const chestCoreMat = new THREE.MeshBasicMaterial({
                color: 0xe4fbff,
                transparent: true,
                opacity: 0.84,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                toneMapped: false
            });
            const lowerCoreMat = chestCoreMat.clone();
            const sigilMat = new THREE.MeshBasicMaterial({
                color: 0x7ce9ff,
                transparent: true,
                opacity: 0.34,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                toneMapped: false
            });

            const capePanels = [];
            function makeCapePanel(dir, options = {}) {
                const {
                    widthTop = 1.0,
                    widthMid = 2.0,
                    widthBottom = 1.55,
                    length = 5.4,
                    z = 0.2,
                    yOffset = 0,
                    twist = 0,
                    phaseOffset = 0,
                    material = cloakMat
                } = options;

                const mx = (x) => x * dir;
                const shape = new THREE.Shape();
                shape.moveTo(mx(0.02), 0.88);
                shape.bezierCurveTo(mx(widthTop * 0.3), 0.78, mx(widthTop), 0.18, mx(widthMid), -1.58);
                shape.bezierCurveTo(mx(widthMid + 0.38), -2.78, mx(widthBottom + 0.28), -4.72, mx(widthBottom * 0.76), -length);
                shape.quadraticCurveTo(mx(widthBottom * 0.22), -length + 0.16, mx(0.06), -length + 0.9);
                shape.quadraticCurveTo(mx(-0.02), -2.62, mx(0.02), 0.88);
                shape.closePath();

                const geo = new THREE.ExtrudeGeometry(shape, {
                    depth: 0.1,
                    bevelEnabled: true,
                    bevelThickness: 0.018,
                    bevelSize: 0.018,
                    bevelSegments: 1,
                    curveSegments: 48
                });
                geo.translate(0, 0, -0.05);

                const pos = geo.attributes.position;
                for (let i = 0; i < pos.count; i++) {
                    const x = pos.getX(i);
                    const y = pos.getY(i);
                    const zPos = pos.getZ(i);
                    const nx = THREE.MathUtils.clamp(Math.abs(x) / (widthMid + 0.62), 0, 1);
                    const ny = THREE.MathUtils.clamp((y + length) / (length + 0.88), 0, 1);
                    const camber = 0.14 + nx * 0.22 - Math.pow(ny, 1.3) * 0.12;
                    const fold = Math.sin(nx * 8.3 + ny * 5.5) * 0.015;
                    pos.setZ(i, zPos + camber + fold);
                }
                pos.needsUpdate = true;
                geo.computeVertexNormals();

                const panel = new THREE.Mesh(geo, material);
                panel.position.set(0, yOffset, z);
                panel.rotation.y = dir * (0.08 + twist * 0.4);
                panel.rotation.z = dir * twist;
                panel.renderOrder = 4;
                panel.userData.baseRotationY = panel.rotation.y;
                panel.userData.baseRotationZ = panel.rotation.z;
                panel.userData.phase = phaseOffset + (dir > 0 ? 0.84 : 1.62);
                capePanels.push(panel);
                return panel;
            }

            const collarOuter = new THREE.Mesh(new THREE.TorusGeometry(2.08, 0.23, 24, 180), goldMat);
            collarOuter.rotation.x = Math.PI * 0.5;
            collarOuter.position.set(0, 0.26, 0.02);
            g.add(collarOuter);

            const collarInner = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.16, 20, 160), goldDarkMat);
            collarInner.rotation.x = Math.PI * 0.5;
            collarInner.position.set(0, 0.16, -0.02);
            g.add(collarInner);

            const throatGeo = new THREE.CylinderGeometry(1.92, 2.12, 1.2, 120, 16, true);
            const throatPos = throatGeo.attributes.position;
            for (let i = 0; i < throatPos.count; i++) {
                const x = throatPos.getX(i);
                const y = throatPos.getY(i);
                const z = throatPos.getZ(i);
                const theta = Math.atan2(z, x);
                const v = (y + 0.6) / 1.2;
                const front = Math.max(0, Math.sin(theta));
                const crest = Math.pow(Math.max(0, Math.cos(theta * 2.0)), 4.2) * 0.18;
                const notch = front * THREE.MathUtils.smoothstep(v, 0.48, 1.0) * 0.28;
                const ny = y + crest * THREE.MathUtils.smoothstep(v, 0.54, 1.0) - notch;
                const radial = 1 + crest * 0.04;
                throatPos.setXYZ(i, x * radial, ny, z * radial);
            }
            throatPos.needsUpdate = true;
            throatGeo.computeVertexNormals();
            const throatShell = new THREE.Mesh(throatGeo, goldDarkMat);
            throatShell.position.y = 0.2;
            g.add(throatShell);

            const flameMats = [];
            const flameGroups = [];
            const flameLights = [];

            function makeShoulderPauldron(dir) {
                const shoulder = new THREE.Group();
                shoulder.position.set(dir * 2.16, -0.5, 0.46);
                shoulder.rotation.set(0.1, dir * 0.16, dir * -0.26);

                const shell = new THREE.Mesh(
                    new THREE.SphereGeometry(0.9, 42, 28, 0, Math.PI * 2, 0.12, Math.PI * 0.8),
                    armorMat
                );
                shell.scale.set(1.34, 0.62, 1.12);
                shoulder.add(shell);

                const shellPlate = new THREE.Mesh(
                    new THREE.SphereGeometry(0.86, 34, 22, 0, Math.PI * 2, 0.18, Math.PI * 0.62),
                    goldDarkMat
                );
                shellPlate.scale.set(1.06, 0.44, 0.9);
                shellPlate.position.set(dir * 0.04, -0.22, 0.18);
                shoulder.add(shellPlate);

                const shellRim = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.085, 14, 96, Math.PI * 1.34), goldMat);
                shellRim.rotation.set(Math.PI * 0.5, 0, dir > 0 ? -0.42 : 0.42);
                shellRim.position.set(dir * 0.06, -0.04, 0.34);
                shoulder.add(shellRim);

                const upperFlare = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.92, 18, 1, true), goldMat);
                upperFlare.position.set(dir * 0.38, 0.22, 0.42);
                upperFlare.rotation.set(Math.PI * 0.5, 0, dir > 0 ? -0.78 : 0.78);
                upperFlare.scale.set(1.0, 1.0, 0.48);
                shoulder.add(upperFlare);

                const lowerLobe = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.78, 18, 1, true), goldDarkMat);
                lowerLobe.position.set(dir * 0.44, -0.36, 0.26);
                lowerLobe.rotation.set(Math.PI * 0.5, 0, dir > 0 ? -1.18 : 1.18);
                lowerLobe.scale.set(1.0, 1.0, 0.5);
                shoulder.add(lowerLobe);

                const blade = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.22, 24, 1, true), armorMat);
                blade.position.set(dir * 0.5, -0.24, 0.16);
                blade.rotation.set(Math.PI * 0.5, 0, dir > 0 ? -1.0 : 1.0);
                blade.scale.set(1.0, 1.0, 0.72);
                shoulder.add(blade);

                const bladeTrim = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.9, 22, 1, true), goldMat);
                bladeTrim.position.set(dir * 0.5, -0.24, 0.28);
                bladeTrim.rotation.copy(blade.rotation);
                bladeTrim.scale.set(0.9, 0.9, 0.55);
                shoulder.add(bladeTrim);

                const crestSpike = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.82, 14), goldMat);
                crestSpike.position.set(dir * 0.62, 0.16, 0.56);
                crestSpike.rotation.set(-0.08, 0, dir > 0 ? -Math.PI * 0.32 : Math.PI * 0.32);
                shoulder.add(crestSpike);

                const flameGroup = new THREE.Group();
                flameGroup.position.set(dir * 0.46, 0.92, 0.68);

                const flameMatA = new THREE.MeshBasicMaterial({
                    map: flameTex,
                    color: 0x9bf4ff,
                    transparent: true,
                    opacity: 0.78,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                    toneMapped: false
                });
                const flameMatB = new THREE.MeshBasicMaterial({
                    map: flameTex,
                    color: 0x7fd9ff,
                    transparent: true,
                    opacity: 0.58,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                    toneMapped: false
                });
                flameMats.push(flameMatA, flameMatB);

                const flamePlaneA = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.46), flameMatA);
                flamePlaneA.position.y = 0.44;
                flameGroup.add(flamePlaneA);

                const flamePlaneB = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 1.1), flameMatB);
                flamePlaneB.rotation.y = Math.PI * 0.5;
                flamePlaneB.position.y = 0.36;
                flameGroup.add(flamePlaneB);

                flameGroup.rotation.y = dir * 0.3;
                flameGroup.userData.baseY = flameGroup.position.y;
                flameGroup.userData.phase = dir > 0 ? 0.4 : 1.1;
                flameGroups.push(flameGroup);
                shoulder.add(flameGroup);

                const flameLight = new THREE.PointLight(0x8deaff, 0.92, 6.4, 2);
                flameLight.position.set(dir * 0.24, 0.7, 0.78);
                flameLights.push(flameLight);
                shoulder.add(flameLight);

                return shoulder;
            }

            g.add(makeShoulderPauldron(-1), makeShoulderPauldron(1));

            const sideOuterLeft = makeCapePanel(-1, {
                widthTop: 1.18,
                widthMid: 2.54,
                widthBottom: 2.18,
                length: 5.74,
                z: 0.12,
                yOffset: -0.32,
                twist: 0.1,
                phaseOffset: 0.2,
                material: cloakMat
            });
            const sideOuterRight = makeCapePanel(1, {
                widthTop: 1.18,
                widthMid: 2.54,
                widthBottom: 2.18,
                length: 5.74,
                z: 0.12,
                yOffset: -0.32,
                twist: 0.1,
                phaseOffset: 0.8,
                material: cloakMat
            });

            const sideInnerLeft = makeCapePanel(-1, {
                widthTop: 0.9,
                widthMid: 1.82,
                widthBottom: 1.46,
                length: 5.34,
                z: 0.46,
                yOffset: -0.44,
                twist: 0.06,
                phaseOffset: 1.2,
                material: innerMat
            });
            const sideInnerRight = makeCapePanel(1, {
                widthTop: 0.9,
                widthMid: 1.82,
                widthBottom: 1.46,
                length: 5.34,
                z: 0.46,
                yOffset: -0.44,
                twist: 0.06,
                phaseOffset: 1.7,
                material: innerMat
            });

            const frontLeft = makeCapePanel(-1, {
                widthTop: 0.64,
                widthMid: 1.18,
                widthBottom: 1.06,
                length: 5.88,
                z: 0.78,
                yOffset: -0.58,
                twist: 0.04,
                phaseOffset: 2.2,
                material: cloakMat
            });
            const frontRight = makeCapePanel(1, {
                widthTop: 0.64,
                widthMid: 1.18,
                widthBottom: 1.06,
                length: 5.88,
                z: 0.78,
                yOffset: -0.58,
                twist: 0.04,
                phaseOffset: 2.7,
                material: cloakMat
            });

            sideOuterLeft.position.x = -0.44;
            sideOuterRight.position.x = 0.44;
            sideInnerLeft.position.x = -0.28;
            sideInnerRight.position.x = 0.28;
            frontLeft.position.x = -0.58;
            frontRight.position.x = 0.58;

            g.add(sideOuterLeft, sideOuterRight, sideInnerLeft, sideInnerRight, frontLeft, frontRight);

            const torsoGeo = new THREE.CylinderGeometry(1.44, 0.98, 4.76, 110, 26, true);
            const torsoPos = torsoGeo.attributes.position;
            for (let i = 0; i < torsoPos.count; i++) {
                const x = torsoPos.getX(i);
                const y = torsoPos.getY(i);
                const z = torsoPos.getZ(i);
                const theta = Math.atan2(z, x);
                const v = (y + 2.38) / 4.76;
                const front = Math.max(0, Math.sin(theta));
                const ridge = Math.pow(Math.max(0, Math.cos(theta * 3.0)), 3.1) * 0.11;
                const flare = Math.pow(1 - v, 1.55) * 0.22;
                const radial = 1 + ridge * 0.06 + flare * 0.08 - front * 0.04;
                const ny = y + front * (1 - v) * 0.1;
                torsoPos.setXYZ(i, x * radial, ny, z * (1 + ridge * 0.08));
            }
            torsoPos.needsUpdate = true;
            torsoGeo.computeVertexNormals();
            const torsoShell = new THREE.Mesh(torsoGeo, armorMat);
            torsoShell.position.set(0, -1.44, 0.32);
            g.add(torsoShell);

            const centerSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 4.7, 24, 16, true), goldDarkMat);
            centerSpine.position.set(0, -1.56, 0.96);
            g.add(centerSpine);

            function addFiligree(dir, yShift = 0) {
                const points = [
                    new THREE.Vector3(0, -0.78 + yShift, 0.98),
                    new THREE.Vector3(dir * 0.56, -1.14 + yShift, 0.98),
                    new THREE.Vector3(dir * 0.86, -1.96 + yShift, 0.92),
                    new THREE.Vector3(dir * 0.62, -3.18 + yShift, 0.9),
                    new THREE.Vector3(dir * 0.28, -4.42 + yShift, 0.84)
                ];
                const curve = new THREE.CatmullRomCurve3(points);
                const filigree = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.048, 10, false), goldMat);
                g.add(filigree);
            }

            addFiligree(-1, 0);
            addFiligree(1, 0);
            addFiligree(-1, 0.34);
            addFiligree(1, 0.34);

            const chestFrame = new THREE.Mesh(new THREE.OctahedronGeometry(0.88, 0), crystalFrameMat);
            chestFrame.scale.set(1.72, 1.42, 0.54);
            chestFrame.position.set(0, -1.18, 1.02);
            g.add(chestFrame);

            const chestCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 1), crystalMat);
            chestCrystal.scale.set(1.18, 1.42, 0.82);
            chestCrystal.position.set(0, -1.18, 1.12);
            g.add(chestCrystal);

            const chestCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), chestCoreMat);
            chestCore.scale.set(0.95, 1.18, 0.85);
            chestCore.position.copy(chestCrystal.position);
            chestCore.position.z += 0.02;
            g.add(chestCore);

            const chestLight = new THREE.PointLight(0x85ecff, 1.16, 9.2, 2);
            chestLight.position.set(0, -1.04, 1.3);
            g.add(chestLight);

            function addChestWing(dir) {
                const wing = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.22, 20, 1, true), goldMat);
                wing.position.set(dir * 0.96, -1.2, 0.98);
                wing.rotation.set(Math.PI * 0.5, 0, dir > 0 ? -0.94 : 0.94);
                wing.scale.set(1, 1, 0.44);
                g.add(wing);

                const wingInset = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.92, 18, 1, true), armorMat);
                wingInset.position.set(dir * 0.95, -1.2, 1.08);
                wingInset.rotation.copy(wing.rotation);
                wingInset.scale.set(0.9, 0.9, 0.36);
                g.add(wingInset);
            }
            addChestWing(-1);
            addChestWing(1);

            const chestCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), goldMat);
            chestCrest.scale.set(1.0, 1.6, 0.28);
            chestCrest.position.set(0, -0.44, 1.04);
            g.add(chestCrest);

            const lowerFrame = new THREE.Mesh(new THREE.OctahedronGeometry(0.74, 0), crystalFrameMat);
            lowerFrame.scale.set(1.28, 1.48, 0.46);
            lowerFrame.position.set(0, -5.06, 0.74);
            g.add(lowerFrame);

            const lowerCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 1), crystalMat);
            lowerCrystal.scale.set(1.0, 1.36, 0.76);
            lowerCrystal.position.set(0, -5.06, 0.82);
            g.add(lowerCrystal);

            const lowerCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), lowerCoreMat);
            lowerCore.scale.set(0.92, 1.22, 0.84);
            lowerCore.position.copy(lowerCrystal.position);
            lowerCore.position.z += 0.02;
            g.add(lowerCore);

            const lowerLight = new THREE.PointLight(0x77dcff, 0.94, 7.8, 2);
            lowerLight.position.set(0, -4.96, 0.96);
            g.add(lowerLight);

            const lowerSigil = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.03, 12, 52), sigilMat);
            lowerSigil.rotation.x = Math.PI * 0.5;
            lowerSigil.position.set(0, -5.04, 0.78);
            g.add(lowerSigil);

            const centerTrim = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.74, 14), goldMat);
            centerTrim.position.set(0, -5.76, 0.68);
            centerTrim.rotation.x = Math.PI;
            g.add(centerTrim);

            const shoulderBridge = new THREE.Mesh(new THREE.TorusGeometry(1.84, 0.055, 14, 100, Math.PI), goldMat);
            shoulderBridge.rotation.set(Math.PI * 0.62, Math.PI, 0);
            shoulderBridge.position.set(0, 0.08, 1.0);
            g.add(shoulderBridge);

            g.scale.set(1.24, 1.24, 1.24);
            g.position.set(0, -1.76, 2.42);
            g.userData.excludeFromHeadTilt = true;
            g.userData.crystalMats = [crystalMat];
            g.userData.crystalCoreMats = [chestCoreMat, lowerCoreMat];
            g.userData.crystalLights = [chestLight, lowerLight];
            g.userData.flameMats = flameMats;
            g.userData.flameGroups = flameGroups;
            g.userData.flameLights = flameLights;
            g.userData.capePanels = capePanels;
            g.userData.lowerSigil = lowerSigil;
            return g;
        }

        function makeRoyalArmorBodyProp() {
            const g = new THREE.Group();
            const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

            const steelCanvas = document.createElement('canvas');
            steelCanvas.width = 1024;
            steelCanvas.height = 1024;
            const sCtx = steelCanvas.getContext('2d');

            const steelBase = sCtx.createLinearGradient(0, 0, 1024, 1024);
            steelBase.addColorStop(0.0, '#f3f2ff');
            steelBase.addColorStop(0.26, '#cacedf');
            steelBase.addColorStop(0.54, '#79809a');
            steelBase.addColorStop(0.78, '#3a3e59');
            steelBase.addColorStop(1.0, '#1d1f32');
            sCtx.fillStyle = steelBase;
            sCtx.fillRect(0, 0, 1024, 1024);

            for (let i = 0; i < 1600; i++) {
                const x = Math.random() * 1024;
                const y = Math.random() * 1024;
                const len = 8 + Math.random() * 80;
                const alpha = 0.02 + Math.random() * 0.08;
                sCtx.strokeStyle = `rgba(232,236,255,${alpha})`;
                sCtx.lineWidth = 0.5 + Math.random() * 1.8;
                sCtx.beginPath();
                sCtx.moveTo(x, y);
                sCtx.lineTo(x + len, y + (Math.random() - 0.5) * 7);
                sCtx.stroke();
            }

            for (let i = 0; i < 210; i++) {
                const x = Math.random() * 1024;
                const y = Math.random() * 1024;
                const r = 16 + Math.random() * 78;
                const halo = sCtx.createRadialGradient(x, y, 1, x, y, r);
                halo.addColorStop(0, `rgba(255,255,255,${0.025 + Math.random() * 0.08})`);
                halo.addColorStop(1, 'rgba(24,28,44,0)');
                sCtx.fillStyle = halo;
                sCtx.beginPath();
                sCtx.arc(x, y, r, 0, Math.PI * 2);
                sCtx.fill();
            }

            const steelTex = new THREE.CanvasTexture(steelCanvas);
            steelTex.colorSpace = THREE.SRGBColorSpace;
            steelTex.anisotropy = maxAnisotropy;
            steelTex.wrapS = steelTex.wrapT = THREE.RepeatWrapping;
            steelTex.repeat.set(1.35, 1.1);
            steelTex.needsUpdate = true;

            const membraneCanvas = document.createElement('canvas');
            membraneCanvas.width = 1024;
            membraneCanvas.height = 1024;
            const mCtx = membraneCanvas.getContext('2d');

            const membraneGrad = mCtx.createRadialGradient(400, 680, 60, 512, 512, 620);
            membraneGrad.addColorStop(0.0, 'rgba(255,255,255,0.95)');
            membraneGrad.addColorStop(0.38, 'rgba(212,239,255,0.9)');
            membraneGrad.addColorStop(0.72, 'rgba(169,216,255,0.55)');
            membraneGrad.addColorStop(1.0, 'rgba(130,188,255,0.06)');
            mCtx.fillStyle = membraneGrad;
            mCtx.fillRect(0, 0, 1024, 1024);

            mCtx.lineCap = 'round';
            for (let i = 0; i < 48; i++) {
                const x0 = 210 + Math.random() * 160;
                const y0 = 720 + Math.random() * 120;
                const x1 = 630 + Math.random() * 310;
                const y1 = 140 + Math.random() * 380;
                mCtx.strokeStyle = `rgba(228,246,255,${0.06 + Math.random() * 0.1})`;
                mCtx.lineWidth = 1 + Math.random() * 3;
                mCtx.beginPath();
                mCtx.moveTo(x0, y0);
                mCtx.quadraticCurveTo(
                    (x0 + x1) * 0.46,
                    y0 - (80 + Math.random() * 180),
                    x1,
                    y1
                );
                mCtx.stroke();
            }

            const membraneAlphaCanvas = document.createElement('canvas');
            membraneAlphaCanvas.width = 1024;
            membraneAlphaCanvas.height = 1024;
            const aCtx = membraneAlphaCanvas.getContext('2d');
            const alphaGrad = aCtx.createRadialGradient(420, 660, 80, 512, 512, 620);
            alphaGrad.addColorStop(0.0, 'rgba(255,255,255,1)');
            alphaGrad.addColorStop(0.52, 'rgba(255,255,255,0.92)');
            alphaGrad.addColorStop(0.86, 'rgba(255,255,255,0.42)');
            alphaGrad.addColorStop(1.0, 'rgba(255,255,255,0.03)');
            aCtx.fillStyle = alphaGrad;
            aCtx.fillRect(0, 0, 1024, 1024);

            const membraneTex = new THREE.CanvasTexture(membraneCanvas);
            membraneTex.colorSpace = THREE.SRGBColorSpace;
            membraneTex.anisotropy = maxAnisotropy;
            membraneTex.needsUpdate = true;

            const membraneAlphaTex = new THREE.CanvasTexture(membraneAlphaCanvas);
            membraneAlphaTex.anisotropy = maxAnisotropy;
            membraneAlphaTex.needsUpdate = true;

            const steelBrightMat = new THREE.MeshPhysicalMaterial({
                color: 0xdadcf2,
                map: steelTex,
                emissive: 0x1b1e36,
                emissiveIntensity: 0.14,
                metalness: 0.95,
                roughness: 0.24,
                clearcoat: 0.96,
                clearcoatRoughness: 0.1,
                envMapIntensity: 0.9
            });
            const steelDarkMat = new THREE.MeshPhysicalMaterial({
                color: 0x2f3150,
                map: steelTex,
                emissive: 0x131728,
                emissiveIntensity: 0.18,
                metalness: 0.9,
                roughness: 0.34,
                clearcoat: 0.62,
                clearcoatRoughness: 0.2,
                envMapIntensity: 0.68
            });
            const goldMat = new THREE.MeshPhysicalMaterial({
                color: 0xe5c37a,
                emissive: 0x6d4e20,
                emissiveIntensity: 0.26,
                metalness: 0.98,
                roughness: 0.18,
                clearcoat: 1,
                clearcoatRoughness: 0.08,
                envMapIntensity: 0.94
            });
            const goldDarkMat = new THREE.MeshPhysicalMaterial({
                color: 0xa67a44,
                emissive: 0x3f2a12,
                emissiveIntensity: 0.2,
                metalness: 0.92,
                roughness: 0.24,
                clearcoat: 0.76,
                clearcoatRoughness: 0.16,
                envMapIntensity: 0.7
            });
            const gemFrameMat = new THREE.MeshPhysicalMaterial({
                color: 0xf0d399,
                emissive: 0x6c5224,
                emissiveIntensity: 0.22,
                metalness: 0.95,
                roughness: 0.16,
                clearcoat: 0.92,
                clearcoatRoughness: 0.12
            });
            const gemMat = new THREE.MeshPhysicalMaterial({
                color: 0x8ed8ff,
                emissive: 0x3bc0ff,
                emissiveIntensity: 1.5,
                transmission: 0.68,
                thickness: 0.4,
                roughness: 0.08,
                metalness: 0.04,
                clearcoat: 0.94,
                clearcoatRoughness: 0.08,
                ior: 1.18
            });
            const gemCoreMat = new THREE.MeshBasicMaterial({
                color: 0xe9fbff,
                transparent: true,
                opacity: 0.82,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                toneMapped: false
            });
            const membraneLeftMat = new THREE.MeshPhysicalMaterial({
                color: 0xdff4ff,
                map: membraneTex,
                alphaMap: membraneAlphaTex,
                emissiveMap: membraneTex,
                emissive: 0x7fcfff,
                emissiveIntensity: 0.48,
                metalness: 0.0,
                roughness: 0.26,
                transmission: 0.86,
                thickness: 0.18,
                ior: 1.12,
                transparent: true,
                opacity: 0.64,
                alphaTest: 0.04,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            const membraneRightMat = membraneLeftMat.clone();

            const collarOuter = new THREE.Mesh(new THREE.TorusGeometry(2.04, 0.26, 24, 180), steelDarkMat);
            collarOuter.rotation.x = Math.PI * 0.5;
            collarOuter.position.set(0, 0.12, 0.02);
            g.add(collarOuter);

            const collarInner = new THREE.Mesh(new THREE.TorusGeometry(1.74, 0.18, 20, 160), goldDarkMat);
            collarInner.rotation.x = Math.PI * 0.5;
            collarInner.position.set(0, 0.04, 0.05);
            g.add(collarInner);

            const collarLip = new THREE.Mesh(new THREE.TorusGeometry(2.14, 0.075, 14, 176), goldMat);
            collarLip.rotation.x = Math.PI * 0.5;
            collarLip.position.set(0, 0.25, 0.08);
            g.add(collarLip);

            const neckGuard = new THREE.Mesh(
                new THREE.CylinderGeometry(1.82, 2.04, 1.02, 96, 14, true),
                steelDarkMat
            );
            const neckPos = neckGuard.geometry.attributes.position;
            for (let i = 0; i < neckPos.count; i++) {
                const x = neckPos.getX(i);
                const y = neckPos.getY(i);
                const z = neckPos.getZ(i);
                const theta = Math.atan2(z, x);
                const v = (y + 0.51) / 1.02;
                const front = Math.max(0, Math.sin(theta));
                const crest = Math.pow(Math.max(0, Math.cos(theta * 2.0)), 4.0) * 0.12;
                const notch = front * THREE.MathUtils.smoothstep(v, 0.46, 1.0) * 0.24;
                neckPos.setXYZ(i, x * (1 + crest * 0.04), y + crest * 0.08 - notch, z * (1 + crest * 0.05));
            }
            neckPos.needsUpdate = true;
            neckGuard.geometry.computeVertexNormals();
            neckGuard.position.set(0, 0.02, 0.22);
            g.add(neckGuard);

            function makeRoyalShoulder(dir) {
                const shoulder = new THREE.Group();
                shoulder.position.set(dir * 2.12, -0.38, 0.66);
                shoulder.rotation.set(0.1, dir * 0.18, dir * -0.24);

                const shellOuter = new THREE.Mesh(
                    new THREE.SphereGeometry(0.92, 42, 28, 0, Math.PI * 2, 0.1, Math.PI * 0.72),
                    steelBrightMat
                );
                shellOuter.scale.set(1.46, 0.64, 1.04);
                shoulder.add(shellOuter);

                const shellInner = new THREE.Mesh(
                    new THREE.SphereGeometry(0.84, 34, 22, 0, Math.PI * 2, 0.2, Math.PI * 0.58),
                    steelDarkMat
                );
                shellInner.scale.set(1.22, 0.46, 0.84);
                shellInner.position.set(dir * 0.04, -0.18, 0.2);
                shoulder.add(shellInner);

                const shellRim = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.09, 14, 98, Math.PI * 1.28), goldMat);
                shellRim.rotation.set(Math.PI * 0.52, 0, dir > 0 ? -0.46 : 0.46);
                shellRim.position.set(dir * 0.08, 0.0, 0.36);
                shoulder.add(shellRim);

                for (let i = 0; i < 3; i++) {
                    const lamella = new THREE.Mesh(new THREE.ConeGeometry(0.46 - i * 0.08, 0.78 - i * 0.08, 20, 1, true), steelDarkMat);
                    lamella.position.set(dir * (0.18 + i * 0.16), -0.28 - i * 0.22, 0.2 - i * 0.06);
                    lamella.rotation.set(Math.PI * 0.5, 0, dir > 0 ? -1.08 + i * 0.08 : 1.08 - i * 0.08);
                    lamella.scale.set(1.0, 1.0, 0.48 - i * 0.08);
                    shoulder.add(lamella);
                }

                const crestBlade = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.78, 14), goldMat);
                crestBlade.position.set(dir * 0.58, 0.16, 0.58);
                crestBlade.rotation.set(-0.12, 0, dir > 0 ? -Math.PI * 0.34 : Math.PI * 0.34);
                shoulder.add(crestBlade);

                const cheekFang = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.68, 14), goldDarkMat);
                cheekFang.position.set(dir * 0.62, -0.34, 0.34);
                cheekFang.rotation.set(0.08, 0, dir > 0 ? -Math.PI * 0.5 : Math.PI * 0.5);
                shoulder.add(cheekFang);

                return shoulder;
            }

            g.add(makeRoyalShoulder(-1), makeRoyalShoulder(1));

            function makeRoyalFrontPlateGeometry() {
                const shape = new THREE.Shape();
                shape.moveTo(0, 1.72);
                shape.bezierCurveTo(0.9, 1.54, 1.78, 0.94, 2.02, 0.14);
                shape.bezierCurveTo(2.18, -0.48, 1.92, -1.42, 1.34, -2.24);
                shape.bezierCurveTo(0.92, -2.82, 0.5, -3.24, 0, -3.88);
                shape.bezierCurveTo(-0.5, -3.24, -0.92, -2.82, -1.34, -2.24);
                shape.bezierCurveTo(-1.92, -1.42, -2.18, -0.48, -2.02, 0.14);
                shape.bezierCurveTo(-1.78, 0.94, -0.9, 1.54, 0, 1.72);
                shape.closePath();

                const geo = new THREE.ExtrudeGeometry(shape, {
                    depth: 0.36,
                    bevelEnabled: true,
                    bevelThickness: 0.055,
                    bevelSize: 0.06,
                    bevelSegments: 3,
                    curveSegments: 72
                });
                geo.translate(0, 0, -0.18);

                const pos = geo.attributes.position;
                for (let i = 0; i < pos.count; i++) {
                    const x = pos.getX(i);
                    const y = pos.getY(i);
                    const z = pos.getZ(i);
                    const nx = THREE.MathUtils.clamp(Math.abs(x) / 2.2, 0, 1);
                    const ny = THREE.MathUtils.clamp((y + 3.88) / (1.72 + 3.88), 0, 1);
                    const curvature = 0.34 * (1 - nx * 0.62) - Math.pow(ny, 1.36) * 0.12;
                    const ridge = (1 - nx) * Math.exp(-Math.pow((y + 1.32) * 0.46, 2)) * 0.11;
                    const flare = Math.pow(1 - ny, 1.58) * nx * 0.08;
                    pos.setXYZ(i, x * (1 + flare), y, z + curvature + ridge);
                }
                pos.needsUpdate = true;
                geo.computeVertexNormals();
                return geo;
            }

            const frontFrameGeo = makeRoyalFrontPlateGeometry();
            const frontFrame = new THREE.Mesh(frontFrameGeo, goldMat);
            frontFrame.position.set(0, -1.36, 1.08);
            g.add(frontFrame);

            const frontSteel = new THREE.Mesh(frontFrameGeo.clone(), steelDarkMat);
            frontSteel.position.set(0, -1.44, 1.16);
            frontSteel.scale.set(0.9, 0.9, 0.72);
            g.add(frontSteel);

            const frontSilverRim = new THREE.Mesh(frontFrameGeo.clone(), steelBrightMat);
            frontSilverRim.position.set(0, -1.36, 1.18);
            frontSilverRim.scale.set(0.98, 0.98, 0.84);
            g.add(frontSilverRim);

            const torsoShell = new THREE.Mesh(
                new THREE.CylinderGeometry(1.64, 1.18, 3.82, 110, 24, true),
                steelDarkMat
            );
            const torsoPos = torsoShell.geometry.attributes.position;
            for (let i = 0; i < torsoPos.count; i++) {
                const x = torsoPos.getX(i);
                const y = torsoPos.getY(i);
                const z = torsoPos.getZ(i);
                const theta = Math.atan2(z, x);
                const v = (y + 1.91) / 3.82;
                const front = Math.max(0, Math.sin(theta));
                const sideBevel = Math.pow(Math.max(0, Math.cos(theta * 3.0)), 3.1) * 0.1;
                const waistTaper = Math.pow(1 - v, 1.5) * 0.14;
                const radial = 1 + sideBevel * 0.06 + waistTaper * 0.06 - front * 0.035;
                torsoPos.setXYZ(i, x * radial, y + front * (1 - v) * 0.08, z * (1 + sideBevel * 0.08));
            }
            torsoPos.needsUpdate = true;
            torsoShell.geometry.computeVertexNormals();
            torsoShell.position.set(0, -2.08, 0.66);
            g.add(torsoShell);

            const centerSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 3.64, 20, 14, true), goldDarkMat);
            centerSpine.position.set(0, -2.06, 1.02);
            g.add(centerSpine);

            function addFiligree(points, radius = 0.05, material = goldMat) {
                const filigree = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, radius, 10, false), material);
                g.add(filigree);
                return filigree;
            }

            for (const dir of [-1, 1]) {
                addFiligree([
                    new THREE.Vector3(0, -0.8, 1.24),
                    new THREE.Vector3(dir * 0.58, -1.02, 1.3),
                    new THREE.Vector3(dir * 1.12, -1.58, 1.26),
                    new THREE.Vector3(dir * 1.24, -2.26, 1.16),
                    new THREE.Vector3(dir * 0.92, -2.84, 1.06)
                ], 0.048, goldMat);

                addFiligree([
                    new THREE.Vector3(dir * 0.2, -1.4, 1.22),
                    new THREE.Vector3(dir * 0.66, -1.78, 1.3),
                    new THREE.Vector3(dir * 0.86, -2.24, 1.24),
                    new THREE.Vector3(dir * 0.58, -2.7, 1.12)
                ], 0.036, goldDarkMat);
            }

            function addCheekBlade(dir) {
                const blade = new THREE.Mesh(new THREE.ConeGeometry(0.31, 1.36, 22, 1, true), steelBrightMat);
                blade.position.set(dir * 1.5, -1.56, 1.06);
                blade.rotation.set(Math.PI * 0.5, 0, dir > 0 ? -0.98 : 0.98);
                blade.scale.set(1.0, 1.0, 0.48);
                g.add(blade);

                const bladeTrim = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.08, 20, 1, true), goldMat);
                bladeTrim.position.set(dir * 1.48, -1.56, 1.18);
                bladeTrim.rotation.copy(blade.rotation);
                bladeTrim.scale.set(0.9, 0.9, 0.34);
                g.add(bladeTrim);
            }
            addCheekBlade(-1);
            addCheekBlade(1);

            const bridgeSpike = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), goldMat);
            bridgeSpike.scale.set(1.0, 1.7, 0.28);
            bridgeSpike.position.set(0, -0.46, 1.4);
            g.add(bridgeSpike);

            const gemFrame = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 0), gemFrameMat);
            gemFrame.scale.set(1.16, 1.68, 0.52);
            gemFrame.position.set(0, -2.24, 1.54);
            g.add(gemFrame);

            const gemCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 1), gemMat);
            gemCrystal.scale.set(0.92, 1.5, 0.94);
            gemCrystal.position.set(0, -2.24, 1.62);
            g.add(gemCrystal);

            const gemCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), gemCoreMat);
            gemCore.scale.set(0.95, 1.24, 0.88);
            gemCore.position.copy(gemCrystal.position);
            gemCore.position.z += 0.02;
            g.add(gemCore);

            const gemLight = new THREE.PointLight(0x71dbff, 1.08, 8.6, 2);
            gemLight.position.set(0, -2.12, 1.86);
            g.add(gemLight);

            const gemRing = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.045, 12, 62), goldMat);
            gemRing.rotation.x = Math.PI * 0.5;
            gemRing.position.set(0, -2.26, 1.44);
            g.add(gemRing);

            const lowerChevron = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), goldMat);
            lowerChevron.scale.set(1.04, 1.88, 0.26);
            lowerChevron.position.set(0, -3.62, 1.16);
            g.add(lowerChevron);

            const lowerDagger = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.72, 12), goldDarkMat);
            lowerDagger.position.set(0, -4.0, 1.06);
            lowerDagger.rotation.x = Math.PI;
            g.add(lowerDagger);

            function makeMembraneGeometry() {
                const shape = new THREE.Shape();
                shape.moveTo(0.0, 0.0);
                shape.bezierCurveTo(0.86, 0.3, 1.92, 1.12, 2.72, 2.36);
                shape.bezierCurveTo(3.28, 3.22, 3.62, 4.06, 3.86, 4.62);
                shape.bezierCurveTo(3.1, 4.46, 2.14, 4.0, 1.26, 3.32);
                shape.bezierCurveTo(0.56, 2.72, 0.14, 1.9, 0.02, 1.08);
                shape.quadraticCurveTo(-0.04, 0.48, 0.0, 0.0);
                shape.closePath();

                const geo = new THREE.ShapeGeometry(shape, 84);
                geo.computeBoundingBox();
                const bounds = geo.boundingBox;
                const spanX = Math.max(0.001, bounds.max.x - bounds.min.x);
                const spanY = Math.max(0.001, bounds.max.y - bounds.min.y);
                const pos = geo.attributes.position;
                const uv = new Float32Array(pos.count * 2);
                for (let i = 0; i < pos.count; i++) {
                    const x = pos.getX(i);
                    const y = pos.getY(i);
                    const nx = THREE.MathUtils.clamp((x - bounds.min.x) / spanX, 0, 1);
                    const ny = THREE.MathUtils.clamp((y - bounds.min.y) / spanY, 0, 1);
                    const camber = 0.06 + nx * 0.2 - Math.pow(ny, 1.35) * 0.08;
                    const ripple = Math.sin(nx * 9.2 + ny * 5.8) * 0.01;
                    pos.setZ(i, camber + ripple);
                    uv[i * 2] = nx;
                    uv[i * 2 + 1] = 1 - ny;
                }
                geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
                pos.needsUpdate = true;
                geo.computeVertexNormals();
                return geo;
            }

            const membraneGeo = makeMembraneGeometry();
            const leftMembrane = new THREE.Mesh(membraneGeo, membraneLeftMat);
            leftMembrane.position.set(-1.64, 0.78, -1.22);
            leftMembrane.rotation.set(0.08, 0.44, -0.14);
            leftMembrane.scale.set(-0.96, 0.96, 1.0);
            leftMembrane.renderOrder = 1;
            leftMembrane.userData.baseRotation = leftMembrane.rotation.clone();
            g.add(leftMembrane);

            const rightMembrane = new THREE.Mesh(membraneGeo.clone(), membraneRightMat);
            rightMembrane.position.set(1.64, 0.78, -1.22);
            rightMembrane.rotation.set(0.08, -0.44, 0.14);
            rightMembrane.scale.set(0.96, 0.96, 1.0);
            rightMembrane.renderOrder = 1;
            rightMembrane.userData.baseRotation = rightMembrane.rotation.clone();
            g.add(rightMembrane);

            const leftWingLight = new THREE.PointLight(0x8fdfff, 0.36, 6.2, 2);
            leftWingLight.position.set(-2.12, 1.14, -0.78);
            g.add(leftWingLight);

            const rightWingLight = new THREE.PointLight(0x8fdfff, 0.36, 6.2, 2);
            rightWingLight.position.set(2.12, 1.14, -0.78);
            g.add(rightWingLight);

            g.scale.set(1.16, 1.16, 1.16);
            g.position.set(0, -0.96, 2.3);
            g.userData.excludeFromHeadTilt = true;
            g.userData.gemMats = [gemMat];
            g.userData.gemCoreMats = [gemCoreMat];
            g.userData.gemLight = gemLight;
            g.userData.wingMats = [membraneLeftMat, membraneRightMat];
            g.userData.wingMeshes = [leftMembrane, rightMembrane];
            g.userData.wingLights = [leftWingLight, rightWingLight];
            g.userData.frameMats = [goldMat, goldDarkMat, gemFrameMat];
            return g;
        }

        function makeEyeStyleProp(styleKey) {
            const g = new THREE.Group();
            g.userData.eyePreset = styleKey;
            return g;
        }

        // Manifest-first prop registration: add new props by appending one entry.
        const PROP_DEFINITIONS = [
            { key: 'crown', category: 'headWear', prewarmPriority: 2, create: makeSimpleGoldCrown },
            { key: 'wizardHat', category: 'headWear', prewarmPriority: 2, create: makeWizardHatProp },
            { key: 'halo', category: 'headWear', prewarmPriority: 2, create: makeCelestialHaloProp },
            { key: 'ramHorns', category: 'headWear', prewarmPriority: 2, create: makeRamHornsProp },
            { key: 'devilHorns', category: 'headWear', prewarmPriority: 2, create: makeDevilHornsProp },
            { key: 'unicornHorn', category: 'headWear', prewarmPriority: 2, create: makeUnicornHornProp },
            { key: 'archonBody', category: 'body', prewarmPriority: 3, create: makeArchonBodyProp },
            { key: 'royalArmorBody', category: 'body', prewarmPriority: 3, create: makeRoyalArmorBodyProp },
            { key: 'protectorRingBody', category: 'body', prewarmPriority: 3, create: makeProtectorRingBodyProp },
            { key: 'catEyes', category: 'eyes', prewarmPriority: 1, eyePreset: 'catEyes', create: () => makeEyeStyleProp('catEyes') },
            { key: 'arcaneEyes', category: 'eyes', prewarmPriority: 1, eyePreset: 'arcaneEyes', create: () => makeEyeStyleProp('arcaneEyes') },
            { key: 'demonEyes', category: 'eyes', prewarmPriority: 1, eyePreset: 'demonEyes', create: () => makeEyeStyleProp('demonEyes') },
            { key: 'cosmicEyes', category: 'eyes', prewarmPriority: 1, eyePreset: 'cosmicEyes', create: () => makeEyeStyleProp('cosmicEyes') },
            { key: 'alphaWings', category: 'wingSet', prewarmPriority: 4, create: makeAlphaWingsProp },
            { key: 'rainbowWings', category: 'wingSet', prewarmPriority: 4, create: makeRainbowWingsProp },
            { key: 'roboticWings', category: 'wingSet', prewarmPriority: 4, create: makeRoboticWingsProp },
            { key: 'omegaWings', category: 'wingSet', prewarmPriority: 4, create: makeOmegaWingsProp }
        ];
        const SINGLE_EQUIP_CATEGORIES = new Set(['wingSet', 'headWear', 'eyes', 'body', 'other']);
        const CATEGORY_EQUIP_LIMITS = {
            wingSet: 1,
            headWear: 1,
            eyes: 1,
            body: 1,
            other: 1
        };
        const INVENTORY_LIMIT_PER_CATEGORY = 5;
        const INVENTORY_CATEGORIES = ['wingSet', 'headWear', 'eyes', 'body', 'other'];

        const propRegistry = new Map();
        const propObjects = {};
        const eyeStylePropToPreset = {};
        const singleEquipCategories = SINGLE_EQUIP_CATEGORIES;
        const activeCategorySelection = new Map();

        PROP_DEFINITIONS.forEach((definition) => {
            if (propRegistry.has(definition.key)) {
                console.warn(`Duplicate prop key in PROP_DEFINITIONS: ${definition.key}`);
                return;
            }

            const prop = definition.create();
            prop.visible = false;
            prop.userData = prop.userData || {};
            prop.userData.propKey = definition.key;
            prop.userData.propCategory = definition.category;
            propsRig.add(prop);

            const metadata = {
                key: definition.key,
                category: definition.category,
                priority: definition.prewarmPriority ?? 0,
                eyePreset: definition.eyePreset || null,
                object: prop
            };

            propObjects[definition.key] = prop;
            propRegistry.set(definition.key, metadata);
            if (definition.eyePreset) {
                eyeStylePropToPreset[definition.key] = definition.eyePreset;
            }
        });

        const activeProps = new Set();
        const playerInventory = new Set();

        function getCategoryLimit(category) {
            return CATEGORY_EQUIP_LIMITS[category] ?? 1;
        }

        function getCategorySelection(category) {
            const selected = activeCategorySelection.get(category);
            if (!selected) {
                return [];
            }
            return Array.isArray(selected) ? selected.slice() : [selected];
        }

        function getCategoryPrimarySelection(category) {
            const selected = getCategorySelection(category);
            return selected[selected.length - 1] || null;
        }

        function hasCategorySelection(category) {
            return getCategorySelection(category).length > 0;
        }

        function setCategorySelection(category, selections) {
            const unique = [];
            for (const entry of selections) {
                if (!entry || unique.includes(entry)) {
                    continue;
                }
                unique.push(entry);
            }
            if (!unique.length) {
                activeCategorySelection.delete(category);
                return;
            }
            const limit = Math.max(1, getCategoryLimit(category));
            activeCategorySelection.set(category, unique.slice(-limit));
        }

        function getPropCategory(propKey) {
            return propRegistry.get(propKey)?.category || null;
        }

        function getInventoryKeysByCategory(categoryKey) {
            return Array.from(playerInventory)
                .filter((propKey) => getPropCategory(propKey) === categoryKey);
        }

        function getInventoryCategoryCount(categoryKey) {
            return getInventoryKeysByCategory(categoryKey).length;
        }

        function enforceInventoryCategoryLimit(categoryKey) {
            const limit = INVENTORY_LIMIT_PER_CATEGORY;
            const listed = getInventoryKeysByCategory(categoryKey);
            const excess = listed.length - limit;
            if (excess <= 0) {
                return [];
            }
            const removed = listed.slice(0, excess);
            removed.forEach((propKey) => {
                playerInventory.delete(propKey);
            });
            return removed;
        }

        function enforceInventoryCategoryLimits() {
            const dropped = [];
            INVENTORY_CATEGORIES.forEach((categoryKey) => {
                dropped.push(...enforceInventoryCategoryLimit(categoryKey));
            });
            return dropped;
        }

        function applyLoadout() {
            for (const metadata of propRegistry.values()) {
                const key = metadata.key;
                const obj = metadata.object;
                const isActive = activeProps.has(key);
                obj.visible = isActive;
                if (obj.userData.left && obj.userData.right) {
                    obj.userData.left.visible = isActive;
                    obj.userData.right.visible = isActive;
                }
            }

            leftWingBaseMesh.visible = !hasCategorySelection('wingSet');
            rightWingBaseMesh.visible = !hasCategorySelection('wingSet');

            const activeEyeProp = getCategoryPrimarySelection('eyes');
            applyEyeAppearancePreset(activeEyeProp ? (eyeStylePropToPreset[activeEyeProp] || 'default') : 'default');

            const activeBodyProp = getCategoryPrimarySelection('body');
            const hasArchonBody = activeBodyProp === 'archonBody';
            const hasRoyalArmorBody = activeBodyProp === 'royalArmorBody';
            const hasProtectorRingBody = activeBodyProp === 'protectorRingBody';
            if (hasRoyalArmorBody) {
                materialBody.color.setHex(0x4a17b8);
                materialBody.emissive.setHex(0x25054e);
                materialBody.emissiveIntensity = 0.62;
                materialBody.roughness = 0.34;
                materialBody.clearcoat = 0.36;
                materialBody.clearcoatRoughness = 0.56;
            } else if (hasArchonBody) {
                materialBody.color.setHex(0x5726ba);
                materialBody.emissive.setHex(0x1f043e);
                materialBody.emissiveIntensity = 0.56;
                materialBody.roughness = 0.36;
                materialBody.clearcoat = 0.32;
                materialBody.clearcoatRoughness = 0.62;
            } else if (hasProtectorRingBody) {
                materialBody.color.setHex(0x4f24b5);
                materialBody.emissive.setHex(0x1a0340);
                materialBody.emissiveIntensity = 0.52;
                materialBody.roughness = 0.38;
                materialBody.clearcoat = 0.42;
                materialBody.clearcoatRoughness = 0.5;
            } else {
                materialBody.color.setHex(0x4b2aa8);
                materialBody.emissive.setHex(0x13002b);
                materialBody.emissiveIntensity = 0.45;
                materialBody.roughness = 0.42;
                materialBody.clearcoat = 0.32;
                materialBody.clearcoatRoughness = 0.62;
            }
        }

        function toggleProp(propKey) {
            const metadata = propRegistry.get(propKey);
            if (!metadata) return;
            const propCategory = metadata.category;

            if (activeProps.has(propKey)) {
                activeProps.delete(propKey);
                if (singleEquipCategories.has(propCategory)) {
                    const currentForCategory = getCategorySelection(propCategory).filter((entry) => entry !== propKey);
                    setCategorySelection(propCategory, currentForCategory);
                }
            } else {
                if (singleEquipCategories.has(propCategory)) {
                    const currentForCategory = getCategorySelection(propCategory);
                    const removedForInventory = [];
                    const limit = getCategoryLimit(propCategory);

                    const nextForCategory = currentForCategory.filter((entry) => entry !== propKey);
                    while (nextForCategory.length >= limit) {
                        const removed = nextForCategory.shift();
                        if (removed && activeProps.has(removed)) {
                            activeProps.delete(removed);
                            removedForInventory.push(removed);
                        }
                    }
                    nextForCategory.push(propKey);
                    for (const replaced of removedForInventory) {
                        stashPropInInventory(replaced);
                    }
                    setCategorySelection(propCategory, nextForCategory);
                }
            }
            activeProps.add(propKey);
            applyLoadout();
        }

        function clearAllProps() {
            activeProps.clear();
            activeCategorySelection.clear();
            applyLoadout();
        }

        applyLoadout();

        // --- STORE UI ---
        const storeToggle = document.getElementById('store-toggle');
        const inventoryToggle = document.getElementById('inventory-toggle');
        const mysteryToggle = document.getElementById('mystery-toggle');
        const storePanel = document.getElementById('store-panel');
        const inventoryPanel = document.getElementById('inventory-panel');
        const inventoryCloseBtn = document.getElementById('inventory-close-btn');
        const inventoryList = document.getElementById('inventory-list');
        const inventoryEmpty = document.getElementById('inventory-empty');
        const categoryTitle = document.getElementById('category-title');
        const propPreviewPanel = document.getElementById('prop-preview-panel');
        const propPreviewViewport = document.getElementById('prop-preview-viewport');
        const propPreviewName = document.getElementById('prop-preview-name');
        const propPreviewInventoryBtn = document.getElementById('prop-preview-inventory-btn');
        const propPreviewEquipBtn = document.getElementById('prop-preview-equip-btn');
        const propPreviewApplyBtn = document.getElementById('prop-preview-apply-btn');
        const propPreviewCloseBtn = document.getElementById('prop-preview-close');
        const propPreviewFallback = document.getElementById('prop-preview-fallback');
        const propPreviewOverlay = document.getElementById('prop-preview-overlay');
        const categoryButtons = Array.from(document.querySelectorAll('.category-btn'));
        const inventoryCategoryButtons = Array.from(document.querySelectorAll('.inventory-category-btn'));
        const itemButtons = Array.from(document.querySelectorAll('.item-btn'));
        const propButtons = itemButtons.filter((btn) => btn.dataset.prop);
        const itemThumbCache = new Map();
        const itemThumbInFlight = new Map();
        const ITEM_THUMB_SIZE = 56;
        const isMobileLike = (() => {
            if (typeof window === 'undefined' || !window.matchMedia) {
                return false;
            }
            return window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768;
        })();
        let storeThumbHydrateToken = 0;
        let itemThumbRenderQueue = Promise.resolve();
        const previewScene = new THREE.Scene();
        const previewCamera = new THREE.PerspectiveCamera(34, 1, 0.01, 120);
        const previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
        previewRenderer.setClearColor(0xdde7f6, 1);
        if (propPreviewViewport) {
            propPreviewViewport.appendChild(previewRenderer.domElement);
        }
        previewScene.add(new THREE.AmbientLight(0xc9e7ff, 1));
        const previewKey = new THREE.DirectionalLight(0xffffff, 1.35);
        previewKey.position.set(1.4, 1.9, 2.2);
        const previewFill = new THREE.DirectionalLight(0x9fd3ff, 0.72);
        previewFill.position.set(-1.2, -0.2, 1.4);
        const previewRim = new THREE.DirectionalLight(0xbbf7ff, 0.35);
        previewRim.position.set(0, -0.8, -2.4);
        previewScene.add(previewKey, previewFill, previewRim);

        const previewState = {
            open: false,
            propKey: null,
            object: null,
            label: null,
            rotateY: 0,
            hasStandaloneMesh: false,
            viewMode: 'item'
        };
        const MYSTERY_BOX_CONFIG = {
            frontOffset: 6.9,
            sideOffset: 0,
            spawnHeightExtra: 18.2,
            spawnHeightSpread: 1.55,
            groundOffset: -0.44,
            fallGravity: 16.8,
            fallSpinDamp: 0.9992,
            settleDuration: 0.62,
            openDuration: 0.74,
            revealHoldDuration: 2.2,
            cleanupDuration: 1.35,
            impactHold: 0.25,
            impactHeight: 0.018,
            impactDecay: 0.68,
            trailRevealScale: 1.12,
            trailDamp: 0.12,
            openBurstDistance: 2.7,
            openBurstLift: 1.9,
            openBurstSpin: 2.2,
            dustFlowDuration: 0.9,
            dustSwirlRadius: 1.28,
            dustLift: 1.85,
            bounce: 0.03,
            spin: 1.25,
            modelScale: 0.9,
            shadowGroundLift: 0.04,
            shadowDirectionX: -0.58,
            shadowDirectionZ: 0.82,
            shadowDriftPerUnit: 0.14,
            shadowCoreOffset: 0,
            shadowTailOffset: 0.08,
            shadowCoreSizeX: 2.45,
            shadowCoreSizeZ: 1.55,
            shadowTailSizeX: 2.95,
            shadowTailSizeZ: 1.95,
            shadowCoreHeightScale: 0.14,
            shadowTailHeightScale: 0.24,
            shadowPngScale: 1.3,
            shadowPngScaleY: 1.22,
            shadowPngBlurPx: 1.2,
            shadowDropInStart: 0.24,
            shadowDropInPower: 1.45,
            shadowDropInMin: 0.08,
            shadowCoreOpacity: 0.62,
            shadowTailOpacity: 0.26,
            shadowContactOffset: 0,
            shadowContactSizeX: 2.1,
            shadowContactSizeZ: 1.3,
            shadowContactHeightScale: 0.08,
            shadowContactOpacity: 0.78,
            shadowHeightFadeStrength: 0.05,
            shadowEdgeAnchorTowardCamera: 1.22,
            shadowLandingBoostDuration: 0.24,
            shadowLandingBoostCore: 0.2,
            shadowLandingBoostTail: 0.12,
            shadowLandingBoostContact: 0.24,
            shadowLandingCoreScaleY: 0.92,
            shadowLandingTailScaleY: 0.9,
            shadowLandingContactScaleY: 0.88
        };
        const MYSTERY_CHARACTER_FLIGHT_CONFIG = {
            interruptionBlendDuration: 0.47,

            anticipationDuration: 3,
            anticipationSplit: 0.48,
            anticipationYawTurn: 0.96,
            anticipationOppositeYaw: 0.62,
            anticipationRoll: 0.15,
            anticipationDip: 0.18,
            anticipationLift: 0.08,
            anticipationBack: -0.56,
            anticipationBackSwoop: -1.02,
            anticipationSway: 0.16,
            anticipationSwoop: 0.2,
            anticipationWingHzStart: 1.02,
            anticipationWingHzEnd: 1.55,
            anticipationWingAmpStart: 0.03,
            anticipationWingAmpEnd: 0.07,

            lookUpDuration: 1.0,
            lookUpPitch: -0.44,
            lookUpYaw: 0.28,
            lookUpLift: 0.82,
            lookUpBack: -1.05,
            lookUpSway: 0.08,
            lookUpEyeY: 0.10,
            lookUpWingHzStart: 1.6,
            lookUpWingHzEnd: 2.3,
            lookUpWingAmpStart: 0.06,
            lookUpWingAmpEnd: 0.14,

            wingChargeDuration: 1.08,
            chargeWingHzStart: 2.5,
            chargeWingHzEnd: 6.6,
            chargeWingAmpStart: 0.07,
            chargeWingAmpEnd: 0.5,
            chargeWingLift: 0.2,
            chargeLift: 1.4,
            chargeBack: -1.76,
            chargeSway: 0.08,
            chargeYaw: 0.06,
            chargePitch: -0.56,

            powerFlapDuration: 1.0,
            powerFlapReleaseProgress: 0.7,
            powerFlapSlowMoPower: 0.62,
            powerFlapSlowMoWindow: 0.24,
            powerFlapSlowMoHz: 0.86,
            powerFlapAmpStart: 0.2,
            powerFlapAmpPeak: 0.78,
            powerFlapWingBoostPeak: 2.9,
            powerFlapRise: 1.1,
            powerFlapBack: -2.34,
            powerFlapPitch: -0.72,
            powerFlapYaw: 0,
            powerFlapWingHzStart: 2.6,
            powerFlapWingHzEnd: 1.35,
            powerFlapLargeFlapBoost: 1.42,
            powerFlapLargeFlapLift: 0.22,

            liftoffVerticalVelocity: 8.9,
            liftoffForwardVelocity: -2.25,
            liftoffSideVelocity: 1.12,
            ascentDuration: 1.6,
            ascentVerticalAccel: 5.4,
            ascentForwardAccel: 0.35,
            ascentSideAccel: 0.62,
            ascentWingHzStart: 6.2,
            ascentWingHzEnd: 4.4,
            ascentWingAmpStart: 0.46,
            ascentWingAmpEnd: 0.24,
            offscreenDropDelay: 1,
            offscreenMargin: 1.03,
            offscreenFallbackDelay: 0.72,

            holdDuration: 0.18,
            holdLift: 20.8,
            holdSway: 0.2,
            holdWingHz: 2.55,
            holdWingAmp: 0.08,

            returnDuration: 1.12,
            returnSpiralTurns: 2,
            returnRadius: 1.2,
            returnWingHz: 7,
            returnWingAmpStart: 0.42,
            returnWingAmpEnd: 0.12,
            returnTurnYaw: 0.22,
            returnTurnRoll: 0.18,
            returnDivePitch: 0.23,
            turnLiftBase: 0.06,
            turnLiftYawScale: 0.18,
            turnLiftFlapScale: 0.15,
            turnBankScale: 0.18,
            turnLiftSmoothing: 8.2,
            turnLiftReturnSmoothing: 11,
            tornadoSpinSpeedMin: 2.2,
            tornadoSpinSpeedMax: 6.1,
            tornadoRadiusMax: 0.68,
            tornadoLiftByFlap: 0.09,
            tornadoRollFlapScale: 0.11,
            tornadoYawScale: 0.12,
            tornadoPitchScale: 0.06,
            tornadoSmoothing: 12.0,
            tornadoReturnSmoothing: 14.0,

            boxDropStartHeight: 21.4
        };
        const mysteryState = {
            phase: 'idle',
            root: null,
            timer: 0,
            startY: 0,
            landingY: 0,
            startPoint: new THREE.Vector3(),
            landingPoint: new THREE.Vector3(),
            seed: 0,
            rewardKey: null,
            rewardLabel: null,
            target: null,
            fallVelocity: 0,
            spinVelX: 0,
            spinVelY: 0,
            spinVelZ: 0,
            settled: false,
            rewardShown: false,
            previewPrimed: false,
            baseScale: 1,
            shadowCore: null,
            shadowTail: null,
            shadowContact: null,
        };
        const mysteryFlightCinematic = {
            active: false,
            phase: 'idle',
            timer: 0,
            dropTriggered: false,
            returnQueued: false,
            rigOffset: new THREE.Vector3(),
            wingBoost: 1,
            hardFlap: 0,
            wingLift: 0,
            bodyYaw: 0,
            bodyPitch: 0,
            bodyRoll: 0,
            eyeTargetX: 0,
            eyeTargetY: 0,
            eyeBlend: 0,
            burstStartOffset: new THREE.Vector3(),
            burstVelocity: new THREE.Vector3(),
            wingPhase: 0,
            actionSuppress: 0,
            returnStartOffset: new THREE.Vector3(),
            returnStartBodyYaw: 0,
            returnStartBodyPitch: 0,
            returnStartBodyRoll: 0,
            returnStartEyeY: 0,
            anticipationSide: 0,
            finalSide: 0,
            offscreenTimer: 0,
            offscreenTriggered: false
        };
        const mysteryFlightCinematicScreenProbe = new THREE.Vector3();

        function resetMysteryCinematicState() {
            mysteryFlightCinematic.active = false;
            mysteryFlightCinematic.phase = 'idle';
            mysteryFlightCinematic.timer = 0;
            mysteryFlightCinematic.dropTriggered = false;
            mysteryFlightCinematic.returnQueued = false;
            mysteryFlightCinematic.rigOffset.set(0, 0, 0);
            mysteryFlightCinematic.wingBoost = 1;
            mysteryFlightCinematic.hardFlap = 0;
            mysteryFlightCinematic.wingLift = 0;
            mysteryFlightCinematic.bodyYaw = 0;
            mysteryFlightCinematic.bodyPitch = 0;
            mysteryFlightCinematic.bodyRoll = 0;
            mysteryFlightCinematic.eyeTargetX = 0;
            mysteryFlightCinematic.eyeTargetY = 0;
            mysteryFlightCinematic.eyeBlend = 0;
            mysteryFlightCinematic.burstStartOffset.set(0, 0, 0);
            mysteryFlightCinematic.burstVelocity.set(0, 0, 0);
            mysteryFlightCinematic.wingPhase = 0;
            mysteryFlightCinematic.actionSuppress = 0;
            mysteryFlightCinematic.returnStartOffset.set(0, 0, 0);
            mysteryFlightCinematic.returnStartBodyYaw = 0;
            mysteryFlightCinematic.returnStartBodyPitch = 0;
            mysteryFlightCinematic.returnStartBodyRoll = 0;
            mysteryFlightCinematic.returnStartEyeY = 0;
            mysteryFlightCinematic.anticipationSide = 0;
            mysteryFlightCinematic.finalSide = 0;
            mysteryFlightCinematic.offscreenTimer = 0;
            mysteryFlightCinematic.offscreenTriggered = false;
        }
        const stableMysteryForward = new THREE.Vector3(0, 0, 0);

        const CATEGORY_LABELS = {
            wingSet: 'Wing Set',
            headWear: 'Head Wear',
            eyes: 'Eyes',
            body: 'Body',
            other: 'Other'
        };
        let activeCategory = 'wingSet';
        let activeInventoryCategory = 'wingSet';

        function getItemLabel(button) {
            return button?.dataset?.propLabel?.trim() || button?.querySelector('.item-btn-label')?.textContent?.trim() || 'Unknown item';
        }

        function getItemByPropKey(propKey) {
            return propObjects[propKey];
        }

        function getPropLabelByKey(propKey) {
            for (const btn of propButtons) {
                if (btn.dataset.prop === propKey) {
                    return getItemLabel(btn);
                }
            }
            return propKey;
        }

        function isInventoryCategory(categoryKey) {
            return INVENTORY_CATEGORIES.includes(categoryKey);
        }

        function getInventoryCategoryLabel(categoryKey) {
            return CATEGORY_LABELS[categoryKey] || categoryKey || 'Unknown';
        }

        function getInventoryDisplayNameWithCount(categoryKey) {
            const count = getInventoryCategoryCount(categoryKey);
            return `${getInventoryCategoryLabel(categoryKey)} (${count}/${INVENTORY_LIMIT_PER_CATEGORY})`;
        }

        function setPreviewActionButtonsDisabled(disabled) {
            if (propPreviewApplyBtn) {
                propPreviewApplyBtn.disabled = disabled;
            }
            if (propPreviewInventoryBtn) {
                propPreviewInventoryBtn.disabled = disabled;
            }
            if (propPreviewEquipBtn) {
                propPreviewEquipBtn.disabled = disabled;
            }
        }

        function stashPropInInventory(propKey) {
            if (!propRegistry.has(propKey)) {
                return { added: false, dropped: [] };
            }
            const category = getPropCategory(propKey);
            if (!category) {
                return { added: false, dropped: [] };
            }
            const hasExisting = playerInventory.has(propKey);
            if (hasExisting) {
                return { added: false, dropped: [] };
            }
            playerInventory.add(propKey);
            const dropped = hasExisting ? [] : [
                ...enforceInventoryCategoryLimit(category),
                ...enforceInventoryCategoryLimits()
            ];
            renderInventoryList();
            return {
                added: true,
                dropped
            };
        }

        function equipPropNow(propKey) {
            const metadata = propRegistry.get(propKey);
            if (!metadata) {
                return false;
            }
            const propCategory = metadata.category;
            if (singleEquipCategories.has(propCategory)) {
                const currentForCategory = getCategorySelection(propCategory).filter((entry) => entry !== propKey);
                const limit = getCategoryLimit(propCategory);
                const removedForInventory = [];

                while (currentForCategory.length >= limit) {
                    const removed = currentForCategory.shift();
                    if (removed && activeProps.has(removed)) {
                        activeProps.delete(removed);
                        removedForInventory.push(removed);
                    }
                }
                for (const removed of removedForInventory) {
                    stashPropInInventory(removed);
                }
                currentForCategory.push(propKey);
                setCategorySelection(propCategory, currentForCategory);
            }
            activeProps.add(propKey);
            applyLoadout();
            updatePropButtonStates();
            return true;
        }

        function unequipPropNow(propKey) {
            const metadata = propRegistry.get(propKey);
            if (!metadata) {
                return false;
            }
            if (!activeProps.has(propKey)) {
                return false;
            }

            const propCategory = metadata.category;
            activeProps.delete(propKey);
            const currentForCategory = getCategorySelection(propCategory).filter((entry) => entry !== propKey);
            setCategorySelection(propCategory, currentForCategory);

            applyLoadout();
            updatePropButtonStates();
            return true;
        }

        function updateInventoryButtonStates() {
            if (!inventoryList) {
                return;
            }
            const cards = inventoryList.querySelectorAll('.inventory-item');
            cards.forEach((card) => {
                const propKey = card?.dataset?.prop;
                const equipButton = card.querySelector('.inventory-action-btn.equip');
                const isEquipped = !!propKey && activeProps.has(propKey);
                card.classList.toggle('active', isEquipped);
                if (equipButton) {
                    equipButton.disabled = false;
                    equipButton.textContent = isEquipped ? 'Unequip' : 'Equip Now';
                    equipButton.setAttribute('aria-label', isEquipped ? 'Unequip this item' : `Equip ${getPropLabelByKey(propKey)} now`);
                }
            });
        }

        function getThumbFallbackText(propKey) {
            const label = getPropLabelByKey(propKey) || propKey;
            const trimmed = label?.trim();
            if (!trimmed) {
                return '?';
            }
            return trimmed.charAt(0).toUpperCase();
        }

        function setItemThumbFallback(thumbElement, propKey) {
            if (!thumbElement) {
                return;
            }
            thumbElement.textContent = '';
            const fallback = document.createElement('span');
            fallback.className = 'item-btn-thumb-fallback';
            fallback.textContent = getThumbFallbackText(propKey);
            thumbElement.appendChild(fallback);
        }

        function attachItemThumbImage(thumbElement, propKey) {
            setItemThumbFallback(thumbElement, propKey);
            const cachedPromise = getItemThumbDataUrl(propKey);
            if (!cachedPromise) {
                return Promise.resolve();
            }
            return cachedPromise.then((dataUrl) => {
                if (!thumbElement || !thumbElement.isConnected) {
                    return;
                }
                if (!dataUrl) {
                    return;
                }
                const image = document.createElement('img');
                image.src = dataUrl;
                image.alt = '';
                image.loading = 'lazy';
                image.decoding = 'async';
                thumbElement.textContent = '';
                thumbElement.appendChild(image);
            }).catch(() => {});
        }

        async function renderItemThumbImageUrl(propKey) {
            if (!propKey) {
                return null;
            }
            if (itemThumbCache.has(propKey)) {
                return itemThumbCache.get(propKey);
            }
            if (itemThumbInFlight.has(propKey)) {
                return itemThumbInFlight.get(propKey);
            }

            const renderTask = async () => {
                try {
                    const metadata = propRegistry.get(propKey);
                    if (!metadata) {
                        return null;
                    }

                    const source = metadata.object;
                    const build = buildPreviewObject(source);
                    const object = build?.object;
                    if (!object || !hasFiniteRenderableGeometry(object)) {
                        return null;
                    }

                    const size = ITEM_THUMB_SIZE;
                    const thumbScene = new THREE.Scene();
                    thumbScene.background = new THREE.Color(0x0f172a);
                    const thumbCamera = new THREE.PerspectiveCamera(34, 1, 0.01, 120);
                    const thumbRenderer = new THREE.WebGLRenderer({
                        antialias: true,
                        alpha: true,
                        preserveDrawingBuffer: true
                    });

                    thumbRenderer.setPixelRatio(1);
                    thumbRenderer.setSize(size, size, false);
                    thumbRenderer.outputColorSpace = THREE.SRGBColorSpace;
                    thumbRenderer.setClearColor(0x0f172a, 1);

                    const thumbAmbient = new THREE.AmbientLight(0xbecbea, 1);
                    const thumbKeyLight = new THREE.DirectionalLight(0xffffff, 1.1);
                    const thumbFillLight = new THREE.DirectionalLight(0x9fc8ff, 0.6);
                    const thumbRimLight = new THREE.DirectionalLight(0x9ad9ff, 0.45);
                    thumbKeyLight.position.set(1.6, 1.8, 2.2);
                    thumbFillLight.position.set(-1.1, -0.8, 1.3);
                    thumbRimLight.position.set(0, 1.0, -1.8);
                    thumbScene.add(thumbAmbient, thumbKeyLight, thumbFillLight, thumbRimLight);

                    sanitizePreviewInvalidGeometry(object);
                    object.frustumCulled = false;
                    object.position.set(0, 0, 0);
                    object.rotation.set(0, 0, 0);
                    object.scale.set(1, 1, 1);
                    object.updateMatrixWorld(true);

                    try {
                        const worldBox = computeSafeObjectBounds(object);
                        const center = worldBox?.getCenter(new THREE.Vector3());
                        const rawSize = worldBox?.getSize(new THREE.Vector3());
                        if (center && rawSize && !worldBox.isEmpty()) {
                            const safeSize = getFiniteSizeVector(rawSize, 1.2);
                            const safeCenter = new THREE.Vector3(
                                sanitizeFiniteNumber(center.x, 0),
                                sanitizeFiniteNumber(center.y, 0),
                                sanitizeFiniteNumber(center.z, 0)
                            );
                            const maxDim = Math.max(
                                Math.abs(safeSize.x),
                                Math.abs(safeSize.y),
                                Math.abs(safeSize.z)
                            );
                            const fitConfig = getPreviewFitConfig('item');
                            const targetScale = Math.min(fitConfig.baseScale / Math.max(0.001, maxDim), fitConfig.maxScale);
                            const clampedScale = Math.max(fitConfig.minScale, targetScale);
                            const cameraDistance = computePreviewCameraDistanceForScale('item', safeSize, clampedScale);
                            object.position.sub(safeCenter);
                            object.scale.setScalar(clampedScale);
                            thumbCamera.position.set(
                                0,
                                safeSize.y * 0.1 * clampedScale + 0.2,
                                Math.max(1.1, cameraDistance)
                            );
                            thumbCamera.near = 0.05;
                            thumbCamera.far = Math.max(10, thumbCamera.position.z * 12);
                            thumbCamera.lookAt(0, 0, 0);
                            thumbCamera.updateProjectionMatrix();
                        } else {
                            object.position.set(0, -0.2, 0);
                            object.scale.setScalar(0.55);
                            thumbCamera.position.set(0, 0.2, 1.2);
                            thumbCamera.near = 0.05;
                            thumbCamera.far = 10;
                            thumbCamera.lookAt(0, 0, 0);
                            thumbCamera.updateProjectionMatrix();
                        }
                    } catch (error) {
                        object.position.set(0, -0.2, 0);
                        object.scale.setScalar(0.55);
                        thumbCamera.position.set(0, 0.2, 1.2);
                        thumbCamera.near = 0.05;
                        thumbCamera.far = 10;
                        thumbCamera.lookAt(0, 0, 0);
                        thumbCamera.updateProjectionMatrix();
                    }

                    thumbScene.add(object);
                    thumbRenderer.render(thumbScene, thumbCamera);
                    const url = thumbRenderer.domElement.toDataURL('image/png');

                    thumbRenderer.dispose();
                    thumbScene.remove(object);
                    object.traverse((node) => {
                        if (node?.isObject3D && node.parent) {
                            if (typeof node.removeFromParent === 'function') {
                                node.removeFromParent();
                            } else {
                                node.parent.remove(node);
                            }
                        }
                    });

                    return url || null;
                } catch (error) {
                    console.warn(`Unable to generate thumbnail for ${propKey}`, error);
                    return null;
                }
            };
            const task = itemThumbRenderQueue
                .then(() => renderTask())
                .finally(() => {
                itemThumbInFlight.delete(propKey);
                });
            itemThumbRenderQueue = task.catch(() => null);

            itemThumbInFlight.set(propKey, task);
            task.then((url) => {
                itemThumbCache.set(propKey, url || null);
                return url;
            });
            return task;
        }

        function getItemThumbDataUrl(propKey) {
            if (!propKey) {
                return null;
            }
            if (itemThumbCache.has(propKey)) {
                return Promise.resolve(itemThumbCache.get(propKey) || null);
            }
            return renderItemThumbImageUrl(propKey);
        }

        function ensureStoreButtonThumb(button) {
            const propKey = button?.dataset?.prop;
            if (!propKey || button.dataset.action === 'clearAll') {
                return null;
            }
            if (button.dataset.thumbState === 'ready' || button.dataset.thumbState === 'loading') {
                return button.querySelector('.item-btn-thumb');
            }
            let thumb = button.querySelector('.item-btn-thumb');
            if (!thumb) {
                thumb = document.createElement('span');
                thumb.className = 'item-btn-thumb';
                thumb.setAttribute('aria-hidden', 'true');
                button.prepend(thumb);
            }
            button.dataset.thumbState = 'loading';
            attachItemThumbImage(thumb, propKey).finally(() => {
                button.dataset.thumbState = 'ready';
            });
            return thumb;
        }

        function warmupStoreCategoryThumbs(categoryKey) {
            const targetCategory = CATEGORY_LABELS[categoryKey] ? categoryKey : activeCategory;
            const buttons = itemButtons.filter((btn) => btn.dataset.prop && btn.dataset.category === targetCategory);
            if (!buttons.length) {
                return;
            }
            const token = ++storeThumbHydrateToken;
            const batchSize = isMobileLike ? 1 : 2;
            let index = 0;

            const processBatch = () => {
                if (token !== storeThumbHydrateToken) {
                    return;
                }
                const next = Math.min(index + batchSize, buttons.length);
                for (; index < next; index++) {
                    ensureStoreButtonThumb(buttons[index]);
                }
                if (index < buttons.length) {
                    if (window.requestIdleCallback) {
                        window.requestIdleCallback(processBatch, { timeout: 1200 });
                    } else {
                        setTimeout(processBatch, 12);
                    }
                }
            };

            if (window.requestIdleCallback) {
                window.requestIdleCallback(processBatch, { timeout: 420 });
            } else {
                setTimeout(processBatch, 8);
            }
        }

        function createInventoryItemThumb(propKey) {
            const thumb = document.createElement('span');
            thumb.className = 'inventory-item-thumb';
            thumb.setAttribute('aria-hidden', 'true');
            attachItemThumbImage(thumb, propKey);
            return thumb;
        }

        function renderInventoryList() {
            if (!inventoryList || !inventoryEmpty) {
                return;
            }
            enforceInventoryCategoryLimits();
            inventoryCategoryButtons.forEach((btn) => {
                const category = btn.dataset.category;
                if (!isInventoryCategory(category)) {
                    return;
                }
                btn.textContent = getInventoryDisplayNameWithCount(category);
            });

            const currentInventoryCategory = isInventoryCategory(activeInventoryCategory)
                ? activeInventoryCategory
                : INVENTORY_CATEGORIES[0];

            inventoryList.textContent = '';
            const stashedKeys = Array.from(playerInventory)
                .filter((propKey) => propRegistry.has(propKey))
                .filter((propKey) => getPropCategory(propKey) === currentInventoryCategory)
                .sort((a, b) => getPropLabelByKey(a).localeCompare(getPropLabelByKey(b)));

            if (!stashedKeys.length) {
                inventoryEmpty.textContent = `No props stashed in ${getInventoryCategoryLabel(currentInventoryCategory)} yet.`;
                inventoryEmpty.style.display = 'block';
                updateInventoryButtonStates();
                return;
            }

            inventoryEmpty.style.display = 'none';
            stashedKeys.forEach((propKey) => {
                const row = document.createElement('div');
                row.className = 'inventory-item';
                row.dataset.prop = propKey;
                row.setAttribute('role', 'listitem');

                const labelWrap = document.createElement('span');
                labelWrap.className = 'inventory-item-label-wrap';
                const thumb = createInventoryItemThumb(propKey);
                const label = document.createElement('span');
                label.className = 'inventory-item-label';
                label.textContent = getPropLabelByKey(propKey);
                labelWrap.append(thumb, label);

                const actions = document.createElement('div');
                actions.className = 'inventory-item-actions';

                const equipBtn = document.createElement('button');
                equipBtn.type = 'button';
                equipBtn.className = 'inventory-action-btn equip';
                equipBtn.dataset.action = 'equip';
                equipBtn.dataset.prop = propKey;
                equipBtn.textContent = 'Equip Now';
                equipBtn.setAttribute('aria-label', `Equip ${getPropLabelByKey(propKey)} now`);

                actions.append(equipBtn);
                row.append(labelWrap, actions);
                inventoryList.appendChild(row);
            });

            updateInventoryButtonStates();
        }

        function buildPreviewObject(source) {
            if (!source) {
                return {
                    object: null,
                    hasRenderableMesh: false
                };
            }

            const cloned = source.clone(true);
            cloned.visible = true;
            forcePreviewVisibility(cloned);
            sanitizePreviewInvalidGeometry(cloned);

            let hasRenderableMesh = hasStandaloneMesh(cloned);
            if (!hasRenderableMesh) {
                attachDetachedPreviewParts(cloned, source);
                hasRenderableMesh = hasStandaloneMesh(cloned);
            }

            return {
                object: cloned,
                hasRenderableMesh
            };
        }

        function hasStandaloneMesh(object3D) {
            let hasMesh = false;
            object3D.traverse((node) => {
                if (hasMesh) {
                    return;
                }
                if (node.isMesh || node.isLine || node.isPoints || node.isLineSegments || node.isLineLoop || node.isLineStrip || node.isInstancedMesh) {
                    const position = node.geometry?.attributes?.position;
                    if (position?.array?.length >= 3) {
                        hasMesh = true;
                        return;
                    }
                }
                if (node.geometry && node.geometry.attributes?.position) {
                    hasMesh = true;
                }
            });
            return hasMesh;
        }

        function hasFiniteRenderableGeometry(object3D) {
            let hasFinite = false;
            if (!object3D) {
                return false;
            }
            object3D.traverse((node) => {
                if (!node || !node.visible) {
                    return;
                }
                if (!(
                    node.isMesh ||
                    node.isLine ||
                    node.isPoints ||
                    node.isLineSegments ||
                    node.isLineLoop ||
                    node.isLineStrip ||
                    node.isInstancedMesh
                )) {
                    return;
                }

                const position = node.geometry?.attributes?.position;
                if (!position?.array?.length) {
                    return;
                }

                const arr = position.array;
                for (let i = 0; i < arr.length; i += 3) {
                    if (Number.isFinite(arr[i]) && Number.isFinite(arr[i + 1]) && Number.isFinite(arr[i + 2])) {
                        hasFinite = true;
                        break;
                    }
                }
            });
            return hasFinite;
        }

        function sanitizeFallbackGeometry(geometry) {
            if (!geometry?.isBufferGeometry) {
                return false;
            }
            const position = geometry.attributes?.position;
            if (!position?.array?.length) {
                geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-0.5, -0.5, -0.5), new THREE.Vector3(0.5, 0.5, 0.5));
                geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.866);
                return false;
            }

            let fixed = false;
            const arr = position.array;
            let finiteCount = 0;
            for (let i = 0; i < arr.length; i++) {
                if (!Number.isFinite(arr[i])) {
                    arr[i] = 0;
                    fixed = true;
                } else {
                    finiteCount++;
                }
            }
            if (fixed) {
                position.needsUpdate = true;
            }
            if (finiteCount < 3) {
                geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-0.5, -0.5, -0.5), new THREE.Vector3(0.5, 0.5, 0.5));
                geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.866);
                return false;
            }
            sanitizeGeometrySafeBounds(geometry);
            if (!Number.isFinite(geometry.boundingSphere?.radius) || geometry.boundingSphere.radius <= 0) {
                geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.866);
                return false;
            }
            return true;
        }

        function sanitizeFiniteNumber(value, fallback) {
            return Number.isFinite(value) ? value : fallback;
        }

        function sanitizeFloatAttribute(attribute, fallbackValue = 0) {
            if (!attribute?.array) {
                return false;
            }

            const array = attribute.array;
            let changed = false;
            for (let i = 0; i < array.length; i++) {
                if (Number.isFinite(array[i])) {
                    continue;
                }
                array[i] = fallbackValue;
                changed = true;
            }
            if (changed) {
                attribute.needsUpdate = true;
            }
            return changed;
        }

        function sanitizeGeometrySafeBounds(geometry) {
            if (!geometry?.attributes?.position) {
                return false;
            }

            const position = geometry.attributes.position;
            const array = position.array;
            if (!array?.length) {
                geometry.boundingBox = new THREE.Box3(
                    new THREE.Vector3(-0.5, -0.5, -0.5),
                    new THREE.Vector3(0.5, 0.5, 0.5)
                );
                geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.866);
                return false;
            }

            const len = array.length;
            let hasFinite = false;
            let minX = Infinity;
            let minY = Infinity;
            let minZ = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            let maxZ = -Infinity;

            for (let i = 0; i < len; i += 3) {
                const x = array[i];
                const y = array[i + 1];
                const z = array[i + 2];
                if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
                    array[i] = 0;
                    array[i + 1] = 0;
                    array[i + 2] = 0;
                    continue;
                }
                hasFinite = true;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (z < minZ) minZ = z;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
                if (z > maxZ) maxZ = z;
            }

            if (!hasFinite) {
                geometry.boundingBox = new THREE.Box3(
                    new THREE.Vector3(-0.5, -0.5, -0.5),
                    new THREE.Vector3(0.5, 0.5, 0.5)
                );
                geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.866);
                return false;
            }

            const safeBox = new THREE.Box3(
                new THREE.Vector3(minX, minY, minZ),
                new THREE.Vector3(maxX, maxY, maxZ)
            );
            geometry.boundingBox = safeBox;

            const center = safeBox.getCenter(new THREE.Vector3());
            let maxRadiusSq = 0;
            for (let i = 0; i < len; i += 3) {
                const x = array[i];
                const y = array[i + 1];
                const z = array[i + 2];
                if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
                    array[i] = 0;
                    array[i + 1] = 0;
                    array[i + 2] = 0;
                    continue;
                }
                const dx = x - center.x;
                const dy = y - center.y;
                const dz = z - center.z;
                const distSq = dx * dx + dy * dy + dz * dz;
                if (distSq > maxRadiusSq) {
                    maxRadiusSq = distSq;
                }
            }
            const radius = Math.sqrt(maxRadiusSq);
            geometry.boundingSphere = new THREE.Sphere(center, Number.isFinite(radius) && radius > 0 ? radius : 0.001);
            position.needsUpdate = true;

            return true;
        }

        function forcePreviewVisibility(object3D) {
            if (!object3D) {
                return;
            }
            object3D.traverse((node) => {
                if (!node || !node.isObject3D) {
                    return;
                }
                node.visible = true;
            });
        }

        function sanitizePreviewInvalidGeometry(object3D) {
            if (!object3D) {
                return;
            }
            object3D.traverse((node) => {
                if (node?.isObject3D) {
                    node.frustumCulled = false;
                }
                if (!node || !node.geometry) {
                    if (node) {
                        if (Number.isFinite(node.position?.x) && Number.isFinite(node.position?.y) && Number.isFinite(node.position?.z)) {
                            node.position.set(
                                sanitizeFiniteNumber(node.position.x, 0),
                                sanitizeFiniteNumber(node.position.y, 0),
                                sanitizeFiniteNumber(node.position.z, 0)
                            );
                        } else {
                            node.position.set(0, 0, 0);
                        }

                        if (Number.isFinite(node.rotation?.x) && Number.isFinite(node.rotation?.y) && Number.isFinite(node.rotation?.z)) {
                            node.rotation.set(
                                sanitizeFiniteNumber(node.rotation.x, 0),
                                sanitizeFiniteNumber(node.rotation.y, 0),
                                sanitizeFiniteNumber(node.rotation.z, 0)
                            );
                        } else {
                            node.rotation.set(0, 0, 0);
                        }

                        if (node.scale) {
                            node.scale.set(
                                Number.isFinite(node.scale.x) && node.scale.x !== 0 ? node.scale.x : 1,
                                Number.isFinite(node.scale.y) && node.scale.y !== 0 ? node.scale.y : 1,
                                Number.isFinite(node.scale.z) && node.scale.z !== 0 ? node.scale.z : 1
                            );
                        }

                        const hasInvalidQuaternion = !Number.isFinite(node.quaternion?.x) || !Number.isFinite(node.quaternion?.y) ||
                            !Number.isFinite(node.quaternion?.z) || !Number.isFinite(node.quaternion?.w);
                        if (hasInvalidQuaternion) {
                            node.quaternion?.set(0, 0, 0, 1);
                        } else if (node.quaternion) {
                            node.quaternion.normalize();
                        }
                    }
                    return;
                }

                const position = node.geometry.attributes?.position;
                const normal = node.geometry.attributes?.normal;
                const uv = node.geometry.attributes?.uv;
                const uv2 = node.geometry.attributes?.uv2;
                const color = node.geometry.attributes?.color;

                if (
                    !node.isMesh &&
                    !node.isLine &&
                    !node.isPoints &&
                    !node.isLineSegments &&
                    !node.isLineLoop &&
                    !node.isLineStrip &&
                    !node.isInstancedMesh
                ) {
                    return;
                }

                if (node.isInstancedMesh && node.instanceMatrix?.isInstancedBufferAttribute) {
                    const matrixArray = node.instanceMatrix.array;
                    if (matrixArray?.length) {
                        const totalInstances = node.count;
                        const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
                        for (let i = 0; i < totalInstances; i++) {
                            const base = i * 16;
                            let needsFix = false;
                            for (let j = 0; j < 16; j++) {
                                if (!Number.isFinite(matrixArray[base + j])) {
                                    needsFix = true;
                                    break;
                                }
                            }

                            if (!needsFix) {
                                continue;
                            }

                            for (let j = 0; j < 16; j++) {
                                matrixArray[base + j] = identity[j];
                            }
                        }
                        node.instanceMatrix.needsUpdate = true;
                    }
                }

                if (position) {
                    const positionFixed = sanitizeFloatAttribute(position, 0);
                    if (positionFixed) {
                        position.needsUpdate = true;
                    }
                    const hasSafeGeometry = sanitizeFallbackGeometry(node.geometry);
                    if (!hasSafeGeometry) {
                        node.visible = false;
                        return;
                    }
                } else if (node.geometry) {
                    if (!node.geometry.boundingBox) {
                        node.geometry.boundingBox = new THREE.Box3(
                            new THREE.Vector3(-0.5, -0.5, -0.5),
                            new THREE.Vector3(0.5, 0.5, 0.5)
                        );
                    }
                    if (!node.geometry.boundingSphere) {
                        node.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0.866);
                    }
                }

                const normalsWereFixed = sanitizeFloatAttribute(normal, 0);
                const uvFixed = sanitizeFloatAttribute(uv, 0);
                const uv2Fixed = sanitizeFloatAttribute(uv2, 0);
                const colorFixed = sanitizeFloatAttribute(color, 0);

                if (normalsWereFixed || uvFixed || uv2Fixed || colorFixed) {
                    if (normalsWereFixed) {
                        normal.needsUpdate = true;
                    }
                    if (uvFixed) {
                        uv.needsUpdate = true;
                    }
                    if (uv2Fixed) {
                        uv2.needsUpdate = true;
                    }
                    if (colorFixed) {
                        color.needsUpdate = true;
                    }
                }

                if (!position) {
                    return;
                }
            });
        }

        function computeSafeObjectBounds(object3D) {
            if (!object3D) {
                return null;
            }
            const bounds = new THREE.Box3();
            object3D.updateMatrixWorld(true);
            const worldPoint = new THREE.Vector3();
            const boxPoint = new THREE.Vector3();

            object3D.traverse((node) => {
                if (!node || !node.geometry || !node.visible) {
                    return;
                }
                if (
                    !node.isMesh &&
                    !node.isLine &&
                    !node.isPoints &&
                    !node.isLineSegments &&
                    !node.isLineLoop &&
                    !node.isLineStrip &&
                    !node.isInstancedMesh
                ) {
                    return;
                }
                const position = node.geometry.attributes?.position;
                if (!position?.array) {
                    return;
                }
                const arr = position.array;
                const matrixElements = node.matrixWorld?.elements;
                const matrixFinite = matrixElements ? matrixElements.every((value) => Number.isFinite(value)) : false;
                for (let i = 0; i < arr.length; i += 3) {
                    const x = arr[i];
                    const y = arr[i + 1];
                    const z = arr[i + 2];
                    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
                        continue;
                    }
                    worldPoint.fromArray(arr, i).applyMatrix4(node.matrixWorld);
                    if (!Number.isFinite(worldPoint.x) || !Number.isFinite(worldPoint.y) || !Number.isFinite(worldPoint.z)) {
                        continue;
                    }
                    bounds.expandByPoint(worldPoint);
                }

                if (bounds.isEmpty() && node.geometry.boundingBox) {
                    const cachedBox = node.geometry.boundingBox;
                    if (!cachedBox.isEmpty() && Number.isFinite(cachedBox.min.x) && Number.isFinite(cachedBox.min.y) && Number.isFinite(cachedBox.min.z) &&
                        Number.isFinite(cachedBox.max.x) && Number.isFinite(cachedBox.max.y) && Number.isFinite(cachedBox.max.z)) {
                        if (!matrixFinite) {
                            boxPoint.set(cachedBox.min.x, cachedBox.min.y, cachedBox.min.z);
                        } else {
                            boxPoint.set(cachedBox.min.x, cachedBox.min.y, cachedBox.min.z).applyMatrix4(node.matrixWorld);
                        }
                        if (Number.isFinite(boxPoint.x) && Number.isFinite(boxPoint.y) && Number.isFinite(boxPoint.z)) {
                            bounds.expandByPoint(boxPoint);
                        }
                        if (!matrixFinite) {
                            boxPoint.set(cachedBox.min.x, cachedBox.min.y, cachedBox.max.z);
                        } else {
                            boxPoint.set(cachedBox.min.x, cachedBox.min.y, cachedBox.max.z).applyMatrix4(node.matrixWorld);
                        }
                        if (Number.isFinite(boxPoint.x) && Number.isFinite(boxPoint.y) && Number.isFinite(boxPoint.z)) {
                            bounds.expandByPoint(boxPoint);
                        }
                        if (!matrixFinite) {
                            boxPoint.set(cachedBox.min.x, cachedBox.max.y, cachedBox.min.z);
                        } else {
                            boxPoint.set(cachedBox.min.x, cachedBox.max.y, cachedBox.min.z).applyMatrix4(node.matrixWorld);
                        }
                        if (Number.isFinite(boxPoint.x) && Number.isFinite(boxPoint.y) && Number.isFinite(boxPoint.z)) {
                            bounds.expandByPoint(boxPoint);
                        }
                        if (!matrixFinite) {
                            boxPoint.set(cachedBox.min.x, cachedBox.max.y, cachedBox.max.z);
                        } else {
                            boxPoint.set(cachedBox.min.x, cachedBox.max.y, cachedBox.max.z).applyMatrix4(node.matrixWorld);
                        }
                        if (Number.isFinite(boxPoint.x) && Number.isFinite(boxPoint.y) && Number.isFinite(boxPoint.z)) {
                            bounds.expandByPoint(boxPoint);
                        }
                        if (!matrixFinite) {
                            boxPoint.set(cachedBox.max.x, cachedBox.min.y, cachedBox.min.z);
                        } else {
                            boxPoint.set(cachedBox.max.x, cachedBox.min.y, cachedBox.min.z).applyMatrix4(node.matrixWorld);
                        }
                        if (Number.isFinite(boxPoint.x) && Number.isFinite(boxPoint.y) && Number.isFinite(boxPoint.z)) {
                            bounds.expandByPoint(boxPoint);
                        }
                        if (!matrixFinite) {
                            boxPoint.set(cachedBox.max.x, cachedBox.min.y, cachedBox.max.z);
                        } else {
                            boxPoint.set(cachedBox.max.x, cachedBox.min.y, cachedBox.max.z).applyMatrix4(node.matrixWorld);
                        }
                        if (Number.isFinite(boxPoint.x) && Number.isFinite(boxPoint.y) && Number.isFinite(boxPoint.z)) {
                            bounds.expandByPoint(boxPoint);
                        }
                        if (!matrixFinite) {
                            boxPoint.set(cachedBox.max.x, cachedBox.max.y, cachedBox.min.z);
                        } else {
                            boxPoint.set(cachedBox.max.x, cachedBox.max.y, cachedBox.min.z).applyMatrix4(node.matrixWorld);
                        }
                        if (Number.isFinite(boxPoint.x) && Number.isFinite(boxPoint.y) && Number.isFinite(boxPoint.z)) {
                            bounds.expandByPoint(boxPoint);
                        }
                        if (!matrixFinite) {
                            boxPoint.set(cachedBox.max.x, cachedBox.max.y, cachedBox.max.z);
                        } else {
                            boxPoint.set(cachedBox.max.x, cachedBox.max.y, cachedBox.max.z).applyMatrix4(node.matrixWorld);
                        }
                        if (Number.isFinite(boxPoint.x) && Number.isFinite(boxPoint.y) && Number.isFinite(boxPoint.z)) {
                            bounds.expandByPoint(boxPoint);
                        }
                    }
                }
            });

            if (!bounds.isEmpty()) {
                const min = bounds.min;
                const max = bounds.max;
                if (
                    Number.isFinite(min.x) && Number.isFinite(min.y) && Number.isFinite(min.z) &&
                    Number.isFinite(max.x) && Number.isFinite(max.y) && Number.isFinite(max.z)
                ) {
                    return bounds;
                }
            }
            const fallbackCenter = new THREE.Vector3();
            fallbackCenter.setFromMatrixPosition(object3D.matrixWorld || new THREE.Matrix4());
            if (!Number.isFinite(fallbackCenter.x) || !Number.isFinite(fallbackCenter.y) || !Number.isFinite(fallbackCenter.z)) {
                object3D.getWorldPosition(fallbackCenter);
            }
            if (!Number.isFinite(fallbackCenter.x) || !Number.isFinite(fallbackCenter.y) || !Number.isFinite(fallbackCenter.z)) {
                fallbackCenter.set(0, 0, 0);
            }
            const fallbackSpan = 0.86;
            return new THREE.Box3(
                fallbackCenter.clone().addScalar(-fallbackSpan),
                fallbackCenter.clone().addScalar(fallbackSpan)
            );
        }

        function attachDetachedPreviewParts(clone, source) {
            const previewSource = source?.userData || {};
            const leftPart = previewSource.left?.isObject3D ? previewSource.left : null;
            const rightPart = previewSource.right?.isObject3D ? previewSource.right : null;

            if (!leftPart && !rightPart) {
                return;
            }

            if (leftPart) {
                const leftClone = leftPart.clone(true);
                leftClone.visible = true;
                clone.add(leftClone);
            }

            if (rightPart && rightPart !== leftPart) {
                const rightClone = rightPart.clone(true);
                rightClone.visible = true;
                clone.add(rightClone);
            }
        }

        function cloneMaterialForPreview(mesh) {
            if (!mesh || !mesh.material) {
                return null;
            }
            if (!mesh.userData) {
                mesh.userData = {};
            }
            if (mesh.userData.__previewMaterialCloned) {
                return mesh.material;
            }
            if (Array.isArray(mesh.material)) {
                const clonedArray = mesh.material.map((material) => (material ? material.clone() : material));
                mesh.material = clonedArray;
                mesh.userData.__previewMaterialCloned = true;
                return mesh.material;
            }
            const cloned = mesh.material.clone();
            mesh.material = cloned;
            mesh.userData.__previewMaterialCloned = true;
            return cloned;
        }

        function getPreviewCategorySelection(category, overrideMetadata = null) {
            if (overrideMetadata && overrideMetadata.category === category) {
                return overrideMetadata.key;
            }
            return getCategoryPrimarySelection(category);
        }

        function getPreviewActiveProps(overridePropKey = null) {
            const activePreviewProps = new Set(activeProps);
            if (!overridePropKey) {
                return activePreviewProps;
            }
            const metadata = propRegistry.get(overridePropKey);
            if (!metadata) {
                return activePreviewProps;
            }
            if (singleEquipCategories.has(metadata.category)) {
                const currentForCategory = getCategorySelection(metadata.category);
                for (const selected of currentForCategory) {
                    activePreviewProps.delete(selected);
                }
            }
            activePreviewProps.add(overridePropKey);
            return activePreviewProps;
        }

        function applyPreviewEyeStyleToGroup(eyeGroup, presetKey = 'default') {
            if (!eyeGroup) {
                return;
            }
            const preset = EYE_APPEARANCE_PRESETS[presetKey] || EYE_APPEARANCE_PRESETS.default;
            const nodes = {};
            eyeGroup.traverse((node) => {
                if (!node || !node.isMesh || !node.userData) {
                    return;
                }
                if (node.userData.previewEyePart) {
                    nodes[node.userData.previewEyePart] = node;
                }
            });
            if (!nodes.sclera || !nodes.iris) {
                return;
            }

            const scleraMat = cloneMaterialForPreview(nodes.sclera);
            const irisMat = cloneMaterialForPreview(nodes.iris);
            const pupilMat = cloneMaterialForPreview(nodes.pupil);
            const shineMat = cloneMaterialForPreview(nodes.shine);
            const shine2Mat = cloneMaterialForPreview(nodes.shine2);

            if (scleraMat && scleraMat.color) {
                scleraMat.color.setHex(preset.scleraColor);
                scleraMat.needsUpdate = true;
            }
            if (irisMat && irisMat.color) {
                irisMat.color.setHex(preset.irisColor);
                irisMat.emissive.setHex(preset.irisEmissive);
                irisMat.emissiveIntensity = preset.irisEmissiveIntensity;
                irisMat.map = preset.irisMap || null;
                irisMat.needsUpdate = true;
            }
            if (pupilMat && pupilMat.color && nodes.pupil) {
                pupilMat.color.setHex(preset.pupilColor);
                nodes.pupil.scale.set(preset.pupilScaleX, preset.pupilScaleY, 1);
                nodes.pupil.position.set(preset.pupilOffsetX, preset.pupilOffsetY, 0.005);
                pupilMat.needsUpdate = true;
            }
            if (shineMat && shineMat.opacity !== undefined) {
                shineMat.opacity = preset.shineOpacity;
                shineMat.needsUpdate = true;
            }
            if (shine2Mat && shine2Mat.color) {
                shine2Mat.color.setHex(preset.secondaryShineColor);
                shine2Mat.opacity = preset.secondaryShineOpacity;
                shine2Mat.needsUpdate = true;
            }
        }

        function applyPreviewEyeStyleToCharacter(characterRoot, presetKey = 'default') {
            let leftEyeGroup = null;
            let rightEyeGroup = null;
            characterRoot?.traverse((node) => {
                if (!node?.userData) {
                    return;
                }
                if (node.userData.previewEyeSide === 'left') {
                    leftEyeGroup = node;
                }
                if (node.userData.previewEyeSide === 'right') {
                    rightEyeGroup = node;
                }
            });
            applyPreviewEyeStyleToGroup(leftEyeGroup, presetKey);
            applyPreviewEyeStyleToGroup(rightEyeGroup, presetKey);
        }

        function applyPreviewBodyMaterial(characterRoot, bodySelection = null) {
            let bodyNode = null;
            characterRoot?.traverse((node) => {
                if (node?.userData?.previewRole === 'body') {
                    bodyNode = node;
                }
            });

            if (!bodyNode) {
                return;
            }
            const bodyMat = cloneMaterialForPreview(bodyNode);
            if (!bodyMat || !bodyMat.color) {
                return;
            }

            if (bodySelection === 'royalArmorBody') {
                bodyMat.color.setHex(0x4a17b8);
                bodyMat.emissive.setHex(0x25054e);
                bodyMat.emissiveIntensity = 0.62;
                bodyMat.roughness = 0.34;
                bodyMat.clearcoat = 0.36;
                bodyMat.clearcoatRoughness = 0.56;
            } else if (bodySelection === 'archonBody') {
                bodyMat.color.setHex(0x5726ba);
                bodyMat.emissive.setHex(0x1f043e);
                bodyMat.emissiveIntensity = 0.56;
                bodyMat.roughness = 0.36;
                bodyMat.clearcoat = 0.32;
                bodyMat.clearcoatRoughness = 0.62;
            } else if (bodySelection === 'protectorRingBody') {
                bodyMat.color.setHex(0x4f24b5);
                bodyMat.emissive.setHex(0x1a0340);
                bodyMat.emissiveIntensity = 0.52;
                bodyMat.roughness = 0.38;
                bodyMat.clearcoat = 0.42;
                bodyMat.clearcoatRoughness = 0.5;
            } else {
                bodyMat.color.setHex(0x4b2aa8);
                bodyMat.emissive.setHex(0x13002b);
                bodyMat.emissiveIntensity = 0.45;
                bodyMat.roughness = 0.42;
                bodyMat.clearcoat = 0.32;
                bodyMat.clearcoatRoughness = 0.62;
            }
            bodyMat.needsUpdate = true;
        }

        function applyPreviewLoadoutToCharacter(characterRoot, overridePropKey = null) {
            const overrideMetadata = overridePropKey ? propRegistry.get(overridePropKey) : null;
            const previewProps = getPreviewActiveProps(overridePropKey);
            characterRoot?.traverse((node) => {
                const key = node?.userData?.propKey;
                if (!key) {
                    return;
                }
                const isVisible = previewProps.has(key);
                node.visible = isVisible;
                if (node.userData.left && node.userData.right) {
                    node.userData.left.visible = isVisible;
                    node.userData.right.visible = isVisible;
                }
            });

            const wingSelection = getPreviewCategorySelection('wingSet', overrideMetadata);
            const eyeSelection = getPreviewCategorySelection('eyes', overrideMetadata);
            const bodySelection = getPreviewCategorySelection('body', overrideMetadata);

            const hasWingSelection = !!wingSelection;
            characterRoot?.traverse((node) => {
                if (node?.userData?.previewWingBase) {
                    node.visible = !hasWingSelection;
                }
            });

            const eyePreset = eyeSelection ? (eyeStylePropToPreset[eyeSelection] || 'default') : 'default';
            applyPreviewEyeStyleToCharacter(characterRoot, eyePreset);
            applyPreviewBodyMaterial(characterRoot, bodySelection);
        }

        function buildCharacterPreviewObject(overridePropKey = null) {
            let clonedCharacter = null;
            try {
                clonedCharacter = creatureGroup.clone(true);
                applyPreviewLoadoutToCharacter(clonedCharacter, overridePropKey);
                sanitizePreviewInvalidGeometry(clonedCharacter);
                sanitizeFallbackGeometry(clonedCharacter.geometry);
                if (!hasFiniteRenderableGeometry(clonedCharacter)) {
                    throw new Error('Character preview has no finite renderable geometry');
                }
                return clonedCharacter;
            } catch (error) {
                console.warn('Primary character preview build failed, using compact fallback:', error?.message || error);
                const fallback = makeCompactCharacterPreviewFallback(overridePropKey);
                if (fallback) {
                    return fallback;
                }
                console.error('Unable to build character preview object:', error);
                setPreviewFallbackMessage('Unable to generate character preview for this item right now.');
                return null;
            }
        }

        function makeCompactCharacterPreviewFallback(overridePropKey = null) {
            const fallbackRoot = new THREE.Group();
            fallbackRoot.frustumCulled = false;

            if (bodyMesh?.geometry) {
                const bodyClone = bodyMesh.clone(true);
                bodyClone.visible = true;
                fallbackRoot.add(bodyClone);
            }

            const selectedSource = overridePropKey ? getItemByPropKey(overridePropKey) : null;
            if (selectedSource) {
                const selectedClone = selectedSource.clone(true);
                selectedClone.visible = true;
                attachDetachedPreviewParts(selectedClone, selectedSource);
                sanitizePreviewInvalidGeometry(selectedClone);
                const hasPart = hasFiniteRenderableGeometry(selectedClone);
                if (hasPart) {
                    fallbackRoot.add(selectedClone);
                }

                const selectedPreset = selectedSource?.userData?.eyePreset || selectedSource?.eyePreset || null;
                if (selectedPreset) {
                    applyPreviewEyeStyleToCharacter(fallbackRoot, selectedPreset);
                }
            }

            sanitizePreviewInvalidGeometry(fallbackRoot);
            if (!hasFiniteRenderableGeometry(fallbackRoot)) {
                return null;
            }

            setPreviewFallbackMessage('Character preview is shown in compact mode.');
            return fallbackRoot;
        }

        function getFiniteSizeVector(size, fallback = 1) {
            const safeX = Number.isFinite(size?.x) ? Math.abs(size.x) : fallback;
            const safeY = Number.isFinite(size?.y) ? Math.abs(size.y) : fallback;
            const safeZ = Number.isFinite(size?.z) ? Math.abs(size.z) : fallback;
            return new THREE.Vector3(
                Math.max(safeX, 0.001),
                Math.max(safeY, 0.001),
                Math.max(safeZ, 0.001)
            );
        }

        function getPreviewFitConfig(mode) {
            const isCharacterMode = mode === 'character';
            return {
                framePadding: isCharacterMode ? 0.84 : 0.86,
                baseScale: isCharacterMode ? 1.75 : 1.28,
                maxScale: isCharacterMode ? 1.0 : 2.4,
                minScale: isCharacterMode ? 0.22 : 0.18,
                minDistance: isCharacterMode ? 0.7 : 0.42
            };
        }

        function computePreviewCameraDistanceForScale(mode, safeSize, scale) {
            const cfg = getPreviewFitConfig(mode);
            const aspect = Math.max(0.35, previewCamera.aspect || 1);
            const halfFov = Math.max(0.01, THREE.MathUtils.degToRad(previewCamera.fov || 34) / 2);
            const halfTan = Math.max(0.002, Math.tan(halfFov));
            const pad = Math.max(0.2, Math.min(0.98, cfg.framePadding));

            const reqHeight = (safeSize.y * scale) / (2 * halfTan * pad);
            const reqWidth = (safeSize.x * scale) / (2 * halfTan * aspect * pad);
            const reqDepth = safeSize.z * scale * 0.85;
            return Math.max(cfg.minDistance, reqHeight, reqWidth, reqDepth);
        }

        function setPreviewCameraForObjectMode(mode, size, scale = 1, forcedDistance = null) {
            const safeSize = getFiniteSizeVector(size, 1);
            const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
            const isCharacterMode = mode === 'character';
            const requestedDistance = Number.isFinite(forcedDistance) && forcedDistance > 0 ? forcedDistance : null;
            if (isCharacterMode) {
                const baseDistance = computePreviewCameraDistanceForScale('character', safeSize, safeScale);
                const cameraDistance = Math.max(2.1, requestedDistance ?? baseDistance);
                const xOffset = Math.max(0.56, safeSize.x * safeScale * 0.16);
                previewCamera.position.set(0, xOffset + 0.5, cameraDistance);
                previewCamera.near = 0.01;
                previewCamera.far = Math.max(24, cameraDistance * 12);
                previewCamera.lookAt(0, -0.08, 0);
            } else {
                const baseDistance = computePreviewCameraDistanceForScale('item', safeSize, safeScale);
                const cameraDistance = Math.max(1.1, requestedDistance ?? baseDistance);
                previewCamera.position.set(0, safeSize.y * 0.1 * safeScale + 0.2, cameraDistance);
                previewCamera.near = 0.05;
                previewCamera.far = Math.max(10, cameraDistance * 12);
                previewCamera.lookAt(0, 0, 0);
            }
            previewCamera.updateProjectionMatrix();
        }

        function placeObjectInPreviewViewport(object, options = {}) {
            const { fallbackMessage = '', mode = 'item' } = options;
            const isCharacterMode = mode === 'character';
            if (!object) {
                return false;
            }

            try {
                sanitizePreviewInvalidGeometry(object);
                object.frustumCulled = false;
                object.position.set(0, 0, 0);
                object.rotation.set(0, 0, 0);
                object.scale.set(1, 1, 1);
                object.updateMatrixWorld(true);
            } catch (error) {
                console.error('Unable to sanitize object for preview viewport:', error);
                setPreviewFallbackMessage(fallbackMessage || 'Unable to generate this preview.');
                return false;
            }

            if (!hasFiniteRenderableGeometry(object)) {
                setPreviewFallbackMessage(fallbackMessage || 'Unable to calculate preview bounds for this object.');
                return false;
            }

            const worldBox = computeSafeObjectBounds(object);
            if (worldBox && !worldBox.isEmpty()) {
                const center = worldBox.getCenter(new THREE.Vector3());
                const rawSize = worldBox.getSize(new THREE.Vector3());
                const safeSize = getFiniteSizeVector(rawSize, 1.2);
                const safeCenter = new THREE.Vector3(
                    sanitizeFiniteNumber(center.x, 0),
                    sanitizeFiniteNumber(center.y, 0),
                    sanitizeFiniteNumber(center.z, 0)
                );
                if (
                    Number.isFinite(safeSize.x) && Number.isFinite(safeSize.y) && Number.isFinite(safeSize.z) &&
                    Number.isFinite(center.x) && Number.isFinite(center.y) && Number.isFinite(center.z)
                ) {
                    const maxDim = Math.max(safeSize.x, safeSize.y, safeSize.z);
                    const safeMaxDim = Number.isFinite(maxDim) ? Math.max(maxDim, 0.001) : 1.2;
                    const fitConfig = getPreviewFitConfig(mode);
                    const targetScale = Math.min(fitConfig.baseScale / safeMaxDim, fitConfig.maxScale);
                    const clampedScale = Math.max(fitConfig.minScale, targetScale);
                    const cameraDistance = computePreviewCameraDistanceForScale(mode, safeSize, clampedScale);
                    object.position.sub(safeCenter);
                    object.scale.setScalar(clampedScale);
                    setPreviewCameraForObjectMode(mode, safeSize, clampedScale, cameraDistance);
                    setPreviewFallbackMessage('');
                    return true;
                }
            }

            if (!hasFiniteRenderableGeometry(object)) {
                setPreviewFallbackMessage('Unable to calculate preview bounds for this object.');
                return false;
            }

            if (isCharacterMode) {
                object.position.set(0, -0.95, 0);
                object.scale.setScalar(0.43);
                setPreviewCameraForObjectMode('character', new THREE.Vector3(1, 3.8, 1), 0.43);
                setPreviewFallbackMessage(fallbackMessage || 'Unable to calculate character preview bounds.');
                return false;
            }

            object.position.set(0, -0.2, 0);
            object.scale.setScalar(0.55);
            setPreviewCameraForObjectMode('item', new THREE.Vector3(1.2, 1.2, 1.2), 0.55);
            setPreviewFallbackMessage(fallbackMessage);
            return false;
        }

        function setPreviewFallbackMessage(message) {
            if (!propPreviewFallback) {
                return;
            }
            const text = message?.trim() || '';
            propPreviewFallback.textContent = text;
            propPreviewFallback.classList.toggle('show', text.length > 0);
        }

        function resizePropViewport() {
            if (!propPreviewViewport) return;
            const viewportRect = propPreviewViewport.getBoundingClientRect();
            const width = Math.max(180, Math.floor(viewportRect.width));
            const height = Math.max(110, Math.floor(viewportRect.height));
            previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            previewRenderer.setSize(width, height, false);
            previewCamera.aspect = width / Math.max(1, height);
            previewCamera.updateProjectionMatrix();
        }

        function createPreviewFallbackModel() {
            const fallbackGroup = new THREE.Group();
            fallbackGroup.frustumCulled = false;
            const pedestal = new THREE.Mesh(
                new THREE.CylinderGeometry(0.44, 0.52, 0.09, 28),
                new THREE.MeshStandardMaterial({
                    color: 0xa9bfd7,
                    roughness: 0.65,
                    metalness: 0.05,
                    emissive: 0x7db0df,
                    emissiveIntensity: 0.2
                })
            );
            pedestal.position.set(0, -0.34, 0);
            fallbackGroup.add(pedestal);

            const orb = new THREE.Mesh(
                new THREE.TorusKnotGeometry(0.21, 0.028, 128, 12),
                new THREE.MeshStandardMaterial({
                    color: 0xc6ecff,
                    roughness: 0.18,
                    metalness: 0.82,
                    emissive: 0x6fd5ff,
                    emissiveIntensity: 0.55,
                    transparent: true,
                    opacity: 0.94
                })
            );
            orb.position.set(0, 0.16, 0);
            orb.rotation.set(Math.PI * 0.06, Math.PI * 0.35, Math.PI * 0.12);
            fallbackGroup.add(orb);

            return fallbackGroup;
        }

        function setPreviewActionLabel(mode) {
            if (!propPreviewApplyBtn) {
                return;
            }
            const label = mode === 'character'
                ? 'Viewing on Character (Preview)'
                : 'Preview on Character';
            propPreviewApplyBtn.textContent = label;
            propPreviewApplyBtn.setAttribute('aria-label', label);
        }

        function setPreviewObject(propKey, label = 'Unknown item') {
            const source = getItemByPropKey(propKey);
            if (!source) {
                setPreviewActionButtonsDisabled(true);
                return;
            }
            propPreviewPanel.classList.add('open');
            previewState.open = true;
            previewState.viewMode = 'item';
            setPreviewActionLabel('item');
            if (propPreviewOverlay) {
                propPreviewOverlay.classList.add('open');
            }
            setPreviewFallbackMessage('Loading preview…');
            setPreviewActionButtonsDisabled(true);
            if (previewState.object) {
                previewScene.remove(previewState.object);
                previewState.object = null;
            }

            const previewBuild = buildPreviewObject(source);
            const cloned = previewBuild?.object;
            const hasRenderableMesh = previewBuild?.hasRenderableMesh ?? false;
            if (!cloned) {
                setPreviewFallbackMessage('Unable to build this prop preview.');
                setPreviewActionButtonsDisabled(true);
                return;
            }

            const hasFiniteGeometry = hasFiniteRenderableGeometry(cloned);
            const fallbackMessage = hasRenderableMesh
                ? 'Unable to calculate preview bounds.'
                : 'This prop does not yet have a standalone preview mesh. Place it on the character to see it in context.';
            if (!hasFiniteGeometry) {
                const fallback = createPreviewFallbackModel();
                fallback.position.set(0, 0, 0);
                previewState.object = fallback;
                previewState.propKey = propKey;
                previewState.label = label;
                previewState.rotateY = 0;
                previewState.hasStandaloneMesh = false;
                if (previewScene) {
                    previewScene.add(fallback);
                }
                placeObjectInPreviewViewport(fallback, {
                    mode: 'item',
                    fallbackMessage
                });
                propPreviewName.textContent = `${label} Preview`;
                setPreviewActionButtonsDisabled(false);
                resizePropViewport();
                return;
            }

            previewState.object = cloned;
            previewState.propKey = propKey;
            previewState.label = label;
            previewState.rotateY = 0;
            cloned.position.set(0, 0, 0);
            cloned.rotation.set(0, 0, 0);
            cloned.scale.set(1, 1, 1);
            previewState.hasStandaloneMesh = placeObjectInPreviewViewport(cloned, {
                mode: 'item',
                fallbackMessage
            });
            if (!previewState.hasStandaloneMesh) {
                const fallback = createPreviewFallbackModel();
                previewState.object = fallback;
                previewState.hasStandaloneMesh = false;
                if (previewScene) {
                    previewScene.remove(cloned);
                    previewScene.add(fallback);
                }
                placeObjectInPreviewViewport(fallback, {
                    mode: 'item',
                    fallbackMessage
                });
            } else {
                previewScene.add(cloned);
            }

            setPreviewActionButtonsDisabled(false);
            propPreviewName.textContent = `${label} Preview`;
            resizePropViewport();
        }

        function createMysteryBoxModel() {
            const boxGroup = new THREE.Group();
            boxGroup.frustumCulled = false;
            const purpleMat = new THREE.MeshStandardMaterial({
                color: 0x9b59b6,
                roughness: 0.34,
                metalness: 0.12,
                emissive: 0x2a1237,
                emissiveIntensity: 0.24
            });
            const blueMat = new THREE.MeshStandardMaterial({
                color: 0x3498db,
                roughness: 0.28,
                metalness: 0.2,
                emissive: 0x071a34,
                emissiveIntensity: 0.2
            });
            const greenMat = new THREE.MeshStandardMaterial({
                color: 0x2ecc71,
                roughness: 0.38,
                metalness: 0.14,
                emissive: 0x0b2b18,
                emissiveIntensity: 0.2
            });
            const yellowMat = new THREE.MeshStandardMaterial({
                color: 0xf1c40f,
                roughness: 0.22,
                metalness: 0.36,
                emissive: 0x4b3305,
                emissiveIntensity: 0.36
            });
            const cornerMat = new THREE.MeshStandardMaterial({
                color: 0xffb347,
                roughness: 0.24,
                metalness: 0.52,
                emissive: 0x4c2307,
                emissiveIntensity: 0.42
            });
            const shadowMaterial = new THREE.MeshBasicMaterial({
                color: 0x35566f,
                transparent: true,
                opacity: 0.22,
                side: THREE.DoubleSide,
                depthWrite: false
            });

            const bodyGroup = new THREE.Group();
            bodyGroup.position.set(0, 0, 0);
            boxGroup.add(bodyGroup);

            const bottom = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 2.2), purpleMat);
            bottom.position.set(0, 0.1, 0);
            bottom.castShadow = true;
            bottom.receiveShadow = false;
            bodyGroup.add(bottom);

            const left = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.0, 2.2), blueMat);
            left.position.set(-1.1, 1.1, 0);
            left.castShadow = true;
            left.receiveShadow = false;
            bodyGroup.add(left);

            const right = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.0, 2.2), blueMat);
            right.position.set(1.1, 1.1, 0);
            right.castShadow = true;
            right.receiveShadow = false;
            bodyGroup.add(right);

            const front = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 0.2), greenMat);
            front.position.set(0, 1.1, 1.1);
            front.castShadow = true;
            front.receiveShadow = false;
            bodyGroup.add(front);

            const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 0.2), greenMat);
            back.position.set(0, 1.1, -1.1);
            back.castShadow = true;
            back.receiveShadow = false;
            bodyGroup.add(back);

            const lidPivot = new THREE.Group();
            lidPivot.position.set(0, 2.1, -0.85);
            bodyGroup.add(lidPivot);
            const lid = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 2.4), yellowMat);
            lid.position.set(0, 0.1, 0.85);
            lid.castShadow = true;
            lid.receiveShadow = false;
            lidPivot.add(lid);

            const lockBadge = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 14, 28), yellowMat);
            lockBadge.position.set(0, -0.02, 2.0);
            lockBadge.rotation.x = Math.PI * 0.5;
            lidPivot.add(lockBadge);

            const cornerPositions = [
                [-1.1, 0.3, -1.1], [1.1, 0.3, -1.1], [-1.1, 0.3, 1.1], [1.1, 0.3, 1.1],
                [-1.1, 2.0, -1.1], [1.1, 2.0, -1.1], [-1.1, 2.0, 1.1], [1.1, 2.0, 1.1]
            ];
            const cornerOrbs = cornerPositions.map((pos) => {
                const orb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), cornerMat);
                orb.position.set(pos[0], pos[1], pos[2]);
                orb.castShadow = true;
                orb.receiveShadow = false;
                bodyGroup.add(orb);
                return orb;
            });

            const dustCount = 140;
            const dustGeometry = new THREE.BufferGeometry();
            const dustPositions = new Float32Array(dustCount * 3);
            const dustBase = new Float32Array(dustCount * 3);
            const dustPhase = new Float32Array(dustCount);
            for (let i = 0; i < dustCount; i++) {
                const i3 = i * 3;
                const r = 0.3 + Math.random() * 1.2;
                const a = Math.random() * Math.PI * 2;
                const y = 0.18 + Math.random() * 1.15;
                dustBase[i3] = Math.cos(a) * r;
                dustBase[i3 + 1] = y;
                dustBase[i3 + 2] = Math.sin(a) * r;
                dustPositions[i3] = dustBase[i3];
                dustPositions[i3 + 1] = dustBase[i3 + 1];
                dustPositions[i3 + 2] = dustBase[i3 + 2];
                dustPhase[i] = Math.random() * Math.PI * 2;
            }
            dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
            const dustMaterial = new THREE.PointsMaterial({
                color: 0xbbeeff,
                size: 0.1,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            const dustPoints = new THREE.Points(dustGeometry, dustMaterial);
            dustPoints.visible = false;
            dustPoints.frustumCulled = false;
            bodyGroup.add(dustPoints);

            const impactRing = new THREE.Mesh(new THREE.RingGeometry(0.18, 1.55, 48), shadowMaterial);
            impactRing.rotation.x = -Math.PI / 2;
            impactRing.position.set(0, -0.07, 0);
            impactRing.visible = false;
            impactRing.castShadow = false;
            impactRing.receiveShadow = false;
            bodyGroup.add(impactRing);

            const burstPieces = [bottom, left, right, front, back, lid, ...cornerOrbs];
            const burstStartPos = burstPieces.map((piece) => piece.position.clone());
            const burstStartRot = burstPieces.map((piece) => piece.rotation.clone());
            const burstDirs = burstPieces.map((piece) => {
                const dir = piece.position.clone();
                if (!Number.isFinite(dir.x) || !Number.isFinite(dir.y) || !Number.isFinite(dir.z) || dir.lengthSq() < 1e-6) {
                    dir.set(0, 1, 0);
                } else {
                    dir.normalize();
                }
                return dir;
            });

            boxGroup.userData = {
                lidPivot,
                lid,
                impact: impactRing,
                trailRing: null,
                dustPoints,
                dustBase,
                dustPhase,
                burstPieces,
                burstStartPos,
                burstStartRot,
                burstDirs
            };
            sanitizePreviewInvalidGeometry(boxGroup);
            boxGroup.traverse((node) => {
                if (!node?.isMesh) return;
                node.castShadow = true;
                node.receiveShadow = false;
            });

            return boxGroup;
        }

        function createMysteryShadowTexture() {
            const blurPx = MYSTERY_BOX_CONFIG.shadowPngBlurPx ?? 0;
            const tex = new THREE.TextureLoader().load('./Images/PerfectBoxShadow.png', (loadedTex) => {
                if (!blurPx || blurPx <= 0) {
                    return;
                }
                const source = loadedTex.image;
                if (!source || !source.width || !source.height) {
                    return;
                }

                const canvas = document.createElement('canvas');
                canvas.width = source.width;
                canvas.height = source.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return;
                }
                ctx.filter = `blur(${blurPx}px)`;
                ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
                loadedTex.image = canvas;
                loadedTex.needsUpdate = true;
            });
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.generateMipmaps = false;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.needsUpdate = true;
            return tex;
        }

        function createMysteryGroundShadows() {
            const coreTexture = createMysteryShadowTexture();
            const tailTexture = createMysteryShadowTexture();
            const contactTexture = createMysteryShadowTexture();
            const commonMatProps = {
                transparent: true,
                alphaTest: 0,
                depthWrite: false,
                depthTest: true,
                toneMapped: false,
                side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: -2,
                polygonOffsetUnits: -2
            };
            const core = new THREE.Mesh(
                new THREE.PlaneGeometry(1, 1),
                new THREE.MeshBasicMaterial({
                    map: coreTexture,
                    color: 0x000000,
                    opacity: MYSTERY_BOX_CONFIG.shadowCoreOpacity || 0.54,
                    ...commonMatProps
                })
            );
            const tail = new THREE.Mesh(
                new THREE.PlaneGeometry(1, 1),
                new THREE.MeshBasicMaterial({
                    map: tailTexture,
                    color: 0x000000,
                    opacity: MYSTERY_BOX_CONFIG.shadowTailOpacity || 0.38,
                    ...commonMatProps
                })
            );
            const contact = new THREE.Mesh(
                new THREE.PlaneGeometry(1, 1),
                new THREE.MeshBasicMaterial({
                    map: contactTexture,
                    color: 0x000000,
                    opacity: MYSTERY_BOX_CONFIG.shadowContactOpacity || 0.72,
                    ...commonMatProps
                })
            );
            core.renderOrder = 3;
            tail.renderOrder = 2;
            contact.renderOrder = 4;
            core.rotation.x = -Math.PI / 2;
            tail.rotation.x = -Math.PI / 2;
            contact.rotation.x = -Math.PI / 2;
            const shadowAspect = 290 / 177;
            const coreHeight = MYSTERY_BOX_CONFIG.shadowCoreSizeZ ?? 1.55;
            const tailHeight = MYSTERY_BOX_CONFIG.shadowTailSizeZ ?? 1.95;
            const contactHeight = MYSTERY_BOX_CONFIG.shadowContactSizeZ ?? 1.3;
            const shadowPngScale = MYSTERY_BOX_CONFIG.shadowPngScale ?? 1;
            const shadowPngScaleY = MYSTERY_BOX_CONFIG.shadowPngScaleY ?? 1;
            core.scale.set(coreHeight * shadowAspect * shadowPngScale, coreHeight * shadowPngScale * shadowPngScaleY, 1);
            tail.scale.set(tailHeight * shadowAspect * shadowPngScale, tailHeight * shadowPngScale * shadowPngScaleY, 1);
            contact.scale.set(contactHeight * shadowAspect * shadowPngScale, contactHeight * shadowPngScale * shadowPngScaleY, 1);
            return { core, tail, contact };
        }

        function clearMysteryGroundShadows() {
            const meshes = [mysteryState.shadowCore, mysteryState.shadowTail, mysteryState.shadowContact];
            for (const mesh of meshes) {
                if (!mesh) continue;
                scene.remove(mesh);
                if (mesh.material?.map) mesh.material.map.dispose();
                mesh.material?.dispose?.();
                mesh.geometry?.dispose?.();
            }
            mysteryState.shadowCore = null;
            mysteryState.shadowTail = null;
            mysteryState.shadowContact = null;
        }

        function updateMysteryGroundShadows(root) {
            const core = mysteryState.shadowCore;
            const tail = mysteryState.shadowTail;
            const contact = mysteryState.shadowContact;
            if (!root || !core || !tail || !contact) return;

            const scale = mysteryState.baseScale || 1;
            const casterHeight = root.position.y + 1.12 * scale;
            const heightAboveGround = Math.max(0, casterHeight - ground.position.y);
            const effectiveHeight = Math.min(6.5, heightAboveGround);
            const landingBaseY = Number.isFinite(mysteryState.landingY) ? mysteryState.landingY : root.position.y;
            const groundY = landingBaseY + (MYSTERY_BOX_CONFIG.shadowGroundLift ?? 0.028);
            const phaseFade = mysteryState.phase === 'cooldown'
                ? 1 - THREE.MathUtils.clamp(
                    mysteryState.timer / Math.max(0.01, MYSTERY_BOX_CONFIG.cleanupDuration || 1.35),
                    0,
                    1
                )
                : 1;
            const isFalling = mysteryState.phase === 'falling';
            const fallSpan = Math.max(0.4, mysteryState.startY - mysteryState.landingY);
            const dropProgress = isFalling
                ? THREE.MathUtils.clamp((mysteryState.startY - root.position.y) / fallSpan, 0, 1)
                : 1;
            const dropStart = MYSTERY_BOX_CONFIG.shadowDropInStart ?? 0.24;
            const dropFade = isFalling
                ? THREE.MathUtils.smoothstep(
                    dropStart,
                    1,
                    THREE.MathUtils.clamp(dropProgress, 0, 1)
                ) ** (MYSTERY_BOX_CONFIG.shadowDropInPower ?? 1.45)
                : 1;
            const dropMin = MYSTERY_BOX_CONFIG.shadowDropInMin ?? 0.08;
            const shadowIntroFade = THREE.MathUtils.lerp(dropMin, 1, dropFade);
            const heightFadeStrength = MYSTERY_BOX_CONFIG.shadowHeightFadeStrength ?? 0.082;
            const heightFade = THREE.MathUtils.clamp(1 - effectiveHeight * heightFadeStrength, 0.22, 1);
            const contactHeightFade = THREE.MathUtils.clamp(1 - effectiveHeight * (heightFadeStrength * 1.12), 0.3, 1);
            const landingBoostDuration = Math.max(0.001, MYSTERY_BOX_CONFIG.shadowLandingBoostDuration ?? 0.24);
            const landingBoostRaw = mysteryState.phase === 'landed'
                ? 1 - THREE.MathUtils.clamp(mysteryState.timer / landingBoostDuration, 0, 1)
                : 0;
            const landingBoost = landingBoostRaw * landingBoostRaw;

            const toCamera = new THREE.Vector3(
                camera.position.x - root.position.x,
                0,
                camera.position.z - root.position.z
            );
            if (toCamera.lengthSq() < 1e-6) {
                toCamera.set(0, 0, 1);
            } else {
                toCamera.normalize();
            }
            const edgeAnchorDistance = (MYSTERY_BOX_CONFIG.shadowEdgeAnchorTowardCamera ?? 0.98) * scale;
            const edgeX = root.position.x + toCamera.x * edgeAnchorDistance;
            const edgeZ = root.position.z + toCamera.z * edgeAnchorDistance;

            const castDir = new THREE.Vector3(
                MYSTERY_BOX_CONFIG.shadowDirectionX ?? -0.58,
                0,
                MYSTERY_BOX_CONFIG.shadowDirectionZ ?? 0.82
            );
            if (castDir.lengthSq() < 1e-6) {
                castDir.set(-0.58, 0, 0.82);
            } else {
                castDir.normalize();
            }

            const coreOffset = MYSTERY_BOX_CONFIG.shadowCoreOffset ?? 0;
            const tailOffset = (MYSTERY_BOX_CONFIG.shadowTailOffset ?? 0.08) + effectiveHeight * (MYSTERY_BOX_CONFIG.shadowDriftPerUnit ?? 0.14);
            const contactOffset = MYSTERY_BOX_CONFIG.shadowContactOffset ?? 0;
            core.position.set(edgeX + castDir.x * coreOffset, groundY, edgeZ + castDir.z * coreOffset);
            tail.position.set(edgeX + castDir.x * tailOffset, groundY - 0.002, edgeZ + castDir.z * tailOffset);
            contact.position.set(edgeX + castDir.x * contactOffset, groundY + 0.001, edgeZ + castDir.z * contactOffset);
            core.rotation.set(-Math.PI / 2, 0, 0);
            tail.rotation.set(-Math.PI / 2, 0, 0);
            contact.rotation.set(-Math.PI / 2, 0, 0);

            const coreLandingBoost = 1 + (MYSTERY_BOX_CONFIG.shadowLandingBoostCore ?? 0.2) * landingBoost;
            const tailLandingBoost = 1 + (MYSTERY_BOX_CONFIG.shadowLandingBoostTail ?? 0.12) * landingBoost;
            const contactLandingBoost = 1 + (MYSTERY_BOX_CONFIG.shadowLandingBoostContact ?? 0.24) * landingBoost;
            core.material.opacity = (MYSTERY_BOX_CONFIG.shadowCoreOpacity ?? 0.54) * coreLandingBoost * heightFade * phaseFade * shadowIntroFade;
            tail.material.opacity = (MYSTERY_BOX_CONFIG.shadowTailOpacity ?? 0.38) * tailLandingBoost * heightFade * phaseFade * shadowIntroFade;
            contact.material.opacity = (MYSTERY_BOX_CONFIG.shadowContactOpacity ?? 0.72) * contactLandingBoost * contactHeightFade * phaseFade * shadowIntroFade;
            core.visible = core.material.opacity > 0.004;
            tail.visible = tail.material.opacity > 0.004;
            contact.visible = contact.material.opacity > 0.004;
        }

        function pickMysteryRewardKey() {
            const keys = [];
            propRegistry.forEach((meta) => {
                if (meta?.key) keys.push(meta.key);
            });
            if (keys.length === 0) {
                return null;
            }
            return keys[Math.floor(Math.random() * keys.length)];
        }

        function launchMysteryBox() {
            if (mysteryState.phase !== 'idle' && mysteryState.phase !== 'cooldown') {
                return;
            }
            clearMysteryBox();

            const model = createMysteryBoxModel();
            const creaturePosition = new THREE.Vector3();
            creatureGroup.getWorldPosition(creaturePosition);
            const creatureQuaternion = new THREE.Quaternion();
            creatureGroup.getWorldQuaternion(creatureQuaternion);
            const rawForward = new THREE.Vector3(0, 0, 1).applyQuaternion(creatureQuaternion).setY(0);
            if (!Number.isFinite(rawForward.x) || !Number.isFinite(rawForward.z) || rawForward.lengthSq() < 1e-6) {
                rawForward.set(0, 0, -1);
            } else {
                rawForward.normalize();
            }

            const prevForward = stableMysteryForward.clone();
            const looksBackwards = prevForward.lengthSq() > 1e-6 && prevForward.dot(rawForward) < -0.22;
            if (looksBackwards && rawForward.lengthSq() > 0.5) {
                rawForward.copy(prevForward);
            }

            const towardCamera = new THREE.Vector3(
                camera.position.x - creaturePosition.x,
                0,
                camera.position.z - creaturePosition.z
            );
            if (towardCamera.lengthSq() > 1e-6) {
                towardCamera.normalize();
                if (Number.isFinite(towardCamera.x) && Number.isFinite(towardCamera.z) && rawForward.dot(towardCamera) < 0) {
                    rawForward.multiplyScalar(-1);
                }
            }

            rawForward.normalize();
            stableMysteryForward.copy(rawForward);

            const forward = rawForward;
            const right = new THREE.Vector3(0, 1, 0).cross(forward).normalize();
            if (!Number.isFinite(right.x) || !Number.isFinite(right.z) || right.lengthSq() < 1e-6) {
                right.set(1, 0, 0);
            }

            const side = (Math.random() - 0.5) * MYSTERY_BOX_CONFIG.sideOffset;
            const landingTarget = creaturePosition.clone()
                .addScaledVector(forward, MYSTERY_BOX_CONFIG.frontOffset)
                .addScaledVector(right, side)
                .setY(ground.position.y + MYSTERY_BOX_CONFIG.groundOffset);
            landingTarget.x = creaturePosition.x;
            const startOffset = MYSTERY_BOX_CONFIG.spawnHeightExtra + Math.random() * MYSTERY_BOX_CONFIG.spawnHeightSpread;
            let startY = Math.max(creaturePosition.y + startOffset, ground.position.y + 16);
            if (mysteryFlightCinematic.active) {
                startY = ground.position.y + (MYSTERY_CHARACTER_FLIGHT_CONFIG.boxDropStartHeight ?? 20.2);
            }

            model.position.copy(landingTarget);
            model.position.y = startY;
            const baseMysteryScale = MYSTERY_BOX_CONFIG.modelScale || 1;
            model.scale.setScalar(baseMysteryScale);
            model.rotation.set(
                THREE.MathUtils.degToRad(Math.random() * 20 - 10),
                Math.random() * Math.PI * 2,
                THREE.MathUtils.degToRad(Math.random() * 16 - 8)
            );
            model.userData.lidPivot?.rotation?.set(0, 0, 0);
            if (model.userData.burstPieces && model.userData.burstStartPos && model.userData.burstStartRot) {
                model.userData.burstPieces.forEach((piece, index) => {
                    const startPos = model.userData.burstStartPos[index];
                    const startRot = model.userData.burstStartRot[index];
                    if (startPos) piece.position.copy(startPos);
                    if (startRot) piece.rotation.copy(startRot);
                    piece.scale.setScalar(1);
                    piece.visible = true;
                    const mats = Array.isArray(piece.material) ? piece.material : [piece.material];
                    mats.forEach((mat) => {
                        if (!mat) return;
                        mat.transparent = true;
                        mat.opacity = 1;
                        mat.needsUpdate = true;
                    });
                });
            }
            if (model.userData.dustPoints?.material) {
                model.userData.dustPoints.visible = false;
                model.userData.dustPoints.material.opacity = 0;
                model.userData.dustPoints.material.size = 0.1;
            }
            if (model.userData.dustPoints?.geometry?.attributes?.position?.array && model.userData.dustBase) {
                const dustArray = model.userData.dustPoints.geometry.attributes.position.array;
                const baseArray = model.userData.dustBase;
                const len = Math.min(dustArray.length, baseArray.length);
                for (let i = 0; i < len; i++) {
                    dustArray[i] = baseArray[i];
                }
                model.userData.dustPoints.geometry.attributes.position.needsUpdate = true;
            }
            if (model.userData.impact) {
                model.userData.impact.visible = false;
                model.userData.impact.material.opacity = 0;
            }
            const { core: mysteryShadowCore, tail: mysteryShadowTail, contact: mysteryShadowContact } = createMysteryGroundShadows();
            scene.add(mysteryShadowTail);
            scene.add(mysteryShadowCore);
            scene.add(mysteryShadowContact);
            mysteryState.shadowCore = mysteryShadowCore;
            mysteryState.shadowTail = mysteryShadowTail;
            mysteryState.shadowContact = mysteryShadowContact;
            scene.add(model);
            mysteryState.phase = 'falling';
            mysteryState.root = model;
            mysteryState.timer = 0;
            mysteryState.startY = startY;
            mysteryState.landingY = landingTarget.y;
            mysteryState.startPoint.copy(landingTarget).setY(startY);
            mysteryState.landingPoint = landingTarget.clone();
            mysteryState.seed = Math.random() * Math.PI * 2;
            const fallDistance = Math.max(0.35, Math.abs(startY - landingTarget.y));
            const gravity = MYSTERY_BOX_CONFIG.fallGravity || 16.8;
            mysteryState.fallVelocity = -Math.sqrt(gravity * fallDistance * 2) * 0.85;
            mysteryState.spinVelX = (Math.random() * 0.58 + 0.08) * (Math.random() < 0.5 ? -1 : 1);
            mysteryState.spinVelY = (Math.random() * 1.45 + 0.35) * (Math.random() < 0.5 ? -1 : 1);
            mysteryState.spinVelZ = (Math.random() * 0.34 + 0.04) * (Math.random() < 0.5 ? -1 : 1);
            mysteryState.settled = false;
            mysteryState.rewardKey = null;
            mysteryState.rewardLabel = null;
            mysteryState.rewardShown = false;
            mysteryState.previewPrimed = false;
            mysteryState.baseScale = baseMysteryScale;
            updateMysteryGroundShadows(model);
            if (mysteryToggle) {
                mysteryToggle.disabled = true;
                mysteryToggle.setAttribute('aria-disabled', 'true');
            }
            setContactShadowFade(1);
        }

        function clearMysteryBox() {
            clearMysteryGroundShadows();
            if (mysteryState.root) {
                scene.remove(mysteryState.root);
            }
            mysteryState.phase = 'idle';
            mysteryState.root = null;
            mysteryState.timer = 0;
            mysteryState.startY = 0;
            mysteryState.landingY = 0;
            mysteryState.target = null;
            mysteryState.fallVelocity = 0;
            mysteryState.spinVelX = 0;
            mysteryState.spinVelY = 0;
            mysteryState.spinVelZ = 0;
            mysteryState.settled = false;
            mysteryState.rewardKey = null;
            mysteryState.rewardLabel = null;
            mysteryState.rewardShown = false;
            mysteryState.previewPrimed = false;
            mysteryState.baseScale = 1;
            mysteryState.shadowCore = null;
            mysteryState.shadowTail = null;
            mysteryState.shadowContact = null;
            const preserveCinematic =
                mysteryFlightCinematic.active &&
                mysteryFlightCinematic.dropTriggered &&
                mysteryFlightCinematic.phase !== 'idle';
            if (!preserveCinematic) {
                resetMysteryCinematicState();
            }
            setContactShadowFade(1);
            if (mysteryToggle) {
                mysteryToggle.disabled = false;
                mysteryToggle.setAttribute('aria-disabled', 'false');
            }
        }

        function interruptCharacterActionScenesForMystery() {
            if (emotionState.active) {
                const fadeOut = Math.max(0.01, emotionState.active.fadeOut ?? 0.45);
                emotionState.elapsed = Math.max(emotionState.elapsed, emotionState.active.duration - fadeOut);
                emotionState.active = null;
            }
            emotionState.elapsed = 0;
            if (stuntState.active) {
                const fadeOut = Math.max(0.01, stuntState.active.fadeOut ?? 0.55);
                stuntState.elapsed = Math.max(stuntState.elapsed, stuntState.active.duration - fadeOut);
                stuntState.active = null;
            }
            stuntState.cooldown = Math.max(stuntState.cooldown, 3.2);
            // Let current stunt motion settle naturally for seamless continuity.
            stuntSim.flapHzAdd = 0;
            stuntSim.wingAmpMul = 1;
            holdInput.active = false;
            holdInput.pointerId = null;
            holdInput.startedMs = 0;
            holdInput.triggered = false;

            const blendDur = Math.max(0.001, MYSTERY_CHARACTER_FLIGHT_CONFIG.interruptionBlendDuration ?? 0.42);
            mysteryFlightCinematic.actionSuppress = blendDur;
        }

        function startMysteryFlightCinematic() {
            const canStart = mysteryState.phase === 'idle' || mysteryState.phase === 'cooldown';
            if (!canStart) {
                return false;
            }
            if (mysteryFlightCinematic.active) {
                resetMysteryCinematicState();
            }
            interruptCharacterActionScenesForMystery();
            const sideHint = Math.sign(cursor.x);
            const sideSign =
                sideHint !== 0
                    ? sideHint
                    : Math.sign(creatureGroup.rotation.y) || 1;
            mysteryFlightCinematic.active = true;
            mysteryFlightCinematic.phase = 'anticipation';
            mysteryFlightCinematic.timer = 0;
            mysteryFlightCinematic.offscreenTimer = 0;
            mysteryFlightCinematic.offscreenTriggered = false;
            mysteryFlightCinematic.dropTriggered = false;
            mysteryFlightCinematic.returnQueued = false;
            mysteryFlightCinematic.rigOffset.set(0, 0, 0);
            mysteryFlightCinematic.wingBoost = 1;
            mysteryFlightCinematic.hardFlap = 0;
            mysteryFlightCinematic.wingLift = 0;
            mysteryFlightCinematic.bodyYaw = 0;
            mysteryFlightCinematic.bodyPitch = 0;
            mysteryFlightCinematic.bodyRoll = 0;
            mysteryFlightCinematic.eyeTargetX = 0;
            mysteryFlightCinematic.eyeTargetY = 0;
            mysteryFlightCinematic.eyeBlend = 0;
            mysteryFlightCinematic.burstStartOffset.set(0, 0, 0);
            mysteryFlightCinematic.burstVelocity.set(0, 0, 0);
            mysteryFlightCinematic.wingPhase = 0;
            mysteryFlightCinematic.returnStartOffset.set(0, 0, 0);
            mysteryFlightCinematic.returnStartBodyYaw = 0;
            mysteryFlightCinematic.returnStartBodyPitch = 0;
            mysteryFlightCinematic.returnStartBodyRoll = 0;
            mysteryFlightCinematic.returnStartEyeY = 0;
            mysteryFlightCinematic.anticipationSide = sideSign;
            mysteryFlightCinematic.finalSide = -sideSign;
            mysteryTornadoAngle = 0;
            mysteryTornadoRadius = 0;
            mysteryFlapLift = 0;
            mysteryFlapRoll = 0;
            mysteryBodySpinYaw = 0;
            mysteryBodySwingPitch = 0;
            if (mysteryToggle) {
                mysteryToggle.disabled = true;
                mysteryToggle.setAttribute('aria-disabled', 'true');
            }
            return true;
        }

        function requestMysteryFlightReturn() {
            if (!mysteryFlightCinematic.active) {
                return;
            }
            mysteryFlightCinematic.returnQueued = true;
            if (mysteryFlightCinematic.phase === 'hold') {
                mysteryFlightCinematic.phase = 'return';
                mysteryFlightCinematic.timer = 0;
                mysteryFlightCinematic.returnStartOffset.copy(mysteryFlightCinematic.rigOffset);
                mysteryFlightCinematic.returnStartBodyYaw = mysteryFlightCinematic.bodyYaw;
                mysteryFlightCinematic.returnStartBodyPitch = mysteryFlightCinematic.bodyPitch;
                mysteryFlightCinematic.returnStartBodyRoll = mysteryFlightCinematic.bodyRoll;
                mysteryFlightCinematic.returnStartEyeY = mysteryFlightCinematic.eyeTargetY;
            }
        }

        function updateMysteryFlightCinematic(dt, t) {
            const fx = mysteryFlightCinematic;
            fx.rigOffset.set(0, 0, 0);
            fx.wingBoost = 1;
            fx.hardFlap = 0;
            fx.wingLift = 0;
            fx.bodyYaw = 0;
            fx.bodyPitch = 0;
            fx.bodyRoll = 0;
            fx.eyeTargetX = 0;
            fx.eyeTargetY = 0;
            fx.eyeBlend = 0;
            if (!fx.active) {
                return fx;
            }

            const cfg = MYSTERY_CHARACTER_FLIGHT_CONFIG;
            const clamp01 = (v) => THREE.MathUtils.clamp(v, 0, 1);
            const smooth01 = (v) => {
                const c = clamp01(v);
                return c * c * (3 - 2 * c);
            };
            const smoother01 = (v) => {
                const c = clamp01(v);
                return c * c * c * (c * (c * 6 - 15) + 10);
            };
            const easeOutCubic = (v) => 1 - Math.pow(1 - clamp01(v), 3);
            const easeInCubic = (v) => Math.pow(clamp01(v), 3);
            const tau = Math.PI * 2;

            fx.timer += dt;
            if (fx.actionSuppress > 0) {
                fx.actionSuppress = Math.max(0, fx.actionSuppress - dt);
            }

            const rawSide =
                fx.anticipationSide !== 0
                    ? fx.anticipationSide
                    : Math.sign(creatureGroup.rotation.y);
            const signedSide = rawSide !== 0 ? rawSide : 1;
            const finalSide = fx.finalSide || (-signedSide);
            const checkOffscreen = (x, y, z) => {
                const worldPoint = mysteryFlightCinematicScreenProbe.set(x, y, z).project(camera);
                const margin = cfg.offscreenMargin || 1.03;
                return (
                    Math.abs(worldPoint.x) > margin ||
                    Math.abs(worldPoint.y) > margin ||
                    worldPoint.z > 1.02 ||
                    worldPoint.z < -1.02
                );
            };

            if (fx.phase === 'anticipation') {
                const dur = Math.max(0.001, cfg.anticipationDuration ?? 3);
                const p = clamp01(fx.timer / dur);
                const split = clamp01(cfg.anticipationSplit ?? 0.48);
                const firstPart = split > 0 ? clamp01(p / split) : 1;
                const secondPart = split < 1 ? clamp01((p - split) / (1 - split)) : 1;
                const firstE = smoother01(firstPart);
                const secondE = smoother01(secondPart);

                const toFirstYaw = THREE.MathUtils.lerp(
                    0,
                    signedSide * (cfg.anticipationYawTurn ?? 0.96),
                    firstE
                );
                const toSecondYaw = THREE.MathUtils.lerp(
                    signedSide * (cfg.anticipationYawTurn ?? 0.96),
                    finalSide * (cfg.anticipationOppositeYaw ?? 0.62),
                    secondE
                );
                fx.bodyYaw = p <= split ? toFirstYaw : toSecondYaw;

                const dip = -Math.sin(Math.PI * p) * (cfg.anticipationDip ?? 0.18);
                fx.rigOffset.y = dip + (cfg.anticipationLift ?? 0.08) * smooth01(p);
                const backA = THREE.MathUtils.lerp(
                    cfg.anticipationBack ?? -0.56,
                    cfg.anticipationBackSwoop ?? -1.02,
                    firstE
                );
                const backB = THREE.MathUtils.lerp(
                    cfg.anticipationBackSwoop ?? -1.02,
                    cfg.lookUpBack ?? -1.05,
                    secondE
                );
                fx.rigOffset.z = p <= split ? backA : backB;
                const swayA = THREE.MathUtils.lerp(
                    0,
                    signedSide * (cfg.anticipationSway ?? 0.16),
                    firstE
                );
                const swayB = THREE.MathUtils.lerp(
                    signedSide * (cfg.anticipationSway ?? 0.16),
                    finalSide * (cfg.anticipationSwoop ?? 0.2),
                    secondE
                );
                fx.rigOffset.x = p <= split ? swayA : swayB;

                const wingHz = THREE.MathUtils.lerp(
                    cfg.anticipationWingHzStart ?? 1.02,
                    cfg.anticipationWingHzEnd ?? 1.55,
                    smoother01(p)
                );
                fx.wingPhase += wingHz * tau * dt;
                const s = Math.sin(fx.wingPhase);
                const down = Math.max(0, s);
                const up = Math.max(0, -s);
                const amp = THREE.MathUtils.lerp(
                    cfg.anticipationWingAmpStart ?? 0.03,
                    cfg.anticipationWingAmpEnd ?? 0.07,
                    smoother01(p)
                );

                fx.hardFlap = -(amp * down) + amp * 0.25 * up;
                fx.wingBoost = 1 + amp * 1.55;
                fx.wingLift = 0.01 + down * 0.03;
                fx.bodyPitch = THREE.MathUtils.lerp(0.02, -0.1, smooth01(p));
                fx.bodyRoll = Math.sin(Math.PI * p) * (cfg.anticipationRoll ?? 0.15) * signedSide * 0.9;
                fx.eyeBlend = 0.5;
                fx.eyeTargetY = 0.02 + 0.01 * smooth01(p);

                if (p >= 1) {
                    fx.phase = 'lookUp';
                    fx.timer = 0;
                }
                return fx;
            }

            if (fx.phase === 'lookUp') {
                const dur = Math.max(0.001, cfg.lookUpDuration ?? 1.0);
                const p = clamp01(fx.timer / dur);
                const e = smoother01(p);

                const wingHz = THREE.MathUtils.lerp(cfg.lookUpWingHzStart ?? 1.6, cfg.lookUpWingHzEnd ?? 2.3, e);
                fx.wingPhase += wingHz * tau * dt;
                const s = Math.sin(fx.wingPhase);
                const down = Math.max(0, s);
                const up = Math.max(0, -s);
                const amp = THREE.MathUtils.lerp(cfg.lookUpWingAmpStart ?? 0.06, cfg.lookUpWingAmpEnd ?? 0.14, e);

                fx.rigOffset.y = THREE.MathUtils.lerp(cfg.anticipationLift ?? 0.08, cfg.lookUpLift ?? 0.82, e);
                fx.rigOffset.z = THREE.MathUtils.lerp(cfg.anticipationBack ?? -0.56, cfg.lookUpBack ?? -1.05, e);
                fx.rigOffset.x = (cfg.lookUpSway ?? 0.08) * Math.sin(t * 1.5) * (1 - 0.2 * e);
                fx.hardFlap = -(amp * down) + amp * 0.26 * up;
                fx.wingBoost = 1.08 + amp * 2.2;
                fx.wingLift = 0.02 + down * 0.06;
                fx.bodyYaw = THREE.MathUtils.lerp(
                    signedSide * (cfg.anticipationOppositeYaw ?? 0.62),
                    finalSide * (cfg.lookUpYaw ?? 0.28),
                    e
                );
                fx.bodyPitch = THREE.MathUtils.lerp(-0.1, cfg.lookUpPitch ?? -0.44, e);
                fx.bodyRoll = THREE.MathUtils.lerp((cfg.anticipationRoll ?? 0.15) * 0.2, 0.03, e);
                fx.eyeBlend = 0.75 + 0.25 * e;
                fx.eyeTargetY = THREE.MathUtils.lerp(0.03, cfg.lookUpEyeY ?? 0.1, e);

                if (p >= 1) {
                    fx.phase = 'wingCharge';
                    fx.timer = 0;
                }
                return fx;
            }

            if (fx.phase === 'wingCharge') {
                const dur = Math.max(0.001, cfg.wingChargeDuration ?? 1.08);
                const p = clamp01(fx.timer / dur);
                const e = smooth01(p);

                const wingHz = THREE.MathUtils.lerp(cfg.chargeWingHzStart ?? 2.5, cfg.chargeWingHzEnd ?? 6.6, e);
                fx.wingPhase += wingHz * tau * dt;
                const s = Math.sin(fx.wingPhase);
                const down = Math.max(0, s);
                const up = Math.max(0, -s);
                const amp = THREE.MathUtils.lerp(cfg.chargeWingAmpStart ?? 0.07, cfg.chargeWingAmpEnd ?? 0.5, e);

                fx.rigOffset.y = THREE.MathUtils.lerp(cfg.lookUpLift ?? 0.82, cfg.chargeLift ?? 1.4, e) + down * (cfg.chargeWingLift ?? 0.2) * 0.22;
                fx.rigOffset.z = THREE.MathUtils.lerp(cfg.lookUpBack ?? -1.05, cfg.chargeBack ?? -1.76, e);
                fx.rigOffset.x = (cfg.chargeSway ?? 0.08) * (Math.sin(t * 2.2 + p * Math.PI) + 0.4 * Math.sin(p * Math.PI * 1.7));
                fx.hardFlap = -(amp * down) + amp * 0.3 * up;
                fx.wingBoost = 1.12 + amp * 2.6;
                fx.wingLift = 0.03 + down * (cfg.chargeWingLift ?? 0.2);
                fx.bodyYaw = THREE.MathUtils.lerp(cfg.lookUpYaw ?? 0.28, cfg.chargeYaw ?? 0.06, e);
                fx.bodyPitch = THREE.MathUtils.lerp(cfg.lookUpPitch ?? -0.44, cfg.chargePitch ?? -0.56, e);
                fx.bodyRoll = Math.sin(t * 2.6) * 0.04 * (1 - e * 0.55);
                fx.eyeBlend = 1;
                fx.eyeTargetY = cfg.lookUpEyeY ?? 0.1;

                if (p >= 1) {
                    fx.phase = 'powerFlap';
                    fx.timer = 0;
                }
                return fx;
            }

            if (fx.phase === 'powerFlap') {
                const dur = Math.max(0.001, cfg.powerFlapDuration ?? 1.0);
                const p = clamp01(fx.timer / dur);
                const e = smooth01(p);
                const release = clamp01((p - (cfg.powerFlapReleaseProgress ?? 0.7)) / Math.max(0.0001, 1 - (cfg.powerFlapReleaseProgress ?? 0.7)));
                const releaseEase = easeInCubic(release);

                const wingHz = THREE.MathUtils.lerp(cfg.powerFlapWingHzStart ?? 2.6, cfg.powerFlapWingHzEnd ?? 1.35, e);
                const slowWindow = cfg.powerFlapSlowMoWindow ?? 0.24;
                const slowStart = Math.max(0, (cfg.powerFlapReleaseProgress ?? 0.7) - slowWindow);
                const slowBlend = clamp01((p - slowStart) / Math.max(0.0001, 1 - slowStart));
                const flapHz = THREE.MathUtils.lerp(wingHz, cfg.powerFlapSlowMoHz ?? 0.86, slowBlend * (cfg.powerFlapSlowMoPower ?? 0.62));
                fx.wingPhase += flapHz * tau * dt;

                const amp = THREE.MathUtils.lerp(cfg.powerFlapAmpStart ?? 0.2, cfg.powerFlapAmpPeak ?? 0.78, e);
                const climax = 1 + releaseEase * (cfg.powerFlapLargeFlapBoost ?? 1.42);
                const ampClimax = amp * climax;
                const s = Math.sin(fx.wingPhase);
                const down = Math.max(0, s);
                const up = Math.max(0, -s);

                fx.rigOffset.y = (cfg.chargeLift ?? 1.4) + (cfg.powerFlapRise ?? 1.1) * e;
                fx.rigOffset.z = THREE.MathUtils.lerp(cfg.chargeBack ?? -1.76, cfg.powerFlapBack ?? -2.34, e);
                fx.rigOffset.x = finalSide * (cfg.powerFlapLift ?? 0.04) * Math.sin(t * 2.0) * (1 - e);
                fx.hardFlap = -(ampClimax * down) + ampClimax * 0.55 * up;
                fx.wingBoost = THREE.MathUtils.lerp(1.6, cfg.powerFlapWingBoostPeak ?? 2.9, e);
                fx.wingLift = 0.08 + e * (0.2 + slowBlend * (cfg.powerFlapLargeFlapLift ?? 0.22));
                fx.bodyPitch = THREE.MathUtils.lerp(cfg.chargePitch ?? -0.56, cfg.powerFlapPitch ?? -0.72, e);
                fx.bodyYaw = finalSide * THREE.MathUtils.lerp(cfg.chargeYaw ?? 0.06, cfg.powerFlapYaw ?? 0, e);
                fx.bodyRoll = 0.02 + (1 - e) * 0.02;
                fx.eyeBlend = 1;
                fx.eyeTargetY = (cfg.lookUpEyeY ?? 0.1) + 0.006;

                if (p >= 1) {
                    const releaseClamp = clamp01(release);
                    fx.phase = 'ascent';
                    fx.timer = 0;
                    fx.burstStartOffset.copy(fx.rigOffset);
                    fx.burstVelocity.set(
                        finalSide * (cfg.liftoffSideVelocity ?? 1.12) * (1 + releaseClamp * 0.16),
                        cfg.liftoffVerticalVelocity ?? 8.9,
                        cfg.liftoffForwardVelocity ?? -2.25
                    );
                    fx.offscreenTriggered = false;
                    fx.offscreenTimer = 0;
                    fx.dropTriggered = false;
                }
                return fx;
            }

            if (fx.phase === 'ascent') {
                const dur = Math.max(0.001, cfg.ascentDuration ?? 1.6);
                const p = clamp01(fx.timer / dur);
                const e = easeOutCubic(p);
                const tPhys = p * dur;
                const ay = cfg.ascentVerticalAccel ?? 5.4;
                const az = cfg.ascentForwardAccel ?? 0.35;
                const ax = cfg.ascentSideAccel ?? 0.62;

                const y = fx.burstStartOffset.y + fx.burstVelocity.y * tPhys + 0.5 * ay * tPhys * tPhys;
                const z = fx.burstStartOffset.z + fx.burstVelocity.z * tPhys + 0.5 * az * tPhys * tPhys;
                const x = fx.burstStartOffset.x + fx.burstVelocity.x * tPhys + 0.5 * ax * tPhys * tPhys;
                fx.rigOffset.set(x, y, z);

                const wingHz = THREE.MathUtils.lerp(cfg.ascentWingHzStart ?? 6.2, cfg.ascentWingHzEnd ?? 4.4, e);
                fx.wingPhase += wingHz * tau * dt;
                const s = Math.sin(fx.wingPhase);
                const down = Math.max(0, s);
                const up = Math.max(0, -s);
                const amp = THREE.MathUtils.lerp(cfg.ascentWingAmpStart ?? 0.46, cfg.ascentWingAmpEnd ?? 0.24, e);
                fx.hardFlap = -(amp * down) + amp * 0.28 * up;
                fx.wingBoost = 1.25 + amp * 1.5;
                fx.wingLift = 0.06 + down * 0.08;

                const vy = fx.burstVelocity.y + ay * tPhys;
                const vz = fx.burstVelocity.z + az * tPhys;
                const pitchTarget = THREE.MathUtils.clamp(-Math.atan2(vy, Math.max(0.001, Math.abs(vz)) * 0.95) * 0.72, -0.72, 0.1);
                fx.bodyPitch = THREE.MathUtils.lerp(cfg.powerFlapPitch ?? -0.72, pitchTarget, 0.58 + 0.42 * e);
                fx.bodyYaw = THREE.MathUtils.lerp(finalSide * 0.14, finalSide * 0.04, e);
                fx.bodyRoll = Math.sin(t * 2.5) * 0.06 * (1 - e);
                fx.eyeBlend = 1;
                fx.eyeTargetY = cfg.lookUpEyeY ?? 0.1;

                const isOffscreen = checkOffscreen(
                    creatureGroup.position.x + stuntRig.position.x + fx.rigOffset.x,
                    creatureGroup.position.y + stuntRig.position.y + fx.rigOffset.y,
                    creatureGroup.position.z + stuntRig.position.z + fx.rigOffset.z
                );
                if (!fx.offscreenTriggered) {
                    if (isOffscreen) {
                        fx.offscreenTriggered = true;
                        fx.offscreenTimer = 0;
                    } else if (p >= 1) {
                        fx.offscreenTimer += dt;
                        if (fx.offscreenTimer >= (cfg.offscreenFallbackDelay ?? 0.72)) {
                            fx.offscreenTriggered = true;
                            fx.offscreenTimer = 0;
                        }
                    } else {
                        fx.offscreenTimer = 0;
                    }
                } else {
                    fx.offscreenTimer += dt;
                }

                if (!fx.dropTriggered && fx.offscreenTriggered && (fx.offscreenTimer >= (cfg.offscreenDropDelay ?? 1))) {
                    fx.dropTriggered = true;
                    launchMysteryBox();
                    requestMysteryFlightReturn();
                    fx.phase = 'hold';
                    fx.timer = 0;
                    fx.returnStartOffset.copy(fx.rigOffset);
                    fx.returnStartBodyYaw = fx.bodyYaw;
                    fx.returnStartBodyPitch = fx.bodyPitch;
                    fx.returnStartBodyRoll = fx.bodyRoll;
                    fx.returnStartEyeY = fx.eyeTargetY;
                }
                return fx;
            }

            if (fx.phase === 'hold') {
                fx.rigOffset.y = cfg.holdLift ?? 20.8;
                fx.rigOffset.x = Math.sin(t * 1.9) * (cfg.holdSway ?? 0.2);
                fx.rigOffset.z = Math.cos(t * 1.5) * (cfg.holdSway ?? 0.2) * 0.35;

                const holdHz = cfg.holdWingHz ?? 2.55;
                fx.wingPhase += holdHz * tau * dt;
                const amp = cfg.holdWingAmp ?? 0.08;
                fx.wingBoost = 0.96;
                fx.hardFlap = Math.sin(fx.wingPhase) * amp;
                fx.wingLift = 0.03;
                fx.bodyYaw = Math.sin(t * 1.2) * 0.1;
                fx.bodyPitch = -0.1;
                fx.bodyRoll = Math.sin(t * 1.4) * 0.045;
                fx.eyeBlend = 0.5;
                fx.eyeTargetY = 0.03;
                if (fx.returnQueued && fx.timer >= (cfg.holdDuration ?? 0.18)) {
                    fx.phase = 'return';
                    fx.timer = 0;
                    fx.returnStartOffset.copy(fx.rigOffset);
                    fx.returnStartBodyYaw = fx.bodyYaw;
                    fx.returnStartBodyPitch = fx.bodyPitch;
                    fx.returnStartBodyRoll = fx.bodyRoll;
                    fx.returnStartEyeY = fx.eyeTargetY;
                }
                return fx;
            }

            if (fx.phase === 'return') {
                const p = THREE.MathUtils.clamp(fx.timer / Math.max(0.001, cfg.returnDuration), 0, 1);
                const e = easeOutCubic(p);
                const inv = 1 - e;
                const angle = p * Math.PI * 2 * (cfg.returnSpiralTurns ?? 2);
                const radius = (cfg.returnRadius ?? 1.2) * inv;

                const start = fx.returnStartOffset.lengthSq() > 1e-8 ? fx.returnStartOffset : fx.rigOffset;
                fx.rigOffset.x = THREE.MathUtils.lerp(start.x, Math.cos(angle) * radius, e);
                fx.rigOffset.z = THREE.MathUtils.lerp(start.z, Math.sin(angle) * radius * 0.68, e);
                fx.rigOffset.y = THREE.MathUtils.lerp(start.y, 0, e);

                const returnHz = cfg.returnWingHz ?? 7;
                const returnAmp = THREE.MathUtils.lerp(cfg.returnWingAmpStart ?? 0.42, cfg.returnWingAmpEnd ?? 0.12, e);
                fx.wingPhase += returnHz * tau * dt;
                const s = Math.sin(fx.wingPhase);
                const down = Math.max(0, s);
                const up = Math.max(0, -s);
                fx.wingBoost = 1 + inv * 0.44;
                fx.hardFlap = -(returnAmp * down) + returnAmp * 0.32 * up;
                fx.wingLift = 0.03 + returnAmp * 0.16;

                const yawTarget = Math.sin(angle * 0.64) * (cfg.returnTurnYaw ?? 0.22) * inv;
                const rollTarget = Math.sin(angle * 0.86) * (cfg.returnTurnRoll ?? 0.18) * inv;
                const pitchTarget = (cfg.returnDivePitch ?? 0.23) * inv - 0.05;
                fx.bodyYaw = THREE.MathUtils.lerp(fx.returnStartBodyYaw, yawTarget, e);
                fx.bodyPitch = THREE.MathUtils.lerp(fx.returnStartBodyPitch, pitchTarget, e);
                fx.bodyRoll = THREE.MathUtils.lerp(fx.returnStartBodyRoll, rollTarget, e);
                fx.eyeBlend = 0.7;
                fx.eyeTargetY = THREE.MathUtils.lerp(fx.returnStartEyeY, 0, e);

                if (p >= 1) {
                    fx.active = false;
                    fx.phase = 'idle';
                    fx.timer = 0;
                    fx.returnQueued = false;
                    fx.dropTriggered = false;
                    fx.offscreenTriggered = false;
                    fx.offscreenTimer = 0;
                    fx.rigOffset.set(0, 0, 0);
                    fx.wingBoost = 1;
                    fx.hardFlap = 0;
                    fx.wingLift = 0;
                    fx.bodyYaw = 0;
                    fx.bodyPitch = 0;
                    fx.bodyRoll = 0;
                    fx.eyeTargetX = 0;
                    fx.eyeTargetY = 0;
                    fx.eyeBlend = 0;
                    fx.burstStartOffset.set(0, 0, 0);
                    fx.burstVelocity.set(0, 0, 0);
                    fx.wingPhase = 0;
                    fx.actionSuppress = 0;
                    fx.returnStartOffset.set(0, 0, 0);
                    fx.returnStartBodyYaw = 0;
                    fx.returnStartBodyPitch = 0;
                    fx.returnStartBodyRoll = 0;
                    fx.returnStartEyeY = 0;
                }
                return fx;
            }

            return fx;
        }
        function revealMysteryReward() {
            if (!mysteryState.root || mysteryState.phase !== 'landed') return;
            const rewardKey = pickMysteryRewardKey();
            if (!rewardKey) return;
            mysteryState.rewardKey = rewardKey;
            mysteryState.rewardLabel = getPropLabelByKey(rewardKey);
            mysteryState.phase = 'opening';
            mysteryState.timer = 0;
            mysteryState.rewardShown = false;
            mysteryState.previewPrimed = false;
            setContactShadowFade(1);
        }

        function handleMysteryBoxPointerDown(clientX, clientY) {
            if (!mysteryState.root || mysteryState.phase === 'idle') return false;
            if (!intersectObjectsAt(clientX, clientY, mysteryState.root, true).length) {
                return false;
            }

            if (mysteryState.phase === 'falling' || mysteryState.phase === 'opening' || mysteryState.phase === 'revealed' || mysteryState.phase === 'cooldown') {
                return true;
            }

            revealMysteryReward();
            return true;
        }

        function getMysteryPreviewPanelWorldTarget() {
            const rect = propPreviewViewport?.getBoundingClientRect?.();
            const x = rect ? rect.left + rect.width * 0.5 : window.innerWidth * 0.5;
            const y = rect ? rect.top + rect.height * 0.5 : window.innerHeight * 0.46;
            const ndc = new THREE.Vector3(
                (x / Math.max(1, window.innerWidth)) * 2 - 1,
                -(y / Math.max(1, window.innerHeight)) * 2 + 1,
                0.25
            );
            ndc.unproject(camera);
            const dir = ndc.sub(camera.position);
            if (!Number.isFinite(dir.x) || !Number.isFinite(dir.y) || !Number.isFinite(dir.z) || dir.lengthSq() < 1e-6) {
                dir.set(0, 0, -1);
            } else {
                dir.normalize();
            }
            return camera.position.clone().addScaledVector(dir, 9.8);
        }

        function updateMysteryDust(root, flowRatio, funnelToPanel = false) {
            const dustPoints = root?.userData?.dustPoints;
            const dustBase = root?.userData?.dustBase;
            const dustPhase = root?.userData?.dustPhase;
            const positionAttr = dustPoints?.geometry?.attributes?.position;
            if (!dustPoints || !dustBase || !dustPhase || !positionAttr?.array) {
                return;
            }

            const arr = positionAttr.array;
            const count = Math.min(dustPhase.length, Math.floor(arr.length / 3));
            const swirlRadius = MYSTERY_BOX_CONFIG.dustSwirlRadius || 1.28;
            const lift = MYSTERY_BOX_CONFIG.dustLift || 1.85;
            const t = THREE.MathUtils.clamp(flowRatio, 0, 1);
            const localTarget = new THREE.Vector3();
            if (funnelToPanel) {
                const worldTarget = getMysteryPreviewPanelWorldTarget();
                localTarget.copy(root.worldToLocal(worldTarget.clone()));
            }

            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                const bx = dustBase[i3];
                const by = dustBase[i3 + 1];
                const bz = dustBase[i3 + 2];
                const angle = dustPhase[i] + mysteryState.timer * 6.1 + i * 0.09;
                const swirlScale = 0.45 + (by / Math.max(0.001, lift + 1)) * 0.8;
                const swirlX = Math.cos(angle) * swirlRadius * swirlScale + bx * 0.24;
                const swirlY = by + Math.sin(angle * 1.7 + bx * 0.9) * 0.12 + t * lift * (funnelToPanel ? 0.14 : 0.38);
                const swirlZ = Math.sin(angle) * swirlRadius * swirlScale + bz * 0.24;

                if (!funnelToPanel) {
                    arr[i3] = swirlX;
                    arr[i3 + 1] = swirlY;
                    arr[i3 + 2] = swirlZ;
                    continue;
                }

                const jitterScale = 0.08 + (i % 5) * 0.012;
                const targetX = localTarget.x + bx * jitterScale;
                const targetY = localTarget.y + (by - 0.55) * jitterScale;
                const targetZ = localTarget.z + bz * jitterScale;
                arr[i3] = THREE.MathUtils.lerp(swirlX, targetX, t);
                arr[i3 + 1] = THREE.MathUtils.lerp(swirlY, targetY, t);
                arr[i3 + 2] = THREE.MathUtils.lerp(swirlZ, targetZ, t);
            }
            positionAttr.needsUpdate = true;
        }

        function updateMysteryBox(dt) {
            if (!mysteryState.root || mysteryState.phase === 'idle') {
                setContactShadowFade(1);
                return;
            }

            const root = mysteryState.root;
            setContactShadowFade(1);
            root.traverse((node) => {
                if (!node?.isMesh) return;
                node.castShadow = true;
                node.receiveShadow = false;
            });
            const {
                lidPivot,
                impact,
                trailRing,
                dustPoints,
                burstPieces,
                burstStartPos,
                burstStartRot,
                burstDirs
            } = root.userData || {};
            const trailMaterial = trailRing?.material;
            const dustMaterial = dustPoints?.material;
            const fallEase = (t) => 1 - Math.pow(1 - t, 2.75);
            const openEaseOut = (t) => 1 - Math.pow(1 - t, 2.2);

            if (mysteryState.phase === 'falling') {
                mysteryState.timer += dt;
                const maxFallDelta = Math.max(0.25, mysteryState.startY - mysteryState.landingY);
                const fallRatio = 1 - THREE.MathUtils.clamp((root.position.y - mysteryState.landingY) / maxFallDelta, 0, 1);
                setContactShadowFade(1);
                const eased = fallEase(fallRatio);
                mysteryState.fallVelocity -= (MYSTERY_BOX_CONFIG.fallGravity || 16.8) * dt;
                root.position.y += mysteryState.fallVelocity * dt;

                if (eased > 0.05 && !mysteryState.settled) {
                    root.position.x = THREE.MathUtils.lerp(mysteryState.startPoint.x, mysteryState.landingPoint.x, Math.min(1, fallRatio * 1.18));
                    root.position.z = THREE.MathUtils.lerp(mysteryState.startPoint.z, mysteryState.landingPoint.z, Math.min(1, fallRatio * 1.18));
                }
                root.rotation.y += mysteryState.spinVelY * dt;
                root.rotation.x += mysteryState.spinVelX * dt;
                root.rotation.z += mysteryState.spinVelZ * dt;
                const spinDamp = MYSTERY_BOX_CONFIG.fallSpinDamp || 0.9992;
                mysteryState.spinVelY *= spinDamp;
                mysteryState.spinVelX *= spinDamp;
                mysteryState.spinVelZ *= spinDamp;
                if (trailRing) {
                    const pulse = 1 + Math.sin(fallRatio * Math.PI * 4 + mysteryState.seed) * 0.16;
                    const revealScale = MYSTERY_BOX_CONFIG.trailRevealScale ?? 1.16;
                    const baseTrail = trailRing.userData?.baseScale ?? 1;
                    trailRing.scale.setScalar(baseTrail * revealScale * pulse);
                    if (trailMaterial) {
                        trailMaterial.opacity = THREE.MathUtils.lerp(0.18, 0.62, fallRatio);
                    }
                    trailRing.rotation.y += dt * 3.2;
                }
                if (dustPoints) {
                    dustPoints.visible = false;
                }

                if (fallRatio >= 1 || root.position.y <= mysteryState.landingY) {
                    root.position.copy(mysteryState.landingPoint);
                    root.position.y = mysteryState.landingY;
                    mysteryState.phase = 'landed';
                    mysteryState.timer = 0;
                    mysteryState.spinVelX *= 0.75;
                    mysteryState.spinVelY *= 0.75;
                    mysteryState.spinVelZ *= 0.75;
                    if (impact) {
                        impact.visible = true;
                        impact.scale.setScalar(1.2);
                        impact.material.opacity = 0.52;
                    }
                    if (trailMaterial) {
                        trailMaterial.opacity = 0.62;
                    }
                    requestMysteryFlightReturn();
                }
                updateMysteryGroundShadows(root);
                return;
            }

            if (mysteryState.phase === 'landed') {
                setContactShadowFade(0);
                mysteryState.timer += dt;
                root.rotation.z = Math.sin(mysteryState.timer * 1.8 + mysteryState.seed) * 0.018;
                root.rotation.x = Math.sin(mysteryState.timer * 2.1 + mysteryState.seed) * 0.022;
                root.position.y = mysteryState.landingY + Math.abs(Math.sin(mysteryState.timer * 3.4 + mysteryState.seed)) * 0.02;

                if (impact && impact.visible) {
                    const settle = THREE.MathUtils.clamp(mysteryState.timer / MYSTERY_BOX_CONFIG.settleDuration, 0, 1);
                    const settleImpact = MYSTERY_BOX_CONFIG.impactDecay ?? 0.75;
                    const impactScale = THREE.MathUtils.lerp(1.2, MYSTERY_BOX_CONFIG.impactHeight ?? 0.02, settle);
                    impact.scale.setScalar(impactScale);
                    impact.material.opacity = THREE.MathUtils.lerp(0.52 * settleImpact, 0, settle);
                    if (settle >= 1) {
                        impact.visible = false;
                    }
                }

                if (trailRing && trailMaterial) {
                    trailMaterial.opacity = 0.5 + Math.sin(mysteryState.timer * 4.2 + mysteryState.seed) * 0.13;
                    trailRing.scale.setScalar(1 + Math.sin(mysteryState.timer * 2.4 + mysteryState.seed) * 0.035);
                }
                if (dustPoints) {
                    dustPoints.visible = false;
                }
                updateMysteryGroundShadows(root);
                return;
            }

            if (mysteryState.phase === 'opening') {
                mysteryState.timer += dt;
                const openRatio = THREE.MathUtils.clamp(mysteryState.timer / MYSTERY_BOX_CONFIG.openDuration, 0, 1);
                const openEase = openEaseOut(openRatio);
                if (lidPivot) {
                    lidPivot.rotation.x = THREE.MathUtils.lerp(0, -1.25, openEase);
                }
                if (Array.isArray(burstPieces) && Array.isArray(burstStartPos) && Array.isArray(burstStartRot) && Array.isArray(burstDirs)) {
                    burstPieces.forEach((piece, index) => {
                        const startPos = burstStartPos[index];
                        const startRot = burstStartRot[index];
                        const dir = burstDirs[index];
                        if (!startPos || !startRot || !dir) return;
                        const burstDistance = (MYSTERY_BOX_CONFIG.openBurstDistance || 2.7) * openEase;
                        const burstLift = (MYSTERY_BOX_CONFIG.openBurstLift || 1.9) * openEase;
                        piece.position.set(
                            startPos.x + dir.x * burstDistance,
                            startPos.y + dir.y * burstDistance + burstLift,
                            startPos.z + dir.z * burstDistance
                        );
                        const spin = (MYSTERY_BOX_CONFIG.openBurstSpin || 2.2) * openEase;
                        piece.rotation.set(
                            startRot.x + spin * ((index % 3) - 1),
                            startRot.y + spin * (((index + 1) % 3) - 1),
                            startRot.z + spin * (((index + 2) % 3) - 1)
                        );
                        piece.scale.setScalar(Math.max(0.16, 1 - openEase * 0.84));
                        const mats = Array.isArray(piece.material) ? piece.material : [piece.material];
                        mats.forEach((mat) => {
                            if (!mat) return;
                            mat.transparent = true;
                            mat.opacity = Math.max(0, 1 - openEase * 1.06);
                            mat.needsUpdate = true;
                        });
                    });
                }
                if (dustPoints && dustMaterial) {
                    dustPoints.visible = true;
                    updateMysteryDust(root, openEase, false);
                    dustMaterial.opacity = Math.min(0.92, 0.22 + openEase * 0.8);
                    dustMaterial.size = 0.1 + openEase * 0.03;
                }
                if (trailRing && trailMaterial) {
                    trailMaterial.opacity = THREE.MathUtils.lerp(0.36, 0.05, openEase);
                }

                if (openRatio >= 1) {
                    mysteryState.phase = 'revealed';
                    mysteryState.timer = 0;
                }
                updateMysteryGroundShadows(root);
                return;
            }

            if (mysteryState.phase === 'revealed') {
                mysteryState.timer += dt;
                const dustRatio = THREE.MathUtils.clamp(
                    mysteryState.timer / Math.max(0.1, MYSTERY_BOX_CONFIG.dustFlowDuration || 0.9),
                    0,
                    1
                );

                if (!mysteryState.previewPrimed && mysteryState.rewardKey) {
                    mysteryState.previewPrimed = true;
                    if (previewState.object) {
                        previewScene.remove(previewState.object);
                        previewState.object = null;
                    }
                    previewState.open = true;
                    previewState.viewMode = 'item';
                    previewState.propKey = mysteryState.rewardKey;
                    previewState.label = mysteryState.rewardLabel;
                    previewState.rotateY = 0;
                    previewState.hasStandaloneMesh = false;
                    setPreviewActionLabel('item');
                    if (propPreviewPanel) {
                        propPreviewPanel.classList.add('open');
                    }
                    if (propPreviewOverlay) {
                        propPreviewOverlay.classList.add('open');
                    }
                    setPreviewActionButtonsDisabled(true);
                    if (propPreviewName) {
                        propPreviewName.textContent = `Mystery Reward: ${mysteryState.rewardLabel}`;
                    }
                    setPreviewFallbackMessage('Magic dust is shaping your reward...');
                    resizePropViewport();
                }

                if (dustPoints && dustMaterial) {
                    dustPoints.visible = true;
                    updateMysteryDust(root, dustRatio, true);
                    dustMaterial.opacity = Math.max(0, 0.88 - dustRatio * 0.86);
                    dustMaterial.size = 0.1 + dustRatio * 0.04;
                }
                if (trailMaterial) {
                    trailMaterial.opacity = 0.14 + Math.sin(mysteryState.timer * 2.1 + mysteryState.seed) * 0.06;
                }
                if (!mysteryState.rewardShown && mysteryState.rewardKey && dustRatio >= 0.92) {
                    mysteryState.rewardShown = true;
                    setPreviewObject(mysteryState.rewardKey, `${mysteryState.rewardLabel} (Mystery Reward)`);
                    if (propPreviewName) {
                        propPreviewName.textContent = `Mystery Reward: ${mysteryState.rewardLabel}`;
                    }
                }
                if (mysteryState.timer >= MYSTERY_BOX_CONFIG.revealHoldDuration) {
                    mysteryState.phase = 'cooldown';
                    mysteryState.timer = 0;
                }
                updateMysteryGroundShadows(root);
                return;
            }

            if (mysteryState.phase === 'cooldown') {
                setContactShadowFade(1);
                mysteryState.timer += dt;
                const fade = 1 - THREE.MathUtils.clamp(mysteryState.timer / MYSTERY_BOX_CONFIG.cleanupDuration, 0, 1);
                if (trailRing && trailMaterial) {
                    trailMaterial.opacity = 0.35 * fade;
                    trailRing.scale.setScalar(0.8 + 0.2 * fade);
                }
                if (dustPoints && dustMaterial) {
                    dustMaterial.opacity *= fade;
                    if (dustMaterial.opacity <= 0.01) {
                        dustPoints.visible = false;
                    }
                }
                root.rotation.y += dt * 1.9;
                root.position.y = mysteryState.landingY + (1 - fade) * 0.03;
                root.scale.setScalar((mysteryState.baseScale || 1) * (0.95 + 0.05 * fade));
                updateMysteryGroundShadows(root);
                if (fade <= 0.04) {
                    clearMysteryBox();
                }
            }
        }

        function closePropPreview() {
            if (!propPreviewPanel) {
                return;
            }

            previewState.open = false;
            previewState.viewMode = 'item';
            previewState.propKey = null;
            previewState.label = null;
            previewState.rotateY = 0;
            previewState.hasStandaloneMesh = false;
            const oldObj = previewState.object;
            if (oldObj) {
                previewScene.remove(oldObj);
            }
            previewState.object = null;
            propPreviewPanel.classList.remove('open');
            if (propPreviewOverlay) {
                propPreviewOverlay.classList.remove('open');
            }
            setPreviewFallbackMessage('');
            setPreviewActionButtonsDisabled(true);
            if (propPreviewName) {
                propPreviewName.textContent = 'Select an item';
            }
            setPreviewActionLabel('item');
        }

        function placePreviewedProp() {
            if (!previewState.propKey) return;
            let characterPreview = buildCharacterPreviewObject(previewState.propKey);
            if (!characterPreview || !hasFiniteRenderableGeometry(characterPreview)) {
                characterPreview = makeCompactCharacterPreviewFallback(previewState.propKey) || createPreviewFallbackModel();
                if (!characterPreview) {
                    return;
                }
            }

            if (!characterPreview) {
                return;
            }
            setPreviewActionLabel('character');

            if (previewState.object) {
                previewScene.remove(previewState.object);
            }

            previewState.object = characterPreview;
            previewState.viewMode = 'character';
            previewState.rotateY = 0;
            previewScene.add(previewState.object);
            previewState.hasStandaloneMesh = placeObjectInPreviewViewport(previewState.object, {
                mode: 'character',
                fallbackMessage: 'Unable to generate character preview for this item right now.'
            });
            if (!previewState.hasStandaloneMesh) {
                const previousCharacterObject = previewState.object;
                const fallback = createPreviewFallbackModel();
                if (fallback) {
                    previewScene.remove(previousCharacterObject);
                    previewState.object = fallback;
                    previewScene.add(fallback);
                    previewState.hasStandaloneMesh = placeObjectInPreviewViewport(fallback, {
                        mode: 'character',
                        fallbackMessage: 'Unable to generate character preview for this item right now.'
                    });
                }
            }

            propPreviewName.textContent = `${previewState.label || 'Item'} on Character`;
        }

        function previewOpenForButton(button) {
            const selected = button?.dataset?.prop;
            if (!selected) return;
            const label = getItemLabel(button);
            setPreviewObject(selected, label);
        }

        function updatePropButtonStates() {
            propButtons.forEach((btn) => {
                btn.classList.toggle('active', activeProps.has(btn.dataset.prop));
            });
            updateInventoryButtonStates();
        }

        function setActiveCategory(categoryKey) {
            activeCategory = CATEGORY_LABELS[categoryKey] ? categoryKey : 'wingSet';
            categoryButtons.forEach((btn) => {
                btn.classList.toggle('active', btn.dataset.category === activeCategory);
            });
            itemButtons.forEach((btn) => {
                btn.classList.toggle('hidden', btn.dataset.category !== activeCategory);
            });
            categoryTitle.textContent = CATEGORY_LABELS[activeCategory] || 'Wing Set';
            if (storePanel?.classList?.contains('open')) {
                warmupStoreCategoryThumbs(activeCategory);
            }
        }

        function setActiveInventoryCategory(categoryKey) {
            activeInventoryCategory = CATEGORY_LABELS[categoryKey] ? categoryKey : INVENTORY_CATEGORIES[0];
            inventoryCategoryButtons.forEach((btn) => {
                btn.classList.toggle('active', btn.dataset.category === activeInventoryCategory);
                if (btn.dataset.category && isInventoryCategory(btn.dataset.category)) {
                    const category = btn.dataset.category;
                    btn.textContent = getInventoryDisplayNameWithCount(category);
                }
            });
            renderInventoryList();
        }

        storeToggle.addEventListener('click', () => {
            const isOpen = storePanel.classList.toggle('open');
            storeToggle.setAttribute('aria-expanded', String(isOpen));
            if (isOpen && inventoryPanel) {
                inventoryPanel.classList.remove('open');
                if (inventoryToggle) {
                    inventoryToggle.setAttribute('aria-expanded', 'false');
                }
                warmupStoreCategoryThumbs(activeCategory);
            }
        });

        if (inventoryToggle && inventoryPanel) {
            inventoryToggle.addEventListener('click', () => {
                const isOpen = inventoryPanel.classList.toggle('open');
                inventoryToggle.setAttribute('aria-expanded', String(isOpen));
                if (isOpen) {
                    storePanel.classList.remove('open');
                    storeToggle.setAttribute('aria-expanded', 'false');
                    setActiveInventoryCategory(activeInventoryCategory);
                }
            });
        }

        if (inventoryCloseBtn) {
            inventoryCloseBtn.addEventListener('click', () => {
                if (!inventoryPanel) return;
                inventoryPanel.classList.remove('open');
                if (inventoryToggle) {
                    inventoryToggle.setAttribute('aria-expanded', 'false');
                }
            });
        }

        categoryButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                setActiveCategory(btn.dataset.category);
            });
        });

        inventoryCategoryButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                setActiveInventoryCategory(btn.dataset.category);
            });
        });

        if (mysteryToggle) {
            mysteryToggle.addEventListener('click', () => {
                startMysteryFlightCinematic();
            });
        }

        itemButtons.forEach((btn) => {
            const previewTrigger = btn.querySelector('.item-preview-trigger');
            if (previewTrigger) {
                const launchPreview = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    previewOpenForButton(btn);
                };
                previewTrigger.addEventListener('click', launchPreview);
                previewTrigger.addEventListener('keydown', (event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    event.stopPropagation();
                    launchPreview(event);
                });
            }

            btn.addEventListener('click', (event) => {
                if (event && event.target && event.target.closest('.item-preview-trigger')) {
                    return;
                }
                if (btn.dataset.empty === 'true') {
                    return;
                }
                if (btn.dataset.action === 'clearAll') {
                    clearAllProps();
                    updatePropButtonStates();
                    return;
                }
                const selected = btn.dataset.prop;
                if (!selected) return;
                toggleProp(selected);
                updatePropButtonStates();
            });
        });

        if (propPreviewApplyBtn) {
            propPreviewApplyBtn.addEventListener('click', () => {
                placePreviewedProp();
            });
        }

        if (propPreviewInventoryBtn) {
            propPreviewInventoryBtn.addEventListener('click', () => {
                if (!previewState.propKey) {
                    return;
                }
                const stashResult = stashPropInInventory(previewState.propKey);
                if (!propPreviewName) {
                    return;
                }
                if (!stashResult.added) {
                    propPreviewName.textContent = `${previewState.label || 'Item'} is already in Inventory`;
                    return;
                }
                if (stashResult.dropped?.length) {
                    const droppedLabel = getPropLabelByKey(stashResult.dropped[0]);
                    propPreviewName.textContent = `${previewState.label || 'Item'} stashed. ${droppedLabel} was removed (max 5 per category).`;
                    return;
                }
                propPreviewName.textContent = `${previewState.label || 'Item'} stashed in Inventory`;
            });
        }

        if (propPreviewEquipBtn) {
            propPreviewEquipBtn.addEventListener('click', () => {
                if (!previewState.propKey) {
                    return;
                }
                const equipped = equipPropNow(previewState.propKey);
                if (equipped && propPreviewName) {
                    propPreviewName.textContent = `${previewState.label || 'Item'} equipped`;
                }
            });
        }

        if (propPreviewCloseBtn) {
            propPreviewCloseBtn.addEventListener('click', () => {
                closePropPreview();
            });
        }

        if (propPreviewOverlay) {
            propPreviewOverlay.addEventListener('click', () => {
                closePropPreview();
            });
        }

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            closePropPreview();
        });

        if (inventoryList) {
            inventoryList.addEventListener('click', (event) => {
                const actionButton = event.target.closest('.inventory-action-btn');
                if (!actionButton) {
                    return;
                }
                const propKey = actionButton.dataset.prop;
                if (!propKey || !playerInventory.has(propKey)) {
                    return;
                }
                if (actionButton.dataset.action === 'equip') {
                    if (activeProps.has(propKey)) {
                        unequipPropNow(propKey);
                    } else {
                        equipPropNow(propKey);
                    }
                }
            });
        }

        setActiveCategory('wingSet');
        setActiveInventoryCategory('wingSet');
        renderInventoryList();
        updatePropButtonStates();

        // --- ANIMATION ---
        const clock = new THREE.Clock();
        let elapsed = 0;
        const cursor = { x: 0, y: 0 };
        let mysteryTurnLift = 0;
        let mysteryTurnBank = 0;
        let mysteryTornadoAngle = 0;
        let mysteryTornadoRadius = 0;
        let mysteryFlapLift = 0;
        let mysteryFlapRoll = 0;
        let mysteryBodySpinYaw = 0;
        let mysteryBodySwingPitch = 0;
        const flightState = {
            phase: 0,
            y: 0.12,
            yVel: 0,
            pitch: 0,
            pitchVel: 0,
            roll: 0,
            rollVel: 0,
            aero: 0.5
        };
        const FLIGHT_TUNING = {
            baseFlapHz: 0.85,
            flapHzVariance: 0.02
        };
        const emotionActions = [
            { key: 'joy', duration: 2.8, fadeIn: 0.38, fadeOut: 0.48 },
            { key: 'shy', duration: 2.9, fadeIn: 0.45, fadeOut: 0.55 },
            { key: 'proud', duration: 3.2, fadeIn: 0.5, fadeOut: 0.65 },
            { key: 'surprised', duration: 2.35, fadeIn: 0.22, fadeOut: 0.55 }
        ];
        const emotionState = {
            active: null,
            elapsed: 0,
            lastIndex: -1
        };
        const characterHitMeshes = [];
        creatureGroup.traverse((obj) => {
            if (obj.isMesh) characterHitMeshes.push(obj);
        });

        function smoothEmotionEnvelope(time, duration, fadeIn, fadeOut) {
            const inWeight = THREE.MathUtils.smoothstep(time, 0, fadeIn);
            const outWeight = 1 - THREE.MathUtils.smoothstep(time, duration - fadeOut, duration);
            return THREE.MathUtils.clamp(inWeight * outWeight, 0, 1);
        }

        function startRandomEmotionAction() {
            let index = Math.floor(Math.random() * emotionActions.length);
            if (emotionActions.length > 1 && index === emotionState.lastIndex) {
                index = (index + 1 + Math.floor(Math.random() * (emotionActions.length - 1))) % emotionActions.length;
            }
            emotionState.active = emotionActions[index];
            emotionState.elapsed = 0;
            emotionState.lastIndex = index;
        }

        function sampleEmotion(dt) {
            const output = {
                y: 0,
                pitch: 0,
                yaw: 0,
                roll: 0,
                wingAmpMul: 1,
                wingSweepAdd: 0,
                wingFeatherAdd: 0,
                leftEyeScale: 1,
                rightEyeScale: 1,
                leftEyeBiasX: 0,
                rightEyeBiasX: 0,
                eyeBiasY: 0,
                bodyScaleX: 1,
                bodyScaleY: 1,
                bodyScaleZ: 1
            };
            if (mysteryFlightCinematic.active) {
                const suppressBlend = THREE.MathUtils.clamp(
                    mysteryFlightCinematic.actionSuppress / Math.max(0.001, MYSTERY_CHARACTER_FLIGHT_CONFIG.interruptionBlendDuration ?? 0.42),
                    0,
                    1
                );
                if (emotionState.active && suppressBlend <= 0.001) {
                    emotionState.active = null;
                    emotionState.elapsed = 0;
                }
                if (!emotionState.active) {
                    return output;
                }

                emotionState.elapsed += dt;
                const action = emotionState.active;
                const actionTime = emotionState.elapsed;
                const envBase = smoothEmotionEnvelope(actionTime, action.duration, action.fadeIn, action.fadeOut);
                const env = envBase * suppressBlend;

                if (action.key === 'joy') {
                    const bounce = Math.sin(actionTime * 6.8);
                    output.y = (0.22 + bounce * 0.1) * env;
                    output.yaw = Math.sin(actionTime * 2.5) * 0.12 * env;
                    output.roll = Math.sin(actionTime * 3.5) * 0.07 * env;
                    output.wingAmpMul = 1 + 0.32 * env + 0.08 * bounce * env;
                    output.wingSweepAdd = 0.06 * env;
                    output.leftEyeScale = 1 + 0.2 * env;
                    output.rightEyeScale = 1 + 0.2 * env;
                    output.eyeBiasY = 0.02 * env;
                    const squash = 1 + bounce * 0.04 * env;
                    output.bodyScaleX = 1 - (squash - 1) * 0.45;
                    output.bodyScaleY = 1 + (squash - 1);
                    output.bodyScaleZ = 1 - (squash - 1) * 0.35;
                } else if (action.key === 'shy') {
                    output.y = -0.18 * env;
                    output.pitch = 0.1 * env;
                    output.yaw = Math.sin(actionTime * 2.1) * 0.035 * env;
                    output.roll = -0.055 * env;
                    output.wingAmpMul = 1 - 0.34 * env;
                    output.wingSweepAdd = -0.13 * env;
                    output.wingFeatherAdd = 0.16 * env;
                    output.leftEyeScale = 1 + 0.15 * env;
                    output.rightEyeScale = 1 + 0.15 * env;
                    output.leftEyeBiasX = 0.035 * env;
                    output.rightEyeBiasX = -0.035 * env;
                    output.eyeBiasY = -0.01 * env;
                    output.bodyScaleX = 1 + 0.08 * env;
                    output.bodyScaleY = 1 - 0.1 * env;
                    output.bodyScaleZ = 1 + 0.05 * env;
                } else if (action.key === 'proud') {
                    output.y = (0.19 + Math.sin(actionTime * 2.3) * 0.05) * env;
                    output.pitch = -0.12 * env;
                    output.yaw = Math.sin(actionTime * 1.6) * 0.045 * env;
                    output.roll = Math.sin(actionTime * 1.4) * 0.03 * env;
                    output.wingAmpMul = 1 - 0.14 * env;
                    output.wingSweepAdd = 0.15 * env;
                    output.wingFeatherAdd = -0.035 * env;
                    output.leftEyeScale = 1 - 0.08 * env;
                    output.rightEyeScale = 1 - 0.08 * env;
                    output.eyeBiasY = -0.012 * env;
                    output.bodyScaleX = 1 - 0.05 * env;
                    output.bodyScaleY = 1 + 0.1 * env;
                    output.bodyScaleZ = 1 + 0.03 * env;
                } else if (action.key === 'surprised') {
                    const shock = Math.exp(-actionTime * 2.8);
                    const flutter = Math.sin(actionTime * 18.0);
                    const impulse = shock * env;
                    output.y = (0.25 * impulse) + (flutter * 0.065 * impulse);
                    output.pitch = 0.14 * impulse;
                    output.roll = flutter * 0.08 * impulse;
                    output.wingAmpMul = 1 + 0.4 * impulse;
                    output.wingSweepAdd = 0.11 * impulse;
                    output.wingFeatherAdd = -0.04 * impulse;
                    output.leftEyeScale = 1 + 0.42 * impulse;
                    output.rightEyeScale = 1 + 0.42 * impulse;
                    output.eyeBiasY = 0.03 * impulse;
                    output.bodyScaleX = 1 + 0.06 * impulse;
                    output.bodyScaleY = 1 - 0.05 * impulse;
                    output.bodyScaleZ = 1 + 0.04 * impulse;
                }

                if (emotionState.elapsed >= action.duration) {
                    emotionState.active = null;
                }
                return output;
            }
            if (!emotionState.active) return output;

            emotionState.elapsed += dt;
            const action = emotionState.active;
            const actionTime = emotionState.elapsed;
            const env = smoothEmotionEnvelope(actionTime, action.duration, action.fadeIn, action.fadeOut);

            if (action.key === 'joy') {
                const bounce = Math.sin(actionTime * 6.8);
                output.y = (0.22 + bounce * 0.1) * env;
                output.yaw = Math.sin(actionTime * 2.5) * 0.12 * env;
                output.roll = Math.sin(actionTime * 3.5) * 0.07 * env;
                output.wingAmpMul = 1 + 0.32 * env + 0.08 * bounce * env;
                output.wingSweepAdd = 0.06 * env;
                output.leftEyeScale = 1 + 0.2 * env;
                output.rightEyeScale = 1 + 0.2 * env;
                output.eyeBiasY = 0.02 * env;
                const squash = 1 + bounce * 0.04 * env;
                output.bodyScaleX = 1 - (squash - 1) * 0.45;
                output.bodyScaleY = 1 + (squash - 1);
                output.bodyScaleZ = 1 - (squash - 1) * 0.35;
            } else if (action.key === 'shy') {
                output.y = -0.18 * env;
                output.pitch = 0.1 * env;
                output.yaw = Math.sin(actionTime * 2.1) * 0.035 * env;
                output.roll = -0.055 * env;
                output.wingAmpMul = 1 - 0.34 * env;
                output.wingSweepAdd = -0.13 * env;
                output.wingFeatherAdd = 0.16 * env;
                output.leftEyeScale = 1 + 0.15 * env;
                output.rightEyeScale = 1 + 0.15 * env;
                output.leftEyeBiasX = 0.035 * env;
                output.rightEyeBiasX = -0.035 * env;
                output.eyeBiasY = -0.01 * env;
                output.bodyScaleX = 1 + 0.08 * env;
                output.bodyScaleY = 1 - 0.1 * env;
                output.bodyScaleZ = 1 + 0.05 * env;
            } else if (action.key === 'proud') {
                output.y = (0.19 + Math.sin(actionTime * 2.3) * 0.05) * env;
                output.pitch = -0.12 * env;
                output.yaw = Math.sin(actionTime * 1.6) * 0.045 * env;
                output.roll = Math.sin(actionTime * 1.4) * 0.03 * env;
                output.wingAmpMul = 1 - 0.14 * env;
                output.wingSweepAdd = 0.15 * env;
                output.wingFeatherAdd = -0.035 * env;
                output.leftEyeScale = 1 - 0.08 * env;
                output.rightEyeScale = 1 - 0.08 * env;
                output.eyeBiasY = -0.012 * env;
                output.bodyScaleX = 1 - 0.05 * env;
                output.bodyScaleY = 1 + 0.1 * env;
                output.bodyScaleZ = 1 + 0.03 * env;
            } else if (action.key === 'surprised') {
                const shock = Math.exp(-actionTime * 2.8);
                const flutter = Math.sin(actionTime * 18.0);
                const impulse = shock * env;
                output.y = (0.25 * impulse) + (flutter * 0.065 * impulse);
                output.pitch = 0.14 * impulse;
                output.roll = flutter * 0.08 * impulse;
                output.wingAmpMul = 1 + 0.4 * impulse;
                output.wingSweepAdd = 0.11 * impulse;
                output.wingFeatherAdd = -0.04 * impulse;
                output.leftEyeScale = 1 + 0.42 * impulse;
                output.rightEyeScale = 1 + 0.42 * impulse;
                output.eyeBiasY = 0.03 * impulse;
                output.bodyScaleX = 1 + 0.06 * impulse;
                output.bodyScaleY = 1 - 0.05 * impulse;
                output.bodyScaleZ = 1 + 0.04 * impulse;
            }

            if (emotionState.elapsed >= action.duration) {
                emotionState.active = null;
            }

            return output;
        }

        const stuntActions = [
            { key: 'barrel360', duration: 2.6, fadeIn: 0.25, fadeOut: 0.45, cooldownMin: 4.2, cooldownMax: 7.2 },
            { key: 'loop', duration: 3.2, fadeIn: 0.32, fadeOut: 0.55, cooldownMin: 4.5, cooldownMax: 7.6 },
            { key: 'corkscrew', duration: 3.5, fadeIn: 0.35, fadeOut: 0.6, cooldownMin: 4.8, cooldownMax: 8.0 },
            { key: 'wingover', duration: 3.0, fadeIn: 0.3, fadeOut: 0.55, cooldownMin: 4.4, cooldownMax: 7.4 },
            { key: 'burstDive', duration: 5.2, fadeIn: 0.18, fadeOut: 0.8, cooldownMin: 8.5, cooldownMax: 12.0 }
        ];
        const stuntState = {
            active: null,
            elapsed: 0,
            cooldown: 1.8,
            lastIndex: -1
        };
        const holdInput = {
            pointerId: null,
            active: false,
            startedMs: 0,
            triggered: false
        };
        const HOLD_TO_BURST_MS = 3000;
        const stuntSim = {
            pos: new THREE.Vector3(),
            vel: new THREE.Vector3(),
            rot: new THREE.Vector3(),
            rotVel: new THREE.Vector3(),
            flapHzAdd: 0,
            wingAmpMul: 1
        };
        const STUNT_PHYSICS = {
            posStiffness: 24.0,
            posDamping: 10.5,
            rotStiffness: 26.0,
            rotDamping: 11.0,
            maxLinearSpeed: 2.4,
            maxAngularSpeed: 5.1
        };

        function setNextStuntCooldown(action) {
            const span = action.cooldownMax - action.cooldownMin;
            stuntState.cooldown = action.cooldownMin + Math.random() * span;
        }

        function startRandomStunt() {
            const pool = stuntActions.filter((s) => s.key !== 'burstDive');
            if (pool.length === 0) return;
            let index = Math.floor(Math.random() * pool.length);
            if (pool.length > 1 && pool[index].key === stuntState.active?.key) {
                index = (index + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
            }
            stuntState.active = pool[index];
            stuntState.elapsed = 0;
            stuntState.lastIndex = stuntActions.findIndex((s) => s.key === stuntState.active.key);
            setNextStuntCooldown(stuntState.active);
        }

        function startStuntByKey(key) {
            const index = stuntActions.findIndex((s) => s.key === key);
            if (index < 0) return;
            stuntState.active = stuntActions[index];
            stuntState.elapsed = 0;
            stuntState.lastIndex = index;
            setNextStuntCooldown(stuntState.active);
        }

        function smoothStep01(v) {
            return THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(v, 0, 1), 0, 1);
        }

        function shortestAngleDelta(current, target) {
            let d = target - current;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            return d;
        }

        function stepSpringScalar(current, velocity, target, stiffness, damping, dt, maxSpeed, isAngle = false) {
            const delta = isAngle ? shortestAngleDelta(current, target) : (target - current);
            const accel = delta * stiffness - velocity * damping;
            let nextVel = velocity + accel * dt;
            nextVel = THREE.MathUtils.clamp(nextVel, -maxSpeed, maxSpeed);
            let nextValue = current + nextVel * dt;
            if (isAngle) {
                nextValue = THREE.MathUtils.euclideanModulo(nextValue + Math.PI, Math.PI * 2) - Math.PI;
            }
            return [nextValue, nextVel];
        }

        function sampleStunt(dt) {
            const output = {
                rigX: 0,
                rigY: 0,
                rigZ: 0,
                rigPitch: 0,
                rigYaw: 0,
                rigRoll: 0,
                flapHzAdd: 0,
                wingAmpMul: 1
            };
            if (mysteryFlightCinematic.active) {
                const suppressBlend = THREE.MathUtils.clamp(
                    mysteryFlightCinematic.actionSuppress / Math.max(0.001, MYSTERY_CHARACTER_FLIGHT_CONFIG.interruptionBlendDuration ?? 0.42),
                    0,
                    1
                );
                if (stuntState.active && suppressBlend <= 0.001) {
                    stuntState.active = null;
                    stuntState.elapsed = 0;
                }
                stuntState.cooldown = Math.max(stuntState.cooldown, 3.2);
                if (!stuntState.active) {
                    return output;
                }

                stuntState.elapsed += dt;
                const action = stuntState.active;
                const u = THREE.MathUtils.clamp(stuntState.elapsed / action.duration, 0, 1);
                const s = smoothStep01(u);
                const envBase = smoothEmotionEnvelope(stuntState.elapsed, action.duration, action.fadeIn, action.fadeOut);
                const env = envBase * suppressBlend;

                if (action.key === 'barrel360') {
                    const turn = s * Math.PI * 2;
                    output.rigRoll = turn;
                    output.rigY = Math.sin(s * Math.PI) * 0.38 * env;
                    output.rigZ = -Math.sin(s * Math.PI) * 0.5 * env;
                    output.rigYaw = Math.sin(s * Math.PI * 2) * 0.18 * env;
                    output.flapHzAdd = 0.15 * env;
                    output.wingAmpMul = 1 + 0.2 * env;
                } else if (action.key === 'loop') {
                    const loopTurn = s * Math.PI * 2;
                    output.rigPitch = loopTurn;
                    output.rigY = Math.sin(s * Math.PI) * 0.95 * env;
                    output.rigZ = -Math.sin(s * Math.PI) * 1.25 * env;
                    output.rigRoll = Math.sin(s * Math.PI * 2) * 0.2 * env;
                    output.flapHzAdd = 0.12 * env;
                    output.wingAmpMul = 1 + 0.16 * env;
                } else if (action.key === 'corkscrew') {
                    const turn = s * Math.PI * 2;
                    const radius = 0.52 * env;
                    output.rigX = Math.cos(turn) * radius;
                    output.rigY = Math.sin(s * Math.PI) * 0.62 * env;
                    output.rigZ = -Math.sin(turn * 2) * radius * 0.58;
                    output.rigYaw = Math.sin(turn) * 0.95 * env;
                    output.rigRoll = Math.sin(turn * 1.5) * 1.2 * env;
                    output.flapHzAdd = 0.14 * env;
                    output.wingAmpMul = 1 + 0.19 * env;
                } else if (action.key === 'wingover') {
                    const rise = smoothStep01(Math.min(1, s * 1.45));
                    const descend = smoothStep01(Math.max(0, (s - 0.34) / 0.66));
                    output.rigY = (rise * 1.05 - descend * 0.95) * env;
                    output.rigX = Math.sin(s * Math.PI) * 0.85 * env;
                    output.rigYaw = Math.sin(s * Math.PI * 1.7) * 0.62 * env;
                    output.rigRoll = Math.sin(s * Math.PI * 1.1) * 1.05 * env;
                    output.rigPitch = -Math.sin(s * Math.PI) * 0.24 * env;
                    output.flapHzAdd = 0.08 * env;
                    output.wingAmpMul = 1 + 0.12 * env;
                } else if (action.key === 'burstDive') {
                    const p1 = 0.18;
                    const p2 = 0.48;
                    const p3 = 0.78;
                    if (u < p1) {
                        const q = smoothStep01(u / p1);
                        output.rigY = q * 0.65 * env;
                        output.rigPitch = -q * 0.42;
                        output.rigRoll = Math.sin(q * Math.PI) * 0.22;
                        output.flapHzAdd = 0.3 * q;
                        output.wingAmpMul = 1 + 0.55 * q;
                    } else if (u < p2) {
                        const q = smoothStep01((u - p1) / (p2 - p1));
                        output.rigY = (0.65 + q * 3.35) * env;
                        output.rigZ = -q * 2.8 * env;
                        output.rigPitch = -0.55 + q * 0.22;
                        output.rigYaw = Math.sin(q * Math.PI) * 0.2;
                        output.rigRoll = Math.sin(q * Math.PI * 1.2) * 0.35;
                        output.flapHzAdd = 0.18 + (1 - q) * 0.12;
                        output.wingAmpMul = 1.48 - q * 0.28;
                    } else if (u < p3) {
                        const q = smoothStep01((u - p2) / (p3 - p2));
                        const spinEase = 1 - Math.pow(1 - q, 3);
                        output.rigY = (4.0 - q * 6.35) * env;
                        output.rigZ = (-2.8 + q * 2.55) * env;
                        output.rigX = Math.sin(q * Math.PI * 2.1) * 0.7 * env;
                        output.rigPitch = 0.2 + q * 0.95;
                        output.rigYaw = Math.sin(q * Math.PI * 2.6) * 0.65 * env;
                        output.rigRoll = spinEase * (Math.PI * 3.4);
                        output.flapHzAdd = 0.04 + q * 0.08;
                        output.wingAmpMul = 0.9 + q * 0.38;
                    } else {
                        const q = smoothStep01((u - p3) / (1 - p3));
                        output.rigY = (-2.15 + q * 2.15) * env;
                        output.rigZ = (-0.15 + q * 0.15) * env;
                        output.rigX = Math.sin((1 - q) * Math.PI) * 0.16 * env;
                        output.rigPitch = (1.15 - q * 1.15);
                        output.rigYaw = Math.sin((1 - q) * Math.PI) * 0.16 * env;
                        output.rigRoll = (Math.PI * 2.6) * (1 - q);
                        output.flapHzAdd = 0.16 * (1 - q);
                        output.wingAmpMul = 1.28 - q * 0.28;
                    }
                }

                if (stuntState.elapsed >= action.duration) {
                    stuntState.active = null;
                    stuntState.elapsed = 0;
                }
                return output;
            }

            if (!stuntState.active) {
                stuntState.cooldown -= dt;
                if (stuntState.cooldown <= 0 && !emotionState.active) {
                    startRandomStunt();
                }
                return output;
            }

            stuntState.elapsed += dt;
            const action = stuntState.active;
            const u = THREE.MathUtils.clamp(stuntState.elapsed / action.duration, 0, 1);
            const s = smoothStep01(u);
            const env = smoothEmotionEnvelope(stuntState.elapsed, action.duration, action.fadeIn, action.fadeOut);

            if (action.key === 'barrel360') {
                const turn = s * Math.PI * 2;
                output.rigRoll = turn;
                output.rigY = Math.sin(s * Math.PI) * 0.38 * env;
                output.rigZ = -Math.sin(s * Math.PI) * 0.5 * env;
                output.rigYaw = Math.sin(s * Math.PI * 2) * 0.18 * env;
                output.flapHzAdd = 0.15 * env;
                output.wingAmpMul = 1 + 0.2 * env;
            } else if (action.key === 'loop') {
                const loopTurn = s * Math.PI * 2;
                output.rigPitch = loopTurn;
                output.rigY = Math.sin(s * Math.PI) * 0.95 * env;
                output.rigZ = -Math.sin(s * Math.PI) * 1.25 * env;
                output.rigRoll = Math.sin(s * Math.PI * 2) * 0.2 * env;
                output.flapHzAdd = 0.12 * env;
                output.wingAmpMul = 1 + 0.16 * env;
            } else if (action.key === 'corkscrew') {
                const turn = s * Math.PI * 2;
                const radius = 0.52 * env;
                output.rigX = Math.cos(turn) * radius;
                output.rigY = Math.sin(s * Math.PI) * 0.62 * env;
                output.rigZ = -Math.sin(turn * 2) * radius * 0.58;
                output.rigYaw = Math.sin(turn) * 0.95 * env;
                output.rigRoll = Math.sin(turn * 1.5) * 1.2 * env;
                output.flapHzAdd = 0.14 * env;
                output.wingAmpMul = 1 + 0.19 * env;
            } else if (action.key === 'wingover') {
                const rise = smoothStep01(Math.min(1, s * 1.45));
                const descend = smoothStep01(Math.max(0, (s - 0.34) / 0.66));
                output.rigY = (rise * 1.05 - descend * 0.95) * env;
                output.rigX = Math.sin(s * Math.PI) * 0.85 * env;
                output.rigYaw = Math.sin(s * Math.PI * 1.7) * 0.62 * env;
                output.rigRoll = Math.sin(s * Math.PI * 1.1) * 1.05 * env;
                output.rigPitch = -Math.sin(s * Math.PI) * 0.24 * env;
                output.flapHzAdd = 0.08 * env;
                output.wingAmpMul = 1 + 0.12 * env;
            } else if (action.key === 'burstDive') {
                const p1 = 0.18;
                const p2 = 0.48;
                const p3 = 0.78;
                if (u < p1) {
                    const q = smoothStep01(u / p1);
                    output.rigY = q * 0.65 * env;
                    output.rigPitch = -q * 0.42;
                    output.rigRoll = Math.sin(q * Math.PI) * 0.22;
                    output.flapHzAdd = 0.3 * q;
                    output.wingAmpMul = 1 + 0.55 * q;
                } else if (u < p2) {
                    const q = smoothStep01((u - p1) / (p2 - p1));
                    output.rigY = (0.65 + q * 3.35) * env;
                    output.rigZ = -q * 2.8 * env;
                    output.rigPitch = -0.55 + q * 0.22;
                    output.rigYaw = Math.sin(q * Math.PI) * 0.2;
                    output.rigRoll = Math.sin(q * Math.PI * 1.2) * 0.35;
                    output.flapHzAdd = 0.18 + (1 - q) * 0.12;
                    output.wingAmpMul = 1.48 - q * 0.28;
                } else if (u < p3) {
                    const q = smoothStep01((u - p2) / (p3 - p2));
                    const spinEase = 1 - Math.pow(1 - q, 3);
                    output.rigY = (4.0 - q * 6.35) * env;
                    output.rigZ = (-2.8 + q * 2.55) * env;
                    output.rigX = Math.sin(q * Math.PI * 2.1) * 0.7 * env;
                    output.rigPitch = 0.2 + q * 0.95;
                    output.rigYaw = Math.sin(q * Math.PI * 2.6) * 0.65 * env;
                    output.rigRoll = spinEase * (Math.PI * 3.4);
                    output.flapHzAdd = 0.04 + q * 0.08;
                    output.wingAmpMul = 0.9 + q * 0.38;
                } else {
                    const q = smoothStep01((u - p3) / (1 - p3));
                    output.rigY = (-2.15 + q * 2.15) * env;
                    output.rigZ = (-0.15 + q * 0.15) * env;
                    output.rigX = Math.sin((1 - q) * Math.PI) * 0.16 * env;
                    output.rigPitch = (1.15 - q * 1.15);
                    output.rigYaw = Math.sin((1 - q) * Math.PI) * 0.16 * env;
                    output.rigRoll = (Math.PI * 2.6) * (1 - q);
                    output.flapHzAdd = 0.16 * (1 - q);
                    output.wingAmpMul = 1.28 - q * 0.28;
                }
            }

            if (stuntState.elapsed >= action.duration) {
                stuntState.active = null;
                stuntState.elapsed = 0;
            }

            return output;
        }

        function updateCursorFromClientPoint(clientX, clientY) {
            cursor.x = (clientX / window.innerWidth) * 2 - 1;
            cursor.y = -(clientY / window.innerHeight) * 2 + 1;
        }

        function intersectObjectsAt(clientX, clientY, objects, recursive = true) {
            if (!objects) return [];
            const objectList = Array.isArray(objects) ? objects : [objects];
            if (!objectList.length) return [];

            pointerNdc.x = (clientX / window.innerWidth) * 2 - 1;
            pointerNdc.y = -(clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(pointerNdc, camera);
            return raycaster.intersectObjects(objectList, recursive);
        }

        function intersectsCharacterAt(clientX, clientY) {
            return intersectObjectsAt(clientX, clientY, characterHitMeshes, false).length > 0;
        }

        window.addEventListener('pointermove', (e) => {
            updateCursorFromClientPoint(e.clientX, e.clientY);
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            if (!touch) return;
            updateCursorFromClientPoint(touch.clientX, touch.clientY);
        }, { passive: true });

        window.addEventListener('pointerdown', (e) => {
            if (e.target && e.target.closest && e.target.closest('#ui-overlay')) return;
            if (handleMysteryBoxPointerDown(e.clientX, e.clientY)) return;
            if (!intersectsCharacterAt(e.clientX, e.clientY)) return;
            holdInput.active = true;
            holdInput.pointerId = e.pointerId ?? null;
            holdInput.startedMs = performance.now();
            holdInput.triggered = false;
        });

        window.addEventListener('pointermove', (e) => {
            if (!holdInput.active) return;
            if (holdInput.pointerId !== null && e.pointerId !== holdInput.pointerId) return;
            if (!intersectsCharacterAt(e.clientX, e.clientY)) {
                holdInput.active = false;
            }
        }, { passive: true });

        window.addEventListener('pointerup', (e) => {
            if (!holdInput.active) return;
            if (holdInput.pointerId !== null && e.pointerId !== holdInput.pointerId) return;
            const heldMs = performance.now() - holdInput.startedMs;
            const wasTriggered = holdInput.triggered;
            holdInput.active = false;
            holdInput.pointerId = null;
            holdInput.startedMs = 0;
            holdInput.triggered = false;
            if (!wasTriggered && heldMs < HOLD_TO_BURST_MS) {
                startRandomEmotionAction();
                if (!stuntState.active && Math.random() < 0.45) startRandomStunt();
            }
        });

        window.addEventListener('pointercancel', () => {
            holdInput.active = false;
            holdInput.pointerId = null;
            holdInput.startedMs = 0;
            holdInput.triggered = false;
        });

        function applyResponsiveLayout() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const aspect = w / h;
            const isPortrait = aspect < 1;

            camera.aspect = aspect;
            camera.fov = isPortrait ? 52 : 45;
            camera.position.set(0, isPortrait ? 0.9 : 1.2, isPortrait ? 22 : 20);
            camera.updateProjectionMatrix();

            let scale = BASE_CREATURE_SCALE;
            if (isPortrait) scale *= 0.88;
            if (w < 420) scale *= 0.95;
            creatureGroup.scale.setScalar(scale);

            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setSize(w, h);

            if (previewState && previewState.open) {
                resizePropViewport();
            }
        }

        function animate() {
            requestAnimationFrame(animate);
            const dt = Math.min(clock.getDelta(), 1 / 30);
            if (!Number.isFinite(dt) || dt <= 0) {
                renderer.render(scene, camera);
                return;
            }
            elapsed += dt;
            const t = elapsed;

            if (!mysteryFlightCinematic.active && holdInput.active && !holdInput.triggered && (performance.now() - holdInput.startedMs) >= HOLD_TO_BURST_MS) {
                holdInput.triggered = true;
                startStuntByKey('burstDive');
                startRandomEmotionAction();
            }

            const emotion = sampleEmotion(dt);
            const stuntTarget = sampleStunt(dt);

            [stuntSim.pos.x, stuntSim.vel.x] = stepSpringScalar(
                stuntSim.pos.x,
                stuntSim.vel.x,
                stuntTarget.rigX,
                STUNT_PHYSICS.posStiffness,
                STUNT_PHYSICS.posDamping,
                dt,
                STUNT_PHYSICS.maxLinearSpeed
            );
            [stuntSim.pos.y, stuntSim.vel.y] = stepSpringScalar(
                stuntSim.pos.y,
                stuntSim.vel.y,
                stuntTarget.rigY,
                STUNT_PHYSICS.posStiffness,
                STUNT_PHYSICS.posDamping,
                dt,
                STUNT_PHYSICS.maxLinearSpeed
            );
            [stuntSim.pos.z, stuntSim.vel.z] = stepSpringScalar(
                stuntSim.pos.z,
                stuntSim.vel.z,
                stuntTarget.rigZ,
                STUNT_PHYSICS.posStiffness,
                STUNT_PHYSICS.posDamping,
                dt,
                STUNT_PHYSICS.maxLinearSpeed
            );
            [stuntSim.rot.x, stuntSim.rotVel.x] = stepSpringScalar(
                stuntSim.rot.x,
                stuntSim.rotVel.x,
                stuntTarget.rigPitch,
                STUNT_PHYSICS.rotStiffness,
                STUNT_PHYSICS.rotDamping,
                dt,
                STUNT_PHYSICS.maxAngularSpeed,
                true
            );
            [stuntSim.rot.y, stuntSim.rotVel.y] = stepSpringScalar(
                stuntSim.rot.y,
                stuntSim.rotVel.y,
                stuntTarget.rigYaw,
                STUNT_PHYSICS.rotStiffness,
                STUNT_PHYSICS.rotDamping,
                dt,
                STUNT_PHYSICS.maxAngularSpeed,
                true
            );
            [stuntSim.rot.z, stuntSim.rotVel.z] = stepSpringScalar(
                stuntSim.rot.z,
                stuntSim.rotVel.z,
                stuntTarget.rigRoll,
                STUNT_PHYSICS.rotStiffness,
                STUNT_PHYSICS.rotDamping,
                dt,
                STUNT_PHYSICS.maxAngularSpeed,
                true
            );

            if (!Number.isFinite(stuntSim.pos.x) || !Number.isFinite(stuntSim.pos.y) || !Number.isFinite(stuntSim.pos.z)) {
                stuntSim.pos.set(0, 0, 0);
                stuntSim.vel.set(0, 0, 0);
            }
            stuntSim.pos.x = THREE.MathUtils.clamp(stuntSim.pos.x, -3.2, 3.2);
            stuntSim.pos.y = THREE.MathUtils.clamp(stuntSim.pos.y, -2.2, 2.2);
            stuntSim.pos.z = THREE.MathUtils.clamp(stuntSim.pos.z, -4.2, 2.8);

            stuntSim.flapHzAdd += (stuntTarget.flapHzAdd - stuntSim.flapHzAdd) * Math.min(1, dt * 6.0);
            stuntSim.wingAmpMul += (stuntTarget.wingAmpMul - stuntSim.wingAmpMul) * Math.min(1, dt * 6.0);

            // Wing-driven flight model with spring damping to keep physically plausible hover.
            const flapHz = FLIGHT_TUNING.baseFlapHz + stuntSim.flapHzAdd + Math.sin(t * 0.42) * FLIGHT_TUNING.flapHzVariance;
            const flapOmega = Math.PI * 2 * flapHz;
            flightState.phase += flapOmega * dt;
            const stroke = Math.sin(flightState.phase);
            const strokeVelNorm = Math.cos(flightState.phase);
            const aeroRaw = 0.5 + 0.5 * strokeVelNorm;
            // Smoothed aerodynamic weighting: favors downstroke while keeping C1 continuity.
            flightState.aero += (aeroRaw - flightState.aero) * Math.min(1, dt * 9.0);
            const downstroke = Math.pow(flightState.aero, 1.45);
            const upstroke = Math.pow(1 - flightState.aero, 1.2);

            const wingAmplitude = 0.47 + Math.min(0.16, Math.abs(flightState.yVel) * 0.15);
            const lift = 8.35 + downstroke * 2.25 + Math.abs(strokeVelNorm) * 0.62 - upstroke * 0.24;
            const yAccel = lift - 9.1 - (flightState.y - 0.12) * 9.1 - flightState.yVel * 4.6;
            flightState.yVel += yAccel * dt;
            flightState.y += flightState.yVel * dt;
            flightState.y = THREE.MathUtils.clamp(flightState.y, -0.54, 0.86);
            creatureGroup.position.y = flightState.y + emotion.y;
            stuntRig.position.set(stuntSim.pos.x, stuntSim.pos.y, stuntSim.pos.z);
            const mysteryFlightFx = updateMysteryFlightCinematic(dt, t);
            const mysteryFlightCfg = MYSTERY_CHARACTER_FLIGHT_CONFIG;
            const mysteryTurnSmooth = Math.min(1, dt * (mysteryFlightCfg.turnLiftSmoothing ?? 8.2));
            const mysteryTurnReturn = Math.min(1, dt * (mysteryFlightCfg.turnLiftReturnSmoothing ?? 11));
            const mysteryTornadoSmooth = Math.min(1, dt * (mysteryFlightCfg.tornadoSmoothing ?? 12));
            const mysteryTornadoReturn = Math.min(1, dt * (mysteryFlightCfg.tornadoReturnSmoothing ?? 14));
            let mysteryOrbitX = 0;
            let mysteryOrbitZ = 0;
            if (mysteryFlightFx.active) {
                stuntRig.position.add(mysteryFlightFx.rigOffset);

                const phase = mysteryFlightFx.phase || 'idle';
                const rawSide =
                    Math.sign(mysteryFlightFx.bodyYaw || 0) ||
                    Math.sign(mysteryFlightFx.finalSide || 0) ||
                    Math.sign(mysteryFlightFx.anticipationSide || 0) ||
                    1;
                const sideSign = rawSide === 0 ? 1 : rawSide;
                const wingWave = Math.sin(mysteryFlightFx.wingPhase || 0);
                const flapDown = Math.max(0, wingWave);
                const yawTurn = Math.abs(mysteryFlightFx.bodyYaw || 0);
                let spinBuild = 0;
                if (phase === 'anticipation') spinBuild = 0.24;
                else if (phase === 'lookUp') spinBuild = 0.28;
                else if (phase === 'wingCharge') spinBuild = 0.5;
                else if (phase === 'powerFlap') spinBuild = 0.75;
                else if (phase === 'ascent') spinBuild = 1;
                else if (phase === 'hold') spinBuild = 0.82;
                else if (phase === 'return') {
                    spinBuild = THREE.MathUtils.clamp(
                        1 - mysteryFlightFx.timer / Math.max(0.001, mysteryFlightCfg.returnDuration || 1.12),
                        0,
                        1
                    ) * 0.68;
                }

                const spinDriver = THREE.MathUtils.clamp(yawTurn + spinBuild * 0.22, 0, 1);
                const spinSpeed = THREE.MathUtils.lerp(
                    mysteryFlightCfg.tornadoSpinSpeedMin ?? 2.2,
                    mysteryFlightCfg.tornadoSpinSpeedMax ?? 6.1,
                    spinDriver
                );
                mysteryTornadoAngle += spinSpeed * dt * sideSign;
                mysteryTornadoRadius = THREE.MathUtils.lerp(
                    mysteryTornadoRadius,
                    (mysteryFlightCfg.tornadoRadiusMax ?? 0.68) * spinDriver,
                    mysteryTornadoSmooth
                );
                mysteryOrbitX = Math.cos(mysteryTornadoAngle) * mysteryTornadoRadius;
                mysteryOrbitZ = Math.sin(mysteryTornadoAngle) * mysteryTornadoRadius;

                const targetTurnLift = (mysteryFlightCfg.turnLiftBase ?? 0.06)
                    + yawTurn * (mysteryFlightCfg.turnLiftYawScale ?? 0.18)
                    + flapDown * (mysteryFlightCfg.turnLiftFlapScale ?? 0.15);
                const targetTurnBank =
                    Math.sign(mysteryFlightFx.bodyYaw || 1) * yawTurn * (mysteryFlightCfg.turnBankScale ?? 0.18) +
                    flapWave * sideSign * (mysteryFlightCfg.tornadoRollFlapScale ?? 0.11);
                const targetFlapLift = flapDown * (mysteryFlightCfg.tornadoLiftByFlap ?? 0.09);
                const targetFlapRoll = flapWave * sideSign * (mysteryFlightCfg.tornadoRollFlapScale ?? 0.11);
                const targetBodyYaw = flapWave * sideSign * (mysteryFlightCfg.tornadoYawScale ?? 0.12) * (0.4 + 0.6 * spinDriver);
                const targetBodyPitch = -flapWave * (mysteryFlightCfg.tornadoPitchScale ?? 0.06) * (0.5 + 0.5 * spinDriver);

                mysteryTurnLift = THREE.MathUtils.lerp(mysteryTurnLift, targetTurnLift, mysteryTurnSmooth);
                mysteryTurnBank = THREE.MathUtils.lerp(mysteryTurnBank, targetTurnBank, mysteryTurnSmooth);
                mysteryFlapLift = THREE.MathUtils.lerp(mysteryFlapLift, targetFlapLift, mysteryTurnSmooth);
                mysteryFlapRoll = THREE.MathUtils.lerp(mysteryFlapRoll, targetFlapRoll, mysteryTurnSmooth);
                mysteryBodySpinYaw = THREE.MathUtils.lerp(mysteryBodySpinYaw, targetBodyYaw, mysteryTurnSmooth);
                mysteryBodySwingPitch = THREE.MathUtils.lerp(mysteryBodySwingPitch, targetBodyPitch, mysteryTurnSmooth);
            } else {
                mysteryTurnLift = THREE.MathUtils.lerp(mysteryTurnLift, 0, mysteryTurnReturn);
                mysteryTurnBank = THREE.MathUtils.lerp(mysteryTurnBank, 0, mysteryTurnReturn);
                mysteryFlapLift = THREE.MathUtils.lerp(mysteryFlapLift, 0, mysteryTurnReturn);
                mysteryFlapRoll = THREE.MathUtils.lerp(mysteryFlapRoll, 0, mysteryTurnReturn);
                mysteryBodySpinYaw = THREE.MathUtils.lerp(mysteryBodySpinYaw, 0, mysteryTurnReturn);
                mysteryBodySwingPitch = THREE.MathUtils.lerp(mysteryBodySwingPitch, 0, mysteryTurnReturn);
                mysteryTornadoRadius = THREE.MathUtils.lerp(mysteryTornadoRadius, 0, mysteryTornadoReturn);
                mysteryOrbitX = Math.cos(mysteryTornadoAngle) * mysteryTornadoRadius;
                mysteryOrbitZ = Math.sin(mysteryTornadoAngle) * mysteryTornadoRadius;
            }
            stuntRig.position.y += mysteryTurnLift;
            stuntRig.position.y += mysteryFlapLift;
            stuntRig.position.x += mysteryOrbitX;
            stuntRig.position.z += mysteryOrbitZ;
            stuntRig.rotation.z += mysteryTurnBank;
            stuntRig.rotation.z += mysteryFlapRoll;
            mysteryTornadoAngle *= 0.998;

            const pitchTarget = (-cursor.y * 0.1) + (-downstroke * 0.06 + upstroke * 0.02);
            const pitchAccel = (pitchTarget - flightState.pitch) * 16.0 - flightState.pitchVel * 7.8;
            flightState.pitchVel += pitchAccel * dt;
            flightState.pitch += flightState.pitchVel * dt;

            const rollTarget = Math.sin(flightState.phase + Math.PI * 0.5) * 0.022;
            const rollAccel = (rollTarget - flightState.roll) * 14.0 - flightState.rollVel * 7.0;
            flightState.rollVel += rollAccel * dt;
            flightState.roll += flightState.rollVel * dt;
            creatureGroup.rotation.z = flightState.roll + emotion.roll + (mysteryFlightFx.bodyRoll ?? 0);
            stuntRig.rotation.set(stuntSim.rot.x, stuntSim.rot.y, stuntSim.rot.z);

            const hoverHeight = THREE.MathUtils.clamp((creatureGroup.position.y + stuntSim.pos.y) * 0.65, -0.2, 0.35);
            const shadowScale = 1 + Math.max(0, hoverHeight) * 0.5;
            contactShadow.scale.set(1.25 * shadowScale, 0.78 * shadowScale, 1);
            contactShadowSoft.scale.set(1.45 * shadowScale, 0.9 * shadowScale, 1);
            contactShadow.material.opacity = 0.56 - Math.max(0, hoverHeight) * 0.2;
            contactShadowSoft.material.opacity = 0.34 - Math.max(0, hoverHeight) * 0.12;
            shadowAnchor.position.x = 0.3 + creatureGroup.rotation.y * 0.55 + stuntSim.pos.x * 0.22;
            shadowAnchor.position.z = -5.8 + creatureGroup.rotation.x * 1.1 + stuntSim.pos.z * 0.22;

            const flap = stroke * wingAmplitude * emotion.wingAmpMul * stuntSim.wingAmpMul * (mysteryFlightFx.wingBoost ?? 1);
            const strokeHarmonic = Math.sin(flightState.phase * 2 - 0.35) * 0.12;
            leftWingGroup.rotation.z = flap + strokeHarmonic - 0.2 + (mysteryFlightFx.hardFlap ?? 0);
            rightWingGroup.rotation.z = -flap - strokeHarmonic + 0.2 - (mysteryFlightFx.hardFlap ?? 0);

            const wingFeather = 0.07 + upstroke * 0.2 + emotion.wingFeatherAdd;
            const wingSweep = 0.03 + downstroke * 0.09 - upstroke * 0.025 + emotion.wingSweepAdd;
            leftWingGroup.rotation.x = wingFeather + stroke * 0.03 + strokeHarmonic * 0.25 + (mysteryFlightFx.wingLift ?? 0);
            rightWingGroup.rotation.x = wingFeather + stroke * 0.03 + strokeHarmonic * 0.25 + (mysteryFlightFx.wingLift ?? 0);
            leftWingGroup.rotation.y = wingSweep;
            rightWingGroup.rotation.y = -wingSweep;

            if (activeProps.has('roboticWings')) {
                const roboticProp = propObjects.roboticWings;
                if (roboticProp && roboticProp.userData.emitters) {
                    const pulse = 1.2 + downstroke * 0.3 + Math.sin(t * 7.2) * 0.28;
                    for (const emitter of roboticProp.userData.emitters) {
                        emitter.material.emissiveIntensity = pulse;
                    }
                }
            }

            if (activeProps.has('alphaWings')) {
                const alphaProp = propObjects.alphaWings;
                if (alphaProp?.userData.glowMats) {
                    const cyanPulse = 1.42 + downstroke * 0.56 + Math.sin(t * 6.7) * 0.24;
                    const magentaPulse = 1.26 + downstroke * 0.48 + Math.sin(t * 5.9 + 0.72) * 0.22;
                    for (const glowMat of alphaProp.userData.glowMats) {
                        if (!glowMat) continue;
                        const channel = glowMat.userData.channel || 'cyan';
                        glowMat.emissiveIntensity = channel === 'magenta' ? magentaPulse : cyanPulse;
                    }
                }
                if (alphaProp?.userData.lightEmitters) {
                    for (let i = 0; i < alphaProp.userData.lightEmitters.length; i++) {
                        const light = alphaProp.userData.lightEmitters[i];
                        light.intensity = 0.82 + downstroke * 0.6 + Math.sin(t * 4.9 + i * 0.6) * 0.2;
                    }
                }
                if (alphaProp?.userData.sparkSystems) {
                    for (const sparkSystem of alphaProp.userData.sparkSystems) {
                        const attr = sparkSystem.points.geometry.attributes.position;
                        const arr = attr.array;
                        const base = sparkSystem.basePositions;
                        const phases = sparkSystem.phases;
                        for (let i = 0; i < phases.length; i++) {
                            const idx = i * 3;
                            const phase = phases[i];
                            arr[idx] = base[idx] + Math.sin(t * sparkSystem.speed + phase) * sparkSystem.drift;
                            arr[idx + 1] = base[idx + 1] + Math.cos(t * (sparkSystem.speed * 0.82) + phase * 1.15) * sparkSystem.drift * 0.86;
                            arr[idx + 2] = base[idx + 2] + Math.sin(t * (sparkSystem.speed * 1.26) + phase * 0.7) * sparkSystem.drift * 0.54;
                        }
                        attr.needsUpdate = true;
                        sparkSystem.points.material.opacity = 0.58 + Math.sin(t * 5.2 + sparkSystem.phaseOffset) * 0.2;
                    }
                }
            }

            if (activeProps.has('rainbowWings')) {
                const rainbowProp = propObjects.rainbowWings;
                if (rainbowProp?.userData.iridescentMats) {
                    const warmPulse = 1.04 + downstroke * 0.54 + Math.sin(t * 5.1) * 0.2;
                    const coolPulse = 0.96 + downstroke * 0.46 + Math.sin(t * 4.4 + 0.7) * 0.18;
                    for (const iridescentMat of rainbowProp.userData.iridescentMats) {
                        if (!iridescentMat) continue;
                        const channel = iridescentMat.userData.channel || 'warm';
                        iridescentMat.emissiveIntensity = channel === 'cool' ? coolPulse : warmPulse;
                    }
                }
                if (rainbowProp?.userData.wingLights) {
                    for (let i = 0; i < rainbowProp.userData.wingLights.length; i++) {
                        const light = rainbowProp.userData.wingLights[i];
                        light.intensity = 0.72 + downstroke * 0.56 + Math.sin(t * 4.1 + i * 0.65) * 0.22;
                    }
                }
                if (rainbowProp?.userData.sparkSystems) {
                    for (const sparkSystem of rainbowProp.userData.sparkSystems) {
                        const attr = sparkSystem.points.geometry.attributes.position;
                        const arr = attr.array;
                        const base = sparkSystem.basePositions;
                        const phases = sparkSystem.phases;
                        for (let i = 0; i < phases.length; i++) {
                            const idx = i * 3;
                            const phase = phases[i];
                            arr[idx] = base[idx] + Math.sin(t * sparkSystem.speed + phase) * sparkSystem.drift;
                            arr[idx + 1] = base[idx + 1] + Math.cos(t * (sparkSystem.speed * 0.86) + phase * 1.22) * sparkSystem.drift * 0.84;
                            arr[idx + 2] = base[idx + 2] + Math.sin(t * (sparkSystem.speed * 1.2) + phase * 0.76) * sparkSystem.drift * 0.52;
                        }
                        attr.needsUpdate = true;
                        sparkSystem.points.material.opacity = 0.62 + Math.sin(t * 4.9 + sparkSystem.phaseOffset) * 0.2;
                    }
                }
                if (rainbowProp?.userData.trailDrops) {
                    for (let i = 0; i < rainbowProp.userData.trailDrops.length; i++) {
                        const drop = rainbowProp.userData.trailDrops[i];
                        const bob = 0.92 + Math.sin(t * 3.4 + i * 0.8) * 0.22;
                        drop.scale.setScalar(bob);
                    }
                }
            }

            if (activeProps.has('omegaWings')) {
                const omegaProp = propObjects.omegaWings;
                if (omegaProp?.userData.fireMats) {
                    const infernoPulse = 1.28 + downstroke * 0.58 + Math.sin(t * 4.6) * 0.24;
                    for (const fireMat of omegaProp.userData.fireMats) {
                        fireMat.emissiveIntensity = infernoPulse;
                    }
                }
                if (omegaProp?.userData.fireLights) {
                    const lightPulse = 1.05 + downstroke * 0.52 + Math.sin(t * 5.3) * 0.2;
                    for (const fireLight of omegaProp.userData.fireLights) {
                        fireLight.intensity = lightPulse;
                    }
                }
                if (omegaProp?.userData.embers) {
                    for (let i = 0; i < omegaProp.userData.embers.length; i++) {
                        const ember = omegaProp.userData.embers[i];
                        const emberPulse = 0.86 + Math.sin(t * (6.5 + i * 0.7) + i * 1.2) * 0.2;
                        ember.scale.setScalar(emberPulse);
                        ember.position.z = ember.userData.baseZ + Math.sin(t * (4.2 + i * 0.45)) * 0.02;
                    }
                }
            }

            if (activeProps.has('wizardHat')) {
                const wizardHat = propObjects.wizardHat;
                if (wizardHat?.userData.magicGem) {
                    const gemPulse = 1.2 + Math.sin(t * 5.4) * 0.22 + downstroke * 0.24;
                    wizardHat.userData.magicGem.material.emissiveIntensity = gemPulse;
                }
                if (wizardHat?.userData.magicLight) {
                    wizardHat.userData.magicLight.intensity = 0.6 + Math.sin(t * 4.1 + 0.8) * 0.16 + downstroke * 0.28;
                }
                if (wizardHat?.userData.starField && wizardHat?.userData.starFieldData) {
                    const stars = wizardHat.userData.starField;
                    const starData = wizardHat.userData.starFieldData;
                    const matrix = new THREE.Matrix4();
                    const pos = new THREE.Vector3();
                    const quat = new THREE.Quaternion();
                    const scale = new THREE.Vector3();
                    for (let i = 0; i < starData.length; i++) {
                        const d = starData[i];
                        const a = d.angle + t * 0.45;
                        pos.set(
                            Math.cos(a) * d.radius - 0.08,
                            d.y + Math.sin(t * 2.2 + d.phase) * 0.04,
                            Math.sin(a) * d.radius + 0.08
                        );
                        quat.setFromEuler(new THREE.Euler(
                            t * (0.6 + d.spin * 0.2),
                            t * (0.45 + d.spin * 0.16),
                            t * (0.7 + d.spin * 0.22)
                        ));
                        const twinkle = d.scale * (0.8 + Math.sin(t * 6.0 + d.phase) * 0.22);
                        scale.set(twinkle, twinkle, twinkle);
                        matrix.compose(pos, quat, scale);
                        stars.setMatrixAt(i, matrix);
                    }
                    stars.instanceMatrix.needsUpdate = true;
                    stars.material.opacity = 0.72 + Math.sin(t * 3.8) * 0.16;
                }
            }

            if (activeProps.has('halo')) {
                const haloProp = propObjects.halo;
                if (haloProp?.userData.energyRing) {
                    haloProp.userData.energyRing.rotation.z = t * 0.9;
                    haloProp.userData.energyRing.material.opacity = 0.34 + Math.sin(t * 3.0) * 0.12;
                }
                if (haloProp?.userData.haloLight) {
                    haloProp.userData.haloLight.intensity = 0.84 + Math.sin(t * 4.4) * 0.2 + downstroke * 0.22;
                }
                if (haloProp?.userData.orbiters) {
                    for (let i = 0; i < haloProp.userData.orbiters.length; i++) {
                        const orb = haloProp.userData.orbiters[i];
                        const a = orb.userData.phase + t * (0.62 + i * 0.03);
                        const r = 1.22 + (i % 2) * 0.12;
                        orb.position.x = Math.cos(a) * r;
                        orb.position.z = Math.sin(a) * r;
                        orb.position.y = orb.userData.baseY + Math.sin(t * 2.8 + i * 0.6) * 0.05;
                    }
                }
                if (haloProp?.userData.haloGlow) {
                    const s = 3.2 + Math.sin(t * 2.6) * 0.26;
                    haloProp.userData.haloGlow.scale.set(s, s, 1);
                }
            }

            if (activeProps.has('ramHorns')) {
                const ramHorns = propObjects.ramHorns;
                if (ramHorns?.userData.hornMaterial) {
                    ramHorns.userData.hornMaterial.emissiveIntensity = 0.09 + Math.sin(t * 1.8) * 0.02;
                }
            }

            if (activeProps.has('devilHorns')) {
                const devilHorns = propObjects.devilHorns;
                if (devilHorns?.userData.emberLights) {
                    for (let i = 0; i < devilHorns.userData.emberLights.length; i++) {
                        const light = devilHorns.userData.emberLights[i];
                        light.intensity = 0.48 + Math.sin(t * (5.0 + i * 0.8)) * 0.18 + downstroke * 0.14;
                    }
                }
                if (devilHorns?.userData.lavaMats) {
                    const lavaPulse = 0.76 + Math.sin(t * 6.8) * 0.14;
                    for (const lavaMat of devilHorns.userData.lavaMats) {
                        lavaMat.opacity = lavaPulse;
                    }
                }
                if (devilHorns?.userData.obsidianMat) {
                    devilHorns.userData.obsidianMat.emissiveIntensity = 0.2 + Math.sin(t * 3.6) * 0.06;
                }
            }

            if (activeProps.has('unicornHorn')) {
                const unicornHorn = propObjects.unicornHorn;
                if (unicornHorn?.userData.prismMats) {
                    const prismPulse = 0.72 + Math.sin(t * 3.6) * 0.24;
                    unicornHorn.userData.prismMats[0].emissiveIntensity = 0.42 + prismPulse * 0.2;
                    unicornHorn.userData.prismMats[1].emissiveIntensity = 0.86 + prismPulse * 0.32;
                    unicornHorn.userData.prismMats[2].emissiveIntensity = 0.96 + prismPulse * 0.36;
                }
                if (unicornHorn?.userData.prismLight) {
                    unicornHorn.userData.prismLight.intensity = 0.62 + Math.sin(t * 4.2 + 0.4) * 0.18;
                }
                if (unicornHorn?.userData.spiralGroup) {
                    unicornHorn.userData.spiralGroup.rotation.y = t * 0.95;
                }
                if (unicornHorn?.userData.tipGem) {
                    const wobble = Math.sin(t * 2.7) * 0.08;
                    unicornHorn.userData.tipGem.rotation.set(wobble, t * 1.2, -wobble * 0.5);
                }
            }

            if (activeProps.has('archonBody')) {
                const archonBody = propObjects.archonBody;
                if (archonBody?.userData.crystalMats) {
                    const crystalPulse = 1.34 + downstroke * 0.48 + Math.sin(t * 4.4) * 0.22;
                    for (const crystalMat of archonBody.userData.crystalMats) {
                        crystalMat.emissiveIntensity = crystalPulse;
                    }
                }
                if (archonBody?.userData.crystalCoreMats) {
                    for (let i = 0; i < archonBody.userData.crystalCoreMats.length; i++) {
                        const coreMat = archonBody.userData.crystalCoreMats[i];
                        const shimmer = 0.7 + Math.sin(t * (6.2 + i * 0.7) + i * 0.9) * 0.2;
                        coreMat.opacity = THREE.MathUtils.clamp(shimmer, 0.42, 0.96);
                    }
                }
                if (archonBody?.userData.crystalLights) {
                    for (let i = 0; i < archonBody.userData.crystalLights.length; i++) {
                        const light = archonBody.userData.crystalLights[i];
                        light.intensity = 0.84 + downstroke * 0.54 + Math.sin(t * (4.1 + i * 0.8)) * 0.16;
                    }
                }
                if (archonBody?.userData.flameGroups) {
                    for (let i = 0; i < archonBody.userData.flameGroups.length; i++) {
                        const flameGroup = archonBody.userData.flameGroups[i];
                        const flutter = 1 + Math.sin(t * (7.6 + i * 0.9) + flameGroup.userData.phase) * 0.16 + downstroke * 0.12;
                        flameGroup.scale.set(0.9 + flutter * 0.2, flutter, 0.9 + flutter * 0.14);
                        flameGroup.position.y = flameGroup.userData.baseY + Math.sin(t * (4.7 + i * 0.5) + i) * 0.05;
                    }
                }
                if (archonBody?.userData.flameMats) {
                    for (let i = 0; i < archonBody.userData.flameMats.length; i++) {
                        const flameMat = archonBody.userData.flameMats[i];
                        const flicker = 0.56 + Math.sin(t * (6.6 + i * 0.45) + i * 0.8) * 0.18;
                        flameMat.opacity = THREE.MathUtils.clamp(flicker, 0.34, 0.9);
                    }
                }
                if (archonBody?.userData.flameLights) {
                    for (let i = 0; i < archonBody.userData.flameLights.length; i++) {
                        const flameLight = archonBody.userData.flameLights[i];
                        flameLight.intensity = 0.72 + downstroke * 0.42 + Math.sin(t * (5.8 + i * 0.6)) * 0.16;
                    }
                }
                if (archonBody?.userData.capePanels) {
                    for (let i = 0; i < archonBody.userData.capePanels.length; i++) {
                        const panel = archonBody.userData.capePanels[i];
                        const flutterZ = Math.sin(t * (1.82 + i * 0.07) + panel.userData.phase) * 0.018 + stroke * 0.012;
                        const flutterY = Math.cos(t * (1.24 + i * 0.06) + panel.userData.phase) * 0.015;
                        panel.rotation.z = panel.userData.baseRotationZ + flutterZ;
                        panel.rotation.y = panel.userData.baseRotationY + flutterY;
                    }
                }
                if (archonBody?.userData.lowerSigil) {
                    archonBody.userData.lowerSigil.rotation.z = t * 0.85;
                    archonBody.userData.lowerSigil.material.opacity = 0.3 + Math.sin(t * 3.1) * 0.1;
                }
            }

            if (activeProps.has('royalArmorBody')) {
                const royalArmorBody = propObjects.royalArmorBody;
                if (royalArmorBody?.userData.gemMats) {
                    const gemPulse = 1.22 + downstroke * 0.42 + Math.sin(t * 4.9) * 0.2;
                    for (const gemMaterial of royalArmorBody.userData.gemMats) {
                        gemMaterial.emissiveIntensity = gemPulse;
                    }
                }
                if (royalArmorBody?.userData.gemCoreMats) {
                    for (let i = 0; i < royalArmorBody.userData.gemCoreMats.length; i++) {
                        const coreMat = royalArmorBody.userData.gemCoreMats[i];
                        const shimmer = 0.72 + Math.sin(t * (6.4 + i * 0.5) + i * 0.9) * 0.18;
                        coreMat.opacity = THREE.MathUtils.clamp(shimmer, 0.48, 0.94);
                    }
                }
                if (royalArmorBody?.userData.gemLight) {
                    royalArmorBody.userData.gemLight.intensity = 0.8 + downstroke * 0.4 + Math.sin(t * 4.2 + 0.5) * 0.16;
                }
                if (royalArmorBody?.userData.frameMats) {
                    const goldPulse = 0.22 + Math.sin(t * 2.8) * 0.04;
                    for (const frameMat of royalArmorBody.userData.frameMats) {
                        frameMat.emissiveIntensity = goldPulse;
                    }
                }
                if (royalArmorBody?.userData.wingMats) {
                    const wingGlow = 0.42 + downstroke * 0.26 + Math.sin(t * 3.6) * 0.08;
                    for (const wingMat of royalArmorBody.userData.wingMats) {
                        wingMat.emissiveIntensity = wingGlow;
                        wingMat.opacity = THREE.MathUtils.clamp(0.56 + Math.sin(t * 2.9) * 0.08, 0.46, 0.68);
                    }
                }
                if (royalArmorBody?.userData.wingMeshes) {
                    for (let i = 0; i < royalArmorBody.userData.wingMeshes.length; i++) {
                        const wingMesh = royalArmorBody.userData.wingMeshes[i];
                        const baseRotation = wingMesh.userData.baseRotation;
                        if (!baseRotation) continue;
                        const side = i === 0 ? -1 : 1;
                        wingMesh.rotation.x = baseRotation.x + Math.sin(t * 2.2 + i * 0.7) * 0.03;
                        wingMesh.rotation.y = baseRotation.y + side * (0.04 + stroke * 0.05);
                        wingMesh.rotation.z = baseRotation.z + side * Math.sin(t * 1.7 + i) * 0.03;
                    }
                }
                if (royalArmorBody?.userData.wingLights) {
                    for (let i = 0; i < royalArmorBody.userData.wingLights.length; i++) {
                        const light = royalArmorBody.userData.wingLights[i];
                        light.intensity = 0.28 + downstroke * 0.24 + Math.sin(t * 3.4 + i * 0.6) * 0.08;
                    }
                }
            }

            if (activeProps.has('protectorRingBody')) {
                const protectorRingBody = propObjects.protectorRingBody;
                if (protectorRingBody?.userData.gemMats) {
                    const gemPulse = 1.3 + downstroke * 0.34 + Math.sin(t * 5.0 + 0.3) * 0.22;
                    for (const gemMaterial of protectorRingBody.userData.gemMats) {
                        gemMaterial.emissiveIntensity = gemPulse;
                    }
                }
                if (protectorRingBody?.userData.gemCoreMats) {
                    for (let i = 0; i < protectorRingBody.userData.gemCoreMats.length; i++) {
                        const coreMat = protectorRingBody.userData.gemCoreMats[i];
                        const shimmer = 0.76 + Math.sin(t * (6.0 + i * 0.6) + i * 0.8) * 0.2;
                        coreMat.opacity = THREE.MathUtils.clamp(shimmer, 0.48, 0.97);
                    }
                }
                if (protectorRingBody?.userData.gemLight) {
                    protectorRingBody.userData.gemLight.intensity = 0.86 + downstroke * 0.36 + Math.sin(t * 4.4 + 0.2) * 0.14;
                }
                if (protectorRingBody?.userData.frameMats) {
                    const goldPulse = 0.22 + Math.sin(t * 2.6) * 0.05;
                    for (const frameMat of protectorRingBody.userData.frameMats) {
                        frameMat.emissiveIntensity = goldPulse;
                    }
                }
                if (protectorRingBody?.userData.auraSprites) {
                    for (let i = 0; i < protectorRingBody.userData.auraSprites.length; i++) {
                        const aura = protectorRingBody.userData.auraSprites[i];
                        const baseScale = aura.userData.baseScale || aura.scale.x;
                        const baseOpacity = aura.userData.baseOpacity || 0.3;
                        const pulse = 1 + Math.sin(t * (2.8 + i * 0.6) + i * 0.7) * 0.08 + downstroke * 0.05;
                        aura.scale.set(baseScale * pulse, baseScale * pulse, 1);
                        aura.material.opacity = THREE.MathUtils.clamp(
                            baseOpacity + Math.sin(t * (3.6 + i * 0.5) + i) * 0.08 + downstroke * 0.06,
                            0.14,
                            0.9
                        );
                    }
                }
            }

            // Head tracking
            const tx = flightState.pitch + emotion.pitch + (mysteryFlightFx.bodyPitch ?? 0) + mysteryBodySwingPitch;
            const ty = cursor.x * 0.14 + emotion.yaw + (mysteryFlightFx.bodyYaw ?? 0) + mysteryBodySpinYaw;
            creatureGroup.rotation.x += (tx - creatureGroup.rotation.x) * 0.09;
            creatureGroup.rotation.y += (ty - creatureGroup.rotation.y) * 0.09;

            for (const propKey of activeProps) {
                const prop = propObjects[propKey];
                if (!prop?.userData.excludeFromHeadTilt) continue;
                if (!prop.userData.baseRotation) {
                    prop.userData.baseRotation = prop.rotation.clone();
                }
                prop.rotation.x = prop.userData.baseRotation.x - creatureGroup.rotation.x;
                prop.rotation.y = prop.userData.baseRotation.y - creatureGroup.rotation.y;
                prop.rotation.z = prop.userData.baseRotation.z - creatureGroup.rotation.z;
            }

            let eyeTargetX = THREE.MathUtils.clamp(cursor.x * 0.13, -0.1, 0.1);
            let eyeTargetY = THREE.MathUtils.clamp(cursor.y * 0.1, -0.08, 0.08);
            if (mysteryFlightFx.active) {
                const eyeBlend = THREE.MathUtils.clamp(mysteryFlightFx.eyeBlend ?? 0, 0, 1);
                const fxEyeX = THREE.MathUtils.clamp(mysteryFlightFx.eyeTargetX ?? eyeTargetX, -0.1, 0.1);
                const fxEyeY = THREE.MathUtils.clamp(mysteryFlightFx.eyeTargetY ?? eyeTargetY, -0.1, 0.1);
                eyeTargetX = THREE.MathUtils.lerp(eyeTargetX, fxEyeX, eyeBlend);
                eyeTargetY = THREE.MathUtils.lerp(eyeTargetY, fxEyeY, eyeBlend);
            }
            leftEye.group.scale.setScalar(emotion.leftEyeScale);
            rightEye.group.scale.setScalar(emotion.rightEyeScale);
            bodyMesh.scale.set(emotion.bodyScaleX, emotion.bodyScaleY, emotion.bodyScaleZ);
            leftEye.update(eyeTargetX + 0.015 + emotion.leftEyeBiasX, eyeTargetY + emotion.eyeBiasY, dt);
            rightEye.update(eyeTargetX - 0.015 + emotion.rightEyeBiasX, eyeTargetY + emotion.eyeBiasY, dt);

            // Wind animation: grass + trees + clouds
            const wind = Math.sin(t * 1.7) * 0.5 + Math.sin(t * 0.37) * 0.5;
            for (let i = 0; i < grassBlades.length; i++) {
                const g = grassBlades[i];
                g.blade.rotation.z = Math.sin(t * g.speed + g.phase) * g.sway + wind * 0.08;
            }

            for (let i = 0; i < treeInstances.length; i++) {
                const tr = treeInstances[i];
                tr.tree.rotation.z = Math.sin(t * 0.7 + tr.phase) * tr.sway;
            }

            for (let i = 0; i < cloudPlanes.length; i++) {
                const c = cloudPlanes[i];
                c.mesh.position.x += c.speed * dt;
                if (c.mesh.position.x > 30) c.mesh.position.x = -28;
            }

            sunSprite.material.opacity = 0.82 + Math.sin(t * 0.8) * 0.06;

            pollen.rotation.y = t * 0.04;
            pollen.position.x = Math.sin(t * 0.25) * 0.6;

            updateMysteryBox(dt);

            if (previewState.open && previewState.object) {
                previewState.rotateY += dt * 0.9;
                previewState.object.rotation.set(0, previewState.rotateY, 0);
                previewRenderer.render(previewScene, previewCamera);
            }

            renderer.render(scene, camera);
        }

        window.addEventListener('resize', applyResponsiveLayout);
        window.addEventListener('orientationchange', applyResponsiveLayout);

        applyResponsiveLayout();
        // Pre-warm prop materials so first equip does not hitch.
        // Run this work in idle slices so startup latency stays low.
        const prewarmProps = [...propRegistry.values()]
            .sort((a, b) => {
                if (b.priority !== a.priority) return b.priority - a.priority;
                return a.key.localeCompare(b.key);
            })
            .map(({ object }) => {
                const prop = object;
                const left = prop.userData.left;
                const right = prop.userData.right;
                return {
                    prop,
                    wasVisible: prop.visible,
                    leftWasVisible: left?.visible ?? false,
                    rightWasVisible: right?.visible ?? false,
                    left,
                    right
                };
            });

        const runPropPrewarm = (deadline) => {
            const batchSize = 2;
            for (let i = 0; i < batchSize && prewarmProps.length > 0; i++) {
                const { prop, wasVisible, leftWasVisible, rightWasVisible, left, right } = prewarmProps.shift();

                if (left && right) {
                    left.visible = true;
                    right.visible = true;
                }

                prop.visible = true;
                renderer.compile(scene, camera);
                prop.visible = wasVisible;

                if (left) left.visible = leftWasVisible;
                if (right) right.visible = rightWasVisible;

                if (deadline && !deadline.didTimeout && deadline.timeRemaining() < 2) {
                    break;
                }
            }

            if (prewarmProps.length > 0) {
                if (window.requestIdleCallback) {
                    window.requestIdleCallback(runPropPrewarm, { timeout: 2000 });
                } else {
                    setTimeout(runPropPrewarm, 16);
                }
            }
        };

        if (window.requestIdleCallback) {
            window.requestIdleCallback(runPropPrewarm, { timeout: 2000 });
        } else {
            setTimeout(runPropPrewarm, 16);
        }
        animate();
    
