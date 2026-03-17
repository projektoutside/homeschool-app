import type { ContentItem } from './content';

export type AppAreaId = 'home' | 'games' | 'classroom';

export interface AreaDefinition {
  id: AppAreaId;
  label: string;
  icon: string;
  route: string;
  description: string;
  supportsModules: boolean;
}

export type ModuleVisibility = 'visible' | 'hidden';

export type ModuleLaunchTarget =
  | { kind: 'play'; path: string }
  | { kind: 'open'; path: string }
  | { kind: 'resource'; path: string }
  | { kind: 'external'; path: string };

export interface ModuleDefinition extends ContentItem {
  areaId: AppAreaId;
  visibility: ModuleVisibility;
  adminOnly?: boolean;
}
