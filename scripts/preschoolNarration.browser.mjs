import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186';
const url = `${base}/Games/PreschoolFun/index.html`;
const output = 'output/preschool-narration';
await mkdir(output, { recursive: true });
const manifest = JSON.parse(await readFile('public/Games/PreschoolFun/audio/voice/manifest.json', 'utf8'));
assert.equal(Object.keys(manifest.clips).length, 63);
for (const [id, clip] of Object.entries(manifest.clips)) {
    const bytes = await readFile(`public/Games/PreschoolFun/audio/voice/${clip.file}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), clip.sha256, id);
    assert.ok(clip.durationSeconds > .2 && clip.durationSeconds < 50, id);
}
const profiles = [
    ['desktop', chromium, 1440, 900], ['android-viewport', chromium, 390, 844],
    ['iphone-webkit', webkit, 390, 844], ['small-phone-webkit', webkit, 320, 568],
    ['ipad-webkit', webkit, 1024, 1366], ['landscape-webkit', webkit, 844, 390],
    ['embedded', chromium, 1366, 900]
];
const report = [];
for (const [name, engine, width, height] of profiles) {
    if (process.env.PRESCHOOL_FILTER && !new RegExp(process.env.PRESCHOOL_FILTER).test(name)) continue;
    const browser = await engine.launch(), context = await browser.newContext({ viewport: { width, height }, hasTouch: name !== 'desktop' && name !== 'embedded' });
    context.setDefaultTimeout(15000);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.addInitScript(() => {
        window.__testAwards = [];
        window.LAHSPointsBridge = { init() {}, awardPoints: points => window.__testAwards.push(points) };
    });
    let frame = page;
    try {
        if (name === 'embedded') {
            await page.route('**/narration-test-host', route => route.fulfill({ contentType: 'text/html', body: `<style>html,body{margin:0;height:100%}iframe{width:100%;height:100%;border:0}</style><iframe src="${url}" allow="autoplay" title="Preschool"></iframe>` }));
            await page.goto(`${base}/narration-test-host`);
            frame = await (await page.locator('iframe').elementHandle()).contentFrame();
        } else await page.goto(url);
        await frame.waitForFunction(() => typeof window.render_game_to_text === 'function');
        await frame.evaluate(() => document.fonts.ready);
        const state = () => frame.evaluate(() => JSON.parse(window.render_game_to_text()));
        const idle = async () => assert.equal((await state()).sound.voice.state, 'idle');
        const speaking = kind => frame.waitForFunction(k => {
            const v = JSON.parse(window.render_game_to_text()).sound.voice;
            return v.state === 'speaking' && v.kind === k;
        }, kind);
        const fit = async () => {
            const box = await frame.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
            assert.ok(box.scrollWidth <= width + 1 && box.scrollHeight <= height + 1, JSON.stringify(box));
        };
        await fit();
        assert.equal((await state()).sound.context, 'locked');
        const supported = (await state()).sound.supported;
        if (supported) {
            await frame.locator('#tutorial-listen').click();
            await speaking('tutorial');
            assert.deepEqual((await state()).sound.voice.queue, ['tutorial']);
            assert.equal((await frame.evaluate(() => window.__testAwards)).length, 0);
            await page.screenshot({ path: `${output}/${name}-tutorial.png` });
            await frame.locator('#tutorial-listen').click(); await idle();
            await frame.locator('#tutorial-listen').click(); await speaking('tutorial');
            if (name === 'desktop') {
                await frame.locator('[data-practice-choice="B"]').click(); await speaking('practice');
                await frame.locator('#practice-check').click(); await speaking('practice');
                assert.deepEqual((await state()).sound.voice.queue, ['practice-yes']);
                await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).sound.voice.state === 'idle', null, { polling: 100, timeout: 10000 });
                assert.equal((await state()).sound.voice.active, 0);
                assert.equal((await frame.evaluate(() => window.__testAwards)).length, 0);
            }
        } else {
            assert.equal(await frame.locator('#tutorial-listen').isDisabled(), true);
            await page.screenshot({ path: `${output}/${name}-tutorial.png` });
        }
        await frame.locator('#start-button').click();
        await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).bird?.assetsReady);
        if (supported) await speaking('question');
        await fit();
        await page.screenshot({ path: `${output}/${name}-question.png` });
        const assertQuestion = async () => {
            const s = await state();
            const key = item => s.answerKind === 'alphabet' ? `letter-${item.value}` : s.answerKind === 'counting' ? `number-${item.value}` : item.label.replaceAll(' ', '-');
            const expected = [s.voiceInstruction, ...(s.voiceSequence ? s.sequence.map(item => item.missing ? 'blank' : key(item)) : []), 'choose'];
            assert.ok(expected.every(id => manifest.clips[id]), 'every generated puzzle token has a real recording');
            if (supported) assert.deepEqual(s.sound.voice.queue, expected, 'voice reads exactly the visible sequence with blank, never the hidden answer');
        };
        await assertQuestion();
        const s = await state(), choice = s.options.find(option => option.value !== s.answer);
        await frame.locator(`[data-choice-id="${choice.id}"]`).click();
        if (supported) { await speaking('answer'); assert.deepEqual((await state()).sound.voice.queue, [`letter-${choice.value}`, 'check']); }
        await frame.locator('#help-button').click(); await idle();
        assert.equal((await state()).paused, true);
        if (supported) { await frame.locator('#tutorial-listen').click(); await speaking('tutorial'); }
        await frame.locator('#start-button').click();
        if (supported) { await speaking('question'); await assertQuestion(); }
        await frame.locator('#sound-toggle').click(); await idle();
        assert.equal((await state()).sound.voice.active, 0);
        await frame.locator('#sound-toggle').click(); await idle();
        if (supported) {
            await frame.locator('#question-listen').click(); await speaking('question');
            await frame.evaluate(() => window.setSfxVolume(0)); await idle();
            await frame.evaluate(() => window.setSfxVolume(.75)); await idle();
            await frame.locator('#question-listen').click(); await speaking('question');
            await frame.evaluate(() => window.setBirdEscapePaused(true)); await idle();
            await frame.evaluate(() => window.setBirdEscapePaused(false)); await idle();
            await frame.locator('#question-listen').click(); await speaking('question');
            if (name === 'embedded') {
                await page.evaluate(() => frames[0].postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'pause' }, location.origin));
                await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).paused); await idle();
                await page.evaluate(() => frames[0].postMessage({ type: 'LAHS_HOST_LIFECYCLE', phase: 'resume' }, location.origin));
                await frame.waitForFunction(() => !JSON.parse(window.render_game_to_text()).paused); await idle();
            }
        }
        await frame.locator('#auto-voice').click();
        assert.equal((await state()).voiceEnabled, false); await idle();
        // Correct answers still award exactly 10 points; next puzzles respect the voice preference.
        for (const mode of ['alphabet', 'counting', 'pattern']) {
            const current = await state(); assert.equal(current.mode, mode);
            if (supported) { await frame.locator('#question-listen').click(); await speaking('question'); await assertQuestion(); }
            const answer = current.options.find(option => option.value === current.answer);
            await frame.locator(`[data-choice-id="${answer.id}"]`).click(); await idle();
            await frame.locator('#submit-button').click(); await idle();
            await frame.waitForFunction(() => { const s = JSON.parse(window.render_game_to_text()); return !s.locked || s.sessionWon; }, null, { polling: 100, timeout: 45000 });
            await idle(); await fit();
        }
        assert.deepEqual(await frame.evaluate(() => window.__testAwards), [10, 10, 10]);
        if (name === 'desktop') {
            const decoded = await frame.evaluate(async clips => {
                const ctx = new AudioContext(), result = [];
                for (const [id, clip] of Object.entries(clips)) {
                    const buffer = await ctx.decodeAudioData(await (await fetch(`audio/voice/${clip.file}`)).arrayBuffer());
                    result.push({ id, duration: buffer.duration, channels: buffer.numberOfChannels });
                }
                await ctx.close(); return result;
            }, manifest.clips);
            assert.equal(decoded.length, 63); assert.ok(decoded.every(clip => clip.channels === 1 && clip.duration > .2));
            await writeFile(`${output}/decoded-voice.json`, JSON.stringify(decoded, null, 2));
            // A failed recording remains recoverable; a delayed request cannot restart old narration.
            const clipUrl = '**/audio/voice/choose.mp3';
            await page.reload(); await frame.waitForFunction(() => typeof window.render_game_to_text === 'function');
            await page.route(clipUrl, route => route.abort());
            await frame.locator('#start-button').click();
            await frame.waitForFunction(() => Boolean(JSON.parse(window.render_game_to_text()).sound.voice.error)); await idle();
            await page.unroute(clipUrl);
            await frame.locator('#question-listen').click(); await speaking('question');
            await page.reload(); await frame.waitForFunction(() => typeof window.render_game_to_text === 'function');
            let release;
            const pending = new Promise(resolve => { release = resolve; });
            await page.route(clipUrl, async route => { await pending; await route.fallback(); });
            await frame.locator('#start-button').click();
            await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).sound.voice.state === 'loading');
            await frame.locator('#auto-voice').click(); await idle(); release();
            await frame.waitForFunction(() => JSON.parse(window.render_game_to_text()).sound.voice.loaded.includes('choose'));
            await idle(); assert.equal((await state()).sound.voice.active, 0);
        }
        assert.deepEqual(errors, []);
        report.push({ name, pass: true, physicalDevice: false, audio: supported ? 'Real generated MP3 playback and cancellation observed' : 'No AudioContext in installed WebKit: unavailable controls, layout and gameplay verified', errors });
        console.log(`PASS ${name}`);
    } catch (error) {
        report.push({ name, pass: false, error: error.stack, errors, state: await frame.evaluate(() => JSON.parse(window.render_game_to_text())).catch(() => null) });
        await page.screenshot({ path: `${output}/${name}-failure.png` });
        console.log(`FAIL ${name}: ${error.message}`);
    } finally { await browser.close(); await writeFile(`${output}/${process.env.PRESCHOOL_REPORT || 'browser-report.json'}`, JSON.stringify(report, null, 2)); }
}
await writeFile(`${output}/${process.env.PRESCHOOL_REPORT || 'browser-report.json'}`, JSON.stringify(report, null, 2));
if (report.some(row => !row.pass)) process.exitCode = 1;
