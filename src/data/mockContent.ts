import type { ContentItem } from '../types/content';
import { mathContent } from './content/math';
import { scienceContent } from './content/science';
import { toolsContent } from './content/tools';

// Combine all content arrays flatly
export const CONTENT_ITEMS: ContentItem[] = [
  ...mathContent,
  ...scienceContent,
  ...toolsContent,
];
