const RUNTIME_VALUES = ['dom', 'canvas', 'phaser', 'three', 'react-three-fiber', 'legacy-iframe'];
const ROOM_RUNTIME_VALUES = ['dom', 'canvas', 'three', 'react-three-fiber', 'legacy-iframe'];
const CAPABILITY_VALUES = ['audio', 'storage', 'rewards', 'speech', 'camera', 'microphone', 'fullscreen', 'orientation', 'network'];
const PERMISSION_VALUES = ['camera', 'microphone', 'geolocation', 'accelerometer', 'gyroscope'];

export const RUNTIMES = new Set(RUNTIME_VALUES);
export const CAPABILITIES = new Set(CAPABILITY_VALUES);
export const PERMISSIONS = new Set(PERMISSION_VALUES);

const ROOM_RUNTIMES = new Set(ROOM_RUNTIME_VALUES);
const ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const COMMON_KEYS = [
  'schemaVersion',
  'kind',
  'id',
  'title',
  'version',
  'orientation',
  'responsive',
  'classification',
  'permissions',
  'mediaBundles',
  'compatibility',
];

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = (source, field) => { throw new Error(`${source}: invalid ${field}`); };
const validId = (value) => typeof value === 'string' && ID.test(value);
const validEntry = (value) => typeof value === 'string'
  && value.startsWith('./')
  && !value.includes('..')
  && !value.includes('\\');
const uniqueStrings = (value, allowed) => Array.isArray(value)
  && value.every((item) => typeof item === 'string' && (!allowed || allowed.has(item)))
  && new Set(value).size === value.length;

const validateKeys = (value, allowedKeys, source, field) => {
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(value).find((key) => !allowed.has(key));
  if (unexpected) fail(source, `${field}.${unexpected}`);
};
const validateCommon = (value, source) => {
  if (value.schemaVersion !== 1) fail(source, 'schemaVersion');
  if (!validId(value.id)) fail(source, 'id');
  if (typeof value.title !== 'string' || !value.title.trim()) fail(source, 'title');
  if (typeof value.version !== 'string' || !SEMVER.test(value.version)) fail(source, 'version');
  if (!['any', 'portrait', 'landscape'].includes(value.orientation)) fail(source, 'orientation');
  if (typeof value.responsive !== 'boolean') fail(source, 'responsive');
  if (!uniqueStrings(value.classification)) fail(source, 'classification');
  if (!uniqueStrings(value.permissions, PERMISSIONS)) fail(source, 'permissions');
  if (!uniqueStrings(value.mediaBundles) || !value.mediaBundles.every(validId)) fail(source, 'mediaBundles');
  if (!isRecord(value.compatibility)) fail(source, 'compatibility');
  validateKeys(value.compatibility, ['legacyPaths', 'protocolVersion'], source, 'compatibility');
  if (value.compatibility.protocolVersion !== 1) fail(source, 'compatibility');
  if (
    !uniqueStrings(value.compatibility.legacyPaths)
    || !value.compatibility.legacyPaths.every((path) => path.startsWith('/') && !path.includes('..') && !path.includes('\\'))
  ) {
    fail(source, 'compatibility.legacyPaths');
  }
};

const validateGame = (value, source) => {
  validateKeys(value, [...COMMON_KEYS, 'entry', 'runtime', 'capabilities', 'rewards'], source, 'manifest');
  if (!validEntry(value.entry)) fail(source, 'entry');
  if (!RUNTIMES.has(value.runtime)) fail(source, 'runtime');
  if (!uniqueStrings(value.capabilities, CAPABILITIES)) fail(source, 'capabilities');
  if (!Array.isArray(value.rewards)) fail(source, 'rewards');

  const codes = new Set();
  for (const reward of value.rewards) {
    if (!isRecord(reward)) fail(source, 'rewards');
    validateKeys(reward, ['code', 'points'], source, 'rewards');
    if (
      !validId(reward.code)
      || !Number.isInteger(reward.points)
      || reward.points === 0
      || Math.abs(reward.points) > 1000
      || codes.has(reward.code)
    ) {
      fail(source, 'rewards');
    }
    codes.add(reward.code);
  }
};

const validateClassroom = (value, source) => {
  validateKeys(value, [...COMMON_KEYS, 'entryRoomId', 'rooms', 'stations'], source, 'manifest');
  if (!validId(value.entryRoomId) || !Array.isArray(value.rooms) || !Array.isArray(value.stations)) {
    fail(source, 'classroom');
  }

  const roomIds = new Set();
  const stationIds = new Set();
  for (const station of value.stations) {
    if (!isRecord(station)) fail(source, 'stations');
    validateKeys(station, ['id', 'kind', 'targetId', 'capabilities'], source, 'stations');
    if (
      !validId(station.id)
      || stationIds.has(station.id)
      || !['catalog', 'module'].includes(station.kind)
      || !validId(station.targetId)
      || !uniqueStrings(station.capabilities, CAPABILITIES)
    ) {
      fail(source, 'stations');
    }
    stationIds.add(station.id);
  }

  for (const room of value.rooms) {
    if (!isRecord(room)) fail(source, 'rooms');
    validateKeys(room, ['id', 'entry', 'runtime', 'stations', 'portals'], source, 'rooms');
    if (
      !validId(room.id)
      || roomIds.has(room.id)
      || !validEntry(room.entry)
      || !ROOM_RUNTIMES.has(room.runtime)
      || !uniqueStrings(room.stations)
      || !Array.isArray(room.portals)
    ) {
      fail(source, 'rooms');
    }
    roomIds.add(room.id);
  }

  if (!roomIds.has(value.entryRoomId)) fail(source, 'entryRoomId');
  for (const room of value.rooms) {
    if (!room.stations.every((id) => stationIds.has(id))) fail(source, 'room.stations');
    const portalIds = new Set();
    for (const portal of room.portals) {
      if (!isRecord(portal)) fail(source, 'room.portals');
      validateKeys(portal, ['id', 'targetRoomId'], source, 'room.portals');
      if (
        !validId(portal.id)
        || portalIds.has(portal.id)
        || !roomIds.has(portal.targetRoomId)
      ) {
        fail(source, 'room.portals');
      }
      portalIds.add(portal.id);
    }
  }
};

export const validateManifest = (value, source) => {
  if (!isRecord(value) || !['game', 'classroom'].includes(value.kind)) fail(source, 'kind');
  validateCommon(value, source);
  if (value.kind === 'game') validateGame(value, source);
  if (value.kind === 'classroom') validateClassroom(value, source);
  return Object.freeze(structuredClone(value));
};
