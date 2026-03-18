import type {
  HomepageCatalogSnapshot,
  HomepageCategoryRecord,
  HomepagePropAttachment,
  HomepagePropMirrorMode,
  HomepagePropRarity,
  HomepagePropRecord,
} from '../types/homepageCatalog';

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

export type HomepageMysteryTestOverridePayload = {
  propKey: string;
  normalizedPropKey: string;
  snapshotUpdatedAt: string | null;
  createdAt: string;
  mode: 'nextPullOnly';
};

export type HomepageMysteryTestLaunchToken = {
  createdAt: string;
  propKey: string | null;
  snapshotUpdatedAt: string | null;
  reason: 'creator-save';
};

export type HomepageMysteryTestSessionPayload = {
  launchId: string;
  propKey: string;
  normalizedPropKey: string;
  snapshotUpdatedAt: string | null;
  requiredCatalogRevision: string | null;
  createdAt: string;
  mode: 'nextPullOnly';
  failureMode: 'blockPull';
};

export type HomepagePendingSummonRecoveryStatus =
  | 'pointsAccepted'
  | 'rewardResolved'
  | 'decisionRequired';

export type HomepagePendingSummonRecoveryPayload = {
  userId: string | null;
  requestId: string;
  costPoints: number;
  rewardKey: string | null;
  rewardLabel: string | null;
  rewardRarity: HomepagePropRarity | null;
  createdAt: string;
  resolvedAt: string | null;
  status: HomepagePendingSummonRecoveryStatus;
};

const HOMEPAGE_RARITIES: HomepagePropRarity[] = [
  'common',
  'rare',
  'legendary',
  'legendaryLight',
  'legendaryDark',
];
const CATEGORY_KEY_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  wingset: 'wingSet',
  headwear: 'headWear',
  faceaccessory: 'faceAccessory',
  eyestyle: 'eyeStyle',
  bodyaccessory: 'bodyAccessory',
  heldprop: 'heldProp',
});

const clampNumber = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const normalizeTuple = (
  value: unknown,
  fallback: [number, number, number],
): [number, number, number] => {
  if (!Array.isArray(value) || value.length !== 3) {
    return fallback;
  }
  const nextValue = value.map((entry) => Number(entry));
  if (nextValue.some((entry) => !Number.isFinite(entry))) {
    return fallback;
  }
  return [nextValue[0], nextValue[1], nextValue[2]];
};

const normalizeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry, index, array) => entry.length > 0 && array.indexOf(entry) === index);
};

const normalizeCategoryKey = (value: string): string => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return '';
  const slugValue = trimmedValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return CATEGORY_KEY_ALIASES[slugValue] ?? trimmedValue;
};

