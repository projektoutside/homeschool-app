import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const url = `${base}/Games/PreschoolFun/index.html`, output = 'output/preschool-variety';
await mkdir(output, { recursive: true });
const profiles = [
    ['desktop', chromium, 1440, 900], ['android-viewport', chromium, 390, 844],
    ['iphone-webkit', webkit, 390, 844], ['small-phone-webkit', webkit, 320, 568],
    ['ipad-webkit', webkit, 1024, 1366], ['landscape-webkit', webkit, 844, 390],
    ['embedded', chromium, 1366, 900]
];
const report = [];
for (const [name, engine, width, height] of profiles) {
    if (process.env.PRESCHOOL_FILTER && !new RegExp(process.env.PRESCHOOL_FILTER).test(name)) continue;
    const browser = await engine.launch(), context = await browser.newContext({ viewport: { width, height }, hasTouch: !['desktop', 'embedded'].includes(name), reducedMotion: name === 'small-phone-webkit' ? 'reduce' : 'no-preference' });
    context.setDefaultTimeout(45000);
    await context.addInitScript(() => { window.__testAwards = []; window.LAHSPointsBridge = { init() {}, awardPoints: points => window.__testAwards.push(points) }; });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let frame = page;
    try {
        if (name === 'embedded') {
            await page.route('**/variety-test-host', route => route.fulfill({ contentType: 'text/html', body: `<style>html,body{margin:0;height:100%}iframe{width:100%;height:100%;border:0}</style><iframe title="Preschool" src="${url}" allow="autoplay"></iframe>` }));
            await page.goto(`${base}/variety-test-host`); frame = await (await page.locator('iframe').elementHandle()).contentFrame();
        } else await page.goto(url);
        await frame.waitForFunction(() => typeof window.render_game_to_text === 'function');
        await frame.evaluate(() => document.fonts.ready);
        const state = () => frame.evaluate(() => JSON.parse(window.render_game_to_text()));
        const fit = async () => {
            const box = await frame.evaluate(() => ({ w: innerWidth, h: innerHeight, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight }));
            assert.ok(box.sw <= width + 1 && box.sh <= height + 1, `${name}: ${JSON.stringify(box)}`);
            for (const selector of ['#question-listen', '#auto-voice', '#submit-button', '.choice-card', '.bird-escape-lane']) {
                const boxes = await frame.locator(selector).evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
                for (const r of boxes) assert.ok(r.x >= -1 && r.y >= -1 && r.x + r.w <= width + 1 && r.y + r.h <= height + 1, `${selector}: ${JSON.stringify(r)}`);
            }
        };
        const blank = async () => {
            const s = await state();
            assert.equal(s.selectedChoice, null); assert.equal(s.canSubmit, false);
            assert.equal(s.sequence.filter(item => item.missing).length, 1);
            assert.equal(s.sequence.find(item => item.missing).value, '_');
            assert.equal(await frame.locator('.slot-card.is-missing .slot-blank').count(), 1);
            assert.equal(await frame.locator('.slot-card.is-preview-filled,.slot-card.is-filled-correct').count(), 0);
            assert.equal(new Set(s.options.map(option => option.id)).size, 4);
            assert.equal(new Set(s.options.map(option => option.value)).size, 4);
            assert.equal(s.options.filter(option => option.value === s.answer).length, 1);
            assert.ok(s.options.every(option => option.id.startsWith(`puzzle-${s.puzzleId}-`)));
        };
        await frame.locator('#start-button').click();
        await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).bird.assetsReady);
        await frame.locator('#auto-voice').click(); await blank(); await fit();
        const oldChoices = await frame.locator('.choice-card').elementHandles();
        let s = await state();
        const wrong = s.options.find(option => option.value !== s.answer);
        await frame.locator(`[data-choice-id="${wrong.id}"]`).click(); await frame.locator('#submit-button').click();
        await frame.waitForFunction(() => !JSON.parse(window.render_game_to_text()).locked, null, { polling: 100 }); await blank();
        s = await state(); const answer = s.options.find(option => option.value === s.answer);
        const answerButton = frame.locator(`[data-choice-id="${answer.id}"]`);
        if (name === 'desktop') {
            const from = await answerButton.boundingBox(), to = await frame.locator('.slot-card.is-missing').boundingBox();
            await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
            await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 }); await page.mouse.up();
        } else if (name === 'ipad-webkit') await answerButton.press('Enter');
        else if (name === 'embedded') await answerButton.click();
        else await answerButton.tap();
        assert.equal((await state()).selectedChoice, answer.value);
        assert.deepEqual(await frame.evaluate(() => window.__testAwards), []);
        await frame.locator('#submit-button').click();
        await frame.waitForFunction(() => !JSON.parse(window.render_game_to_text()).locked, null, { polling: 100 });
        assert.deepEqual(await frame.evaluate(() => window.__testAwards), [10]);
        assert.equal((await state()).feathers.length, 1); await blank();
        const seen = new Set(), voiceChecked = new Set();
        for (let i = 0; i < 18; i++) {
            await blank(); await fit(); s = await state();
            const first = !seen.has(s.mode); seen.add(s.mode);
            const border = await frame.locator('.bird-escape-lane').evaluate(e => ({ width: getComputedStyle(e).borderTopWidth, color: getComputedStyle(e).borderTopColor }));
            assert.equal(border.width, '4px'); assert.equal(border.color, 'rgb(49, 95, 82)');
            for (const old of oldChoices) {
                await old.evaluate(e => { e.click(); e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
            }
            await blank();
            if (s.answerKind === 'picture') assert.equal(await frame.locator('.choice-card .learning-symbol').count(), 4);
            if (s.mode === 'quantity') assert.equal(await frame.locator('.display-symbol').count(), Number(s.answer));
            if (s.mode === 'odd') { assert.equal(s.display.length, 4); assert.equal(s.display.filter(item => item.value === s.answer).length, 1); }
            if (s.mode === 'matching') assert.equal(s.sequence[0].value, s.answer);
            if (first) await page.screenshot({ path: `${output}/${name}-${s.mode}.png` });
            if (['quantity', 'matching', 'odd'].includes(s.mode) && s.sound.supported && !voiceChecked.has(s.mode)) {
                await frame.locator('#question-listen').click();
                await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).sound.voice.state === 'speaking', null, { polling: 100 });
                const v = (await state()).sound.voice;
                assert.equal(v.queue[0], s.mode);
                if (s.mode !== 'matching') assert.deepEqual(v.queue, [s.mode, 'choose'], 'counting and detective readings never say the answer');
                await frame.locator('#question-listen').click(); voiceChecked.add(s.mode);
            }
            // Diagnostic sampling uses the incumbent hidden Next control; points/birds are not changed.
            await frame.evaluate(() => document.getElementById('next-button').click());
        }
        assert.deepEqual([...seen].sort(), ['alphabet', 'counting', 'matching', 'odd', 'pattern', 'quantity']);
        if (s.sound.supported) assert.equal(voiceChecked.size, 3);
        if (['small-phone-webkit', 'landscape-webkit'].includes(name)) {
            for (let step = 0; (await state()).mode !== 'quantity' && step < 12; step++) await frame.evaluate(() => document.getElementById('next-button').click());
            assert.equal((await state()).mode, 'quantity');
            // Layout-only maximum-density fixture, not an answered customer puzzle.
            await frame.locator('#activity-display').evaluate(element => { const icon = element.firstElementChild; element.replaceChildren(...Array.from({ length: 8 }, () => icon.cloneNode(true))); });
            await fit(); await page.screenshot({ path: `${output}/${name}-density-fixture.png` });
            await frame.evaluate(() => document.getElementById('next-button').click());
        }
        await blank();
        if (name === 'desktop') {
            const box = await frame.locator('.choice-card').first().boundingBox();
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
            await frame.evaluate(() => document.getElementById('next-button').click());
            await page.mouse.up(); await blank();
            await frame.locator('.choice-card').first().dispatchEvent('click', { detail: 1 }); await blank();
        }
        if (name === 'embedded') {
            await page.evaluate(() => frames[0].postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'pause' }, location.origin));
            await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).paused);
            const oldPuzzle = (await state()).puzzleId;
            await frame.locator('.choice-card').first().dispatchEvent('click', { detail: 0 }); await blank();
            assert.equal((await state()).puzzleId, oldPuzzle);
            await page.evaluate(() => frames[0].postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'resume' }, location.origin));
            await frame.waitForFunction(() => !JSON.parse(window.render_game_to_text()).paused);
        }
        assert.deepEqual(await frame.evaluate(() => window.__testAwards), [10]);
        assert.deepEqual(errors, []);
        report.push({ name, pass: true, modes: [...seen], physicalDevice: false, staleButtonsRejected: true, freshPuzzlesEmpty: 20, voicedNewModes: [...voiceChecked], errors });
        console.log(`PASS ${name}: blank input, six activities, scene frame, responsive fit`);
    } catch (error) {
        report.push({ name, pass: false, error: error.stack, errors, state: await frame.evaluate(() => JSON.parse(window.render_game_to_text())).catch(() => null) });
        await page.screenshot({ path: `${output}/${name}-failure.png` }); console.log(`FAIL ${name}: ${error.message}`);
    } finally { await browser.close(); await writeFile(`${output}/${process.env.PRESCHOOL_REPORT || 'browser-report.json'}`, JSON.stringify(report, null, 2)); }
}
if (report.some(row => !row.pass)) process.exitCode = 1;
