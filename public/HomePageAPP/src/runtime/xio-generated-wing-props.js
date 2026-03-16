import {
  FIT_TEMPLATE_PROFILES,
  MATERIAL_FAMILY_CONFIGS,
  cloneGeneratorAttachment,
} from '../generator/random-prop-generator-config.js';
import {
  normalizeGeneratedWingRecipe,
} from '../generator/random-prop-generator-core.js';

const RARITY_GLOW_INTENSITY = Object.freeze({
  common: 0.18,
  rare: 0.28,
  legendary: 0.42,
  legendaryLight: 0.7,
  legendaryDark: 0.78,
});

const RARITY_IRIDESCENCE = Object.freeze({
  common: 0.08,
  rare: 0.18,
  legendary: 0.3,
  legendaryLight: 0.7,
  legendaryDark: 0.44,
});

const BASE_STYLE_PROFILE = Object.freeze({
  profile: 'plume',
  armatureDepth: 0.22,
  shoulderLift: 0.1,
  midLift: 0.18,
  upperBloom: 0.18,
  tipRise: 0.08,
  lowerSweep: 0.22,
  trailingLift: 0.08,
  primaryRoll: 0.18,
  secondaryRoll: 0.08,
  covertCount: 3,
  rootScale: 1,
  sparkleCount: 4,
  primaryCountBoost: 1.55,
  secondaryCountBoost: 1.4,
  covertCountBoost: 1.5,
  primaryYaw: 0.14,
  secondaryYaw: 0.08,
  primarySpread: 0.42,
  secondarySpread: 0.24,
  featherWidthBias: 1,
  featherLengthBias: 1,
  veilStrength: 0.78,
  shoulderPlumeCount: 4,
  braceDensity: 0.28,
  armatureVisibility: 0.7,
});

const FAMILY_STYLE_PROFILES = Object.freeze({
  aetherPlume: Object.freeze({
    profile: 'plume',
    armatureDepth: 0.24,
    upperBloom: 0.22,
    tipRise: 0.16,
    lowerSweep: 0.2,
    primaryRoll: 0.22,
    secondaryRoll: 0.1,
    covertCount: 4,
    sparkleCount: 6,
    primaryCountBoost: 1.8,
    secondaryCountBoost: 1.55,
    covertCountBoost: 1.7,
    primaryYaw: 0.18,
    secondaryYaw: 0.12,
    primarySpread: 0.58,
    secondarySpread: 0.34,
    featherWidthBias: 1.18,
    featherLengthBias: 1.08,
    veilStrength: 0.92,
    shoulderPlumeCount: 6,
    braceDensity: 0.18,
    armatureVisibility: 0.48,
  }),
  royalFiligree: Object.freeze({
    profile: 'filigree',
    armatureDepth: 0.18,
    shoulderLift: 0.14,
    midLift: 0.22,
    upperBloom: 0.16,
    tipRise: 0.06,
    lowerSweep: 0.18,
    primaryRoll: 0.14,
    secondaryRoll: 0.06,
    covertCount: 3,
    rootScale: 1.06,
    sparkleCount: 5,
    primaryCountBoost: 1.62,
    secondaryCountBoost: 1.38,
    covertCountBoost: 1.45,
    primaryYaw: 0.16,
    secondaryYaw: 0.08,
    primarySpread: 0.46,
    secondarySpread: 0.22,
    featherWidthBias: 1.06,
    featherLengthBias: 1.02,
    veilStrength: 0.68,
    shoulderPlumeCount: 5,
    braceDensity: 0.22,
    armatureVisibility: 0.62,
  }),
  crystalFan: Object.freeze({
    profile: 'crystal',
    armatureDepth: 0.16,
    upperBloom: 0.08,
    tipRise: 0.02,
    lowerSweep: 0.12,
    trailingLift: 0.02,
    primaryRoll: 0.08,
    secondaryRoll: 0.04,
    covertCount: 2,
    sparkleCount: 7,
    primaryCountBoost: 1.36,
    secondaryCountBoost: 1.2,
    covertCountBoost: 1.18,
    primaryYaw: 0.1,
    secondaryYaw: 0.04,
    primarySpread: 0.22,
    secondarySpread: 0.12,
    featherWidthBias: 0.94,
    featherLengthBias: 0.96,
    veilStrength: 0.54,
    shoulderPlumeCount: 3,
    braceDensity: 0.36,
    armatureVisibility: 0.74,
  }),
  emberBlade: Object.freeze({
    profile: 'blade',
    armatureDepth: 0.2,
    shoulderLift: 0.06,
    midLift: 0.12,
    upperBloom: 0.1,
    tipRise: 0.02,
    lowerSweep: 0.16,
    trailingLift: 0.04,
    primaryRoll: 0.06,
    secondaryRoll: 0.04,
    covertCount: 2,
    sparkleCount: 5,
    primaryCountBoost: 1.42,
    secondaryCountBoost: 1.18,
    covertCountBoost: 1.2,
    primaryYaw: 0.08,
    secondaryYaw: 0.04,
    primarySpread: 0.2,
    secondarySpread: 0.1,
    featherWidthBias: 0.9,
    featherLengthBias: 1.04,
    veilStrength: 0.46,
    shoulderPlumeCount: 3,
    braceDensity: 0.42,
    armatureVisibility: 0.8,
  }),
  stormRibbon: Object.freeze({
    profile: 'plume',
    armatureDepth: 0.18,
    shoulderLift: 0.08,
    midLift: 0.18,
    upperBloom: 0.16,
    tipRise: 0.06,
    lowerSweep: 0.22,
    trailingLift: 0.12,
    primaryRoll: 0.14,
    secondaryRoll: 0.08,
    covertCount: 4,
    sparkleCount: 8,
    primaryCountBoost: 1.7,
    secondaryCountBoost: 1.5,
    covertCountBoost: 1.55,
    primaryYaw: 0.2,
    secondaryYaw: 0.12,
    primarySpread: 0.54,
    secondarySpread: 0.3,
    featherWidthBias: 1.14,
    featherLengthBias: 1.06,
    veilStrength: 0.86,
    shoulderPlumeCount: 5,
    braceDensity: 0.18,
    armatureVisibility: 0.44,
  }),
  mechanicalAegis: Object.freeze({
    profile: 'filigree',
    armatureDepth: 0.12,
    shoulderLift: 0.04,
    midLift: 0.08,
    upperBloom: 0.04,
    tipRise: -0.02,
    lowerSweep: 0.08,
    trailingLift: 0.02,
    primaryRoll: 0.04,
    secondaryRoll: 0.02,
    covertCount: 2,
    rootScale: 1.14,
    sparkleCount: 3,
    primaryCountBoost: 1.18,
    secondaryCountBoost: 1.08,
    covertCountBoost: 1.08,
    primaryYaw: 0.04,
    secondaryYaw: 0.02,
    primarySpread: 0.12,
    secondarySpread: 0.08,
    featherWidthBias: 0.84,
    featherLengthBias: 0.96,
    veilStrength: 0.18,
    shoulderPlumeCount: 2,
    braceDensity: 0.88,
    armatureVisibility: 1,
  }),
});

