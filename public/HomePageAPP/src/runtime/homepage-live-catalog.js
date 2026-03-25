export const HOMEPAGE_CATALOG_STORAGE_KEY = 'LAHS_HOMEPAGE_LIVE_CATALOG_SNAPSHOT';
export const HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY = 'LAHS_HOMEPAGE_MYSTERY_TEST_REWARD_KEY';
export const HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY = 'LAHS_HOMEPAGE_MYSTERY_TEST_REWARD_OVERRIDE';
export const HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY = 'LAHS_HOMEPAGE_MYSTERY_TEST_LAUNCH';
export const HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY = 'LAHS_HOMEPAGE_MYSTERY_TEST_SESSION';
export const HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY = 'LAHS_HOMEPAGE_PENDING_SUMMON_RECOVERY';
export const HOMEPAGE_CREATOR_READY = 'LAHS_HOMEPAGE_CREATOR_READY';
export const HOMEPAGE_CATALOG_SYNC = 'LAHS_HOMEPAGE_CATALOG_SYNC';
export const HOMEPAGE_PROP_UPLOAD_REQUEST = 'LAHS_HOMEPAGE_PROP_UPLOAD_REQUEST';
export const HOMEPAGE_PROP_SAVE_REQUEST = 'LAHS_HOMEPAGE_PROP_SAVE_REQUEST';
export const HOMEPAGE_PROP_SAVE_RESULT = 'LAHS_HOMEPAGE_PROP_SAVE_RESULT';
export const HOMEPAGE_OPEN_MYSTERY_TEST_REQUEST = 'LAHS_HOMEPAGE_OPEN_MYSTERY_TEST_REQUEST';

const HOMEPAGE_RARITIES = new Set([
  'common',
  'rare',
  'legendary',
  'legendaryLight',
  'legendaryDark',
]);
const CATEGORY_KEY_ALIASES = Object.freeze({
  wingset: 'wingSet',
  headwear: 'headWear',
  faceaccessory: 'faceAccessory',
  eyestyle: 'eyeStyle',
  bodyaccessory: 'bodyAccessory',
  heldprop: 'heldProp',
});

const normalizeTuple = (value, fallback) => {
  if (!Array.isArray(value) || value.length !== 3) {
    return fallback;
  }
  const nextValue = value.map((entry) => Number(entry));
  if (nextValue.some((entry) => !Number.isFinite(entry))) {
    return fallback;
  }
  return [nextValue[0], nextValue[1], nextValue[2]];
};

const normalizeTags = (value) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (!entry || seen.has(entry)) return false;
      seen.add(entry);
      return true;
    });
};

const normalizeCategoryKey = (value) => {
  const trimmedValue = typeof value === 'string' ? value.trim() : '';
  if (!trimmedValue) return '';
  const slugValue = trimmedValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return CATEGORY_KEY_ALIASES[slugValue] || trimmedValue;
};

export const normalizeHomepagePropKey = (value) => (
  typeof value === 'string'
    ? value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
    : ''
);

export const buildHomepageMysteryTestOverride = ({
  propKey,
  snapshotUpdatedAt = null,
  createdAt = new Date().toISOString(),
}) => {
  const rawPropKey = typeof propKey === 'string' ? propKey.trim() : '';
  const normalizedPropKey = normalizeHomepagePropKey(rawPropKey);
  if (!rawPropKey || !normalizedPropKey) {
    return null;
  }
  return {
    propKey: rawPropKey,
    normalizedPropKey,
    snapshotUpdatedAt: typeof snapshotUpdatedAt === 'string' && snapshotUpdatedAt.trim().length > 0
      ? snapshotUpdatedAt
      : null,
    createdAt,
    mode: 'nextPullOnly',
  };
};

const createHomepageMysteryTestLaunchId = ({ createdAt, normalizedPropKey }) => {
  const randomPart = typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  return `${createdAt}:${normalizedPropKey}:${randomPart}`;
};

