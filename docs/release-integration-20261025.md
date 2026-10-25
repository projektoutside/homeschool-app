# Homeschool Hub integration release — 2026-10-25

Release branch: `codex/release-integration-20261025`, based on published main
`321015a2f36a6db4c0fd6806e511c59d8464f700`. Android: **1.0.10 (11)**.

## Included sources

| Source branch | Preserved head | Included work |
| --- | --- | --- |
| `codex/guest-local-progress` | `dd0c344` | Durable device-local guest identity, points and stamina; temporary-save migration. |
| `codex/analog-clock-smoothness` | `b8e241b` | Clock round/lifecycle timing, shop/reward/retry flows and regression tests. |
| `codex/coin-champ-adventure` | `f6f98c2` | Coin Carnival rebuild, menu/countdown, realistic coin drops, three mini games and responsive playtest fixes. |
| Published `main` / detached games worktree | `321015a` | Existing game, classroom, platform, asset-delivery and Pages release improvements. |

The three feature branches form one ancestry stack. Every active branch/worktree
was inspected and clean before integration; no independent unresolved changes or
merge conflicts were found. Archived snapshots were preserved rather than
reintroduced. A verified complete Git bundle, branch refs and checkout inventory
were saved outside the repository before squashing. Original feature refs and
their checkouts remain recoverable; published history is not rewritten.

The integration contains one squash commit above the former published main.
Routine release changes only advance Android beyond the observed Play Internal
version 1.0.9 (10), and update its version-floor regression assertion. Existing
runtime behavior, signing identity, release channels and deployment workflow stay
in place. No new publishing infrastructure or credential changes were introduced.

## Validation and publishing plan

- `npm run check` passed TypeScript, ESLint, **484 tests**, 84 content entries,
  1,145 asset files and the production web build.
- The final Android version assertion additionally passed all 13 Android
  asset-pack contract tests after the metadata bump.
- `npm audit --audit-level=high`: zero high/critical advisories; three existing
  moderate tooling advisories remain. The build retains its large-chunk advisory.
- Integrated production-build journeys passed desktop Chrome, Android viewport
  Chrome, and phone/tablet WebKit checks for local guest recovery/points, Coin
  Champ, Analog Clock, existing Birds UI and route smoke. Tablet landscape pause
  and portrait recovery were exercised. Test fixtures were corrected to wait
  for transitions, track pending guest points, and use the current Birds menu;
  those initial driver failures are not represented as product defects.
- Rebuild from the final commit for correct build identity before publishing.
- Push main once after local acceptance; use its existing Pages workflow and
  verify the exact successful run and public build metadata.
- Build/sign/inspect one Android App Bundle with the existing Windows release
  scripts and signing key; publish to the existing **Internal testing** track.
  Verify provider readback separately from local signing/build success.

No Cloudflare project/publisher, staging website or iOS/TestFlight delivery system
was found in repository workflows, configuration or existing release evidence.
The iOS scaffold has no configured development team or signed publishing pipeline.
Do not create a new provider or promote this unreviewed Play app to Production.

Detailed candidate, provider, artifact and post-launch receipts are retained in
`output/integration-release-20261025/`, outside the published source tree. They
record actual final statuses; this pre-publication document does not assert that
an upload, deployment or physical installation has succeeded.

Physical Android/iPhone/iPad, installed asset-pack delivery, audible media,
microphone, true zoom and authenticated backend/provider acceptance remain
separate gates. Local emulation and a signed artifact do not prove these paths.

Validation: Tier 3 | ran full project gate and Android version contracts |
release integration spans guest persistence, game runtime, UI and native packaging.