const PANEL_GEOMETRY_CACHE = new Map();
const QUILL_GEOMETRY_CACHE = new Map();

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));
const lerpNumber = (start, end, alpha) => start + ((end - start) * alpha);
const easeOutCubic = (alpha) => 1 - ((1 - alpha) ** 3);
const ensureColor = (THREE, value, fallback) => new THREE.Color(typeof value === 'string' ? value : fallback);
const enrichColor = (color, {
  mixColor = null,
  mixAmount = 0,
  saturationBoost = 0,
  lightnessShift = 0,
} = {}) => {
  const result = color.clone();
  if (mixColor && mixAmount > 0) {
    result.lerp(mixColor, clampNumber(mixAmount, 0, 1));
  }
  const hsl = { h: 0, s: 0, l: 0 };
  result.getHSL(hsl);
  result.setHSL(
    hsl.h,
    clampNumber(hsl.s + saturationBoost, 0, 1),
    clampNumber(hsl.l + lightnessShift, 0, 1),
  );
  return result;
};

const createCurve = (THREE, points) => new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.45);

const resolveStyleProfile = (recipe) => {
  const familyProfile = FAMILY_STYLE_PROFILES[recipe.structureRecipe.family] || {};
  return {
    ...BASE_STYLE_PROFILE,
    ...familyProfile,
  };
};

const getWingPanelGeometry = (THREE, profile, tipFlare) => {
  const key = `${profile}:${tipFlare.toFixed(2)}`;
  if (PANEL_GEOMETRY_CACHE.has(key)) {
    return PANEL_GEOMETRY_CACHE.get(key);
  }

  const shape = new THREE.Shape();
  const flare = clampNumber(tipFlare, 0, 0.95);

  if (profile === 'blade') {
    shape.moveTo(0, 0);
    shape.lineTo(0.34 + flare * 0.12, 0.08);
    shape.lineTo(0.3 + flare * 0.18, 0.54);
    shape.lineTo(0.08, 1);
    shape.lineTo(-0.08, 1);
    shape.lineTo(-(0.3 + flare * 0.18), 0.54);
    shape.lineTo(-(0.34 + flare * 0.12), 0.08);
    shape.lineTo(0, 0);
  } else if (profile === 'ribbon') {
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.24, 0.18, 0.28 + flare * 0.06, 0.58, 0.18, 1);
    shape.quadraticCurveTo(0.02, 1.06, 0, 1.08);
    shape.quadraticCurveTo(-0.02, 1.06, -0.18, 1);
    shape.bezierCurveTo(-(0.28 + flare * 0.06), 0.58, -0.24, 0.18, 0, 0);
  } else if (profile === 'crystal') {
    shape.moveTo(0, 0);
    shape.lineTo(0.2, 0.12);
    shape.lineTo(0.3 + flare * 0.06, 0.42);
    shape.lineTo(0.18, 0.82);
    shape.lineTo(0, 1);
    shape.lineTo(-0.18, 0.82);
    shape.lineTo(-(0.3 + flare * 0.06), 0.42);
    shape.lineTo(-0.2, 0.12);
    shape.lineTo(0, 0);
  } else if (profile === 'filigree') {
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.22, 0.1, 0.34 + flare * 0.08, 0.3, 0.26 + flare * 0.04, 0.62);
    shape.quadraticCurveTo(0.18, 0.96, 0, 1);
    shape.quadraticCurveTo(-0.18, 0.96, -(0.26 + flare * 0.04), 0.62);
    shape.bezierCurveTo(-(0.34 + flare * 0.08), 0.3, -0.22, 0.1, 0, 0);
  } else {
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.28, 0.1, 0.42 + flare * 0.12, 0.34, 0.36 + flare * 0.08, 0.74);
    shape.quadraticCurveTo(0.16, 1.02, 0, 1);
    shape.quadraticCurveTo(-0.16, 1.02, -(0.36 + flare * 0.08), 0.74);
    shape.bezierCurveTo(-(0.42 + flare * 0.12), 0.34, -0.28, 0.1, 0, 0);
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    curveSegments: 18,
  });
  geometry.translate(0, 0, -0.04);
  geometry.computeVertexNormals();
  PANEL_GEOMETRY_CACHE.set(key, geometry);
  return geometry;
};

const getQuillGeometry = (THREE) => {
  const key = 'quill';
  if (QUILL_GEOMETRY_CACHE.has(key)) {
    return QUILL_GEOMETRY_CACHE.get(key);
  }
  const geometry = new THREE.CylinderGeometry(0.022, 0.014, 1, 8, 1, false);
  QUILL_GEOMETRY_CACHE.set(key, geometry);
  return geometry;
};

