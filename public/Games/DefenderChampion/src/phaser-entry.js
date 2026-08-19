export const createDefenderPhaserGame = ({
  PhaserLib,
  audioController,
  hostBridge,
  hud,
  resolution,
  scenes,
}) => new PhaserLib.Game({
  type: PhaserLib.AUTO,
  parent: 'battlefield',
  audio: { noAudio: true },
  transparent: true,
  width: 720,
  height: 960,
  resolution,
  render: {
    antialias: true,
    transparent: true,
  },
  scale: {
    mode: PhaserLib.Scale.FIT,
    autoCenter: PhaserLib.Scale.CENTER_BOTH,
    width: 720,
    height: 960,
  },
  scene: scenes,
  callbacks: {
    preBoot(phaserGame) {
      phaserGame.registry.set('hud', hud);
      phaserGame.registry.set('hostBridge', hostBridge);
      phaserGame.registry.set('audioController', audioController);
    },
  },
});
