import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const sandbox={window:{}};
vm.runInNewContext(readFileSync('public/Games/PreschoolFun/challenge.js','utf8'),sandbox);
const game=sandbox.window.PreschoolChallenge;
test('eight challenge stages increase speed and finish with an eight-answer master challenge',()=>{
 assert.equal(game.levels.length,8);
 for(let i=1;i<8;i++)assert.ok(game.levels[i].rate>game.levels[i-1].rate);
 assert.equal(game.levels[7].speed,11.25);assert.equal(game.levels[7].goal,8);
});
test('elapsed chase is equivalent at 30, 60 and 120 Hz; grace and pauses stay fair',()=>{
 const values=[30,60,120].map(hz=>{const r=game.createRun(3);for(let i=0;i<hz*5;i++)r.advance(1000/hz);return r.describe().danger;});
 assert.ok(Math.max(...values)-Math.min(...values)<1e-10);
 const r=game.createRun(7);r.advance(1000);assert.equal(r.describe().danger,.32);
 r.advance(60000,false);assert.equal(r.describe().danger,.32);assert.equal(r.describe().graceMs,500);
 r.advance(1500);assert.ok(r.describe().danger>.32);
});
test('correct answers retreat and win only at quota; failed runs cannot earn mastery',()=>{
 for(let stage=0;stage<8;stage++){
  const r=game.createRun(stage);r.advance(2500);const before=r.describe().danger;
  r.answer(true);assert.ok(r.describe().danger<before);
  for(let i=1;i<game.levels[stage].goal;i++){assert.equal(r.describe().won,false);r.answer(true);}
  assert.equal(r.describe().won,true);r.advance(100000);assert.equal(r.describe().caught,false);
 }
 const r=game.createRun(7);for(let i=0;i<400;i++)r.advance(32);
 assert.equal(r.describe().caught,true);r.answer(true);assert.equal(r.describe().correct,0);
 assert.equal(game.createRun(7).describe().danger,.32);
});
test('save progression is monotonic, bounded and resilient to unavailable/corrupt storage',()=>{
 let value=null;const storage={getItem:()=>value,setItem:(_,v)=>{value=v;}};
 assert.equal(game.readProgress(storage),0);assert.equal(game.writeProgress(storage,8),true);
 game.writeProgress(storage,2);assert.equal(game.readProgress(storage),8);
 for(const bad of [-1,9,1.5,NaN,'8'])assert.equal(game.writeProgress(storage,bad),false);
 value='broken';assert.equal(game.readProgress(storage),0);
 value='{"completed":100}';assert.equal(game.readProgress(storage),0);
 assert.equal(game.writeProgress(undefined,2),false);assert.equal(game.readProgress(undefined),0);
});
