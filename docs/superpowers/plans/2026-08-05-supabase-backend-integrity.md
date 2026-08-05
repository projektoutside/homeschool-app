# Supabase Backend and Data Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the snapshot-style Supabase backend into a replayable, typed, authorization-tested system with authoritative rewards and consistent web/native configuration.

**Architecture:** Baseline the current schema as the first migration, add small forward migrations, generate database types, and expose narrow services through `@homeschool/backend-client`. Reward codes map to server-owned values; classroom/global writes use database authorization and revision checks.

**Tech Stack:** Supabase CLI as a project dev dependency, PostgreSQL migrations, pgTAP database tests, Supabase JS 2.95+, TypeScript 5.9, Node test runner.

## Global Constraints

- Do not mutate connected or production data while developing migration replay and tests.
- Preserve existing user IDs, profiles, classroom state, catalog data, points totals, and point-event idempotency keys.
- Baseline reconciliation must finish before direct point writes are revoked in a connected environment.
- Anonymous, authenticated learner, manager, and service-role access are tested separately.
- `service_role` credentials never enter Vite, browser code, logs, Git, or client diagnostics.
- Guest/local mode remains intentional and clearly reported as local persistence.
- Web and native builds use one explicit backend-mode contract.
- Destructive database changes require a separate backup/restore gate.

## File map

- `supabase/config.toml`: local project configuration.
- `supabase/migrations/20260805000100_baseline.sql`: immutable current-schema baseline.
- `supabase/migrations/*`: focused forward changes.
- `supabase/tests/*.sql`: pgTAP authorization, rewards, and state tests.
- `supabase/generated-types/database.ts`: generated database contract.
- `packages/backend-client/src/`: typed auth, points, classroom, content, storage, and health services.
- `apps/shell/src/config/backendMode.ts`: explicit build/runtime backend mode.

---

### Task 1: Establish a replayable local Supabase baseline

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `supabase/config.toml`
- Create: `supabase/migrations/20260805000100_baseline.sql`
- Create: `scripts/supabaseMigrations.test.mjs`
- Modify: `supabase/schema.sql`

**Interfaces:**
- Consumes: current `supabase/schema.sql` as of baseline commit.
- Produces: `npm run backend:start`, `backend:reset`, `backend:test`, and an immutable baseline migration.

- [ ] **Step 1: Write a failing migration-structure test**

Create `scripts/supabaseMigrations.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

test('Supabase uses ordered immutable migrations', async () => {
  const files = (await readdir(new URL('../supabase/migrations/', import.meta.url))).sort();
  assert.equal(files[0], '20260805000100_baseline.sql');
  assert.equal(new Set(files).size, files.length);
  for (const file of files) assert.match(file, /^\d{14}_[a-z0-9_]+\.sql$/);
});

test('schema snapshot declares its generated source', async () => {
  const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  assert.match(schema, /Reference snapshot generated from supabase\/migrations/);
});
```

- [ ] **Step 2: Verify migration directory failure**

Run: `node --test scripts/supabaseMigrations.test.mjs`

Expected: FAIL because `supabase/migrations/` does not exist.

- [ ] **Step 3: Install a project-local Supabase CLI**

Run:

```powershell
npm install --save-dev supabase
npx supabase init
```

Keep the generated CLI version locked in `package-lock.json`. Do not install a machine-wide CLI.

- [ ] **Step 4: Create the immutable baseline**

Copy the exact current executable SQL from `supabase/schema.sql` into `supabase/migrations/20260805000100_baseline.sql`. Add only this comment to the snapshot header:

```sql
-- Reference snapshot generated from supabase/migrations. Do not apply this file directly.
```

Record the pre-baseline schema SHA-256 and Git SHA in `docs/project/inventory/backend-baseline.md`.

- [ ] **Step 5: Wire local commands and replay**

Add:

```json
"backend:start": "supabase start",
"backend:stop": "supabase stop",
"backend:reset": "supabase db reset",
"backend:test": "supabase test db"
```

Run:

```powershell
npx supabase start
npm run backend:reset
node --test scripts/supabaseMigrations.test.mjs
```

Expected: local services start, baseline applies cleanly, and the structure test passes. If Docker is unavailable, record the exact Docker/CLI error; do not claim replay success.

- [ ] **Step 6: Commit the baseline without local secrets**

```powershell
git status --short
git add package.json package-lock.json supabase/config.toml supabase/migrations/20260805000100_baseline.sql supabase/schema.sql scripts/supabaseMigrations.test.mjs docs/project/inventory/backend-baseline.md
git commit -m "build: baseline Supabase migrations"
```

Confirm `.env`, `.branches`, `.temp`, and local service state are not staged.

### Task 2: Generate database types and introduce backend services

