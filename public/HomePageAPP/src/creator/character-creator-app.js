(async () => {
const [
  THREE,
  { OrbitControls },
  { TransformControls },
  { GLTFLoader },
  { SVGLoader },
  xioModule,
  catalogModule,
  gltfPropsModule,
  inventoryModule,
  propCatalogModule,
  wingPreviewModule,
  generatorConfigModule,
  generatorCoreModule,
  generatedWingRuntimeModule,
] = await Promise.all([
  import('https://esm.sh/three@0.160.0'),
  import('https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js'),
  import('https://esm.sh/three@0.160.0/examples/jsm/controls/TransformControls.js'),
  import('https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'),
  import('https://esm.sh/three@0.160.0/examples/jsm/loaders/SVGLoader.js'),
  import('../runtime/xio-character.js'),
  import('../runtime/homepage-live-catalog.js'),
  import('../runtime/homepage-gltf-props.js'),
  import('../inventory/catalog/inventory-config.js'),
  import('../inventory/catalog/prop-catalog.js'),
  import('../runtime/xio-live-wing-previews.js'),
  import('../generator/random-prop-generator-config.js'),
  import('../generator/random-prop-generator-core.js'),
  import('../runtime/xio-generated-wing-props.js'),
]);

const {
  createXioCharacter,
  XIO_DEFAULT_SVG_DATA,
  XIO_EYE_APPEARANCE_PRESETS,
  XIO_MATERIAL_PRESETS,
  XIO_SLOT_DEFINITIONS,
} = xioModule;
const {
  HOMEPAGE_CREATOR_READY,
  HOMEPAGE_CATALOG_SYNC,
  HOMEPAGE_PROP_UPLOAD_REQUEST,
  HOMEPAGE_PROP_SAVE_REQUEST,
  HOMEPAGE_PROP_SAVE_RESULT,
  HOMEPAGE_OPEN_MYSTERY_TEST_REQUEST,
  buildHomepageCatalogSnapshot,
  buildHomepageMysteryTestLaunchToken,
  buildHomepageMysteryTestOverride,
  buildHomepageMysteryTestSession,
  deriveHomepageCatalogFromLegacy,
  mergeHomepageCatalogWithFallback,
  normalizeHomepagePropKey,
  persistHomepageCatalogSnapshot,
  persistHomepageLegacyPinnedMysteryRewardKey,
  persistHomepageMysteryTestLaunchToken,
  persistHomepageMysteryTestOverride,
  persistHomepageMysteryTestSession,
  readHomepageCatalogSnapshot,
  readHomepageLegacyPinnedMysteryRewardKey,
  readHomepageMysteryTestOverride,
  readHomepageMysteryTestSession,
} = catalogModule;
const {
  cloneSceneGraph,
  normalizeObjectToUnitSize,
  centerObjectAtOrigin,
  prepareSceneRootForSocketAttachment,
  buildMirroredAttachmentTransform,
  applyAttachmentTransform,
  loadGlbScene,
  loadWingTemplateState,
  DEFAULT_WING_AUTHORING_PREVIEW,
  DEFAULT_WING_MOTION_PREVIEW,
  normalizeWingAuthoringPreview,
  normalizeWingMotionPreview,
  resolveWingMotionProfiles,
  buildWingAuthoringTemplateState,
} = gltfPropsModule;
const {
  buildLiveGameWingPreview,
  isLiveGameWingPreviewKey,
} = wingPreviewModule;
const {
  GENERATOR_CATEGORY_OPTIONS,
  GENERATOR_RARITY_OPTIONS,
  GENERATOR_THEME_MODE_OPTIONS,
  GENERATOR_DETAIL_DENSITY_OPTIONS,
  GENERATOR_COLOR_HARMONY_OPTIONS,
  GENERATOR_FIT_MODE_OPTIONS,
  GENERATOR_THEME_OPTIONS,
  getWingBaseReferenceOptions,
} = generatorConfigModule;
const {
  buildGeneratorPreviewSummary,
  generateRandomWingDraft,
  isGeneratedPropPreview,
} = generatorCoreModule;
const {
  buildGeneratedWingPreview,
} = generatedWingRuntimeModule;

const $ = (id) => document.getElementById(id);
const creatorCanvas = $('creator-canvas');
const stageShell = $('stage-shell');
const dropOverlay = $('drop-overlay');
const creatorNotice = $('creator-notice');
const creatorNoticeEyebrow = $('creator-notice-eyebrow');
const creatorNoticeTitle = $('creator-notice-title');
const creatorNoticeMessage = $('creator-notice-message');
const creatorNoticeCloseButton = $('creator-notice-close');
const deleteConfirmEyebrow = $('delete-confirm-eyebrow');
const deleteConfirmModal = $('delete-confirm-modal');
const deleteConfirmTitle = $('delete-confirm-title');
const deleteConfirmMessage = $('delete-confirm-message');
const deleteConfirmCloseButton = $('delete-confirm-close');
const deleteConfirmCancelButton = $('delete-confirm-cancel');
const deleteConfirmConfirmButton = $('delete-confirm-confirm');
const saveSuccessModal = $('save-success-modal');
const saveSuccessEyebrow = $('save-success-eyebrow');
const saveSuccessTitle = $('save-success-title');
const saveSuccessMessage = $('save-success-message');
const saveSuccessCloseButton = $('save-success-close');
const saveSuccessStayButton = $('save-success-stay');
const saveSuccessLaunchButton = $('save-success-launch');
const randomPropGeneratorButton = $('random-prop-generator-button');
const randomGeneratorModal = $('random-prop-generator-modal');
const randomGeneratorCloseButton = $('random-generator-close');
const randomGeneratorCancelButton = $('random-generator-cancel-button');
const randomGeneratorGenerateButton = $('random-generator-generate-button');
const randomGeneratorStatus = $('random-generator-status');
const randomGeneratorCategorySelect = $('random-generator-category-select');
const randomGeneratorRaritySelect = $('random-generator-rarity-select');
const randomGeneratorThemeModeSelect = $('random-generator-theme-mode-select');
const randomGeneratorThemeField = $('random-generator-theme-field');
const randomGeneratorThemeInput = $('random-generator-theme-input');
const randomGeneratorDetailDensitySelect = $('random-generator-detail-density-select');
const randomGeneratorColorHarmonySelect = $('random-generator-color-harmony-select');
const randomGeneratorFitModeSelect = $('random-generator-fit-mode-select');
const randomGeneratorBaseReferenceSelect = $('random-generator-base-reference-select');
const randomGeneratorThemeSuggestions = $('random-generator-theme-suggestions');
const randomGeneratorSummaryState = $('random-generator-summary-state');
const randomGeneratorSummaryCategory = $('random-generator-summary-category');
const randomGeneratorSummaryRarity = $('random-generator-summary-rarity');
const randomGeneratorSummaryTheme = $('random-generator-summary-theme');
const randomGeneratorSummaryDetail = $('random-generator-summary-detail');
const randomGeneratorSummaryMaterial = $('random-generator-summary-material');
const randomGeneratorSummaryFit = $('random-generator-summary-fit');
const randomGeneratorSummaryReference = $('random-generator-summary-reference');
const randomGeneratorReferenceHint = $('random-generator-reference-hint');
const generatedStageCard = $('generated-stage-card');
const generatedStageTitle = $('generated-stage-title');
const generatedStageStatus = $('generated-stage-status');
const generatedStageMessage = $('generated-stage-message');
const generatedStageTheme = $('generated-stage-theme');
const generatedStageRarity = $('generated-stage-rarity');
const generatedStageMaterial = $('generated-stage-material');
const generatedStageFit = $('generated-stage-fit');
const workspaceLog = $('workspace-log');
const draftOriginChip = $('draft-origin-chip');
const publishModeChip = $('publish-mode-chip');
const selectionChip = $('selection-chip');
const stageHintLabel = $('stage-hint-label');
const currentAssetLabel = $('current-asset-label');
const stageSelectionLabel = $('stage-selection-label');
const publishStateLabel = $('publish-state-label');
const draftSourceInline = $('draft-source-inline');
const draftCategoryLabel = $('draft-category-label');
const draftSlotLabel = $('draft-slot-label');
const liveCategoryList = $('live-category-list');
const livePropList = $('live-prop-list');
const livePropCount = $('live-prop-count');
const liveSearchInput = $('live-search-input');
const liveCategoryFilter = $('live-category-filter');
const motionPreviewButton = $('toggle-preview-motion-button');
const autoLockFitButton = $('auto-lock-fit-button');
const syncBothWingsButton = $('sync-both-wings-button');
const syncOneWingButton = $('sync-one-wing-button');
const turntableButton = $('toggle-turntable-button');
const editPropToolbarButton = $('edit-prop-button');
const togglePlacementDepthButton = $('toggle-placement-depth-button');
const undoAdjustmentButton = $('undo-adjustment-button');
const redoAdjustmentButton = $('redo-adjustment-button');
const editSessionGroup = $('edit-session-group');
const editSessionLabel = $('edit-session-label');
const saveEditButton = $('save-edit-button');
const cancelEditButton = $('cancel-edit-button');
const publishPropButton = $('publish-prop-button');
const archivePropButton = $('archive-prop-button');
const loadSelectedLiveButton = $('load-selected-live-button');
const linkPropsFolderButton = $('link-props-folder-button');
const propsFolderStatusChip = $('props-folder-status-chip');
const transformSection = $('transform-section');
const categoryManagerSection = $('category-manager-section');
const wingSourceSection = $('wing-source-section');
const wingMotionSection = $('wing-motion-section');
const LEFT_PANEL_SECTION_DEFAULTS = Object.freeze({
  'build-import-panel': true,
  'prop-workspace-panel': true,
  'prop-core-section': true,
  'wing-source-section': true,
  'wing-motion-section': false,
  'appearance-section': false,
  'transform-section': false,
  'category-manager-section': false,
});
const LEFT_PANEL_STATE_STORAGE_KEY = 'xio-character-creator.left-panel-sections.v1';
const IS_FILE_RUNTIME = window.location.protocol === 'file:' || window.location.origin === 'null';
const STANDALONE_PROPS_DB_NAME = 'xio-character-creator-standalone';
const STANDALONE_PROPS_DB_VERSION = 1;
const STANDALONE_PROPS_STORE_NAME = 'handles';
const STANDALONE_PROPS_FOLDER_KEY = 'props-folder';
const STANDALONE_PROPS_PREFIXES = Object.freeze([
  './Images/PROPS/',
  'Images/PROPS/',
  '/Images/PROPS/',
]);
const STANDALONE_PROPS_MARKER = '/Images/PROPS/';
const STANDALONE_FOLDER_STATUS = Object.freeze({
  notNeeded: 'not-needed',
  unsupported: 'unsupported',
  unlinked: 'unlinked',
  linked: 'linked',
  missingAsset: 'missing-asset',
  relinkRequired: 'relink-required',
});
const PROP_ASSET_STATUS = Object.freeze({
  proxyReady: 'proxy-ready',
  glbReady: 'glb-ready',
  needsLink: 'needs-link',
  missingAsset: 'missing-asset',
  appearanceOnly: 'appearance-only',
});

const propLabelInput = $('prop-label-input');
const propKeyInput = $('prop-key-input');
const propCategorySelect = $('prop-category-select');
const propRaritySelect = $('prop-rarity-select');
const propDescriptionInput = $('prop-description-input');
const propTagsInput = $('prop-tags-input');
const propActiveToggle = $('prop-active-toggle');
const propMysteryToggle = $('prop-mystery-toggle');
const propMirrorToggle = $('prop-mirror-toggle');
const eyePresetSelect = $('eye-preset-select');
const materialPresetSelect = $('material-preset-select');
const wingAuthoringSourceLabel = $('wing-authoring-source-label');
const wingAuthoringModeLabel = $('wing-authoring-mode-label');
const wingAutoIsolateButton = $('wing-auto-isolate-button');
const wingResetSourceButton = $('wing-reset-source-button');
const wingUseLeftButton = $('wing-use-left-button');
const wingUseRightButton = $('wing-use-right-button');
const wingMirrorBothToggle = $('wing-mirror-both-toggle');
const wingSplitOffsetInput = $('wing-split-offset-input');
const wingSplitOffsetValue = $('wing-split-offset-value');
const wingTrimMarginInput = $('wing-trim-margin-input');
const wingTrimMarginValue = $('wing-trim-margin-value');
const wingMotionPreviewButton = $('wing-motion-preview-button');
const wingMotionLinkedToggle = $('wing-motion-linked-toggle');
const wingMotionMasterCard = $('wing-motion-master-card');
const wingMotionMasterChip = $('wing-motion-master-chip');
const wingMotionLeftCard = $('wing-motion-left-card');
const wingMotionRightCard = $('wing-motion-right-card');

const categoryKeyInput = $('category-key-input');
const categoryLabelInput = $('category-label-input');
const categoryEditorSelect = $('category-editor-select');
const categorySlotSelect = $('category-slot-select');
const categoryEquipLimitInput = $('category-equip-limit-input');
const categorySortOrderInput = $('category-sort-order-input');
const categoryEnabledToggle = $('category-enabled-toggle');
const newCategoryButton = $('new-category-button');
const deleteCategoryButton = $('delete-category-button');

const transformInputs = {
  position: [$('pos-x-input'), $('pos-y-input'), $('pos-z-input')],
  rotation: [$('rot-x-input'), $('rot-y-input'), $('rot-z-input')],
  scale: [$('scale-x-input'), $('scale-y-input'), $('scale-z-input')],
};
const wingMotionInputs = {
  master: {
    flapHz: $('wing-motion-master-flapHz'),
    direction: $('wing-motion-master-direction'),
    amplitude: $('wing-motion-master-amplitude'),
    sweep: $('wing-motion-master-sweep'),
    pitch: $('wing-motion-master-pitch'),
    featherTwist: $('wing-motion-master-featherTwist'),
    shoulderSpread: $('wing-motion-master-shoulderSpread'),
    phaseOffset: $('wing-motion-master-phaseOffset'),
  },
  left: {
    flapHz: $('wing-motion-left-flapHz'),
    direction: $('wing-motion-left-direction'),
    amplitude: $('wing-motion-left-amplitude'),
    sweep: $('wing-motion-left-sweep'),
    pitch: $('wing-motion-left-pitch'),
    featherTwist: $('wing-motion-left-featherTwist'),
    shoulderSpread: $('wing-motion-left-shoulderSpread'),
    phaseOffset: $('wing-motion-left-phaseOffset'),
  },
  right: {
    flapHz: $('wing-motion-right-flapHz'),
    direction: $('wing-motion-right-direction'),
    amplitude: $('wing-motion-right-amplitude'),
    sweep: $('wing-motion-right-sweep'),
    pitch: $('wing-motion-right-pitch'),
    featherTwist: $('wing-motion-right-featherTwist'),
    shoulderSpread: $('wing-motion-right-shoulderSpread'),
    phaseOffset: $('wing-motion-right-phaseOffset'),
  },
};
const wingMotionValueLabels = {
  master: {
    flapHz: $('wing-motion-master-flapHz-value'),
    amplitude: $('wing-motion-master-amplitude-value'),
    sweep: $('wing-motion-master-sweep-value'),
    pitch: $('wing-motion-master-pitch-value'),
    featherTwist: $('wing-motion-master-featherTwist-value'),
    shoulderSpread: $('wing-motion-master-shoulderSpread-value'),
    phaseOffset: $('wing-motion-master-phaseOffset-value'),
  },
  left: {
    flapHz: $('wing-motion-left-flapHz-value'),
    amplitude: $('wing-motion-left-amplitude-value'),
    sweep: $('wing-motion-left-sweep-value'),
    pitch: $('wing-motion-left-pitch-value'),
    featherTwist: $('wing-motion-left-featherTwist-value'),
    shoulderSpread: $('wing-motion-left-shoulderSpread-value'),
    phaseOffset: $('wing-motion-left-phaseOffset-value'),
  },
  right: {
    flapHz: $('wing-motion-right-flapHz-value'),
    amplitude: $('wing-motion-right-amplitude-value'),
    sweep: $('wing-motion-right-sweep-value'),
    pitch: $('wing-motion-right-pitch-value'),
    featherTwist: $('wing-motion-right-featherTwist-value'),
    shoulderSpread: $('wing-motion-right-shoulderSpread-value'),
    phaseOffset: $('wing-motion-right-phaseOffset-value'),
  },
};
const transformModeButtons = Array.from(document.querySelectorAll('[data-transform-mode]'));
const stageTransformShortcutButtons = Array.from(document.querySelectorAll('[data-stage-transform-shortcut]'));

const fallbackSnapshot = deriveHomepageCatalogFromLegacy({
  inventoryConfig: inventoryModule.INVENTORY_CONFIG,
  propCatalog: propCatalogModule.PROP_CATALOG,
});
const CORE_CATEGORY_KEYS = new Set((fallbackSnapshot.categories || []).map((entry) => entry.key));
const CATEGORY_EDITOR_NEW_VALUE = '__new__';

function withCatalogFallback(snapshot) {
  return mergeHomepageCatalogWithFallback({
    snapshot,
    fallbackInventoryConfig: inventoryModule.INVENTORY_CONFIG,
    fallbackPropCatalog: propCatalogModule.PROP_CATALOG,
  });
}

const state = {
  snapshot: withCatalogFallback(readHomepageCatalogSnapshot()),
  publishEnabled: false,
  publishReason: 'Open through the manager route to publish live.',
  selectedLivePropKey: null,
  draftCategoryKey: fallbackSnapshot.categories[0]?.key || 'wingSet',
  categoryEditorKey: fallbackSnapshot.categories[0]?.key || null,
  draftProp: null,
  draftTemplateRoot: null,
  draftTemplatePair: null,
  draftTemplateSourceRoot: null,
  draftTemplateSourcePair: null,
  draftSourceLabel: 'No GLB loaded',
  draftObjectUrl: null,
  draftLocalFile: null,
  stageSelection: null,
  turntableEnabled: true,
  motionPreviewEnabled: false,
  wingSyncPreview: {
    mode: null,
    side: null,
  },
  transformMode: 'translate',
  pendingRequests: new Map(),
  requestCounter: 0,
  turntablePauseUntilMs: 0,
  liveSearchQuery: '',
  liveCategoryFilter: 'all',
  editSession: {
    active: false,
    propKey: null,
    baselineProp: null,
  },
  history: {
    undoStack: [],
    redoStack: [],
    currentSnapshot: null,
    suspend: false,
  },
  standalonePropsFolder: {
    handle: null,
    permission: IS_FILE_RUNTIME ? STANDALONE_FOLDER_STATUS.unlinked : STANDALONE_FOLDER_STATUS.notNeeded,
    name: '',
    missingAssetPath: null,
  },
  propAssetAvailability: new Map(),
  assetAvailabilityRefreshToken: 0,
};
const BRIDGE_TARGET_ORIGIN = window.location.protocol === 'file:' || window.location.origin === 'null'
  ? '*'
  : window.location.origin;

const logEntries = [];
let creatorNoticeTimeoutId = 0;
let deleteConfirmResolver = null;
let deleteConfirmLastActiveElement = null;
let saveSuccessResolver = null;
let saveSuccessLastActiveElement = null;
let randomGeneratorLastActiveElement = null;
let randomGeneratorIsBusy = false;
function renderWorkspaceLog() {
  const visibleEntries = logEntries.slice(0, 18);
  if (!visibleEntries.length) {
    workspaceLog.innerHTML = '<div class="workspace-log__empty">No creator activity yet.</div>';
    return;
  }

  workspaceLog.innerHTML = visibleEntries.map((entry) => `
    <article class="workspace-log__entry">
      <span class="workspace-log__time">${escapeHtml(entry.time)}</span>
      <p class="workspace-log__message">${escapeHtml(entry.message)}</p>
    </article>
  `).join('');
}

const log = (message) => {
  logEntries.unshift({
    time: new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }),
    message,
  });
  renderWorkspaceLog();
};

const slugify = (value) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

renderWorkspaceLog();

function hideCreatorNotice() {
  if (creatorNoticeTimeoutId) {
    window.clearTimeout(creatorNoticeTimeoutId);
    creatorNoticeTimeoutId = 0;
  }
  if (!creatorNotice) return;
  creatorNotice.hidden = true;
  creatorNotice.removeAttribute('data-tone');
}

function showCreatorNotice({
  tone = 'info',
  eyebrow = 'Status',
  title = 'Workspace updated',
  message = '',
  timeoutMs = 4800,
} = {}) {
  if (!creatorNotice || !creatorNoticeEyebrow || !creatorNoticeTitle || !creatorNoticeMessage) {
    return;
  }
  if (creatorNoticeTimeoutId) {
    window.clearTimeout(creatorNoticeTimeoutId);
    creatorNoticeTimeoutId = 0;
  }
  creatorNotice.dataset.tone = tone;
  creatorNoticeEyebrow.textContent = eyebrow;
  creatorNoticeTitle.textContent = title;
  creatorNoticeMessage.textContent = message;
  creatorNotice.hidden = false;
  if (timeoutMs > 0) {
    creatorNoticeTimeoutId = window.setTimeout(() => {
      hideCreatorNotice();
    }, timeoutMs);
  }
}

function restoreFocusBeforeHidingModal(lastActiveElement, fallbackElement = null) {
  const focusTarget = [lastActiveElement, fallbackElement].find((candidate) => (
    candidate instanceof HTMLElement
    && typeof candidate.focus === 'function'
    && !candidate.hasAttribute('disabled')
    && !candidate.hidden
    && candidate.isConnected
  )) || null;
  if (focusTarget && document.activeElement !== focusTarget) {
    focusTarget.focus({ preventScroll: true });
    return;
  }
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

function resolveDeleteConfirm(confirmed) {
  if (!deleteConfirmModal) {
    return;
  }
  const resolver = deleteConfirmResolver;
  deleteConfirmResolver = null;
  const lastActiveElement = deleteConfirmLastActiveElement;
  deleteConfirmLastActiveElement = null;
  restoreFocusBeforeHidingModal(lastActiveElement);
  deleteConfirmModal.hidden = true;
  deleteConfirmModal.setAttribute('aria-hidden', 'true');
  resolver?.(confirmed);
}

function resolveSaveSuccessPrompt(shouldLaunch) {
  if (!saveSuccessModal) {
    return;
  }
  const resolver = saveSuccessResolver;
  saveSuccessResolver = null;
  const lastActiveElement = saveSuccessLastActiveElement;
  saveSuccessLastActiveElement = null;
  restoreFocusBeforeHidingModal(lastActiveElement);
  saveSuccessModal.hidden = true;
  saveSuccessModal.setAttribute('aria-hidden', 'true');
  resolver?.(shouldLaunch);
}

function requestDestructiveConfirmation({
  eyebrow = 'Delete',
  title = 'Delete this item permanently?',
  message = '',
  confirmLabel = 'Delete Permanently',
} = {}) {
  if (!deleteConfirmModal || !deleteConfirmTitle || !deleteConfirmMessage || !deleteConfirmConfirmButton) {
    return Promise.resolve(false);
  }
  if (deleteConfirmResolver) {
    resolveDeleteConfirm(false);
  }

  deleteConfirmLastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (deleteConfirmEyebrow) {
    deleteConfirmEyebrow.textContent = eyebrow;
  }
  deleteConfirmTitle.textContent = title;
  deleteConfirmMessage.textContent = message;
  deleteConfirmConfirmButton.textContent = confirmLabel;
  deleteConfirmModal.hidden = false;
  deleteConfirmModal.setAttribute('aria-hidden', 'false');

  return new Promise((resolve) => {
    deleteConfirmResolver = resolve;
    window.setTimeout(() => {
      deleteConfirmConfirmButton.focus();
    }, 0);
  });
}

function requestMysteryLaunchConfirmation({
  eyebrow = 'Live Save Complete',
  title = 'Prop saved into the live inventory',
  message = 'Would you like to go to the Homepage now and test the next Mystery Box pull?',
  stayLabel = 'Stay in Studio',
  launchLabel = 'Go Test Mystery Box',
} = {}) {
  if (
    !saveSuccessModal
    || !saveSuccessEyebrow
    || !saveSuccessTitle
    || !saveSuccessMessage
    || !saveSuccessLaunchButton
    || !saveSuccessStayButton
  ) {
    return Promise.resolve(false);
  }
  if (saveSuccessResolver) {
    resolveSaveSuccessPrompt(false);
  }
  hideCreatorNotice();
  saveSuccessLastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  saveSuccessEyebrow.textContent = eyebrow;
  saveSuccessTitle.textContent = title;
  saveSuccessMessage.textContent = message;
  saveSuccessStayButton.textContent = stayLabel;
  saveSuccessLaunchButton.textContent = launchLabel;
  saveSuccessModal.hidden = false;
  saveSuccessModal.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => {
    saveSuccessLaunchButton.focus();
  }, 0);
  return new Promise((resolve) => {
    saveSuccessResolver = resolve;
  });
}

function getRandomGeneratorBaseReferenceCatalog() {
  const referenceMap = new Map();
  propCatalogModule.PROP_CATALOG.forEach((entry) => {
    if (entry?.category !== 'wingSet') {
      return;
    }
    referenceMap.set(entry.key, {
      key: entry.key,
      label: entry.label,
      rarity: entry.rarity,
      attachment: entry.attachment,
      categoryKey: 'wingSet',
      assetUrl: entry.assetUrl || null,
      factoryId: entry.factoryId || null,
      preview: clonePreviewData(entry.preview),
    });
  });
  getProps().forEach((entry) => {
    if (entry?.categoryKey !== 'wingSet' || !entry?.label || entry.archived === true || entry.active === false) {
      return;
    }
    referenceMap.set(entry.key, {
      key: entry.key,
      label: entry.label,
      rarity: entry.rarity,
      attachment: entry.attachment,
      categoryKey: 'wingSet',
      assetUrl: entry.assetUrl || null,
      factoryId: entry.factoryId || null,
      preview: clonePreviewData(entry.preview),
    });
  });
  return [...referenceMap.values()];
}

function getRandomGeneratorBaseReferenceOptions() {
  return getWingBaseReferenceOptions(getRandomGeneratorBaseReferenceCatalog());
}

function resolveRandomGeneratorSelectedBaseReference(formState, references = getRandomGeneratorBaseReferenceOptions()) {
  const requestedKey = typeof formState?.baseReferenceKey === 'string' ? formState.baseReferenceKey.trim() : '';
  const requestedReference = requestedKey
    ? references.find((entry) => entry.key === requestedKey) || null
    : null;
  if (requestedReference) {
    return requestedReference;
  }
  if ((formState?.fitMode === 'copyWingTemplate' || formState?.themeMode === 'matchExistingStyle') && references.length) {
    return references[0];
  }
  return null;
}

function measureRandomGeneratorTemplateBounds({ templateRoot = null, templatePair = null, attachment = null } = {}) {
  const measurementRoot = new THREE.Group();
  if (templatePair?.left && templatePair?.right) {
    measurementRoot.add(cloneSceneGraph(templatePair.left));
    measurementRoot.add(cloneSceneGraph(templatePair.right));
  } else if (templateRoot) {
    measurementRoot.add(cloneSceneGraph(templateRoot));
  } else {
    return null;
  }
  measurementRoot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(measurementRoot);
  if (box.isEmpty()) {
    return null;
  }
  const size = new THREE.Vector3();
  box.getSize(size);
  const width = Math.max(size.x, 0.001);
  const height = Math.max(size.y, 0.001);
  const depth = Math.max(size.z, 0.001);
  const attachmentScaleAverage = Array.isArray(attachment?.scale)
    ? attachment.scale
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
      .reduce((sum, value, _, values) => sum + (value / Math.max(values.length, 1)), 0)
    : 1.9;
  return {
    width: Number(width.toFixed(3)),
    height: Number(height.toFixed(3)),
    depth: Number(depth.toFixed(3)),
    spreadRatio: Number((width / height).toFixed(3)),
    verticalRatio: Number((height / width).toFixed(3)),
    depthRatio: Number((depth / width).toFixed(3)),
    attachmentScaleAverage: Number(attachmentScaleAverage.toFixed(3)),
  };
}

function deriveRandomGeneratorMetricsFromGeneratedRecipe(generatedRecipe, attachment = null) {
  const structureRecipe = generatedRecipe?.structureRecipe;
  if (!structureRecipe || typeof structureRecipe !== 'object') {
    return null;
  }
  const width = Math.max((Number(structureRecipe.span) || 3.2) * 2.04, 0.001);
  const height = Math.max(Number(structureRecipe.height) || 2.1, 0.001);
  const depth = Math.max((Number(structureRecipe.featherWidth) || 0.28) * 0.86, 0.001);
  const attachmentScaleAverage = Array.isArray(attachment?.scale)
    ? attachment.scale
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
      .reduce((sum, value, _, values) => sum + (value / Math.max(values.length, 1)), 0)
    : 1.9;
  return {
    width: Number(width.toFixed(3)),
    height: Number(height.toFixed(3)),
    depth: Number(depth.toFixed(3)),
    spreadRatio: Number((width / height).toFixed(3)),
    verticalRatio: Number((height / width).toFixed(3)),
    depthRatio: Number((depth / width).toFixed(3)),
    attachmentScaleAverage: Number(attachmentScaleAverage.toFixed(3)),
  };
}

