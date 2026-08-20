import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const SUPPORTED_CONTENT_TYPES = new Set(['game', 'worksheet', 'tool', 'resource']);
const KNOWN_WORKSHEET_SUBJECTS = new Set(['math', 'ela', 'social-studies']);
const UNRESOLVED = Symbol('unresolved');
const CONTENT_FIELDS = [
  'id',
  'title',
  'description',
  'type',
  'category',
  'subjects',
  'gradeLevels',
  'thumbnail',
  'downloadUrl',
  'externalUrl',
  'customHtmlPath',
  'componentName',
  'tags',
  'isFeatured',
  'dateAdded',
];

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

const getPropertyKey = (nameNode) => {
  if (ts.isIdentifier(nameNode) || ts.isStringLiteralLike(nameNode) || ts.isNumericLiteral(nameNode)) {
    return nameNode.text;
  }
  return null;
};

const unwrapExpression = (expression) => {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
};

const collectVariableInitializers = (sourceFile) => {
  const initializers = new Map();

  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      initializers.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return initializers;
};

const evaluateExpression = (rawExpression, initializers, seenIdentifiers = new Set()) => {
  const expression = unwrapExpression(rawExpression);

  if (ts.isStringLiteralLike(expression)) return expression.text;
  if (ts.isNumericLiteral(expression)) return Number(expression.text);
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (expression.kind === ts.SyntaxKind.NullKeyword) return null;

  if (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.MinusToken) {
    const operand = evaluateExpression(expression.operand, initializers, seenIdentifiers);
    return typeof operand === 'number' ? -operand : UNRESOLVED;
  }

  if (ts.isIdentifier(expression)) {
    if (expression.text === 'undefined') return undefined;
    if (seenIdentifiers.has(expression.text)) return UNRESOLVED;
    const initializer = initializers.get(expression.text);
    if (!initializer) return UNRESOLVED;
    const nextSeen = new Set(seenIdentifiers).add(expression.text);
    return evaluateExpression(initializer, initializers, nextSeen);
  }

  if (ts.isArrayLiteralExpression(expression)) {
    const values = [];
    for (const element of expression.elements) {
      if (ts.isSpreadElement(element)) {
        const spreadValue = evaluateExpression(element.expression, initializers, seenIdentifiers);
        if (!Array.isArray(spreadValue)) return UNRESOLVED;
        values.push(...spreadValue);
        continue;
      }
      const value = evaluateExpression(element, initializers, seenIdentifiers);
      if (value === UNRESOLVED) return UNRESOLVED;
      values.push(value);
    }
    return values;
  }

  if (ts.isObjectLiteralExpression(expression)) {
    const value = {};
    for (const property of expression.properties) {
      if (ts.isSpreadAssignment(property)) {
        const spreadValue = evaluateExpression(property.expression, initializers, seenIdentifiers);
        if (spreadValue === UNRESOLVED || !spreadValue || typeof spreadValue !== 'object' || Array.isArray(spreadValue)) {
          return UNRESOLVED;
        }
        Object.assign(value, spreadValue);
        continue;
      }

      if (ts.isPropertyAssignment(property)) {
        const key = getPropertyKey(property.name);
        if (!key) return UNRESOLVED;
        const propertyValue = evaluateExpression(property.initializer, initializers, seenIdentifiers);
        if (propertyValue === UNRESOLVED) return UNRESOLVED;
        value[key] = propertyValue;
        continue;
      }

      if (ts.isShorthandPropertyAssignment(property)) {
        const propertyValue = evaluateExpression(property.name, initializers, seenIdentifiers);
        if (propertyValue === UNRESOLVED) return UNRESOLVED;
        value[property.name.text] = propertyValue;
        continue;
      }

      return UNRESOLVED;
    }
    return value;
  }

  if (
    ts.isCallExpression(expression)
    && ts.isPropertyAccessExpression(expression.expression)
    && ts.isIdentifier(expression.expression.expression)
    && expression.expression.expression.text === 'Object'
    && expression.expression.name.text === 'freeze'
    && expression.arguments.length === 1
  ) {
    return evaluateExpression(expression.arguments[0], initializers, seenIdentifiers);
  }

  return UNRESOLVED;
};

