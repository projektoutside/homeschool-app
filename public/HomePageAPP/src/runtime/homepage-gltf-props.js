export function cloneSceneGraph(root) {
  const clone = root.clone(true);
  clone.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;
    if (Array.isArray(node.material)) {
      node.material = node.material.map((material) => material?.clone?.() || material);
      return;
    }
    if (node.material?.clone) {
      node.material = node.material.clone();
    }
  });
  return clone;
}

const glbSceneSourceCache = new Map();

function shouldCacheGlbAssetUrl(assetUrl) {
  return typeof assetUrl === 'string'
    && assetUrl.length > 0
    && !assetUrl.startsWith('blob:')
    && !assetUrl.startsWith('data:');
}

async function loadGlbSceneSource({ GLTFLoader, assetUrl }) {
  if (!assetUrl) {
    return null;
  }

  const useCache = shouldCacheGlbAssetUrl(assetUrl);
  if (useCache) {
    const cachedSource = glbSceneSourceCache.get(assetUrl);
    if (cachedSource) {
      return cachedSource;
    }
  }

  const loader = new GLTFLoader();
  const sourcePromise = new Promise((resolve, reject) => {
    loader.load(
      assetUrl,
      (gltf) => {
        const sourceRoot = gltf?.scene || gltf?.scenes?.[0] || null;
        if (!sourceRoot) {
          if (useCache) {
            glbSceneSourceCache.delete(assetUrl);
          }
          reject(new Error(`GLB asset did not contain a scene root: ${assetUrl}`));
          return;
        }
        sourceRoot.updateMatrixWorld(true);
        resolve(sourceRoot);
      },
      undefined,
      (error) => {
        if (useCache) {
          glbSceneSourceCache.delete(assetUrl);
        }
        reject(error);
      },
    );
  });

  if (useCache) {
    glbSceneSourceCache.set(assetUrl, sourcePromise);
  }

  return sourcePromise;
}

export function applyAttachmentTransform(target, attachment = {}) {
  if (!target) return;
  const position = Array.isArray(attachment.position) ? attachment.position : [0, 0, 0];
  const rotation = Array.isArray(attachment.rotation) ? attachment.rotation : [0, 0, 0];
  const scale = Array.isArray(attachment.scale) ? attachment.scale : [1, 1, 1];
  target.position.set(Number(position[0]) || 0, Number(position[1]) || 0, Number(position[2]) || 0);
  target.rotation.set(Number(rotation[0]) || 0, Number(rotation[1]) || 0, Number(rotation[2]) || 0);
  target.scale.set(Number(scale[0]) || 1, Number(scale[1]) || 1, Number(scale[2]) || 1);
}

export function buildMirroredAttachmentTransform(attachment = {}, dir = 1) {
  const position = Array.isArray(attachment.position) ? attachment.position : [0, 0, 0];
  const rotation = Array.isArray(attachment.rotation) ? attachment.rotation : [0, 0, 0];
  const scale = Array.isArray(attachment.scale) ? attachment.scale : [1, 1, 1];
  return {
    position: [dir * (Number(position[0]) || 0), Number(position[1]) || 0, Number(position[2]) || 0],
    rotation: [Number(rotation[0]) || 0, dir * (Number(rotation[1]) || 0), dir * (Number(rotation[2]) || 0)],
    scale: [Number(scale[0]) || 1, Number(scale[1]) || 1, Number(scale[2]) || 1],
  };
}

function buildSingleWingAttachmentTransform(attachment = {}, side = 'right') {
  const dir = side === 'left' ? -1 : 1;
  const position = Array.isArray(attachment.position) ? attachment.position : [0, 0, 0];
  const rotation = Array.isArray(attachment.rotation) ? attachment.rotation : [0, 0, 0];
  const scale = Array.isArray(attachment.scale) ? attachment.scale : [1, 1, 1];
  return {
    position: [Math.abs(Number(position[0]) || 0) * dir, Number(position[1]) || 0, Number(position[2]) || 0],
    rotation: [Number(rotation[0]) || 0, Math.abs(Number(rotation[1]) || 0) * dir, Math.abs(Number(rotation[2]) || 0) * dir],
    scale: [Math.abs(Number(scale[0]) || 1), Math.abs(Number(scale[1]) || 1), Math.abs(Number(scale[2]) || 1)],
  };
}

function buildMirroredWingPairFromIsolatedSource(isolatedRoot, sourceSide = 'left') {
  if (!isolatedRoot) {
    return null;
  }
  const normalizedSourceSide = sourceSide === 'right' ? 'right' : 'left';
  const leftRoot = cloneSceneGraph(isolatedRoot);
  const rightRoot = cloneSceneGraph(isolatedRoot);

  if (normalizedSourceSide === 'right') {
    leftRoot.scale.x *= -1;
  } else {
    rightRoot.scale.x *= -1;
  }

  leftRoot.updateMatrixWorld(true);
  rightRoot.updateMatrixWorld(true);

  return {
    left: leftRoot,
    right: rightRoot,
  };
}

export const DEFAULT_WING_AUTHORING_PREVIEW = Object.freeze({
  mode: 'originalPair',
  sourceSide: 'left',
  mirrorToBoth: true,
  splitOffset: 0,
  trimMargin: 0.02,
});

export const DEFAULT_WING_MOTION_CHANNEL = Object.freeze({
  flapHz: 1.45,
  direction: 'normal',
  amplitude: 1,
  sweep: 1,
  pitch: 0,
  featherTwist: 1,
  shoulderSpread: 0,
  phaseOffset: 0,
});

export const DEFAULT_WING_MOTION_PREVIEW = Object.freeze({
  linked: true,
  master: DEFAULT_WING_MOTION_CHANNEL,
  left: null,
  right: null,
});

function clampNumber(value, minimum, maximum, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.min(maximum, Math.max(minimum, numericValue));
}

