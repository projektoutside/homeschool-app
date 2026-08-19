import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, open, readFile, readdir, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const gameRoot = path.join(repoRoot, 'public', 'Games', 'DefenderChampion');
const manifestPath = path.join(gameRoot, 'assets', 'manifest.json');
const provenancePath = path.join(gameRoot, 'assets', 'provenance.json');
const environmentMetadataPath = path.join(gameRoot, 'assets', 'metadata', 'environment.json');
const castleMetadataPath = path.join(gameRoot, 'assets', 'metadata', 'castle.json');
const defenderMetadataPath = path.join(gameRoot, 'assets', 'metadata', 'defenders.json');
const enemyMetadataPath = path.join(gameRoot, 'assets', 'metadata', 'enemies.json');
const bossMetadataPath = path.join(gameRoot, 'assets', 'metadata', 'bosses.json');
const optimizerPath = path.join(repoRoot, 'scripts', 'optimize-defender-champion-images.py');
const bundledPythonPath = 'C:\\Users\\Xator\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe';
const systemPythonPath = process.platform === 'win32' ? 'python' : 'python3';
const defaultPythonPath = existsSync(bundledPythonPath) ? bundledPythonPath : systemPythonPath;
const pythonPath = process.env.DEFENDER_CHAMPION_ASSET_PYTHON ?? defaultPythonPath;
const perAssetLimit = 1_500_000;
const manifestTotalLimit = 15_000_000;
const expectedManifestRasterBytes = 13_054_178;
const atlasFrameSize = 314;
const pathLaneWidth = 128;
const pathSafeInset = 24;
const spriteSafeInset = 16;
const defenderFrameSize = 256;
const defenderSafeInset = 8;
const defenderOrder = ['bladeguard', 'ranger', 'ironwarden', 'rune-artificer'];
const defenderActions = [
  { id: 'idle', frameCount: 4, frameDurationMs: 180, loop: true },
  { id: 'attack', frameCount: 6, frameDurationMs: 100, loop: false },
  { id: 'mastery', frameCount: 8, frameDurationMs: 110, loop: false },
];
const enemyFrameSize = 256;
const enemySafeInset = 8;
const enemyOrder = ['blight-walker', 'skitter', 'swarmkin', 'shellguard', 'hexcaller', 'crusher'];
const enemyActionOrder = ['walk', 'defeat', 'cast'];
const enemyActionContracts = {
  walk: { frameCount: 6, frameDurationMs: 120, loop: true },
  defeat: { frameCount: 6, frameDurationMs: 140, loop: false },
  cast: { frameCount: 8, frameDurationMs: 110, loop: false },
};
const bossFrameSize = 384;
const bossSafeInset = 12;
const bossOrder = ['mossback-brute', 'ironhide-warlord', 'dread-colossus'];
const bossActionOrder = ['walk', 'ability', 'defeat'];
const bossActionContracts = {
  walk: { frameCount: 8, frameDurationMs: 150, loop: true },
  ability: { frameCount: 8, frameDurationMs: 125, loop: false },
  defeat: { frameCount: 10, frameDurationMs: 150, loop: false },
};
const expectedPostNormalizationPolicy = {
  postCommonScaleAllowedOperations: ['translate', 'bottom-center', 'pad'],
  geometricRescaleAllowed: false,
  canonicalAlpha: 'crop alpha greater than zero to its tight bbox and hash row-major bytes',
};
const characterQ98AssetIds = new Set([
  'boss-mossback-brute-walk',
  'boss-mossback-brute-ability',
  'boss-mossback-brute-defeat',
  'boss-ironhide-warlord-walk',
  'boss-ironhide-warlord-ability',
  'boss-ironhide-warlord-defeat',
  'boss-dread-colossus-walk',
  'boss-dread-colossus-ability',
  'boss-dread-colossus-defeat',
]);
const reviewedDefeatScaleFixtures = {
  'enemy-blight-walker-defeat': {
    4: { width: 145, height: 70 },
    5: { width: 142, height: 61 },
  },
  'enemy-hexcaller-defeat': {
    5: { width: 218, height: 113 },
  },
  'boss-mossback-brute-defeat': {
    8: { width: 221, height: 118 },
    9: { width: 218, height: 96 },
  },
  'boss-ironhide-warlord-defeat': {
    6: { width: 157, height: 126 },
    7: { width: 169, height: 83 },
    8: { width: 152, height: 73 },
    9: { width: 152, height: 74 },
  },
  'boss-dread-colossus-defeat': {
    8: { width: 222, height: 109 },
    9: { width: 223, height: 109 },
  },
};
const expectedManifestAssets = [
  ['environment-grass', 'assets/environment/grass.webp'],
  ['environment-path-atlas', 'assets/environment/path-atlas.webp'],
  ['environment-props-atlas', 'assets/environment/props-atlas.webp'],
  ['environment-gameplay-atlas', 'assets/environment/gameplay-atlas.webp'],
  ['environment-title-emblem', 'assets/environment/title-emblem.webp'],
  ['castle-states', 'assets/castle/castle-states.webp'],
  ['catalog-thumbnail', 'thumb.webp'],
  ...defenderOrder.flatMap((defenderId) => defenderActions.map(({ id: actionId }) => [
    `defender-${defenderId}-${actionId}`,
    `assets/defenders/${defenderId}-${actionId}.webp`,
  ])),
  ...enemyOrder.flatMap((enemyId) => {
    const actions = enemyId === 'hexcaller' ? enemyActionOrder : enemyActionOrder.slice(0, 2);
    return actions.map((actionId) => [
      `enemy-${enemyId}-${actionId}`,
      `assets/enemies/${enemyId}-${actionId}.webp`,
    ]);
  }),
  ...bossOrder.flatMap((bossId) => bossActionOrder.map((actionId) => [
    `boss-${bossId}-${actionId}`,
    `assets/bosses/${bossId}-${actionId}.webp`,
  ])),
];
const expectedTierEffects = {
  bladeguard: { weaponGlow: 'shield-bash', masteryEffect: 'shield-bash', tint: '#8FE36A' },
  ranger: { weaponGlow: 'arrow', masteryEffect: 'arrow', tint: '#F2C94C' },
  ironwarden: { weaponGlow: 'shield-bash', masteryEffect: 'shield-bash', tint: '#69A7FF' },
  'rune-artificer': { weaponGlow: 'rune-bolt', masteryEffect: 'explosion', tint: '#58D5FF' },
};
const expectedSharedScaleEvidence = {
  bladeguard: { idle: 175, attack: 175, mastery: 175 },
  ranger: { idle: 149, attack: 149, mastery: 149 },
  ironwarden: { idle: 144, attack: 144, mastery: 144 },
  'rune-artificer': { idle: 128, attack: 128, mastery: 127 },
};
const defenderRoleBriefs = {
  bladeguard: 'agile youthful champion in green-and-cream leather armor with short silver sword and round blue shield',
  ranger: 'focused green-hooded longbow champion with brown leather gear and a clear wooden bow',
  ironwarden: 'sturdy cobalt-and-silver armored guardian with broad shield, short sword, and blue plume',
  'rune-artificer': 'clever cobalt-hooded fantasy artificer with a brass-and-wood rune launcher that reads as magical equipment rather than a firearm',
};
const enemyRoleBriefs = {
  'blight-walker': 'small moss-green blight humanoid with purple tunic, expressive face, and simple boots',
  skitter: 'lean yellow-green blight runner with swept-back leaf shapes and light orange gear',
  swarmkin: 'tiny bright-green leaf goblin with oversized readable head and compact limbs',
  shellguard: 'squat dark-green blight guard enclosed in layered bark-and-stone armor',
  hexcaller: 'slender olive-green support creature in a purple hood carrying a crooked glowing seed staff',
  crusher: 'hulking moss-and-stone elite with massive shoulders, heavy feet, and no weapon',
};
const bossRoleBriefs = {
  'mossback-brute': 'giant ancient moss-covered brute with root plates and a readable slam silhouette',
  'ironhide-warlord': 'imposing blight commander with three visibly distinct iron-bark armor plates and a banner crest',
  'dread-colossus': 'enormous final blight titan with blue-green rune cracks, crown-like horns, and three visually readable phase accents',
};
const enemyPromptRequirements = {
  walk: 'in-place upper-left walking cycle',
  defeat: 'clear non-gory defeat',
  cast: 'one support cast',
};
const bossPromptRequirements = {
  'mossback-brute': {
    walk: 'powerful in-place upper-left walking cycle',
    ability: 'raise both arms, show a close warning glow, slam the ground, and recover',
    defeat: 'dramatic but non-gory defeat',
  },
  'ironhide-warlord': {
    walk: 'powerful in-place upper-left walking cycle',
    ability: 'plant its stance, raise its banner crest, emit one compact rally pulse, and recover',
    defeat: 'dramatic but non-gory defeat',
  },
  'dread-colossus': {
    walk: 'powerful in-place upper-left walking cycle',
    ability: 'gather blue-green runes, hold a clear warning pose, release one compact suppression pulse, and return toward forward motion',
    defeat: 'dramatic but non-gory defeat',
  },
};
const expectedEnemyPresentationMappings = {
  normalMovement: { action: 'walk' },
  defeatRemoval: { action: 'defeat' },
  sourceEffects: {
    'enemy-healing': {
      sourceEnemyId: 'hexcaller',
      action: 'cast',
      overlay: { atlasAssetId: 'environment-gameplay-atlas', frameId: 'heal-sparkle' },
    },
    'enemy-speed': {
      sourceEnemyId: 'hexcaller',
      action: 'cast',
      overlay: { atlasAssetId: 'environment-gameplay-atlas', frameId: 'range-marker' },
    },
  },
};
const expectedBossPresentationMappings = {
  'mossback-brute': {
    normalMovement: { action: 'walk' },
    defeatRemoval: { action: 'defeat' },
    abilities: {
      'mossback-telegraph': {
        action: 'ability',
        overlay: { atlasAssetId: 'environment-gameplay-atlas', frameId: 'boss-warning' },
        externalRangeWarning: true,
      },
    },
  },
  'ironhide-warlord': {
    normalMovement: { action: 'walk' },
    defeatRemoval: { action: 'defeat' },
    abilities: {
      'rally-counter-transition': {
        action: 'ability',
        overlay: { atlasAssetId: 'environment-gameplay-atlas', frameId: 'shield-bash' },
      },
    },
    plateAccents: [
      { threshold: 'plate75', removeAccent: 'iron-bark-plate-1' },
      { threshold: 'plate50', removeAccent: 'iron-bark-plate-2' },
      { threshold: 'plate25', removeAccent: 'iron-bark-plate-3' },
    ],
    plateCrackOverlay: { atlasAssetId: 'environment-gameplay-atlas', frameId: 'defeat-crack' },
    vulnerabilityAccent: {
      sourceState: 'vulnerableUntilTick',
      overlay: { atlasAssetId: 'environment-gameplay-atlas', frameId: 'slow-rune' },
    },
    baseArtUnderlayer: 'coherent-underlayer-beneath-three-removable-runtime-plate-accents',
  },
  'dread-colossus': {
    normalMovement: { action: 'walk' },
    defeatRemoval: { action: 'defeat' },
    abilities: {
      'dread-pulse-telegraph': {
        action: 'ability',
        warningOverlay: { atlasAssetId: 'environment-gameplay-atlas', frameId: 'boss-warning' },
        suppressionRangeOverlay: { atlasAssetId: 'environment-gameplay-atlas', frameId: 'range-marker' },
      },
    },
    healthRatioPhases: [
      { phase: 1, range: '1.00-0.75', accent: 'phase-1-runes' },
      { phase: 2, range: 'below-0.75-through-0.40', accent: 'phase-2-runes' },
      { phase: 3, range: 'below-0.40', accent: 'phase-3-runes' },
    ],
    summonThresholds: [
      { healthRatio: 0.75, summon: 'swarmkin-pack-1', accent: 'phase-2-runes' },
      { healthRatio: 0.5, summon: 'swarmkin-pack-2', accent: 'phase-2-runes' },
      { healthRatio: 0.25, summon: 'swarmkin-pack-3', accent: 'phase-3-runes' },
    ],
    phaseAccentOverlay: { atlasAssetId: 'environment-gameplay-atlas', frameId: 'slow-rune' },
  },
};
const expectedActionDirections = {
  bladeguard: {
    attack: 'quick short-sword slash while the shield stays readable',
    mastery: 'a controlled sword-and-shield whirlwind with compact silver wind arcs, clearly returning to guard',
  },
  ranger: {
    attack: 'draw, release one arrow, recover; bow/string continuity must stay readable',
    mastery: 'a critical volley, drawing high and releasing a compact fan of three gold-tipped arrows without arrows crossing a slot boundary',
  },
  ironwarden: {
    attack: 'heavy shield-led sword bash',
    mastery: 'a rally bash, planting the broad shield and releasing one compact blue-and-gold rally pulse around the feet',
  },
  'rune-artificer': {
    attack: 'shoulder the brass-and-wood rune launcher and release a blue rune bolt; it must remain magical equipment, not a firearm',
    mastery: 'a double detonation, charging the launcher then releasing one close blue rune burst followed by a smaller echo ring',
  },
};
const expectedPathTiles = [
  { id: 'isolated', connects: [] },
  { id: 'straight-horizontal', connects: ['east', 'west'] },
  { id: 'straight-vertical', connects: ['north', 'south'] },
  { id: 'cross-north-east-south-west', connects: ['north', 'east', 'south', 'west'] },
  { id: 'corner-north-east', connects: ['north', 'east'] },
  { id: 'corner-east-south', connects: ['east', 'south'] },
  { id: 'corner-south-west', connects: ['south', 'west'] },
  { id: 'corner-west-north', connects: ['west', 'north'] },
  { id: 'tee-north-east-south', connects: ['north', 'east', 'south'] },
  { id: 'tee-east-south-west', connects: ['east', 'south', 'west'] },
  { id: 'tee-south-west-north', connects: ['south', 'west', 'north'] },
  { id: 'tee-west-north-east', connects: ['west', 'north', 'east'] },
  { id: 'cap-north', connects: ['north'] },
  { id: 'cap-east', connects: ['east'] },
  { id: 'cap-south', connects: ['south'] },
  { id: 'cap-west', connects: ['west'] },
];
const expectedPropsOrder = [
  'tree-broad', 'tree-round', 'tree-leafy', 'tree-pine',
  'bush-leafy', 'bush-flowered', 'bush-spiky', 'bush-berry',
  'rock-large', 'rock-small', 'white-flower-single', 'white-flower-pair',
  'grass-cluster-small', 'grass-cluster-large', 'banner-blue', 'banner-shield',
];
const expectedGameplayOrder = [
  'build-pad', 'selected-build-pad', 'range-marker', 'gold-coin',
  'full-heart', 'empty-heart', 'arrow', 'rune-bolt',
  'shield-bash', 'explosion', 'stun-stars', 'slow-rune',
  'heal-sparkle', 'boss-warning', 'victory-burst', 'defeat-crack',
];

