import { mkdtemp, readdir, rename, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { optimizeGlb } from './gltf-optimize.mjs';

const ROOT_DIR = process.cwd();
const PROPS_DIR = path.join(ROOT_DIR, 'public', 'HomePageAPP', 'Images', 'PROPS');
const DRY_RUN = process.argv.includes('--check')
  || process.argv.includes('--dry-run')
  || process.env.npm_config_dry_run === 'true';
const INCLUDE_WING_CRITICAL = process.argv.includes('--include-wing-critical');

async function collectGlbFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return collectGlbFiles(entryPath);
    }
    return entry.isFile() && entry.name.toLowerCase().endsWith('.glb') ? [entryPath] : [];
  }));
  return files.flat();
}

function isWingCriticalAsset(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  return relativePath.startsWith('public/HomePageAPP/Images/PROPS/Wings/')
    || relativePath === 'public/HomePageAPP/Images/PROPS/Eferno/ComfyUI_00007_.glb';
}

export function getOptimizePlan(filePath, includeWingCritical = INCLUDE_WING_CRITICAL) {
  if (isWingCriticalAsset(filePath)) {
    return includeWingCritical
      ? { profile: 'wing-manual', optimize: true }
      : { profile: 'preserve-source', optimize: false };
  }
  return { profile: 'standard', optimize: true };
}

export async function runOptimize(inputPath, outputPath) {
  const optimizePlan = getOptimizePlan(inputPath);
  if (!optimizePlan.optimize) {
    return { skipped: true, profile: optimizePlan.profile };
  }
  await optimizeGlb(inputPath, outputPath);
  return { skipped: false, profile: optimizePlan.profile };
}

function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  const glbFiles = await collectGlbFiles(PROPS_DIR);
  if (glbFiles.length === 0) {
    console.log('No GLB files found.');
    return;
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'glb-opt-'));
  let totalBefore = 0;
  let totalAfter = 0;
  let changedCount = 0;

  try {
    for (const filePath of glbFiles) {
      const before = await stat(filePath);
      totalBefore += before.size;
      const optimizePlan = getOptimizePlan(filePath);

      if (!optimizePlan.optimize) {
        totalAfter += before.size;
        console.log(`${path.relative(ROOT_DIR, filePath)} [${optimizePlan.profile}]: skipped to protect source visual fidelity`);
        continue;
      }

      const tempOutput = path.join(tempDir, `${path.basename(filePath, '.glb')}-${Date.now()}.glb`);
      await runOptimize(filePath, tempOutput);

      const after = await stat(tempOutput);
      const nextSize = Math.min(before.size, after.size);
      totalAfter += nextSize;

      if (after.size < before.size) {
        changedCount += 1;
        const relativePath = path.relative(ROOT_DIR, filePath);
        const savedBytes = before.size - after.size;
        console.log(`${relativePath} [${optimizePlan.profile}]: ${formatMb(before.size)} -> ${formatMb(after.size)} (saved ${formatMb(savedBytes)})`);
        if (!DRY_RUN) {
          await rename(tempOutput, filePath);
        } else {
          await rm(tempOutput, { force: true });
        }
      } else {
        await rm(tempOutput, { force: true });
      }
    }

    const savedTotal = totalBefore - totalAfter;
    console.log('');
    console.log(`${DRY_RUN ? 'Dry run complete' : 'Optimization complete'}: ${changedCount}/${glbFiles.length} files reduced.`);
    console.log(`Total: ${formatMb(totalBefore)} -> ${formatMb(totalAfter)} (saved ${formatMb(savedTotal)})`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
