import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ContentType } from '../types/content';
import type { AppAreaId, ModuleDefinition, ModuleVisibility } from '../types/appAreas';
import type { ManagerConfig, ManagerFolder } from '../types/manager';
import { APP_AREAS, BASE_MODULES, findBaseModuleById, getDefaultAreaIdForType, normalizeAreaId } from '../data/moduleRegistry';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'homeschool_manager_config_v3';
const LEGACY_STORAGE_KEY = 'homeschool_manager_config_v2';
const MANAGED_AREA_IDS: AppAreaId[] = ['games', 'classroom'];

type LegacyManagerTab = {
  id?: string;
  label?: string;
  sourceType?: ContentType;
};

type LegacyManagerFolder = {
  id?: string;
  tabId?: string;
  areaId?: AppAreaId;
  name?: string;
  itemIds?: string[];
};

type LegacyManagerConfig = Partial<ManagerConfig> & {
  tabs?: LegacyManagerTab[];
  tabItems?: Record<string, string[]>;
  folders?: LegacyManagerFolder[];
};

const buildScopedStorageKey = (baseKey: string, userId: string | null | undefined): string => {
  return userId ? `${baseKey}_${userId}` : baseKey;
};

const readStringArray = (value: unknown): string[] => {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean)
    : [];
};

const normalizeContentType = (value: unknown): ContentType => {
  if (value === 'game' || value === 'worksheet' || value === 'tool' || value === 'resource') {
    return value;
  }
  return 'tool';
};

const normalizeVisibility = (value: unknown): ModuleVisibility => {
  return value === 'hidden' ? 'hidden' : 'visible';
};

const normalizeManagedAreaId = (value: unknown, type: ContentType): AppAreaId => {
  const normalized = normalizeAreaId(value);
  if (normalized === 'games' && type === 'game') {
    return normalized;
  }
  if (normalized === 'classroom' && type !== 'game') {
    return normalized;
  }
  return getDefaultAreaIdForType(type);
};

const isManageableArea = (value: AppAreaId): boolean => {
  return value === 'games' || value === 'classroom';
};

const inferLegacyAreaId = (tabId: string | undefined, tabs: LegacyManagerTab[] = []): AppAreaId => {
  const tab = tabs.find((entry) => entry.id === tabId);
  const sourceType = normalizeContentType(tab?.sourceType);
  if (sourceType === 'game') {
    return 'games';
  }

  const normalizedId = (tabId ?? tab?.label ?? '').trim().toLowerCase();
  if (normalizedId === 'game' || normalizedId === 'games') {
    return 'games';
  }

  return 'classroom';
};

const sanitizeModule = (raw: unknown): ModuleDefinition | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const item = raw as Record<string, unknown>;
  const id = typeof item.id === 'string' ? item.id.trim() : '';
  const title = typeof item.title === 'string' ? item.title.trim() : '';
  if (!id || !title) {
    return null;
  }

  const type = normalizeContentType(item.type);
  const gradeLevels = readStringArray(item.gradeLevels);
  return {
    id,
    title,
    description: typeof item.description === 'string' ? item.description : '',
    type,
    areaId: normalizeManagedAreaId(item.areaId, type),
    visibility: normalizeVisibility(item.visibility),
    adminOnly: item.adminOnly === true,
    category: typeof item.category === 'string' ? item.category : 'custom',
    subjects: readStringArray(item.subjects),
    gradeLevels: gradeLevels.length > 0 ? gradeLevels : ['All'],
    ...(typeof item.thumbnail === 'string' && item.thumbnail.trim() ? { thumbnail: item.thumbnail.trim() } : {}),
    ...(typeof item.downloadUrl === 'string' && item.downloadUrl.trim() ? { downloadUrl: item.downloadUrl.trim() } : {}),
    ...(typeof item.externalUrl === 'string' && item.externalUrl.trim() ? { externalUrl: item.externalUrl.trim() } : {}),
    ...(typeof item.customHtmlPath === 'string' && item.customHtmlPath.trim() ? { customHtmlPath: item.customHtmlPath.trim() } : {}),
    ...(typeof item.componentName === 'string' && item.componentName.trim() ? { componentName: item.componentName.trim() } : {}),
    ...(Array.isArray(item.tags) ? { tags: readStringArray(item.tags) } : {}),
    ...(typeof item.isFeatured === 'boolean' ? { isFeatured: item.isFeatured } : {}),
    dateAdded: typeof item.dateAdded === 'string' && item.dateAdded.trim()
      ? item.dateAdded
      : new Date().toISOString().split('T')[0],
  };
};

