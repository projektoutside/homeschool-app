# Farmers Market Frenzy 3D

An educational browser game where players run a farmers market stand, calculate totals, and return correct change.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (typically `http://localhost:5173`).

## Build

```bash
npm run build
```

## Project structure

- `index.html`: main app shell and UI markup
- `public/css/styles.css`: game UI styling and responsive layout
- `public/js/Main.js`: app bootstrap
- `public/js/GameManager.js`: gameplay flow and orchestration
- `public/js/CustomerManager.js`: customer logic
- `public/js/MoneyManager.js`: pricing, totals, and change workflow
- `public/js/SceneManager.js`: 3D scene management
- `public/js/TimerManager.js`: timer and round timing logic
- `public/js/VSModeManager.js`: versus/progressive competition flow
- `public/js/GameConfig.js`: game settings and constants

## Notes

- This project runs as a standard web app.
- Legacy installable-app/service-worker assets and old manual test/debug pages were removed.
