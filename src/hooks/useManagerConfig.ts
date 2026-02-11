import { useCallback, useEffect, useMemo, useState } from 'react';
import { CONTENT_ITEMS } from '../data/mockContent';
import type { ContentItem, ContentType } from '../types/content';
import type { ManagerConfig, ManagerFolder, ManagerTab } from '../types/manager';

const STORAGE_KEY = 'homeschool_manager_config_v2';

const normalizeContentType = (value: unknown): ContentType => {
  if (value === 'game' || value === 'worksheet' || value === 'tool' || value === 'resource') {
    return value;
  }
  return 'tool';
};

const BASE_CONTENT_ITEMS: ContentItem[] = CONTENT_ITEMS.filter((item): item is ContentItem => {
  return Boolean(
    item
    && typeof item === 'object'
    && typeof item.id === 'string'
    && item.id.length > 0
    && typeof item.title === 'string'
    && typeof item.description === 'string'
    && typeof item.category === 'string'
    && Array.isArray(item.subjects)
    && Array.isArray(item.gradeLevels)
    && typeof item.dateAdded === 'string',
  );
}).map(item => ({
  ...item,
  type: normalizeContentType(item.type),
}));

const DEFAULT_TABS: ManagerTab[] = [
  { id: 'game', label: 'Games', icon: '🎮', sourceType: 'game' },
  { id: 'worksheet', label: 'Worksheets', icon: '📝', sourceType: 'worksheet' },
  { id: 'tool', label: 'Tools', icon: '🛠️', sourceType: 'tool' },
];

const normalizeTabId = (value: string | undefined, index: number): string => {
  const normalized = (value ?? '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return normalized || `tab-${index + 1}`;
};

const getPreferredTabIdForItem = (
  itemType: ContentType,
  tabs: ManagerTab[],
): string | undefined => {
  return tabs.find(tab => tab.sourceType === itemType)?.id ?? tabs[0]?.id;
};

const buildDefaultConfig = (): ManagerConfig => {
  const tabItems: Record<string, string[]> = {
    game: BASE_CONTENT_ITEMS.filter(item => item.type === 'game').map(item => item.id),
    worksheet: BASE_CONTENT_ITEMS.filter(item => item.type === 'worksheet').map(item => item.id),
    tool: BASE_CONTENT_ITEMS.filter(item => item.type === 'tool').map(item => item.id),
  };

  return {
    tabs: DEFAULT_TABS,
    tabItems,
    folders: [],
    itemOverrides: {},
    customItems: [],
    deletedItemIds: [],
  };
};

const sanitizeConfig = (raw: Partial<ManagerConfig>): ManagerConfig => {
  const defaultConfig = buildDefaultConfig();

  const rawTabs = (raw.tabs?.length ? raw.tabs : defaultConfig.tabs)
    .map(tab => ({
      id: tab.id,
      label: tab.label?.trim() || 'Untitled',
      icon: tab.icon?.trim() || '📁',
      sourceType: tab.sourceType,
    }));

  const seenTabIds = new Set<string>();
  const tabs = rawTabs
    .map((tab, index) => {
      let id = normalizeTabId(tab.id, index);
      while (seenTabIds.has(id)) {
        id = `${id}-${index + 1}`;
      }
      seenTabIds.add(id);
      return {
        ...tab,
        id,
      };
    });

  const rawCustomItems = Array.isArray(raw.customItems) ? (raw.customItems as unknown[]) : [];

  const customItems = rawCustomItems
    .filter((item): item is Partial<ContentItem> & Pick<ContentItem, 'id'> => (
      Boolean(item && typeof item === 'object' && 'id' in item && typeof item.id === 'string')
    ))
    .map(item => ({
      ...item,
      id: item.id,
      title: item.title?.trim() || 'Untitled Item',
      description: item.description ?? '',
      type: normalizeContentType(item.type),
      category: item.category ?? 'custom',
      subjects: Array.isArray(item.subjects) ? item.subjects : [],
      gradeLevels: Array.isArray(item.gradeLevels) ? item.gradeLevels : ['All'],
      dateAdded: item.dateAdded ?? new Date().toISOString().split('T')[0],
    }));

  const baseItems = BASE_CONTENT_ITEMS.filter(item => !(raw.deletedItemIds ?? []).includes(item.id));
  const validItemIds = new Set([...baseItems, ...customItems].map(item => item.id));
  const validTabIds = new Set(tabs.map(tab => tab.id));

  const inputTabItems = raw.tabItems ?? defaultConfig.tabItems;

  const tabItems = Object.fromEntries(
    tabs.map(tab => [
      tab.id,
      Array.from(new Set((inputTabItems[tab.id] ?? []).filter(id => validItemIds.has(id)))),
    ]),
  );

  const folders = (raw.folders ?? [])
    .filter(folder => validTabIds.has(folder.tabId))
    .map(folder => ({
      ...folder,
      itemIds: Array.from(new Set(folder.itemIds.filter(id => validItemIds.has(id)))),
    }));

  return {
    tabs,
    tabItems,
    folders,
    itemOverrides: raw.itemOverrides ?? {},
    customItems,
    deletedItemIds: (raw.deletedItemIds ?? []).filter(id => BASE_CONTENT_ITEMS.some(item => item.id === id)),
  };
};

const loadConfig = (): ManagerConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return buildDefaultConfig();

    const parsed = JSON.parse(saved) as Partial<ManagerConfig>;
    return sanitizeConfig(parsed);
  } catch {
    return buildDefaultConfig();
  }
};