const sanitizeOverridePatch = (raw: unknown): Partial<ModuleDefinition> | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const patch = raw as Record<string, unknown>;
  const nextPatch: Partial<ModuleDefinition> = {};

  if (typeof patch.title === 'string') nextPatch.title = patch.title;
  if (typeof patch.description === 'string') nextPatch.description = patch.description;
  if (typeof patch.category === 'string') nextPatch.category = patch.category;
  if (typeof patch.thumbnail === 'string') nextPatch.thumbnail = patch.thumbnail;
  if (typeof patch.downloadUrl === 'string') nextPatch.downloadUrl = patch.downloadUrl;
  if (typeof patch.externalUrl === 'string') nextPatch.externalUrl = patch.externalUrl;
  if (typeof patch.customHtmlPath === 'string') nextPatch.customHtmlPath = patch.customHtmlPath;
  if (typeof patch.componentName === 'string') nextPatch.componentName = patch.componentName;
  if (Array.isArray(patch.subjects)) nextPatch.subjects = readStringArray(patch.subjects);
  if (Array.isArray(patch.gradeLevels)) nextPatch.gradeLevels = readStringArray(patch.gradeLevels);
  if (Array.isArray(patch.tags)) nextPatch.tags = readStringArray(patch.tags);
  if (typeof patch.dateAdded === 'string') nextPatch.dateAdded = patch.dateAdded;
  if (typeof patch.isFeatured === 'boolean') nextPatch.isFeatured = patch.isFeatured;
  if (typeof patch.adminOnly === 'boolean') nextPatch.adminOnly = patch.adminOnly;
  if (patch.visibility === 'visible' || patch.visibility === 'hidden') nextPatch.visibility = patch.visibility;
  if (patch.type === 'game' || patch.type === 'worksheet' || patch.type === 'tool' || patch.type === 'resource') {
    nextPatch.type = patch.type;
  }

  return Object.keys(nextPatch).length > 0 ? nextPatch : null;
};

const createEmptyAreaItems = (): Record<AppAreaId, string[]> => ({
  home: [],
  games: [],
  classroom: [],
});

const buildDefaultConfig = (): ManagerConfig => {
  const areaItems = createEmptyAreaItems();

  BASE_MODULES.forEach((item) => {
    areaItems[item.areaId].push(item.id);
  });

  return {
    areaItems,
    folders: [],
    itemOverrides: {},
    customItems: [],
    deletedItemIds: [],
  };
};

