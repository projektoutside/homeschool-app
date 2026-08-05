# Scalable Homeschool Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coordinate the six platform workstreams into one compatibility-first migration that preserves existing behavior while making games, classrooms, backends, and releases independently extensible.

**Architecture:** Keep one npm-workspace monorepo and land vertical slices behind compatibility adapters. Workstream plans own disjoint paths; this master plan owns inventories, dependency gates, combined review, legacy retirement, documentation truth, and final release readiness.

**Tech Stack:** Node.js 24, npm 11 workspaces, TypeScript 5.9, React 19, Vite 7, Capacitor 8, Supabase, Node test runner, Playwright, GitHub Actions, Android Gradle/Play Asset Delivery.

## Global Constraints

- Preserve all current routes, stable content IDs, saves, reward semantics, classroom behavior, and public user flows until replacement parity is proven.
- Use npm workspaces first; do not introduce Turborepo.
- Keep browser, GitHub Pages, and Capacitor builds usable at every integration checkpoint.
- Downloadable asset packs contain media only, never executable HTML, JavaScript, WebAssembly, or application shaders.
- All game and classroom capabilities are manifest-declared and least-privilege.
- Clients cannot authoritatively set aggregate points or privileged classroom state.
- Preserve unrelated changes in `android/app/capacitor.build.gradle` and `android/capacitor.settings.gradle` unless a focused diff proves they belong to a workstream.
- Do not remove a legacy path in the same commit that first introduces its replacement.
- This migration is Tier 3; final evidence must distinguish physical devices, emulation, automation, build inspection, and code review.

## Workstream plans and ownership

The saved project uses these exact pinned Codex task titles:

1. `00 - Homeschool Platform Master Integration`
2. `01 - Platform Foundations, Catalog, and CI`
3. `02 - Game SDK, Templates, and Game Migration`
4. `03 - Classroom SDK and Expandable Experiences`
5. `04 - Supabase Backend and Data Integrity`
6. `05 - Assets, Performance, Web, Android, and iOS`
7. `06 - Cross-Device QA and Release Verification`

| Order | Workstream | Plan | Primary ownership |
| --- | --- | --- | --- |
| 01 | Foundations | `2026-08-05-platform-foundations-catalog-ci.md` | root workspace, `apps/shell`, content schema/generation, CI |
| 02 | Games | `2026-08-05-game-sdk-templates-migration.md` | `packages/game-sdk`, `games`, game host adapters/templates |
| 03 | Classroom | `2026-08-05-classroom-sdk-expansion.md` | `packages/classroom-sdk`, `classrooms`, classroom host/templates |
| 04 | Backend | `2026-08-05-supabase-backend-integrity.md` | `supabase`, `packages/backend-client`, backend consumers |
| 05 | Assets/native | `2026-08-05-asset-delivery-platforms.md` | asset inventory, web delivery, Android/iOS packaging |
| 06 | QA/release | `2026-08-05-cross-device-release.md` | Playwright, quality evidence, combined release gate |

Foundations lands first. Games and Classroom may proceed after generated-catalog parity. Backend baseline/types may proceed after the baseline inventory, but authoritative reward migration waits for packaged game reward definitions and consumer rewiring waits for the shell workspace. Asset relocation waits for game/classroom manifests. Final QA waits for every workstream exit gate.

---

### Task 1: Create the durable project control plane

**Files:**
- Create: `docs/project/README.md`
- Create: `docs/project/architecture/platform.md`
- Create: `docs/project/inventory/current-baseline.md`
- Create: `docs/project/workstreams/status.md`
- Create: `docs/project/quality/evidence-index.md`
- Create: `docs/project/prompts/README.md`
- Create: `docs/project/runbooks/integration.md`
- Create: `scripts/project-docs.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: the approved design and the six workstream plan paths listed above.
- Produces: `npm run test:project-docs` and a stable documentation entry point used by every Codex task.

- [ ] **Step 1: Write the failing documentation contract**

Create `scripts/project-docs.test.mjs`:

```js
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const required = [
  'docs/project/README.md',
  'docs/project/architecture/platform.md',
  'docs/project/inventory/current-baseline.md',
  'docs/project/workstreams/status.md',
  'docs/project/quality/evidence-index.md',
  'docs/project/prompts/README.md',
  'docs/project/runbooks/integration.md',
];

