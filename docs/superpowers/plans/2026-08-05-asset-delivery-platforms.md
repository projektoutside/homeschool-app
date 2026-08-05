# Assets, Performance, Web, Android, and iOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate executable experience code from heavy media, remove proven duplication, support scalable web delivery, and make Android asset packs valid without breaking browser or iOS paths.

**Architecture:** Experience manifests declare media bundles. A shared resolver maps logical media IDs to local web URLs, optional versioned storage URLs, or trusted Android pack URLs. Production application code always ships with the app; only non-executable media enters Play Asset Delivery.

**Tech Stack:** Node.js 24, Vite 7, Supabase Storage-compatible HTTP delivery, Capacitor 8, Android Play Asset Delivery 2.3, Java, Gradle, PowerShell, iOS Capacitor project inspection.

## Global Constraints

- Never put HTML, JavaScript, TypeScript, WebAssembly, source maps, or executable application shaders into Play Asset Delivery.
- Do not delete or move a material asset until references and SHA-256 duplicates are recorded and the replacement path passes build/runtime checks.
- Preserve browser/GitHub Pages behavior while remote media is optional.
- Do not upload hundreds of MB, incur storage cost, or mutate a live bucket without explicit approval and an allowlisted project/bucket.
- Android pack location is runtime-resolved on each launch and never persisted.
- Missing media produces a recoverable UI, not a blank game/classroom.
- iOS physical-device claims require an actual Apple test path; Windows inspection is labeled accurately.

## File map

- `packages/media-runtime/src/`: logical bundle resolver and integrity types.
- `media/media.manifest.json`: deterministic media inventory and delivery policy.
- `scripts/assets/build-media-manifest.mjs`: hashes, references, sizes, and policy validation.
- `scripts/assets/upload-media.mjs`: dry-run-default versioned uploader.
- `scripts/Stage-AndroidAssetPack.ps1`: media-only staging.
- `android/.../GameAssetDeliveryPlugin.java`: on-demand status/fetch lifecycle.
- `android/.../GameAssetWebViewClient.java`: trusted logical media serving.

---

### Task 1: Build a deterministic media and duplicate inventory

**Files:**
- Create: `media/media.manifest.json`
- Create: `scripts/assets/build-media-manifest.mjs`
- Create: `scripts/mediaManifest.test.mjs`
- Modify: `scripts/audit-nonhome-assets.mjs`
- Modify: `package.json`
- Create: `docs/project/inventory/assets-baseline.md`

**Interfaces:**
- Consumes: built game/classroom manifests and repository media files.
- Produces: logical media bundles with SHA-256, bytes, MIME, owners, and delivery classification.

- [ ] **Step 1: Write failing media policy tests**

