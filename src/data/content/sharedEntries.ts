import type { ContentItem, ContentType } from '../../types/content';

const ALL_GRADES = ['All'];
const CORE_MATH_SUBJECTS = ['Addition', 'Subtraction', 'Multiplication', 'Division'];
const POLYGON_SUBJECTS = ['Geometry'];

type SharedEntryInput = Omit<ContentItem, 'type' | 'subjects' | 'gradeLevels'> & {
  type: ContentType;
  subjects?: string[];
  gradeLevels?: string[];
};

const createSharedEntry = ({
  subjects = CORE_MATH_SUBJECTS,
  gradeLevels = ALL_GRADES,
  ...entry
}: SharedEntryInput): ContentItem => ({
  ...entry,
  subjects,
  gradeLevels,
});

export const mathWorksheetCreatorClassicEntry = createSharedEntry({
  id: 'math-worksheet-creator',
  title: 'Math Worksheet Creator Classic',
  description: 'Create custom math worksheets from the legacy games workspace.',
  type: 'tool',
  category: 'math',
  customHtmlPath: '/Games/Math-Worksheet-Creator/index.html',
  thumbnail: '/assets/thumbnails/optimized/math-worksheet-creator-game-128.webp',
  dateAdded: '2024-03-01',
});

export const mathWorksheetCreatorStudioEntry = createSharedEntry({
  id: 'MathWorksheetCreator',
  title: 'Math Worksheet Creator Studio',
  description: 'Create custom math worksheets from the standalone printable workspace.',
  type: 'tool',
  category: 'math',
  customHtmlPath: '/MathWorksheetCreator/index.html',
  thumbnail: '/assets/thumbnails/optimized/math-worksheet-creator-128.webp',
  dateAdded: '2026-01-26',
});

const polygonSharedBase = Object.freeze({
  description: 'Explore polygons in the shared Polygon Fun workspace.',
  category: 'math',
  subjects: POLYGON_SUBJECTS,
  gradeLevels: ALL_GRADES,
  customHtmlPath: '/PolygonAPP/index.html',
  thumbnail: '/assets/thumbnails/optimized/polygon-app-128.webp',
  dateAdded: '2026-01-21',
});

export const polygonToolEntry = createSharedEntry({
  id: 'math-1768955732393',
  title: 'Polygon Fun Studio',
  type: 'tool',
  ...polygonSharedBase,
});

export const polygonGameEntry = createSharedEntry({
  id: 'math-1768955732393-game',
  title: 'Polygon Fun Challenge',
  type: 'game',
  playerMode: 'single',
  appPointsEnabled: true,
  ...polygonSharedBase,
});
