export const MANIFEST_CACHE_KEY = 'dc:manifest';

export const RUNTIME_METADATA_REQUESTS = Object.freeze([
  Object.freeze({ id: 'metadata-environment', cacheKey: 'metadata-environment', kind: 'json', path: 'assets/metadata/environment.json', essential: true, optional: false }),
  Object.freeze({ id: 'metadata-castle', cacheKey: 'metadata-castle', kind: 'json', path: 'assets/metadata/castle.json', essential: true, optional: false }),
  Object.freeze({ id: 'metadata-defenders', cacheKey: 'metadata-defenders', kind: 'json', path: 'assets/metadata/defenders.json', essential: true, optional: false }),
  Object.freeze({ id: 'metadata-enemies', cacheKey: 'metadata-enemies', kind: 'json', path: 'assets/metadata/enemies.json', essential: true, optional: false }),
  Object.freeze({ id: 'metadata-bosses', cacheKey: 'metadata-bosses', kind: 'json', path: 'assets/metadata/bosses.json', essential: true, optional: false }),
]);

export const ASSET_USAGE_BY_ID = Object.freeze({
  'environment-grass': 'BattleScene terrain tile',
  'environment-path-atlas': 'BattleScene square road tiles',
  'environment-props-atlas': 'BattleScene optional ambient props',
  'environment-gameplay-atlas': 'BattleScene projectiles and effects, plus ResultScene art',
  'environment-title-emblem': 'MenuScene title emblem',
  'castle-states': 'BattleScene castle heart-state projection',
  'catalog-thumbnail': 'MenuScene campaign key art',
  'defender-bladeguard-idle': 'BattleScene Bladeguard idle',
  'defender-bladeguard-attack': 'BattleScene Bladeguard attack',
  'defender-bladeguard-mastery': 'BattleScene Bladeguard mastery',
  'defender-ranger-idle': 'BattleScene Ranger idle',
  'defender-ranger-attack': 'BattleScene Ranger attack',
  'defender-ranger-mastery': 'BattleScene Ranger mastery',
  'defender-ironwarden-idle': 'BattleScene Ironwarden idle',
  'defender-ironwarden-attack': 'BattleScene Ironwarden attack',
  'defender-ironwarden-mastery': 'BattleScene Ironwarden mastery',
  'defender-rune-artificer-idle': 'BattleScene Rune Artificer idle',
  'defender-rune-artificer-attack': 'BattleScene Rune Artificer attack',
  'defender-rune-artificer-mastery': 'BattleScene Rune Artificer mastery',
  'enemy-blight-walker-walk': 'BattleScene Blight Walker movement',
  'enemy-blight-walker-defeat': 'BattleScene Blight Walker defeat tombstone',
  'enemy-skitter-walk': 'BattleScene Skitter movement',
  'enemy-skitter-defeat': 'BattleScene Skitter defeat tombstone',
  'enemy-swarmkin-walk': 'BattleScene Swarmkin movement',
  'enemy-swarmkin-defeat': 'BattleScene Swarmkin defeat tombstone',
  'enemy-shellguard-walk': 'BattleScene Shellguard movement',
  'enemy-shellguard-defeat': 'BattleScene Shellguard defeat tombstone',
  'enemy-hexcaller-walk': 'BattleScene Hexcaller movement',
  'enemy-hexcaller-defeat': 'BattleScene Hexcaller defeat tombstone',
  'enemy-hexcaller-cast': 'BattleScene Hexcaller support cast',
  'enemy-crusher-walk': 'BattleScene Crusher movement',
  'enemy-crusher-defeat': 'BattleScene Crusher defeat tombstone',
  'boss-mossback-brute-walk': 'BattleScene Mossback movement',
  'boss-mossback-brute-ability': 'BattleScene Mossback slam',
  'boss-mossback-brute-defeat': 'BattleScene Mossback defeat tombstone',
  'boss-ironhide-warlord-walk': 'BattleScene Ironhide movement',
  'boss-ironhide-warlord-ability': 'BattleScene Ironhide rally',
  'boss-ironhide-warlord-defeat': 'BattleScene Ironhide defeat tombstone',
  'boss-dread-colossus-walk': 'BattleScene Dread movement and phase accents',
  'boss-dread-colossus-ability': 'BattleScene Dread suppression pulse',
  'boss-dread-colossus-defeat': 'BattleScene Dread defeat tombstone',
});

const OPTIONAL_ASSET_IDS = new Set(['environment-props-atlas']);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export const validateManifest = (manifest) => {
  if (!isRecord(manifest) || manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets)) {
    throw new Error('Asset manifest has an unsupported schema.');
  }
  const ids = new Set();
  for (const asset of manifest.assets) {
    if (!isRecord(asset)
      || typeof asset.id !== 'string'
      || typeof asset.path !== 'string'
      || asset.id.length === 0
      || asset.path.length === 0
      || ids.has(asset.id)
      || !Object.hasOwn(ASSET_USAGE_BY_ID, asset.id)) {
      throw new Error(`Asset manifest contains an invalid record: ${asset?.id ?? 'unknown'}.`);
    }
    if (!Number.isInteger(asset.width) || asset.width <= 0
      || !Number.isInteger(asset.height) || asset.height <= 0) {
      throw new Error(`Asset ${asset.id} has invalid dimensions.`);
    }
    if (asset.frameCount !== undefined && (
      !Number.isInteger(asset.frameWidth) || asset.frameWidth <= 0
      || !Number.isInteger(asset.frameHeight) || asset.frameHeight <= 0
      || !Number.isInteger(asset.frameCount) || asset.frameCount <= 0
    )) throw new Error(`Asset ${asset.id} has invalid frame geometry.`);
    ids.add(asset.id);
  }
  const expectedIds = Object.keys(ASSET_USAGE_BY_ID);
  if (ids.size !== expectedIds.length || expectedIds.some((id) => !ids.has(id))) {
    throw new Error('Asset manifest does not match the complete campaign inventory.');
  }
  return manifest;
};

