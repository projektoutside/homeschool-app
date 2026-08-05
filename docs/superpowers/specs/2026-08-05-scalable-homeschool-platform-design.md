# Scalable Homeschool Platform Design

**Status:** Approved by the product owner on 2026-08-05
**Scope:** Repository architecture, mini-game extensibility, classroom extensibility, backend integrity, asset delivery, cross-device quality, and durable project organization

## Executive decision

La's Homeschool Hub will evolve through a compatibility-first modular monorepo migration. The existing React, TypeScript, Vite, Capacitor, Supabase, iframe, and browser-game foundations remain in place. They will be reorganized behind typed manifests, generated catalogs, versioned SDKs, isolated builds, backend service boundaries, and repeatable templates.

This is not a big-bang rewrite. Current URLs and working behavior remain available while individual games, classroom experiences, and backend capabilities migrate in verified slices. A legacy path may be retired only after its replacement passes contract, integration, browser, native, and compatibility checks appropriate to that path.

The completion standard is **No Known In-Scope Risk** based on recorded evidence. It does not mean literal perfection or zero future defects.

## Objective

Create a platform that lets a developer safely add and maintain:

- 2D games using Phaser, Canvas, DOM, or React;
- 3D games using Three.js, React Three Fiber, or another browser-compatible runtime;
- self-contained educational activities that do not need a game engine;
- new classrooms, rooms, lessons, portals, NPCs, and interactive stations;
- shared authentication, profiles, rewards, storage, audio, accessibility, and diagnostics;
- web, GitHub Pages, Android, and eventually fully verified iOS releases;
- secure, migration-driven Supabase features with consistent web/native behavior.

The platform must reduce the number of files a new feature must edit, eliminate hand-maintained game-specific branches in the app shell, keep heavy content out of boot-critical bundles, and make regressions discoverable before deployment.

## Current-state evidence

The migration is justified by observed repository conditions as of 2026-08-05:

- The repository has a React/Vite shell plus large independently authored applications and games under `public/`.
- `public/` is approximately 650.5 MB across 1,039 files. The current `dist/` snapshot is approximately 674.75 MB across 1,071 files.
- The root build has one game-specific build step, `build:quiz-it-polygon`, rather than a general game build pipeline.
- The game catalog includes 81 entries, but classification and special handling still appear in shell code, including `SINGLE_PLAYER_GAME_IDS` in `Home.tsx` and game-specific branches in `GamePlayer.tsx`.
- `GamePlayer.tsx` contains specialized Car King and Word Puzzle message handling instead of consuming one versioned game contract.
- Multiple iframe surfaces request broad permissions and use different sandbox configurations. These permissions are not yet generated from per-experience capability declarations.
- Some games fetch runtime code from third-party CDNs, reducing offline reliability, reproducibility, and control over shipped code.
- Supabase is represented by a large `supabase/schema.sql` snapshot rather than an ordered migration history.
- The current points table policies allow users to insert and update their own aggregate total. Reward mutations therefore need a server-authoritative boundary.
- Web and native builds can use different Supabase behavior, so environment parity is not yet an enforced release contract.
- GitHub Pages CI currently installs dependencies and builds, but does not run the repository's lint, test, registry audit, or asset audit gates.
- ESLint ignores `dist` and direct Android build folders but can still scan generated content inside `.worktrees`, making the full check unreliable.
- The active Android asset pack remains `fast-follow`.
- Existing Android staging places complete game directories into an asset pack. The target architecture must distinguish executable application code from downloadable media assets.
- The working tree already contains unrelated generated changes in `android/app/capacitor.build.gradle` and `android/capacitor.settings.gradle`; the migration must preserve them unless independently proven necessary.

## Constraints