export const normalizeHomepagePropKey = (value: string | null | undefined): string => (
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
}: {
  propKey: string | null | undefined;
  snapshotUpdatedAt?: string | null;
  createdAt?: string;
}): HomepageMysteryTestOverridePayload | null => {
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

const createHomepageMysteryTestLaunchId = ({
  createdAt,
  normalizedPropKey,
}: {
  createdAt: string;
  normalizedPropKey: string;
}): string => {
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
  launchId,
}: {
  propKey: string | null | undefined;
  snapshotUpdatedAt?: string | null;
  requiredCatalogRevision?: string | null;
  createdAt?: string;
  launchId?: string | null;
}): HomepageMysteryTestSessionPayload | null => {
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
}: {
  userId?: string | null;
  requestId: string | null | undefined;
  costPoints: number;
  rewardKey?: string | null;
  rewardLabel?: string | null;
  rewardRarity?: HomepagePropRarity | null;
  createdAt?: string;
  resolvedAt?: string | null;
  status?: HomepagePendingSummonRecoveryStatus;
}): HomepagePendingSummonRecoveryPayload | null => {
  const normalizedRequestId = typeof requestId === 'string' ? requestId.trim() : '';
  const normalizedCostPoints = clampNumber(Number(costPoints), 1, 1000000);
  const normalizedStatus: HomepagePendingSummonRecoveryStatus =
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

export const mysteryTestOverrideMatchesPropKey = (
  overridePayload: HomepageMysteryTestOverridePayload | null | undefined,
  candidateKey: string | null | undefined,
): boolean => {
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

export const readHomepageLegacyPinnedMysteryRewardKey = (): string | null => {
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

export const persistHomepageLegacyPinnedMysteryRewardKey = (propKey: string | null | undefined): void => {
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

export const clearHomepageLegacyPinnedMysteryRewardKey = (): void => {
  try {
    localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY);
  } catch {
    // Ignore storage failures in standalone/local preview sessions.
  }
};

export const readHomepageMysteryTestOverride = (): HomepageMysteryTestOverridePayload | null => {
  try {
    const raw = localStorage.getItem(HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HomepageMysteryTestOverridePayload> | null;
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

export const persistHomepageMysteryTestOverride = (payload: HomepageMysteryTestOverridePayload | null): void => {
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

export const clearHomepageMysteryTestOverride = (): void => {
  try {
    localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY);
  } catch {
    // Ignore storage failures in standalone/local preview sessions.
  }
};

export const readHomepageMysteryTestSession = (): HomepageMysteryTestSessionPayload | null => {
  try {
    const raw = localStorage.getItem(HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HomepageMysteryTestSessionPayload> | null;
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

export const persistHomepageMysteryTestSession = (payload: HomepageMysteryTestSessionPayload | null): void => {
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

export const clearHomepageMysteryTestSession = (): void => {
  try {
    localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures in standalone/local preview sessions.
  }
};

export const readHomepagePendingSummonRecovery = (
  userId: string | null | undefined = null,
): HomepagePendingSummonRecoveryPayload | null => {
  try {
    const raw = localStorage.getItem(HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HomepagePendingSummonRecoveryPayload> | null;
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

export const persistHomepagePendingSummonRecovery = (
  payload: HomepagePendingSummonRecoveryPayload | null,
): void => {
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

export const clearHomepagePendingSummonRecovery = (userId: string | null | undefined = null): void => {
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
}: {
  propKey?: string | null;
  snapshotUpdatedAt?: string | null;
  createdAt?: string;
} = {}): HomepageMysteryTestLaunchToken => ({
  createdAt,
  propKey: typeof propKey === 'string' && propKey.trim().length > 0 ? propKey.trim() : null,
  snapshotUpdatedAt: typeof snapshotUpdatedAt === 'string' && snapshotUpdatedAt.trim().length > 0
    ? snapshotUpdatedAt
    : null,
  reason: 'creator-save',
});

export const persistHomepageMysteryTestLaunchToken = (token: HomepageMysteryTestLaunchToken | null): void => {
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

export const consumeHomepageMysteryTestLaunchToken = (): HomepageMysteryTestLaunchToken | null => {
  try {
    const raw = localStorage.getItem(HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY);
    if (!raw) return null;
    localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY);
    const parsed = JSON.parse(raw) as Partial<HomepageMysteryTestLaunchToken> | null;
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

export const normalizeHomepageCategory = (raw: unknown): HomepageCategoryRecord | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const key = typeof record.key === 'string' ? normalizeCategoryKey(record.key) : '';
  const label = typeof record.label === 'string' ? record.label.trim() : '';
  const slotKey = typeof record.slotKey === 'string' ? record.slotKey.trim() : '';
  if (!key || !label || !slotKey) {
    return null;
  }

  return {
    key,
    label,
    slotKey,
    equipLimit: clampNumber(Number(record.equipLimit ?? 1), 1, 12),
    sortOrder: Number.isFinite(Number(record.sortOrder)) ? Number(record.sortOrder) : 0,
    enabled: record.enabled !== false,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : null,
  };
};

export const normalizeHomepageAttachment = (raw: unknown): HomepagePropAttachment => {
  const record = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  const mirrorMode = record.mirrorMode === 'paired' ? 'paired' : 'single';
  const fitRecord = record.fit && typeof record.fit === 'object' && !Array.isArray(record.fit)
    ? record.fit as Record<string, unknown>
    : null;

  return {
    position: normalizeTuple(record.position, [0, 0, 0]),
    rotation: normalizeTuple(record.rotation, [0, 0, 0]),
    scale: normalizeTuple(record.scale, [1, 1, 1]),
    mirrorMode,
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

export const normalizeHomepageRarity = (value: unknown): HomepagePropRarity => {
  if (typeof value === 'string' && HOMEPAGE_RARITIES.includes(value as HomepagePropRarity)) {
    return value as HomepagePropRarity;
  }
  return 'rare';
};

export const normalizeHomepageProp = (raw: unknown): HomepagePropRecord | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const key = typeof record.key === 'string' ? record.key.trim() : '';
  const label = typeof record.label === 'string' ? record.label.trim() : '';
  const categoryKey = typeof record.categoryKey === 'string' ? normalizeCategoryKey(record.categoryKey) : '';
  if (!key || !label || !categoryKey) {
    return null;
  }

  const preview = record.preview && typeof record.preview === 'object' && !Array.isArray(record.preview)
    ? record.preview as Record<string, unknown>
    : {};
  const generatedPreview = preview.generated && typeof preview.generated === 'object' && !Array.isArray(preview.generated)
    ? preview.generated as Record<string, unknown>
    : null;
  const inferredFactoryId = (
    typeof record.factoryId === 'string' && record.factoryId.trim().length > 0
      ? record.factoryId.trim()
      : generatedPreview?.category === 'wingSet'
        ? 'makeGeneratedProceduralWingProp'
        : ''
  );

  return {
    key,
    label,
    categoryKey,
    ...(Number.isFinite(Number(record.prewarmPriority))
      ? { prewarmPriority: Number(record.prewarmPriority) }
      : {}),
    ...(inferredFactoryId
      ? { factoryId: inferredFactoryId }
      : {}),
    ...(record.creatorOnly === true ? { creatorOnly: true }
      : {}),
    rarity: normalizeHomepageRarity(record.rarity),
    assetUrl: typeof record.assetUrl === 'string' && record.assetUrl.trim().length > 0
      ? record.assetUrl.trim()
      : null,
    storagePath: typeof record.storagePath === 'string' && record.storagePath.trim().length > 0
      ? record.storagePath.trim()
      : null,
    attachment: normalizeHomepageAttachment(record.attachment),
    eyePreset: typeof record.eyePreset === 'string' && record.eyePreset.trim().length > 0
      ? record.eyePreset.trim()
      : null,
    materialPreset: typeof record.materialPreset === 'string' && record.materialPreset.trim().length > 0
      ? record.materialPreset.trim()
      : null,
    mysteryBoxEnabled: record.mysteryBoxEnabled !== false,
    active: record.active !== false,
    archived: record.archived === true,
    tags: normalizeTags(record.tags),
    description: typeof record.description === 'string' ? record.description : '',
    preview,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : null,
  };
};

export const buildHomepageCatalogSnapshot = (params: {
  categories: HomepageCategoryRecord[];
  props: HomepagePropRecord[];
  updatedAt?: string | null;
}): HomepageCatalogSnapshot => ({
  version: 1,
  updatedAt: params.updatedAt && params.updatedAt.trim().length > 0
    ? params.updatedAt
    : new Date().toISOString(),
  categories: [...params.categories].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.label.localeCompare(b.label);
  }),
  props: [...params.props].sort((a, b) => a.label.localeCompare(b.label)),
});

export const persistHomepageCatalogSnapshot = (snapshot: HomepageCatalogSnapshot | null): void => {
  try {
    if (!snapshot || (snapshot.categories.length === 0 && snapshot.props.length === 0)) {
      localStorage.removeItem(HOMEPAGE_CATALOG_STORAGE_KEY);
      return;
    }
    localStorage.setItem(HOMEPAGE_CATALOG_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota/private-mode failures; the iframe will still receive direct sync messages.
  }
};

export const readHomepageCatalogSnapshot = (): HomepageCatalogSnapshot | null => {
  try {
    const raw = localStorage.getItem(HOMEPAGE_CATALOG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HomepageCatalogSnapshot>;
    const categories = Array.isArray(parsed.categories)
      ? parsed.categories.map(normalizeHomepageCategory).filter((entry): entry is HomepageCategoryRecord => Boolean(entry))
      : [];
    const props = Array.isArray(parsed.props)
      ? parsed.props.map(normalizeHomepageProp).filter((entry): entry is HomepagePropRecord => Boolean(entry))
      : [];
    const nextSnapshot = buildHomepageCatalogSnapshot({
      categories,
      props,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    });
    return nextSnapshot.categories.length === 0 && nextSnapshot.props.length === 0
      ? null
      : nextSnapshot;
  } catch {
    return null;
  }
};

export const createCreatorCatalogSyncPayload = (params: {
  snapshot: HomepageCatalogSnapshot | null;
  publishEnabled: boolean;
  reason?: string | null;
}) => ({
  type: HOMEPAGE_CATALOG_SYNC,
  payload: {
    snapshot: params.snapshot && (params.snapshot.categories.length > 0 || params.snapshot.props.length > 0)
      ? params.snapshot
      : null,
    publishEnabled: params.publishEnabled,
    reason: params.reason ?? null,
  },
});

export const createMirrorMode = (value: unknown): HomepagePropMirrorMode => (
  value === 'paired' ? 'paired' : 'single'
);