export function normalizeWingAuthoringPreview(raw, {
  defaultMirrorToBoth = true,
} = {}) {
  const preview = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const mode = preview.mode === 'isolatedHalf' ? 'isolatedHalf' : 'originalPair';
  const sourceSide = preview.sourceSide === 'right' ? 'right' : 'left';
  return {
    mode,
    sourceSide,
    mirrorToBoth: preview.mirrorToBoth !== false && defaultMirrorToBoth !== false,
    splitOffset: clampNumber(preview.splitOffset, -0.85, 0.85, 0),
    trimMargin: clampNumber(preview.trimMargin, 0, 0.36, 0.02),
  };
}

export function normalizeWingMotionChannel(raw, fallback = DEFAULT_WING_MOTION_CHANNEL) {
  const channel = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    flapHz: clampNumber(channel.flapHz, 0.2, 4.5, fallback.flapHz),
    direction: channel.direction === 'reverse' ? 'reverse' : 'normal',
    amplitude: clampNumber(channel.amplitude, 0.15, 2.8, fallback.amplitude),
    sweep: clampNumber(channel.sweep, 0.15, 2.4, fallback.sweep),
    pitch: clampNumber(channel.pitch, -1.4, 1.4, fallback.pitch),
    featherTwist: clampNumber(channel.featherTwist, 0, 2.4, fallback.featherTwist),
    shoulderSpread: clampNumber(channel.shoulderSpread, -0.6, 1.2, fallback.shoulderSpread),
    phaseOffset: clampNumber(channel.phaseOffset, -Math.PI, Math.PI, fallback.phaseOffset),
  };
}

export function normalizeWingMotionPreview(raw) {
  const preview = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const master = normalizeWingMotionChannel(preview.master, DEFAULT_WING_MOTION_CHANNEL);
  const linked = preview.linked !== false;
  return {
    linked,
    master,
    left: preview.left ? normalizeWingMotionChannel(preview.left, master) : null,
    right: preview.right ? normalizeWingMotionChannel(preview.right, master) : null,
  };
}

export function resolveWingMotionProfiles(raw) {
  const normalized = normalizeWingMotionPreview(raw);
  if (normalized.linked) {
    return {
      linked: true,
      master: normalized.master,
      left: normalized.master,
      right: normalized.master,
    };
  }
  return {
    linked: false,
    master: normalized.master,
    left: normalizeWingMotionChannel({ ...normalized.master, ...(normalized.left || {}) }, normalized.master),
    right: normalizeWingMotionChannel({ ...normalized.master, ...(normalized.right || {}) }, normalized.master),
  };
}

export function computeObjectBounds(THREE, object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    return {
      box,
      size: new THREE.Vector3(1, 1, 1),
      center: new THREE.Vector3(),
    };
  }
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  return { box, size, center };
}

export function centerObjectAtOrigin(THREE, object) {
  const { center } = computeObjectBounds(THREE, object);
  object.position.sub(center);
  return object;
}

export function normalizeObjectToUnitSize(THREE, object, targetSize = 1.8) {
  const { size, center } = computeObjectBounds(THREE, object);
  const largestAxis = Math.max(size.x, size.y, size.z, 0.001);
  const scale = targetSize / largestAxis;
  object.scale.multiplyScalar(scale);
  object.position.sub(center.multiplyScalar(scale));
  return object;
}

function collectRenderableMeshEntries(THREE, root) {
  if (!root) return [];
  root.updateMatrixWorld(true);
  const entries = [];
  root.traverse((node) => {
    if (!node?.isMesh || node.visible === false || !node.geometry?.attributes?.position) {
      return;
    }
    const box = new THREE.Box3().setFromObject(node);
    if (box.isEmpty()) {
      return;
    }
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const diagonal = Math.max(size.length(), 0.0001);
    const vertexCount = node.geometry.attributes.position.count || 0;
    const axisProduct = Math.max(size.x, 0.001) * Math.max(size.y, 0.001) * Math.max(size.z, 0.001);
    const score = (Math.log2(vertexCount + 2) * diagonal) + (Math.cbrt(axisProduct) * 0.35);
    entries.push({
      box,
      center,
      diagonal,
      score,
      size,
      vertexCount,
    });
  });
  return entries;
}

function computeRenderableMeshBounds(THREE, root) {
  const entries = collectRenderableMeshEntries(THREE, root);
  if (!entries.length) {
    return computeObjectBounds(THREE, root);
  }

  const dominantEntry = entries.reduce((bestEntry, entry) => (
    !bestEntry || entry.score > bestEntry.score ? entry : bestEntry
  ), null);
  const minScore = dominantEntry.score * 0.2;
  const minVertexCount = Math.max(24, dominantEntry.vertexCount * 0.08);
  const minDiagonal = Math.max(0.06, dominantEntry.diagonal * 0.2);
  const selectedEntries = entries.filter((entry) => (
    entry === dominantEntry
    || entry.score >= minScore
    || entry.vertexCount >= minVertexCount
    || entry.diagonal >= minDiagonal
  ));
  const box = selectedEntries.reduce((accumulator, entry) => (
    accumulator ? accumulator.union(entry.box) : entry.box.clone()
  ), null);

  if (!box || box.isEmpty()) {
    return computeObjectBounds(THREE, root);
  }

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  return { box, size, center };
}

export function prepareSceneRootForSocketAttachment({
  THREE,
  root,
  targetSize = 1.8,
}) {
  if (!root) {
    return null;
  }
  const preparedRoot = cloneSceneGraph(root);
  const { size, center } = computeRenderableMeshBounds(THREE, preparedRoot);
  const largestAxis = Math.max(size.x, size.y, size.z, 0.001);
  const scale = targetSize / largestAxis;
  preparedRoot.scale.multiplyScalar(scale);
  preparedRoot.position.sub(center.multiplyScalar(scale));
  preparedRoot.updateMatrixWorld(true);
  return preparedRoot;
}

