import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import { buildSpeechCandidatesFromEvent, matchAnimalSpeech } from '../public/Games/Animal Champion/js/animal-speech.js';

const carSource = await readFile(new URL('../public/Games/CarKingFinal/js/game.js', import.meta.url), 'utf8');
const carContext = { window: { addEventListener() {} }, console };
vm.runInNewContext(`${carSource}\nglobalThis.CarController = CarGuessingGame;`, carContext);
const car = Object.create(carContext.CarController.prototype);
const hostSource = await readFile(new URL('../src/features/speech/nativeSpeechController.ts', import.meta.url), 'utf8');
const webEngineSource = hostSource.slice(hostSource.indexOf('class WebSpeechEngine'), hostSource.indexOf('class ExperimentalMoonshineEngine'));

function speechEvent(parts, resultIndex) {
  return { resultIndex, results: parts.map((text) => Object.assign([{ transcript: text }], { isFinal: true })) };
}

test('both games recognize a multiword answer split across recognition result events', () => {
  const animalEvent = speechEvent(['polar', 'bear'], 1);
  const candidates = buildSpeechCandidatesFromEvent(animalEvent).candidates;
  assert.equal(matchAnimalSpeech(candidates, { name: 'Polar Bear' }).matched, true);
  const snapshot = car.buildSpeechCandidatesFromEvent(speechEvent(['Mercedes', 'Benz', 'G Class'], 2));
  assert.ok(snapshot.candidates.includes('Mercedes Benz G Class'));
  assert.ok(!snapshot.candidates.includes('Mercedes'), 'unchanged old segments are not replayed as fresh answers');
});

test('speech alternatives keep their prefix when a recognizer splits an animal name', () => {
  const event = speechEvent(['polar', 'beer'], 1);
  event.results[1].push({ transcript: 'bear' });
  assert.ok(buildSpeechCandidatesFromEvent(event).candidates.includes('polar bear'));
});

function createWebEngine({ ios = false } = {}) {
  const instances = [];
  class Recognition {
    constructor() { instances.push(this); }
    start() { this.onstart?.(); }
    abort() { this.onend?.(); }
    stop() { this.onend?.(); }
  }
  const context = {
    window: { SpeechRecognition: Recognition },
    navigator: { userAgent: ios ? 'Mozilla/5.0 (Macintosh)' : 'Chrome', platform: ios ? 'MacIntel' : 'Win32', maxTouchPoints: ios ? 5 : 0 },
    uniqueSpeechPhrases: (phrases) => [...new Set(phrases)],
    createTranscriptSnapshot: (matches, text, isFinal) => ({ matches, text, isFinal }),
  };
  const compiled = transformSync(`${webEngineSource}\nglobalThis.Engine = WebSpeechEngine;`, { loader: 'ts', target: 'es2022' }).code;
  vm.runInNewContext(compiled, context);
  const events = [];
  const callbacks = {
    onStateChange: (...args) => events.push(['state', ...args]),
    onPartial: (snapshot) => events.push(['partial', snapshot]),
    onFinal: (snapshot) => events.push(['final', snapshot]),
    onError: (...args) => events.push(['error', ...args]),
  };
  return { engine: new context.Engine({}), events, callbacks, instances };
}

test('host-owned browser speech combines split names and ignores a replaced engine', async () => {
  const { engine, events, callbacks, instances } = createWebEngine();
  await engine.startSession({}, callbacks);
  const previous = instances[0];
  const lateResult = previous.onresult;
  const lateEnd = previous.onend;
  await engine.startSession({}, callbacks);
  const eventCount = events.length;
  lateResult(speechEvent(['wrong answer'], 0));
  lateEnd();
  assert.equal(events.length, eventCount, 'old callbacks cannot affect the active microphone');
  instances[1].onresult(speechEvent(['polar', 'bear'], 1));
  assert.ok(events.at(-1)[1].matches.includes('polar bear'));
  await engine.abortSession();
  const stoppedCount = events.length;
  instances[1].onresult(speechEvent(['another animal'], 0));
  assert.equal(events.length, stoppedCount);
});

test('desktop-mode iPad browser speech uses short sessions so natural endings can rearm', async () => {
  const { engine, callbacks, instances } = createWebEngine({ ios: true });
  await engine.startSession({}, callbacks);
  assert.equal(instances[0].continuous, false);
});

test('host permission and capture failures stop rearming while no-speech remains recoverable', () => {
  const source = hostSource.slice(hostSource.indexOf('export class CarKingNativeFirstSpeechController'));
  const context = {};
  vm.runInNewContext(transformSync(`${source.replace('export class', 'class')}\nglobalThis.Controller = CarKingNativeFirstSpeechController;`, { loader: 'ts', target: 'es2022' }).code, context);
  for (const code of ['permission-denied', 'not-allowed', 'service-not-allowed', 'audio-capture', 'no-speech']) {
    const controller = Object.create(context.Controller.prototype);
    const restarts = [];
    Object.assign(controller, {
      activeRoundId: 'round', gateOpen: true, captureHeld: true, engineSessionActive: true,
      activeSessionOptions: {}, currentState: 'listening', bufferedSnapshots: [], engine: { kind: 'web-speech' },
      setState(state) { this.currentState = state; },
      emitError() {}, postEvent() {}, scheduleRoundRearm: (...args) => restarts.push(args),
    });
    const handlers = controller.createEngineEvents('round');
    handlers.onError(code, 'test failure');
    handlers.onStateChange('idle');
    if (code === 'no-speech') {
      assert.ok(restarts.length > 0, 'silence can restart listening');
    } else {
      assert.equal(restarts.length, 0, `${code} must not create a permission/restart loop`);
      assert.equal(controller.gateOpen, false);
      assert.equal(controller.currentState, 'error');
    }
  }
});
