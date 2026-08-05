# Classroom SDK and Expandable Experiences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing 3D classroom into an extensible classroom platform where new rooms, lessons, portals, NPCs, and 2D/3D stations can be added without editing private shell code.

**Architecture:** Extract the existing iframe sync behavior into a versioned classroom SDK and host bridge, describe the current classroom with a manifest, then move its source into an owned workspace package. Stations launch catalog IDs or bounded station modules through declared capabilities.

**Tech Stack:** TypeScript 5.9, React 19, Three.js-compatible browser scenes, Vite 7, browser `postMessage`, Supabase Realtime through the backend-client boundary, Node test runner, Playwright.

## Global Constraints

- Foundations must land before classroom catalog integration; backend-client wiring waits for the backend workstream.
- Preserve `/classroom`, the door intro, manager mode, worksheet navigation, global classroom state, realtime updates, and current 3D behavior.
- Only manager-authorized paths may save global classroom state.
- Navigation targets are catalog IDs or explicit allowed internal routes.
- Every scene/station owns pause, resume, resize, and dispose behavior.
- Reduced-motion and non-WebGL recovery paths are required.
- Keep the legacy iframe adapter until the packaged classroom passes parity.

## File map

- `packages/classroom-sdk/src/protocol.ts`: versioned room/station/host messages.
- `packages/classroom-sdk/src/manifest.ts`: classroom/room/station types.
- `apps/shell/src/features/classroom/ClassroomHostBridge.ts`: shell-side policy and backend mediation.
- `classrooms/main/classroom.manifest.json`: current classroom description.
- `classrooms/main/src/`: owned current classroom runtime.
- `templates/classroom/` and `templates/classroom-station/`: generators.

---

### Task 1: Define classroom manifest and protocol version 1

**Files:**
- Create: `packages/classroom-sdk/package.json`
- Create: `packages/classroom-sdk/tsconfig.json`
- Create: `packages/classroom-sdk/src/manifest.ts`
- Create: `packages/classroom-sdk/src/protocol.ts`
- Create: `packages/classroom-sdk/src/validation.ts`
- Create: `packages/classroom-sdk/src/index.ts`
- Create: `scripts/classroomSdk.test.mjs`

**Interfaces:**
- Consumes: unknown manifest/message input.
- Produces: `ClassroomManifest`, `RoomDefinition`, `StationDefinition`, `parseClassroomMessage`, and `CLASSROOM_PROTOCOL_VERSION = 1`.

- [ ] **Step 1: Write failing manifest and message tests**

Create tests for this valid minimum:

```js
const manifest = {
  schemaVersion: 1,
  kind: 'classroom',
  id: 'main-classroom',
  title: 'Main Classroom',
  version: '1.0.0',
  orientation: 'any',
  responsive: true,
  classification: ['classroom', '3d'],
  mediaBundles: [],
  entryRoomId: 'main-room',
  rooms: [{ id: 'main-room', entry: './scenes/main.ts', runtime: 'three', stations: ['laptop'], portals: [] }],
  stations: [{ id: 'laptop', kind: 'catalog', targetId: 'html-viewer', capabilities: [] }],
  permissions: [],
  compatibility: { legacyPaths: ['/3dClass/index.html'], protocolVersion: 1 },
};

assert.deepEqual(validateClassroomManifest(manifest, 'test'), manifest);
assert.equal(parseClassroomMessage({
  protocolVersion: 1,
  classroomId: 'main-classroom',
  type: 'classroom.ready',
  requestId: 'ready-1',
  payload: { roomId: 'main-room' },
})?.type, 'classroom.ready');
```

Also reject duplicate room/station IDs, an entry room that does not exist, an unknown station reference, traversal in scene entries, and unsupported protocol versions.

- [ ] **Step 2: Verify the SDK is absent**

Run: `node --test scripts/classroomSdk.test.mjs`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Define exact classroom types**

`manifest.ts` re-exports the canonical types instead of defining a second shape:

```ts
export type {
  ClassroomManifest,
  RoomDefinition,
  StationDefinition,
} from '@homeschool/content-schema';
export { validateClassroomManifest } from './validation';
```

`validateClassroomManifest(value, source)` calls the shared `validateManifest`, rejects a non-classroom result, then returns it as `ClassroomManifest`. This keeps the catalog, generator, SDK, and host on one schema.

- [ ] **Step 4: Define protocol messages**

Game-style envelopes use `classroomId`, request ID, and version 1. Accepted classroom-to-host types are:

```ts
export type ClassroomRequestType =
  | 'classroom.ready'
  | 'classroom.state.get'
  | 'classroom.state.save'
  | 'classroom.navigate'
  | 'classroom.station.launch'
  | 'classroom.diagnostics.error';
```

Host types are `host.init`, `host.state`, `host.response`, `host.pause`, `host.resume`, and `host.teardown`. State-save payload contains `{ scope: 'learner' | 'global'; state: unknown; revision: string | null }`.

- [ ] **Step 5: Implement validation and run checks**

Use the same ID/path limits as the game SDK. Limit a serialized state request to 256 KB before accepting it. Navigation accepts `{ kind: 'room' | 'catalog'; targetId: string }`, not arbitrary URLs.

Run:

```powershell
node --test scripts/classroomSdk.test.mjs
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit the classroom contract**

```powershell
git add packages/classroom-sdk scripts/classroomSdk.test.mjs package-lock.json
git commit -m "feat: add classroom extension SDK"
```

### Task 2: Extract the shell classroom host bridge

**Files:**
- Create: `apps/shell/src/features/classroom/ClassroomHostBridge.ts`
- Create: `apps/shell/src/features/classroom/classroomState.ts`
- Create: `apps/shell/src/features/classroom/legacyClassroomAdapter.ts`
- Create: `scripts/classroomHost.test.mjs`
- Modify: `apps/shell/src/pages/ClassroomPage.tsx`

**Interfaces:**
- Consumes: iframe, manifest, authenticated user context, manager flag, state service, catalog navigator.
- Produces: one `ClassroomHostBridge` owning messages, auth sync, state load/save, station launch, navigation, lifecycle, and teardown.

- [ ] **Step 1: Write failing source/origin/state tests**

Test that a same-origin message from the attached frame is accepted; wrong origin/source is rejected; learner global saves return `forbidden`; manager global saves call `stateService.saveGlobal`; arbitrary `/html-viewer?...` strings are rejected in the new protocol; catalog ID navigation is accepted.

- [ ] **Step 2: Verify tests fail before extraction**

Run: `node --test scripts/classroomHost.test.mjs`

Expected: FAIL because the bridge does not exist.

- [ ] **Step 3: Extract state sanitization**

Move current `ClassroomPersistedState`, `ClassroomLayoutEntry`, and `sanitizeClassroomState` behavior into `classroomState.ts`. Export:

```ts
export interface ClassroomStateService {
  loadLearner(classroomId: string): Promise<{ state: unknown; revision: string | null } | null>;
  saveLearner(classroomId: string, state: unknown, revision: string | null): Promise<{ revision: string }>;
  loadGlobal(classroomId: string): Promise<{ state: unknown; revision: string | null } | null>;
  saveGlobal(classroomId: string, state: unknown, revision: string | null): Promise<{ revision: string }>;
  subscribeGlobal(classroomId: string, listener: (state: unknown, revision: string) => void): () => void;
}
```

- [ ] **Step 4: Implement host bridge policy**

The bridge constructor receives exact frame window/origin and never listens without them. On `classroom.state.save`, validate/sanitize the state, require manager for `global`, pass the last revision, and return a structured conflict if the revision changed. On `classroom.navigate`, resolve room IDs against the manifest and catalog IDs against the generated catalog.

- [ ] **Step 5: Preserve current messages through one adapter**

Map `LAHS_CLASSROOM_AUTH_REQUEST`, `LAHS_CLASSROOM_READY`, `LAHS_CLASSROOM_STATE_REQUEST`, `LAHS_CLASSROOM_STATE_SAVE`, and `LAHS_CLASSROOM_NAVIGATE` to protocol messages in `legacyClassroomAdapter.ts`. Map host responses back to the current `scope: 'classroom-3d'` format. The adapter is active only for `main-classroom` protocol compatibility.

- [ ] **Step 6: Reduce `ClassroomPage` to lifecycle and rendering**

`ClassroomPage` computes the manifest/launch URL, creates the bridge on iframe load, calls pause/resume based on `isActive`, and disposes on unmount. Move direct Supabase calls out of the page into the temporary state-service adapter; the backend workstream later replaces it with `backend-client`.

- [ ] **Step 7: Run focused and build checks**

Run:

```powershell
node --test scripts/classroomSdk.test.mjs scripts/classroomHost.test.mjs
npm run typecheck
npm run build
```

Expected: PASS and `/classroom` retains the door intro and iframe loading surface.

- [ ] **Step 8: Commit host extraction**

```powershell
git add apps/shell/src/features/classroom apps/shell/src/pages/ClassroomPage.tsx scripts/classroomHost.test.mjs
git commit -m "refactor: extract classroom host bridge"
```

### Task 3: Add classroom and station generators

**Files:**
- Create: `templates/classroom/`
- Create: `templates/classroom-station/`
- Create: `scripts/create-classroom.mjs`
- Create: `scripts/create-station.mjs`
- Create: `scripts/createClassroom.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: safe CLI identifiers and runtime choice.
- Produces: `classrooms/<id>` and station modules registered in a classroom manifest without shell edits.

