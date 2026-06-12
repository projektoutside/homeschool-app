import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptFile = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(scriptFile);
const projectRoot = path.resolve(scriptsDir, '..');
const worksheetsDir = path.join(projectRoot, 'public', 'Worksheets');
const manifestPath = path.join(worksheetsDir, 'manifest.json');
const SUBJECT_SEED_DIRS = ['math', 'ela', 'social-studies'];
const SPECIAL_LABELS = new Map([
  ['ela', 'ELA'],
  ['social-studies', 'Social Studies'],
]);

const byNameCaseInsensitive = (left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' });

const humanizeLabel = (value) => SPECIAL_LABELS.get(value.toLowerCase()) || value
  .replace(/\.html?$/i, '')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, (match) => match.toUpperCase());

const readHtmlTitle = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const match = content.match(/<title>([\s\S]*?)<\/title>/i);
    return match?.[1]?.replace(/\s+/g, ' ').trim() || null;
  } catch {
    return null;
  }
};

const toPublicPath = (...segments) => `/${segments.map((segment) => segment.replace(/\\/g, '/')).join('/')}`;

const readExistingManifest = async () => {
  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    return {
      raw,
      parsed: JSON.parse(raw),
    };
  } catch {
    return null;
  }
};

const buildFileEntry = async (subjectSlug, subjectLabel, fileName) => {
  const filePath = path.join(worksheetsDir, subjectSlug, fileName);
  const title = await readHtmlTitle(filePath);
  const slug = fileName.replace(/\.html?$/i, '');
  const publicPath = toPublicPath('Worksheets', subjectSlug, fileName);

  return {
    subjectSlug,
    subjectLabel,
    slug,
    title: title || humanizeLabel(slug),
    description: `${subjectLabel} worksheet`,
    launchPath: publicPath,
    downloadPath: publicPath,
    sourceKind: 'file',
  };
};

const buildDirectoryEntry = async (subjectSlug, subjectLabel, directoryName) => {
  const indexPath = path.join(worksheetsDir, subjectSlug, directoryName, 'index.html');
  const title = await readHtmlTitle(indexPath);
  const publicPath = toPublicPath('Worksheets', subjectSlug, directoryName, 'index.html');

  return {
    subjectSlug,
    subjectLabel,
    slug: directoryName,
    title: title || humanizeLabel(directoryName),
    description: `${subjectLabel} worksheet`,
    launchPath: publicPath,
    downloadPath: publicPath,
    sourceKind: 'directory',
  };
};

const readSubjectEntries = async (subjectSlug) => {
  const subjectLabel = humanizeLabel(subjectSlug);
  const subjectDir = path.join(worksheetsDir, subjectSlug);
  const rawEntries = await fs.readdir(subjectDir, { withFileTypes: true });
  const manifestEntries = [];

  for (const entry of rawEntries.sort((left, right) => byNameCaseInsensitive(left.name, right.name))) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    if (entry.isFile() && /\.html?$/i.test(entry.name)) {
      manifestEntries.push(await buildFileEntry(subjectSlug, subjectLabel, entry.name));
      continue;
    }

    if (!entry.isDirectory()) {
      continue;
    }

    const indexPath = path.join(subjectDir, entry.name, 'index.html');
    try {
      const stat = await fs.stat(indexPath);
      if (!stat.isFile()) {
        continue;
      }
    } catch {
      continue;
    }

    manifestEntries.push(await buildDirectoryEntry(subjectSlug, subjectLabel, entry.name));
  }

  return {
    slug: subjectSlug,
    label: subjectLabel,
    entries: manifestEntries,
  };
};

const main = async () => {
  await fs.mkdir(worksheetsDir, { recursive: true });
  await Promise.all(
    SUBJECT_SEED_DIRS.map((subjectDir) => fs.mkdir(path.join(worksheetsDir, subjectDir), { recursive: true })),
  );

  const topLevelEntries = await fs.readdir(worksheetsDir, { withFileTypes: true });
  const subjectDirs = topLevelEntries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort(byNameCaseInsensitive);

  const subjects = await Promise.all(subjectDirs.map((subjectDir) => readSubjectEntries(subjectDir)));
  const existingManifest = await readExistingManifest();
  const existingSubjects = existingManifest?.parsed?.subjects;
  const generatedAt = (
    Array.isArray(existingSubjects)
    && JSON.stringify(existingSubjects) === JSON.stringify(subjects)
    && typeof existingManifest.parsed.generatedAt === 'string'
    && existingManifest.parsed.generatedAt.trim()
  )
    ? existingManifest.parsed.generatedAt
    : new Date().toISOString();

  const manifest = {
    generatedAt,
    subjects,
  };
  const nextContent = `${JSON.stringify(manifest, null, 2)}\n`;

  if (existingManifest?.raw === nextContent) {
    console.log(`Worksheet manifest already current: ${subjects.length} subject folder(s).`);
    return;
  }

  await fs.writeFile(manifestPath, nextContent, 'utf8');
  console.log(`Worksheet manifest synced: ${subjects.length} subject folder(s).`);
};

main().catch((error) => {
  console.error('Failed to sync worksheet manifest.');
  console.error(error);
  process.exitCode = 1;
});