const isSharedEntryCallArgument = (node) => {
  const parent = node.parent;
  return Boolean(
    parent
    && ts.isCallExpression(parent)
    && parent.arguments[0] === node
    && ts.isIdentifier(parent.expression)
    && parent.expression.text === 'createSharedEntry',
  );
};

const normalizeWorksheetContentPath = (urlLikePath) => {
  if (!urlLikePath) return urlLikePath;
  const normalized = urlLikePath.replace(/\\/g, '/').trim();
  const leadingSlashPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
  const worksheetMatch = leadingSlashPath.match(/^\/Worksheets\/(.+)$/i);
  if (!worksheetMatch) return leadingSlashPath;

  const worksheetSuffix = worksheetMatch[1];
  const [subjectOrSlug] = worksheetSuffix.split('/');
  if (subjectOrSlug && KNOWN_WORKSHEET_SUBJECTS.has(subjectOrSlug.toLowerCase())) {
    return `/Worksheets/${worksheetSuffix}`;
  }
  return `/Worksheets/math/${worksheetSuffix}`;
};

const requireStringArray = (value, field, source) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${source}: invalid legacy content ${field}`);
  }
  return [...value];
};

const toContentItem = ({ candidate, node, initializers, filePath }) => {
  const value = { ...candidate };
  if (isSharedEntryCallArgument(node)) {
    if (value.subjects === undefined) {
      value.subjects = evaluateExpression(initializers.get('CORE_MATH_SUBJECTS'), initializers);
    }
    if (value.gradeLevels === undefined) {
      value.gradeLevels = evaluateExpression(initializers.get('ALL_GRADES'), initializers);
    }
  }

  const source = `${path.basename(filePath)}:${node.getStart()}`;
  for (const field of ['id', 'title', 'description', 'type', 'category', 'dateAdded']) {
    if (typeof value[field] !== 'string' || !value[field]) {
      throw new Error(`${source}: invalid legacy content ${field}`);
    }
  }
  if (!SUPPORTED_CONTENT_TYPES.has(value.type)) {
    throw new Error(`${source}: invalid legacy content type`);
  }
  value.subjects = requireStringArray(value.subjects, 'subjects', source);
  value.gradeLevels = requireStringArray(value.gradeLevels, 'gradeLevels', source);
  if (value.tags !== undefined) value.tags = requireStringArray(value.tags, 'tags', source);

  for (const field of ['thumbnail', 'downloadUrl', 'externalUrl', 'customHtmlPath', 'componentName']) {
    if (value[field] !== undefined && typeof value[field] !== 'string') {
      throw new Error(`${source}: invalid legacy content ${field}`);
    }
  }
  if (value.isFeatured !== undefined && typeof value.isFeatured !== 'boolean') {
    throw new Error(`${source}: invalid legacy content isFeatured`);
  }
  if (value.type === 'worksheet' && value.customHtmlPath) {
    value.customHtmlPath = normalizeWorksheetContentPath(value.customHtmlPath);
  }

  return Object.fromEntries(
    CONTENT_FIELDS
      .filter((field) => value[field] !== undefined)
      .map((field) => [field, value[field]]),
  );
};

const readEntriesFromFile = (filePath) => {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const initializers = collectVariableInitializers(sourceFile);
  const records = [];

  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const candidate = evaluateExpression(node, initializers);
      if (candidate !== UNRESOLVED && SUPPORTED_CONTENT_TYPES.has(candidate.type)) {
        records.push({
          filePath,
          item: toContentItem({ candidate, node, initializers, filePath }),
        });
        return;
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return records;
};

export const readLegacyContentRecords = ({ repoRoot }) => {
  const contentDir = path.join(repoRoot, 'src', 'data', 'content');
  if (!fs.existsSync(contentDir)) return [];

  return fs.readdirSync(contentDir)
    .filter((name) => name.endsWith('.ts'))
    .sort(compareText)
    .flatMap((name) => readEntriesFromFile(path.join(contentDir, name)));
};

export const readLegacyContentEntries = ({ repoRoot }) => (
  readLegacyContentRecords({ repoRoot }).map(({ item }) => structuredClone(item))
);
