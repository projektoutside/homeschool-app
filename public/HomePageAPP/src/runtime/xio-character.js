export const XIO_DEFAULT_SVG_DATA = Object.freeze({
  viewBox: { x: 0, y: 0, w: 200, h: 200 },
  body: { cx: 100, cy: 100, r: 28 },
  wingRight: 'M110,90 Q170,40 200,70 Q160,120 115,100',
  wingLeft: 'M90,90 Q30,40 0,70 Q40,120 85,100',
});

export const XIO_EYE_APPEARANCE_PRESETS = Object.freeze({
  default: Object.freeze({
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
    shineOpacity: 1,
  }),
  sunrise: Object.freeze({
    scleraColor: 0xfffbf1,
    irisColor: 0xff7e5f,
    irisMap: null,
    irisEmissive: 0x2a0900,
    irisEmissiveIntensity: 0.18,
    pupilColor: 0x1e0b0b,
    pupilScaleX: 0.86,
    pupilScaleY: 1.14,
    pupilOffsetX: 0,
    pupilOffsetY: 0.01,
    secondaryShineColor: 0xffd1a8,
    secondaryShineOpacity: 0.74,
    shineOpacity: 1,
  }),
  moonlit: Object.freeze({
    scleraColor: 0xf7fbff,
    irisColor: 0x72c4ff,
    irisMap: null,
    irisEmissive: 0x0a2a58,
    irisEmissiveIntensity: 0.32,
    pupilColor: 0x05070d,
    pupilScaleX: 0.92,
    pupilScaleY: 0.92,
    pupilOffsetX: 0,
    pupilOffsetY: 0,
    secondaryShineColor: 0xd8f0ff,
    secondaryShineOpacity: 0.9,
    shineOpacity: 1,
  }),
  ember: Object.freeze({
    scleraColor: 0xfff4ea,
    irisColor: 0xff5722,
    irisMap: null,
    irisEmissive: 0x661100,
    irisEmissiveIntensity: 0.38,
    pupilColor: 0x090200,
    pupilScaleX: 0.84,
    pupilScaleY: 1.18,
    pupilOffsetX: 0,
    pupilOffsetY: 0.02,
    secondaryShineColor: 0xffcf84,
    secondaryShineOpacity: 0.78,
    shineOpacity: 0.92,
  }),
  mint: Object.freeze({
    scleraColor: 0xf7fff9,
    irisColor: 0x4fe1b2,
    irisMap: null,
    irisEmissive: 0x033c2a,
    irisEmissiveIntensity: 0.28,
    pupilColor: 0x041210,
    pupilScaleX: 0.94,
    pupilScaleY: 1.02,
    pupilOffsetX: 0,
    pupilOffsetY: 0,
    secondaryShineColor: 0xaef7e4,
    secondaryShineOpacity: 0.72,
    shineOpacity: 1,
  }),
});

export const XIO_MATERIAL_PRESETS = Object.freeze({
  default: Object.freeze({
    color: 0x4b2aa8,
    emissive: 0x13002b,
    emissiveIntensity: 0.45,
    roughness: 0.42,
    metalness: 0.03,
    clearcoat: 0.32,
    clearcoatRoughness: 0.62,
  }),
  starlight: Object.freeze({
    color: 0x5a3ef0,
    emissive: 0x1c0d4f,
    emissiveIntensity: 0.54,
    roughness: 0.38,
    metalness: 0.06,
    clearcoat: 0.4,
    clearcoatRoughness: 0.48,
  }),
  aurora: Object.freeze({
    color: 0x26b3cc,
    emissive: 0x04384d,
    emissiveIntensity: 0.42,
    roughness: 0.46,
    metalness: 0.05,
    clearcoat: 0.36,
    clearcoatRoughness: 0.52,
  }),
  ember: Object.freeze({
    color: 0xb3471f,
    emissive: 0x401000,
    emissiveIntensity: 0.4,
    roughness: 0.48,
    metalness: 0.03,
    clearcoat: 0.28,
    clearcoatRoughness: 0.6,
  }),
});