- [ ] **Step 1: Write temporary-directory generator tests**

Generate `science-lab` with room `main-lab`; assert manifest, scene entry, lifecycle test, styles, and package exist. Add station `microscope` targeting catalog ID `sci-solar-system`; assert the station is added once and duplicate generation fails without changing the manifest.

- [ ] **Step 2: Verify generator modules are missing**

Run: `node --test scripts/createClassroom.test.mjs`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Create a lifecycle-complete classroom template**

The template exports:

```ts
export interface ClassroomSceneLifecycle {
  load(): Promise<void>;
  activate(): void;
  pause(): void;
  resume(): void;
  resize(width: number, height: number, devicePixelRatio: number): void;
  dispose(): void;
}
```

Its scene uses one owned animation loop, pauses when hidden, clamps device pixel ratio to `2`, handles context loss, and disposes all tracked resources.

- [ ] **Step 4: Implement atomic generators**

Both generators validate IDs, ensure resolved destinations remain below `classrooms/`, refuse overwrite, update JSON through a sibling temporary file, validate the result, and delete the temporary file in `finally`. `create-station` verifies the target catalog ID exists before writing.

- [ ] **Step 5: Wire and test commands**

Add:

```json
"create:classroom": "node scripts/create-classroom.mjs",
"create:station": "node scripts/create-station.mjs",
"test:classroom-templates": "node --test scripts/createClassroom.test.mjs"
```

Run: `npm run test:classroom-templates && npm run typecheck`

Expected: PASS with no real sample classroom left behind.

- [ ] **Step 6: Commit generators**

```powershell
git add templates/classroom templates/classroom-station scripts/create-classroom.mjs scripts/create-station.mjs scripts/createClassroom.test.mjs package.json
git commit -m "feat: add classroom and station generators"
```

### Task 4: Package the current classroom and its stations

**Files:**
- Create: `classrooms/main/classroom.manifest.json`
- Move: `public/3dClass/` source to `classrooms/main/`
- Create: `classrooms/main/package.json`
- Create: `classrooms/main/tests/lifecycle.test.mjs`
- Create: `scripts/classroomParity.test.mjs`
- Modify: generated catalog output

**Interfaces:**
- Consumes: current `3dClass` behavior, classroom SDK, generator structure.
- Produces: owned `main-classroom` package with legacy alias `/3dClass/index.html` and registered `redbackpack`, `learnpolygons`, and `laptop` stations.

- [ ] **Step 1: Capture current classroom parity**

