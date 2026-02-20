import { INVENTORY_CONFIG as CATALOG_INVENTORY_CONFIG } from '../catalog/inventory-config.js';
import { PROP_CATALOG } from '../catalog/prop-catalog.js';
import { buildRuntimePropDefinitions } from '../registry/build-runtime-prop-definitions.js';

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