export async function loadGlbScene({ GLTFLoader, assetUrl }) {
  const sourceRoot = await loadGlbSceneSource({ GLTFLoader, assetUrl });
  return sourceRoot ? cloneSceneGraph(sourceRoot) : null;
}

function cloneMaterialTemplate(material) {
  if (Array.isArray(material)) {
    return material.map((entry) => entry?.clone?.() || entry);
  }
  return material?.clone?.() || material || null;
}

function getLargestMeshEntryFromObject(root) {
  if (!root) return null;
  let bestGeometry = null;
  let bestMaterial = null;
  let bestVertexCount = -1;
  root.traverse((node) => {
    if (!node?.isMesh || !node.geometry?.attributes?.position) {
      return;
    }
    const vertexCount = node.geometry.attributes.position.count || 0;
    if (vertexCount <= bestVertexCount) {
      return;
    }
    bestVertexCount = vertexCount;
    bestGeometry = node.geometry.clone();
    bestMaterial = node.material || null;
  });
  return bestGeometry
    ? { geometry: bestGeometry, material: bestMaterial }
    : null;
}

function buildGeometryFromAttributeArrays(THREE, sourceAttributes, attributeArrays) {
  const geometry = new THREE.BufferGeometry();
  Object.entries(attributeArrays).forEach(([name, values]) => {
    const source = sourceAttributes[name];
    if (!source?.array || !values?.length) {
      return;
    }
    const TypedArray = source.array.constructor || Float32Array;
    geometry.setAttribute(
      name,
      new THREE.BufferAttribute(new TypedArray(values), source.itemSize, source.normalized === true),
    );
  });
  return geometry;
}

function splitGeometryByPlane(THREE, sourceGeometry, {
  splitOffset = 0,
  trimMargin = 0,
} = {}) {
  if (!sourceGeometry?.attributes?.position) {
    return null;
  }
  const nonIndexed = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
  const position = nonIndexed.attributes.position;
  const array = position?.array;
  if (!array || array.length < 9) {
    if (nonIndexed?.dispose) nonIndexed.dispose();
    return null;
  }

  const sourceAttributes = Object.fromEntries(
    Object.entries(nonIndexed.attributes).filter(([, attribute]) => attribute?.array?.length),
  );
  const createBuckets = () => Object.fromEntries(
    Object.keys(sourceAttributes).map((name) => [name, []]),
  );
  const leftAttributes = createBuckets();
  const rightAttributes = createBuckets();

  for (let triVertex = 0; triVertex <= position.count - 3; triVertex += 3) {
    const centroidX = (
      position.getX(triVertex) +
      position.getX(triVertex + 1) +
      position.getX(triVertex + 2)
    ) / 3;
    if (Math.abs(centroidX - splitOffset) <= trimMargin) {
      continue;
    }
    const target = centroidX <= splitOffset ? leftAttributes : rightAttributes;
    Object.entries(sourceAttributes).forEach(([name, attribute]) => {
      const bucket = target[name];
      const itemSize = attribute.itemSize || 1;
      for (let vertexOffset = 0; vertexOffset < 3; vertexOffset += 1) {
        const vertexIndex = triVertex + vertexOffset;
        for (let component = 0; component < itemSize; component += 1) {
          bucket.push(attribute.array[(vertexIndex * itemSize) + component]);
        }
      }
    });
  }

  if (nonIndexed?.dispose) nonIndexed.dispose();
  if (!leftAttributes.position?.length && !rightAttributes.position?.length) {
    return null;
  }

  let leftGeometry = null;
  let rightGeometry = null;
  if (leftAttributes.position?.length) {
    leftGeometry = buildGeometryFromAttributeArrays(THREE, sourceAttributes, leftAttributes);
  }
  if (rightAttributes.position?.length) {
    rightGeometry = buildGeometryFromAttributeArrays(THREE, sourceAttributes, rightAttributes);
  }

  return { left: leftGeometry, right: rightGeometry };
}

function splitPairWingGeometry(THREE, sourceGeometry) {
  const split = splitGeometryByPlane(THREE, sourceGeometry);
  let leftGeometry = split?.left || null;
  let rightGeometry = split?.right || null;

  if (!leftGeometry && rightGeometry) {
    leftGeometry = rightGeometry.clone();
    leftGeometry.scale(-1, 1, 1);
  } else if (!rightGeometry && leftGeometry) {
    rightGeometry = leftGeometry.clone();
    rightGeometry.scale(-1, 1, 1);
  }

  return leftGeometry && rightGeometry
    ? { left: leftGeometry, right: rightGeometry }
    : null;
}

function measureGeometrySideMetrics(THREE, geometry) {
  if (!geometry?.attributes?.position) {
    return null;
  }
  const box = new THREE.Box3();
  const position = geometry.attributes.position;
  const sample = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    sample.set(position.getX(index), position.getY(index), position.getZ(index));
    box.expandByPoint(sample);
  }
  const size = new THREE.Vector3();
  box.getSize(size);
  return {
    vertexCount: position.count || 0,
    diagonal: Math.max(size.length(), 0.0001),
    width: Math.max(size.x, 0.0001),
    height: Math.max(size.y, 0.0001),
    depth: Math.max(size.z, 0.0001),
  };
}

