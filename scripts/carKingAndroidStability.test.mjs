import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const controllerUrl = new URL('../src/features/speech/nativeSpeechController.ts', import.meta.url);
const playerUrl = new URL('../src/pages/GamePlayer.tsx', import.meta.url);

test('Car King passive initialization never requests Android microphone permission', async () => {
  const source = await readFile(controllerUrl, 'utf8');
  const nativeEngineStart = source.indexOf('class NativeSpeechEngine');
  const webEngineStart = source.indexOf('class WebSpeechEngine');
  const nativeEngine = source.slice(nativeEngineStart, webEngineStart);
  const initializeStart = nativeEngine.indexOf('async initialize()');
  const startSessionStart = nativeEngine.indexOf('async startSession(');
  const passiveInitialize = nativeEngine.slice(initializeStart, startSessionStart);

  assert.match(passiveInitialize, /SpeechRecognition\.checkPermissions\(\)/);
  assert.doesNotMatch(passiveInitialize, /SpeechRecognition\.requestPermissions\(\)/);
  assert.doesNotMatch(passiveInitialize, /isOnDeviceRecognitionAvailable/);
});

test('Car King requests permission only when a player starts voice mode', async () => {
  const source = await readFile(controllerUrl, 'utf8');
  const nativeEngineStart = source.indexOf('class NativeSpeechEngine');
  const webEngineStart = source.indexOf('class WebSpeechEngine');
  const nativeEngine = source.slice(nativeEngineStart, webEngineStart);
  const startSessionStart = nativeEngine.indexOf('async startSession(');
  const stopSessionStart = nativeEngine.indexOf('async stopSession()');
  const startSession = nativeEngine.slice(startSessionStart, stopSessionStart);

  assert.match(startSession, /SpeechRecognition\.requestPermissions\(\)/);
  assert.match(startSession, /useOnDeviceRecognition:\s*false/);
});

test('Car King controller initialization is single-flight and route setup has one initializer', async () => {
  const [controller, player] = await Promise.all([
    readFile(controllerUrl, 'utf8'),
    readFile(playerUrl, 'utf8'),
  ]);

  assert.match(controller, /initializationPromise:\s*Promise<SpeechEngineAvailability>\s*\|\s*null/);
  assert.match(controller, /return this\.initializationPromise/);
  assert.doesNotMatch(player, /void controller\.initialize\(\)/);
});