const createMaterialSet = (THREE, recipe) => {
  const palette = recipe.palette;
  const materialFamily = MATERIAL_FAMILY_CONFIGS[recipe.materialFamily] || MATERIAL_FAMILY_CONFIGS.royalEnamel;
  const glowIntensity = RARITY_GLOW_INTENSITY[recipe.rarityProfile] || RARITY_GLOW_INTENSITY.rare;
  const iridescence = RARITY_IRIDESCENCE[recipe.rarityProfile] || RARITY_IRIDESCENCE.rare;
  const emissiveColor = ensureColor(THREE, palette.glow, '#8ed9ff');
  const primaryColor = enrichColor(ensureColor(THREE, palette.primary, '#cfe6ff'), {
    mixColor: emissiveColor,
    mixAmount: 0.08,
    saturationBoost: 0.1,
    lightnessShift: recipe.rarityProfile === 'common' ? 0.02 : 0.04,
  });
  const secondaryColor = enrichColor(ensureColor(THREE, palette.secondary, '#7ab8ff'), {
    mixColor: emissiveColor,
    mixAmount: 0.12,
    saturationBoost: 0.12,
    lightnessShift: 0.02,
  });
  const accentColor = enrichColor(ensureColor(THREE, palette.accent, '#ffffff'), {
    mixColor: emissiveColor,
    mixAmount: 0.06,
    saturationBoost: 0.04,
    lightnessShift: 0.02,
  });
  const metalColor = enrichColor(ensureColor(THREE, palette.metal, '#d5dceb'), {
    mixColor: accentColor,
    mixAmount: 0.12,
    saturationBoost: 0.04,
    lightnessShift: 0.01,
  });
  const shadowColor = ensureColor(THREE, palette.shadow, '#1b2232');
  const surfaceEmissive = enrichColor(primaryColor, {
    mixColor: emissiveColor,
    mixAmount: 0.34,
    saturationBoost: 0.04,
  });
  const accentEmissive = enrichColor(secondaryColor, {
    mixColor: emissiveColor,
    mixAmount: 0.4,
    saturationBoost: 0.04,
  });
  const highlightColor = enrichColor(accentColor, {
    mixColor: emissiveColor,
    mixAmount: 0.42,
    saturationBoost: 0.08,
    lightnessShift: 0.03,
  });
  const surfaceTransmission = clampNumber(materialFamily.transmission * 0.22, 0, 0.08);

  const vaneMaterial = new THREE.MeshPhysicalMaterial({
    color: primaryColor,
    emissive: surfaceEmissive,
    emissiveIntensity: glowIntensity * 0.1,
    roughness: clampNumber(materialFamily.roughness - 0.06, 0.08, 0.58),
    metalness: clampNumber(materialFamily.metalness * 0.82, 0.04, 0.72),
    clearcoat: clampNumber(materialFamily.clearcoat + 0.08, 0.3, 1),
    clearcoatRoughness: 0.12,
    transmission: 0,
    thickness: 0.04,
    sheen: clampNumber(materialFamily.sheen + 0.14, 0.08, 0.84),
    sheenColor: accentColor,
    reflectivity: 0.7,
    iridescence: clampNumber(iridescence * 0.72, 0.04, 0.58),
    iridescenceIOR: 1.24,
    specularIntensity: 0.84,
    attenuationColor: secondaryColor,
    attenuationDistance: 1.2,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    dithering: true,
    side: THREE.DoubleSide,
  });

  const accentMaterial = new THREE.MeshPhysicalMaterial({
    color: secondaryColor,
    emissive: accentEmissive,
    emissiveIntensity: glowIntensity * 0.08,
    roughness: clampNumber(materialFamily.roughness - 0.08, 0.04, 0.62),
    metalness: clampNumber(materialFamily.metalness + 0.14, 0.08, 0.98),
    clearcoat: clampNumber(materialFamily.clearcoat + 0.18, 0.18, 1),
    clearcoatRoughness: 0.1,
    iridescence: clampNumber(iridescence + 0.14, 0.16, 1),
    iridescenceIOR: 1.3,
    specularIntensity: 0.88,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    dithering: true,
    side: THREE.DoubleSide,
  });

  const spineMaterial = new THREE.MeshPhysicalMaterial({
    color: metalColor,
    emissive: shadowColor,
    emissiveIntensity: glowIntensity * 0.05,
    roughness: clampNumber(materialFamily.roughness - 0.14, 0.04, 0.54),
    metalness: clampNumber(materialFamily.metalness + 0.28, 0.2, 1),
    clearcoat: clampNumber(materialFamily.clearcoat + 0.1, 0.28, 1),
    clearcoatRoughness: 0.1,
    specularIntensity: 0.72,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });

  const boneMaterial = new THREE.MeshPhysicalMaterial({
    color: enrichColor(metalColor, {
      mixColor: shadowColor,
      mixAmount: 0.18,
      lightnessShift: -0.04,
    }),
    emissive: shadowColor,
    emissiveIntensity: glowIntensity * 0.03,
    roughness: clampNumber(materialFamily.roughness + 0.14, 0.18, 0.76),
    metalness: clampNumber(materialFamily.metalness + 0.04, 0.12, 0.78),
    clearcoat: clampNumber(materialFamily.clearcoat * 0.72, 0.12, 0.74),
    clearcoatRoughness: 0.22,
    specularIntensity: 0.34,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });

  const ornamentMaterial = new THREE.MeshPhysicalMaterial({
    color: accentColor,
    emissive: highlightColor,
    emissiveIntensity: glowIntensity * 0.26,
    roughness: 0.12,
    metalness: 0.34,
    clearcoat: 0.94,
    clearcoatRoughness: 0.08,
    iridescence: clampNumber(iridescence + 0.1, 0.18, 1),
    iridescenceIOR: 1.28,
    specularIntensity: 0.92,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });

  const membraneMaterial = new THREE.MeshPhysicalMaterial({
    color: enrichColor(primaryColor, {
      mixColor: secondaryColor,
      mixAmount: 0.18,
      saturationBoost: 0.06,
      lightnessShift: 0.02,
    }),
    emissive: surfaceEmissive,
    emissiveIntensity: glowIntensity * 0.05,
    roughness: clampNumber(materialFamily.roughness + 0.08, 0.12, 0.8),
    metalness: clampNumber(materialFamily.metalness - 0.08, 0, 0.54),
    clearcoat: clampNumber(materialFamily.clearcoat * 0.66, 0.08, 0.72),
    clearcoatRoughness: 0.18,
    transmission: surfaceTransmission,
    thickness: 0.06,
    attenuationColor: highlightColor,
    attenuationDistance: 1.05,
    transparent: true,
    opacity: clampNumber(0.32 + (glowIntensity * 0.06), 0.32, 0.42),
    side: THREE.DoubleSide,
    depthWrite: false,
    dithering: true,
  });

  const veilMaterial = new THREE.MeshBasicMaterial({
    color: highlightColor,
    transparent: true,
    opacity: clampNumber(0.12 + (glowIntensity * 0.04), 0.12, 0.18),
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: enrichColor(highlightColor, {
      mixColor: accentColor,
      mixAmount: 0.22,
      lightnessShift: 0.04,
    }),
    transparent: true,
    opacity: clampNumber(0.14 + (glowIntensity * 0.06), 0.14, 0.24),
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: emissiveColor,
    transparent: true,
    opacity: clampNumber(0.22 + glowIntensity * 0.28, 0.18, 0.72),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  return {
    vaneMaterial,
    accentMaterial,
    spineMaterial,
    boneMaterial,
    ornamentMaterial,
    membraneMaterial,
    veilMaterial,
    highlightMaterial,
    glowMaterial,
  };
};

const createGuideCurves = (THREE, recipe, directionSign) => {
  const structureRecipe = recipe.structureRecipe;
  const style = resolveStyleProfile(recipe);
  const span = structureRecipe.span;
  const height = structureRecipe.height;
  const lift = structureRecipe.innerLift;
  const sweep = structureRecipe.outerSweep;
  const depth = clampNumber((0.1 + (span * 0.04)) * (0.72 + style.armatureDepth), 0.12, 0.42);

  const root = new THREE.Vector3(0, 0, 0);
  const shoulder = new THREE.Vector3(
    directionSign * span * 0.12,
    height * (0.03 + style.shoulderLift * 0.1),
    depth * 0.44,
  );
  const elbow = new THREE.Vector3(
    directionSign * span * clampNumber(0.36 + (sweep * 0.08), 0.28, 0.46),
    height * clampNumber(0.26 + (lift * 0.08) + (style.midLift * 0.08), 0.22, 0.48),
    depth * 0.52,
  );
  const wrist = new THREE.Vector3(
    directionSign * span * clampNumber(0.78 + (sweep * 0.08), 0.66, 0.94),
    height * clampNumber(0.5 + (style.upperBloom * 0.12), 0.42, 0.72),
    depth * 0.26,
  );
  const tip = new THREE.Vector3(
    directionSign * span * 1.08,
    height * clampNumber(0.42 + (style.tipRise * 0.14), 0.32, 0.62),
    depth * 0.08,
  );

  const supportRoot = new THREE.Vector3(directionSign * span * 0.06, -height * 0.08, -depth * 0.08);
  const supportMid = new THREE.Vector3(
    directionSign * span * 0.28,
    height * clampNumber(0.12 + (style.lowerSweep * 0.1), 0.08, 0.28),
    -depth * 0.05,
  );
  const supportOuter = new THREE.Vector3(
    directionSign * span * 0.58,
    height * clampNumber(0.18 + (style.lowerSweep * 0.08), 0.14, 0.32),
    -depth * 0.02,
  );
  const supportTip = new THREE.Vector3(
    directionSign * span * 0.86,
    height * clampNumber(0.04 + (style.trailingLift * 0.12), -0.02, 0.2),
    depth * 0.02,
  );

  const primaryTipStart = new THREE.Vector3(
    directionSign * span * 0.3,
    height * clampNumber(0.22 + (style.upperBloom * 0.05), 0.16, 0.36),
    depth * 0.2,
  );
  const primaryTipMid = new THREE.Vector3(
    directionSign * span * 0.66,
    height * clampNumber(0.48 + (style.upperBloom * 0.08), 0.4, 0.64),
    depth * 0.14,
  );
  const primaryTipHigh = new THREE.Vector3(
    directionSign * span * 1.06,
    height * clampNumber(0.42 + (style.tipRise * 0.1), 0.32, 0.56),
    depth * 0.06,
  );
  const primaryTipLow = new THREE.Vector3(
    directionSign * span * 1.02,
    height * clampNumber(0.08 + (style.lowerSweep * 0.06), 0.02, 0.2),
    -depth * 0.02,
  );

  const secondaryTipStart = new THREE.Vector3(
    directionSign * span * 0.18,
    height * clampNumber(0.08 + (style.shoulderLift * 0.06), 0.06, 0.16),
    0,
  );
  const secondaryTipMid = new THREE.Vector3(
    directionSign * span * 0.48,
    height * clampNumber(0.18 + (style.midLift * 0.06), 0.14, 0.28),
    -depth * 0.02,
  );
  const secondaryTipOuter = new THREE.Vector3(
    directionSign * span * 0.72,
    height * clampNumber(-0.02 + (style.trailingLift * 0.06), -0.1, 0.08),
    -depth * 0.06,
  );
  const secondaryTipLow = new THREE.Vector3(
    directionSign * span * 0.48,
    -height * clampNumber(0.08 + (style.lowerSweep * 0.1), 0.06, 0.18),
    -depth * 0.1,
  );

  const covertTipStart = new THREE.Vector3(directionSign * span * 0.1, height * 0.04, depth * 0.04);
  const covertTipMid = new THREE.Vector3(directionSign * span * 0.24, height * 0.16, depth * 0.06);
  const covertTipEnd = new THREE.Vector3(directionSign * span * 0.34, height * 0.1, -depth * 0.01);

  return {
    style,
    depth,
    mainCurve: createCurve(THREE, [root, shoulder, elbow, wrist, tip]),
    supportCurve: createCurve(THREE, [supportRoot, supportMid, supportOuter, supportTip]),
    primaryTipCurve: createCurve(THREE, [primaryTipStart, primaryTipMid, primaryTipHigh, primaryTipLow]),
    secondaryTipCurve: createCurve(THREE, [secondaryTipStart, secondaryTipMid, secondaryTipOuter, secondaryTipLow]),
    covertTipCurve: createCurve(THREE, [covertTipStart, covertTipMid, covertTipEnd]),
    landmarks: {
      root,
      shoulder,
      elbow,
      wrist,
      tip,
      lowerTip: secondaryTipLow,
      supportTip,
    },
  };
};

const sampleCurveRange = (curve, start, end, count) => {
  const samples = [];
  const safeCount = Math.max(2, count);
  for (let index = 0; index < safeCount; index += 1) {
    const alpha = index / (safeCount - 1);
    const t = lerpNumber(start, end, alpha);
    samples.push(curve.getPoint(t));
  }
  return samples;
};

const createRibbonSurfaceGeometry = (THREE, upperPoints, lowerPoints) => {
  const count = Math.min(upperPoints.length, lowerPoints.length);
  if (count < 2) {
    return null;
  }

  const positions = [];
  const uvs = [];
  const indices = [];

  for (let index = 0; index < count; index += 1) {
    const upper = upperPoints[index];
    const lower = lowerPoints[index];
    const u = index / (count - 1);
    positions.push(upper.x, upper.y, upper.z);
    positions.push(lower.x, lower.y, lower.z);
    uvs.push(u, 1, u, 0);
  }

  for (let index = 0; index < count - 1; index += 1) {
    const base = index * 2;
    indices.push(base, base + 1, base + 2);
    indices.push(base + 1, base + 3, base + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

const createFeatherMesh = (THREE, materials, {
  profile,
  length,
  width,
  thickness,
  tipFlare,
  accent = false,
  glowScale = 0,
}) => {
  const feather = new THREE.Group();
  const panel = new THREE.Mesh(
    getWingPanelGeometry(THREE, profile, tipFlare),
    accent ? materials.accentMaterial : materials.vaneMaterial,
  );
  panel.scale.set(width, length, thickness);
  panel.position.y = length * 0.48;
  feather.add(panel);

  const quill = new THREE.Mesh(getQuillGeometry(THREE), materials.spineMaterial);
  quill.scale.set(Math.max(0.32, width * 0.12), length, Math.max(0.36, thickness * 0.58));
  quill.position.y = length * 0.5;
  feather.add(quill);

  const vaneCrest = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.58, length * 0.46),
    materials.highlightMaterial,
  );
  vaneCrest.position.set(0, length * 0.6, Math.max(0.03, thickness * 0.18));
  feather.add(vaneCrest);

  if (glowScale > 0) {
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(width * glowScale, length * Math.max(0.4, glowScale * 0.66)),
      materials.glowMaterial,
    );
    glow.position.y = length * 0.5;
    glow.position.z = -Math.max(0.02, thickness * 0.08);
    feather.add(glow);
  }

  return feather;
};

const orientAlongVector = (THREE, object, direction, roll, pitch) => {
  const axis = new THREE.Vector3(0, 1, 0);
  const vector = direction.clone();
  if (vector.lengthSq() < 0.0001) {
    return;
  }
  vector.normalize();
  object.quaternion.setFromUnitVectors(axis, vector);
  object.rotateOnAxis(new THREE.Vector3(0, 1, 0), roll);
  object.rotateOnAxis(new THREE.Vector3(1, 0, 0), pitch);
};

const addFeatherAxisYaw = (THREE, object, yaw) => {
  if (!yaw) {
    return;
  }
  object.rotateOnAxis(new THREE.Vector3(0, 0, 1), yaw);
};

const createFeatherLayer = (THREE, wing, recipe, materials, curveInfo, {
  count,
  anchorRange,
  tipRange,
  tipCurve,
  baseLengthScale,
  baseWidthScale,
  rollBase,
  pitchBase,
  accentEvery = 3,
  depthBias = 0.02,
  profile,
  glowBias = 0,
  yawBase = 0,
  fanSpread = 0,
  widthBias = 1,
  lengthBias = 1,
}) => {
  for (let index = 0; index < count; index += 1) {
    const alpha = count <= 1 ? 0.5 : index / (count - 1);
    const eased = easeOutCubic(alpha);
    const anchorT = lerpNumber(anchorRange[0], anchorRange[1], alpha);
    const tipT = lerpNumber(tipRange[0], tipRange[1], eased);
    const anchor = curveInfo.mainCurve.getPoint(anchorT);
    const tip = tipCurve.getPoint(tipT);
    anchor.z += depthBias * (index % 2 === 0 ? 1 : -0.45);
    tip.z += depthBias * 0.2;
    const direction = tip.clone().sub(anchor);
    const length = clampNumber(direction.length() * baseLengthScale * lengthBias * (1.06 - alpha * 0.08), 0.48, 2.8);
    const width = clampNumber(recipe.structureRecipe.featherWidth * baseWidthScale * widthBias * (1.14 - alpha * 0.16), 0.14, 0.92);
    const thickness = clampNumber(0.2 + (recipe.structureRecipe.tipFlare * 0.2) + (alpha * 0.04), 0.14, 0.42);
    const feather = createFeatherMesh(THREE, materials, {
      profile,
      length,
      width,
      thickness,
      tipFlare: recipe.structureRecipe.tipFlare,
      accent: index % accentEvery === 0,
      glowScale: glowBias > 0 ? (glowBias * (0.92 - alpha * 0.16)) : 0,
    });
    feather.position.copy(anchor);
    orientAlongVector(
      THREE,
      feather,
      direction,
      (rollBase * (0.88 + alpha * 0.52)) + (fanSpread * (alpha - 0.2)),
      pitchBase * (0.78 + alpha * 0.24),
    );
    addFeatherAxisYaw(THREE, feather, yawBase * (0.8 + alpha * 0.4));
    wing.add(feather);
  }
};

const addShoulderPlumage = (THREE, wing, recipe, materials, curveInfo, directionSign) => {
  const plumeCount = Math.max(2, Math.round(curveInfo.style.shoulderPlumeCount));
  for (let index = 0; index < plumeCount; index += 1) {
    const alpha = plumeCount <= 1 ? 0.5 : index / (plumeCount - 1);
    const anchor = curveInfo.mainCurve.getPoint(lerpNumber(0.04, 0.18, alpha));
    const target = curveInfo.primaryTipCurve.getPoint(lerpNumber(0.12, 0.28, alpha));
    anchor.z += 0.05 - (alpha * 0.02);
    target.z += 0.06 - (alpha * 0.03);
    target.y += 0.08 + (alpha * 0.05);
    const direction = target.clone().sub(anchor);
    const length = clampNumber(direction.length() * 0.92, 0.52, 1.36);
    const width = clampNumber(recipe.structureRecipe.featherWidth * (1.36 - alpha * 0.08) * curveInfo.style.featherWidthBias, 0.18, 0.76);
    const feather = createFeatherMesh(THREE, materials, {
      profile: curveInfo.style.profile === 'blade' ? 'filigree' : curveInfo.style.profile,
      length,
      width,
      thickness: 0.24,
      tipFlare: clampNumber(recipe.structureRecipe.tipFlare + 0.08, 0, 0.95),
      accent: index === 0 || index === plumeCount - 1,
      glowScale: recipe.rarityProfile.startsWith('legendary') ? 0.22 : 0,
    });
    feather.position.copy(anchor);
    orientAlongVector(
      THREE,
      feather,
      direction,
      directionSign * (curveInfo.style.primarySpread * (0.65 - alpha * 0.08)),
      -0.06 + (alpha * 0.04),
    );
    addFeatherAxisYaw(THREE, feather, directionSign * curveInfo.style.primaryYaw * 0.88);
    wing.add(feather);
  }
};

const addShoulderAssembly = (THREE, wing, materials, curveInfo, directionSign) => {
  const socket = new THREE.Group();
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.16 * curveInfo.style.rootScale, 20, 18),
    materials.spineMaterial,
  );
  bulb.scale.set(1.28, 1.06, 0.88);
  socket.add(bulb);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.19 * curveInfo.style.rootScale, 0.02, 10, 36, Math.PI * 1.18),
    materials.accentMaterial,
  );
  ring.rotation.set(0.18, directionSign * 0.42, directionSign * 0.84);
  ring.position.set(directionSign * 0.02, 0.04, 0.04);
  socket.add(ring);

  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.08 * curveInfo.style.rootScale, 0),
    materials.ornamentMaterial,
  );
  gem.position.set(directionSign * 0.04, 0.06, 0.08);
  socket.add(gem);

  wing.add(socket);
};

