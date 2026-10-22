import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = 'output/birds-versus', key = 'lahs-many-birds-one-stone-v1';
await mkdir(output,{recursive:true});
const hash = createHash('sha256');
for (const file of ['index.html','versus.js','versus.css','runways.js','physics.js','style.css','shop.js','shop.css','campaign.js','birds.js','drop-mechanism.js','audio.js','level-map.js']) hash.update(file).update(await readFile(`public/Games/Many Birds One Stone/${file}`));
const fingerprint = hash.digest('hex'), rows = [];
const get = page => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const profiles = [
  ['desktop',chromium,{viewport:{width:1440,height:1000}}],
  ['desktop-short',chromium,{viewport:{width:900,height:900}}],
  ['android-touch',chromium,{viewport:{width:393,height:852},hasTouch:true,isMobile:true}],
  ['iphone-webkit',webkit,{viewport:{width:390,height:844},hasTouch:true,isMobile:true}],
  ['ipad-webkit',webkit,{viewport:{width:1024,height:1366},hasTouch:true,isMobile:true}],
  ['small-phone',webkit,{viewport:{width:320,height:568},hasTouch:true,isMobile:true,reducedMotion:'reduce'}],
];
for (const [name,engine,options] of profiles) {
  if (process.env.BIRDS_VS_FILTER && !new RegExp(process.env.BIRDS_VS_FILTER).test(name)) continue;
  const browser = await engine.launch(), row = {name,fingerprint,physical:false};
  try {
    const context = await browser.newContext(options), page = await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message)); page.setDefaultTimeout(12000);
    await page.route('**/Many%20Birds%20One%20Stone/index.html',async route=>{
      const response=await route.fetch();
      const body=(await response.text()).replace('function frame(now) {','function frame(now) { return;')
        .replace('function exposeHooks() {',`function exposeHooks() {
          window.vsTest = {awards:[], hit(i){hitBird(state.level.birds[i]);},
            host(phase){handleHostMessage({source:window.parent,origin:location.origin,data:{type:'LAHS_HOST_LIFECYCLE',phase}});},
            hidden(value){state.hiddenPause=value;syncPauseState();},
            trap(){state.staticColliders=[];state.drawnStrokes=[{points:[{x:60,y:260},{x:180,y:350},{x:300,y:260}]}];rebuildDrawnColliders();state.stone={...createStone(state.loadout),x:175,y:270,attached:false,active:true};state.runReleasedAt=performance.now();},
          };
        `);
      await route.fulfill({response,body});
    });
    await context.addInitScript(key=>{
      localStorage.setItem(key,JSON.stringify({campaignVersion:2,highestUnlocked:8,selectedLevel:7,onboarded:true,bestStats:{1:{stars:3,points:160}},shop:{version:1,coins:900,tank:1,bottles:2,owned:['boulder'],ball:'boulder',finish:'brass',trail:false,ledger:[3]}}));
    },key);
    await page.goto(`${process.env.GAMES_TEST_URL || 'http://127.0.0.1:5186'}/Games/Many%20Birds%20One%20Stone/index.html`);
    await page.waitForFunction(()=>window.vsTest && JSON.parse(window.render_game_to_text()).birdArt.loaded && document.fonts.status==='loaded');
    await page.evaluate(()=>{window.LAHSPointsBridge.awardPoints=(...args)=>window.vsTest.awards.push(args);window.advanceTime(0);});
    const before=await page.evaluate(key=>localStorage.getItem(key),key);
    const overflow=async()=>{
      const s=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));
      assert.ok(s.sw<=s.w+1 && s.sh<=s.h+1,`overflow ${JSON.stringify(s)}`);
    };
    const shot=async suffix=>{await overflow();await page.evaluate(()=>window.advanceTime(0));await settle();await page.screenshot({path:`${output}/${name}-${suffix}.png`});};
    const cdp=name==='android-touch'?await context.newCDPSession(page):null;
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const position=async p=>{await settle();const box=await page.locator('#gameCanvas').boundingBox();return{x:box.x+p.x/360*box.width,y:box.y+p.y/640*box.height};};
    const tap=async p=>{const at=await position(p);if(options.hasTouch)await page.touchscreen.tap(at.x,at.y);else await page.mouse.click(at.x,at.y);};
    const draw=async points=>{
      const box=await page.locator('#gameCanvas').boundingBox(); await settle();
      const at=p=>({x:box.x+p.x/360*box.width,y:box.y+p.y/640*box.height});
      const path=[];for(let i=1;i<points.length;i++)for(let n=0;n<12;n++){const t=n/12;path.push(at({x:points[i-1].x+(points[i].x-points[i-1].x)*t,y:points[i-1].y+(points[i].y-points[i-1].y)*t}));}path.push(at(points.at(-1)));
      if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...path[0],id:1}]});for(const p of path.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
      else{await page.mouse.move(path[0].x,path[0].y);await page.mouse.down();for(const p of path.slice(1))await page.mouse.move(p.x,p.y);await page.mouse.up();}
    };
    const open=async(seconds='60',birds='3')=>{
      await page.locator('#versusButton').click();
      await page.locator('#vsTimeLimit').selectOption(seconds);
      await page.locator('#vsBirdCount').selectOption(birds);
      await page.locator('#vsDialogActions button').last().click();
      assert.equal((await get(page)).versus.phase,'building');
    };
    const editorMaps=[];
    const build=async(player,auto=false)=>{
      assert.equal(await page.locator('#vsReady').isEnabled(),false);
      await tap({x:20,y:120});assert.equal((await get(page)).versus.draft.birds.length,0);
      for(const y of [250,350,450])await tap({x:player===1?180:186,y});
      assert.equal((await get(page)).versus.tool,'blocks');
      await draw([{x:player===1?60:250,y:200},{x:player===1?110:300,y:220}]);
      let s=await get(page);assert.equal(s.versus.draft.strokes.length,1);assert.ok(s.versus.platformUsed>45&&s.versus.platformUsed<65);
      editorMaps[player-1]=s.versus.draft;
      await shot(`player${player}-editor`);
      if(name==='desktop'&&player===1){
        await page.locator('#vsUndo').click();assert.equal((await get(page)).versus.draft.strokes.length,0);
        await draw([{x:60,y:200},{x:110,y:220}]);
      }
      if(cdp && player===1 && !auto){
        const baseline=(await get(page)).versus.platformUsed;
        const a=await position({x:60,y:510}),b=await position({x:85,y:515}),c=await position({x:300,y:510});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:1}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...b,id:1},{...c,id:2}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:1},{x:c.x-50,y:c.y-100,id:2}]});
        assert.ok((await get(page)).versus.platformUsed < baseline+30,'second touch cannot create a diagonal connector');
        assert.equal(await page.evaluate(()=>visualViewport.scale),1,'pinch does not zoom the editor');
        await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
        assert.equal((await get(page)).versus.platformUsed,baseline,'canceled strokes refund platform ink');
      }
      if(auto){
        await draw([{x:40,y:520},{x:320,y:520},{x:320,y:300}]);
        s=await get(page);assert.ok(s.versus.platformUsed<=s.versus.config.platformInk+.01);assert.equal(s.versus.phase,'handoff');
      }else await page.locator('#vsReady').click();
      assert.equal(await page.locator('.stage-frame').isVisible(),false);
      await shot(`player${player}-handoff`);
    };
    await page.locator('#versusButton').click();await shot('setup');
    assert.equal(await page.locator('#vsBirdCount').inputValue(),'3');
    assert.equal(await page.locator('#vsTimeLimit').inputValue(),'60');
    await page.keyboard.press('Escape');assert.equal((await get(page)).versus.active,false);
    await open();await build(1);await page.locator('#vsDialogActions button').last().click();await build(2);
    await page.locator('#vsDialogActions button').last().click();
    assert.equal((await get(page)).versus.player,1);assert.equal((await get(page)).loadout.radius,12);
    assert.ok(Math.abs((await get(page)).birds[0].x-editorMaps[1].birds[0].x)<.11,'Player 1 receives Player 2’s map');
    await page.evaluate(()=>window.advanceTime(2000));
    await page.locator('#versusButton').click();const paused=await get(page);
    await page.evaluate(()=>window.advanceTime(5000));assert.equal((await get(page)).versus.elapsedMs,paused.versus.elapsedMs);
    await page.keyboard.press('Escape');
    await page.evaluate(()=>window.vsTest.host('pause'));const host=await get(page);await page.evaluate(()=>window.advanceTime(5000));assert.equal((await get(page)).versus.elapsedMs,host.versus.elapsedMs);await page.evaluate(()=>window.vsTest.host('resume'));
    await draw([{x:60,y:510},{x:100,y:525}]);
    await shot('solve');await page.locator('#dropButton').click();await page.evaluate(()=>window.advanceTime(8000));
    let s=await get(page);assert.equal(s.versus.phase,'round-result');assert.equal(s.versus.results[0].points,460);assert.equal(s.stone.onFloor,true);
    await page.locator('#vsDialogActions button').last().click();await page.locator('#vsDialogActions button').last().click();
    assert.ok(Math.abs((await get(page)).birds[0].x-editorMaps[0].birds[0].x)<.11,'Player 2 receives Player 1’s map');
    await page.evaluate(()=>window.advanceTime(4000));await page.locator('#dropButton').click();await page.evaluate(()=>window.advanceTime(8000));
    s=await get(page);assert.equal(s.versus.results[1].points,460);
    await page.locator('#vsDialogActions button').last().click();assert.match(await page.locator('#vsDialogTitle').innerText(),/Player 1 wins/);
    await shot('results');assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),before);assert.equal(await page.evaluate(()=>window.vsTest.awards.length),0);
    await page.locator('#vsDialogActions button').first().click();
    s=await get(page);assert.equal(s.level,7);assert.equal(s.loadout.radius,14);assert.equal(s.versus.active,false);
    await page.locator('#shopButton').click();await page.locator('#closeShop').click();assert.equal(await page.locator('#versusButton').isEnabled(),true);
    await page.locator('#levelMapButton').click();await page.locator('#closeLevelMap').click();assert.equal(await page.locator('#versusButton').isEnabled(),true);
    await shot('campaign-restored');

    // A second match exercises automatic budget handoff, timeout and trapped-ball recovery.
    await open('30');await build(1,true);await page.locator('#vsDialogActions button').last().click();await build(2);
    await page.locator('#vsDialogActions button').last().click();
    await page.evaluate(()=>{window.vsTest.hidden(true);window.advanceTime(3000);window.vsTest.hidden(false);});assert.equal((await get(page)).versus.elapsedMs,0);
    if(name==='desktop')await page.evaluate(()=>{window.vsTest.hit(0);window.vsTest.hit(0);window.vsTest.hit(1);});
    await page.evaluate(()=>window.advanceTime(30100));s=await get(page);assert.equal(s.versus.results[0].hits,name==='desktop'?2:0);assert.equal(s.versus.results[0].points,name==='desktop'?230:0);assert.match(s.versus.results[0].reason,/Time/);
    await page.locator('#vsDialogActions button').last().click();await page.locator('#vsDialogActions button').last().click();
    await page.evaluate(()=>{window.vsTest.trap();window.advanceTime(12000);});s=await get(page);assert.equal(s.attached,true);assert.equal(s.versus.phase,'playing');assert.ok(s.versus.elapsedMs>=11999);assert.ok(s.lines.length);
    await page.evaluate(()=>window.advanceTime(19000));await page.locator('#vsDialogActions button').last().click();assert.match(await page.locator('#vsDialogTitle').innerText(),name==='desktop'?/Player 1 wins/:/even match/);
    await page.locator('#vsDialogActions button').first().click();assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),before);

    if(name==='desktop'){
      await open('0');
      await page.locator('.vs-precision summary').click();
      for(const [i,y]of[250,350,450].entries()){
        await page.locator('#vsSelectedBird').selectOption(String(i));await page.locator('#vsBirdX').fill('180');await page.locator('#vsBirdY').fill(String(y));await page.locator('#vsPlaceBird').click();
      }
      await page.locator('#vsBirdX').fill('10');await page.locator('#vsPlaceBird').click();assert.match(await page.locator('#statusCopy').innerText(),/inside/);
      await page.locator('#vsBlockTool').click();await draw([{x:60,y:200},{x:110,y:220}]);
      // Canceled strokes refund every point and cannot hand a map to the next player.
      const saved=(await get(page)).versus.platformUsed;
      await page.locator('#gameCanvas').dispatchEvent('pointerdown',{pointerId:77,pointerType:'touch',button:0,clientX:0,clientY:0});
      // Real pointer drag canceled by a pause rolls back the pending edit.
      const p=await position({x:60,y:510});await page.mouse.move(p.x,p.y);await page.mouse.down();const q=await position({x:120,y:520});await page.mouse.move(q.x,q.y);
      await page.keyboard.press('Escape');await page.mouse.up();assert.equal((await get(page)).versus.platformUsed,saved);
      await page.locator('#vsDialogActions button').last().click();await page.locator('#vsReady').click();await page.locator('#vsDialogActions button').last().click();await build(2);await page.locator('#vsDialogActions button').last().click();
      await page.evaluate(()=>window.advanceTime(180000));s=await get(page);assert.equal(s.versus.phase,'playing');assert.equal(s.versus.remainingMs,null);
      await page.locator('#versusButton').click();await page.locator('#vsDialogActions button').first().click();
      // Configurable single/pair maps: normal drops, a miss and a hit.
      for(const count of [1,2]){
        await open('30',String(count));
        for(let player=1;player<=2;player++){
          for(const y of count===1?[300]:[280,420])await tap({x:180,y});
          await draw([{x:60,y:200},{x:110,y:220}]);await page.locator('#vsReady').click();
          await page.locator('#vsDialogActions button').last().click();
        }
        // The first player misses the whole flock; the second clears it.
        await page.evaluate(()=>{window.__manyBirdsDebug.moveClaw(306);window.advanceTime(800);});assert.ok((await get(page)).stone.x>280);await page.locator('#dropButton').click();await page.evaluate(()=>window.advanceTime(8000));
        assert.equal((await get(page)).versus.results[0].hits,0);
        await page.locator('#vsDialogActions button').last().click();await page.locator('#vsDialogActions button').last().click();
        await page.locator('#dropButton').click();await page.evaluate(()=>window.advanceTime(8000));assert.equal((await get(page)).versus.results[1].hits,count);
        await page.locator('#vsDialogActions button').last().click();assert.match(await page.locator('#vsDialogTitle').innerText(),/Player 2 wins/);
        await page.locator('#vsDialogActions button').first().click();
      }
      await page.evaluate(()=>window.__manyBirdsDebug.forceWin());assert.equal(await page.evaluate(()=>window.vsTest.awards.length),1,'campaign awards still work');
    }
    if(name==='small-phone'){
      await page.addStyleTag({content:'html{font-size:150%}'});await open();await shot('large-text-setup');
      await page.locator('.vs-precision summary').click();await page.locator('#vsBirdY').focus();
      await page.setViewportSize({width:320,height:390});await shot('keyboard-height');
      const focused=await page.locator('#vsBirdY').boundingBox(),hud=await page.locator('.hud').boundingBox();assert.ok(focused.y+focused.height<=hud.y+hud.height+1,'focused field stays above the simulated keyboard');
      await page.locator('#vsPlaceBird').click();assert.equal((await get(page)).versus.draft.birds.length,1);
      await page.setViewportSize({width:568,height:320});await page.evaluate(()=>window.dispatchEvent(new Event('resize')));assert.equal((await get(page)).paused,true);await page.screenshot({path:`${output}/${name}-landscape.png`});
    }
    assert.deepEqual(errors,[]);Object.assign(row,{pass:true,checks:['two real collision clears','opponent maps','isolated currency and campaign','timeout','budget handoff','trap recovery','modal/host/hidden pause','layout'],input:cdp?'CDP touch':options.hasTouch?'touch taps and pointer drags':'mouse and keyboard'});
    await context.close();
  }catch(error){row.pass=false;row.error=error.stack;console.log(`FAIL ${name}: ${error.stack}`);}finally{await browser.close();}
  rows.push(row);await writeFile(`${output}/${process.env.BIRDS_VS_REPORT||'browser-report'}.json`,JSON.stringify(rows,null,2));if(row.pass)console.log(`PASS ${name}`);
}
if(!process.env.BIRDS_VS_FILTER || /iframe/.test(process.env.BIRDS_VS_FILTER)){
  const browser=await chromium.launch(),row={name:'iframe-lifecycle',fingerprint,physical:false};
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const origin=process.env.GAMES_TEST_URL||'http://127.0.0.1:5186';
    await page.route('**/birds-versus-host',route=>route.fulfill({contentType:'text/html',body:`<style>html,body{margin:0;height:100%}iframe{width:100%;height:100%;border:0;display:block}</style><script>window.events=[];addEventListener('message',e=>{if(e.source===document.querySelector('iframe').contentWindow&&e.origin===location.origin)events.push(e.data);});</script><iframe title="Bird game" src="${origin}/Games/Many%20Birds%20One%20Stone/index.html"></iframe>`}));
    await context.addInitScript(key=>localStorage.setItem(key,JSON.stringify({campaignVersion:2,highestUnlocked:1,selectedLevel:1,onboarded:true,bestStats:{}})),key);
    await page.goto(`${origin}/birds-versus-host`);const frame=page.frames().find(frame=>frame.url().includes('/Games/'));
    await frame.waitForFunction(()=>window.render_game_to_text&&JSON.parse(window.render_game_to_text()).birdArt.loaded&&document.fonts.status==='loaded');
    await frame.locator('#versusButton').click();await frame.locator('#vsBirdCount').selectOption('1');await frame.locator('#vsDialogActions button').last().click();
    for(let player=1;player<=2;player++){
      await frame.locator('.vs-precision summary').click();await frame.locator('#vsBirdY').fill('300');await frame.locator('#vsPlaceBird').click();await frame.locator('.vs-precision summary').click();
      await frame.locator('#vsBlockTool').click();await frame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const box=await frame.locator('#gameCanvas').boundingBox(),p={x:box.x+60/360*box.width,y:box.y+200/640*box.height},q={x:box.x+110/360*box.width,y:box.y+220/640*box.height};
      await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(q.x,q.y,{steps:12});await page.mouse.up();
      await frame.locator('#vsReady').click();await frame.locator('#vsDialogActions button').last().click();
    }
    const start=JSON.parse(await frame.evaluate(()=>window.render_game_to_text())).versus.elapsedMs;
    await page.waitForTimeout(600);
    const nativeElapsed=JSON.parse(await frame.evaluate(()=>window.render_game_to_text())).versus.elapsedMs-start;
    assert.ok(nativeElapsed>=400&&nativeElapsed<2000,`native frame clock ${nativeElapsed}ms`);
    await page.evaluate(()=>document.querySelector('iframe').contentWindow.postMessage({type:'LAHS_HOST_LIFECYCLE',phase:'pause'},location.origin));
    await frame.waitForFunction(()=>JSON.parse(window.render_game_to_text()).paused);
    const before=JSON.parse(await frame.evaluate(()=>window.render_game_to_text()));
    await frame.evaluate(()=>window.advanceTime(20000));assert.equal(JSON.parse(await frame.evaluate(()=>window.render_game_to_text())).versus.elapsedMs,before.versus.elapsedMs);
    await page.evaluate(()=>document.querySelector('iframe').contentWindow.postMessage({type:'LAHS_HOST_LIFECYCLE',phase:'resume'},location.origin));
    await frame.waitForFunction(()=>!JSON.parse(window.render_game_to_text()).paused);
    await frame.locator('#dropButton').click();await frame.evaluate(()=>window.advanceTime(8000));assert.equal(JSON.parse(await frame.evaluate(()=>window.render_game_to_text())).versus.results[0].points,210);
    assert.equal(await page.evaluate(()=>events.filter(event=>event.type==='LAHS_POINTS_EARNED').length),0);
    await page.screenshot({path:`${output}/iframe-round-result.png`});assert.deepEqual(errors,[]);row.pass=true;row.nativeElapsed=nativeElapsed;await context.close();console.log('PASS iframe-lifecycle');
  }catch(error){row.pass=false;row.error=error.stack;console.log(`FAIL iframe-lifecycle: ${error.stack}`);}finally{await browser.close();}
  rows.push(row);await writeFile(`${output}/${process.env.BIRDS_VS_REPORT||'browser-report'}.json`,JSON.stringify(rows,null,2));
}
if(rows.some(row=>!row.pass))process.exitCode=1;