async function resolveRandomGeneratorTemplateReference(formState, baseReferenceOptions = getRandomGeneratorBaseReferenceOptions()) {
  if (formState?.fitMode !== 'copyWingTemplate') {
    return null;
  }
  const selectedReference = resolveRandomGeneratorSelectedBaseReference(formState, baseReferenceOptions);
  if (!selectedReference) {
    return null;
  }
  const templateReference = {
    key: selectedReference.key,
    label: selectedReference.label,
    sourceKind: selectedReference.sourceKind || (selectedReference.assetUrl ? 'glb' : 'metadata'),
    theme: selectedReference.theme || null,
    materialFamily: selectedReference.materialFamily || null,
    paletteFamily: selectedReference.paletteFamily || null,
    fitTemplateId: selectedReference.fitTemplateId || null,
    structureFamily: selectedReference.structureFamily || null,
    attachment: cloneAttachment(selectedReference.attachment || {
      position: [0.72, -0.24, 0.08],
      rotation: [0.02, 0.06, -0.02],
      scale: [1.9, 1.9, 1.9],
      mirrorMode: 'paired',
      fit: { yOffsetRatio: 0.56, zOffsetRatio: 0.02, distanceMultiplier: 1.28, initialRotationY: 0 },
    }),
    generatedRecipe: selectedReference.generatedRecipe ? clonePreviewData(selectedReference.generatedRecipe) : null,
    metrics: null,
  };

  if (templateReference.generatedRecipe) {
    templateReference.metrics = deriveRandomGeneratorMetricsFromGeneratedRecipe(
      templateReference.generatedRecipe,
      templateReference.attachment,
    );
  }

  if (selectedReference.assetUrl) {
    try {
      const templateState = await loadWingTemplateState({
        GLTFLoader,
        THREE,
        assetUrl: selectedReference.assetUrl,
      });
      const boundsMetrics = measureRandomGeneratorTemplateBounds({
        templateRoot: templateState?.sourceTemplateRoot || null,
        templatePair: templateState?.sourceTemplatePair || null,
        attachment: templateReference.attachment,
      });
      if (boundsMetrics) {
        templateReference.metrics = {
          ...(templateReference.metrics || {}),
          ...boundsMetrics,
        };
      }
    } catch (error) {
      console.warn('[XiO Creator] Template-copy analysis fell back to metadata.', error);
    }
  }

  if (!templateReference.metrics) {
    templateReference.metrics = {
      attachmentScaleAverage: Number(
        (Array.isArray(templateReference.attachment?.scale)
          ? templateReference.attachment.scale
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0)
            .reduce((sum, value, _, values) => sum + (value / Math.max(values.length, 1)), 0)
          : 1.9).toFixed(3),
      ),
    };
  }

  return templateReference;
}

function setRandomGeneratorStatus(message = '', { tone = 'info' } = {}) {
  if (!randomGeneratorStatus) {
    return;
  }
  if (!message) {
    randomGeneratorStatus.hidden = true;
    randomGeneratorStatus.textContent = '';
    randomGeneratorStatus.removeAttribute('data-tone');
    return;
  }
  randomGeneratorStatus.hidden = false;
  randomGeneratorStatus.dataset.tone = tone;
  randomGeneratorStatus.textContent = message;
}

function setRandomGeneratorBusy(isBusy) {
  randomGeneratorIsBusy = Boolean(isBusy);
  if (randomGeneratorGenerateButton) {
    randomGeneratorGenerateButton.disabled = randomGeneratorIsBusy;
    randomGeneratorGenerateButton.textContent = randomGeneratorIsBusy ? 'Generating...' : 'Generate';
  }
  if (randomGeneratorCancelButton) {
    randomGeneratorCancelButton.disabled = randomGeneratorIsBusy;
  }
  if (randomGeneratorCloseButton) {
    randomGeneratorCloseButton.disabled = randomGeneratorIsBusy;
  }
}

function readRandomGeneratorFormState() {
  return {
    category: randomGeneratorCategorySelect?.value || 'wingSet',
    rarity: randomGeneratorRaritySelect?.value || 'rare',
    themeMode: randomGeneratorThemeModeSelect?.value || 'fullyRandom',
    themeInput: randomGeneratorThemeInput?.value || '',
    detailDensity: randomGeneratorDetailDensitySelect?.value || 'autoByRarity',
    colorHarmonyMode: randomGeneratorColorHarmonySelect?.value || 'auto',
    fitMode: randomGeneratorFitModeSelect?.value || 'useMasterTemplate',
    baseReferenceKey: randomGeneratorBaseReferenceSelect?.value || '',
  };
}

function renderRandomGeneratorSummary() {
  const formState = readRandomGeneratorFormState();
  const summary = buildGeneratorPreviewSummary(formState, {
    baseReferenceOptions: getRandomGeneratorBaseReferenceOptions(),
  });
  if (randomGeneratorSummaryCategory) {
    randomGeneratorSummaryCategory.textContent = summary.categoryLabel;
  }
  if (randomGeneratorSummaryRarity) {
    randomGeneratorSummaryRarity.textContent = summary.rarityLabel;
  }
  if (randomGeneratorSummaryTheme) {
    randomGeneratorSummaryTheme.textContent = summary.themeLabel;
  }
  if (randomGeneratorSummaryDetail) {
    randomGeneratorSummaryDetail.textContent = summary.detailLabel;
  }
  if (randomGeneratorSummaryMaterial) {
    randomGeneratorSummaryMaterial.textContent = summary.materialDirection;
  }
  if (randomGeneratorSummaryFit) {
    randomGeneratorSummaryFit.textContent = summary.fitLabel;
  }
  if (randomGeneratorSummaryReference) {
    randomGeneratorSummaryReference.textContent = summary.baseReferenceLabel;
  }
  if (randomGeneratorSummaryState) {
    randomGeneratorSummaryState.textContent = formState.fitMode === 'copyWingTemplate'
      ? 'Derivative build'
      : randomGeneratorThemeModeSelect?.value === 'guidedTheme'
      ? 'Guided'
      : randomGeneratorThemeModeSelect?.value === 'matchExistingStyle'
        ? 'Style matched'
        : 'Stage first';
  }
  if (randomGeneratorThemeField) {
    randomGeneratorThemeField.hidden = randomGeneratorThemeModeSelect?.value !== 'guidedTheme';
  }
  if (randomGeneratorReferenceHint) {
    randomGeneratorReferenceHint.hidden = formState.fitMode !== 'copyWingTemplate';
  }
}

function populateRandomGeneratorOptions() {
  if (randomGeneratorCategorySelect) {
    randomGeneratorCategorySelect.innerHTML = GENERATOR_CATEGORY_OPTIONS.map((entry) => (
      `<option value="${escapeHtml(entry.value)}"${entry.enabled ? '' : ' disabled'}>${escapeHtml(entry.label)}${entry.enabled ? '' : ' (Coming Soon)'}</option>`
    )).join('');
    randomGeneratorCategorySelect.value = 'wingSet';
  }
  if (randomGeneratorRaritySelect) {
    randomGeneratorRaritySelect.innerHTML = GENERATOR_RARITY_OPTIONS.map((entry) => (
      `<option value="${escapeHtml(entry.value)}">${escapeHtml(entry.label)}</option>`
    )).join('');
    randomGeneratorRaritySelect.value = 'rare';
  }
  if (randomGeneratorThemeModeSelect) {
    randomGeneratorThemeModeSelect.innerHTML = GENERATOR_THEME_MODE_OPTIONS.map((entry) => (
      `<option value="${escapeHtml(entry.value)}">${escapeHtml(entry.label)}</option>`
    )).join('');
    randomGeneratorThemeModeSelect.value = 'fullyRandom';
  }
  if (randomGeneratorDetailDensitySelect) {
    randomGeneratorDetailDensitySelect.innerHTML = GENERATOR_DETAIL_DENSITY_OPTIONS.map((entry) => (
      `<option value="${escapeHtml(entry.value)}">${escapeHtml(entry.label)}</option>`
    )).join('');
    randomGeneratorDetailDensitySelect.value = 'autoByRarity';
  }
  if (randomGeneratorColorHarmonySelect) {
    randomGeneratorColorHarmonySelect.innerHTML = GENERATOR_COLOR_HARMONY_OPTIONS.map((entry) => (
      `<option value="${escapeHtml(entry.value)}">${escapeHtml(entry.label)}</option>`
    )).join('');
    randomGeneratorColorHarmonySelect.value = 'auto';
  }
  if (randomGeneratorFitModeSelect) {
    randomGeneratorFitModeSelect.innerHTML = GENERATOR_FIT_MODE_OPTIONS.map((entry) => (
      `<option value="${escapeHtml(entry.value)}">${escapeHtml(entry.label)}</option>`
    )).join('');
    randomGeneratorFitModeSelect.value = 'useMasterTemplate';
  }
  if (randomGeneratorThemeSuggestions) {
    randomGeneratorThemeSuggestions.innerHTML = GENERATOR_THEME_OPTIONS.map((entry) => (
      `<option value="${escapeHtml(entry.label)}"></option>`
    )).join('');
  }
}

function populateRandomGeneratorBaseReferences() {
  if (!randomGeneratorBaseReferenceSelect) {
    return;
  }
  const references = getRandomGeneratorBaseReferenceOptions();
  const previousValue = randomGeneratorBaseReferenceSelect.value || '';
  randomGeneratorBaseReferenceSelect.innerHTML = [
    '<option value="">Auto Select</option>',
    ...references.map((entry) => {
      const sourceLabel = entry.sourceKind === 'generated'
        ? 'Generated'
        : entry.sourceKind === 'glb'
          ? 'GLB'
          : 'Template';
      return `<option value="${escapeHtml(entry.key)}">${escapeHtml(`${entry.label} · ${sourceLabel}`)}</option>`;
    }),
  ].join('');
  randomGeneratorBaseReferenceSelect.value = references.some((entry) => entry.key === previousValue)
    ? previousValue
    : '';
}

function renderGeneratedStageCard() {
  if (!generatedStageCard) {
    return;
  }
  const draftProp = ensureDraftProp();
  const generatedPreview = draftProp?.preview?.generated;
  if (!isGeneratedPropPreview(draftProp?.preview) || !generatedPreview?.displaySummary) {
    generatedStageCard.hidden = true;
    return;
  }
  generatedStageCard.hidden = false;
  if (generatedStageTitle) {
    generatedStageTitle.textContent = draftProp.label ? `${draftProp.label} staged` : 'Generated wing draft staged';
  }
  if (generatedStageStatus) {
    generatedStageStatus.textContent = state.publishEnabled ? 'Ready to publish' : 'Local only';
  }
  if (generatedStageMessage) {
    generatedStageMessage.textContent = state.publishEnabled
      ? 'This generated wing is staged on XiO and can be tested before you add it to the live inventory.'
      : 'This generated wing is staged locally on XiO and will not go live until you open the manager route and save it.';
  }
  if (generatedStageTheme) {
    generatedStageTheme.textContent = generatedPreview.displaySummary.themeLabel || 'Royal';
  }
  if (generatedStageRarity) {
    generatedStageRarity.textContent = generatedPreview.displaySummary.rarityLabel || 'Rare';
  }
  if (generatedStageMaterial) {
    generatedStageMaterial.textContent = generatedPreview.displaySummary.materialDirection || 'Royal Enamel';
  }
  if (generatedStageFit) {
    generatedStageFit.textContent = generatedPreview.displaySummary.fitLabel || 'XiO Wing Master Template';
  }
}

function closeRandomGeneratorModal({ restoreFocus = true } = {}) {
  if (!randomGeneratorModal) {
    return;
  }
  const lastActiveElement = randomGeneratorLastActiveElement;
  randomGeneratorLastActiveElement = null;
  if (restoreFocus) {
    restoreFocusBeforeHidingModal(lastActiveElement, randomPropGeneratorButton);
  }
  randomGeneratorModal.hidden = true;
  randomGeneratorModal.setAttribute('aria-hidden', 'true');
  setRandomGeneratorBusy(false);
  setRandomGeneratorStatus('');
}

function openRandomGeneratorModal() {
  if (!randomGeneratorModal) {
    return;
  }
  hideCreatorNotice();
  randomGeneratorLastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  populateRandomGeneratorBaseReferences();
  renderRandomGeneratorSummary();
  setRandomGeneratorStatus('Wing generation is stage-first. Copy Wing Template studies the selected wing as a guide, then generates a derivative result instead of cloning it exactly.', { tone: 'info' });
  setRandomGeneratorBusy(false);
  randomGeneratorModal.hidden = false;
  randomGeneratorModal.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => {
    randomGeneratorCategorySelect?.focus();
  }, 0);
}

function trapFocusInsideRandomGenerator(event) {
  if (event.key !== 'Tab' || !randomGeneratorModal || randomGeneratorModal.hidden) {
    return;
  }
  const focusableElements = [...randomGeneratorModal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((element) => (
      element instanceof HTMLElement
      && !element.hasAttribute('disabled')
      && !element.hidden
      && element.getAttribute('aria-hidden') !== 'true'
      && element.offsetParent !== null
    ));
  if (!focusableElements.length) {
    return;
  }
  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

async function generateRandomWingDraftToStage() {
  if (randomGeneratorIsBusy) {
    return;
  }
  setRandomGeneratorBusy(true);
  setRandomGeneratorStatus('Synthesizing a coherent XiO-ready wing recipe...', { tone: 'info' });
  try {
    const formState = readRandomGeneratorFormState();
    const baseReferenceOptions = getRandomGeneratorBaseReferenceOptions();
    const templateReference = await resolveRandomGeneratorTemplateReference(formState, baseReferenceOptions);
    const generation = generateRandomWingDraft(formState, {
      existingProps: getProps(),
      baseReferenceOptions,
      defaultWingMotionPreview: DEFAULT_WING_MOTION_PREVIEW,
      templateReference,
    });
    if (!generation.ok || !generation.draftRecord) {
      throw new Error(generation.error || 'The generator could not create a valid wing recipe.');
    }
    const previewPair = buildGeneratedWingPreview({
      THREE,
      recipe: generation.recipe,
      attachment: generation.draftRecord.attachment,
    });
    if (!previewPair?.left || !previewPair?.right) {
      throw new Error('The generated wing recipe did not produce a valid XiO preview pair.');
    }
    const previewState = prepareDraftTemplatePairStateFromLivePreview(
      previewPair,
      `${generation.draftRecord.label} (generated stage)`,
      generation.draftRecord,
    );
    const draftLoadPlan = buildDraftLoadPlanBase(generation.draftRecord, {
      selectedLivePropKey: null,
      draftCategoryKey: generation.draftRecord.categoryKey,
      draftSourceLabel: `${generation.draftRecord.label} (generated stage)`,
      draftTemplateRoot: previewState?.draftTemplateRoot || null,
      draftTemplatePair: previewState?.draftTemplatePair || null,
      draftTemplateSourceRoot: previewState?.draftTemplateRoot || null,
      draftTemplateSourcePair: previewState?.draftTemplatePair || null,
    });
    commitDraftLoadPlan({
      ...draftLoadPlan,
      ...(previewState || {}),
    }, {
      announceMessage: `Generated ${generation.draftRecord.label} and staged it on XiO.`,
    });
    renderGeneratedStageCard();
    setRandomGeneratorStatus(
      formState.fitMode === 'copyWingTemplate' && templateReference?.label
        ? `${generation.draftRecord.label} is staged on XiO as a derivative build from ${templateReference.label}.`
        : `${generation.draftRecord.label} is staged on XiO and ready for testing or live save.`,
      { tone: 'success' },
    );
    showCreatorNotice({
      tone: 'success',
      eyebrow: 'Generated Draft Ready',
      title: `${generation.draftRecord.label} staged`,
      message: 'The generated wing is loaded on XiO. Review it, tweak it if needed, then save when you are ready.',
      timeoutMs: 5600,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate a coherent XiO wing right now.';
    setRandomGeneratorStatus(message, { tone: 'error' });
  } finally {
    setRandomGeneratorBusy(false);
    renderRandomGeneratorSummary();
  }
}

function launchMysteryBoxTest() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: HOMEPAGE_OPEN_MYSTERY_TEST_REQUEST }, BRIDGE_TARGET_ORIGIN);
    return;
  }
  const existingSession = readHomepageMysteryTestSession();
  const existingOverride = readHomepageMysteryTestOverride();
  const launchToken = buildHomepageMysteryTestLaunchToken({
    propKey: existingSession?.propKey ?? existingOverride?.propKey ?? readHomepageLegacyPinnedMysteryRewardKey(),
    snapshotUpdatedAt: existingSession?.snapshotUpdatedAt ?? existingOverride?.snapshotUpdatedAt ?? state.snapshot?.updatedAt ?? null,
  });
  persistHomepageMysteryTestLaunchToken(launchToken);
  const homePagePath = './index.html';
  window.location.assign(homePagePath);
}

function persistStandaloneMysteryTestReward(propKey, snapshotUpdatedAt = null) {
  const nextSession = buildHomepageMysteryTestSession({
    propKey,
    snapshotUpdatedAt,
    requiredCatalogRevision: snapshotUpdatedAt,
  });
  persistHomepageMysteryTestSession(nextSession);
  const nextOverride = buildHomepageMysteryTestOverride({
    propKey,
    snapshotUpdatedAt,
    createdAt: nextSession?.createdAt,
  });
  persistHomepageMysteryTestOverride(nextOverride);
  persistHomepageLegacyPinnedMysteryRewardKey(propKey);
  return {
    override: nextOverride,
    session: nextSession,
  };
}

function openStandalonePropsDatabase() {
  if (!('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(STANDALONE_PROPS_DB_NAME, STANDALONE_PROPS_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STANDALONE_PROPS_STORE_NAME)) {
        database.createObjectStore(STANDALONE_PROPS_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open standalone props storage.'));
  });
}

async function readStandalonePropsFolderHandle() {
  const database = await openStandalonePropsDatabase();
  if (!database) return null;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STANDALONE_PROPS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(STANDALONE_PROPS_STORE_NAME);
    const request = store.get(STANDALONE_PROPS_FOLDER_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Unable to read the linked props folder.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
    transaction.onabort = () => database.close();
  });
}

async function writeStandalonePropsFolderHandle(handle) {
  const database = await openStandalonePropsDatabase();
  if (!database) return;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STANDALONE_PROPS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STANDALONE_PROPS_STORE_NAME);
    const request = store.put(handle, STANDALONE_PROPS_FOLDER_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Unable to store the linked props folder.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
    transaction.onabort = () => database.close();
  });
}

async function clearStandalonePropsFolderHandle() {
  const database = await openStandalonePropsDatabase();
  if (!database) return;
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STANDALONE_PROPS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STANDALONE_PROPS_STORE_NAME);
    const request = store.delete(STANDALONE_PROPS_FOLDER_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Unable to clear the linked props folder.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
    transaction.onabort = () => database.close();
  });
}

async function queryDirectoryPermissionState(handle, { request = false } = {}) {
  if (!handle) {
    return STANDALONE_FOLDER_STATUS.unlinked;
  }
  if (typeof handle.queryPermission !== 'function') {
    return STANDALONE_FOLDER_STATUS.unsupported;
  }
  let permission = await handle.queryPermission({ mode: 'read' });
  if (permission !== 'granted' && request && typeof handle.requestPermission === 'function') {
    permission = await handle.requestPermission({ mode: 'read' });
  }
  if (permission === 'granted') {
    return STANDALONE_FOLDER_STATUS.linked;
  }
  return STANDALONE_FOLDER_STATUS.relinkRequired;
}

function getStandaloneAssetRelativePath(assetUrl) {
  if (!assetUrl || typeof assetUrl !== 'string') {
    return null;
  }
  const normalized = assetUrl.trim().replace(/\\/g, '/');
  const directPrefix = STANDALONE_PROPS_PREFIXES.find((prefix) => normalized.startsWith(prefix));
  if (directPrefix) {
    return normalized.slice(directPrefix.length);
  }
  try {
    const url = new URL(normalized, window.location.href);
    const pathname = decodeURIComponent(url.pathname).replace(/\\/g, '/');
    const markerIndex = pathname.indexOf(STANDALONE_PROPS_MARKER);
    if (markerIndex >= 0) {
      return pathname.slice(markerIndex + STANDALONE_PROPS_MARKER.length);
    }
  } catch {
    return null;
  }
  return null;
}

function isStandaloneFolderLinkRequired(propRecord) {
  return Boolean(
    IS_FILE_RUNTIME
    && propRecord?.assetUrl
    && !isLiveGameWingPreviewKey(propRecord.key),
  );
}

function isPropProxyReady(propRecord) {
  return Boolean(
    propRecord?.preview?.kind
    || isLiveGameWingPreviewKey(propRecord?.key),
  );
}

async function validateStandalonePropsFolderHandle(handle) {
  if (!handle) return false;
  try {
    await handle.getDirectoryHandle('Wings');
    return true;
  } catch {
    return false;
  }
}

async function walkLinkedPropsFolderToFile(relativePath) {
  const rootHandle = state.standalonePropsFolder.handle;
  if (!rootHandle || !relativePath) {
    return null;
  }

  const segments = relativePath
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (!segments.length) {
    return null;
  }

  let currentHandle = rootHandle;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLast = index === segments.length - 1;
    try {
      if (isLast) {
        const fileHandle = await currentHandle.getFileHandle(segment);
        return await fileHandle.getFile();
      }
      currentHandle = await currentHandle.getDirectoryHandle(segment);
    } catch {
      return null;
    }
  }

  return null;
}

function setStandaloneFolderState(permission, { handle = null, name = '', missingAssetPath = null } = {}) {
  state.standalonePropsFolder.handle = handle;
  state.standalonePropsFolder.permission = permission;
  state.standalonePropsFolder.name = name;
  state.standalonePropsFolder.missingAssetPath = missingAssetPath;
}

const cloneAttachment = (attachment) => ({
  position: [...attachment.position],
  rotation: [...attachment.rotation],
  scale: [...attachment.scale],
  mirrorMode: attachment.mirrorMode || 'single',
  fit: attachment.fit ? { ...attachment.fit } : null,
});

function clonePreviewData(preview) {
  if (!preview || typeof preview !== 'object' || Array.isArray(preview)) {
    return {};
  }
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(preview);
    } catch {
      // Fall back to JSON serialization below.
    }
  }
  try {
    return JSON.parse(JSON.stringify(preview));
  } catch {
    return { ...preview };
  }
}

const createEmptyDraftProp = (categoryKey = 'wingSet') => ({
  key: '',
  label: '',
  categoryKey,
  rarity: 'rare',
  assetUrl: null,
  storagePath: null,
  attachment: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    mirrorMode: 'single',
    fit: null,
  },
  eyePreset: null,
  materialPreset: null,
  mysteryBoxEnabled: true,
  active: true,
  archived: false,
  tags: [],
  description: '',
  preview: {
    wingMotion: clonePreviewData(DEFAULT_WING_MOTION_PREVIEW),
  },
});

function normalizeWingPreviewSide(side, fallback = null) {
  if (side === 'left' || side === 'right') {
    return side;
  }
  return fallback === 'left' || fallback === 'right' ? fallback : null;
}

function cloneWingSyncPreviewState(previewState = state.wingSyncPreview) {
  return {
    mode: previewState?.mode === 'both' || previewState?.mode === 'single' ? previewState.mode : null,
    side: normalizeWingPreviewSide(previewState?.side, null),
  };
}

function syncPanelShellStateLabels() {
  document.querySelectorAll('.panel-shell').forEach((section) => {
    if (!(section instanceof HTMLDetailsElement)) return;
    const stateLabel = section.querySelector('[data-panel-shell-state]');
    if (!stateLabel) return;
    stateLabel.textContent = section.open ? 'Collapse' : 'Expand';
  });
}