test('project control-plane documents exist', async () => {
  await Promise.all(required.map((path) => access(new URL(path, root))));
});

test('project entry point links every workstream', async () => {
  const index = await read('docs/project/README.md');
  for (const number of ['01', '02', '03', '04', '05', '06']) {
    assert.match(index, new RegExp(`${number} - `));
  }
  assert.match(index, /Current truth/);
  assert.match(index, /Target truth/);
  assert.match(index, /Migration state/);
});
```

- [ ] **Step 2: Run the contract and verify it fails**

Run: `node --test scripts/project-docs.test.mjs`

Expected: FAIL because `docs/project/README.md` and its linked documents do not exist.

- [ ] **Step 3: Add the documentation entry points**

Use this exact heading structure in `docs/project/README.md`:

```markdown
# Homeschool Platform Project Hub

## Current truth
## Target truth
## Migration state
## Workstreams
### 01 - Platform Foundations, Catalog, and CI
### 02 - Game SDK, Templates, and Game Migration
### 03 - Classroom SDK and Expandable Experiences
### 04 - Supabase Backend and Data Integrity
### 05 - Assets, Performance, Web, Android, and iOS
### 06 - Cross-Device QA and Release Verification
## Architecture decisions
## Runbooks
## Quality evidence
## Prompting guides
```

Populate each linked document with repository-confirmed facts from the approved specification. In `status.md`, use the columns `Workstream`, `State`, `Dependency`, `Exit gate`, `Evidence`, and initialize each state to `planned`.

- [ ] **Step 4: Wire and run the focused test**

Add to `package.json` scripts:

```json
"test:project-docs": "node --test scripts/project-docs.test.mjs"
```

Run: `npm run test:project-docs`

Expected: PASS with two tests.

- [ ] **Step 5: Commit the control plane**

```powershell
git add package.json scripts/project-docs.test.mjs docs/project
git commit -m "docs: add homeschool platform project hub"
```

### Task 2: Add a machine-readable integration readiness gate

**Files:**
- Create: `scripts/platform-readiness.config.json`
- Create: `scripts/verify-platform-readiness.mjs`
- Create: `scripts/platformReadiness.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: workstream commands and evidence paths.
- Produces: `npm run verify:platform-readiness`, which exits nonzero when a required command or evidence file is absent.

- [ ] **Step 1: Write the failing readiness tests**

Create `scripts/platformReadiness.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('readiness config names all six workstreams', async () => {
  const config = JSON.parse(await read('scripts/platform-readiness.config.json'));
  assert.deepEqual(config.workstreams.map(({ id }) => id), [
    'foundations', 'games', 'classroom', 'backend', 'assets-native', 'qa-release',
  ]);
  for (const workstream of config.workstreams) {
    assert.ok(workstream.commands.length > 0);
    assert.ok(workstream.evidence.length > 0);
  }
});

test('readiness verifier never publishes or mutates production', async () => {
  const source = await read('scripts/verify-platform-readiness.mjs');
  assert.doesNotMatch(source, /git push|supabase db push|gh release|play console/i);
  assert.match(source, /--check-files-only/);
});
```

- [ ] **Step 2: Verify the tests fail for missing files**

Run: `node --test scripts/platformReadiness.test.mjs`

Expected: FAIL with `ENOENT` for `scripts/platform-readiness.config.json`.

- [ ] **Step 3: Create the readiness configuration**

Create `scripts/platform-readiness.config.json` with this shape and exact IDs:

