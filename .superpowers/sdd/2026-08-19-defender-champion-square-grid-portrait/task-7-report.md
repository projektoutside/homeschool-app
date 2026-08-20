# Task 7 Report: Levels 1–6 Square-Grid Balance and Stable Strategy References

## Status

Complete. Levels 1–6 now use stable cell-based authored strategies, deterministic `ref`-based upgrades/replacements, and a strengthened balance contract that proves two distinct legal victories per level under the square-grid rules. Level 4 now includes a real permanent frontline defeat plus a paid same-cell repurchase in a winning fixture. Levels 7–10 strategy/config behavior was left untouched.

## Scope and ownership

Owned production/test files changed:

- `public/Games/DefenderChampion/src/config/reference-strategies.js`
- `public/Games/DefenderChampion/src/config/levels.js`
- `public/Games/DefenderChampion/src/core/simulation.js`
- `scripts/defenderChampion.balance.test.mjs`
- `scripts/defenderChampion.config.test.mjs`
- `scripts/defenderChampion.simulation.test.mjs`

Task artifacts changed:

- `.superpowers/sdd/2026-08-19-defender-champion-square-grid-portrait/task-7-report.md`
- `.superpowers/sdd/2026-08-19-defender-champion-square-grid-portrait/progress.md`

Unowned/protected files were not staged or edited for this task.

## Implementation

- Added `issueStrategyCommand(simulation, command, towerRefs)` so early cell strategies can:
  - build with stable `{ ref, defenderId, cellId }`,
  - overwrite a defeated same-cell reference on replacement,
  - upgrade via `{ type: 'upgrade-ref', ref }`.
- Re-authored Levels 1–6 strategies onto direct road/grass cells while preserving legacy pad/tower-id fixtures for Levels 7–10.
- Repaired the failing artillery divergence cases with deterministic late bounty-funded purchases:
  - Level 1 artillery adds an `ironwarden`,
  - Levels 2, 3, 5, and 6 artillery add a late `rune-artificer`,
  - Level 4 artillery becomes a distinct winning rune-artificer route.
- Retuned only approved early-level data:
  - kept the existing Task 7 Level 5 and 6 health/wave reductions,
  - further tuned only Level 4 wave 5 to create a real rebuild window while preserving no-build defeat.
- Locked the Level 4 balanced replacement to the first proven legal same-cell rebuild window:
  - initial `bladeguard` at `r2c4`,
  - real defeat under wave 5 pressure,
  - paid same-cell repurchase at tick `37950`,
  - winning finish with late `ranger` + `ironwarden` support.
- Updated owned config/simulation tests to the cell-command contract and current deterministic Level 1 fixture outputs.

## RED evidence

Witnessed failing contract before the final green implementation:

```powershell
node --test --test-name-pattern="Levels 1-6 square-grid campaign" scripts/defenderChampion.balance.test.mjs
```

Observed failures during repair included:

- Level 1 artillery command rejection / highest-spender collision,
- Level 4 artillery non-terminal behavior,
- Level 5 artillery non-terminal behavior,
- missing Level 4 same-cell defeat + repurchase evidence.

## Final deterministic balance evidence

### Levels 1–6 campaign run 1

```powershell
node --test --test-name-pattern="Levels 1-6 square-grid campaign" scripts/defenderChampion.balance.test.mjs
```

Result: 1 passed, 0 failed in 18837.3648 ms.

### Levels 1–6 campaign run 2

```powershell
node --test --test-name-pattern="Levels 1-6 square-grid campaign" scripts/defenderChampion.balance.test.mjs
```

Result: 1 passed, 0 failed in 19391.7934 ms.

### Relevant core suites

```powershell
node --test scripts/defenderChampion.config.test.mjs scripts/defenderChampion.simulation.test.mjs scripts/defenderChampion.combat.test.mjs
```

Result: 72 passed, 0 failed in 650.668 ms.

## Final Levels 1–6 metrics

