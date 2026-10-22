import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize, resample, sparse, unpartition, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder } from 'meshoptimizer';
import { ready as resampleReady, resample as resampleWASM } from 'keyframe-resample';

let ioReady;

export async function optimizeGlb(inputPath, outputPath) {
  ioReady ??= Promise.all([draco3d.createDecoderModule(), MeshoptDecoder.ready]).then(([decoder]) =>
    new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
      'draco3d.decoder': decoder,
      'meshopt.decoder': MeshoptDecoder,
    }));
  const io = await ioReady;
  const document = await io.read(inputPath);
  for (const extension of document.getRoot().listExtensionsUsed()) {
    if (['KHR_draco_mesh_compression', 'EXT_meshopt_compression'].includes(extension.extensionName)) extension.dispose();
  }
  // Match the previous CLI profile without texture compression, simplification or hierarchy changes.
  await document.transform(
    dedup(), weld(), resample({ ready: resampleReady, resample: resampleWASM }),
    prune({ keepAttributes: false, keepIndices: false, keepLeaves: false, keepSolidTextures: false }),
    sparse(), quantize(), unpartition(),
  );
  await io.write(outputPath, document);
}
