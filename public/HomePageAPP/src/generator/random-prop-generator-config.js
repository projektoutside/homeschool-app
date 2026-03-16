import { PROP_CATALOG } from '../inventory/catalog/prop-catalog.js';

export const RANDOM_PROP_GENERATOR_VERSION = 1;
export const GENERATED_PROCEDURAL_WING_FACTORY_ID = 'makeGeneratedProceduralWingProp';

const cloneTuple = (values, fallback = []) => (
  Array.isArray(values)
    ? values.map((value, index) => Number.isFinite(Number(value)) ? Number(value) : (fallback[index] ?? 0))
    : [...fallback]
);

const cloneAttachment = (attachment) => ({
  position: cloneTuple(attachment?.position, [0.74, -0.24, 0.08]),
  rotation: cloneTuple(attachment?.rotation, [0.02, 0.06, -0.02]),
  scale: cloneTuple(attachment?.scale, [1.9, 1.9, 1.9]),
  mirrorMode: attachment?.mirrorMode === 'paired' ? 'paired' : 'single',
  fit: attachment?.fit && typeof attachment.fit === 'object'
    ? {
      yOffsetRatio: Number.isFinite(Number(attachment.fit.yOffsetRatio)) ? Number(attachment.fit.yOffsetRatio) : 0.55,
      zOffsetRatio: Number.isFinite(Number(attachment.fit.zOffsetRatio)) ? Number(attachment.fit.zOffsetRatio) : 0.02,
      distanceMultiplier: Number.isFinite(Number(attachment.fit.distanceMultiplier)) ? Number(attachment.fit.distanceMultiplier) : 1.28,
      ...(Number.isFinite(Number(attachment.fit.initialRotationY))
        ? { initialRotationY: Number(attachment.fit.initialRotationY) }
        : {}),
    }
    : null,
});

export const cloneGeneratorAttachment = (attachment) => cloneAttachment(attachment);

export const GENERATOR_CATEGORY_OPTIONS = Object.freeze([
  Object.freeze({
    value: 'wingSet',
    label: 'Wings',
    enabled: true,
    description: 'Back-mounted paired wings tailored for XiO.',
  }),
  Object.freeze({
    value: 'crowns',
    label: 'Crowns',
    enabled: false,
    description: 'Coming Soon',
  }),
  Object.freeze({
    value: 'halos',
    label: 'Halos',
    enabled: false,
    description: 'Coming Soon',
  }),
  Object.freeze({
    value: 'headgear',
    label: 'Headgear',
    enabled: false,
    description: 'Coming Soon',
  }),
  Object.freeze({
    value: 'shoulderProps',
    label: 'Shoulder Props',
    enabled: false,
    description: 'Coming Soon',
  }),
  Object.freeze({
    value: 'backProps',
    label: 'Back Props',
    enabled: false,
    description: 'Coming Soon',
  }),
  Object.freeze({
    value: 'accessories',
    label: 'Accessories',
    enabled: false,
    description: 'Coming Soon',
  }),
]);

export const GENERATOR_RARITY_OPTIONS = Object.freeze([
  Object.freeze({ value: 'common', label: 'Common' }),
  Object.freeze({ value: 'rare', label: 'Rare' }),
  Object.freeze({ value: 'legendary', label: 'Legendary' }),
  Object.freeze({ value: 'legendaryLight', label: 'Legendary Light' }),
  Object.freeze({ value: 'legendaryDark', label: 'Legendary Dark' }),
]);

export const GENERATOR_THEME_MODE_OPTIONS = Object.freeze([
  Object.freeze({ value: 'fullyRandom', label: 'Fully Random' }),
  Object.freeze({ value: 'guidedTheme', label: 'Guided Theme' }),
  Object.freeze({ value: 'matchExistingStyle', label: 'Match Existing Style' }),
]);

export const GENERATOR_DETAIL_DENSITY_OPTIONS = Object.freeze([
  Object.freeze({ value: 'low', label: 'Low' }),
  Object.freeze({ value: 'medium', label: 'Medium' }),
  Object.freeze({ value: 'high', label: 'High' }),
  Object.freeze({ value: 'autoByRarity', label: 'Auto By Rarity' }),
]);

export const GENERATOR_COLOR_HARMONY_OPTIONS = Object.freeze([
  Object.freeze({ value: 'auto', label: 'Auto' }),
  Object.freeze({ value: 'soft', label: 'Soft' }),
  Object.freeze({ value: 'bold', label: 'Bold' }),
  Object.freeze({ value: 'royal', label: 'Royal' }),
  Object.freeze({ value: 'dark', label: 'Dark' }),
  Object.freeze({ value: 'light', label: 'Light' }),
  Object.freeze({ value: 'nature', label: 'Nature' }),
  Object.freeze({ value: 'energy', label: 'Energy' }),
]);