const sanitizeConfig = (raw: LegacyManagerConfig): ManagerConfig => {
  const tabs = Array.isArray(raw.tabs) ? raw.tabs : [];
  const rawFolders = Array.isArray(raw.folders) ? raw.folders as LegacyManagerFolder[] : [];

  const customItems = Array.isArray(raw.customItems)
    ? raw.customItems.map(sanitizeModule).filter((item): item is ModuleDefinition => Boolean(item))
    : [];

  const deletedItemIds = readStringArray(raw.deletedItemIds)
    .filter((id) => Boolean(findBaseModuleById(id)));

  const baseItems = BASE_MODULES.filter((item) => !deletedItemIds.includes(item.id));
  const allKnownItems = [...baseItems, ...customItems];
  const validItemIds = new Set(allKnownItems.map((item) => item.id));

  const itemOverrides = Object.fromEntries(
    Object.entries(raw.itemOverrides ?? {})
      .map(([itemId, patch]) => {
        const sanitizedPatch = sanitizeOverridePatch(patch);
        return sanitizedPatch && validItemIds.has(itemId) ? [itemId, sanitizedPatch] : null;
      })
      .filter((entry): entry is [string, Partial<ModuleDefinition>] => Boolean(entry)),
  );

  const nextAreaItems = createEmptyAreaItems();
  const rawAreaItems = raw.areaItems ?? {};
  const rawLegacyTabItems = raw.tabItems ?? {};

  MANAGED_AREA_IDS.forEach((areaId) => {
    const itemIds = readStringArray((rawAreaItems as Record<string, unknown>)[areaId]);
    nextAreaItems[areaId] = itemIds.filter((itemId) => validItemIds.has(itemId));
  });

  Object.entries(rawLegacyTabItems).forEach(([tabId, itemIds]) => {
    const areaId = inferLegacyAreaId(tabId, tabs);
    nextAreaItems[areaId] = [
      ...nextAreaItems[areaId],
      ...readStringArray(itemIds).filter((itemId) => validItemIds.has(itemId)),
    ];
  });

  const folders = rawFolders
    .map((folder, index) => {
      const name = typeof folder.name === 'string' ? folder.name.trim() : '';
      if (!name) return null;

      const areaId = folder.areaId && isManageableArea(folder.areaId)
        ? folder.areaId
        : inferLegacyAreaId(folder.tabId, tabs);

      return {
        id: typeof folder.id === 'string' && folder.id.trim() ? folder.id.trim() : `folder-${index + 1}`,
        areaId,
        name,
        itemIds: readStringArray(folder.itemIds).filter((itemId) => validItemIds.has(itemId)),
      } satisfies ManagerFolder;
    })
    .filter((folder): folder is ManagerFolder => Boolean(folder));

  const seenItemIds = new Set<string>();
  MANAGED_AREA_IDS.forEach((areaId) => {
    nextAreaItems[areaId] = Array.from(
      new Set(nextAreaItems[areaId].filter((itemId) => !seenItemIds.has(itemId))),
    );
    nextAreaItems[areaId].forEach((itemId) => seenItemIds.add(itemId));
  });

  const dedupedFolders = folders.map((folder) => {
    const itemIds = folder.itemIds.filter((itemId) => {
      if (seenItemIds.has(itemId)) return false;
      seenItemIds.add(itemId);
      return true;
    });

    return {
      ...folder,
      itemIds,
    };
  });

  allKnownItems.forEach((item) => {
    if (seenItemIds.has(item.id)) return;
    const preferredAreaId = getDefaultAreaIdForType(item.type);
    nextAreaItems[preferredAreaId].push(item.id);
    seenItemIds.add(item.id);
  });

  return {
    areaItems: nextAreaItems,
    folders: dedupedFolders,
    itemOverrides,
    customItems,
    deletedItemIds,
  };
};

const parseConfig = (saved: string | null): ManagerConfig => {
  try {
    if (!saved) return buildDefaultConfig();
    return sanitizeConfig(JSON.parse(saved) as LegacyManagerConfig);
  } catch {
    return buildDefaultConfig();
  }
};

type UseManagerConfigOptions = {
  hydrateRemote?: boolean;
};

