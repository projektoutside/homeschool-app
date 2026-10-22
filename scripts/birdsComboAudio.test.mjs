import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const sandbox={}; vm.runInNewContext(await readFile('public/Games/Many Birds One Stone/audio.js','utf8'),sandbox);
test('combo hit pitch rises while mute, pause and voice limits still suppress sources',()=>{
  const audio=new sandbox.WoodlandAudio(), sources=[];
  audio.context={state:'running',currentTime:0,createBufferSource(){const source={playbackRate:{value:1},connect(){return this;},start(){},disconnect(){}}; sources.push(source);return source;},createGain(){return {gain:{value:0},connect(){return this;},disconnect(){}};}};
  audio.master={}; audio.buffers.set('bird',{});
  for(const pitch of [1,1.16,1.32]) {audio.context.currentTime+=1;assert.equal(audio.play('bird',pitch),true);}
  assert.ok(sources[0].playbackRate.value<sources[1].playbackRate.value&&sources[1].playbackRate.value<sources[2].playbackRate.value);
  audio.muted=true;audio.context.currentTime+=1;audio.play('bird',1.32);assert.equal(sources.length,3);
  audio.muted=false;audio.paused=true;audio.play('bird',1.32);assert.equal(sources.length,3);
  audio.paused=false;while(audio.sources.size<12)audio.sources.add({});audio.play('bird',1.32);assert.equal(sources.length,3);
});
