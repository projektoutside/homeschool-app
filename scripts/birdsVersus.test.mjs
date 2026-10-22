import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({performance,setTimeout,clearTimeout});
vm.runInContext('window=globalThis',context);
for(const file of ['drop-mechanism.js','physics.js','versus-simulation.js','versus-solver.js','versus.js'])vm.runInContext(await readFile(`public/Games/Many Birds One Stone/${file}`,'utf8'),context);
const rules = context.window.WoodlandVersusRules;
const config = { birds: 3, platformInk: 360, solverInk: 480, seconds: 60 };
const proofFor = (m,c) => { const search=context.WoodlandVersusSolver.createSearch(m,c);let found;do {found=search.next(100);}while(!found.done);return {...found.result,key:rules.mapKey(m,c),automatic:true,revision:context.WoodlandVersusSimulation.revision,solution:found.solution,solutionKey:JSON.stringify(found.solution),dropped:true,ballRadius:12}; };
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
test('only a verified automatic route with the opponent supplies and time unlocks a map', () => {
  const m=map(), proof=proofFor(m,config);
  assert.equal(rules.isProven(m,config,proof),true);
  assert.equal(rules.isProven(m,config,null),false);
  for(const invalid of [{automatic:false},{revision:'old'},{solutionKey:'changed'},{clear:false},{hits:2},{dropped:false},{ballRadius:14},{inkUsed:481},{inkUsed:-1},{inkUsed:NaN},{elapsedMs:60001},{elapsedMs:-1},{elapsedMs:Infinity}]){
    assert.equal(rules.isProven(m,config,{...proof,...invalid}),false,JSON.stringify(invalid));
  }
});
test('proofs are bound to every bird, platform and match setting', () => {
  const m=map(), proof=proofFor(m,config);
  const birdEdit=map();birdEdit.birds[0].x+=1;assert.equal(rules.isProven(birdEdit,config,proof),false);
  const railEdit=map();railEdit.strokes[0][1].y+=1;assert.equal(rules.isProven(railEdit,config,proof),false);
  for(const edit of [{birds:2},{seconds:30},{seconds:0},{platformInk:480},{solverInk:600}]) assert.equal(rules.isProven(m,{...config,...edit},proof),false);
  const untimed={...config,seconds:0};assert.equal(rules.isProven(m,untimed,{...proof,key:rules.mapKey(m,untimed),elapsedMs:100000}),true);
});
test('both challenges must be proven before any competitive turn can start', () => {
  const versus=Object.create(context.window.WoodlandVersus.prototype);
  Object.assign(versus,{active:true,phase:'handoff',config,maps:[map(),map()],proofs:[]});
  versus.startTurn();assert.equal(versus.phase,'handoff');
  const proof=proofFor(map(),config);
  versus.proofs=[proof];assert.equal(versus.mapsProven(),false);
  versus.startTurn();assert.equal(versus.phase,'handoff');
  versus.proofs=[proof,proof];assert.equal(versus.mapsProven(),true);
  versus.maps[1].birds[0].x+=1;assert.equal(versus.mapsProven(),false);
});