export const GENERATOR_FIT_MODE_OPTIONS = Object.freeze([
  Object.freeze({ value: 'useMasterTemplate', label: 'Use Master Template' }),
  Object.freeze({ value: 'matchExistingProp', label: 'Match Existing Prop' }),
  Object.freeze({ value: 'copyWingTemplate', label: 'Copy Wing Template' }),
  Object.freeze({ value: 'useCategoryDefault', label: 'Use Category Default' }),
]);

export const GENERATOR_THEME_OPTIONS = Object.freeze([
  Object.freeze({ value: 'royal', label: 'Royal' }),
  Object.freeze({ value: 'celestial', label: 'Celestial' }),
  Object.freeze({ value: 'light', label: 'Light' }),
  Object.freeze({ value: 'shadow', label: 'Shadow' }),
  Object.freeze({ value: 'nature', label: 'Nature' }),
  Object.freeze({ value: 'mechanical', label: 'Mechanical' }),
  Object.freeze({ value: 'crystal', label: 'Crystal' }),
  Object.freeze({ value: 'arcane', label: 'Arcane' }),
  Object.freeze({ value: 'ember', label: 'Ember' }),
  Object.freeze({ value: 'frost', label: 'Frost' }),
  Object.freeze({ value: 'moonlight', label: 'Moonlight' }),
  Object.freeze({ value: 'sunflare', label: 'Sunflare' }),
  Object.freeze({ value: 'galaxy', label: 'Galaxy' }),
  Object.freeze({ value: 'butterfly', label: 'Butterfly' }),
  Object.freeze({ value: 'dragon', label: 'Dragon' }),
  Object.freeze({ value: 'rune', label: 'Rune' }),
  Object.freeze({ value: 'storm', label: 'Storm' }),
  Object.freeze({ value: 'aether', label: 'Aether' }),
]);

export const FIT_TEMPLATE_PROFILES = Object.freeze({
  'xio-wing-master': Object.freeze({
    id: 'xio-wing-master',
    label: 'XiO Wing Master Template',
    attachment: cloneAttachment({
      position: [0.72, -0.24, 0.08],
      rotation: [0.016, 0.052, -0.018],
      scale: [1.92, 1.92, 1.92],
      mirrorMode: 'paired',
      fit: { yOffsetRatio: 0.56, zOffsetRatio: 0.02, distanceMultiplier: 1.28, initialRotationY: 0 },
    }),
    scaleEnvelope: Object.freeze({ min: 1.52, max: 2.46 }),
    safeBodyClearance: Object.freeze({ x: 0.58, y: 0.18, z: 0.18 }),
    visualBounds: Object.freeze({ maxSpan: 4.75, maxHeight: 3.35 }),
  }),
  'xio-wing-heroic': Object.freeze({
    id: 'xio-wing-heroic',
    label: 'XiO Heroic Spread Template',
    attachment: cloneAttachment({
      position: [0.8, -0.3, 0.06],
      rotation: [0.014, 0.06, -0.024],
      scale: [2.08, 2.08, 2.08],
      mirrorMode: 'paired',
      fit: { yOffsetRatio: 0.72, zOffsetRatio: 0.028, distanceMultiplier: 1.36, initialRotationY: 0 },
    }),
    scaleEnvelope: Object.freeze({ min: 1.76, max: 2.7 }),
    safeBodyClearance: Object.freeze({ x: 0.62, y: 0.22, z: 0.22 }),
    visualBounds: Object.freeze({ maxSpan: 5.35, maxHeight: 3.85 }),
  }),
  'xio-wing-aerial': Object.freeze({
    id: 'xio-wing-aerial',
    label: 'XiO Aerial Bloom Template',
    attachment: cloneAttachment({
      position: [0.68, -0.18, 0.12],
      rotation: [0.018, 0.044, -0.014],
      scale: [1.74, 1.74, 1.74],
      mirrorMode: 'paired',
      fit: { yOffsetRatio: 0.42, zOffsetRatio: 0.022, distanceMultiplier: 1.22, initialRotationY: 0 },
    }),
    scaleEnvelope: Object.freeze({ min: 1.4, max: 2.18 }),
    safeBodyClearance: Object.freeze({ x: 0.52, y: 0.16, z: 0.18 }),
    visualBounds: Object.freeze({ maxSpan: 4.25, maxHeight: 3.15 }),
  }),
});

