# Architecture Restructure Roadmap

## Target
- Use metadata catalogs as the source of truth for props and character features.
- Keep rendering, UI, domain rules, and asset concerns isolated.
- Ship in compatibility-safe slices so existing behavior does not regress.

## Current Status
- `INVENTORY_CONFIG` and `PROP_DEFINITIONS` are now sourced from:
  - `src/inventory/catalog/inventory-config.js`
  - `src/inventory/catalog/prop-catalog.js`
  - `src/inventory/adapters/legacy-prop-definitions-adapter.js`
- Runtime behavior remains unchanged because `index.html` still consumes legacy-shaped definitions.
- Backward-compatible wrappers remain at legacy paths under `src/content/...` and `src/compat/...`.

## Naming and IDs
- Category key format: `camelCase` (`wingSet`, `headWear`).
- Prop key format: `camelCase` (`alphaWings`, `royalArmorBody`).
- Factory mapping key format: `camelCase` and explicit (`makeAlphaWingsProp`, `createCatEyesProp`).
- Future global IDs should be namespaced (`prop.wingSet.alphaWings`) while preserving current keys for compatibility.

## Source of Truth Pattern
- Catalog files contain only metadata and references (`factoryId`), not runtime objects.
- Runtime objects are created through adapter/build steps.
- UI labels and category behavior should read from registry/catalog, not from duplicated DOM text.

## Phased Plan
1. Foundation (done):
   - Catalog + runtime definition builder + legacy adapter.
2. UI generation:
   - Render store/inventory tabs and item buttons from catalog definitions.
   - Keep existing classes and event wiring during migration.
3. Runtime extraction:
   - Move thumbnail, preview, and inventory domain logic to `src/` modules.
4. Character feature system:
   - Introduce slot definitions, attachment metadata, feature unlock config.
5. Asset pipeline:
   - Add asset manifest + loader/cache/fallback + prewarm policy.
6. Scene/mode scaling:
   - Introduce scene and mode contracts for future game modes.

## Regression Guardrails
- Keep existing public behavior and controls intact until replacement parity is validated.
- Move one subsystem at a time behind compatibility adapters.
- Validate after each slice: equip/unequip, inventory counts, preview rendering, mystery reward flow.
