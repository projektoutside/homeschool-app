import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
page.setDefaultTimeout(45000);
const errors = [], ledger = [], learned = new Set();
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => { window.__testAwards = []; window.LAHSPointsBridge = { init() {}, awardPoints: points => window.__testAwards.push(points) }; });
try {
    await page.goto(`${process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186'}/Games/PreschoolFun/index.html`);
    await page.locator('#start-button').click(); await page.locator('#auto-voice').click();
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    let replays = 0;
    for (let turn = 0; turn < 20; turn++) {
        const s = await state();
        assert.equal(s.selectedChoice, null); assert.equal(s.canSubmit, false);
        assert.equal(await page.locator('.is-missing .slot-blank').count(), 1);
        const correct = s.options.find(option => option.value === s.answer);
        await page.locator(`[data-choice-id="${correct.id}"]`).click();
        await page.locator('#submit-button').click(); learned.add(s.mode);
        assert.deepEqual((await state()).feathers.slice().sort(), [...learned].sort());
        await page.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return s.sessionWon || !s.locked; }, null, { polling: 100 });
        const after = await state();
        ledger.push({ turn: turn + 1, activity: s.mode, feathers: after.feathers.length, missionWon: after.sessionWon });
        assert.deepEqual(await page.evaluate(() => window.__testAwards), Array(turn + 1).fill(10));
        if (after.sessionWon) {
            await page.locator('#session-play-again-button').click(); replays++;
            assert.equal((await state()).stars, 0);
            assert.equal((await state()).feathers.length, learned.size, 'learned feathers survive replay');
        }
        if (learned.size === 6 && ledger.length >= 9) break;
    }
    assert.equal(learned.size, 6, 'all six skills can be collected through the actual play/replay flow');
    assert.ok(replays > 0);
    assert.equal(await page.locator('#skill-collection').getAttribute('aria-label'), '6 of 6 skill feathers collected');
    assert.equal((await state()).selectedChoice, null);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: 'output/preschool-variety/six-feathers.png' });
    await writeFile('output/preschool-variety/progression-report.json', JSON.stringify({ pass: true, replays, learned: [...learned], ledger, errors, physicalDevice: false }, null, 2));
    console.log(`PASS: six skill feathers, ${replays} replays, ${ledger.length} correct answers, no duplicate awards`);
} finally { await browser.close(); }