- Preserve existing routes, game IDs, content IDs, saves, reward semantics, classroom behavior, and public user flows unless a change is explicitly approved.
- Preserve the existing technology stack unless a bounded migration step proves a replacement necessary.
- Keep browser and GitHub Pages deployment working throughout the migration.
- Keep Capacitor shell behavior compatible with Android and avoid pretending Windows can complete physical iOS verification.
- Do not place executable code in Google Play Asset Delivery packs. Asset packs are reserved for media and other non-executable assets.
- Do not require all games to use one rendering engine.
- Do not grant every game every browser permission.
- Do not make direct client writes authoritative for points, rewards, privileged classroom state, or administrative content.
- Avoid dependency churn, speculative infrastructure, and a build orchestrator until repository scale demonstrates a need.
- Preserve unrelated user changes and keep each migration slice independently reversible.

## Alternatives considered

### 1. Compatibility-first modular monorepo — selected

Introduce manifests, SDKs, templates, generated registries, and workspace boundaries beside current implementations. Migrate representative experiences first and retain compatibility adapters until all consumers move.

This has the best balance of maintainability, shared tooling, atomic cross-package changes, and regression control.

### 2. Big-bang rewrite — rejected

A clean rewrite could remove historical structure quickly, but it would combine shell, routing, game, classroom, storage, backend, native, and content risks into one release. Existing games contain specialized behavior that would be easy to miss and difficult to compare after a wholesale replacement.

### 3. Repository per game — deferred

Separate repositories provide strong ownership isolation but add dependency synchronization, version coordination, deployment, testing, and discovery overhead. This is unnecessary at the current team and release scale. A future extraction remains possible because every game will have a package boundary and a versioned SDK contract.

## Target repository topology

```text
apps/
  shell/
  classroom/

games/
  <game-id>/
    game.manifest.json
    package.json
    src/
    assets/
    tests/

classrooms/
  <classroom-id>/
    classroom.manifest.json
    package.json
    scenes/
    stations/
    lessons/
    assets/
    tests/

packages/
  game-sdk/
  classroom-sdk/
  runtime-2d/
  runtime-3d/
  content-schema/
  shared-ui/
  shared-audio/
  backend-client/
  testing/

templates/
  game-2d/
  game-3d/
  game-canvas/
  classroom/
  classroom-station/

supabase/
  migrations/
  functions/
  tests/
  generated-types/

scripts/
  create-game/
  create-classroom/
  build-content/
  verify-content/
  stage-native-assets/

docs/project/
  architecture/
  decisions/
  inventory/
  workstreams/
  prompts/
  runbooks/
  quality/
```

The root will use npm workspaces initially. Existing npm usage remains familiar, and adding Turborepo or another task graph is deferred until build duration or package count provides measurable justification.

During migration, legacy `src/` and `public/` paths may coexist with the target structure. Compatibility mappings keep existing routes alive. The root cannot be declared migrated merely because the new folders exist; production consumers must actually use them.

## Architectural boundaries

### App shell

`apps/shell` owns routing, authentication boot, learner selection, global navigation, content discovery, install/update behavior, and host-level error recovery. It must not contain game-specific scoring logic or engine-specific implementation branches.

The shell consumes a generated content catalog and launches an experience based on its manifest. Existing URLs map to the same IDs through compatibility aliases.

### Game packages

Each game is independently buildable and testable. A game owns its source, local assets, engine dependencies, game rules, and game-specific tests. It may not import private shell internals or write directly to privileged backend tables.

Games communicate with the host through `@homeschool/game-sdk`. Games running in iframes use a versioned `postMessage` transport. Games embedded directly in React use the same public interface through an in-process transport. This preserves isolation without forcing one rendering approach.

### Classroom packages

`apps/classroom` owns the shared classroom host: scene lifecycle, navigation, camera policy, learner/avatar context, persistence hooks, loading/error surfaces, and station activation.

Each entry under `classrooms/` declares rooms and capabilities. A classroom may contribute:

- scene modules;
- portals and room transitions;
- lesson sequences;
- 2D or 3D activity stations;
- NPC and interaction definitions;
- media bundles;
- local and synchronized state schemas.