const alphaInspectorScript = String.raw`
import hashlib
import json
import sys
from PIL import Image

source, frame_width, frame_height, threshold = sys.argv[1:]
frame_width = int(frame_width)
frame_height = int(frame_height)
threshold = int(threshold)

with Image.open(source) as opened:
    image = opened.convert('RGBA')

def bbox(alpha, cutoff):
    found = alpha.point(lambda value: 255 if value > cutoff else 0).getbbox()
    return None if found is None else list(found)

def component_sizes(alpha, cutoff):
    width, height = alpha.size
    pixels = bytearray(alpha.tobytes())
    visited = bytearray(width * height)
    sizes = []
    for start, value in enumerate(pixels):
        if value <= cutoff or visited[start]:
            continue
        visited[start] = 1
        stack = [start]
        size = 0
        while stack:
            point = stack.pop()
            size += 1
            x = point % width
            y = point // width
            for neighbor in (
                point - 1 if x else -1,
                point + 1 if x + 1 < width else -1,
                point - width if y else -1,
                point + width if y + 1 < height else -1,
            ):
                if neighbor >= 0 and not visited[neighbor] and pixels[neighbor] > cutoff:
                    visited[neighbor] = 1
                    stack.append(neighbor)
        sizes.append(size)
    return sorted(sizes, reverse=True)

def longest_run(values):
    longest = 0
    current = 0
    for value in values:
        current = current + 1 if value else 0
        longest = max(longest, current)
    return longest

frames = []
for top in range(0, image.height, frame_height):
    for left in range(0, image.width, frame_width):
        alpha = image.crop((left, top, left + frame_width, top + frame_height)).getchannel('A')
        pixels = alpha.load()
        meaningful_bbox = bbox(alpha, threshold)
        bbox_edge_runs = None
        if meaningful_bbox is not None:
            box_left, box_top, box_right, box_bottom = meaningful_bbox
            bbox_edge_runs = {
                'north': longest_run(pixels[x, box_top] > threshold for x in range(box_left, box_right)),
                'east': longest_run(pixels[box_right - 1, y] > threshold for y in range(box_top, box_bottom)),
                'south': longest_run(pixels[x, box_bottom - 1] > threshold for x in range(box_left, box_right)),
                'west': longest_run(pixels[box_left, y] > threshold for y in range(box_top, box_bottom)),
            }
        frames.append({
            'alphaExtrema': list(alpha.getextrema()),
            'bbox0': bbox(alpha, 0),
            'bbox': meaningful_bbox,
            'bboxEdgeRuns': bbox_edge_runs,
            'components0': component_sizes(alpha, 0),
            'components': component_sizes(alpha, threshold),
            'canonicalAlpha': None if bbox(alpha, 0) is None else {
                'bboxWidth': bbox(alpha, 0)[2] - bbox(alpha, 0)[0],
                'bboxHeight': bbox(alpha, 0)[3] - bbox(alpha, 0)[1],
                'nonzeroCount': sum(value > 0 for value in alpha.getdata()),
                'meaningfulCount': sum(value > threshold for value in alpha.getdata()),
                'sha256': hashlib.sha256(alpha.crop(tuple(bbox(alpha, 0))).tobytes()).hexdigest(),
            },
            'rgbaHash': hashlib.sha256(image.crop((left, top, left + frame_width, top + frame_height)).tobytes()).hexdigest(),
            'edges': {
                'north': [x for x in range(frame_width) if pixels[x, 0] > threshold],
                'east': [y for y in range(frame_height) if pixels[frame_width - 1, y] > threshold],
                'south': [x for x in range(frame_width) if pixels[x, frame_height - 1] > threshold],
                'west': [y for y in range(frame_height) if pixels[0, y] > threshold],
            },
        })

print(json.dumps(frames, separators=(',', ':')))
`;

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