export const MATERIAL_FAMILY_CONFIGS = Object.freeze({
  starlitSilk: Object.freeze({
    id: 'starlitSilk',
    label: 'Starlit Silk',
    surface: 'silk',
    roughness: 0.34,
    metalness: 0.08,
    clearcoat: 0.34,
    transmission: 0.14,
    sheen: 0.48,
  }),
  royalEnamel: Object.freeze({
    id: 'royalEnamel',
    label: 'Royal Enamel',
    surface: 'polished-enamel',
    roughness: 0.18,
    metalness: 0.56,
    clearcoat: 0.88,
    transmission: 0.04,
    sheen: 0.18,
  }),
  crystalLattice: Object.freeze({
    id: 'crystalLattice',
    label: 'Crystal Lattice',
    surface: 'crystal',
    roughness: 0.12,
    metalness: 0.1,
    clearcoat: 0.92,
    transmission: 0.48,
    sheen: 0.06,
  }),
  emberForged: Object.freeze({
    id: 'emberForged',
    label: 'Ember Forged',
    surface: 'forged-metal',
    roughness: 0.42,
    metalness: 0.74,
    clearcoat: 0.22,
    transmission: 0,
    sheen: 0.02,
  }),
  stormglass: Object.freeze({
    id: 'stormglass',
    label: 'Stormglass Alloy',
    surface: 'charged-glass',
    roughness: 0.2,
    metalness: 0.32,
    clearcoat: 0.74,
    transmission: 0.22,
    sheen: 0.2,
  }),
  shadowObsidian: Object.freeze({
    id: 'shadowObsidian',
    label: 'Shadow Obsidian',
    surface: 'obsidian',
    roughness: 0.24,
    metalness: 0.42,
    clearcoat: 0.62,
    transmission: 0.08,
    sheen: 0.1,
  }),
  verdantFiligree: Object.freeze({
    id: 'verdantFiligree',
    label: 'Verdant Filigree',
    surface: 'leaf-metal',
    roughness: 0.3,
    metalness: 0.18,
    clearcoat: 0.52,
    transmission: 0.06,
    sheen: 0.24,
  }),
  runeAether: Object.freeze({
    id: 'runeAether',
    label: 'Rune Aether',
    surface: 'arcane-metal',
    roughness: 0.28,
    metalness: 0.46,
    clearcoat: 0.66,
    transmission: 0.12,
    sheen: 0.14,
  }),
});

