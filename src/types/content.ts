
export type ContentType = 'worksheet' | 'game' | 'tool' | 'resource';

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

  // Metadata
  tags?: string[];
  isFeatured?: boolean;
  dateAdded: string;
}

export interface CategoryDef {
  id: string;
  label: string;
  description?: string;
  icon?: string;
}
