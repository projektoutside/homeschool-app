import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fixtureContext, fixtureOrigin } from './gameFixture.mjs';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const output='output/preschool-challenge';await mkdir(output,{recursive:true});
const rows=[];
for(const [name,engine,width,height] of [['desktop',chromium,1440,900],['android-viewport',chromium,390,844],['iphone-webkit',webkit,390,844],['small-phone-webkit',webkit,320,568],['ipad-webkit',webkit,1024,1366],['landscape-webkit',webkit,844,390]]){
 if(process.env.PRESCHOOL_FILTER&&!new RegExp(process.env.PRESCHOOL_FILTER).test(name))continue;
 const browser=await engine.launch();const context=await fixtureContext(browser,{viewport:{width,height},hasTouch:name!=='desktop'});
 await context.addInitScript(()=>{window.__testAwards=[];window.LAHSPointsBridge={init(){},awardPoints:(points,detail)=>window.__testAwards.push({points,detail})};});
 const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(fixtureOrigin+'/Games/PreschoolFun/index.html');
  await page.waitForFunction(()=>typeof window.render_game_to_text==='function');
  const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
  const layout=async()=>{const size=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));assert.ok(size.sw<=size.w+1,JSON.stringify(size));assert.ok(size.sh<=size.h+1,JSON.stringify(size));return size;};
  await page.locator('[data-play-mode="challenge"]').click();
  assert.equal(await page.locator('[data-stage]:disabled').count(),7);
  assert.equal(await page.locator('#master-badge').isVisible(),false);
  await layout();await page.screenshot({path:`${output}/${name}-stages.png`});
  await page.locator('#start-button').click();
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).bird?.assetsReady);
  await page.locator('#auto-voice').click();
  assert.equal((await state()).playMode,'challenge');
  await layout();await page.screenshot({path:`${output}/${name}-chase.png`});
  const before=(await state()).challenge.danger;
  await page.evaluate(()=>window.advanceTime(3000));
  assert.ok((await state()).challenge.danger>before,'continuous approach');
  await page.locator('#help-button').click();const paused=(await state()).challenge.danger;
  await page.evaluate(()=>window.advanceTime(20000));assert.equal((await state()).challenge.danger,paused);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>window.advanceTime(120000));
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).sessionLost);
  await page.locator('#session-lose-overlay').waitFor({state:'visible'});
  assert.equal((await state()).challengeCompleted,0,'loss does not unlock');
  await page.locator('#session-try-again-button').click();
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).bird?.assetsReady);
  assert.equal((await state()).challenge.level,0);assert.equal((await state()).stars,0);
  if(name==='desktop'){
   await page.clock.install();
   for(let stage=0;stage<8;stage++){
    let s=await state();assert.equal(s.challenge.level,stage);
    const goal=await page.evaluate(i=>window.PreschoolChallenge.levels[i].goal,stage);
    for(let i=0;i<goal;i++){
     s=await state();assert.equal(s.selectedChoice,null,'fresh blank');
     const answer=s.options.find(o=>o.value===s.answer);
     assert.ok(answer,JSON.stringify(s));
     await page.locator(`[data-choice-id="${answer.id}"]`).click();await page.locator('#submit-button').click();
     if(i<goal-1){await page.clock.fastForward(1600);await page.waitForFunction(()=>!JSON.parse(window.render_game_to_text()).locked);}
    }
    await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).sessionWon);
    assert.equal((await state()).challengeCompleted,stage+1);
    if(stage<7){assert.doesNotMatch(await page.locator('#session-win-title').textContent(),/Ultimate Master/);await page.locator('#session-play-again-button').click();await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).bird?.assetsReady);}
   }
   assert.match(await page.locator('#session-win-title').textContent(),/Ultimate Master/);
   assert.equal(await page.evaluate(()=>window.__testAwards.length),45);
   assert.equal(await page.evaluate(()=>window.__testAwards.every(a=>a.points===10)),true);
   await page.screenshot({path:`${output}/ultimate-master.png`});
   await page.locator('#session-win-overlay [data-choose-mode]').click();
   await page.clock.runFor(350);
   assert.equal(await page.locator('[data-stage]:disabled').count(),0);await page.locator('#master-badge').waitFor({state:'visible'});
   await page.reload();await page.waitForFunction(()=>typeof window.render_game_to_text==='function');
   assert.equal((await state()).challengeCompleted,8,'progress survives reload');
   await page.locator('[data-play-mode="challenge"]').click();await page.locator('[data-stage="7"]').click();await page.locator('#start-button').click();
   await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).bird?.assetsReady);
   await page.locator('#auto-voice').click();const d=(await state()).challenge.danger;
   await page.evaluate(()=>window.advanceTime(3000));const distance=(await state()).challenge.danger-d;
   assert.ok(distance>.19,'final stage is faster');
   await page.locator('#help-button').click();await page.locator('#choose-mode-button').click();await page.locator('[data-play-mode="free"]').click();await page.locator('#start-button').click();
   await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).bird?.assetsReady);
   assert.equal((await state()).challenge,null);const free=(await state()).bird.largeBirdX;
   await page.evaluate(()=>window.advanceTime(30000));assert.equal((await state()).bird.largeBirdX,free,'free play remains untimed');
  }
  assert.deepEqual(errors,[]);rows.push({name,result:'PASS',fixtureOnly:true,width,height});console.log(name+' PASS');
 }catch(error){await page.screenshot({path:`${output}/${name}-failure.png`});throw error;}
 finally{await browser.close();}
}
await writeFile(`${output}/browser-report.json`,JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
