import { LEVELS, getLevel } from '../config/levels.js';
import { DEFENDERS } from '../config/defenders.js';
import { getSellRefund, getUpgradeCost } from '../core/economy.js';

const FIXED_STEP_MILLISECONDS = 1_000 / 60;
const MAX_FRAME_STEPS = 5;
const MAX_QA_ADVANCE_MILLISECONDS = 60_000;
const DEFENDER_PRESENTATION = Object.freeze({
  bladeguard: Object.freeze({ name: 'Bladeguard', role: 'Close defense' }),
  ranger: Object.freeze({ name: 'Ranger', role: 'Long range' }),
  ironwarden: Object.freeze({ name: 'Ironwarden', role: 'Armor breaker' }),
  'rune-artificer': Object.freeze({ name: 'Rune Artificer', role: 'Splash damage' }),
});

const clampFinite = (value, maximum) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(0, number)) : 0;
};

export const createFixedStepClock = ({
  advanceSteps,
  getSpeed = () => 1,
  fixedStepMilliseconds = FIXED_STEP_MILLISECONDS,
  maxFrameSteps = MAX_FRAME_STEPS,
  maxQaAdvanceMilliseconds = MAX_QA_ADVANCE_MILLISECONDS,
} = {}) => {
  let accumulator = 0;

  const runIntervals = (intervals) => {
    if (intervals <= 0) return 0;
    const speed = getSpeed() === 2 ? 2 : 1;
    const steps = intervals * speed;
    advanceSteps?.(steps);
    return steps;
  };

  return Object.freeze({
    advanceExact(milliseconds) {
      const accepted = clampFinite(milliseconds, maxQaAdvanceMilliseconds);
      const intervals = Math.floor((accepted / fixedStepMilliseconds) + 1e-9);
      return runIntervals(intervals);
    },
    advanceFrame(milliseconds) {
      const accepted = clampFinite(milliseconds, fixedStepMilliseconds * maxFrameSteps);
      accumulator = Math.min(fixedStepMilliseconds * maxFrameSteps, accumulator + accepted);
      const intervals = Math.min(
        maxFrameSteps,
        Math.floor((accumulator / fixedStepMilliseconds) + 1e-9),
      );
      accumulator -= intervals * fixedStepMilliseconds;
      return runIntervals(intervals);
    },
    getAccumulator: () => accumulator,
    reset() {
      accumulator = 0;
    },
  });
};

export const resolveBattlefieldFocusMove = ({
  currentIndex = 0,
  key,
  shiftKey = false,
  targetCount = 0,
} = {}) => {
  const count = Number.isInteger(targetCount) && targetCount > 0 ? targetCount : 0;
  const current = count > 0 && Number.isInteger(currentIndex)
    ? Math.min(count - 1, Math.max(0, currentIndex))
    : 0;
  const direction = shiftKey || key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;

  if (key === 'Tab') {
    const nextIndex = current + direction;
    const shouldExit = count === 0 || nextIndex < 0 || nextIndex >= count;
    return { nextIndex: shouldExit ? current : nextIndex, shouldExit };
  }

  return {
    nextIndex: count > 0 ? (current + direction + count) % count : 0,
    shouldExit: false,
  };
};

export const installQaRuntimeHooks = ({
  windowRef = globalThis.window,
  enabled = false,
  getActiveBattle = () => null,
  isKnownLevel = () => false,
  startLevel = () => {},
} = {}) => {
  if (!enabled || !windowRef) return () => {};

  const renderGameToText = () => JSON.stringify(getActiveBattle()?.getTextSnapshot?.() ?? null);
  const advanceTime = (milliseconds) => getActiveBattle()?.advanceTime?.(milliseconds) ?? null;
  const debugApi = Object.freeze({
    startLevel(levelId) {
      if (!isKnownLevel(levelId)) return false;
      startLevel(levelId);
      return true;
    },
  });

  windowRef.render_game_to_text = renderGameToText;
  windowRef.advanceTime = advanceTime;
  windowRef.__defenderChampion = debugApi;

  return () => {
    if (windowRef.render_game_to_text === renderGameToText) delete windowRef.render_game_to_text;
    if (windowRef.advanceTime === advanceTime) delete windowRef.advanceTime;
    if (windowRef.__defenderChampion === debugApi) delete windowRef.__defenderChampion;
  };
};

