# La's Homeschool App

Root workspace for the homeschool platform.

This repository contains:

- A root Vite + React + TypeScript app in `src/`
- A large static content library in `public/` for games, worksheets, tools, and classroom assets
- Supabase-backed authentication and per-user manager configuration
- A shared authenticated single-player points system that rolls game rewards into the main app dock
- GitHub Pages deployment for the root app

## Architecture Notes

The root app is the active development workspace for ongoing edits.

- `src/` contains the React application, routing, auth flow, shared hooks, and UI.
- `src/context/PointsContext.tsx` is the root points provider used by the main app shell, `GamePlayer`, and the bottom gold panel.
- `src/context/StaminaContext.tsx` is the shared per-user stamina provider used by the game launch flow and the HomePageAPP HUD.
- `src/pages/GamePlayer.tsx` is the host bridge for single-player iframe games and is responsible for syncing per-user totals into the embedded games.
- `public/` contains standalone static experiences and asset-heavy content that the root app launches or embeds.
- `public/Games/shared/lahsPointsBridge.js` is the shared browser bridge that single-player games use to request context and emit point awards back to the host.
- `scripts/vite/contentManagerPlugin.ts` adds local dev-only endpoints that can write content changes back into the repo.
- `public/3dClass/` and some other folders contain their own nested tooling or historical subprojects, but they are not the primary root workflow.

## Single-Player Points System

Single-player games shown in the Games tab now contribute to one cumulative per-user `Total Points` value in the main app.

- The bottom gold panel reads live provider state instead of hardcoded totals.
- The star slot remains visible in the dock, but it is intentionally reserved at `0` in this rollout.
- The host app is the source of truth for live UI state, while Supabase is the canonical persistence layer.
- Game rewards are sent through a `postMessage` bridge so the root app can keep totals consistent across iframe launches, route changes, and reloads.

Current single-player points message contract:

- `LAHS_POINTS_CONTEXT`
- `LAHS_POINTS_EARNED`
- `LAHS_POINTS_ACK`

Important behavior:

- Single-player games can optimistically update the live total through the host without changing multiplayer flows.
- Duplicate point events are ignored through per-session event IDs.
- Replaying a game in a new session can award new points again.
- HomepageAPP Mystery Box pulls now spend `100` points through the same shared provider and Supabase ledger, and pulls are blocked with a user-facing error popup when the user does not have enough points.
- Internal stars that still drive game progression remain in place inside those games; only app-level rewards now map into points in this phase.

## Player Stamina System

All game launches now use one shared per-user stamina pool in the root app.

- Players start at `20/20` stamina.
- Launching any game costs `1` stamina.
- Stamina recharges at `1` point every `10` minutes.
- The current stamina total is shown in HomePageAPP and is enforced by the shared `GamePlayer` route so direct game URLs and normal Games-tab launches follow the same rule.

## Local Setup

### Requirements

- Node.js 20+ recommended
- npm 10+

### Install dependencies

```bash
npm ci
```

### Configure environment variables

Copy `.env.example` to `.env` and set the Supabase values used by the root app:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_3DCLASS_MANAGER_ALLOWLIST=your-manager-username,your-manager@email.com,manager-user-id
```

Notes:

- `VITE_3DCLASS_MANAGER_ALLOWLIST` is optional and is only used for classroom manager access control.
- Local development is intended to stay production-parity for auth. There is no dev-only auth bypass in the root app.
- If Supabase env vars are missing, the app can still boot, but authenticated flows will not work correctly for normal testing.

## Supabase Setup

Run [`supabase/schema.sql`](/C:/Users/xator/Desktop/LatestLa'sHomeschool/homeschool-app/supabase/schema.sql) in the Supabase SQL editor.

This sets up the tables, policies, and RPC required by the current app, including the per-user manager config storage and the single-player points persistence used by the root experience.

For the points system, the schema now includes:

- `public.user_points_totals`
- `public.user_points_events`
- `public.apply_game_points_event(...)`

The points ledger now supports both earning and spending events, while the totals table still enforces a non-negative canonical balance per user.

In the Supabase dashboard:

- Enable Email/Password auth
- Disable email confirmation if you want faster local signup testing
- Keep email confirmation enabled if you want production-like verification behavior

Username sign-in is implemented by converting usernames into a synthetic project-scoped email unless the user enters a real email address directly.

## Root Commands

### Start local development

```bash
npm run dev
```

This starts the root Vite dev server.

Important dev behavior:

- In dev mode, the root app unregisters service workers and clears caches to avoid stale local assets.
- The custom Vite content manager plugin exposes write-capable endpoints during dev. Editing certain content from the UI can update repo files under `src/data/content` or `public/3dClass/`.
- Single-player games launched through the root app can emit point awards into the live bottom dock through the host iframe bridge.

### Run lint

```bash
npm run lint
```

### Run the full root validation check

```bash
npm run check
```

This runs lint plus the production build.

### Run the production build

```bash
npm run build
```

The root build also regenerates the legacy Quiz it Polygon bundle before the Vite production build:

- `public/Games/Quiz it Polygon!/js/app.bundle.js`

### Preview the built app

```bash
npm run preview
```

### Optional live testing helpers

```bash
npm run dev:live
npm run live:start
```

These are optional helpers for remote/live access and are not required for normal root development.

## Deployment

GitHub Pages deployment is handled by [`.github/workflows/deploy.yml`](/C:/Users/xator/Desktop/LatestLa'sHomeschool/homeschool-app/.github/workflows/deploy.yml).

The workflow:

- Runs `npm ci`
- Builds the root app with a repo-aware `BASE_PATH`
- Requires GitHub Actions secrets for Supabase at build time

Add these repository secrets before deploying:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If production shows a Supabase configuration warning, the deploy build likely ran without those secrets.

## Validation Baseline

The current root stabilization baseline is:

- `npm ci`
- `npm run dev`
- `npm run lint`
- `npm run build`

When making meaningful root changes, prefer validating with `npm run check` before pushing.

Manual smoke checks still matter for:

- auth sign-in and sign-up
- protected route access
- classroom launch flow
- game/resource launch URLs
- single-player points flowing from embedded games into the bottom gold panel
- any UI that edits content through dev-only write endpoints

## README Maintenance Policy

Update this README only when there is a significant change to one of these:

- developer setup or required tools
- environment variables
- root scripts or validation workflow
- deployment behavior
- high-level repository architecture

Do not update the README for routine UI tweaks, copy changes, or isolated internal refactors unless they materially change how developers work in this repo.
