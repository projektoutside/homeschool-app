import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, getBounds, meshopt } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptEncoder } from 'meshoptimizer';
import { optimizeGlb } from './gltf-optimize.mjs';
import { getOptimizePlan, runOptimize } from './optimize-glb-assets.mjs';

const directory = await mkdtemp(path.join(os.tmpdir(), 'homeschool-glb-test-'));
after(async () => {
  assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
  assert.ok(path.basename(directory).startsWith('homeschool-glb-test-'));
  await rm(directory, { recursive: true, force: true });
});

function fixture() {
  const document = new Document(), buffer = document.createBuffer();
  const positions = document.createAccessor().setType('VEC3').setArray(new Float32Array([-1, 0, 0, 1, 0, 0, 0, 2, 0, -1, 0, 0, 1, 0, 0, 0, 2, 0])).setBuffer(buffer);
  const indices = document.createAccessor().setType('SCALAR').setArray(new Uint16Array([0, 1, 2, 3, 4, 5])).setBuffer(buffer);
  const primitive = document.createPrimitive().setAttribute('POSITION', positions).setIndices(indices);
  const mesh = document.createMesh('Triangle').addPrimitive(primitive);
  const leaf = document.createNode('AnimatedLeaf').setMesh(mesh);
  const root = document.createNode('RootRig').setTranslation([3, 4, 5]).addChild(leaf);
  const scene = document.createScene('Woodland').addChild(root);
  document.getRoot().setDefaultScene(scene);
  const input = document.createAccessor().setType('SCALAR').setArray(new Float32Array([0, 1, 2])).setBuffer(buffer);
  const output = document.createAccessor().setType('VEC3').setArray(new Float32Array([0, 0, 0, 0, 1, 0, 0, 2, 0])).setBuffer(buffer);
  const sampler = document.createAnimationSampler().setInput(input).setOutput(output);
  const channel = document.createAnimationChannel().setSampler(sampler).setTargetNode(leaf).setTargetPath('translation');
  document.createAnimation('Float').addSampler(sampler).addChannel(channel);
  return document;
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

test('GLB optimization preserves scene bounds, named hierarchy, animation and input bytes', async () => {
  const document = fixture(), input = path.join(directory, 'source.glb'), output = path.join(directory, 'optimized.glb');
  const expectedBounds = getBounds(document.getRoot().getDefaultScene());
  await io.write(input, document);
  const before = await readFile(input);
  await optimizeGlb(input, output);
  assert.deepEqual(await readFile(input), before);
  const result = await io.read(output), root = result.getRoot(), bounds = getBounds(root.getDefaultScene());
  for (const key of ['min', 'max']) for (let i = 0; i < 3; i++) assert.ok(Math.abs(bounds[key][i] - expectedBounds[key][i]) < .001);
  assert.equal(root.getDefaultScene().listChildren()[0].getName(), 'RootRig');
  const leaf = root.listNodes().find(node => node.getName() === 'AnimatedLeaf');
  assert.ok(leaf && leaf.getParentNode()?.getName() === 'RootRig');
  assert.equal(root.listMeshes()[0].listPrimitives()[0].getIndices().getCount(), 6);
  const animation = root.listAnimations()[0];
  assert.equal(animation.getName(), 'Float');
  assert.equal(animation.listChannels()[0].getTargetNode(), leaf);
  assert.equal(animation.listChannels()[0].getTargetPath(), 'translation');
  const times = animation.listSamplers()[0].getInput().getArray();
  assert.equal(times[0], 0); assert.equal(times[times.length - 1], 2);
});

test('existing Draco and Meshopt inputs can be decoded and optimized', async () => {
  const encoder = await draco3d.createEncoderModule(); await MeshoptEncoder.ready;
  const compressedIO = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.encoder': encoder, 'meshopt.encoder': MeshoptEncoder });
  for (const format of ['draco', 'meshopt']) {
    const document = fixture(), input = path.join(directory, `${format}.glb`), output = path.join(directory, `${format}-optimized.glb`);
    await document.transform(format === 'draco' ? draco() : meshopt({ encoder: MeshoptEncoder }));
    await compressedIO.write(input, document);
    await optimizeGlb(input, output);
    const result = await io.read(output);
    assert.equal(result.getRoot().listMeshes().length, 1);
    assert.equal(result.getRoot().listAnimations().length, 1);
    assert.equal(result.getRoot().listExtensionsUsed().some(extension => ['KHR_draco_mesh_compression', 'EXT_meshopt_compression'].includes(extension.extensionName)), false);
  }
});

test('wing-critical sources stay protected until explicitly opted in', async () => {
  for (const relative of ['Wings/example.glb', 'Eferno/ComfyUI_00007_.glb']) {
    const input = path.resolve('public/HomePageAPP/Images/PROPS', relative);
    assert.equal(getOptimizePlan(input).optimize, false);
    assert.equal(getOptimizePlan(input, true).optimize, true);
    assert.deepEqual(await runOptimize(input, path.join(directory, 'unused.glb')), { skipped: true, profile: 'preserve-source' });
  }
});

test('invalid input fails instead of producing a replacement asset', async () => {
  const input = path.join(directory, 'invalid.glb'), output = path.join(directory, 'invalid-output.glb');
  await writeFile(input, 'invalid');
  await assert.rejects(optimizeGlb(input, output));
  await assert.rejects(readFile(output), { code: 'ENOENT' });
});