Classroom implementations consume `@homeschool/classroom-sdk` instead of reaching into shell components. A station may launch any registered game or provide its own bounded activity.

### Shared packages

Shared packages contain stable cross-experience capabilities, not arbitrary convenience code. New shared abstractions require at least two real consumers or a clear platform contract.

- `content-schema`: manifest schemas, validation, and generated catalog types.
- `game-sdk`: framework-neutral host/game protocol.
- `classroom-sdk`: room, station, lesson, and persistence contracts.
- `runtime-2d`: optional helpers for Phaser/Canvas lifecycle and resizing.
- `runtime-3d`: optional helpers for render-loop lifecycle, resize, visibility pause, disposal, and performance diagnostics.
- `shared-ui`: accessible host-level primitives and loading/error surfaces.
- `shared-audio`: user-gesture-safe audio policy and settings synchronization.
- `backend-client`: typed, narrow service APIs over Supabase and Edge Functions.
- `testing`: manifest fixtures, SDK contract harnesses, launch probes, and cross-device helpers.

## Manifest-driven discovery

### Game manifest

Every game has a validated manifest with at least:

```json
{
  "schemaVersion": 1,
  "id": "example-game",
  "title": "Example Game",
  "version": "1.0.0",
  "entry": "./src/main.ts",
  "classification": ["math", "single-player"],
  "runtime": "phaser",
  "orientation": "any",
  "responsive": true,
  "capabilities": ["rewards", "storage", "audio"],
  "permissions": [],
  "delivery": {
    "web": "bundled",
    "androidMedia": "install-time"
  },
  "compatibility": {
    "legacyPaths": ["/Games/Example/index.html"],
    "protocolVersion": 1
  }
}
```

The final schema also covers thumbnail, description, grade/subject metadata, accessibility notes, input modes, network requirements, estimated media size, offline support, and health-check timeout.

Only declared capabilities are exposed. For example, microphone access requires a manifest declaration, a valid learning reason, host policy approval, and user/platform consent. Iframe `allow` and `sandbox` attributes are generated from policy rather than copied as broad defaults.

### Classroom manifest

Each classroom manifest declares:

- stable classroom ID and version;
- entry scene and available rooms;
- room-to-room navigation;
- stations and linked game/content IDs;
- required 2D/3D runtime features;
- camera and orientation policy;
- local, learner, shared, and manager-controlled state fields;
- media bundles and delivery classification;
- permissions and device capabilities;
- accessibility and reduced-motion alternatives;
- compatibility aliases and protocol version.

### Generated catalog

`scripts/build-content` discovers manifests, validates them against the content schema, rejects duplicate IDs and paths, calculates asset metadata, and writes deterministic generated catalogs consumed by the shell and build pipeline.

Generated output is never edited by hand. The existing catalog remains the compatibility source until parity tests show that the generated catalog contains the same user-visible entries and metadata.

## Game SDK contract

The first stable protocol supports:

- `ready` and host initialization;
- learner-safe public context;
- points/reward requests and results;
- scoped storage read/write/remove;
- sound, music, reduced-motion, contrast, and text preferences;
- pause, resume, visibility, and teardown;
- fullscreen and orientation requests;
- exit and navigation requests;
- speech/camera/microphone capability requests;
- structured errors and diagnostics;
- protocol negotiation and unsupported-version handling.

Messages use a discriminated union with a request ID, protocol version, game ID, message type, and validated payload. The host rejects malformed messages, unknown origins, mismatched game IDs, unsupported versions, undeclared capabilities, and unauthorized operations.

The SDK provides compatibility adapters for existing Car King and Word Puzzle bridges. The adapters preserve current behavior while emitting the standard protocol. They are deleted only when the games natively consume the SDK.

## Classroom SDK contract

The classroom SDK supports:

- register/unregister lifecycle;
- room load, activate, pause, resume, and dispose;
- station registration and activation;
- portal and navigation events;
- learner/avatar context;
- scoped persistent state;
- manager-controlled shared state;
- lesson progress and completion;
- game launch through catalog IDs;
- render-quality hints and performance telemetry;
- capability negotiation for input, audio, fullscreen, and sensors.

3D modules must clean up animation frames, event listeners, textures, geometries, materials, audio nodes, and renderer resources on disposal. Hidden scenes pause expensive work. Scene loading failures render a recoverable host surface rather than a blank canvas.

## Backend architecture

### Migration-driven schema

`supabase/schema.sql` remains a reference snapshot during transition, but all new changes are expressed as ordered migrations. Existing schema is baselined once, then replay-tested into a clean local Supabase environment when the required local tooling is available.

Generated database types are checked for drift in CI. Application code uses the generated types through `backend-client` rather than repeating table shapes.

### Service boundaries

The app consumes narrow services for:

- authentication and profiles;
- learner/classroom state;
- content management;
- progress and achievements;
- rewards and points;
- storage uploads and asset metadata;
- diagnostics and health checks.

Services support authenticated Supabase mode and intentional local/guest mode. Disabled or missing backend configuration is explicit in diagnostics; it is not silently presented as a successful cloud save.

### Authoritative rewards

Clients submit an idempotent reward event or completion claim. A database function or Edge Function validates the authenticated learner, game, allowed reward, replay/idempotency key, and applicable rate limits. It appends an immutable ledger event and derives or atomically updates the total.

Clients cannot directly choose an arbitrary aggregate point balance. Existing balances are preserved during migration, and a reconciliation report compares legacy totals with derived totals before enforcement changes ship.

### Authorization and data integrity

Every exposed table receives explicit RLS tests for anonymous, guest/local, learner, manager, and service-role behavior as applicable. Privileged classroom/global state and administrative catalog writes require manager authorization at the database boundary, not only hidden UI controls.

Migrations include constraints, indexes, ownership, grants, policies, and rollback notes. Destructive migrations require backup and data-validation gates.

### Environment parity

Web and native releases use the same documented configuration contract. Build metadata records whether Supabase is enabled, which public project URL is targeted, and which app mode is active without exposing secrets.

Native release builds may support an intentional offline edition, but it must be a named product mode with tests and visible diagnostics, not an accidental environment difference.

## Asset and dependency strategy

### Executable code

HTML, JavaScript, WebAssembly, shaders compiled as application code, and runtime libraries ship with the versioned application bundle. Production games cannot execute newly downloaded arbitrary code from an asset pack or unpinned public CDN.

Third-party runtime dependencies are installed, pinned, bundled, and included in software/license review. Existing CDN-dependent games migrate incrementally and retain a compatibility fallback until their bundled build is proven.

### Media

Images, audio, video, models, and other non-executable media are classified by boot requirement and platform:

- shell-critical media stays in the base bundle;
- game/classroom media is lazy-loaded by experience;
- Android may use install-time, fast-follow, or on-demand Play Asset Delivery media packs according to measured size and first-use needs;
- web may use versioned object storage/CDN delivery for heavy optional media;
- offline-required bundles include integrity metadata and a predictable missing-media recovery surface.

The existing `game_assets` work is not adopted unchanged because it stages complete executable game directories. Its useful native download and path-resolution concepts may be retained after the staging boundary is corrected.

Duplicate and orphaned assets are reported before removal. No material deletion occurs without reference analysis and a recoverable migration.

## Build and continuous integration

Root scripts become consistent contracts:

- `npm run dev`: run the shell and watch affected workspace content;
- `npm run build`: build all production workspaces and generated catalogs;
- `npm run typecheck`: type-check without emitting;
- `npm run lint`: lint owned source while excluding generated outputs and worktrees;
- `npm test`: run unit and contract tests;
- `npm run test:integration`: run SDK, manifest, and backend integration tests;
- `npm run test:e2e`: run shell/content launch smoke tests;
- `npm run audit:content`: validate catalog, paths, permissions, and IDs;
- `npm run audit:assets`: report missing, duplicate, oversized, and forbidden assets;
- `npm run check`: run the required merge gate without redundant nested commands.

CI separates validation from deployment. Pull requests run install, generated-file drift, typecheck, lint, unit/contract tests, catalog audit, asset policy checks, production build, and representative browser smoke tests. Deployment consumes the already validated build configuration and verifies the published version.

Every registered experience receives a lightweight launch probe. Representative 2D, 3D, classroom, backend, and permission-dependent experiences receive deeper interactions.

## Creation workflows

### Create a game

`npm run create:game` asks for stable ID, title, runtime, classification, orientation, capabilities, permissions, and offline needs. It copies the closest template, creates the manifest and package, registers initial tests, and runs focused validation.

A newly generated game must appear in a development catalog without a manual edit to `Home.tsx`, `GamePlayer.tsx`, or a central ID list.

### Create a classroom

`npm run create:classroom` creates a manifest, initial scene, station registry, lifecycle tests, responsive loading/error surface, and documentation. `npm run create:station` adds a station that can launch existing catalog content or host a bounded new activity.

Templates include disposal, pause/resume, resizing, touch, keyboard, reduced-motion, and diagnostics behavior appropriate to their runtime.

## Compatibility and migration sequence

### Phase 0: Baseline and guardrails

- Record all routes, catalog entries, runnable games, classroom paths, backend tables/functions, native build modes, and asset sizes.
- Fix lint ownership so `.worktrees` and generated outputs cannot break the repository check.
- Add explicit typecheck, test, audit, and CI gates without reorganizing runtime code.
- Add browser launch probes for the current shell and every registered game.
- Capture representative desktop and responsive screenshots plus console/network baselines.

Exit gate: current behavior has a reproducible baseline, and the new checks pass or have documented pre-existing failures with owners.

### Phase 1: Workspace and content foundation

- Enable npm workspaces.
- Add `content-schema`, manifest validators, and deterministic generated catalogs.
- Model the existing catalog without moving game source.
- Add compatibility aliases for existing routes and IDs.

Exit gate: generated and legacy catalogs have user-visible parity, and all old routes still resolve.

### Phase 2: SDK and representative migrations

- Implement the framework-neutral game protocol and host bridge.
- Migrate one small 2D game and one representative 3D game.
- Adapt Car King and Word Puzzle special behavior through compatibility bridges.
- Create 2D, 3D, and Canvas/DOM templates plus `create:game`.

Exit gate: representative games pass lifecycle, reward, storage, audio, navigation, and cross-device checks; creating a new game needs no shell-specific branch.

### Phase 3: Classroom platform

- Extract shared classroom host behavior.
- Implement classroom manifests and SDK.
- Migrate one real room and one station before expanding the model.
- Add classroom and station generators.

Exit gate: the migrated classroom behaves equivalently, and a new room/station can be introduced without editing the host's private implementation.

### Phase 4: Backend integrity

- Baseline the current schema into migrations.
- Generate typed database contracts.
- Introduce backend service boundaries.
- Implement authoritative, idempotent reward writes and reconciliation.
- Add RLS and integration tests.
- Align web/native environment behavior.

Exit gate: clean migration replay, authorization matrix, existing data reconciliation, guest/local behavior, and connected-environment smoke tests pass.

### Phase 5: Remaining content and asset migration

- Move remaining game/classroom source into owned packages in bounded batches.
- Bundle pinned runtime dependencies.
- Separate executable bundles from large media.
- Deduplicate and relocate media only after reference/integrity checks.
- Redesign Android asset staging around non-executable media bundles.

Exit gate: no registered experience depends on an unowned public source tree or unpinned runtime CDN, and platform-specific packages meet their delivery contracts.

