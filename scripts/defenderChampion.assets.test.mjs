import assert from 'node:assert/strict';
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
const optimizerPath = path.join(repoRoot, 'scripts', 'optimize-defender-champion-images.py');
const bundledPythonPath = 'C:\\Users\\Xator\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe';
const systemPythonPath = process.platform === 'win32' ? 'python' : 'python3';
const defaultPythonPath = existsSync(bundledPythonPath) ? bundledPythonPath : systemPythonPath;
const pythonPath = process.env.DEFENDER_CHAMPION_ASSET_PYTHON ?? defaultPythonPath;
const perAssetLimit = 1_500_000;
const manifestTotalLimit = 15_000_000;
const atlasFrameSize = 314;
const pathLaneWidth = 128;
const pathSafeInset = 24;
const spriteSafeInset = 16;
const expectedManifestAssets = [
  ['environment-grass', 'assets/environment/grass.webp'],
  ['environment-path-atlas', 'assets/environment/path-atlas.webp'],
  ['environment-props-atlas', 'assets/environment/props-atlas.webp'],
  ['environment-gameplay-atlas', 'assets/environment/gameplay-atlas.webp'],
  ['environment-title-emblem', 'assets/environment/title-emblem.webp'],
  ['castle-states', 'assets/castle/castle-states.webp'],
  ['catalog-thumbnail', 'thumb.webp'],
];
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
            'bbox0': bbox(alpha, 0),
            'bbox': meaningful_bbox,
            'bboxEdgeRuns': bbox_edge_runs,
            'components0': component_sizes(alpha, 0),
            'components': component_sizes(alpha, threshold),
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
    'manifest must register exactly the seven Task 8 raster assets in contract order',
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
    assert.equal(record.qaStatus, 'approved', `${asset.id} must be QA approved`);
  }

  assert.ok(totalBytes <= manifestTotalLimit, `manifest assets total ${totalBytes} bytes; limit is ${manifestTotalLimit}`);
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
