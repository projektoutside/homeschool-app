import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const context = { window: {} };
runInNewContext(readFileSync(new URL('../public/Games/Many Birds One Stone/campaign.js', import.meta.url), 'utf8'), context);
const levels = JSON.parse(JSON.stringify(context.window.WoodlandCampaign.levels));

test('the 18-stage campaign preserves the single, pair, then flock progression', () => {
  assert.equal(levels.length, 18);
  assert.equal(new Set(levels.map(level => level.title)).size, 18);
  assert.equal(new Set(levels.map(level => level.skill)).size, 18);
  assert.equal(new Set(levels.map(level => level.chapter)).size, 6);
  levels.forEach((level, i) => {
    assert.equal(level.birdLaneYs.length, i < 3 ? 1 : i < 6 ? 2 : 3);
    if (i % 3) assert.equal(level.chapter, levels[i - 1].chapter);
    else if (i) assert.notEqual(level.chapter, levels[i - 1].chapter);
  });
  assert.equal(levels.at(-1).hint.length, 3, 'the finale combines several learned turns');
});

test('every hint is drawable, reachable by the claw, and has enough ink for three stars', () => {
  for (const level of levels) {
    assert.ok(level.hintAim >= 54 && level.hintAim <= 306, level.title);
    let length = 0;
    for (const stroke of level.hint) {
      assert.ok(stroke.length >= 2);
      stroke.forEach((p, i) => {
        assert.ok(p.x >= 22 && p.x <= 338 && p.y >= 110 && p.y <= 522, `${level.title}: drawable guide`);
        if (i) length += Math.hypot(p.x - stroke[i - 1].x, p.y - stroke[i - 1].y);
      });
    }
    assert.ok(length > 45 && length <= level.inkBudget * .6, `${level.title}: reachable ink bonus`);
  }
});

test('authored bird patrols stay inside the scene and clear of fixed platform bodies', () => {
  for (const level of levels) {
    for (const field of ['birdXs', 'birdRanges', 'birdSpeeds', 'birdPhases']) assert.equal(level[field].length, level.birdLaneYs.length);
    level.birdLaneYs.forEach((lane, index) => {
      const range = level.birdRanges[index], baseX = level.birdXs[index], speed = level.birdSpeeds[index], phase = level.birdPhases[index];
      assert.ok(baseX >= 56 + range && baseX <= 304 - range, `${level.title}: no hidden position clamping`);
      assert.ok(lane > 200 && lane + 11 + index * 1.5 + 20 < 626);
      for (let tick = 0; tick <= 300; tick++) {
        const t = tick / 10;
        const x = baseX + Math.sin(t * speed + phase) * range;
        const y = lane + Math.sin(t * speed * 1.42 + phase * 1.8) * (8 + index * 1.5);
        for (const line of level.blockers) {
          const dx = line.x2 - line.x1, dy = line.y2 - line.y1;
          const u = Math.max(0, Math.min(1, ((x - line.x1) * dx + (y - line.y1) * dy) / (dx * dx + dy * dy)));
          assert.ok(Math.hypot(x - line.x1 - dx * u, y - line.y1 - dy * u) >= 25, `${level.title}: bird ${index + 1} overlaps steel`);
        }
      }
    });
  }
});