function shouldTreatSplitAsWingPair(THREE, split) {
  const leftMetrics = measureGeometrySideMetrics(THREE, split?.left);
  const rightMetrics = measureGeometrySideMetrics(THREE, split?.right);
  if (!leftMetrics || !rightMetrics) {
    return false;
  }

  const vertexRatio = Math.min(leftMetrics.vertexCount, rightMetrics.vertexCount)
    / Math.max(leftMetrics.vertexCount, rightMetrics.vertexCount, 1);
  const diagonalRatio = Math.min(leftMetrics.diagonal, rightMetrics.diagonal)
    / Math.max(leftMetrics.diagonal, rightMetrics.diagonal, 0.0001);
  const heightRatio = Math.min(leftMetrics.height, rightMetrics.height)
    / Math.max(leftMetrics.height, rightMetrics.height, 0.0001);
  const depthRatio = Math.min(leftMetrics.depth, rightMetrics.depth)
    / Math.max(leftMetrics.depth, rightMetrics.depth, 0.0001);

  return vertexRatio >= 0.68
    && diagonalRatio >= 0.8
    && heightRatio >= 0.82
    && depthRatio >= 0.55;
}

function normalizeWingPivotFromSeam(THREE, geometry) {
  if (!geometry?.attributes?.position) {
    return;
  }
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const position = geometry.attributes.position;
  const spanX = Math.max(0.0001, bounds.max.x - bounds.min.x);
  const seamThreshold = Math.max(0.001, spanX * 0.1);

  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  let count = 0;

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    if (Math.abs(x) > seamThreshold) {
      continue;
    }
    sumX += x;
    sumY += position.getY(index);
    sumZ += position.getZ(index);
    count += 1;
  }

  if (count < 4) {
    const relaxedThreshold = Math.max(seamThreshold, spanX * 0.24);
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      if (Math.abs(x) > relaxedThreshold) {
        continue;
      }
      sumX += x;
      sumY += position.getY(index);
      sumZ += position.getZ(index);
      count += 1;
    }
  }

  if (count <= 0) {
    const center = bounds.getCenter(new THREE.Vector3());
    geometry.translate(-center.x * 0.06, -center.y * 0.18, -center.z);
    geometry.computeBoundingBox();
    return;
  }

  geometry.translate(-(sumX / count), -(sumY / count), -(sumZ / count));
  geometry.computeBoundingBox();
}

