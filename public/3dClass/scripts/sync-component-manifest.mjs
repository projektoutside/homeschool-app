import fsNative from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(scriptFile);
const projectRoot = path.resolve(scriptsDir, "..");
const componentDir = path.join(projectRoot, "ComponentImages");
const manifestJsonPath = path.join(componentDir, "image-manifest.json");
const manifestBootstrapPath = path.join(componentDir, "image-manifest.bootstrap.js");
const distComponentDir = path.resolve(projectRoot, "..", "..", "dist", "3dClass", "ComponentImages");
const distManifestJsonPath = path.join(distComponentDir, "image-manifest.json");
const distManifestBootstrapPath = path.join(distComponentDir, "image-manifest.bootstrap.js");
const watchMode = process.argv.includes("--watch");
let lastManifestKey = "";
let debounceTimer = null;
let watcher = null;

function byNameCaseInsensitive(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

async function readComponentPngs() {
  const entries = await fs.readdir(componentDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase().endsWith(".png"))
    .sort(byNameCaseInsensitive);
  return files;
}

async function writeManifestFiles(files) {
  const jsonPayload = JSON.stringify(files, null, 2) + "\n";
  const bootstrapPayload = `window.__COMPONENT_IMAGE_MANIFEST__ = ${JSON.stringify(files, null, 2)};\n`;

  const writeTasks = [
    fs.writeFile(manifestJsonPath, jsonPayload, "utf8"),
    fs.writeFile(manifestBootstrapPath, bootstrapPayload, "utf8")
  ];

  try {
    await fs.mkdir(distComponentDir, { recursive: true });
    const distEntries = await fs.readdir(distComponentDir, { withFileTypes: true });
    const desiredFiles = new Set(files.map((name) => name.toLowerCase()));
    const syncTasks = [];

    distEntries.forEach((entry) => {
      if (!entry.isFile()) {
        return;
      }
      const lowerName = entry.name.toLowerCase();
      if (!lowerName.endsWith(".png")) {
        return;
      }
      if (!desiredFiles.has(lowerName)) {
        syncTasks.push(fs.unlink(path.join(distComponentDir, entry.name)));
      }
    });

    files.forEach((fileName) => {
      syncTasks.push(
        fs.copyFile(
          path.join(componentDir, fileName),
          path.join(distComponentDir, fileName)
        )
      );
    });

    syncTasks.push(fs.writeFile(distManifestJsonPath, jsonPayload, "utf8"));
    syncTasks.push(fs.writeFile(distManifestBootstrapPath, bootstrapPayload, "utf8"));

    writeTasks.push(Promise.all(syncTasks));
  } catch (error) {
    console.warn("Warning: could not mirror ComponentImages to dist/3dClass.", error && error.message ? error.message : error);
  }

  await Promise.all(writeTasks);
}

async function syncManifestOnce() {
  const files = await readComponentPngs();
  const manifestKey = JSON.stringify(files);
  if (manifestKey === lastManifestKey) {
    return false;
  }
  lastManifestKey = manifestKey;
  await writeManifestFiles(files);
  console.log(`Component manifest synced: ${files.length} PNG file(s).`);
  return true;
}

async function syncManifestSafe() {
  try {
    await syncManifestOnce();
  } catch (error) {
    console.error("Failed to sync component manifest.");
    console.error(error);
  }
}

function shouldIgnoreChange(fileName) {
  if (!fileName) {
    return false;
  }
  const lower = String(fileName).toLowerCase();
  return lower === "image-manifest.json" || lower === "image-manifest.bootstrap.js";
}

function scheduleSync() {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    syncManifestSafe();
  }, 120);
}

function closeWatcherAndExit(code) {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  process.exit(code);
}

function startWatchMode() {
  watcher = fsNative.watch(componentDir, { persistent: true }, (_eventType, fileName) => {
    if (shouldIgnoreChange(fileName)) {
      return;
    }
    scheduleSync();
  });

  console.log("Watching ComponentImages for PNG updates...");
  process.on("SIGINT", () => closeWatcherAndExit(0));
  process.on("SIGTERM", () => closeWatcherAndExit(0));
}

async function main() {
  await fs.mkdir(componentDir, { recursive: true });
  await syncManifestOnce();
  if (watchMode) {
    startWatchMode();
  }
}

main().catch((error) => {
  console.error("Failed to sync component manifest.");
  console.error(error);
  process.exitCode = 1;
});
