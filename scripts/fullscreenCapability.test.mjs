import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transformWithEsbuild } from 'vite';

const source = await readFile(new URL('../src/utils/fullscreen.ts', import.meta.url), 'utf8');
const transformed = await transformWithEsbuild(source, 'fullscreen.ts', { loader: 'ts' });
const { supportsElementFullscreenOnPlatform } = await import(`data:text/javascript,${encodeURIComponent(transformed.code)}`);

test('older iOS browsers without element fullscreen can launch immersive routes', () => {
  assert.equal(supportsElementFullscreenOnPlatform('ios', null), false);
  assert.equal(supportsElementFullscreenOnPlatform('ios', { fullscreenEnabled: false }), false);
});

test('iOS browsers with standard or prefixed fullscreen retain the immersive route', () => {
  assert.equal(supportsElementFullscreenOnPlatform('ios', { fullscreenEnabled: true }), true);
  assert.equal(supportsElementFullscreenOnPlatform('ios', { webkitFullscreenEnabled: true }), true);
});

test('other platforms preserve their existing fullscreen fallback', () => {
  assert.equal(supportsElementFullscreenOnPlatform('android', null), true);
  assert.equal(supportsElementFullscreenOnPlatform('chromium-desktop', null), true);
});
