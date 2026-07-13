import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Android registers a fast-follow game_assets pack', async () => {
  const settings = await readSource('android/settings.gradle');
  const appBuild = await readSource('android/app/build.gradle');
  const packBuild = await readSource('android/game_assets/build.gradle');

  assert.match(settings, /include ':game_assets'/);
  assert.match(appBuild, /assetPacks\s*=\s*\[":game_assets"\]/);
  assert.match(packBuild, /id 'com\.android\.asset-pack'/);
  assert.match(packBuild, /packName\s*=\s*"game_assets"/);
  assert.match(packBuild, /deliveryType\s*=\s*"fast-follow"/);
  assert.match(appBuild, /com\.google\.android\.play:asset-delivery:2\.3\.0/);
});

test('Android waits for and serves the downloaded game asset pack', async () => {
  const activity = await readSource('android/app/src/main/java/com/lashomeschool/hub/MainActivity.java');
  const client = await readSource('android/app/src/main/java/com/lashomeschool/hub/GameAssetWebViewClient.java');

  assert.match(activity, /AssetPackManagerFactory\.getInstance/);
  assert.match(activity, /assetPackManager\.fetch/);
  assert.match(activity, /WAITING_FOR_WIFI/);
  assert.match(activity, /setWebViewClient\(new GameAssetWebViewClient/);
  assert.match(client, /getPackLocation\("game_assets"\)/);
  assert.match(client, /assetsPath\(\)/);
  assert.match(client, /getCanonicalPath\(\)/);
  assert.match(client, /WebResourceResponse/);
  assert.match(client, /normalizeGameAssetPath/);
  assert.match(client, /path\.indexOf\(marker\)/);
});

test('web shell exposes a native game download progress overlay', async () => {
  const index = await readSource('index.html');

  assert.match(index, /window\.__showGameDownload/);
  assert.match(index, /window\.__hideGameDownload/);
  assert.match(index, /game-download-progress/);
});

test('Android relative base path does not become a React Router basename', async () => {
  const app = await readSource('src/App.tsx');

  assert.match(app, /baseUrl === '\.\/'/);
  assert.match(app, /\? '' : baseUrl\.replace/);
});

test('Android release uses a new version after the initial Play upload', async () => {
  const appBuild = await readSource('android/app/build.gradle');

  assert.match(appBuild, /versionCode\s+3/);
  assert.match(appBuild, /versionName\s+"1\.0\.2"/);
});

test('Android release disables the unavailable paid cloud backend', async () => {
  const releaseScript = await readFile(new URL('./Build-AndroidRelease.ps1', import.meta.url), 'utf8');
  const supabaseClient = await readFile(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');

  assert.match(releaseScript, /VITE_SUPABASE_DISABLED\s*=\s*'true'/);
  assert.match(supabaseClient, /VITE_SUPABASE_DISABLED/);
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
  assert.match(release, /\$env:BASE_PATH\s*=\s*'\.\/'/);
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