const addSupportBones = (THREE, wing, recipe, materials, curveInfo) => {
  const visibility = clampNumber(curveInfo.style.armatureVisibility || 0.7, 0.24, 1);
  const primaryRadius = clampNumber((0.018 + (recipe.structureRecipe.primaryLayerCount * 0.0012)) * visibility, 0.012, 0.034);
  const supportRadius = clampNumber(primaryRadius * 0.58, 0.008, 0.022);

  const mainSpine = new THREE.Mesh(
    new THREE.TubeGeometry(curveInfo.mainCurve, 40, primaryRadius, 10, false),
    materials.boneMaterial,
  );
  wing.add(mainSpine);

  const supportSpine = new THREE.Mesh(
    new THREE.TubeGeometry(curveInfo.supportCurve, 28, supportRadius, 8, false),
    materials.boneMaterial,
  );
  supportSpine.position.z -= 0.01;
  wing.add(supportSpine);

  const braceCount = clampNumber(Math.round((recipe.structureRecipe.crestCount + 1) * curveInfo.style.braceDensity), 0, 4);
  for (let index = 0; index < braceCount; index += 1) {
    const alpha = braceCount <= 1 ? 0.5 : index / (braceCount - 1);
    const armPoint = curveInfo.mainCurve.getPoint(lerpNumber(0.18, 0.8, alpha));
    const supportPoint = curveInfo.supportCurve.getPoint(lerpNumber(0.1, 0.92, alpha));
    const braceDirection = supportPoint.clone().sub(armPoint);
    const brace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.004, Math.max(0.1, braceDirection.length()), 6),
      materials.boneMaterial,
    );
    brace.position.copy(armPoint.clone().add(supportPoint).multiplyScalar(0.5));
    orientAlongVector(THREE, brace, braceDirection, 0, 0);
    wing.add(brace);
  }
};

