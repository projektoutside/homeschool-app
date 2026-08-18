import Phaser from 'phaser';
import { getLevel } from '../config/levels.js';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  init(data = {}) {
    this.levelId = data.levelId ?? 'level-1';
  }

  create() {
    const level = getLevel(this.levelId);
    this.registry.get('hud').showBattle(level.id);
    this.scale.refresh();

    const map = this.add.graphics();
    map.lineStyle(34, 0xd7c38b, 0.72);
    map.beginPath();
    level.path.forEach((point, index) => {
      const x = point.x * (720 / 640);
      const y = 110 + point.y * 1.45;
      if (index === 0) map.moveTo(x, y);
      else map.lineTo(x, y);
    });
    map.strokePath();

    for (const pad of level.pads) {
      const x = pad.x * (720 / 640);
      const y = 110 + pad.y * 1.45;
      map.fillStyle(0x173f35, 0.92);
      map.fillCircle(x, y, 31);
      map.lineStyle(5, 0xf6d77b, 0.76);
      map.strokeCircle(x, y, 31);
    }

    map.fillStyle(0xf6ebca, 0.95);
    map.fillRoundedRect(570, 82, 104, 112, 18);
    map.lineStyle(6, 0xd7a63d, 0.95);
    map.strokeRoundedRect(570, 82, 104, 112, 18);
  }
}
