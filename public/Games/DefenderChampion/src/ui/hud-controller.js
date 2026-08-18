import { LEVELS, getLevel } from '../config/levels.js';

const SCREEN_IDS = Object.freeze({
  menu: 'menu-screen',
  levels: 'level-select-screen',
  battle: 'battle-screen',
  result: 'result-screen',
});

const getLevelNumber = (levelId) => Number.parseInt(levelId?.replace('level-', ''), 10);

export const resolveContinueLevel = (saveState) => {
  const clearedLevelIds = Object.keys(saveState?.levels ?? {});
  if (clearedLevelIds.length === 0) return null;

  const highestUnlocked = Math.min(LEVELS.length, Math.max(1, saveState?.highestUnlockedLevel ?? 1));
  for (let levelNumber = highestUnlocked; levelNumber >= 1; levelNumber -= 1) {
    const levelId = `level-${levelNumber}`;
    if (!saveState.levels[levelId]) return levelId;
  }
  return LEVELS.at(-1).id;
};

const percentage = (value) => `${Math.round(value * 100)}%`;

export const createHudController = ({
  documentRef = globalThis.document,
  saveStore,
  hostBridge,
  audioController,
  navigate,
} = {}) => {
  const shell = documentRef.getElementById('game-shell');
  const screens = Object.fromEntries(Object.entries(SCREEN_IDS).map(([key, id]) => [
    key,
    documentRef.getElementById(id),
  ]));
  const overlays = {
    help: documentRef.getElementById('how-to-screen'),
    settings: documentRef.getElementById('settings-screen'),
  };
  const listeners = [];
  let overlayReturnFocus = null;

  const on = (element, type, listener) => {
    element?.addEventListener(type, listener);
    listeners.push(() => element?.removeEventListener(type, listener));
  };

  const announce = (message) => {
    const announcer = documentRef.getElementById('status-announcer');
    if (announcer) announcer.textContent = message;
  };

  const showScreen = (screenName) => {
    for (const [name, screen] of Object.entries(screens)) {
      if (screen) screen.hidden = name !== screenName;
    }
    shell.dataset.screen = screenName;
  };

  const closeOverlay = (name) => {
    const overlay = overlays[name];
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    for (const screen of Object.values(screens)) screen.inert = false;
    hostBridge?.setModalPaused?.(false);
    overlayReturnFocus?.focus();
    overlayReturnFocus = null;
  };

  const openOverlay = (name) => {
    const overlay = overlays[name];
    if (!overlay) return;
    overlayReturnFocus = documentRef.activeElement;
    for (const screen of Object.values(screens)) screen.inert = true;
    overlay.hidden = false;
    hostBridge?.setModalPaused?.(true);
    overlay.querySelector('button, input, select')?.focus();
  };

  const refreshContinue = () => {
    const continueButton = documentRef.getElementById('continue-button');
    const levelId = resolveContinueLevel(saveStore.getState());
    continueButton.hidden = !levelId;
    continueButton.dataset.levelId = levelId ?? '';
    return levelId;
  };

  const renderLevels = () => {
    const state = saveStore.getState();
    const grid = documentRef.getElementById('level-grid');
    const fragment = documentRef.createDocumentFragment();
    grid.replaceChildren();

    for (const level of LEVELS) {
      const levelNumber = getLevelNumber(level.id);
      const unlocked = levelNumber <= state.highestUnlockedLevel;
      const result = state.levels[level.id];
      const button = documentRef.createElement('button');
      button.type = 'button';
      button.className = 'level-card';
      button.disabled = !unlocked;
      button.dataset.levelId = level.id;
      button.setAttribute('aria-label', unlocked
        ? `Level ${levelNumber}, ${level.name}. ${result ? `${result.medal} medal, best score ${result.bestScore}` : 'Not yet cleared'}`
        : `Level ${levelNumber}, ${level.name}, locked`);
      button.innerHTML = `
        <span class="level-number">Chapter ${levelNumber}${unlocked ? '' : ' · Locked'}</span>
        <span class="level-name">${level.name}</span>
        <span class="level-progress">${result ? `${result.medal} medal · ${result.bestScore.toLocaleString()} points` : unlocked ? 'Ready to defend' : 'Win earlier chapters to unlock'}</span>
      `;
      fragment.append(button);
    }
    grid.append(fragment);
  };

  const applyReducedMotion = (value) => {
    const root = documentRef.documentElement;
    const reduced = value === true
      || (value === null && globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    root.dataset.reducedMotion = String(Boolean(reduced));
  };

  const syncSettings = () => {
    const audioSettings = audioController.getSettings();
    const embedded = Boolean(hostBridge.getState().embedded);
    const music = documentRef.getElementById('music-volume');
    const sfx = documentRef.getElementById('sfx-volume');
    const musicOutput = documentRef.getElementById('music-volume-output');
    const sfxOutput = documentRef.getElementById('sfx-volume-output');
    music.value = String(Math.round(audioSettings.musicVolume * 100));
    sfx.value = String(Math.round(audioSettings.sfxVolume * 100));
    music.disabled = embedded;
    sfx.disabled = embedded;
    musicOutput.value = percentage(audioSettings.musicVolume);
    sfxOutput.value = percentage(audioSettings.sfxVolume);
    documentRef.getElementById('host-sound-note').hidden = !embedded;

    const motion = saveStore.getState().reducedMotionOverride;
    documentRef.getElementById('reduced-motion').value = motion === null
      ? 'system'
      : motion ? 'reduce' : 'full';
    applyReducedMotion(motion);
  };

  const showMenu = () => {
    showScreen('menu');
    refreshContinue();
    documentRef.getElementById('play-button')?.focus();
  };

  const showLevelSelect = () => {
    renderLevels();
    showScreen('levels');
    documentRef.getElementById('levels-back-button')?.focus();
    announce('Level selection opened');
  };

  const showBattle = (levelId) => {
    const level = getLevel(levelId);
    documentRef.getElementById('battle-level-name').textContent = level.name;
    documentRef.getElementById('hud-hearts').textContent = String(level.castleHearts);
    documentRef.getElementById('hud-coins').textContent = String(level.startingCoins);
    documentRef.getElementById('hud-wave').textContent = `Ready / ${level.waveCount}`;
    documentRef.getElementById('pause-button').setAttribute('aria-pressed', 'false');
    documentRef.getElementById('speed-button').setAttribute('aria-pressed', 'false');
    documentRef.getElementById('speed-button').textContent = '1×';
    showScreen('battle');
    documentRef.getElementById('battlefield')?.focus();
    announce(`${level.name}. Battle preview ready.`);
  };

  const showResult = ({ victory = false, summary = '' } = {}) => {
    documentRef.getElementById('result-title').textContent = victory ? 'The woodland is safe!' : 'The castle needs you';
    documentRef.getElementById('result-summary').textContent = summary || (victory
      ? 'A brave defense. Your chapter progress has been saved.'
      : 'Regroup your defenders and try a new plan.');
    showScreen('result');
    documentRef.getElementById('result-levels-button')?.focus();
  };

  on(documentRef.getElementById('play-button'), 'click', () => navigate?.('LevelSelectScene'));
  on(documentRef.getElementById('continue-button'), 'click', (event) => {
    const levelId = event.currentTarget.dataset.levelId;
    if (levelId) navigate?.('BattleScene', { levelId });
  });
  on(documentRef.getElementById('level-grid'), 'click', (event) => {
    const button = event.target.closest?.('button[data-level-id]');
    if (button && !button.disabled) navigate?.('BattleScene', { levelId: button.dataset.levelId });
  });
  on(documentRef.getElementById('levels-back-button'), 'click', () => navigate?.('MenuScene'));
  on(documentRef.getElementById('battle-back-button'), 'click', () => navigate?.('LevelSelectScene'));
  on(documentRef.getElementById('result-levels-button'), 'click', () => navigate?.('LevelSelectScene'));
  on(documentRef.getElementById('result-menu-button'), 'click', () => navigate?.('MenuScene'));
  on(documentRef.getElementById('how-to-button'), 'click', () => openOverlay('help'));
  on(documentRef.getElementById('settings-button'), 'click', () => {
    syncSettings();
    openOverlay('settings');
  });
  on(documentRef.getElementById('exit-button'), 'click', () => hostBridge.exit());
  on(documentRef.getElementById('how-to-close-button'), 'click', () => closeOverlay('help'));
  on(documentRef.getElementById('settings-close-button'), 'click', () => closeOverlay('settings'));
  on(documentRef.getElementById('music-volume'), 'input', (event) => {
    if (hostBridge.getState().embedded) return syncSettings();
    audioController.setMusicVolume(Number(event.currentTarget.value) / 100);
    syncSettings();
  });
  on(documentRef.getElementById('sfx-volume'), 'input', (event) => {
    if (hostBridge.getState().embedded) return syncSettings();
    audioController.setSfxVolume(Number(event.currentTarget.value) / 100);
    syncSettings();
  });
  on(documentRef.getElementById('reduced-motion'), 'change', (event) => {
    const value = event.currentTarget.value;
    const reducedMotionOverride = value === 'system' ? null : value === 'reduce';
    const state = saveStore.getState();
    saveStore.save({ ...state, reducedMotionOverride });
    applyReducedMotion(reducedMotionOverride);
  });
  on(documentRef, 'keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!overlays.settings.hidden) closeOverlay('settings');
    else if (!overlays.help.hidden) closeOverlay('help');
  });

  applyReducedMotion(saveStore.getState().reducedMotionOverride);

  return Object.freeze({
    announce,
    destroy() {
      closeOverlay('help');
      closeOverlay('settings');
      listeners.splice(0).forEach((remove) => remove());
    },
    refreshContinue,
    showBattle,
    showLevelSelect,
    showMenu,
    showResult,
  });
};
