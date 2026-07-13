# On-Demand Game Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Google Play base installation near 12 MB, launch it immediately, and download the complete learning library only after warm in-app consent while giving users accessible coins to tap during progress.

**Architecture:** Convert `game_assets` from `fast-follow` to `on-demand`. A focused Capacitor Android plugin owns Play Asset Delivery state, size lookup, consent-triggered fetching, confirmation, and progress events; a web gate blocks React mounting until the pack is available and renders the welcome, download, recovery, and lightweight coin interactions.

**Tech Stack:** Capacitor 8.2, Java, Google Play Asset Delivery 2.3.0, TypeScript 5.9, React 19, Vite 7, Node test runner, Gradle Android App Bundle, bundletool, Google Play Internal testing.

## Global Constraints

- Android package ID remains `com.lashomeschool.hub`.
- The `game_assets` pack must use `deliveryType = "on-demand"`.
- The app must not call Play Asset Delivery `fetch()` until the user selects **Download Full Library**.
- The pack size shown to the user must come from `AssetPackManager.getPackStates()` rather than a hard-coded 600 MB value.
- Browser and GitHub Pages behavior must remain unchanged.
- Coin interactions are session-only decoration and must not change points, rewards, Supabase data, or game currency.
- The Android-only gate must block incomplete game, classroom, worksheet, and homepage routes until the pack is ready.
- Respect Android safe areas, 48 dp targets, keyboard activation, readable contrast, and reduced motion.
- Preserve the existing trusted-local-origin checks and renderer recovery in `GameAssetWebViewClient`.
- Keep signing secrets outside Git and publish only to Google Play Internal testing.

## File Map

- Create `android/app/src/main/java/com/lashomeschool/hub/GameAssetDeliveryPlugin.java`: sole native owner of pack state, size lookup, fetch, retry, confirmation, and progress events.
- Modify `android/app/src/main/java/com/lashomeschool/hub/MainActivity.java`: register the plugin before Capacitor creates the bridge and retain only the asset-aware WebView client wiring.
- Modify `android/game_assets/build.gradle`: switch delivery from `fast-follow` to `on-demand`.
- Create `src/features/gameAssets/gameAssetDelivery.ts`: typed Capacitor bridge plus the boot gate state machine and DOM bindings.
- Create `src/features/gameAssets/gameAssetDelivery.css`: responsive welcome/download screen and coin interactions.
- Modify `src/main.tsx`: wait for the gate before mounting the React app.
- Modify `index.html`: accessible static gate markup available before React mounts.
- Modify `scripts/androidAssetPack.test.mjs`: enforce on-demand configuration, prohibit automatic fetch, and verify native/web contracts.
- Modify `android/app/build.gradle`: increment to version code 5 and version name 1.0.4.
- Modify `scripts/Inspect-AndroidBundle.ps1`: verify the asset-pack manifest declares on-demand delivery in the final bundle.

## Docs Consulted

- Android Play Asset Delivery overview and delivery modes: `https://developer.android.com/guide/playcore/asset-delivery`
- Java integration and size disclosure: `https://developer.android.com/guide/playcore/asset-delivery/integrate-java`
- Play Asset Delivery 2.3.0 API signatures verified from the installed `asset-delivery-2.3.0.aar` with `javap`.
- Capacitor 8 plugin lifecycle and registration verified from installed `@capacitor/android` source.

---

### Task 1: Lock the On-Demand Contract With Failing Tests

**Files:**
- Modify: `scripts/androidAssetPack.test.mjs`
- Test: `scripts/androidAssetPack.test.mjs`

**Interfaces:**
- Consumes: current Android Gradle, Java activity, web shell, and bundle inspection sources.
- Produces: static release contracts that fail if the pack becomes automatic, the gate is bypassed, or the release version is stale.

- [ ] **Step 1: Replace the fast-follow assertions and add the native consent contract**

Use these assertions in `scripts/androidAssetPack.test.mjs`:

```js
test('Android registers an on-demand game_assets pack', async () => {
  const settings = await readSource('android/settings.gradle');
  const appBuild = await readSource('android/app/build.gradle');
  const packBuild = await readSource('android/game_assets/build.gradle');

  assert.match(settings, /include ':game_assets'/);
  assert.match(appBuild, /assetPacks\s*=\s*\[":game_assets"\]/);
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
  assert.match(plugin, /assetPackManager\.getPackStates/);
  assert.match(plugin, /assetPackManager\.fetch/);
  assert.match(plugin, /notifyListeners\("downloadStateChanged"/);
  assert.match(plugin, /showConfirmationDialog/);
});
```

