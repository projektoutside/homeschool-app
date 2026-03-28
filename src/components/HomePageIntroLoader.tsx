import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import backgroundImage from '../../MainLoadingScreen.png';
import './HomePageIntroLoader.css';

const xioLoadingImageSrc = `${import.meta.env.BASE_URL}HomePageAPP/XiOLoadingscreen.png`;
const DEFAULT_MINIMUM_DURATION_MS = 7000;
const DEFAULT_REWARD_POINTS = 10;
const DPR_CAP = 2;
const INTRO_PREWARM_TIMEOUT_MS = 900;
const FINISH_DELAY_MS = 280;
const FINISH_ANIMATION_MS = 420;
const PRESS_AUTO_OPEN_MS = 120;
const PRESSED_STALE_MS = 260;
const OPENING_DURATION_MS = 430;
const COLLECTED_CLEANUP_MS = 170;
const HOLD_RELEASE_SETTLE_MS = 90;
const FRAME_BUDGET_MS = 18;
const FRAME_SPIKE_MS = 22;
const PROGRESS_HOLD_CAP = 0.925;
const ORIGINAL_SCROLL_ROTATION_RAD = (21 * Math.PI) / 180;

const clamp = (value: number, min = 0, max = 1): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const lerp = (start: number, end: number, alpha: number): number => start + ((end - start) * alpha);
const easeOutCubic = (value: number): number => 1 - ((1 - clamp(value)) ** 3);
const easeInOutSine = (value: number): number => -(Math.cos(Math.PI * clamp(value)) - 1) / 2;
const smoothstep = (value: number): number => {
  const next = clamp(value);
  return next * next * (3 - (2 * next));
};
const randomBetween = (min: number, max: number): number => min + ((max - min) * Math.random());
const getAnimationClockNow = (): number => (
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
);

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void => {
  const nextRadius = Math.min(radius, width * 0.5, height * 0.5);
  context.beginPath();
  context.moveTo(x + nextRadius, y);
  context.arcTo(x + width, y, x + width, y + height, nextRadius);
  context.arcTo(x + width, y + height, x, y + height, nextRadius);
  context.arcTo(x, y + height, x, y, nextRadius);
  context.arcTo(x, y, x + width, y, nextRadius);
  context.closePath();
};

const waitForImageLoad = (image: HTMLImageElement): Promise<void> => new Promise((resolve, reject) => {
  image.onload = () => resolve();
  image.onerror = () => reject(new Error('image-load-failed'));
});

const loadImage = async (src: string, timeoutMs = 1200): Promise<HTMLImageElement | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  const image = new Image();
  image.decoding = 'async';
  image.src = src;

  const timeoutPromise = new Promise<null>((resolve) => {
    window.setTimeout(() => resolve(null), timeoutMs);
  });

  const decodePromise = (async () => {
    try {
      if (typeof image.decode === 'function') {
        await image.decode();
        return image;
      }
      await waitForImageLoad(image);
      return image;
    } catch {
      return null;
    }
  })();

  return Promise.race([decodePromise, timeoutPromise]);
};

type InteractiveRewardVariant = 'drift' | 'drop' | 'burst';
type InteractiveRewardPhase = 'flying' | 'pressed' | 'opening' | 'collected';
type RewardQualityProfile = 'full' | 'lite' | 'reduced-motion';

export type InteractiveRewardCollectPayload = {
  tokenId: string;
  variant: InteractiveRewardVariant;
  occurredAt: string;
};

type HomePageIntroLoaderProps = {
  ready: boolean;
  onFinish?: () => void;
  assetSrc: string;
  totalPoints: number;
  rewardPoints?: number;
  minimumDurationMs?: number;
  onCollect?: (payload: InteractiveRewardCollectPayload) => boolean | void | Promise<boolean | void>;
  onExitHoldChange?: (holding: boolean) => void;
  className?: string;
};

type Point = { x: number; y: number };
type CubicCurve = { start: Point; controlOne: Point; controlTwo: Point; end: Point };
type StageBounds = { width: number; height: number; dpr: number };
type SpriteBundle = { coin: CanvasImageSource; glow: HTMLCanvasElement | null; burst: HTMLCanvasElement | null; drawSizePx: number };
type SpriteSet = { full: SpriteBundle; lite: SpriteBundle; reducedMotion: SpriteBundle };

type RewardToken = {
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

type PointerRecord = { x: number; y: number; tokenId: string | null };

type RuntimeState = {
  startedAtMs: number;
  previousFrameMs: number;
  visualProgress: number;
  finishAtMs: number | null;
  finishTriggered: boolean;
  bootReadyState: boolean;
  qualityProfile: RewardQualityProfile;
  rollingFrameMs: number;
  consecutiveSpikes: number;
  nextSpawnAtMs: number;
  tokenSequence: number;
  lastHoldState: boolean;
};

const INTRO_CURVE: CubicCurve = Object.freeze({
  start: { x: 0.1, y: 0.58 },
  controlOne: { x: 0.32, y: 0.58 },
  controlTwo: { x: 0.62, y: 0.58 },
  end: { x: 0.84, y: 0.58 },
});

const getProfileMaxActiveTokens = (profile: RewardQualityProfile): number => (
  profile === 'full' ? 4 : profile === 'lite' ? 2 : 1
);

const getProfileSpawnDelayRangeMs = (profile: RewardQualityProfile): [number, number] => (
  profile === 'full' ? [520, 860] : profile === 'lite' ? [760, 1180] : [980, 1380]
);

const getProfileHitPaddingPx = (profile: RewardQualityProfile): number => (
  profile === 'full' ? 14 : profile === 'lite' ? 18 : 20
);

const getProfileDrawScale = (profile: RewardQualityProfile): number => (
  profile === 'full' ? 1 : profile === 'lite' ? 0.92 : 0.84
);

const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }
    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  return prefersReducedMotion;
};

