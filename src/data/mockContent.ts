import type { ContentItem, CategoryDef } from '../types/content';
import { mathContent } from './content/math';
import { languageContent } from './content/language';
import { scienceContent } from './content/science';
import { puzzleContent } from './content/puzzles';

export const CATEGORIES: CategoryDef[] = [
  { id: 'math', label: 'Math', description: 'Arithmetic, Geometry, and Logic' },
  { id: 'language', label: 'Language Arts', description: 'Reading, Writing, and Grammar' },
  { id: 'science', label: 'Science', description: 'Biology, Physics, and Nature' },
  { id: 'puzzles', label: 'Puzzles & Logic', description: 'Brain teasers and critical thinking' },
];

// Combine all content arrays flatly
export const CONTENT_ITEMS: ContentItem[] = [
  ...mathContent,
  ...languageContent,
  ...scienceContent,
  ...puzzleContent,
];
