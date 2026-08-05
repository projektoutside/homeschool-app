# Cross-Device QA and Release Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the integrated platform preserves real user behavior across representative desktop, phone, tablet, iframe, 2D/3D, backend, web, and native paths before any release claim.

**Architecture:** Use the versioned SDK readiness signals and generated catalog to drive Playwright CLI smoke sessions. Add focused interaction scripts for representative high-risk experiences, collect console/network/screenshot evidence, then combine browser, backend, artifact, emulator, and physical-device results in one non-publishing release gate.

**Tech Stack:** Playwright CLI through `npx`, Node.js 24, PowerShell, Vite preview, Chrome/Chromium emulation, Android Gradle/emulator tooling, existing Capacitor projects, accessibility snapshots, browser performance APIs.

## Global Constraints

- Use Playwright CLI with a fresh snapshot before element-reference interactions; do not introduce `@playwright/test` test suites.
- Store browser artifacts only under `output/playwright/`.
- A passing build, HTTP response, or visible first frame is not interaction proof.
- Capture fatal console errors, failed requests, readiness timeout, navigation failure, and teardown failure as blocking.
- Reference sizes are desktop 1440x900, Android 393x852, iPhone 390x844, tablet portrait 1024x1366, and tablet landscape 1366x1024; add phone landscape for orientation-sensitive experiences.
- Label physical, emulated, automated, build-inspected, and code-reviewed evidence separately.
- Do not publish, push, deploy, upload, or mutate production from `check:qa-release`.

## File map

- `scripts/Run-BrowserSmoke.ps1`: Playwright CLI session orchestration.
- `scripts/browser-smoke.config.json`: catalog-driven routes and interaction profiles.
- `scripts/browserSmokeContract.test.mjs`: smoke-runner safety contract.
- `output/playwright/`: ignored runtime evidence.
- `docs/project/quality/device-matrix.md`: execution matrix.
- `docs/project/quality/qa-release.md`: final QA workstream evidence.

---

### Task 1: Build catalog-driven browser smoke sessions

**Files:**
- Create: `scripts/browser-smoke.config.json`
- Create: `scripts/Run-BrowserSmoke.ps1`
- Create: `scripts/browserSmokeContract.test.mjs`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: preview base URL, generated experience IDs, manifest health timeout, optional `--grep` filter.
- Produces: one Playwright CLI session per route/profile plus JSON summary and screenshots under `output/playwright/`.

- [ ] **Step 1: Confirm the required CLI prerequisite**

Run:

```powershell
Get-Command npx
npx --package @playwright/cli playwright-cli --help
```

Expected: `npx` resolves and Playwright CLI help exits 0.

- [ ] **Step 2: Write a failing runner safety contract**

Assert the PowerShell source invokes `npx --package @playwright/cli playwright-cli`, uses named sessions, calls `snapshot` before `click`/`fill`/`press` commands, writes only under `output/playwright`, closes sessions in `finally`, captures `console error` and `network`, and contains no publish/deploy/push commands.

- [ ] **Step 3: Verify the runner is missing**

Run: `node --test scripts/browserSmokeContract.test.mjs`

Expected: FAIL because `Run-BrowserSmoke.ps1` does not exist.

- [ ] **Step 4: Define smoke profiles**

Create configuration:

```json
{
  "schemaVersion": 1,
  "profiles": [
    { "id": "shell-home", "route": "/", "readySelector": "#root", "timeoutMs": 15000 },
    { "id": "catalog", "route": "/apps", "readySelector": "[data-content-catalog-ready=\"true\"]", "timeoutMs": 15000 },
    { "id": "classroom", "route": "/classroom", "readySelector": "[data-classroom-status=\"ready\"]", "timeoutMs": 30000 },
    { "id": "math-puzzle", "route": "/play/MathPuzzle", "readySelector": "[data-game-status=\"ready\"]", "timeoutMs": 20000 },
    { "id": "polygon-fun", "route": "/play/math-1768955732393-game", "readySelector": "[data-game-status=\"ready\"]", "timeoutMs": 30000 }
  ]
}
```

