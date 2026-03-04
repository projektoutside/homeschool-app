# Legacy Cleanup Archive (2026-03-02)

This folder stores non-runtime files moved out of the project root during a behavior-preserving cleanup pass.

## Why archived

- Keep `PolygonAPP` root focused on active runtime files.
- Preserve potentially useful historical artifacts for rollback/reference.
- Avoid destructive deletion of uncertain legacy assets.

## Contents

- `root-files/`
  - `index.html.backup_20260206_145814`
  - `.cline_snippets_game.txt`
- `scripts/`
  - `cleanup-panels-auto.ps1`
  - `scan-html.ps1` (contained a stale absolute path outside this repo)
  - `verify-cleanup.ps1`
- `manual-tests/`
  - `test-audio-debug.html`
  - `test-panel-stacking.html`
  - `test-rebuilt-panels.html`

## Restore

Move any file back to project root if needed, for example:

```powershell
Move-Item "_archive\legacy-cleanup-2026-03-02\scripts\verify-cleanup.ps1" ".\verify-cleanup.ps1"
```
