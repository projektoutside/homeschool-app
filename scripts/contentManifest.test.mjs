import assert from 'node:assert/strict';
import test from 'node:test';
import { validateManifest } from './content/manifest-validator.mjs';

const game = {
  schemaVersion: 1,
  kind: 'game',
  id: 'sample-game',
  title: 'Sample Game',
  version: '1.0.0',
  entry: './src/main.ts',
  runtime: 'canvas',
  orientation: 'any',
  responsive: true,
  classification: ['single-player', 'math'],
  capabilities: ['audio', 'storage'],
  permissions: [],
  mediaBundles: [],
  rewards: [{ code: 'answer.correct', points: 10 }],
  compatibility: { legacyPaths: ['/Games/Sample/index.html'], protocolVersion: 1 },
};

test('valid game manifest is normalized and detached from the input', () => {
  const normalized = validateManifest(game, 'sample');

  assert.deepEqual(normalized, game);
  assert.notEqual(normalized, game);
  assert.ok(Object.isFrozen(normalized));
});
test('manifest rejects traversal and undeclared values', () => {
  assert.throws(() => validateManifest({ ...game, entry: '../../secret.js' }, 'traversal'), /entry/);
  assert.throws(() => validateManifest({ ...game, permissions: ['everything'] }, 'permission'), /permissions/);
  assert.throws(() => validateManifest({ ...game, surprise: true }, 'extra'), /surprise/);
});

test('classroom references must resolve to declared rooms and stations', () => {
  const classroom = {
    schemaVersion: 1,
    kind: 'classroom',
    id: 'sample-classroom',
    title: 'Sample Classroom',
    version: '1.0.0',
    orientation: 'landscape',
    responsive: true,
    classification: ['classroom'],
    permissions: [],
    mediaBundles: [],
    compatibility: { legacyPaths: ['/3dClass/index.html'], protocolVersion: 1 },
    entryRoomId: 'lobby',
    rooms: [{
      id: 'lobby',
      entry: './src/lobby.ts',
      runtime: 'three',
      stations: ['catalog'],
      portals: [],
    }],
    stations: [{ id: 'catalog', kind: 'catalog', targetId: 'games', capabilities: [] }],
  };

  assert.deepEqual(validateManifest(classroom, 'classroom'), classroom);
  assert.throws(
    () => validateManifest({ ...classroom, entryRoomId: 'missing' }, 'missing-room'),
    /entryRoomId/,
  );
});