The catalog generator appends one launch-only profile per registered experience at runtime; these five remain deeper named profiles.

- [ ] **Step 5: Implement safe Playwright CLI orchestration**

The script starts from an already running `BASE_URL` (default `http://127.0.0.1:4173`), creates session names `lahs-<profile>-<viewport>`, calls `open`, `resize`, `snapshot`, checks the readiness selector with `eval`, saves a screenshot, captures `console error` and `network`, then closes in `finally`. A nonempty error console, failed main document, or readiness timeout marks failure.

Support `--grep <text>` by filtering profile IDs/routes case-insensitively. Never infer success only from screenshot creation.

- [ ] **Step 6: Wire the smoke command and output ignore**

Add:

```json
"test:e2e": "powershell -ExecutionPolicy Bypass -File scripts/Run-BrowserSmoke.ps1"
```

Add `/output/playwright/` to `.gitignore` while retaining the existing `output/` policy if other tracked artifacts depend on it.

- [ ] **Step 7: Run the focused profiles**

Start `npm run preview` in a background process, verify the port, then run:

```powershell
npm run test:e2e -- --grep "shell-home|catalog|math-puzzle|polygon-fun|classroom"
```

Expected: each profile reaches its explicit readiness selector with no fatal console or main-document network failure.

- [ ] **Step 8: Commit browser smoke infrastructure**

```powershell
git add scripts/browser-smoke.config.json scripts/Run-BrowserSmoke.ps1 scripts/browserSmokeContract.test.mjs package.json .gitignore
git commit -m "test: add catalog-driven browser smoke sessions"
```

### Task 2: Cover the required device and interaction matrix

**Files:**
- Modify: `scripts/browser-smoke.config.json`
- Modify: `scripts/Run-BrowserSmoke.ps1`
- Create: `scripts/interaction-profiles/`
- Create: `docs/project/quality/device-matrix.md`

**Interfaces:**
- Consumes: Playwright CLI sessions and stable accessibility snapshot refs.
- Produces: recorded matrix for navigation, touch/keyboard, audio, fullscreen, orientation, iframe, and responsive behavior.

- [ ] **Step 1: Add exact viewports**

Add `desktop: 1440x900`, `android-phone: 393x852`, `iphone: 390x844`, `tablet-portrait: 1024x1366`, and `tablet-landscape: 1366x1024`. Add `phone-landscape: 852x393` only to profiles whose manifest orientation is `landscape` or `any` and whose controls change with orientation.

- [ ] **Step 2: Add explicit interaction profiles**

Each profile is a JSON list of CLI-safe actions `snapshot`, `clickByRoleAndName`, `press`, `resize`, `reload`, `goBack`, `assertSelector`, `assertText`, and `screenshot`. The runner resolves `clickByRoleAndName` by snapshotting, locating the current accessibility ref in snapshot output, then clicking that ref; it re-snapshots after navigation/modal changes.

Create profiles for:

- guest entry to catalog and back navigation;
- Math Puzzle pointer and keyboard answer paths;
- Polygon Fun resize, fullscreen request/fallback, pause/resume;
- classroom door intro, station launch, return, and manager-control denial as learner;
- audio disabled/enabled preference sync;
- microphone denial for Car King;
- iframe teardown when leaving a game.

- [ ] **Step 3: Run the matrix in headed mode for visual evidence**

Run:

```powershell
npm run test:e2e -- --headed
```

Expected: all launch-only profiles pass at Android-phone and desktop sizes; deeper profiles pass at every applicable viewport.

- [ ] **Step 4: Perform accessibility and reduced-motion checks**

Use snapshots to verify landmark/headings/buttons/focus names, visible keyboard focus, 48 CSS-pixel touch targets for primary controls, no horizontal document scroll, and usable error/download surfaces. Run a reduced-motion browser session and verify animations are replaced or shortened without hiding state.

- [ ] **Step 5: Record results truthfully**