### Phase 6: Release hardening and legacy retirement

- Remove compatibility code only after all callers migrate.
- Run the complete Tier 3 matrix.
- Inspect web artifacts and signed native artifacts.
- Verify the deployed site and available backend environment.
- Update architecture, runbooks, prompts, and decision records.

Exit gate: the release checklist has no known in-scope failure, the rollback path is documented, and remaining physical-device limitations are explicitly reported.

## Cross-device quality gate

This is Tier 3 work. Validation covers the affected surface at these reference sizes:

| Surface | Reference | Required focus |
| --- | ---: | --- |
| Desktop | 1440 x 900 | keyboard, mouse, focus, routing, fullscreen, iframe lifecycle |
| Android phone | 393 x 852 | touch, safe areas, back behavior, audio unlock, performance |
| iPhone | 390 x 844 | Safari-sensitive layout, viewport, audio/fullscreen fallbacks |
| Tablet portrait | 1024 x 1366 | responsive classroom/game composition |
| Tablet landscape | 1366 x 1024 | wide scene layout and controls |
| Phone landscape | device-appropriate | orientation-sensitive games and classrooms |

Additional checks include:

- 2D input, scaling, pause/resume, and resize;
- 3D render-loop stability, scene disposal, memory pressure, and WebGL recovery;
- touch target size, gesture conflicts, keyboard parity, and reduced motion;
- audio user-gesture restrictions and speech/microphone permission denial;
- iframe standalone/embedded behavior and least-privilege permissions;
- fullscreen entry/exit and safe-area behavior;
- Capacitor back button, resume, deep link, and native asset availability;
- offline and slow-network recovery;
- authenticated, guest, expired-session, and unauthorized backend paths.

Final reporting separates physical-device tests, emulation, browser automation, build inspection, and code review. iPhone/iPad physical testing cannot be claimed from Windows unless a real remote device path is available.

## Project documentation system

`docs/project/README.md` becomes the entry point and links to:

- current architecture and diagrams;
- content/game/classroom inventory;
- migration roadmap and status;
- workstream ownership and dependencies;
- architecture decision records;
- development and release runbooks;
- reusable prompting guides;
- quality gates and evidence;
- backend environment and migration procedures;
- asset budgets and delivery policy.

Documentation must describe current truth, target truth, and migration state separately. Generated inventory is preferred where facts can drift.

## Codex task organization

The saved project receives these pinned user-owned Codex tasks:

1. `00 - Homeschool Platform Master Integration`
2. `01 - Platform Foundations, Catalog, and CI`
3. `02 - Game SDK, Templates, and Game Migration`
4. `03 - Classroom SDK and Expandable Experiences`
5. `04 - Supabase Backend and Data Integrity`
6. `05 - Assets, Performance, Web, Android, and iOS`
7. `06 - Cross-Device QA and Release Verification`

Each task prompt identifies:

- objective and exact owned paths;
- dependencies and prerequisite gates;
- preserved behavior and prohibited changes;
- acceptance criteria;
- required commands and real-path verification;
- cross-device expectations;
- handoff evidence and known-risk format;
- instruction not to overwrite work from other tasks.

The master integration task owns sequencing, architecture decisions, conflict resolution, combined verification, and release readiness. Workstream tasks do not independently publish or retire compatibility layers.

Separate Codex tasks are organizational workspaces for the user, not proof that integration is complete. Changes enter the main line only through reviewed, verified migration slices.

## Acceptance criteria

### Existing behavior

- All existing catalog entries retain stable IDs or an explicit compatibility alias.
- Existing public routes continue to open the intended content.
- Representative and high-risk games retain controls, scoring, persistence, audio, speech, fullscreen, orientation, exit, and error recovery.
- Existing classroom state, navigation, manager behavior, and embedded activities retain their intended behavior.

### Extensibility

