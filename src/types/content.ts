
export type ContentType = 'worksheet' | 'game' | 'tool' | 'resource';
export type GamePlayerMode = 'single' | 'multi';

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  category: string;
  subjects: string[];
  gradeLevels: string[];
  thumbnail?: string;

  // For specific content types
  downloadUrl?: string; // For PDFs/Worksheets
  externalUrl?: string; // For embedded tools or external links
  customHtmlPath?: string; // For local HTML5 games/tools (path relative to public/)
  componentName?: string; // For internal React components (games)
  playerMode?: GamePlayerMode; // For registered game launch surfaces
  appPointsEnabled?: boolean; // Whether the game participates in the shared app points bridge

  // Metadata
  tags?: string[];
  isFeatured?: boolean;
  dateAdded: string;
}