- Level 1 balanced: victory, tick `2086`, hearts `3`, score `958`, highest `ranger`, occupied `r1c6,r2c6`, max living `3`, max attackers `3`
- Level 1 artillery: victory, tick `3289`, hearts `3`, score `938`, highest `ironwarden`, occupied `r3c3,r4c3,r7c5`, max living `14`, max attackers `3`
- Level 2 balanced: victory, tick `14700`, hearts `3`, score `1054`, highest `ranger`, occupied `r1c4,r2c4`, max living `8`, max attackers `3`
- Level 2 artillery: victory, tick `34256`, hearts `3`, score `1054`, highest `rune-artificer`, occupied `r6c8,r7c5,r7c8`, max living `16`, max attackers `3`
- Level 3 balanced: victory, tick `29898`, hearts `3`, score `1235`, highest `ranger`, occupied `r1c2,r1c3`, max living `8`, max attackers `3`
- Level 3 artillery: victory, tick `30770`, hearts `3`, score `1235`, highest `rune-artificer`, occupied `r4c1,r5c1,r6c8`, max living `16`, max attackers `3`
- Level 4 balanced: victory, tick `37972`, hearts `3`, score `1942`, highest `ranger`, occupied `r1c4,r2c4,r7c7,r9c4`, max living `10`, max attackers `3`, includes permanent frontline defeat and paid same-cell rebuild at `r2c4`
- Level 4 artillery: victory, tick `23444`, hearts `3`, score `1942`, highest `rune-artificer`, occupied `r2c4,r4c2,r9c4`, max living `7`, max attackers `3`
- Level 5 balanced: victory, tick `30299`, hearts `3`, score `1125`, highest `ranger`, occupied `r2c1,r2c2`, max living `9`, max attackers `3`
- Level 5 artillery: victory, tick `33035`, hearts `3`, score `1125`, highest `rune-artificer`, occupied `r2c2,r7c2,r9c5`, max living `9`, max attackers `3`
- Level 6 balanced: victory, tick `25156`, hearts `3`, score `1412`, highest `ranger`, occupied `r0c8,r1c8`, max living `8`, max attackers `3`
- Level 6 artillery: victory, tick `41285`, hearts `3`, score `1412`, highest `rune-artificer`, occupied `r4c3,r5c3,r6c6`, max living `17`, max attackers `3`

## Notes

- Level 4’s repurchase path was solved without touching combat/lane/targeting code.
- The winning rebuild window is narrow and evidence-backed; the strategy intentionally delays its replacement until the road cell stops being enemy-occupied.
- Level 7–10 mono-roster/balance behavior was not investigated or changed here per Task 8 ownership.

## Fix round 1

- Strengthened the Levels 1–6 campaign balance contract from rerun-self-comparison to literal exact expectations for all 12 fixtures: outcome, tick, hearts, score, highest spender, occupied cells, maximum living enemies, maximum concurrent attackers, and accepted purchase counts.
- Locked the Level 4 balanced frontline defeat/repurchase evidence explicitly: one permanent defeat, one paid same-cell repurchase at `r2c4`, replacement build command accepted on tick `37950`.
- Added a focused simulation regression proving stale `upgrade-ref` rejection clears the dead ref and a same-ref rebuild upgrades the replacement living tower instead of a stale tower ID.
- Corrected stale config assertions to match the current immutable late-level metadata and command shapes, and reordered `level-8-artillery` chronologically without gameplay retuning.
- Verification:
  - `node --test --test-name-pattern="Levels 1-6 square-grid campaign" scripts/defenderChampion.balance.test.mjs` -> pass (`34707.7879ms`)
  - `node --test --test-name-pattern="Levels 1-6 square-grid campaign" scripts/defenderChampion.balance.test.mjs` -> pass (`34997.4734ms`)
  - `node --test scripts/defenderChampion.config.test.mjs scripts/defenderChampion.simulation.test.mjs scripts/defenderChampion.combat.test.mjs` -> pass (`73/73`, `652.7383ms`)

## Fix round 2

- Restored Levels 7–10 live level configs in `levels.js` exactly to base `2477c3e` for health scales and wave compositions. The `2477c3e..working` diff on that file now contains only Levels 4–6 hunks.
- Restored Levels 7–10 authored reference strategies to base legacy command semantics and removed the unused late cell blueprint helpers.
- Restored config expectations for late health scales to `1.92 / 2.14 / 2.38 / 2.65` and restored the `>=25%` cross-strategy placement-difference contract using translated cell IDs.
- Proof of no late-strategy semantic drift: a direct semantic compare of current vs base emitted command arrays for `level-7` through `level-10` strategy IDs returned `mismatches: []`.
- Verification:
  - `node --test scripts/defenderChampion.config.test.mjs scripts/defenderChampion.simulation.test.mjs` -> RED (`42/45` pass; late spillover failures in config chronology/health-scale and simulation command-shape contract)
  - `node --test scripts/defenderChampion.config.test.mjs scripts/defenderChampion.simulation.test.mjs scripts/defenderChampion.combat.test.mjs` -> pass (`73/73`, `639.205ms`)
  - `node --test --test-name-pattern="Levels 1-6 square-grid campaign" scripts/defenderChampion.balance.test.mjs` -> pass (`33772.9053ms`)
  - `node --test --test-name-pattern="Levels 1-6 square-grid campaign" scripts/defenderChampion.balance.test.mjs` -> pass (`34326.9344ms`)