const formatElapsedTime = (tick) => {
  const totalSeconds = Math.max(0, Math.floor((Number(tick) || 0) / 60));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const createBattleHudModel = (snapshot, {
  selectedDefenderId = null,
  selectedTowerId = null,
  interactive = true,
  notice = '',
} = {}) => {
  const level = getLevel(snapshot.levelId);
  const defenders = Object.values(DEFENDERS).map((defender) => ({
    affordable: snapshot.coins >= defender.costs[0],
    cost: defender.costs[0],
    id: defender.id,
    name: DEFENDER_PRESENTATION[defender.id].name,
    role: DEFENDER_PRESENTATION[defender.id].role,
    selected: defender.id === selectedDefenderId,
  }));
  const tower = snapshot.towers.find((entry) => entry.id === selectedTowerId) ?? null;
  const towerConfig = tower ? DEFENDERS[tower.defenderId] : null;
  const upgradeCost = tower ? getUpgradeCost(tower, towerConfig) : null;
  const selectedTower = tower ? {
    damage: towerConfig.damage[tower.tier],
    defenderId: tower.defenderId,
    id: tower.id,
    mastery: towerConfig.mastery,
    name: DEFENDER_PRESENTATION[tower.defenderId].name,
    range: towerConfig.range[tower.tier],
    sellValue: getSellRefund(tower),
    speedSeconds: towerConfig.cooldownTicks[tower.tier] / 60,
    tier: tower.tier,
    upgradeCost,
    upgradeEnabled: interactive && upgradeCost !== null && snapshot.coins >= upgradeCost,
  } : null;

  return Object.freeze({
    coins: snapshot.coins,
    defenders,
    hearts: snapshot.castleHearts,
    interactive,
    levelTitle: level.name,
    notice,
    paused: snapshot.pauseReasons.length > 0,
    score: snapshot.score,
    selectedTower,
    speed: snapshot.timeScale,
    timeLabel: formatElapsedTime(snapshot.tick),
    waveLabel: snapshot.waveIndex < 0
      ? `Ready / ${level.waveCount}`
      : `${Math.min(snapshot.waveIndex + 1, level.waveCount)} / ${level.waveCount}`,
  });
};

const SCREEN_IDS = Object.freeze({
  menu: 'menu-screen',
  levels: 'level-select-screen',
  battle: 'battle-screen',
  result: 'result-screen',
});

const getLevelNumber = (levelId) => Number.parseInt(levelId?.replace('level-', ''), 10);

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

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

export const resolveMotionState = (override, systemReduced = false) => {
  if (override === true) return { mode: 'reduce', reduced: true };
  if (override === false) return { mode: 'full', reduced: false };
  return { mode: 'system', reduced: Boolean(systemReduced) };
};

export const createModalFocusTrap = ({ documentRef, overlay, onEscape } = {}) => {
  let active = false;
  let returnFocus = null;

  const getFocusable = () => Array.from(overlay.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter((element) => !element.disabled
      && !element.hidden
      && element.getAttribute?.('aria-hidden') !== 'true');

  const focusFirst = () => {
    const first = getFocusable()[0];
    (first ?? overlay).focus?.();
  };

  const handleKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onEscape?.();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = getFocusable();
    if (focusable.length === 0) {
      event.preventDefault();
      overlay.focus?.();
      return;
    }
    if (focusable.length === 1) {
      event.preventDefault();
      focusable[0].focus?.();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);
    const current = documentRef.activeElement;
    if (event.shiftKey && (current === first || !overlay.contains(current))) {
      event.preventDefault();
      last.focus?.();
    } else if (!event.shiftKey && (current === last || !overlay.contains(current))) {
      event.preventDefault();
      first.focus?.();
    }
  };

  const deactivate = ({ restoreFocus = true } = {}) => {
    if (!active) return;
    active = false;
    documentRef.removeEventListener('keydown', handleKeydown);
    if (restoreFocus && returnFocus?.isConnected !== false) returnFocus?.focus?.();
    returnFocus = null;
  };

  return Object.freeze({
    activate({ returnFocus: nextReturnFocus = documentRef.activeElement } = {}) {
      if (active) return;
      active = true;
      returnFocus = nextReturnFocus;
      documentRef.addEventListener('keydown', handleKeydown);
      focusFirst();
    },
    deactivate,
    isActive: () => active,
  });
};

const percentage = (value) => `${Math.round(value * 100)}%`;

export const createHudController = ({
  documentRef = globalThis.document,
  windowRef = globalThis.window,
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
  const motionQuery = windowRef?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const shortLandscapeQuery = windowRef?.matchMedia?.('(orientation: landscape) and (max-height: 720px)');
  let battleBinding = null;
  let currentBattleModel = null;
  let modalTraps;

  const on = (element, type, listener) => {
    element?.addEventListener(type, listener);
    listeners.push(() => element?.removeEventListener(type, listener));
  };

  const announce = (message) => {
    const announcer = documentRef.getElementById('status-announcer');
    if (announcer) announcer.textContent = message;
  };

  const ensureBattleDom = () => {
    const battleHeading = documentRef.querySelector?.('.battle-heading');
    const battleTitle = documentRef.getElementById('battle-level-name');
    const battleControls = documentRef.querySelector?.('.battle-controls');
    if (battleHeading) battleHeading.style.minWidth = '0';
    if (battleTitle) {
      battleTitle.style.fontSize = 'clamp(1.1rem, 4.7vw, 2.2rem)';
      battleTitle.style.overflowWrap = 'break-word';
    }
    if (battleControls) battleControls.style.gap = '4px';
    const stats = documentRef.querySelector?.('.battle-stats');
    const ensureStat = (id, label) => {
      if (!stats || documentRef.getElementById(id)) return;
      const wrapper = documentRef.createElement('div');
      const term = documentRef.createElement('dt');
      const value = documentRef.createElement('dd');
      term.textContent = label;
      value.id = id;
      value.textContent = '0';
      wrapper.append(term, value);
      stats.append(wrapper);
    };
    ensureStat('hud-time', 'Time');
    ensureStat('hud-score', 'Score');

    const speedButton = documentRef.getElementById('speed-button');
    if (speedButton) {
      speedButton.style.width = '44px';
      speedButton.dataset.speed = '2';
      speedButton.textContent = '2×';
      speedButton.setAttribute('aria-label', 'Set battle speed to two times');
      if (!documentRef.getElementById('speed-1-button')) {
        const speedOne = documentRef.createElement('button');
        speedOne.id = 'speed-1-button';
        speedOne.className = 'button speed-button';
        speedOne.type = 'button';
        speedOne.dataset.speed = '1';
        speedOne.style.width = '44px';
        speedOne.textContent = '1×';
        speedOne.setAttribute('aria-label', 'Set battle speed to normal');
        speedButton.before(speedOne);
      }
    }

    const dock = documentRef.getElementById('defender-dock');
    const dockList = dock?.querySelector?.('.dock-list');
    if (dockList && dockList.dataset.ready !== 'true') {
      dockList.dataset.ready = 'true';
      dockList.replaceChildren();
      for (const defender of Object.values(DEFENDERS)) {
        const presentation = DEFENDER_PRESENTATION[defender.id];
        const button = documentRef.createElement('button');
        const name = documentRef.createElement('span');
        const details = documentRef.createElement('small');
        button.className = 'defender-card';
        button.type = 'button';
        button.dataset.defenderId = defender.id;
        button.setAttribute('aria-keyshortcuts', String(dockList.children.length + 1));
        button.style.overflow = 'hidden';
        name.textContent = presentation.name;
        name.style.fontSize = 'clamp(0.72rem, 2.8vw, 1rem)';
        name.style.lineHeight = '1.05';
        name.style.overflowWrap = 'anywhere';
        details.textContent = `${defender.costs[0]} coins · ${presentation.role}`;
        details.style.fontSize = 'clamp(0.58rem, 2.2vw, 0.68rem)';
        details.style.overflowWrap = 'anywhere';
        button.append(name, details);
        dockList.append(button);
      }
    }

    if (dock && !documentRef.getElementById('battle-notice')) {
      const notice = documentRef.createElement('p');
      notice.id = 'battle-notice';
      notice.className = 'settings-note';
      notice.hidden = true;
      notice.setAttribute('role', 'status');
      dock.append(notice);
    }

    if (dock && !documentRef.getElementById('tower-panel')) {
      const panel = documentRef.createElement('section');
      const heading = documentRef.createElement('p');
      const statistics = documentRef.createElement('p');
      const upgrade = documentRef.createElement('button');
      const sell = documentRef.createElement('button');
      panel.id = 'tower-panel';
      panel.hidden = true;
      panel.setAttribute('aria-label', 'Selected defender');
      heading.id = 'tower-panel-heading';
      heading.className = 'dock-title';
      statistics.id = 'tower-panel-stats';
      upgrade.id = 'tower-upgrade-button';
      upgrade.className = 'button button-primary';
      upgrade.type = 'button';
      upgrade.dataset.battleCommand = 'upgrade';
      sell.id = 'tower-sell-button';
      sell.className = 'button button-quiet';
      sell.type = 'button';
      sell.dataset.battleCommand = 'sell';
      panel.append(heading, statistics, upgrade, sell);
      dock.append(panel);
    }
  };

  const syncDockLayout = () => {
    const dockList = documentRef.querySelector?.('#defender-dock .dock-list');
    if (!dockList) return;
    dockList.style.gridTemplateColumns = shortLandscapeQuery?.matches
      ? '1fr'
      : 'repeat(4, minmax(0, 1fr))';
    dockList.style.overflow = 'visible';
  };

  const renderBattle = (snapshot, selection = {}) => {
    ensureBattleDom();
    currentBattleModel = createBattleHudModel(snapshot, selection);
    const model = currentBattleModel;
    documentRef.getElementById('battle-level-name').textContent = model.levelTitle;
    documentRef.getElementById('hud-hearts').textContent = String(model.hearts);
    documentRef.getElementById('hud-coins').textContent = String(model.coins);
    documentRef.getElementById('hud-wave').textContent = model.waveLabel;
    documentRef.getElementById('hud-time').textContent = model.timeLabel;
    documentRef.getElementById('hud-score').textContent = String(model.score);

    const pauseButton = documentRef.getElementById('pause-button');
    pauseButton.disabled = !model.interactive;
    pauseButton.setAttribute('aria-pressed', String(model.paused));
    pauseButton.setAttribute('aria-label', model.paused ? 'Resume battle' : 'Pause battle');
    pauseButton.textContent = model.paused ? '▶' : 'Ⅱ';

    for (const speed of [1, 2]) {
      const button = documentRef.querySelector?.(`[data-speed="${speed}"]`);
      if (!button) continue;
      button.disabled = !model.interactive;
      button.setAttribute('aria-pressed', String(model.speed === speed));
    }

    for (const defender of model.defenders) {
      const button = documentRef.querySelector?.(`[data-defender-id="${defender.id}"]`);
      if (!button) continue;
      button.disabled = !model.interactive || !defender.affordable;
      button.setAttribute('aria-pressed', String(defender.selected));
      button.setAttribute('aria-label', `${defender.name}, ${defender.cost} coins, ${defender.role}`);
    }

    const notice = documentRef.getElementById('battle-notice');
    notice.hidden = !model.notice;
    notice.textContent = model.notice;

    const panel = documentRef.getElementById('tower-panel');
    panel.hidden = !model.selectedTower;
    if (model.selectedTower) {
      const tower = model.selectedTower;
      documentRef.getElementById('tower-panel-heading').textContent = `${tower.name} · Tier ${tower.tier + 1}`;
      documentRef.getElementById('tower-panel-stats').textContent = `Damage ${tower.damage} · Speed ${tower.speedSeconds.toFixed(2)}s · Range ${tower.range} · Mastery ${tower.mastery}`;
      const upgrade = documentRef.getElementById('tower-upgrade-button');
      upgrade.disabled = !tower.upgradeEnabled;
      upgrade.textContent = tower.upgradeCost === null ? 'Maximum tier' : `Upgrade · ${tower.upgradeCost} coins`;
      const sell = documentRef.getElementById('tower-sell-button');
      sell.disabled = !model.interactive;
      sell.textContent = `Sell · ${tower.sellValue} coins`;
    }
    return model;
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
    modalTraps[name].deactivate({ restoreFocus: true });
  };

  const openOverlay = (name) => {
    const overlay = overlays[name];
    if (!overlay) return;
    const returnFocus = documentRef.activeElement;
    for (const screen of Object.values(screens)) screen.inert = true;
    overlay.hidden = false;
    hostBridge?.setModalPaused?.(true);
    modalTraps[name].activate({ returnFocus });
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
    const motionState = resolveMotionState(value, motionQuery?.matches);
    root.dataset.motionPreference = motionState.mode;
    root.dataset.reducedMotion = String(motionState.reduced);
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

  const showBattle = (snapshot, selection = {}) => {
    const resolvedSnapshot = typeof snapshot === 'string'
      ? {
        castleHearts: getLevel(snapshot).castleHearts,
        coins: getLevel(snapshot).startingCoins,
        levelId: snapshot,
        pauseReasons: [],
        score: 0,
        tick: 0,
        timeScale: 1,
        towers: [],
        waveIndex: -1,
      }
      : snapshot;
    const model = renderBattle(resolvedSnapshot, selection);
    showScreen('battle');
    documentRef.getElementById('battlefield')?.focus();
    announce(model.notice || `${model.levelTitle}. Battle ready.`);
  };

  const connectBattle = (binding) => {
    battleBinding = binding;
    return () => {
      if (battleBinding === binding) {
        battleBinding = null;
        currentBattleModel = null;
      }
    };
  };

  const dispatchBattleCommand = (command) => {
    const result = battleBinding?.issueCommand?.(command) ?? {
      accepted: false,
      reason: 'battle-unavailable',
    };
    if (!result.accepted) announce(`Command not accepted: ${result.reason}.`);
    return result;
  };

  const selectDefender = (defenderId) => {
    if (!currentBattleModel?.interactive) return;
    battleBinding?.selectDefender?.(defenderId);
  };

  const showResult = ({ victory = false, summary = '' } = {}) => {
    documentRef.getElementById('result-title').textContent = victory ? 'The woodland is safe!' : 'The castle needs you';
    documentRef.getElementById('result-summary').textContent = summary || (victory
      ? 'A brave defense. Your chapter progress has been saved.'
      : 'Regroup your defenders and try a new plan.');
    showScreen('result');
    documentRef.getElementById('result-levels-button')?.focus();
  };

  const reconcile = () => {
    const state = saveStore.getState();
    applyReducedMotion(state.reducedMotionOverride);
    if (!screens.menu.hidden) refreshContinue();
    if (!overlays.settings.hidden) syncSettings();
  };

  modalTraps = {
    help: createModalFocusTrap({
      documentRef,
      overlay: overlays.help,
      onEscape: () => closeOverlay('help'),
    }),
    settings: createModalFocusTrap({
      documentRef,
      overlay: overlays.settings,
      onEscape: () => closeOverlay('settings'),
    }),
  };

  ensureBattleDom();
  syncDockLayout();

  const handleDefenderPointer = (event) => {
    const button = event.target.closest?.('button[data-defender-id]');
    if (button && !button.disabled) selectDefender(button.dataset.defenderId);
  };

  const handleDockClick = (event) => {
    const defenderButton = event.target.closest?.('button[data-defender-id]');
    if (defenderButton && event.detail === 0 && !defenderButton.disabled) {
      selectDefender(defenderButton.dataset.defenderId);
      return;
    }
    const commandButton = event.target.closest?.('button[data-battle-command]');
    const towerId = currentBattleModel?.selectedTower?.id;
    if (!commandButton || commandButton.disabled || !towerId) return;
    if (commandButton.dataset.battleCommand === 'upgrade') {
      dispatchBattleCommand({ type: 'upgrade', towerId });
    } else if (commandButton.dataset.battleCommand === 'sell') {
      dispatchBattleCommand({ type: 'sell', towerId });
    }
  };

  const handleBattleControl = (event) => {
    const speedButton = event.target.closest?.('button[data-speed]');
    if (speedButton && !speedButton.disabled) {
      dispatchBattleCommand({ type: 'set-speed', value: Number(speedButton.dataset.speed) });
    }
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
  on(documentRef.getElementById('battle-back-button'), 'click', () => {
    dispatchBattleCommand({ type: 'set-pause-reason', reason: 'manual', active: false });
    hostBridge?.setManualPaused?.(false);
    navigate?.('LevelSelectScene');
  });
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
  on(documentRef.getElementById('defender-dock'), 'pointerdown', handleDefenderPointer);
  on(documentRef.getElementById('defender-dock'), 'click', handleDockClick);
  on(documentRef.querySelector?.('.battle-controls'), 'click', handleBattleControl);
  on(documentRef.getElementById('pause-button'), 'click', () => {
    if (!currentBattleModel?.interactive) return;
    dispatchBattleCommand({
      type: 'set-pause-reason',
      reason: 'manual',
      active: !currentBattleModel.paused,
    });
  });
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
  on(motionQuery, 'change', () => {
    if (saveStore.getState().reducedMotionOverride === null) applyReducedMotion(null);
  });
  on(shortLandscapeQuery, 'change', syncDockLayout);

  applyReducedMotion(saveStore.getState().reducedMotionOverride);

  return Object.freeze({
    announce,
    connectBattle,
    destroy() {
      closeOverlay('help');
      closeOverlay('settings');
      modalTraps.help.deactivate({ restoreFocus: false });
      modalTraps.settings.deactivate({ restoreFocus: false });
      battleBinding = null;
      currentBattleModel = null;
      listeners.splice(0).forEach((remove) => remove());
    },
    reconcile,
    refreshContinue,
    renderBattle,
    showBattle,
    showLevelSelect,
    showMenu,
    showResult,
  });
};
