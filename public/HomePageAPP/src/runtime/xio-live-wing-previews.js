export const LIVE_GAME_WING_PREVIEW_KEYS = Object.freeze([
  'alphaWings',
  'rainbowWings',
  'roboticWings',
  'omegaWings',
  'efernoWings',
]);

export function isLiveGameWingPreviewKey(propKey = '') {
  return LIVE_GAME_WING_PREVIEW_KEYS.includes(propKey);
}

function buildMirroredAttachmentFromWing(wing) {
  return {
    position: [Math.abs(Number(wing?.position?.x) || 0), Number(wing?.position?.y) || 0, Number(wing?.position?.z) || 0],
    rotation: [Number(wing?.rotation?.x) || 0, Math.abs(Number(wing?.rotation?.y) || 0), Math.abs(Number(wing?.rotation?.z) || 0)],
    scale: [
      Math.abs(Number(wing?.scale?.x) || 1),
      Math.abs(Number(wing?.scale?.y) || 1),
      Math.abs(Number(wing?.scale?.z) || 1),
    ],
    mirrorMode: 'paired',
  };
}

function normalizeWingSideForAttachment(wing) {
  if (!wing) return wing;
  wing.position.set(0, 0, 0);
  wing.rotation.set(0, 0, 0);
  wing.scale.set(1, 1, 1);
  wing.visible = true;
  return wing;
}

function extractWingPairFromProp(propGroup) {
  const left = propGroup?.userData?.left || null;
  const right = propGroup?.userData?.right || null;
  if (!left || !right) {
    return null;
  }
  const attachment = buildMirroredAttachmentFromWing(left);
  if (left.parent) left.parent.remove(left);
  if (right.parent) right.parent.remove(right);
  normalizeWingSideForAttachment(left);
  normalizeWingSideForAttachment(right);
  return { left, right, attachment };
}