function readLeftPanelSectionState() {
  try {
    const raw = window.localStorage.getItem(LEFT_PANEL_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.warn('[XiO Creator] Unable to read left panel state.', error);
    return null;
  }
}

function persistLeftPanelSectionState() {
  const payload = {};
  Object.keys(LEFT_PANEL_SECTION_DEFAULTS).forEach((id) => {
    const section = $(id);
    if (section instanceof HTMLDetailsElement) {
      payload[id] = section.open;
    }
  });
  syncPanelShellStateLabels();
  try {
    window.localStorage.setItem(LEFT_PANEL_STATE_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[XiO Creator] Unable to persist left panel state.', error);
  }
}

function initializeLeftPanelSectionState() {
  const storedState = readLeftPanelSectionState() || {};
  Object.entries(LEFT_PANEL_SECTION_DEFAULTS).forEach(([id, fallbackOpen]) => {
    const section = $(id);
    if (!(section instanceof HTMLDetailsElement)) return;
    section.open = typeof storedState[id] === 'boolean' ? storedState[id] : fallbackOpen;
    section.addEventListener('toggle', persistLeftPanelSectionState);
  });
  syncPanelShellStateLabels();
}

const deepCopyProp = (prop) => ({
  ...prop,
  attachment: cloneAttachment(prop.attachment),
  tags: [...(prop.tags || [])],
  preview: clonePreviewData(prop.preview),
});

function ensureDraftPreviewBucket(draftProp = ensureDraftProp()) {
  if (!draftProp.preview || typeof draftProp.preview !== 'object' || Array.isArray(draftProp.preview)) {
    draftProp.preview = {};
  }
  return draftProp.preview;
}

function getDraftWingAuthoringPreview(draftProp = ensureDraftProp()) {
  return normalizeWingAuthoringPreview(draftProp?.preview?.wingAuthoring, {
    defaultMirrorToBoth: draftProp?.attachment?.mirrorMode === 'paired',
  });
}

function getDraftWingMotionPreview(draftProp = ensureDraftProp()) {
  return normalizeWingMotionPreview(draftProp?.preview?.wingMotion);
}

function setDraftWingAuthoringPreview(authoring, { persist = true } = {}) {
  const draftProp = ensureDraftProp();
  const preview = ensureDraftPreviewBucket(draftProp);
  const normalized = normalizeWingAuthoringPreview(authoring, {
    defaultMirrorToBoth: draftProp?.attachment?.mirrorMode === 'paired',
  });
  if (persist) {
    preview.wingAuthoring = clonePreviewData(normalized);
  }
  return normalized;
}

function clearDraftWingAuthoringPreview() {
  const preview = ensureDraftPreviewBucket();
  delete preview.wingAuthoring;
}

function setDraftWingMotionPreview(motionProfile, { persist = true } = {}) {
  const draftProp = ensureDraftProp();
  const preview = ensureDraftPreviewBucket(draftProp);
  const normalized = normalizeWingMotionPreview(motionProfile);
  if (persist) {
    preview.wingMotion = clonePreviewData(normalized);
  }
  return normalized;
}

function getDefaultWingMotionChannelLabel(profile) {
  return profile?.direction === 'reverse' ? 'Reverse flap' : 'Normal flap';
}

function syncDraftWingMirrorModeFromPreview(draftProp = ensureDraftProp()) {
  if (draftProp?.categoryKey !== 'wingSet') {
    return draftProp?.attachment?.mirrorMode || 'single';
  }
  const authoringPreview = getDraftWingAuthoringPreview(draftProp);
  if (authoringPreview.mode === 'isolatedHalf') {
    draftProp.attachment.mirrorMode = authoringPreview.mirrorToBoth ? 'paired' : 'single';
  }
  return draftProp.attachment.mirrorMode;
}
const MAX_DRAFT_HISTORY_STEPS = 40;
const SLOT_DEPTH_MAGNITUDES = Object.freeze({
  wingSet: 0.9,
  headWear: 0.4,
  faceAccessory: 0.36,
  bodyAccessory: 0.68,
  heldProp: 0.72,
});
const SLOT_STAGE_TARGET_SPANS = Object.freeze({
  wingSet: 4.9,
  headWear: 5.95,
  faceAccessory: 1.2,
  bodyAccessory: 12.54,
  heldProp: 1.75,
});
const HEADWEAR_ROTATION_CANDIDATES = Object.freeze([
  Object.freeze([0, 0, 0]),
  Object.freeze([0, Math.PI, 0]),
]);
const HEADWEAR_AUTO_LOCK_POSITION = Object.freeze([0, 1.55, -1.65]);
const SINGLE_SLOT_AUTO_LOCK_PRESETS = Object.freeze({
  headWear: Object.freeze({
    horizontalSpan: 5.95,
    yOffsetRatio: 0.45,
    zOffsetRatio: -0.13,
    rotationCandidates: HEADWEAR_ROTATION_CANDIDATES,
  }),
  faceAccessory: Object.freeze({
    horizontalSpan: 1.08,
    ySinkRatio: 0.02,
    zSinkRatio: 0.1,
    rotationCandidates: Object.freeze([Object.freeze([0, 0, 0])]),
  }),
  bodyAccessory: Object.freeze({
    horizontalSpan: 12.54,
    ySinkRatio: 0.585318,
    zSinkRatio: 0.28613,
    rotationCandidates: Object.freeze([Object.freeze([0, 0, 0])]),
  }),
  heldProp: Object.freeze({
    horizontalSpan: 1.35,
    ySinkRatio: 0.02,
    zSinkRatio: 0.08,
    rotationCandidates: Object.freeze([Object.freeze([0, 0, 0])]),
  }),
});
const SINGLE_WING_SYNC_TARGET_SPAN = 2.55;
const cloneHistorySnapshot = (snapshot) => ({
  ...snapshot,
  prop: deepCopyProp(snapshot.prop),
  wingSyncPreview: cloneWingSyncPreviewState(snapshot.wingSyncPreview),
});
const createHistorySignature = (snapshot) => JSON.stringify({
  prop: snapshot.prop,
  selectedLivePropKey: snapshot.selectedLivePropKey || null,
  draftCategoryKey: snapshot.draftCategoryKey || '',
  draftSourceLabel: snapshot.draftSourceLabel || '',
  selectionKey: snapshot.selectionKey || null,
  wingSyncPreview: cloneWingSyncPreviewState(snapshot.wingSyncPreview),
});
function getStageSelectionKey() {
  if (state.stageSelection === draftStage.singlePivot) return 'single';
  if (state.stageSelection === draftStage.leftPivot) return 'left';
  if (state.stageSelection === draftStage.rightPivot) return 'right';
  return null;
}
function selectStageSelectionByKey(selectionKey) {
  if (selectionKey === 'right' && draftStage.rightPivot) {
    setStageSelection(draftStage.rightPivot);
    return;
  }
  if (selectionKey === 'left' && draftStage.leftPivot) {
    setStageSelection(draftStage.leftPivot);
    return;
  }
  if (selectionKey === 'single' && draftStage.singlePivot) {
    setStageSelection(draftStage.singlePivot);
    return;
  }
  if (draftStage.leftPivot) {
    setStageSelection(draftStage.leftPivot);
    return;
  }
  if (draftStage.singlePivot) {
    setStageSelection(draftStage.singlePivot);
    return;
  }
  setStageSelection(null);
}
function captureDraftHistorySnapshot() {
  const draftProp = ensureDraftProp();
  return {
    prop: deepCopyProp(draftProp),
    selectedLivePropKey: state.selectedLivePropKey || null,
    draftCategoryKey: state.draftCategoryKey || draftProp.categoryKey || '',
    draftSourceLabel: state.draftSourceLabel || 'No GLB loaded',
    selectionKey: getStageSelectionKey(),
    wingSyncPreview: cloneWingSyncPreviewState(),
  };
}
function renderHistoryControls() {
  const hasUndo = state.history.undoStack.length > 0;
  const hasRedo = state.history.redoStack.length > 0;
  undoAdjustmentButton.disabled = !hasUndo;
  redoAdjustmentButton.disabled = !hasRedo;
  undoAdjustmentButton.title = hasUndo ? 'Undo last adjustment (Ctrl+Z)' : 'Nothing to undo yet.';
  redoAdjustmentButton.title = hasRedo ? 'Redo last adjustment (Ctrl+Shift+Z)' : 'Nothing to redo yet.';
}
function resetDraftHistory() {
  state.history.undoStack = [];
  state.history.redoStack = [];
  state.history.currentSnapshot = cloneHistorySnapshot(captureDraftHistorySnapshot());
  renderHistoryControls();
}
function commitDraftHistoryStep() {
  if (state.history.suspend) {
    return;
  }
  const nextSnapshot = captureDraftHistorySnapshot();
  if (!state.history.currentSnapshot) {
    state.history.currentSnapshot = cloneHistorySnapshot(nextSnapshot);
    renderHistoryControls();
    return;
  }
  if (createHistorySignature(state.history.currentSnapshot) === createHistorySignature(nextSnapshot)) {
    renderHistoryControls();
    return;
  }
  state.history.undoStack.push(cloneHistorySnapshot(state.history.currentSnapshot));
  if (state.history.undoStack.length > MAX_DRAFT_HISTORY_STEPS) {
    state.history.undoStack.shift();
  }
  state.history.currentSnapshot = cloneHistorySnapshot(nextSnapshot);
  state.history.redoStack = [];
  renderHistoryControls();
}
function restoreDraftHistorySnapshot(snapshot) {
  if (!snapshot) {
    return;
  }
  if (state.motionPreviewEnabled) {
    setMotionPreviewEnabled(false, { silent: true });
  }
  state.history.suspend = true;
  state.selectedLivePropKey = snapshot.selectedLivePropKey || null;
  state.draftCategoryKey = snapshot.draftCategoryKey || snapshot.prop.categoryKey || state.draftCategoryKey;
  state.draftProp = deepCopyProp(snapshot.prop);
  state.wingSyncPreview = cloneWingSyncPreviewState(snapshot.wingSyncPreview);
  state.draftSourceLabel = snapshot.draftSourceLabel || 'No GLB loaded';
  refreshDraftTemplatePresentationFromSource();
  rebuildDraftStage();
  selectStageSelectionByKey(snapshot.selectionKey);
  state.history.suspend = false;
  renderAll();
}
function undoDraftAdjustment() {
  if (!state.history.undoStack.length) {
    log('Nothing to undo yet.');
    return;
  }
  const previousSnapshot = state.history.undoStack.pop();
  const currentSnapshot = state.history.currentSnapshot || captureDraftHistorySnapshot();
  state.history.redoStack.push(cloneHistorySnapshot(currentSnapshot));
  state.history.currentSnapshot = cloneHistorySnapshot(previousSnapshot);
  restoreDraftHistorySnapshot(state.history.currentSnapshot);
  log('Undid the last adjustment.');
}
function redoDraftAdjustment() {
  if (!state.history.redoStack.length) {
    log('Nothing to redo yet.');
    return;
  }
  const nextSnapshot = state.history.redoStack.pop();
  const currentSnapshot = state.history.currentSnapshot || captureDraftHistorySnapshot();
  state.history.undoStack.push(cloneHistorySnapshot(currentSnapshot));
  if (state.history.undoStack.length > MAX_DRAFT_HISTORY_STEPS) {
    state.history.undoStack.shift();
  }
  state.history.currentSnapshot = cloneHistorySnapshot(nextSnapshot);
  restoreDraftHistorySnapshot(state.history.currentSnapshot);
  log('Redid the adjustment.');
}

const CREATOR_ONLY_STANDARD_PROPS = Object.freeze([
  Object.freeze({
    key: 'xioNoWings',
    label: 'XiO No Wings',
    categoryKey: 'wingSet',
    rarity: 'common',
    assetUrl: null,
    storagePath: null,
    attachment: Object.freeze({
      position: Object.freeze([0, 0, 0]),
      rotation: Object.freeze([0, 0, 0]),
      scale: Object.freeze([1, 1, 1]),
      mirrorMode: 'single',
      fit: null,
    }),
    eyePreset: null,
    materialPreset: null,
    mysteryBoxEnabled: false,
    active: true,
    archived: false,
    tags: Object.freeze(['xio', 'core', 'clean', 'wingless']),
    description: 'Unequip every wing so XiO is completely clean before you preview or position a new GLB wing set.',
    preview: Object.freeze({ kind: 'xioNoWingProxy' }),
    creatorOnly: true,
  }),
  Object.freeze({
    key: 'xioSignatureGlowWings',
    label: 'XiO Signature Glow Wings',
    categoryKey: 'wingSet',
    rarity: 'common',
    assetUrl: null,
    storagePath: null,
    attachment: Object.freeze({
      position: Object.freeze([0, 0, 0]),
      rotation: Object.freeze([0, 0, 0]),
      scale: Object.freeze([1, 1, 1]),
      mirrorMode: 'single',
      fit: null,
    }),
    eyePreset: null,
    materialPreset: null,
    mysteryBoxEnabled: false,
    active: true,
    archived: false,
    tags: Object.freeze(['xio', 'core', 'default']),
    description: 'XiO\'s built-in blue glow wings for quick equip and unequip previewing.',
    preview: Object.freeze({ kind: 'xioBaseWingProxy' }),
    creatorOnly: true,
  }),
]);

const getCategories = () => [...state.snapshot.categories];
const getProps = () => {
  const props = [...state.snapshot.props];
  CREATOR_ONLY_STANDARD_PROPS.forEach((prop) => {
    if (!props.some((entry) => entry.key === prop.key)) {
      props.unshift(deepCopyProp(prop));
    }
  });
  return props;
};
const getCategoryByKey = (categoryKey) => getCategories().find((entry) => entry.key === categoryKey) || null;
const getSelectedLiveProp = () => getProps().find((entry) => entry.key === state.selectedLivePropKey) || null;

function getHighestCategorySortOrder() {
  return getCategories().reduce((highest, entry) => {
    const sortOrder = Number(entry?.sortOrder);
    return Number.isFinite(sortOrder) && sortOrder > highest ? sortOrder : highest;
  }, -1);
}

function buildNewCategoryDraft() {
  return {
    key: '',
    label: '',
    slotKey: getDraftCategoryRecord()?.slotKey || 'wingSet',
    equipLimit: 1,
    sortOrder: getHighestCategorySortOrder() + 1,
    enabled: true,
  };
}

function getCategoryEditorRecord() {
  return state.categoryEditorKey ? getCategoryByKey(state.categoryEditorKey) : null;
}

function setCategoryEditorKey(categoryKey) {
  state.categoryEditorKey = categoryKey && getCategoryByKey(categoryKey) ? categoryKey : null;
}

function ensureDraftProp() {
  if (!state.draftProp) {
    state.draftProp = createEmptyDraftProp(state.draftCategoryKey);
  }
  return state.draftProp;
}

function setSelectionLabel(label) {
  selectionChip.textContent = label;
  stageSelectionLabel.textContent = label;
}

function hasFileDataTransfer(dataTransfer) {
  if (!dataTransfer) return false;
  if (dataTransfer.files?.length) {
    return true;
  }
  const items = Array.from(dataTransfer.items || []);
  if (items.some((item) => item.kind === 'file')) {
    return true;
  }
  const types = Array.from(dataTransfer.types || []).map((type) => String(type).toLowerCase());
  return types.includes('files') || types.includes('application/x-moz-file');
}

function extractGlbFileFromDataTransfer(dataTransfer) {
  if (!dataTransfer) return null;
  const directFile = dataTransfer.files?.[0];
  if (directFile) {
    return directFile;
  }
  const items = Array.from(dataTransfer.items || []);
  for (const item of items) {
    if (item.kind !== 'file') continue;
    const candidate = item.getAsFile?.();
    if (!candidate) continue;
    if (/\.glb$/i.test(candidate.name) || candidate.type === 'model/gltf-binary') {
      return candidate;
    }
  }
  return null;
}

function releaseDraftObjectUrl() {
  if (!state.draftObjectUrl) return;
  URL.revokeObjectURL(state.draftObjectUrl);
  state.draftObjectUrl = null;
}

function clearDraftTemplateSources({ releaseObjectUrl = false } = {}) {
  if (releaseObjectUrl) {
    releaseDraftObjectUrl();
  }
  state.draftTemplateRoot = null;
  state.draftTemplatePair = null;
  state.draftTemplateSourceRoot = null;
  state.draftTemplateSourcePair = null;
  state.draftLocalFile = null;
}

function isCreatorOnlyPropRecord(propRecord) {
  return Boolean(propRecord?.creatorOnly);
}

function isBlobBackedLocalDraft(propRecord = state.draftProp) {
  return Boolean(
    !state.publishEnabled
    && typeof propRecord?.assetUrl === 'string'
    && propRecord.assetUrl.startsWith('blob:'),
  );
}

function getDraftCategoryRecord() {
  const draftProp = ensureDraftProp();
  return getCategoryByKey(draftProp.categoryKey)
    || getCategoryByKey(state.draftCategoryKey)
    || getCategories()[0]
    || null;
}

function getSlotLabel(slotKey) {
  return XIO_SLOT_DEFINITIONS[slotKey]?.label || slotKey || 'Unassigned';
}

function hasEditableStageProp() {
  const selectedProp = getSelectedLiveProp();
  return Boolean(state.stageSelection) && (!selectedProp || !isCreatorOnlyPropRecord(selectedProp));
}

function getSlotAnchorDepth(categoryKey = ensureDraftProp().categoryKey) {
  const category = getCategoryByKey(categoryKey) || getDraftCategoryRecord();
  if (!category) {
    return 0;
  }
  if (category.slotKey === 'wingSet') {
    return Number(xio.slotAnchors.wingSet?.right?.position?.z) || 0;
  }
  return Number(xio.slotAnchors[category.slotKey]?.anchor?.position?.z) || 0;
}

function getDraftPlacementDepthMode(draftProp = ensureDraftProp()) {
  const currentZ = Number(draftProp?.attachment?.position?.[2]) || 0;
  const absoluteDepth = getSlotAnchorDepth(draftProp?.categoryKey) + currentZ;
  return absoluteDepth < 0 ? 'behind' : 'front';
}

function getSuggestedPlacementDepthMagnitude(draftProp = ensureDraftProp()) {
  return SLOT_DEPTH_MAGNITUDES[draftProp?.categoryKey] || 0.45;
}

function getVisibleLiveProps() {
  return getProps().filter((entry) => isCreatorOnlyPropRecord(entry) || (entry.active !== false && entry.archived !== true));
}

function getFilteredLiveProps() {
  const query = state.liveSearchQuery.trim().toLowerCase();
  return getVisibleLiveProps().filter((prop) => {
    if (state.liveCategoryFilter !== 'all' && prop.categoryKey !== state.liveCategoryFilter) {
      return false;
    }
    if (!query) {
      return true;
    }
    return [
      prop.label,
      prop.key,
      prop.categoryKey,
      prop.rarity,
      prop.description,
      ...(prop.tags || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
}

function getPropAssetAvailability(propRecord) {
  if (!propRecord) {
    return { status: PROP_ASSET_STATUS.appearanceOnly, label: 'Appearance only', tone: 'muted' };
  }
  if (isGeneratedPropPreview(propRecord.preview)) {
    return { status: PROP_ASSET_STATUS.proxyReady, label: 'Generated / runtime-ready', tone: 'success' };
  }
  if (propRecord.preview?.kind === 'xioNoWingProxy') {
    return { status: PROP_ASSET_STATUS.proxyReady, label: 'Built in / proxy-ready', tone: 'info' };
  }
  if (propRecord.preview?.kind === 'xioBaseWingProxy') {
    return { status: PROP_ASSET_STATUS.proxyReady, label: 'Built in / proxy-ready', tone: 'info' };
  }
  if (isLiveGameWingPreviewKey(propRecord.key)) {
    return { status: PROP_ASSET_STATUS.proxyReady, label: 'Built in / proxy-ready', tone: 'info' };
  }
  if (!propRecord.assetUrl) {
    if (propRecord.preview?.kind) {
      return { status: PROP_ASSET_STATUS.proxyReady, label: 'Built in / proxy-ready', tone: 'info' };
    }
    return { status: PROP_ASSET_STATUS.appearanceOnly, label: 'Appearance only', tone: 'muted' };
  }
  if (!IS_FILE_RUNTIME) {
    return { status: PROP_ASSET_STATUS.glbReady, label: 'GLB ready', tone: 'success' };
  }
  if (state.standalonePropsFolder.permission !== STANDALONE_FOLDER_STATUS.linked) {
    return { status: PROP_ASSET_STATUS.needsLink, label: 'Needs linked folder', tone: 'warning' };
  }
  const cachedStatus = state.propAssetAvailability.get(propRecord.key);
  if (cachedStatus?.status === PROP_ASSET_STATUS.missingAsset) {
    return { status: PROP_ASSET_STATUS.missingAsset, label: 'Missing asset', tone: 'danger' };
  }
  return { status: PROP_ASSET_STATUS.glbReady, label: 'GLB ready', tone: 'success' };
}

function getPropAssetBadge(propRecord) {
  return getPropAssetAvailability(propRecord).label;
}

function getPropAssetBadgeTone(propRecord) {
  return getPropAssetAvailability(propRecord).tone;
}

function getLivePropEquipLabel(propRecord) {
  if (state.selectedLivePropKey === propRecord.key) {
    return 'Equipped on XiO';
  }
  if (propRecord.preview?.kind === 'xioNoWingProxy') {
    return 'Unequip Wings';
  }
  if (propRecord.preview?.kind === 'xioBaseWingProxy') {
    return 'Equip Base Wings';
  }
  const availability = getPropAssetAvailability(propRecord);
  if (availability.status === PROP_ASSET_STATUS.needsLink) {
    return 'Link Folder to Equip';
  }
  if (availability.status === PROP_ASSET_STATUS.missingAsset) {
    return 'Missing Local Asset';
  }
  return 'Equip on XiO';
}

function renderStandalonePropsFolderControls() {
  if (!linkPropsFolderButton || !propsFolderStatusChip) {
    return;
  }
  if (!IS_FILE_RUNTIME) {
    linkPropsFolderButton.hidden = true;
    propsFolderStatusChip.hidden = true;
    return;
  }

  linkPropsFolderButton.hidden = false;
  propsFolderStatusChip.hidden = false;
  propsFolderStatusChip.classList.remove('status-chip--success', 'status-chip--warning', 'status-chip--danger');

  if (state.standalonePropsFolder.permission === STANDALONE_FOLDER_STATUS.linked) {
    linkPropsFolderButton.textContent = 'Relink Props Folder';
    if (state.standalonePropsFolder.missingAssetPath) {
      propsFolderStatusChip.textContent = `Asset missing from linked folder · ${state.standalonePropsFolder.missingAssetPath}`;
      propsFolderStatusChip.classList.add('status-chip--danger');
    } else {
      propsFolderStatusChip.textContent = `Local props folder linked${state.standalonePropsFolder.name ? ` · ${state.standalonePropsFolder.name}` : ''}`;
      propsFolderStatusChip.classList.add('status-chip--success');
    }
    return;
  }
  if (state.standalonePropsFolder.permission === STANDALONE_FOLDER_STATUS.relinkRequired) {
    linkPropsFolderButton.textContent = 'Relink Props Folder';
    propsFolderStatusChip.textContent = 'Link required for GLB inventory';
    propsFolderStatusChip.classList.add('status-chip--warning');
    return;
  }
  if (state.standalonePropsFolder.permission === STANDALONE_FOLDER_STATUS.unsupported) {
    linkPropsFolderButton.hidden = true;
    propsFolderStatusChip.textContent = 'This browser cannot link a local props folder.';
    propsFolderStatusChip.classList.add('status-chip--danger');
    return;
  }

  linkPropsFolderButton.textContent = 'Link Props Folder';
  propsFolderStatusChip.textContent = 'Link required for GLB inventory';
  propsFolderStatusChip.classList.add('status-chip--warning');
}

function shouldHideBaseWings(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
  if (!draftProp || !category || category.slotKey !== 'wingSet') {
    return false;
  }
  if (draftProp.preview?.kind === 'xioNoWingProxy') {
    return true;
  }
  return Boolean(state.draftTemplateRoot || state.draftTemplatePair);
}

function isNoWingProxyRecord(propRecord = ensureDraftProp()) {
  return propRecord?.preview?.kind === 'xioNoWingProxy';
}

function isBaseWingProxyRecord(propRecord = ensureDraftProp()) {
  return propRecord?.preview?.kind === 'xioBaseWingProxy';
}

function hasDraftWingPairSource() {
  return Boolean(state.draftTemplatePair?.left && state.draftTemplatePair?.right);
}

function hasDraftWingAuthoringSource() {
  return Boolean(
    state.draftTemplateSourceRoot
    || (state.draftTemplateSourcePair?.left && state.draftTemplateSourcePair?.right),
  );
}

function hasLoadedWingDraftAsset(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
  if (!draftProp || !category || category.slotKey !== 'wingSet') {
    return false;
  }
  return Boolean(
    state.draftTemplateRoot
    || hasDraftWingPairSource()
    || isBaseWingProxyRecord(draftProp),
  );
}

function inferWingSideFromAttachment(attachment = ensureDraftProp().attachment) {
  const positionX = Number(attachment?.position?.[0]) || 0;
  return positionX < 0 ? 'left' : 'right';
}

function getDefaultWingSyncPreviewState({
  draftProp = ensureDraftProp(),
  category = getDraftCategoryRecord(),
  draftTemplateRoot = state.draftTemplateRoot,
  draftTemplatePair = state.draftTemplatePair,
} = {}) {
  if (!draftProp || !category || category.slotKey !== 'wingSet' || isNoWingProxyRecord(draftProp)) {
    return { mode: null, side: null };
  }
  if (isBaseWingProxyRecord(draftProp)) {
    return { mode: 'both', side: 'left' };
  }

  const legacyPreviewSide = normalizeWingPreviewSide(draftProp?.preview?.singleWingSide, null);
  const authoringPreview = getDraftWingAuthoringPreview(draftProp);
  const derivedSide = legacyPreviewSide || authoringPreview.sourceSide || inferWingSideFromAttachment(draftProp.attachment);
  if (authoringPreview.mode === 'isolatedHalf') {
    return {
      mode: authoringPreview.mirrorToBoth ? 'both' : 'single',
      side: derivedSide || (authoringPreview.mirrorToBoth ? 'left' : 'right'),
    };
  }
  const hasTemplatePair = Boolean(draftTemplatePair?.left && draftTemplatePair?.right);
  if (hasTemplatePair || draftProp.attachment?.mirrorMode === 'paired') {
    return { mode: 'both', side: derivedSide || 'left' };
  }
  if (draftTemplateRoot) {
    return { mode: 'single', side: derivedSide || 'right' };
  }
  return { mode: null, side: derivedSide };
}

function setWingSyncPreviewState(mode, side = null) {
  state.wingSyncPreview = {
    mode: mode === 'both' || mode === 'single' ? mode : null,
    side: normalizeWingPreviewSide(side, state.wingSyncPreview?.side),
  };
  if (!state.wingSyncPreview.mode) {
    state.wingSyncPreview.side = null;
  } else if (!state.wingSyncPreview.side) {
    state.wingSyncPreview.side = state.wingSyncPreview.mode === 'both' ? 'left' : 'right';
  }
}

function resetWingSyncPreviewState(options = {}) {
  state.wingSyncPreview = cloneWingSyncPreviewState(getDefaultWingSyncPreviewState(options));
  return state.wingSyncPreview;
}

function getDraftWingSingleSide(draftProp = ensureDraftProp()) {
  const defaultState = getDefaultWingSyncPreviewState({ draftProp });
  return normalizeWingPreviewSide(state.wingSyncPreview?.side, defaultState.side || 'right');
}

function setDraftWingSingleSide(side) {
  const normalizedSide = normalizeWingPreviewSide(side, getDraftWingSingleSide());
  setWingSyncPreviewState('single', normalizedSide);
}

function clearDraftWingSingleSide() {
  state.wingSyncPreview.side = null;
}

function getWingSingleAnchorForDraft(draftProp = ensureDraftProp()) {
  return getDraftWingSingleSide(draftProp) === 'left'
    ? xio.slotAnchors.wingSet.left
    : xio.slotAnchors.wingSet.right;
}

function getEffectiveWingSyncPreviewMode(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
  if (!draftProp || !category || category.slotKey !== 'wingSet' || isNoWingProxyRecord(draftProp)) {
    return null;
  }
  if (isBaseWingProxyRecord(draftProp)) {
    return 'both';
  }
  if (state.wingSyncPreview?.mode === 'both' || state.wingSyncPreview?.mode === 'single') {
    return state.wingSyncPreview.mode;
  }
  return getDefaultWingSyncPreviewState({ draftProp, category }).mode;
}

function getEffectiveWingSyncPreviewSide(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
  if (!draftProp || !category || category.slotKey !== 'wingSet') {
    return 'right';
  }
  const defaultState = getDefaultWingSyncPreviewState({ draftProp, category });
  return normalizeWingPreviewSide(state.wingSyncPreview?.side, defaultState.side || 'right');
}

function canSyncBothWings(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
  if (!draftProp || !category || category.slotKey !== 'wingSet' || isNoWingProxyRecord(draftProp)) {
    return false;
  }
  return hasLoadedWingDraftAsset(draftProp, category);
}

function canSyncOneWing(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
  if (!draftProp || !category || category.slotKey !== 'wingSet') {
    return false;
  }
  if (isNoWingProxyRecord(draftProp) || isBaseWingProxyRecord(draftProp)) {
    return false;
  }
  return Boolean(state.draftTemplateRoot || hasDraftWingPairSource());
}

function syncBaseWingVisibility(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
  const shouldHide = shouldHideBaseWings(draftProp, category);
  xio.leftWingBaseMesh.visible = !shouldHide;
  xio.rightWingBaseMesh.visible = !shouldHide;
}

function renderWorkspaceState() {
  const draftProp = ensureDraftProp();
  const selectedProp = getSelectedLiveProp();
  const category = getDraftCategoryRecord();
  const isCreatorOnly = isCreatorOnlyPropRecord(draftProp);
  const hasLiveStageProp = Boolean(state.stageSelection && selectedProp) && !isCreatorOnlyPropRecord(selectedProp);
  const hasDraftStageProp = Boolean(state.stageSelection) && !selectedProp;
  const localBlobDraft = isBlobBackedLocalDraft(draftProp);

  const draftOriginLabel = selectedProp
    ? (isCreatorOnlyPropRecord(selectedProp) ? 'XiO standard asset' : 'Live inventory')
    : localBlobDraft
      ? 'Local upload'
      : isGeneratedPropPreview(draftProp.preview)
        ? 'Generated stage'
      : draftProp.assetUrl
        ? (state.publishEnabled ? 'Uploaded draft asset' : 'Draft asset reference')
        : (draftProp.eyePreset || draftProp.materialPreset || draftProp.label ? 'Workspace draft' : 'Fresh draft');

  draftOriginChip.textContent = draftOriginLabel;
  draftSourceInline.textContent = state.draftSourceLabel || 'No GLB loaded';
  draftCategoryLabel.textContent = category?.label || 'Unassigned';
  const wingPreviewMode = getEffectiveWingSyncPreviewMode(draftProp, category);
  const wingPreviewLabel = category?.slotKey === 'wingSet'
    ? (
      isNoWingProxyRecord(draftProp)
        ? 'No wings'
        : wingPreviewMode === 'both'
          ? 'Both wings preview'
          : wingPreviewMode === 'single'
            ? `One wing preview (${getEffectiveWingSyncPreviewSide(draftProp, category)})`
            : draftProp.attachment?.mirrorMode === 'paired'
              ? 'Mirrored pair'
              : ''
    )
    : '';
  draftSlotLabel.textContent = `${getSlotLabel(category?.slotKey)}${wingPreviewLabel ? ` · ${wingPreviewLabel}` : ''}`;
  currentAssetLabel.textContent = state.draftSourceLabel || 'No GLB loaded';

  if (state.editSession.active) {
    setSelectionLabel(`Editing ${state.editSession.baselineProp?.label || draftProp.label || 'current prop'}`);
    stageHintLabel.textContent = 'Adjust the selected prop directly in the stage, then Save Edit or Cancel.';
    if (transformSection) transformSection.open = true;
  } else if (state.motionPreviewEnabled) {
    setSelectionLabel(`Previewing ${selectedProp?.label || draftProp.label || 'XiO motion'}`);
    stageHintLabel.textContent = 'Motion preview is running. Pause preview when you want precise transform edits.';
  } else if (hasLiveStageProp) {
    setSelectionLabel(`Ready: ${selectedProp?.label || draftProp.label || 'current prop'}`);
    stageHintLabel.textContent = 'Prop is loaded on XiO. Click Edit Prop when you want resize, move, or rotate controls.';
  } else if (hasDraftStageProp) {
    setSelectionLabel(`Draft: ${draftProp.label || 'current prop'}`);
    stageHintLabel.textContent = 'Local draft is loaded on XiO. Use the transform section or drag the gizmo directly to refine placement.';
  } else if (selectedProp) {
    setSelectionLabel(`Equipped: ${selectedProp.label}`);
    stageHintLabel.textContent = selectedProp.preview?.kind === 'xioNoWingProxy'
      ? 'XiO is now in a clean no-wings state. Drop a GLB or equip another wing set when you are ready.'
      : isCreatorOnlyPropRecord(selectedProp)
        ? 'XiO signature wings are active. Equip another prop to edit transforms.'
        : 'Live prop equipped. Use Focus Prop for inspection or Edit Prop for transform tools.';
  } else {
    setSelectionLabel('Draft Mode');
    stageHintLabel.textContent = '';
  }

  publishPropButton.textContent = isCreatorOnly
    ? 'Built-in XiO Asset'
    : localBlobDraft && !state.publishEnabled
      ? 'Manager Route Required'
      : state.publishEnabled
        ? (state.editSession.active ? 'Save to Live Game' : 'Add Prop to Game')
        : 'Save Draft Locally';
  publishPropButton.disabled = isCreatorOnly || localBlobDraft;
  publishPropButton.title = localBlobDraft
    ? 'Standalone local drafts cannot persist dropped GLB files after refresh. Open the manager route to publish this asset.'
    : '';

  archivePropButton.disabled = !selectedProp || isCreatorOnlyPropRecord(selectedProp);
  archivePropButton.title = archivePropButton.disabled
    ? 'Archive is available for live catalog props only.'
    : '';
  loadSelectedLiveButton.disabled = !state.selectedLivePropKey;

  if (localBlobDraft && !state.publishEnabled && !state.editSession.active) {
    publishStateLabel.textContent = 'Local GLB preview only';
  }
}

function clearEditSession() {
  state.editSession.active = false;
  state.editSession.propKey = null;
  state.editSession.baselineProp = null;
}

function startEditSession(propRecord) {
  state.editSession.active = true;
  state.editSession.propKey = propRecord.key;
  state.editSession.baselineProp = deepCopyProp(propRecord);
}

function renderEditSessionControls() {
  const isEditing = state.editSession.active;
  const baselineLabel = state.editSession.baselineProp?.label;
  const currentLabel = getSelectedLiveProp()?.label || ensureDraftProp().label || 'current prop';
  const selectedProp = getSelectedLiveProp();
  const hasLiveEditableStageProp = Boolean(state.stageSelection && selectedProp) && !isCreatorOnlyPropRecord(selectedProp);
  editSessionGroup.hidden = !isEditing;
  editSessionLabel.textContent = isEditing ? `Editing ${baselineLabel || currentLabel}` : 'Editing current prop';
  saveEditButton.disabled = !isEditing;
  cancelEditButton.disabled = !isEditing;
  editPropToolbarButton.disabled = !hasLiveEditableStageProp;
}

function renderStageToolbarControls() {
  const selectedProp = getSelectedLiveProp();
  const draftProp = ensureDraftProp();
  const category = getDraftCategoryRecord();
  const canUseTransformShortcuts = hasEditableStageProp() && !state.motionPreviewEnabled;
  const canUseAutoLockFit = canAutoLockCurrentDraft(draftProp, category);
  const canUseBothWingSync = canSyncBothWings(draftProp, category);
  const canUseOneWingSync = canSyncOneWing(draftProp, category);
  const activeWingSyncMode = getEffectiveWingSyncPreviewMode(draftProp, category);
  const placementDepthMode = getDraftPlacementDepthMode();
  const toggleToFront = placementDepthMode === 'behind';
  const placementActionLabel = toggleToFront ? 'Bring prop in front of XiO' : 'Send prop behind XiO';

  motionPreviewButton.textContent = state.motionPreviewEnabled ? 'Pause Preview' : 'Play Preview';
  motionPreviewButton.classList.toggle('is-active', state.motionPreviewEnabled);
  motionPreviewButton.setAttribute('aria-pressed', state.motionPreviewEnabled ? 'true' : 'false');

  autoLockFitButton.disabled = !canUseAutoLockFit;
  autoLockFitButton.setAttribute('aria-pressed', 'false');
  autoLockFitButton.title = canUseAutoLockFit
    ? category?.slotKey === 'headWear'
      ? 'Detect the best XiO headwear fit, snap the crown or hat into place, then fine-tune it manually.'
      : `Snap this ${category?.label || 'single-slot prop'} into XiO’s ${category?.label || 'active'} slot and seed the transform controls.`
    : category?.slotKey === 'wingSet'
      ? 'Auto Lock / Auto Fit is for headwear and body gear single-slot props.'
      : 'Load or drop a single-slot GLB into the XiO stage before using Auto Lock / Auto Fit.';

  syncBothWingsButton.disabled = !canUseBothWingSync;
  syncBothWingsButton.classList.toggle('is-active', canUseBothWingSync && activeWingSyncMode === 'both');
  syncBothWingsButton.setAttribute('aria-pressed', canUseBothWingSync && activeWingSyncMode === 'both' ? 'true' : 'false');
  syncBothWingsButton.title = canUseBothWingSync
    ? isBaseWingProxyRecord(draftProp)
      ? 'Confirm XiO signature glow wings in full two-wing motion preview.'
      : 'Preview this wing as a full two-wing sync on XiO.'
    : category?.slotKey !== 'wingSet'
      ? 'Sync Both Wings is available only for wing props.'
      : isNoWingProxyRecord(draftProp)
        ? 'Equip or drop a wing first, then sync both wings.'
        : 'Load a wing into the XiO stage before syncing both wings.';

  syncOneWingButton.disabled = !canUseOneWingSync;
  syncOneWingButton.classList.toggle('is-active', canUseOneWingSync && activeWingSyncMode === 'single');
  syncOneWingButton.setAttribute('aria-pressed', canUseOneWingSync && activeWingSyncMode === 'single' ? 'true' : 'false');
  syncOneWingButton.title = canUseOneWingSync
    ? 'Preview just one wing side while XiO keeps native flap motion.'
    : category?.slotKey !== 'wingSet'
      ? 'Sync One Wing is available only for wing props.'
      : isNoWingProxyRecord(draftProp)
        ? 'Equip or drop a wing first, then sync one wing.'
        : isBaseWingProxyRecord(draftProp)
          ? 'XiO base glow wings always preview as a full two-wing set.'
          : 'Load a wing into the XiO stage before syncing one wing.';

  turntableButton.textContent = state.turntableEnabled ? 'Turntable On' : 'Turntable Off';
  turntableButton.classList.toggle('is-active', state.turntableEnabled && !state.motionPreviewEnabled);
  turntableButton.disabled = state.motionPreviewEnabled;
  turntableButton.title = state.motionPreviewEnabled
    ? 'Pause motion preview before using the turntable.'
    : '';

  stageTransformShortcutButtons.forEach((button) => {
    const modeLabel = button.dataset.transformMode === 'translate'
      ? 'Move'
      : button.dataset.transformMode === 'rotate'
        ? 'Rotate'
        : 'Scale';
    button.disabled = !canUseTransformShortcuts;
    button.title = canUseTransformShortcuts
      ? modeLabel
      : state.motionPreviewEnabled
        ? 'Pause preview before editing this prop.'
        : selectedProp && isCreatorOnlyPropRecord(selectedProp)
          ? 'XiO signature wings use built-in motion and do not expose transform handles.'
          : 'Equip a live or draft prop to use transform shortcuts.';
  });

  togglePlacementDepthButton.disabled = !canUseTransformShortcuts;
  togglePlacementDepthButton.classList.toggle('is-active', placementDepthMode === 'front' && canUseTransformShortcuts);
  togglePlacementDepthButton.setAttribute('aria-pressed', placementDepthMode === 'front' && canUseTransformShortcuts ? 'true' : 'false');
  togglePlacementDepthButton.setAttribute('aria-label', placementActionLabel);
  togglePlacementDepthButton.title = canUseTransformShortcuts
    ? placementActionLabel
    : state.motionPreviewEnabled
      ? 'Pause preview before moving this prop in front of or behind XiO.'
      : selectedProp && isCreatorOnlyPropRecord(selectedProp)
        ? 'XiO signature wing states do not expose placement depth controls.'
        : 'Equip a live or draft prop to move it in front of or behind XiO.';
}

function formatWingMotionValue(controlKey, value) {
  if (controlKey === 'direction') {
    return value === 'reverse' ? 'Reverse' : 'Normal';
  }
  if (controlKey === 'phaseOffset' || controlKey === 'pitch' || controlKey === 'shoulderSpread') {
    return Number(value).toFixed(2);
  }
  return Number(value).toFixed(2);
}

function syncWingMotionInputGroup(groupKey, profile, { disabled = false } = {}) {
  const controls = wingMotionInputs[groupKey];
  const valueLabels = wingMotionValueLabels[groupKey];
  if (!controls) {
    return;
  }
  Object.entries(controls).forEach(([controlKey, input]) => {
    if (!input) return;
    const rawValue = profile?.[controlKey];
    input.disabled = disabled;
    input.value = controlKey === 'direction'
      ? (rawValue === 'reverse' ? 'reverse' : 'normal')
      : String(rawValue ?? input.value);
    if (valueLabels?.[controlKey]) {
      valueLabels[controlKey].textContent = formatWingMotionValue(controlKey, rawValue ?? input.value);
    }
  });
}

function renderWingAuthoringControls() {
  const draftProp = ensureDraftProp();
  const category = getDraftCategoryRecord();
  const isWingDraft = category?.slotKey === 'wingSet';
  const canUseWingAuthoring = isWingDraft
    && !isNoWingProxyRecord(draftProp)
    && !isBaseWingProxyRecord(draftProp)
    && hasDraftWingAuthoringSource();

  if (wingSourceSection) {
    wingSourceSection.hidden = !isWingDraft;
  }
  if (!isWingDraft || !wingSourceSection) {
    return;
  }

  const authoringPreview = getDraftWingAuthoringPreview(draftProp);
  const usingPairSource = Boolean(state.draftTemplateSourcePair?.left && state.draftTemplateSourcePair?.right);
  const sourceLabel = authoringPreview.mode === 'isolatedHalf'
    ? `${authoringPreview.sourceSide === 'right' ? 'Right' : 'Left'} half isolated`
    : usingPairSource
      ? 'Original pair source'
      : 'Original GLB';
  const mirrorLabel = authoringPreview.mode === 'isolatedHalf'
    ? (authoringPreview.mirrorToBoth ? 'Mirrored to both wings' : `${authoringPreview.sourceSide === 'right' ? 'Right' : 'Left'} wing only`)
    : draftProp.attachment?.mirrorMode === 'paired'
      ? 'Original mirrored pair'
      : 'Original single wing';

  wingAuthoringSourceLabel.textContent = sourceLabel;
  wingAuthoringModeLabel.textContent = mirrorLabel;
  wingAutoIsolateButton.disabled = !canUseWingAuthoring;
  wingAutoIsolateButton.title = canUseWingAuthoring
    ? 'Auto-isolate one wing half from the loaded source and prepare it for mirroring.'
    : 'Load a wing GLB or live wing prop before isolating a wing source.';
  wingResetSourceButton.disabled = !canUseWingAuthoring || authoringPreview.mode !== 'isolatedHalf';
  wingUseLeftButton.disabled = !canUseWingAuthoring;
  wingUseRightButton.disabled = !canUseWingAuthoring;
  wingUseLeftButton.classList.toggle('is-active', authoringPreview.sourceSide !== 'right');
  wingUseRightButton.classList.toggle('is-active', authoringPreview.sourceSide === 'right');
  wingMirrorBothToggle.checked = authoringPreview.mirrorToBoth;
  wingMirrorBothToggle.disabled = !canUseWingAuthoring || authoringPreview.mode !== 'isolatedHalf';
  wingSplitOffsetInput.value = String(authoringPreview.splitOffset);
  wingTrimMarginInput.value = String(authoringPreview.trimMargin);
  wingSplitOffsetInput.disabled = !canUseWingAuthoring || authoringPreview.mode !== 'isolatedHalf' || usingPairSource;
  wingTrimMarginInput.disabled = !canUseWingAuthoring || authoringPreview.mode !== 'isolatedHalf' || usingPairSource;
  wingSplitOffsetValue.textContent = Number(authoringPreview.splitOffset).toFixed(2);
  wingTrimMarginValue.textContent = Number(authoringPreview.trimMargin).toFixed(2);
}

function renderWingMotionControls() {
  const draftProp = ensureDraftProp();
  const category = getDraftCategoryRecord();
  const isWingDraft = category?.slotKey === 'wingSet';
  const canTuneWingMotion = canTuneCurrentWingMotion(draftProp, category);

  if (wingMotionSection) {
    wingMotionSection.hidden = !isWingDraft;
  }
  if (!isWingDraft || !wingMotionSection) {
    return;
  }

  const motionPreview = getDraftWingMotionPreview(draftProp);
  const resolvedProfiles = resolveWingMotionProfiles(motionPreview);
  wingMotionPreviewButton.textContent = state.motionPreviewEnabled ? 'Pause Motion Preview' : 'Play Motion Preview';
  wingMotionPreviewButton.classList.toggle('is-active', state.motionPreviewEnabled);
  wingMotionPreviewButton.disabled = !canTuneWingMotion;
  wingMotionLinkedToggle.checked = motionPreview.linked !== false;
  wingMotionLinkedToggle.disabled = !canTuneWingMotion;
  wingMotionMasterCard.hidden = false;
  wingMotionLeftCard.hidden = motionPreview.linked !== false;
  wingMotionRightCard.hidden = motionPreview.linked !== false;
  wingMotionMasterChip.textContent = motionPreview.linked !== false
    ? 'Both wings'
    : getDefaultWingMotionChannelLabel(resolvedProfiles.master);

  syncWingMotionInputGroup('master', resolvedProfiles.master, { disabled: !canTuneWingMotion });
  syncWingMotionInputGroup('left', resolvedProfiles.left, { disabled: !canTuneWingMotion || motionPreview.linked !== false });
  syncWingMotionInputGroup('right', resolvedProfiles.right, { disabled: !canTuneWingMotion || motionPreview.linked !== false });
}

function setMotionPreviewEnabled(enabled, { silent = false } = {}) {
  const nextEnabled = Boolean(enabled);
  if (state.motionPreviewEnabled === nextEnabled) {
    renderStageToolbarControls();
    return;
  }
  state.motionPreviewEnabled = nextEnabled;
  if (nextEnabled) {
    resetPreviewMotionPose();
    presentCurrentLoadInStage();
    if (!silent) {
      log('Motion preview started. XiO is now animating with live flap and hover movement.');
    }
  } else {
    resetPreviewMotionPose();
    if (!silent) {
      log('Motion preview paused.');
    }
  }
  transformControls.visible = Boolean(state.stageSelection) && !nextEnabled;
  renderAll();
}

function setTransformMode(mode) {
  state.transformMode = mode;
  transformControls.setMode(state.transformMode);
  transformModeButtons.forEach((entry) => {
    entry.classList.toggle('is-active', entry.dataset.transformMode === mode);
    entry.setAttribute('aria-pressed', entry.dataset.transformMode === mode ? 'true' : 'false');
  });
}

function updatePublishStatus() {
  publishModeChip.textContent = state.publishEnabled ? 'Live Publish Enabled' : 'Local Draft Mode';
  publishStateLabel.textContent = state.publishEnabled
    ? 'Connected to manager host'
    : (state.publishReason || 'Saving locally only');
}

function setDraftCategoryKey(categoryKey) {
  state.draftCategoryKey = categoryKey;
  const draftProp = ensureDraftProp();
  draftProp.categoryKey = categoryKey;
  if (categoryKey !== 'wingSet' && draftProp.attachment.mirrorMode === 'paired') {
    draftProp.attachment.mirrorMode = 'single';
  }
  if (categoryKey !== 'wingSet') {
    setWingSyncPreviewState(null, null);
    clearDraftWingAuthoringPreview();
  }
  propMirrorToggle.checked = draftProp.attachment.mirrorMode === 'paired';
  propMirrorToggle.disabled = categoryKey !== 'wingSet';
}

function syncPropForm() {
  const draftProp = ensureDraftProp();
  propLabelInput.value = draftProp.label || '';
  propKeyInput.value = draftProp.key || '';
  propCategorySelect.value = draftProp.categoryKey || getCategories()[0]?.key || '';
  propRaritySelect.value = draftProp.rarity || 'rare';
  propDescriptionInput.value = draftProp.description || '';
  propTagsInput.value = (draftProp.tags || []).join(', ');
  propActiveToggle.checked = draftProp.active !== false;
  propMysteryToggle.checked = draftProp.mysteryBoxEnabled !== false;
  propMirrorToggle.checked = draftProp.categoryKey === 'wingSet'
    ? getDraftWingAuthoringPreview(draftProp).mirrorToBoth
    : draftProp.attachment.mirrorMode === 'paired';
  propMirrorToggle.disabled = draftProp.categoryKey !== 'wingSet';
  eyePresetSelect.value = draftProp.eyePreset || '';
  materialPresetSelect.value = draftProp.materialPreset || '';
  transformInputs.position.forEach((input, index) => { input.value = String(draftProp.attachment.position[index] ?? 0); });
  transformInputs.rotation.forEach((input, index) => { input.value = String(draftProp.attachment.rotation[index] ?? 0); });
  transformInputs.scale.forEach((input, index) => { input.value = String(draftProp.attachment.scale[index] ?? 1); });
  currentAssetLabel.textContent = state.draftSourceLabel;
}

function syncCategoryForm(category) {
  const currentCategory = category === undefined
    ? (getCategoryEditorRecord() || null)
    : category;
  const categoryDraft = currentCategory || buildNewCategoryDraft();
  categoryKeyInput.value = currentCategory?.key || '';
  categoryLabelInput.value = categoryDraft.label || '';
  categorySlotSelect.value = categoryDraft.slotKey || 'wingSet';
  categoryEquipLimitInput.value = String(categoryDraft.equipLimit ?? 1);
  categorySortOrderInput.value = String(categoryDraft.sortOrder ?? 0);
  categoryEnabledToggle.checked = categoryDraft.enabled !== false;
  if (categoryEditorSelect) {
    categoryEditorSelect.value = currentCategory?.key || CATEGORY_EDITOR_NEW_VALUE;
  }
  if (deleteCategoryButton) {
    const isProtectedCategory = Boolean(currentCategory?.key && CORE_CATEGORY_KEYS.has(currentCategory.key));
    deleteCategoryButton.disabled = !currentCategory?.key || isProtectedCategory;
    deleteCategoryButton.title = isProtectedCategory
      ? 'XiO core categories stay available.'
      : currentCategory?.key
        ? `Delete ${currentCategory.label}`
        : 'Select a saved category to delete it.';
  }
}

function renderCategoryOptions() {
  const categories = getCategories();
  propCategorySelect.innerHTML = categories
    .map((category) => `<option value="${category.key}">${category.label}</option>`)
    .join('');
  if (categoryEditorSelect) {
    categoryEditorSelect.innerHTML = [
      `<option value="${CATEGORY_EDITOR_NEW_VALUE}">Add New Category</option>`,
      ...categories.map((category) => `<option value="${category.key}">${category.label}</option>`),
    ].join('');
  }
  liveCategoryFilter.innerHTML = [
    '<option value="all">All categories</option>',
    ...categories.map((category) => `<option value="${category.key}">${category.label}</option>`),
  ].join('');
  categorySlotSelect.innerHTML = Object.values(XIO_SLOT_DEFINITIONS)
    .filter((slot) => slot.mode !== 'appearance')
    .map((slot) => `<option value="${slot.key}">${slot.label}</option>`)
    .join('');
  if (!categories.find((entry) => entry.key === state.draftCategoryKey) && categories[0]) {
    state.draftCategoryKey = categories[0].key;
  }
  if (!categories.find((entry) => entry.key === ensureDraftProp().categoryKey) && categories[0]) {
    setDraftCategoryKey(categories[0].key);
  }
  if (state.liveCategoryFilter !== 'all' && !categories.find((entry) => entry.key === state.liveCategoryFilter)) {
    state.liveCategoryFilter = 'all';
  }
  if (state.categoryEditorKey && !categories.find((entry) => entry.key === state.categoryEditorKey)) {
    state.categoryEditorKey = null;
  }
  propCategorySelect.value = ensureDraftProp().categoryKey || state.draftCategoryKey;
  liveCategoryFilter.value = state.liveCategoryFilter;
  categorySlotSelect.value = getCategoryByKey(state.draftCategoryKey)?.slotKey || categorySlotSelect.value;
  if (categoryEditorSelect) {
    categoryEditorSelect.value = state.categoryEditorKey || CATEGORY_EDITOR_NEW_VALUE;
  }
}

function renderPresetOptions() {
  eyePresetSelect.innerHTML = [
    '<option value="">Default</option>',
    ...Object.keys(XIO_EYE_APPEARANCE_PRESETS)
      .filter((key) => key !== 'default')
      .map((key) => `<option value="${key}">${key}</option>`),
  ].join('');
  materialPresetSelect.innerHTML = [
    '<option value="">Default</option>',
    ...Object.keys(XIO_MATERIAL_PRESETS)
      .filter((key) => key !== 'default')
      .map((key) => `<option value="${key}">${key}</option>`),
  ].join('');
}

function createAlphaWingPreviewTemplate() {
  const root = new THREE.Group();
  const colors = [0x7fe8ff, 0xa5f3fc, 0xe0f2fe];
  colors.forEach((color, index) => {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(1.3 - (index * 0.16), 0.14 + (index * 0.03), 0.08),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.42,
        roughness: 0.2,
        metalness: 0.28,
      }),
    );
    blade.position.set(0.38 + (index * 0.34), 0.18 - (index * 0.12), index * 0.04);
    blade.rotation.z = -0.3 - (index * 0.18);
    root.add(blade);
  });
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 20, 20),
    new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      emissive: 0x7dd3fc,
      emissiveIntensity: 0.22,
      roughness: 0.32,
      metalness: 0.24,
    }),
  );
  core.position.set(0.08, 0.02, 0);
  root.add(core);
  return root;
}