- A generated 2D game builds, registers, launches, communicates with the host, and passes template tests.
- A generated 3D game does the same and demonstrates clean renderer/resource teardown.
- A generated classroom and station register without editing private host code.
- Adding an experience does not require adding its ID to shell conditionals.

### Backend

- The schema replays from ordered migrations in a clean environment.
- Generated types match the database schema.
- Auth, profiles, classroom state, content, storage, progress, and rewards pass focused integration tests.
- Unauthorized data access and arbitrary point-total writes are rejected.
- Existing totals reconcile before authoritative reward enforcement.
- Web and native configuration modes are explicit and tested.

### Delivery and quality

- CI enforces type, lint, test, manifest, asset, build, and representative browser gates.
- Production runtime code has pinned build inputs and no undeclared CDN dependency.
- Android asset packs contain only valid non-executable assets.
- Heavy media is lazy and integrity-checked where applicable.
- Web, Android, and available iOS checks are reported truthfully.
- The Tier 3 device matrix is completed to the extent tooling and physical devices permit, with untested physical paths named as remaining limitations.

### Organization

- `docs/project/` provides a usable project entry point, architecture map, workstreams, prompts, runbooks, and quality evidence.
- The seven approved Codex tasks exist, are named consistently, pinned, and contain bounded prompts.
- Every workstream has an owner, dependencies, exit gate, and handoff format.

## Rollback and safety

- Each phase is independently buildable and reviewable.
- Compatibility adapters remain until parity is proven.
- Catalog generation initially compares against, rather than replaces, legacy data.
- Backend enforcement follows data reconciliation and can be rolled out behind a bounded compatibility path.
- Asset moves use checksums and reference reports; source files are not removed in the same unverified step that introduces new delivery.
- Releases retain the previous verified artifact and database rollback notes.
- No broad file deletion, destructive Git operation, production-data mutation, or live publish is implied by this design.

## Risks and mitigations

- **Hidden game-specific behavior:** baseline launch and interaction contracts before moving each game.
- **Catalog drift:** deterministic generation plus legacy-parity checks.
- **Protocol fragmentation:** one versioned SDK with adapters and negotiation.
- **3D resource leaks:** lifecycle contract, disposal helpers, stress checks, and visibility pause.
- **Backend data loss or reward changes:** immutable events, reconciliation, idempotency, and staged enforcement.
- **Oversized builds:** per-package and media inventories, lazy loading, and artifact inspection.
- **Android delivery regression:** executable/media separation and final bundle inspection.
- **iOS uncertainty from Windows:** code/build review where possible and explicit physical-device follow-up.
- **Long migration duration:** bounded vertical slices, compatibility layers, explicit exit gates, and master integration ownership.
- **Parallel work conflicts:** path ownership, task dependencies, no independent publication, and integration review.

## Out of scope without a separate product decision

- Replacing Supabase with another backend.
- Replacing React/Vite/Capacitor as the shell stack.
- Forcing every 2D or 3D experience onto one engine.
- Redesigning the app's visual identity or learning content.
- Splitting every game into a separate repository.
- Production release, paid CDN purchase, irreversible data deletion, or production-data migration without the required release and safety gates.

## Assumptions

- The current repository remains the source of truth for the shell, games, classrooms, native wrappers, and backend schema.
- Stable IDs and URLs matter more than preserving every internal file path.
- npm workspaces are sufficient for the first platform phase.
- Existing browser games can be adapted to a typed host protocol without changing their learning rules.
- Connected Supabase and store verification will use existing authorized environments when accessible; missing credentials or store access will be reported as an external verification limitation, not hidden.
- Physical Apple-device verification may require a later macOS or remote-device handoff.

## Finish criteria

The restructuring is finished only when the acceptance criteria are met, the complete diff and working tree have been reviewed, the required checks have been rerun after fixes, representative real user paths have been exercised, backend evidence is recorded, project documentation matches current truth, and no known in-scope risk remains.