export const PALETTE_LIBRARY = Object.freeze({
  royal: Object.freeze([
    Object.freeze({ key: 'royal-gold', label: 'Royal Gold', primary: '#f7d889', secondary: '#e87ad8', accent: '#fff0c2', glow: '#ffd76f', shadow: '#3a2456', metal: '#f5c74b' }),
    Object.freeze({ key: 'royal-azure', label: 'Royal Azure', primary: '#9fe4ff', secondary: '#5f7dff', accent: '#f7f1ff', glow: '#82d7ff', shadow: '#1d2a60', metal: '#d9d2ff' }),
  ]),
  light: Object.freeze([
    Object.freeze({ key: 'light-aether', label: 'Aether Light', primary: '#dff9ff', secondary: '#9cdcff', accent: '#ffffff', glow: '#b8ffff', shadow: '#38548f', metal: '#e6f1ff' }),
    Object.freeze({ key: 'light-halo', label: 'Halo Bloom', primary: '#ffffff', secondary: '#f2d9ff', accent: '#ffdca0', glow: '#fff1c4', shadow: '#47639b', metal: '#fbe5b2' }),
  ]),
  dark: Object.freeze([
    Object.freeze({ key: 'dark-crimson', label: 'Crimson Night', primary: '#241624', secondary: '#9d2636', accent: '#ff7c58', glow: '#ff8a3a', shadow: '#08060f', metal: '#8f5b46' }),
    Object.freeze({ key: 'dark-obsidian', label: 'Obsidian Ember', primary: '#16171e', secondary: '#4a5267', accent: '#ff6f4a', glow: '#ff5630', shadow: '#090a12', metal: '#6d7284' }),
  ]),
  nature: Object.freeze([
    Object.freeze({ key: 'nature-verdant', label: 'Verdant Bloom', primary: '#86d39c', secondary: '#e2f3b7', accent: '#fef7df', glow: '#a7f7b8', shadow: '#22403f', metal: '#d7d29b' }),
    Object.freeze({ key: 'nature-petal', label: 'Petal Nectar', primary: '#f6a7d8', secondary: '#ffe9a3', accent: '#fff9f2', glow: '#ffd688', shadow: '#62415e', metal: '#f2d483' }),
  ]),
  energy: Object.freeze([
    Object.freeze({ key: 'energy-voltage', label: 'Voltage Arc', primary: '#7af4ff', secondary: '#5167ff', accent: '#f5fdff', glow: '#57e7ff', shadow: '#1a2856', metal: '#c2e3ff' }),
    Object.freeze({ key: 'energy-solar', label: 'Solar Burst', primary: '#ffda74', secondary: '#ff7d3a', accent: '#fff4c7', glow: '#ffb34a', shadow: '#56311d', metal: '#ffdf96' }),
  ]),
  crystal: Object.freeze([
    Object.freeze({ key: 'crystal-frost', label: 'Frost Crystal', primary: '#d8f5ff', secondary: '#8be2ff', accent: '#ffffff', glow: '#b8fdff', shadow: '#335b83', metal: '#d7ecff' }),
    Object.freeze({ key: 'crystal-amethyst', label: 'Amethyst Prism', primary: '#c4a1ff', secondary: '#79d9ff', accent: '#f8e7ff', glow: '#b59cff', shadow: '#342a65', metal: '#d8cbff' }),
  ]),
  ember: Object.freeze([
    Object.freeze({ key: 'ember-cinder', label: 'Cinder Bloom', primary: '#ff8d54', secondary: '#ffce6e', accent: '#fff3d6', glow: '#ff7a31', shadow: '#51231c', metal: '#c68f54' }),
    Object.freeze({ key: 'ember-ash', label: 'Ashfire', primary: '#ff7d4f', secondary: '#5f6772', accent: '#ffd7b5', glow: '#ff6425', shadow: '#201a1f', metal: '#8e7567' }),
  ]),
  moonlight: Object.freeze([
    Object.freeze({ key: 'moonlight-veil', label: 'Moonlight Veil', primary: '#cfd8ff', secondary: '#88b4ff', accent: '#f2efff', glow: '#b4c6ff', shadow: '#27335d', metal: '#d6dcff' }),
    Object.freeze({ key: 'moonlight-tide', label: 'Lunar Tide', primary: '#d9d2ff', secondary: '#79d4ff', accent: '#ffffff', glow: '#9fe9ff', shadow: '#283056', metal: '#ece6ff' }),
  ]),
  mechanical: Object.freeze([
    Object.freeze({ key: 'mech-alloy', label: 'Alloy Frame', primary: '#b9c7da', secondary: '#4e6ea5', accent: '#eaf4ff', glow: '#7be9ff', shadow: '#25324b', metal: '#cdd9eb' }),
    Object.freeze({ key: 'mech-carbon', label: 'Carbon Forge', primary: '#5a6578', secondary: '#ff62ca', accent: '#e7eef8', glow: '#83fbff', shadow: '#171e29', metal: '#90a0b5' }),
  ]),
  shadow: Object.freeze([
    Object.freeze({ key: 'shadow-rune', label: 'Shadow Rune', primary: '#272338', secondary: '#7a53d6', accent: '#ff9b70', glow: '#bd7cff', shadow: '#09090f', metal: '#6b5aa0' }),
    Object.freeze({ key: 'shadow-night', label: 'Night Majesty', primary: '#151a28', secondary: '#9f3344', accent: '#f2d0ca', glow: '#e46f51', shadow: '#07080c', metal: '#77606c' }),
  ]),
});

