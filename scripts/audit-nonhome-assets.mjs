#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const publicDir = path.join(repoRoot, 'public');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg', '.ktx2']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']);
const MODEL_EXTENSIONS = new Set(['.glb', '.gltf', '.fbx', '.obj', '.bin', '.usdz']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);

const THRESHOLDS = {
  image: { warning: 1.5 * 1024 * 1024, blocking: 3 * 1024 * 1024 },
  audio: { warning: 2 * 1024 * 1024, blocking: 5 * 1024 * 1024 },
  model: { warning: 4 * 1024 * 1024, blocking: 8 * 1024 * 1024 },
  video: { warning: 8 * 1024 * 1024, blocking: 20 * 1024 * 1024 },
};

const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  '.vite',
  '_workspace',
  '_archive',
  'output',
]);

const formatBytes = (value) => {
  const mb = value / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
};

const detectAssetType = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (AUDIO_EXTENSIONS.has(extension)) return 'audio';
  if (MODEL_EXTENSIONS.has(extension)) return 'model';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  return null;
};

const collectAssetFiles = (dirPath, results = []) => {
  if (!fs.existsSync(dirPath)) {
    return results;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        collectAssetFiles(path.join(dirPath, entry.name), results);
      }
      continue;
    }

    const absolutePath = path.join(dirPath, entry.name);
    const assetType = detectAssetType(absolutePath);
    if (!assetType) {
      continue;
    }

    const relativePath = path.relative(publicDir, absolutePath).split(path.sep).join('/');
    results.push({
      absolutePath,
      relativePath,
      assetType,
      sizeBytes: fs.statSync(absolutePath).size,
      isHomepageAsset: relativePath.startsWith('HomePageAPP/'),
    });
  }

  return results;
};

const classifyAsset = (asset) => {
  const thresholds = THRESHOLDS[asset.assetType];
  if (!thresholds) {
    return null;
  }

  if (asset.sizeBytes >= thresholds.blocking) {
    return 'blocking';
  }

  if (asset.sizeBytes >= thresholds.warning) {
    return 'warning';
  }

  return null;
};

const printAssetGroup = (title, assets) => {
  if (assets.length === 0) {
    return;
  }

  console.log(`\n${title}:`);
  for (const asset of assets) {
    console.log(`- [${asset.assetType}] ${asset.relativePath} (${formatBytes(asset.sizeBytes)})`);
  }
};

const allAssets = collectAssetFiles(publicDir).sort((left, right) => right.sizeBytes - left.sizeBytes);
const homepageReportOnly = [];
const nonHomeWarnings = [];
const nonHomeBlockers = [];

for (const asset of allAssets) {
  const severity = classifyAsset(asset);
  if (!severity) {
    continue;
  }

  if (asset.isHomepageAsset) {
    homepageReportOnly.push(asset);
    continue;
  }

  if (severity === 'blocking') {
    nonHomeBlockers.push(asset);
    continue;
  }

  nonHomeWarnings.push(asset);
}

console.log(`Audited ${allAssets.length} asset files under public/.`);

printAssetGroup('HomepageAPP report-only oversized assets', homepageReportOnly);
printAssetGroup('Non-home warnings', nonHomeWarnings);
printAssetGroup('Non-home blockers', nonHomeBlockers);

if (nonHomeBlockers.length > 0) {
  console.log('\nAsset audit failed because non-home assets exceeded blocking thresholds.');
  process.exitCode = 1;
} else {
  console.log('\nAsset audit completed with no blocking non-home assets.');
}
