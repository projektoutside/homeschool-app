# Game SDK, Templates, and Game Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace shell-owned game exceptions with a versioned framework-neutral SDK, generators, and independently owned 2D/3D game packages while preserving every current game route.

**Architecture:** Games run through one protocol whether the transport is iframe `postMessage` or in-process React. Capability policy comes from validated manifests. Compatibility adapters preserve Car King, Word Puzzle, and legacy points behavior until each game natively speaks protocol version 1.

**Tech Stack:** TypeScript 5.9, Node.js 24, React 19, Vite 7, browser `postMessage`, existing Phaser/Three.js/Canvas/DOM runtimes, Node test runner, Playwright.

## Global Constraints

- Foundations catalog parity and the `apps/shell` move must land first.
- Do not force games onto one engine.
- Preserve game IDs, legacy URLs, learning rules, points, saves, audio, speech, fullscreen, orientation, exit behavior, and guest mode.
- Validate origin, source window, protocol version, game ID, message type, payload, and declared capability before host action.
- Production game code and dependencies are pinned and bundled; no new runtime CDN dependency.
- A legacy folder remains until its packaged replacement passes route and interaction parity.
- Every render loop, listener, audio node, and 3D resource has pause/resume/dispose behavior.

## File map

- `packages/game-sdk/src/protocol.ts`: public discriminated message types.
- `packages/game-sdk/src/validation.ts`: runtime message validation.
- `packages/game-sdk/src/client.ts`: game-side request/event client.
- `apps/shell/src/features/games/GameHostBridge.ts`: host transport and capability enforcement.
- `apps/shell/src/features/games/legacyAdapters.ts`: temporary Car King/Word Puzzle mappings.
- `templates/game-*`: executable starter packages.
- `scripts/create-game.mjs`: deterministic generator.
- `games/*`: individually owned games and manifests.

---

### Task 1: Define and validate game protocol version 1

**Files:**
- Create: `packages/game-sdk/package.json`
- Create: `packages/game-sdk/tsconfig.json`
- Create: `packages/game-sdk/src/protocol.ts`
- Create: `packages/game-sdk/src/validation.ts`
- Create: `packages/game-sdk/src/client.ts`
- Create: `packages/game-sdk/src/index.ts`
- Create: `scripts/gameSdk.test.mjs`

**Interfaces:**
- Consumes: host window, game ID, allowed origin, and manifest-declared capabilities.
- Produces: `GameSdkClient`, `parseGameMessage`, `HostToGameMessage`, `GameToHostMessage`, and protocol constant `GAME_PROTOCOL_VERSION = 1`.

- [ ] **Step 1: Write failing static and runtime protocol tests**

Create `scripts/gameSdk.test.mjs` to import the compiled/source module supported by Node 24 and assert:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { GAME_PROTOCOL_VERSION, parseGameMessage } from '../packages/game-sdk/src/index.ts';

test('protocol accepts a valid ready event', () => {
  const message = {
    protocolVersion: 1,
    gameId: 'MathPuzzle',
    type: 'game.ready',
    requestId: 'ready-1',
    payload: { sdkVersion: '1.0.0' },
  };
  assert.equal(GAME_PROTOCOL_VERSION, 1);
  assert.deepEqual(parseGameMessage(message), message);
});

test('protocol rejects malformed identity and unknown messages', () => {
  assert.equal(parseGameMessage({ protocolVersion: 2, gameId: 'x', type: 'game.ready', requestId: '1', payload: {} }), null);
  assert.equal(parseGameMessage({ protocolVersion: 1, gameId: '../x', type: 'game.ready', requestId: '1', payload: {} }), null);
  assert.equal(parseGameMessage({ protocolVersion: 1, gameId: 'x', type: 'admin.write', requestId: '1', payload: {} }), null);
});
```

- [ ] **Step 2: Run and verify module-not-found failure**

Run: `node --test scripts/gameSdk.test.mjs`

Expected: FAIL because `packages/game-sdk/src/index.ts` does not exist.

- [ ] **Step 3: Define exact message types**

In `protocol.ts`, export:

```ts
export const GAME_PROTOCOL_VERSION = 1 as const;

export type GameRequestType =
  | 'game.ready'
  | 'rewards.apply'
  | 'storage.get'
  | 'storage.set'
  | 'storage.remove'
  | 'fullscreen.request'
  | 'orientation.request'
  | 'navigation.exit'
  | 'capability.request'
  | 'diagnostics.error';