function prepareWingGeometryForSocketAttachment(THREE, sourceGeometry) {
  if (!sourceGeometry?.attributes?.position) {
    return null;
  }
  const geometry = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
  normalizeWingPivotFromSeam(THREE, geometry);
  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function createRootLocalBakedGeometry(sourceRoot, node) {
  if (!node?.geometry?.attributes?.position) {
    return null;
  }
  sourceRoot.updateMatrixWorld(true);
  node.updateWorldMatrix(true, false);
  const bakedGeometry = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
  const rootInverse = sourceRoot.matrixWorld.clone().invert();
  const bakedMatrix = rootInverse.multiply(node.matrixWorld.clone());
  bakedGeometry.applyMatrix4(bakedMatrix);
  if (!bakedGeometry.attributes.normal) {
    bakedGeometry.computeVertexNormals();
  }
  bakedGeometry.computeBoundingBox();
  bakedGeometry.computeBoundingSphere();
  return bakedGeometry;
}

function cloneMaterialForMesh(THREE, materialTemplate) {
  const sourceMaterial = Array.isArray(materialTemplate)
    ? (materialTemplate[0] || null)
    : materialTemplate;
  const cloned = sourceMaterial?.clone?.() || sourceMaterial || null;
  if (!cloned) {
    return null;
  }
  cloned.side = THREE.DoubleSide;
  if ('shadowSide' in cloned) {
    cloned.shadowSide = THREE.DoubleSide;
  }
  cloned.needsUpdate = true;
  return cloned;
}

function createSafePreviewDisplayMaterial(THREE, material) {
  if (!material) {
    return material;
  }

  if (material.isPointsMaterial || material.isLineBasicMaterial || material.isLineDashedMaterial) {
    const cloned = material.clone?.() || material;
    if (cloned.color?.isColor) {
      cloned.color = cloned.color.clone();
    }
    cloned.transparent = material.transparent === true || (Number.isFinite(material.opacity) && material.opacity < 1);
    if (Number.isFinite(material.opacity)) {
      cloned.opacity = material.opacity;
    }
    cloned.depthWrite = material.depthWrite !== false;
    cloned.depthTest = material.depthTest !== false;
    return cloned;
  }

  const previewColor = material.color?.isColor
    ? material.color.clone()
    : new THREE.Color(0xffffff);
  const sourceEmissive = material.emissive?.isColor
    ? material.emissive.clone()
    : new THREE.Color(0x000000);
  const emissiveStrength = (
    (sourceEmissive.r * sourceEmissive.r) +
    (sourceEmissive.g * sourceEmissive.g) +
    (sourceEmissive.b * sourceEmissive.b)
  );
  const previewEmissive = emissiveStrength > 0.0002
    ? sourceEmissive
    : new THREE.Color(0x000000);
  const previewOpacity = Number.isFinite(material.opacity) ? material.opacity : 1;
  const previewTransparent = material.transparent === true || previewOpacity < 1 || (material.alphaTest || 0) > 0;

  const previewMaterial = new THREE.MeshStandardMaterial({
    name: material.name ? `${material.name}__preview` : 'preview-material',
    color: previewColor,
    map: material.map || null,
    alphaMap: material.alphaMap || null,
    aoMap: material.aoMap || null,
    emissiveMap: material.emissiveMap || null,
    lightMap: material.lightMap || null,
    metalnessMap: material.metalnessMap || null,
    roughnessMap: material.roughnessMap || null,
    opacity: previewOpacity,
    transparent: previewTransparent,
    alphaTest: material.alphaTest || 0,
    side: THREE.DoubleSide,
    depthWrite: material.depthWrite !== false,
    depthTest: material.depthTest !== false,
    colorWrite: true,
    metalness: Number.isFinite(material.metalness) ? Math.min(material.metalness, 0.16) : 0.08,
    roughness: Number.isFinite(material.roughness) ? Math.min(Math.max(material.roughness, 0.32), 0.72) : 0.56,
    emissive: previewEmissive,
    emissiveIntensity: Number.isFinite(material.emissiveIntensity) ? material.emissiveIntensity : 0,
    fog: material.fog !== false,
    vertexColors: material.vertexColors === true,
    wireframe: material.wireframe === true,
  });

  if (previewMaterial.map) {
    previewMaterial.map.needsUpdate = true;
  }
  if (previewMaterial.emissiveMap) {
    previewMaterial.emissiveMap.needsUpdate = true;
  }
  if (previewMaterial.lightMap) {
    previewMaterial.lightMap.needsUpdate = true;
  }
  if (previewMaterial.aoMap) {
    previewMaterial.aoMapIntensity = Number.isFinite(material.aoMapIntensity) ? material.aoMapIntensity : 1;
  }
  if ('envMapIntensity' in previewMaterial) {
    previewMaterial.envMapIntensity = 0.32;
  }

  return previewMaterial;
}

function ensurePreviewDisplayGeometryRenderable(root) {
  if (!root) {
    return root;
  }
  root.traverse((node) => {
    if (!node?.isMesh || !node.geometry) {
      return;
    }
    const positionCount = Number.isFinite(node.geometry?.attributes?.position?.count)
      ? node.geometry.attributes.position.count
      : 0;
    const indexCount = Number.isFinite(node.geometry?.index?.count)
      ? node.geometry.index.count
      : 0;
    const currentDrawRangeCount = Number.isFinite(node.geometry?.drawRange?.count)
      ? node.geometry.drawRange.count
      : 0;
    if (currentDrawRangeCount > 0) {
      return;
    }
    const fallbackCount = indexCount > 0 ? indexCount : positionCount;
    if (fallbackCount > 0 && typeof node.geometry.setDrawRange === 'function') {
      node.geometry.setDrawRange(0, fallbackCount);
    }
  });
  return root;
}

function enhancePreviewDisplayMaterials(THREE, root) {
  if (!root) {
    return root;
  }
  ensurePreviewDisplayGeometryRenderable(root);
  root.traverse((node) => {
    if (!node?.isMesh && !node?.isPoints && !node?.isLine && !node?.isLineSegments && !node?.isInstancedMesh) {
      return;
    }
    const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
    const previewMaterials = sourceMaterials.map((material) => createSafePreviewDisplayMaterial(THREE, material));
    node.material = Array.isArray(node.material) ? previewMaterials : previewMaterials[0];
    node.renderOrder = Math.max(Number.isFinite(node.renderOrder) ? node.renderOrder : 0, 4);
    if ('castShadow' in node) {
      node.castShadow = false;
    }
    if ('receiveShadow' in node) {
      node.receiveShadow = false;
    }
    node.frustumCulled = false;
  });
  return root;
}

function translateWingRootChildren(root, offset) {
  if (!root || !offset) {
    return;
  }
  root.children.forEach((child) => {
    child.position.sub(offset);
  });
}

function normalizeWingRootPivotFromSeam(THREE, root, sourceSide = 'left') {
  if (!root?.children?.length) {
    return root;
  }
  root.updateMatrixWorld(true);
  const { box, center, size } = computeRenderableMeshBounds(THREE, root);
  if (!box || box.isEmpty()) {
    return root;
  }

  const seamX = sourceSide === 'right' ? box.min.x : box.max.x;
  const threshold = Math.max(0.004, size.x * 0.08);
  const sample = new THREE.Vector3();
  const pivot = new THREE.Vector3();
  let sampleCount = 0;

  root.traverse((node) => {
    const position = node?.geometry?.attributes?.position;
    if (!node?.isMesh || !position) {
      return;
    }
    for (let index = 0; index < position.count; index += 1) {
      sample.set(position.getX(index), position.getY(index), position.getZ(index));
      if (node.matrixAutoUpdate !== false) {
        sample.applyMatrix4(node.matrix);
      }
      if (Math.abs(sample.x - seamX) > threshold) {
        continue;
      }
      pivot.add(sample);
      sampleCount += 1;
    }
  });

  if (sampleCount > 0) {
    pivot.divideScalar(sampleCount);
    translateWingRootChildren(root, pivot);
    return root;
  }

  const fallbackOffset = center.clone();
  fallbackOffset.x = seamX;
  translateWingRootChildren(root, fallbackOffset);
  return root;
}

function buildIsolatedWingRootFromScene({
  THREE,
  root,
  sourceSide = 'left',
  splitOffset = 0,
  trimMargin = 0.02,
}) {
  if (!root) {
    return null;
  }

  const isolatedRoot = new THREE.Group();
  const wantedSide = sourceSide === 'right' ? 'right' : 'left';
  let contributedMeshCount = 0;

  root.updateMatrixWorld(true);
  root.traverse((node) => {
    if (!node?.isMesh || node.visible === false || !node.geometry?.attributes?.position) {
      return;
    }

    const bakedGeometry = createRootLocalBakedGeometry(root, node);
    if (!bakedGeometry?.attributes?.position) {
      return;
    }

    bakedGeometry.computeBoundingBox();
    const bounds = bakedGeometry.boundingBox;
    const isWholeLeft = bounds.max.x <= splitOffset - trimMargin;
    const isWholeRight = bounds.min.x >= splitOffset + trimMargin;
    let geometryForSide = null;

    if (wantedSide === 'left' && isWholeLeft) {
      geometryForSide = bakedGeometry;
    } else if (wantedSide === 'right' && isWholeRight) {
      geometryForSide = bakedGeometry;
    } else if (wantedSide === 'left' && isWholeRight) {
      bakedGeometry.dispose?.();
      return;
    } else if (wantedSide === 'right' && isWholeLeft) {
      bakedGeometry.dispose?.();
      return;
    } else {
      const split = splitGeometryByPlane(THREE, bakedGeometry, { splitOffset, trimMargin });
      bakedGeometry.dispose?.();
      geometryForSide = wantedSide === 'right' ? split?.right : split?.left;
    }

    if (!geometryForSide?.attributes?.position || geometryForSide.attributes.position.count < 3) {
      geometryForSide?.dispose?.();
      return;
    }

    if (!geometryForSide.attributes.normal) {
      geometryForSide.computeVertexNormals();
    }
    geometryForSide.computeBoundingBox();
    geometryForSide.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometryForSide, cloneMaterialForMesh(THREE, node.material));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    isolatedRoot.add(mesh);
    contributedMeshCount += 1;
  });

  if (!contributedMeshCount) {
    const sourceEntry = getLargestMeshEntryFromObject(root);
    const fallbackGeometry = sourceEntry?.geometry
      ? splitGeometryByPlane(THREE, sourceEntry.geometry, { splitOffset, trimMargin })?.[wantedSide]
      : null;
    const preparedGeometry = fallbackGeometry
      ? prepareWingGeometryForSocketAttachment(THREE, fallbackGeometry)
      : null;
    if (!preparedGeometry) {
      return null;
    }
    const mesh = new THREE.Mesh(preparedGeometry, cloneMaterialForMesh(THREE, sourceEntry.material));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    isolatedRoot.add(mesh);
  }

  normalizeWingRootPivotFromSeam(THREE, isolatedRoot, wantedSide);
  isolatedRoot.updateMatrixWorld(true);
  return isolatedRoot;
}