export const STRUCTURE_FAMILY_CONFIGS = Object.freeze({
  aetherPlume: Object.freeze({
    id: 'aetherPlume',
    label: 'Aether Plume',
    silhouette: 'swept-feather',
    membrane: false,
    primaryRange: Object.freeze([5, 10]),
    secondaryRange: Object.freeze([2, 6]),
    spanRange: Object.freeze([3.2, 4.55]),
    heightRange: Object.freeze([1.85, 2.95]),
    curveBias: 0.58,
    tipLift: 0.76,
    ornamentBias: Object.freeze({ haloBands: 1, crystalClusters: 1, ribbonTrails: 1, runeSigils: 0, crownSpurs: 1, emberNodes: 0 }),
  }),
  royalFiligree: Object.freeze({
    id: 'royalFiligree',
    label: 'Royal Filigree',
    silhouette: 'crown-feather',
    membrane: false,
    primaryRange: Object.freeze([4, 8]),
    secondaryRange: Object.freeze([2, 5]),
    spanRange: Object.freeze([3.0, 4.15]),
    heightRange: Object.freeze([1.9, 2.7]),
    curveBias: 0.44,
    tipLift: 0.58,
    ornamentBias: Object.freeze({ haloBands: 1, crystalClusters: 1, ribbonTrails: 0, runeSigils: 1, crownSpurs: 2, emberNodes: 0 }),
  }),
  crystalFan: Object.freeze({
    id: 'crystalFan',
    label: 'Crystal Fan',
    silhouette: 'faceted-fan',
    membrane: false,
    primaryRange: Object.freeze([4, 7]),
    secondaryRange: Object.freeze([1, 3]),
    spanRange: Object.freeze([2.9, 4.0]),
    heightRange: Object.freeze([1.7, 2.65]),
    curveBias: 0.36,
    tipLift: 0.42,
    ornamentBias: Object.freeze({ haloBands: 0, crystalClusters: 3, ribbonTrails: 0, runeSigils: 1, crownSpurs: 1, emberNodes: 0 }),
  }),
  emberBlade: Object.freeze({
    id: 'emberBlade',
    label: 'Ember Blade',
    silhouette: 'blade-ridge',
    membrane: true,
    primaryRange: Object.freeze([4, 7]),
    secondaryRange: Object.freeze([1, 3]),
    spanRange: Object.freeze([3.1, 4.4]),
    heightRange: Object.freeze([1.8, 2.8]),
    curveBias: 0.48,
    tipLift: 0.54,
    ornamentBias: Object.freeze({ haloBands: 0, crystalClusters: 1, ribbonTrails: 0, runeSigils: 1, crownSpurs: 1, emberNodes: 2 }),
  }),
  stormRibbon: Object.freeze({
    id: 'stormRibbon',
    label: 'Storm Ribbon',
    silhouette: 'ribbon-crest',
    membrane: true,
    primaryRange: Object.freeze([5, 8]),
    secondaryRange: Object.freeze([1, 4]),
    spanRange: Object.freeze([3.15, 4.5]),
    heightRange: Object.freeze([1.75, 2.65]),
    curveBias: 0.62,
    tipLift: 0.64,
    ornamentBias: Object.freeze({ haloBands: 1, crystalClusters: 0, ribbonTrails: 2, runeSigils: 2, crownSpurs: 0, emberNodes: 0 }),
  }),
  mechanicalAegis: Object.freeze({
    id: 'mechanicalAegis',
    label: 'Mechanical Aegis',
    silhouette: 'segment-aegis',
    membrane: false,
    primaryRange: Object.freeze([4, 8]),
    secondaryRange: Object.freeze([1, 4]),
    spanRange: Object.freeze([3.05, 4.25]),
    heightRange: Object.freeze([1.8, 2.7]),
    curveBias: 0.28,
    tipLift: 0.38,
    ornamentBias: Object.freeze({ haloBands: 0, crystalClusters: 1, ribbonTrails: 0, runeSigils: 1, crownSpurs: 2, emberNodes: 0 }),
  }),
});

export const GENERATOR_RARITY_PROFILES = Object.freeze({
  common: Object.freeze({
    value: 'common',
    label: 'Common',
    defaultDetailDensity: 'low',
    complexityScale: 0.78,
    ornamentBudget: 1,
    layerBoost: 0,
    glowIntensity: 0.14,
    preferredPalettes: ['nature', 'soft', 'light'],
    allowedStructures: ['aetherPlume', 'royalFiligree', 'stormRibbon'],
    allowedMaterials: ['starlitSilk', 'verdantFiligree', 'stormglass'],
  }),
  rare: Object.freeze({
    value: 'rare',
    label: 'Rare',
    defaultDetailDensity: 'medium',
    complexityScale: 0.92,
    ornamentBudget: 2,
    layerBoost: 1,
    glowIntensity: 0.24,
    preferredPalettes: ['energy', 'royal', 'moonlight'],
    allowedStructures: ['aetherPlume', 'royalFiligree', 'stormRibbon', 'mechanicalAegis'],
    allowedMaterials: ['starlitSilk', 'royalEnamel', 'stormglass', 'runeAether'],
  }),
  legendary: Object.freeze({
    value: 'legendary',
    label: 'Legendary',
    defaultDetailDensity: 'medium',
    complexityScale: 1.04,
    ornamentBudget: 3,
    layerBoost: 2,
    glowIntensity: 0.36,
    preferredPalettes: ['royal', 'energy', 'crystal'],
    allowedStructures: ['aetherPlume', 'royalFiligree', 'crystalFan', 'stormRibbon', 'mechanicalAegis'],
    allowedMaterials: ['starlitSilk', 'royalEnamel', 'crystalLattice', 'stormglass', 'runeAether'],
  }),
  legendaryLight: Object.freeze({
    value: 'legendaryLight',
    label: 'Legendary Light',
    defaultDetailDensity: 'high',
    complexityScale: 1.18,
    ornamentBudget: 4,
    layerBoost: 3,
    glowIntensity: 0.58,
    preferredPalettes: ['light', 'royal', 'crystal', 'moonlight'],
    allowedStructures: ['aetherPlume', 'royalFiligree', 'crystalFan', 'stormRibbon'],
    allowedMaterials: ['starlitSilk', 'royalEnamel', 'crystalLattice', 'stormglass', 'runeAether'],
  }),
  legendaryDark: Object.freeze({
    value: 'legendaryDark',
    label: 'Legendary Dark',
    defaultDetailDensity: 'high',
    complexityScale: 1.24,
    ornamentBudget: 4,
    layerBoost: 3,
    glowIntensity: 0.64,
    preferredPalettes: ['dark', 'shadow', 'ember', 'mechanical'],
    allowedStructures: ['royalFiligree', 'crystalFan', 'emberBlade', 'stormRibbon', 'mechanicalAegis'],
    allowedMaterials: ['royalEnamel', 'crystalLattice', 'emberForged', 'shadowObsidian', 'stormglass', 'runeAether'],
  }),
});