export type HostEventType =
  | 'host.init'
  | 'host.response'
  | 'host.preferences'
  | 'host.pause'
  | 'host.resume'
  | 'host.teardown';

export interface ProtocolEnvelope<TType extends string, TPayload> {
  protocolVersion: typeof GAME_PROTOCOL_VERSION;
  gameId: string;
  type: TType;
  requestId: string;
  payload: TPayload;
}

export type GameToHostMessage =
  | ProtocolEnvelope<'game.ready', { sdkVersion: string }>
  | ProtocolEnvelope<'rewards.apply', { sessionId: string; eventId: string; rewardCode: string; metadata?: Record<string, unknown> }>
  | ProtocolEnvelope<'storage.get', { key: string }>
  | ProtocolEnvelope<'storage.set', { key: string; value: unknown }>
  | ProtocolEnvelope<'storage.remove', { key: string }>
  | ProtocolEnvelope<'fullscreen.request', Record<string, never>>
  | ProtocolEnvelope<'orientation.request', { orientation: 'portrait' | 'landscape' | 'any' }>
  | ProtocolEnvelope<'navigation.exit', { destination: 'home' | 'games' }>
  | ProtocolEnvelope<'capability.request', { capability: 'speech' | 'camera' | 'microphone' }>
  | ProtocolEnvelope<'diagnostics.error', { code: string; message: string; fatal: boolean }>;

export type HostToGameMessage =
  | ProtocolEnvelope<'host.init', { userId: string | null; guest: boolean; capabilities: string[]; preferences: Record<string, unknown> }>
  | ProtocolEnvelope<'host.response', { ok: boolean; data?: unknown; error?: { code: string; message: string } }>
  | ProtocolEnvelope<'host.preferences', { soundEnabled: boolean; musicEnabled: boolean; reducedMotion: boolean }>
  | ProtocolEnvelope<'host.pause' | 'host.resume' | 'host.teardown', { reason: string }>;
```

- [ ] **Step 4: Implement defensive runtime parsing**

`parseGameMessage(value: unknown): GameToHostMessage | null` checks a plain record, version `1`, game ID regex `/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/`, request ID length `1..128`, a known type set, and type-specific payload fields. Rewards require a manifest-declared `rewardCode` matching `/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/` and metadata whose serialized form is at most 16 KB; storage keys match `/^[a-zA-Z0-9._-]{1,128}$/`; diagnostics strings are capped at 256/1000 characters.

- [ ] **Step 5: Implement request correlation in `GameSdkClient`**

Expose:

```ts
export interface GameSdkClientOptions {
  gameId: string;
  hostWindow: Window;
  hostOrigin: string;
  timeoutMs?: number;
}

export class GameSdkClient {
  constructor(options: GameSdkClientOptions);
  ready(): Promise<unknown>;
  applyReward(input: { sessionId: string; eventId: string; rewardCode: string; metadata?: Record<string, unknown> }): Promise<unknown>;
  getStorage(key: string): Promise<unknown>;
  setStorage(key: string, value: unknown): Promise<unknown>;
  exit(destination?: 'home' | 'games'): Promise<unknown>;
  dispose(): void;
}
```

Use `crypto.randomUUID()` request IDs, a pending-request map, origin/source checks for responses, a default 5,000 ms timeout, and reject all pending requests on `dispose()`.

- [ ] **Step 6: Run protocol tests and typecheck**

Run:

```powershell
node --test scripts/gameSdk.test.mjs
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit the SDK contract**

```powershell
git add packages/game-sdk scripts/gameSdk.test.mjs package-lock.json
git commit -m "feat: add versioned game SDK protocol"
```

### Task 2: Add a least-privilege host bridge and compatibility adapters

**Files:**
- Create: `apps/shell/src/features/games/GameHostBridge.ts`
- Create: `apps/shell/src/features/games/gameCapabilityPolicy.ts`
- Create: `apps/shell/src/features/games/legacyAdapters.ts`
- Create: `scripts/gameHostBridge.test.mjs`
- Modify: `apps/shell/src/pages/GamePlayer.tsx`
- Modify: `apps/shell/src/pages/Home.tsx`
- Modify: `apps/shell/src/features/speech/speechBridge.ts`

**Interfaces:**
- Consumes: `GameManifest`, `parseGameMessage`, iframe window/origin, points/storage/audio/fullscreen/speech host services.
- Produces: `GameHostBridge.attach()`, `GameHostBridge.sendInit()`, `GameHostBridge.pause()`, `resume()`, `dispose()`, and manifest-derived iframe policy.