- [ ] **Step 2: Add the web gate and release assertions**

```js
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
});

test('Android release advances to the on-demand delivery version', async () => {
  const appBuild = await readSource('android/app/build.gradle');
  assert.match(appBuild, /versionCode\s+5/);
  assert.match(appBuild, /versionName\s+"1\.0\.4"/);
});
```

- [ ] **Step 3: Run the contract test and confirm it fails for the intended reasons**

Run:

```powershell
node --test scripts/androidAssetPack.test.mjs
```

Expected: failures for `on-demand`, the missing `GameAssetDeliveryPlugin.java`, the missing typed gate files, and version 1.0.4. Existing WebView security and staging tests must remain passing.

- [ ] **Step 4: Commit the red tests**

```powershell
git add scripts/androidAssetPack.test.mjs
git commit -m "test: define on-demand game library contract"
```

---

### Task 2: Implement Native On-Demand Asset Delivery

**Files:**
- Create: `android/app/src/main/java/com/lashomeschool/hub/GameAssetDeliveryPlugin.java`
- Modify: `android/app/src/main/java/com/lashomeschool/hub/MainActivity.java`
- Modify: `android/game_assets/build.gradle`
- Modify: `android/app/build.gradle`
- Test: `scripts/androidAssetPack.test.mjs`

**Interfaces:**
- Consumes: Google Play `AssetPackManager.getPackStates(List)`, `fetch(List)`, `showConfirmationDialog(Activity)`, and update listener APIs.
- Produces: Capacitor plugin methods `getStatus(): Promise<GameAssetState>`, `startDownload(): Promise<GameAssetState>`, `confirmDownload(): Promise<{accepted:boolean}>`, plus `downloadStateChanged` events.

- [ ] **Step 1: Change the pack to on-demand and bump the Android version**

Set `android/game_assets/build.gradle` to:

```groovy
plugins {
    id 'com.android.asset-pack'
}

assetPack {
    packName = "game_assets"
    dynamicDelivery {
        deliveryType = "on-demand"
    }
}
```

Set these values in `android/app/build.gradle`:

```groovy
versionCode 5
versionName "1.0.4"
```

- [ ] **Step 2: Add the focused Capacitor plugin**

Create `GameAssetDeliveryPlugin.java` with the following public contract and lifecycle. Keep serialization in one method so method responses and events cannot drift:

```java
@CapacitorPlugin(name = "GameAssetDelivery")
public class GameAssetDeliveryPlugin extends Plugin {
    private static final String PACK_NAME = "game_assets";
    private AssetPackManager assetPackManager;
    private AssetPackStateUpdateListener listener;

    @Override
    public void load() {
        assetPackManager = AssetPackManagerFactory.getInstance(getContext());
        listener = state -> {
            if (PACK_NAME.equals(state.name())) {
                notifyListeners("downloadStateChanged", serializeState(state), true);
            }
        };
        assetPackManager.registerListener(listener);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        if (assetPackManager.getPackLocation(PACK_NAME) != null) {
            call.resolve(completedState());
            return;
        }
        assetPackManager.getPackStates(Collections.singletonList(PACK_NAME))
            .addOnSuccessListener(states -> {
                AssetPackState state = states.packStates().get(PACK_NAME);
                call.resolve(state == null ? unavailableState() : serializeState(state));
            })
            .addOnFailureListener(error -> call.reject(friendlyError(error)));
    }

    @PluginMethod
    public void startDownload(PluginCall call) {
        assetPackManager.fetch(Collections.singletonList(PACK_NAME))
            .addOnSuccessListener(states -> {
                AssetPackState state = states.packStates().get(PACK_NAME);
                call.resolve(state == null ? unavailableState() : serializeState(state));
            })
            .addOnFailureListener(error -> call.reject(friendlyError(error)));
    }

    @PluginMethod
    public void confirmDownload(PluginCall call) {
        assetPackManager.showConfirmationDialog(getActivity())
            .addOnSuccessListener(result -> {
                JSObject response = new JSObject();
                response.put("accepted", result == Activity.RESULT_OK);
                call.resolve(response);
            })
            .addOnFailureListener(error -> call.reject(friendlyError(error)));
    }

    @Override
    protected void handleOnDestroy() {
        if (assetPackManager != null && listener != null) {
            assetPackManager.unregisterListener(listener);
        }
    }
}
```