export function buildWingAuthoringTemplateState({
  THREE,
  sourceRoot = null,
  sourcePair = null,
  authoring = null,
}) {
  const normalizedAuthoring = normalizeWingAuthoringPreview(authoring);
  const hasSourcePair = Boolean(sourcePair?.left && sourcePair?.right);
  if (normalizedAuthoring.mode !== 'isolatedHalf') {
    return {
      draftTemplateRoot: sourceRoot || null,
      draftTemplatePair: hasSourcePair ? { left: sourcePair.left, right: sourcePair.right } : null,
      sourceKind: hasSourcePair ? 'pair' : sourceRoot ? 'root' : 'empty',
      authoring: normalizedAuthoring,
      failed: false,
    };
  }

  if (hasSourcePair) {
    const isolatedSource = normalizedAuthoring.sourceSide === 'right' ? sourcePair.right : sourcePair.left;
    const mirroredPair = normalizedAuthoring.mirrorToBoth
      ? buildMirroredWingPairFromIsolatedSource(isolatedSource, normalizedAuthoring.sourceSide)
      : null;
    return {
      draftTemplateRoot: mirroredPair ? null : isolatedSource || null,
      draftTemplatePair: mirroredPair,
      sourceKind: 'pair',
      authoring: normalizedAuthoring,
      failed: normalizedAuthoring.mirrorToBoth ? !mirroredPair : !isolatedSource,
    };
  }

  if (!sourceRoot) {
    return {
      draftTemplateRoot: null,
      draftTemplatePair: null,
      sourceKind: 'empty',
      authoring: normalizedAuthoring,
      failed: true,
    };
  }

  const isolatedRoot = buildIsolatedWingRootFromScene({
    THREE,
    root: sourceRoot,
    sourceSide: normalizedAuthoring.sourceSide,
    splitOffset: normalizedAuthoring.splitOffset,
    trimMargin: normalizedAuthoring.trimMargin,
  });

  if (normalizedAuthoring.mirrorToBoth && isolatedRoot) {
    const mirroredPair = buildMirroredWingPairFromIsolatedSource(isolatedRoot, normalizedAuthoring.sourceSide);
    return {
      draftTemplateRoot: null,
      draftTemplatePair: mirroredPair,
      sourceKind: 'root',
      authoring: normalizedAuthoring,
      failed: !mirroredPair,
    };
  }

  return {
    draftTemplateRoot: isolatedRoot || sourceRoot,
    draftTemplatePair: null,
    sourceKind: 'root',
    authoring: normalizedAuthoring,
    failed: !isolatedRoot,
  };
}

function createWingTemplateRootFromGeometry(THREE, geometry, materialTemplate) {
  if (!geometry || !materialTemplate) {
    return null;
  }

  const mesh = new THREE.Mesh(geometry, cloneMaterialForMesh(THREE, materialTemplate));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;

  const templateRoot = new THREE.Group();
  templateRoot.add(mesh);
  return templateRoot;
}

function buildWingTemplateStateFromScene(THREE, sceneRoot) {
  if (!sceneRoot) {
    return {
      sourceTemplateRoot: null,
      sourceTemplatePair: null,
    };
  }

  const sourceEntry = getLargestMeshEntryFromObject(sceneRoot);
  if (!sourceEntry?.geometry) {
    return {
      sourceTemplateRoot: cloneSceneGraph(sceneRoot),
      sourceTemplatePair: null,
    };
  }

  const split = splitPairWingGeometry(THREE, sourceEntry.geometry);
  const hasBalancedPair = shouldTreatSplitAsWingPair(THREE, split);
  const materialTemplate = cloneMaterialTemplate(sourceEntry.material);
  if (!materialTemplate) {
    return {
      sourceTemplateRoot: cloneSceneGraph(sceneRoot),
      sourceTemplatePair: null,
    };
  }

  const leftGeometry = hasBalancedPair && split?.left
    ? prepareWingGeometryForSocketAttachment(THREE, split.left)
    : prepareWingGeometryForSocketAttachment(THREE, sourceEntry.geometry);
  const rightGeometry = hasBalancedPair && split?.right
    ? prepareWingGeometryForSocketAttachment(THREE, split.right)
    : null;

  const leftRoot = createWingTemplateRootFromGeometry(THREE, leftGeometry, materialTemplate);
  const rightRoot = createWingTemplateRootFromGeometry(THREE, rightGeometry, materialTemplate);

  if (leftRoot && rightRoot) {
    return {
      sourceTemplateRoot: null,
      sourceTemplatePair: {
        left: leftRoot,
        right: rightRoot,
      },
    };
  }

  return {
    sourceTemplateRoot: leftRoot || cloneSceneGraph(sceneRoot),
    sourceTemplatePair: null,
  };
}