const addSilhouetteVeils = (THREE, wing, recipe, materials, curveInfo) => {
  const veilStrength = clampNumber(curveInfo.style.veilStrength || 0, 0, 1);
  if (veilStrength <= 0.05) {
    return;
  }

  const outerUpper = sampleCurveRange(curveInfo.primaryTipCurve, 0.08, 0.98, 12).map((point, index, points) => {
    const alpha = index / Math.max(1, points.length - 1);
    return point.clone().add(new THREE.Vector3(0, 0.03 + (1 - alpha) * 0.04, 0.06 - alpha * 0.05));
  });
  const outerLower = sampleCurveRange(curveInfo.mainCurve, 0.18, 0.98, 12).map((point, index, points) => {
    const alpha = index / Math.max(1, points.length - 1);
    return point.clone().add(new THREE.Vector3(0, -0.05 + alpha * 0.04, -0.02 - alpha * 0.03));
  });
  const outerVeilGeometry = createRibbonSurfaceGeometry(THREE, outerUpper, outerLower);
  if (outerVeilGeometry) {
    const outerVeilMaterial = materials.veilMaterial.clone();
    outerVeilMaterial.opacity = clampNumber(materials.veilMaterial.opacity * (0.82 + veilStrength * 0.22), 0.12, 0.24);
    const outerVeil = new THREE.Mesh(outerVeilGeometry, outerVeilMaterial);
    outerVeil.position.z -= 0.02;
    wing.add(outerVeil);
  }

  const innerUpper = sampleCurveRange(curveInfo.mainCurve, 0.08, 0.7, 10).map((point, index, points) => {
    const alpha = index / Math.max(1, points.length - 1);
    return point.clone().add(new THREE.Vector3(0, 0.02 + (1 - alpha) * 0.03, 0.03));
  });
  const innerLower = sampleCurveRange(curveInfo.secondaryTipCurve, 0.08, 0.94, 10).map((point, index, points) => {
    const alpha = index / Math.max(1, points.length - 1);
    return point.clone().add(new THREE.Vector3(0, -0.03 - alpha * 0.05, -0.05 - alpha * 0.02));
  });
  const innerVeilGeometry = createRibbonSurfaceGeometry(THREE, innerUpper, innerLower);
  if (innerVeilGeometry) {
    const innerVeilMaterial = materials.veilMaterial.clone();
    innerVeilMaterial.opacity = clampNumber(materials.veilMaterial.opacity * (0.7 + veilStrength * 0.2), 0.1, 0.2);
    const innerVeil = new THREE.Mesh(innerVeilGeometry, innerVeilMaterial);
    innerVeil.position.z -= 0.04;
    wing.add(innerVeil);
  }
};

