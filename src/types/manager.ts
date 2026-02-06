import type { ContentItem, ContentType } from './content';

export interface ManagerTab {
  id: string;
  label: string;
  icon: string;
  sourceType?: Extract<ContentType, 'game' | 'worksheet' | 'tool'>;
}

export interface ManagerFolder {
  id: string;
  tabId: string;
  name: string;
  itemIds: string[];
}

export interface ManagerConfig {
  tabs: ManagerTab[];
  tabItems: Record<string, string[]>;
  folders: ManagerFolder[];
  itemOverrides: Record<string, Partial<ContentItem>>;
  customItems: ContentItem[];
  deletedItemIds: string[];
}
