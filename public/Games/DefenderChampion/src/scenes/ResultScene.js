import Phaser from 'phaser';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  init(data = {}) {
    this.result = data;
  }

  create() {
    this.registry.get('hud').showResult(this.result);
  }
}
