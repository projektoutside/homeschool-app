import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const url = `${base}/Games/PreschoolFun/index.html`;
const output = 'output/preschool-premium';
await mkdir(output, { recursive: true });
assert.equal((await fetch(url)).status, 200);
const profiles = [
    ['desktop', chromium, 1440, 900], ['android-phone', chromium, 390, 844],
    ['iphone-webkit', webkit, 390, 844], ['small-phone-webkit', webkit, 320, 568],
    ['ipad-webkit', webkit, 1024, 1366], ['landscape-webkit', webkit, 844, 390],
    ['embedded-desktop', chromium, 1366, 900]
];
const rows = [];
for (const [name, engine, width, height] of profiles) {
    if (process.env.PRESCHOOL_FILTER && !new RegExp(process.env.PRESCHOOL_FILTER).test(name)) continue;
    const browser = await engine.launch(), context = await browser.newContext({ viewport: { width, height },
        hasTouch: name !== 'desktop' && name !== 'embedded-desktop', reducedMotion: name === 'small-phone-webkit' ? 'reduce' : 'no-preference' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.addInitScript(() => {
        window.__testAwards = [];
        window.LAHSPointsBridge = { init() {}, awardPoints: (points, detail) => window.__testAwards.push({ points, detail }) };
    });
    try {
        let frame = page;
        if (name === 'embedded-desktop') {
            await page.route('**/preschool-test-host', route => route.fulfill({ contentType: 'text/html', body: `<style>html,body{margin:0;height:100%}iframe{width:100%;height:100%;border:0}</style><iframe title="Preschool" src="${url}" allow="autoplay"></iframe>` }));
            await page.goto(`${base}/preschool-test-host`);
            frame = await (await page.locator('iframe').elementHandle()).contentFrame();
        } else await page.goto(url);
        await frame.waitForFunction(() => typeof window.render_game_to_text === 'function');
        await frame.evaluate(() => document.fonts.ready);
        const state = () => frame.evaluate(() => JSON.parse(window.render_game_to_text()));
        const awards = () => frame.evaluate(() => window.__testAwards);
        const layout = async () => {
            const size = await frame.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
            assert.ok(size.scrollWidth <= size.width + 1, `no horizontal overflow: ${JSON.stringify(size)}`);
            assert.ok(size.scrollHeight <= size.height + 1, `no page scrolling: ${JSON.stringify(size)}`);
            return size;
        };
        assert.equal((await state()).mode, 'start');
        const audioSupported = (await state()).sound.supported;
        assert.equal((await state()).sound.context, 'locked', 'no audio context before user gesture');
        assert.equal(await frame.locator('.game-shell').evaluate(element => element.inert), true);
        await layout();
        await page.screenshot({ path: `${output}/${name}-tutorial.png` });
        await frame.locator('[data-practice-choice="D"]').click();
        if (audioSupported) await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).sound.loaded.length === 9);
        await frame.locator('#practice-check').click();
        assert.match(await frame.locator('#practice-feedback').textContent(), /Try B/);
        await frame.locator('[data-practice-choice="B"]').click();
        await frame.locator('#practice-check').click();
        assert.match(await frame.locator('#tutorial-flight').getAttribute('class'), /is-boosted/);
        assert.equal((await awards()).length, 0, 'tutorial practice never awards points');
        assert.deepEqual((await state()).sound.failed, []);
        await frame.locator('#start-button').click();
        await frame.locator('#start-overlay').waitFor({ state: 'hidden' });
        await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).bird?.assetsReady);
        let s = await state();
        assert.equal(s.mode, 'alphabet'); assert.equal(s.sequence[0].value, 'A'); assert.equal(s.sequence.length, 4);
        assert.equal(s.sound.ambience, audioSupported);
        await layout();
        await page.screenshot({ path: `${output}/${name}-play.png` });
        for (const selector of ['#help-button', '#sound-toggle', '#submit-button', '.choice-card', '.bird-flight-strip']) {
            const boxes = await frame.locator(selector).evaluateAll(elements => elements.map(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
            for (const box of boxes) assert.ok(box.x >= -1 && box.y >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, `${selector} is fully reachable: ${JSON.stringify(box)}`);
        }
        const pick = async correct => {
            s = await state();
            const option = s.options.find(option => (option.value === s.answer) === correct && !s.eliminated.includes(option.id));
            await frame.locator(`[data-choice-id="${option.id}"]`).click();
            await frame.locator('#submit-button').click();
            return option;
        };
        const beforeWrong = s.bird.largeBirdX;
        const wrong = await pick(false);
        await frame.waitForFunction(() => !JSON.parse(window.render_game_to_text()).locked);
        s = await state();
        assert.ok(s.bird.largeBirdX > beforeWrong, 'incorrect answer brings pursuer closer');
        assert.equal(await frame.locator(`[data-choice-id="${wrong.id}"]`).isDisabled(), true);
        assert.equal((await awards()).length, 0);
        assert.match(await frame.locator('#answer-feedback').textContent(), /another answer/);
        await page.screenshot({ path: `${output}/${name}-retry.png` });
        const correct = s.options.find(option => option.value === s.answer);
        await frame.locator(`[data-choice-id="${correct.id}"]`).click();
        await frame.locator('#help-button').click();
        const helpState = await state(); assert.equal(helpState.paused, true); assert.equal(helpState.sound.ambience, false);
        await frame.evaluate(() => window.advanceTime(2000));
        assert.equal((await state()).puzzleId, helpState.puzzleId); assert.equal((await awards()).length, 0);
        await page.keyboard.press('Escape');
        assert.equal((await state()).selectedChoice, correct.value);
        assert.equal(await frame.evaluate(() => document.activeElement.id), 'help-button');
        const beforeCorrect = (await state()).bird.largeBirdX;
        await frame.locator('#submit-button').click();
        assert.equal((await awards()).length, 1); assert.equal((await awards())[0].points, 10);
        await frame.waitForFunction(x => JSON.parse(window.render_game_to_text()).bird.largeBirdX < x, beforeCorrect);
        await frame.waitForFunction(() => !JSON.parse(window.render_game_to_text()).locked);
        s = await state(); assert.equal(s.mode, 'counting'); assert.equal(s.sequence[0].value, '1');
        if (audioSupported) assert.ok(s.sound.played.correct > 0 && s.sound.played.boost > 0 && s.sound.played.place > 0 && s.sound.played.retry > 0);
        await frame.locator('#sound-toggle').click();
        s = await state(); assert.equal(s.sound.muted, true); assert.equal(s.sound.ambience, false); assert.equal(s.sound.active, 0);
        await frame.locator('#sound-toggle').click();
        assert.equal((await state()).sound.ambience, audioSupported);
        if (name === 'embedded-desktop') {
            const send = data => page.evaluate(message => frames[0].postMessage(message, location.origin), data);
            await send({ type: 'LAHS_HOST_LIFECYCLE', phase: 'pause' });
            await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).paused);
            s = await state(); assert.equal(s.sound.ambience, false);
            await send({ type: 'LAHS_HOST_LIFECYCLE', phase: 'resume' });
            await frame.waitForFunction(() => !JSON.parse(window.render_game_to_text()).paused);
            await send({ type: 'APP_SOUND_SETTINGS_UPDATE', payload: { muted: true } });
            await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).sound.muted);
            await frame.evaluate(() => window.dispatchEvent(new MessageEvent('message', { source: window.parent, origin: 'https://untrusted.invalid', data: { type: 'APP_SOUND_SETTINGS_UPDATE', payload: { muted: false } } })));
            assert.equal((await state()).sound.muted, true, 'untrusted origin cannot change audio');
            await send({ type: 'APP_SOUND_SETTINGS_UPDATE', payload: { muted: false } });
            await frame.waitForFunction(() => !JSON.parse(window.render_game_to_text()).sound.muted);
        }
        if (name === 'desktop' || name === 'iphone-webkit') {
            for (let turn = 0; turn < 15 && !(await state()).sessionWon; turn++) {
                await pick(true);
                await frame.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return s.sessionWon || !s.locked; });
            }
            s = await state(); assert.equal(s.sessionWon, true); assert.equal(s.winOverlayVisible, true);
            if (audioSupported) assert.ok(s.sound.played.streak > 0 && s.sound.played.win > 0);
            await page.screenshot({ path: `${output}/${name}-win.png` });
            await frame.locator('#session-play-again-button').click();
            assert.equal((await state()).stars, 0);
            for (let turn = 0; turn < 12 && !(await state()).sessionLost; turn++) {
                s = await state();
                if (s.options.every(option => option.value === s.answer || s.eliminated.includes(option.id))) await pick(true);
                else await pick(false);
                await frame.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return s.sessionLost || !s.locked; });
            }
            await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).loseOverlayVisible);
            if (audioSupported) assert.ok((await state()).sound.played.bump > 0);
            await page.screenshot({ path: `${output}/${name}-retry-session.png` });
            await frame.locator('#session-try-again-button').click();
            assert.equal((await state()).sessionLost, false);
        }
        assert.deepEqual(errors, []);
        rows.push({ name, pass: true, physicalDevice: false, audioCoverage: audioSupported ? 'Web Audio decode and playback events verified' : 'AudioContext unavailable in this installed engine; gameplay only', loadedAudio: (await state()).sound.loaded.length, awards: (await awards()).length, errors });
        console.log(`PASS ${name}: tutorial, practice isolation, answers, birds, audio, help and responsive fit`);
    } catch (error) {
        rows.push({ name, pass: false, error: error.stack, errors, state: await page.frames().find(f => f.url().includes('/Games/PreschoolFun/'))?.evaluate(() => typeof window.render_game_to_text === 'function' ? JSON.parse(window.render_game_to_text()) : null).catch(() => null) });
        await page.screenshot({ path: `${output}/${name}-failure.png` });
        console.log(`FAIL ${name}: ${error.message}`);
    } finally { await browser.close(); }
}
await writeFile(`${output}/${process.env.PRESCHOOL_REPORT || 'browser-report.json'}`, JSON.stringify(rows, null, 2));
if (rows.some(row => !row.pass)) process.exitCode = 1;
