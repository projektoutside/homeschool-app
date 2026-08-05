# Platform Foundations, Catalog, and CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish reliable repository checks, npm workspace boundaries, a validated generated content catalog, and an isolated shell app without changing existing user-facing routes.

**Architecture:** Add foundation packages and generation scripts beside the legacy catalog, prove parity, then move the shell mechanically into `apps/shell`. Keep `public/` as a compatibility input until the game, classroom, and asset workstreams migrate its owners.

**Tech Stack:** Node.js 24, npm 11 workspaces, TypeScript 5.9, React 19, Vite 7, ESLint 9, Node test runner, GitHub Actions.

## Global Constraints

- Preserve all 81 current catalog entries, stable IDs, routes, metadata, and launch targets through generated compatibility aliases.
- Use npm workspaces; do not add Turborepo.
- Do not move game or classroom source in this workstream.
- Generated files are deterministic and never manually edited.
- Root checks must exclude `.worktrees`, `dist`, native build output, generated catalogs, and staged asset-pack payloads.
- Browser and GitHub Pages builds must keep their existing base-path behavior.
- Preserve unrelated Android-generated changes.

## File map

- `package.json`: workspace declarations and root command contract.
- `eslint.config.js`: owned-source lint scope.
- `packages/content-schema/schema/experience-manifest.schema.json`: canonical manifest shape.
- `packages/content-schema/src/types.ts`: TypeScript manifest/catalog contracts.
- `scripts/content/source-reader.mjs`: legacy TypeScript catalog reader extracted from the current audit.
- `scripts/content/manifest-validator.mjs`: runtime JSON validation for build scripts.
- `scripts/content/build-catalog.mjs`: deterministic catalog generator.
- `apps/shell/src/generated/contentCatalog.ts`: generated shell input.
- `scripts/content-parity.test.mjs`: legacy/generated parity and route contracts.
- `apps/shell/vite.config.ts`: shell build using the repository `public/` compatibility directory.
- `.github/workflows/validate.yml`: pull-request and main validation.

---

### Task 1: Make the existing repository check reliable

**Files:**
- Modify: `eslint.config.js`
- Create: `scripts/repositoryCheck.test.mjs`
- Modify: `package.json`
- Create: `.github/workflows/validate.yml`

**Interfaces:**
- Consumes: current lint/build/audit scripts.
- Produces: `npm run typecheck`, `npm test`, and `npm run check:foundations`.

- [ ] **Step 1: Write a failing lint-scope contract**

Create `scripts/repositoryCheck.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('eslint excludes generated and worktree output', async () => {
  const config = await read('eslint.config.js');
  for (const ignored of [
    "'.worktrees/**'",
    "'dist/**'",
    "'android/**/build/**'",
    "'android/game_assets/src/main/assets/**'",
    "'src/generated/**'",
    "'apps/shell/src/generated/**'",
  ]) {
    assert.match(config, new RegExp(ignored.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('validation workflow runs checks before deployment', async () => {
  const workflow = await read('.github/workflows/validate.yml');
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run check:foundations/);
  assert.match(workflow, /npm run audit:games/);
  assert.match(workflow, /npm run audit:assets/);
});
```

- [ ] **Step 2: Run the test and confirm the current scope fails**

Run: `node --test scripts/repositoryCheck.test.mjs`

Expected: FAIL because `.worktrees/**`, generated catalogs, and `validate.yml` are absent.

- [ ] **Step 3: Narrow ESLint to owned source**

Replace the leading ignore entry in `eslint.config.js` with:

```js
{
  ignores: [
    '.worktrees/**',
    'dist/**',
    'android/**/build/**',
    'android/game_assets/src/main/assets/**',
    'src/generated/**',
    'apps/shell/src/generated/**',
    'games/**/dist/**',
    'classrooms/**/dist/**',
  ],
},
```

- [ ] **Step 4: Define non-redundant root checks**

Add or replace these root scripts:

```json
"typecheck": "tsc -b --pretty false",
"test": "node --test scripts/*.test.mjs",
"check:foundations": "npm run typecheck && npm run lint && npm test && npm run audit:games",
"check": "npm run check:foundations && npm run audit:assets && npm run build"
```