- [ ] **Step 1: Write failing policy and source-ownership tests**

Assert:

```js
assert.equal(buildIframeAllow({ permissions: [] }), 'autoplay; fullscreen');
assert.equal(buildIframeAllow({ permissions: ['microphone'] }), 'autoplay; fullscreen; microphone');
assert.equal(isGameMessageSource(event, iframe, origin), true);
assert.equal(isGameMessageSource({ ...event, origin: 'https://evil.example' }, iframe, origin), false);
```

Also read `GamePlayer.tsx` and assert it imports `GameHostBridge` and no longer contains a top-level `message` event switch for standardized SDK messages.

- [ ] **Step 2: Verify tests fail against the current broad iframe policy**

Run: `node --test scripts/gameHostBridge.test.mjs`

Expected: FAIL because the bridge and policy module do not exist.

- [ ] **Step 3: Implement manifest-derived iframe policy**

Export:

```ts
const BASE_ALLOW = ['autoplay', 'fullscreen'] as const;
const PERMISSION_ALLOW = {
  camera: 'camera',
  microphone: 'microphone',
  geolocation: 'geolocation',
  accelerometer: 'accelerometer',
  gyroscope: 'gyroscope',
} as const;

export const buildIframeAllow = (manifest: Pick<GameManifest, 'permissions'>): string =>
  [...BASE_ALLOW, ...manifest.permissions.map((permission) => PERMISSION_ALLOW[permission])].join('; ');

export const GAME_IFRAME_SANDBOX = [
  'allow-same-origin', 'allow-scripts', 'allow-forms', 'allow-popups', 'allow-modals',
].join(' ');
```

Do not include `allow-top-navigation`; exits go through the host protocol.

- [ ] **Step 4: Implement `GameHostBridge` ownership checks**

The constructor receives:

```ts
export interface GameHostServices {
  applyReward(input: { gameId: string; sessionId: string; eventId: string; rewardCode: string; metadata?: Record<string, unknown> }): Promise<unknown>;
  storage: { get(gameId: string, key: string): Promise<unknown>; set(gameId: string, key: string, value: unknown): Promise<void>; remove(gameId: string, key: string): Promise<void> };
  exit(destination: 'home' | 'games'): void;
  requestFullscreen(): Promise<void>;
  requestCapability(capability: 'speech' | 'camera' | 'microphone'): Promise<unknown>;
}
```

`attach()` installs one message listener. It accepts only the iframe's `contentWindow`, exact app origin, matching manifest ID, parsed protocol message, and declared capability. Every request receives `host.response` with the same request ID. `dispose()` removes the listener and sends `host.teardown` once.

- [ ] **Step 5: Preserve Car King and Word Puzzle through adapters**

Move existing legacy constants and message conversion into `legacyAdapters.ts`. Export `adaptLegacyGameMessage({ gameId, data }): GameToHostMessage | null` and `toLegacyHostResponse({ gameId, response }): unknown | null`. Keep payload sanitization from the existing code. The shell bridge calls the adapter only when versioned parsing returns `null` and the manifest declares `runtime: 'legacy-iframe'`.

- [ ] **Step 6: Rewire `GamePlayer` and Home classification**

Replace game-ID branches with the manifest lookup from `GENERATED_EXPERIENCES`. Create one bridge in the iframe load lifecycle and dispose it on URL change/unmount. Replace `SINGLE_PLAYER_GAME_IDS` with the foundation schema's `manifest.classification.includes('single-player')`.

- [ ] **Step 7: Run focused and shell checks**

Run:

```powershell
node --test scripts/gameHostBridge.test.mjs scripts/gameSdk.test.mjs scripts/content-parity.test.mjs
npm run typecheck
npm run build
```

Expected: PASS; existing Car King and Word Puzzle paths still build through adapters.

- [ ] **Step 8: Commit the host bridge**

```powershell
git add apps/shell/src/features/games apps/shell/src/pages/GamePlayer.tsx apps/shell/src/pages/Home.tsx apps/shell/src/features/speech/speechBridge.ts packages/content-schema scripts/gameHostBridge.test.mjs
git commit -m "refactor: route games through capability-aware host bridge"
```

### Task 3: Create tested 2D, 3D, and Canvas/DOM game generators