`serializeState(AssetPackState)` must return these exact fields:

```java
new JSObject()
    .put("status", statusName(state.status()))
    .put("installed", state.status() == AssetPackStatus.COMPLETED || assetPackManager.getPackLocation(PACK_NAME) != null)
    .put("bytesDownloaded", state.bytesDownloaded())
    .put("totalBytes", state.totalBytesToDownload())
    .put("percent", state.transferProgressPercentage())
    .put("errorCode", state.errorCode());
```

`statusName(int)` must map `PENDING`, `DOWNLOADING`, `TRANSFERRING`, `COMPLETED`, `FAILED`, `CANCELED`, `WAITING_FOR_WIFI`, `NOT_INSTALLED`, and `REQUIRES_USER_CONFIRMATION`; unknown values map to `"unknown"`. `friendlyError(Throwable)` must return a learner-safe message and log the throwable without leaking filesystem or signing data into the web UI.

- [ ] **Step 3: Register the plugin before Capacitor creates the bridge and remove automatic fetching**

Refactor `MainActivity.onCreate` to:

```java
@Override
protected void onCreate(Bundle savedInstanceState) {
    registerPlugin(GameAssetDeliveryPlugin.class);
    super.onCreate(savedInstanceState);
    AssetPackManager assetPackManager = AssetPackManagerFactory.getInstance(this);
    getBridge().setWebViewClient(new GameAssetWebViewClient(getBridge(), assetPackManager));
}
```

Remove the activity listener, every launch-time `fetch()` call, and the `evaluateJavascript()` overlay methods. Keep no pack-download ownership in the activity.

- [ ] **Step 4: Run the native contract tests and compile Java**

Run:

```powershell
node --test scripts/androidAssetPack.test.mjs
Push-Location android
.\gradlew.bat :app:compileDebugJavaWithJavac
Pop-Location
```

Expected: the configuration/native assertions pass; the web-gate assertion remains failing until Task 3; Java compilation succeeds without deprecation or lifecycle errors that affect correctness.

- [ ] **Step 5: Commit the native delivery layer**

```powershell
git add android/app/build.gradle android/game_assets/build.gradle android/app/src/main/java/com/lashomeschool/hub/MainActivity.java android/app/src/main/java/com/lashomeschool/hub/GameAssetDeliveryPlugin.java
git commit -m "feat: add consent-based Android asset delivery"
```

---

### Task 3: Build the Warm Download Gate and Interactive Coins

**Files:**
- Create: `src/features/gameAssets/gameAssetDelivery.ts`
- Create: `src/features/gameAssets/gameAssetDelivery.css`
- Modify: `src/main.tsx`
- Modify: `index.html`
- Test: `scripts/androidAssetPack.test.mjs`

**Interfaces:**
- Consumes: native `GameAssetDelivery` plugin methods and `downloadStateChanged` events from Task 2.
- Produces: `initializeGameAssetGate(): Promise<void>`, which resolves immediately on web/non-Android and only when the Android pack is installed.

- [ ] **Step 1: Add accessible static markup to `index.html`**

Replace the old progress-only overlay with this structure:

```html
<section id="game-asset-gate" hidden aria-labelledby="game-asset-gate-title">
  <div class="game-asset-gate__coins" aria-label="Tap coins while the learning library downloads">
    <button class="game-asset-gate__coin" type="button" aria-label="Collect waiting coin">🪙</button>
    <button class="game-asset-gate__coin" type="button" aria-label="Collect waiting coin">🪙</button>
    <button class="game-asset-gate__coin" type="button" aria-label="Collect waiting coin">🪙</button>
  </div>
  <div class="game-asset-gate__card">
    <p class="game-asset-gate__eyebrow">Your learning adventure is ready to grow</p>
    <h1 id="game-asset-gate-title">Welcome to La's Homeschool Hub!</h1>
    <p id="game-asset-gate-message">To unlock every lesson, activity, and game, download the complete learning library. You can start exploring as soon as it is ready.</p>
    <p id="game-asset-gate-size" class="game-asset-gate__size"></p>
    <div id="game-asset-gate-progress" hidden>
      <progress id="game-asset-gate-progress-bar" max="100" value="0"></progress>
      <p><strong id="game-asset-gate-percent">0%</strong> <span id="game-asset-gate-bytes"></span></p>
    </div>
    <div class="game-asset-gate__actions">
      <button id="game-asset-download" type="button">Download Full Library</button>
      <button id="game-asset-later" type="button">Not Now</button>
      <button id="game-asset-retry" type="button" hidden>Try Again</button>
    </div>
    <p class="game-asset-gate__hint">Wi-Fi recommended. Your library stays ready for future learning.</p>
    <p class="game-asset-gate__counter" aria-live="polite">Coins collected while waiting: <strong id="game-asset-coin-count">0</strong></p>
  </div>
</section>
```

