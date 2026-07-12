# Play Asset Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the large static learner content out of the Android base module into an install-time Play Asset Delivery pack while preserving existing app URLs and offline behavior.

**Architecture:** Capacitor continues to copy the complete production `dist` tree into Android. The release script then moves selected top-level content directories from `android/app/src/main/assets/public` into an ignored, generated asset-pack staging directory with the same relative paths. Install-time packs are exposed through Android's `AssetManager`, which matches Capacitor's existing asset-loading path and avoids per-game URL rewrites.

**Tech Stack:** React 19, Vite 7, Capacitor 8, Android Gradle Plugin 8.13, Groovy Gradle, PowerShell, Google Play Asset Delivery.

## Global Constraints

- Keep package ID `com.lashomeschool.hub`.
- Preserve offline access and all learner games/resources.
- Keep browser and GitHub Pages builds unchanged.
- Keep signing keys and generated pack payload out of Git.
- Use one install-time asset pack named `game_assets`.
- Do not roll out a release until Google Play accepts the bundle and testers are configured.

---

### Task 1: Asset-pack module and staging contract

**Files:**
- Create: `android/game_assets/build.gradle`
- Create: `android/game_assets/src/main/assets/.gitkeep`
- Modify: `android/settings.gradle`
- Modify: `android/app/build.gradle`
- Modify: `.gitignore`
- Create: `scripts/androidAssetPack.test.mjs`

**Interfaces:**
- Produces: Gradle module `:game_assets` with install-time delivery.
- Produces: ignored staging root `android/game_assets/src/main/assets`.

- [ ] Write static contract tests proving the module is included, registered by the app, install-time, and ignored except for `.gitkeep`.
- [ ] Run `node --test scripts/androidAssetPack.test.mjs`; expect failures before the module exists.
- [ ] Add the minimal asset-pack Gradle module and registration.
- [ ] Run the focused test; expect all module assertions to pass.

### Task 2: Deterministic asset split

**Files:**
- Create: `scripts/Stage-AndroidAssetPack.ps1`
- Modify: `scripts/Build-AndroidRelease.ps1`
- Modify: `scripts/androidAssetPack.test.mjs`

**Interfaces:**
- Consumes: synced Capacitor payload at `android/app/src/main/assets/public`.
- Produces: base-shell payload plus same-path pack payload under `android/game_assets/src/main/assets`.

- [ ] Add tests for the exact move list: `Games`, `HomePageAPP`, `PolygonAPP`, `3dClass`, `Worksheets`, `FinalGraph`, and `MathWorksheetCreator`.
- [ ] Add assertions that staging removes stale output, fails when required directories are absent, and writes a size manifest.
- [ ] Run focused tests and observe the new script-contract failures.
- [ ] Implement staging with resolved-path safety checks and `Move-Item` within the Android workspace.
- [ ] Call staging after `npx cap sync android` and before `bundleRelease`.
- [ ] Run the focused tests; expect all assertions to pass.

### Task 3: Signed bundle and module-size validation

**Files:**
- Modify: `scripts/Build-AndroidRelease.ps1`
- Create: `scripts/Inspect-AndroidBundle.ps1`

**Interfaces:**
- Consumes: signed `app-release.aab`.
- Produces: module listing and compressed-size guard for `base` and `game_assets`.

- [ ] Add focused assertions for post-build bundle inspection.
- [ ] Run tests and observe the missing-inspector failure.
- [ ] Implement bundle ZIP inspection, require both modules, and fail if the base module is at or above 500 MB.
- [ ] Run `powershell -ExecutionPolicy Bypass -File scripts/Build-AndroidRelease.ps1`.
- [ ] Run the inspector and record exact module sizes.

### Task 4: Tier 3 validation and Google Play upload

**Files:**
- Modify only build-generated files when required by Capacitor conventions.

**Interfaces:**
- Consumes: accepted signed bundle.
- Produces: internal-test draft ready for tester selection and rollout.

- [ ] Run `node --test scripts/androidAssetPack.test.mjs`, auth tests, PWA tests, `npm run check`, and `npm run audit:games`.
- [ ] Use bundletool local testing when an Android emulator/device is available; otherwise report the physical-device gap.
- [ ] Upload the rebuilt `.aab` to release `1.0 Internal Guest Play`.
- [ ] Confirm Google reports no 500 MB base-module validation error.
- [ ] Configure tester access after obtaining approved Google Account email addresses.
- [ ] Preview and roll out the release only after an action-time confirmation for the external rollout.
- [ ] Return the exact tester opt-in URL.