export async function loadWingTemplateState({ GLTFLoader, THREE, assetUrl }) {
  const sceneRoot = await loadGlbScene({ GLTFLoader, assetUrl });
  return buildWingTemplateStateFromScene(THREE, sceneRoot);
}

export async function loadWingTemplateRoot({ GLTFLoader, THREE, assetUrl }) {
  const templateState = await loadWingTemplateState({ GLTFLoader, THREE, assetUrl });
  return templateState.sourceTemplateRoot || templateState.sourceTemplatePair?.left || null;
}

function buildPreviewGroup({ THREE, templateRoot, templatePair = null, attachment, mirrorMode }) {
  const previewRoot = new THREE.Group();
  const previewContent = new THREE.Group();
  previewRoot.add(previewContent);
  previewRoot.userData.previewContent = previewContent;
  if (mirrorMode === 'paired') {
    const left = new THREE.Group();
    const right = new THREE.Group();
    applyAttachmentTransform(left, buildMirroredAttachmentTransform(attachment, -1));
    applyAttachmentTransform(right, buildMirroredAttachmentTransform(attachment, 1));
    const leftModel = templatePair?.left
      ? cloneSceneGraph(templatePair.left)
      : templateRoot
        ? cloneSceneGraph(templateRoot)
        : null;
    const rightModel = templatePair?.right
      ? cloneSceneGraph(templatePair.right)
      : templateRoot
        ? cloneSceneGraph(templateRoot)
        : null;
    if (!leftModel || !rightModel) {
      return previewRoot;
    }
    if (!templatePair) {
      rightModel.scale.x *= -1;
    }
    left.add(leftModel);
    right.add(rightModel);
    previewContent.add(left);
    previewContent.add(right);
    previewRoot.userData.left = left;
    previewRoot.userData.right = right;
  } else {
    const pivot = new THREE.Group();
    applyAttachmentTransform(pivot, attachment);
    pivot.add(cloneSceneGraph(templateRoot));
    previewContent.add(pivot);
    previewRoot.userData.anchor = pivot;
  }
  enhancePreviewDisplayMaterials(THREE, previewContent);
  return previewRoot;
}