Keep the small inline body background to prevent a blue/black flash, but move all gate presentation to the dedicated CSS file.

- [ ] **Step 2: Implement the typed bridge and gate state machine**

Create `gameAssetDelivery.ts` with these exact types and plugin registration:

```ts
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import './gameAssetDelivery.css';

export type GameAssetStatus = 'unknown' | 'pending' | 'downloading' | 'transferring' | 'completed' | 'failed' | 'canceled' | 'waiting_for_wifi' | 'not_installed' | 'requires_user_confirmation';

export interface GameAssetState {
  status: GameAssetStatus;
  installed: boolean;
  bytesDownloaded: number;
  totalBytes: number;
  percent: number;
  errorCode: number;
}

interface GameAssetDeliveryPlugin {
  getStatus(): Promise<GameAssetState>;
  startDownload(): Promise<GameAssetState>;
  confirmDownload(): Promise<{ accepted: boolean }>;
  addListener(eventName: 'downloadStateChanged', listener: (state: GameAssetState) => void): Promise<PluginListenerHandle>;
}

const GameAssetDelivery = registerPlugin<GameAssetDeliveryPlugin>('GameAssetDelivery');
```

`initializeGameAssetGate()` must follow this control flow:

```ts
export async function initializeGameAssetGate(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;

  const elements = getGateElements();
  elements.gate.hidden = false;
  bindCoinButtons(elements);

  let resolveReady!: () => void;
  const ready = new Promise<void>((resolve) => { resolveReady = resolve; });
  let listener: PluginListenerHandle | undefined;
  listener = await GameAssetDelivery.addListener('downloadStateChanged', (state) => {
    renderState(elements, state);
    if (state.installed || state.status === 'completed') {
      elements.gate.hidden = true;
      void listener?.remove();
      resolveReady();
    }
  });

  elements.download.addEventListener('click', () => void startDownload(elements));
  elements.retry.addEventListener('click', () => void startDownload(elements));
  elements.later.addEventListener('click', () => renderDeferredState(elements));

  try {
    const initial = await GameAssetDelivery.getStatus();
    renderState(elements, initial);
    if (initial.installed || initial.status === 'completed') {
      elements.gate.hidden = true;
      await listener.remove();
      return;
    }
  } catch {
    renderUnavailableState(elements);
  }

  return ready;
}
```

`startDownload()` must disable duplicate actions, call `GameAssetDelivery.startDownload()`, and render errors without retry loops. When status is `requires_user_confirmation`, call `confirmDownload()` only after the user presses the visible continue/retry action. `renderState()` must use `Intl.NumberFormat` to show downloaded and total MB/GB and must never hard-code 600 MB.

`bindCoinButtons()` must increment only the DOM counter, toggle a short `is-collected` class, and handle native button click events. No context providers, storage, network, or reward APIs may be imported.

- [ ] **Step 3: Gate React mounting in `src/main.tsx`**

Refactor the entry point without changing provider order:

```tsx
import { initializeGameAssetGate } from './features/gameAssets/gameAssetDelivery';

const renderApp = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <PointsProvider>
            <StaminaProvider>
              <SoundSettingsProvider>
                <App />
              </SoundSettingsProvider>
            </StaminaProvider>
          </PointsProvider>
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>,
  );
};

const bootstrapApp = async () => {
  await initializeGameAssetGate();
  renderApp();
};

void bootstrapApp();
```

- [ ] **Step 4: Add responsive, safe-area, and reduced-motion styles**

The new CSS must include:

```css
#game-asset-gate {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: grid;
  place-items: center;
  min-block-size: 100dvh;
  padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
  overflow: auto;
  background: linear-gradient(180deg, #236fce 0%, #77c7ff 56%, #8dd45c 100%);
}

#game-asset-gate[hidden] { display: none; }

.game-asset-gate__card {
  inline-size: min(34rem, 100%);
  padding: clamp(1.25rem, 4vw, 2.25rem);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 1.5rem;
  background: rgba(9, 36, 84, 0.92);
  box-shadow: 0 1.5rem 4rem rgba(5, 24, 58, 0.35);
  color: #fff;
  text-align: center;
}

.game-asset-gate__coin,
.game-asset-gate__actions button {
  min-inline-size: 3rem;
  min-block-size: 3rem;
  touch-action: manipulation;
}

.game-asset-gate__coin.is-collected { animation: coin-pop 360ms ease-out; }

@media (prefers-reduced-motion: reduce) {
  .game-asset-gate__coin,
  .game-asset-gate__coin.is-collected { animation: none; transition: none; }
}
```