const inspectAlphaFrames = (filePath, frameWidth, frameHeight, threshold = 64) => {
  const inspection = spawnSync(
    pythonPath,
    ['-c', alphaInspectorScript, filePath, String(frameWidth), String(frameHeight), String(threshold)],
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );
  assert.equal(inspection.status, 0, inspection.stderr);
  return JSON.parse(inspection.stdout);
};

const assertCenteredSafeSprite = (frame, label, safeInset) => {
  assert.ok(frame.bbox0, `${label} must contain visible alpha`);
  const [left, top, right, bottom] = frame.bbox0;
  assert.ok(left >= safeInset, `${label} crosses its left safe inset (${left} < ${safeInset})`);
  assert.ok(top >= safeInset, `${label} crosses its top safe inset (${top} < ${safeInset})`);
  assert.ok(
    atlasFrameSize - right >= safeInset,
    `${label} crosses its right safe inset (${atlasFrameSize - right} < ${safeInset})`,
  );
  assert.ok(
    atlasFrameSize - bottom >= safeInset,
    `${label} crosses its bottom safe inset (${atlasFrameSize - bottom} < ${safeInset})`,
  );
  assert.ok(Math.abs((left + right - 1) / 2 - (atlasFrameSize - 1) / 2) <= 1,
    `${label} is not horizontally centered`);
  assert.ok(Math.abs((top + bottom - 1) / 2 - (atlasFrameSize - 1) / 2) <= 1,
    `${label} is not vertically centered`);
  assert.deepEqual(
    Object.fromEntries(Object.entries(frame.edges).map(([side, positions]) => [side, positions.length])),
    { north: 0, east: 0, south: 0, west: 0 },
    `${label} bleeds across a shared cell border`,
  );
  for (const [side, runLength] of Object.entries(frame.bboxEdgeRuns)) {
    assert.ok(
      runLength <= 24,
      `${label} has a ${runLength}px flat ${side} alpha cutoff inherited from a source grid boundary`,
    );
  }
};

const assertCaseCorrectRelativePath = async (relativePath) => {
  assert.equal(typeof relativePath, 'string');
  assert.ok(relativePath.length > 0, 'asset path must not be empty');
  assert.equal(path.isAbsolute(relativePath), false, `${relativePath} must be relative`);
  assert.equal(relativePath.includes('\\'), false, `${relativePath} must use forward slashes`);

  const segments = relativePath.split('/');
  assert.equal(segments.includes(''), false, `${relativePath} contains an empty segment`);
  assert.equal(segments.includes('.'), false, `${relativePath} contains a current-directory segment`);
  assert.equal(segments.includes('..'), false, `${relativePath} escapes the game directory`);

  let current = gameRoot;
  for (const segment of segments) {
    const entries = await readdir(current);
    assert.ok(entries.includes(segment), `${relativePath} is missing or has incorrect path casing at ${segment}`);
    current = path.join(current, segment);
  }

  const resolved = path.resolve(current);
  assert.ok(resolved.startsWith(`${path.resolve(gameRoot)}${path.sep}`), `${relativePath} escapes the game directory`);
  return resolved;
};

const assertWebpSignature = async (filePath, relativePath) => {
  const handle = await open(filePath, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    assert.equal(bytesRead, 12, `${relativePath} has an incomplete WebP header`);
    assert.equal(header.subarray(0, 4).toString('ascii'), 'RIFF', `${relativePath} is not RIFF`);
    assert.equal(header.subarray(8, 12).toString('ascii'), 'WEBP', `${relativePath} is not WebP`);
  } finally {
    await handle.close();
  }
};

const readWebpInfo = async (filePath) => {
  const bytes = await readFile(filePath);
  let offset = 12;
  let width;
  let height;
  let alpha = false;

  while (offset + 8 <= bytes.length) {
    const type = bytes.subarray(offset, offset + 4).toString('ascii');
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const payload = offset + 8;
    assert.ok(payload + chunkSize <= bytes.length, `${filePath} has a truncated ${type} chunk`);

    if (type === 'VP8X') {
      alpha ||= (bytes[payload] & 0x10) !== 0;
      width = 1 + bytes.readUIntLE(payload + 4, 3);
      height = 1 + bytes.readUIntLE(payload + 7, 3);
    } else if (type === 'VP8L') {
      assert.equal(bytes[payload], 0x2f, `${filePath} has an invalid VP8L signature`);
      const dimensions = bytes.readUInt32LE(payload + 1);
      width = 1 + (dimensions & 0x3fff);
      height = 1 + ((dimensions >>> 14) & 0x3fff);
      alpha ||= ((dimensions >>> 28) & 1) === 1;
    } else if (type === 'VP8 ') {
      assert.deepEqual(
        bytes.subarray(payload + 3, payload + 6),
        Buffer.from([0x9d, 0x01, 0x2a]),
        `${filePath} has an invalid VP8 frame header`,
      );
      width = bytes.readUInt16LE(payload + 6) & 0x3fff;
      height = bytes.readUInt16LE(payload + 8) & 0x3fff;
    } else if (type === 'ALPH') {
      alpha = true;
    }

    offset = payload + chunkSize + (chunkSize % 2);
  }

  assert.ok(Number.isInteger(width) && width > 0, `${filePath} has no readable WebP width`);
  assert.ok(Number.isInteger(height) && height > 0, `${filePath} has no readable WebP height`);
  return { width, height, alpha };
};

