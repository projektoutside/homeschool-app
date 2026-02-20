# analogclockgame Workspace Artifacts

This folder stores non-runtime artifacts moved out of the game root.

## Contents
- `qa/screenshots/`: manual QA snapshots (`__qa_*` images).
- `artifacts/output/`: tool-generated capture outputs.

## Runtime safety
- Files here are not loaded by `index.html` or `game.js`.
- Core runtime files remain at root and under `Music/`.