Create `.github/workflows/validate.yml` with `pull_request` and pushes to `main`, Node 24 with npm cache, then `npm ci`, `npm run check:foundations`, `npm run audit:assets`, and `npm run build`. Set `BASE_PATH: /homeschool-app/` for the build step.

- [ ] **Step 5: Run the foundation check**

Run:

```powershell
node --test scripts/repositoryCheck.test.mjs
npm run check:foundations
```

Expected: PASS. The previous `.worktrees/.../native-bridge.js` ESLint failure must not recur.

- [ ] **Step 6: Commit the reliable check contract**

```powershell
git add eslint.config.js package.json scripts/repositoryCheck.test.mjs .github/workflows/validate.yml
git commit -m "build: establish reliable platform validation"
```

### Task 2: Add npm workspaces and the content schema

**Files:**
- Modify: `package.json`
- Create: `packages/content-schema/package.json`
- Create: `packages/content-schema/tsconfig.json`
- Create: `packages/content-schema/schema/experience-manifest.schema.json`
- Create: `packages/content-schema/src/types.ts`
- Create: `scripts/content/manifest-validator.mjs`
- Create: `scripts/contentManifest.test.mjs`

**Interfaces:**
- Consumes: JSON manifest objects.
- Produces: `ExperienceManifest`, `GameManifest`, `ClassroomManifest`, `validateManifest(value, source)`, and workspace package `@homeschool/content-schema`.

- [ ] **Step 1: Write failing manifest tests**

Create `scripts/contentManifest.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { validateManifest } from './content/manifest-validator.mjs';

const game = {
  schemaVersion: 1,
  kind: 'game',
  id: 'sample-game',
  title: 'Sample Game',
  version: '1.0.0',
  entry: './src/main.ts',
  runtime: 'canvas',
  orientation: 'any',
  responsive: true,
  classification: ['single-player', 'math'],
  capabilities: ['audio', 'storage'],
  permissions: [],
  mediaBundles: [],
  rewards: [{ code: 'answer.correct', points: 10 }],
  compatibility: { legacyPaths: ['/Games/Sample/index.html'], protocolVersion: 1 },
};

test('valid game manifest is normalized', () => {
  assert.deepEqual(validateManifest(game, 'sample'), game);
});

test('manifest rejects traversal and undeclared values', () => {
  assert.throws(() => validateManifest({ ...game, entry: '../../secret.js' }, 'traversal'), /entry/);
  assert.throws(() => validateManifest({ ...game, permissions: ['everything'] }, 'permission'), /permissions/);
});
```

- [ ] **Step 2: Verify missing validator failure**

Run: `node --test scripts/contentManifest.test.mjs`

Expected: FAIL with module-not-found for `scripts/content/manifest-validator.mjs`.

- [ ] **Step 3: Add workspace and typed manifest package**

Add to root `package.json`:

```json
"workspaces": ["apps/*", "games/*", "classrooms/*", "packages/*"]
```

Create `packages/content-schema/package.json`:

```json
{
  "name": "@homeschool/content-schema",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "exports": { ".": "./src/types.ts" }
}
```

Define these exact unions in `src/types.ts`:

```ts
export type ExperienceKind = 'game' | 'classroom';
export type ExperienceRuntime = 'dom' | 'canvas' | 'phaser' | 'three' | 'react-three-fiber' | 'legacy-iframe';
export type OrientationPolicy = 'any' | 'portrait' | 'landscape';
export type ExperienceCapability = 'audio' | 'storage' | 'rewards' | 'speech' | 'camera' | 'microphone' | 'fullscreen' | 'orientation' | 'network';
export type ExperiencePermission = 'camera' | 'microphone' | 'geolocation' | 'accelerometer' | 'gyroscope';

export interface ExperienceCompatibility {
  legacyPaths: string[];
  protocolVersion: 1;
}

export interface BaseExperienceManifest {
  schemaVersion: 1;
  kind: ExperienceKind;
  id: string;
  title: string;
  version: string;
  orientation: OrientationPolicy;
  responsive: boolean;
  classification: string[];
  permissions: ExperiencePermission[];
  mediaBundles: string[];
  compatibility: ExperienceCompatibility;
}

export interface RewardDefinition {
  code: string;
  points: number;
}

export interface GameManifest extends BaseExperienceManifest {
  kind: 'game';
  entry: string;
  runtime: ExperienceRuntime;
  capabilities: ExperienceCapability[];
  rewards: RewardDefinition[];
}

export interface RoomDefinition {
  id: string;
  entry: string;
  runtime: Extract<ExperienceRuntime, 'dom' | 'canvas' | 'three' | 'react-three-fiber' | 'legacy-iframe'>;
  stations: string[];
  portals: Array<{ id: string; targetRoomId: string }>;
}

export interface StationDefinition {
  id: string;
  kind: 'catalog' | 'module';
  targetId: string;
  capabilities: ExperienceCapability[];
}

export interface ClassroomManifest extends BaseExperienceManifest {
  kind: 'classroom';
  entryRoomId: string;
  rooms: RoomDefinition[];
  stations: StationDefinition[];
}

export type ExperienceManifest = GameManifest | ClassroomManifest;
```

- [ ] **Step 4: Implement runtime validation from the same allowed values**

Implement these validation helpers and branches in `manifest-validator.mjs`:

```js
export const RUNTIMES = new Set(['dom', 'canvas', 'phaser', 'three', 'react-three-fiber', 'legacy-iframe']);
export const CAPABILITIES = new Set(['audio', 'storage', 'rewards', 'speech', 'camera', 'microphone', 'fullscreen', 'orientation', 'network']);
export const PERMISSIONS = new Set(['camera', 'microphone', 'geolocation', 'accelerometer', 'gyroscope']);

const ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = (source, field) => { throw new Error(`${source}: invalid ${field}`); };
const validId = (value) => typeof value === 'string' && ID.test(value);
const validEntry = (value) => typeof value === 'string' && value.startsWith('./') && !value.includes('..') && !value.includes('\\');
const uniqueStrings = (value, allowed) => Array.isArray(value)
  && value.every((item) => typeof item === 'string' && (!allowed || allowed.has(item)))
  && new Set(value).size === value.length;

const validateCommon = (value, source) => {
  if (value.schemaVersion !== 1) fail(source, 'schemaVersion');
  if (!validId(value.id)) fail(source, 'id');
  if (typeof value.title !== 'string' || !value.title.trim()) fail(source, 'title');
  if (typeof value.version !== 'string' || !SEMVER.test(value.version)) fail(source, 'version');
  if (!['any', 'portrait', 'landscape'].includes(value.orientation)) fail(source, 'orientation');
  if (typeof value.responsive !== 'boolean') fail(source, 'responsive');
  if (!uniqueStrings(value.classification)) fail(source, 'classification');
  if (!uniqueStrings(value.permissions, PERMISSIONS)) fail(source, 'permissions');
  if (!uniqueStrings(value.mediaBundles) || !value.mediaBundles.every(validId)) fail(source, 'mediaBundles');
  if (!isRecord(value.compatibility) || value.compatibility.protocolVersion !== 1) fail(source, 'compatibility');
  if (!uniqueStrings(value.compatibility.legacyPaths)
    || !value.compatibility.legacyPaths.every((path) => path.startsWith('/') && !path.includes('..'))) {
    fail(source, 'compatibility.legacyPaths');
  }
};

const validateGame = (value, source) => {
  if (!validEntry(value.entry)) fail(source, 'entry');
  if (!RUNTIMES.has(value.runtime)) fail(source, 'runtime');
  if (!uniqueStrings(value.capabilities, CAPABILITIES)) fail(source, 'capabilities');
  if (!Array.isArray(value.rewards)) fail(source, 'rewards');
  const codes = new Set();
  for (const reward of value.rewards) {
    if (!isRecord(reward) || !validId(reward.code) || !Number.isInteger(reward.points)
      || reward.points === 0 || Math.abs(reward.points) > 1000 || codes.has(reward.code)) fail(source, 'rewards');
    codes.add(reward.code);
  }
};

const validateClassroom = (value, source) => {
  if (!validId(value.entryRoomId) || !Array.isArray(value.rooms) || !Array.isArray(value.stations)) fail(source, 'classroom');
  const roomIds = new Set();
  const stationIds = new Set();
  for (const station of value.stations) {
    if (!isRecord(station) || !validId(station.id) || stationIds.has(station.id)
      || !['catalog', 'module'].includes(station.kind) || !validId(station.targetId)
      || !uniqueStrings(station.capabilities, CAPABILITIES)) fail(source, 'stations');
    stationIds.add(station.id);
  }
  for (const room of value.rooms) {
    if (!isRecord(room) || !validId(room.id) || roomIds.has(room.id) || !validEntry(room.entry)
      || !RUNTIMES.has(room.runtime) || !uniqueStrings(room.stations) || !Array.isArray(room.portals)) fail(source, 'rooms');
    roomIds.add(room.id);
  }
  if (!roomIds.has(value.entryRoomId)) fail(source, 'entryRoomId');
  for (const room of value.rooms) {
    if (!room.stations.every((id) => stationIds.has(id))) fail(source, 'room.stations');
    for (const portal of room.portals) {
      if (!isRecord(portal) || !validId(portal.id) || !roomIds.has(portal.targetRoomId)) fail(source, 'room.portals');
    }
  }
};

export const validateManifest = (value, source) => {
  if (!isRecord(value) || !['game', 'classroom'].includes(value.kind)) fail(source, 'kind');
  validateCommon(value, source);
  if (value.kind === 'game') validateGame(value, source);
  if (value.kind === 'classroom') validateClassroom(value, source);
  return Object.freeze(structuredClone(value));
};
```