export const buildHomepageMysteryTestSession = ({
  propKey,
  snapshotUpdatedAt = null,
  requiredCatalogRevision = snapshotUpdatedAt,
  createdAt = new Date().toISOString(),
  launchId = null,
}) => {
  const rawPropKey = typeof propKey === 'string' ? propKey.trim() : '';
  const normalizedPropKey = normalizeHomepagePropKey(rawPropKey);
  if (!rawPropKey || !normalizedPropKey) {
    return null;
  }
  const resolvedCreatedAt = typeof createdAt === 'string' && createdAt.trim().length > 0
    ? createdAt
    : new Date().toISOString();
  return {
    launchId: typeof launchId === 'string' && launchId.trim().length > 0
      ? launchId.trim()
      : createHomepageMysteryTestLaunchId({
        createdAt: resolvedCreatedAt,
        normalizedPropKey,
      }),
    propKey: rawPropKey,
    normalizedPropKey,
    snapshotUpdatedAt: typeof snapshotUpdatedAt === 'string' && snapshotUpdatedAt.trim().length > 0
      ? snapshotUpdatedAt
      : null,
    requiredCatalogRevision: typeof requiredCatalogRevision === 'string' && requiredCatalogRevision.trim().length > 0
      ? requiredCatalogRevision
      : null,
    createdAt: resolvedCreatedAt,
    mode: 'nextPullOnly',
    failureMode: 'blockPull',
  };
};

export const buildHomepagePendingSummonRecovery = ({
  userId = null,
  requestId,
  costPoints,
  rewardKey = null,
  rewardLabel = null,
  rewardRarity = null,
  createdAt = new Date().toISOString(),
  resolvedAt = null,
  status = 'pointsAccepted',
}) => {
  const normalizedRequestId = typeof requestId === 'string' ? requestId.trim() : '';
  const normalizedCostPoints = Math.max(1, Math.min(1000000, Number.isFinite(Number(costPoints)) ? Math.round(Number(costPoints)) : 0));
  const normalizedStatus =
    status === 'rewardResolved' || status === 'decisionRequired'
      ? status
      : 'pointsAccepted';
  if (!normalizedRequestId || !normalizedCostPoints) {
    return null;
  }

  const normalizedRewardKey = typeof rewardKey === 'string' && rewardKey.trim().length > 0
    ? rewardKey.trim()
    : null;
  const normalizedRewardLabel = typeof rewardLabel === 'string' && rewardLabel.trim().length > 0
    ? rewardLabel.trim()
    : null;
  const normalizedUserId = typeof userId === 'string' && userId.trim().length > 0
    ? userId.trim()
    : null;
  const normalizedCreatedAt = typeof createdAt === 'string' && createdAt.trim().length > 0
    ? createdAt
    : new Date().toISOString();
  const normalizedResolvedAt = typeof resolvedAt === 'string' && resolvedAt.trim().length > 0
    ? resolvedAt
    : null;

  return {
    userId: normalizedUserId,
    requestId: normalizedRequestId,
    costPoints: normalizedCostPoints,
    rewardKey: normalizedRewardKey,
    rewardLabel: normalizedRewardLabel,
    rewardRarity: normalizedRewardKey || rewardRarity
      ? normalizeHomepageRarity(rewardRarity)
      : null,
    createdAt: normalizedCreatedAt,
    resolvedAt: normalizedResolvedAt,
    status: normalizedStatus,
  };
};

export const mysteryTestOverrideMatchesPropKey = (overridePayload, candidateKey) => {
  if (!overridePayload) {
    return false;
  }
  const rawCandidateKey = typeof candidateKey === 'string' ? candidateKey.trim() : '';
  if (!rawCandidateKey) {
    return false;
  }
  return (
    overridePayload.propKey === rawCandidateKey
    || overridePayload.normalizedPropKey === normalizeHomepagePropKey(rawCandidateKey)
  );
};

export const readHomepageLegacyPinnedMysteryRewardKey = () => {
  try {
    const raw = localStorage.getItem(HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY);
    if (typeof raw !== 'string') {
      return null;
    }
    const value = raw.trim();
    return value || null;
  } catch {
    return null;
  }
};

export const persistHomepageLegacyPinnedMysteryRewardKey = (propKey) => {
  try {
    const rawPropKey = typeof propKey === 'string' ? propKey.trim() : '';
    if (!rawPropKey) {
      localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY);
      return;
    }
    localStorage.setItem(HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY, rawPropKey);
  } catch {
    // Ignore storage failures in standalone/local preview sessions.
  }
};

export const clearHomepageLegacyPinnedMysteryRewardKey = () => {
  try {
    localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY);
  } catch {
    // Ignore storage failures in standalone/local preview sessions.
  }
};

