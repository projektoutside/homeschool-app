# Homeschool Hub 1.0.8 internal release candidate

Target: `com.lashomeschool.hub`, version code 9, Google Play Internal testing. The existing tester cohort and package identity are retained. The user authorized merging the repository branches into main, pushing main, and updating Internal testing on 2026-10-22.

The integrated history includes the release audit, game/touch/voice improvements, Many Birds One Stone campaign, map, shop, combos, competitive map creation and automatic solvability checks, and the older runtime cleanup/Coin Champion branch. Conflict resolution preserves the newer windowed-play, speech, orientation and iframe lifecycle behavior. Animal Champion and Defender Champion retain their single-player and points classification; the content generator now preserves the new game metadata instead of dropping it.

## Dependencies and build tools

- Capacitor core, Android, iOS and CLI advance to 8.5.3. This addresses the native HTTP proxy origin issue described in [the Capacitor advisory](https://github.com/advisories/GHSA-rvm3-566m-v7fv), including its later patched-version corrections.
- Vite stays on major 7 at 7.3.7. Sharp advances to 0.35.5 and source-map-js to 1.2.2 in the lockfile. See the [Sharp advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) and [source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
- The GLB optimization script uses the official glTF Transform library API instead of its CLI, removing the CLI's unpatched [braces dependency](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). The same dedup/weld/resample/prune/sparse/quantize profile remains, with no simplification, flattening, joining, instancing or texture compression. Protected wings remain opt-in. Fixture checks preserve input bytes, world bounds, hierarchy and animation, cover Draco/Meshopt input, and reject corrupt files. No production GLB assets were rewritten.
- `npm audit --audit-level=high` passed after these changes. Three moderate advisories remain in the Capacitor CLI's xcode/uuid tooling dependency chain; this is not a zero-advisory claim.

## Evidence and boundaries

The pre-integration source passed `npm run check` with 405 tests. Final-source checks, signed-bundle inspection, hashes, provider readback and post-launch journeys are recorded under `output/releases/1.0.8-9/`. The previous signed 1.0.7 (8) bundle was preserved under `output/releases/1.0.7-8/` before building.

Browser emulation is separate from physical hardware. No Android device was connected during preparation and the device-lab coordinator was unavailable. Store installation, on-demand asset download and in-place upgrade remain separate acceptance checks. The schema hardening is source-controlled; this release does not establish live Supabase policy or authenticated persistence verification.