export const THEME_CONFIGS = Object.freeze({
  royal: Object.freeze({
    value: 'royal',
    label: 'Royal',
    preferredStructures: ['royalFiligree', 'aetherPlume'],
    preferredMaterials: ['royalEnamel', 'starlitSilk'],
    paletteFamilies: ['royal', 'light'],
    fitTemplateId: 'xio-wing-heroic',
  }),
  celestial: Object.freeze({
    value: 'celestial',
    label: 'Celestial',
    preferredStructures: ['aetherPlume', 'stormRibbon'],
    preferredMaterials: ['starlitSilk', 'runeAether'],
    paletteFamilies: ['light', 'moonlight'],
    fitTemplateId: 'xio-wing-master',
  }),
  light: Object.freeze({
    value: 'light',
    label: 'Light',
    preferredStructures: ['aetherPlume', 'crystalFan'],
    preferredMaterials: ['starlitSilk', 'crystalLattice'],
    paletteFamilies: ['light', 'crystal'],
    fitTemplateId: 'xio-wing-aerial',
  }),
  shadow: Object.freeze({
    value: 'shadow',
    label: 'Shadow',
    preferredStructures: ['royalFiligree', 'mechanicalAegis'],
    preferredMaterials: ['shadowObsidian', 'runeAether'],
    paletteFamilies: ['shadow', 'dark'],
    fitTemplateId: 'xio-wing-heroic',
  }),
  nature: Object.freeze({
    value: 'nature',
    label: 'Nature',
    preferredStructures: ['aetherPlume', 'stormRibbon'],
    preferredMaterials: ['verdantFiligree', 'starlitSilk'],
    paletteFamilies: ['nature', 'light'],
    fitTemplateId: 'xio-wing-aerial',
  }),
  mechanical: Object.freeze({
    value: 'mechanical',
    label: 'Mechanical',
    preferredStructures: ['mechanicalAegis', 'stormRibbon'],
    preferredMaterials: ['stormglass', 'royalEnamel'],
    paletteFamilies: ['mechanical', 'energy'],
    fitTemplateId: 'xio-wing-master',
  }),
  crystal: Object.freeze({
    value: 'crystal',
    label: 'Crystal',
    preferredStructures: ['crystalFan', 'aetherPlume'],
    preferredMaterials: ['crystalLattice', 'starlitSilk'],
    paletteFamilies: ['crystal', 'light'],
    fitTemplateId: 'xio-wing-aerial',
  }),
  arcane: Object.freeze({
    value: 'arcane',
    label: 'Arcane',
    preferredStructures: ['stormRibbon', 'royalFiligree'],
    preferredMaterials: ['runeAether', 'royalEnamel'],
    paletteFamilies: ['shadow', 'energy'],
    fitTemplateId: 'xio-wing-master',
  }),
  ember: Object.freeze({
    value: 'ember',
    label: 'Ember',
    preferredStructures: ['emberBlade', 'royalFiligree'],
    preferredMaterials: ['emberForged', 'shadowObsidian'],
    paletteFamilies: ['ember', 'dark'],
    fitTemplateId: 'xio-wing-heroic',
  }),
  frost: Object.freeze({
    value: 'frost',
    label: 'Frost',
    preferredStructures: ['crystalFan', 'aetherPlume'],
    preferredMaterials: ['crystalLattice', 'stormglass'],
    paletteFamilies: ['crystal', 'light'],
    fitTemplateId: 'xio-wing-aerial',
  }),
  moonlight: Object.freeze({
    value: 'moonlight',
    label: 'Moonlight',
    preferredStructures: ['aetherPlume', 'stormRibbon'],
    preferredMaterials: ['starlitSilk', 'runeAether'],
    paletteFamilies: ['moonlight', 'light'],
    fitTemplateId: 'xio-wing-master',
  }),
  sunflare: Object.freeze({
    value: 'sunflare',
    label: 'Sunflare',
    preferredStructures: ['emberBlade', 'aetherPlume'],
    preferredMaterials: ['royalEnamel', 'emberForged'],
    paletteFamilies: ['energy', 'light'],
    fitTemplateId: 'xio-wing-heroic',
  }),
  galaxy: Object.freeze({
    value: 'galaxy',
    label: 'Galaxy',
    preferredStructures: ['stormRibbon', 'aetherPlume'],
    preferredMaterials: ['runeAether', 'starlitSilk'],
    paletteFamilies: ['moonlight', 'shadow'],
    fitTemplateId: 'xio-wing-master',
  }),
  butterfly: Object.freeze({
    value: 'butterfly',
    label: 'Butterfly',
    preferredStructures: ['aetherPlume', 'crystalFan'],
    preferredMaterials: ['starlitSilk', 'verdantFiligree'],
    paletteFamilies: ['nature', 'royal'],
    fitTemplateId: 'xio-wing-aerial',
  }),
  dragon: Object.freeze({
    value: 'dragon',
    label: 'Dragon',
    preferredStructures: ['emberBlade', 'mechanicalAegis'],
    preferredMaterials: ['emberForged', 'shadowObsidian'],
    paletteFamilies: ['ember', 'dark'],
    fitTemplateId: 'xio-wing-heroic',
  }),
  rune: Object.freeze({
    value: 'rune',
    label: 'Rune',
    preferredStructures: ['stormRibbon', 'royalFiligree'],
    preferredMaterials: ['runeAether', 'stormglass'],
    paletteFamilies: ['energy', 'shadow'],
    fitTemplateId: 'xio-wing-master',
  }),
  storm: Object.freeze({
    value: 'storm',
    label: 'Storm',
    preferredStructures: ['stormRibbon', 'mechanicalAegis'],
    preferredMaterials: ['stormglass', 'runeAether'],
    paletteFamilies: ['energy', 'moonlight'],
    fitTemplateId: 'xio-wing-master',
  }),
  aether: Object.freeze({
    value: 'aether',
    label: 'Aether',
    preferredStructures: ['aetherPlume', 'stormRibbon'],
    preferredMaterials: ['starlitSilk', 'runeAether'],
    paletteFamilies: ['light', 'energy'],
    fitTemplateId: 'xio-wing-master',
  }),
});