export const readHomepageMysteryTestOverride = () => {
  try {
    const raw = localStorage.getItem(HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return buildHomepageMysteryTestOverride({
      propKey: parsed?.propKey,
      snapshotUpdatedAt: parsed?.snapshotUpdatedAt ?? null,
      createdAt: typeof parsed?.createdAt === 'string' && parsed.createdAt.trim().length > 0
        ? parsed.createdAt
        : new Date().toISOString(),
    });
  } catch {
    return null;
  }
};

export const persistHomepageMysteryTestOverride = (payload) => {
  try {
    if (!payload) {
      localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY);
      return;
    }
    localStorage.setItem(HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures in standalone/local preview sessions.
  }
};

export const clearHomepageMysteryTestOverride = () => {
  try {
    localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY);
  } catch {
    // Ignore storage failures in standalone/local preview sessions.
  }
};

export const readHomepageMysteryTestSession = () => {
  try {
    const raw = localStorage.getItem(HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return buildHomepageMysteryTestSession({
      propKey: parsed?.propKey,
      snapshotUpdatedAt: parsed?.snapshotUpdatedAt ?? null,
      requiredCatalogRevision: parsed?.requiredCatalogRevision ?? null,
      createdAt: typeof parsed?.createdAt === 'string' && parsed.createdAt.trim().length > 0
        ? parsed.createdAt
        : new Date().toISOString(),
      launchId: typeof parsed?.launchId === 'string' && parsed.launchId.trim().length > 0
        ? parsed.launchId
        : null,
    });
  } catch {
    return null;
  }
};

export const persistHomepageMysteryTestSession = (payload) => {
  try {
    if (!payload) {
      localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures in standalone/local preview sessions.
  }
};

export const clearHomepageMysteryTestSession = () => {
  try {
    localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures in standalone/local preview sessions.
  }
};

export const readHomepagePendingSummonRecovery = (userId = null) => {
  try {
    const raw = localStorage.getItem(HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const payload = buildHomepagePendingSummonRecovery({
      userId: parsed?.userId ?? null,
      requestId: parsed?.requestId,
      costPoints: Number(parsed?.costPoints),
      rewardKey: parsed?.rewardKey ?? null,
      rewardLabel: parsed?.rewardLabel ?? null,
      rewardRarity: parsed?.rewardRarity ?? null,
      createdAt: typeof parsed?.createdAt === 'string' && parsed.createdAt.trim().length > 0
        ? parsed.createdAt
        : new Date().toISOString(),
      resolvedAt: parsed?.resolvedAt ?? null,
      status: parsed?.status,
    });
    if (!payload) {
      return null;
    }
    const normalizedUserId = typeof userId === 'string' && userId.trim().length > 0
      ? userId.trim()
      : null;
    if (normalizedUserId && payload.userId !== normalizedUserId) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

export const persistHomepagePendingSummonRecovery = (payload) => {
  try {
    if (!payload) {
      localStorage.removeItem(HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY);
      return;
    }
    localStorage.setItem(HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures in standalone/local preview sessions.
  }
};

export const clearHomepagePendingSummonRecovery = (userId = null) => {
  try {
    if (!userId) {
      localStorage.removeItem(HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY);
      return;
    }
    const payload = readHomepagePendingSummonRecovery(userId);
    if (!payload) {
      return;
    }
    localStorage.removeItem(HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY);
  } catch {
    // Ignore storage failures in standalone/local preview sessions.
  }
};

export const buildHomepageMysteryTestLaunchToken = ({
  propKey = null,
  snapshotUpdatedAt = null,
  createdAt = new Date().toISOString(),
} = {}) => ({
  createdAt,
  propKey: typeof propKey === 'string' && propKey.trim().length > 0 ? propKey.trim() : null,
  snapshotUpdatedAt: typeof snapshotUpdatedAt === 'string' && snapshotUpdatedAt.trim().length > 0
    ? snapshotUpdatedAt
    : null,
  reason: 'creator-save',
});

export const persistHomepageMysteryTestLaunchToken = (token) => {
  try {
    if (!token) {
      localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY);
      return;
    }
    localStorage.setItem(HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY, JSON.stringify(token));
  } catch {
    // Ignore storage failures in standalone/local preview sessions.
  }
};

export const consumeHomepageMysteryTestLaunchToken = () => {
  try {
    const raw = localStorage.getItem(HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY);
    if (!raw) return null;
    localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY);
    const parsed = JSON.parse(raw);
    return buildHomepageMysteryTestLaunchToken({
      propKey: parsed?.propKey ?? null,
      snapshotUpdatedAt: parsed?.snapshotUpdatedAt ?? null,
      createdAt: typeof parsed?.createdAt === 'string' && parsed.createdAt.trim().length > 0
        ? parsed.createdAt
        : new Date().toISOString(),
    });
  } catch {
    return null;
  }
};

export const normalizeHomepageCategory = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const key = typeof raw.key === 'string' ? normalizeCategoryKey(raw.key) : '';
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  const slotKey = typeof raw.slotKey === 'string' ? raw.slotKey.trim() : '';
  if (!key || !label || !slotKey) {
    return null;
  }

  return {
    key,
    label,
    slotKey,
    equipLimit: Math.max(1, Number.isFinite(Number(raw.equipLimit)) ? Number(raw.equipLimit) : 1),
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : 0,
    enabled: raw.enabled !== false,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  };
};

export const normalizeHomepageAttachment = (raw) => {
  const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const fitRecord = record.fit && typeof record.fit === 'object' && !Array.isArray(record.fit)
    ? record.fit
    : null;
  return {
    position: normalizeTuple(record.position, [0, 0, 0]),
    rotation: normalizeTuple(record.rotation, [0, 0, 0]),
    scale: normalizeTuple(record.scale, [1, 1, 1]),
    mirrorMode: record.mirrorMode === 'paired' ? 'paired' : 'single',
    fit: fitRecord ? {
      distanceMultiplier: Number.isFinite(Number(fitRecord.distanceMultiplier))
        ? Number(fitRecord.distanceMultiplier)
        : undefined,
      yOffsetRatio: Number.isFinite(Number(fitRecord.yOffsetRatio))
        ? Number(fitRecord.yOffsetRatio)
        : undefined,
      zOffsetRatio: Number.isFinite(Number(fitRecord.zOffsetRatio))
        ? Number(fitRecord.zOffsetRatio)
        : undefined,
      initialRotationY: Number.isFinite(Number(fitRecord.initialRotationY))
        ? Number(fitRecord.initialRotationY)
        : undefined,
    } : null,
  };
};

export const normalizeHomepageRarity = (value) => (
  typeof value === 'string' && HOMEPAGE_RARITIES.has(value)
    ? value
    : 'rare'
);

const HOMEPAGE_SYSTEM_PROP_OVERRIDES = Object.freeze({
  xiostandardcrown: Object.freeze({
    rarity: 'legendaryLight',
    mysteryBoxEnabled: true,
    active: true,
    attachment: Object.freeze({
      position: Object.freeze([0, 1.55, -1.65]),
      rotation: Object.freeze([0, 0, 0]),
      scale: Object.freeze([2.7, 2.7, 2.7]),
      mirrorMode: 'single',
    }),
  }),
  xiostandardbodygear: Object.freeze({
    label: 'Ruby One',
    assetUrl: './Images/PROPS/BodyGear/RubyOne/redrubyarmor.glb',
    rarity: 'legendaryLight',
    mysteryBoxEnabled: true,
    active: true,
    tags: Object.freeze(['body-gear', 'torso', 'ruby-one', 'starter']),
    description: 'Ruby One is the default XiO body gear baseline for calibrating torso GLBs and locking future body gear fits.',
    attachment: Object.freeze({
      position: Object.freeze([0, -4, -2]),
      rotation: Object.freeze([0, 0, 0]),
      scale: Object.freeze([5.7, 5.7, 5.7]),
      mirrorMode: 'single',
    }),
  }),
  'optimized-glb-visual-safe-q95': Object.freeze({
    label: 'Execution Wings',
    assetUrl: './Images/PROPS/Wings/ExecutionWings/ExecutionWings.glb',
  }),
  '7d757ac9af9739c111859cdb10bb9794-opt-2048': Object.freeze({
    label: 'Honeycomb Blooms',
    assetUrl: './Images/PROPS/Wings/HoneycombBloomsSaved/HoneycombBloomsSaved.glb',
  }),
  xiostandardcrowncopy: Object.freeze({
    label: 'XiO Standard Crown Copy',
    assetUrl: './Images/PROPS/Headwear/XiOStandardCrown/XiOStandardCrown.glb',
  }),
});

export const normalizeHomepageProp = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const key = typeof raw.key === 'string' ? raw.key.trim() : '';
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  const categoryKey = typeof raw.categoryKey === 'string' ? normalizeCategoryKey(raw.categoryKey) : '';
  if (!key || !label || !categoryKey) {
    return null;
  }

  const preview = raw.preview && typeof raw.preview === 'object' && !Array.isArray(raw.preview)
    ? raw.preview
    : {};
  const inferredFactoryId = typeof raw.factoryId === 'string' && raw.factoryId.trim().length > 0
    ? raw.factoryId.trim()
    : preview.generated && typeof preview.generated === 'object' && !Array.isArray(preview.generated) && preview.generated.category === 'wingSet'
      ? 'makeGeneratedProceduralWingProp'
      : '';

  const normalizedProp = {
    key,
    label,
    categoryKey,
    rarity: normalizeHomepageRarity(raw.rarity),
    assetUrl: typeof raw.assetUrl === 'string' && raw.assetUrl.trim().length > 0 ? raw.assetUrl.trim() : null,
    storagePath: typeof raw.storagePath === 'string' && raw.storagePath.trim().length > 0 ? raw.storagePath.trim() : null,
    attachment: normalizeHomepageAttachment(raw.attachment),
    eyePreset: typeof raw.eyePreset === 'string' && raw.eyePreset.trim().length > 0 ? raw.eyePreset.trim() : null,
    materialPreset: typeof raw.materialPreset === 'string' && raw.materialPreset.trim().length > 0 ? raw.materialPreset.trim() : null,
    mysteryBoxEnabled: raw.mysteryBoxEnabled !== false,
    active: raw.active !== false,
    archived: raw.archived === true,
    tags: normalizeTags(raw.tags),
    description: typeof raw.description === 'string' ? raw.description : '',
    preview,
    ...(inferredFactoryId
      ? { factoryId: inferredFactoryId }
      : {}),
    ...(raw.creatorOnly === true ? { creatorOnly: true } : {}),
    ...(Number.isFinite(Number(raw.prewarmPriority))
      ? { prewarmPriority: Number(raw.prewarmPriority) }
      : {}),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  };

  const systemOverrides = HOMEPAGE_SYSTEM_PROP_OVERRIDES[normalizeHomepagePropKey(key)];
  return systemOverrides
    ? { ...normalizedProp, ...systemOverrides }
    : normalizedProp;
};

export const buildHomepageCatalogSnapshot = ({ categories, props, updatedAt = null }) => ({
  version: 1,
  updatedAt: typeof updatedAt === 'string' && updatedAt.trim().length > 0
    ? updatedAt
    : new Date().toISOString(),
  categories: [...categories].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.label.localeCompare(b.label);
  }),
  props: [...props].sort((a, b) => a.label.localeCompare(b.label)),
});