`device-matrix.md` columns are `Surface`, `Viewport/device`, `Browser`, `Input`, `Path`, `Result`, `Evidence`, and `Evidence type`. Use evidence types `physical`, `emulated`, `automated`, `build-inspected`, or `code-reviewed`.

- [ ] **Step 6: Commit matrix definitions, not runtime screenshots**

```powershell
git add scripts/browser-smoke.config.json scripts/Run-BrowserSmoke.ps1 scripts/interaction-profiles docs/project/quality/device-matrix.md
git commit -m "test: cover cross-device interaction matrix"
```

### Task 3: Add 3D lifecycle and performance regression evidence

**Files:**
- Create: `scripts/Run-3DStress.ps1`
- Create: `scripts/threeLifecycleContract.test.mjs`
- Modify: `docs/project/quality/device-matrix.md`

**Interfaces:**
- Consumes: Polygon Fun and main classroom diagnostics exposed by runtime helpers.
- Produces: repeatable scene-entry/exit stress summaries with frame, memory, listener, and context-loss evidence.

- [ ] **Step 1: Require runtime diagnostics**

Test that 3D runtime helpers expose:

```ts
export interface ThreeRuntimeDiagnostics {
  running: boolean;
  frameCount: number;
  activeListeners: number;
  resources: { geometries: number; textures: number; programs: number };
  contextLost: boolean;
}
```

After `dispose()`, `running` is false, listeners are zero, and owned resource counts return to their pre-scene baseline.

- [ ] **Step 2: Run and fix any diagnostics contract failure**

Run: `node --test scripts/threeLifecycleContract.test.mjs`

Expected: PASS before stress automation proceeds; otherwise fix runtime ownership in the game/classroom workstream.

- [ ] **Step 3: Implement a real-browser stress loop**

`Run-3DStress.ps1` opens a named CLI session, traces, enters/exits Polygon Fun ten times, then the classroom ten times, snapshots after every navigation, and reads public diagnostics with `eval`. Capture console/network after each loop and save the trace under `output/playwright/`.

- [ ] **Step 4: Test context loss and background resume**

Use the runtime's development-only diagnostic control enabled by `?diagnostics=1` to trigger `WEBGL_lose_context`, verify the recoverable surface, restore, background/pause, resume, and confirm only one animation loop runs.

- [ ] **Step 5: Record performance evidence**

Record median readiness time, worst readiness time, frame delta during pause, resource counts before/after ten cycles, context recovery, and fatal logs. Compare to the pre-migration baseline; any material regression requires investigation rather than silently changing the baseline.

- [ ] **Step 6: Commit stress tooling and evidence index**

```powershell
git add scripts/Run-3DStress.ps1 scripts/threeLifecycleContract.test.mjs docs/project/quality/device-matrix.md
git commit -m "test: verify 3d lifecycle stability"
```

### Task 4: Verify backend and native real paths

**Files:**
- Create: `scripts/Run-IntegratedSmoke.ps1`
- Modify: `docs/project/quality/device-matrix.md`
- Modify: `docs/project/quality/qa-release.md`

**Interfaces:**
- Consumes: backend smoke command, Android debug/signed artifacts, available emulator/physical devices.
- Produces: combined authenticated/local mode and native-shell evidence.

`Run-IntegratedSmoke.ps1` starts with:

```powershell
[CmdletBinding()]
param(
    [ValidateSet('Local', 'ConnectedReadOnly', 'ConnectedTest')]
    [string]$Mode = 'Local'
)
$ErrorActionPreference = 'Stop'
```

`Local` runs production web build, Capacitor Android sync, and `:app:assembleDebug` without network mutation. `ConnectedReadOnly` additionally runs the read-only backend smoke. `ConnectedTest` requires the backend plan's allowlist and confirmation variables before the dedicated test-account mutation path.

- [ ] **Step 1: Run backend paths**

Run local migration reset/tests, browser guest mode, connected read-only smoke, and connected test-account mutation only when approved credentials are present. Verify expired session, offline retry, unauthorized manager write, reward duplicate, and classroom revision conflict surfaces.

- [ ] **Step 2: Build exact web and Android artifacts**

Run:

