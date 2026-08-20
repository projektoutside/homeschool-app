# Task 8 Report — Defender Champion Square-Grid Finale

Date: 2026-08-20
Base before Task 8: `ffe32b5103c65fe1652797944d45bd20a4c68b24`

## Result

Task 8 is GREEN. All eight Levels 7–10 mixed fixtures are terminal victories with every due command accepted, materially different occupied-cell footprints, different actual highest-spend defenders per level, and the exact 18-living/three-attacker ceilings. All eight Level 7/10 mono-roster fixtures are terminal defeats after at least three post-tick-zero purchases. All ten no-build fixtures lose. The Level 4 rebuild evidence and every literal Level 1–6 metric remain unchanged. Level 7 and Level 10 balanced victories contain an observed permanent frontline defeat followed by a paid same-cell rebuild.

## RED evidence

The first full balance run failed in `reinvesting mono-roster fixtures cannot clear Levels 7 or 10` at `level-7:bladeguard should terminate`. The late mono baseline was:

- Level 7: Bladeguard stalled (10 post-zero purchases), Ranger won (8), Ironwarden lost (3), Rune Artificer stalled (3).
- Level 10: Bladeguard won (9), Ranger won (8), Ironwarden won (4), Rune Artificer stalled (3).

Focused diagnostics showed the late mono fixtures were not merely under-spending: they had reached their legal purchase patterns but either cleared or remained nonterminal at tick 43200. A second witnessed RED after the authored Level 10 interval changes was the runtime cap fixture: the stale tick-265 sample contained 17 living enemies instead of the required real 18-body peak. The real authored peak occurs at tick 289 and retains complete presentation parity.

## Implemented balance and adapter work

- Removed the final legacy placement translation path from production strategy execution; commands and summaries are cell-authored only.
- Kept Rune Artificer damage, costs, roles, and mastery unchanged while using the approved legal-center range `[81, 90, 100]`.
- Preserved all authored group counts.
- Level 7 uses a ten-Skitter zero-interval wave-5 burst and a zero-delay/zero-interval 32-Skitter finale group.
- Level 10 wave 3 uses three Ironhide Warlords at a 114-tick interval in place of the authored three-Crusher group.
- Ironhide Warlord retains its health, armor, bounty, attack profile, rally, plates, and telegraphs; movement is 42 and a castle breach costs all three hearts.
- Reauthored Level 7 artillery and both Level 10 strategies with legal cell commands, accepted early upgrades, mixed terrain roles, and deterministic distributed coverage.
- Added literal exact expectations for every Levels 7–10 fixture, including occupied cells, terminal tick, hearts, score, spend leader, purchases, cap evidence, and exact Level 7/10 rebuild purchases.
- Removed legacy placement vocabulary from Defender production/tests while retaining positive cell-schema assertions.

## Exact mixed-fixture evidence

| Fixture | Tick | Hearts | Score | Highest spend | Purchases | Max living / attackers |
| --- | ---: | ---: | ---: | --- | ---: | --- |
| level-7-balanced | 28013 | 3 | 4539 | ranger | 8 | 14 / 3 |
| level-7-artillery | 25902 | 3 | 4554 | rune-artificer | 7 | 14 / 3 |
| level-8-balanced | 22114 | 3 | 3726 | bladeguard | 7 | 8 / 3 |
| level-8-artillery | 42793 | 3 | 3716 | rune-artificer | 21 | 14 / 3 |
| level-9-balanced | 40506 | 3 | 3631 | ironwarden | 23 | 8 / 3 |
| level-9-artillery | 38823 | 3 | 3631 | rune-artificer | 12 | 17 / 3 |
| level-10-balanced | 40492 | 3 | 7794 | bladeguard | 12 | 18 / 3 |
| level-10-artillery | 34766 | 3 | 7819 | ranger | 11 | 18 / 3 |

Every due command was accepted. Level 7's occupied-cell symmetric difference is 7/9 (77.8%). Level 10's is 6/13 (46.2%). Both exceed the required 25%.

Exact rebuild evidence:

- Level 7 balanced: `r2c2` Bladeguard permanently defeated at tick 11647; paid 50-coin same-cell build accepted at tick 18000.
- Level 10 balanced: tier-1 `r1c2` Bladeguard permanently defeated at tick 3444; paid 50-coin same-cell build accepted at tick 35000.
- Level 4 balanced remains unchanged: `r2c4` paid same-cell build at tick 37950, one defeat, one repurchase.

