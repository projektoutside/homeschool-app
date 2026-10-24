# Git consolidation and reproducible preview

Reviewed starting main: `fe9baede89b85810008bfc546ff790eb4e48b591`.
The immediately preceding integration is documented in
[the final integration review](2026-10-24-final-integration.md).

## Reconciliation decisions

Fresh discovery found no unmerged commits on the canonical repository's local or
remote development branches, no stashes, and no open pull requests. The July
Android stability, September release audit, April runtime cleanup, and completed
game development tips were already ancestors of main. Re-merging or squashing
those published commits would add duplicate history. Preserve that history and
put this final correction in one new commit on top of main.

The separate older `X:\homeschool-app` clone has 208 changed/untracked files:
161 equivalent to current main, 38 different, and nine absent. All its committed
development tips are already included in canonical main. Its unfinished account
recovery and durable guest storage work is not production-approved; preserve it
as recovery material instead of replacing current account/storage contracts.
The old detached `7269` checkout is clean. After the ownership audit, the user
confirmed neither older checkout is in use and requested both be archived after
backup. Preserve the entire older X: clone as offline recovery material, including
its existing local configuration, rather than discarding its unfinished work.

Before deleting any branches, create and verify full Git bundles for both clones,
record refs/worktree inventories, and archive every non-ignored X: working change
with CRC and SHA-256 verification. Keep recovery references outside normal branch
lists. The three remote development branches were unprotected, had no open PR,
and were deleted atomically with expected-head leases after ancestry checks.
No force-push or history rewrite to main is part of this process.

Object connectivity review also found an older detached fullscreen commit,
`36bc727`. Its policy/runtime changes match current main, while its whole tree
predates the combined game work. Preserve it with a recovery ref and verified
bundle; do not replace newer features with that historical tree. Loose unreachable
objects are recovery material, not candidates for blind integration or deletion.

Preserve the completed game worktree's output under the primary checkout's
ignored `output/preserved-games-worktree-20261024/` folder. Its 1,134 files,
including signed release artifacts, prior recovery bundles, and QA evidence, were
verified by SHA-256 before and after relocation. Two tracked preview images mixed
into that folder retain their original tracked paths as well.

## Preview correction

A cold start in the primary checkout exposed Vite's default dependency crawl
scanning embedded game HTML and generated Android asset HTML. Those standalone
documents use their own Three.js import maps; treating them as React application
entries produces misleading missing-dependency errors during pre-bundling.

Set `optimizeDeps.entries` to `['index.html']`. This retains optimization for the
React application's actual imports, while each embedded document keeps its own
runtime loading behavior. No new dependency, public route, game implementation,
database contract, or production build entry changes.

The option and default crawl behavior are documented in
[Vite's dependency optimization options](https://vite.dev/config/dep-optimization-options.html#optimizedeps-entries)
and verified against the installed Vite 7.3.7 types.

## Verification and handoff

Use the exact lockfile in a clean `npm ci --ignore-scripts --no-audit` install,
run `npm run check` and `npm audit --audit-level=high`, and inspect a cold local
preview. Existing commands cover TypeScript, lint, tests, content/asset audits,
and the production build. Save actual results in the ignored cleanup report;
do not infer provider or physical-device acceptance from these checks.

After validation, commit this correction once, verify remote main has not
advanced, and push through the existing Pages workflow. Retire only the completed
task-owned checkout after preserving its ignored artifacts and moving the preview
to the primary main checkout. Archive the now-confirmed inactive older workspaces
after checking their backups. Recovery bundles and offline archived work must
remain explicit in the final audit; they are outside the active development flow.