```json
{
  "schemaVersion": 1,
  "workstreams": [
    { "id": "foundations", "commands": ["npm run check:foundations"], "evidence": ["docs/project/quality/foundations.md"] },
    { "id": "games", "commands": ["npm run check:games"], "evidence": ["docs/project/quality/games.md"] },
    { "id": "classroom", "commands": ["npm run check:classroom"], "evidence": ["docs/project/quality/classroom.md"] },
    { "id": "backend", "commands": ["npm run check:backend"], "evidence": ["docs/project/quality/backend.md"] },
    { "id": "assets-native", "commands": ["npm run check:assets-native"], "evidence": ["docs/project/quality/assets-native.md"] },
    { "id": "qa-release", "commands": ["npm run check:qa-release"], "evidence": ["docs/project/quality/qa-release.md"] }
  ]
}
```

- [ ] **Step 4: Implement the read-only verifier**

`verify-platform-readiness.mjs` must parse `--check-files-only`, validate unique IDs, validate every command exists in root `package.json`, validate every evidence file exists, and use `spawnSync(command, { shell: true, stdio: 'inherit' })` only when file-only mode is absent. It must print one JSON result with `ready`, `checkedAt`, and `workstreams`.

The command-selection core must be:

```js
const checkFilesOnly = process.argv.includes('--check-files-only');
const results = config.workstreams.map((workstream) => ({
  ...workstream,
  missingCommands: workstream.commands.filter((command) => !hasPackageScript(command)),
  missingEvidence: workstream.evidence.filter((path) => !existsSync(resolve(repoRoot, path))),
}));
```

- [ ] **Step 5: Wire and test the verifier**

Add:

```json
"test:platform-readiness": "node --test scripts/platformReadiness.test.mjs",
"verify:platform-readiness": "node scripts/verify-platform-readiness.mjs"
```

Run: `npm run test:platform-readiness`

Expected: PASS. `node scripts/verify-platform-readiness.mjs --check-files-only` may report `ready: false` until workstream evidence is produced; that is the intended migration state.

- [ ] **Step 6: Commit the readiness gate**

```powershell
git add package.json scripts/platform-readiness.config.json scripts/verify-platform-readiness.mjs scripts/platformReadiness.test.mjs
git commit -m "build: add platform integration readiness gate"
```

### Task 3: Integrate workstreams in dependency order

**Files:**
- Modify: `docs/project/workstreams/status.md`
- Modify: `docs/project/quality/evidence-index.md`
- Review: every path named in the six workstream plans

**Interfaces:**
- Consumes: verified commits and evidence from workstreams 01 through 06.
- Produces: one integrated branch on which all workstream check commands pass together.

- [ ] **Step 1: Record exact candidate commits**

For each workstream, add its full commit SHA and evidence path to `status.md`. Do not mark a state `integrated` unless its focused command passes on the integration branch.

- [ ] **Step 2: Integrate foundations first**

Run:

```powershell
npm ci
npm run check:foundations
git diff --check
```

Expected: the shell and generated catalog build with legacy route parity before other workstreams are introduced.

- [ ] **Step 3: Integrate games and classroom**

Run:

```powershell
npm run check:games
npm run check:classroom
npm run audit:content
```

Expected: game and classroom protocol tests pass together, and the catalog has no duplicate ID, route, or permission declaration.

- [ ] **Step 4: Integrate backend and asset/native changes**

Run:

```powershell
npm run check:backend
npm run check:assets-native
npm run build
```

Expected: backend consumers compile against generated types, media staging excludes executable files, and the production web build succeeds.

- [ ] **Step 5: Integrate final QA evidence**

Run:

```powershell
npm run check:qa-release
npm run verify:platform-readiness
git diff --check
```

Expected: every workstream is `ready: true`, with no publishing side effect.

- [ ] **Step 6: Commit integration metadata**

```powershell
git add docs/project/workstreams/status.md docs/project/quality/evidence-index.md
git commit -m "docs: record verified platform integration"
```

### Task 4: Retire compatibility layers only after parity proof

**Files:**
- Modify: `apps/shell/src/data/moduleRegistry.ts`
- Modify: `apps/shell/src/pages/GamePlayer.tsx`
- Modify: `apps/shell/src/pages/ClassroomPage.tsx`
- Modify: `scripts/content-parity.test.mjs`
- Modify: `docs/project/architecture/platform.md`