const addMembraneSurface = (THREE, wing, recipe, materials, curveInfo) => {
  if (!recipe.structureRecipe.membrane) {
    return;
  }
  const upper = sampleCurveRange(curveInfo.mainCurve, 0.16, 0.84, 8).map((point, index, points) => {
    const alpha = index / Math.max(1, points.length - 1);
    return point.clone().add(new THREE.Vector3(0, 0, lerpNumber(0.02, -0.01, alpha)));
  });
  const lower = sampleCurveRange(curveInfo.supportCurve, 0.08, 0.98, 8).map((point, index, points) => {
    const alpha = index / Math.max(1, points.length - 1);
    return point.clone().add(new THREE.Vector3(0, 0, lerpNumber(-0.05, -0.02, alpha)));
  });
  const membraneGeometry = createRibbonSurfaceGeometry(THREE, upper, lower);
  if (!membraneGeometry) {
    return;
  }
  const membrane = new THREE.Mesh(membraneGeometry, materials.membraneMaterial);
  wing.add(membrane);
};

const addSparkleInstances = (THREE, wing, materials, anchors, count, baseScale) => {
  if (count <= 0 || anchors.length === 0) {
    return;
  }
  const sparkleGeometry = new THREE.IcosahedronGeometry(0.04, 0);
  const sparkleMesh = new THREE.InstancedMesh(sparkleGeometry, materials.ornamentMaterial, count);
  const pivot = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    const anchor = anchors[index % anchors.length];
    pivot.position.copy(anchor);
    pivot.rotation.set(index * 0.32, index * 0.26, index * 0.18);
    const scale = baseScale * (0.84 + (index % 3) * 0.18);
    pivot.scale.setScalar(scale);
    pivot.updateMatrix();
    sparkleMesh.setMatrixAt(index, pivot.matrix);
  }
  sparkleMesh.instanceMatrix.needsUpdate = true;
  wing.add(sparkleMesh);
};

