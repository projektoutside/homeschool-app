import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const key = 'lahs-many-birds-one-stone-v1', base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const url = `${base}/Games/Many%20Birds%20One%20Stone/index.html`, output = 'output/birds-shop';
await mkdir(output, { recursive: true });
const hash = createHash('sha256');
for (const file of ['index.html', 'shop.js', 'shop.css', 'style.css', 'drop-mechanism.js', 'physics.js', 'campaign.js', 'birds.js', 'runways.js', 'level-map.js']) hash.update(file).update(await readFile(`public/Games/Many Birds One Stone/${file}`));
const fingerprint = hash.digest('hex'), report = [];
const snapshot = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const seed = stats => ({ campaignVersion: 2, highestUnlocked: 18, selectedLevel: 1, onboarded: true, bestStats: stats });
const fullStats = Object.fromEntries(Array.from({ length: 18 }, (_, i) => [i + 1, { points: 150, stars: 3, clearTimeMs: 1200 }]));
async function setup(browser, options, data = seed({}), extra) {
  const context = await browser.newContext(options), page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/Many%20Birds%20One%20Stone/index.html', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('function frame(now) {', 'function frame(now) { return;');
    await route.fulfill({ response, body });
  });
  await page.addInitScript(({ key, data }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data)); }, { key, data });
  if (extra) await page.addInitScript(extra);
  await page.goto(url);
  await page.waitForFunction(() => window.render_game_to_text && document.fonts.status === 'loaded', undefined, { polling: 50 });
  await page.evaluate(() => window.advanceTime(0));
  return { context, page, errors };
}
async function act(page, action) {
  await page.locator(`[data-shop-action="${action}"]`).click();
  // Production deliberately rejects duplicate activation from the same double tap.
  await page.waitForTimeout(370);
}
async function noOverflow(page) {
  const dimensions = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, dialog: document.querySelector('#woodlandShop').getBoundingClientRect().toJSON(), scroll: document.querySelector('#shopScroll').clientHeight }));
  assert.ok(dimensions.sw <= dimensions.w + 1 && dimensions.sh <= dimensions.h + 1, JSON.stringify(dimensions));
  if (dimensions.dialog.height) assert.ok(dimensions.dialog.top >= 0 && dimensions.dialog.bottom <= dimensions.h + 1 && dimensions.scroll > 20, JSON.stringify(dimensions));
}