export const CATEGORY_GENERATOR_CONFIGS = Object.freeze({
  wingSet: Object.freeze({
    key: 'wingSet',
    label: 'Wings',
    enabled: true,
    slotKey: 'wingSet',
    defaultFitTemplateId: 'xio-wing-master',
    allowedThemes: GENERATOR_THEME_OPTIONS.map((entry) => entry.value),
  }),
});

export const WING_BASE_REFERENCE_SIGNATURES = Object.freeze({
  blossomissWings: Object.freeze({ theme: 'butterfly', materialFamily: 'starlitSilk', paletteFamily: 'nature', fitTemplateId: 'xio-wing-aerial', structureFamily: 'aetherPlume' }),
  canvasOfNavelleWings: Object.freeze({ theme: 'shadow', materialFamily: 'shadowObsidian', paletteFamily: 'shadow', fitTemplateId: 'xio-wing-heroic', structureFamily: 'royalFiligree' }),
  goddessOfValleysWings: Object.freeze({ theme: 'nature', materialFamily: 'verdantFiligree', paletteFamily: 'nature', fitTemplateId: 'xio-wing-aerial', structureFamily: 'aetherPlume' }),
  honeycombBloomsWings: Object.freeze({ theme: 'royal', materialFamily: 'royalEnamel', paletteFamily: 'royal', fitTemplateId: 'xio-wing-aerial', structureFamily: 'royalFiligree' }),
  lavalcanoWings: Object.freeze({ theme: 'ember', materialFamily: 'emberForged', paletteFamily: 'ember', fitTemplateId: 'xio-wing-heroic', structureFamily: 'emberBlade' }),
  lightOfSmilesWings: Object.freeze({ theme: 'light', materialFamily: 'starlitSilk', paletteFamily: 'light', fitTemplateId: 'xio-wing-aerial', structureFamily: 'aetherPlume' }),
  moonlightAmayaWings: Object.freeze({ theme: 'moonlight', materialFamily: 'runeAether', paletteFamily: 'moonlight', fitTemplateId: 'xio-wing-master', structureFamily: 'stormRibbon' }),
  endlessWings: Object.freeze({ theme: 'galaxy', materialFamily: 'runeAether', paletteFamily: 'shadow', fitTemplateId: 'xio-wing-master', structureFamily: 'stormRibbon' }),
  emeraldCoenWings: Object.freeze({ theme: 'nature', materialFamily: 'verdantFiligree', paletteFamily: 'nature', fitTemplateId: 'xio-wing-master', structureFamily: 'aetherPlume' }),
  xatoriWings: Object.freeze({ theme: 'royal', materialFamily: 'royalEnamel', paletteFamily: 'royal', fitTemplateId: 'xio-wing-heroic', structureFamily: 'royalFiligree' }),
  alphaWings: Object.freeze({ theme: 'mechanical', materialFamily: 'stormglass', paletteFamily: 'mechanical', fitTemplateId: 'xio-wing-master', structureFamily: 'mechanicalAegis' }),
  rainbowWings: Object.freeze({ theme: 'celestial', materialFamily: 'starlitSilk', paletteFamily: 'energy', fitTemplateId: 'xio-wing-master', structureFamily: 'aetherPlume' }),
  roboticWings: Object.freeze({ theme: 'mechanical', materialFamily: 'stormglass', paletteFamily: 'mechanical', fitTemplateId: 'xio-wing-master', structureFamily: 'mechanicalAegis' }),
  omegaWings: Object.freeze({ theme: 'shadow', materialFamily: 'shadowObsidian', paletteFamily: 'dark', fitTemplateId: 'xio-wing-heroic', structureFamily: 'crystalFan' }),
  efernoWings: Object.freeze({ theme: 'ember', materialFamily: 'emberForged', paletteFamily: 'ember', fitTemplateId: 'xio-wing-heroic', structureFamily: 'emberBlade' }),
});

