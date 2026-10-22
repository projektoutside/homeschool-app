import { CONTENT_ITEMS } from './mockContent';
import type { ContentItem, ContentType, GamePlayerMode } from '../types/content';
import type { AppAreaId, AreaDefinition, ModuleDefinition, ModuleLaunchTarget } from '../types/appAreas';
import { buildWorksheetViewerRoute, migrateLegacyWorksheetPath } from '../utils/worksheetRoutes';

export const APP_AREAS: AreaDefinition[] = [
  {
    id: 'home',
    label: 'Home page',
    icon: '🏠',
    route: '/',
    description: 'Persistent homepage experience and account-bound ambient systems.',
    supportsModules: false,
  },
  {
    id: 'games',
    label: 'Games',
    icon: '🎮',
    route: '/apps',
    description: 'Arcade-style learning games and game launch surfaces.',
    supportsModules: true,
  },
  {
    id: 'classroom',
    label: 'Classroom',
    icon: '🏫',
    route: '/classroom',
    description: 'Worksheets, tools, resources, and classroom-owned launch flows.',
    supportsModules: true,
  },
] as const;

export const APP_AREA_IDS = APP_AREAS.map((area) => area.id);
export const LEGACY_CLASSROOM_TAB_IDS = ['worksheet', 'worksheets', 'tool', 'tools', 'classroom', 'resource'] as const;

const normalizeContentType = (value: unknown): ContentType => {
  if (value === 'game' || value === 'worksheet' || value === 'tool' || value === 'resource') {
    return value;
  }
  return 'tool';
};

const normalizeGamePlayerMode = (
  type: ContentType,
  value: unknown,
): GamePlayerMode | undefined => {
  if (type !== 'game') {
    return undefined;
  }

  if (value === 'single' || value === 'multi') {
    return value;
  }

  return undefined;
};

export const normalizeAreaId = (value: unknown): AppAreaId | null => {
  if (value !== 'home' && value !== 'games' && value !== 'classroom') {
    return null;
  }
  return value;
};

export const getDefaultAreaIdForType = (type: ContentType): AppAreaId => {
  return type === 'game' ? 'games' : 'classroom';
};

const sanitizeBaseModule = (item: ContentItem): ModuleDefinition | null => {
  if (
    !item
    || typeof item !== 'object'
    || typeof item.id !== 'string'
    || item.id.length === 0
    || typeof item.title !== 'string'
    || typeof item.description !== 'string'
    || typeof item.category !== 'string'
    || !Array.isArray(item.subjects)
    || !Array.isArray(item.gradeLevels)
    || typeof item.dateAdded !== 'string'
  ) {
    return null;
  }

  const type = normalizeContentType(item.type);
  const playerMode = normalizeGamePlayerMode(type, item.playerMode);

  return {
    ...item,
    type,
    playerMode,
    appPointsEnabled: type === 'game' ? item.appPointsEnabled === true : false,
    areaId: getDefaultAreaIdForType(type),
    visibility: 'visible',
  };
};

export const BASE_MODULES: ModuleDefinition[] = CONTENT_ITEMS
  .map(sanitizeBaseModule)
  .filter((item): item is ModuleDefinition => Boolean(item));

export const BASE_MODULE_MAP = new Map(BASE_MODULES.map((item) => [item.id, item] as const));

export const findBaseModuleById = (id: string | null | undefined): ModuleDefinition | null => {
  if (!id) return null;
  return BASE_MODULE_MAP.get(id) ?? null;
};

export const isLegacyClassroomTabRequest = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (LEGACY_CLASSROOM_TAB_IDS as readonly string[]).includes(normalized);
};

export const resolveAreaRoute = (areaId: AppAreaId): string => {
  return APP_AREAS.find((area) => area.id === areaId)?.route ?? '/';
};

export const resolveAreaFromRequest = (value: unknown): AppAreaId | null => {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'home' || normalized === 'homepage') return 'home';
  if (normalized === 'game' || normalized === 'games') return 'games';
  if (isLegacyClassroomTabRequest(normalized)) return 'classroom';
  return null;
};

export const isSinglePlayerGameModule = (
  item: Pick<ContentItem, 'type' | 'playerMode'> | null | undefined,
): boolean => {
  return item?.type === 'game' && item.playerMode === 'single';
};

export const isMultiplayerGameModule = (
  item: Pick<ContentItem, 'type' | 'playerMode'> | null | undefined,
): boolean => {
  return item?.type === 'game' && item.playerMode === 'multi';
};

export const isAppPointsEnabledModule = (
  item: Pick<ContentItem, 'type' | 'appPointsEnabled'> | null | undefined,
): boolean => {
  return item?.type === 'game' && item.appPointsEnabled === true;
};

export const resolveModuleLaunchTarget = (
  item: Pick<ModuleDefinition, 'id' | 'type' | 'customHtmlPath' | 'externalUrl'>,
): ModuleLaunchTarget => {
  if (item.externalUrl && item.type !== 'game' && !item.customHtmlPath) {
    return { kind: 'external', path: item.externalUrl };
  }

  if (item.type === 'game') {
    return { kind: 'play', path: `/play/${item.id}` };
  }

  if (item.type === 'worksheet') {
    return {
      kind: 'open',
      path: buildWorksheetViewerRoute({
        path: migrateLegacyWorksheetPath(item.customHtmlPath),
        screen: item.customHtmlPath ? 'viewer' : 'open',
      }),
    };
  }

  if (item.type === 'tool') {
    return { kind: 'open', path: `/open/${item.id}` };
  }

  return { kind: 'resource', path: `/resource/${item.id}` };
};