```powershell
npm run build
npx cap sync android
Push-Location android
.\gradlew.bat :app:assembleDebug
Pop-Location
```

When signing prerequisites exist, also run `scripts/Build-AndroidRelease.ps1` and inspect the exact AAB.

- [ ] **Step 3: Exercise Android shell behavior**

On the available emulator or physical device, verify cold start, guest/auth mode, back button, pause/resume, orientation, audio unlock, on-demand media consent/progress/cancel/retry/completion, 2D game, 3D game, classroom, and renderer recovery. Capture logcat fatal/ANR evidence separately from screenshots.

- [ ] **Step 4: Inspect iOS truth**

Confirm Capacitor configuration, generated web assets, no Android plugin boot import, media resolver iOS path, permission descriptions required by declared features, and safe-area behavior in browser emulation. Build/runtime on iPhone/iPad is `not executed` unless a macOS/device runner is actually used.

- [ ] **Step 5: Record exact limitations**

Do not mark the native row passing based only on Gradle/Xcode project inspection. Record unavailable signing, store, emulator, physical device, macOS, credentials, or network access as a named limitation with the smallest unblock action.

- [ ] **Step 6: Commit integrated smoke evidence**

```powershell
git add scripts/Run-IntegratedSmoke.ps1 docs/project/quality/device-matrix.md docs/project/quality/qa-release.md
git commit -m "test: record backend and native integration evidence"
```

### Task 5: Create the complete non-publishing release gate

**Files:**
- Create: `scripts/qaReleaseContract.test.mjs`
- Modify: `package.json`
- Modify: `scripts/platform-readiness.config.json`
- Modify: `docs/project/quality/qa-release.md`

**Interfaces:**
- Consumes: all repository/workstream checks and evidence.
- Produces: `npm run check:qa-release`, which is read-only except local build/test artifacts.

- [ ] **Step 1: Test the release gate contract**

Assert `check:qa-release` includes project docs, game/classroom/backend/asset contracts through the complete Node test set, local database tests, typecheck, lint, content/asset audits, production build, browser smoke, and the local integrated native runner. Assert no command contains `push`, `deploy`, `publish`, `upload --apply`, `db push`, or store rollout.

- [ ] **Step 2: Wire the gate**

Set:

```json
"check:qa-release": "npm run typecheck && npm run lint && npm test && npm run backend:test && npm run audit:content && npm run audit:assets && npm run build && npm run test:e2e && powershell -ExecutionPolicy Bypass -File scripts/Run-IntegratedSmoke.ps1 -Mode Local"
```

Avoid nesting `check:foundations`, `check:games`, and other supersets inside this command because their Node contracts are included by `npm test`; `backend:test` covers pgTAP, and `Run-IntegratedSmoke.ps1 -Mode Local` covers Android debug build/configuration without connected mutations. The readiness config separately asserts each workstream command exists and its evidence is present.

- [ ] **Step 3: Run the full gate from a clean install**

Run:

```powershell
npm ci
npm run check:qa-release
git diff --check
git status --short
```

Expected: all checks pass and only intentional evidence/source changes appear.

- [ ] **Step 4: Review the complete diff and evidence**

Check regressions, authorization, data-loss risk, iframe permissions, accessibility, responsive layout, 3D disposal, asset classification, native configuration, and accidental generated/secret files. Fix every safe in-scope finding and rerun its focused check plus `check:qa-release`.

- [ ] **Step 5: Record the workstream decision**

`qa-release.md` must include exact command results, commit SHA, browser profiles, device matrix totals, backend project/mode, artifact paths/hashes/sizes, emulator/physical coverage, iOS status, residual limitations, rollback SHA, and decision.

Use `No Known In-Scope Risk` only if the required evidence is complete. Otherwise use `Blocked - Not Complete` with the exact blocker.

- [ ] **Step 6: Commit the QA gate**

```powershell
git add scripts/qaReleaseContract.test.mjs package.json scripts/platform-readiness.config.json docs/project/quality/qa-release.md
git commit -m "test: add complete platform release gate"
```
