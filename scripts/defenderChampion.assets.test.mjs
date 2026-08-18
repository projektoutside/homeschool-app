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

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

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
  assert.ok(manifest.assets.length > 0, 'manifest must register at least one asset');
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
    });
  }
});