export function createRuntimeGlbPropFactory({
  THREE,
  GLTFLoader,
  slotAnchors,
  label,
  assetUrl,
  slotKey,
  attachment,
  preview = null,
}) {
  const mirrorMode = attachment?.mirrorMode === 'paired' ? 'paired' : 'single';
  const wingAuthoringPreview = slotKey === 'wingSet'
    ? normalizeWingAuthoringPreview(preview?.wingAuthoring, { defaultMirrorToBoth: mirrorMode === 'paired' })
    : DEFAULT_WING_AUTHORING_PREVIEW;
  const effectiveMirrorMode = slotKey === 'wingSet' && wingAuthoringPreview.mode === 'isolatedHalf'
    ? (wingAuthoringPreview.mirrorToBoth ? 'paired' : 'single')
    : mirrorMode;
  const singleWingSide = wingAuthoringPreview.sourceSide === 'right'
    ? 'right'
    : 'left';
  const shouldUseWingTemplate = effectiveMirrorMode === 'paired'
    && slotKey === 'wingSet'
    && wingAuthoringPreview.mode !== 'isolatedHalf';
  const loadState = {
    promise: null,
    sourceTemplateRoot: null,
    sourceTemplatePair: null,
    presentedTemplateRoot: null,
    presentedTemplatePair: null,
    previewSceneRoot: null,
  };

  const ensureSourceTemplateState = async () => {
    if (loadState.sourceTemplateRoot || loadState.sourceTemplatePair) {
      return {
        sourceTemplateRoot: loadState.sourceTemplateRoot,
        sourceTemplatePair: loadState.sourceTemplatePair,
      };
    }
    if (!loadState.promise) {
      loadState.promise = (
        shouldUseWingTemplate
          ? loadWingTemplateState({ GLTFLoader, THREE, assetUrl })
          : loadGlbScene({ GLTFLoader, assetUrl }).then((sceneRoot) => {
            if (!sceneRoot) {
              throw new Error(`${label} did not contain a scene root.`);
            }
            const templateRoot = cloneSceneGraph(sceneRoot);
            centerObjectAtOrigin(THREE, templateRoot);
            return {
              sourceTemplateRoot: templateRoot,
              sourceTemplatePair: null,
            };
          })
      ).then((templateState) => {
        if (!templateState?.sourceTemplateRoot && !templateState?.sourceTemplatePair) {
          throw new Error(`${label} could not prepare a runtime template.`);
        }
        loadState.sourceTemplateRoot = templateState.sourceTemplateRoot || null;
        loadState.sourceTemplatePair = templateState.sourceTemplatePair || null;
        return {
          sourceTemplateRoot: loadState.sourceTemplateRoot,
          sourceTemplatePair: loadState.sourceTemplatePair,
        };
      });
    }
    return loadState.promise;
  };

  const ensurePresentedTemplateState = async () => {
    const sourceTemplateState = await ensureSourceTemplateState();
    const sourceTemplateRoot = sourceTemplateState?.sourceTemplateRoot || null;
    const sourceTemplatePair = sourceTemplateState?.sourceTemplatePair || null;
    if (slotKey !== 'wingSet') {
      loadState.presentedTemplateRoot = sourceTemplateRoot;
      loadState.presentedTemplatePair = null;
      return {
        draftTemplateRoot: loadState.presentedTemplateRoot,
        draftTemplatePair: null,
      };
    }
    const authoredTemplateState = buildWingAuthoringTemplateState({
      THREE,
      sourceRoot: sourceTemplateRoot,
      sourcePair: sourceTemplatePair,
      authoring: wingAuthoringPreview,
    });
    loadState.presentedTemplateRoot = authoredTemplateState?.draftTemplateRoot || sourceTemplateRoot;
    loadState.presentedTemplatePair = authoredTemplateState?.draftTemplatePair || sourceTemplatePair || null;
    return {
      draftTemplateRoot: loadState.presentedTemplateRoot,
      draftTemplatePair: loadState.presentedTemplatePair,
    };
  };

  const shouldUseRawPreviewScene = slotKey !== 'wingSet'
    || (
      slotKey === 'wingSet'
      && wingAuthoringPreview.mode !== 'isolatedHalf'
      && effectiveMirrorMode === 'paired'
    );

  const ensurePreviewSceneRoot = async () => {
    if (loadState.previewSceneRoot) {
      return loadState.previewSceneRoot;
    }
    const sceneRoot = await loadGlbScene({ GLTFLoader, assetUrl });
    if (!sceneRoot) {
      throw new Error(`${label} did not contain a previewable scene root.`);
    }
    const previewSceneRoot = cloneSceneGraph(sceneRoot);
    centerObjectAtOrigin(THREE, previewSceneRoot);
    enhancePreviewDisplayMaterials(THREE, previewSceneRoot);
    previewSceneRoot.updateMatrixWorld(true);
    loadState.previewSceneRoot = previewSceneRoot;
    return loadState.previewSceneRoot;
  };

  return function makeRuntimeGlbProp() {
    const group = new THREE.Group();
    const slotAnchor = slotAnchors[slotKey];

    if (effectiveMirrorMode === 'paired' && slotAnchor?.left && slotAnchor?.right) {
      const leftPivot = new THREE.Group();
      const rightPivot = new THREE.Group();
      applyAttachmentTransform(leftPivot, buildMirroredAttachmentTransform(attachment, -1));
      applyAttachmentTransform(rightPivot, buildMirroredAttachmentTransform(attachment, 1));
      slotAnchor.left.add(leftPivot);
      slotAnchor.right.add(rightPivot);
      group.userData.left = leftPivot;
      group.userData.right = rightPivot;
      group.userData.ensureEquippedReady = async () => {
        const templateState = await ensurePresentedTemplateState();
        const templatePair = templateState?.draftTemplatePair;
        const templateRoot = templateState?.draftTemplateRoot;
        if (leftPivot.userData.loaded && rightPivot.userData.loaded) return;
        leftPivot.clear();
        rightPivot.clear();
        const leftModel = templatePair?.left
          ? cloneSceneGraph(templatePair.left)
          : templateRoot
            ? cloneSceneGraph(templateRoot)
            : null;
        const rightModel = templatePair?.right
          ? cloneSceneGraph(templatePair.right)
          : templateRoot
            ? cloneSceneGraph(templateRoot)
            : null;
        if (!leftModel || !rightModel) return;
        if (!templatePair) {
          rightModel.scale.x *= -1;
        }
        leftPivot.add(leftModel);
        rightPivot.add(rightModel);
        leftPivot.userData.loaded = true;
        rightPivot.userData.loaded = true;
      };
    } else if (slotKey === 'wingSet' && slotAnchor?.left && slotAnchor?.right) {
      const pivot = new THREE.Group();
      applyAttachmentTransform(pivot, buildSingleWingAttachmentTransform(attachment, singleWingSide));
      const activeAnchor = singleWingSide === 'right' ? slotAnchor.right : slotAnchor.left;
      activeAnchor.add(pivot);
      group.userData.anchor = pivot;
      group.userData.side = singleWingSide;
      group.userData.ensureEquippedReady = async () => {
        const templateState = await ensurePresentedTemplateState();
        const templateRoot = templateState?.draftTemplateRoot;
        if (pivot.userData.loaded || !templateRoot) return;
        pivot.clear();
        pivot.add(cloneSceneGraph(templateRoot));
        pivot.userData.loaded = true;
      };
    } else if (slotAnchor?.anchor) {
      const pivot = new THREE.Group();
      applyAttachmentTransform(pivot, attachment);
      slotAnchor.anchor.add(pivot);
      group.userData.anchor = pivot;
      group.userData.ensureEquippedReady = async () => {
        const templateState = await ensurePresentedTemplateState();
        const templateRoot = templateState?.draftTemplateRoot;
        if (pivot.userData.loaded) return;
        pivot.clear();
        pivot.add(cloneSceneGraph(templateRoot));
        pivot.userData.loaded = true;
      };
    } else {
      group.userData.ensureEquippedReady = async () => null;
    }

    group.userData.ensurePreviewReady = async () => {
      const previewTasks = [ensurePresentedTemplateState()];
      if (shouldUseRawPreviewScene) {
        previewTasks.push(ensurePreviewSceneRoot());
      }
      const [presentedTemplateState] = await Promise.all(previewTasks);
      return presentedTemplateState;
    };
    group.userData.createPreviewObject = () => {
      if (shouldUseRawPreviewScene && loadState.previewSceneRoot) {
        const previewWrapper = new THREE.Group();
        const previewContent = cloneSceneGraph(loadState.previewSceneRoot);
        previewWrapper.add(previewContent);
        previewWrapper.userData.previewContent = previewContent;
        return previewWrapper;
      }
      return (loadState.presentedTemplateRoot || loadState.presentedTemplatePair)
        ? buildPreviewGroup({
          THREE,
          templateRoot: loadState.presentedTemplateRoot,
          templatePair: loadState.presentedTemplatePair,
          attachment,
          mirrorMode: effectiveMirrorMode,
        })
        : null;
    };
    return group;
  };
}
