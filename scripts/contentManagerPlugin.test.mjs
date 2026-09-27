import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createServer, transformWithEsbuild } from 'vite';

const pluginSource = await readFile(new URL('./vite/contentManagerPlugin.ts', import.meta.url), 'utf8');
const transformedPlugin = await transformWithEsbuild(pluginSource, 'contentManagerPlugin.ts', { loader: 'ts' });
const { createContentManagerPlugin } = await import(`data:text/javascript,${encodeURIComponent(transformedPlugin.code)}`);

test('classroom state writer keeps embedded JSON inside its script element', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'classroom-state-'));
  const classroomDir = path.join(root, 'public', '3dClass');
  const indexFile = path.join(classroomDir, 'index.html');
  let server;

  try {
    await mkdir(classroomDir, { recursive: true });
    await writeFile(indexFile, '<!-- CLASSROOM_EMBEDDED_STATE_START --><script id="classroomEmbeddedState" type="application/json">{}</script><!-- CLASSROOM_EMBEDDED_STATE_END -->');
    server = await createServer({
      configFile: false,
      root,
      plugins: [createContentManagerPlugin(root)],
      server: { host: '127.0.0.1', port: 0 },
    });
    await server.listen();

    const address = server.httpServer.address();
    assert.ok(address && typeof address !== 'string');
    const response = await fetch(`http://127.0.0.1:${address.port}/api/classroom-3d/save-index-state`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        state: { layout: {}, locked: true, componentFiles: ['</script><script>alert(1)</script>'] },
      }),
    });
    assert.equal(response.status, 200);

    const html = await readFile(indexFile, 'utf8');
    assert.doesNotMatch(html, /<\/script><script>alert\(1\)/);
    const embeddedJson = html.match(/<script id="classroomEmbeddedState" type="application\/json">\s*([\s\S]*?)\s*<\/script>/)?.[1];
    assert.ok(embeddedJson);
    assert.deepEqual(JSON.parse(embeddedJson).componentFiles, ['</script><script>alert(1)</script>']);
  } finally {
    await server?.close();
    await rm(root, { recursive: true, force: true });
  }
});