Assert the builder rejects bundle files ending in `.html`, `.js`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.wasm`, or `.map`; rejects traversal; rejects duplicate logical IDs; and emits identical JSON on two runs over the same fixture.

Use this fixture shape:

```js
const bundle = {
  id: 'math-puzzle-media',
  owner: { kind: 'game', id: 'MathPuzzle' },
  delivery: { web: 'local', android: 'on-demand', ios: 'bundled' },
  files: [{ logicalPath: 'audio/correct.mp3', source: 'games/math-puzzle/assets/audio/correct.mp3' }],
};
```

- [ ] **Step 2: Verify the builder is absent**

Run: `node --test scripts/mediaManifest.test.mjs`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement hashing and classification**

For each file, resolve below the repository, stat, stream SHA-256, detect MIME by extension from an allowlist, and write:

```json
{
  "schemaVersion": 1,
  "generatedAt": "content-derived-not-wall-clock",
  "bundles": [],
  "duplicates": [],
  "totals": { "bytes": 0, "files": 0 }
}
```

Set `generatedAt` to the Git commit SHA or explicit `SOURCE_VERSION`, not current time, so repeated builds are deterministic. Duplicate groups list hashes and all owners but do not remove files.

- [ ] **Step 4: Extend the asset audit**

Make `audit-nonhome-assets.mjs` consume the media manifest and report missing files, unowned files, forbidden executable extensions, duplicate bytes, files over policy thresholds, and referenced paths outside owner packages. Errors are missing/forbidden/traversal; size and duplicate findings remain warnings until migration tasks address them.

- [ ] **Step 5: Record the exact baseline**

Run:

```powershell
node scripts/assets/build-media-manifest.mjs --write
node --test scripts/mediaManifest.test.mjs
npm run audit:assets
```

Record total bytes/files, duplicate groups/bytes, largest 25 files, ownerless directories including `Animal Champion` and `public/3dClass/vite-app`, and current `public`/`dist` sizes in `assets-baseline.md`.

- [ ] **Step 6: Commit inventory without deleting assets**

```powershell
git add media/media.manifest.json scripts/assets/build-media-manifest.mjs scripts/mediaManifest.test.mjs scripts/audit-nonhome-assets.mjs package.json docs/project/inventory/assets-baseline.md
git commit -m "build: add deterministic media inventory"
```

### Task 2: Deduplicate and assign media to experience owners safely

**Files:**
- Modify: `games/*/assets/`
- Modify: `classrooms/*/assets/`
- Create: `packages/shared-media/`
- Create: `scripts/assets/verify-media-moves.mjs`
- Create: `scripts/mediaMoves.test.mjs`
- Modify: `media/media.manifest.json`

**Interfaces:**
- Consumes: duplicate groups, reference graph, game/classroom owners.
- Produces: one canonical owned copy for each proven byte-identical shared asset and a verified redirect/alias map.

- [ ] **Step 1: Write move-integrity tests before moving files**

The test reads `media/media-moves.json` and requires each entry to contain `from`, `to`, `sha256`, `owners`, and `replacementReferences`. It verifies source hash before move, destination hash after move, and that every previous text reference now resolves to destination or a generated compatibility alias.

- [ ] **Step 2: Generate a dry-run move proposal**

Run: `node scripts/assets/verify-media-moves.mjs --propose`

Expected: write only `.codex-runtime/media-moves.proposed.json`; make no source changes. Review every proposed canonical owner.

- [ ] **Step 3: Approve only byte-identical, referenced groups**

Create tracked `media/media-moves.json` from reviewed groups. Shared assets used by at least two packages move to `packages/shared-media/assets/<sha-prefix>/<filename>`. Single-owner assets move below that owner. Unreferenced material becomes `delete-candidate` in inventory and remains present.

- [ ] **Step 4: Apply moves with hash guards**

`verify-media-moves.mjs --apply` must refuse a source hash mismatch, refuse destinations outside approved roots, use rename/copy-verify-delete within the repository, update declared text references, and write a rollback map. It never recursively deletes a directory.

- [ ] **Step 5: Build and verify all affected owners**

Run:

```powershell
node scripts/assets/verify-media-moves.mjs --verify
node --test scripts/mediaMoves.test.mjs
npm run check:games
npm run check:classroom
npm run audit:assets
npm run build
```

Expected: hashes and references pass; duplicate-byte total decreases by the exact recorded amount; legacy URLs remain healthy.

- [ ] **Step 6: Commit moves and rollback map**

```powershell
git add games classrooms packages/shared-media media scripts docs/project/inventory/assets-baseline.md
git commit -m "refactor: assign and deduplicate experience media"
```

### Task 3: Add a cross-platform logical media resolver

**Files:**
- Create: `packages/media-runtime/package.json`
- Create: `packages/media-runtime/src/types.ts`
- Create: `packages/media-runtime/src/resolver.ts`
- Create: `packages/media-runtime/src/integrity.ts`
- Create: `packages/media-runtime/src/index.ts`
- Create: `scripts/mediaResolver.test.mjs`
- Create: `scripts/assets/upload-media.mjs`
- Modify: game/classroom templates

**Interfaces:**
- Consumes: logical bundle/file ID, platform mode, media manifest, optional approved remote base URL.
- Produces: `resolveMedia(logicalId): ResolvedMedia` and dry-run versioned upload plan.

- [ ] **Step 1: Write resolver tests**

Assert:

```js
assert.deepEqual(resolveMedia('math-puzzle-media/audio/correct.mp3', webLocal), {
  kind: 'url', url: '/media/math-puzzle-media/audio/correct.mp3', integrity: fixtureHash,
});
assert.equal(resolveMedia('missing', webLocal).kind, 'missing');
assert.match(resolveMedia('math-puzzle-media/audio/correct.mp3', android).url, /^https:\/\/localhost\/__media\//);
```

Remote URLs include immutable version/hash segments and never contain raw filesystem paths.

- [ ] **Step 2: Verify resolver absence**

Run: `node --test scripts/mediaResolver.test.mjs`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement resolver types and policy**

```ts
export type MediaPlatform = 'web-local' | 'web-remote' | 'android' | 'ios';
export interface MediaFileRecord {
  logicalPath: string;
  source: string;
  sha256: string;
  bytes: number;
  mime: string;
}
export interface MediaBundleRecord {
  id: string;
  owner: { kind: 'game' | 'classroom' | 'shared'; id: string };
  delivery: { web: 'local' | 'remote'; android: 'bundled' | 'on-demand'; ios: 'bundled' | 'remote' };
  files: MediaFileRecord[];
}
export interface MediaManifest {
  schemaVersion: 1;
  generatedAt: string;
  bundles: MediaBundleRecord[];
  duplicates: Array<{ sha256: string; bytes: number; logicalIds: string[] }>;
  totals: { bytes: number; files: number };
}
export type ResolvedMedia =
  | { kind: 'url'; url: string; integrity: string; bytes: number }
  | { kind: 'download-required'; bundleId: string; bytes: number }
  | { kind: 'missing'; logicalId: string; reason: string };

export interface MediaResolverOptions {
  platform: MediaPlatform;
  manifest: MediaManifest;
  remoteBaseUrl?: string;
  installedBundles?: ReadonlySet<string>;
}
```

Normalize IDs, reject traversal/encoded traversal, and return `download-required` for absent on-demand Android bundles.

- [ ] **Step 4: Create a dry-run-default uploader**

`upload-media.mjs` reads the manifest and prints planned object keys `<app-version>/<sha256>/<logicalPath>`. It performs no network mutation unless `--apply`, `MEDIA_UPLOAD_ALLOWED_PROJECT` matches the parsed Supabase project ref, and `MEDIA_UPLOAD_CONFIRM=UPLOAD_VERSIONED_MEDIA`. It skips an object only after remote size/hash metadata matches.

- [ ] **Step 5: Adopt resolver in templates and pilots**

Replace direct base-path media assumptions in game/classroom templates and representative packages. Render an accessible retry/download surface for `download-required` and `missing` instead of starting a scene with broken media.

- [ ] **Step 6: Run resolver and pilot checks**

Run:

```powershell
node --test scripts/mediaResolver.test.mjs
node scripts/assets/upload-media.mjs --dry-run
npm run check:games
npm run check:classroom
```

Expected: PASS and the uploader reports planned operations only.

- [ ] **Step 7: Commit resolver and upload tooling**

```powershell
git add packages/media-runtime scripts/mediaResolver.test.mjs scripts/assets/upload-media.mjs templates games/math-puzzle games/polygon-fun classrooms/main
git commit -m "feat: add cross-platform media delivery resolver"
```

### Task 4: Replace Android executable staging with media-only on-demand delivery

**Files:**
- Modify: `android/game_assets/build.gradle`
- Create: `android/app/src/main/java/com/lashomeschool/hub/GameAssetDeliveryPlugin.java`
- Modify: `android/app/src/main/java/com/lashomeschool/hub/MainActivity.java`
- Modify: `android/app/src/main/java/com/lashomeschool/hub/GameAssetWebViewClient.java`
- Modify: `scripts/Stage-AndroidAssetPack.ps1`
- Modify: `scripts/Build-AndroidRelease.ps1`
- Modify: `scripts/Inspect-AndroidBundle.ps1`
- Modify: `scripts/androidAssetPack.test.mjs`
- Create: `apps/shell/src/features/media/AndroidMediaDownload.ts`

**Interfaces:**
- Consumes: Android-classified media bundles and user-initiated download action.
- Produces: Capacitor plugin status/fetch events and trusted `https://localhost/__media/...` responses.

- [ ] **Step 1: Replace the old static contract with media-only failures**

Require `deliveryType = "on-demand"`; prohibit launch-time `fetch()`; prohibit staging extensions `.html`, `.js`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.wasm`, `.map`; require manifest-hash verification; require final bundle metadata `dist:on-demand`.

- [ ] **Step 2: Run and confirm current staging fails**

Run: `node --test scripts/androidAssetPack.test.mjs`

Expected: FAIL because the pack is `fast-follow`, `MainActivity` fetches at launch, and whole executable directories are moved.

- [ ] **Step 3: Make staging copy only declared media**

Rewrite `Stage-AndroidAssetPack.ps1` to read `media/media.manifest.json`, select files whose bundle delivery is `android: on-demand`, verify source hash, reject forbidden extensions, and `Copy-Item -LiteralPath` each file beneath `android/game_assets/src/main/assets/media/<bundle-id>/`. Write a staged manifest with source hash, bytes, and logical path. Never mutate `dist` and never recurse-delete outside the validated pack assets directory.

- [ ] **Step 4: Implement consent-based plugin ownership**

`GameAssetDeliveryPlugin` owns `getStatus`, `startDownload`, confirmation, listener registration, progress events, and cleanup. `MainActivity` only registers the plugin and installs `GameAssetWebViewClient`. No fetch occurs before the shell calls `startDownload` following a visible user action.

- [ ] **Step 5: Serve only trusted logical media requests**

`GameAssetWebViewClient` intercepts exact `https://localhost/__media/<bundle>/<path>` requests, rejects encoded traversal, canonical-path escape, unknown bundle/path, and hash mismatch, then returns MIME and stream from the current pack location. All other trusted local requests use Capacitor's normal client.

- [ ] **Step 6: Connect resolver download state to accessible UI**

`AndroidMediaDownload.ts` exposes `ensureBundle(bundleId): Promise<'installed' | 'deferred'>`, displays reported bytes before download, survives activity recreation by re-querying status, and sends progress to an `aria-live` surface. Cancel/failure keeps the shell usable and the experience unlaunched.

- [ ] **Step 7: Inspect the exact release artifact**

Run:

```powershell
node --test scripts/androidAssetPack.test.mjs
npm run build
powershell -ExecutionPolicy Bypass -File scripts\Build-AndroidRelease.ps1
```

Expected: signed AAB when signing prerequisites exist; separate `base`/`game_assets`; `game_assets` is on-demand and contains only declared media; base contains executable game/classroom code. Missing signing credentials are reported as artifact-verification limitation.

- [ ] **Step 8: Commit media-only Android delivery**

```powershell
git add android/game_assets/build.gradle android/app/src/main/java/com/lashomeschool/hub scripts/Stage-AndroidAssetPack.ps1 scripts/Build-AndroidRelease.ps1 scripts/Inspect-AndroidBundle.ps1 scripts/androidAssetPack.test.mjs apps/shell/src/features/media
git commit -m "fix: restrict Android asset delivery to media"
```

### Task 5: Verify web, Android, and iOS isolation

**Files:**
- Create: `scripts/platformAssets.test.mjs`
- Create: `docs/project/runbooks/assets.md`
- Create: `docs/project/quality/assets-native.md`
- Modify: `package.json`
- Review: `ios/App/`, `capacitor.config.json`, built web/native artifacts

**Interfaces:**
- Consumes: media resolver, web build, Android AAB, iOS Capacitor project.
- Produces: `npm run check:assets-native` and truthful platform evidence.

- [ ] **Step 1: Test platform isolation**

Assert web builds do not import Android plugins on initialization; iOS never requests a Play Asset Delivery URL; Capacitor `webDir` remains `dist`; remote media mode requires HTTPS; local mode keeps GitHub Pages base paths; Android pack paths cannot leak into `app-version.json`.

- [ ] **Step 2: Define the workstream gate**

Add:

```json
"check:assets-native": "node --test scripts/mediaManifest.test.mjs scripts/mediaMoves.test.mjs scripts/mediaResolver.test.mjs scripts/androidAssetPack.test.mjs scripts/platformAssets.test.mjs && npm run audit:assets && npm run build"
```

- [ ] **Step 3: Run web and Android checks**

Run:

```powershell
npm run check:assets-native
npx cap sync android
Push-Location android
.\gradlew.bat :app:assembleDebug
Pop-Location
```

Expected: PASS with no generated pack payload staged in Git.

- [ ] **Step 4: Run available iOS checks without overclaiming**

Run `npx cap sync ios` only if the installed Capacitor CLI supports a non-destructive sync on Windows and the worktree is clean except expected generated files. Inspect `ios/App` for missing web assets, Android-only references, and configuration drift. Record physical iPhone/iPad build/runtime as not executed unless a real macOS/device path is available.

- [ ] **Step 5: Record performance and delivery evidence**

In `assets-native.md`, record public/dist bytes before/after, duplicate bytes removed, base/AAB/pack sizes, executable-file scan result, web media mode, CDN upload status, Android emulation/physical status, and iOS inspection/physical status.

- [ ] **Step 6: Commit platform evidence**

```powershell
git add scripts/platformAssets.test.mjs docs/project/runbooks/assets.md docs/project/quality/assets-native.md package.json ios capacitor.config.json
git commit -m "test: verify cross-platform asset isolation"
```
