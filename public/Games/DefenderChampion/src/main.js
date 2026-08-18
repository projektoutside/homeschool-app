import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { createAudioController } from './services/audio.js';
import { createHostBridge } from './services/host-bridge.js';
import { createSaveStore } from './services/save-store.js';
import { LEVELS } from './config/levels.js';
import { createHudController, installQaRuntimeHooks } from './ui/hud-controller.js';
import { createRuntimeLifecycle } from './runtime-lifecycle.js';

const documentRef = globalThis.document;
const windowRef = globalThis.window;
if (!documentRef.querySelector('link[rel~="icon"]')) {
  const favicon = documentRef.createElement('link');
  favicon.rel = 'icon';
  favicon.href = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  documentRef.head.append(favicon);
}
const announcer = documentRef.getElementById('status-announcer');
const saveStore = createSaveStore({
  onNotice(notice) {
    if (!announcer) return;
    announcer.textContent = notice.type === 'storage-unavailable'
      ? 'Progress will last for this visit because storage is unavailable.'
      : 'Saved progress could not be read and has been reset.';
  },
});
const audioController = createAudioController({ windowRef });
let game;
const hostBridge = createHostBridge({
  windowRef,
  documentRef,
  saveStore,
  audioController,
  onPauseChange({ paused, reasons }) {
    game?.scene?.getScene?.('BattleScene')?.setExternalPauseReasons?.(reasons);
    game?.scene?.scenes?.forEach((scene) => {
      if (paused) {
        if (scene.scene.isActive()) scene.scene.pause();
      } else if (scene.scene.isPaused()) {
        scene.scene.resume();
      }
    });
  },
});
const hud = createHudController({
  documentRef,
  windowRef,
  saveStore,
  hostBridge,
  audioController,
  navigate(sceneKey, data) {
    game?.scene.start(sceneKey, data);
  },
});

const resolution = Math.min(globalThis.devicePixelRatio || 1, 2);

game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'battlefield',
  transparent: true,
  width: 720,
  height: 960,
  resolution,
  render: {
    antialias: true,
    transparent: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 960,
  },
  scene: [BootScene, MenuScene, LevelSelectScene, BattleScene, ResultScene],
  callbacks: {
    preBoot(phaserGame) {
      phaserGame.registry.set('hud', hud);
      phaserGame.registry.set('hostBridge', hostBridge);
    },
  },
});

createRuntimeLifecycle({
  windowRef,
  audioController,
  game,
  hostBridge,
  hud,
});

const getBattleScene = () => game?.scene?.getScene?.('BattleScene') ?? null;
const cleanupQaHooks = installQaRuntimeHooks({
  windowRef,
  enabled: hostBridge.getState().qaMode,
  getActiveBattle: getBattleScene,
  isKnownLevel: (levelId) => LEVELS.some((level) => level.id === levelId),
  startLevel(levelId) {
    hostBridge.setManualPaused(false);
    game.scene.start('BattleScene', { levelId });
  },
});
const handleFinalPageHide = (event) => {
  if (event.persisted) return;
  cleanupQaHooks();
  windowRef.removeEventListener('pagehide', handleFinalPageHide);
  windowRef.removeEventListener('pageshow', handleBfCachePageShow);
};
const handleBfCachePageShow = (event) => {
  if (event.persisted) getBattleScene()?.handleResume?.();
};
windowRef.addEventListener('pagehide', handleFinalPageHide);
windowRef.addEventListener('pageshow', handleBfCachePageShow);
