export const INVENTORY_CONFIG = Object.freeze({
  defaultCategory: 'wingSet',
  perCategoryLimit: 5,
  categories: Object.freeze([
    Object.freeze({ key: 'wingSet', label: 'Wing Set', slotKey: 'wingSet', equipLimit: 1, sortOrder: 0, enabled: true })
  ])
});