export function buildLiveGameWingPreview({ propKey, THREE, GLTFLoader, renderer }) {
  if (!isLiveGameWingPreviewKey(propKey)) {
    return null;
  }

  const leftWingGroup = new THREE.Group();
  const rightWingGroup = new THREE.Group();
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

        const efernoWingAssetState = {
            loader: new GLTFLoader(),
            modelUrl: './Images/PROPS/Eferno/ComfyUI_00007_.glb',
            loadPromise: null,
            leftGeometry: null,
            rightGeometry: null
        };
        const endlessWingAssetState = {
            loader: new GLTFLoader(),
            modelUrl: './Images/PROPS/Wings/EndlessWings/EndlessWings.glb',
            previewLoadPromise: null,
            equippedLoadPromise: null,
            previewGeometry: null,
            leftGeometry: null,
            rightGeometry: null,
            materialTemplate: null
        };
        const emeraldCoenWingAssetState = {
            loader: new GLTFLoader(),
            modelUrl: './Images/PROPS/Wings/EmeraldCoen/EmeraldCoen.glb',
            previewLoadPromise: null,
            equippedLoadPromise: null,
            previewGeometry: null,
            leftGeometry: null,
            rightGeometry: null,
            materialTemplate: null
        };
        const xatoriWingAssetState = {
            loader: new GLTFLoader(),
            modelUrl: './Images/PROPS/Wings/XatoriWings/Xatori.glb',
            previewLoadPromise: null,
            equippedLoadPromise: null,
            previewGeometry: null,
            leftGeometry: null,
            rightGeometry: null,
            materialTemplate: null
        };

        function makeEfernoWingMaps() {
            const size = 1536;
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

            const roughnessCanvas = document.createElement('canvas');
            roughnessCanvas.width = size;
            roughnessCanvas.height = size;
            const rCtx = roughnessCanvas.getContext('2d');

            let seed = 98324531;
            const rand = () => {
                seed = (seed * 1664525 + 1013904223) >>> 0;
                return seed / 4294967296;
            };

            const baseGradient = dCtx.createLinearGradient(0, 0, size, 0);
            baseGradient.addColorStop(0.0, '#fff9b2');
            baseGradient.addColorStop(0.08, '#ffe065');
            baseGradient.addColorStop(0.23, '#ffb124');
            baseGradient.addColorStop(0.46, '#ff680f');
            baseGradient.addColorStop(0.72, '#c32707');
            baseGradient.addColorStop(1.0, '#170302');
            dCtx.fillStyle = baseGradient;
            dCtx.fillRect(0, 0, size, size);

            const verticalGradient = dCtx.createLinearGradient(0, 0, 0, size);
            verticalGradient.addColorStop(0.0, 'rgba(255,225,158,0.2)');
            verticalGradient.addColorStop(0.42, 'rgba(255,135,26,0)');
            verticalGradient.addColorStop(1.0, 'rgba(22,4,3,0.26)');
            dCtx.fillStyle = verticalGradient;
            dCtx.fillRect(0, 0, size, size);

            dCtx.lineCap = 'round';
            for (let i = 0; i < 150; i++) {
                const startX = size * (0.04 + rand() * 0.12);
                const startY = size * (0.2 + rand() * 0.62);
                const primaryCurveX = startX + size * (0.2 + rand() * 0.18);
                const primaryCurveY = startY + (rand() - 0.5) * size * 0.22;
                const endX = size * (0.42 + rand() * 0.56);
                const endY = startY + (rand() - 0.66) * size * 0.34;
                const warm = Math.floor(160 + rand() * 90);
                const bright = Math.floor(210 + rand() * 45);
                dCtx.beginPath();
                dCtx.moveTo(startX, startY);
                dCtx.quadraticCurveTo(primaryCurveX, primaryCurveY, endX, endY);
                dCtx.strokeStyle = `rgba(255,${warm},${Math.floor(10 + rand() * 20)},${0.08 + rand() * 0.2})`;
                dCtx.lineWidth = 1.2 + rand() * 4.1;
                dCtx.stroke();

                if (rand() < 0.58) {
                    dCtx.beginPath();
                    dCtx.moveTo(startX + size * 0.01, startY + (rand() - 0.5) * size * 0.03);
                    dCtx.quadraticCurveTo(
                        primaryCurveX + size * (rand() - 0.5) * 0.03,
                        primaryCurveY + size * (rand() - 0.5) * 0.03,
                        endX + size * (rand() - 0.5) * 0.02,
                        endY + size * (rand() - 0.5) * 0.02
                    );
                    dCtx.strokeStyle = `rgba(255,${bright},${Math.floor(40 + rand() * 30)},${0.18 + rand() * 0.24})`;
                    dCtx.lineWidth = 0.8 + rand() * 1.8;
                    dCtx.stroke();
                }
            }

            for (let i = 0; i < 240; i++) {
                const x = size * (0.32 + rand() * 0.68);
                const y = size * rand();
                const radius = 16 + rand() * 110;
                const g = dCtx.createRadialGradient(x, y, 1, x, y, radius);
                g.addColorStop(0, `rgba(255,${Math.floor(95 + rand() * 80)},20,${0.08 + rand() * 0.18})`);
                g.addColorStop(1, 'rgba(0,0,0,0)');
                dCtx.fillStyle = g;
                dCtx.beginPath();
                dCtx.arc(x, y, radius, 0, Math.PI * 2);
                dCtx.fill();
            }

            eCtx.fillStyle = '#050101';
            eCtx.fillRect(0, 0, size, size);
            const emissiveGradient = eCtx.createLinearGradient(0, 0, size, 0);
            emissiveGradient.addColorStop(0.0, 'rgba(255,248,174,0.92)');
            emissiveGradient.addColorStop(0.2, 'rgba(255,181,55,0.85)');
            emissiveGradient.addColorStop(0.5, 'rgba(255,96,15,0.66)');
            emissiveGradient.addColorStop(0.82, 'rgba(180,34,6,0.36)');
            emissiveGradient.addColorStop(1.0, 'rgba(0,0,0,0.06)');
            eCtx.fillStyle = emissiveGradient;
            eCtx.fillRect(0, 0, size, size);

            for (let i = 0; i < 190; i++) {
                const rootX = size * (0.02 + rand() * 0.11);
                const rootY = size * (0.16 + rand() * 0.7);
                const endX = size * (0.3 + rand() * 0.66);
                const endY = rootY + (rand() - 0.58) * size * 0.26;
                eCtx.beginPath();
                eCtx.moveTo(rootX, rootY);
                eCtx.quadraticCurveTo(
                    rootX + size * (0.16 + rand() * 0.14),
                    rootY + (rand() - 0.5) * size * 0.08,
                    endX,
                    endY
                );
                eCtx.strokeStyle = `rgba(255,${Math.floor(150 + rand() * 100)},${Math.floor(25 + rand() * 20)},${0.15 + rand() * 0.45})`;
                eCtx.lineWidth = 0.7 + rand() * 2.7;
                eCtx.stroke();
            }

            for (let i = 0; i < 28; i++) {
                const x = size * (0.1 + rand() * 0.86);
                const y = size * (0.08 + rand() * 0.84);
                const radius = 22 + rand() * 120;
                const glow = eCtx.createRadialGradient(x, y, 1, x, y, radius);
                glow.addColorStop(0, 'rgba(255,240,170,0.95)');
                glow.addColorStop(0.35, 'rgba(255,166,55,0.72)');
                glow.addColorStop(1, 'rgba(0,0,0,0)');
                eCtx.fillStyle = glow;
                eCtx.beginPath();
                eCtx.arc(x, y, radius, 0, Math.PI * 2);
                eCtx.fill();
            }

            aCtx.fillStyle = '#ffffff';
            aCtx.fillRect(0, 0, size, size);
            const edgeFade = aCtx.createLinearGradient(0, 0, size, 0);
            edgeFade.addColorStop(0.0, 'rgba(255,255,255,1)');
            edgeFade.addColorStop(0.66, 'rgba(255,255,255,1)');
            edgeFade.addColorStop(0.86, 'rgba(255,255,255,0.7)');
            edgeFade.addColorStop(1.0, 'rgba(0,0,0,0)');
            aCtx.fillStyle = edgeFade;
            aCtx.fillRect(0, 0, size, size);

            for (let i = 0; i < 230; i++) {
                const x = size * (0.62 + rand() * 0.38);
                const y = size * rand();
                const radius = 8 + rand() * 42;
                const cut = aCtx.createRadialGradient(x, y, 0, x, y, radius);
                cut.addColorStop(0, 'rgba(0,0,0,0.95)');
                cut.addColorStop(0.64, 'rgba(0,0,0,0.42)');
                cut.addColorStop(1, 'rgba(255,255,255,0)');
                aCtx.fillStyle = cut;
                aCtx.beginPath();
                aCtx.arc(x, y, radius, 0, Math.PI * 2);
                aCtx.fill();
            }

            rCtx.fillStyle = '#7a7a7a';
            rCtx.fillRect(0, 0, size, size);
            const roughGradient = rCtx.createLinearGradient(0, 0, size, 0);
            roughGradient.addColorStop(0.0, 'rgba(65,65,65,1)');
            roughGradient.addColorStop(0.34, 'rgba(86,86,86,1)');
            roughGradient.addColorStop(0.72, 'rgba(126,126,126,1)');
            roughGradient.addColorStop(1.0, 'rgba(170,170,170,1)');
            rCtx.fillStyle = roughGradient;
            rCtx.fillRect(0, 0, size, size);
            for (let i = 0; i < 220; i++) {
                const x = rand() * size;
                const y = rand() * size;
                const radius = 5 + rand() * 36;
                const grain = Math.floor(72 + rand() * 120);
                const g = rCtx.createRadialGradient(x, y, 0, x, y, radius);
                g.addColorStop(0, `rgba(${grain},${grain},${grain},${0.15 + rand() * 0.3})`);
                g.addColorStop(1, 'rgba(127,127,127,0)');
                rCtx.fillStyle = g;
                rCtx.beginPath();
                rCtx.arc(x, y, radius, 0, Math.PI * 2);
                rCtx.fill();
            }

            const diffuse = new THREE.CanvasTexture(diffuseCanvas);
            diffuse.colorSpace = THREE.SRGBColorSpace;
            diffuse.anisotropy = maxAnisotropy;
            diffuse.wrapS = THREE.ClampToEdgeWrapping;
            diffuse.wrapT = THREE.ClampToEdgeWrapping;
            diffuse.needsUpdate = true;

            const emissive = new THREE.CanvasTexture(emissiveCanvas);
            emissive.colorSpace = THREE.SRGBColorSpace;
            emissive.anisotropy = maxAnisotropy;
            emissive.wrapS = THREE.ClampToEdgeWrapping;
            emissive.wrapT = THREE.ClampToEdgeWrapping;
            emissive.needsUpdate = true;

            const alpha = new THREE.CanvasTexture(alphaCanvas);
            alpha.anisotropy = maxAnisotropy;
            alpha.wrapS = THREE.ClampToEdgeWrapping;
            alpha.wrapT = THREE.ClampToEdgeWrapping;
            alpha.needsUpdate = true;

            const roughness = new THREE.CanvasTexture(roughnessCanvas);
            roughness.anisotropy = maxAnisotropy;
            roughness.wrapS = THREE.ClampToEdgeWrapping;
            roughness.wrapT = THREE.ClampToEdgeWrapping;
            roughness.needsUpdate = true;

            return { diffuse, emissive, alpha, roughness };
        }

        function cloneWingMeshMaterial(material) {
            if (Array.isArray(material)) {
                return cloneWingMeshMaterial(material[0] || null);
            }
            if (!material?.clone) {
                return null;
            }
            const cloned = material.clone();
            cloned.side = THREE.DoubleSide;
            if ('shadowSide' in cloned) {
                cloned.shadowSide = THREE.DoubleSide;
            }
            cloned.needsUpdate = true;
            return cloned;
        }

        function getLargestMeshEntryFromObject(root) {
            if (!root) return null;
            let bestGeometry = null;
            let bestMaterial = null;
            let bestVertexCount = -1;
            root.traverse((node) => {
                if (!node?.isMesh || !node.geometry?.attributes?.position) {
                    return;
                }
                const vertexCount = node.geometry.attributes.position.count || 0;
                if (vertexCount <= bestVertexCount) {
                    return;
                }
                bestVertexCount = vertexCount;
                bestGeometry = node.geometry.clone();
                bestMaterial = node.material || null;
            });
            return bestGeometry
                ? {
                    geometry: bestGeometry,
                    material: bestMaterial
                }
                : null;
        }

        function getLargestMeshGeometryFromObject(root) {
            return getLargestMeshEntryFromObject(root)?.geometry || null;
        }

        function buildGeometryFromAttributeArrays(sourceAttributes, attributeArrays) {
            const geometry = new THREE.BufferGeometry();
            Object.entries(attributeArrays).forEach(([name, values]) => {
                const source = sourceAttributes[name];
                if (!source?.array || !values?.length) {
                    return;
                }
                const TypedArray = source.array.constructor || Float32Array;
                geometry.setAttribute(
                    name,
                    new THREE.BufferAttribute(new TypedArray(values), source.itemSize, source.normalized === true)
                );
            });
            if (!geometry.attributes.position) {
                return null;
            }
            return geometry;
        }

        function splitPairWingGeometry(sourceGeometry) {
            if (!sourceGeometry?.attributes?.position) {
                return null;
            }
            const nonIndexed = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
            const position = nonIndexed.attributes.position;
            const arr = position?.array;
            if (!arr || arr.length < 9) {
                if (nonIndexed?.dispose) nonIndexed.dispose();
                return null;
            }

            const sourceAttributes = Object.fromEntries(
                Object.entries(nonIndexed.attributes).filter(([, attribute]) => attribute?.array?.length)
            );
            const createAttributeBuckets = () => Object.fromEntries(
                Object.keys(sourceAttributes).map((name) => [name, []])
            );
            const leftAttributes = createAttributeBuckets();
            const rightAttributes = createAttributeBuckets();

            for (let triVertex = 0; triVertex <= position.count - 3; triVertex += 3) {
                const centroidX = (
                    position.getX(triVertex) +
                    position.getX(triVertex + 1) +
                    position.getX(triVertex + 2)
                ) / 3;
                const target = centroidX <= 0 ? leftAttributes : rightAttributes;
                Object.entries(sourceAttributes).forEach(([name, attribute]) => {
                    const bucket = target[name];
                    const itemSize = attribute.itemSize || 1;
                    for (let vertexOffset = 0; vertexOffset < 3; vertexOffset++) {
                        const vertexIndex = triVertex + vertexOffset;
                        for (let component = 0; component < itemSize; component++) {
                            bucket.push(attribute.array[vertexIndex * itemSize + component]);
                        }
                    }
                });
            }
            if (nonIndexed?.dispose) nonIndexed.dispose();

            if (!leftAttributes.position?.length && !rightAttributes.position?.length) {
                return null;
            }

            let leftGeometry = null;
            let rightGeometry = null;

            if (leftAttributes.position?.length) {
                leftGeometry = buildGeometryFromAttributeArrays(sourceAttributes, leftAttributes);
            }
            if (rightAttributes.position?.length) {
                rightGeometry = buildGeometryFromAttributeArrays(sourceAttributes, rightAttributes);
            }

            if (!leftGeometry && rightGeometry) {
                leftGeometry = rightGeometry.clone();
                leftGeometry.scale(-1, 1, 1);
            } else if (!rightGeometry && leftGeometry) {
                rightGeometry = leftGeometry.clone();
                rightGeometry.scale(-1, 1, 1);
            }

            return leftGeometry && rightGeometry
                ? { left: leftGeometry, right: rightGeometry }
                : null;
        }

        function normalizeWingPivotFromSeam(geometry) {
            if (!geometry?.attributes?.position) {
                return;
            }
            geometry.computeBoundingBox();
            const bounds = geometry.boundingBox;
            const pos = geometry.attributes.position;
            const spanX = Math.max(0.0001, bounds.max.x - bounds.min.x);
            const seamThreshold = Math.max(0.001, spanX * 0.1);

            let sumX = 0;
            let sumY = 0;
            let sumZ = 0;
            let count = 0;

            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                if (Math.abs(x) > seamThreshold) {
                    continue;
                }
                sumX += x;
                sumY += pos.getY(i);
                sumZ += pos.getZ(i);
                count++;
            }

            if (count < 4) {
                const relaxedThreshold = Math.max(seamThreshold, spanX * 0.24);
                for (let i = 0; i < pos.count; i++) {
                    const x = pos.getX(i);
                    if (Math.abs(x) > relaxedThreshold) {
                        continue;
                    }
                    sumX += x;
                    sumY += pos.getY(i);
                    sumZ += pos.getZ(i);
                    count++;
                }
            }

            if (count <= 0) {
                const center = bounds.getCenter(new THREE.Vector3());
                geometry.translate(-center.x * 0.06, -center.y * 0.18, -center.z);
                geometry.computeBoundingBox();
                return;
            }

            const rootX = sumX / count;
            const rootY = sumY / count;
            const rootZ = sumZ / count;
            geometry.translate(-rootX, -rootY, -rootZ);
            geometry.computeBoundingBox();
        }

        function applyWingUvAndDepthFromGeometry(geometry) {
            if (!geometry?.attributes?.position) {
                return;
            }
            geometry.computeBoundingBox();
            const bounds = geometry.boundingBox;
            const pos = geometry.attributes.position;
            const minAbsX = Math.min(Math.abs(bounds.min.x), Math.abs(bounds.max.x));
            const maxAbsX = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x));
            const spanAbsX = Math.max(0.001, maxAbsX - minAbsX);
            const spanY = Math.max(0.001, bounds.max.y - bounds.min.y);
            const uv = new Float32Array(pos.count * 2);

            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                const z = pos.getZ(i);
                const nx = THREE.MathUtils.clamp((Math.abs(x) - minAbsX) / spanAbsX, 0, 1);
                const ny = THREE.MathUtils.clamp((y - bounds.min.y) / spanY, 0, 1);
                const featherLift = 0.04 + Math.pow(nx, 1.28) * 0.2 + Math.pow(ny, 1.5) * 0.035;
                const wrinkle = Math.sin(nx * 12.8 + ny * 9.2) * 0.014 + Math.cos(nx * 5.3 - ny * 11.4) * 0.01;
                pos.setZ(i, z * 0.2 + featherLift + wrinkle);
                uv[i * 2] = nx;
                uv[i * 2 + 1] = 1 - ny;
            }

            geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
            pos.needsUpdate = true;
            geometry.computeVertexNormals();
            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();
        }

        function prepareWingGeometryForEferno(sourceGeometry) {
            if (!sourceGeometry?.attributes?.position) {
                return null;
            }
            const geometry = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
            normalizeWingPivotFromSeam(geometry);
            applyWingUvAndDepthFromGeometry(geometry);
            return geometry;
        }

        function prepareWingGeometryForSocketAttachment(sourceGeometry) {
            if (!sourceGeometry?.attributes?.position) {
                return null;
            }
            const geometry = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
            normalizeWingPivotFromSeam(geometry);
            if (!geometry.attributes.normal) {
                geometry.computeVertexNormals();
            }
            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();
            return geometry;
        }

        const xatoriWingAssetController = createGlbWingAssetController(xatoriWingAssetState, 'Xatori Wings');
        const endlessWingAssetController = createGlbWingAssetController(endlessWingAssetState, 'Endless Wings');
        const emeraldCoenWingAssetController = createGlbWingAssetController(emeraldCoenWingAssetState, 'Emerald Coen Wings');

        function createXatoriWingMaterialInstance() {
            return xatoriWingAssetController.createMaterialInstance();
        }

        function createEndlessWingMaterialInstance() {
            return endlessWingAssetController.createMaterialInstance();
        }

        function applyPreviewTransformOverrides(target, sourcePart) {
            const previewTransform = sourcePart?.userData?.previewTransform || null;
            if (!target || !previewTransform) {
                return;
            }
            const position = Array.isArray(previewTransform.position) ? previewTransform.position : null;
            const rotation = Array.isArray(previewTransform.rotation) ? previewTransform.rotation : null;
            const scale = Array.isArray(previewTransform.scale) ? previewTransform.scale : null;
            if (position?.length === 3) {
                target.position.set(position[0], position[1], position[2]);
            }
            if (rotation?.length === 3) {
                target.rotation.set(rotation[0], rotation[1], rotation[2]);
            }
            if (scale?.length === 3) {
                target.scale.set(scale[0], scale[1], scale[2]);
            }
        }

        function createWingPairPreviewGroup(previewGeometry, materialTemplate) {
            if (!previewGeometry || !materialTemplate) {
                return null;
            }
            const group = new THREE.Group();
            const mesh = new THREE.Mesh(previewGeometry.clone(), cloneWingMeshMaterial(materialTemplate));
            if (!mesh.material) {
                return null;
            }
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = false;
            group.add(mesh);
            group.userData.mesh = mesh;
            return group;
        }

        function createDetachedWingPreviewMesh(geometry, materialTemplate, transform) {
            if (!geometry || !materialTemplate) {
                return null;
            }
            const wing = new THREE.Group();
            applyWingTransform(wing, transform);
            const mesh = new THREE.Mesh(geometry.clone(), cloneWingMeshMaterial(materialTemplate));
            if (!mesh.material) {
                return null;
            }
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = false;
            wing.add(mesh);
            wing.userData.mesh = mesh;
            return wing;
        }

        function createGlbWingAssetController(assetState, label) {
            const createMaterialInstance = () => cloneWingMeshMaterial(assetState.materialTemplate);
            const clonePreparedEquipped = () => ({
                left: assetState.leftGeometry?.clone() || null,
                right: assetState.rightGeometry?.clone() || null
            });

            const ensurePreparedWingPair = () => {
                if (assetState.leftGeometry && assetState.rightGeometry) {
                    return clonePreparedEquipped();
                }
                if (!assetState.previewGeometry || !assetState.materialTemplate) {
                    return {
                        left: null,
                        right: null
                    };
                }
                const sourceGeometry = assetState.previewGeometry.clone();
                const split = splitPairWingGeometry(sourceGeometry);
                if (sourceGeometry?.dispose) {
                    sourceGeometry.dispose();
                }
                if (!split?.left || !split?.right) {
                    throw new Error(`${label} GLB could not be split into left/right wings.`);
                }
                const preparedLeft = prepareWingGeometryForSocketAttachment(split.left);
                const preparedRight = prepareWingGeometryForSocketAttachment(split.right);
                if (split.left?.dispose) split.left.dispose();
                if (split.right?.dispose) split.right.dispose();
                if (!preparedLeft || !preparedRight) {
                    throw new Error(`${label} wing geometry preparation failed.`);
                }
                assetState.leftGeometry = preparedLeft;
                assetState.rightGeometry = preparedRight;
                return clonePreparedEquipped();
            };

            const loadPreviewAssets = () => {
                if (assetState.previewGeometry && assetState.materialTemplate) {
                    return Promise.resolve(true);
                }
                if (!assetState.previewLoadPromise) {
                    assetState.previewLoadPromise = new Promise((resolve, reject) => {
                        assetState.loader.load(
                            assetState.modelUrl,
                            (gltf) => {
                                const root = gltf?.scene || gltf?.scenes?.[0] || null;
                                const sourceEntry = getLargestMeshEntryFromObject(root);
                                const sourceGeometry = sourceEntry?.geometry || null;
                                const materialTemplate = cloneWingMeshMaterial(sourceEntry?.material || null);
                                if (!sourceGeometry) {
                                    reject(new Error(`${label} GLB did not contain a mesh with geometry.`));
                                    return;
                                }
                                if (!materialTemplate) {
                                    if (sourceGeometry?.dispose) sourceGeometry.dispose();
                                    reject(new Error(`${label} GLB did not contain a cloneable material.`));
                                    return;
                                }
                                assetState.previewGeometry = sourceGeometry.clone();
                                assetState.materialTemplate = materialTemplate;
                                if (sourceGeometry?.dispose) {
                                    sourceGeometry.dispose();
                                }
                                resolve(true);
                            },
                            undefined,
                            (error) => reject(error)
                        );
                    }).catch((error) => {
                        console.warn(`Unable to load ${label} GLB, leaving ${label} hidden until the asset is available.`, error);
                        return false;
                    });
                }
                return assetState.previewLoadPromise;
            };

            const loadEquippedAssets = () => {
                if (assetState.leftGeometry && assetState.rightGeometry && assetState.materialTemplate) {
                    return Promise.resolve(clonePreparedEquipped());
                }
                if (!assetState.equippedLoadPromise) {
                    assetState.equippedLoadPromise = loadPreviewAssets().then((ready) => {
                        if (!ready || !assetState.previewGeometry || !assetState.materialTemplate) {
                            return;
                        }
                        ensurePreparedWingPair();
                    }).catch((error) => {
                        console.warn(`Unable to prepare equipped ${label} geometry.`, error);
                    });
                }
                return assetState.equippedLoadPromise.then(() => clonePreparedEquipped());
            };

            const createPreviewObject = (previewTransform = null) => {
                if (previewTransform) {
                    try {
                        const pair = ensurePreparedWingPair();
                        if (pair.left && pair.right) {
                            const group = new THREE.Group();
                            const left = createDetachedWingPreviewMesh(
                                pair.left,
                                assetState.materialTemplate,
                                buildMirroredWingTransform(previewTransform, -1)
                            );
                            const right = createDetachedWingPreviewMesh(
                                pair.right,
                                assetState.materialTemplate,
                                buildMirroredWingTransform(previewTransform, 1)
                            );
                            if (left) {
                                group.add(left);
                                group.userData.left = left;
                            }
                            if (right) {
                                group.add(right);
                                group.userData.right = right;
                            }
                            if (left || right) {
                                return group;
                            }
                        }
                    } catch (error) {
                        console.warn(`Unable to prepare detached preview object for ${label}.`, error);
                    }
                }
                return createWingPairPreviewGroup(assetState.previewGeometry, assetState.materialTemplate);
            };

            return {
                createMaterialInstance,
                loadPreviewAssets,
                loadEquippedAssets,
                createPreviewObject
            };
        }

        function buildMirroredWingTransform(transform, dir) {
            const position = Array.isArray(transform?.position) ? transform.position : [0.8, -0.78, 0.22];
            const rotation = Array.isArray(transform?.rotation) ? transform.rotation : [0.024, 0.076, -0.032];
            const scaleValue = Array.isArray(transform?.scale)
                ? transform.scale
                : [transform?.scale || 19.2, transform?.scale || 19.2, transform?.scale || 19.2];
            return {
                position: [dir * position[0], position[1], position[2]],
                rotation: [rotation[0], dir * rotation[1], dir * rotation[2]],
                scale: [scaleValue[0], scaleValue[1], scaleValue[2]]
            };
        }

        function applyWingTransform(target, transform) {
            if (!target || !transform) {
                return;
            }
            const position = Array.isArray(transform.position) ? transform.position : null;
            const rotation = Array.isArray(transform.rotation) ? transform.rotation : null;
            const scaleValue = Array.isArray(transform.scale) ? transform.scale : null;
            if (position?.length === 3) {
                target.position.set(position[0], position[1], position[2]);
            }
            if (rotation?.length === 3) {
                target.rotation.set(rotation[0], rotation[1], rotation[2]);
            }
            if (scaleValue?.length === 3) {
                target.scale.set(scaleValue[0], scaleValue[1], scaleValue[2]);
            }
        }

        const SOCKETED_GLB_WING_PRESETS = Object.freeze({
            compact: Object.freeze({
                equipTransform: Object.freeze({
                    position: [0.78, -0.76, 0.2],
                    rotation: [0.024, 0.072, -0.03],
                    scale: [19.2, 19.2, 19.2]
                }),
                previewTransform: Object.freeze({
                    position: [0.64, -0.12, 0.08],
                    rotation: [0.012, 0.018, -0.018],
                    scale: [8.6, 8.6, 8.6]
                }),
                previewFit: Object.freeze({
                    yOffsetRatio: 0.76,
                    zOffsetRatio: 0.012,
                    distanceMultiplier: 1.6,
                    initialRotationY: 0
                }),
                itemThumbFit: Object.freeze({
                    yOffsetRatio: 0.03,
                    zOffsetRatio: 0.01,
                    distanceMultiplier: 1.06
                })
            }),
            tall: Object.freeze({
                equipTransform: Object.freeze({
                    position: [0.8, -0.78, 0.22],
                    rotation: [0.024, 0.076, -0.032],
                    scale: [19.2, 19.2, 19.2]
                }),
                previewTransform: Object.freeze({
                    position: [0.66, -0.08, 0.06],
                    rotation: [0.014, 0.018, -0.02],
                    scale: [8.9, 8.9, 8.9]
                }),
                previewFit: Object.freeze({
                    yOffsetRatio: 0.62,
                    zOffsetRatio: 0.016,
                    distanceMultiplier: 1.42,
                    initialRotationY: 0
                }),
                itemThumbFit: Object.freeze({
                    yOffsetRatio: -0.02,
                    zOffsetRatio: 0.012,
                    distanceMultiplier: 1.05
                })
            }),
            tallThin: Object.freeze({
                equipTransform: Object.freeze({
                    position: [0.79, -0.77, 0.19],
                    rotation: [0.023, 0.074, -0.029],
                    scale: [19.2, 19.2, 19.2]
                }),
                previewTransform: Object.freeze({
                    position: [0.65, -0.1, 0.06],
                    rotation: [0.012, 0.018, -0.018],
                    scale: [8.8, 8.8, 8.8]
                }),
                previewFit: Object.freeze({
                    yOffsetRatio: 0.68,
                    zOffsetRatio: 0.012,
                    distanceMultiplier: 1.46,
                    initialRotationY: 0
                }),
                itemThumbFit: Object.freeze({
                    yOffsetRatio: 0,
                    zOffsetRatio: 0.01,
                    distanceMultiplier: 1.04
                })
            }),
            flatWide: Object.freeze({
                equipTransform: Object.freeze({
                    position: [0.81, -0.82, 0.22],
                    rotation: [0.022, 0.08, -0.034],
                    scale: [19.2, 19.2, 19.2]
                }),
                previewTransform: Object.freeze({
                    position: [0.68, -0.14, 0.05],
                    rotation: [0.01, 0.02, -0.016],
                    scale: [9.1, 9.1, 9.1]
                }),
                previewFit: Object.freeze({
                    yOffsetRatio: 0.9,
                    zOffsetRatio: 0.012,
                    distanceMultiplier: 1.82,
                    initialRotationY: 0
                }),
                itemThumbFit: Object.freeze({
                    yOffsetRatio: 0.08,
                    zOffsetRatio: 0.008,
                    distanceMultiplier: 1.16
                })
            })
        });

        const SOCKETED_GLB_WING_FACTORY_CONFIGS = Object.freeze({
            blossomissWings: Object.freeze({
                label: 'Blossomiss Wings',
                modelUrl: './Images/PROPS/Wings/BlossomissWings/BlossomissWings.glb',
                ...SOCKETED_GLB_WING_PRESETS.compact
            }),
            canvasOfNavelleWings: Object.freeze({
                label: 'Canvas of Navelle',
                modelUrl: './Images/PROPS/Wings/Canvas of Navelle/CanvasOfNavelle.glb',
                ...SOCKETED_GLB_WING_PRESETS.tall
            }),
            goddessOfValleysWings: Object.freeze({
                label: 'Goddess of Valleys',
                modelUrl: './Images/PROPS/Wings/Goddess of Valleys/GoddessOfValleys.glb',
                ...SOCKETED_GLB_WING_PRESETS.tall
            }),
            honeycombBloomsWings: Object.freeze({
                label: 'Honeycomb Blooms',
                modelUrl: './Images/PROPS/Wings/Honeycomb Blooms/HoneycombBlooms.glb',
                ...SOCKETED_GLB_WING_PRESETS.tall
            }),
            lavalcanoWings: Object.freeze({
                label: 'Lavalcano Wings',
                modelUrl: './Images/PROPS/Wings/LavalcanoWings/LavalcanoWings.glb',
                ...SOCKETED_GLB_WING_PRESETS.flatWide
            }),
            lightOfSmilesWings: Object.freeze({
                label: 'Light of Smiles',
                modelUrl: './Images/PROPS/Wings/LightOfSmiles/LightOfSmiles.glb',
                ...SOCKETED_GLB_WING_PRESETS.tallThin
            }),
            moonlightAmayaWings: Object.freeze({
                label: 'Moonlight Amaya',
                modelUrl: './Images/PROPS/Wings/Moonlight Amaya/MoonlightAmaya.glb',
                ...SOCKETED_GLB_WING_PRESETS.tallThin
            })
        });

        function createSocketedGlbWingPropFactory(config) {
            const assetState = {
                loader: new GLTFLoader(),
                modelUrl: config.modelUrl,
                previewLoadPromise: null,
                equippedLoadPromise: null,
                previewGeometry: null,
                leftGeometry: null,
                rightGeometry: null,
                materialTemplate: null
            };
            const assetController = createGlbWingAssetController(assetState, config.label);

            const makeWingSide = (side = 'left') => {
                const dir = side === 'left' ? -1 : 1;
                const wing = new THREE.Group();
                applyWingTransform(wing, buildMirroredWingTransform(config.equipTransform, dir));
                wing.userData.loadedFromGlb = false;
                wing.userData.previewTransform = buildMirroredWingTransform(config.previewTransform, dir);
                wing.userData.equippedReadyPromise = null;
                wing.userData.ensureEquippedReady = () => {
                    if (wing.userData.equippedReadyPromise) {
                        return wing.userData.equippedReadyPromise;
                    }
                    wing.userData.equippedReadyPromise = assetController.loadEquippedAssets().then((pair) => {
                        const targetGeometry = side === 'left' ? pair.left : pair.right;
                        const material = assetController.createMaterialInstance();
                        if (!targetGeometry || !material) {
                            return;
                        }
                        wing.clear();
                        const mesh = new THREE.Mesh(targetGeometry, material);
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        mesh.frustumCulled = false;
                        wing.add(mesh);
                        wing.userData.mesh = mesh;
                        wing.userData.loadedFromGlb = true;
                    }).catch(() => null);
                    return wing.userData.equippedReadyPromise;
                };
                return wing;
            };

            return function makeSocketedGlbWingProp() {
                const g = new THREE.Group();
                const left = makeWingSide('left');
                const right = makeWingSide('right');
                left.visible = false;
                right.visible = false;
                leftWingGroup.add(left);
                rightWingGroup.add(right);
                g.userData.left = left;
                g.userData.right = right;
                g.userData.previewReadyPromise = null;
                g.userData.ensurePreviewReady = () => {
                    if (g.userData.previewReadyPromise) {
                        return g.userData.previewReadyPromise;
                    }
                    g.userData.previewReadyPromise = assetController.loadPreviewAssets();
                    return g.userData.previewReadyPromise;
                };
                g.userData.equippedReadyPromise = null;
                g.userData.ensureEquippedReady = () => {
                    if (g.userData.equippedReadyPromise) {
                        return g.userData.equippedReadyPromise;
                    }
                    g.userData.equippedReadyPromise = Promise.allSettled([
                        left.userData.ensureEquippedReady?.() || left.userData.equippedReadyPromise,
                        right.userData.ensureEquippedReady?.() || right.userData.equippedReadyPromise
                    ]);
                    return g.userData.equippedReadyPromise;
                };
                g.userData.createPreviewObject = () => assetController.createPreviewObject(config.previewTransform);
                return g;
            };
        }

        const makeBlossomissWingsProp = createSocketedGlbWingPropFactory(SOCKETED_GLB_WING_FACTORY_CONFIGS.blossomissWings);
        const makeCanvasOfNavelleWingsProp = createSocketedGlbWingPropFactory(SOCKETED_GLB_WING_FACTORY_CONFIGS.canvasOfNavelleWings);
        const makeGoddessOfValleysWingsProp = createSocketedGlbWingPropFactory(SOCKETED_GLB_WING_FACTORY_CONFIGS.goddessOfValleysWings);
        const makeHoneycombBloomsWingsProp = createSocketedGlbWingPropFactory(SOCKETED_GLB_WING_FACTORY_CONFIGS.honeycombBloomsWings);
        const makeLavalcanoWingsProp = createSocketedGlbWingPropFactory(SOCKETED_GLB_WING_FACTORY_CONFIGS.lavalcanoWings);
        const makeLightOfSmilesWingsProp = createSocketedGlbWingPropFactory(SOCKETED_GLB_WING_FACTORY_CONFIGS.lightOfSmilesWings);
        const makeMoonlightAmayaWingsProp = createSocketedGlbWingPropFactory(SOCKETED_GLB_WING_FACTORY_CONFIGS.moonlightAmayaWings);

        function loadXatoriWingAssets() {
            return xatoriWingAssetController.loadEquippedAssets();
        }

        function loadEndlessWingAssets() {
            return endlessWingAssetController.loadEquippedAssets();
        }

        function createEmeraldCoenWingMaterialInstance() {
            return emeraldCoenWingAssetController.createMaterialInstance();
        }

        function loadEmeraldCoenWingAssets() {
            return emeraldCoenWingAssetController.loadEquippedAssets();
        }

        function makeEmeraldCoenWingSide(side = 'left') {
            const dir = side === 'left' ? -1 : 1;
            const wing = new THREE.Group();
            wing.position.set(dir * 0.8, -0.78, 0.22);
            wing.rotation.set(0.024, dir * 0.076, -0.032 * dir);
            wing.scale.set(19.2, 19.2, 19.2);
            wing.userData.loadedFromGlb = false;
            wing.userData.previewTransform = {
                position: [dir * 0.66, -0.08, 0.06],
                rotation: [0.014, dir * 0.018, -0.02 * dir],
                scale: [8.9, 8.9, 8.9]
            };
            wing.userData.equippedReadyPromise = null;
            wing.userData.ensureEquippedReady = () => {
                if (wing.userData.equippedReadyPromise) {
                    return wing.userData.equippedReadyPromise;
                }
                wing.userData.equippedReadyPromise = loadEmeraldCoenWingAssets().then((pair) => {
                    const targetGeometry = side === 'left' ? pair.left : pair.right;
                    const material = createEmeraldCoenWingMaterialInstance();
                    if (!targetGeometry || !material) {
                        return;
                    }
                    wing.clear();
                    const mesh = new THREE.Mesh(targetGeometry, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.frustumCulled = false;
                    wing.add(mesh);
                    wing.userData.mesh = mesh;
                    wing.userData.loadedFromGlb = true;
                }).catch(() => null);
                return wing.userData.equippedReadyPromise;
            };

            return wing;
        }

        function makeEmeraldCoenWingsProp() {
            const g = new THREE.Group();
            const left = makeEmeraldCoenWingSide('left');
            const right = makeEmeraldCoenWingSide('right');
            left.visible = false;
            right.visible = false;
            leftWingGroup.add(left);
            rightWingGroup.add(right);
            g.userData.left = left;
            g.userData.right = right;
            g.userData.previewReadyPromise = null;
            g.userData.ensurePreviewReady = () => {
                if (g.userData.previewReadyPromise) {
                    return g.userData.previewReadyPromise;
                }
                g.userData.previewReadyPromise = emeraldCoenWingAssetController.loadPreviewAssets();
                return g.userData.previewReadyPromise;
            };
            g.userData.equippedReadyPromise = null;
            g.userData.ensureEquippedReady = () => {
                if (g.userData.equippedReadyPromise) {
                    return g.userData.equippedReadyPromise;
                }
                g.userData.equippedReadyPromise = Promise.allSettled([
                    left.userData.ensureEquippedReady?.() || left.userData.equippedReadyPromise,
                    right.userData.ensureEquippedReady?.() || right.userData.equippedReadyPromise
                ]);
                return g.userData.equippedReadyPromise;
            };
            g.userData.createPreviewObject = () => emeraldCoenWingAssetController.createPreviewObject({
                position: [0.66, -0.08, 0.06],
                rotation: [0.014, 0.018, -0.02],
                scale: [8.9, 8.9, 8.9]
            });
            return g;
        }

        function makeEndlessWingSide(side = 'left') {
            const dir = side === 'left' ? -1 : 1;
            const wing = new THREE.Group();
            wing.position.set(dir * 0.8, -0.8, 0.22);
            wing.rotation.set(0.024, dir * 0.076, -0.032 * dir);
            wing.scale.set(19.2, 19.2, 19.2);
            wing.userData.loadedFromGlb = false;
            wing.userData.previewTransform = {
                position: [dir * 0.66, -0.1, 0.06],
                rotation: [0.014, dir * 0.018, -0.02 * dir],
                scale: [8.9, 8.9, 8.9]
            };
            wing.userData.equippedReadyPromise = null;
            wing.userData.ensureEquippedReady = () => {
                if (wing.userData.equippedReadyPromise) {
                    return wing.userData.equippedReadyPromise;
                }
                wing.userData.equippedReadyPromise = loadEndlessWingAssets().then((pair) => {
                    const targetGeometry = side === 'left' ? pair.left : pair.right;
                    const material = createEndlessWingMaterialInstance();
                    if (!targetGeometry || !material) {
                        return;
                    }
                    wing.clear();
                    const mesh = new THREE.Mesh(targetGeometry, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.frustumCulled = false;
                    wing.add(mesh);
                    wing.userData.mesh = mesh;
                    wing.userData.loadedFromGlb = true;
                }).catch(() => null);
                return wing.userData.equippedReadyPromise;
            };

            return wing;
        }

        function makeEndlessWingsProp() {
            const g = new THREE.Group();
            const left = makeEndlessWingSide('left');
            const right = makeEndlessWingSide('right');
            left.visible = false;
            right.visible = false;
            leftWingGroup.add(left);
            rightWingGroup.add(right);
            g.userData.left = left;
            g.userData.right = right;
            g.userData.previewReadyPromise = null;
            g.userData.ensurePreviewReady = () => {
                if (g.userData.previewReadyPromise) {
                    return g.userData.previewReadyPromise;
                }
                g.userData.previewReadyPromise = endlessWingAssetController.loadPreviewAssets();
                return g.userData.previewReadyPromise;
            };
            g.userData.equippedReadyPromise = null;
            g.userData.ensureEquippedReady = () => {
                if (g.userData.equippedReadyPromise) {
                    return g.userData.equippedReadyPromise;
                }
                g.userData.equippedReadyPromise = Promise.allSettled([
                    left.userData.ensureEquippedReady?.() || left.userData.equippedReadyPromise,
                    right.userData.ensureEquippedReady?.() || right.userData.equippedReadyPromise
                ]);
                return g.userData.equippedReadyPromise;
            };
            g.userData.createPreviewObject = () => endlessWingAssetController.createPreviewObject({
                position: [0.66, -0.1, 0.06],
                rotation: [0.014, 0.018, -0.02],
                scale: [8.9, 8.9, 8.9]
            });
            return g;
        }

        function makeXatoriWingSide(side = 'left') {
            const dir = side === 'left' ? -1 : 1;
            const wing = new THREE.Group();
            wing.position.set(dir * 0.78, -0.76, 0.2);
            wing.rotation.set(0.024, dir * 0.072, -0.03 * dir);
            wing.scale.set(19.2, 19.2, 19.2);
            wing.userData.loadedFromGlb = false;
            wing.userData.previewTransform = {
                position: [dir * 0.64, -0.12, 0.08],
                rotation: [0.012, dir * 0.018, -0.018 * dir],
                scale: [8.6, 8.6, 8.6]
            };
            wing.userData.equippedReadyPromise = null;
            wing.userData.ensureEquippedReady = () => {
                if (wing.userData.equippedReadyPromise) {
                    return wing.userData.equippedReadyPromise;
                }
                wing.userData.equippedReadyPromise = loadXatoriWingAssets().then((pair) => {
                    const targetGeometry = side === 'left' ? pair.left : pair.right;
                    const material = createXatoriWingMaterialInstance();
                    if (!targetGeometry || !material) {
                        return;
                    }
                    wing.clear();
                    const mesh = new THREE.Mesh(targetGeometry, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.frustumCulled = false;
                    wing.add(mesh);
                    wing.userData.mesh = mesh;
                    wing.userData.loadedFromGlb = true;
                }).catch(() => null);
                return wing.userData.equippedReadyPromise;
            };

            return wing;
        }

        function makeXatoriWingsProp() {
            const g = new THREE.Group();
            const left = makeXatoriWingSide('left');
            const right = makeXatoriWingSide('right');
            left.visible = false;
            right.visible = false;
            leftWingGroup.add(left);
            rightWingGroup.add(right);
            g.userData.left = left;
            g.userData.right = right;
            g.userData.previewReadyPromise = null;
            g.userData.ensurePreviewReady = () => {
                if (g.userData.previewReadyPromise) {
                    return g.userData.previewReadyPromise;
                }
                g.userData.previewReadyPromise = xatoriWingAssetController.loadPreviewAssets();
                return g.userData.previewReadyPromise;
            };
            g.userData.equippedReadyPromise = null;
            g.userData.ensureEquippedReady = () => {
                if (g.userData.equippedReadyPromise) {
                    return g.userData.equippedReadyPromise;
                }
                g.userData.equippedReadyPromise = Promise.allSettled([
                    left.userData.ensureEquippedReady?.() || left.userData.equippedReadyPromise,
                    right.userData.ensureEquippedReady?.() || right.userData.equippedReadyPromise
                ]);
                return g.userData.equippedReadyPromise;
            };
            g.userData.createPreviewObject = () => xatoriWingAssetController.createPreviewObject({
                position: [0.64, -0.12, 0.08],
                rotation: [0.012, 0.018, -0.018],
                scale: [8.6, 8.6, 8.6]
            });
            return g;
        }

        function createEfernoFallbackWingGeometry(side = 'left') {
            const dir = side === 'left' ? -1 : 1;
            const mx = (x) => x * dir;
            const shape = new THREE.Shape();
            shape.moveTo(mx(0.0), -0.05);
            shape.quadraticCurveTo(mx(0.16), 0.28, mx(0.54), 0.84);
            shape.quadraticCurveTo(mx(0.88), 1.18, mx(1.02), 1.34);
            shape.quadraticCurveTo(mx(0.94), 1.06, mx(0.78), 0.76);
            shape.quadraticCurveTo(mx(0.92), 0.72, mx(1.08), 0.62);
            shape.quadraticCurveTo(mx(0.88), 0.42, mx(0.62), 0.34);
            shape.quadraticCurveTo(mx(0.82), 0.26, mx(0.96), 0.14);
            shape.quadraticCurveTo(mx(0.7), 0.02, mx(0.44), -0.02);
            shape.quadraticCurveTo(mx(0.58), -0.14, mx(0.68), -0.28);
            shape.quadraticCurveTo(mx(0.4), -0.32, mx(0.16), -0.22);
            shape.quadraticCurveTo(mx(0.05), -0.18, mx(0.0), -0.05);
            shape.closePath();
            return prepareWingGeometryForEferno(new THREE.ShapeGeometry(shape, 92));
        }

        function loadEfernoWingGeometries() {
            const clonePrepared = () => ({
                left: efernoWingAssetState.leftGeometry?.clone() || null,
                right: efernoWingAssetState.rightGeometry?.clone() || null
            });
            if (efernoWingAssetState.leftGeometry && efernoWingAssetState.rightGeometry) {
                return Promise.resolve(clonePrepared());
            }
            if (!efernoWingAssetState.loadPromise) {
                efernoWingAssetState.loadPromise = new Promise((resolve, reject) => {
                    efernoWingAssetState.loader.load(
                        efernoWingAssetState.modelUrl,
                        (gltf) => {
                            const root = gltf?.scene || gltf?.scenes?.[0] || null;
                            const sourceGeometry = getLargestMeshGeometryFromObject(root);
                            if (!sourceGeometry) {
                                reject(new Error('Eferno GLB did not contain a mesh with geometry.'));
                                return;
                            }
                            const split = splitPairWingGeometry(sourceGeometry);
                            if (sourceGeometry?.dispose) {
                                sourceGeometry.dispose();
                            }
                            if (!split?.left || !split?.right) {
                                reject(new Error('Eferno GLB could not be split into left/right wings.'));
                                return;
                            }
                            const preparedLeft = prepareWingGeometryForEferno(split.left);
                            const preparedRight = prepareWingGeometryForEferno(split.right);
                            if (split.left?.dispose) split.left.dispose();
                            if (split.right?.dispose) split.right.dispose();
                            if (!preparedLeft || !preparedRight) {
                                reject(new Error('Eferno wing geometry preparation failed.'));
                                return;
                            }
                            efernoWingAssetState.leftGeometry = preparedLeft;
                            efernoWingAssetState.rightGeometry = preparedRight;
                            resolve();
                        },
                        undefined,
                        (error) => reject(error)
                    );
                }).catch((error) => {
                    console.warn('Unable to load Eferno wing GLB, falling back to procedural geometry.', error);
                });
            }

            return efernoWingAssetState.loadPromise.then(() => clonePrepared());
        }

        function makeEfernoEmberSystem(side = 'left') {
            const dir = side === 'left' ? -1 : 1;
            const count = 92;
            const positions = new Float32Array(count * 3);
            const basePositions = new Float32Array(count * 3);
            const phases = new Float32Array(count);
            let seed = side === 'left' ? 19431 : 68217;
            const rand = () => {
                seed = (seed * 1664525 + 1013904223) >>> 0;
                return seed / 4294967296;
            };

            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                const spread = 0.2 + rand() * 1.08;
                const y = -0.34 + rand() * 1.78;
                const z = 0.08 + rand() * 0.42;
                basePositions[i3] = dir * spread;
                basePositions[i3 + 1] = y;
                basePositions[i3 + 2] = z;
                positions[i3] = basePositions[i3];
                positions[i3 + 1] = basePositions[i3 + 1];
                positions[i3 + 2] = basePositions[i3 + 2];
                phases[i] = rand() * Math.PI * 2;
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const material = new THREE.PointsMaterial({
                color: 0xffb24b,
                size: 0.06,
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.76,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            const points = new THREE.Points(geometry, material);
            points.frustumCulled = false;

            return {
                points,
                basePositions,
                phases,
                speed: 2.9 + rand() * 1.2,
                drift: 0.05 + rand() * 0.04,
                rise: 0.16 + rand() * 0.08,
                phaseOffset: rand() * Math.PI * 2
            };
        }

        function makeEfernoWingSide(side = 'left', sharedMaps) {
            const dir = side === 'left' ? -1 : 1;
            const wing = new THREE.Group();
            wing.position.set(dir * 0.58, -0.22, 0.18);
            wing.rotation.set(0.02, dir * 0.045, -0.015 * dir);
            wing.scale.set(6.3, 6.3, 6.3);

            const membraneMat = new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                map: sharedMaps.diffuse,
                emissive: 0xff5f11,
                emissiveMap: sharedMaps.emissive,
                emissiveIntensity: 1.6,
                roughnessMap: sharedMaps.roughness,
                roughness: 0.56,
                metalness: 0.04,
                transmission: 0.04,
                thickness: 0.3,
                alphaMap: sharedMaps.alpha,
                alphaTest: 0.14,
                transparent: true,
                opacity: 0.985,
                side: THREE.DoubleSide,
                depthWrite: false
            });

            const glowMat = new THREE.MeshBasicMaterial({
                map: sharedMaps.emissive,
                color: 0xffad52,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                toneMapped: false
            });

            const rootMat = new THREE.MeshPhysicalMaterial({
                color: 0x5e1608,
                emissive: 0xff6819,
                emissiveIntensity: 0.5,
                roughness: 0.44,
                metalness: 0.05,
                clearcoat: 0.22,
                clearcoatRoughness: 0.4
            });
            const rootCore = new THREE.Mesh(new THREE.SphereGeometry(0.08, 18, 14), rootMat);
            rootCore.position.set(dir * 0.03, -0.03, 0.12);
            wing.add(rootCore);

            const fallbackGeometry = createEfernoFallbackWingGeometry(side);
            const membraneMesh = new THREE.Mesh(fallbackGeometry, membraneMat);
            membraneMesh.renderOrder = 2;
            wing.add(membraneMesh);

            const glowMesh = new THREE.Mesh(fallbackGeometry.clone(), glowMat);
            glowMesh.position.z += 0.012;
            glowMesh.renderOrder = 3;
            wing.add(glowMesh);

            const innerLight = new THREE.PointLight(0xff8f2a, 1.28, 8.2, 2);
            innerLight.position.set(dir * 1.2, 0.2, 0.78);
            wing.add(innerLight);

            const tipLight = new THREE.PointLight(0xff4e0f, 0.74, 6.4, 2);
            tipLight.position.set(dir * 2.2, 0.68, 0.58);
            wing.add(tipLight);

            const emberSystem = makeEfernoEmberSystem(side);
            wing.add(emberSystem.points);

            const swapGeometry = (geometry) => {
                if (!geometry) return;
                const previousMain = membraneMesh.geometry;
                const previousGlow = glowMesh.geometry;
                membraneMesh.geometry = geometry;
                glowMesh.geometry = geometry.clone();
                if (previousMain && previousMain !== geometry && previousMain !== glowMesh.geometry) {
                    previousMain.dispose();
                }
                if (previousGlow && previousGlow !== membraneMesh.geometry && previousGlow !== glowMesh.geometry) {
                    previousGlow.dispose();
                }
                membraneMesh.geometry.computeBoundingSphere();
                glowMesh.geometry.computeBoundingSphere();
            };

            loadEfernoWingGeometries().then((pair) => {
                const targetGeometry = side === 'left' ? pair.left : pair.right;
                if (!targetGeometry) {
                    return;
                }
                swapGeometry(targetGeometry);
                wing.userData.loadedFromGlb = true;
            }).catch(() => {});

            wing.userData.fireMats = [membraneMat];
            wing.userData.glowMats = [glowMat];
            wing.userData.fireLights = [innerLight, tipLight];
            wing.userData.emberSystems = [emberSystem];
            return wing;
        }

        function makeEfernoWingsProp() {
            const g = new THREE.Group();
            const efernoMaps = makeEfernoWingMaps();
            const left = makeEfernoWingSide('left', efernoMaps);
            const right = makeEfernoWingSide('right', efernoMaps);
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
            g.userData.glowMats = [
                ...(left.userData.glowMats || []),
                ...(right.userData.glowMats || [])
            ];
            g.userData.fireLights = [
                ...(left.userData.fireLights || []),
                ...(right.userData.fireLights || [])
            ];
            g.userData.emberSystems = [
                ...(left.userData.emberSystems || []),
                ...(right.userData.emberSystems || [])
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
  let propGroup = null;
  switch (propKey) {
    case 'alphaWings':
      propGroup = makeAlphaWingsProp();
      break;
    case 'rainbowWings':
      propGroup = makeRainbowWingsProp();
      break;
    case 'roboticWings':
      propGroup = makeRoboticWingsProp();
      break;
    case 'omegaWings':
      propGroup = makeOmegaWingsProp();
      break;
    case 'efernoWings':
      propGroup = makeEfernoWingsProp();
      break;
    default:
      return null;
  }

  return extractWingPairFromProp(propGroup);
}
