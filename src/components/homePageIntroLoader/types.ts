export type InteractiveRewardVariant = 'drift' | 'drop' | 'burst';
export type InteractiveRewardPhase = 'flying' | 'pressed' | 'opening' | 'collected';
export type RewardQualityProfile = 'full' | 'lite' | 'reduced-motion';

export type InteractiveRewardCollectPayload = {
  tokenId: string;
  variant: InteractiveRewardVariant;
  occurredAt: string;
};

export type HomePageIntroLoaderProps = {
  ready: boolean;
  onFinish?: () => void;
  assetSrc: string;
  totalPoints: number;
  rewardPoints?: number;
  bootStartedAtMs: number;
  bootTargetDurationMs?: number;
  onCollect?: (payload: InteractiveRewardCollectPayload) => boolean | void | Promise<boolean | void>;
  className?: string;
};

export type Point = { x: number; y: number };
export type CubicCurve = { start: Point; controlOne: Point; controlTwo: Point; end: Point };

export type StageBounds = {
  width: number;
  height: number;
  dpr: number;
  left: number;
  top: number;
};

export type SpriteBundle = {
  coin: CanvasImageSource;
  glow: CanvasImageSource | null;
  burst: CanvasImageSource | null;
  drawSizePx: number;
};

export type SpriteSet = {
  full: SpriteBundle;
  lite: SpriteBundle;
  reducedMotion: SpriteBundle;
};

export type RewardToken = {
  id: string;
  variant: InteractiveRewardVariant;
  phase: InteractiveRewardPhase;
  spawnedAtMs: number;
  phaseStartedAtMs: number;
  travelDurationMs: number;
  expiresAtMs: number;
  pointerId: number | null;
  sizePx: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  driftAmplitude: number;
  driftFrequency: number;
  driftPhase: number;
  rotationBase: number;
  rotationVelocity: number;
  zIndex: number;
  visualX: number;
  visualY: number;
  visualRadius: number;
  visualRotation: number;
  freezeX: number;
  freezeY: number;
  freezeRotation: number;
};

export type PointerRecord = {
  x: number;
  y: number;
  tokenId: string | null;
};

export type LoaderRuntimeState = {
  previousFrameMs: number;
  visualProgress: number;
  finishAtMs: number | null;
  finishTriggered: boolean;
  rollingFrameMs: number;
  consecutiveSpikes: number;
  nextSpawnAtMs: number;
  tokenSequence: number;
  qualityProfile: RewardQualityProfile;
};
