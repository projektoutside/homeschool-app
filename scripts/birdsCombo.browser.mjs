import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = 'output/birds-combos', key = 'lahs-many-birds-one-stone-v1';
await mkdir(output, { recursive: true });
const hash = createHash('sha256');
for (const file of ['index.html', 'shop.css', 'style.css', 'shop.js', 'audio.js', 'physics.js', 'campaign.js', 'level-map.js', 'birds.js', 'drop-mechanism.js', 'runways.js']) hash.update(file).update(await readFile(`public/Games/Many Birds One Stone/${file}`));
const fingerprint = hash.digest('hex'), report = [];
const state = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
for (const [name, engine, options] of [
  ['desktop', chromium, { viewport: { width: 1440, height: 1000 } }],
  ['android-touch', chromium, { viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true }],
  ['iphone-webkit', webkit, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }],
  ['ipad-webkit', webkit, { viewport: { width: 1024, height: 1366 }, hasTouch: true, isMobile: true }],
  ['reduced-motion', webkit, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' }],
]) {
  if (process.env.BIRDS_COMBO_FILTER && !new RegExp(process.env.BIRDS_COMBO_FILTER).test(name)) continue;
  const browser = await engine.launch(), row = { name, fingerprint, physical: false };
  try {
    const context = await browser.newContext(options), page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(10000);
    await page.route('**/Many%20Birds%20One%20Stone/index.html', async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace('function frame(now) {', 'function frame(now) { return;')
        .replace('function exposeHooks() {', `function exposeHooks() {
          window.comboTest = {
            awards: [], sounds: [], paint: [],
            hit(index) { hitBird(state.level.birds[index]); draw(); },
            lose() { handleLose('Test drop ended before the last bird.'); },
            trap() {
              hideOverlay(); beginAttempt(true, false); state.staticColliders = [];
              state.drawnStrokes = [{points: [{x:60,y:260},{x:180,y:350},{x:300,y:260}]}];
              rebuildDrawnColliders(); state.inkUsed = 300; state.hintUsed = true;
              state.stone = {...createStone(state.loadout), x:175,y:270,attached:false,active:true};
              state.runReleasedAt = performance.now(); hitBird(state.level.birds[0]);
            },
          };
          const originalPaint = ctx.fillText.bind(ctx);
          ctx.fillText = (text,x,y,...args) => { if (String(text).startsWith('x2  ')) window.comboTest.paint.push({text,x,y}); originalPaint(text,x,y,...args); };
          woodlandAudio.play = (kind,pitch) => { window.comboTest.sounds.push({kind,pitch}); return true; };
        `);
      await route.fulfill({ response, body });
    });
    await context.addInitScript(key => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ campaignVersion: 2, highestUnlocked: 18, selectedLevel: 7, onboarded: true, bestStats: {}, shop: {version:1,coins:60,owned:[],ledger:[]} })); }, key);
    const url = `${process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186'}/Games/Many%20Birds%20One%20Stone/index.html`;
    await page.goto(url);
    await page.waitForFunction(() => window.comboTest && window.__manyBirdsDebug.snapshot().birdArt.loaded && document.fonts.status === 'loaded', undefined, { polling: 50 });
    await page.evaluate(() => {
      window.LAHSPointsBridge.awardPoints = (points, options) => window.comboTest.awards.push({points,...options});
      window.advanceTime(0);
    });
    const overflow = async () => {
      const size = await page.evaluate(() => ({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));
      assert.ok(size.sw <= size.w + 1 && size.sh <= size.h + 1, JSON.stringify(size));
    };
    await overflow();
    await page.evaluate(() => { window.comboTest.hit(0); window.comboTest.hit(0); });
    assert.deepEqual((await state(page)).combo, {hits:1,multiplier:1,points:10});
    assert.equal(await page.evaluate(() => window.comboTest.awards.length), 0);
    await page.evaluate(() => window.comboTest.hit(1));
    assert.deepEqual((await state(page)).combo, {hits:2,multiplier:2,points:30});
    assert.match(await page.locator('#comboReadout').innerText(), /x2.*30 pts/);
    const beforeMotion = await page.evaluate(() => window.comboTest.paint.at(-1));
    await page.evaluate(() => window.advanceTime(250));
    const afterMotion = await page.evaluate(() => window.comboTest.paint.at(-1));
    if (name === 'reduced-motion') assert.equal(afterMotion.y, beforeMotion.y);
    else assert.ok(afterMotion.y < beforeMotion.y);
    await page.screenshot({path:`${output}/${name}-double-combo.png`});
    await page.locator('#shopButton').click(); const held = await state(page);
    await page.evaluate(() => window.advanceTime(5000));
    assert.deepEqual((await state(page)).comboPopups, held.comboPopups);
    await page.locator('#closeShop').click();
    await page.locator('#levelMapButton').click(); await page.evaluate(() => window.advanceTime(3000));
    assert.deepEqual((await state(page)).combo, held.combo);
    await page.locator('#closeLevelMap').click();
    await page.evaluate(() => window.postMessage({ type:'LAHS_HOST_LIFECYCLE', phase:'pause' },location.origin));
    await page.waitForFunction(() => window.__manyBirdsDebug.snapshot().paused, undefined, {polling:50});
    await page.evaluate(() => window.advanceTime(2000));
    assert.deepEqual((await state(page)).comboPopups, held.comboPopups);
    await page.evaluate(() => window.postMessage({ type:'LAHS_HOST_LIFECYCLE', phase:'resume' },location.origin));
    await page.waitForFunction(() => !window.__manyBirdsDebug.snapshot().paused, undefined, {polling:50});
    await page.evaluate(() => { window.comboTest.hit(2); window.comboTest.hit(2); window.__manyBirdsDebug.forceWin(); });
    let s = await state(page); assert.deepEqual(s.combo, {hits:3,multiplier:3,points:60});
    const awards = await page.evaluate(() => window.comboTest.awards);
    assert.equal(awards.length,1); assert.equal(awards[0].points,210); assert.equal(awards[0].meta.comboPoints,60); assert.equal(awards[0].meta.maxCombo,3);
    assert.equal(s.shop.coins,180,'coin rules stay unchanged');
    assert.match(await page.locator('#overlayStats').innerText(), /Bird combo \(x3\).*\+60/s);
    assert.match(await page.locator('#overlayStats').innerText(), /Total points.*210/s);
    await overflow(); await page.screenshot({path:`${output}/${name}-banked-result.png`});
    const pitches = await page.evaluate(() => window.comboTest.sounds.filter(s => s.kind === 'bird').map(s => s.pitch));
    assert.deepEqual(pitches,[1,1.16,1.32]);
    await page.reload(); assert.deepEqual((await state(page)).combo,{hits:0,multiplier:1,points:0});
    let saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)),key);
    assert.equal(saved.bestStats[7].points,210); assert.equal(saved.bestStats[7].stars,3);

    // An old perfect result must survive a newly introduced, higher-point two-star clear.
    await page.evaluate(key => { const saved=JSON.parse(localStorage.getItem(key)); saved.bestStats[7]={points:150,stars:3,clearTimeMs:500}; localStorage.setItem(key,JSON.stringify(saved)); },key);
    await page.reload(); await page.locator('#hintButton').click();
    await page.evaluate(() => window.__manyBirdsDebug.forceWin());
    saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)),key);
    assert.deepEqual(saved.bestStats[7],{points:150,stars:3,clearTimeMs:500});
    await page.locator('#overlaySecondary').click(); await page.evaluate(() => window.__manyBirdsDebug.forceWin());
    saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)),key);
    assert.equal(saved.bestStats[7].points,210); assert.equal(saved.bestStats[7].stars,3);

    await page.locator('#overlaySecondary').click();
    await page.evaluate(() => { window.comboTest.awards=[]; window.__manyBirdsDebug.applyStroke([{x:60,y:260},{x:100,y:280}]); window.comboTest.hit(0); window.comboTest.hit(1); window.comboTest.lose(); });
    const failed = await state(page), wallet = failed.shop.coins;
    assert.equal(failed.combo.points,30); assert.equal(await page.evaluate(() => window.comboTest.awards.length),0);
    assert.match(await page.locator('#overlayStats').innerText(),/not banked/);
    await page.locator('#overlaySecondary').click(); s=await state(page);
    assert.deepEqual(s.combo,{hits:0,multiplier:1,points:0}); assert.deepEqual(s.lines,failed.lines); assert.equal(s.shop.coins,wallet);
    await page.evaluate(() => { window.__manyBirdsDebug.setLevel(9); window.comboTest.trap(); });
    const trapped = await state(page); assert.equal(trapped.combo.points,10);
    await page.evaluate(() => window.advanceTime(12000)); s=await state(page);
    assert.equal(s.attached,true); assert.deepEqual(s.combo,{hits:0,multiplier:1,points:0});
    assert.deepEqual(s.lines,trapped.lines); assert.equal(s.shop.coins,trapped.shop.coins); assert.equal(await page.evaluate(() => window.comboTest.awards.length),0);

    // Real production collisions, not injected hits: verify every campaign chain and award.
    row.routes = await page.evaluate(() => {
      const d=window.__manyBirdsDebug, rows=[];
      window.LAHSPointsBridge.awardPoints = (points, options) => window.comboTest.awards.push({points,...options});
      for(let i=0;i<18;i++) {
        d.setLevel(i); const level=window.WoodlandCampaign.levels[i];
        d.moveClaw(level.hintAim); level.hint.forEach(stroke=>d.applyStroke(stroke));
        window.advanceTime(2000); const previous=window.comboTest.awards.length; d.drop(); window.advanceTime(12000);
        const s=d.snapshot(), award=window.comboTest.awards.at(-1);
        rows.push({level:i+1,birds:s.birdTarget,combo:s.combo,win:s.outcome==='win',floor:s.stone.onFloor,awards:window.comboTest.awards.length-previous,points:award?.points});
      }
      return rows;
    });
    for(const r of row.routes) { assert.ok(r.win&&r.floor,JSON.stringify(r)); assert.equal(r.combo.points,5*r.birds*(r.birds+1)); assert.equal(r.combo.hits,r.birds); assert.equal(r.points,150+r.combo.points); assert.equal(r.awards,1); }

    await page.evaluate(() => {
      const d=window.__manyBirdsDebug, level=window.WoodlandCampaign.levels[6];
      d.setLevel(6); d.moveClaw(level.hintAim); level.hint.forEach(stroke=>d.applyStroke(stroke));
      window.advanceTime(2000); d.drop();
      for(let t=0;t<6000&&d.snapshot().combo.hits<2;t+=1000/60)window.advanceTime(1000/60);
      window.advanceTime(100);
    });
    assert.equal((await state(page)).combo.hits,2);
    await page.screenshot({path:`${output}/${name}-live-combo.png`});
    await page.evaluate(() => window.advanceTime(12000));

    if(!options.hasTouch){
      await page.setViewportSize({width:900,height:900});
      const hud=await page.evaluate(()=>({header:document.querySelector('.hud').getBoundingClientRect().toJSON(),combo:document.querySelector('#comboReadout').getBoundingClientRect().toJSON()}));
      assert.ok(hud.combo.top>=hud.header.top&&hud.combo.bottom<=hud.header.bottom,'combo tally stays visible in the live-panel desktop layout');
      await overflow();
    }

    await page.setViewportSize({width:320,height:568}); await page.evaluate(() => document.documentElement.style.fontSize='24px');
    await overflow();
    const meters = await page.evaluate(() => ({ink:document.querySelector('.meter-card').getBoundingClientRect().toJSON(),flock:document.querySelector('.flock-progress').getBoundingClientRect().toJSON()}));
    assert.ok(meters.ink.right<=meters.flock.left+1,'ink and combo tally do not overlap at 150% text');
    await page.locator('#resultShopButton').click(); await overflow();
    await page.locator('#closeShop').click(); await page.locator('#resultMapButton').click();
    await page.locator('#closeLevelMap').click(); await overflow();
    await page.screenshot({path:`${output}/${name}-small-zoom-result.png`});
    assert.deepEqual(errors,[]); row.pass=true; console.log(`PASS ${name}`); await context.close();
  } catch(error) { row.pass=false; row.error=error.stack; console.log(`FAIL ${name}: ${error.message}`); }
  finally { await browser.close(); }
  report.push(row); await writeFile(`${output}/${process.env.BIRDS_COMBO_REPORT||'browser-report'}.json`,JSON.stringify(report,null,2));
}
if (!process.env.BIRDS_COMBO_FILTER || /iframe/.test(process.env.BIRDS_COMBO_FILTER)) {
  const browser=await chromium.launch(), row={name:'iframe-points-bridge',fingerprint,physical:false};
  try {
    const context=await browser.newContext(), page=await context.newPage(), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await context.addInitScript(key=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({campaignVersion:2,highestUnlocked:18,selectedLevel:7,onboarded:true,bestStats:{}}));},key);
    await context.route('**/Many%20Birds%20One%20Stone/index.html',async route=>{
      const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('function frame(now) {','function frame(now) { return;')});
    });
    const origin=process.env.GAMES_TEST_URL||'http://127.0.0.1:5186';
    await page.route('**/birds-combo-host',route=>route.fulfill({contentType:'text/html',body:`<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style><script>
      window.awards=[];addEventListener('message',event=>{
        const data=event.data;
        if(data?.type==='LAHS_POINTS_CONTEXT'&&data.request)event.source.postMessage({type:'LAHS_POINTS_CONTEXT',gameId:'many-birds-one-stone',sessionId:'combo-fixture',totalPoints:0,stars:0,userId:'synthetic',isAuthenticated:true},location.origin);
        if(data?.type==='LAHS_POINTS_EARNED'){awards.push(data);event.source.postMessage({type:'LAHS_POINTS_ACK',gameId:data.gameId,sessionId:'combo-fixture',eventId:data.eventId,accepted:true,totalPoints:data.points,stars:0},location.origin);}
      });</script><iframe src="${origin}/Games/Many%20Birds%20One%20Stone/index.html"></iframe>`}));
    await page.goto(`${origin}/birds-combo-host`);
    const game=page.frames().find(frame=>frame.url().includes('Many%20Birds'));
    assert.ok(game);
    await game.waitForFunction(()=>window.__manyBirdsDebug&&window.LAHSPointsBridge.getState().sessionId==='combo-fixture',undefined,{polling:50});
    await game.evaluate(()=>{window.__manyBirdsDebug.forceWin();window.__manyBirdsDebug.forceWin();});
    await page.waitForFunction(()=>window.awards.length===1,undefined,{polling:50});
    const payload=await page.evaluate(()=>window.awards[0]);
    assert.equal(payload.points,210);assert.equal(payload.meta.comboPoints,60);assert.equal(payload.meta.maxCombo,3);
    assert.equal(payload.sessionId,'combo-fixture');assert.equal(payload.gameId,'many-birds-one-stone');
    await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({campaignVersion:2,highestUnlocked:1,selectedLevel:1,onboarded:false,bestStats:{}})),key);
    await page.setViewportSize({width:320,height:568});
    await page.goto(`${origin}/Games/Many%20Birds%20One%20Stone/index.html`);
    await page.waitForFunction(()=>window.__manyBirdsDebug&&document.fonts.status==='loaded',undefined,{polling:50});
    await page.evaluate(()=>document.documentElement.style.fontSize='24px');
    const size=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));
    assert.ok(size.sw<=size.w+1&&size.sh<=size.h+1,JSON.stringify(size));
    assert.match(await page.locator('#overlayBody').innerText(),/x1, x2 and x3/);
    await page.locator('#overlayPrimary').click();assert.equal(await page.locator('#shopButton').isEnabled(),true);
    assert.deepEqual((await state(page)).combo,{hits:0,multiplier:1,points:0});
    assert.deepEqual(errors,[]);row.pass=true;row.payload=payload;row.smallPhoneOnboarding=true;console.log('PASS iframe-points-bridge');await context.close();
  }catch(error){row.pass=false;row.error=error.stack;console.log(`FAIL iframe-points-bridge: ${error.message}`);}
  finally{await browser.close();}
  report.push(row);await writeFile(`${output}/${process.env.BIRDS_COMBO_REPORT||'browser-report'}.json`,JSON.stringify(report,null,2));
}
if(report.some(row=>!row.pass))process.exitCode=1;
