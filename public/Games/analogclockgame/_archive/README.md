# analogclockgame Archive

This folder keeps legacy root files that are not part of current runtime loading.

## Archived items
- `legacy-root-assets/anime.min.js`
- `legacy-root-assets/three.min.js`
- `legacy-root-assets/MainMenu.mp3`
- `legacy-root-assets/GamePlaySong.mp3`

## Why archived
- Runtime currently uses:
  - `index.html` -> `game.js` + `style.css` + `thumb.png`
  - `game.js` audio paths -> `Music/MainMenu.mp3`, `Music/GamePlaySong.mp3`
- Keeping legacy files in `_archive` preserves recoverability without root clutter.