**Files:**
- Create: `supabase/generated-types/database.ts`
- Create: `packages/backend-client/package.json`
- Create: `packages/backend-client/src/types.ts`
- Create: `packages/backend-client/src/client.ts`
- Create: `packages/backend-client/src/health.ts`
- Create: `packages/backend-client/src/index.ts`
- Create: `apps/shell/src/config/backendMode.ts`
- Modify: `apps/shell/src/lib/supabase.ts`
- Create: `scripts/backendClient.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: public Supabase URL, anon key, generated `Database` type, and explicit mode.
- Produces: `createBackendClient`, `BackendMode`, and `getBackendHealth()`.

- [ ] **Step 1: Write failing backend-mode tests**

Test these exact results:

```js
assert.deepEqual(resolveBackendMode({ disabled: 'true', url: 'x', anonKey: 'y' }), { mode: 'local-only', reason: 'explicitly-disabled' });
assert.deepEqual(resolveBackendMode({ disabled: 'false', url: '', anonKey: '' }), { mode: 'unconfigured', reason: 'missing-public-config' });
assert.deepEqual(resolveBackendMode({ disabled: 'false', url: 'https://example.supabase.co', anonKey: 'anon' }), { mode: 'supabase', reason: null });
```

Assert browser source contains no `service_role` variable name or key-shaped literal.

- [ ] **Step 2: Verify missing module failure**

Run: `node --test scripts/backendClient.test.mjs`

Expected: FAIL because `backendMode.ts` and backend-client do not exist.

- [ ] **Step 3: Generate and drift-check types**

Run:

```powershell
npx supabase gen types typescript --local | Set-Content supabase\generated-types\database.ts -Encoding utf8
```

Add `backend:types` to repeat this command and `backend:types:check` to generate to `.codex-runtime/database.generated.ts`, compare hashes/content, and delete the temporary file in `finally`.

- [ ] **Step 4: Implement explicit mode resolution**

Export:

```ts
export type BackendMode = 'supabase' | 'local-only' | 'unconfigured';

export const resolveBackendMode = ({ disabled, url, anonKey }: {
  disabled: string | undefined;
  url: string | undefined;
  anonKey: string | undefined;
}): { mode: BackendMode; reason: 'explicitly-disabled' | 'missing-public-config' | null } => {
  if (disabled === 'true') return { mode: 'local-only', reason: 'explicitly-disabled' };
  if (!url || !anonKey) return { mode: 'unconfigured', reason: 'missing-public-config' };
  return { mode: 'supabase', reason: null };
};
```

- [ ] **Step 5: Build the typed client and health result**

`createBackendClient` returns `SupabaseClient<Database> | null`. `getBackendHealth` returns:

```ts
export interface BackendHealth {
  mode: BackendMode;
  configured: boolean;
  authenticated: boolean;
  reachable: boolean | null;
  reason: string | null;
}
```

A network failure sets `reachable: false` and a learner-safe reason; it never falls through as a successful cloud save.

- [ ] **Step 6: Rewire shell client and test**

`apps/shell/src/lib/supabase.ts` imports the typed factory and exports `backendMode`, `isSupabaseConfigured`, and `supabase`. Keep existing import names compatible while consumers migrate.

Run:

```powershell
npm run backend:types:check
node --test scripts/backendClient.test.mjs
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit typed backend foundation**

```powershell
git add supabase/generated-types packages/backend-client apps/shell/src/config/backendMode.ts apps/shell/src/lib/supabase.ts scripts/backendClient.test.mjs package.json package-lock.json
git commit -m "feat: add typed backend client and explicit modes"
```

### Task 3: Make rewards server-authoritative and reconcile existing totals

Begin this task only after the game workstream has assigned an explicit reward code and fixed value to every current points-producing event. Backend Tasks 1 and 2 may land earlier.

**Files:**
- Create: `supabase/migrations/20260805000200_authoritative_rewards.sql`
- Create: `supabase/tests/points_authorization.test.sql`
- Create: `packages/backend-client/src/points.ts`
- Modify: `apps/shell/src/context/PointsContext.tsx`
- Modify: `packages/game-sdk/src/protocol.ts`
- Modify: `apps/shell/src/features/games/GameHostBridge.ts`
- Create: `scripts/pointsContract.test.mjs`
- Create: `scripts/reconcile-points.mjs`

**Interfaces:**
- Consumes: `{ gameId, sessionId, eventId, rewardCode, metadata }`.
- Produces: idempotent `apply_game_reward` result `{ accepted, totalPoints, reason }` with server-owned point values.

- [ ] **Step 1: Write failing SQL authorization tests**

pgTAP tests must prove:

- authenticated users can select only their own totals/events;
- direct insert/update/delete on totals and direct insert on events fail;
- anonymous RPC calls fail;
- unknown/disabled reward codes return `unknown_reward` without an event;
- a valid code uses the database value, not a client-supplied amount;
- duplicate `(user_id, game_id, session_id, event_id)` returns the unchanged total;
- negative rewards cannot reduce totals below zero.

- [ ] **Step 2: Verify current permissive policies fail the contract**

Run: `npm run backend:test`

Expected: FAIL on direct points insert/update and fixed reward-code behavior.

- [ ] **Step 3: Add server-owned reward rules**

Create table:

```sql
create table public.game_reward_rules (
  game_id text not null,
  reward_code text not null,
  points integer not null check (points between -1000 and 1000 and points <> 0),
  enabled boolean not null default true,
  primary key (game_id, reward_code)
);

alter table public.game_reward_rules enable row level security;
create policy "Authenticated users can read enabled reward rules"
  on public.game_reward_rules for select to authenticated
  using (enabled = true);
```

Seed one explicit rule for every reward code observed in the packaged game manifests. Keep seed statements in this migration so clean replay and connected deployment agree.

- [ ] **Step 4: Replace arbitrary delta RPC with fixed reward-code RPC**

Create `public.apply_game_reward(p_game_id text, p_session_id text, p_event_id text, p_reward_code text, p_metadata jsonb default '{}'::jsonb, p_occurred_at timestamptz default now())`, `security definer`, `set search_path = pg_catalog, public`.

It gets `auth.uid()`, locks/creates the user's total, reads the enabled rule, inserts one immutable event including `reward_code`, applies the fixed rule value atomically, and returns `accepted`, `total_points`, `reason`. Revoke all direct mutation policies on totals/events. Revoke function execution from `public` and `anon`; grant only to `authenticated`.

- [ ] **Step 5: Add reconciliation before enforcement**

`scripts/reconcile-points.mjs` runs read-only by default and outputs per user `{ storedTotal, eventTotal, difference }` plus aggregate counts. It requires `--apply` before any repair and refuses `--apply` unless `CONFIRM_POINTS_RECONCILIATION=I_HAVE_A_BACKUP`. The migration itself does not rewrite existing totals.

- [ ] **Step 6: Update TypeScript reward interfaces consistently**

Change `rewards.apply` payload to:

```ts
{ sessionId: string; eventId: string; rewardCode: string; metadata?: Record<string, unknown> }
```

Expose:

```ts
export interface ApplyRewardInput { gameId: string; sessionId: string; eventId: string; rewardCode: string; metadata?: Record<string, unknown> }
export interface ApplyRewardResult { accepted: boolean; totalPoints: number; reason: string | null }
export interface PointsService { applyReward(input: ApplyRewardInput): Promise<ApplyRewardResult> }
```

Update `PointsContext` and `GameHostBridge` to call the typed service. Guest mode resolves manifest-declared reward values locally under a user-scoped guest key; authenticated mode never supplies a points amount.

- [ ] **Step 7: Run local database and app contracts**

Run:

```powershell
npm run backend:reset
npm run backend:test
node --test scripts/pointsContract.test.mjs scripts/gameSdk.test.mjs scripts/gameHostBridge.test.mjs
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit authoritative rewards**

```powershell
git add supabase/migrations/20260805000200_authoritative_rewards.sql supabase/tests/points_authorization.test.sql packages/backend-client/src/points.ts apps/shell/src/context/PointsContext.tsx packages/game-sdk/src/protocol.ts apps/shell/src/features/games/GameHostBridge.ts scripts/pointsContract.test.mjs scripts/reconcile-points.mjs
git commit -m "security: make game rewards server authoritative"
```

### Task 4: Move classroom and content writes behind authorized services

**Files:**
- Create: `supabase/migrations/20260805000300_authorized_classroom_content.sql`
- Create: `supabase/tests/classroom_authorization.test.sql`
- Create: `supabase/tests/content_authorization.test.sql`
- Create: `packages/backend-client/src/classroom.ts`
- Create: `packages/backend-client/src/content.ts`
- Create: `packages/backend-client/src/storage.ts`
- Modify: `apps/shell/src/features/classroom/ClassroomHostBridge.ts`
- Modify: `apps/shell/src/hooks/useHomepageCatalog.ts`
- Modify: `apps/shell/src/hooks/useManagerConfig.ts`

**Interfaces:**
- Consumes: authenticated user and manager claims already used by current schema.
- Produces: revision-aware classroom state service and manager-authorized content/storage services.

- [ ] **Step 1: Write failing role-matrix SQL tests**

Test anonymous/learner/manager behavior for `user_classroom_states`, `classroom_global_states`, `homepage_prop_categories`, `homepage_props`, and managed storage metadata. Learners can read allowed global state and mutate only their learner state. Managers can mutate global/catalog state. Revoked manager claims immediately lose write access.

- [ ] **Step 2: Add revision-safe classroom RPCs**

Add a `revision uuid not null default gen_random_uuid()` column to classroom state tables. Create `save_classroom_global_state(p_app_id text, p_state jsonb, p_expected_revision uuid)` that checks manager authorization, updates only when revision matches, and returns `conflict` with current revision otherwise. Create the learner equivalent scoped to `auth.uid()`.

- [ ] **Step 3: Implement typed services**

`createClassroomStateService(client)` implements the exact `ClassroomStateService` from the classroom plan. `createContentService(client)` and `createStorageService(client)` expose only operations already needed by manager/catalog hooks and return typed errors `{ code, message, retryable }`.

- [ ] **Step 4: Rewire consumers without UI redesign**

Replace direct `.from()`/`.storage` calls in the three consumers with services. Keep loading, success, and error UI behavior. On revision conflict, reload the current state and show the existing recoverable error surface; do not silently overwrite.

- [ ] **Step 5: Run authorization and consumer checks**

Run:

```powershell
npm run backend:reset
npm run backend:test
npm run typecheck
npm run check:classroom
npm run build
```

Expected: all role tests and app checks pass.

- [ ] **Step 6: Commit service boundaries**

```powershell
git add supabase/migrations/20260805000300_authorized_classroom_content.sql supabase/tests packages/backend-client apps/shell/src/features/classroom apps/shell/src/hooks/useHomepageCatalog.ts apps/shell/src/hooks/useManagerConfig.ts
git commit -m "security: enforce backend service authorization"
```

### Task 5: Verify connected backend and web/native parity safely

**Files:**
- Create: `scripts/backend-smoke.mjs`
- Create: `scripts/backendEnvironment.test.mjs`
- Modify: `scripts/Build-AndroidRelease.ps1`
- Create: `docs/project/runbooks/backend.md`
- Create: `docs/project/quality/backend.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: public Supabase configuration and a dedicated test login when available.
- Produces: read-only/default backend health proof plus explicit opt-in test mutations in a test account.

- [ ] **Step 1: Write build-environment parity tests**

Assert Android release no longer hard-codes `VITE_SUPABASE_DISABLED='true'`. Assert web and Android accept `VITE_BACKEND_MODE` values `supabase` or `local-only`, reject unknown values, and include backend mode in `app-version.json` without including URL keys or secrets.

- [ ] **Step 2: Verify current Android divergence fails**

Run: `node --test scripts/backendEnvironment.test.mjs`

Expected: FAIL on the current Android `VITE_SUPABASE_DISABLED` behavior.

- [ ] **Step 3: Implement safe smoke modes**

`backend-smoke.mjs` defaults to `--read-only`: fetch public health, verify auth endpoint reachability, and confirm required RPC/table names through safe calls. `--test-account` may sign in with `BACKEND_SMOKE_EMAIL`/`BACKEND_SMOKE_PASSWORD`, write one idempotent reward event using a dedicated smoke rule, read it, and sign out. It never prints credentials/tokens and refuses test-account mode against an unapproved project ref not listed in `BACKEND_SMOKE_ALLOWED_PROJECTS`.

- [ ] **Step 4: Align release configuration**

`Build-AndroidRelease.ps1` requires explicit `VITE_BACKEND_MODE`. In `supabase` mode it requires public URL/anon key; in `local-only` mode it sets disabled behavior deliberately and stamps that mode. GitHub Pages uses `supabase` mode. No mode silently changes based on a missing variable.

- [ ] **Step 5: Run local, connected read-only, and optional test-account checks**

Run:

```powershell
npm run backend:reset
npm run backend:test
node scripts/backend-smoke.mjs --read-only
node --test scripts/backendEnvironment.test.mjs
npm run build
```

If approved test credentials exist, additionally run `node scripts/backend-smoke.mjs --test-account`. Record exact project ref, mode, command, timestamp, and redacted result. If credentials are absent, mark connected authenticated mutation proof as not executed.

- [ ] **Step 6: Define the workstream gate and commit evidence**

Add:

```json
"check:backend": "node --test scripts/supabaseMigrations.test.mjs scripts/backendClient.test.mjs scripts/pointsContract.test.mjs scripts/backendEnvironment.test.mjs && npm run backend:types:check && npm run backend:test && npm run typecheck"
```

Write `backend.md` with migration replay, pgTAP count, RLS matrix, reconciliation summary, backend mode parity, connected read-only result, and test-account result.

```powershell
git add scripts/backend-smoke.mjs scripts/backendEnvironment.test.mjs scripts/Build-AndroidRelease.ps1 docs/project/runbooks/backend.md docs/project/quality/backend.md package.json
git commit -m "test: verify backend and release configuration parity"
```
