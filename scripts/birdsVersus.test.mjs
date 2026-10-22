import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile('public/Games/Many Birds One Stone/versus.js', 'utf8'), context);
const rules = context.window.WoodlandVersusRules;
const config = { birds: 3, platformInk: 360 };
const map = () => ({ birds: [{x:180,y:250},{x:180,y:350},{x:180,y:450}], strokes: [[{x:60,y:200},{x:110,y:220}]] });
test('custom maps require the entire flock, a platform and a bounded ink budget', () => {
  assert.equal(rules.validMap(map(), config), true);
  assert.equal(rules.validMap({...map(), birds:map().birds.slice(1)}, config), false);
  assert.equal(rules.validMap({...map(), strokes:[]}, config), false);
  assert.equal(rules.validMap({...map(), strokes:[[{x:30,y:150},{x:330,y:150},{x:330,y:540}]]}, config), false);
  assert.equal(rules.validMap({...map(), strokes:[[{x:30,y:149},{x:60,y:160}]]}, config), false);
});
test('center placement rejects overlapping birds and platforms including crossing segments', () => {
  const m = map();
  for (const p of [{x:55,y:300},{x:180,y:250},{x:NaN,y:300}]) assert.equal(rules.birdAllowed(m,p),false);
  assert.equal(rules.birdAllowed(m,{x:180,y:250},0),true);
  assert.equal(rules.birdAllowed(m,{x:85,y:210}),false);
  m.strokes = [[{x:60,y:250},{x:300,y:250}]];
  assert.equal(rules.validMap(m, config),false);
});
test('match points and tiebreaks reward hits, combos, full clears and time without a wallet', () => {
  const result = (hits, clear, elapsedMs) => rules.resultFor({hits,combo:hits===3?60:10*hits,clear,elapsedMs,inkLeft:.8,reason:''});
  const clear = result(3,true,5000), partial = result(2,false,1000);
  assert.equal(clear.points,460); assert.equal(rules.winner([clear,partial]),0);
  assert.equal(rules.winner([clear,result(3,true,4500)]),1);
  assert.equal(rules.winner([clear,result(3,true,5050)]),null);
  assert.equal(rules.winner([result(0,false,500),result(0,false,3000)]),null);
  assert.equal('coins' in clear,false);
});
