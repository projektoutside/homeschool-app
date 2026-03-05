#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const contentDir = path.join(repoRoot, 'src', 'data', 'content');
const publicDir = path.join(repoRoot, 'public');
const gamesDir = path.join(publicDir, 'Games');

const warnings = [];
const errors = [];

function isStringLiteral(node) {
  return ts.isStringLiteralLike(node) || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral;
}

function getPropertyKey(nameNode) {
  if (ts.isIdentifier(nameNode) || ts.isStringLiteralLike(nameNode) || ts.isNumericLiteral(nameNode)) {
    return nameNode.text;
  }
  return null;
}

function readStringProperty(objectLiteral, key) {
  for (const prop of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const propKey = getPropertyKey(prop.name);
    if (propKey !== key) continue;
    if (isStringLiteral(prop.initializer)) {
      return prop.initializer.text.trim();
    }
    return null;
  }
  return null;
}

function listContentFiles() {
  if (!fs.existsSync(contentDir)) return [];
  return fs.readdirSync(contentDir)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => path.join(contentDir, name));
}

function collectGameEntriesFromFile(filePath) {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const entries = [];

  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const type = readStringProperty(node, 'type');
      if (type === 'game') {
        entries.push({
          filePath,
          id: readStringProperty(node, 'id'),
          title: readStringProperty(node, 'title'),
          customHtmlPath: readStringProperty(node, 'customHtmlPath'),
          externalUrl: readStringProperty(node, 'externalUrl'),
          thumbnail: readStringProperty(node, 'thumbnail'),
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return entries;
}

function toPublicFilePath(urlLikePath) {
  if (!urlLikePath) return null;
  if (/^https?:\/\//i.test(urlLikePath)) return null;
  if (urlLikePath.startsWith('data:')) return null;
  const normalized = urlLikePath.startsWith('/') ? urlLikePath.slice(1) : urlLikePath;
  return path.join(publicDir, normalized);
}

function auditGameEntries(entries) {
  const byId = new Map();
  for (const entry of entries) {
    const fileLabel = path.relative(repoRoot, entry.filePath);
    const titleLabel = entry.title || '(untitled)';
    const idLabel = entry.id || '(missing-id)';

    if (!entry.id) {
      errors.push(`Missing game id in ${fileLabel} for "${titleLabel}"`);
      continue;
    }

    if (!byId.has(entry.id)) {
      byId.set(entry.id, []);
    }
    byId.get(entry.id).push(fileLabel);

    if (!entry.customHtmlPath && !entry.externalUrl) {
      errors.push(`Game "${entry.id}" in ${fileLabel} has no customHtmlPath or externalUrl`);
    }

    const htmlFilePath = toPublicFilePath(entry.customHtmlPath);
    if (htmlFilePath && !fs.existsSync(htmlFilePath)) {
      errors.push(`Missing game file for "${idLabel}" (${fileLabel}): ${path.relative(repoRoot, htmlFilePath)}`);
    }

    const thumbFilePath = toPublicFilePath(entry.thumbnail);
    if (thumbFilePath && !fs.existsSync(thumbFilePath)) {
      warnings.push(`Missing thumbnail for "${idLabel}" (${fileLabel}): ${path.relative(repoRoot, thumbFilePath)}`);
    }
  }

  for (const [id, files] of byId.entries()) {
    if (files.length > 1) {
      errors.push(`Duplicate game id "${id}" found in: ${files.join(', ')}`);
    }
  }
}

function auditGameFolders() {
  if (!fs.existsSync(gamesDir)) {
    warnings.push('public/Games directory not found');
    return;
  }

  const runtimeNoiseDirs = new Set([
    '_workspace',
    '_archive',
    'output',
    '.git_disabled',
    '.vite-temp',
  ]);

  const folders = fs.readdirSync(gamesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const shouldIgnoreRef = (refValue) => {
    if (!refValue) return true;
    if (refValue.startsWith('#')) return true;
    if (/^(?:https?:)?\/\//i.test(refValue)) return true;
    if (/^(?:data|blob|mailto|tel|javascript):/i.test(refValue)) return true;
    return false;
  };

  const normalizeRefPath = (refValue) => {
    const noHash = refValue.split('#')[0];
    const noQuery = noHash.split('?')[0];
    return noQuery.trim();
  };

  const auditIndexHtmlRefs = (folderName, folderPath, indexPath) => {
    const html = fs.readFileSync(indexPath, 'utf8');
    const refPattern = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
    const seenRefs = new Set();
    let match = refPattern.exec(html);
    while (match) {
      const rawRef = normalizeRefPath(match[1] ?? '');
      if (!rawRef || shouldIgnoreRef(rawRef) || seenRefs.has(rawRef)) {
        match = refPattern.exec(html);
        continue;
      }
      seenRefs.add(rawRef);

      const absolutePath = rawRef.startsWith('/')
        ? path.join(publicDir, rawRef.slice(1))
        : path.resolve(folderPath, rawRef);

      if (!fs.existsSync(absolutePath)) {
        errors.push(
          `Missing asset reference in public/Games/${folderName}/index.html: "${rawRef}" -> ${path.relative(repoRoot, absolutePath)}`,
        );
      }

      match = refPattern.exec(html);
    }
  };

  for (const folderName of folders) {
    const folderPath = path.join(gamesDir, folderName);
    const indexPath = path.join(folderPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      warnings.push(`Game folder missing index.html: public/Games/${folderName}`);
    } else {
      auditIndexHtmlRefs(folderName, folderPath, indexPath);
    }

    const childDirs = fs.readdirSync(folderPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => runtimeNoiseDirs.has(name));

    for (const child of childDirs) {
      warnings.push(`Legacy/runtime-noise directory in game folder: public/Games/${folderName}/${child}`);
    }
  }
}

function main() {
  const contentFiles = listContentFiles();
  const gameEntries = contentFiles.flatMap((filePath) => collectGameEntriesFromFile(filePath));
  auditGameEntries(gameEntries);
  auditGameFolders();

  console.log(`Audited ${gameEntries.length} game entries from ${contentFiles.length} content files.`);

  if (warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const error of errors) {
      console.log(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('\nGame audit passed with no blocking errors.');
}

main();