const fallbackReferenceSignature = (entry) => {
  const rarity = typeof entry?.rarity === 'string' ? entry.rarity : 'rare';
  if (rarity === 'legendaryLight') {
    return {
      theme: 'light',
      materialFamily: 'starlitSilk',
      paletteFamily: 'light',
      fitTemplateId: 'xio-wing-aerial',
      structureFamily: 'aetherPlume',
    };
  }
  if (rarity === 'legendaryDark') {
    return {
      theme: 'shadow',
      materialFamily: 'shadowObsidian',
      paletteFamily: 'dark',
      fitTemplateId: 'xio-wing-heroic',
      structureFamily: 'royalFiligree',
    };
  }
  return {
    theme: 'royal',
    materialFamily: 'royalEnamel',
    paletteFamily: 'royal',
    fitTemplateId: 'xio-wing-master',
    structureFamily: 'aetherPlume',
  };
};

export const inferWingReferenceSignature = (entry) => (
  WING_BASE_REFERENCE_SIGNATURES[entry?.key] || fallbackReferenceSignature(entry)
);

export function getGeneratorOptionLabel(options, value, fallback = 'Unknown') {
  return options.find((entry) => entry.value === value)?.label || fallback;
}

export function getWingBaseReferenceOptions(propCatalog = PROP_CATALOG) {
  const references = new Map();
  (Array.isArray(propCatalog) ? propCatalog : []).forEach((entry) => {
    const categoryKey = typeof entry?.categoryKey === 'string'
      ? entry.categoryKey
      : typeof entry?.category === 'string'
        ? entry.category
        : '';
    if (categoryKey !== 'wingSet') {
      return;
    }
    const key = typeof entry?.key === 'string' ? entry.key.trim() : '';
    const label = typeof entry?.label === 'string' ? entry.label.trim() : key;
    if (!key || !label || references.has(key)) {
      return;
    }
    const attachment = cloneAttachment(entry?.attachment);
    const signature = inferWingReferenceSignature(entry);
    references.set(key, Object.freeze({
      key,
      label,
      rarity: typeof entry?.rarity === 'string' ? entry.rarity : 'rare',
      attachment,
      assetUrl: typeof entry?.assetUrl === 'string' ? entry.assetUrl : null,
      factoryId: typeof entry?.factoryId === 'string' ? entry.factoryId : null,
      generatedRecipe: entry?.preview?.generated && typeof entry.preview.generated === 'object'
        ? entry.preview.generated
        : null,
      sourceKind: entry?.preview?.generated && typeof entry.preview.generated === 'object'
        ? 'generated'
        : typeof entry?.assetUrl === 'string'
          ? 'glb'
          : 'metadata',
      theme: signature.theme,
      materialFamily: signature.materialFamily,
      paletteFamily: signature.paletteFamily,
      fitTemplateId: signature.fitTemplateId,
      structureFamily: typeof signature.structureFamily === 'string' ? signature.structureFamily : null,
    }));
  });
  return [...references.values()].sort((left, right) => left.label.localeCompare(right.label));
}