export const useManagerConfig = ({ hydrateRemote = true }: UseManagerConfigOptions = {}) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<ManagerConfig>(buildDefaultConfig);
  const [isHydratedFromStorage, setIsHydratedFromStorage] = useState(false);
  const [isHydratedFromRemote, setIsHydratedFromRemote] = useState(!hydrateRemote);

  const userScopedStorageKey = buildScopedStorageKey(STORAGE_KEY, user?.id);
  const legacyScopedStorageKey = buildScopedStorageKey(LEGACY_STORAGE_KEY, user?.id);

  useEffect(() => {
    const candidateKeys = [
      userScopedStorageKey,
      legacyScopedStorageKey,
      STORAGE_KEY,
      LEGACY_STORAGE_KEY,
    ];

    let nextConfig = buildDefaultConfig();
    for (const key of candidateKeys) {
      const saved = window.localStorage.getItem(key);
      if (!saved) continue;

      nextConfig = parseConfig(saved);
      if (key !== userScopedStorageKey) {
        window.localStorage.setItem(userScopedStorageKey, JSON.stringify(nextConfig));
      }
      break;
    }

    const frameId = window.requestAnimationFrame(() => {
      setConfig(nextConfig);
      setIsHydratedFromStorage(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [legacyScopedStorageKey, userScopedStorageKey]);

  useEffect(() => {
    if (!isHydratedFromStorage) return;
    window.localStorage.setItem(userScopedStorageKey, JSON.stringify(config));
  }, [config, isHydratedFromStorage, userScopedStorageKey]);

  useEffect(() => {
    let cancelled = false;

    const loadRemoteConfig = async () => {
      if (!hydrateRemote) {
        setIsHydratedFromRemote(true);
        return;
      }

      setIsHydratedFromRemote(false);

      if (!isHydratedFromStorage) return;

      if (!supabase || !user) {
        setIsHydratedFromRemote(true);
        return;
      }

      const { data, error } = await supabase
        .from('user_manager_configs')
        .select('config')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('[ManagerConfig] Failed to load remote config:', error.message);
        setIsHydratedFromRemote(true);
        return;
      }

      if (data?.config) {
        setConfig(sanitizeConfig(data.config as LegacyManagerConfig));
      }

      setIsHydratedFromRemote(true);
    };

    void loadRemoteConfig();

    return () => {
      cancelled = true;
    };
  }, [hydrateRemote, isHydratedFromStorage, user]);

  useEffect(() => {
    if (!hydrateRemote) return;
    if (!isHydratedFromStorage || !isHydratedFromRemote) return;
    if (!supabase || !user) return;
    const supabaseClient = supabase;

    const timeout = window.setTimeout(async () => {
      const { error } = await supabaseClient
        .from('user_manager_configs')
        .upsert(
          {
            user_id: user.id,
            config,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          },
        );

      if (error) {
        console.error('[ManagerConfig] Failed to save remote config:', error.message);
      }
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [config, hydrateRemote, isHydratedFromStorage, isHydratedFromRemote, user]);

  const areaAssignments = useMemo(() => {
    const assignments = new Map<string, AppAreaId>();

    MANAGED_AREA_IDS.forEach((areaId) => {
      (config.areaItems[areaId] ?? []).forEach((itemId) => assignments.set(itemId, areaId));
    });
    config.folders.forEach((folder) => {
      folder.itemIds.forEach((itemId) => assignments.set(itemId, folder.areaId));
    });

    return assignments;
  }, [config.areaItems, config.folders]);

  const resolvedItems = useMemo(() => {
    const map = new Map<string, ModuleDefinition>();

    [...BASE_MODULES.filter((item) => !config.deletedItemIds.includes(item.id)), ...config.customItems]
      .forEach((item) => {
        const patch = config.itemOverrides[item.id] ?? {};
        const nextType = normalizeContentType(patch.type ?? item.type);
        const effectiveAreaId = areaAssignments.get(item.id) ?? normalizeManagedAreaId(item.areaId, nextType);

        map.set(item.id, {
          ...item,
          ...patch,
          type: nextType,
          areaId: effectiveAreaId,
          visibility: normalizeVisibility(patch.visibility ?? item.visibility),
          adminOnly: typeof patch.adminOnly === 'boolean' ? patch.adminOnly : item.adminOnly,
        });
      });

    return map;
  }, [areaAssignments, config.customItems, config.deletedItemIds, config.itemOverrides]);

  const allItems = useMemo(() => Array.from(resolvedItems.values()), [resolvedItems]);

  const createFolder = useCallback((areaId: AppAreaId, name: string) => {
    if (!isManageableArea(areaId)) return;

    const folder: ManagerFolder = {
      id: `folder-${Date.now()}`,
      areaId,
      name: name.trim(),
      itemIds: [],
    };

    setConfig((prev) => ({
      ...prev,
      folders: [...prev.folders, folder],
    }));
  }, []);

  const updateFolder = useCallback((folderId: string, patch: Partial<Pick<ManagerFolder, 'name'>>) => {
    setConfig((prev) => ({
      ...prev,
      folders: prev.folders.map((folder) => (
        folder.id === folderId
          ? { ...folder, name: patch.name?.trim() || folder.name }
          : folder
      )),
    }));
  }, []);

  const deleteFolder = useCallback((folderId: string) => {
    setConfig((prev) => {
      const target = prev.folders.find((folder) => folder.id === folderId);
      if (!target) return prev;

      return {
        ...prev,
        areaItems: {
          ...prev.areaItems,
          [target.areaId]: Array.from(new Set([...(prev.areaItems[target.areaId] ?? []), ...target.itemIds])),
        },
        folders: prev.folders.filter((folder) => folder.id !== folderId),
      };
    });
  }, []);

  const assignItemToAreaRoot = useCallback((itemId: string, requestedAreaId: AppAreaId) => {
    setConfig((prev) => {
      const currentItem = resolvedItems.get(itemId) ?? findBaseModuleById(itemId);
      if (!currentItem) return prev;

      const targetAreaId = normalizeManagedAreaId(requestedAreaId, currentItem.type);
      if (targetAreaId !== requestedAreaId) {
        return prev;
      }

      const nextAreaItems: Record<AppAreaId, string[]> = {
        ...prev.areaItems,
        home: [],
        games: (prev.areaItems.games ?? []).filter((id) => id !== itemId),
        classroom: (prev.areaItems.classroom ?? []).filter((id) => id !== itemId),
      };
      nextAreaItems[targetAreaId] = [...nextAreaItems[targetAreaId], itemId];

      return {
        ...prev,
        areaItems: {
          ...nextAreaItems,
          [targetAreaId]: Array.from(new Set(nextAreaItems[targetAreaId])),
        },
        folders: prev.folders.map((folder) => ({
          ...folder,
          itemIds: folder.itemIds.filter((id) => id !== itemId),
        })),
      };
    });
  }, [resolvedItems]);

  const assignItemToFolder = useCallback((itemId: string, folderId: string) => {
    setConfig((prev) => {
      const folder = prev.folders.find((entry) => entry.id === folderId);
      const currentItem = resolvedItems.get(itemId) ?? findBaseModuleById(itemId);
      if (!folder || !currentItem) return prev;

      const targetAreaId = normalizeManagedAreaId(folder.areaId, currentItem.type);
      if (targetAreaId !== folder.areaId) {
        return prev;
      }

      return {
        ...prev,
        areaItems: {
          ...prev.areaItems,
          home: [],
          games: (prev.areaItems.games ?? []).filter((id) => id !== itemId),
          classroom: (prev.areaItems.classroom ?? []).filter((id) => id !== itemId),
        },
        folders: prev.folders.map((entry) => ({
          ...entry,
          itemIds: entry.id === folderId
            ? Array.from(new Set([...entry.itemIds.filter((id) => id !== itemId), itemId]))
            : entry.itemIds.filter((id) => id !== itemId),
        })),
      };
    });
  }, [resolvedItems]);

  const updateItemOverride = useCallback((itemId: string, patch: Partial<ModuleDefinition>) => {
    setConfig((prev) => {
      const customItemIndex = prev.customItems.findIndex((item) => item.id === itemId);
      if (customItemIndex >= 0) {
        const customItems = [...prev.customItems];
        const currentItem = customItems[customItemIndex];
        const nextType = normalizeContentType(patch.type ?? currentItem.type);
        customItems[customItemIndex] = {
          ...currentItem,
          ...patch,
          type: nextType,
          areaId: normalizeManagedAreaId(currentItem.areaId, nextType),
          visibility: normalizeVisibility(patch.visibility ?? currentItem.visibility),
        };

        return { ...prev, customItems };
      }

      return {
        ...prev,
        itemOverrides: {
          ...prev.itemOverrides,
          [itemId]: {
            ...(prev.itemOverrides[itemId] ?? {}),
            ...patch,
          },
        },
      };
    });
  }, []);

  const createItem = useCallback((input: {
    title: string;
    type: ContentType;
    customHtmlPath?: string;
    externalUrl?: string;
    category?: string;
    description?: string;
    areaId?: AppAreaId;
  }) => {
    const id = `custom-${Date.now()}`;
    const type = normalizeContentType(input.type);
    const areaId = normalizeManagedAreaId(input.areaId, type);
    const item: ModuleDefinition = {
      id,
      title: input.title.trim() || 'Untitled Item',
      description: input.description?.trim() || 'Custom item',
      type,
      areaId,
      visibility: 'visible',
      category: input.category?.trim() || 'custom',
      subjects: [],
      gradeLevels: ['All'],
      dateAdded: new Date().toISOString().split('T')[0],
      ...(input.customHtmlPath ? { customHtmlPath: input.customHtmlPath.trim() } : {}),
      ...(input.externalUrl ? { externalUrl: input.externalUrl.trim() } : {}),
    };

    setConfig((prev) => ({
      ...prev,
      customItems: [...prev.customItems, item],
      areaItems: {
        ...prev.areaItems,
        [areaId]: [...(prev.areaItems[areaId] ?? []), id],
      },
    }));

    return id;
  }, []);

  const deleteItem = useCallback((itemId: string) => {
    setConfig((prev) => {
      const isBaseItem = Boolean(findBaseModuleById(itemId));

      return {
        ...prev,
        areaItems: {
          home: [],
          games: (prev.areaItems.games ?? []).filter((id) => id !== itemId),
          classroom: (prev.areaItems.classroom ?? []).filter((id) => id !== itemId),
        },
        folders: prev.folders.map((folder) => ({
          ...folder,
          itemIds: folder.itemIds.filter((id) => id !== itemId),
        })),
        customItems: prev.customItems.filter((item) => item.id !== itemId),
        deletedItemIds: isBaseItem
          ? Array.from(new Set([...prev.deletedItemIds, itemId]))
          : prev.deletedItemIds,
        itemOverrides: Object.fromEntries(
          Object.entries(prev.itemOverrides).filter(([id]) => id !== itemId),
        ),
      };
    });
  }, []);

  const restoreBaseItem = useCallback((itemId: string) => {
    setConfig((prev) => {
      const baseItem = findBaseModuleById(itemId);
      if (!baseItem) return prev;

      const alreadyAssigned = MANAGED_AREA_IDS.some((areaId) => (prev.areaItems[areaId] ?? []).includes(itemId))
        || prev.folders.some((folder) => folder.itemIds.includes(itemId));

      if (alreadyAssigned) {
        return {
          ...prev,
          deletedItemIds: prev.deletedItemIds.filter((id) => id !== itemId),
        };
      }

      const targetAreaId = getDefaultAreaIdForType(baseItem.type);

      return {
        ...prev,
        deletedItemIds: prev.deletedItemIds.filter((id) => id !== itemId),
        areaItems: {
          ...prev.areaItems,
          [targetAreaId]: Array.from(new Set([...(prev.areaItems[targetAreaId] ?? []), itemId])),
        },
      };
    });
  }, []);

  const importConfigJson = useCallback((jsonText: string) => {
    setConfig(sanitizeConfig(JSON.parse(jsonText) as LegacyManagerConfig));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(buildDefaultConfig());
  }, []);

  return {
    areas: APP_AREAS,
    config,
    allItems,
    resolvedItems,
    createFolder,
    updateFolder,
    deleteFolder,
    assignItemToAreaRoot,
    assignItemToFolder,
    updateItemOverride,
    createItem,
    deleteItem,
    restoreBaseItem,
    importConfigJson,
    resetConfig,
  };
};
