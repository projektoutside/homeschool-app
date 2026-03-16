import {
  RANDOM_PROP_GENERATOR_VERSION,
  GENERATED_PROCEDURAL_WING_FACTORY_ID,
  GENERATOR_CATEGORY_OPTIONS,
  GENERATOR_RARITY_OPTIONS,
  GENERATOR_THEME_MODE_OPTIONS,
  GENERATOR_DETAIL_DENSITY_OPTIONS,
  GENERATOR_COLOR_HARMONY_OPTIONS,
  GENERATOR_FIT_MODE_OPTIONS,
  GENERATOR_THEME_OPTIONS,
  FIT_TEMPLATE_PROFILES,
  MATERIAL_FAMILY_CONFIGS,
  PALETTE_LIBRARY,
  STRUCTURE_FAMILY_CONFIGS,
  GENERATOR_RARITY_PROFILES,
  THEME_CONFIGS,
  CATEGORY_GENERATOR_CONFIGS,
  cloneGeneratorAttachment,
  getGeneratorOptionLabel,
  getWingBaseReferenceOptions,
  inferWingReferenceSignature,
} from './random-prop-generator-config.js';

const DEFAULT_THEME_VALUE = 'royal';
const DEFAULT_RARITY_VALUE = 'rare';
const DEFAULT_CATEGORY_VALUE = 'wingSet';
const DEFAULT_THEME_MODE = 'fullyRandom';
const DEFAULT_DETAIL_DENSITY = 'autoByRarity';
const DEFAULT_COLOR_HARMONY = 'auto';
const DEFAULT_FIT_MODE = 'useMasterTemplate';

const DETAIL_DENSITY_SCALE = Object.freeze({
  low: 0.86,
  medium: 1,
  high: 1.16,
});

const COLOR_HARMONY_TO_PALETTE_FAMILY = Object.freeze({
  auto: null,
  soft: 'light',
  bold: 'energy',
  royal: 'royal',
  dark: 'dark',
  light: 'light',
  nature: 'nature',
  energy: 'energy',
});

const STRUCTURE_NAME_LIBRARY = Object.freeze({
  aetherPlume: Object.freeze(['Aether Plume', 'Skycrest', 'Lumen Feather']),
  royalFiligree: Object.freeze(['Regalia Crest', 'Sovereign Filigree', 'Majesty Veil']),
  crystalFan: Object.freeze(['Prism Bloom', 'Crystal Veil', 'Facet Halo']),
  emberBlade: Object.freeze(['Cinder Blade', 'Inferno Crest', 'Ember Talon']),
  stormRibbon: Object.freeze(['Storm Ribbon', 'Tempest Veil', 'Aether Gale']),
  mechanicalAegis: Object.freeze(['Aegis Frame', 'Flux Guard', 'Arc Alloy']),
});