Add phone-landscape and tablet rules that keep the primary action, progress, and copy visible without horizontal scrolling.

- [ ] **Step 5: Run focused and production checks**

Run:

```powershell
node --test scripts/androidAssetPack.test.mjs
npm run lint
npm run build
```

Expected: all Android asset-pack tests pass, ESLint exits 0, and Vite builds the base shell without importing staged game directories.

- [ ] **Step 6: Commit the download experience**

```powershell
git add index.html src/main.tsx src/features/gameAssets/gameAssetDelivery.ts src/features/gameAssets/gameAssetDelivery.css scripts/androidAssetPack.test.mjs
git commit -m "feat: add welcoming game library download gate"
```

---

### Task 4: Enforce Bundle Delivery Metadata and Run Tier 3 Verification

**Files:**
- Modify: `scripts/Inspect-AndroidBundle.ps1`
- Modify: `scripts/androidAssetPack.test.mjs`
- Verify: `android/app/build/outputs/bundle/release/app-release.aab`

**Interfaces:**
- Consumes: the signed AAB produced by `scripts/Build-AndroidRelease.ps1`.
- Produces: bundle evidence containing separate `base` and `game_assets` modules, base compressed bytes, pack compressed bytes, and on-demand delivery metadata.

- [ ] **Step 1: Add a failing bundle-inspection contract**

Add to the existing inspector test:

```js
assert.match(inspector, /bundletool-all-\*\.jar/);
assert.match(inspector, /dist:on-demand/);
assert.match(inspector, /game_assets/);
```

Run `node --test scripts/androidAssetPack.test.mjs` and expect the new inspector assertions to fail.

- [ ] **Step 2: Extend final-bundle inspection**

Resolve the already-downloaded bundletool from `BUNDLETOOL_JAR` or the user's temporary tool cache, dump the final manifest for the asset-pack module, and reject any result that does not declare on-demand delivery:

```powershell
$bundletoolPath = $env:BUNDLETOOL_JAR
if (-not $bundletoolPath) {
    $bundletoolPath = Get-ChildItem -Path $env:TEMP -Recurse -Filter 'bundletool-all-*.jar' -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $bundletoolPath -or -not (Test-Path -LiteralPath $bundletoolPath)) {
    throw 'Bundletool is required to verify Play Asset Delivery metadata.'
}

$javaPath = 'C:\Program Files\Android\Android Studio\jbr\bin\java.exe'
$manifestDump = & $javaPath -jar $bundletoolPath dump manifest --bundle=$resolvedBundlePath --module=game_assets
if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect game_assets delivery metadata.' }
if ($manifestDump -notmatch '<dist:on-demand') {
    throw 'game_assets is not configured for on-demand delivery in the final bundle.'
}
```

Include `deliveryType = 'on-demand'` in the JSON result. Resolve the existing local bundletool path through the same helper used by Android release tooling; do not download or install a machine-wide dependency.

- [ ] **Step 3: Run the complete repository validation gate**

Run:

```powershell
node --test scripts/androidAssetPack.test.mjs scripts/authBoot.test.mjs scripts/carKingAndroidStability.test.mjs scripts/gameRuntimeIsolation.test.mjs scripts/guestPlay.test.mjs scripts/pwaLiveUpdate.test.mjs
npm run lint
npm run build
npm run audit:games
npm run audit:assets
npm run audit:car-king-assets
git diff --check
```

Expected: all tests and audits pass, 81 catalog entries remain registered, and no staged large asset directory remains duplicated in the base build.