for (const [name, engine, options] of [
  ['desktop', chromium, { viewport: { width: 1440, height: 1000 } }],
  ['android-touch', chromium, { viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true }],
  ['iphone-webkit', webkit, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }],
  ['ipad-webkit', webkit, { viewport: { width: 1024, height: 1366 }, hasTouch: true, isMobile: true }],
]) {
  if (process.env.BIRDS_SHOP_FILTER && !new RegExp(process.env.BIRDS_SHOP_FILTER).test(name)) continue;
  const browser = await engine.launch(), row = { name, fingerprint, physical: false };
  try {
    const { context, page, errors } = await setup(browser, options);
    let s = await snapshot(page); assert.equal(s.shop.coins, 60);
    await page.locator('#shopButton').click(); await noOverflow(page);
    assert.equal(await page.locator('[data-shop-action="tank"]').isDisabled(), true);
    assert.equal(await page.locator('[data-shop-action="use-bottle"]').isDisabled(), true);
    await page.locator('[data-shop-action="bottle"]').dblclick(); await page.waitForTimeout(370);
    s = await snapshot(page); assert.equal(s.shop.coins, 30); assert.equal(s.shop.bottles, 1, 'double tap buys one bottle');
    const held = s; await page.evaluate(() => window.advanceTime(4000));
    assert.equal((await snapshot(page)).elapsed, held.elapsed);
    await page.locator('#closeShop').click();
    assert.equal(await page.locator('#shopButton').evaluate(el => document.activeElement === el), true);
    await page.evaluate(() => window.__manyBirdsDebug.applyStroke([{ x: 60, y: 260 }, { x: 200, y: 290 }]));
    const beforeRefill = await snapshot(page); assert.ok(beforeRefill.inkLeftRatio < 1);
    await page.locator('#shopButton').click(); await act(page, 'use-bottle');
    s = await snapshot(page); assert.equal(s.shop.bottles, 0); assert.equal(s.shop.coins, 30); assert.equal(s.inkLeftRatio, 1);
    assert.deepEqual(s.lines, beforeRefill.lines);
    await page.locator('#resumeFromShop').click();
    await page.locator('#hintButton').click();
    await page.evaluate(() => { window.__manyBirdsDebug.forceWin(); window.__manyBirdsDebug.forceWin(); });
    s = await snapshot(page); assert.equal(s.shop.coins, 135, 'first two-star clear earns 105 once');
    await page.locator('#overlaySecondary').click(); await page.locator('#hintButton').click();
    await page.evaluate(() => window.__manyBirdsDebug.forceWin());
    assert.equal((await snapshot(page)).shop.coins, 150, 'replay earns 15');
    await page.locator('#overlaySecondary').click(); await page.evaluate(() => window.__manyBirdsDebug.forceWin());
    assert.equal((await snapshot(page)).shop.coins, 180, 'star improvement adds 15 to replay earnings');
    await page.locator('#resultShopButton').click();
    assert.equal((await snapshot(page)).shopVisible, true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#resultShopButton').evaluate(el => document.activeElement === el), true);
    await page.reload(); assert.equal((await snapshot(page)).shop.coins, 180, 'reload never repeats welcome or historic grants');
    row.rewardsAndRefill = true; await context.close();

    const rich = await setup(browser, options, seed(fullStats));
    const p = rich.page; assert.equal((await snapshot(p)).shop.coins, 1950);
    await p.locator('#shopButton').click();
    await p.screenshot({ path: `${output}/${name}-supplies.png` });
    for (const action of ['tank', 'tank', 'tank', 'boulder', 'steel', 'jade', 'firefly', 'bottle']) await act(p, action);
    s = await snapshot(p); assert.equal(s.shop.coins, 400); assert.equal(s.shop.tank, 3);
    assert.equal(s.loadout.radius, 12, 'shopping preserves the current attempt');
    assert.equal(s.loadout.inkMultiplier, 1);
    assert.equal(await p.locator('[data-shop-action="tank"]').isDisabled(), true);
    await p.locator('#ballsShopTitle').scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${output}/${name}-balls.png` });
    await p.locator('#closeShop').click(); await p.locator('#restartButton').click();
    s = await snapshot(p); assert.equal(s.stone.radius, 14); assert.equal(s.loadout.inkMultiplier, 1.5); assert.equal(s.loadout.finish, 'jade'); assert.equal(s.loadout.trail, true);
    const budget = s.inkBudget;
    await p.reload(); s = await snapshot(p); assert.equal(s.shop.coins, 400); assert.equal(s.stone.radius, 14); assert.equal(s.inkBudget, budget);
    await p.locator('#dropButton').click(); await p.evaluate(() => window.advanceTime(100));
    const inFlight = await snapshot(p);
    await p.locator('#shopButton').click(); await act(p, 'standard'); await act(p, 'brass'); await act(p, 'firefly');
    assert.equal((await snapshot(p)).shop.coins, 400, 'owned equipment changes are free');
    assert.equal((await snapshot(p)).stone.radius, 14, 'equipment selection never changes an airborne ball');
    await p.evaluate(() => window.advanceTime(3000));
    assert.deepEqual((await snapshot(p)).stone, inFlight.stone, 'shopping pauses an airborne ball');
    // Keyboard trap, host pause, text zoom and rotation while the modal is open.
    await p.locator('#resumeFromShop').focus(); await p.keyboard.press('Tab');
    assert.equal(await p.locator('#closeShop').evaluate(el => document.activeElement === el), true);
    await p.keyboard.press('Shift+Tab'); assert.equal(await p.locator('#resumeFromShop').evaluate(el => document.activeElement === el), true);
    await p.evaluate(() => window.postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'pause' }, location.origin));
    await p.waitForTimeout(30); await p.locator('#closeShop').click();
    const paused = await snapshot(p); await p.evaluate(() => window.advanceTime(5000)); assert.equal((await snapshot(p)).elapsed, paused.elapsed);
    await p.evaluate(() => window.postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'resume' }, location.origin)); await p.waitForTimeout(30);
    assert.equal((await snapshot(p)).paused, false);
    await p.locator('#shopButton').click();
    await p.setViewportSize({ width: 320, height: 568 });
    await p.evaluate(() => document.documentElement.style.fontSize = '24px'); await noOverflow(p);
    await p.screenshot({ path: `${output}/${name}-small-text-zoom.png` });
    await p.setViewportSize({ width: 852, height: 393 }); await noOverflow(p);
    assert.equal(await p.locator('#closeShop').isVisible(), true);
    await p.setViewportSize({ width: 320, height: 568 }); await p.locator('#closeShop').click();
    await p.locator('#restartButton').click(); await p.evaluate(() => window.__manyBirdsDebug.forceWin());
    await noOverflow(p);
    assert.equal(await p.locator('#overlayPrimary').isVisible(), true);
    assert.equal(await p.locator('#resultShopButton').isVisible(), true);
    await p.locator('#resultShopButton').click(); await noOverflow(p);
    await p.locator('#closeShop').click(); await p.locator('#resultMapButton').click();
    assert.equal((await snapshot(p)).mapVisible, true);
    await p.locator('#closeLevelMap').click(); await noOverflow(p);
    assert.deepEqual(rich.errors, []); assert.deepEqual(errors, []);
    row.purchasesPersistenceAndModal = true; await rich.context.close();
    row.pass = true; console.log(`PASS ${name}`);
  } catch (e) { row.pass = false; row.error = e.stack; console.log(`FAIL ${name}: ${e.message}`); }
  finally { await browser.close(); }
  report.push(row); await writeFile(`${output}/${process.env.BIRDS_SHOP_REPORT || 'browser-report'}.json`, JSON.stringify(report, null, 2));
}

if (!process.env.BIRDS_SHOP_FILTER || /storage/.test(process.env.BIRDS_SHOP_FILTER)) {
  const browser = await chromium.launch(), row = { name: 'storage-migration-failure-and-ball-routes', fingerprint, physical: false };
  try {
    for (const [name, data, coins, level] of [
      ['legacy', { highestUnlocked: 3, selectedLevel: 2, onboarded: true, bestStats: { 1: { points: 125 } } }, 150, 8],
      ['malformed', '{bad json', 60, 1],
      ['invalid-shop', { ...seed({}), shop: { version: 1, coins: { toString: {} }, tank: -1, ball: 'boulder', finish: 'jade', bottles: 999, owned: ['__proto__', { toString: {} }] } }, 0, 1],
    ]) {
      const { context, page, errors } = await setup(browser, {}, data);
      const s = await snapshot(page); assert.equal(s.shop.coins, coins, name); assert.equal(s.level, level, name);
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key); assert.equal(saved.shop.version, 1);
      assert.deepEqual(errors, []); await context.close();
    }
    const blocked = await setup(browser, {}, seed({}));
    await blocked.page.locator('#shopButton').click();
    const before = (await snapshot(blocked.page)).shop;
    await blocked.page.evaluate(() => Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'QuotaExceededError'); });
    await act(blocked.page, 'bottle');
    assert.deepEqual((await snapshot(blocked.page)).shop, before);
    assert.match(await blocked.page.locator('#shopMessage').innerText(), /Nothing was spent/);
    await blocked.context.close();

    const equipped = { ...seed({}), shop: { version: 1, coins: 100, tank: 0, bottles: 0, owned: ['boulder'], ball: 'boulder', finish: 'brass', ledger: [] } };
    const { context, page, errors } = await setup(browser, {}, equipped);
    row.routes = await page.evaluate(() => {
      const d = window.__manyBirdsDebug, rows = [];
      for (let i = 0; i < 18; i++) {
        d.setLevel(i); const level = window.WoodlandCampaign.levels[i];
        d.moveClaw(level.hintAim); level.hint.forEach(stroke => d.applyStroke(stroke));
        window.advanceTime(2000); d.drop(); window.advanceTime(12000); const s = d.snapshot();
        rows.push({ level: i + 1, radius: s.stone.radius, win: s.outcome === 'win', floor: s.stone.onFloor });
      }
      return rows;
    });
    await writeFile(`${output}/boulder-routes.json`, JSON.stringify(row.routes, null, 2));
    assert.ok(row.routes.every(r => r.win && r.floor && r.radius === 14), JSON.stringify(row.routes.filter(r => !r.win || !r.floor)));
    assert.deepEqual(errors, []); await context.close(); row.pass = true; console.log(`PASS ${row.name}`);
  } catch (e) { row.pass = false; row.error = e.stack; console.log(`FAIL ${row.name}: ${e.message}`); }
  finally { await browser.close(); }
  report.push(row); await writeFile(`${output}/${process.env.BIRDS_SHOP_REPORT || 'browser-report'}.json`, JSON.stringify(report, null, 2));
}
if (report.some(row => !row.pass)) process.exitCode = 1;
