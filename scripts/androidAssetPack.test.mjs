import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { ANIMAL_DATABASE } from '../public/Games/Animal Champion/js/animal-data.js';
import { ALL_VOICE_CLIPS } from '../public/Games/Animal Champion/js/voice-manifest.js';

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const powershellExecutable = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
const temporaryBundleRoots = new Set();

const powershellFileArgs = (scriptPath, ...scriptArgs) => [
  '-NoProfile',
  ...(process.platform === 'win32' ? ['-ExecutionPolicy', 'Bypass'] : []),
  '-File',
  scriptPath,
  ...scriptArgs,
];

const runPowerShellFile = (scriptPath, ...scriptArgs) => execFileAsync(
  powershellExecutable,
  powershellFileArgs(scriptPath, ...scriptArgs),
  { encoding: 'utf8', maxBuffer: 1024 * 1024, windowsHide: true },
);

const createSyntheticAnimalBundle = async (archiveEntries) => {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'animal-champion-aab-'));
  temporaryBundleRoots.add(fixtureRoot);
  const payloadRoot = path.join(fixtureRoot, 'payload');
  const archivePath = path.join(fixtureRoot, 'fixture.aab');
  const zipScriptPath = path.join(fixtureRoot, 'create-archive.ps1');

  await Promise.all(archiveEntries.map(async (entryName) => {
    const segments = entryName.split('/');
    const destination = path.join(payloadRoot, ...segments);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, `fixture:${entryName}`, 'utf8');
  }));
  await writeFile(zipScriptPath, String.raw`param(
    [Parameter(Mandatory = $true)][string]$SourcePath,
    [Parameter(Mandatory = $true)][string]$ArchivePath
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$resolvedSourcePath = (Resolve-Path -LiteralPath $SourcePath).Path
$archive = [IO.Compression.ZipFile]::Open(
    $ArchivePath,
    [IO.Compression.ZipArchiveMode]::Create
)
try {
    foreach ($file in Get-ChildItem -LiteralPath $resolvedSourcePath -File -Recurse) {
        $entryName = $file.FullName.Substring($resolvedSourcePath.Length + 1) -replace '\\', '/'
        [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archive,
            $file.FullName,
            $entryName,
            [IO.Compression.CompressionLevel]::Optimal
        )
    }
}
finally {
    $archive.Dispose()
}
`, 'utf8');
  await runPowerShellFile(zipScriptPath, '-SourcePath', payloadRoot, '-ArchivePath', archivePath);
  return archivePath;
};

const runAnimalBundleInspector = async (archivePath) => {
  const runnerPath = path.join(path.dirname(archivePath), 'invoke-inspector.ps1');
  await writeFile(runnerPath, String.raw`param(
    [Parameter(Mandatory = $true)][string]$InspectorPath,
    [Parameter(Mandatory = $true)][string]$BundlePath,
    [switch]$SkipDeliveryMetadataCheck
)
$ErrorActionPreference = 'Stop'
try {
    & $InspectorPath -BundlePath $BundlePath -SkipDeliveryMetadataCheck:$SkipDeliveryMetadataCheck
}
catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
`, 'utf8');
  return runPowerShellFile(
    runnerPath,
    '-InspectorPath',
    path.join(repoRoot, 'scripts', 'Inspect-AndroidBundle.ps1'),
    '-BundlePath',
    archivePath,
    '-SkipDeliveryMetadataCheck',
  );
};

after(async () => {
  await Promise.all([...temporaryBundleRoots].map((fixtureRoot) => (
    rm(fixtureRoot, { recursive: true, force: true })
  )));
});

test('Android registers an on-demand game_assets pack', async () => {
  const settings = await readSource('android/settings.gradle');
  const appBuild = await readSource('android/app/build.gradle');
  const packBuild = await readSource('android/game_assets/build.gradle');

  assert.match(settings, /include ':game_assets'/);
  assert.match(appBuild, /assetPacks\s*=\s*\[":game_assets"\]/);
  assert.match(packBuild, /id 'com\.android\.asset-pack'/);
  assert.match(packBuild, /packName\s*=\s*"game_assets"/);
  assert.match(packBuild, /deliveryType\s*=\s*"on-demand"/);
  assert.doesNotMatch(packBuild, /deliveryType\s*=\s*"fast-follow"/);
  assert.match(appBuild, /com\.google\.android\.play:asset-delivery:2\.3\.0/);
});