- [ ] **Step 4: Build and inspect the signed release**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\Build-AndroidRelease.ps1
```

Expected: signed `android/app/build/outputs/bundle/release/app-release.aab`, base module near the previous 12.9 MB result, separate `game_assets` module, and inspector output `deliveryType: on-demand`.

- [ ] **Step 5: Exercise the exact bundle on Android**

Use bundletool local testing against the available Pixel 8/API 36 emulator. Decrypt the existing Windows-user-protected upload credential only into a short-lived password file and remove it in `finally`:

```powershell
$bundletool = 'C:\Users\Xator\AppData\Local\Temp\codex-bundletool-1.18.3\bundletool-all-1.18.3.jar'
$java = 'C:\Program Files\Android\Android Studio\jbr\bin\java.exe'
$credential = Join-Path $env:USERPROFILE '.android\las-homeschool-upload-key-password.xml'
$keystore = Join-Path $env:USERPROFILE '.android\las-homeschool-upload-key.jks'
$passwordFile = Join-Path $env:TEMP 'lah-bundletool-password.txt'
$securePassword = Import-Clixml -LiteralPath $credential
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    Set-Content -LiteralPath $passwordFile -Value $plainPassword -NoNewline
    & $java -jar $bundletool build-apks `
        --bundle=android/app/build/outputs/bundle/release/app-release.aab `
        --output=.codex-runtime/on-demand-local.apks `
        --local-testing `
        --ks=$keystore `
        --ks-key-alias=las-homeschool-upload `
        "--ks-pass=file:$passwordFile" `
        "--key-pass=file:$passwordFile" `
        --overwrite
    if ($LASTEXITCODE -ne 0) { throw 'bundletool build-apks failed.' }
    & $java -jar $bundletool install-apks --apks=.codex-runtime/on-demand-local.apks
    if ($LASTEXITCODE -ne 0) { throw 'bundletool install-apks failed.' }
}
finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    Remove-Item -LiteralPath $passwordFile -Force -ErrorAction SilentlyContinue
}
```

Verify with visible emulator and logcat evidence:

- Base app opens without an automatic asset-pack request.
- Welcome copy and reported download size are visible.
- **Not Now** keeps incomplete features blocked.
- **Download Full Library** starts the request exactly once.
- Progress survives activity background/foreground and orientation changes.
- Coin buttons respond to touch and keyboard-equivalent accessibility actions without changing learner points.
- Completion automatically reveals guest login/home.
- Homepage, catalog, Car King, Classroom, and Math Puzzle open without blank screens or fatal logs.
- Phone portrait/landscape and tablet portrait/landscape remain usable.
- Record that iPhone/iPad and desktop are code-reviewed for isolation only because Play Asset Delivery is Android-specific.

- [ ] **Step 6: Commit the release enforcement**

```powershell
git add scripts/Inspect-AndroidBundle.ps1 scripts/androidAssetPack.test.mjs
git commit -m "build: enforce on-demand game asset delivery"
```

---

### Task 5: Review, Push Main, and Publish Google Play Internal Testing

**Files:**
- Review: all files changed since commit `2461bb0`
- Publish: `android/app/build/outputs/bundle/release/app-release.aab`

**Interfaces:**
- Consumes: fully verified commit series and signed version code 5 bundle.
- Produces: GitHub `main` at the verified commit and Google Play Internal testing release 1.0.4.

- [ ] **Step 1: Review the final diff and preserve unrelated work**

Run:

```powershell
git status --short
git diff 2461bb0..HEAD --stat
git diff 2461bb0..HEAD
git diff --check
```

Confirm the pre-existing generated changes in `android/app/capacitor.build.gradle` and `android/capacitor.settings.gradle` remain unstaged unless the release build proves they are required source changes.

- [ ] **Step 2: Push the verified implementation to GitHub main**

```powershell
git push origin HEAD:main
git ls-remote origin refs/heads/main
```

Expected: remote `main` SHA equals local `git rev-parse HEAD`.

- [ ] **Step 3: Upload version 1.0.4 to Internal testing**

Use the existing Google Play Console app and internal track. Upload the exact signed AAB and use:

```text
Release name: 1.0.4 On-Demand Learning Library
Release notes: Keeps the initial app install lightweight, adds a welcoming optional learning-library download, shows clear progress, and improves Android game-loading reliability.
```

Resolve every blocking Play validation issue before rollout. Do not publish to production.

- [ ] **Step 4: Verify tester availability and hand off exact evidence**

Confirm Play Console reports version code 5 as available to internal testers and return:

- GitHub commit URL.
- Internal tester opt-in URL `https://play.google.com/apps/internaltest/4701666820361591533`.
- Play release status and publish time.
- Play-reported initial install size and asset delivery behavior.
- Exact physical, emulated, browser, and code-reviewed device coverage.
- Any remaining non-blocking risks, including Play propagation time.