function createRainbowWingPreviewTemplate() {
  const root = new THREE.Group();
  const palette = [0xff6b6b, 0xffb347, 0xfff275, 0x7ee787, 0x7dd3fc, 0xc084fc];
  palette.forEach((color, index) => {
    const feather = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.08 + (index * 0.01), 0.7 + (index * 0.08), 6, 14),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.12,
        roughness: 0.5,
        metalness: 0.06,
      }),
    );
    feather.position.set(0.25 + (index * 0.18), 0.34 - (index * 0.11), (index - 2.5) * 0.035);
    feather.rotation.z = -0.18 - (index * 0.12);
    root.add(feather);
  });
  return root;
}

function createRoboticWingPreviewTemplate() {
  const root = new THREE.Group();
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0x9aa8bc,
    emissive: 0x5eead4,
    emissiveIntensity: 0.08,
    roughness: 0.34,
    metalness: 0.92,
  });
  [
    { size: [0.55, 0.18, 0.08], pos: [0.24, 0.18, 0.02], rot: -0.1 },
    { size: [0.74, 0.2, 0.08], pos: [0.62, 0.02, 0], rot: -0.28 },
    { size: [0.88, 0.22, 0.08], pos: [1.02, -0.18, -0.02], rot: -0.44 },
  ].forEach((panelConfig) => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(...panelConfig.size),
      panelMaterial.clone(),
    );
    panel.position.set(...panelConfig.pos);
    panel.rotation.z = panelConfig.rot;
    root.add(panel);
  });
  const strut = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1.25, 12),
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.26,
      metalness: 0.95,
    }),
  );
  strut.position.set(0.58, -0.04, 0);
  strut.rotation.z = -0.44;
  strut.rotation.x = Math.PI / 2;
  root.add(strut);
  return root;
}

function createOmegaWingPreviewTemplate() {
  const root = new THREE.Group();
  const membrane = new THREE.Mesh(
    new THREE.SphereGeometry(0.68, 22, 18, Math.PI * 1.12, Math.PI * 0.58, 0.32, Math.PI * 0.78),
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x67e8f9,
      emissiveIntensity: 0.18,
      roughness: 0.16,
      metalness: 0.08,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    }),
  );
  membrane.position.set(0.72, 0.02, 0);
  membrane.rotation.z = -0.46;
  membrane.scale.set(1.08, 1.2, 0.16);
  root.add(membrane);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.04, 12, 36, Math.PI * 0.92),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      emissive: 0x93c5fd,
      emissiveIntensity: 0.24,
      roughness: 0.24,
      metalness: 0.4,
    }),
  );
  rim.position.set(0.52, 0.05, 0);
  rim.rotation.z = -0.76;
  root.add(rim);
  return root;
}

function createLegacyWingPreviewTemplate(propRecord) {
  const previewKind = propRecord?.preview?.kind;
  let root = null;
  switch (previewKind) {
    case 'alphaWingProxy':
      root = createAlphaWingPreviewTemplate();
      break;
    case 'rainbowWingProxy':
      root = createRainbowWingPreviewTemplate();
      break;
    case 'roboticWingProxy':
      root = createRoboticWingPreviewTemplate();
      break;
    case 'omegaWingProxy':
      root = createOmegaWingPreviewTemplate();
      break;
    default:
      return null;
  }
  const scaleMultiplier = {
    alphaWingProxy: 3.2,
    rainbowWingProxy: 2.3,
    roboticWingProxy: 2.1,
    omegaWingProxy: 2.2,
  }[previewKind] || 1;
  root.scale.multiplyScalar(scaleMultiplier);
  root.scale.x *= -1;
  return root;
}

const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ canvas: creatorCanvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.setClearColor(0x000000, 0);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 1.2, 11.4);

const orbitControls = new OrbitControls(camera, creatorCanvas);
orbitControls.enableDamping = true;
orbitControls.target.set(0, 0.35, 0);

const transformControls = new TransformControls(camera, creatorCanvas);
transformControls.setMode(state.transformMode);
transformControls.addEventListener('dragging-changed', (event) => {
  orbitControls.enabled = !event.value;
  if (event.value && state.motionPreviewEnabled) {
    setMotionPreviewEnabled(false, { silent: true });
    log('Motion preview paused so you can edit the prop cleanly.');
  }
  if (!event.value) {
    commitDraftHistoryStep();
  }
});
scene.add(transformControls);

const ambientLight = new THREE.AmbientLight(0xe4ffe0, 0.9);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x8fd0ff, 0x6ca245, 1.2);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff6d3, 2.1);
sunLight.position.set(20, 26, 10);
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0xe6ffd1, 0.65);
fillLight.position.set(-16, 10, 8);
scene.add(fillLight);

