export type HomepagePropRarity =
  | 'common'
  | 'rare'
  | 'legendary'
  | 'legendaryLight'
  | 'legendaryDark';

export type HomepagePropMirrorMode = 'single' | 'paired';

export interface HomepageCategoryRecord {
  key: string;
  label: string;
  slotKey: string;
  equipLimit: number;
  sortOrder: number;
  enabled: boolean;
  updatedAt?: string | null;
}

export interface HomepagePropAttachment {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  mirrorMode?: HomepagePropMirrorMode;
  fit?: {
    distanceMultiplier?: number;
    yOffsetRatio?: number;
    zOffsetRatio?: number;
    initialRotationY?: number;
  } | null;
}

export interface HomepageWingAuthoringPreview {
  mode?: 'originalPair' | 'isolatedHalf';
  sourceSide?: 'left' | 'right';
  mirrorToBoth?: boolean;
  splitOffset?: number;
  trimMargin?: number;
}

export interface HomepageWingMotionChannel {
  flapHz?: number;
  direction?: 'normal' | 'reverse';
  amplitude?: number;
  sweep?: number;
  pitch?: number;
  featherTwist?: number;
  shoulderSpread?: number;
  phaseOffset?: number;
}

export interface HomepageWingMotionPreview {
  linked?: boolean;
  master?: HomepageWingMotionChannel | null;
  left?: HomepageWingMotionChannel | null;
  right?: HomepageWingMotionChannel | null;
}

export interface HomepageGeneratedColorPalette {
  key?: string;
  label?: string;
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  shadow: string;
  metal: string;
}

export interface HomepageGeneratedStructureRecipe {
  family: string;
  silhouette: string;
  membrane: boolean;
  span: number;
  height: number;
  primaryLayerCount: number;
  secondaryLayerCount: number;
  featherLength: number;
  featherWidth: number;
  innerLift: number;
  outerSweep: number;
  crestCount: number;
  tipFlare: number;
}

export interface HomepageGeneratedOrnamentRecipe {
  haloBands: number;
  crystalClusters: number;
  runeSigils: number;
  ribbonTrails: number;
  emberNodes: number;
  crownSpurs: number;
  glowMode: string;
  ornamentBudget: number;
}

export interface HomepageGeneratedPropPreview {
  version: number;
  seed?: number | null;
  category: string;
  theme: string;
  themeLabel: string;
  themeMode: string;
  rarityProfile: HomepagePropRarity;
  fitTemplateId: string;
  fitMode?: string;
  baseReferenceKey: string | null;
  materialFamily: string;
  colorHarmonyMode: string;
  detailDensity: string;
  palette: HomepageGeneratedColorPalette;
  structureRecipe: HomepageGeneratedStructureRecipe;
  ornamentRecipe: HomepageGeneratedOrnamentRecipe;
  fitAttachment?: HomepagePropAttachment;
  displaySummary?: {
    categoryLabel?: string;
    rarityLabel?: string;
    themeLabel?: string;
    detailLabel?: string;
    materialDirection?: string;
    fitLabel?: string;
    baseReferenceLabel?: string;
  };
}

export interface HomepagePropPreview {
  wingAuthoring?: HomepageWingAuthoringPreview;
  wingMotion?: HomepageWingMotionPreview;
  generated?: HomepageGeneratedPropPreview;
  [key: string]: unknown;
}

export interface HomepagePropRecord {
  key: string;
  label: string;
  categoryKey: string;
  prewarmPriority?: number;
  factoryId?: string;
  creatorOnly?: boolean;
  rarity: HomepagePropRarity;
  assetUrl: string | null;
  storagePath: string | null;
  attachment: HomepagePropAttachment;
  eyePreset: string | null;
  materialPreset: string | null;
  mysteryBoxEnabled: boolean;
  active: boolean;
  archived: boolean;
  tags: string[];
  description: string;
  preview: HomepagePropPreview;
  updatedAt?: string | null;
}

export interface HomepageCatalogSnapshot {
  version: 1;
  updatedAt: string;
  categories: HomepageCategoryRecord[];
  props: HomepagePropRecord[];
}