test('Defender Champion optimizer is deterministic, source preserving, and alpha safe', async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'defender-champion-assets-'));
  const inputPath = path.join(temporaryDirectory, 'source.png');
  const firstOutput = path.join(temporaryDirectory, 'first.webp');
  const secondOutput = path.join(temporaryDirectory, 'second.webp');
  const opaqueOutput = path.join(temporaryDirectory, 'opaque.webp');

  try {
    const fixture = spawnSync(
      pythonPath,
      [
        '-c',
        'from PIL import Image; Image.new("RGBA", (5, 5), (30, 140, 90, 96)).save(r"' + inputPath + '", format="PNG")',
      ],
      { encoding: 'utf8' },
    );
    assert.equal(fixture.status, 0, fixture.stderr);
    const sourceBefore = await readFile(inputPath);

    for (const outputPath of [firstOutput, secondOutput]) {
      const optimized = spawnSync(
        pythonPath,
        [optimizerPath, '--input', inputPath, '--output', outputPath, '--mode', 'atlas'],
        { cwd: repoRoot, encoding: 'utf8' },
      );
      assert.equal(optimized.status, 0, optimized.stderr);
      await assertWebpSignature(outputPath, path.basename(outputPath));
    }

    const opaque = spawnSync(
      pythonPath,
      [optimizerPath, '--input', inputPath, '--output', opaqueOutput, '--mode', 'opaque'],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    assert.equal(opaque.status, 0, opaque.stderr);
    await assertWebpSignature(opaqueOutput, path.basename(opaqueOutput));

    assert.deepEqual(await readFile(firstOutput), await readFile(secondOutput));
    assert.deepEqual(await readFile(inputPath), sourceBefore);

    const inspection = spawnSync(
      pythonPath,
      [
        '-c',
        'from PIL import Image; import sys; im=Image.open(sys.argv[1]); im.load(); print(im.mode, im.size, im.getchannel("A").getextrema())',
        firstOutput,
      ],
      { encoding: 'utf8' },
    );
    assert.equal(inspection.status, 0, inspection.stderr);
    assert.match(inspection.stdout, /^RGBA \(8, 8\) \(0, 96\)/);

    const refused = spawnSync(
      pythonPath,
      [optimizerPath, '--input', inputPath, '--output', inputPath, '--mode', 'atlas'],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /must not overwrite the input/i);
    assert.deepEqual(await readFile(inputPath), sourceBefore);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test('Defender Champion manifest assets satisfy the production raster contract', async () => {
  const [manifest, provenance] = await Promise.all([
    readJson(manifestPath),
    readJson(provenancePath),
  ]);

  assert.equal(manifest.schemaVersion, 1);
  assert.ok(Array.isArray(manifest.assets));
  assert.deepEqual(
    manifest.assets.map(({ id, path: assetPath }) => [id, assetPath]),
    expectedManifestAssets,
    'manifest must preserve the nineteen Task 8/9 assets and append the exact twenty-two Task 10 strips',
  );
  assert.equal(provenance.schemaVersion, 1);
  assert.ok(Array.isArray(provenance.assets));

  const ids = manifest.assets.map(({ id }) => id);
  assert.equal(new Set(ids).size, ids.length, 'manifest asset IDs must be unique');

  const provenanceById = new Map(provenance.assets.map((record) => [record.id, record]));
  assert.equal(provenanceById.size, provenance.assets.length, 'provenance IDs must be unique');
  assert.deepEqual([...provenanceById.keys()].sort(), [...ids].sort(), 'manifest and provenance IDs must match');

  let totalBytes = 0;
  for (const asset of manifest.assets) {
    assert.equal(typeof asset.id, 'string');
    assert.ok(asset.id.length > 0, 'asset ID must not be empty');
    assert.equal(typeof asset.width, 'number');
    assert.equal(typeof asset.height, 'number');
    assert.ok(Number.isInteger(asset.width) && asset.width > 0, `${asset.id} needs a positive width`);
    assert.ok(Number.isInteger(asset.height) && asset.height > 0, `${asset.id} needs a positive height`);

    const assetPath = await assertCaseCorrectRelativePath(asset.path);
    const assetStat = await stat(assetPath);
    assert.ok(assetStat.isFile(), `${asset.path} must be a file`);
    assert.ok(assetStat.size > 0, `${asset.path} must be nonzero`);
    assert.ok(assetStat.size < perAssetLimit, `${asset.path} must be under ${perAssetLimit} bytes`);
    totalBytes += assetStat.size;
    await assertWebpSignature(assetPath, asset.path);
    assert.deepEqual(
      await readWebpInfo(assetPath),
      { width: asset.width, height: asset.height, alpha: asset.alpha },
      `${asset.id} manifest dimensions/alpha must match its WebP`,
    );

    if (asset.animated === true || asset.frameCount !== undefined) {
      assert.ok(Number.isInteger(asset.frameWidth) && asset.frameWidth > 0, `${asset.id} needs frameWidth`);
      assert.ok(Number.isInteger(asset.frameHeight) && asset.frameHeight > 0, `${asset.id} needs frameHeight`);
      assert.ok(Number.isInteger(asset.frameCount) && asset.frameCount > 0, `${asset.id} needs frameCount`);
      assert.equal(asset.width % asset.frameWidth, 0, `${asset.id} frameWidth must divide width`);
      assert.equal(asset.height % asset.frameHeight, 0, `${asset.id} frameHeight must divide height`);
      assert.ok(
        (asset.width / asset.frameWidth) * (asset.height / asset.frameHeight) >= asset.frameCount,
        `${asset.id} frame grid cannot contain frameCount`,
      );
    }

    const record = provenanceById.get(asset.id);
    assert.equal(record.finalPath, asset.path, `${asset.id} provenance path must match`);
    assert.ok(typeof record.finalPrompt === 'string' && record.finalPrompt.trim().length > 0, `${asset.id} needs finalPrompt`);
    assert.equal(record.toolMode, 'built-in imagegen', `${asset.id} must use built-in imagegen`);
    assert.ok(typeof record.generatedAt === 'string' && !Number.isNaN(Date.parse(record.generatedAt)), `${asset.id} needs generatedAt`);
    assert.ok(typeof record.optimization === 'string' && record.optimization.trim().length > 0, `${asset.id} needs optimization`);
    if (asset.id.startsWith('enemy-') || asset.id.startsWith('boss-')) {
      assert.equal(record.finalBytes, assetStat.size, `${asset.id} provenance byte count drifted`);
      assert.equal(
        record.finalSha256,
        createHash('sha256').update(await readFile(assetPath)).digest('hex'),
        `${asset.id} provenance hash drifted`,
      );
    }
    assert.equal(record.qaStatus, 'approved', `${asset.id} must be QA approved`);
  }

  assert.ok(totalBytes <= manifestTotalLimit, `manifest assets total ${totalBytes} bytes; limit is ${manifestTotalLimit}`);
  assert.equal(
    totalBytes,
    expectedManifestRasterBytes,
    'the reviewed 41-raster inventory must retain its deterministic byte budget',
  );
});

test('Defender Champion frame metadata exactly maps every atlas and castle state', async () => {
  const [manifest, environment, castle] = await Promise.all([
    readJson(manifestPath),
    readJson(environmentMetadataPath),
    readJson(castleMetadataPath),
  ]);
  const assetsById = new Map(manifest.assets.map((asset) => [asset.id, asset]));

  assert.deepEqual(Object.keys(environment.atlases), ['path', 'props', 'gameplay']);
  assert.deepEqual(environment.atlases.path.order, expectedPathTiles.map(({ id }) => id));
  assert.deepEqual(environment.atlases.path.tiles, expectedPathTiles.map((tile, index) => ({
    ...tile,
    index,
  })));
  assert.equal(environment.atlases.path.laneWidth, pathLaneWidth);
  assert.equal(environment.atlases.path.safeInset, pathSafeInset);
  assert.deepEqual(environment.atlases.props.order, expectedPropsOrder);
  assert.deepEqual(environment.atlases.gameplay.order, expectedGameplayOrder);

  for (const atlas of Object.values(environment.atlases)) {
    const asset = assetsById.get(atlas.assetId);
    assert.ok(asset, `missing manifest asset ${atlas.assetId}`);
    assert.equal(atlas.columns, 4);
    assert.equal(atlas.rows, 4);
    assert.equal(atlas.frameCount, 16);
    assert.equal(atlas.order.length, atlas.frameCount);
    assert.equal(new Set(atlas.order).size, atlas.frameCount);
    assert.equal(atlas.frameWidth, asset.frameWidth);
    assert.equal(atlas.frameHeight, asset.frameHeight);
    assert.equal(atlas.columns * atlas.frameWidth, asset.width);
    assert.equal(atlas.rows * atlas.frameHeight, asset.height);
  }

  const castleAsset = assetsById.get(castle.assetId);
  assert.ok(castleAsset, `missing manifest asset ${castle.assetId}`);
  assert.equal(castle.columns, 4);
  assert.equal(castle.rows, 1);
  assert.equal(castle.frames.length, castle.frameCount);
  assert.equal(castle.frameWidth, castleAsset.frameWidth);
  assert.equal(castle.frameHeight, castleAsset.frameHeight);
  assert.equal(castle.columns * castle.frameWidth, castleAsset.width);
  assert.deepEqual(castle.frames.map(({ id }) => id), ['idle', 'impact', 'damaged', 'defeated']);
  for (const [index, frame] of castle.frames.entries()) {
    assert.deepEqual(frame, {
      id: ['idle', 'impact', 'damaged', 'defeated'][index],
      index,
      x: index * castle.frameWidth,
      y: 0,
      width: castle.frameWidth,
      height: castle.frameHeight,
      anchorX: castle.anchorX,
      groundContactY: castle.groundContactY,
      scale: castle.scale,
    });
  }
});

test('Defender Champion defender strips preserve identity, animation geometry, and tier overlays', async () => {
  const [manifest, provenance, defenders, environment] = await Promise.all([
    readJson(manifestPath),
    readJson(provenancePath),
    readJson(defenderMetadataPath),
    readJson(environmentMetadataPath),
  ]);
  const assetsById = new Map(manifest.assets.map((asset) => [asset.id, asset]));
  const provenanceById = new Map(provenance.assets.map((record) => [record.id, record]));
  const gameplayFrames = new Set(environment.atlases.gameplay.order);

  assert.equal(defenders.schemaVersion, 1);
  assert.deepEqual(defenders.frame, {
    width: defenderFrameSize,
    height: defenderFrameSize,
    anchorX: 0.5,
    anchorY: 1,
    safeInset: defenderSafeInset,
  });
  assert.deepEqual(defenders.defenderOrder, defenderOrder);
  assert.deepEqual(defenders.actionOrder, defenderActions.map(({ id }) => id));
  assert.deepEqual(defenders.defenders.map(({ id }) => id), defenderOrder);

  for (const defender of defenders.defenders) {
    assert.equal(defender.acceptedSeedIdentity, `seed-${defender.id}-v1`);
    assert.deepEqual(defender.sharedScaleEvidence, {
      measurement: 'decoded alpha bbox height above threshold 64 in the first normalized frame',
      actionFirstFrameHeightPx: expectedSharedScaleEvidence[defender.id],
      maxActionDeltaPx: 1,
    });
    assert.deepEqual(defender.actions.map(({ id }) => id), defenderActions.map(({ id }) => id));
    assert.deepEqual(defender.tiers.map(({ tier }) => tier), [1, 2, 3]);

    const expectedCharacterAssets = Object.fromEntries(defenderActions.map(({ id: actionId }) => [
      actionId,
      `defender-${defender.id}-${actionId}`,
    ]));
    for (const tier of defender.tiers) {
      assert.deepEqual(
        tier.characterAssets,
        expectedCharacterAssets,
        `${defender.id} tier ${tier.tier} must reuse the same normalized character strips`,
      );
    }
    assert.deepEqual(defender.tiers[0].overlays, []);
    assert.deepEqual(defender.tiers[1].overlays, [
      {
        id: 'armor-trim-rank-crest',
        atlasAssetId: 'environment-gameplay-atlas',
        frameId: 'selected-build-pad',
        tint: expectedTierEffects[defender.id].tint,
        scale: 0.34,
        opacity: 0.34,
      },
      {
        id: 'weapon-glow',
        atlasAssetId: 'environment-gameplay-atlas',
        frameId: expectedTierEffects[defender.id].weaponGlow,
        tint: expectedTierEffects[defender.id].tint,
        scale: 0.38,
        opacity: 0.45,
      },
    ]);
    assert.deepEqual(defender.tiers[2].overlays, [
      {
        id: 'rank-crest',
        atlasAssetId: 'environment-gameplay-atlas',
        frameId: 'victory-burst',
        tint: '#FFD66B',
        scale: 0.45,
        opacity: 0.68,
      },
      {
        id: 'aura',
        atlasAssetId: 'environment-gameplay-atlas',
        frameId: 'range-marker',
        tint: expectedTierEffects[defender.id].tint,
        scale: 0.68,
        opacity: 0.36,
      },
      {
        id: 'mastery-effect',
        atlasAssetId: 'environment-gameplay-atlas',
        frameId: expectedTierEffects[defender.id].masteryEffect,
        tint: expectedTierEffects[defender.id].tint,
        scale: 0.58,
        opacity: 0.72,
      },
    ]);
    for (const tier of defender.tiers.slice(1)) {
      for (const overlay of tier.overlays) {
        assert.equal(overlay.atlasAssetId, 'environment-gameplay-atlas');
        assert.ok(gameplayFrames.has(overlay.frameId), `${defender.id} tier ${tier.tier} invents ${overlay.frameId}`);
      }
    }

    const inspectedActions = new Map();
    for (const [actionIndex, expectedAction] of defenderActions.entries()) {
      const action = defender.actions[actionIndex];
      const assetId = `defender-${defender.id}-${expectedAction.id}`;
      const asset = assetsById.get(assetId);
      assert.ok(asset, `missing manifest asset ${assetId}`);
      assert.deepEqual(action, {
        id: expectedAction.id,
        assetId,
        frameCount: expectedAction.frameCount,
        frameDurationMs: expectedAction.frameDurationMs,
        loop: expectedAction.loop,
        columns: expectedAction.frameCount,
        rows: 1,
        frames: Array.from({ length: expectedAction.frameCount }, (_, index) => ({
          index,
          x: index * defenderFrameSize,
          y: 0,
          width: defenderFrameSize,
          height: defenderFrameSize,
        })),
      });
      assert.deepEqual(
        {
          width: asset.width,
          height: asset.height,
          alpha: asset.alpha,
          animated: asset.animated,
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
          frameCount: asset.frameCount,
        },
        {
          width: expectedAction.frameCount * defenderFrameSize,
          height: defenderFrameSize,
          alpha: true,
          animated: true,
          frameWidth: defenderFrameSize,
          frameHeight: defenderFrameSize,
          frameCount: expectedAction.frameCount,
        },
      );

      const record = provenanceById.get(assetId);
      assert.ok(record, `missing provenance ${assetId}`);
      assert.equal(record.seedIdentityReference, `seed-${defender.id}-v1`);
      assert.ok(record.seedPrompt.includes(defenderRoleBriefs[defender.id]), `${assetId} seed prompt lost its role brief`);
      assert.match(record.seedPrompt, /visual direction only[\s\S]*do not copy pixels/i);
      assert.equal(record.generationMode, 'edit');
      assert.ok(record.finalPrompt.includes(`Exact ${expectedAction.frameCount}`), `${assetId} prompt lost its frame contract`);
      if (expectedAction.id !== 'idle') {
        assert.ok(
          record.finalPrompt.includes(expectedActionDirections[defender.id][expectedAction.id]),
          `${assetId} prompt lost its exact action direction`,
        );
      }
      assert.match(record.normalization, /normalize_sprite_strip\.py[\s\S]*256x256[\s\S]*bottom-center/i);
      assert.match(record.optimization, /lossless[\s\S]*method 6/i);
      assert.equal(record.referenceDisclosure, 'Style direction only; no copied reference pixels');

      const frames = inspectAlphaFrames(
        path.join(gameRoot, asset.path),
        defenderFrameSize,
        defenderFrameSize,
      );
      assert.equal(frames.length, expectedAction.frameCount);
      assert.equal(new Set(frames.map(({ rgbaHash }) => rgbaHash)).size, frames.length,
        `${assetId} contains a lost or byte-duplicated frame`);
      for (const [frameIndex, frame] of frames.entries()) {
        assert.ok(frame.bbox0, `${assetId} frame ${frameIndex} is empty`);
        const [left, top, right, bottom] = frame.bbox0;
        const occupiedPixels = frame.components0.reduce((sum, size) => sum + size, 0);
        assert.ok(occupiedPixels >= 1_024, `${assetId} frame ${frameIndex} is not meaningfully occupied`);
        assert.ok(left >= defenderSafeInset, `${assetId} frame ${frameIndex} crosses its left safe inset`);
        assert.ok(top >= defenderSafeInset, `${assetId} frame ${frameIndex} crosses its top safe inset`);
        assert.ok(defenderFrameSize - right >= defenderSafeInset,
          `${assetId} frame ${frameIndex} crosses its right safe inset`);
        assert.equal(bottom, defenderFrameSize, `${assetId} frame ${frameIndex} lost the shared foot baseline`);
        assert.deepEqual(
          Object.fromEntries(['north', 'east', 'west'].map((side) => [side, frame.edges[side].length])),
          { north: 0, east: 0, west: 0 },
          `${assetId} frame ${frameIndex} crosses a cell edge`,
        );
        assert.ok(frame.bbox[3] >= defenderFrameSize - 3,
          `${assetId} frame ${frameIndex} meaningful foot alpha drifted from the shared baseline`);
        assert.ok(Math.abs(((left + right) / 2) - (defenderFrameSize / 2)) <= 40,
          `${assetId} frame ${frameIndex} drifted from the bottom-center anchor`);
        assert.ok(frame.bboxEdgeRuns.south <= 64,
          `${assetId} frame ${frameIndex} has a clipped or non-foot baseline silhouette`);
        for (const side of ['north', 'east', 'west']) {
          assert.ok(frame.bboxEdgeRuns[side] <= 64,
            `${assetId} frame ${frameIndex} has a clipped ${side} silhouette`);
        }
        assert.ok(right - left >= 64 && bottom - top >= 96,
          `${assetId} frame ${frameIndex} has an unstable game-scale footprint`);
      }
      inspectedActions.set(expectedAction.id, frames);
    }

    const measuredFirstFrameHeights = Object.fromEntries(defenderActions.map(({ id: actionId }) => {
      const [left, top, right, bottom] = inspectedActions.get(actionId)[0].bbox;
      void left;
      void right;
      return [actionId, bottom - top];
    }));
    assert.deepEqual(measuredFirstFrameHeights, defender.sharedScaleEvidence.actionFirstFrameHeightPx,
      `${defender.id} shared-scale evidence drifted from decoded production pixels`);
    const scaleHeights = Object.values(measuredFirstFrameHeights);
    assert.ok(Math.max(...scaleHeights) - Math.min(...scaleHeights) <= defender.sharedScaleEvidence.maxActionDeltaPx,
      `${defender.id} actions do not share one character scale`);

    const idleStart = inspectedActions.get('idle')[0].bbox0;
    for (const actionId of ['attack', 'mastery']) {
      const returnFrame = inspectedActions.get(actionId).at(-1).bbox0;
      const idleWidth = idleStart[2] - idleStart[0];
      const idleHeight = idleStart[3] - idleStart[1];
      const returnWidth = returnFrame[2] - returnFrame[0];
      const returnHeight = returnFrame[3] - returnFrame[1];
      assert.ok(Math.abs(returnWidth - idleWidth) <= 64, `${defender.id} ${actionId} return footprint drifted`);
      assert.ok(Math.abs(returnHeight - idleHeight) <= 48, `${defender.id} ${actionId} return scale drifted`);
    }
  }
});

test('Defender Champion enemy and boss strips preserve identities, action contracts, and runtime mappings', async () => {
  const [manifest, provenance, enemies, bosses, environment] = await Promise.all([
    readJson(manifestPath),
    readJson(provenancePath),
    readJson(enemyMetadataPath),
    readJson(bossMetadataPath),
    readJson(environmentMetadataPath),
  ]);
  const assetsById = new Map(manifest.assets.map((asset) => [asset.id, asset]));
  const provenanceById = new Map(provenance.assets.map((record) => [record.id, record]));
  const gameplayFrames = new Set(environment.atlases.gameplay.order);
  const frameCountWords = { 6: 'six', 8: 'eight', 10: 'ten' };

  assert.equal(enemies.schemaVersion, 1);
  assert.deepEqual(enemies.frame, {
    width: enemyFrameSize,
    height: enemyFrameSize,
    anchorX: 0.5,
    anchorY: 1,
    safeInset: enemySafeInset,
  });
  assert.deepEqual(enemies.enemyOrder, enemyOrder);
  assert.deepEqual(enemies.actionOrder, enemyActionOrder);
  assert.deepEqual(enemies.postNormalizationPolicy, expectedPostNormalizationPolicy);
  assert.deepEqual(enemies.enemies.map(({ id }) => id), enemyOrder);
  assert.deepEqual(enemies.presentationMappings, expectedEnemyPresentationMappings);

  assert.equal(bosses.schemaVersion, 1);
  assert.deepEqual(bosses.frame, {
    width: bossFrameSize,
    height: bossFrameSize,
    anchorX: 0.5,
    anchorY: 1,
    safeInset: bossSafeInset,
  });
  assert.deepEqual(bosses.bossOrder, bossOrder);
  assert.deepEqual(bosses.actionOrder, bossActionOrder);
  assert.deepEqual(bosses.postNormalizationPolicy, expectedPostNormalizationPolicy);
  assert.deepEqual(bosses.bosses.map(({ id }) => id), bossOrder);

  for (const mapping of [
    ...Object.values(enemies.presentationMappings.sourceEffects),
    expectedBossPresentationMappings['mossback-brute'].abilities['mossback-telegraph'],
    expectedBossPresentationMappings['ironhide-warlord'].abilities['rally-counter-transition'],
    expectedBossPresentationMappings['ironhide-warlord'].plateCrackOverlay,
    expectedBossPresentationMappings['ironhide-warlord'].vulnerabilityAccent,
    expectedBossPresentationMappings['dread-colossus'].abilities['dread-pulse-telegraph'],
    expectedBossPresentationMappings['dread-colossus'].phaseAccentOverlay,
  ]) {
    for (const overlay of Object.values(mapping).filter((value) => value?.atlasAssetId)) {
      assert.equal(overlay.atlasAssetId, 'environment-gameplay-atlas');
      assert.ok(gameplayFrames.has(overlay.frameId), `runtime mapping invents gameplay frame ${overlay.frameId}`);
    }
    if (mapping.atlasAssetId) {
      assert.equal(mapping.atlasAssetId, 'environment-gameplay-atlas');
      assert.ok(gameplayFrames.has(mapping.frameId), `runtime mapping invents gameplay frame ${mapping.frameId}`);
    }
  }

  const inspectRoster = ({ roster, kind, frameSize, safeInset, actionOrder, actionContracts, roleBriefs }) => {
    for (const character of roster) {
      const characterId = character.id;
      const expectedActions = kind === 'enemy' && characterId !== 'hexcaller'
        ? actionOrder.slice(0, 2)
        : actionOrder;
      assert.equal(character.acceptedSeedIdentity, `seed-${characterId}-v1`);
      assert.deepEqual(character.actions.map(({ id }) => id), expectedActions);
      assert.deepEqual(character.sharedScaleEvidence, {
        measurement: 'decoded alpha bbox height above threshold 64 in the first normalized frame',
        actionFirstFrameHeightPx: character.sharedScaleEvidence.actionFirstFrameHeightPx,
        maxActionDeltaPx: 1,
      });
      assert.deepEqual(
        Object.keys(character.sharedScaleEvidence.actionFirstFrameHeightPx),
        expectedActions,
        `${characterId} shared-scale evidence must follow action order`,
      );
      assert.deepEqual(
        character.presentationMappings,
        kind === 'boss' ? expectedBossPresentationMappings[characterId] : {
          normalMovement: { action: 'walk' },
          defeatRemoval: { action: 'defeat' },
          ...(characterId === 'hexcaller' ? {
            sourceEffects: {
              'enemy-healing': expectedEnemyPresentationMappings.sourceEffects['enemy-healing'],
              'enemy-speed': expectedEnemyPresentationMappings.sourceEffects['enemy-speed'],
            },
          } : {}),
        },
      );

      const inspectedActions = new Map();
      for (const [actionIndex, actionId] of expectedActions.entries()) {
        const expectedAction = actionContracts[actionId];
        const action = character.actions[actionIndex];
        const assetId = `${kind}-${characterId}-${actionId}`;
        const asset = assetsById.get(assetId);
        assert.ok(asset, `missing manifest asset ${assetId}`);
        assert.deepEqual(action, {
          id: actionId,
          assetId,
          frameCount: expectedAction.frameCount,
          frameDurationMs: expectedAction.frameDurationMs,
          loop: expectedAction.loop,
          columns: expectedAction.frameCount,
          rows: 1,
          frames: Array.from({ length: expectedAction.frameCount }, (_, index) => ({
            index,
            x: index * frameSize,
            y: 0,
            width: frameSize,
            height: frameSize,
          })),
        });
        assert.deepEqual(
          {
            role: asset.role,
            width: asset.width,
            height: asset.height,
            alpha: asset.alpha,
            animated: asset.animated,
            frameWidth: asset.frameWidth,
            frameHeight: asset.frameHeight,
            frameCount: asset.frameCount,
          },
          {
            role: `${kind}-animation-strip`,
            width: expectedAction.frameCount * frameSize,
            height: frameSize,
            alpha: true,
            animated: true,
            frameWidth: frameSize,
            frameHeight: frameSize,
            frameCount: expectedAction.frameCount,
          },
        );

        const record = provenanceById.get(assetId);
        assert.ok(record, `missing provenance ${assetId}`);
        assert.equal(record.seedIdentityReference, `seed-${characterId}-v1`);
        assert.ok(record.seedPrompt.includes(roleBriefs[characterId]), `${assetId} seed prompt lost its role brief`);
        assert.match(record.seedPrompt, /facing upper-left toward the castle path/i);
        assert.match(record.seedPrompt, /visual direction only[\s\S]*do not copy pixels/i);
        assert.equal(record.generationMode, 'edit');
        assert.equal(record.acceptedSeedSourcePath,
          `output/defender-champion/raw/seeds/${characterId}-seed-v1.png`);
        assert.equal(record.generatedSourcePath,
          `output/defender-champion/raw/generated-actions/${characterId}-${actionId}-v1.png`);
        assert.equal(record.acceptedSourcePath,
          `output/defender-champion/raw/${kind === 'enemy' ? 'enemies' : 'bosses'}/${characterId}-${actionId}-normalized.png`);
        assert.ok(record.finalPrompt.includes(`horizontal ${frameCountWords[expectedAction.frameCount]}-frame`),
          `${assetId} prompt lost its frame contract`);
        const promptRequirement = kind === 'enemy'
          ? enemyPromptRequirements[actionId]
          : bossPromptRequirements[characterId][actionId];
        assert.ok(record.finalPrompt.includes(promptRequirement), `${assetId} prompt lost its action direction`);
        assert.match(record.normalization,
          new RegExp(`normalize_sprite_strip\\.py[\\s\\S]*combined shared-scale pass[\\s\\S]*${frameSize}x${frameSize}[\\s\\S]*bottom-center`, 'i'));
        if (characterQ98AssetIds.has(assetId)) {
          assert.match(record.optimization, /character[\s\S]*quality 98[\s\S]*exact alpha[\s\S]*method 6/i);
        } else {
          assert.match(record.optimization, /lossless[\s\S]*method 6/i);
        }
        assert.equal(record.referenceDisclosure, 'Style direction only; no copied reference pixels');
        assert.deepEqual(record.approvalEvidencePaths, [
          `output/defender-champion/previews/${characterId}-full-size.png`,
          `output/defender-champion/previews/${characterId}-game-scale.png`,
        ]);

        const frames = inspectAlphaFrames(path.join(gameRoot, asset.path), frameSize, frameSize);
        assert.equal(frames.length, expectedAction.frameCount);
        const normalizationEvidence = character.normalizationEvidence?.actions?.[actionId];
        assert.ok(normalizationEvidence, `${assetId} needs source-derived all-frame normalization evidence`);
        assert.equal(normalizationEvidence.length, frames.length, `${assetId} normalization evidence lost a frame`);
        assert.deepEqual(record.sourceAlphaEvidence, normalizationEvidence,
          `${assetId} provenance must retain the same source-derived alpha evidence`);
        assert.equal(new Set(frames.map(({ rgbaHash }) => rgbaHash)).size, frames.length,
          `${assetId} contains a lost or byte-duplicated frame`);
        for (const [frameIndex, frame] of frames.entries()) {
          assert.deepEqual(
            normalizationEvidence[frameIndex],
            {
              index: frameIndex,
              canonicalAlpha: frame.canonicalAlpha,
              postNormalization: { scaleX: 1, scaleY: 1 },
            },
            `${assetId} frame ${frameIndex} must preserve source alpha without post-common-scale resizing`,
          );
          assert.ok(frame.bbox0, `${assetId} frame ${frameIndex} is empty`);
          assert.equal(frame.alphaExtrema[0], 0, `${assetId} frame ${frameIndex} has no genuine transparent pixels`);
          assert.ok(frame.alphaExtrema[1] > 0, `${assetId} frame ${frameIndex} has no visible alpha`);
          const [left, top, right, bottom] = frame.bbox0;
          const occupiedPixels = frame.components0.reduce((sum, size) => sum + size, 0);
          const minimumOccupiedPixels = actionId === 'defeat'
            ? (kind === 'enemy' ? 300 : 750)
            : (kind === 'enemy' ? 700 : 2_000);
          assert.ok(occupiedPixels >= minimumOccupiedPixels,
            `${assetId} frame ${frameIndex} is not meaningfully occupied`);
          assert.ok(left >= safeInset, `${assetId} frame ${frameIndex} crosses its left safe inset`);
          assert.ok(top >= safeInset, `${assetId} frame ${frameIndex} crosses its top safe inset`);
          assert.ok(frameSize - right >= safeInset, `${assetId} frame ${frameIndex} crosses its right safe inset`);
          assert.equal(bottom, frameSize, `${assetId} frame ${frameIndex} lost the bottom anchor baseline`);
          assert.deepEqual(
            Object.fromEntries(['north', 'east', 'west'].map((side) => [side, frame.edges[side].length])),
            { north: 0, east: 0, west: 0 },
            `${assetId} frame ${frameIndex} crosses a cell edge`,
          );
          const bottomEdgeLimit = actionId === 'defeat'
            ? (frameSize / 2) - safeInset
            : (kind === 'enemy' ? 72 : 128);
          assert.ok(frame.edges.south.every((x) => Math.abs(x - (frameSize / 2)) <= bottomEdgeLimit),
            `${assetId} frame ${frameIndex} has edge alpha outside its bottom-center anchor`);
          assert.ok(frame.bbox[3] >= frameSize - 3,
            `${assetId} frame ${frameIndex} meaningful alpha drifted from the baseline`);
          assert.ok(Math.abs(((left + right) / 2) - (frameSize / 2)) <= (kind === 'enemy' ? 48 : 80),
            `${assetId} frame ${frameIndex} drifted from its bottom-center anchor`);
          for (const side of ['north', 'east', 'south', 'west']) {
            assert.ok(frame.bboxEdgeRuns[side] <= (kind === 'enemy' ? 72 : 128),
              `${assetId} frame ${frameIndex} has a clipped or flat ${side} silhouette`);
          }
          const minimumWidth = actionId === 'defeat' ? (kind === 'enemy' ? 40 : 72) : (kind === 'enemy' ? 48 : 96);
          const minimumHeight = actionId === 'defeat' ? (kind === 'enemy' ? 40 : 48) : (kind === 'enemy' ? 72 : 128);
          assert.ok(right - left >= minimumWidth && bottom - top >= minimumHeight,
          `${assetId} frame ${frameIndex} has an unstable game-scale footprint`);
        }
        inspectedActions.set(actionId, frames);
      }

      const measuredFirstFrameHeights = Object.fromEntries(expectedActions.map((actionId) => {
        const [, top, , bottom] = inspectedActions.get(actionId)[0].bbox;
        return [actionId, bottom - top];
      }));
      assert.deepEqual(measuredFirstFrameHeights, character.sharedScaleEvidence.actionFirstFrameHeightPx,
        `${characterId} shared-scale evidence drifted from decoded production pixels`);
      const scaleHeights = Object.values(measuredFirstFrameHeights);
      assert.ok(Math.max(...scaleHeights) - Math.min(...scaleHeights) <= 1,
        `${characterId} first frames do not share one normalized character scale`);
      const firstFrameWidths = expectedActions.map((actionId) => {
        const [left, , right] = inspectedActions.get(actionId)[0].bbox;
        return right - left;
      });
      assert.ok(Math.max(...firstFrameWidths) - Math.min(...firstFrameWidths) <= frameSize * 0.2,
        `${characterId} first-frame footprint is unstable across actions`);
    }
  };

  inspectRoster({
    roster: enemies.enemies,
    kind: 'enemy',
    frameSize: enemyFrameSize,
    safeInset: enemySafeInset,
    actionOrder: enemyActionOrder,
    actionContracts: enemyActionContracts,
    roleBriefs: enemyRoleBriefs,
  });
  inspectRoster({
    roster: bosses.bosses,
    kind: 'boss',
    frameSize: bossFrameSize,
    safeInset: bossSafeInset,
    actionOrder: bossActionOrder,
    actionContracts: bossActionContracts,
    roleBriefs: bossRoleBriefs,
  });
});

test('Defender Champion defeat assembly preserves the shared-scale source geometry in every reviewed frame', async () => {
  const manifest = await readJson(manifestPath);
  const assetsById = new Map(manifest.assets.map((asset) => [asset.id, asset]));

  for (const [assetId, expectedFrames] of Object.entries(reviewedDefeatScaleFixtures)) {
    const asset = assetsById.get(assetId);
    assert.ok(asset, `missing reviewed defeat asset ${assetId}`);
    const frames = inspectAlphaFrames(
      path.join(gameRoot, asset.path),
      asset.frameWidth,
      asset.frameHeight,
    );
    for (const [frameIndex, expected] of Object.entries(expectedFrames)) {
      const [left, top, right, bottom] = frames[Number(frameIndex)].bbox0;
      assert.deepEqual(
        { width: right - left, height: bottom - top },
        expected,
        `${assetId} frame ${Number(frameIndex) + 1} must not receive post-common-scale resizing`,
      );
    }
  }
});

test('Defender Champion path topology has clean, centered, edge-connected lanes', async () => {
  const environment = await readJson(environmentMetadataPath);
  const atlas = environment.atlases.path;
  const frames = inspectAlphaFrames(
    path.join(gameRoot, 'assets', 'environment', 'path-atlas.webp'),
    atlas.frameWidth,
    atlas.frameHeight,
  );
  assert.equal(frames.length, expectedPathTiles.length);

  const expectedEdgeRun = Array.from(
    { length: pathLaneWidth },
    (_, index) => ((atlasFrameSize - pathLaneWidth) / 2) + index,
  );
  for (const [index, expected] of expectedPathTiles.entries()) {
    const frame = frames[index];
    assert.ok(frame.bbox, `${expected.id} must contain meaningful path alpha`);
    assert.deepEqual(frame.components0.length, 1, `${expected.id} has detached alpha fringe components`);
    assert.deepEqual(frame.components.length, 1, `${expected.id} must be one connected path silhouette`);
    for (const side of ['north', 'east', 'south', 'west']) {
      if (expected.connects.includes(side)) {
        assert.deepEqual(
          frame.edges[side],
          expectedEdgeRun,
          `${expected.id} ${side} connector must be a centered ${pathLaneWidth}px lane`,
        );
      } else {
        assert.deepEqual(frame.edges[side], [], `${expected.id} must not connect ${side}`);
        const [left, top, right, bottom] = frame.bbox;
        const inset = { north: top, east: atlasFrameSize - right, south: atlasFrameSize - bottom, west: left }[side];
        assert.ok(inset >= pathSafeInset, `${expected.id} must terminate inside its ${side} safe inset`);
      }
    }
  }
});

test('Defender Champion prop and gameplay cells isolate one centered sprite group', async () => {
  const environment = await readJson(environmentMetadataPath);
  for (const [atlasName, expectedOrder] of [
    ['props', expectedPropsOrder],
    ['gameplay', expectedGameplayOrder],
  ]) {
    const atlas = environment.atlases[atlasName];
    const frames = inspectAlphaFrames(
      path.join(gameRoot, 'assets', 'environment', `${atlasName}-atlas.webp`),
      atlas.frameWidth,
      atlas.frameHeight,
    );
    assert.equal(frames.length, expectedOrder.length);
    for (const [index, id] of expectedOrder.entries()) {
      assertCenteredSafeSprite(frames[index], `${atlasName}:${id}`, spriteSafeInset);
    }
  }
});

test('Defender Champion castle states share a decoded ground baseline and anchor', async () => {
  const castle = await readJson(castleMetadataPath);
  assert.equal(castle.anchorX, 271);
  assert.equal(castle.groundContactY, 672);
  assert.equal(castle.scale, 1);

  const frames = inspectAlphaFrames(
    path.join(gameRoot, 'assets', 'castle', 'castle-states.webp'),
    castle.frameWidth,
    castle.frameHeight,
  );
  const widths = [];
  for (const [index, id] of ['idle', 'impact', 'damaged', 'defeated'].entries()) {
    const frame = frames[index];
    assert.ok(frame.bbox, `${id} castle state must contain meaningful alpha`);
    const [left, , right, bottom] = frame.bbox;
    assert.equal(bottom - 1, castle.groundContactY, `${id} castle ground baseline drifted`);
    assert.ok(Math.abs((left + right - 1) / 2 - castle.anchorX) <= 1,
      `${id} castle horizontal anchor drifted`);
    widths.push(right - left);
  }
  assert.ok(Math.max(...widths) - Math.min(...widths) <= 60, 'castle state scale/footprint drifted');
});

test('Defender Champion title emblem has a clean transparent safe perimeter', () => {
  const [frame] = inspectAlphaFrames(
    path.join(gameRoot, 'assets', 'environment', 'title-emblem.webp'),
    1254,
    1254,
  );
  assert.ok(frame.bbox0, 'title emblem must contain visible alpha');
  const [left, top, right, bottom] = frame.bbox0;
  for (const [side, inset] of Object.entries({
    left,
    top,
    right: 1254 - right,
    bottom: 1254 - bottom,
  })) {
    assert.ok(inset >= 48, `title emblem ${side} safe perimeter is only ${inset}px`);
  }
  assert.equal(frame.components0.length, 1, 'title emblem has detached alpha specks');
  assert.ok(Math.abs((left + right - 1) / 2 - 626.5) <= 1, 'title emblem is not horizontally centered');
  assert.ok(Math.abs((top + bottom - 1) / 2 - 626.5) <= 1, 'title emblem is not vertically centered');
});