const petRim = new THREE.PointLight(0x9de8ff, 8, 55);
petRim.position.set(0, 2, -8);
scene.add(petRim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(9, 64),
  new THREE.MeshStandardMaterial({
    color: 0xa6d970,
    roughness: 0.96,
    metalness: 0.02,
    transparent: true,
    opacity: 0.22,
  }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -3.35;
scene.add(floor);

const xio = createXioCharacter({
  THREE,
  SVGLoader,
  scene,
  svgData: XIO_DEFAULT_SVG_DATA,
});

const draftStage = {
  singlePivot: null,
  leftPivot: null,
  rightPivot: null,
};
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const CREATOR_PREVIEW_MOTION = Object.freeze({
  baseFlapHz: 0.85,
  flapHzVariance: 0.02,
  pitchStiffness: 16,
  pitchDamping: 7.8,
  rollStiffness: 14,
  rollDamping: 7,
  headFollowAlpha: 0.09,
});
const previewMotionState = {
  elapsed: 0,
  phase: 0,
  y: 0.12,
  yVel: 0,
  pitch: 0,
  pitchVel: 0,
  roll: 0,
  rollVel: 0,
  aero: 0.5,
};

function applyWingGroupPoseDetailed({
  leftZ,
  rightZ,
  leftX,
  rightX,
  leftY,
  rightY,
  shoulderShift = 0,
} = {}) {
  const leftBasePosition = xio.leftWingGroup.userData?.basePosition;
  const rightBasePosition = xio.rightWingGroup.userData?.basePosition;
  if (leftBasePosition) {
    xio.leftWingGroup.position.copy(leftBasePosition);
  }
  if (rightBasePosition) {
    xio.rightWingGroup.position.copy(rightBasePosition);
  }
  xio.leftWingGroup.position.x -= shoulderShift;
  xio.rightWingGroup.position.x += shoulderShift;
  xio.leftWingGroup.rotation.z = leftZ;
  xio.rightWingGroup.rotation.z = rightZ;
  xio.leftWingGroup.rotation.x = leftX;
  xio.rightWingGroup.rotation.x = rightX;
  xio.leftWingGroup.rotation.y = leftY;
  xio.rightWingGroup.rotation.y = rightY;
}

function applyWingGroupPose(leftZ, rightZ, wingX, wingSweep, shoulderShift = 0, sweepAdd = 0) {
  applyWingGroupPoseDetailed({
    leftZ,
    rightZ,
    leftX: wingX,
    rightX: wingX,
    leftY: wingSweep + sweepAdd,
    rightY: -wingSweep - sweepAdd,
    shoulderShift,
  });
}

function canTuneCurrentWingMotion(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
  return Boolean(category?.slotKey === 'wingSet' && !isNoWingProxyRecord(draftProp));
}

function applyPreviewMotionPoseFromCurrentState({ eyeDt = 1 / 60 } = {}) {
  const wingMotion = resolveWingMotionProfiles(getDraftWingMotionPreview());
  const masterMotion = wingMotion.master;
  const leftMotion = wingMotion.left;
  const rightMotion = wingMotion.right;
  const t = previewMotionState.elapsed;
  const cursorX = Math.sin(t * 0.44) * 0.3;
  const cursorY = Math.cos(t * 0.32 + 0.45) * 0.18;
  const downstroke = Math.pow(previewMotionState.aero, 1.45);
  const upstroke = Math.pow(1 - previewMotionState.aero, 1.2);
  const wingAmplitude = 0.47 + Math.min(0.16, Math.abs(previewMotionState.yVel) * 0.15);

  xio.creatureGroup.position.y = previewMotionState.y;
  xio.creatureGroup.rotation.z = previewMotionState.roll;
  xio.creatureGroup.rotation.x += (previewMotionState.pitch - xio.creatureGroup.rotation.x) * CREATOR_PREVIEW_MOTION.headFollowAlpha;
  xio.creatureGroup.rotation.y += ((cursorX * 0.14) - xio.creatureGroup.rotation.y) * CREATOR_PREVIEW_MOTION.headFollowAlpha;

  const baseWingFeather = 0.07 + (upstroke * 0.2);
  const baseWingSweep = 0.03 + (downstroke * 0.09) - (upstroke * 0.025);
  const sampleWingPose = (profile, side) => {
    const direction = profile.direction === 'reverse' ? -1 : 1;
    const phase = (previewMotionState.phase * direction) + profile.phaseOffset;
    const sideStroke = Math.sin(phase);
    const strokeHarmonic = Math.sin((phase * 2) - 0.35) * 0.12;
    const flap = sideStroke * wingAmplitude * profile.amplitude;
    const pitch = baseWingFeather + profile.pitch + (sideStroke * 0.03 * profile.featherTwist) + (strokeHarmonic * 0.25);
    const sweep = (baseWingSweep * profile.sweep) + (profile.shoulderSpread * 0.08);
    return side === 'left'
      ? {
        z: flap + strokeHarmonic - 0.2,
        x: pitch,
        y: sweep,
      }
      : {
        z: -flap - strokeHarmonic + 0.2,
        x: pitch,
        y: -sweep,
      };
  };

  const leftPose = sampleWingPose(leftMotion, 'left');
  const rightPose = sampleWingPose(rightMotion, 'right');
  const shoulderShift = Math.max(-0.6, Math.min(1.1, (leftMotion.shoulderSpread + rightMotion.shoulderSpread) * 0.5));
  applyWingGroupPoseDetailed({
    leftZ: leftPose.z,
    rightZ: rightPose.z,
    leftX: leftPose.x,
    rightX: rightPose.x,
    leftY: leftPose.y,
    rightY: rightPose.y,
    shoulderShift,
  });

  const bodyPulse = 1 + (downstroke * 0.025) + (Math.sin(t * 2.4) * 0.01);
  xio.bodyMesh.scale.set(
    1 - ((bodyPulse - 1) * 0.35),
    1 + (bodyPulse - 1),
    1 - ((bodyPulse - 1) * 0.24),
  );

  const eyeTargetX = THREE.MathUtils.clamp(cursorX * 0.13, -0.1, 0.1);
  const eyeTargetY = THREE.MathUtils.clamp(cursorY * 0.1, -0.08, 0.08);
  xio.leftEye.update(eyeTargetX + 0.015, eyeTargetY, eyeDt);
  xio.rightEye.update(eyeTargetX - 0.015, eyeTargetY, eyeDt);

  return {
    master: masterMotion,
    left: leftMotion,
    right: rightMotion,
  };
}

function resetPreviewMotionPose() {
  previewMotionState.elapsed = 0;
  previewMotionState.phase = 0;
  previewMotionState.y = 0.12;
  previewMotionState.yVel = 0;
  previewMotionState.pitch = 0;
  previewMotionState.pitchVel = 0;
  previewMotionState.roll = 0;
  previewMotionState.rollVel = 0;
  previewMotionState.aero = 0.5;
  xio.stuntRig.position.set(0, 0, 0);
  xio.stuntRig.rotation.set(0, 0, 0);
  xio.creatureGroup.position.y = 0;
  xio.creatureGroup.rotation.x = 0;
  xio.creatureGroup.rotation.y = 0;
  xio.creatureGroup.rotation.z = 0;
  xio.bodyMesh.scale.set(1, 1, 1);
  xio.leftEye.group.scale.setScalar(1);
  xio.rightEye.group.scale.setScalar(1);
  applyPreviewMotionPoseFromCurrentState({ eyeDt: 1 / 60 });
}

function updatePreviewMotion(dt) {
  const wingMotion = resolveWingMotionProfiles(getDraftWingMotionPreview());
  const masterMotion = wingMotion.master;
  previewMotionState.elapsed += dt;
  const t = previewMotionState.elapsed;
  const cursorY = Math.cos(t * 0.32 + 0.45) * 0.18;
  const flapDirection = masterMotion.direction === 'reverse' ? -1 : 1;
  const flapHz = masterMotion.flapHz
    + Math.sin(t * 0.42) * CREATOR_PREVIEW_MOTION.flapHzVariance;
  previewMotionState.phase += Math.PI * 2 * flapHz * dt * flapDirection;

  const stroke = Math.sin(previewMotionState.phase);
  const strokeVelNorm = Math.cos(previewMotionState.phase);
  const aeroRaw = 0.5 + (0.5 * strokeVelNorm);
  previewMotionState.aero += (aeroRaw - previewMotionState.aero) * Math.min(1, dt * 9);
  const downstroke = Math.pow(previewMotionState.aero, 1.45);
  const upstroke = Math.pow(1 - previewMotionState.aero, 1.2);

  const lift = 8.35 + (downstroke * 2.25) + (Math.abs(strokeVelNorm) * 0.62) - (upstroke * 0.24);
  const yAccel = lift - 9.1 - ((previewMotionState.y - 0.12) * 9.1) - (previewMotionState.yVel * 4.6);
  previewMotionState.yVel += yAccel * dt;
  previewMotionState.y += previewMotionState.yVel * dt;
  previewMotionState.y = THREE.MathUtils.clamp(previewMotionState.y, -0.54, 0.86);

  const pitchTarget = (-cursorY * 0.1) + (-downstroke * 0.06 + upstroke * 0.02);
  const pitchAccel = ((pitchTarget - previewMotionState.pitch) * CREATOR_PREVIEW_MOTION.pitchStiffness)
    - (previewMotionState.pitchVel * CREATOR_PREVIEW_MOTION.pitchDamping);
  previewMotionState.pitchVel += pitchAccel * dt;
  previewMotionState.pitch += previewMotionState.pitchVel * dt;

  const rollTarget = Math.sin(previewMotionState.phase + (Math.PI * 0.5)) * 0.022;
  const rollAccel = ((rollTarget - previewMotionState.roll) * CREATOR_PREVIEW_MOTION.rollStiffness)
    - (previewMotionState.rollVel * CREATOR_PREVIEW_MOTION.rollDamping);
  previewMotionState.rollVel += rollAccel * dt;
  previewMotionState.roll += previewMotionState.rollVel * dt;
  applyPreviewMotionPoseFromCurrentState({ eyeDt: dt });
}

function refreshWingMotionPreviewLive({ autoStart = false } = {}) {
  const draftProp = ensureDraftProp();
  const category = getDraftCategoryRecord();
  if (!canTuneCurrentWingMotion(draftProp, category)) {
    return false;
  }
  if (autoStart && !state.motionPreviewEnabled) {
    setMotionPreviewEnabled(true, { silent: true });
    return true;
  }
  applyPreviewMotionPoseFromCurrentState({ eyeDt: 1 / 60 });
  renderer.render(scene, camera);
  return true;
}

function getSelectableStageTargets() {
  return [draftStage.singlePivot, draftStage.leftPivot, draftStage.rightPivot].filter(Boolean);
}

function setStageSelection(target) {
  state.stageSelection = target || null;
  if (state.stageSelection) {
    transformControls.attach(state.stageSelection);
    transformControls.visible = !state.motionPreviewEnabled;
  } else {
    transformControls.detach();
    transformControls.visible = false;
  }
}

function findSelectableTarget(object) {
  const selectableTargets = getSelectableStageTargets();
  let current = object;
  while (current) {
    if (selectableTargets.includes(current)) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function fitCameraToCharacter() {
  orbitControls.target.set(0, 0.35, 0);
  camera.position.set(0, 1.2, 11.4);
  orbitControls.update();
}

function resetStagePresentationPose() {
  xio.stuntRig.position.set(0, 0, 0);
  xio.stuntRig.rotation.set(0, 0, 0);
  xio.creatureGroup.position.set(0, 0, 0);
  xio.creatureGroup.rotation.set(0, 0, 0);
}

function pauseTurntable(durationMs = 2600) {
  state.turntablePauseUntilMs = performance.now() + Math.max(0, Number(durationMs) || 0);
}

function presentCurrentLoadInStage({ disableTurntable = false } = {}) {
  if (disableTurntable) {
    state.turntableEnabled = false;
    renderStageToolbarControls();
  }
  resetStagePresentationPose();
  fitCameraToCharacter();
  pauseTurntable(2600);
}

function applySyncedWingDraftSelection(selectionKey) {
  selectStageSelectionByKey(selectionKey);
  renderAll();
}

function refreshSelectedLiveWingPreviewTemplates(selectedProp, draftProp = ensureDraftProp()) {
  if (!selectedProp || !isLiveGameWingPreviewKey(selectedProp.key)) {
    return false;
  }
  const previewPair = buildLiveGameWingPreview({
    propKey: selectedProp.key,
    THREE,
    GLTFLoader,
    renderer,
  });
  const previewState = prepareDraftTemplatePairStateFromLivePreview(
    previewPair,
    `${selectedProp.label} (live game preview)`,
    draftProp,
  );
  if (!previewState) {
    return false;
  }
  state.draftTemplateSourceRoot = null;
  state.draftTemplateSourcePair = previewState.draftTemplatePair;
  state.draftSourceLabel = previewState.draftSourceLabel;
  refreshDraftTemplatePresentationFromSource();
  return true;
}

function getPreferredWingSyncSide({
  fallbackForPaired = 'left',
  fallbackForSingle = 'right',
} = {}) {
  if (state.stageSelection === draftStage.leftPivot) return 'left';
  if (state.stageSelection === draftStage.rightPivot) return 'right';
  const previewSide = normalizeWingPreviewSide(state.wingSyncPreview?.side, null);
  if (previewSide) {
    return previewSide;
  }
  if (hasDraftWingPairSource()) {
    return fallbackForPaired;
  }
  return inferCurrentSingleWingPreviewSide() || fallbackForSingle;
}

function getCurrentWingSyncSourceAttachment() {
  return captureAttachmentFromPivot(state.stageSelection)
    || captureAttachmentFromPivot(draftStage.singlePivot)
    || captureAttachmentFromPivot(draftStage.leftPivot)
    || captureAttachmentFromPivot(draftStage.rightPivot)
    || ensureDraftProp().attachment;
}

function syncBothWingsAnimationPreview() {
  const draftProp = ensureDraftProp();
  const category = getDraftCategoryRecord();
  const selectedProp = getSelectedLiveProp();

  if (!category || category.slotKey !== 'wingSet') {
    log('Sync Both Wings is available only for wing props.');
    renderAll();
    return false;
  }
  if (isNoWingProxyRecord(draftProp)) {
    log('Equip or drop a wing first, then use Sync Both Wings.');
    renderAll();
    return false;
  }

  if (state.motionPreviewEnabled) {
    setMotionPreviewEnabled(false, { silent: true });
  }
  if (!state.stageSelection && (state.draftTemplateRoot || state.draftTemplatePair?.left || state.draftTemplatePair?.right)) {
    rebuildDraftStage();
  }

  if (isBaseWingProxyRecord(draftProp)) {
    setWingSyncPreviewState('both', 'left');
    commitDraftHistoryStep();
    state.turntableEnabled = false;
    setMotionPreviewEnabled(true, { silent: true });
    renderAll();
    log('Synced XiO Signature Glow Wings on both wings.');
    return true;
  }

  if (!state.draftTemplateRoot && !state.draftTemplatePair?.left && !state.draftTemplatePair?.right) {
    log('Load or drop a wing prop into the XiO stage before syncing both wings.');
    renderAll();
    return false;
  }

  refreshSelectedLiveWingPreviewTemplates(selectedProp, draftProp);

  const selectedSide = getPreferredWingSyncSide();
  const sourceAttachment = getCurrentWingSyncSourceAttachment();
  if (hasDraftWingPairSource() || draftProp.attachment?.mirrorMode === 'paired') {
    draftProp.attachment = normalizePairedWingAttachment(sourceAttachment);
  } else {
    draftProp.attachment = normalizeSingleWingAttachmentForSide(sourceAttachment, selectedSide);
  }
  setWingSyncPreviewState('both', selectedSide);

  rebuildDraftStage();
  const didAutoFit = autoFitDraftPlacementToSlot({
    targetSpanOverride: SLOT_STAGE_TARGET_SPANS.wingSet,
    preserveSelectionKey: selectedSide === 'right' ? 'right' : 'left',
  });
  applySyncedWingDraftSelection(selectedSide === 'right' ? 'right' : 'left');
  commitDraftHistoryStep();

  state.turntableEnabled = false;
  setMotionPreviewEnabled(true, { silent: true });

  const label = selectedProp?.label || draftProp.label || 'current wing';
  log(`Synced ${label} on both wings${didAutoFit ? ' and auto-fit the wing sweep.' : '.'}`);
  return true;
}

function syncOneWingAnimationPreview() {
  const draftProp = ensureDraftProp();
  const category = getDraftCategoryRecord();
  const selectedProp = getSelectedLiveProp();

  if (!category || category.slotKey !== 'wingSet') {
    log('Sync One Wing is available only for wing props.');
    renderAll();
    return false;
  }
  if (isNoWingProxyRecord(draftProp)) {
    log('Equip or drop a wing first, then use Sync One Wing.');
    renderAll();
    return false;
  }
  if (isBaseWingProxyRecord(draftProp)) {
    log('XiO signature glow wings always preview as a full two-wing set.');
    renderAll();
    return false;
  }

  if (state.motionPreviewEnabled) {
    setMotionPreviewEnabled(false, { silent: true });
  }
  if (!state.stageSelection && (state.draftTemplateRoot || state.draftTemplatePair?.left || state.draftTemplatePair?.right)) {
    rebuildDraftStage();
  }
  if (!state.draftTemplateRoot && !state.draftTemplatePair?.left && !state.draftTemplatePair?.right) {
    log('Load or drop a wing prop into the XiO stage before syncing one wing.');
    renderAll();
    return false;
  }

  refreshSelectedLiveWingPreviewTemplates(selectedProp, draftProp);

  const selectedSide = getPreferredWingSyncSide({
    fallbackForPaired: 'left',
    fallbackForSingle: inferCurrentSingleWingPreviewSide(),
  });
  const sourceAttachment = getCurrentWingSyncSourceAttachment();
  if (hasDraftWingPairSource() || draftProp.attachment?.mirrorMode === 'paired') {
    draftProp.attachment = normalizePairedWingAttachment(sourceAttachment);
  } else {
    draftProp.attachment = normalizeSingleWingAttachmentForSide(sourceAttachment, selectedSide);
  }
  setWingSyncPreviewState('single', selectedSide);

  rebuildDraftStage();
  autoFitDraftPlacementToSlot({
    targetSpanOverride: SINGLE_WING_SYNC_TARGET_SPAN,
    preserveSelectionKey: 'single',
  });
  applySyncedWingDraftSelection('single');
  commitDraftHistoryStep();

  state.turntableEnabled = false;
  setMotionPreviewEnabled(true, { silent: true });

  const label = selectedProp?.label || draftProp.label || 'current wing';
  log(`Synced ${label} on the ${selectedSide} wing only.`);
  return true;
}

async function activatePropEditing(propKey = state.selectedLivePropKey) {
  if (state.motionPreviewEnabled) {
    setMotionPreviewEnabled(false, { silent: true });
  }
  if (!propKey && !state.selectedLivePropKey) {
    log('Select a live prop first, then click Edit Prop.');
    return;
  }

  if (propKey && state.selectedLivePropKey !== propKey) {
    const loaded = await loadLiveProp(propKey, { resetView: false });
    if (!loaded || state.selectedLivePropKey !== propKey) {
      return;
    }
  } else if (!state.stageSelection && state.selectedLivePropKey) {
    const loaded = await loadLiveProp(state.selectedLivePropKey, { resetView: false });
    if (!loaded) {
      return;
    }
  }

  if (!state.stageSelection) {
    log('Select a live prop first, then click Edit Prop.');
    return;
  }

  const selectedProp = getSelectedLiveProp();
  if (isCreatorOnlyPropRecord(selectedProp)) {
    log('XiO signature wings are built-in and do not use prop transform handles. Equip another prop to edit it.');
    return;
  }
  if (selectedProp && (!state.editSession.active || state.editSession.propKey !== selectedProp.key)) {
    startEditSession(selectedProp);
  }

  resetDraftHistory();
  setTransformMode('scale');
  focusCurrentProp();
  renderAll();
  const label = selectedProp?.label || ensureDraftProp().label || 'current prop';
  log(`Edit Prop is active for ${label}. Resize handles are ready.`);
}

async function saveActiveEditSession() {
  if (!state.editSession.active) {
    log('Edit mode is not active yet.');
    return;
  }
  const label = ensureDraftProp().label || state.editSession.baselineProp?.label || 'current prop';
  await publishDraftProp({ archive: false });
  clearEditSession();
  resetDraftHistory();
  renderAll();
  log(`Saved edits for ${label}.`);
}

async function cancelActiveEditSession() {
  if (!state.editSession.active || !state.editSession.baselineProp) {
    log('Edit mode is not active yet.');
    return;
  }

  const baselineProp = deepCopyProp(state.editSession.baselineProp);
  const label = baselineProp.label || 'current prop';
  await hydrateDraftFromPropRecord(baselineProp, {
    announce: false,
    resetView: false,
    preserveEditSession: true,
  });
  clearEditSession();
  resetDraftHistory();
  renderAll();
  presentCurrentLoadInStage();
  log(`Canceled edits for ${label}.`);
}

function setCameraToBounds(bounds, {
  lateralOffsetFactor = 0,
  verticalOffsetFactor = 0.06,
  distanceMultiplier = 1.22,
  minDistance = 3.6,
  maxDistance = 18,
} = {}) {
  if (!bounds || bounds.isEmpty()) {
    fitCameraToCharacter();
    return;
  }

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  bounds.getCenter(center);
  bounds.getSize(size);

  const halfVerticalFov = THREE.MathUtils.degToRad(Math.max(camera.fov, 10) / 2);
  const aspect = Math.max(camera.aspect || 1, 0.65);
  const fitHeightDistance = (Math.max(size.y, 0.8) * 0.5) / Math.tan(halfVerticalFov);
  const fitWidthDistance = (Math.max(size.x, 0.8) * 0.5) / (Math.tan(halfVerticalFov) * aspect);
  const fitDepthDistance = Math.max(size.z, 0.4) * 1.2;
  const distance = THREE.MathUtils.clamp(
    Math.max(fitHeightDistance, fitWidthDistance, fitDepthDistance) * distanceMultiplier,
    minDistance,
    maxDistance,
  );

  orbitControls.target.set(
    center.x,
    center.y + (size.y * verticalOffsetFactor),
    center.z,
  );
  camera.position.set(
    center.x + (size.x * lateralOffsetFactor),
    orbitControls.target.y + Math.max(size.y * 0.08, 0.42),
    center.z + distance,
  );
  orbitControls.update();
}

function focusCurrentProp() {
  const target = state.stageSelection;
  if (!target) {
    fitCameraToCharacter();
    return;
  }
  const bounds = new THREE.Box3().setFromObject(target);
  if (bounds.isEmpty()) {
    fitCameraToCharacter();
    return;
  }
  setCameraToBounds(bounds, {
    lateralOffsetFactor: 0.08,
    verticalOffsetFactor: 0.03,
    distanceMultiplier: 1.16,
    minDistance: 4.4,
    maxDistance: 13.5,
  });
}

function getCurrentDraftStageBounds() {
  const pivots = [draftStage.singlePivot, draftStage.leftPivot, draftStage.rightPivot].filter(Boolean);
  if (!pivots.length) {
    return null;
  }
  return pivots.reduce((combinedBounds, pivot) => {
    const bounds = new THREE.Box3().setFromObject(pivot);
    if (bounds.isEmpty()) {
      return combinedBounds;
    }
    return combinedBounds ? combinedBounds.union(bounds) : bounds.clone();
  }, null);
}

function autoFitDraftPlacementToSlot({ targetSpanOverride = null, preserveSelectionKey = null } = {}) {
  const bounds = getCurrentDraftStageBounds();
  if (!bounds || bounds.isEmpty()) {
    return false;
  }
  const draftProp = ensureDraftProp();
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const largestAxis = Math.max(size.x, size.y, size.z, 0.0001);
  const targetSpan = targetSpanOverride || SLOT_STAGE_TARGET_SPANS[draftProp.categoryKey] || 1.8;
  if (largestAxis >= targetSpan * 0.52 && largestAxis <= targetSpan * 1.9) {
    return false;
  }
  const scaleFactor = THREE.MathUtils.clamp(targetSpan / largestAxis, 0.08, 40);
  if (Math.abs(scaleFactor - 1) < 0.04) {
    return false;
  }
  draftProp.attachment.scale = draftProp.attachment.scale.map((value) => Number(((Number(value) || 1) * scaleFactor).toFixed(4)));
  rebuildDraftStage();
  if (preserveSelectionKey) {
    selectStageSelectionByKey(preserveSelectionKey);
  }
  return true;
}

function roundTransformValue(value, fallback = 0) {
  const numericValue = Number(value);
  return Number((Number.isFinite(numericValue) ? numericValue : fallback).toFixed(4));
}

function getSingleSlotAutoLockPreset(slotKey) {
  return SINGLE_SLOT_AUTO_LOCK_PRESETS[slotKey] || {
    horizontalSpan: SLOT_STAGE_TARGET_SPANS[slotKey] || 1.4,
    yOffsetRatio: -0.08,
    zOffsetRatio: -0.08,
    rotationCandidates: [[0, 0, 0]],
  };
}

function scoreHeadwearRotationCandidate(size) {
  const width = Math.max(size.x, size.z, 0.0001);
  const depth = Math.min(size.x, size.z, 0.0001);
  const height = Math.max(size.y, 0.0001);
  const heightRatio = height / width;
  const depthRatio = depth / width;
  return (width / height)
    + (depth / height)
    - (Math.abs(heightRatio - 0.42) * 3.2)
    - (Math.abs(depthRatio - 0.84) * 1.2)
    - (heightRatio < 0.1 ? 1.4 : 0)
    - (heightRatio > 1.08 ? 2.6 : 0);
}

function measureSingleSlotAutoLockCandidate(sourceRoot, rotation, preset, slotKey) {
  const candidateRoot = cloneSceneGraph(sourceRoot);
  candidateRoot.rotation.set(rotation[0], rotation[1], rotation[2]);
  candidateRoot.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(candidateRoot);
  if (bounds.isEmpty()) {
    return null;
  }
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);
  const horizontalSpan = Math.max(size.x, size.z, 0.0001);
  const scaleFactor = THREE.MathUtils.clamp((preset.horizontalSpan || 1.4) / horizontalSpan, 0.08, 40);
  const scaledCenter = center.clone().multiplyScalar(scaleFactor);
  const scaledSize = size.clone().multiplyScalar(scaleFactor);
  const score = slotKey === 'headWear'
    ? scoreHeadwearRotationCandidate(size)
    : horizontalSpan / Math.max(size.y, 0.0001);
  return {
    rotation,
    scaledCenter,
    scaledSize,
    scaleFactor,
    score,
  };
}

function pickSingleSlotAutoLockCandidate(sourceRoot, preset, slotKey) {
  if (!sourceRoot) {
    return null;
  }
  const candidates = Array.isArray(preset.rotationCandidates) && preset.rotationCandidates.length
    ? preset.rotationCandidates
    : [[0, 0, 0]];
  return candidates.reduce((bestCandidate, rotation) => {
    const measuredCandidate = measureSingleSlotAutoLockCandidate(sourceRoot, rotation, preset, slotKey);
    if (!measuredCandidate) {
      return bestCandidate;
    }
    if (!bestCandidate || measuredCandidate.score > bestCandidate.score) {
      return measuredCandidate;
    }
    return bestCandidate;
  }, null);
}

function canAutoLockCurrentDraft(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
  return Boolean(
    category?.slotKey
      && category.slotKey !== 'wingSet'
      && (state.draftTemplateSourceRoot || state.draftTemplateRoot)
      && !isNoWingProxyRecord(draftProp)
      && !isBaseWingProxyRecord(draftProp)
  );
}

function autoLockDraftPlacementToSlot({ commitHistoryStep = true, silent = false } = {}) {
  const draftProp = ensureDraftProp();
  const category = getDraftCategoryRecord();
  if (!canAutoLockCurrentDraft(draftProp, category)) {
    if (!silent) {
      log('Load a single-slot prop such as headwear or body gear before using Auto Lock / Auto Fit.');
    }
    return false;
  }

  if (state.motionPreviewEnabled) {
    setMotionPreviewEnabled(false, { silent: true });
  }

  const slotKey = category.slotKey;
  const preset = getSingleSlotAutoLockPreset(slotKey);
  const sourceRoot = state.draftTemplateSourceRoot || state.draftTemplateRoot;
  const candidate = pickSingleSlotAutoLockCandidate(sourceRoot, preset, slotKey);
  if (!candidate) {
    if (!silent) {
      log('XiO could not measure that GLB well enough to auto-fit it.');
    }
    return false;
  }

  const useHeadwearLockedPosition = slotKey === 'headWear';
  const nextPosition = useHeadwearLockedPosition
    ? HEADWEAR_AUTO_LOCK_POSITION
    : [
      roundTransformValue(-candidate.scaledCenter.x, 0),
      roundTransformValue(
        -candidate.scaledCenter.y + (candidate.scaledSize.y * (
          Number.isFinite(preset.yOffsetRatio)
            ? preset.yOffsetRatio
            : -(preset.ySinkRatio ?? 0.08)
        )),
        0,
      ),
      roundTransformValue(
        -candidate.scaledCenter.z + (candidate.scaledSize.z * (
          Number.isFinite(preset.zOffsetRatio)
            ? preset.zOffsetRatio
            : -(preset.zSinkRatio ?? 0.08)
        )),
        0,
      ),
    ];

  draftProp.attachment = {
    ...draftProp.attachment,
    position: nextPosition.map((value) => roundTransformValue(value, 0)),
    rotation: [
      roundTransformValue(candidate.rotation[0], 0),
      roundTransformValue(candidate.rotation[1], 0),
      roundTransformValue(candidate.rotation[2], 0),
    ],
    scale: [
      roundTransformValue(candidate.scaleFactor, 1),
      roundTransformValue(candidate.scaleFactor, 1),
      roundTransformValue(candidate.scaleFactor, 1),
    ],
    mirrorMode: 'single',
  };

  rebuildDraftStage();
  selectStageSelectionByKey('single');
  if (commitHistoryStep) {
    commitDraftHistoryStep();
  }
  renderAll();
  if (!silent) {
    const label = getSelectedLiveProp()?.label || draftProp.label || 'current prop';
    log(`Auto-locked ${label} to XiO’s ${slotKey === 'headWear' ? 'headwear' : category.label} slot and staged it for final tuning.`);
  }
  return true;
}

function captureAttachmentFromPivot(pivot) {
  if (!pivot) {
    return null;
  }
  return {
    position: [
      roundTransformValue(pivot.position.x, 0),
      roundTransformValue(pivot.position.y, 0),
      roundTransformValue(pivot.position.z, 0),
    ],
    rotation: [
      roundTransformValue(pivot.rotation.x, 0),
      roundTransformValue(pivot.rotation.y, 0),
      roundTransformValue(pivot.rotation.z, 0),
    ],
    scale: [
      roundTransformValue(Math.abs(pivot.scale.x), 1),
      roundTransformValue(Math.abs(pivot.scale.y), 1),
      roundTransformValue(Math.abs(pivot.scale.z), 1),
    ],
  };
}

function normalizePairedWingAttachment(attachment = {}) {
  const position = Array.isArray(attachment.position) ? attachment.position : [0, 0, 0];
  const rotation = Array.isArray(attachment.rotation) ? attachment.rotation : [0, 0, 0];
  const scale = Array.isArray(attachment.scale) ? attachment.scale : [1, 1, 1];
  return {
    position: [
      roundTransformValue(Math.abs(position[0]), 0),
      roundTransformValue(position[1], 0),
      roundTransformValue(position[2], 0),
    ],
    rotation: [
      roundTransformValue(rotation[0], 0),
      roundTransformValue(Math.abs(rotation[1]), 0),
      roundTransformValue(Math.abs(rotation[2]), 0),
    ],
    scale: [
      roundTransformValue(Math.abs(scale[0]), 1),
      roundTransformValue(Math.abs(scale[1]), 1),
      roundTransformValue(Math.abs(scale[2]), 1),
    ],
    mirrorMode: 'paired',
  };
}

function normalizeSingleWingAttachmentForSide(attachment = {}, side = 'right') {
  const dir = side === 'left' ? -1 : 1;
  const position = Array.isArray(attachment.position) ? attachment.position : [0, 0, 0];
  const rotation = Array.isArray(attachment.rotation) ? attachment.rotation : [0, 0, 0];
  const scale = Array.isArray(attachment.scale) ? attachment.scale : [1, 1, 1];
  return {
    position: [
      roundTransformValue(Math.abs(position[0]) * dir, 0),
      roundTransformValue(position[1], 0),
      roundTransformValue(position[2], 0),
    ],
    rotation: [
      roundTransformValue(rotation[0], 0),
      roundTransformValue(Math.abs(rotation[1]) * dir, 0),
      roundTransformValue(Math.abs(rotation[2]) * dir, 0),
    ],
    scale: [
      roundTransformValue(Math.abs(scale[0]), 1),
      roundTransformValue(Math.abs(scale[1]), 1),
      roundTransformValue(Math.abs(scale[2]), 1),
    ],
    mirrorMode: 'single',
  };
}

function inferCurrentSingleWingPreviewSide() {
  const previewSide = normalizeWingPreviewSide(state.wingSyncPreview?.side, null);
  if (previewSide === 'left' || previewSide === 'right') {
    return previewSide;
  }
  if (state.stageSelection === draftStage.leftPivot) {
    return 'left';
  }
  if (state.stageSelection === draftStage.rightPivot) {
    return 'right';
  }
  if (draftStage.singlePivot?.parent === xio.slotAnchors.wingSet.left) {
    return 'left';
  }
  if (draftStage.singlePivot?.parent === xio.slotAnchors.wingSet.right) {
    const bounds = new THREE.Box3().setFromObject(draftStage.singlePivot);
    if (!bounds.isEmpty()) {
      const center = new THREE.Vector3();
      bounds.getCenter(center);
      if (center.x < -0.02) {
        return 'left';
      }
    }
    return 'right';
  }
  const target = state.stageSelection || draftStage.singlePivot;
  if (target) {
    const bounds = new THREE.Box3().setFromObject(target);
    if (!bounds.isEmpty()) {
      const center = new THREE.Vector3();
      bounds.getCenter(center);
      return center.x < 0 ? 'left' : 'right';
    }
  }
  return 'right';
}

function getCurrentWingPairAttachment() {
  const selectedPivot = state.stageSelection === draftStage.rightPivot && draftStage.rightPivot
    ? draftStage.rightPivot
    : draftStage.leftPivot || draftStage.rightPivot;
  return selectedPivot
    ? normalizePairedWingAttachment(captureAttachmentFromPivot(selectedPivot))
    : normalizePairedWingAttachment(ensureDraftProp().attachment);
}

function getCurrentSingleWingAttachment(side = 'right') {
  const sourceAttachment = captureAttachmentFromPivot(draftStage.singlePivot) || ensureDraftProp().attachment;
  return normalizeSingleWingAttachmentForSide(sourceAttachment, side);
}

function prepareSceneRootForDraftAsset(loadedScene, sourceLabel) {
  if (!loadedScene) {
    return null;
  }
  const attempts = [
    () => prepareSceneRootForSocketAttachment({
      THREE,
      root: loadedScene,
      targetSize: 2.2,
    }),
    () => {
      const sceneRoot = cloneSceneGraph(loadedScene);
      centerObjectAtOrigin(THREE, sceneRoot);
      normalizeObjectToUnitSize(THREE, sceneRoot, 2.2);
      return sceneRoot;
    },
    () => cloneSceneGraph(loadedScene),
  ];
  let lastError = null;
  for (const attempt of attempts) {
    try {
      const candidate = attempt();
      if (!candidate) {
        continue;
      }
      const bounds = new THREE.Box3().setFromObject(candidate);
      if (!bounds.isEmpty() || candidate.children?.length) {
        return candidate;
      }
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) {
    console.warn(`[XiO Creator] Unable to prepare ${sourceLabel} with the standard draft import pipeline.`, lastError);
  }
  return null;
}

function refreshDraftTemplatePresentationFromSource({ logFailure = false } = {}) {
  const draftProp = ensureDraftProp();
  const category = getDraftCategoryRecord();
  if (!category || category.slotKey !== 'wingSet' || isNoWingProxyRecord(draftProp) || isBaseWingProxyRecord(draftProp)) {
    state.draftTemplateRoot = state.draftTemplateSourceRoot || null;
    state.draftTemplatePair = state.draftTemplateSourcePair || null;
    return Boolean(state.draftTemplateRoot || state.draftTemplatePair);
  }

  syncDraftWingMirrorModeFromPreview(draftProp);
  if (!hasDraftWingAuthoringSource()) {
    state.draftTemplateRoot = state.draftTemplateSourceRoot || null;
    state.draftTemplatePair = state.draftTemplateSourcePair || null;
    return Boolean(state.draftTemplateRoot || state.draftTemplatePair);
  }

  const authoringPreview = getDraftWingAuthoringPreview(draftProp);
  const authoredTemplateState = buildWingAuthoringTemplateState({
    THREE,
    sourceRoot: state.draftTemplateSourceRoot,
    sourcePair: state.draftTemplateSourcePair,
    authoring: authoringPreview,
  });

  state.draftTemplateRoot = authoredTemplateState?.draftTemplateRoot || null;
  state.draftTemplatePair = authoredTemplateState?.draftTemplatePair || null;
  if (!state.draftTemplateRoot && !state.draftTemplatePair) {
    state.draftTemplateRoot = state.draftTemplateSourceRoot || null;
    state.draftTemplatePair = state.draftTemplateSourcePair || null;
  }

  if (logFailure && authoredTemplateState?.failed) {
    log('XiO could not isolate that wing source cleanly, so the original GLB is still loaded.');
  }
  return !authoredTemplateState?.failed;
}

function getPreferredWingAuthoringSide() {
  if (state.stageSelection === draftStage.rightPivot) return 'right';
  if (state.stageSelection === draftStage.leftPivot) return 'left';
  const authoringPreview = getDraftWingAuthoringPreview();
  return authoringPreview.sourceSide || inferCurrentSingleWingPreviewSide() || 'left';
}

function applyWingAuthoringState(authoringPatch, {
  commitHistoryStep = true,
  announceMessage = null,
  autoFit = true,
  silent = false,
} = {}) {
  const draftProp = ensureDraftProp();
  const category = getDraftCategoryRecord();
  if (!category || category.slotKey !== 'wingSet') {
    return false;
  }
  if (isNoWingProxyRecord(draftProp) || isBaseWingProxyRecord(draftProp) || !hasDraftWingAuthoringSource()) {
    log('Load a wing GLB or live wing prop before using the wing authoring tools.');
    return false;
  }

  const previousPreview = getDraftWingAuthoringPreview(draftProp);
  const nextPreview = normalizeWingAuthoringPreview({
    ...previousPreview,
    ...authoringPatch,
  }, {
    defaultMirrorToBoth: draftProp.attachment?.mirrorMode === 'paired',
  });
  setDraftWingAuthoringPreview(nextPreview);
  syncDraftWingMirrorModeFromPreview(draftProp);
  setWingSyncPreviewState(nextPreview.mirrorToBoth ? 'both' : 'single', nextPreview.sourceSide);
  const didIsolate = refreshDraftTemplatePresentationFromSource({ logFailure: true });
  rebuildDraftStage();
  if (autoFit) {
    autoFitDraftPlacementToSlot({
      targetSpanOverride: nextPreview.mirrorToBoth ? SLOT_STAGE_TARGET_SPANS.wingSet : SINGLE_WING_SYNC_TARGET_SPAN,
      preserveSelectionKey: nextPreview.mirrorToBoth
        ? (nextPreview.sourceSide === 'right' ? 'right' : 'left')
        : 'single',
    });
  }
  selectStageSelectionByKey(nextPreview.mirrorToBoth
    ? (nextPreview.sourceSide === 'right' ? 'right' : 'left')
    : 'single');
  if (commitHistoryStep) {
    commitDraftHistoryStep();
  }
  renderAll();
  if (!didIsolate) {
    return false;
  }
  if (announceMessage) {
    log(announceMessage);
  } else if (!silent && didIsolate) {
    log(`Prepared ${nextPreview.sourceSide} wing source${nextPreview.mirrorToBoth ? ' and mirrored it to both wings.' : ' for one-wing preview.'}`);
  }
  return didIsolate;
}

function resetWingAuthoringToOriginal() {
  const draftProp = ensureDraftProp();
  if (!hasDraftWingAuthoringSource()) {
    log('Load a wing source first, then reset it back to the original GLB.');
    return false;
  }
  clearDraftWingAuthoringPreview();
  draftProp.attachment.mirrorMode = (state.draftTemplateSourcePair?.left && state.draftTemplateSourcePair?.right) ? 'paired' : draftProp.attachment.mirrorMode;
  resetWingSyncPreviewState({
    draftProp,
    draftTemplateRoot: state.draftTemplateSourceRoot,
    draftTemplatePair: state.draftTemplateSourcePair,
  });
  refreshDraftTemplatePresentationFromSource();
  rebuildDraftStage();
  commitDraftHistoryStep();
  renderAll();
  log('Restored the original wing GLB source.');
  return true;
}

function applyWingMotionInputGroup(groupKey, { commitHistoryStep = false } = {}) {
  const draftProp = ensureDraftProp();
  const category = getDraftCategoryRecord();
  if (!category || category.slotKey !== 'wingSet' || isNoWingProxyRecord(draftProp)) {
    return false;
  }
  const currentMotion = getDraftWingMotionPreview(draftProp);
  const nextMotion = clonePreviewData(currentMotion);
  const nextGroup = {};
  Object.entries(wingMotionInputs[groupKey] || {}).forEach(([controlKey, input]) => {
    if (!input) return;
    nextGroup[controlKey] = controlKey === 'direction'
      ? input.value
      : Number(input.value);
  });
  if (groupKey === 'master') {
    nextMotion.master = nextGroup;
  } else {
    nextMotion[groupKey] = nextGroup;
  }
  setDraftWingMotionPreview(nextMotion);
  renderWingMotionControls();
  if (commitHistoryStep) {
    commitDraftHistoryStep();
  }
  return true;
}

function setDraftWingMotionLinked(linked, { commitHistoryStep = true } = {}) {
  const draftProp = ensureDraftProp();
  const category = getDraftCategoryRecord();
  if (!category || category.slotKey !== 'wingSet' || isNoWingProxyRecord(draftProp)) {
    return false;
  }
  const currentMotion = getDraftWingMotionPreview(draftProp);
  const nextMotion = clonePreviewData(currentMotion);
  nextMotion.linked = linked;
  if (linked) {
    nextMotion.left = null;
    nextMotion.right = null;
  } else {
    nextMotion.left = clonePreviewData(nextMotion.left || nextMotion.master);
    nextMotion.right = clonePreviewData(nextMotion.right || nextMotion.master);
  }
  setDraftWingMotionPreview(nextMotion);
  renderAll();
  if (commitHistoryStep) {
    commitDraftHistoryStep();
  }
  log(`Wing motion controls are now ${linked ? 'linked together' : 'unlinked for left and right tuning'}.`);
  return true;
}

function toggleDraftPlacementDepth() {
  if (!hasEditableStageProp()) {
    log('Equip a live or draft prop first, then use the front or behind toggle.');
    return;
  }
  if (state.motionPreviewEnabled) {
    setMotionPreviewEnabled(false, { silent: true });
  }

  const draftProp = ensureDraftProp();
  const currentZ = Number(draftProp.attachment?.position?.[2]) || 0;
  const anchorDepth = getSlotAnchorDepth(draftProp.categoryKey);
  const depthMagnitude = Math.max(Math.abs(currentZ), getSuggestedPlacementDepthMagnitude(draftProp));
  const currentAbsoluteDepth = anchorDepth + currentZ;
  const nextAbsoluteDepth = currentAbsoluteDepth < 0 ? depthMagnitude : -depthMagnitude;
  const nextZ = nextAbsoluteDepth - anchorDepth;
  draftProp.attachment.position[2] = Number(nextZ.toFixed(4));
  rebuildDraftStage();
  commitDraftHistoryStep();
  renderAll();
  const label = getSelectedLiveProp()?.label || draftProp.label || 'current prop';
  log(`Placed ${label} ${nextAbsoluteDepth >= 0 ? 'in front of' : 'behind'} XiO.`);
}

function clearDraftStage() {
  if (draftStage.singlePivot?.parent) draftStage.singlePivot.parent.remove(draftStage.singlePivot);
  if (draftStage.leftPivot?.parent) draftStage.leftPivot.parent.remove(draftStage.leftPivot);
  if (draftStage.rightPivot?.parent) draftStage.rightPivot.parent.remove(draftStage.rightPivot);
  draftStage.singlePivot = null;
  draftStage.leftPivot = null;
  draftStage.rightPivot = null;
  setStageSelection(null);
  xio.leftWingBaseMesh.visible = true;
  xio.rightWingBaseMesh.visible = true;
}

function buildSingleWingPreviewAttachmentForSide(draftProp, side) {
  if (draftProp?.attachment?.mirrorMode === 'paired') {
    return buildMirroredAttachmentTransform(draftProp.attachment, side === 'left' ? -1 : 1);
  }
  return normalizeSingleWingAttachmentForSide(draftProp.attachment, side);
}

function updateDraftFromSelection() {
  const draftProp = ensureDraftProp();
  const category = getDraftCategoryRecord();
  const effectiveWingPreviewMode = getEffectiveWingSyncPreviewMode(draftProp, category);

  if (draftStage.singlePivot) {
    if (category?.slotKey === 'wingSet') {
      const singleSide = getEffectiveWingSyncPreviewSide(draftProp, category) || inferCurrentSingleWingPreviewSide();
      const sourceAttachment = captureAttachmentFromPivot(draftStage.singlePivot) || draftProp.attachment;
      draftProp.attachment = draftProp.attachment?.mirrorMode === 'paired'
        ? normalizePairedWingAttachment(sourceAttachment)
        : normalizeSingleWingAttachmentForSide(sourceAttachment, singleSide);
      setWingSyncPreviewState(effectiveWingPreviewMode || 'single', singleSide);
    } else {
      draftProp.attachment.position = [draftStage.singlePivot.position.x, draftStage.singlePivot.position.y, draftStage.singlePivot.position.z];
      draftProp.attachment.rotation = [draftStage.singlePivot.rotation.x, draftStage.singlePivot.rotation.y, draftStage.singlePivot.rotation.z];
      draftProp.attachment.scale = [draftStage.singlePivot.scale.x, draftStage.singlePivot.scale.y, draftStage.singlePivot.scale.z];
    }
  } else if (draftStage.leftPivot || draftStage.rightPivot) {
    const selectedPivot = state.stageSelection === draftStage.rightPivot && draftStage.rightPivot
      ? draftStage.rightPivot
      : draftStage.leftPivot || draftStage.rightPivot;
    const selectedSide = selectedPivot === draftStage.rightPivot ? 'right' : 'left';
    const selectedAttachment = captureAttachmentFromPivot(selectedPivot) || draftProp.attachment;

    if (category?.slotKey === 'wingSet' && draftProp.attachment?.mirrorMode !== 'paired') {
      draftProp.attachment = normalizeSingleWingAttachmentForSide(selectedAttachment, selectedSide);
      if (draftStage.leftPivot && selectedPivot !== draftStage.leftPivot) {
        applyAttachmentTransform(draftStage.leftPivot, normalizeSingleWingAttachmentForSide(draftProp.attachment, 'left'));
      }
      if (draftStage.rightPivot && selectedPivot !== draftStage.rightPivot) {
        applyAttachmentTransform(draftStage.rightPivot, normalizeSingleWingAttachmentForSide(draftProp.attachment, 'right'));
      }
    } else {
      const selectedDir = selectedSide === 'right' ? 1 : -1;
      draftProp.attachment.position = [
        selectedDir * selectedPivot.position.x,
        selectedPivot.position.y,
        selectedPivot.position.z,
      ];
      draftProp.attachment.rotation = [
        selectedPivot.rotation.x,
        selectedDir * selectedPivot.rotation.y,
        selectedDir * selectedPivot.rotation.z,
      ];
      draftProp.attachment.scale = [
        selectedPivot.scale.x,
        selectedPivot.scale.y,
        selectedPivot.scale.z,
      ];
      draftProp.attachment = normalizePairedWingAttachment(draftProp.attachment);
      if (draftStage.leftPivot && selectedPivot !== draftStage.leftPivot) {
        applyAttachmentTransform(draftStage.leftPivot, buildMirroredAttachmentTransform(draftProp.attachment, -1));
      }
      if (draftStage.rightPivot && selectedPivot !== draftStage.rightPivot) {
        applyAttachmentTransform(draftStage.rightPivot, buildMirroredAttachmentTransform(draftProp.attachment, 1));
      }
    }
    setWingSyncPreviewState(effectiveWingPreviewMode || 'both', selectedSide);
    if (draftStage.leftPivot?.children[0]) {
      draftStage.leftPivot.children[0].scale.x = Math.abs(draftStage.leftPivot.children[0].scale.x);
    }
    if (draftStage.rightPivot?.children[0]) {
      draftStage.rightPivot.children[0].scale.x = Math.abs(draftStage.rightPivot.children[0].scale.x) * -1;
    }
  }
  renderWorkspaceState();
  syncPropForm();
}

transformControls.addEventListener('objectChange', updateDraftFromSelection);

function applyAppearanceFromDraft() {
  const draftProp = ensureDraftProp();
  xio.resetAppearance();
  if (draftProp.eyePreset) xio.applyEyeAppearancePreset(draftProp.eyePreset);
  if (draftProp.materialPreset) xio.applyMaterialPreset(draftProp.materialPreset);
}

function rebuildDraftStage() {
  const previousSelectionKey = getStageSelectionKey();
  refreshDraftTemplatePresentationFromSource();
  clearDraftStage();
  applyAppearanceFromDraft();
  const draftProp = ensureDraftProp();
  const category = getCategoryByKey(draftProp.categoryKey);
  const hasTemplatePair = hasDraftWingPairSource();
  const effectiveWingPreviewMode = getEffectiveWingSyncPreviewMode(draftProp, category);
  const effectiveWingPreviewSide = getEffectiveWingSyncPreviewSide(draftProp, category);
  syncBaseWingVisibility(draftProp, category);
  if ((!state.draftTemplateRoot && !hasTemplatePair) || !category) {
    syncPropForm();
    renderWorkspaceState();
    return;
  }

  if (category.slotKey === 'wingSet' && effectiveWingPreviewMode === 'both') {
    draftStage.leftPivot = new THREE.Group();
    draftStage.rightPivot = new THREE.Group();

    if (draftProp.attachment?.mirrorMode === 'paired') {
      applyAttachmentTransform(draftStage.leftPivot, buildMirroredAttachmentTransform(draftProp.attachment, -1));
      applyAttachmentTransform(draftStage.rightPivot, buildMirroredAttachmentTransform(draftProp.attachment, 1));
    } else {
      applyAttachmentTransform(draftStage.leftPivot, normalizeSingleWingAttachmentForSide(draftProp.attachment, 'left'));
      applyAttachmentTransform(draftStage.rightPivot, normalizeSingleWingAttachmentForSide(draftProp.attachment, 'right'));
    }

    const leftModel = hasTemplatePair
      ? cloneSceneGraph(state.draftTemplatePair.left)
      : cloneSceneGraph(state.draftTemplateRoot);
    const rightModel = hasTemplatePair
      ? cloneSceneGraph(state.draftTemplatePair.right)
      : cloneSceneGraph(state.draftTemplateRoot);
    if (!hasTemplatePair) {
      rightModel.scale.x *= -1;
    }
    draftStage.leftPivot.add(leftModel);
    draftStage.rightPivot.add(rightModel);
    xio.slotAnchors.wingSet.left.add(draftStage.leftPivot);
    xio.slotAnchors.wingSet.right.add(draftStage.rightPivot);
    selectStageSelectionByKey(previousSelectionKey === 'right' ? 'right' : effectiveWingPreviewSide === 'right' ? 'right' : 'left');
  } else {
    const singleWingSide = category.slotKey === 'wingSet' ? effectiveWingPreviewSide : null;
    const anchor = category.slotKey === 'wingSet'
      ? (singleWingSide === 'left' ? xio.slotAnchors.wingSet.left : xio.slotAnchors.wingSet.right)
      : xio.slotAnchors[category.slotKey]?.anchor;
    const singleModel = category.slotKey === 'wingSet' && hasTemplatePair
      ? cloneSceneGraph(singleWingSide === 'left' ? state.draftTemplatePair.left : state.draftTemplatePair.right)
      : state.draftTemplateRoot
        ? cloneSceneGraph(state.draftTemplateRoot)
        : null;
    if (!anchor || !singleModel) {
      syncPropForm();
      renderWorkspaceState();
      return;
    }
    draftStage.singlePivot = new THREE.Group();
    applyAttachmentTransform(
      draftStage.singlePivot,
      category.slotKey === 'wingSet'
        ? buildSingleWingPreviewAttachmentForSide(draftProp, singleWingSide || 'right')
        : draftProp.attachment,
    );
    draftStage.singlePivot.add(singleModel);
    anchor.add(draftStage.singlePivot);
    setStageSelection(draftStage.singlePivot);
  }

  syncPropForm();
  renderWorkspaceState();
}

async function setDraftAssetFromUrl(assetUrl, sourceLabel, draftProp = ensureDraftProp(), { autoFitToSlot = false } = {}) {
  const draftLoadPlan = await buildDraftLoadPlanFromDirectAsset(assetUrl, sourceLabel, draftProp, { autoFitToSlot });
  commitDraftLoadPlan(draftLoadPlan, {
    resetView: false,
    announceMessage: `Loaded ${sourceLabel}.`,
  });
}

function createCreatorLoadError(message, code, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function prepareDraftTemplateStateFromObject(templateRoot, sourceLabel) {
  const preparedRoot = cloneSceneGraph(templateRoot);
  centerObjectAtOrigin(THREE, preparedRoot);
  normalizeObjectToUnitSize(THREE, preparedRoot, 2.2);
  return {
    draftTemplateRoot: preparedRoot,
    draftTemplatePair: null,
    draftSourceLabel: sourceLabel,
  };
}

function prepareDraftTemplatePairStateFromLivePreview(previewPair, sourceLabel, draftProp) {
  if (!previewPair?.left || !previewPair?.right) {
    return null;
  }
  if (draftProp?.attachment && previewPair.attachment) {
    draftProp.attachment = {
      ...draftProp.attachment,
      position: [...previewPair.attachment.position],
      rotation: [...previewPair.attachment.rotation],
      scale: [...previewPair.attachment.scale],
      mirrorMode: 'paired',
    };
  }
  return {
    draftTemplateRoot: null,
    draftTemplatePair: {
      left: cloneSceneGraph(previewPair.left),
      right: cloneSceneGraph(previewPair.right),
    },
    draftSourceLabel: sourceLabel,
  };
}

async function prepareDraftTemplateStateFromAsset(assetUrl, sourceLabel, draftProp) {
  if (!assetUrl) {
    return {
      draftTemplateRoot: null,
      draftTemplatePair: null,
      draftSourceLabel: 'No GLB loaded',
    };
  }

  const mirrorMode = draftProp?.attachment?.mirrorMode === 'paired'
    ? 'paired'
    : 'single';
  const wingAuthoringPreview = draftProp?.categoryKey === 'wingSet'
    ? getDraftWingAuthoringPreview(draftProp)
    : null;
  const effectiveMirrorMode = draftProp?.categoryKey === 'wingSet'
    && wingAuthoringPreview?.mode === 'isolatedHalf'
    ? (wingAuthoringPreview.mirrorToBoth ? 'paired' : 'single')
    : mirrorMode;
  const shouldUseWingTemplate = draftProp.categoryKey === 'wingSet'
    && effectiveMirrorMode === 'paired'
    && wingAuthoringPreview?.mode !== 'isolatedHalf';
  if (shouldUseWingTemplate) {
    const templateState = await loadWingTemplateState({ GLTFLoader, THREE, assetUrl });
    if (!templateState?.sourceTemplateRoot && !templateState?.sourceTemplatePair) {
      throw createCreatorLoadError(`${sourceLabel} could not be prepared for XiO.`, 'prepare-failed', {
        sourceLabel,
      });
    }

    return {
      draftTemplateRoot: templateState.sourceTemplateRoot || null,
      draftTemplatePair: templateState.sourceTemplatePair || null,
      draftSourceLabel: sourceLabel,
    };
  }

  const preparedRoot = await loadGlbScene({ GLTFLoader, assetUrl }).then((loadedScene) => {
    return prepareSceneRootForDraftAsset(loadedScene, sourceLabel);
  });

  if (!preparedRoot) {
    throw createCreatorLoadError(`${sourceLabel} could not be prepared for XiO.`, 'prepare-failed', {
      sourceLabel,
    });
  }

  return {
    draftTemplateRoot: preparedRoot,
    draftTemplatePair: null,
    draftSourceLabel: sourceLabel,
  };
}

function buildDraftLoadPlanBase(draftProp, {
  selectedLivePropKey = null,
  draftCategoryKey = draftProp?.categoryKey || state.draftCategoryKey,
  draftSourceLabel = 'No GLB loaded',
  draftTemplateRoot = null,
  draftTemplatePair = null,
  draftTemplateSourceRoot = draftTemplateRoot,
  draftTemplateSourcePair = draftTemplatePair,
  draftObjectUrl = null,
  draftLocalFile = null,
  autoFitToSlot = false,
} = {}) {
  return {
    selectedLivePropKey,
    draftCategoryKey,
    draftProp,
    draftTemplateRoot,
    draftTemplatePair,
    draftTemplateSourceRoot,
    draftTemplateSourcePair,
    draftSourceLabel,
    draftObjectUrl,
    draftLocalFile,
    autoFitToSlot,
  };
}

function commitDraftLoadPlan(draftLoadPlan, {
  preserveEditSession = false,
  resetView = true,
  disableTurntable = false,
  announceMessage = null,
} = {}) {
  const previousObjectUrl = state.draftObjectUrl;
  if (!preserveEditSession) {
    clearEditSession();
  }

  state.selectedLivePropKey = draftLoadPlan.selectedLivePropKey ?? null;
  state.draftCategoryKey = draftLoadPlan.draftCategoryKey || draftLoadPlan.draftProp?.categoryKey || state.draftCategoryKey;
  state.draftProp = draftLoadPlan.draftProp;
  state.draftTemplateSourceRoot = draftLoadPlan.draftTemplateSourceRoot || null;
  state.draftTemplateSourcePair = draftLoadPlan.draftTemplateSourcePair || null;
  state.draftTemplateRoot = draftLoadPlan.draftTemplateRoot || null;
  state.draftTemplatePair = draftLoadPlan.draftTemplatePair || null;
  state.draftSourceLabel = draftLoadPlan.draftSourceLabel || 'No GLB loaded';
  state.draftObjectUrl = draftLoadPlan.draftObjectUrl || null;
  state.draftLocalFile = draftLoadPlan.draftLocalFile || null;
  if (state.draftProp?.preview && Object.hasOwn(state.draftProp.preview, 'singleWingSide')) {
    delete state.draftProp.preview.singleWingSide;
  }
  if (!state.draftProp?.preview?.wingMotion) {
    setDraftWingMotionPreview(DEFAULT_WING_MOTION_PREVIEW);
  }
  resetWingSyncPreviewState({
    draftProp: state.draftProp,
    draftTemplateRoot: state.draftTemplateRoot,
    draftTemplatePair: state.draftTemplatePair,
  });

  refreshDraftTemplatePresentationFromSource();
  rebuildDraftStage();
  if (draftLoadPlan.autoFitToSlot) {
    const category = getDraftCategoryRecord();
    const didAutoLock = canAutoLockCurrentDraft(state.draftProp, category)
      ? autoLockDraftPlacementToSlot({ commitHistoryStep: false, silent: true })
      : false;
    if (!didAutoLock) {
      autoFitDraftPlacementToSlot();
    }
  }
  resetDraftHistory();

  if (previousObjectUrl && previousObjectUrl !== state.draftObjectUrl) {
    URL.revokeObjectURL(previousObjectUrl);
  }

  renderAll();
  if (resetView) {
    presentCurrentLoadInStage({ disableTurntable });
  }
  if (announceMessage) {
    log(announceMessage);
  }
  return draftLoadPlan;
}

async function buildDraftLoadPlanFromDirectAsset(assetUrl, sourceLabel, draftProp = ensureDraftProp(), { autoFitToSlot = false } = {}) {
  if (!assetUrl) {
    return buildDraftLoadPlanBase(draftProp, {
      selectedLivePropKey: null,
      draftSourceLabel: 'No GLB loaded',
      autoFitToSlot,
    });
  }

  const templateState = await prepareDraftTemplateStateFromAsset(assetUrl, sourceLabel, draftProp);
  return buildDraftLoadPlanBase(draftProp, {
    selectedLivePropKey: state.selectedLivePropKey,
    draftTemplateRoot: templateState.draftTemplateRoot,
    draftTemplatePair: templateState.draftTemplatePair,
    draftTemplateSourceRoot: templateState.draftTemplateRoot || null,
    draftTemplateSourcePair: templateState.draftTemplatePair || null,
    draftSourceLabel: templateState.draftSourceLabel,
    draftObjectUrl: typeof assetUrl === 'string' && assetUrl.startsWith('blob:') ? assetUrl : null,
    autoFitToSlot,
  });
}

async function refreshStandaloneAssetAvailability() {
  if (!IS_FILE_RUNTIME) {
    return;
  }

  const refreshToken = ++state.assetAvailabilityRefreshToken;
  const nextAvailability = new Map();
  const glbProps = getProps().filter((propRecord) => isStandaloneFolderLinkRequired(propRecord));

  if (state.standalonePropsFolder.permission !== STANDALONE_FOLDER_STATUS.linked || !state.standalonePropsFolder.handle) {
    glbProps.forEach((propRecord) => {
      nextAvailability.set(propRecord.key, {
        status: PROP_ASSET_STATUS.needsLink,
        relativePath: getStandaloneAssetRelativePath(propRecord.assetUrl),
      });
    });
    if (refreshToken !== state.assetAvailabilityRefreshToken) {
      return;
    }
    state.propAssetAvailability = nextAvailability;
    state.standalonePropsFolder.missingAssetPath = null;
    renderStandalonePropsFolderControls();
    renderLiveCatalog();
    return;
  }

  let firstMissingAssetPath = null;
  for (const propRecord of glbProps) {
    const relativePath = getStandaloneAssetRelativePath(propRecord.assetUrl);
    const assetFile = relativePath ? await walkLinkedPropsFolderToFile(relativePath) : null;
    if (refreshToken !== state.assetAvailabilityRefreshToken) {
      return;
    }
    nextAvailability.set(propRecord.key, {
      status: assetFile ? PROP_ASSET_STATUS.glbReady : PROP_ASSET_STATUS.missingAsset,
      relativePath,
    });
    if (!assetFile && relativePath && !firstMissingAssetPath) {
      firstMissingAssetPath = relativePath;
    }
  }

  if (refreshToken !== state.assetAvailabilityRefreshToken) {
    return;
  }
  state.propAssetAvailability = nextAvailability;
  state.standalonePropsFolder.missingAssetPath = firstMissingAssetPath;
  renderStandalonePropsFolderControls();
  renderLiveCatalog();
}

async function promptToLinkStandalonePropsFolder({ silent = false } = {}) {
  if (!IS_FILE_RUNTIME) {
    return false;
  }
  if (typeof window.showDirectoryPicker !== 'function') {
    setStandaloneFolderState(STANDALONE_FOLDER_STATUS.unsupported);
    renderAll();
    if (!silent) {
      log('This browser cannot link a local props folder for standalone GLB inventory.');
    }
    return false;
  }

  try {
    const handle = await window.showDirectoryPicker({ id: 'xio-props-folder', mode: 'read' });
    const permission = await queryDirectoryPermissionState(handle, { request: true });
    if (permission !== STANDALONE_FOLDER_STATUS.linked) {
      setStandaloneFolderState(STANDALONE_FOLDER_STATUS.relinkRequired, { name: handle?.name || '' });
      renderAll();
      if (!silent) {
        log('Standalone GLB inventory still needs read permission for HomePageAPP/Images/PROPS.');
      }
      return false;
    }

    const isValidFolder = await validateStandalonePropsFolderHandle(handle);
    if (!isValidFolder) {
      setStandaloneFolderState(STANDALONE_FOLDER_STATUS.relinkRequired);
      renderAll();
      if (!silent) {
        log('Choose the HomePageAPP/Images/PROPS folder so standalone GLB inventory can resolve correctly.');
      }
      return false;
    }

    setStandaloneFolderState(STANDALONE_FOLDER_STATUS.linked, {
      handle,
      name: handle.name || 'PROPS',
      missingAssetPath: null,
    });
    state.propAssetAvailability = new Map();
    renderAll();
    try {
      await writeStandalonePropsFolderHandle(handle);
    } catch (error) {
      console.warn('[XiO Creator] Unable to persist the linked props folder handle.', error);
    }
    void refreshStandaloneAssetAvailability();
    if (!silent) {
      log(`Linked ${handle.name || 'PROPS'} for standalone GLB inventory.`);
    }
    return true;
  } catch (error) {
    if (error?.name === 'AbortError') {
      if (!silent) {
        log('Props folder link cancelled.');
      }
      return false;
    }
    console.warn('[XiO Creator] Unable to link the standalone props folder.', error);
    if (!silent) {
      log('Unable to link the standalone props folder right now.');
    }
    return false;
  }
}

async function restoreStandalonePropsFolderLink() {
  if (!IS_FILE_RUNTIME) {
    return;
  }
  if (typeof window.showDirectoryPicker !== 'function') {
    setStandaloneFolderState(STANDALONE_FOLDER_STATUS.unsupported);
    renderAll();
    return;
  }

  try {
    const storedHandle = await readStandalonePropsFolderHandle().catch(() => null);
    if (!storedHandle) {
      setStandaloneFolderState(STANDALONE_FOLDER_STATUS.unlinked);
      renderAll();
      return;
    }

    const permission = await queryDirectoryPermissionState(storedHandle);
    if (permission !== STANDALONE_FOLDER_STATUS.linked) {
      setStandaloneFolderState(STANDALONE_FOLDER_STATUS.relinkRequired, {
        name: storedHandle.name || 'PROPS',
      });
      renderAll();
      return;
    }

    const isValidFolder = await validateStandalonePropsFolderHandle(storedHandle);
    if (!isValidFolder) {
      await clearStandalonePropsFolderHandle().catch(() => {});
      setStandaloneFolderState(STANDALONE_FOLDER_STATUS.relinkRequired);
      renderAll();
      return;
    }

    setStandaloneFolderState(STANDALONE_FOLDER_STATUS.linked, {
      handle: storedHandle,
      name: storedHandle.name || 'PROPS',
      missingAssetPath: null,
    });
    renderAll();
    void refreshStandaloneAssetAvailability();
  } catch (error) {
    console.warn('[XiO Creator] Unable to restore the standalone props folder handle.', error);
    setStandaloneFolderState(STANDALONE_FOLDER_STATUS.relinkRequired);
    renderAll();
  }
}

async function resolveLiveInventoryAssetSource(propRecord, { allowPromptForLink = false } = {}) {
  if (!propRecord?.assetUrl) {
    return {
      assetUrl: null,
      runtimeObjectUrl: null,
      sourceLabel: propRecord?.label || 'No GLB loaded',
      relativePath: null,
    };
  }

  if (!isStandaloneFolderLinkRequired(propRecord)) {
    return {
      assetUrl: propRecord.assetUrl,
      runtimeObjectUrl: null,
      sourceLabel: propRecord.label,
      relativePath: getStandaloneAssetRelativePath(propRecord.assetUrl),
    };
  }

  if (state.standalonePropsFolder.permission !== STANDALONE_FOLDER_STATUS.linked || !state.standalonePropsFolder.handle) {
    const didLinkFolder = allowPromptForLink
      ? await promptToLinkStandalonePropsFolder()
      : false;
    if (!didLinkFolder || state.standalonePropsFolder.permission !== STANDALONE_FOLDER_STATUS.linked) {
      throw createCreatorLoadError(
        'Link HomePageAPP/Images/PROPS to load GLB inventory in standalone mode.',
        'link-required',
        { propKey: propRecord.key },
      );
    }
  }

  const relativePath = getStandaloneAssetRelativePath(propRecord.assetUrl);
  if (!relativePath) {
    return {
      assetUrl: propRecord.assetUrl,
      runtimeObjectUrl: null,
      sourceLabel: propRecord.label,
      relativePath: null,
    };
  }

  const assetFile = await walkLinkedPropsFolderToFile(relativePath);
  if (!assetFile) {
    state.propAssetAvailability.set(propRecord.key, {
      status: PROP_ASSET_STATUS.missingAsset,
      relativePath,
    });
    state.standalonePropsFolder.missingAssetPath = relativePath;
    renderStandalonePropsFolderControls();
    renderLiveCatalog();
    throw createCreatorLoadError(`Asset missing from linked folder: ${relativePath}`, 'missing-asset', {
      propKey: propRecord.key,
      relativePath,
    });
  }

  state.propAssetAvailability.set(propRecord.key, {
    status: PROP_ASSET_STATUS.glbReady,
    relativePath,
  });
  if (state.standalonePropsFolder.missingAssetPath === relativePath) {
    state.standalonePropsFolder.missingAssetPath = null;
  }
  renderStandalonePropsFolderControls();
  renderLiveCatalog();
  const runtimeObjectUrl = URL.createObjectURL(assetFile);
  return {
    assetUrl: runtimeObjectUrl,
    runtimeObjectUrl,
    sourceLabel: `${propRecord.label} (linked local asset)`,
    relativePath,
  };
}

async function buildDraftLoadPlanFromPropRecord(propRecord) {
  const nextDraftProp = deepCopyProp(propRecord);
  const draftLoadPlan = buildDraftLoadPlanBase(nextDraftProp, {
    selectedLivePropKey: propRecord.key,
    draftCategoryKey: propRecord.categoryKey,
  });

  if (propRecord.preview?.kind === 'xioNoWingProxy') {
    return {
      ...draftLoadPlan,
      draftSourceLabel: `${propRecord.label} (clean wingless view)`,
    };
  }
  if (propRecord.preview?.kind === 'xioBaseWingProxy') {
    return {
      ...draftLoadPlan,
      draftSourceLabel: `${propRecord.label} (XiO base wings)`,
    };
  }
  if (isGeneratedPropPreview(propRecord.preview)) {
    const previewPair = buildGeneratedWingPreview({
      THREE,
      recipe: propRecord.preview.generated,
      attachment: propRecord.attachment,
    });
    const previewState = prepareDraftTemplatePairStateFromLivePreview(
      previewPair,
      `${propRecord.label} (generated wing recipe)`,
      nextDraftProp,
    );
    if (previewState) {
      return {
        ...draftLoadPlan,
        ...previewState,
        draftTemplateSourceRoot: previewState.draftTemplateRoot || null,
        draftTemplateSourcePair: previewState.draftTemplatePair || null,
      };
    }
  }
  if (isLiveGameWingPreviewKey(propRecord.key)) {
    const previewPair = buildLiveGameWingPreview({
      propKey: propRecord.key,
      THREE,
      GLTFLoader,
      renderer,
    });
    const previewState = prepareDraftTemplatePairStateFromLivePreview(
      previewPair,
      `${propRecord.label} (live game preview)`,
      nextDraftProp,
    );
    if (previewState) {
      return {
        ...draftLoadPlan,
        ...previewState,
        draftTemplateSourceRoot: previewState.draftTemplateRoot || null,
        draftTemplateSourcePair: previewState.draftTemplatePair || null,
      };
    }
  }
  if (propRecord.assetUrl) {
    const resolvedAsset = await resolveLiveInventoryAssetSource(propRecord, { allowPromptForLink: true });
    try {
      const templateState = await prepareDraftTemplateStateFromAsset(
        resolvedAsset.assetUrl,
        resolvedAsset.sourceLabel,
        nextDraftProp,
      );
      return {
        ...draftLoadPlan,
        ...templateState,
        draftTemplateSourceRoot: templateState.draftTemplateRoot || null,
        draftTemplateSourcePair: templateState.draftTemplatePair || null,
        draftObjectUrl: resolvedAsset.runtimeObjectUrl || null,
      };
    } catch (error) {
      if (resolvedAsset.runtimeObjectUrl) {
        URL.revokeObjectURL(resolvedAsset.runtimeObjectUrl);
      }
      throw error;
    }
  }

  const legacyPreviewTemplate = createLegacyWingPreviewTemplate(propRecord);
  if (legacyPreviewTemplate) {
    const legacyTemplateState = prepareDraftTemplateStateFromObject(legacyPreviewTemplate, `${propRecord.label} (legacy 3D preview)`);
    return {
      ...draftLoadPlan,
      ...legacyTemplateState,
      draftTemplateSourceRoot: legacyTemplateState.draftTemplateRoot || null,
      draftTemplateSourcePair: null,
    };
  }

  return {
    ...draftLoadPlan,
    draftSourceLabel: `${propRecord.label} (appearance only)`,
  };
}

async function buildDraftLoadPlanFromUpload(file) {
  if (!file) {
    throw createCreatorLoadError('Choose a .glb file first.', 'missing-file');
  }
  if (!/\.glb$/i.test(file.name) && file.type !== 'model/gltf-binary') {
    throw createCreatorLoadError('Only .glb files can be dropped into the XiO creator.', 'invalid-file');
  }

  const nextDraftProp = state.selectedLivePropKey
    ? createEmptyDraftProp(state.draftCategoryKey)
    : deepCopyProp(ensureDraftProp());
  const derivedLabel = file.name.replace(/\.[^.]+$/, '');
  nextDraftProp.label = derivedLabel;
  nextDraftProp.key = slugify(derivedLabel);
  nextDraftProp.storagePath = null;
  nextDraftProp.preview = {
    wingMotion: clonePreviewData(DEFAULT_WING_MOTION_PREVIEW),
  };
  delete nextDraftProp.creatorOnly;

  let runtimeAssetUrl = null;
  let runtimeObjectUrl = null;
  let sourceLabel = `${file.name} (local draft)`;
  runtimeObjectUrl = URL.createObjectURL(file);
  runtimeAssetUrl = runtimeObjectUrl;
  nextDraftProp.assetUrl = runtimeObjectUrl;

  try {
    const templateState = await prepareDraftTemplateStateFromAsset(runtimeAssetUrl, sourceLabel, nextDraftProp);
    return {
      ...buildDraftLoadPlanBase(nextDraftProp, {
        selectedLivePropKey: null,
        draftCategoryKey: nextDraftProp.categoryKey,
        draftObjectUrl: runtimeObjectUrl,
        draftLocalFile: file,
        autoFitToSlot: true,
      }),
      ...templateState,
      draftTemplateSourceRoot: templateState.draftTemplateRoot || null,
      draftTemplateSourcePair: templateState.draftTemplatePair || null,
    };
  } catch (error) {
    if (runtimeObjectUrl) {
      URL.revokeObjectURL(runtimeObjectUrl);
    }
    throw error;
  }
}

function renderLiveCatalog() {
  const categories = getCategories();
  const visibleProps = getVisibleLiveProps();
  const filteredProps = getFilteredLiveProps();
  const categoryCounts = visibleProps.reduce((counts, prop) => {
    counts.set(prop.categoryKey, (counts.get(prop.categoryKey) || 0) + 1);
    return counts;
  }, new Map());
  livePropCount.textContent = filteredProps.length === visibleProps.length
    ? `${visibleProps.length} live props`
    : `${filteredProps.length} of ${visibleProps.length} live props`;

  liveCategoryList.innerHTML = categories.length
    ? categories.map((category) => `
      <article
        class="list-card list-card--interactive${(state.liveCategoryFilter === category.key || (state.liveCategoryFilter === 'all' && state.draftCategoryKey === category.key)) ? ' is-selected' : ''}"
        data-category-card="${escapeHtml(category.key)}"
        tabindex="0"
        role="button"
        aria-label="Focus ${escapeHtml(category.label)} category"
      >
        <div class="list-card__header">
          <div class="list-card__title">
            <div class="list-card__eyebrow">Category</div>
            <h4>${escapeHtml(category.label)}</h4>
          </div>
          <span class="meta-pill">${escapeHtml(categoryCounts.get(category.key) || 0)} live</span>
        </div>
        <div class="category-card__stats">
          <div class="category-card__stat">
            <span class="category-card__stat-label">Slot</span>
            <strong class="category-card__stat-value">${escapeHtml(getSlotLabel(category.slotKey))}</strong>
          </div>
          <div class="category-card__stat">
            <span class="category-card__stat-label">Equip Limit</span>
            <strong class="category-card__stat-value">${escapeHtml(category.equipLimit)}</strong>
          </div>
        </div>
        <div class="list-card__meta">
          ${state.draftCategoryKey === category.key ? '<span class="meta-pill meta-pill--active">Current draft</span>' : ''}
          ${state.liveCategoryFilter === category.key ? '<span class="meta-pill meta-pill--active">Filter on</span>' : ''}
          <span class="meta-pill">${category.enabled ? 'Enabled' : 'Disabled'}</span>
          ${category.key === 'wingSet' ? '<button type="button" class="meta-pill-button meta-pill-button--accent" data-unequip-wings>Unequip Wings</button>' : ''}
        </div>
      </article>
    `).join('')
    : '<div class="list-card"><p class="list-card__description">No live categories yet.</p></div>';

  livePropList.innerHTML = filteredProps.length
    ? filteredProps.map((prop) => {
      const category = getCategoryByKey(prop.categoryKey);
      const description = prop.description ? `<p class="list-card__description">${escapeHtml(prop.description)}</p>` : '';
      const canEdit = !isCreatorOnlyPropRecord(prop);
      const assetAvailability = getPropAssetAvailability(prop);
      const assetBadgeToneClass = assetAvailability.tone ? ` meta-pill--${escapeHtml(assetAvailability.tone)}` : '';
      return `
      <article
        class="list-card list-card--interactive${state.selectedLivePropKey === prop.key ? ' is-selected' : ''}"
        data-load-prop="${escapeHtml(prop.key)}"
        tabindex="0"
        aria-label="Equip ${escapeHtml(prop.label)} on XiO"
      >
        <div class="list-card__header">
          <div class="list-card__title">
            <div class="list-card__eyebrow">${escapeHtml(category?.label || prop.categoryKey)}</div>
            <button type="button" class="list-card__title-button" data-load-prop="${escapeHtml(prop.key)}">
              <span class="list-card__title-text">${escapeHtml(prop.label)}</span>
            </button>
          </div>
          <div class="list-card__header-actions">
            <span class="meta-pill">${escapeHtml(prop.rarity)}</span>
            ${canEdit ? `<button type="button" class="list-card__delete" data-delete-prop="${escapeHtml(prop.key)}" aria-label="Permanently delete ${escapeHtml(prop.label)}" title="Permanently delete ${escapeHtml(prop.label)}">×</button>` : ''}
          </div>
        </div>
        ${description}
        <div class="list-card__meta">
          <span class="meta-pill">${isCreatorOnlyPropRecord(prop) ? 'Built in' : 'Live'}</span>
          <span class="meta-pill">${prop.mysteryBoxEnabled ? 'Mystery Box' : 'Direct only'}</span>
          <span class="meta-pill${assetBadgeToneClass}">${escapeHtml(getPropAssetBadge(prop))}</span>
        </div>
        <div class="list-card__actions">
          <button type="button" class="primary-button" data-load-prop="${escapeHtml(prop.key)}">
            ${escapeHtml(getLivePropEquipLabel(prop))}
          </button>
          ${canEdit ? `<button type="button" class="ghost-button" data-edit-prop="${escapeHtml(prop.key)}">Edit Prop</button>` : ''}
        </div>
      </article>
    `;
    }).join('')
    : `<div class="list-card"><p class="list-card__description">${state.liveSearchQuery || state.liveCategoryFilter !== 'all' ? 'No props match the current filter.' : 'No live props are available yet.'}</p></div>`;
}

function renderAll() {
  renderCategoryOptions();
  renderPresetOptions();
  syncPropForm();
  syncCategoryForm();
  updatePublishStatus();
  renderStandalonePropsFolderControls();
  renderWorkspaceState();
  renderWingAuthoringControls();
  renderWingMotionControls();
  renderLiveCatalog();
  renderEditSessionControls();
  renderStageToolbarControls();
  renderHistoryControls();
  renderGeneratedStageCard();
  if (randomGeneratorModal && !randomGeneratorModal.hidden) {
    populateRandomGeneratorBaseReferences();
    renderRandomGeneratorSummary();
  }
}

function applyDraftFromInputs() {
  const draftProp = ensureDraftProp();
  const previousCategoryKey = draftProp.categoryKey;
  const previousMirrorMode = draftProp.attachment?.mirrorMode || 'single';
  const previousWingAuthoring = clonePreviewData(draftProp.preview?.wingAuthoring);
  draftProp.label = propLabelInput.value.trim();
  draftProp.key = propKeyInput.value.trim();
  draftProp.categoryKey = propCategorySelect.value;
  draftProp.rarity = propRaritySelect.value;
  draftProp.description = propDescriptionInput.value.trim();
  draftProp.tags = propTagsInput.value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry, index, array) => entry.length > 0 && array.indexOf(entry) === index);
  draftProp.active = propActiveToggle.checked;
  draftProp.mysteryBoxEnabled = propMysteryToggle.checked;
  draftProp.eyePreset = eyePresetSelect.value || null;
  draftProp.materialPreset = materialPresetSelect.value || null;
  if (draftProp.categoryKey !== 'wingSet' && draftProp.preview && Object.hasOwn(draftProp.preview, 'generated')) {
    delete draftProp.preview.generated;
  }
  if (draftProp.categoryKey === 'wingSet' && draftProp.preview?.wingAuthoring?.mode === 'isolatedHalf') {
    setDraftWingAuthoringPreview({
      ...getDraftWingAuthoringPreview(draftProp),
      mirrorToBoth: propMirrorToggle.checked,
    });
    syncDraftWingMirrorModeFromPreview(draftProp);
  } else {
    draftProp.attachment.mirrorMode = draftProp.categoryKey === 'wingSet' && propMirrorToggle.checked
      ? 'paired'
      : 'single';
  }
  draftProp.attachment.position = transformInputs.position.map((input) => Number(input.value) || 0);
  draftProp.attachment.rotation = transformInputs.rotation.map((input) => Number(input.value) || 0);
  draftProp.attachment.scale = transformInputs.scale.map((input) => Number(input.value) || 1);
  setDraftCategoryKey(draftProp.categoryKey);
  if (draftProp.categoryKey !== 'wingSet') {
    setWingSyncPreviewState(null, null);
  } else if (previousCategoryKey !== draftProp.categoryKey || previousMirrorMode !== draftProp.attachment.mirrorMode) {
    resetWingSyncPreviewState({ draftProp });
  } else if (JSON.stringify(previousWingAuthoring) !== JSON.stringify(draftProp.preview?.wingAuthoring || null)) {
    resetWingSyncPreviewState({ draftProp });
  }
  refreshDraftTemplatePresentationFromSource();
  rebuildDraftStage();
  commitDraftHistoryStep();
}

function nextRequestId() {
  state.requestCounter += 1;
  return `creator-${state.requestCounter}`;
}

function sendHostRequest(type, payload) {
  if (window.parent === window) {
    return Promise.reject(new Error('No manager host is connected.'));
  }
  const requestId = nextRequestId();
  return new Promise((resolve, reject) => {
    state.pendingRequests.set(requestId, { resolve, reject });
    window.parent.postMessage({ type, requestId, payload }, BRIDGE_TARGET_ORIGIN);
    window.setTimeout(() => {
      if (!state.pendingRequests.has(requestId)) return;
      state.pendingRequests.delete(requestId);
      reject(new Error('Creator request timed out.'));
    }, 30000);
  });
}

function upsertCategory(snapshot, categoryRecord, replaceKey = null) {
  const keysToReplace = new Set([categoryRecord.key]);
  if (replaceKey) keysToReplace.add(replaceKey);
  const categories = snapshot.categories.filter((entry) => !keysToReplace.has(entry.key));
  categories.push(categoryRecord);
  return buildHomepageCatalogSnapshot({ categories, props: snapshot.props });
}

function removeCategory(snapshot, categoryKey) {
  return buildHomepageCatalogSnapshot({
    categories: snapshot.categories.filter((entry) => entry.key !== categoryKey),
    props: snapshot.props.filter((entry) => entry.categoryKey !== categoryKey),
  });
}

function upsertProp(snapshot, propRecord, replaceKey = null) {
  const keysToReplace = new Set([propRecord.key]);
  if (replaceKey) keysToReplace.add(replaceKey);
  const props = snapshot.props.filter((entry) => !keysToReplace.has(entry.key));
  props.push(propRecord);
  return buildHomepageCatalogSnapshot({ categories: snapshot.categories, props });
}

function removeProp(snapshot, propKey) {
  return buildHomepageCatalogSnapshot({
    categories: snapshot.categories,
    props: snapshot.props.filter((entry) => entry.key !== propKey),
  });
}

function resolveSnapshotPropKey(snapshot, propRecord, preferredKey = null) {
  const props = Array.isArray(snapshot?.props) ? snapshot.props : [];
  const preferredRawKey = typeof preferredKey === 'string' ? preferredKey.trim() : '';
  if (preferredRawKey) {
    const exactPreferredMatch = props.find((entry) => entry.key === preferredRawKey);
    if (exactPreferredMatch?.key) return exactPreferredMatch.key;
    const normalizedPreferredKey = normalizeHomepagePropKey(preferredRawKey);
    if (normalizedPreferredKey) {
      const normalizedPreferredMatch = props.find((entry) => normalizeHomepagePropKey(entry.key) === normalizedPreferredKey);
      if (normalizedPreferredMatch?.key) return normalizedPreferredMatch.key;
    }
  }
  if (propRecord?.key) {
    const exactPropMatch = props.find((entry) => entry.key === propRecord.key);
    if (exactPropMatch?.key) return exactPropMatch.key;
    const normalizedPropKey = normalizeHomepagePropKey(propRecord.key);
    if (normalizedPropKey) {
      const normalizedPropMatch = props.find((entry) => normalizeHomepagePropKey(entry.key) === normalizedPropKey);
      if (normalizedPropMatch?.key) return normalizedPropMatch.key;
    }
  }
  if (propRecord?.storagePath) {
    const storagePathMatch = props.find((entry) => entry.storagePath === propRecord.storagePath);
    if (storagePathMatch?.key) return storagePathMatch.key;
  }
  if (propRecord?.assetUrl) {
    const assetUrlMatch = props.find((entry) => entry.assetUrl === propRecord.assetUrl);
    if (assetUrlMatch?.key) return assetUrlMatch.key;
  }
  if (propRecord?.label && propRecord?.categoryKey) {
    const labelCategoryMatch = props.find((entry) => (
      entry.label === propRecord.label
      && entry.categoryKey === propRecord.categoryKey
    ));
    if (labelCategoryMatch?.key) return labelCategoryMatch.key;
  }
  return preferredRawKey || propRecord?.key || null;
}

function remapPropsToCategoryKey(snapshot, previousKey, nextKey) {
  if (!previousKey || !nextKey || previousKey === nextKey) {
    return snapshot;
  }
  const props = snapshot.props.map((entry) => (
    entry.categoryKey === previousKey
      ? { ...entry, categoryKey: nextKey }
      : entry
  ));
  return buildHomepageCatalogSnapshot({ categories: snapshot.categories, props });
}

async function uploadCurrentFile(file) {
  if (!file) return false;
  if (state.motionPreviewEnabled) {
    setMotionPreviewEnabled(false, { silent: true });
  }
  const draftLoadPlan = await buildDraftLoadPlanFromUpload(file);
  commitDraftLoadPlan(draftLoadPlan, {
    disableTurntable: true,
    announceMessage: `Loaded ${file.name} into the XiO workspace.`,
  });
  return true;
}

async function publishDraftProp({ archive = false } = {}) {
  applyDraftFromInputs();
  const draftProp = ensureDraftProp();
  if (draftProp.preview && Object.hasOwn(draftProp.preview, 'singleWingSide')) {
    delete draftProp.preview.singleWingSide;
  }
  if (isCreatorOnlyPropRecord(draftProp)) {
    throw new Error('Built-in XiO wing states cannot be published as new props.');
  }
  if (isBlobBackedLocalDraft(draftProp)) {
    throw new Error('Standalone local draft saves cannot persist dropped GLB files after refresh. Open the manager route to publish this asset.');
  }
  if (
    state.publishEnabled
    && typeof draftProp?.assetUrl === 'string'
    && draftProp.assetUrl.startsWith('blob:')
  ) {
    if (!(state.draftLocalFile instanceof File)) {
      throw new Error('This local GLB preview needs to be re-dropped before it can be published live.');
    }
    try {
      const uploadResponse = await sendHostRequest(HOMEPAGE_PROP_UPLOAD_REQUEST, {
        file: state.draftLocalFile,
      });
      draftProp.assetUrl = uploadResponse?.data?.assetUrl || draftProp.assetUrl;
      draftProp.storagePath = uploadResponse?.data?.storagePath || null;
      state.draftSourceLabel = state.draftLocalFile.name;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to upload the dropped GLB for live publishing.';
      throw new Error(`${message} The GLB is still loaded locally in the stage, but it was not uploaded to the live game yet.`);
    }
  }
  if (!draftProp.label) throw new Error('Prop name is required before publishing.');
  if (!draftProp.key) draftProp.key = slugify(draftProp.label);
  if (!draftProp.key) throw new Error('Prop key could not be generated.');
  if (archive) {
    draftProp.active = false;
    draftProp.mysteryBoxEnabled = false;
  } else if (state.publishEnabled) {
    draftProp.active = draftProp.active !== false;
    draftProp.mysteryBoxEnabled = draftProp.mysteryBoxEnabled === true;
  }
  const shouldPinMysteryTestReward = !archive && draftProp.active !== false && draftProp.mysteryBoxEnabled === true;
  draftProp.archived = archive;
  const baselineKey = state.editSession.baselineProp?.key || null;
  const selectedLiveKey = state.selectedLivePropKey && state.selectedLivePropKey !== draftProp.key
    ? state.selectedLivePropKey
    : null;
  const previousKey = baselineKey && baselineKey !== draftProp.key
    ? baselineKey
    : selectedLiveKey;
  let saveResponse = null;

  if (state.publishEnabled) {
    saveResponse = await sendHostRequest(HOMEPAGE_PROP_SAVE_REQUEST, {
      entity: 'prop',
      record: draftProp,
      previousKey,
    });
  }

  const persistedPropKey = typeof saveResponse?.data?.persistedPropKey === 'string' && saveResponse.data.persistedPropKey.trim().length > 0
    ? saveResponse.data.persistedPropKey.trim()
    : draftProp.key;
  const authoritativeSnapshot = saveResponse?.data?.snapshot
    ? withCatalogFallback(saveResponse.data.snapshot)
    : null;
  const nextSnapshot = authoritativeSnapshot || upsertProp(state.snapshot, deepCopyProp(draftProp), previousKey);
  const resolvedPersistedPropKey = resolveSnapshotPropKey(nextSnapshot, draftProp, persistedPropKey);
  if (resolvedPersistedPropKey) {
    draftProp.key = resolvedPersistedPropKey;
  }
  state.selectedLivePropKey = resolvedPersistedPropKey;
  state.liveCategoryFilter = draftProp.categoryKey || 'all';
  state.liveSearchQuery = '';
  state.snapshot = nextSnapshot;
  persistHomepageCatalogSnapshot(state.snapshot);
  renderAll();
  if (state.publishEnabled) {
    console.info('[XiO Creator] Live prop save completed.', {
      draftPropKey: ensureDraftProp().key,
      persistedPropKey: resolvedPersistedPropKey,
      snapshotUpdatedAt: authoritativeSnapshot?.updatedAt ?? saveResponse?.data?.snapshot?.updatedAt ?? null,
      mysteryTestOverride: saveResponse?.data?.mysteryTestOverride ?? null,
    });
  }
  log(`${archive ? 'Archived' : state.publishEnabled ? 'Published' : 'Saved'} ${draftProp.label} ${state.publishEnabled ? 'to the live game' : 'to local draft storage'}.`);
  if (!archive && state.publishEnabled) {
    if (shouldPinMysteryTestReward) {
      const shouldLaunchMysteryTest = await requestMysteryLaunchConfirmation({
        title: `${draftProp.label} is live`,
        message: 'Saved into the live inventory and pinned as the next Mystery Box reward for testing. Would you like to go to the Homepage now and pull the Mystery scroll?',
      });
      if (shouldLaunchMysteryTest) {
        log(`Opening Homepage so you can test ${draftProp.label} as the next Mystery Box reward.`);
        launchMysteryBoxTest();
        return;
      }
      showCreatorNotice({
        tone: 'success',
        eyebrow: 'Live Inventory Updated',
        title: `${draftProp.label} is live`,
        message: 'Saved into the live inventory and pinned as the next Mystery Box reward for testing.',
        timeoutMs: 5600,
      });
      return;
    }
    showCreatorNotice({
      tone: 'success',
      eyebrow: 'Live Inventory Updated',
      title: `${draftProp.label} is live`,
      message: 'Saved into the live inventory. Mystery Box is off for this prop, so it will not be the next reward.',
      timeoutMs: 5600,
    });
    return;
  }
  if (!archive && shouldPinMysteryTestReward) {
    const localMysteryTestState = persistStandaloneMysteryTestReward(
      ensureDraftProp().key,
      nextSnapshot?.updatedAt ?? null,
    );
    console.info('[XiO Creator] Local prop save pinned for mystery-box testing.', {
      draftPropKey: ensureDraftProp().key,
      snapshotUpdatedAt: nextSnapshot?.updatedAt ?? null,
      mysteryTestOverride: localMysteryTestState.override,
      mysteryTestSession: localMysteryTestState.session,
    });
    const shouldLaunchMysteryTest = await requestMysteryLaunchConfirmation({
      eyebrow: 'Local Draft Saved',
      title: `${draftProp.label} is staged for Mystery Box testing`,
      message: 'Saved in your local creator workspace and pinned as the next Mystery Box reward on this device. Would you like to go to the Homepage now and pull the Mystery scroll?',
    });
    if (shouldLaunchMysteryTest) {
      log(`Opening Homepage so you can test ${draftProp.label} as the next Mystery Box reward.`);
      launchMysteryBoxTest();
      return;
    }
    showCreatorNotice({
      tone: 'success',
      eyebrow: 'Local Draft Saved',
      title: `${draftProp.label} is staged for testing`,
      message: 'Saved locally and pinned as the next Mystery Box reward on this device.',
      timeoutMs: 5600,
    });
    return;
  }
  showCreatorNotice({
    tone: archive ? 'info' : 'success',
    eyebrow: archive ? 'Archived' : 'Local Draft Saved',
    title: archive
      ? `${draftProp.label} archived`
      : `${draftProp.label} saved locally`,
    message: archive
      ? 'This prop has been removed from the active Mystery Box flow.'
      : 'This draft is saved only in your local creator workspace.',
    timeoutMs: 5600,
  });
}

async function permanentlyDeleteProp(propKey) {
  const propRecord = getProps().find((entry) => entry.key === propKey);
  if (!propRecord) {
    throw new Error('Select a live prop before deleting it.');
  }
  if (isCreatorOnlyPropRecord(propRecord)) {
    throw new Error('XiO built-in studio helper props cannot be permanently deleted.');
  }

  const deleteMessage = propRecord.storagePath
    ? `Delete "${propRecord.label}" permanently from the live inventory? This also removes the uploaded GLB from storage.`
    : `Delete "${propRecord.label}" permanently from the live inventory? This will hide the prop from the Mystery Box flow.`;
  const confirmed = await requestDestructiveConfirmation({
    eyebrow: 'Delete Prop',
    title: `Delete ${propRecord.label}?`,
    message: deleteMessage,
    confirmLabel: 'Delete Permanently',
  });
  if (!confirmed) {
    return false;
  }

  const deleteMode = propRecord.storagePath ? 'hard' : 'tombstone';
  let deleteResponse = null;
  if (state.publishEnabled) {
    deleteResponse = await sendHostRequest(HOMEPAGE_PROP_SAVE_REQUEST, {
      entity: 'prop',
      action: 'delete',
      deleteMode,
      record: propRecord,
    });
  }

  const authoritativeSnapshot = deleteResponse?.data?.snapshot
    ? withCatalogFallback(deleteResponse.data.snapshot)
    : null;
  state.snapshot = authoritativeSnapshot || (
    deleteMode === 'hard'
      ? removeProp(state.snapshot, propRecord.key)
      : upsertProp(state.snapshot, {
        ...deepCopyProp(propRecord),
        active: false,
        archived: true,
        mysteryBoxEnabled: false,
      })
  );

  if (state.selectedLivePropKey === propRecord.key) {
    state.selectedLivePropKey = null;
  }
  if (state.draftProp?.key === propRecord.key) {
    clearEditSession();
    clearDraftTemplateSources({ releaseObjectUrl: true });
    state.draftProp = createEmptyDraftProp(propRecord.categoryKey || state.draftCategoryKey);
    state.draftSourceLabel = 'No GLB loaded';
    resetWingSyncPreviewState({ draftProp: state.draftProp });
    rebuildDraftStage();
    resetDraftHistory();
  }

  persistHomepageCatalogSnapshot(state.snapshot);
  renderAll();
  log(`Deleted ${propRecord.label} ${state.publishEnabled ? 'from the live inventory' : 'from the local creator catalog'}.`);
  showCreatorNotice({
    tone: 'success',
    eyebrow: 'Deleted',
    title: `${propRecord.label} removed`,
    message: state.publishEnabled
      ? 'This prop has been removed from the live inventory and will no longer appear in the Mystery Box flow.'
      : 'This prop has been removed from the local creator catalog.',
    timeoutMs: 5600,
  });
  return true;
}

async function saveCategory() {
  const previousKey = getCategoryEditorRecord()?.key || null;
  const categoryRecord = {
    key: categoryKeyInput.value.trim(),
    label: categoryLabelInput.value.trim(),
    slotKey: categorySlotSelect.value,
    equipLimit: Math.max(1, Number(categoryEquipLimitInput.value) || 1),
    sortOrder: Number(categorySortOrderInput.value) || 0,
    enabled: categoryEnabledToggle.checked,
  };
  if (!categoryRecord.key || !categoryRecord.label) {
    throw new Error('Category key and label are required.');
  }

  if (state.publishEnabled) {
    await sendHostRequest(HOMEPAGE_PROP_SAVE_REQUEST, {
      entity: 'category',
      record: categoryRecord,
      previousKey: previousKey && previousKey !== categoryRecord.key ? previousKey : null,
    });
  }

  state.snapshot = upsertCategory(
    state.snapshot,
    categoryRecord,
    previousKey && previousKey !== categoryRecord.key ? previousKey : null,
  );
  state.snapshot = remapPropsToCategoryKey(
    state.snapshot,
    previousKey,
    categoryRecord.key,
  );
  if (!previousKey || state.draftCategoryKey === previousKey || ensureDraftProp().categoryKey === previousKey) {
    setDraftCategoryKey(categoryRecord.key);
  }
  setCategoryEditorKey(categoryRecord.key);
  persistHomepageCatalogSnapshot(state.snapshot);
  renderAll();
  log(`Saved category ${categoryRecord.label} ${state.publishEnabled ? 'to the live game' : 'locally'}.`);
  showCreatorNotice({
    tone: 'success',
    eyebrow: 'Category Saved',
    title: `${categoryRecord.label} updated`,
    message: `${categoryRecord.label} is ready to use in the prop category dropdown.`,
    timeoutMs: 4600,
  });
}

async function deleteCurrentCategory() {
  const categoryRecord = getCategoryEditorRecord();
  if (!categoryRecord?.key) {
    throw new Error('Select a saved category before deleting it.');
  }
  if (CORE_CATEGORY_KEYS.has(categoryRecord.key)) {
    throw new Error('XiO core categories stay available and cannot be deleted.');
  }

  const propCount = state.snapshot.props.filter((entry) => entry.categoryKey === categoryRecord.key).length;
  const confirmed = await requestDestructiveConfirmation({
    eyebrow: 'Delete Category',
    title: `Delete ${categoryRecord.label}?`,
    message: propCount > 0
      ? `This removes the category and ${propCount} prop${propCount === 1 ? '' : 's'} assigned to it from the live inventory.`
      : `This removes the category from the live inventory and the prop category dropdown.`,
    confirmLabel: 'Delete Category',
  });
  if (!confirmed) {
    return false;
  }

  if (state.publishEnabled) {
    await sendHostRequest(HOMEPAGE_PROP_SAVE_REQUEST, {
      entity: 'category',
      action: 'delete',
      record: categoryRecord,
    });
  }

  state.snapshot = removeCategory(state.snapshot, categoryRecord.key);
  const nextAvailableCategory = state.snapshot.categories[0] || null;
  const deletedDraftCategory = ensureDraftProp().categoryKey === categoryRecord.key;
  if ((state.draftCategoryKey === categoryRecord.key || deletedDraftCategory) && nextAvailableCategory) {
    setDraftCategoryKey(nextAvailableCategory.key);
  }
  if (deletedDraftCategory) {
    clearEditSession();
    clearDraftTemplateSources({ releaseObjectUrl: true });
    state.draftProp = createEmptyDraftProp(nextAvailableCategory?.key || state.draftCategoryKey);
    state.draftSourceLabel = 'No GLB loaded';
    resetWingSyncPreviewState({ draftProp: state.draftProp });
    rebuildDraftStage();
    resetDraftHistory();
  }
  if (state.liveCategoryFilter === categoryRecord.key) {
    state.liveCategoryFilter = 'all';
  }
  if (state.selectedLivePropKey && !getProps().some((entry) => entry.key === state.selectedLivePropKey)) {
    state.selectedLivePropKey = null;
  }
  setCategoryEditorKey(nextAvailableCategory?.key || null);
  persistHomepageCatalogSnapshot(state.snapshot);
  renderAll();
  log(`Deleted category ${categoryRecord.label} ${state.publishEnabled ? 'from the live game' : 'locally'}.`);
  showCreatorNotice({
    tone: 'success',
    eyebrow: 'Category Deleted',
    title: `${categoryRecord.label} removed`,
    message: 'The category list and prop dropdown were updated right away.',
    timeoutMs: 5200,
  });
  return true;
}

function beginNewCategoryDraft({ focusKeyField = false } = {}) {
  setCategoryEditorKey(null);
  syncCategoryForm(null);
  renderCategoryOptions();
  if (categoryManagerSection) {
    categoryManagerSection.open = true;
  }
  if (focusKeyField) {
    window.setTimeout(() => {
      categoryLabelInput?.focus();
    }, 0);
  }
}

async function hydrateDraftFromPropRecord(propRecord, {
  announce = true,
  resetView = true,
  preserveEditSession = false,
} = {}) {
  const draftLoadPlan = await buildDraftLoadPlanFromPropRecord(propRecord);
  commitDraftLoadPlan(draftLoadPlan, {
    preserveEditSession,
    resetView,
    announceMessage: announce ? `Equipped ${propRecord.label} on XiO.` : null,
  });
}

async function loadLiveProp(propKey, options = {}) {
  const propRecord = getProps().find((entry) => entry.key === propKey);
  if (!propRecord) return false;
  try {
    await hydrateDraftFromPropRecord(propRecord, options);
    return true;
  } catch (error) {
    const fallbackMessage = `Unable to load ${propRecord.label} on XiO.`;
    if (error?.code === 'link-required') {
      log(error.message || fallbackMessage);
      renderAll();
      return false;
    }
    if (error?.code === 'missing-asset') {
      log(error.message || fallbackMessage);
      renderAll();
      return false;
    }
    log(error instanceof Error ? error.message : fallbackMessage);
    renderAll();
    return false;
  }
}

function loadRandomPropFromCategory(categoryKey) {
  const options = getVisibleLiveProps().filter((entry) => entry.categoryKey === categoryKey);
  if (!options.length) {
    log(`No live ${categoryKey} props are available yet.`);
    return;
  }
  const choice = options[Math.floor(Math.random() * options.length)];
  void loadLiveProp(choice.key);
}

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  if (!event.data || typeof event.data !== 'object') return;

  if (event.data.type === HOMEPAGE_CATALOG_SYNC) {
    if (event.data.payload?.snapshot) {
      state.snapshot = withCatalogFallback(event.data.payload.snapshot);
      persistHomepageCatalogSnapshot(state.snapshot);
    }
    state.publishEnabled = event.data.payload?.publishEnabled === true;
    state.publishReason = event.data.payload?.reason || null;
    updatePublishStatus();
    renderAll();
    return;
  }

  if (event.data.type === HOMEPAGE_PROP_SAVE_RESULT) {
    const pending = state.pendingRequests.get(event.data.requestId);
    if (!pending) return;
    state.pendingRequests.delete(event.data.requestId);
    if (event.data.ok) {
      pending.resolve(event.data);
    } else {
      pending.reject(new Error(event.data.error || 'Creator request failed.'));
    }
  }
});

window.parent.postMessage({ type: HOMEPAGE_CREATOR_READY }, BRIDGE_TARGET_ORIGIN);

function resizeRenderer() {
  const width = stageShell.clientWidth;
  const height = stageShell.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
}

new ResizeObserver(() => resizeRenderer()).observe(stageShell);
resizeRenderer();
let stageDragDepth = 0;

creatorCanvas.addEventListener('click', (event) => {
  const selectableTargets = getSelectableStageTargets();
  if (!selectableTargets.length) return;

  const bounds = creatorCanvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;

  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hit = raycaster.intersectObjects(selectableTargets, true)[0];
  if (!hit) return;

  const selectedTarget = findSelectableTarget(hit.object);
  if (!selectedTarget) return;

  const wasAlreadySelected = state.stageSelection === selectedTarget;
  setStageSelection(selectedTarget);
  syncPropForm();

  if (!wasAlreadySelected) {
    const selectedProp = getSelectedLiveProp();
    const label = selectedProp?.label || ensureDraftProp().label || 'current prop';
    log(`Selected ${label} for direct transform editing.`);
  }
});

$('toggle-preview-motion-button').addEventListener('click', () => {
  setMotionPreviewEnabled(!state.motionPreviewEnabled);
});
$('auto-lock-fit-button').addEventListener('click', () => {
  autoLockDraftPlacementToSlot();
});
$('sync-both-wings-button').addEventListener('click', () => {
  syncBothWingsAnimationPreview();
});
$('sync-one-wing-button').addEventListener('click', () => {
  syncOneWingAnimationPreview();
});
$('toggle-turntable-button').addEventListener('click', () => {
  if (state.motionPreviewEnabled) {
    return;
  }
  state.turntableEnabled = !state.turntableEnabled;
  renderStageToolbarControls();
});
$('fit-view-button').addEventListener('click', presentCurrentLoadInStage);
$('focus-prop-button').addEventListener('click', focusCurrentProp);
$('edit-prop-button').addEventListener('click', () => {
  void activatePropEditing();
});
togglePlacementDepthButton.addEventListener('click', () => {
  toggleDraftPlacementDepth();
});
undoAdjustmentButton.addEventListener('click', () => {
  undoDraftAdjustment();
});
redoAdjustmentButton.addEventListener('click', () => {
  redoDraftAdjustment();
});
saveEditButton.addEventListener('click', async () => {
  try { await saveActiveEditSession(); } catch (error) { log(error instanceof Error ? error.message : 'Unable to save prop edits.'); }
});
cancelEditButton.addEventListener('click', async () => {
  try { await cancelActiveEditSession(); } catch (error) { log(error instanceof Error ? error.message : 'Unable to cancel prop edits.'); }
});
$('refresh-live-button').addEventListener('click', () => {
  window.parent.postMessage({ type: HOMEPAGE_CREATOR_READY }, BRIDGE_TARGET_ORIGIN);
});
$('clear-stage-button').addEventListener('click', () => {
  clearEditSession();
  state.selectedLivePropKey = null;
  clearDraftTemplateSources({ releaseObjectUrl: true });
  state.draftProp = createEmptyDraftProp(state.draftCategoryKey);
  state.draftSourceLabel = 'No GLB loaded';
  resetWingSyncPreviewState({ draftProp: state.draftProp });
  rebuildDraftStage();
  resetDraftHistory();
  renderAll();
  log('Cleared the stage and reset the workspace draft.');
});
$('duplicate-prop-button').addEventListener('click', () => {
  clearEditSession();
  const draftProp = deepCopyProp(ensureDraftProp());
  draftProp.key = draftProp.key ? `${draftProp.key}-copy` : '';
  draftProp.label = draftProp.label ? `${draftProp.label} Copy` : '';
  delete draftProp.creatorOnly;
  state.draftProp = draftProp;
  state.selectedLivePropKey = null;
  resetWingSyncPreviewState({ draftProp: state.draftProp });
  resetDraftHistory();
  renderAll();
  log('Duplicated the current prop draft.');
});
$('random-wings-button').addEventListener('click', () => loadRandomPropFromCategory('wingSet'));
$('random-crown-button').addEventListener('click', () => loadRandomPropFromCategory('headWear'));
$('random-body-gear-button')?.addEventListener('click', () => loadRandomPropFromCategory('bodyAccessory'));
randomPropGeneratorButton?.addEventListener('click', () => {
  openRandomGeneratorModal();
});
randomGeneratorCloseButton?.addEventListener('click', () => {
  if (!randomGeneratorIsBusy) {
    closeRandomGeneratorModal();
  }
});
randomGeneratorCancelButton?.addEventListener('click', () => {
  if (!randomGeneratorIsBusy) {
    closeRandomGeneratorModal();
  }
});
randomGeneratorGenerateButton?.addEventListener('click', () => {
  void generateRandomWingDraftToStage();
});
[
  randomGeneratorCategorySelect,
  randomGeneratorRaritySelect,
  randomGeneratorThemeModeSelect,
  randomGeneratorThemeInput,
  randomGeneratorDetailDensitySelect,
  randomGeneratorColorHarmonySelect,
  randomGeneratorFitModeSelect,
  randomGeneratorBaseReferenceSelect,
].filter(Boolean).forEach((input) => {
  input.addEventListener('input', renderRandomGeneratorSummary);
  input.addEventListener('change', renderRandomGeneratorSummary);
});
wingAutoIsolateButton?.addEventListener('click', () => {
  void applyWingAuthoringState({
    mode: 'isolatedHalf',
    sourceSide: getPreferredWingAuthoringSide(),
    mirrorToBoth: true,
  }, {
    announceMessage: 'Auto-isolated the active wing source and mirrored it to both wings.',
  });
});
wingResetSourceButton?.addEventListener('click', () => {
  resetWingAuthoringToOriginal();
});
wingUseLeftButton?.addEventListener('click', () => {
  void applyWingAuthoringState({
    mode: 'isolatedHalf',
    sourceSide: 'left',
  }, {
    announceMessage: 'Switched the wing source to the left half.',
  });
});
wingUseRightButton?.addEventListener('click', () => {
  void applyWingAuthoringState({
    mode: 'isolatedHalf',
    sourceSide: 'right',
  }, {
    announceMessage: 'Switched the wing source to the right half.',
  });
});
wingMirrorBothToggle?.addEventListener('change', () => {
  void applyWingAuthoringState({
    mode: 'isolatedHalf',
    mirrorToBoth: wingMirrorBothToggle.checked,
  }, {
    announceMessage: wingMirrorBothToggle.checked
      ? 'Mirroring the isolated wing source to both wings.'
      : 'Previewing only one authored wing side.',
  });
});
wingSplitOffsetInput?.addEventListener('input', () => {
  if (getDraftWingAuthoringPreview().mode !== 'isolatedHalf') return;
  void applyWingAuthoringState({
    splitOffset: Number(wingSplitOffsetInput.value),
  }, {
    commitHistoryStep: false,
    autoFit: false,
    silent: true,
  });
});
wingSplitOffsetInput?.addEventListener('change', () => {
  if (getDraftWingAuthoringPreview().mode !== 'isolatedHalf') return;
  void applyWingAuthoringState({
    splitOffset: Number(wingSplitOffsetInput.value),
  }, {
    commitHistoryStep: true,
    autoFit: false,
    announceMessage: 'Updated the wing split offset.',
  });
});
wingTrimMarginInput?.addEventListener('input', () => {
  if (getDraftWingAuthoringPreview().mode !== 'isolatedHalf') return;
  void applyWingAuthoringState({
    trimMargin: Number(wingTrimMarginInput.value),
  }, {
    commitHistoryStep: false,
    autoFit: false,
    silent: true,
  });
});
wingTrimMarginInput?.addEventListener('change', () => {
  if (getDraftWingAuthoringPreview().mode !== 'isolatedHalf') return;
  void applyWingAuthoringState({
    trimMargin: Number(wingTrimMarginInput.value),
  }, {
    commitHistoryStep: true,
    autoFit: false,
    announceMessage: 'Updated the wing trim margin.',
  });
});
wingMotionPreviewButton?.addEventListener('click', () => {
  setMotionPreviewEnabled(!state.motionPreviewEnabled);
});
wingMotionLinkedToggle?.addEventListener('change', () => {
  setDraftWingMotionLinked(wingMotionLinkedToggle.checked, { commitHistoryStep: true });
  refreshWingMotionPreviewLive({ autoStart: true });
});
Object.entries(wingMotionInputs).forEach(([groupKey, controls]) => {
  Object.values(controls).forEach((input) => {
    if (!input) return;
    input.addEventListener('input', () => {
      applyWingMotionInputGroup(groupKey, { commitHistoryStep: false });
      refreshWingMotionPreviewLive({ autoStart: true });
      renderAll();
    });
    input.addEventListener('change', () => {
      applyWingMotionInputGroup(groupKey, { commitHistoryStep: true });
      refreshWingMotionPreviewLive({ autoStart: true });
      renderAll();
    });
  });
});
linkPropsFolderButton?.addEventListener('click', () => {
  void promptToLinkStandalonePropsFolder();
});
$('publish-prop-button').addEventListener('click', async () => {
  try {
    await publishDraftProp({ archive: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to publish prop.';
    log(message);
    showCreatorNotice({
      tone: 'error',
      eyebrow: 'Save Failed',
      title: 'Prop was not saved',
      message,
      timeoutMs: 7200,
    });
  }
});
$('archive-prop-button').addEventListener('click', async () => {
  try {
    await publishDraftProp({ archive: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to archive prop.';
    log(message);
    showCreatorNotice({
      tone: 'error',
      eyebrow: 'Archive Failed',
      title: 'Prop was not archived',
      message,
      timeoutMs: 7200,
    });
  }
});
$('save-category-button').addEventListener('click', async () => {
  try {
    await saveCategory();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save category.';
    log(message);
    showCreatorNotice({
      tone: 'error',
      eyebrow: 'Category Failed',
      title: 'Category was not saved',
      message,
      timeoutMs: 6200,
    });
  }
});
$('use-category-button').addEventListener('click', () => {
  const nextCategoryKey = getCategoryEditorRecord()?.key;
  if (!nextCategoryKey) {
    showCreatorNotice({
      tone: 'error',
      eyebrow: 'Save Category First',
      title: 'Category is not ready yet',
      message: 'Save the category before using it in the prop draft dropdown.',
      timeoutMs: 4200,
    });
    return;
  }
  setDraftCategoryKey(nextCategoryKey);
  showCreatorNotice({
    tone: 'success',
    eyebrow: 'Draft Updated',
    title: 'Draft category changed',
    message: 'New props will save into the selected category.',
    timeoutMs: 3200,
  });
  renderAll();
});
categoryEditorSelect?.addEventListener('change', () => {
  const nextValue = categoryEditorSelect.value;
  if (nextValue === CATEGORY_EDITOR_NEW_VALUE) {
    beginNewCategoryDraft();
    return;
  }
  setCategoryEditorKey(nextValue);
  syncCategoryForm();
});
newCategoryButton?.addEventListener('click', () => {
  beginNewCategoryDraft({ focusKeyField: true });
});
deleteCategoryButton?.addEventListener('click', async () => {
  try {
    await deleteCurrentCategory();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete category.';
    log(message);
    showCreatorNotice({
      tone: 'error',
      eyebrow: 'Delete Failed',
      title: 'Category was not deleted',
      message,
      timeoutMs: 7200,
    });
  }
});
categoryLabelInput?.addEventListener('input', () => {
  if (!categoryKeyInput.value.trim()) {
    categoryKeyInput.value = slugify(categoryLabelInput.value);
  }
});
$('load-selected-live-button').addEventListener('click', () => {
  if (!state.selectedLivePropKey) {
    log('Select a live prop from the right panel first.');
    return;
  }
  void loadLiveProp(state.selectedLivePropKey);
});
$('reset-appearance-button').addEventListener('click', () => {
  const draftProp = ensureDraftProp();
  draftProp.eyePreset = null;
  draftProp.materialPreset = null;
  rebuildDraftStage();
  commitDraftHistoryStep();
  renderAll();
});

transformModeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setTransformMode(button.dataset.transformMode);
  });
});

[
  propLabelInput, propKeyInput, propCategorySelect, propRaritySelect, propDescriptionInput, propTagsInput,
  propActiveToggle, propMysteryToggle, propMirrorToggle, eyePresetSelect, materialPresetSelect,
  ...transformInputs.position, ...transformInputs.rotation, ...transformInputs.scale,
].forEach((input) => input.addEventListener('change', applyDraftFromInputs));

window.addEventListener('keydown', (event) => {
  if (!randomGeneratorModal?.hidden) {
    if (event.key === 'Escape' && !randomGeneratorIsBusy) {
      event.preventDefault();
      closeRandomGeneratorModal();
      return;
    }
    trapFocusInsideRandomGenerator(event);
  }
  if (!saveSuccessModal?.hidden && event.key === 'Escape') {
    event.preventDefault();
    resolveSaveSuccessPrompt(false);
    return;
  }
  if (!deleteConfirmModal?.hidden && event.key === 'Escape') {
    event.preventDefault();
    resolveDeleteConfirm(false);
    return;
  }
  const target = event.target;
  const tagName = target instanceof HTMLElement ? target.tagName : '';
  const isTypingTarget = target instanceof HTMLElement
    && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName));
  if (isTypingTarget || !(event.ctrlKey || event.metaKey) || event.altKey) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === 'z' && event.shiftKey) {
    event.preventDefault();
    redoDraftAdjustment();
    return;
  }
  if (key === 'z') {
    event.preventDefault();
    undoDraftAdjustment();
    return;
  }
  if (key === 'y') {
    event.preventDefault();
    redoDraftAdjustment();
  }
});