**Interfaces:**
- Consumes: generated catalog, game SDK adapters, classroom SDK adapter, and migration inventory showing zero legacy-only consumers.
- Produces: shell code with no game-ID conditionals and no legacy catalog fallback.

- [ ] **Step 1: Strengthen parity tests before deletion**

Add assertions that the generated catalog contains every legacy ID and alias, every launch probe is healthy, and these strings no longer appear in shell pages:

```js
assert.doesNotMatch(gamePlayer, /CAR_KING_GAME_ID|WORD_PUZZLE_GAME_ID/);
assert.doesNotMatch(home, /SINGLE_PLAYER_GAME_IDS/);
assert.doesNotMatch(classroomPage, /LAHS_CLASSROOM_(?:AUTH|STATE|NAVIGATE)/);
```

- [ ] **Step 2: Run the strengthened test and verify the legacy assertions fail**

Run: `node --test scripts/content-parity.test.mjs`

Expected: FAIL only on compatibility strings that still have live consumers.

- [ ] **Step 3: Delete adapters with zero consumers**

Remove a compatibility branch only when its adapter usage search is empty outside tests and migration documents:

```powershell
rg -n "CAR_KING_GAME_ID|WORD_PUZZLE_GAME_ID|SINGLE_PLAYER_GAME_IDS|LAHS_CLASSROOM_" apps packages games classrooms scripts
```

Expected after removal: any remaining legacy strings exist only inside the relevant migrated experience adapter, not the shell host.

- [ ] **Step 4: Run combined parity and launch checks**

Run:

```powershell
node --test scripts/content-parity.test.mjs
npm run test:e2e -- --grep "catalog launch"
npm run build
```

Expected: PASS, with existing public URLs resolving through generated aliases.

- [ ] **Step 5: Commit legacy retirement**

```powershell
git add apps/shell/src/data/moduleRegistry.ts apps/shell/src/pages/GamePlayer.tsx apps/shell/src/pages/ClassroomPage.tsx scripts/content-parity.test.mjs docs/project/architecture/platform.md
git commit -m "refactor: retire verified platform compatibility paths"
```

### Task 5: Perform the final no-known-risk review

**Files:**
- Modify: `docs/project/quality/evidence-index.md`
- Modify: `docs/project/workstreams/status.md`
- Create: `docs/project/quality/final-platform-review.md`

**Interfaces:**
- Consumes: complete integrated diff, six workstream evidence files, deployment/backend/native results.
- Produces: a final evidence-backed readiness decision with explicit residual limitations.

- [ ] **Step 1: Review the complete migration diff**

Run:

```powershell
git status --short
git diff d5dd0844558303ae0b000b0f33b3bbc5fb095b0d..HEAD --stat
git diff d5dd0844558303ae0b000b0f33b3bbc5fb095b0d..HEAD --check
```

Confirm `current-baseline.md` records `d5dd0844558303ae0b000b0f33b3bbc5fb095b0d`; stop if repository history does not contain that commit.

- [ ] **Step 2: Run the full non-publishing gate**

Run:

```powershell
npm run verify:platform-readiness
npm run check
npm run build
```

Expected: all commands exit 0 and produce no untracked generated output.

- [ ] **Step 3: Review security, data, accessibility, and performance evidence**

In `final-platform-review.md`, use the headings:

```markdown
# Final Platform Review
## Repository and build
## Existing-route compatibility
## Game and classroom lifecycle
## Backend authorization and data reconciliation
## Web and native artifacts
## Accessibility and cross-device coverage
## Physical-device coverage
## Remaining limitations
## Rollback point
## Decision
```

- [ ] **Step 4: Record the decision**

Use `No Known In-Scope Risk` only if every required gate passed. Otherwise use `Blocked - Not Complete` and include the exact failing command or unavailable external proof plus the smallest unblock action.

- [ ] **Step 5: Commit the final review**

```powershell
git add docs/project/quality/final-platform-review.md docs/project/quality/evidence-index.md docs/project/workstreams/status.md
git commit -m "docs: complete homeschool platform readiness review"
```
