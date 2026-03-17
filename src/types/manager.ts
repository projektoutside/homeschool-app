import type { AppAreaId, ModuleDefinition } from './appAreas';

export interface ManagerFolder {
  id: string;
  areaId: AppAreaId;
  name: string;
  itemIds: string[];
}

export interface ManagerConfig {
  areaItems: Record<AppAreaId, string[]>;
  folders: ManagerFolder[];
  itemOverrides: Record<string, Partial<ModuleDefinition>>;
  customItems: ModuleDefinition[];
  deletedItemIds: string[];
}