**Files:**
- Create: `templates/game-2d/`
- Create: `templates/game-3d/`
- Create: `templates/game-canvas/`
- Create: `scripts/create-game.mjs`
- Create: `scripts/createGame.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: CLI flags `--id`, `--title`, `--runtime`, `--orientation`, `--capabilities`, `--permissions`.
- Produces: a complete `games/<id>` package plus a validated manifest; refuses to overwrite existing paths.

- [ ] **Step 1: Write generator tests in a temporary repository**

Tests call:

```js
await createGame({
  repoRoot: tempRoot,
  id: 'fraction-flight',
  title: 'Fraction Flight',
  runtime: 'canvas',
  orientation: 'any',
  capabilities: ['audio', 'rewards', 'storage'],
  permissions: [],
  rewards: [{ code: 'level.complete', points: 10 }],
});
```

Assert files `package.json`, `game.manifest.json`, `src/main.ts`, `src/game.ts`, `src/styles.css`, and `tests/lifecycle.test.mjs` exist; validate the manifest; assert a second call rejects with `Game already exists: fraction-flight`.

- [ ] **Step 2: Verify generator module is absent**

Run: `node --test scripts/createGame.test.mjs`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Build templates with real lifecycle behavior**

Each template exports:

```ts
export interface GameLifecycle {
  start(): void;
  pause(): void;
  resume(): void;
  resize(width: number, height: number, devicePixelRatio: number): void;
  dispose(): void;
}
```

The 2D template owns one `requestAnimationFrame` ID and cancels it on pause/dispose. The 3D template additionally tracks and disposes renderer, geometries, materials, textures, controls, and listeners. The Canvas/DOM template supports pointer and keyboard activation and uses `ResizeObserver`.

- [ ] **Step 4: Implement safe generation**

`createGame` validates input with the manifest validator, resolves the destination, verifies it is below the supplied repository's `games` directory, verifies it does not exist, copies the selected template, replaces tokens `__GAME_ID__` and `__GAME_TITLE__`, writes the manifest atomically through a sibling `.tmp` file, then runs catalog generation in check mode. When `capabilities` includes `rewards`, at least one `{ code, points }` definition is required; without the capability, `rewards` must be empty.

CLI choices are `canvas`, `phaser`, and `three`; map them to templates `game-canvas`, `game-2d`, and `game-3d` respectively.

- [ ] **Step 5: Wire and test all templates**

Add:

```json
"create:game": "node scripts/create-game.mjs",
"test:game-templates": "node --test scripts/createGame.test.mjs"
```

Run:

```powershell
node --test scripts/createGame.test.mjs
npm run sync:content-catalog
npm run typecheck
```

Expected: PASS and no generated sample remains in the real `games/` directory.

- [ ] **Step 6: Commit generators**

```powershell
git add templates scripts/create-game.mjs scripts/createGame.test.mjs package.json package-lock.json
git commit -m "feat: add 2d and 3d game generators"
```

### Task 4: Migrate representative 2D and 3D games

**Files:**
- Create: `games/math-puzzle/`
- Create: `games/polygon-fun/`
- Modify: generated catalog output
- Create: `scripts/pilotGames.test.mjs`
- Preserve: `public/Games/MathPuzzle/`
- Preserve: `public/PolygonAPP/`

**Interfaces:**
- Consumes: Game SDK, templates, compatibility alias mapping.
- Produces: packaged games for IDs `MathPuzzle` and `math-1768955732393-game` with unchanged legacy URLs.

- [ ] **Step 1: Capture pilot behavior contracts**

For Math Puzzle, assert launch, keyboard/pointer answer input, reward request, sound preference update, pause/resume, and exit. For Polygon Fun, assert WebGL scene readiness, resize, fullscreen fallback, pause/resume, and resource disposal. Record current legacy URLs as aliases.

- [ ] **Step 2: Run the pilot tests against package paths**

Run: `node --test scripts/pilotGames.test.mjs`

Expected: FAIL because the two package manifests do not exist.

- [ ] **Step 3: Package Math Puzzle without changing game rules**

Create `games/math-puzzle/game.manifest.json` with ID `MathPuzzle`, runtime `canvas`, capabilities `audio`, `rewards`, `storage`, explicit reward codes matching every current point event, and legacy path `/Games/MathPuzzle/index.html`. Move source through `git mv`, add the SDK client at its host boundary, and configure Vite output to the legacy-compatible generated path.

- [ ] **Step 4: Package Polygon Fun as the 3D pilot**

Create `games/polygon-fun/game.manifest.json` with ID `math-1768955732393-game`, runtime `three`, capabilities `audio`, `storage`, `fullscreen`, and legacy path `/PolygonAPP/index.html`. Bundle the pinned Three.js dependency from the workspace. Add explicit animation-loop cancellation and GPU resource disposal.

- [ ] **Step 5: Build aliases and run interactive smoke tests**

Run:

```powershell
npm run sync:content-catalog
npm run build
node --test scripts/pilotGames.test.mjs scripts/content-parity.test.mjs
npm run test:e2e -- --grep "Math Puzzle|Polygon Fun"
```

Expected: both old URLs and `/play/<id>` launch the package output; no fatal console error; teardown stops CPU/GPU work.

- [ ] **Step 6: Commit pilots while keeping compatibility copies**

```powershell
git add games scripts/pilotGames.test.mjs apps/shell/src/generated/contentCatalog.ts package.json package-lock.json
git add -u public/Games/MathPuzzle public/PolygonAPP
git commit -m "feat: migrate representative 2d and 3d games"
```

Do not delete legacy aliases in this commit.

### Task 5: Package every remaining game and remove runtime CDN code

**Files:**
- Create/modify: `games/*`
- Modify: `scripts/audit-games.mjs`
- Create: `scripts/gamePackages.test.mjs`
- Modify: `package.json`
- Remove only after parity: migrated source under `public/Games/*`

**Interfaces:**
- Consumes: legacy-catalog inventory, generator, SDK, manifest schema, and pilot migration pattern.
- Produces: one owned package per registered game folder and `npm run check:games`.

- [ ] **Step 1: Make package coverage executable**

Test that each registered legacy game path has exactly one validated game manifest whose `compatibility.legacyPaths` contains that path. Test that no production HTML contains script sources matching `https://cdn`, `unpkg.com`, `jsdelivr.net`, or `cdnjs.cloudflare.com`.

- [ ] **Step 2: Run coverage and record the exact failing inventory**

Run: `node --test scripts/gamePackages.test.mjs`

Expected: FAIL listing each unowned registered path and CDN source. Save that output to `docs/project/inventory/game-migration-baseline.md`.

- [ ] **Step 3: Migrate games in bounded ownership batches**

Use these fixed batches, running `check:games` after each:

1. `PreschoolFun`, `Many Birds One Stone`, `Word Puzzle`, `analogclockgame`.
2. `2PlayersMathWrite`, `cagepetrescue`, `Farmersmarket`, `States Champion`.
3. `CarKingFinal`, `SpyAcademy`, `IntroToPolygon`, `Quiz it Polygon!`.
4. Registered tool-like game directories and any catalog-owned game path reported by the coverage test.

For every package, preserve the catalog ID and legacy path, move source with history, add only the capabilities it uses, bundle pinned dependencies, implement lifecycle adaptation, and keep a generated legacy URL alias.

- [ ] **Step 4: Quarantine unregistered directories by evidence**

`Animal Champion` and any other folder without a registered ID must be classified as `register`, `archive`, or `delete-candidate` in `docs/project/inventory/unregistered-games.md`. No deletion occurs in this task. A `register` decision requires a manifest and launch probe; an archive remains outside production build inputs.

- [ ] **Step 5: Remove legacy source only after zero-difference checks**

For a game, require package build success, legacy URL alias success, SDK readiness, interaction smoke, asset-reference audit, and no source reference outside its package. Then remove the duplicate legacy source while retaining the alias output generated at build time.

- [ ] **Step 6: Run complete game checks**

Define:

```json
"check:games": "node --test scripts/gameSdk.test.mjs scripts/gameHostBridge.test.mjs scripts/createGame.test.mjs scripts/pilotGames.test.mjs scripts/gamePackages.test.mjs && npm run audit:content && npm run build"
```

Run:

```powershell
npm run check:games
rg -n "https://(?:cdn|unpkg|jsdelivr|cdnjs)" games -g "*.html" -g "*.js" -g "*.ts"
git diff --check
```

Expected: all registered games have one package, no production CDN runtime imports, and all legacy aliases resolve.

- [ ] **Step 7: Record evidence and commit**

Write `docs/project/quality/games.md` with package count, game IDs, launch-probe results, representative interaction results, and remaining physical-device coverage.

```powershell
git add games public/Games scripts package.json package-lock.json docs/project/inventory docs/project/quality/games.md apps/shell/src/generated/contentCatalog.ts
git commit -m "refactor: package complete mini-game library"
```