const buildGlowSprite = (sizePx: number): HTMLCanvasElement | null => {
  const canvas = createCanvas(sizePx, sizePx);
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  const gradient = context.createRadialGradient(sizePx * 0.5, sizePx * 0.5, sizePx * 0.12, sizePx * 0.5, sizePx * 0.5, sizePx * 0.5);
  gradient.addColorStop(0, 'rgba(120, 238, 255, 0.38)');
  gradient.addColorStop(0.55, 'rgba(120, 238, 255, 0.18)');
  gradient.addColorStop(1, 'rgba(120, 238, 255, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, sizePx, sizePx);
  return canvas;
};

const buildBurstSprite = (sizePx: number): HTMLCanvasElement | null => {
  const canvas = createCanvas(sizePx, sizePx);
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  const center = sizePx * 0.5;
  const outerRadius = sizePx * 0.5;
  const innerRadius = sizePx * 0.14;
  context.save();
  context.translate(center, center);
  for (let index = 0; index < 8; index += 1) {
    context.rotate((Math.PI * 2) / 8);
    context.beginPath();
    context.moveTo(0, -innerRadius);
    context.lineTo(sizePx * 0.08, -outerRadius);
    context.lineTo(0, -(outerRadius * 0.72));
    context.lineTo(-sizePx * 0.08, -outerRadius);
    context.closePath();
    context.fillStyle = index % 2 === 0 ? 'rgba(255, 236, 163, 0.92)' : 'rgba(120, 238, 255, 0.9)';
    context.fill();
  }
  context.restore();

  const centerGradient = context.createRadialGradient(center, center, sizePx * 0.04, center, center, sizePx * 0.24);
  centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  centerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = centerGradient;
  context.fillRect(0, 0, sizePx, sizePx);
  return canvas;
};

const buildCoinSprite = (sourceImage: HTMLImageElement | null, sizePx: number): HTMLCanvasElement => {
  const canvas = createCanvas(sizePx, sizePx);
  const context = canvas.getContext('2d');
  if (!context) {
    return canvas;
  }

  if (sourceImage) {
    context.drawImage(sourceImage, 0, 0, sizePx, sizePx);
    return canvas;
  }

  const center = sizePx * 0.5;
  const radius = sizePx * 0.4;
  const outerGradient = context.createRadialGradient(center, center, radius * 0.12, center, center, radius);
  outerGradient.addColorStop(0, '#fff7d1');
  outerGradient.addColorStop(0.44, '#ffd24d');
  outerGradient.addColorStop(1, '#c97a05');
  context.fillStyle = outerGradient;
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = sizePx * 0.06;
  context.strokeStyle = 'rgba(255, 255, 255, 0.44)';
  context.stroke();
  context.fillStyle = 'rgba(112, 57, 2, 0.9)';
  context.font = `${Math.floor(sizePx * 0.28)}px "Trebuchet MS", "Segoe UI", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('PTS', center, center + (sizePx * 0.01));
  return canvas;
};

const buildSpriteBundle = (image: HTMLImageElement | null, sizePx: number, glowEnabled: boolean): SpriteBundle => ({
  coin: buildCoinSprite(image, sizePx),
  glow: glowEnabled ? buildGlowSprite(Math.round(sizePx * 1.8)) : null,
  burst: buildBurstSprite(Math.round(sizePx * 1.9)),
  drawSizePx: sizePx,
});

const buildSpriteSet = async (
  rewardAssetSrc: string,
  prefersReducedMotion: boolean,
): Promise<{ spriteSet: SpriteSet; xioImage: HTMLImageElement | null }> => {
  const [coinImage, xioImage] = await Promise.all([
    loadImage(rewardAssetSrc, INTRO_PREWARM_TIMEOUT_MS),
    loadImage(xioLoadingImageSrc, INTRO_PREWARM_TIMEOUT_MS),
  ]);
  return {
    spriteSet: {
      full: buildSpriteBundle(coinImage, 96, true),
      lite: buildSpriteBundle(coinImage, 82, true),
      reducedMotion: buildSpriteBundle(coinImage, 70, !prefersReducedMotion),
    },
    xioImage,
  };
};

const resolveBundleForProfile = (spriteSet: SpriteSet, profile: RewardQualityProfile): SpriteBundle => (
  profile === 'full' ? spriteSet.full : profile === 'lite' ? spriteSet.lite : spriteSet.reducedMotion
);

const resolveStagePoint = (bounds: StageBounds, point: Point): Point => {
  const stageLeft = Math.max(18, bounds.width * 0.06);
  const stageRight = bounds.width - Math.max(20, bounds.width * 0.08);
  const stageTop = Math.max(48, bounds.height * 0.14);
  const stageBottom = bounds.height - Math.max(132, bounds.height * 0.2);
  return {
    x: lerp(stageLeft, stageRight, point.x),
    y: lerp(stageTop, stageBottom, point.y),
  };
};

const cubicBezierPoint = (t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: (mt2 * mt * p0.x) + (3 * mt2 * t * p1.x) + (3 * mt * t2 * p2.x) + (t2 * t * p3.x),
    y: (mt2 * mt * p0.y) + (3 * mt2 * t * p1.y) + (3 * mt * t2 * p2.y) + (t2 * t * p3.y),
  };
};

const cubicBezierTangent = (t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point => {
  const mt = 1 - t;
  return {
    x: (3 * mt * mt * (p1.x - p0.x)) + (6 * mt * t * (p2.x - p1.x)) + (3 * t * t * (p3.x - p2.x)),
    y: (3 * mt * mt * (p1.y - p0.y)) + (6 * mt * t * (p2.y - p1.y)) + (3 * t * t * (p3.y - p2.y)),
  };
};

const resolveFlightPose = (bounds: StageBounds, progress: number) => {
  const start = resolveStagePoint(bounds, INTRO_CURVE.start);
  const controlOne = resolveStagePoint(bounds, INTRO_CURVE.controlOne);
  const controlTwo = resolveStagePoint(bounds, INTRO_CURVE.controlTwo);
  const end = resolveStagePoint(bounds, INTRO_CURVE.end);
  const point = cubicBezierPoint(clamp(progress), start, controlOne, controlTwo, end);
  const tangent = cubicBezierTangent(clamp(progress), start, controlOne, controlTwo, end);
  return { point, angle: Math.atan2(tangent.y, tangent.x) };
};

const drawScrollIcon = (context: CanvasRenderingContext2D, x: number, y: number, scale: number): void => {
  context.save();
  context.translate(x, y);
  context.rotate(ORIGINAL_SCROLL_ROTATION_RAD);
  context.scale(scale, scale);
  context.translate(-48, -66);

  const paperGradient = context.createLinearGradient(0, 16, 0, 102);
  paperGradient.addColorStop(0, '#fff2bf');
  paperGradient.addColorStop(0.54, '#ffd272');
  paperGradient.addColorStop(1, '#ea9f34');
  const woodGradient = context.createLinearGradient(0, 11, 0, 107);
  woodGradient.addColorStop(0, '#ff9a45');
  woodGradient.addColorStop(1, '#933b0f');

  drawRoundedRect(context, 24, 16, 48, 86, 13);
  context.fillStyle = paperGradient;
  context.fill();
  context.lineWidth = 3.6;
  context.strokeStyle = '#e58d25';
  context.stroke();

  drawRoundedRect(context, 15, 11, 66, 14, 7);
  context.fillStyle = woodGradient;
  context.fill();
  drawRoundedRect(context, 15, 93, 66, 14, 7);
  context.fill();

  context.fillStyle = '#f5b753';
  [[18, 18], [78, 18], [18, 100], [78, 100]].forEach(([circleX, circleY]) => {
    context.beginPath();
    context.arc(circleX, circleY, 5, 0, Math.PI * 2);
    context.fill();
  });

  context.strokeStyle = 'rgba(138, 76, 11, 0.72)';
  context.lineWidth = 3.5;
  context.lineCap = 'round';
  [
    [35, 38, 61, 38],
    [31, 52, 65, 52],
    [34, 66, 56, 66],
    [31, 80, 61, 80],
  ].forEach(([startX, startY, endX, endY]) => {
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
  });
  context.restore();
};

const drawFallbackXio = (context: CanvasRenderingContext2D, x: number, y: number, sizePx: number): void => {
  const outer = context.createRadialGradient(x, y, sizePx * 0.08, x, y, sizePx * 0.5);
  outer.addColorStop(0, 'rgba(203, 250, 255, 1)');
  outer.addColorStop(0.58, 'rgba(85, 234, 255, 0.94)');
  outer.addColorStop(1, 'rgba(85, 234, 255, 0)');
  context.fillStyle = outer;
  context.beginPath();
  context.arc(x, y, sizePx * 0.5, 0, Math.PI * 2);
  context.fill();
};

const drawStageLane = (
  context: CanvasRenderingContext2D,
  bounds: StageBounds,
  flightProgress: number,
  reducedMotion: boolean,
  nowMs: number,
): void => {
  const start = resolveStagePoint(bounds, INTRO_CURVE.start);
  const controlOne = resolveStagePoint(bounds, INTRO_CURVE.controlOne);
  const controlTwo = resolveStagePoint(bounds, INTRO_CURVE.controlTwo);
  const end = resolveStagePoint(bounds, INTRO_CURVE.end);
  const pulse = reducedMotion ? 0.52 : 0.58 + (Math.sin(nowMs * 0.0018) * 0.08);
  context.save();
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.bezierCurveTo(controlOne.x, controlOne.y, controlTwo.x, controlTwo.y, end.x, end.y);
  context.lineWidth = Math.max(18, bounds.height * 0.038);
  context.strokeStyle = `rgba(16, 28, 58, ${reducedMotion ? 0.48 : 0.58})`;
  context.stroke();

  context.beginPath();
  context.moveTo(start.x, start.y);
  context.bezierCurveTo(controlOne.x, controlOne.y, controlTwo.x, controlTwo.y, end.x, end.y);
  context.lineWidth = Math.max(9, bounds.height * 0.016);
  context.strokeStyle = `rgba(94, 233, 255, ${pulse})`;
  context.shadowBlur = reducedMotion ? 0 : 14;
  context.shadowColor = 'rgba(94, 233, 255, 0.26)';
  context.stroke();
  context.shadowBlur = 0;

  const trail = resolveFlightPose(bounds, flightProgress);
  const trailGradient = context.createLinearGradient(start.x, start.y, trail.point.x, trail.point.y);
  trailGradient.addColorStop(0, 'rgba(120, 238, 255, 0)');
  trailGradient.addColorStop(0.35, 'rgba(120, 238, 255, 0.16)');
  trailGradient.addColorStop(1, 'rgba(241, 251, 255, 0.95)');
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.bezierCurveTo(controlOne.x, controlOne.y, controlTwo.x, controlTwo.y, trail.point.x, trail.point.y);
  context.lineWidth = Math.max(5, bounds.height * 0.012);
  context.strokeStyle = trailGradient;
  context.stroke();
  context.restore();
};

const updateTokenVisualPose = (token: RewardToken, nowMs: number): RewardToken => {
  if (token.phase !== 'flying') {
    return token;
  }

  const ageMs = Math.max(0, nowMs - token.spawnedAtMs);
  const travelProgress = clamp(ageMs / token.travelDurationMs);
  const easedTravel = easeInOutSine(travelProgress);
  let x = lerp(token.fromX, token.toX, easedTravel);
  let y = lerp(token.fromY, token.toY, easedTravel);

  if (ageMs > token.travelDurationMs) {
    const hoverMs = ageMs - token.travelDurationMs;
    const wave = Math.sin((hoverMs * token.driftFrequency) + token.driftPhase);
    const swirl = Math.cos((hoverMs * token.driftFrequency * 0.64) + token.driftPhase);
    x += swirl * token.driftAmplitude * 0.26;
    y += wave * token.driftAmplitude * 0.34;
  } else if (token.variant === 'drop') {
    y += (travelProgress * travelProgress) * token.driftAmplitude * 0.26;
  } else if (token.variant === 'burst') {
    y -= Math.sin(travelProgress * Math.PI) * token.driftAmplitude * 0.4;
  }

  const oscillation = Math.sin((ageMs * token.driftFrequency * 0.84) + token.driftPhase);
  const radius = token.sizePx * (0.47 + (oscillation * 0.018));
  return {
    ...token,
    visualX: x,
    visualY: y,
    visualRadius: radius,
    visualRotation: token.rotationBase + (ageMs * token.rotationVelocity * 0.001),
    zIndex: Math.round(y + radius),
  };
};

const createRewardToken = (
  tokenIndex: number,
  nowMs: number,
  bounds: StageBounds,
  profile: RewardQualityProfile,
): RewardToken => {
  const variantRoll = Math.random();
  const variant: InteractiveRewardVariant = variantRoll < 0.42 ? 'drift' : (variantRoll < 0.76 ? 'drop' : 'burst');
  const drawScale = getProfileDrawScale(profile);
  const sizePx = randomBetween(bounds.width * 0.065, bounds.width * 0.084) * drawScale;
  const fromX = randomBetween(bounds.width * 0.09, bounds.width * 0.9);
  const fromY = randomBetween(bounds.height * 0.16, bounds.height * 0.68);
  const toX = clamp(fromX + randomBetween(-bounds.width * 0.12, bounds.width * 0.12), bounds.width * 0.08, bounds.width * 0.92);
  const toY = clamp(fromY + randomBetween(-bounds.height * 0.08, bounds.height * 0.08), bounds.height * 0.16, bounds.height * 0.72);
  const driftAmplitude = randomBetween(sizePx * 0.14, sizePx * 0.3);
  const driftFrequency = randomBetween(0.0052, 0.0085);
  const driftPhase = randomBetween(0, Math.PI * 2);
  const travelDurationMs = randomBetween(620, 1100);
  const ageAllowanceMs = profile === 'full' ? 6200 : 5400;
  return {
    id: `reward-${tokenIndex}`,
    variant,
    phase: 'flying',
    spawnedAtMs: nowMs,
    phaseStartedAtMs: nowMs,
    travelDurationMs,
    expiresAtMs: nowMs + ageAllowanceMs,
    pointerId: null,
    sizePx,
    fromX,
    fromY,
    toX,
    toY,
    driftAmplitude,
    driftFrequency,
    driftPhase,
    rotationBase: randomBetween(-0.22, 0.22),
    rotationVelocity: randomBetween(-0.28, 0.28),
    zIndex: 0,
    visualX: fromX,
    visualY: fromY,
    visualRadius: sizePx * 0.48,
    visualRotation: 0,
    freezeX: fromX,
    freezeY: fromY,
    freezeRotation: 0,
  };
};

const HomePageIntroLoader: React.FC<HomePageIntroLoaderProps> = ({
  ready,
  onFinish,
  assetSrc,
  totalPoints,
  rewardPoints = DEFAULT_REWARD_POINTS,
  minimumDurationMs = DEFAULT_MINIMUM_DURATION_MS,
  onCollect,
  onExitHoldChange,
  className,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [caughtRewardPoints, setCaughtRewardPoints] = useState(0);
  const [qualityProfileState, setQualityProfileState] = useState<RewardQualityProfile>(prefersReducedMotion ? 'reduced-motion' : 'full');
  const [bootReadyState, setBootReadyState] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boundsRef = useRef<StageBounds>({ width: 0, height: 0, dpr: 1 });
  const spriteSetRef = useRef<SpriteSet | null>(null);
  const xioImageRef = useRef<HTMLImageElement | null>(null);
  const tokensRef = useRef<RewardToken[]>([]);
  const pointersRef = useRef<Map<number, PointerRecord>>(new Map());
  const mountedRef = useRef(true);
  const readyRef = useRef(ready);
  const onCollectRef = useRef(onCollect);
  const onFinishRef = useRef(onFinish);
  const onExitHoldChangeRef = useRef(onExitHoldChange);
  const runtimeRef = useRef<RuntimeState>({
    startedAtMs: getAnimationClockNow(),
    previousFrameMs: 0,
    visualProgress: 0.06,
    finishAtMs: null,
    finishTriggered: false,
    bootReadyState: false,
    qualityProfile: prefersReducedMotion ? 'reduced-motion' : 'full',
    rollingFrameMs: 16.67,
    consecutiveSpikes: 0,
    nextSpawnAtMs: 0,
    tokenSequence: 0,
    lastHoldState: false,
  });

  const setHoldState = useCallback((holding: boolean) => {
    const runtime = runtimeRef.current;
    if (runtime.lastHoldState === holding) {
      return;
    }
    runtime.lastHoldState = holding;
    onExitHoldChangeRef.current?.(holding);
  }, []);

  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) {
      return;
    }

    const rect = root.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    const nextWidth = Math.round(width * dpr);
    const nextHeight = Math.round(height * dpr);
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    boundsRef.current = { width, height, dpr };
  }, []);

  const resolveFlyingTokenAt = useCallback((clientX: number, clientY: number): RewardToken | null => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const hitPadding = getProfileHitPaddingPx(runtimeRef.current.qualityProfile);
    const candidates = [...tokensRef.current]
      .filter((token) => token.phase === 'flying')
      .sort((left, right) => right.zIndex - left.zIndex);

    for (const token of candidates) {
      const dx = x - token.visualX;
      const dy = y - token.visualY;
      const radius = token.visualRadius + hitPadding;
      if ((dx * dx) + (dy * dy) <= radius * radius) {
        return token;
      }
    }

    return null;
  }, []);

  const beginTokenOpening = useCallback((tokenId: string, nowMs: number) => {
    const tokenIndex = tokensRef.current.findIndex((token) => token.id === tokenId);
    if (tokenIndex < 0) {
      return;
    }

    const token = tokensRef.current[tokenIndex];
    if (token.phase !== 'pressed' && token.phase !== 'flying') {
      return;
    }

    tokensRef.current[tokenIndex] = {
      ...token,
      phase: 'opening',
      phaseStartedAtMs: nowMs,
      pointerId: null,
      freezeX: token.visualX,
      freezeY: token.visualY,
      freezeRotation: token.visualRotation,
    };

    const collectPayload: InteractiveRewardCollectPayload = {
      tokenId: token.id,
      variant: token.variant,
      occurredAt: new Date().toISOString(),
    };
    const collectResult = onCollectRef.current?.(collectPayload);
    if (!onCollectRef.current) {
      setCaughtRewardPoints((current) => current + rewardPoints);
    } else {
      void Promise.resolve(collectResult)
        .then((accepted) => {
          if (!mountedRef.current || accepted === false) {
            return;
          }
          setCaughtRewardPoints((current) => current + rewardPoints);
        })
        .catch(() => {
          // Keep local boot bonus aligned to accepted rewards only.
        });
    }
  }, [rewardPoints]);

  const releasePointerToken = useCallback((pointerId: number, clientX: number, clientY: number) => {
    const pointerRecord = pointersRef.current.get(pointerId);
    pointersRef.current.delete(pointerId);
    if (!pointerRecord?.tokenId) {
      return;
    }

    const token = tokensRef.current.find((candidate) => candidate.id === pointerRecord.tokenId);
    if (!token || token.phase !== 'pressed') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const releasePadding = getProfileHitPaddingPx(runtimeRef.current.qualityProfile) + 10;
    const dx = x - token.freezeX;
    const dy = y - token.freezeY;
    const releaseRadius = token.visualRadius + releasePadding;
    if ((dx * dx) + (dy * dy) <= releaseRadius * releaseRadius) {
      beginTokenOpening(token.id, getAnimationClockNow());
      return;
    }

    tokensRef.current = tokensRef.current.map((candidate) => (
      candidate.id === token.id
        ? { ...candidate, phase: 'flying', phaseStartedAtMs: getAnimationClockNow(), pointerId: null }
        : candidate
    ));
  }, [beginTokenOpening]);

  const drawScene = useCallback((context: CanvasRenderingContext2D, nowMs: number, reducedMotion: boolean) => {
    const bounds = boundsRef.current;
    context.save();
    context.setTransform(bounds.dpr, 0, 0, bounds.dpr, 0, 0);
    context.clearRect(0, 0, bounds.width, bounds.height);

    const runtime = runtimeRef.current;
    const flightPose = resolveFlightPose(bounds, runtime.visualProgress);
    const finishProgress = runtime.finishAtMs === null
      ? 0
      : clamp((nowMs - runtime.finishAtMs + FINISH_DELAY_MS) / FINISH_ANIMATION_MS);

    drawStageLane(context, bounds, runtime.visualProgress, reducedMotion, nowMs);

    const scrollPoint = resolveStagePoint(bounds, INTRO_CURVE.end);
    const scrollGlowRadius = Math.max(40, bounds.width * 0.065);
    const scrollGlow = context.createRadialGradient(scrollPoint.x, scrollPoint.y, scrollGlowRadius * 0.12, scrollPoint.x, scrollPoint.y, scrollGlowRadius);
    scrollGlow.addColorStop(0, `rgba(255, 229, 140, ${0.5 + (finishProgress * 0.35)})`);
    scrollGlow.addColorStop(1, 'rgba(255, 229, 140, 0)');
    context.fillStyle = scrollGlow;
    context.beginPath();
    context.arc(scrollPoint.x, scrollPoint.y, scrollGlowRadius, 0, Math.PI * 2);
    context.fill();
    drawScrollIcon(context, scrollPoint.x, scrollPoint.y, Math.max(0.82, bounds.width / 1100));

    if (finishProgress > 0.01) {
      context.save();
      context.translate(scrollPoint.x, scrollPoint.y);
      context.strokeStyle = `rgba(255, 244, 194, ${0.7 - (finishProgress * 0.35)})`;
      context.lineWidth = 2;
      for (let index = 0; index < 2; index += 1) {
        const ringProgress = clamp((finishProgress * 1.18) - (index * 0.18));
        const radius = lerp(bounds.width * 0.016, bounds.width * 0.082, ringProgress);
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.globalAlpha = 1 - ringProgress;
        context.stroke();
      }
      context.restore();
      context.globalAlpha = 1;
    }

    const xioGlow = context.createRadialGradient(flightPose.point.x, flightPose.point.y, bounds.width * 0.01, flightPose.point.x, flightPose.point.y, bounds.width * 0.06);
    xioGlow.addColorStop(0, 'rgba(196, 248, 255, 0.85)');
    xioGlow.addColorStop(1, 'rgba(120, 238, 255, 0)');
    context.fillStyle = xioGlow;
    context.beginPath();
    context.arc(flightPose.point.x, flightPose.point.y, Math.max(26, bounds.width * 0.045), 0, Math.PI * 2);
    context.fill();

    const xioDrawSize = Math.max(52, bounds.width * 0.095);
    context.save();
    context.translate(flightPose.point.x, flightPose.point.y);
      context.rotate(flightPose.angle * 0.22);
      if (xioImageRef.current) {
        context.scale(-1, 1);
        context.drawImage(xioImageRef.current, -xioDrawSize * 0.5, -xioDrawSize * 0.44, xioDrawSize, xioDrawSize);
      } else {
        drawFallbackXio(context, 0, 0, xioDrawSize);
      }
    context.restore();

    const spriteSet = spriteSetRef.current;
    const spriteBundle = spriteSet ? resolveBundleForProfile(spriteSet, runtime.qualityProfile) : null;
    [...tokensRef.current].sort((left, right) => left.zIndex - right.zIndex).forEach((token) => {
      const drawX = token.phase === 'flying' ? token.visualX : token.freezeX;
      const drawY = token.phase === 'flying' ? token.visualY : token.freezeY;
      const drawRotation = token.phase === 'flying' ? token.visualRotation : token.freezeRotation;
      const openingProgress = token.phase === 'opening' ? clamp((nowMs - token.phaseStartedAtMs) / OPENING_DURATION_MS) : 0;
      const collectedProgress = token.phase === 'collected' ? clamp((nowMs - token.phaseStartedAtMs) / COLLECTED_CLEANUP_MS) : 0;
      const baseScale = token.phase === 'pressed' ? 0.96 : (token.phase === 'opening' ? lerp(1, 1.16, easeOutCubic(openingProgress)) : 1);
      const baseOpacity = token.phase === 'collected'
        ? 1 - collectedProgress
        : (token.expiresAtMs - nowMs < 900 ? clamp((token.expiresAtMs - nowMs) / 900, 0.35, 1) : 1);
      const drawSize = spriteBundle?.drawSizePx ?? token.sizePx;
      const glowSize = drawSize * 1.7;

      context.save();
      context.globalAlpha = baseOpacity;
      context.translate(drawX, drawY);
      context.rotate(drawRotation);
      if (spriteBundle?.glow) {
        const glowOpacity = token.phase === 'opening' ? lerp(0.26, 0.58, easeOutCubic(openingProgress)) : 0.2;
        context.globalAlpha = baseOpacity * glowOpacity;
        context.drawImage(spriteBundle.glow, -glowSize * 0.5, -glowSize * 0.5, glowSize, glowSize);
        context.globalAlpha = baseOpacity;
      }
      if (spriteBundle) {
        context.scale(token.phase === 'pressed' ? 1.08 : baseScale, token.phase === 'pressed' ? 0.88 : baseScale);
        context.drawImage(spriteBundle.coin, -drawSize * 0.5, -drawSize * 0.5, drawSize, drawSize);
      } else {
        context.fillStyle = '#ffd54d';
        context.beginPath();
        context.arc(0, 0, token.sizePx * 0.42, 0, Math.PI * 2);
        context.fill();
      }
      if (token.phase === 'opening' && spriteBundle?.burst) {
        const burstSize = drawSize * lerp(0.9, 1.42, easeOutCubic(openingProgress));
        context.globalAlpha = baseOpacity * (1 - openingProgress);
        context.drawImage(spriteBundle.burst, -burstSize * 0.5, -burstSize * 0.5, burstSize, burstSize);
        context.globalAlpha = baseOpacity;
      }
      context.restore();

      if (token.phase === 'opening') {
        const labelProgress = easeOutCubic(openingProgress);
        const labelY = drawY - lerp(token.sizePx * 0.12, token.sizePx * 0.82, labelProgress);
        context.save();
        context.globalAlpha = 1 - (openingProgress * 0.7);
        context.fillStyle = '#fff7d1';
        context.strokeStyle = 'rgba(9, 18, 37, 0.7)';
        context.lineWidth = 5;
        context.lineJoin = 'round';
        context.font = `800 ${Math.max(18, Math.round(token.sizePx * 0.26))}px "Trebuchet MS", "Segoe UI", sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        const label = `+${rewardPoints}`;
        context.strokeText(label, drawX, labelY);
        context.fillText(label, drawX, labelY);
        context.restore();
      }
    });

    context.restore();
  }, [rewardPoints]);

  const stopEvent = useCallback((event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    readyRef.current = ready;
    onCollectRef.current = onCollect;
    onFinishRef.current = onFinish;
    onExitHoldChangeRef.current = onExitHoldChange;
  }, [onCollect, onExitHoldChange, onFinish, ready]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') {
      syncCanvasSize();
      window.addEventListener('resize', syncCanvasSize, { passive: true });
      return () => window.removeEventListener('resize', syncCanvasSize);
    }

    syncCanvasSize();
    const resizeObserver = new ResizeObserver(() => {
      syncCanvasSize();
    });
    resizeObserver.observe(root);
    window.addEventListener('resize', syncCanvasSize, { passive: true });
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncCanvasSize);
    };
  }, [syncCanvasSize]);

  useEffect(() => {
    let cancelled = false;
    void buildSpriteSet(assetSrc, prefersReducedMotion)
      .then(({ spriteSet, xioImage }) => {
        if (cancelled) {
          return;
        }
        spriteSetRef.current = spriteSet;
        xioImageRef.current = xioImage;
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        spriteSetRef.current = {
          full: buildSpriteBundle(null, 96, true),
          lite: buildSpriteBundle(null, 82, true),
          reducedMotion: buildSpriteBundle(null, 70, !prefersReducedMotion),
        };
        xioImageRef.current = null;
      });

    return () => {
      cancelled = true;
    };
  }, [assetSrc, prefersReducedMotion]);

  useEffect(() => {
    tokensRef.current = [];
    pointersRef.current.clear();
    runtimeRef.current = {
      startedAtMs: getAnimationClockNow(),
      previousFrameMs: 0,
      visualProgress: 0.06,
      finishAtMs: null,
      finishTriggered: false,
      bootReadyState: false,
      qualityProfile: prefersReducedMotion ? 'reduced-motion' : 'full',
      rollingFrameMs: 16.67,
      consecutiveSpikes: 0,
      nextSpawnAtMs: 0,
      tokenSequence: 0,
      lastHoldState: false,
    };
    setHoldState(false);

    let cancelled = false;
    let animationFrameId = 0;

    const step = (timestamp: number) => {
      if (cancelled) {
        return;
      }

      const runtime = runtimeRef.current;
      const bounds = boundsRef.current;
      const canvas = canvasRef.current;
      if (!canvas || bounds.width <= 0 || bounds.height <= 0) {
        animationFrameId = window.requestAnimationFrame(step);
        return;
      }

      const deltaMs = runtime.previousFrameMs > 0 ? Math.min(48, Math.max(8, timestamp - runtime.previousFrameMs)) : 16.67;
      runtime.previousFrameMs = timestamp;

      if (!prefersReducedMotion && runtime.qualityProfile === 'full') {
        runtime.rollingFrameMs = lerp(runtime.rollingFrameMs, deltaMs, 0.18);
        runtime.consecutiveSpikes = deltaMs >= FRAME_SPIKE_MS ? runtime.consecutiveSpikes + 1 : 0;
        if (runtime.rollingFrameMs > FRAME_BUDGET_MS || runtime.consecutiveSpikes >= 2) {
          runtime.qualityProfile = 'lite';
          setQualityProfileState('lite');
        }
      }

      const elapsedMs = Math.max(0, timestamp - runtime.startedAtMs);
      const minimumDurationComplete = elapsedMs >= minimumDurationMs;
      const finishRequested = readyRef.current && minimumDurationComplete;
      if (runtime.bootReadyState !== finishRequested) {
        runtime.bootReadyState = finishRequested;
        setBootReadyState(finishRequested);
      }

      const timeProgress = clamp(elapsedMs / minimumDurationMs);
      const timeCurve = timeProgress < 0.84
        ? lerp(0.06, 0.89, easeOutCubic(timeProgress / 0.84))
        : lerp(0.89, PROGRESS_HOLD_CAP, smoothstep((timeProgress - 0.84) / 0.16));
      runtime.visualProgress = lerp(runtime.visualProgress, finishRequested ? 1 : timeCurve, finishRequested ? 0.16 : 0.09);
      const maxActiveTokens = getProfileMaxActiveTokens(runtime.qualityProfile);
      const spawnEnabled = !finishRequested || elapsedMs < (minimumDurationMs - 420);
      if (
        spawnEnabled
        && tokensRef.current.filter((token) => token.phase === 'flying' || token.phase === 'pressed').length < maxActiveTokens
        && (runtime.nextSpawnAtMs <= 0 || timestamp >= runtime.nextSpawnAtMs)
      ) {
        runtime.tokenSequence += 1;
        tokensRef.current = [...tokensRef.current, createRewardToken(runtime.tokenSequence, timestamp, bounds, runtime.qualityProfile)];
        runtime.nextSpawnAtMs = timestamp + randomBetween(...getProfileSpawnDelayRangeMs(runtime.qualityProfile));
      }

      tokensRef.current = tokensRef.current
        .map((token) => {
          if (token.phase === 'flying') {
            return token.expiresAtMs <= timestamp ? null : updateTokenVisualPose(token, timestamp);
          }
          if (token.phase === 'pressed') {
            if (timestamp - token.phaseStartedAtMs >= PRESS_AUTO_OPEN_MS) {
              beginTokenOpening(token.id, timestamp);
              return tokensRef.current.find((candidate) => candidate.id === token.id) ?? null;
            }
            if (timestamp - token.phaseStartedAtMs > PRESSED_STALE_MS) {
              return { ...token, phase: 'flying', phaseStartedAtMs: timestamp, pointerId: null };
            }
            return token;
          }
          if (token.phase === 'opening') {
            return timestamp - token.phaseStartedAtMs >= OPENING_DURATION_MS
              ? { ...token, phase: 'collected', phaseStartedAtMs: timestamp }
              : token;
          }
          if (token.phase === 'collected') {
            return timestamp - token.phaseStartedAtMs >= COLLECTED_CLEANUP_MS ? null : token;
          }
          return token;
        })
        .filter((token): token is RewardToken => Boolean(token));

      const holdActive = tokensRef.current.some((token) => token.phase === 'opening' || (token.phase === 'pressed' && (timestamp - token.phaseStartedAtMs) <= HOLD_RELEASE_SETTLE_MS));
      setHoldState(holdActive);

      if (finishRequested && !holdActive) {
        if (runtime.finishAtMs === null) {
          runtime.finishAtMs = timestamp + FINISH_DELAY_MS;
        } else if (!runtime.finishTriggered && timestamp >= runtime.finishAtMs) {
          runtime.finishTriggered = true;
          onFinishRef.current?.();
        }
      } else {
        runtime.finishAtMs = null;
      }

      const context = canvas.getContext('2d', { alpha: true });
      if (context) {
        drawScene(context, timestamp, prefersReducedMotion);
      }

      animationFrameId = window.requestAnimationFrame(step);
    };

    syncCanvasSize();
    animationFrameId = window.requestAnimationFrame(step);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrameId);
      setHoldState(false);
    };
  }, [assetSrc, beginTokenOpening, drawScene, minimumDurationMs, prefersReducedMotion, setHoldState, syncCanvasSize]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    stopEvent(event);
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const token = resolveFlyingTokenAt(event.clientX, event.clientY);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY, tokenId: token?.id ?? null });
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Ignore capture failures on unsupported browsers.
    }
    if (!token) {
      return;
    }
    const nowMs = getAnimationClockNow();
    tokensRef.current = tokensRef.current.map((candidate) => (
      candidate.id === token.id
        ? { ...candidate, phase: 'pressed', phaseStartedAtMs: nowMs, pointerId: event.pointerId, freezeX: token.visualX, freezeY: token.visualY, freezeRotation: token.visualRotation }
        : candidate
    ));
  }, [resolveFlyingTokenAt, stopEvent]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const pointerRecord = pointersRef.current.get(event.pointerId);
    if (pointerRecord) {
      pointerRecord.x = event.clientX;
      pointerRecord.y = event.clientY;
    }
  }, []);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    stopEvent(event);
    releasePointerToken(event.pointerId, event.clientX, event.clientY);
  }, [releasePointerToken, stopEvent]);

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    stopEvent(event);
    releasePointerToken(event.pointerId, event.clientX, event.clientY);
  }, [releasePointerToken, stopEvent]);

  const handleLostPointerCapture = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const pointerRecord = pointersRef.current.get(event.pointerId);
    if (pointerRecord) {
      releasePointerToken(event.pointerId, pointerRecord.x, pointerRecord.y);
    }
  }, [releasePointerToken]);

  useEffect(() => {
    const handleWindowPointerUp = (event: PointerEvent) => {
      if (pointersRef.current.has(event.pointerId)) {
        releasePointerToken(event.pointerId, event.clientX, event.clientY);
      }
    };
    window.addEventListener('pointerup', handleWindowPointerUp, true);
    window.addEventListener('pointercancel', handleWindowPointerUp, true);
    return () => {
      window.removeEventListener('pointerup', handleWindowPointerUp, true);
      window.removeEventListener('pointercancel', handleWindowPointerUp, true);
    };
  }, [releasePointerToken]);

  const rewardHudCopy = caughtRewardPoints > 0 ? `Boot bonus +${caughtRewardPoints}` : `Catch PTS for +${rewardPoints}`;
  const displayQualityProfile = prefersReducedMotion ? 'reduced-motion' : qualityProfileState;
  const rootClassName = ['home-page-intro-loader', displayQualityProfile === 'lite' ? 'is-lite' : '', displayQualityProfile === 'reduced-motion' ? 'is-reduced-motion' : '', className ?? ''].filter(Boolean).join(' ');
  const rootStyle = useMemo(() => ({
    '--home-page-intro-loader-background': `url("${backgroundImage}")`,
  }) as React.CSSProperties, []);
  const statusTitle = 'XiO Is Approaching The Mystery Scroll';
  const statusBody = bootReadyState
    ? 'XiO reached the Mystery Scroll. Opening your homepage now.'
    : 'Tap floating PTS coins while your homepage finishes loading.';

  return (
    <div
      ref={rootRef}
      className={rootClassName}
      style={rootStyle}
      role="status"
      aria-live="polite"
      data-loader-interaction="true"
      data-no-click-sound="true"
      data-cinematic-feedback="off"
      onClick={stopEvent}
    >
      <div className="home-page-intro-loader__backdrop" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="home-page-intro-loader__canvas"
        aria-hidden="true"
        data-loader-interaction="true"
        data-no-click-sound="true"
        data-cinematic-feedback="off"
        onClick={stopEvent}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
      />
      <div className="home-page-intro-loader__hud" aria-hidden="true">
        <span className="home-page-intro-loader__chip">Total PTS {totalPoints}</span>
        <span className="home-page-intro-loader__chip home-page-intro-loader__chip--hint">{rewardHudCopy}</span>
      </div>
      <span className="home-page-intro-loader__sr-only">{statusTitle}. {statusBody}</span>
    </div>
  );
};

export default HomePageIntroLoader;
