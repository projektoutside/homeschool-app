import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { LevelSelectScene } from './scenes/LevelSelectScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { createAudioController } from './services/audio.js';
import { createHostBridge } from './services/host-bridge.js';
import { createSaveStore } from './services/save-store.js';
import { createHudController } from './ui/hud-controller.js';
import { createRuntimeLifecycle } from './runtime-lifecycle.js';

const documentRef = globalThis.document;
const windowRef = globalThis.window;
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
  onPauseChange({ paused }) {
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
