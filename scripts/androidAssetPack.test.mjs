import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Android registers an install-time game_assets pack', async () => {
  const settings = await readSource('android/settings.gradle');
  const appBuild = await readSource('android/app/build.gradle');
  const packBuild = await readSource('android/game_assets/build.gradle');

  assert.match(settings, /include ':game_assets'/);
  assert.match(appBuild, /assetPacks\s*=\s*\[":game_assets"\]/);
  assert.match(packBuild, /id 'com\.android\.asset-pack'/);
  assert.match(packBuild, /packName\s*=\s*"game_assets"/);
  assert.match(packBuild, /deliveryType\s*=\s*"install-time"/);
});

test('generated asset-pack payload is ignored while its marker remains tracked', async () => {
  const gitignore = await readSource('.gitignore');
  const eslintConfig = await readSource('eslint.config.js');

  assert.match(gitignore, /android\/game_assets\/src\/main\/assets\/\*/);
  assert.match(gitignore, /!android\/game_assets\/src\/main\/assets\/\.gitkeep/);
  assert.match(gitignore, /android\/\*\*\/build\//);
  assert.match(eslintConfig, /android\/\*\*\/build/);
});

test('release staging moves every large content directory out of the base module', async () => {
  const staging = await readSource('scripts/Stage-AndroidAssetPack.ps1');
  const release = await readSource('scripts/Build-AndroidRelease.ps1');
  const expectedDirectories = [
    'Games',
    'HomePageAPP',
    'PolygonAPP',
    '3dClass',
    'Worksheets',
    'FinalGraph',
    'MathWorksheetCreator',
  ];

  for (const directory of expectedDirectories) {
    assert.match(staging, new RegExp(`'${directory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
  }

  assert.match(staging, /Resolve-Path -LiteralPath/);
  assert.match(staging, /Remove-Item -LiteralPath \$_\.FullName -Recurse -Force/);
  assert.match(staging, /Move-Item -LiteralPath \$sourcePath -Destination \$packAssetsRoot/);
  assert.match(staging, /asset-pack-sizes\.json/);
  assert.match(release, /Stage-AndroidAssetPack\.ps1/);
});

test('release build inspects both bundle modules and enforces the base size limit', async () => {
  const inspector = await readSource('scripts/Inspect-AndroidBundle.ps1');
  const release = await readSource('scripts/Build-AndroidRelease.ps1');

  assert.match(inspector, /'base'/);
  assert.match(inspector, /'game_assets'/);
  assert.match(inspector, /500MB/);
  assert.match(release, /Inspect-AndroidBundle\.ps1/);
});