export const XIO_SLOT_DEFINITIONS = Object.freeze({
  wingSet: Object.freeze({ key: 'wingSet', label: 'Wing Set', mode: 'paired' }),
  headWear: Object.freeze({ key: 'headWear', label: 'Headwear', mode: 'single', position: [0, 1.5, 1.65] }),
  faceAccessory: Object.freeze({ key: 'faceAccessory', label: 'Face Accessory', mode: 'single', position: [0, 0.32, 2.7] }),
  eyeStyle: Object.freeze({ key: 'eyeStyle', label: 'Eye Style', mode: 'appearance', position: [0, 0.34, 2.58] }),
  bodyAccessory: Object.freeze({ key: 'bodyAccessory', label: 'Body Gear', mode: 'single', position: [0, 0.2, 2.05] }),
  heldProp: Object.freeze({ key: 'heldProp', label: 'Held Prop', mode: 'single', position: [1.5, -0.55, 1.85], rotation: [0.28, -0.6, -0.16] }),
});

function createSoftHaloSprite(THREE, { size = 10, inner = 'rgba(75, 225, 255, 0.42)', mid = 'rgba(65, 180, 255, 0.2)', outer = 'rgba(20, 90, 180, 0)' } = {}) {
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 512;
  glowCanvas.height = 512;
  const ctx = glowCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.45, mid);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(glowCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size, size, 1);
  return sprite;
}