## Exact mono evidence

| Fixture | Outcome / tick | Purchases | Post-zero purchases | Max living / attackers |
| --- | --- | ---: | ---: | --- |
| level-7:bladeguard | defeat / 42231 | 13 | 10 | 18 / 3 |
| level-7:ranger | defeat / 39366 | 10 | 8 | 18 / 0 |
| level-7:ironwarden | defeat / 30931 | 4 | 3 | 18 / 3 |
| level-7:rune-artificer | defeat / 39402 | 4 | 3 | 18 / 0 |
| level-10:bladeguard | defeat / 39039 | 12 | 9 | 18 / 3 |
| level-10:ranger | defeat / 38070 | 10 | 8 | 18 / 0 |
| level-10:ironwarden | defeat / 39145 | 5 | 4 | 18 / 3 |
| level-10:rune-artificer | defeat / 38064 | 4 | 3 | 18 / 0 |

## Preserved early literals

The unchanged Level 1–6 terminal ticks remain:

- Level 1: balanced 2086; artillery 3289.
- Level 2: balanced 14700; artillery 34256.
- Level 3: balanced 29898; artillery 30770.
- Level 4: balanced 37972; artillery 23444.
- Level 5: balanced 30299; artillery 33035.
- Level 6: balanced 25156; artillery 41285.

The full balance gate also proves their literal hearts, scores, spend leaders, occupied cells, purchase counts, living caps, attacker caps, and independent deterministic reruns.

## Verification commands and results

```powershell
node --test scripts/defenderChampion.balance.test.mjs
node --test scripts/defenderChampion.balance.test.mjs
```

Final independent passes: 3/3 passed in `148029.9008ms`, then 3/3 passed in `148189.3325ms`. Each pass covers 20/20 mixed wins, 10/10 no-build losses, 8/8 required mono losses with literal terminal/purchase/cap metrics, exact due-command acceptance, Level 4/7/10 rebuild evidence, and independent deterministic summaries.

```powershell
node --test scripts/defenderChampion.grid.test.mjs scripts/defenderChampion.config.test.mjs scripts/defenderChampion.combat.test.mjs scripts/defenderChampion.lane-combat.test.mjs scripts/defenderChampion.simulation.test.mjs
```

Result: 104 passed, 0 failed.

```powershell
node --test scripts/defenderChampion.config.test.mjs scripts/defenderChampion.simulation.test.mjs scripts/defenderChampion.runtime.test.mjs
```

Result: 108 passed, 0 failed, including all 63 runtime tests and the real Level 10 18-body presentation peak.

```powershell
npm run build:defender-champion
node --test scripts/defenderChampion.build.test.mjs
```

Result: build passed; built-bundle gate 2 passed, 0 failed. The generated bundle is deliberately left to Task 9's final-source rebuild and is not part of the Task 8 scoped commit.

```powershell
rg -n "padId|l[0-9]+-pad-|placement slot|guard slot|level\.pads" public/Games/DefenderChampion/src scripts -g "defenderChampion*.test.mjs"
```

Result: exit 1 with no matches, as expected.

## Scope and self-review

Intended Task 8 scope is limited to Defender config, reference strategies, final cell-only placement/simulation/scene adapter work, exact Defender balance/config/runtime/simulation tests, this report, and the SDD ledger. Protected manifests, Capacitor config, Quiz it Polygon bundle, and unrelated root `progress.md` are not staged. The Defender generated bundle was built and tested but is excluded because the binding producer/consumer plan assigns the final generated rebuild to Task 9.

Self-review found no conditional outcome assertions, self-comparison baselines, raised living/attacker ceilings, altered authored group counts, early-campaign drift, stale due-command rejections, or remaining deprecated placement references. The balance is deterministic simulation evidence; headed browser/device playtesting is assigned to Task 9 and was not duplicated here.

Validation: Tier 3 | ran two complete deterministic balance passes, 104 core tests, 108 combined config/simulation/runtime tests, Defender build, 2 built-bundle tests, and the zero-match legacy search | no physical device/browser playtest in Task 8; Task 9 owns final rendered cross-device verification and bundle commit.