const THEME_NAME_LIBRARY = Object.freeze({
  royal: Object.freeze(['Royal', 'Sovereign', 'Regal']),
  celestial: Object.freeze(['Celestial', 'Astral', 'Starwoven']),
  light: Object.freeze(['Radiant', 'Dawnlit', 'Haloed']),
  shadow: Object.freeze(['Shadow', 'Nightbound', 'Twilight']),
  nature: Object.freeze(['Verdant', 'Blooming', 'Wildheart']),
  mechanical: Object.freeze(['Mechanical', 'Alloy', 'Gearbound']),
  crystal: Object.freeze(['Crystal', 'Prismatic', 'Lattice']),
  arcane: Object.freeze(['Arcane', 'Spellwoven', 'Sigilborn']),
  ember: Object.freeze(['Ember', 'Cinder', 'Infernal']),
  frost: Object.freeze(['Frost', 'Glacial', 'Snowglass']),
  moonlight: Object.freeze(['Moonlight', 'Lunar', 'Silverveil']),
  sunflare: Object.freeze(['Sunflare', 'Solstice', 'Daybreak']),
  galaxy: Object.freeze(['Galaxy', 'Nebula', 'Voidlight']),
  butterfly: Object.freeze(['Butterfly', 'Petalwing', 'Bloomveil']),
  dragon: Object.freeze(['Dragon', 'Drakeshard', 'Wyrmcrest']),
  rune: Object.freeze(['Rune', 'Glyphbound', 'Inscribed']),
  storm: Object.freeze(['Storm', 'Tempest', 'Thunderveil']),
  aether: Object.freeze(['Aether', 'Skyborne', 'Liftrune']),
});

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cloneJson = (value, fallback = null) => {
  if (value === undefined) {
    return fallback;
  }
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to JSON cloning.
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (start, end, alpha) => start + ((end - start) * alpha);

const normalizeValue = (value) => (
  typeof value === 'string'
    ? value.trim()
    : ''
);

const normalizeSlug = (value) => (
  normalizeValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
);

const hashString = (value) => {
  let hash = 2166136261;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeed = (parts) => {
  const seedInput = parts.filter(Boolean).join('|');
  const randomPart = `${Date.now()}|${Math.random()}`;
  return hashString(`${seedInput}|${randomPart}`) || 1;
};

const mulberry32 = (seed) => {
  let current = seed >>> 0;
  return () => {
    current = (current + 0x6d2b79f5) >>> 0;
    let next = Math.imul(current ^ (current >>> 15), 1 | current);
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};

const pickRandom = (rng, values, fallback = null) => {
  if (!Array.isArray(values) || values.length === 0) {
    return fallback;
  }
  const index = Math.floor(clamp(rng(), 0, 0.999999) * values.length);
  return values[index] ?? fallback;
};

const resolveThemeOption = (value) => {
  const normalized = normalizeSlug(value);
  if (!normalized) {
    return null;
  }
  return GENERATOR_THEME_OPTIONS.find((entry) => normalizeSlug(entry.value) === normalized || normalizeSlug(entry.label) === normalized) || null;
};

const resolveThemeConfig = (value) => {
  const option = resolveThemeOption(value);
  return option ? THEME_CONFIGS[option.value] || null : null;
};

const resolveCategoryOption = (value) => (
  GENERATOR_CATEGORY_OPTIONS.find((entry) => entry.value === value) || null
);

const resolveRarityProfile = (value) => GENERATOR_RARITY_PROFILES[value] || null;

const resolveFitTemplateProfile = (fitTemplateId) => FIT_TEMPLATE_PROFILES[fitTemplateId] || null;

const resolveMaterialFamily = (materialFamilyId) => MATERIAL_FAMILY_CONFIGS[materialFamilyId] || null;

const resolveStructureFamily = (structureFamilyId) => STRUCTURE_FAMILY_CONFIGS[structureFamilyId] || null;

const hasReferenceGuidedFitMode = (fitMode) => (
  fitMode === 'matchExistingProp' || fitMode === 'copyWingTemplate'
);

const averageAttachmentScale = (attachment, fallback = 1.9) => {
  const scale = Array.isArray(attachment?.scale) ? attachment.scale : null;
  if (!scale?.length) {
    return fallback;
  }
  const values = scale
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) {
    return fallback;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const resolveTemplateReferenceGeneratedRecipe = (templateReference) => (
  isPlainObject(templateReference?.generatedRecipe) ? templateReference.generatedRecipe : null
);

const resolveTemplateReferenceMetrics = (templateReference) => (
  isPlainObject(templateReference?.metrics) ? templateReference.metrics : null
);

const resolveTemplateReferenceStructureFamily = (templateReference, baseReference = null) => {
  const generatedRecipe = resolveTemplateReferenceGeneratedRecipe(templateReference);
  const generatedFamily = normalizeValue(generatedRecipe?.structureRecipe?.family);
  if (generatedFamily) {
    return generatedFamily;
  }
  const directFamily = normalizeValue(templateReference?.structureFamily);
  if (directFamily) {
    return directFamily;
  }
  const baseFamily = normalizeValue(baseReference?.structureFamily);
  if (baseFamily) {
    return baseFamily;
  }
  const referenceSignature = baseReference ? inferWingReferenceSignature(baseReference) : null;
  return normalizeValue(referenceSignature?.structureFamily);
};

const clampToRange = (value, range, fallback, extraMax = 0) => {
  const [min, max] = Array.isArray(range) ? range : [fallback, fallback];
  return clamp(Number.isFinite(Number(value)) ? Number(value) : fallback, min, max + extraMax);
};

const getReferenceTemplateLabel = (baseReference, fitMode) => (
  baseReference?.label
    ? fitMode === 'copyWingTemplate'
      ? `${baseReference.label} (guide only)`
      : baseReference.label
    : 'Auto Select'
);

const clampScaleToEnvelope = (scaleValues, scaleEnvelope, fallbackScale = [1.9, 1.9, 1.9]) => {
  const min = Number(scaleEnvelope?.min) || 1.4;
  const max = Number(scaleEnvelope?.max) || 2.6;
  const source = Array.isArray(scaleValues) ? scaleValues : fallbackScale;
  return [0, 1, 2].map((index) => (
    clamp(Number(source[index]) || Number(fallbackScale[index]) || min, min, max)
  ));
};

const deriveSafeFitAttachment = ({
  fitTemplate,
  attachment,
  fitMode = DEFAULT_FIT_MODE,
}) => {
  const templateAttachment = cloneGeneratorAttachment(fitTemplate?.attachment);
  const templateScale = Array.isArray(templateAttachment.scale) ? templateAttachment.scale : [1.9, 1.9, 1.9];
  const templatePosition = Array.isArray(templateAttachment.position) ? templateAttachment.position : [0.72, -0.24, 0.08];
  const templateRotation = Array.isArray(templateAttachment.rotation) ? templateAttachment.rotation : [0.02, 0.06, -0.02];
  const envelope = fitTemplate?.scaleEnvelope || { min: 1.4, max: 2.6 };
  const sourceAttachment = cloneGeneratorAttachment(attachment || templateAttachment);
  const safeAttachment = cloneGeneratorAttachment(templateAttachment);
  const sourceScale = Array.isArray(sourceAttachment.scale) ? sourceAttachment.scale : templateScale;
  const useReferenceOffsets = hasReferenceGuidedFitMode(fitMode);
  const referenceBlend = fitMode === 'copyWingTemplate' ? 0.44 : 0.28;
  const positionClamp = fitMode === 'copyWingTemplate' ? 0.24 : 0.18;
  const rotationClamp = fitMode === 'copyWingTemplate' ? 0.28 : 0.22;
  const sourceScaleLooksSafe = sourceScale.every((value) => (
    value >= (envelope.min * 0.85) && value <= (envelope.max * 1.15)
  ));

  safeAttachment.position = templatePosition.map((value, index) => {
    if (!useReferenceOffsets) return value;
    return clamp(
      lerp(value, Number(sourceAttachment.position[index]) || value, referenceBlend),
      value - positionClamp,
      value + positionClamp,
    );
  });
  safeAttachment.rotation = templateRotation.map((value, index) => {
    if (!useReferenceOffsets) return value;
    return clamp(
      lerp(value, Number(sourceAttachment.rotation[index]) || value, fitMode === 'copyWingTemplate' ? 0.42 : 0.35),
      value - rotationClamp,
      value + rotationClamp,
    );
  });
  safeAttachment.scale = sourceScaleLooksSafe
    ? clampScaleToEnvelope(sourceScale, envelope, templateScale)
    : clampScaleToEnvelope(templateScale, envelope, templateScale);
  safeAttachment.fit = cloneJson(templateAttachment.fit, templateAttachment.fit);
  if (useReferenceOffsets && safeAttachment.fit && isPlainObject(sourceAttachment.fit)) {
    safeAttachment.fit.yOffsetRatio = clamp(
      lerp(safeAttachment.fit.yOffsetRatio, Number(sourceAttachment.fit.yOffsetRatio) || safeAttachment.fit.yOffsetRatio, fitMode === 'copyWingTemplate' ? 0.4 : 0.24),
      safeAttachment.fit.yOffsetRatio - 0.18,
      safeAttachment.fit.yOffsetRatio + 0.18,
    );
    safeAttachment.fit.zOffsetRatio = clamp(
      lerp(safeAttachment.fit.zOffsetRatio, Number(sourceAttachment.fit.zOffsetRatio) || safeAttachment.fit.zOffsetRatio, fitMode === 'copyWingTemplate' ? 0.38 : 0.22),
      safeAttachment.fit.zOffsetRatio - 0.1,
      safeAttachment.fit.zOffsetRatio + 0.1,
    );
    safeAttachment.fit.distanceMultiplier = clamp(
      lerp(safeAttachment.fit.distanceMultiplier, Number(sourceAttachment.fit.distanceMultiplier) || safeAttachment.fit.distanceMultiplier, fitMode === 'copyWingTemplate' ? 0.36 : 0.22),
      safeAttachment.fit.distanceMultiplier - 0.22,
      safeAttachment.fit.distanceMultiplier + 0.22,
    );
  }
  safeAttachment.mirrorMode = 'paired';
  return safeAttachment;
};

const normalizeGeneratedPalette = (palette) => {
  if (!isPlainObject(palette)) {
    return null;
  }
  const requiredKeys = ['primary', 'secondary', 'accent', 'glow', 'shadow', 'metal'];
  if (requiredKeys.some((key) => typeof palette[key] !== 'string' || palette[key].trim().length === 0)) {
    return null;
  }
  return {
    key: typeof palette.key === 'string' ? palette.key : normalizeSlug(`${palette.primary}-${palette.secondary}`),
    label: typeof palette.label === 'string' ? palette.label : 'Generated Palette',
    primary: palette.primary.trim(),
    secondary: palette.secondary.trim(),
    accent: palette.accent.trim(),
    glow: palette.glow.trim(),
    shadow: palette.shadow.trim(),
    metal: palette.metal.trim(),
  };
};

const normalizeStructureRecipe = (recipe) => {
  if (!isPlainObject(recipe)) {
    return null;
  }
  const family = resolveStructureFamily(recipe.family);
  if (!family) {
    return null;
  }
  return {
    family: family.id,
    silhouette: typeof recipe.silhouette === 'string' ? recipe.silhouette : family.silhouette,
    membrane: recipe.membrane === true || recipe.membrane === false ? recipe.membrane : family.membrane,
    span: clamp(Number(recipe.span) || family.spanRange[0], 2.4, 5.9),
    height: clamp(Number(recipe.height) || family.heightRange[0], 1.4, 4.4),
    primaryLayerCount: clamp(Math.round(Number(recipe.primaryLayerCount) || family.primaryRange[0]), 3, 12),
    secondaryLayerCount: clamp(Math.round(Number(recipe.secondaryLayerCount) || family.secondaryRange[0]), 0, 9),
    featherLength: clamp(Number(recipe.featherLength) || 1.12, 0.6, 2.2),
    featherWidth: clamp(Number(recipe.featherWidth) || 0.28, 0.12, 0.76),
    innerLift: clamp(Number(recipe.innerLift) || family.tipLift, 0.16, 1.35),
    outerSweep: clamp(Number(recipe.outerSweep) || family.curveBias, 0.1, 1.2),
    crestCount: clamp(Math.round(Number(recipe.crestCount) || 1), 0, 4),
    tipFlare: clamp(Number(recipe.tipFlare) || 0.28, 0, 0.95),
  };
};

const normalizeOrnamentRecipe = (recipe) => {
  if (!isPlainObject(recipe)) {
    return null;
  }
  return {
    haloBands: clamp(Math.round(Number(recipe.haloBands) || 0), 0, 3),
    crystalClusters: clamp(Math.round(Number(recipe.crystalClusters) || 0), 0, 4),
    runeSigils: clamp(Math.round(Number(recipe.runeSigils) || 0), 0, 5),
    ribbonTrails: clamp(Math.round(Number(recipe.ribbonTrails) || 0), 0, 3),
    emberNodes: clamp(Math.round(Number(recipe.emberNodes) || 0), 0, 4),
    crownSpurs: clamp(Math.round(Number(recipe.crownSpurs) || 0), 0, 4),
    glowMode: typeof recipe.glowMode === 'string' ? recipe.glowMode : 'soft',
    ornamentBudget: clamp(Math.round(Number(recipe.ornamentBudget) || 0), 0, 6),
  };
};

const normalizeDisplaySummary = (summary) => (
  isPlainObject(summary)
    ? {
      categoryLabel: typeof summary.categoryLabel === 'string' ? summary.categoryLabel : 'Wings',
      rarityLabel: typeof summary.rarityLabel === 'string' ? summary.rarityLabel : 'Rare',
      themeLabel: typeof summary.themeLabel === 'string' ? summary.themeLabel : 'Royal',
      detailLabel: typeof summary.detailLabel === 'string' ? summary.detailLabel : 'Medium',
      materialDirection: typeof summary.materialDirection === 'string' ? summary.materialDirection : 'Balanced',
      fitLabel: typeof summary.fitLabel === 'string' ? summary.fitLabel : 'XiO Wing Master Template',
      baseReferenceLabel: typeof summary.baseReferenceLabel === 'string' ? summary.baseReferenceLabel : 'Auto Select',
    }
    : null
);

export function isGeneratedPropPreview(preview) {
  return Boolean(
    isPlainObject(preview)
    && isPlainObject(preview.generated)
    && normalizeValue(preview.generated.category) === DEFAULT_CATEGORY_VALUE
  );
}

export function normalizeGeneratedWingRecipe(value) {
  if (!isPlainObject(value) || normalizeValue(value.category) !== DEFAULT_CATEGORY_VALUE) {
    return null;
  }

  const rarityProfile = resolveRarityProfile(value.rarityProfile);
  const themeConfig = resolveThemeConfig(value.theme);
  const fitTemplate = resolveFitTemplateProfile(value.fitTemplateId);
  const materialFamily = resolveMaterialFamily(value.materialFamily);
  const palette = normalizeGeneratedPalette(value.palette);
  const structureRecipe = normalizeStructureRecipe(value.structureRecipe);
  const ornamentRecipe = normalizeOrnamentRecipe(value.ornamentRecipe);
  if (!rarityProfile || !themeConfig || !fitTemplate || !materialFamily || !palette || !structureRecipe || !ornamentRecipe) {
    return null;
  }

  const fitAttachment = deriveSafeFitAttachment({
    fitTemplate,
    attachment: value.fitAttachment || fitTemplate.attachment,
    fitMode: value.fitMode,
  });

  return {
    version: Number.isFinite(Number(value.version)) ? Number(value.version) : RANDOM_PROP_GENERATOR_VERSION,
    seed: Number.isFinite(Number(value.seed)) ? Number(value.seed) : null,
    category: DEFAULT_CATEGORY_VALUE,
    theme: themeConfig.value,
    themeLabel: themeConfig.label,
    themeMode: GENERATOR_THEME_MODE_OPTIONS.some((entry) => entry.value === value.themeMode)
      ? value.themeMode
      : DEFAULT_THEME_MODE,
    rarityProfile: rarityProfile.value,
    fitTemplateId: fitTemplate.id,
    fitMode: GENERATOR_FIT_MODE_OPTIONS.some((entry) => entry.value === value.fitMode)
      ? value.fitMode
      : DEFAULT_FIT_MODE,
    templateStrategy: normalizeValue(value.templateStrategy) || null,
    baseReferenceKey: typeof value.baseReferenceKey === 'string' && value.baseReferenceKey.trim().length > 0
      ? value.baseReferenceKey.trim()
      : null,
    templateReferenceKey: typeof value.templateReferenceKey === 'string' && value.templateReferenceKey.trim().length > 0
      ? value.templateReferenceKey.trim()
      : null,
    templateSourceKind: typeof value.templateSourceKind === 'string' && value.templateSourceKind.trim().length > 0
      ? value.templateSourceKind.trim()
      : null,
    materialFamily: materialFamily.id,
    colorHarmonyMode: GENERATOR_COLOR_HARMONY_OPTIONS.some((entry) => entry.value === value.colorHarmonyMode)
      ? value.colorHarmonyMode
      : DEFAULT_COLOR_HARMONY,
    detailDensity: GENERATOR_DETAIL_DENSITY_OPTIONS.some((entry) => entry.value === value.detailDensity)
      ? value.detailDensity
      : rarityProfile.defaultDetailDensity,
    palette,
    structureRecipe,
    ornamentRecipe,
    fitAttachment,
    displaySummary: normalizeDisplaySummary(value.displaySummary),
  };
}

const normalizeRequestedTheme = (value) => {
  const resolved = resolveThemeOption(value);
  return resolved ? resolved.value : '';
};

const createExistingKeySet = (existingProps) => {
  const values = Array.isArray(existingProps) ? existingProps : [];
  return new Set(
    values
      .map((entry) => normalizeSlug(typeof entry?.key === 'string' ? entry.key : ''))
      .filter(Boolean)
  );
};

const buildUniqueKey = (label, existingKeys) => {
  const baseKey = normalizeSlug(label) || 'generated-wing-prop';
  if (!existingKeys.has(baseKey)) {
    return baseKey;
  }
  let suffix = 2;
  while (existingKeys.has(`${baseKey}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseKey}-${suffix}`;
};

const buildThemeDescriptor = (rng, themeValue) => pickRandom(rng, THEME_NAME_LIBRARY[themeValue] || [getGeneratorOptionLabel(GENERATOR_THEME_OPTIONS, themeValue, 'Generated')], 'Generated');

const buildStructureDescriptor = (rng, structureFamilyId) => pickRandom(rng, STRUCTURE_NAME_LIBRARY[structureFamilyId] || ['Wing'], 'Wing');

const resolvePaletteFamily = ({ themeConfig, colorHarmonyMode, rarityProfile, baseReference }) => {
  const harmonyFamily = COLOR_HARMONY_TO_PALETTE_FAMILY[colorHarmonyMode] || null;
  if (harmonyFamily && Array.isArray(PALETTE_LIBRARY[harmonyFamily]) && PALETTE_LIBRARY[harmonyFamily].length) {
    return harmonyFamily;
  }
  const referenceFamily = normalizeValue(baseReference?.paletteFamily);
  if (referenceFamily && Array.isArray(PALETTE_LIBRARY[referenceFamily]) && PALETTE_LIBRARY[referenceFamily].length) {
    return referenceFamily;
  }
  const themeFamily = themeConfig.paletteFamilies.find((family) => Array.isArray(PALETTE_LIBRARY[family]) && PALETTE_LIBRARY[family].length);
  if (themeFamily) {
    return themeFamily;
  }
  const rarityFamily = (rarityProfile.preferredPalettes || []).find((family) => Array.isArray(PALETTE_LIBRARY[family]) && PALETTE_LIBRARY[family].length);
  return rarityFamily || 'royal';
};

const resolveGeneratedTheme = ({ input, baseReference, categoryConfig, rng }) => {
  if (input.themeMode === 'guidedTheme') {
    const guidedThemeValue = normalizeRequestedTheme(input.themeInput);
    return resolveThemeConfig(guidedThemeValue || DEFAULT_THEME_VALUE);
  }
  if (input.themeMode === 'matchExistingStyle' || (input.fitMode === 'copyWingTemplate' && normalizeValue(baseReference?.theme))) {
    const referenceTheme = normalizeValue(baseReference?.theme);
    return resolveThemeConfig(referenceTheme || DEFAULT_THEME_VALUE);
  }
  const choices = categoryConfig.allowedThemes
    .map((value) => THEME_CONFIGS[value])
    .filter(Boolean);
  return pickRandom(rng, choices, THEME_CONFIGS[DEFAULT_THEME_VALUE]);
};

const resolveBaseReference = ({ input, baseReferenceOptions, themeMode, rng }) => {
  const requestedKey = normalizeValue(input.baseReferenceKey);
  const references = Array.isArray(baseReferenceOptions) ? baseReferenceOptions : [];
  const requestedReference = requestedKey
    ? references.find((entry) => entry.key === requestedKey) || null
    : null;
  if (requestedReference) {
    return requestedReference;
  }
  if (!references.length) {
    return null;
  }
  if (themeMode === 'matchExistingStyle') {
    return pickRandom(rng, references, references[0]);
  }
  return references[0];
};

const resolveMaterialFamilyForRecipe = ({ themeConfig, rarityProfile, baseReference, input, templateReference, rng }) => {
  if (input.fitMode === 'copyWingTemplate') {
    const generatedRecipe = resolveTemplateReferenceGeneratedRecipe(templateReference);
    const copiedFamily = normalizeValue(generatedRecipe?.materialFamily || templateReference?.materialFamily || baseReference?.materialFamily);
    if (copiedFamily && rarityProfile.allowedMaterials.includes(copiedFamily)) {
      return resolveMaterialFamily(copiedFamily);
    }
  }
  const themePreferred = themeConfig.preferredMaterials.filter((value) => rarityProfile.allowedMaterials.includes(value));
  if (themePreferred.length) {
    return resolveMaterialFamily(pickRandom(rng, themePreferred, themePreferred[0]));
  }
  const fallbackFamily = normalizeValue(baseReference?.materialFamily);
  if (fallbackFamily && rarityProfile.allowedMaterials.includes(fallbackFamily)) {
    return resolveMaterialFamily(fallbackFamily);
  }
  return resolveMaterialFamily(rarityProfile.allowedMaterials[0] || 'royalEnamel');
};

const resolveStructureFamilyForRecipe = ({ themeConfig, rarityProfile, baseReference, input, templateReference, rng }) => {
  if (input.fitMode === 'copyWingTemplate') {
    const copiedFamily = resolveTemplateReferenceStructureFamily(templateReference, baseReference);
    if (copiedFamily && rarityProfile.allowedStructures.includes(copiedFamily)) {
      return resolveStructureFamily(copiedFamily);
    }
  }
  const themePreferred = themeConfig.preferredStructures.filter((value) => rarityProfile.allowedStructures.includes(value));
  if (themePreferred.length) {
    return resolveStructureFamily(pickRandom(rng, themePreferred, themePreferred[0]));
  }
  const referenceSignature = baseReference ? inferWingReferenceSignature(baseReference) : null;
  const referenceThemeConfig = referenceSignature ? resolveThemeConfig(referenceSignature.theme) : null;
  const referenceStructure = referenceThemeConfig?.preferredStructures?.find((value) => rarityProfile.allowedStructures.includes(value));
  if (referenceStructure) {
    return resolveStructureFamily(referenceStructure);
  }
  return resolveStructureFamily(rarityProfile.allowedStructures[0] || 'aetherPlume');
};

const resolveDetailDensity = (input, rarityProfile) => (
  input.detailDensity === 'autoByRarity'
    ? rarityProfile.defaultDetailDensity
    : GENERATOR_DETAIL_DENSITY_OPTIONS.some((entry) => entry.value === input.detailDensity)
      ? input.detailDensity
      : rarityProfile.defaultDetailDensity
);

const computeCountFromRange = (rng, range, rarityProfile, detailDensity, extraBoost = 0) => {
  const [min, max] = Array.isArray(range) ? range : [0, 0];
  const densityScale = DETAIL_DENSITY_SCALE[detailDensity] || 1;
  const base = min + ((max - min) * clamp((0.45 + rng() * 0.55) * rarityProfile.complexityScale * densityScale, 0, 1.15));
  return clamp(Math.round(base + extraBoost), min, max + extraBoost);
};

const buildStructureRecipe = ({
  rng,
  structureFamily,
  rarityProfile,
  detailDensity,
  templateReference = null,
  fitTemplate = null,
}) => {
  const primaryLayerCount = computeCountFromRange(rng, structureFamily.primaryRange, rarityProfile, detailDensity, rarityProfile.layerBoost);
  const secondaryLayerCount = computeCountFromRange(rng, structureFamily.secondaryRange, rarityProfile, detailDensity, Math.max(0, rarityProfile.layerBoost - 1));
  const scaleVariance = 0.92 + (rng() * 0.16);
  const recipe = {
    family: structureFamily.id,
    silhouette: structureFamily.silhouette,
    membrane: structureFamily.membrane,
    span: Number((pickRandom(rng, [structureFamily.spanRange[0], structureFamily.spanRange[1]], structureFamily.spanRange[0]) * scaleVariance).toFixed(3)),
    height: Number((pickRandom(rng, [structureFamily.heightRange[0], structureFamily.heightRange[1]], structureFamily.heightRange[0]) * (0.96 + rng() * 0.12)).toFixed(3)),
    primaryLayerCount,
    secondaryLayerCount,
    featherLength: Number((0.9 + (primaryLayerCount * 0.08) + rng() * 0.18).toFixed(3)),
    featherWidth: Number((0.18 + (rarityProfile.complexityScale * 0.08) + rng() * 0.1).toFixed(3)),
    innerLift: Number((structureFamily.tipLift + (rarityProfile.glowIntensity * 0.35) + ((rng() - 0.5) * 0.12)).toFixed(3)),
    outerSweep: Number((structureFamily.curveBias + ((rng() - 0.5) * 0.12)).toFixed(3)),
    crestCount: clamp(Math.round((rarityProfile.ornamentBudget - 1) * 0.5 + rng()), 0, 4),
    tipFlare: Number((0.18 + (rarityProfile.complexityScale * 0.14) + rng() * 0.12).toFixed(3)),
  };
  const generatedTemplateRecipe = resolveTemplateReferenceGeneratedRecipe(templateReference)?.structureRecipe;
  const templateMetrics = resolveTemplateReferenceMetrics(templateReference);
  if (!generatedTemplateRecipe && !templateMetrics) {
    return recipe;
  }

  const fitTemplateScaleAverage = averageAttachmentScale(fitTemplate?.attachment, 1.9);
  const referenceScaleAverage = Number.isFinite(Number(templateMetrics?.attachmentScaleAverage))
    ? Number(templateMetrics.attachmentScaleAverage)
    : averageAttachmentScale(templateReference?.attachment, fitTemplateScaleAverage);
  const referenceScaleBias = clamp(referenceScaleAverage / Math.max(fitTemplateScaleAverage, 0.001), 0.84, 1.18);
  const spreadRatio = clamp(Number(templateMetrics?.spreadRatio) || 1.8, 1.1, 3.4);
  const verticalRatio = clamp(Number(templateMetrics?.verticalRatio) || 0.58, 0.24, 1.1);
  const depthRatio = clamp(Number(templateMetrics?.depthRatio) || 0.12, 0.04, 0.56);
  const wideBias = clamp((spreadRatio - 1.55) / 1.1, 0, 1.2);
  const tallBias = clamp((verticalRatio - 0.42) / 0.34, 0, 1.15);
  const depthBias = clamp((depthRatio - 0.08) / 0.22, 0, 1.2);

  recipe.span = clampToRange(
    generatedTemplateRecipe
      ? lerp(recipe.span, Number(generatedTemplateRecipe.span || recipe.span) * (0.9 + (rng() * 0.22)), 0.72)
      : recipe.span * clamp(referenceScaleBias * (0.92 + (wideBias * 0.12)), 0.84, 1.2),
    structureFamily.spanRange,
    recipe.span,
    0.55,
  );
  recipe.height = clampToRange(
    generatedTemplateRecipe
      ? lerp(recipe.height, Number(generatedTemplateRecipe.height || recipe.height) * (0.9 + (rng() * 0.2)), 0.7)
      : recipe.height * clamp((0.94 + (tallBias * 0.18) + ((referenceScaleBias - 1) * 0.18)), 0.84, 1.2),
    structureFamily.heightRange,
    recipe.height,
    0.5,
  );
  recipe.primaryLayerCount = clamp(
    Math.round(
      generatedTemplateRecipe
        ? lerp(recipe.primaryLayerCount, Number(generatedTemplateRecipe.primaryLayerCount || recipe.primaryLayerCount) + ((rng() - 0.5) * 2.4), 0.74)
        : recipe.primaryLayerCount + (wideBias * 2.2) + (depthBias * 0.8) + ((rng() - 0.5) * 1.4),
    ),
    structureFamily.primaryRange[0],
    structureFamily.primaryRange[1] + rarityProfile.layerBoost + 3,
  );
  recipe.secondaryLayerCount = clamp(
    Math.round(
      generatedTemplateRecipe
        ? lerp(recipe.secondaryLayerCount, Number(generatedTemplateRecipe.secondaryLayerCount || recipe.secondaryLayerCount) + ((rng() - 0.5) * 2), 0.66)
        : recipe.secondaryLayerCount + (tallBias * 1.2) + ((rng() - 0.5) * 1.1),
    ),
    structureFamily.secondaryRange[0],
    structureFamily.secondaryRange[1] + Math.max(1, rarityProfile.layerBoost) + 2,
  );
  recipe.featherLength = clamp(
    generatedTemplateRecipe
      ? lerp(recipe.featherLength, Number(generatedTemplateRecipe.featherLength || recipe.featherLength) * (0.92 + (rng() * 0.18)), 0.68)
      : recipe.featherLength * clamp((0.96 + (tallBias * 0.1) + (wideBias * 0.08)), 0.84, 1.22),
    0.6,
    2.25,
  );
  recipe.featherWidth = clamp(
    generatedTemplateRecipe
      ? lerp(recipe.featherWidth, Number(generatedTemplateRecipe.featherWidth || recipe.featherWidth) * (0.9 + (rng() * 0.16)), 0.64)
      : recipe.featherWidth * clamp((0.96 + (depthBias * 0.18) + (wideBias * 0.08)), 0.82, 1.28),
    0.12,
    0.82,
  );
  recipe.innerLift = clamp(
    generatedTemplateRecipe
      ? lerp(recipe.innerLift, Number(generatedTemplateRecipe.innerLift || recipe.innerLift) + ((rng() - 0.5) * 0.14), 0.7)
      : lerp(recipe.innerLift, structureFamily.tipLift + (tallBias * 0.18) - (wideBias * 0.06), 0.48),
    0.16,
    1.35,
  );
  recipe.outerSweep = clamp(
    generatedTemplateRecipe
      ? lerp(recipe.outerSweep, Number(generatedTemplateRecipe.outerSweep || recipe.outerSweep) + ((rng() - 0.5) * 0.14), 0.72)
      : lerp(recipe.outerSweep, structureFamily.curveBias + (wideBias * 0.2) + (tallBias * 0.04), 0.52),
    0.1,
    1.2,
  );
  recipe.crestCount = clamp(
    Math.round(
      generatedTemplateRecipe
        ? lerp(recipe.crestCount, Number(generatedTemplateRecipe.crestCount || recipe.crestCount) + ((rng() - 0.5) * 1.2), 0.64)
        : recipe.crestCount + (depthBias * 0.6),
    ),
    0,
    4,
  );
  recipe.tipFlare = clamp(
    generatedTemplateRecipe
      ? lerp(recipe.tipFlare, Number(generatedTemplateRecipe.tipFlare || recipe.tipFlare) + ((rng() - 0.5) * 0.12), 0.66)
      : lerp(recipe.tipFlare, recipe.tipFlare + (wideBias * 0.14) + (depthBias * 0.08), 0.52),
    0,
    0.95,
  );
  return recipe;
};

const buildOrnamentRecipe = ({ rng, structureFamily, rarityProfile, detailDensity }) => {
  const densityScale = DETAIL_DENSITY_SCALE[detailDensity] || 1;
  const ornamentBudget = clamp(Math.round(rarityProfile.ornamentBudget * densityScale), 1, 6);
  const baseBias = structureFamily.ornamentBias;
  const pull = (key, variance = 1) => clamp(Math.round((baseBias[key] || 0) + (rng() * variance) + (ornamentBudget * 0.18)), 0, 5);
  return {
    haloBands: pull('haloBands', 0.6),
    crystalClusters: pull('crystalClusters', 0.7),
    runeSigils: pull('runeSigils', 0.8),
    ribbonTrails: pull('ribbonTrails', 0.65),
    emberNodes: pull('emberNodes', 0.6),
    crownSpurs: pull('crownSpurs', 0.6),
    glowMode: rarityProfile.value === 'legendaryDark'
      ? 'heroic-dark'
      : rarityProfile.value === 'legendaryLight'
        ? 'heroic-light'
        : rarityProfile.value === 'legendary'
          ? 'prestige'
          : 'soft',
    ornamentBudget,
  };
};

const buildWingMotionPreview = (basePreview, recipe) => {
  const base = cloneJson(basePreview, {}) || {};
  const next = {
    linked: true,
    master: {
      flapHz: 0.82,
      direction: 'normal',
      amplitude: 1,
      sweep: 1,
      pitch: 0.08,
      featherTwist: 0.48,
      shoulderSpread: 0.22,
      phaseOffset: 0,
    },
  };
  const theme = recipe.theme;
  const rarity = recipe.rarityProfile;
  if (theme === 'storm' || theme === 'mechanical') {
    next.master.flapHz = 1.05;
    next.master.sweep = 1.08;
  } else if (theme === 'moonlight' || theme === 'celestial') {
    next.master.flapHz = 0.72;
    next.master.amplitude = 0.92;
    next.master.pitch = 0.11;
  } else if (theme === 'ember' || theme === 'dragon') {
    next.master.flapHz = 0.95;
    next.master.amplitude = 1.08;
    next.master.shoulderSpread = 0.28;
  }
  if (rarity === 'legendaryLight') {
    next.master.featherTwist = 0.7;
    next.master.pitch = 0.12;
  } else if (rarity === 'legendaryDark') {
    next.master.sweep = 1.14;
    next.master.amplitude = 1.12;
    next.master.shoulderSpread = 0.32;
  } else if (rarity === 'common') {
    next.master.amplitude = 0.88;
    next.master.featherTwist = 0.34;
    next.master.shoulderSpread = 0.16;
  }
  return {
    ...base,
    linked: true,
    master: {
      ...(isPlainObject(base.master) ? base.master : {}),
      ...next.master,
    },
  };
};

const buildSummaryObject = ({ categoryOption, rarityOption, themeConfig, detailDensity, materialFamily, fitTemplate, baseReference, fitMode }) => ({
  categoryLabel: categoryOption.label,
  rarityLabel: rarityOption.label,
  themeLabel: themeConfig.label,
  detailLabel: getGeneratorOptionLabel(GENERATOR_DETAIL_DENSITY_OPTIONS, detailDensity, 'Medium'),
  materialDirection: materialFamily.label,
  fitLabel: fitMode === 'copyWingTemplate'
    ? `${fitTemplate.label} + derivative`
    : fitTemplate.label,
  baseReferenceLabel: getReferenceTemplateLabel(baseReference, fitMode),
});

const validateHexPalette = (palette) => {
  const hexPattern = /^#[0-9a-f]{6}$/i;
  return ['primary', 'secondary', 'accent', 'glow', 'shadow', 'metal'].every((key) => hexPattern.test(palette[key] || ''));
};

export function validateGeneratedWingRecipe(recipe, {
  categoryConfig = CATEGORY_GENERATOR_CONFIGS[DEFAULT_CATEGORY_VALUE],
} = {}) {
  const issues = [];
  const normalized = normalizeGeneratedWingRecipe(recipe);
  if (!normalized) {
    issues.push('The generated recipe payload is incomplete or malformed.');
    return {
      valid: false,
      issues,
      checks: {
        category: false,
        rarity: false,
        theme: false,
        material: false,
        palette: false,
        silhouette: false,
        fit: false,
      },
    };
  }

  const rarityProfile = resolveRarityProfile(normalized.rarityProfile);
  const themeConfig = resolveThemeConfig(normalized.theme);
  const materialFamily = resolveMaterialFamily(normalized.materialFamily);
  const fitTemplate = resolveFitTemplateProfile(normalized.fitTemplateId);
  const structureFamily = resolveStructureFamily(normalized.structureRecipe.family);
  const fitAttachment = cloneGeneratorAttachment(normalized.fitAttachment);
  const scaleEnvelope = fitTemplate?.scaleEnvelope || { min: 1.4, max: 2.6 };
  const withinScaleEnvelope = fitAttachment.scale.every((value) => value >= scaleEnvelope.min && value <= scaleEnvelope.max);
  const paletteValid = validateHexPalette(normalized.palette);
  const silhouetteValid = normalized.structureRecipe.primaryLayerCount >= 3
    && normalized.structureRecipe.span >= 2.4
    && normalized.structureRecipe.height >= 1.4;

  if (!categoryConfig?.enabled || normalized.category !== categoryConfig.key) {
    issues.push('The generated prop category is not enabled in the v1 generator.');
  }
  if (!rarityProfile) {
    issues.push('The selected rarity profile could not be resolved.');
  }
  if (!themeConfig) {
    issues.push('The theme direction is not supported by the generator.');
  }
  if (!materialFamily) {
    issues.push('The material family is missing or invalid.');
  }
  if (!paletteValid) {
    issues.push('The generated palette is incomplete or contains invalid colors.');
  }
  if (!structureFamily) {
    issues.push('The structure family is invalid.');
  }
  if (!silhouetteValid) {
    issues.push('The wing silhouette did not meet the minimum quality threshold.');
  }
  if (!fitTemplate || !withinScaleEnvelope || fitAttachment.mirrorMode !== 'paired') {
    issues.push('The XiO fit template is invalid or falls outside the safe wing scale envelope.');
  }
  if (themeConfig && materialFamily && !themeConfig.preferredMaterials.includes(materialFamily.id) && !resolveRarityProfile(normalized.rarityProfile)?.allowedMaterials.includes(materialFamily.id)) {
    issues.push('The material family does not align with the selected theme or rarity.');
  }
  if (structureFamily && rarityProfile && !rarityProfile.allowedStructures.includes(structureFamily.id)) {
    issues.push('The structure family does not align with the selected rarity.');
  }

  return {
    valid: issues.length === 0,
    issues,
    checks: {
      category: Boolean(categoryConfig?.enabled && normalized.category === categoryConfig.key),
      rarity: Boolean(rarityProfile),
      theme: Boolean(themeConfig),
      material: Boolean(materialFamily),
      palette: paletteValid,
      silhouette: silhouetteValid,
      fit: Boolean(fitTemplate && withinScaleEnvelope && fitAttachment.mirrorMode === 'paired'),
    },
  };
}

export function buildGeneratorPreviewSummary(formInput, { baseReferenceOptions = [] } = {}) {
  const input = {
    category: normalizeValue(formInput?.category) || DEFAULT_CATEGORY_VALUE,
    rarity: normalizeValue(formInput?.rarity) || DEFAULT_RARITY_VALUE,
    themeMode: normalizeValue(formInput?.themeMode) || DEFAULT_THEME_MODE,
    themeInput: normalizeValue(formInput?.themeInput),
    detailDensity: normalizeValue(formInput?.detailDensity) || DEFAULT_DETAIL_DENSITY,
    colorHarmonyMode: normalizeValue(formInput?.colorHarmonyMode) || DEFAULT_COLOR_HARMONY,
    fitMode: normalizeValue(formInput?.fitMode) || DEFAULT_FIT_MODE,
    baseReferenceKey: normalizeValue(formInput?.baseReferenceKey),
  };

  const categoryOption = resolveCategoryOption(input.category) || resolveCategoryOption(DEFAULT_CATEGORY_VALUE);
  const rarityOption = GENERATOR_RARITY_OPTIONS.find((entry) => entry.value === input.rarity) || GENERATOR_RARITY_OPTIONS.find((entry) => entry.value === DEFAULT_RARITY_VALUE);
  const rarityProfile = resolveRarityProfile(rarityOption.value);
  const references = baseReferenceOptions.length ? baseReferenceOptions : getWingBaseReferenceOptions();
  const baseReference = references.find((entry) => entry.key === input.baseReferenceKey)
    || ((input.fitMode === 'copyWingTemplate' || input.themeMode === 'matchExistingStyle') ? (references[0] || null) : null);
  const themeConfig = input.themeMode === 'guidedTheme'
    ? resolveThemeConfig(input.themeInput || DEFAULT_THEME_VALUE) || THEME_CONFIGS[DEFAULT_THEME_VALUE]
    : (input.themeMode === 'matchExistingStyle' || (input.fitMode === 'copyWingTemplate' && baseReference?.theme))
      ? resolveThemeConfig(baseReference?.theme || DEFAULT_THEME_VALUE) || THEME_CONFIGS[DEFAULT_THEME_VALUE]
      : THEME_CONFIGS[DEFAULT_THEME_VALUE];
  const detailDensity = resolveDetailDensity(input, rarityProfile);
  const materialFamily = (input.themeMode === 'matchExistingStyle' || input.fitMode === 'copyWingTemplate') && baseReference?.materialFamily
    ? resolveMaterialFamily(baseReference.materialFamily) || MATERIAL_FAMILY_CONFIGS.royalEnamel
    : resolveMaterialFamily(themeConfig.preferredMaterials[0]) || MATERIAL_FAMILY_CONFIGS.royalEnamel;
  const fitTemplate = resolveFitTemplateProfile(
    input.fitMode === 'matchExistingProp' || input.fitMode === 'copyWingTemplate'
      ? baseReference?.fitTemplateId || themeConfig.fitTemplateId
      : input.fitMode === 'useCategoryDefault'
        ? CATEGORY_GENERATOR_CONFIGS[DEFAULT_CATEGORY_VALUE].defaultFitTemplateId
        : themeConfig.fitTemplateId || CATEGORY_GENERATOR_CONFIGS[DEFAULT_CATEGORY_VALUE].defaultFitTemplateId
  ) || FIT_TEMPLATE_PROFILES[CATEGORY_GENERATOR_CONFIGS[DEFAULT_CATEGORY_VALUE].defaultFitTemplateId];

  return buildSummaryObject({
    categoryOption,
    rarityOption,
    themeConfig,
    detailDensity,
    materialFamily,
    fitTemplate,
    baseReference,
    fitMode: input.fitMode,
  });
}

export function generateRandomWingDraft(formInput, {
  existingProps = [],
  baseReferenceOptions = [],
  defaultWingMotionPreview = null,
  templateReference = null,
} = {}) {
  const input = {
    category: normalizeValue(formInput?.category) || DEFAULT_CATEGORY_VALUE,
    rarity: normalizeValue(formInput?.rarity) || DEFAULT_RARITY_VALUE,
    themeMode: normalizeValue(formInput?.themeMode) || DEFAULT_THEME_MODE,
    themeInput: normalizeValue(formInput?.themeInput),
    detailDensity: normalizeValue(formInput?.detailDensity) || DEFAULT_DETAIL_DENSITY,
    colorHarmonyMode: normalizeValue(formInput?.colorHarmonyMode) || DEFAULT_COLOR_HARMONY,
    fitMode: normalizeValue(formInput?.fitMode) || DEFAULT_FIT_MODE,
    baseReferenceKey: normalizeValue(formInput?.baseReferenceKey),
  };

  const validationIssues = [];
  const categoryConfig = CATEGORY_GENERATOR_CONFIGS[input.category];
  if (!categoryConfig?.enabled) {
    validationIssues.push('Only wing generation is enabled in Random Prop Generator v1.');
  }

  const rarityProfile = resolveRarityProfile(input.rarity);
  if (!rarityProfile) {
    validationIssues.push('Choose a supported rarity before generating.');
  }

  const references = baseReferenceOptions.length ? baseReferenceOptions : getWingBaseReferenceOptions(existingProps);
  const seed = createSeed([
    input.category,
    input.rarity,
    input.themeMode,
    input.themeInput,
    input.detailDensity,
    input.colorHarmonyMode,
    input.fitMode,
    input.baseReferenceKey,
  ]);
  const rng = mulberry32(seed);

  const baseReference = resolveBaseReference({
    input,
    baseReferenceOptions: references,
    themeMode: input.themeMode,
    rng,
  });

  if ((input.fitMode === 'matchExistingProp' || input.fitMode === 'copyWingTemplate') && !baseReference) {
    validationIssues.push(
      input.fitMode === 'copyWingTemplate'
        ? 'Choose a wing template reference before generating a derivative wing.'
        : 'Choose a base reference when Match Existing Prop is selected.',
    );
  }
  if (input.themeMode === 'guidedTheme' && !resolveThemeConfig(input.themeInput)) {
    validationIssues.push('Choose a supported guided theme for this generator.');
  }
  if (validationIssues.length > 0) {
    return {
      ok: false,
      error: validationIssues[0],
      coherenceReport: {
        valid: false,
        issues: validationIssues,
      },
    };
  }

  const categoryOption = resolveCategoryOption(input.category) || resolveCategoryOption(DEFAULT_CATEGORY_VALUE);
  const rarityOption = GENERATOR_RARITY_OPTIONS.find((entry) => entry.value === input.rarity) || GENERATOR_RARITY_OPTIONS[1];
  const themeConfig = resolveGeneratedTheme({
    input,
    baseReference,
    categoryConfig,
    rng,
  }) || THEME_CONFIGS[DEFAULT_THEME_VALUE];
  const detailDensity = resolveDetailDensity(input, rarityProfile);
  const materialFamily = resolveMaterialFamilyForRecipe({
    themeConfig,
    rarityProfile,
    baseReference,
    input,
    templateReference,
    rng,
  }) || MATERIAL_FAMILY_CONFIGS.royalEnamel;
  const paletteFamily = resolvePaletteFamily({
    themeConfig,
    colorHarmonyMode: input.colorHarmonyMode,
    rarityProfile,
    baseReference,
  });
  const palette = cloneJson(pickRandom(rng, PALETTE_LIBRARY[paletteFamily], PALETTE_LIBRARY.royal[0]), PALETTE_LIBRARY.royal[0]);
  const structureFamily = resolveStructureFamilyForRecipe({
    themeConfig,
    rarityProfile,
    baseReference,
    input,
    templateReference,
    rng,
  }) || STRUCTURE_FAMILY_CONFIGS.aetherPlume;

  const fitTemplateId = input.fitMode === 'matchExistingProp' || input.fitMode === 'copyWingTemplate'
    ? (baseReference?.fitTemplateId || themeConfig.fitTemplateId || categoryConfig.defaultFitTemplateId)
    : input.fitMode === 'useCategoryDefault'
      ? categoryConfig.defaultFitTemplateId
      : (themeConfig.fitTemplateId || categoryConfig.defaultFitTemplateId);
  const fitTemplate = resolveFitTemplateProfile(fitTemplateId) || FIT_TEMPLATE_PROFILES[categoryConfig.defaultFitTemplateId];

  const draftAttachment = deriveSafeFitAttachment({
    fitTemplate,
    attachment: hasReferenceGuidedFitMode(input.fitMode) && (templateReference?.attachment || baseReference?.attachment)
      ? (templateReference?.attachment || baseReference?.attachment)
      : fitTemplate.attachment,
    fitMode: input.fitMode,
  });

  const structureRecipe = buildStructureRecipe({
    rng,
    structureFamily,
    rarityProfile,
    detailDensity,
    templateReference,
    fitTemplate,
  });
  const ornamentRecipe = buildOrnamentRecipe({
    rng,
    structureFamily,
    rarityProfile,
    detailDensity,
  });

  const themeDescriptor = buildThemeDescriptor(rng, themeConfig.value);
  const structureDescriptor = buildStructureDescriptor(rng, structureFamily.id);
  const label = `${themeDescriptor} ${structureDescriptor} Wings`;
  const existingKeys = createExistingKeySet(existingProps);
  const key = buildUniqueKey(label, existingKeys);

  const summary = buildSummaryObject({
    categoryOption,
    rarityOption,
    themeConfig,
    detailDensity,
    materialFamily,
    fitTemplate,
    baseReference,
    fitMode: input.fitMode,
  });

  const recipe = {
    version: RANDOM_PROP_GENERATOR_VERSION,
    seed,
    category: DEFAULT_CATEGORY_VALUE,
    theme: themeConfig.value,
    themeLabel: themeConfig.label,
    themeMode: input.themeMode,
    rarityProfile: rarityProfile.value,
    fitTemplateId: fitTemplate.id,
    fitMode: input.fitMode,
    templateStrategy: input.fitMode === 'copyWingTemplate' ? 'derivative-copy' : null,
    baseReferenceKey: baseReference?.key || null,
    templateReferenceKey: input.fitMode === 'copyWingTemplate' ? (templateReference?.key || baseReference?.key || null) : null,
    templateSourceKind: input.fitMode === 'copyWingTemplate' ? (templateReference?.sourceKind || baseReference?.sourceKind || null) : null,
    materialFamily: materialFamily.id,
    colorHarmonyMode: input.colorHarmonyMode,
    detailDensity,
    palette,
    structureRecipe,
    ornamentRecipe,
    fitAttachment: cloneGeneratorAttachment(draftAttachment),
    displaySummary: summary,
  };

  const coherenceReport = validateGeneratedWingRecipe(recipe, {
    categoryConfig,
  });
  if (!coherenceReport.valid) {
    return {
      ok: false,
      error: coherenceReport.issues[0] || 'The generated wing did not pass coherence validation.',
      coherenceReport,
    };
  }

  const tags = [
    'generated',
    'procedural',
    themeConfig.value,
    rarityProfile.value,
    materialFamily.id,
    structureFamily.id,
  ].filter(Boolean);

  const description = [
    `${themeConfig.label} wing set generated for XiO.`,
    `${rarityOption.label} rarity with ${materialFamily.label.toLowerCase()} materials.`,
    `Built with ${structureFamily.label.toLowerCase()} structure and ${detailDensity} detail density.`,
    input.fitMode === 'copyWingTemplate' && baseReference
      ? `Uses ${baseReference.label} as a derivative template guide without cloning it exactly.`
      : null,
  ].filter(Boolean).join(' ');

  const draftRecord = {
    key,
    label,
    categoryKey: DEFAULT_CATEGORY_VALUE,
    rarity: rarityProfile.value,
    factoryId: GENERATED_PROCEDURAL_WING_FACTORY_ID,
    assetUrl: null,
    storagePath: null,
    attachment: draftAttachment,
    eyePreset: null,
    materialPreset: null,
    mysteryBoxEnabled: false,
    active: true,
    archived: false,
    tags,
    description,
    preview: {
      wingMotion: buildWingMotionPreview(defaultWingMotionPreview, recipe),
      generated: recipe,
    },
  };

  return {
    ok: true,
    draftRecord,
    recipe,
    summary,
    coherenceReport,
  };
}