test('Android waits for explicit consent before fetching game assets', async () => {
  const activity = await readSource('android/app/src/main/java/com/lashomeschool/hub/MainActivity.java');
  const plugin = await readSource('android/app/src/main/java/com/lashomeschool/hub/GameAssetDeliveryPlugin.java');

  assert.match(activity, /registerPlugin\(GameAssetDeliveryPlugin\.class\)/);
  assert.doesNotMatch(activity, /assetPackManager\.fetch/);
  assert.match(plugin, /@CapacitorPlugin\(name = "GameAssetDelivery"\)/);
  assert.match(plugin, /void getStatus\(PluginCall call\)/);
  assert.match(plugin, /void startDownload\(PluginCall call\)/);
  assert.match(plugin, /assetPackManager\s*\.\s*getPackStates/);
  assert.match(plugin, /assetPackManager\s*\.\s*fetch/);
  assert.match(plugin, /notifyListeners\("downloadStateChanged"/);
  assert.match(plugin, /showConfirmationDialog/);
});

test('Android serves the downloaded game asset pack from trusted local paths', async () => {
  const activity = await readSource('android/app/src/main/java/com/lashomeschool/hub/MainActivity.java');
  const client = await readSource('android/app/src/main/java/com/lashomeschool/hub/GameAssetWebViewClient.java');

  assert.match(activity, /AssetPackManagerFactory\.getInstance/);
  assert.match(activity, /setWebViewClient\(new GameAssetWebViewClient/);
  assert.match(client, /getPackLocation\("game_assets"\)/);
  assert.match(client, /assetsPath\(\)/);
  assert.match(client, /getCanonicalPath\(\)/);
  assert.match(client, /WebResourceResponse/);
  assert.match(client, /normalizeGameAssetPath/);
  assert.match(client, /path\.indexOf\(marker\)/);
  assert.match(client, /isTrustedLocalRequest/);
  assert.match(client, /"localhost"\.equals\(host\)/);
});

test('Android recovers when a memory-heavy game loses the WebView renderer', async () => {
  const client = await readSource('android/app/src/main/java/com/lashomeschool/hub/GameAssetWebViewClient.java');

  assert.match(client, /onRenderProcessGone/);
  assert.match(client, /detail\.didCrash\(\)/);
  assert.match(client, /activity == null/);
  assert.match(client, /return true/);
  assert.match(client, /activity\.recreate\(\)/);
});

test('web shell blocks Android boot until the on-demand library is ready', async () => {
  const index = await readSource('index.html');
  const main = await readSource('src/main.tsx');
  const gate = await readSource('src/features/gameAssets/gameAssetDelivery.ts');
  const styles = await readSource('src/features/gameAssets/gameAssetDelivery.css');

  assert.match(index, /id="game-asset-gate"/);
  assert.match(index, /Download Full Library/);
  assert.match(index, /Coins collected while waiting/);
  assert.match(main, /await initializeGameAssetGate\(\)/);
  assert.match(gate, /registerPlugin<GameAssetDeliveryPlugin>\('GameAssetDelivery'\)/);
  assert.match(gate, /Capacitor\.getPlatform\(\) !== 'android'/);
  assert.match(gate, /startDownload\(\)/);
  assert.match(gate, /downloadStateChanged/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /env\(safe-area-inset-bottom/);
  assert.match(styles, /max\(4\.5rem, calc\(env\(safe-area-inset-top/);
});

test('Android relative base path does not become a React Router basename', async () => {
  const app = await readSource('src/App.tsx');

  assert.match(app, /baseUrl === '\.\/'/);
  assert.match(app, /\? '' : baseUrl\.replace/);
});

test('Android release advances to the on-demand delivery version', async () => {
  const appBuild = await readSource('android/app/build.gradle');

  assert.match(appBuild, /versionCode\s+5/);
  assert.match(appBuild, /versionName\s+"1\.0\.4"/);
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
  assert.match(inspector, /Animal Champion/);
  assert.match(inspector, /animal-data\.js/);
  assert.match(inspector, /animal-champion-128\.webp/);
  assert.match(inspector, /shared\/lahsPointsBridge\.js/);
  assert.match(inspector, /expectedAnimalImageCount\s*=\s*100/);
  assert.match(inspector, /expectedAnimalVoiceCount\s*=\s*154/);
  assert.match(inspector, /StringComparer.*Ordinal/);
  assert.match(inspector, /bundletool-all-\*\.jar/);
  assert.match(inspector, /dist:on-demand/);
  assert.match(inspector, /SkipDeliveryMetadataCheck/);
  assert.match(release, /Inspect-AndroidBundle\.ps1/);
});

const fixedAnimalBundleEntries = [
  'game_assets/assets/Games/Animal Champion/index.html',
  'game_assets/assets/Games/Animal Champion/css/style.css',
  'game_assets/assets/Games/Animal Champion/js/animal-data.js',
  'game_assets/assets/Games/Animal Champion/js/audio-system.js',
  'game_assets/assets/Games/Animal Champion/js/game-engine.js',
  'game_assets/assets/Games/Animal Champion/js/game.js',
  'game_assets/assets/Games/Animal Champion/js/voice-manifest.js',
  'game_assets/assets/Games/Animal Champion/assets/audio/voice/voice-ledger.json',
  'game_assets/assets/Games/Animal Champion/assets/images/ui/menu-wallpaper.webp',
  'game_assets/assets/Games/Animal Champion/assets/images/ui/thumb.webp',
  'game_assets/assets/Games/shared/lahsPointsBridge.js',
  'base/assets/public/assets/thumbnails/optimized/animal-champion-128.webp',
];
const selectedAnimalBundleEntries = ANIMAL_DATABASE.flatMap(({ images }) => (
  images.map((imagePath) => `game_assets/assets/Games/Animal Champion/${imagePath}`)
));
const selectedAnimalVoiceBundleEntries = ALL_VOICE_CLIPS.map(({ path: voicePath }) => (
  `game_assets/assets/Games/Animal Champion/${voicePath}`
));
const requiredAnimalBundleEntries = [
  ...fixedAnimalBundleEntries,
  ...selectedAnimalBundleEntries,
  ...selectedAnimalVoiceBundleEntries,
];

test('Android bundle inspector accepts a complete exact Animal Champion archive', async () => {
  assert.equal(requiredAnimalBundleEntries.length, 266);
  assert.equal(new Set(requiredAnimalBundleEntries).size, 266);

  const archivePath = await createSyntheticAnimalBundle(requiredAnimalBundleEntries);
  const { stdout } = await runAnimalBundleInspector(archivePath);
  const result = JSON.parse(stdout);

  assert.equal(path.resolve(result.bundlePath), path.resolve(archivePath));
  assert.deepEqual(Object.keys(result.modules), ['base', 'game_assets']);
  assert.ok(result.modules.base > 0);
  assert.ok(result.modules.game_assets > 0);
});

test('Android bundle inspector aggregates sorted missing and case-mismatched Animal paths', async () => {
  const caseMismatchedEntry = 'game_assets/assets/Games/Animal Champion/js/game.js';
  const expectedMissingEntries = [
    'base/assets/public/assets/thumbnails/optimized/animal-champion-128.webp',
    'game_assets/assets/Games/Animal Champion/Animals/Bat/chatgpt-generated.webp',
    'game_assets/assets/Games/Animal Champion/assets/audio/voice/animals/bat.mp3',
    'game_assets/assets/Games/Animal Champion/index.html',
    caseMismatchedEntry,
    'game_assets/assets/Games/shared/lahsPointsBridge.js',
  ].sort();
  const includedEntries = requiredAnimalBundleEntries
    .filter((entry) => !expectedMissingEntries.includes(entry))
    .concat(
      'base/manifest/AndroidManifest.xml',
      'game_assets/assets/Games/Animal Champion/js/Game.js',
    );
  const archivePath = await createSyntheticAnimalBundle(includedEntries);
  const expectedMessage = [
    'Android bundle is missing required Animal Champion entries:',
    ...expectedMissingEntries,
  ].join('\n');

  await assert.rejects(
    runAnimalBundleInspector(archivePath),
    (error) => {
      assert.notEqual(error.code, 0);
      assert.equal(String(error.stderr).replaceAll('\r\n', '\n').trim(), expectedMessage);
      return true;
    },
  );
});
