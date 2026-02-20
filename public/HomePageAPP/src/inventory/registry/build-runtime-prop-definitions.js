export function buildRuntimePropDefinitions({
  inventoryConfig,
  propCatalog,
  factoryById,
  warn = console.warn
}) {
  const categories = Array.isArray(inventoryConfig?.categories)
    ? inventoryConfig.categories
    : [];
  const categoryKeySet = new Set(
    categories
      .map((category) => category?.key)
      .filter((categoryKey) => typeof categoryKey === 'string' && categoryKey.length > 0)
  );

  const registryKeys = new Set();
  const definitions = [];

  (Array.isArray(propCatalog) ? propCatalog : []).forEach((entry) => {
    const key = typeof entry?.key === 'string' ? entry.key.trim() : '';
    if (!key) {
      warn('Skipping prop with missing key in PROP_CATALOG.');
      return;
    }
    if (registryKeys.has(key)) {
      warn(`Duplicate prop key in PROP_CATALOG: ${key}`);
      return;
    }

    const category = typeof entry?.category === 'string' ? entry.category.trim() : '';
    if (!categoryKeySet.has(category)) {
      warn(`Unknown inventory category "${category}" for prop "${key}"`);
      return;
    }

    const factoryId = typeof entry?.factoryId === 'string' ? entry.factoryId.trim() : '';
    const createFactory = factoryId ? factoryById?.[factoryId] : null;
    if (typeof createFactory !== 'function') {
      warn(`Missing factory "${factoryId}" for prop "${key}"`);
      return;
    }

    const label = typeof entry?.label === 'string' && entry.label.trim().length
      ? entry.label.trim()
      : key;

    registryKeys.add(key);
    definitions.push({
      key,
      label,
      category,
      prewarmPriority: Number.isFinite(entry?.prewarmPriority) ? entry.prewarmPriority : 0,
      eyePreset: typeof entry?.eyePreset === 'string' && entry.eyePreset.trim().length
        ? entry.eyePreset.trim()
        : null,
      create: createFactory
    });
  });

  return definitions;
}