const addOrnaments = (THREE, wing, recipe, materials, curveInfo, directionSign) => {
  const ornament = recipe.ornamentRecipe;
  const { landmarks } = curveInfo;

  for (let index = 0; index < ornament.haloBands; index += 1) {
    const radius = 0.2 + (index * 0.06);
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.012, 10, 40, Math.PI * 0.92),
      materials.glowMaterial,
    );
    band.position.set(
      landmarks.elbow.x + directionSign * (0.04 + index * 0.08),
      landmarks.elbow.y + 0.18 + (index * 0.12),
      0.12 + index * 0.02,
    );
    band.rotation.z = directionSign * (0.56 + index * 0.08);
    wing.add(band);
  }

  for (let index = 0; index < ornament.crownSpurs; index += 1) {
    const spur = new THREE.Mesh(
      new THREE.ConeGeometry(0.028 + (index * 0.004), 0.18 + (index * 0.03), 6),
      materials.spineMaterial,
    );
    spur.position.set(
      landmarks.shoulder.x + directionSign * (0.02 + index * 0.06),
      landmarks.shoulder.y + 0.12 + (index * 0.06),
      0.08,
    );
    spur.rotation.z = directionSign * (-0.46 - index * 0.08);
    wing.add(spur);
  }

  for (let index = 0; index < ornament.crystalClusters; index += 1) {
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.06 + (index * 0.014), 0),
      index % 2 === 0 ? materials.ornamentMaterial : materials.accentMaterial,
    );
    crystal.position.set(
      landmarks.wrist.x - directionSign * (0.08 + index * 0.06),
      landmarks.wrist.y - 0.04 + (index * 0.04),
      0.08 + index * 0.02,
    );
    crystal.rotation.set(index * 0.24, directionSign * 0.44, 0.2 + index * 0.1);
    wing.add(crystal);
  }

  for (let index = 0; index < ornament.runeSigils; index += 1) {
    const sigil = new THREE.Mesh(
      new THREE.TorusGeometry(0.06 + (index * 0.014), 0.008, 10, 28),
      materials.glowMaterial,
    );
    sigil.position.set(
      landmarks.tip.x - directionSign * (0.08 + index * 0.07),
      landmarks.tip.y - 0.06 - (index * 0.05),
      0.04,
    );
    sigil.rotation.y = directionSign * 0.7;
    wing.add(sigil);
  }

  const trailStart = landmarks.lowerTip.clone();
  for (let index = 0; index < ornament.ribbonTrails; index += 1) {
    const trailCurve = createCurve(THREE, [
      trailStart.clone(),
      trailStart.clone().add(new THREE.Vector3(directionSign * (0.18 + index * 0.06), -0.16, -0.04)),
      trailStart.clone().add(new THREE.Vector3(directionSign * (0.28 + index * 0.1), -0.44, -0.08)),
      trailStart.clone().add(new THREE.Vector3(directionSign * (0.18 + index * 0.08), -0.76, -0.12)),
    ]);
    const ribbon = new THREE.Mesh(
      new THREE.TubeGeometry(trailCurve, 22, 0.012 + index * 0.003, 8, false),
      materials.glowMaterial,
    );
    wing.add(ribbon);
  }

  for (let index = 0; index < ornament.emberNodes; index += 1) {
    const ember = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 + index * 0.01, 12, 10),
      materials.ornamentMaterial,
    );
    ember.position.set(
      trailStart.x - directionSign * (0.08 + index * 0.08),
      trailStart.y - 0.04 - (index * 0.08),
      0.06 + index * 0.02,
    );
    wing.add(ember);
  }

  const sparkleAnchors = [
    landmarks.shoulder.clone().add(new THREE.Vector3(directionSign * 0.06, 0.08, 0.08)),
    landmarks.elbow.clone().add(new THREE.Vector3(directionSign * 0.08, 0.06, 0.1)),
    landmarks.wrist.clone().add(new THREE.Vector3(directionSign * 0.04, 0.02, 0.12)),
    landmarks.tip.clone().add(new THREE.Vector3(-directionSign * 0.06, -0.04, 0.08)),
  ];
  addSparkleInstances(
    THREE,
    wing,
    materials,
    sparkleAnchors,
    Math.min(curveInfo.style.sparkleCount + ornament.crystalClusters + ornament.runeSigils, 12),
    0.54,
  );
};