export const persistHomepageCatalogSnapshot = (snapshot) => {
  try {
    if (!snapshot || (snapshot.categories.length === 0 && snapshot.props.length === 0)) {
      localStorage.removeItem(HOMEPAGE_CATALOG_STORAGE_KEY);
      return;
    }
    localStorage.setItem(HOMEPAGE_CATALOG_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage failures during local preview sessions.
  }
};

export const readHomepageCatalogSnapshot = () => {
  try {
    const raw = localStorage.getItem(HOMEPAGE_CATALOG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const categories = Array.isArray(parsed?.categories)
      ? parsed.categories.map((entry) => normalizeHomepageCategory(entry)).filter(Boolean)
      : [];
    const props = Array.isArray(parsed?.props)
      ? parsed.props.map((entry) => normalizeHomepageProp(entry)).filter(Boolean)
      : [];
    const snapshot = buildHomepageCatalogSnapshot({
      categories,
      props,
      updatedAt: typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : null,
    });
    return snapshot.categories.length === 0 && snapshot.props.length === 0 ? null : snapshot;
  } catch {
    return null;
  }
};

export const deriveHomepageCatalogFromLegacy = ({ inventoryConfig, propCatalog }) => {
  const categories = Array.isArray(inventoryConfig?.categories)
    ? inventoryConfig.categories
      .map((entry, index) => normalizeHomepageCategory({
        key: entry.key,
        label: entry.label || entry.key,
        slotKey: entry.slotKey || entry.key,
        equipLimit: entry.equipLimit ?? 1,
        sortOrder: entry.sortOrder ?? index,
        enabled: entry.enabled !== false,
      }))
      .filter(Boolean)
    : [];

  const props = Array.isArray(propCatalog)
    ? propCatalog
      .map((entry) => normalizeHomepageProp({
        key: entry.key,
        label: entry.label || entry.key,
        categoryKey: entry.category,
        rarity: entry.rarity,
        assetUrl: entry.assetUrl || null,
        attachment: entry.attachment || {
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          mirrorMode: entry.category === 'wingSet' ? 'paired' : 'single',
        },
        eyePreset: entry.eyePreset || null,
        materialPreset: entry.materialPreset || null,
        mysteryBoxEnabled: entry.mysteryBoxEnabled !== false,
        active: entry.active !== false,
        archived: false,
        tags: entry.tags || [],
        description: entry.description || '',
        preview: entry.preview || {},
        factoryId: entry.factoryId || null,
        creatorOnly: entry.creatorOnly === true,
        prewarmPriority: Number.isFinite(Number(entry.prewarmPriority)) ? Number(entry.prewarmPriority) : 0,
      }))
      .filter(Boolean)
    : [];

  return buildHomepageCatalogSnapshot({ categories, props });
};

export const mergeHomepageCatalogWithFallback = ({ snapshot, fallbackInventoryConfig, fallbackPropCatalog }) => {
  const fallbackSnapshot = deriveHomepageCatalogFromLegacy({
    inventoryConfig: fallbackInventoryConfig,
    propCatalog: fallbackPropCatalog,
  });

  if (!snapshot) {
    return fallbackSnapshot;
  }

  const fallbackCategoryMap = new Map(fallbackSnapshot.categories.map((entry) => [entry.key, entry]));
  const fallbackPropMap = new Map(fallbackSnapshot.props.map((entry) => [entry.key, entry]));
  const fallbackPropNormalizedMap = new Map(
    fallbackSnapshot.props
      .map((entry) => [normalizeHomepagePropKey(entry.key), entry])
      .filter(([normalizedKey]) => typeof normalizedKey === 'string' && normalizedKey.length > 0),
  );
  const mergedCategories = new Map(fallbackCategoryMap);

  (snapshot.categories || []).forEach((entry) => {
    const fallbackCategory = fallbackCategoryMap.get(entry.key);
    mergedCategories.set(entry.key, fallbackCategory ? { ...fallbackCategory, ...entry } : entry);
  });

  const mergedProps = new Map(fallbackPropMap);
  (snapshot.props || []).forEach((entry) => {
    const fallbackProp = fallbackPropMap.get(entry.key)
      || fallbackPropNormalizedMap.get(normalizeHomepagePropKey(entry.key));
    if (!fallbackProp) {
      mergedProps.set(entry.key, entry);
      return;
    }
    const mergedKey = fallbackProp.key || entry.key;
    mergedProps.set(entry.key, {
      ...fallbackProp,
      ...entry,
      key: mergedKey,
      assetUrl: entry.assetUrl || fallbackProp.assetUrl || null,
      storagePath: entry.storagePath || fallbackProp.storagePath || null,
      preview: {
        ...(fallbackProp.preview || {}),
        ...(entry.preview || {}),
      },
      attachment: entry.attachment || fallbackProp.attachment,
    });
    if (mergedKey !== entry.key) {
      const mergedEntry = mergedProps.get(entry.key);
      mergedProps.delete(entry.key);
      mergedProps.set(mergedKey, mergedEntry);
    }
  });

  return buildHomepageCatalogSnapshot({
    categories: Array.from(mergedCategories.values()),
    props: Array.from(mergedProps.values()),
    updatedAt: snapshot.updatedAt || fallbackSnapshot.updatedAt,
  });
};

export const getActiveHomepageCatalog = ({ fallbackInventoryConfig, fallbackPropCatalog }) => {
  const storedSnapshot = readHomepageCatalogSnapshot();
  return mergeHomepageCatalogWithFallback({
    snapshot: storedSnapshot,
    fallbackInventoryConfig,
    fallbackPropCatalog,
  });
};
