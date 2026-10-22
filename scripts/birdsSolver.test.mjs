import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const ctx=vm.createContext({performance,setTimeout,clearTimeout});vm.runInContext('window=globalThis',ctx);
for(const file of ['drop-mechanism.js','physics.js','versus-simulation.js','versus-solver.js'])vm.runInContext(await readFile(`public/Games/Many Birds One Stone/${file}`,'utf8'),ctx);
const cases=[
 ['vertical',[[180,250],[180,350],[180,450]]], ['single-left',[[68,300]]], ['single-right',[[296,350]]],
 ['diagonal',[[100,240],[250,440]]], ['horizontal',[[90,350],[270,350]]], ['zigzag',[[90,230],[265,340],[100,465]]],
 ['blocked-entry',[[180,300],[220,450]],[[{x:120,y:170},{x:240,y:185}]]],
];
for(const[name,targets,platforms]of cases)test(`automatic search verifies ${name} using legal ink, time and both motion settings`,()=>{
  const map={birds:targets.map(([x,y])=>({x,y})),strokes:platforms||[[{x:30,y:155},{x:70,y:165}]]},config={birds:targets.length,seconds:30,solverInk:480,platformInk:480};
  const search=ctx.WoodlandVersusSolver.createSearch(map,config);let found;const start=performance.now();
  do{found=search.next(100);}while(!found.done&&performance.now()-start<7000);
  assert.equal(found.result?.clear,true,`${name}: ${found.attempts} routes`);
  const replay=ctx.WoodlandVersusSimulation.replay(map,config,found.solution);
  assert.equal(replay.clear,true);assert.ok(replay.elapsedMs<=30000);assert.ok(replay.inkUsed<=480);
  assert.equal(ctx.WoodlandVersusSimulation.replay(map,{...config,reducedMotion:true},found.solution).clear,true);
  if(['diagonal','horizontal','zigzag','blocked-entry'].includes(name))assert.ok(found.solution.strokes.length,'a drawing solution is required');
});
test('an enclosed bird cannot be approved and malformed/over-budget/deadline witnesses fail',()=>{
  const map={birds:[{x:180,y:350}],strokes:[[{x:136,y:306},{x:224,y:306},{x:224,y:394},{x:136,y:394},{x:136,y:306}]]},config={birds:1,solverInk:480,seconds:30};
  assert.equal(ctx.WoodlandVersusSolver.createSearch(map,config).next(100).solution,undefined);
  const sim=ctx.WoodlandVersusSimulation;
  for(const solution of [{aim:NaN,dropFrame:90,strokes:[]},{aim:180,dropFrame:0,strokes:[]},{aim:180,dropFrame:90,strokes:[[null,{x:180,y:350}]]},{aim:180,dropFrame:90,strokes:[[{x:22,y:110},{x:338,y:522},{x:22,y:110}]]}])assert.equal(sim.replay(map,config,solution).clear,false);
  assert.equal(sim.replay({birds:[{x:180,y:350}],strokes:[]},{...config,seconds:1},{aim:180,dropFrame:90,strokes:[]}).clear,false);
});
test('stroke bounds preserve the original collision result, including edges and corners',()=>{
  const physics=ctx.WoodlandPhysics, rail=physics.createStroke([{x:50,y:180},{x:160,y:320},{x:290,y:250}],7),plain={...rail,bounds:null};
  for(let i=0;i<180;i++){
    const stone={x:20+i*1.8,y:120+(i*37)%300,vx:(i%7-3)*80,vy:200,radius:12,supportMinX:Infinity,supportMaxX:-Infinity};
    const a={...stone},b={...stone};const contactsA=physics.solve(a,[rail],1/180),contactsB=physics.solve(b,[plain],1/180);
    assert.deepEqual(a,b);assert.deepEqual(contactsA,contactsB);
  }
});
test('worker-free checking yields to the event loop and cancellation resolves without a stale approval',async()=>{
  const checker=new ctx.WoodlandMapChecker(),map={birds:[{x:90,y:230},{x:265,y:340},{x:100,y:465}],strokes:[[{x:30,y:155},{x:70,y:165}]]},config={birds:3,solverInk:480,seconds:30};
  let yielded=false;setTimeout(()=>{yielded=true;},0);
  const result=await checker.check(map,config,()=>{});assert.equal(result.result.clear,true);assert.equal(yielded,true);assert.equal(checker.job,null);
  const pending=checker.check(map,config,()=>{});checker.cancel();assert.equal((await pending).cancelled,true);assert.equal(checker.job,null);
});