function createWingMesh(THREE, SVGLoader, pathString, layerName, scale) {
  const loader = new SVGLoader();
  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="${pathString}" /></svg>`;
  const data = loader.parse(svgMarkup);
  const shapePath = data.paths[0];
  const shapes = shapePath.toShapes(true);
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    steps: 2,
    depth: 1.2,
    bevelEnabled: true,
    bevelThickness: 0.22,
    bevelSize: 0.25,
    bevelSegments: 4,
    curveSegments: 24,
  });

  geometry.translate(layerName === 'right' ? -110 : -90, -90, 0);
  geometry.rotateX(Math.PI);

  const mesh = new THREE.Mesh(geometry, [
    new THREE.MeshPhysicalMaterial({
      color: 0x72ffff,
      emissive: 0x13cfff,
      emissiveIntensity: 0.28,
      transmission: 0.7,
      opacity: 0.34,
      transparent: true,
      roughness: 0.5,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x4cf7ff,
      emissive: 0x4cf7ff,
      emissiveIntensity: 1.8,
      roughness: 0.5,
      metalness: 0,
    }),
  ]);

  mesh.scale.set(scale, scale, scale);
  return mesh;
}

class ReferenceEye {
  constructor(THREE, scale) {
    this.THREE = THREE;
    this.group = new THREE.Group();
    this.look = new THREE.Vector2(0, 0);

    const sclera = new THREE.Mesh(
      new THREE.SphereGeometry(7.2 * scale, 42, 42),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.45,
        metalness: 0,
        clearcoat: 0.18,
        clearcoatRoughness: 0.75,
      }),
    );
    sclera.scale.set(1, 1.04, 0.86);
    sclera.userData.previewEyePart = 'sclera';
    this.group.add(sclera);
    this.scleraMat = sclera.material;

    this.irisRig = new THREE.Group();
    this.irisRig.position.z = 0.74;
    this.group.add(this.irisRig);

    this.irisMat = new THREE.MeshStandardMaterial({
      color: 0x2a4ac4,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.6,
      metalness: 0,
    });
    this.iris = new THREE.Mesh(new THREE.CircleGeometry(0.38, 48), this.irisMat);
    this.iris.userData.previewEyePart = 'iris';
    this.irisRig.add(this.iris);

    this.pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.pupil = new THREE.Mesh(new THREE.CircleGeometry(0.23, 44), this.pupilMat);
    this.pupil.userData.previewEyePart = 'pupil';
    this.pupil.position.z = 0.005;
    this.irisRig.add(this.pupil);

    this.shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    const shine = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), this.shineMat);
    shine.userData.previewEyePart = 'shine';
    shine.position.set(-0.14, 0.14, 0.01);
    this.irisRig.add(shine);

    this.shine2Mat = new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.6 });
    const shine2 = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), this.shine2Mat);
    shine2.userData.previewEyePart = 'shine2';
    shine2.position.set(0.12, -0.12, 0.01);
    this.irisRig.add(shine2);
  }

  setAppearance(style = {}) {
    this.scleraMat.color.setHex(style.scleraColor ?? 0xffffff);
    this.irisMat.color.setHex(style.irisColor ?? 0x2a4ac4);
    this.irisMat.emissive.setHex(style.irisEmissive ?? 0x000000);
    this.irisMat.emissiveIntensity = style.irisEmissiveIntensity ?? 0;
    this.irisMat.map = style.irisMap ?? null;
    this.irisMat.needsUpdate = true;
    this.pupilMat.color.setHex(style.pupilColor ?? 0x000000);
    this.pupil.scale.set(style.pupilScaleX ?? 1, style.pupilScaleY ?? 1, 1);
    this.pupil.position.set(style.pupilOffsetX ?? 0, style.pupilOffsetY ?? 0, 0.005);
    this.shineMat.opacity = style.shineOpacity ?? 1;
    this.shine2Mat.color.setHex(style.secondaryShineColor ?? 0xaaccff);
    this.shine2Mat.opacity = style.secondaryShineOpacity ?? 0.6;
  }

  update(targetX, targetY, dt) {
    this.look.x += (targetX - this.look.x) * Math.min(1, dt * 10);
    this.look.y += (targetY - this.look.y) * Math.min(1, dt * 10);
    this.irisRig.position.x = this.look.x;
    this.irisRig.position.y = this.look.y;
  }
}

export function createXioCharacter({
  THREE,
  SVGLoader,
  scene,
  svgData = XIO_DEFAULT_SVG_DATA,
  scale = 0.1,
  baseCreatureScale = 0.45,
}) {
  const stuntRig = new THREE.Group();
  scene.add(stuntRig);

  const creatureGroup = new THREE.Group();
  creatureGroup.scale.setScalar(baseCreatureScale);
  stuntRig.add(creatureGroup);

  const materialBody = new THREE.MeshPhysicalMaterial({
    color: 0x4b2aa8,
    emissive: 0x13002b,
    emissiveIntensity: 0.45,
    roughness: 0.42,
    metalness: 0.03,
    clearcoat: 0.32,
    clearcoatRoughness: 0.62,
    reflectivity: 0.18,
  });
  const bodyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(svgData.body.r * scale, 64, 64),
    materialBody,
  );
  bodyMesh.userData.previewRole = 'body';
  creatureGroup.add(bodyMesh);

  const haloCore = createSoftHaloSprite(THREE, {
    size: 11,
    inner: 'rgba(90, 236, 255, 0.42)',
    mid: 'rgba(60, 176, 255, 0.2)',
    outer: 'rgba(14, 70, 170, 0.0)',
  });
  haloCore.position.set(0, 0.2, -2);
  creatureGroup.add(haloCore);

  const haloWide = createSoftHaloSprite(THREE, {
    size: 16,
    inner: 'rgba(52, 160, 255, 0.12)',
    mid: 'rgba(32, 118, 230, 0.08)',
    outer: 'rgba(8, 44, 130, 0.0)',
  });
  haloWide.position.set(0, 0.15, -2.4);
  creatureGroup.add(haloWide);

  const leftWingGroup = new THREE.Group();
  leftWingGroup.position.set(-1.05, 0.95, -0.1);
  leftWingGroup.userData.basePosition = leftWingGroup.position.clone();
  creatureGroup.add(leftWingGroup);

  const rightWingGroup = new THREE.Group();
  rightWingGroup.position.set(1.05, 0.95, -0.1);
  rightWingGroup.userData.basePosition = rightWingGroup.position.clone();
  creatureGroup.add(rightWingGroup);

  const leftWingBaseMesh = createWingMesh(THREE, SVGLoader, svgData.wingLeft, 'left', scale);
  leftWingBaseMesh.userData.previewWingBase = 'left';
  leftWingGroup.add(leftWingBaseMesh);

  const rightWingBaseMesh = createWingMesh(THREE, SVGLoader, svgData.wingRight, 'right', scale);
  rightWingBaseMesh.userData.previewWingBase = 'right';
  rightWingGroup.add(rightWingBaseMesh);

  const leftEye = new ReferenceEye(THREE, scale);
  leftEye.group.userData.previewEyeSide = 'left';
  const leftEyeGroup = new THREE.Group();
  leftEyeGroup.position.set(-0.82, 0.33, 2.36);
  leftEyeGroup.rotation.y = 0.07;
  leftEyeGroup.add(leftEye.group);
  creatureGroup.add(leftEyeGroup);

  const rightEye = new ReferenceEye(THREE, scale);
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
      metalness: 0.02,
    }),
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
      clearcoatRoughness: 0.22,
    }),
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
      toneMapped: false,
    }),
  );
  mouthGlow.position.set(0, 0, 0.05);
  mouthGroup.add(mouthGlow);

  const propsRig = new THREE.Group();
  creatureGroup.add(propsRig);

  const slotAnchors = {};
  Object.values(XIO_SLOT_DEFINITIONS).forEach((slotDefinition) => {
    if (slotDefinition.mode === 'paired') {
      slotAnchors[slotDefinition.key] = {
        left: leftWingGroup,
        right: rightWingGroup,
        baseLeft: leftWingBaseMesh,
        baseRight: rightWingBaseMesh,
      };
      return;
    }
    if (slotDefinition.mode === 'appearance') {
      slotAnchors[slotDefinition.key] = { anchor: null };
      return;
    }
    const anchor = new THREE.Group();
    const position = slotDefinition.position || [0, 0, 0];
    const rotation = slotDefinition.rotation || [0, 0, 0];
    anchor.position.set(position[0], position[1], position[2]);
    anchor.rotation.set(rotation[0], rotation[1], rotation[2]);
    propsRig.add(anchor);
    slotAnchors[slotDefinition.key] = { anchor };
  });

  const applyEyeAppearancePreset = (presetKey = 'default') => {
    const preset = XIO_EYE_APPEARANCE_PRESETS[presetKey] || XIO_EYE_APPEARANCE_PRESETS.default;
    leftEye.setAppearance(preset);
    rightEye.setAppearance(preset);
  };

  const applyMaterialPreset = (presetKey = 'default') => {
    const preset = XIO_MATERIAL_PRESETS[presetKey] || XIO_MATERIAL_PRESETS.default;
    materialBody.color.setHex(preset.color);
    materialBody.emissive.setHex(preset.emissive);
    materialBody.emissiveIntensity = preset.emissiveIntensity;
    materialBody.roughness = preset.roughness;
    materialBody.metalness = preset.metalness;
    materialBody.clearcoat = preset.clearcoat;
    materialBody.clearcoatRoughness = preset.clearcoatRoughness;
  };

  const resetAppearance = () => {
    applyEyeAppearancePreset('default');
    applyMaterialPreset('default');
    leftWingBaseMesh.visible = true;
    rightWingBaseMesh.visible = true;
  };

  resetAppearance();

  return {
    stuntRig,
    creatureGroup,
    materialBody,
    bodyMesh,
    leftWingGroup,
    rightWingGroup,
    leftWingBaseMesh,
    rightWingBaseMesh,
    leftEye,
    rightEye,
    leftEyeGroup,
    rightEyeGroup,
    mouthGroup,
    propsRig,
    slotAnchors,
    resetAppearance,
    applyEyeAppearancePreset,
    applyMaterialPreset,
  };
}