propLabelInput.addEventListener('input', () => {
  if (!propKeyInput.value.trim()) {
    propKeyInput.value = slugify(propLabelInput.value);
  }
});

$('glb-upload-input').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await uploadCurrentFile(file);
    const draftProp = ensureDraftProp();
    if (!draftProp.label) draftProp.label = file.name.replace(/\.[^.]+$/, '');
    if (!draftProp.key) draftProp.key = slugify(draftProp.label);
    renderAll();
  } catch (error) {
    log(error instanceof Error ? error.message : 'Unable to upload GLB.');
  } finally {
    event.target.value = '';
  }
});

creatorNoticeCloseButton?.addEventListener('click', () => {
  hideCreatorNotice();
});

saveSuccessCloseButton?.addEventListener('click', () => {
  resolveSaveSuccessPrompt(false);
});

saveSuccessStayButton?.addEventListener('click', () => {
  resolveSaveSuccessPrompt(false);
});

saveSuccessLaunchButton?.addEventListener('click', () => {
  resolveSaveSuccessPrompt(true);
});

deleteConfirmCloseButton?.addEventListener('click', () => {
  resolveDeleteConfirm(false);
});

deleteConfirmCancelButton?.addEventListener('click', () => {
  resolveDeleteConfirm(false);
});

deleteConfirmConfirmButton?.addEventListener('click', () => {
  resolveDeleteConfirm(true);
});

