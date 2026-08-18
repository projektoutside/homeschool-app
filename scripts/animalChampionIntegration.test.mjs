import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { scienceContent } from '../src/data/content/science.ts';
import { isSinglePlayerPointsGameId } from '../src/utils/gamePoints.ts';

const animalChampionEntry = {
  id: 'animal-champion',
  title: 'Animal Champion',
  description: 'Identify 50 animals in fast visual challenge rounds.',
  type: 'game',
  category: 'science',
  subjects: ['Animals', 'Wildlife', 'Visual Recognition'],
  gradeLevels: ['All'],
  customHtmlPath: '/Games/Animal Champion/index.html',
  thumbnail: '/assets/thumbnails/optimized/animal-champion-128.webp',
  dateAdded: '2026-08-18',
};

const readStringSetMembers = async (sourceUrl, variableName) => {
  const sourceText = await readFile(sourceUrl, 'utf8');
  const sourceFile = ts.createSourceFile(
    fileURLToPath(sourceUrl),
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let declaration = null;

  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === variableName
    ) {
      declaration = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  assert.ok(declaration, `expected ${variableName} declaration`);
  assert.ok(ts.isNewExpression(declaration.initializer), `expected ${variableName} to be a Set`);
  const values = declaration.initializer.arguments?.[0];
  assert.ok(values && ts.isArrayLiteralExpression(values), `expected ${variableName} to use an array literal`);

  return values.elements.map((element) => {
    assert.ok(ts.isStringLiteralLike(element), `expected ${variableName} to contain string literals`);
    return element.text;
  });
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

test('Animal Champion is classified once as single-player and never as multiplayer', async () => {
  const homeUrl = new URL('../src/pages/Home.tsx', import.meta.url);
  const singlePlayerIds = await readStringSetMembers(homeUrl, 'SINGLE_PLAYER_GAME_IDS');
  const multiplayerIds = await readStringSetMembers(homeUrl, 'MULTIPLAYER_GAME_IDS');

  assert.equal(singlePlayerIds.filter((id) => id === 'animal-champion').length, 1);
  assert.equal(multiplayerIds.includes('animal-champion'), false);
});

test('Animal Champion is allowlisted once for single-player points', async () => {
  const pointIds = await readStringSetMembers(
    new URL('../src/utils/gamePoints.ts', import.meta.url),
    'SINGLE_PLAYER_POINTS_GAME_IDS',
  );

  assert.equal(pointIds.filter((id) => id === 'animal-champion').length, 1);
  assert.equal(isSinglePlayerPointsGameId('animal-champion'), true);
});

test('Animal Champion uses the generic game route without a special React route', async () => {
  const routes = await readRouteDefinitions();
  const genericPlayRoute = routes.find(({ path: routePath }) => routePath === 'play/:id');

  assert.ok(genericPlayRoute, 'expected the generic play/:id route');
  assert.match(genericPlayRoute.element, /\bGamePlayer\b/);
  assert.equal(routes.some(({ path: routePath }) => routePath.includes('animal-champion')), false);
});
