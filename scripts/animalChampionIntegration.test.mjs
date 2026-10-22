import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { scienceContent } from '../src/data/content/science.ts';
import { build } from 'esbuild';

const registryBundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/data/moduleRegistry.ts', import.meta.url))],
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
  define: { 'import.meta.env': '{"BASE_URL":"/","DEV":false}' },
});
const { BASE_MODULES, isSinglePlayerGameModule, isMultiplayerGameModule, isAppPointsEnabledModule } =
  await import(`data:text/javascript;base64,${Buffer.from(registryBundle.outputFiles[0].text).toString('base64')}`);

const animalChampionEntry = {
  id: 'animal-champion',
  title: 'Animal Champion',
  description: 'Identify 75 animals in fast visual challenge rounds.',
  type: 'game',
  playerMode: 'single',
  appPointsEnabled: true,
  category: 'science',
  subjects: ['Animals', 'Wildlife', 'Visual Recognition'],
  gradeLevels: ['All'],
  customHtmlPath: '/Games/Animal Champion/index.html',
  thumbnail: '/assets/thumbnails/optimized/animal-champion-128.webp',
  dateAdded: '2026-08-18',
};

const readRouteDefinitions = async () => {
  const sourceUrl = new URL('../src/App.tsx', import.meta.url);
  const sourceText = await readFile(sourceUrl, 'utf8');
  const sourceFile = ts.createSourceFile(
    fileURLToPath(sourceUrl),
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const routes = [];

  const visit = (node) => {
    const openingElement = ts.isJsxSelfClosingElement(node)
      ? node
      : ts.isJsxElement(node)
        ? node.openingElement
        : null;
    if (openingElement && openingElement.tagName.getText(sourceFile) === 'Route') {
      const pathAttribute = openingElement.attributes.properties.find((property) => (
        ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'path'
      ));
      const elementAttribute = openingElement.attributes.properties.find((property) => (
        ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'element'
      ));
      if (
        pathAttribute
        && ts.isJsxAttribute(pathAttribute)
        && pathAttribute.initializer
        && ts.isStringLiteral(pathAttribute.initializer)
      ) {
        routes.push({
          path: pathAttribute.initializer.text,
          element: elementAttribute?.initializer?.getText(sourceFile) ?? '',
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return routes;
};

test('Animal Champion is one exact science source-catalog game', () => {
  const matches = scienceContent.filter(({ id }) => id === 'animal-champion');

  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0], animalChampionEntry);
});

test('Animal Champion is classified once as single-player and never as multiplayer', () => {
  const matches = BASE_MODULES.filter(item => item.id === 'animal-champion');
  assert.equal(matches.length, 1);
  assert.equal(isSinglePlayerGameModule(matches[0]), true);
  assert.equal(isMultiplayerGameModule(matches[0]), false);
});

test('Animal Champion points follow the registered game metadata', () => {
  const item = BASE_MODULES.find(item => item.id === 'animal-champion');
  assert.equal(isAppPointsEnabledModule(item), true);
  assert.equal(isAppPointsEnabledModule({ ...item, appPointsEnabled: false }), false);
});

test('runtime metadata preserves every existing single-player points game', () => {
  for (const id of ['MathPuzzle', 'preschool-fun-game', 'word-puzzle-game', 'math-1768955732393-game', 'math-quiz-it-polygon', 'math-car-king', 'math-analog-clock-game-v2', 'math-farmers-market-frenzy', 'states-champion', 'many-birds-one-stone', 'animal-champion', 'defender-champion']) {
    const item = BASE_MODULES.find(item => item.id === id);
    assert.equal(isSinglePlayerGameModule(item), true, `${id} stays single-player`);
    assert.equal(isAppPointsEnabledModule(item), true, `${id} keeps app points`);
  }
});

test('Animal Champion uses the generic game route without a special React route', async () => {
  const routes = await readRouteDefinitions();
  const genericPlayRoute = routes.find(({ path: routePath }) => routePath === 'play/:id');

  assert.ok(genericPlayRoute, 'expected the generic play/:id route');
  assert.match(genericPlayRoute.element, /\bGamePlayer\b/);
  assert.equal(routes.some(({ path: routePath }) => routePath.includes('animal-champion')), false);
});