const createWingSide = (THREE, recipe, side, materials) => {
  const directionSign = side === 'left' ? -1 : 1;
  const wing = new THREE.Group();
  const curveInfo = createGuideCurves(THREE, recipe, directionSign);
  const structureRecipe = recipe.structureRecipe;
  const rarityGlow = RARITY_GLOW_INTENSITY[recipe.rarityProfile] || RARITY_GLOW_INTENSITY.rare;

  addShoulderAssembly(THREE, wing, materials, curveInfo, directionSign);
  addSupportBones(THREE, wing, recipe, materials, curveInfo);
  addShoulderPlumage(THREE, wing, recipe, materials, curveInfo, directionSign);
  addMembraneSurface(THREE, wing, recipe, materials, curveInfo);
  addSilhouetteVeils(THREE, wing, recipe, materials, curveInfo);

  const primaryCount = clampNumber(
    Math.round(structureRecipe.primaryLayerCount * curveInfo.style.primaryCountBoost),
    structureRecipe.primaryLayerCount + 1,
    18,
  );

  createFeatherLayer(THREE, wing, recipe, materials, curveInfo, {
    count: primaryCount,
    anchorRange: [0.26, 0.98],
    tipRange: [0.06, 0.98],
    tipCurve: curveInfo.primaryTipCurve,
    baseLengthScale: 1.14,
    baseWidthScale: 1.82,
    rollBase: directionSign * (curveInfo.style.primaryRoll + 0.22),
    pitchBase: -0.04,
    accentEvery: 3,
    depthBias: 0.02,
    profile: curveInfo.style.profile,
    glowBias: recipe.rarityProfile.startsWith('legendary') ? 0.42 : rarityGlow * 0.18,
    yawBase: directionSign * curveInfo.style.primaryYaw,
    fanSpread: directionSign * curveInfo.style.primarySpread,
    widthBias: curveInfo.style.featherWidthBias,
    lengthBias: curveInfo.style.featherLengthBias,
  });

  if (structureRecipe.secondaryLayerCount > 0) {
    const secondaryCount = clampNumber(
      Math.round(structureRecipe.secondaryLayerCount * curveInfo.style.secondaryCountBoost),
      structureRecipe.secondaryLayerCount,
      14,
    );
    createFeatherLayer(THREE, wing, recipe, materials, curveInfo, {
      count: secondaryCount,
      anchorRange: [0.08, 0.72],
      tipRange: [0.04, 0.98],
      tipCurve: curveInfo.secondaryTipCurve,
      baseLengthScale: 0.98,
      baseWidthScale: 1.2,
      rollBase: directionSign * (curveInfo.style.secondaryRoll + 0.12),
      pitchBase: 0.04,
      accentEvery: 2,
      depthBias: -0.018,
      profile: curveInfo.style.profile === 'blade' ? 'filigree' : curveInfo.style.profile,
      glowBias: recipe.rarityProfile.startsWith('legendary') ? 0.24 : 0,
      yawBase: directionSign * curveInfo.style.secondaryYaw,
      fanSpread: directionSign * curveInfo.style.secondarySpread,
      widthBias: curveInfo.style.featherWidthBias * 0.96,
      lengthBias: curveInfo.style.featherLengthBias * 0.94,
    });
  }

  createFeatherLayer(THREE, wing, recipe, materials, curveInfo, {
    count: clampNumber(Math.round(curveInfo.style.covertCount * curveInfo.style.covertCountBoost), curveInfo.style.covertCount, 8),
    anchorRange: [0.08, 0.3],
    tipRange: [0.1, 0.94],
    tipCurve: curveInfo.covertTipCurve,
    baseLengthScale: 0.68,
    baseWidthScale: 1.04,
    rollBase: directionSign * (curveInfo.style.secondaryRoll * 0.56 + 0.08),
    pitchBase: 0.08,
    accentEvery: 10,
    depthBias: 0.01,
    profile: 'filigree',
    yawBase: directionSign * curveInfo.style.secondaryYaw * 0.7,
    fanSpread: directionSign * curveInfo.style.secondarySpread * 0.56,
    widthBias: curveInfo.style.featherWidthBias * 0.9,
    lengthBias: curveInfo.style.featherLengthBias * 0.82,
  });

  addOrnaments(THREE, wing, recipe, materials, curveInfo, directionSign);

  wing.userData.generatedWingSide = side;
  wing.userData.generatedRecipe = recipe;
  wing.userData.generatedGuideCurves = curveInfo;
  return wing;
};

const applyAttachmentToWingSide = (wing, attachment, side) => {
  const directionSign = side === 'left' ? -1 : 1;
  const position = Array.isArray(attachment?.position) ? attachment.position : [0.72, -0.24, 0.08];
  const rotation = Array.isArray(attachment?.rotation) ? attachment.rotation : [0.016, 0.052, -0.018];
  const scale = Array.isArray(attachment?.scale) ? attachment.scale : [1.92, 1.92, 1.92];
  const initialRotationY = Number(attachment?.fit?.initialRotationY) || 0;

  wing.position.set(
    directionSign * Math.abs(Number(position[0]) || 0.72),
    Number(position[1]) || -0.24,
    Number(position[2]) || 0.08,
  );
  wing.rotation.set(
    Number(rotation[0]) || 0,
    directionSign * (Math.abs(Number(rotation[1]) || 0) + initialRotationY),
    directionSign * Math.abs(Number(rotation[2]) || 0),
  );
  wing.scale.set(
    Math.abs(Number(scale[0]) || 1.92),
    Math.abs(Number(scale[1]) || 1.92),
    Math.abs(Number(scale[2]) || 1.92),
  );
};

const buildGeneratedWingAssembly = (THREE, recipe, {
  wingParents = null,
  attachment = null,
} = {}) => {
  const normalizedRecipe = normalizeGeneratedWingRecipe(recipe);
  if (!normalizedRecipe) {
    return new THREE.Group();
  }

  const resolvedAttachment = cloneGeneratorAttachment(
    attachment
    || normalizedRecipe.fitAttachment
    || FIT_TEMPLATE_PROFILES['xio-wing-master'].attachment,
  );
  const materials = createMaterialSet(THREE, normalizedRecipe);
  const group = new THREE.Group();
  const left = createWingSide(THREE, normalizedRecipe, 'left', materials);
  const right = createWingSide(THREE, normalizedRecipe, 'right', materials);

  if (wingParents?.left && wingParents?.right) {
    applyAttachmentToWingSide(left, resolvedAttachment, 'left');
    applyAttachmentToWingSide(right, resolvedAttachment, 'right');
    left.visible = false;
    right.visible = false;
    wingParents.left.add(left);
    wingParents.right.add(right);
  } else {
    left.visible = true;
    right.visible = true;
    group.add(left);
    group.add(right);
  }

  group.userData.left = left;
  group.userData.right = right;
  group.userData.generatedRecipe = normalizedRecipe;
  return group;
};

export function buildGeneratedWingPreview({ THREE, recipe, attachment = null }) {
  const normalizedRecipe = normalizeGeneratedWingRecipe(recipe);
  if (!normalizedRecipe) {
    return null;
  }
  const previewAttachment = cloneGeneratorAttachment(
    attachment
    || normalizedRecipe.fitAttachment
    || FIT_TEMPLATE_PROFILES[normalizedRecipe.fitTemplateId]?.attachment,
  );
  const group = buildGeneratedWingAssembly(THREE, normalizedRecipe, { attachment: previewAttachment });
  return {
    left: group.userData.left,
    right: group.userData.right,
    attachment: previewAttachment,
  };
}

export function createGeneratedProceduralWingPropFactory({ THREE, leftWingGroup, rightWingGroup }) {
  return function makeGeneratedProceduralWingProp(entry) {
    const normalizedRecipe = normalizeGeneratedWingRecipe(entry?.preview?.generated || entry?.generated || null);
    if (!normalizedRecipe) {
      return new THREE.Group();
    }
    const attachment = cloneGeneratorAttachment(
      entry?.attachment
      || normalizedRecipe.fitAttachment
      || FIT_TEMPLATE_PROFILES[normalizedRecipe.fitTemplateId]?.attachment,
    );
    return buildGeneratedWingAssembly(THREE, normalizedRecipe, {
      wingParents: {
        left: leftWingGroup,
        right: rightWingGroup,
      },
      attachment,
    });
  };
}