const classifyRaster = (asset) => {
  const optional = OPTIONAL_ASSET_IDS.has(asset.id);
  return Object.freeze({
    ...asset,
    cacheKey: asset.id,
    essential: !optional,
    kind: asset.frameCount ? 'spritesheet' : 'image',
    optional,
    use: ASSET_USAGE_BY_ID[asset.id],
  });
};

export const createCampaignAssetPlan = (manifest) => {
  validateManifest(manifest);
  return Object.freeze({
    metadata: RUNTIME_METADATA_REQUESTS,
    rasters: Object.freeze(manifest.assets.map(classifyRaster)),
  });
};

export const createAssetLoadTracker = (records = []) => {
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const failedEssential = new Set();
  const optionalFailures = new Set();

  return Object.freeze({
    getFailedEssentialIds: () => [...failedEssential],
    getOptionalFailures: () => [...optionalFailures],
    getRetryRecords: () => [...failedEssential].map((id) => recordsById.get(id)).filter(Boolean),
    isBlocked: () => failedEssential.size > 0,
    recordFailure(id) {
      const record = recordsById.get(id);
      if (!record) return false;
      if (record.optional) optionalFailures.add(id);
      else failedEssential.add(id);
      return true;
    },
    recordSuccess(id) {
      failedEssential.delete(id);
    },
  });
};

export const createQaFailureInjector = ({ enabled = false, search = '' } = {}) => {
  const params = new URLSearchParams(search);
  const explicitEssential = params.get('qaFailEssential');
  const requestedId = explicitEssential || (params.get('qaFailOptional') === '1'
    ? 'environment-props-atlas'
    : null);
  const injected = new Set();
  return Object.freeze({
    rewrite(record) {
      if (!enabled || !requestedId || record.id !== requestedId || injected.has(record.id)) {
        return record.path;
      }
      injected.add(record.id);
      return `http://127.0.0.1:1/__defender_champion_qa_missing__/${encodeURIComponent(record.id)}`;
    },
  });
};

const queueRecord = (scene, record, path) => {
  if (record.kind === 'spritesheet') {
    scene.load.spritesheet(record.cacheKey, path, {
      endFrame: record.frameCount - 1,
      frameHeight: record.frameHeight,
      frameWidth: record.frameWidth,
    });
  } else if (record.kind === 'image') {
    scene.load.image(record.cacheKey, path);
  } else {
    scene.load.json(record.cacheKey, path);
  }
};

export const queueCampaignAssets = (scene, records, { failureInjector } = {}) => {
  for (const record of records) {
    queueRecord(scene, record, failureInjector?.rewrite?.(record) ?? record.path);
  }
};

export const hydrateCampaignImages = (documentRef, plan) => {
  const rastersById = new Map((plan?.rasters ?? []).map((record) => [record.id, record]));
  const hydratedIds = [];
  for (const image of documentRef?.querySelectorAll?.('[data-campaign-asset-id]') ?? []) {
    const id = image.dataset?.campaignAssetId;
    const record = rastersById.get(id);
    if (!record) continue;
    image.setAttribute('src', record.path);
    hydratedIds.push(id);
  }
  return hydratedIds;
};

export const buildAnimationDefinitions = ({ defenders, enemies, bosses }) => {
  const groups = [
    ['defender', defenders?.defenders ?? []],
    ['enemy', enemies?.enemies ?? []],
    ['boss', bosses?.bosses ?? []],
  ];
  return groups.flatMap(([kind, roster]) => roster.flatMap((character) => character.actions.map((action) => ({
    assetId: action.assetId,
    durationMs: action.frameDurationMs * action.frameCount,
    frameCount: action.frameCount,
    frameDurationMs: action.frameDurationMs,
    key: `${kind}:${character.id}:${action.id}`,
    loop: action.loop,
    repeat: action.loop ? -1 : 0,
  }))));
};

export const registerMetadataAnimations = (scene, metadata) => {
  const definitions = buildAnimationDefinitions(metadata);
  for (const definition of definitions) {
    if (scene.anims.exists(definition.key)) continue;
    scene.anims.create({
      key: definition.key,
      frames: scene.anims.generateFrameNumbers(definition.assetId, {
        end: definition.frameCount - 1,
        start: 0,
      }),
      frameRate: 1_000 / definition.frameDurationMs,
      repeat: definition.repeat,
    });
  }
  return definitions;
};

export const getRuntimePayloadPaths = (manifest) => [
  'index.html',
  'css/game.css',
  'js/app.bundle.js',
  '../shared/lahsPointsBridge.js',
  'assets/manifest.json',
  ...RUNTIME_METADATA_REQUESTS.map(({ path }) => path),
  ...validateManifest(manifest).assets.map(({ path }) => path),
];
