import { INVENTORY_CONFIG as CATALOG_INVENTORY_CONFIG } from '../content/catalog/inventory-config.js';
import { PROP_CATALOG } from '../content/catalog/prop-catalog.js';
import { buildRuntimePropDefinitions } from '../content/registry/build-runtime-prop-definitions.js';

export function createLegacyInventoryAndPropDefinitions({
  factoryById,
  warn = console.warn
} = {}) {
  const PROP_DEFINITIONS = buildRuntimePropDefinitions({
    inventoryConfig: CATALOG_INVENTORY_CONFIG,
    propCatalog: PROP_CATALOG,
    factoryById,
    warn
  });

  return {
    INVENTORY_CONFIG: CATALOG_INVENTORY_CONFIG,
    PROP_DEFINITIONS
  };
}
