import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  getGameHostPolicy,
  getGameIdFromHostRoute,
  getGameHostPolicyForRoute,
} from '../src/utils/gameHostPolicy.ts';

const LEGACY_IFRAME_ALLOW = 'autoplay; fullscreen; camera; microphone; geolocation';
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const mainLayoutSource = readFileSync(new URL('../src/layouts/MainLayout.tsx', import.meta.url), 'utf8');
const gamePlayerSource = readFileSync(new URL('../src/pages/GamePlayer.tsx', import.meta.url), 'utf8');
const policySource = readFileSync(new URL('../src/utils/gameHostPolicy.ts', import.meta.url), 'utf8');

test('Animal Champion receives the frozen least-privilege host policy', () => {
  const policy = getGameHostPolicy('animal-champion');

  assert.deepEqual(policy, {
    lockZoom: false,
    requiresNativeFullscreen: false,
    iframeAllow: undefined,
    allowFullScreen: false,
  });
  assert.equal(Object.isFrozen(policy), true);
});

test('other and near-match games retain frozen legacy host behavior', () => {
  for (const id of ['math-car-king', 'animal-champion-2', null, undefined]) {
    const policy = getGameHostPolicy(id);

    assert.deepEqual(policy, {
      lockZoom: true,
      requiresNativeFullscreen: true,
      iframeAllow: LEGACY_IFRAME_ALLOW,
      allowFullScreen: true,
    });
    assert.equal(Object.isFrozen(policy), true);
  }
});

test('only exact play and open route shapes return a decoded game id', () => {
  const cases = [
    ['/play/animal-champion', 'animal-champion'],
    ['/open/animal-champion', 'animal-champion'],
    ['/play/animal-champion/', 'animal-champion'],
    ['/open/animal%2Dchampion/', 'animal-champion'],
    ['/play/animal-champion-2', 'animal-champion-2'],
    ['/apps', null],
    ['/play/animal-champion/more', null],
    ['/preview/animal-champion', null],
    ['/play/', null],
  ];

  for (const [pathname, expected] of cases) {
    assert.equal(getGameIdFromHostRoute(pathname), expected, pathname);
  }
});

test('malformed route encoding returns null instead of throwing', () => {
  assert.doesNotThrow(() => getGameIdFromHostRoute('/play/animal%2'));
  assert.equal(getGameIdFromHostRoute('/play/animal%2'), null);
  assert.equal(getGameIdFromHostRoute('/open/%E0%A4%A'), null);
});

test('route policy exempts only exact Animal Champion play and open routes', () => {
  for (const pathname of [
    '/play/animal-champion',
    '/open/animal-champion/',
    '/play/animal%2Dchampion',
  ]) {
    assert.equal(getGameHostPolicyForRoute(pathname).requiresNativeFullscreen, false, pathname);
    assert.equal(getGameHostPolicyForRoute(pathname).lockZoom, false, pathname);
  }

  for (const pathname of [
    '/play/animal-champion-2',
    '/play/animal-champion/more',
    '/play/animal%2Fchampion',
    '/play/animal%2',
    '/apps',
  ]) {
    const policy = getGameHostPolicyForRoute(pathname);
    assert.equal(policy.requiresNativeFullscreen, true, pathname);
    assert.equal(policy.lockZoom, true, pathname);
    assert.equal(policy.allowFullScreen, true, pathname);
    assert.equal(policy.iframeAllow, LEGACY_IFRAME_ALLOW, pathname);
  }
});

test('App global fullscreen fallback consults the route host policy', () => {
  assert.match(
    appSource,
    /import\s+\{\s*getGameHostPolicyForRoute\s*\}\s+from '\.\/utils\/gameHostPolicy';/,
  );
  assert.match(
    appSource,
    /isFullscreenExemptRoute\s*=\s*[\s\S]*?!getGameHostPolicyForRoute\(location\.pathname\)\.requiresNativeFullscreen/,
  );
});

test('MainLayout combines its current zoom decision with the route host policy', () => {
  assert.match(
    mainLayoutSource,
    /import\s+\{\s*getGameHostPolicyForRoute\s*\}\s+from '\.\.\/utils\/gameHostPolicy';/,
  );
  assert.match(mainLayoutSource, /getGameHostPolicyForRoute\(location\.pathname\)\.lockZoom/);
  assert.match(mainLayoutSource, /useZoomLock\(\{\s*enabled:\s*shouldDisableZoom\s*&&/);
});

test('GamePlayer derives one policy before its unconditional zoom hook and enforces every iframe boundary', () => {
  assert.match(
    gamePlayerSource,
    /import\s+\{\s*getGameHostPolicy\s*\}\s+from '\.\.\/utils\/gameHostPolicy';/,
  );
  assert.match(gamePlayerSource, /const gameHostPolicy = getGameHostPolicy\(currentGameId \?\? id\);/);
  assert.match(gamePlayerSource, /useZoomLock\(\{\s*enabled:\s*gameHostPolicy\.lockZoom,\s*iframeRefs:\s*zoomLockIframes\s*\}\);/);
  assert.match(gamePlayerSource, /requiresRouteFullscreen\s*=\s*Boolean\([\s\S]*?gameHostPolicy\.requiresNativeFullscreen/);
  assert.match(gamePlayerSource, /allow=\{gameHostPolicy\.iframeAllow\}/);
  assert.match(gamePlayerSource, /allowFullScreen=\{gameHostPolicy\.allowFullScreen\}/);

  const currentGameIdIndex = gamePlayerSource.indexOf('const currentGameId =');
  const gameHostPolicyIndex = gamePlayerSource.indexOf('const gameHostPolicy =');
  const zoomHookIndex = gamePlayerSource.indexOf('useZoomLock({');
  assert.ok(currentGameIdIndex < gameHostPolicyIndex, 'policy must be derived after the current game id');
  assert.ok(gameHostPolicyIndex < zoomHookIndex, 'zoom hook must remain unconditional after policy derivation');
});

test('legacy iframe permissions are centralized in the default policy', () => {
  assert.equal(policySource.includes(LEGACY_IFRAME_ALLOW), true);
  assert.equal(gamePlayerSource.includes(LEGACY_IFRAME_ALLOW), false);
});
