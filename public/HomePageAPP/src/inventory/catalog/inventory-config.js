export const INVENTORY_CONFIG = Object.freeze({
  defaultCategory: 'wingSet',
  perCategoryLimit: 5,
  categories: Object.freeze([
    Object.freeze({ key: 'wingSet', label: 'Wing Set', slotKey: 'wingSet', equipLimit: 1, sortOrder: 0, enabled: true }),
    Object.freeze({ key: 'headWear', label: 'Headwear', slotKey: 'headWear', equipLimit: 1, sortOrder: 1, enabled: true }),
  ])
});