export const useManagerConfig = () => {
  const [config, setConfig] = useState<ManagerConfig>(loadConfig);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const allItems = useMemo(() => {
    const baseItems = BASE_CONTENT_ITEMS.filter(item => !config.deletedItemIds.includes(item.id));
    return [...baseItems, ...config.customItems];
  }, [config.customItems, config.deletedItemIds]);

  const resolvedItems = useMemo(() => {
    const map = new Map<string, ContentItem>();
    allItems.forEach(item => {
      map.set(item.id, { ...item, ...(config.itemOverrides[item.id] ?? {}) });
    });
    return map;
  }, [allItems, config.itemOverrides]);

  const createTab = useCallback((label: string, icon: string) => {
    const id = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    setConfig(prev => ({
      ...prev,
      tabs: [...prev.tabs, { id, label: label.trim(), icon: icon.trim() || '📁' }],
      tabItems: { ...prev.tabItems, [id]: [] },
    }));
  }, []);

  const updateTab = useCallback((tabId: string, patch: Partial<Pick<ManagerTab, 'label' | 'icon'>>) => {
    setConfig(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => tab.id === tabId
        ? { ...tab, label: patch.label?.trim() || tab.label, icon: patch.icon?.trim() || tab.icon }
        : tab),
    }));
  }, []);

  const deleteTab = useCallback((tabId: string) => {
    setConfig(prev => {
      if (prev.tabs.length <= 1) return prev;

      const remainingTabs = prev.tabs.filter(tab => tab.id !== tabId);
      const fallbackTabId = remainingTabs[0].id;
      const movedItemIds = [
        ...(prev.tabItems[tabId] ?? []),
        ...prev.folders.filter(folder => folder.tabId === tabId).flatMap(folder => folder.itemIds),
      ];

      const nextTabItems: Record<string, string[]> = {};
      remainingTabs.forEach(tab => {
        const baseIds = (prev.tabItems[tab.id] ?? []).filter(id => !movedItemIds.includes(id));
        nextTabItems[tab.id] = tab.id === fallbackTabId
          ? Array.from(new Set([...baseIds, ...movedItemIds]))
          : baseIds;
      });

      return {
        ...prev,
        tabs: remainingTabs,
        tabItems: nextTabItems,
        folders: prev.folders.filter(folder => folder.tabId !== tabId),
      };
    });
  }, []);

  const createFolder = useCallback((tabId: string, name: string) => {
    const folder: ManagerFolder = {
      id: `folder-${Date.now()}`,
      tabId,
      name: name.trim(),
      itemIds: [],
    };
    setConfig(prev => ({ ...prev, folders: [...prev.folders, folder] }));
  }, []);

  const updateFolder = useCallback((folderId: string, patch: Partial<Pick<ManagerFolder, 'name'>>) => {
    setConfig(prev => ({
      ...prev,
      folders: prev.folders.map(folder => folder.id === folderId
        ? { ...folder, name: patch.name?.trim() || folder.name }
        : folder),
    }));
  }, []);

  const deleteFolder = useCallback((folderId: string) => {
    setConfig(prev => {
      const target = prev.folders.find(folder => folder.id === folderId);
      if (!target) return prev;

      const nextTabItems = {
        ...prev.tabItems,
        [target.tabId]: Array.from(new Set([...(prev.tabItems[target.tabId] ?? []), ...target.itemIds])),
      };

      return {
        ...prev,
        tabItems: nextTabItems,
        folders: prev.folders.filter(folder => folder.id !== folderId),
      };
    });
  }, []);

  const assignItemToTabRoot = useCallback((itemId: string, tabId: string) => {
    setConfig(prev => {
      const clearedFolders = prev.folders.map(folder => ({
        ...folder,
        itemIds: folder.itemIds.filter(id => id !== itemId),
      }));

      const nextTabItems: Record<string, string[]> = {};
      prev.tabs.forEach(tab => {
        const existing = (prev.tabItems[tab.id] ?? []).filter(id => id !== itemId);
        nextTabItems[tab.id] = tab.id === tabId ? [...existing, itemId] : existing;
      });

      return { ...prev, folders: clearedFolders, tabItems: nextTabItems };
    });
  }, []);

  const assignItemToFolder = useCallback((itemId: string, folderId: string) => {
    setConfig(prev => {
      const folder = prev.folders.find(f => f.id === folderId);
      if (!folder) return prev;

      const nextTabItems: Record<string, string[]> = {};
      prev.tabs.forEach(tab => {
        nextTabItems[tab.id] = (prev.tabItems[tab.id] ?? []).filter(id => id !== itemId);
      });

      const folders = prev.folders.map(f => ({
        ...f,
        itemIds: f.id === folderId
          ? Array.from(new Set([...f.itemIds.filter(id => id !== itemId), itemId]))
          : f.itemIds.filter(id => id !== itemId),
      }));

      return { ...prev, tabItems: nextTabItems, folders };
    });
  }, []);

  const updateItemOverride = useCallback((itemId: string, patch: Partial<ContentItem>) => {
    setConfig(prev => {
      const customItemIndex = prev.customItems.findIndex(item => item.id === itemId);
      if (customItemIndex >= 0) {
        const customItems = [...prev.customItems];
        customItems[customItemIndex] = { ...customItems[customItemIndex], ...patch };
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
    tabId?: string;
  }) => {
    const id = `custom-${Date.now()}`;
    const item: ContentItem = {
      id,
      title: input.title.trim() || 'Untitled Item',
      description: input.description?.trim() || 'Custom item',
      type: input.type,
      category: input.category?.trim() || 'custom',
      subjects: [],
      gradeLevels: ['All'],
      dateAdded: new Date().toISOString().split('T')[0],
      ...(input.customHtmlPath ? { customHtmlPath: input.customHtmlPath.trim() } : {}),
      ...(input.externalUrl ? { externalUrl: input.externalUrl.trim() } : {}),
    };

    setConfig(prev => {
      const tabId = input.tabId && prev.tabs.some(tab => tab.id === input.tabId)
        ? input.tabId
        : getPreferredTabIdForItem(input.type, prev.tabs);

      if (!tabId) {
        return { ...prev, customItems: [...prev.customItems, item] };
      }

      return {
        ...prev,
        customItems: [...prev.customItems, item],
        tabItems: {
          ...prev.tabItems,
          [tabId]: [...(prev.tabItems[tabId] ?? []), id],
        },
      };
    });

    return id;
  }, []);

  const deleteItem = useCallback((itemId: string) => {
    setConfig(prev => {
      const isBaseItem = BASE_CONTENT_ITEMS.some(item => item.id === itemId);

      const nextTabItems: Record<string, string[]> = {};
      prev.tabs.forEach(tab => {
        nextTabItems[tab.id] = (prev.tabItems[tab.id] ?? []).filter(id => id !== itemId);
      });

      const folders = prev.folders.map(folder => ({
        ...folder,
        itemIds: folder.itemIds.filter(id => id !== itemId),
      }));

      return {
        ...prev,
        tabItems: nextTabItems,
        folders,
        customItems: prev.customItems.filter(item => item.id !== itemId),
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
    setConfig(prev => {
      const baseItem = BASE_CONTENT_ITEMS.find(item => item.id === itemId);
      if (!baseItem) return prev;

      const isAlreadyAssignedToTab = prev.tabs.some(tab => (prev.tabItems[tab.id] ?? []).includes(itemId));
      const isAlreadyAssignedToFolder = prev.folders.some(folder => folder.itemIds.includes(itemId));

      if (isAlreadyAssignedToTab || isAlreadyAssignedToFolder) {
        return {
          ...prev,
          deletedItemIds: prev.deletedItemIds.filter(id => id !== itemId),
        };
      }

      const targetTabId = getPreferredTabIdForItem(baseItem.type, prev.tabs);
      if (!targetTabId) {
        return {
          ...prev,
          deletedItemIds: prev.deletedItemIds.filter(id => id !== itemId),
        };
      }

      return {
        ...prev,
        deletedItemIds: prev.deletedItemIds.filter(id => id !== itemId),
        tabItems: {
          ...prev.tabItems,
          [targetTabId]: Array.from(new Set([...(prev.tabItems[targetTabId] ?? []), itemId])),
        },
      };
    });
  }, []);

  const importConfigJson = useCallback((jsonText: string) => {
    const parsed = JSON.parse(jsonText) as Partial<ManagerConfig>;
    setConfig(sanitizeConfig(parsed));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(buildDefaultConfig());
  }, []);

  return {
    config,
    allItems,
    resolvedItems,
    createTab,
    updateTab,
    deleteTab,
    createFolder,
    updateFolder,
    deleteFolder,
    assignItemToTabRoot,
    assignItemToFolder,
    updateItemOverride,
    createItem,
    deleteItem,
    restoreBaseItem,
    importConfigJson,
    resetConfig,
  };
};