deleteConfirmModal?.addEventListener('click', (event) => {
  if (event.target === deleteConfirmModal) {
    resolveDeleteConfirm(false);
  }
});

saveSuccessModal?.addEventListener('click', (event) => {
  if (event.target === saveSuccessModal) {
    resolveSaveSuccessPrompt(false);
  }
});

randomGeneratorModal?.addEventListener('click', (event) => {
  if (event.target === randomGeneratorModal && !randomGeneratorIsBusy) {
    closeRandomGeneratorModal();
  }
});

['dragenter', 'dragover'].forEach((eventName) => {
  stageShell.addEventListener(eventName, (event) => {
    if (!hasFileDataTransfer(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (eventName === 'dragenter') {
      stageDragDepth += 1;
    }
    dropOverlay.classList.add('is-visible');
  });
});

stageShell.addEventListener('dragleave', (event) => {
  event.preventDefault();
  event.stopPropagation();
  stageDragDepth = Math.max(0, stageDragDepth - 1);
  if (stageDragDepth === 0) {
    dropOverlay.classList.remove('is-visible');
  }
});

stageShell.addEventListener('drop', (event) => {
  event.preventDefault();
  event.stopPropagation();
  stageDragDepth = 0;
  dropOverlay.classList.remove('is-visible');
  const file = extractGlbFileFromDataTransfer(event.dataTransfer);
  if (!file) {
    log('Drop a .glb file directly into the XiO stage to preview it.');
    return;
  }
  void uploadCurrentFile(file).then(() => {
    const draftProp = ensureDraftProp();
    if (!draftProp.label) draftProp.label = file.name.replace(/\.[^.]+$/, '');
    if (!draftProp.key) draftProp.key = slugify(draftProp.label);
    renderAll();
  }).catch((error) => {
    log(error instanceof Error ? error.message : 'Unable to upload dropped GLB.');
  });
});

window.addEventListener('dragover', (event) => {
  if (!hasFileDataTransfer(event.dataTransfer)) {
    return;
  }
  event.preventDefault();
});

window.addEventListener('drop', (event) => {
  if (!hasFileDataTransfer(event.dataTransfer)) {
    return;
  }
  const stageTarget = event.target instanceof Node && stageShell.contains(event.target);
  if (stageTarget) {
    return;
  }
  event.preventDefault();
});

function focusCategoryCard(categoryKey) {
  const category = getCategoryByKey(categoryKey);
  if (!category) return;
  state.draftCategoryKey = category.key;
  state.liveCategoryFilter = category.key;
  setDraftCategoryKey(category.key);
  setCategoryEditorKey(category.key);
  syncCategoryForm(category);
  if (categoryManagerSection) categoryManagerSection.open = true;
  renderAll();
  log(`Focused ${category.label} in the workspace.`);
}

liveCategoryList.addEventListener('click', (event) => {
  const unequipWingsButton = event.target.closest('[data-unequip-wings]');
  if (unequipWingsButton) {
    event.preventDefault();
    event.stopPropagation();
    void loadLiveProp('xioNoWings');
    return;
  }
  const target = event.target.closest('[data-category-card]');
  if (!target) return;
  focusCategoryCard(target.dataset.categoryCard);
});

liveCategoryList.addEventListener('keydown', (event) => {
  const target = event.target.closest('[data-category-card]');
  if (!target || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
  focusCategoryCard(target.dataset.categoryCard);
});

livePropList.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('[data-delete-prop]');
  if (deleteButton) {
    event.preventDefault();
    event.stopPropagation();
    void permanentlyDeleteProp(deleteButton.dataset.deleteProp).catch((error) => {
      const message = error instanceof Error ? error.message : 'Unable to permanently delete this prop.';
      log(message);
      showCreatorNotice({
        tone: 'error',
        eyebrow: 'Delete Failed',
        title: 'Prop was not deleted',
        message,
        timeoutMs: 7200,
      });
    });
    return;
  }
  const editPropButton = event.target.closest('[data-edit-prop]');
  if (editPropButton) {
    event.stopPropagation();
    void activatePropEditing(editPropButton.dataset.editProp);
    return;
  }
  const loadButton = event.target.closest('[data-load-prop]');
  if (loadButton) {
    void loadLiveProp(loadButton.dataset.loadProp);
  }
});

livePropList.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const target = event.target.closest('[data-load-prop]');
  if (!target) return;
  event.preventDefault();
  void loadLiveProp(target.dataset.loadProp);
});