- [ ] **Step 5: Add and validate the JSON schema**

The JSON schema uses `oneOf` for `GameManifest` and `ClassroomManifest`, sets `additionalProperties: false` on every object, requires every non-optional property shown above, constrains enums to the unions, sets `uniqueItems: true` on ID/capability/permission/path arrays, constrains rewards to nonzero integers from `-1000` through `1000`, and disallows `..` in entries with pattern `^(?!.*\\.\\.).+$`.

Run:

```powershell
npm install
node --test scripts/contentManifest.test.mjs
npm run typecheck
```

Expected: PASS and the workspace package resolves in TypeScript.

- [ ] **Step 6: Commit schema foundation**

```powershell
git add package.json package-lock.json packages/content-schema scripts/content/manifest-validator.mjs scripts/contentManifest.test.mjs
git commit -m "feat: add manifest-driven content schema"
```

### Task 3: Generate a catalog and prove legacy parity

**Files:**
- Create: `scripts/content/source-reader.mjs`
- Create: `scripts/content/build-catalog.mjs`
- Create: `scripts/content-parity.test.mjs`
- Create: `src/generated/.gitkeep`
- Modify: `src/data/moduleRegistry.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `src/data/content/*.ts` during compatibility mode plus `games/*/game.manifest.json` and `classrooms/*/classroom.manifest.json` when present.
- Produces: `src/generated/contentCatalog.ts` before the shell move, later located at `apps/shell/src/generated/contentCatalog.ts`, exporting `GENERATED_CONTENT_ITEMS`, `GENERATED_EXPERIENCES`, and `GENERATED_LEGACY_PATHS`.

- [ ] **Step 1: Extract the current AST reader behind a testable interface**

Move the catalog-reading portions of `scripts/audit-games.mjs` into `scripts/content/source-reader.mjs` and export:

```js
export const readLegacyContentEntries = ({ repoRoot }) => Array<{
  id: string,
  title: string,
  description: string,
  type: 'game' | 'worksheet' | 'tool' | 'resource',
  category: string,
  subjects: string[],
  gradeLevels: string[],
  customHtmlPath?: string,
  externalUrl?: string,
  thumbnail?: string,
  dateAdded: string,
}>;
```

Keep `audit-games.mjs` as the CLI consumer of the extracted reader.

- [ ] **Step 2: Write the failing parity contract**

`scripts/content-parity.test.mjs` must load legacy entries through `readLegacyContentEntries`, run the generator in a temporary directory, import the emitted module, and assert:

```js
assert.equal(generated.GENERATED_CONTENT_ITEMS.length, legacy.length);
assert.deepEqual(
  generated.GENERATED_CONTENT_ITEMS.map(({ id }) => id).sort(),
  legacy.map(({ id }) => id).sort(),
);
assert.equal(new Set(generated.GENERATED_CONTENT_ITEMS.map(({ id }) => id)).size, legacy.length);
```

It must also assert every legacy `customHtmlPath` exists in `GENERATED_LEGACY_PATHS` with the same ID.

- [ ] **Step 3: Verify the generator is missing**

Run: `node --test scripts/content-parity.test.mjs`

Expected: FAIL because `build-catalog.mjs` does not exist.

- [ ] **Step 4: Implement deterministic generation**

Export `buildCatalog({ repoRoot, outputFile })`. Read all `*.manifest.json` files under `games/` and `classrooms/`, validate them, reject duplicate IDs/legacy paths, then merge by ID so a manifest replaces the legacy launch description without changing the legacy content metadata.

Sort content by `id`, experience manifests by `id`, and legacy path map keys lexically. Emit TypeScript with `JSON.stringify(value, null, 2)` and a final newline. The first line must be:

```ts
// Generated by scripts/content/build-catalog.mjs. Do not edit.
```

- [ ] **Step 5: Switch the registry to generated content behind a parity guard**

Change `moduleRegistry.ts` to import `GENERATED_CONTENT_ITEMS` and set:

```ts
export const BASE_MODULES: ModuleDefinition[] = GENERATED_CONTENT_ITEMS
  .map(sanitizeBaseModule)
  .filter((item): item is ModuleDefinition => Boolean(item));
```

Add scripts:

```json
"sync:content-catalog": "node scripts/content/build-catalog.mjs",
"audit:content": "node scripts/content/build-catalog.mjs --check && node scripts/audit-games.mjs",
"predev": "npm run sync:content-catalog",
"prebuild": "npm run sync:content-catalog"
```

Remove duplicated content-sync calls from `dev` and `build` only after confirming npm lifecycle scripts execute once.

- [ ] **Step 6: Run parity, audit, and build checks**

Run:

```powershell
npm run sync:content-catalog
node --test scripts/content-parity.test.mjs
npm run audit:content
npm run build
```

Expected: 81 content entries, no duplicate IDs/paths, and unchanged route behavior.

- [ ] **Step 7: Commit generated catalog integration**

```powershell
git add package.json scripts/audit-games.mjs scripts/content src/data/moduleRegistry.ts src/generated/.gitkeep
git add -f src/generated/contentCatalog.ts
git commit -m "feat: generate content catalog with legacy parity"
```

### Task 4: Move the shell into its workspace without changing output

**Files:**
- Move: `src/` to `apps/shell/src/`
- Move: `index.html` to `apps/shell/index.html`
- Move: `vite.config.ts` to `apps/shell/vite.config.ts`
- Create: `apps/shell/package.json`
- Create: `apps/shell/tsconfig.json`
- Modify: `tsconfig.app.json`
- Modify: `package.json`
- Modify: Node tests that read `src/` paths

**Interfaces:**
- Consumes: generated catalog and repository-level `public/` compatibility content.
- Produces: workspace `@homeschool/shell`, root `npm run dev`, and root `npm run build` with the same `dist/` layout.

- [ ] **Step 1: Record a pre-move artifact contract**

Build the current shell and record in `docs/project/inventory/shell-build-baseline.json`:

```json
{
  "entry": "index.html",
  "requiredOutputs": ["index.html", "service-worker.js", "app-version.json"],
  "requiredRoutes": ["/", "/apps", "/classroom", "/play/MathPuzzle"],
  "publicCompatibilityRoot": "public"
}
```

Add a test that reads this file and asserts each required output exists after `npm run build`.

- [ ] **Step 2: Verify the baseline test passes before moving**

Run: `npm run build && node --test scripts/shellBuild.test.mjs`

Expected: PASS against the root shell.

- [ ] **Step 3: Perform the mechanical move**

Use `git mv` for `src`, `index.html`, and `vite.config.ts`. Create `apps/shell/package.json`:

```json
{
  "name": "@homeschool/shell",
  "private": true,
  "version": "1.0.0",
  "type": "module"
}
```

Set `apps/shell/tsconfig.json` to extend `../../tsconfig.app.json` and include `src`. Change root `tsconfig.app.json` include to `apps/shell/src`.

- [ ] **Step 4: Make Vite paths repository-relative**

At the top of `apps/shell/vite.config.ts`, define:

```ts
import { fileURLToPath } from 'node:url';

const shellRoot = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
```

Set `root: shellRoot`, `publicDir: resolve(repoRoot, 'public')`, and `build.outDir: resolve(repoRoot, 'dist')`. Update service-worker source to `resolve(shellRoot, 'src/service-worker.js')` and content-manager imports to `../../scripts/vite/contentManagerPlugin`.

- [ ] **Step 5: Update root commands and test paths**

Set:

```json
"dev": "vite --config apps/shell/vite.config.ts --host",
"dev:live": "vite --config apps/shell/vite.config.ts --host 0.0.0.0 --port 5173 --strictPort",
"build:shell": "vite build --config apps/shell/vite.config.ts",
"build": "npm run sync:install-metadata && npm run sync:worksheet-manifest && npm run build:quiz-it-polygon && npm run typecheck && npm run build:shell",
"preview": "vite preview --config apps/shell/vite.config.ts"
```

Update every Node test path returned by `rg -n "(?:^|['\"])src/" scripts -g "*.test.mjs"` to `apps/shell/src/`.

- [ ] **Step 6: Compare post-move artifacts and routes**

Run:

```powershell
npm run check:foundations
npm run build
node --test scripts/shellBuild.test.mjs scripts/content-parity.test.mjs
git diff --check
```

Expected: required artifacts and all legacy route aliases remain present; no source file exists in both `src/` and `apps/shell/src/`.

- [ ] **Step 7: Commit the shell workspace**

```powershell
git add package.json package-lock.json tsconfig.app.json apps/shell scripts docs/project/inventory/shell-build-baseline.json
git add -u src index.html vite.config.ts
git commit -m "refactor: isolate application shell workspace"
```

### Task 5: Make validated artifacts the only deploy input

**Files:**
- Modify: `.github/workflows/validate.yml`
- Modify: `.github/workflows/deploy.yml`
- Create: `scripts/workflowContract.test.mjs`
- Create: `docs/project/quality/foundations.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: `check:foundations`, `audit:content`, `audit:assets`, and `build`.
- Produces: deploy workflow gated by the same commit's validation and `npm run check:foundations`.

- [ ] **Step 1: Write a failing workflow contract**

Assert `deploy.yml` has `needs: validate`, a validation job invoking the reusable validation command, and no second independently configured build environment. Assert Pages upload remains `./dist`.

- [ ] **Step 2: Run and observe the missing dependency**

Run: `node --test scripts/workflowContract.test.mjs`

Expected: FAIL because `deploy.yml` currently builds without a validation dependency.

- [ ] **Step 3: Add a validation job to Pages deployment**

In `deploy.yml`, create job `validate` before `deploy`. It runs `npm ci`, `npm run check:foundations`, and `npm run audit:assets`. Set `deploy.needs: validate`. Keep the production build in `deploy` because Pages upload requires its artifact, but use the same Node version, lockfile, and environment contract.

- [ ] **Step 4: Run repository and workflow checks**

Run:

```powershell
node --test scripts/workflowContract.test.mjs
npm run check:foundations
npm run audit:assets
npm run build
```

Expected: PASS.

- [ ] **Step 5: Record foundation evidence and commit**

Write exact command results, commit SHA, 81-entry parity result, build artifact size, and known warnings to `docs/project/quality/foundations.md`.

```powershell
git add .github/workflows package.json scripts/workflowContract.test.mjs docs/project/quality/foundations.md
git commit -m "ci: gate pages deployment on platform validation"
```