Test the door intro completion/fallback, ready/auth handshake, state request/save, manager rejection/acceptance, realtime update, worksheet handoff, pause/resume, frame teardown, and the three existing station launch paths.

- [ ] **Step 2: Run parity against package paths**

Run: `node --test scripts/classroomParity.test.mjs`

Expected: FAIL because `classrooms/main/classroom.manifest.json` does not exist.

- [ ] **Step 3: Create the current classroom manifest**

Use ID `main-classroom`, entry room `main`, legacy path `/3dClass/index.html`, and rooms/stations derived from the current source. Register station IDs `redbackpack`, `learnpolygons`, and `laptop`. Catalog-based targets must use existing stable content IDs; module stations point only within `classrooms/main/stations/`.

- [ ] **Step 4: Move source with history and build a legacy alias**

Use `git mv public/3dClass classrooms/main/legacy-source`, then reorganize owned scene/station source without copying large media. Configure the classroom build to emit the compatibility entry at `dist/3dClass/index.html` and package-owned chunks beneath `dist/experiences/classrooms/main/`.

- [ ] **Step 5: Add lifecycle ownership to the current 3D scene**

Wrap the current startup with one `ClassroomSceneLifecycle`. Track request-animation-frame IDs, resize/visibility/message listeners, geometries, materials, textures, render targets, controls, audio, and renderer. `dispose()` cancels/removes/disposes each tracked resource and is idempotent.

- [ ] **Step 6: Run classroom package and route checks**

Run:

```powershell
npm run sync:content-catalog
npm run build
node --test scripts/classroomParity.test.mjs scripts/classroomHost.test.mjs
npm run test:e2e -- --grep "Classroom"
```

Expected: `/classroom` and `/3dClass/index.html` work, manager rules remain enforced, and station launches are healthy.

- [ ] **Step 7: Commit the packaged classroom**

```powershell
git add classrooms public/3dClass scripts/classroomParity.test.mjs apps/shell/src/generated/contentCatalog.ts package.json package-lock.json
git commit -m "refactor: package expandable main classroom"
```

### Task 5: Complete classroom checks and documentation

**Files:**
- Create: `scripts/classroomPackages.test.mjs`
- Create: `docs/project/architecture/classrooms.md`
- Create: `docs/project/prompts/create-classroom.md`
- Create: `docs/project/quality/classroom.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: classroom package, SDK, templates, generated catalog, browser smoke tests.
- Produces: `npm run check:classroom` and developer creation guide.

- [ ] **Step 1: Test complete classroom ownership**

Assert every classroom manifest has unique room/station/portal IDs, every target catalog ID exists, every module entry remains inside its package, every legacy path has a generated alias, and production classroom HTML has no runtime CDN script.

- [ ] **Step 2: Define the workstream check**

Add:

```json
"check:classroom": "node --test scripts/classroomSdk.test.mjs scripts/classroomHost.test.mjs scripts/createClassroom.test.mjs scripts/classroomParity.test.mjs scripts/classroomPackages.test.mjs && npm run audit:content && npm run build"
```

- [ ] **Step 3: Document the exact creation workflow**

`create-classroom.md` must show commands for a new classroom, room, catalog station, and module station; list manifest fields; explain lifecycle ownership; and link the focused check. Do not instruct developers to edit `ClassroomPage.tsx`.

- [ ] **Step 4: Run and record Tier 3 focused evidence**

Run:

```powershell
npm run check:classroom
npm run test:e2e -- --grep "Classroom"
git diff --check
```

Record desktop, Android-sized, iPhone-sized, tablet portrait/landscape, touch, keyboard, reduced-motion, WebGL recovery, and teardown results in `docs/project/quality/classroom.md`, explicitly labeling emulated versus physical coverage.

- [ ] **Step 5: Commit classroom completion**

```powershell
git add scripts/classroomPackages.test.mjs docs/project/architecture/classrooms.md docs/project/prompts/create-classroom.md docs/project/quality/classroom.md package.json
git commit -m "docs: complete expandable classroom workflow"
```