liveSearchInput.addEventListener('input', (event) => {
  state.liveSearchQuery = event.target.value || '';
  renderLiveCatalog();
});

liveCategoryFilter.addEventListener('change', (event) => {
  state.liveCategoryFilter = event.target.value || 'all';
  renderLiveCatalog();
});

fitCameraToCharacter();
state.draftProp = createEmptyDraftProp(state.draftCategoryKey);
resetWingSyncPreviewState({ draftProp: state.draftProp });
setTransformMode(state.transformMode);
initializeLeftPanelSectionState();
populateRandomGeneratorOptions();
populateRandomGeneratorBaseReferences();
renderRandomGeneratorSummary();
renderAll();
resetDraftHistory();
syncPropForm();
syncCategoryForm();
void restoreStandalonePropsFolderLink();
log('Creator ready. Drag a GLB into the stage to begin.');

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  orbitControls.update();
  if (state.motionPreviewEnabled) {
    updatePreviewMotion(dt);
  } else {
    if (state.turntableEnabled && performance.now() >= state.turntablePauseUntilMs) {
      xio.creatureGroup.rotation.y += dt * 0.32;
    }
    xio.leftEye.update(0.02, 0, dt);
    xio.rightEye.update(-0.02, 0, dt);
  }
  renderer.render(scene, camera);
}
animate();
})().catch((error) => {
  console.error('[XiO Creator] Failed to initialize.', error);
  const workspaceLogElement = document.getElementById('workspace-log');
  if (workspaceLogElement) {
    const message = error instanceof Error ? error.message : 'Unknown initialization failure.';
    workspaceLogElement.innerHTML = `
      <article class="workspace-log__entry">
        <span class="workspace-log__time">Boot Failure</span>
        <p class="workspace-log__message">${escapeHtml(message)}</p>
      </article>
    `;
  }
});
