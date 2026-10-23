import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const url = `${base}/Games/Many%20Birds%20One%20Stone/index.html`;
const out = 'output/birds-menu';
await mkdir(out, { recursive: true });
assert.equal((await fetch(url)).status, 200, 'preview server must be available before testing');
const key = 'lahs-many-birds-one-stone-v1';
const snapshot = frame => frame.evaluate(() => JSON.parse(window.render_game_to_text()));
const saved = { campaignVersion: 2, highestUnlocked: 9, selectedLevel: 8, onboarded: true, bestStats: { 1: { stars: 3, points: 160 } }, shop: { version: 1, coins: 450, tank: 1, bottles: 2, owned: [], ball: 'standard', finish: 'brass', trail: false, ledger: [] } };
let baselineHeight;
{
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const head = file => execFileSync('git', ['show', `HEAD:public/Games/Many Birds One Stone/${file}`], { encoding: 'utf8' });
  await page.route('**/Many%20Birds%20One%20Stone/index.html', route => route.fulfill({ contentType: 'text/html', body: head('index.html') }));
  await page.route('**/Many%20Birds%20One%20Stone/versus.js', route => route.fulfill({ contentType: 'text/javascript', body: head('versus.js') }));
  await page.goto(url);
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function');
  await page.locator('#overlayPrimary').click();
  baselineHeight = (await page.locator('#gameCanvas').boundingBox()).height;
  await browser.close();
}
const profiles = [
  ['desktop', chromium, 1440, 900], ['android-phone', chromium, 390, 844],
  ['iphone-webkit', webkit, 390, 844], ['small-phone-webkit', webkit, 320, 568],
  ['ipad-webkit', webkit, 1024, 1366], ['short-landscape-webkit', webkit, 844, 390],
  ['embedded-desktop', chromium, 1366, 900],
];
const rows = [];
for (const [name, engine, width, height] of profiles) {
  if (process.env.BIRDS_MENU_FILTER && !new RegExp(process.env.BIRDS_MENU_FILTER).test(name)) continue;
  const browser = await engine.launch(), context = await browser.newContext({ viewport: { width, height }, hasTouch: name !== 'desktop' && name !== 'embedded-desktop', isMobile: name !== 'desktop' && name !== 'embedded-desktop', reducedMotion: name === 'desktop' ? 'no-preference' : 'reduce' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    if (name !== 'desktop') await context.addInitScript(({ key, saved }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(saved)); }, { key, saved });
    let frame = page;
    if (name === 'embedded-desktop') {
      await page.route('**/birds-menu-host', route => route.fulfill({ contentType: 'text/html', body: `<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style><iframe title="Birds" src="${url}" allow="autoplay;fullscreen"></iframe>` }));
      await page.goto(`${base}/birds-menu-host`);
      frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    } else await page.goto(url);
    await frame.waitForFunction(() => typeof window.render_game_to_text === 'function');
    await frame.evaluate(() => document.fonts.ready);
    await frame.locator('.main-menu-content').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {}))));
    await frame.waitForFunction(() => {
      const image = new Image(); image.src = 'assets/main-menu-woodland.webp';
      return image.complete && image.naturalWidth > 0;
    });
    const geometry = async () => {
      const result = await frame.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
      assert.ok(result.scrollWidth <= result.width + 1 && result.scrollHeight <= result.height + 1, `no page overflow: ${JSON.stringify(result)}`);
      return result;
    };
    const menuGeometry = await geometry();
    assert.equal((await snapshot(frame)).screen, 'menu');
    assert.equal(await frame.locator('#gameCanvas').isVisible(), false);
    for (const id of ['singlePlayerButton', 'menuVersusButton']) {
      const box = await frame.locator(`#${id}`).boundingBox();
      assert.ok(box.height >= 44 && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, `${id} fits and is usable`);
    }
    await page.screenshot({ path: `${out}/${name}-menu.png` });
    await frame.locator('#menuSoundButton').click();
    assert.equal(await frame.locator('#menuSoundButton').getAttribute('aria-pressed'), 'true');
    await frame.locator('#menuVersusButton').click();
    assert.equal(await frame.locator('#vsBirdCount').inputValue(), '3');
    assert.equal(await frame.locator('#vsTimeLimit').inputValue(), '60');
    await page.keyboard.press('Escape');
    assert.equal((await snapshot(frame)).screen, 'menu');
    assert.equal(await frame.evaluate(() => document.activeElement.id), 'menuVersusButton');
    await frame.locator('#singlePlayerButton').click();
    assert.equal((await snapshot(frame)).singlePlayerMenu, true);
    assert.equal(await frame.locator('#gameCanvas').isVisible(), false);
    await geometry();
    for (const id of ['progressivePlayButton', 'customPlayButton']) {
      const box = await frame.locator(`#${id}`).boundingBox();
      assert.ok(box.height >= 44 && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, `${id} fits`);
    }
    await page.screenshot({ path: `${out}/${name}-single-player-choices.png` });
    const progressBefore = await frame.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    await frame.locator('#customPlayButton').click();
    assert.equal(await frame.locator('#levelMapTitle').textContent(), 'Choose a level');
    assert.equal(await frame.locator('#mapScroll button').count(), 18);
    assert.equal(await frame.locator('#mapScroll button:disabled').count(), 0, 'all 18 custom levels are open');
    await page.screenshot({ path: `${out}/${name}-custom-levels.png` });
    await page.keyboard.press('Escape');
    assert.equal((await snapshot(frame)).singlePlayerMenu, true);
    assert.equal(await frame.evaluate(() => document.activeElement.id), 'customPlayButton');
    await page.keyboard.press('Escape');
    assert.equal((await snapshot(frame)).singlePlayerMenu, false);
    await frame.locator('#singlePlayerButton').click();
    await frame.locator('#menuGamesButton').click();
    assert.equal((await snapshot(frame)).singlePlayerMenu, false);
    await frame.locator('#singlePlayerButton').click();
    await frame.locator('#progressivePlayButton').click();
    assert.equal((await snapshot(frame)).level, 1, 'progressive play starts from level one');
    assert.equal((await snapshot(frame)).playMode, 'progressive');
    const progressAfter = await frame.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(progressAfter.highestUnlocked, progressBefore.highestUnlocked, 'starting from one keeps unlocked levels');
    assert.deepEqual(progressAfter.bestStats, progressBefore.bestStats, 'starting from one keeps earned stars');
    assert.deepEqual(progressAfter.shop, progressBefore.shop, 'starting from one keeps wallet and upgrades');
    if (name === 'short-landscape-webkit') {
      assert.ok(await frame.locator('#rotateNotice').isVisible());
      await frame.locator('#rotateHomeButton').click();
      assert.equal((await snapshot(frame)).screen, 'menu');
      assert.deepEqual(errors, []);
      rows.push({ name, pass: true, menuGeometry, landscapeRecovery: true, physicalDevice: false });
      continue;
    }
    await frame.locator('#levelMapButton').click();
    assert.equal(await frame.locator('#mapScroll button:disabled').count(), 18 - progressBefore.highestUnlocked, 'progressive map keeps normal locks');
    await page.keyboard.press('Escape');
    assert.equal((await frame.evaluate(() => window.__manyBirdsDebug.setLevel(17))).level, 1, 'progressive navigation rejects a locked level');
    await frame.locator('#homeButton').click();
    await frame.locator('#singlePlayerButton').click();
    await frame.locator('#customPlayButton').click();
    await frame.locator('#mapScroll button[data-level="17"]').click();
    await frame.waitForFunction(() => document.getElementById('gameCanvas').clientHeight > 100 && JSON.parse(window.render_game_to_text()).birdArt.loaded);
    const before = await snapshot(frame), canvas = await frame.locator('#gameCanvas').boundingBox();
    assert.equal(before.screen, 'single-player');
    assert.equal(before.level, 18);
    assert.equal(before.playMode, 'custom');
    assert.equal(await frame.evaluate(key => JSON.parse(localStorage.getItem(key)).selectedLevel, key), 1, 'custom selection keeps the progressive position');
    await frame.locator('#prevLevelButton').click();
    assert.equal((await snapshot(frame)).level, 17);
    await frame.locator('#nextLevelButton').click();
    assert.equal((await snapshot(frame)).level, 18);
    assert.equal(await frame.locator('#versusButton').isVisible(), false);
    assert.equal(await frame.locator('#statusCopy').textContent(), '');
    assert.ok(Math.abs(canvas.width / canvas.height - 9 / 16) < .005, 'undistorted larger playfield');
    if (name === 'android-phone') assert.ok(canvas.height > baselineHeight + 60, `playfield grows: ${baselineHeight} -> ${canvas.height}`);
    await geometry();
    await page.screenshot({ path: `${out}/${name}-play.png` });
    const point = (x, y) => ({ x: canvas.x + x / 360 * canvas.width, y: canvas.y + y / 640 * canvas.height });
    const start = point(70, 400), end = point(140, 430);
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 10 }); await page.mouse.up();
    assert.equal((await snapshot(frame)).lines.length, 1, 'drawing works on the resized canvas');
    await frame.locator('#levelMapButton').click();
    assert.equal(await frame.locator('#mapScroll button:disabled').count(), 0, 'in-game custom map stays open');
    await page.keyboard.press('Escape');
    await frame.locator('#shopButton').click(); await page.keyboard.press('Escape');
    await frame.locator('#homeButton').click();
    const paused = await snapshot(frame);
    await frame.evaluate(() => window.advanceTime(2000));
    assert.equal((await snapshot(frame)).elapsed, paused.elapsed, 'menu freezes gameplay');
    await frame.locator('#singlePlayerButton').click();
    await frame.locator('#continuePlayButton').click();
    assert.equal((await snapshot(frame)).level, before.level);
    assert.equal((await snapshot(frame)).lines.length, 1, 'menu preserves the unfinished route');
    await frame.locator('#clearButton').click();
    assert.equal((await snapshot(frame)).lines.length, 0);
    await frame.locator('#homeButton').click();
    await frame.locator('#menuVersusButton').click();
    await frame.locator('#vsDialogActions button').last().click();
    assert.equal((await snapshot(frame)).versus.phase, 'building');
    assert.equal((await snapshot(frame)).screen, 'versus');
    assert.ok(await frame.locator('#versusButton').isVisible());
    await frame.locator('#versusButton').click();
    await frame.getByRole('button', { name: 'Leave match', exact: true }).click();
    assert.equal((await snapshot(frame)).screen, 'menu');
    await frame.locator('#singlePlayerButton').click();
    await frame.locator('#continuePlayButton').click();
    const after = await snapshot(frame);
    assert.equal(after.level, before.level); assert.equal(after.shop.coins, before.shop.coins);
    assert.equal(after.playMode, 'custom', 'VS restores the single-player mode');
    if (name === 'embedded-desktop') {
      await page.evaluate(() => frames[0].postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'pause' }, location.origin));
      await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).paused);
      await page.evaluate(() => frames[0].postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'resume' }, location.origin));
      await frame.waitForFunction(() => !JSON.parse(window.render_game_to_text()).paused);
    }
    // Clear a locked penultimate level and the finale without advancing campaign unlocks.
    await frame.locator('#prevLevelButton').click();
    await frame.evaluate(() => window.__manyBirdsDebug.forceWin());
    assert.equal(await frame.evaluate(key => JSON.parse(localStorage.getItem(key)).highestUnlocked, key), progressBefore.highestUnlocked);
    assert.equal(await frame.locator('#overlayPrimary').textContent(), 'Choose a level');
    await frame.locator('#overlayPrimary').click();
    assert.equal(await frame.locator('#mapScroll button:disabled').count(), 0);
    await frame.locator('#mapScroll button[data-level="17"]').click();
    await frame.evaluate(() => window.__manyBirdsDebug.forceWin());
    const customSave = await frame.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(customSave.highestUnlocked, progressBefore.highestUnlocked, 'custom wins never unlock progressive levels');
    assert.equal(customSave.selectedLevel, 1);
    assert.ok(customSave.bestStats['18'].stars > 0, 'custom play still saves earned stars');
    assert.ok(customSave.shop.coins > before.shop.coins, 'custom play still earns normal coins');
    assert.equal(await frame.locator('#overlayTitle').textContent(), 'Level 18 complete');
    await frame.locator('#overlayPrimary').click();
    await page.keyboard.press('Escape');
    await frame.locator('#homeButton').click();
    await frame.locator('#singlePlayerButton').click();
    // Starting a fresh attempt after time spent in menus must not shift its clock into the future.
    await frame.waitForTimeout(300);
    await frame.locator('#progressivePlayButton').click();
    const clearReceipt = await frame.evaluate(() => {
      const awards = [];
      window.LAHSPointsBridge = { awardPoints: (points, detail) => awards.push({ points, detail }) };
      window.__manyBirdsDebug.forceWin();
      return awards[0];
    });
    assert.ok(clearReceipt.detail.meta.clearTimeMs >= 0, `new progressive attempt has a valid clear time: ${clearReceipt.detail.meta.clearTimeMs}`);
    await frame.locator('#overlayPrimary').click();
    assert.equal((await snapshot(frame)).level, 2, 'progressive clear advances to the next level');
    assert.equal(await frame.evaluate(key => JSON.parse(localStorage.getItem(key)).highestUnlocked, key), Math.max(2, progressBefore.highestUnlocked));
    await frame.locator('#homeButton').click();
    await frame.locator('#singlePlayerButton').click();
    await frame.locator('#customPlayButton').click();
    await frame.locator('#mapScroll button[data-level="17"]').click();
    await page.reload();
    if (name === 'embedded-desktop') frame = await (await page.locator('iframe').elementHandle()).contentFrame();
    await frame.waitForFunction(() => typeof window.render_game_to_text === 'function');
    assert.equal((await snapshot(frame)).playMode, 'progressive');
    assert.equal((await snapshot(frame)).level, 2, 'reload restores saved progressive position, not custom selection');
    await frame.locator('#singlePlayerButton').click();
    await frame.locator('#continuePlayButton').click();
    await frame.locator('#levelMapButton').click();
    assert.equal(await frame.locator('#mapScroll button:disabled').count(), 18 - Math.max(2, progressBefore.highestUnlocked));
    await page.keyboard.press('Escape');
    await frame.locator('#homeButton').click();
    assert.deepEqual(errors, []);
    rows.push({ name, pass: true, menuGeometry, canvasHeight: canvas.height, baselinePhoneHeight: baselineHeight, level: before.level, walletPreserved: true, physicalDevice: false, errors });
    console.log(`PASS ${name}: all custom levels, isolated unlocks, rewards, progressive advance and reload`);
  } catch (error) {
    rows.push({ name, pass: false, error: error.stack, errors });
    await page.screenshot({ path: `${out}/${name}-failure.png` });
    console.log(`FAIL ${name}: ${error.message}`);
  } finally { await browser.close(); }
}
await writeFile(`${out}/${process.env.BIRDS_MENU_REPORT || 'browser-report.json'}`, JSON.stringify(rows, null, 2));
if (rows.some(row => !row.pass)) process.exitCode = 1;
