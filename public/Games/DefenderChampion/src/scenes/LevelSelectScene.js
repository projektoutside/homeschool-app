import Phaser from 'phaser';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  create() {
    this.registry.get('hud').showLevelSelect();
  }
}
