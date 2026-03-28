import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import backgroundImage from '../../MainLoadingScreen.png';
import './CinematicLoadingScreen.css';

const clamp = (value: number, min = 0, max = 1): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const lerp = (start: number, end: number, alpha: number): number => {
  return start + ((end - start) * alpha);
};

const easeOutCubic = (value: number): number => {
  const next = clamp(value);
  return 1 - ((1 - next) ** 3);
};

const smoothstep = (value: number): number => {
  const next = clamp(value);
  return next * next * (3 - (2 * next));
};

const easeInOutSine = (value: number): number => {
  return -(Math.cos(Math.PI * clamp(value)) - 1) / 2;
};

const randomBetween = (min: number, max: number): number => {
  return min + ((max - min) * Math.random());
};

const getAnimationClockNow = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

type Point = {
  x: number;
  y: number;
};

type Curve = {
  start: Point;
  controlOne: Point;
  controlTwo: Point;
  end: Point;
};

type InteractiveRewardVariant = 'drift' | 'drop' | 'burst';
type InteractiveRewardPhase = 'flying' | 'pressed' | 'opening' | 'collected';
type RewardQualityProfile = 'full' | 'lite' | 'reduced-motion';

type RewardFlightPose = {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
};

type RewardFrozenPose = {
  x: number;
  y: number;
  rotation: number;
};

type RewardVisualSnapshot = {
  xPx: number;
  yPx: number;
  radiusPx: number;
  zIndex: number;
};

type PointerPositionSnapshot = {
  clientX: number;
  clientY: number;
};

type RewardToken = {
  id: string;
  variant: InteractiveRewardVariant;
  phase: InteractiveRewardPhase;
  spawnedAtMs: number;
  phaseStartedAtMs: number;
  expiresAtMs: number;
  pointerId: number | null;
  sizePx: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  waveAmplitude: number;
  waveFrequency: number;
  wavePhase: number;
  rotationBase: number;
  rotationVelocity: number;
  freezePose: RewardFrozenPose | null;
  zIndex: number;
  visual: RewardVisualSnapshot | null;
};

type RewardBounds = {
  width: number;
  height: number;
  dpr: number;
};

type RewardSpriteBundle = {
  coin: CanvasImageSource;
  glow: HTMLCanvasElement | null;
  burst: HTMLCanvasElement | null;
};

type RewardSpriteSet = {
  full: RewardSpriteBundle;
  lite: RewardSpriteBundle;
  reducedMotion: RewardSpriteBundle;
};

type LoaderRewardFrameArgs = {
  nowMs: number;
  frameDeltaMs: number;
  collectWindowActive: boolean;
  bootReady: boolean;
};

type LoaderRewardLayerHandle = {
  step: (args: LoaderRewardFrameArgs) => void;
  reset: () => void;
};

type StageSceneRefs = {
  root: HTMLDivElement | null;
  flightBar: HTMLDivElement | null;
  trailHalo: HTMLSpanElement | null;
  trailCore: HTMLSpanElement | null;
  ambientXio: HTMLDivElement | null;
  ambientScroll: HTMLDivElement | null;
  scrollAnchor: HTMLDivElement | null;
  xio: HTMLDivElement | null;
};

type StageRuntimeState = {
  startedAtMs: number;
  previousFrameMs: number;
  internalBootProgress: number;
  displayBootProgress: number;
  finishAtMs: number | null;
  lastReportedExitHold: boolean | null;
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

export type CinematicLoadingScreenProps = {
  mode: 'indeterminate' | 'boot';
  ready: boolean;
  onFinish?: () => void;
  progressOverride?: number;
  minimumBootDurationMs?: number;
  surface?: 'page' | 'panel';
  className?: string;
  interactiveRewards?: CinematicLoadingScreenInteractiveRewards;
};

export type InteractiveRewardCollectPayload = {
  tokenId: string;
  variant: InteractiveRewardVariant;
  occurredAt: string;
};

export type CinematicLoadingScreenInteractiveRewards = {
  enabled: boolean;
  assetSrc: string;
  totalPoints: number;
  rewardPoints?: number;
  minimumCollectWindowMs?: number;
  onCollect?: (payload: InteractiveRewardCollectPayload) => boolean | void | Promise<boolean | void>;
  onExitHoldChange?: (holding: boolean) => void;
};

const xioLoadingImageSrc = `${import.meta.env.BASE_URL}HomePageAPP/XiOLoadingscreen.png`;

const REWARD_TOKEN_OPEN_DURATION_MS = 560;
const REWARD_TOKEN_LABEL_DURATION_MS = 420;
const REWARD_TOKEN_COLLECTED_CLEANUP_MS = 48;
const REWARD_TOKEN_PRESSED_STALE_MS = 1200;
const REWARD_TOKEN_MAX_ACTIVE_FULL = 4;
const REWARD_TOKEN_MAX_ACTIVE_LITE = 2;
const REWARD_TOKEN_MAX_ACTIVE_REDUCED = 2;
const REWARD_TOKEN_PRESS_SQUEEZE_Y = 0.14;
const REWARD_TOKEN_PRESS_SQUEEZE_XZ = 0.10;
const REWARD_TOKEN_PRESS_SINK_RATIO = 0.05;
const REWARD_TOKEN_PRESS_TILT_DEG = 0.032 * (180 / Math.PI);
const REWARD_TOKEN_PRESS_RELEASE_RECOVER = 1.85;
const REWARD_TOKEN_PRESS_RELEASE_REBOUND = 0.055;
const REWARD_TOKEN_MIN_COLLECT_WINDOW_MS = 5000;
const REWARD_TOKEN_COLLECT_WINDOW_PROGRESS_CAP = 0.92;
const REWARD_TOKEN_ASSET_WARMUP_TIMEOUT_MS = 700;
const REWARD_TOKEN_FRAME_BUDGET_MS = 18;
const REWARD_TOKEN_FRAME_SPIKE_MS = 22;
const REWARD_TOKEN_HIT_RADIUS_MULTIPLIER = 1.16;
const REWARD_TOKEN_RELEASE_RADIUS_MULTIPLIER = 1.34;
const LOADER_INTERACTION_ATTRS = {
  'data-cinematic-feedback': 'off',
  'data-loader-interaction': 'true',
  'data-no-click-sound': 'true',
} as const;

const BOOT_SCROLL_POINT = Object.freeze({ x: 87.2, y: 50.2 });
const REDUCED_SCROLL_POINT = Object.freeze({ x: 86.8, y: 50.4 });

const BOOT_CURVE: Curve = Object.freeze({
  start: { x: 13.4, y: 53.4 },
  controlOne: { x: 27.8, y: 48.8 },
  controlTwo: { x: 56.2, y: 51.7 },
  end: { x: 81.3, y: 50.3 },
});

const REDUCED_CURVE: Curve = Object.freeze({
  start: { x: 14.0, y: 52.8 },
  controlOne: { x: 29.0, y: 50.7 },
  controlTwo: { x: 56.0, y: 51.1 },
  end: { x: 80.8, y: 50.6 },
});

const INITIAL_BOOT_PROGRESS = 0.06;
const BOOT_WAITING_TRAVEL_END = 0.886;

const resolveBootTravelProgress = (visualProgress: number, ready: boolean): number => {
  const normalizedProgress = clamp(visualProgress);

  if (!ready) {
    const waitingPhase = clamp(normalizedProgress / 0.9);
    return lerp(0.08, BOOT_WAITING_TRAVEL_END, easeOutCubic(waitingPhase));
  }

  const completionPhase = smoothstep((normalizedProgress - 0.9) / 0.1);
  return lerp(BOOT_WAITING_TRAVEL_END, 1, completionPhase);
};

const resolveIndeterminateTravelProgress = (timeMs: number): number => {
  const loop = (timeMs / 5600) % 1;
  return lerp(0.08, 0.78, easeOutCubic(loop));
};

const getRewardMaxActiveTokens = (profile: RewardQualityProfile): number => {
  if (profile === 'full') {
    return REWARD_TOKEN_MAX_ACTIVE_FULL;
  }
  if (profile === 'lite') {
    return REWARD_TOKEN_MAX_ACTIVE_LITE;
  }
  return REWARD_TOKEN_MAX_ACTIVE_REDUCED;
};

const getRewardSpawnDelayRangeMs = (profile: RewardQualityProfile): [number, number] => {
  if (profile === 'full') {
    return [680, 1150];
  }
  if (profile === 'lite') {
    return [940, 1460];
  }
  return [1080, 1620];
};

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const createGradientSprite = (
  sizePx: number,
  renderer: (ctx: CanvasRenderingContext2D, size: number) => void,
): HTMLCanvasElement => {
  const canvas = createCanvas(sizePx, sizePx);
  const context = canvas.getContext('2d');
  if (!context) {
    return canvas;
  }
  renderer(context, sizePx);
  return canvas;
};

const createGlowSprite = (sizePx: number, peakAlpha: number): HTMLCanvasElement => {
  return createGradientSprite(sizePx, (ctx, size) => {
    const radius = size / 2;
    const gradient = ctx.createRadialGradient(radius, radius, size * 0.08, radius, radius, radius);
    gradient.addColorStop(0, `rgba(220, 247, 255, ${peakAlpha})`);
    gradient.addColorStop(0.42, `rgba(126, 221, 255, ${peakAlpha * 0.55})`);
    gradient.addColorStop(0.72, `rgba(126, 221, 255, ${peakAlpha * 0.16})`);
    gradient.addColorStop(1, 'rgba(126, 221, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  });
};

const createBurstSprite = (sizePx: number): HTMLCanvasElement => {
  return createGradientSprite(sizePx, (ctx, size) => {
    const center = size / 2;
    const innerRadius = size * 0.12;
    const outerRadius = size * 0.44;
    for (let index = 0; index < 9; index += 1) {
      const angle = (Math.PI * 2 * index) / 9;
      const x1 = center + (Math.cos(angle) * innerRadius);
      const y1 = center + (Math.sin(angle) * innerRadius);
      const x2 = center + (Math.cos(angle) * outerRadius);
      const y2 = center + (Math.sin(angle) * outerRadius);
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
      gradient.addColorStop(1, 'rgba(255, 214, 104, 0)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = size * 0.024;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    const ring = ctx.createRadialGradient(center, center, size * 0.08, center, center, size * 0.32);
    ring.addColorStop(0, 'rgba(255, 251, 196, 0.84)');
    ring.addColorStop(0.72, 'rgba(255, 222, 128, 0.2)');
    ring.addColorStop(1, 'rgba(255, 222, 128, 0)');
    ctx.fillStyle = ring;
    ctx.fillRect(0, 0, size, size);
  });
};

const createFallbackCoinSprite = (sizePx: number): HTMLCanvasElement => {
  return createGradientSprite(sizePx, (ctx, size) => {
    const radius = size / 2;
    const outer = ctx.createRadialGradient(radius, radius, size * 0.1, radius, radius, radius);
    outer.addColorStop(0, '#fff7d7');
    outer.addColorStop(0.5, '#f3b842');
    outer.addColorStop(1, '#a8580d');
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(radius, radius, size * 0.44, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = size * 0.06;
    ctx.strokeStyle = 'rgba(255, 248, 197, 0.72)';
    ctx.stroke();

    ctx.fillStyle = '#fff9df';
    ctx.font = `900 ${Math.round(size * 0.28)}px "Trebuchet MS", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PTS', radius, radius + (size * 0.02));
  });
};

const createRasterizedCoinSource = async (
  image: HTMLImageElement,
  sizePx: number,
): Promise<CanvasImageSource> => {
  if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
    try {
      return await window.createImageBitmap(
        image as ImageBitmapSource,
        {
          resizeWidth: sizePx,
          resizeHeight: sizePx,
          resizeQuality: 'high',
        } as ImageBitmapOptions,
      );
    } catch {
      // Fall back to a plain canvas on browsers without resize support.
    }
  }

  const canvas = createCanvas(sizePx, sizePx);
  const context = canvas.getContext('2d');
  if (context) {
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, sizePx, sizePx);
  }
  return canvas;
};

const closeCanvasImageSource = (source: CanvasImageSource): void => {
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    source.close();
  }
};

const buildRewardSpriteSet = async (image: HTMLImageElement | null): Promise<RewardSpriteSet> => {
  const fullCoin = image ? await createRasterizedCoinSource(image, 176) : createFallbackCoinSprite(176);
  const liteCoin = image ? await createRasterizedCoinSource(image, 148) : createFallbackCoinSprite(148);
  const reducedCoin = image ? await createRasterizedCoinSource(image, 136) : createFallbackCoinSprite(136);

  return {
    full: {
      coin: fullCoin,
      glow: createGlowSprite(244, 0.9),
      burst: createBurstSprite(212),
    },
    lite: {
      coin: liteCoin,
      glow: createGlowSprite(192, 0.5),
      burst: null,
    },
    reducedMotion: {
      coin: reducedCoin,
      glow: createGlowSprite(180, 0.42),
      burst: null,
    },
  };
};

const resolveRewardSpriteBundle = (
  spriteSet: RewardSpriteSet,
  profile: RewardQualityProfile,
): RewardSpriteBundle => {
  if (profile === 'full') {
    return spriteSet.full;
  }
  if (profile === 'lite') {
    return spriteSet.lite;
  }
  return spriteSet.reducedMotion;
};

const resolveTokenBaseSizePx = (
  bounds: RewardBounds,
  profile: RewardQualityProfile,
): number => {
  const minDimension = Math.max(1, Math.min(bounds.width, bounds.height));
  const ratio = profile === 'full'
    ? randomBetween(0.075, 0.102)
    : randomBetween(0.072, 0.092);
  const maxSize = profile === 'full' ? 86 : 74;
  return clamp(minDimension * ratio, 52, maxSize);
};

const createRewardToken = (
  id: number,
  nowMs: number,
  profile: RewardQualityProfile,
  bounds: RewardBounds,
): RewardToken => {
  const reducedMotion = profile === 'reduced-motion';
  const lifetimeMs = reducedMotion
    ? randomBetween(2200, 2850)
    : randomBetween(2400, 3550);
  const variantRoll = Math.random();
  const variant: InteractiveRewardVariant = variantRoll < 0.42
    ? 'drift'
    : (variantRoll < 0.74 ? 'drop' : 'burst');
  const sizePx = resolveTokenBaseSizePx(bounds, profile);

  if (variant === 'drift') {
    const leftToRight = Math.random() < 0.5;
    return {
      id: `reward-${id}`,
      variant,
      phase: 'flying',
      spawnedAtMs: nowMs,
      phaseStartedAtMs: nowMs,
      expiresAtMs: nowMs + lifetimeMs,
      pointerId: null,
      sizePx,
      originX: leftToRight ? -12 : 112,
      originY: randomBetween(18, 64),
      targetX: leftToRight ? 112 : -12,
      targetY: randomBetween(20, 76),
      waveAmplitude: randomBetween(1.8, reducedMotion ? 2.8 : 4.0),
      waveFrequency: randomBetween(1.05, reducedMotion ? 1.6 : 2.05),
      wavePhase: randomBetween(0, Math.PI * 2),
      rotationBase: randomBetween(-18, 18),
      rotationVelocity: randomBetween(84, reducedMotion ? 130 : 220) * (leftToRight ? 1 : -1),
      freezePose: null,
      zIndex: 4 + Math.round(randomBetween(0, 5)),
      visual: null,
    };
  }

  if (variant === 'drop') {
    const horizontalStart = randomBetween(14, 86);
    return {
      id: `reward-${id}`,
      variant,
      phase: 'flying',
      spawnedAtMs: nowMs,
      phaseStartedAtMs: nowMs,
      expiresAtMs: nowMs + lifetimeMs,
      pointerId: null,
      sizePx,
      originX: horizontalStart,
      originY: -14,
      targetX: clamp(horizontalStart + randomBetween(-8, 8), 8, 92),
      targetY: randomBetween(50, 78),
      waveAmplitude: randomBetween(0.6, 2.1),
      waveFrequency: randomBetween(2.0, 3.5),
      wavePhase: randomBetween(0, Math.PI * 2),
      rotationBase: randomBetween(-12, 12),
      rotationVelocity: randomBetween(-36, 36),
      freezePose: null,
      zIndex: 4 + Math.round(randomBetween(0, 4)),
      visual: null,
    };
  }

  return {
    id: `reward-${id}`,
    variant,
    phase: 'flying',
    spawnedAtMs: nowMs,
    phaseStartedAtMs: nowMs,
    expiresAtMs: nowMs + lifetimeMs,
    pointerId: null,
    sizePx,
    originX: randomBetween(34, 68),
    originY: randomBetween(34, 58),
    targetX: clamp(randomBetween(18, 86), 8, 92),
    targetY: clamp(randomBetween(18, 76), 10, 88),
    waveAmplitude: randomBetween(1.4, reducedMotion ? 2.2 : 3.6),
    waveFrequency: randomBetween(1.6, reducedMotion ? 2.2 : 3.0),
    wavePhase: randomBetween(0, Math.PI * 2),
    rotationBase: randomBetween(-24, 24),
    rotationVelocity: randomBetween(-120, 120),
    freezePose: null,
    zIndex: 4 + Math.round(randomBetween(0, 6)),
    visual: null,
  };
};

const resolveRewardFlightPose = (token: RewardToken, nowMs: number): RewardFlightPose => {
  const lifetimeMs = Math.max(1, token.expiresAtMs - token.spawnedAtMs);
  const progress = clamp((nowMs - token.spawnedAtMs) / lifetimeMs);
  const fadeIn = smoothstep(progress / 0.14);
  const fadeOut = 1 - smoothstep((progress - 0.78) / 0.22);
  const opacity = clamp(fadeIn * fadeOut);
  const rotation = token.rotationBase + (token.rotationVelocity * progress);

  if (token.variant === 'drift') {
    const travel = easeInOutSine(progress);
    return {
      x: lerp(token.originX, token.targetX, travel),
      y: lerp(token.originY, token.targetY, travel)
        + (Math.sin((progress * Math.PI * 2 * token.waveFrequency) + token.wavePhase) * token.waveAmplitude),
      rotation,
      scale: 0.88 + (fadeIn * 0.16),
      opacity,
    };
  }

  if (token.variant === 'drop') {
    const dropEase = 1 - ((1 - progress) ** 2.4);
    const bouncePhase = clamp((progress - 0.74) / 0.26);
    const bounceLift = bouncePhase > 0
      ? -Math.sin(bouncePhase * Math.PI) * (1 - bouncePhase) * 3
      : 0;
    return {
      x: lerp(token.originX, token.targetX, smoothstep(progress))
        + (Math.sin((progress * Math.PI * token.waveFrequency) + token.wavePhase) * token.waveAmplitude),
      y: lerp(token.originY, token.targetY, dropEase) + bounceLift,
      rotation,
      scale: 0.84 + (fadeIn * 0.18),
      opacity,
    };
  }

  const burstEase = easeOutCubic(progress);
  return {
    x: lerp(token.originX, token.targetX, burstEase),
    y: lerp(token.originY, token.targetY, burstEase)
      - (Math.sin(progress * Math.PI) * token.waveAmplitude * 1.08),
    rotation,
    scale: 0.8 + (fadeIn * 0.22),
    opacity,
  };
};

const resolveTokenAnchorPose = (token: RewardToken, nowMs: number): RewardFrozenPose => {
  if (token.freezePose) {
    return token.freezePose;
  }
  const flightPose = resolveRewardFlightPose(token, nowMs);
  return {
    x: flightPose.x,
    y: flightPose.y,
    rotation: flightPose.rotation,
  };
};

const clearCanvas = (context: CanvasRenderingContext2D, bounds: RewardBounds): void => {
  context.clearRect(0, 0, bounds.width, bounds.height);
};

type LoaderRewardLayerProps = {
  assetSrc: string;
  totalPoints: number;
  rewardPoints: number;
  prefersReducedMotion: boolean;
  onCollect?: (payload: InteractiveRewardCollectPayload) => boolean | void | Promise<boolean | void>;
  onOpeningHoldChange?: (holding: boolean) => void;
};

const LoaderRewardLayer = React.memo(forwardRef<LoaderRewardLayerHandle, LoaderRewardLayerProps>(function LoaderRewardLayer({
  assetSrc,
  totalPoints,
  rewardPoints,
  prefersReducedMotion,
  onCollect,
  onOpeningHoldChange,
}, ref) {
  const [caughtRewardPoints, setCaughtRewardPoints] = useState(0);
  const [qualityProfileState, setQualityProfileState] = useState<RewardQualityProfile>(
    prefersReducedMotion ? 'reduced-motion' : 'full',
  );
  const layerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const boundsRef = useRef<RewardBounds>({ width: 0, height: 0, dpr: 1 });
  const tokensRef = useRef<RewardToken[]>([]);
  const tokenSequenceRef = useRef(0);
  const nextSpawnAtMsRef = useRef(0);
  const lastFrameNowMsRef = useRef(getAnimationClockNow());
  const collectWindowActiveRef = useRef(false);
  const bootReadyRef = useRef(false);
  const openingHoldActiveRef = useRef(false);
  const rollingFrameMsRef = useRef(16.67);
  const slowFrameStreakRef = useRef(0);
  const spriteSetRef = useRef<RewardSpriteSet | null>(null);
  const assetWarmReadyRef = useRef(false);
  const qualityProfileRef = useRef<RewardQualityProfile>(prefersReducedMotion ? 'reduced-motion' : 'full');
  const pendingBitmapSourcesRef = useRef<CanvasImageSource[]>([]);
  const pointerPositionsRef = useRef<Map<number, PointerPositionSnapshot>>(new Map());

  const notifyOpeningHoldChange = useCallback((holding: boolean) => {
    if (openingHoldActiveRef.current === holding) {
      return;
    }
    openingHoldActiveRef.current = holding;
    onOpeningHoldChange?.(holding);
  }, [onOpeningHoldChange]);

  const disposeSpriteSources = useCallback(() => {
    pendingBitmapSourcesRef.current.forEach((source) => {
      closeCanvasImageSource(source);
    });
    pendingBitmapSourcesRef.current = [];
  }, []);

  const resetLayerState = useCallback(() => {
    tokensRef.current = [];
    tokenSequenceRef.current = 0;
    nextSpawnAtMsRef.current = 0;
    rollingFrameMsRef.current = 16.67;
    slowFrameStreakRef.current = 0;
    collectWindowActiveRef.current = false;
    bootReadyRef.current = false;
    pointerPositionsRef.current.clear();
    notifyOpeningHoldChange(false);
    const context = contextRef.current;
    if (context) {
      clearCanvas(context, boundsRef.current);
    }
  }, [notifyOpeningHoldChange]);

  const downgradeToLite = useCallback(() => {
    if (prefersReducedMotion || qualityProfileRef.current !== 'full') {
      return;
    }
    qualityProfileRef.current = 'lite';
    setQualityProfileState('lite');
  }, [prefersReducedMotion]);

  const updatePointerPosition = useCallback((pointerId: number, clientX: number, clientY: number) => {
    pointerPositionsRef.current.set(pointerId, { clientX, clientY });
  }, []);

  const clearPointerPosition = useCallback((pointerId: number) => {
    pointerPositionsRef.current.delete(pointerId);
  }, []);

  const resolveLocalPointerPosition = useCallback((clientX: number, clientY: number): PointerPositionSnapshot | null => {
    const layer = layerRef.current;
    if (!layer) {
      return null;
    }

    const rect = layer.getBoundingClientRect();
    return {
      clientX: clientX - rect.left,
      clientY: clientY - rect.top,
    };
  }, []);

  const isPointerWithinTokenRadius = useCallback((
    token: RewardToken,
    radiusMultiplier: number,
    pointerPosition: PointerPositionSnapshot | null,
  ): boolean => {
    if (!token.visual || !pointerPosition) {
      return false;
    }

    const localPointerPosition = resolveLocalPointerPosition(
      pointerPosition.clientX,
      pointerPosition.clientY,
    );
    if (!localPointerPosition) {
      return false;
    }

    const distance = Math.hypot(
      localPointerPosition.clientX - token.visual.xPx,
      localPointerPosition.clientY - token.visual.yPx,
    );
    return distance <= token.visual.radiusPx * radiusMultiplier;
  }, [resolveLocalPointerPosition]);

  const collectPressedToken = useCallback((token: RewardToken) => {
    const nowMs = lastFrameNowMsRef.current;
    tokensRef.current = tokensRef.current.map((candidate) => {
      if (candidate.id !== token.id) {
        return candidate;
      }
      return {
        ...candidate,
        phase: 'opening',
        phaseStartedAtMs: nowMs,
        pointerId: null,
      };
    });

    const collectPayload: InteractiveRewardCollectPayload = {
      tokenId: token.id,
      variant: token.variant,
      occurredAt: new Date().toISOString(),
    };

    const collectResult = onCollect?.(collectPayload);
    if (!onCollect) {
      setCaughtRewardPoints((current) => current + rewardPoints);
      return;
    }

    void Promise.resolve(collectResult)
      .then((accepted) => {
        if (accepted === false) {
          return;
        }
        setCaughtRewardPoints((current) => current + rewardPoints);
      })
      .catch(() => {
        // Keep the local boot bonus aligned with accepted rewards only.
      });
  }, [onCollect, rewardPoints]);

  const resolveInteractiveToken = useCallback((clientX: number, clientY: number): RewardToken | null => {
    const localPointerPosition = resolveLocalPointerPosition(clientX, clientY);
    if (!localPointerPosition) {
      return null;
    }
    const candidates = [...tokensRef.current]
      .filter((token) => token.phase === 'flying' && token.visual)
      .sort((left, right) => right.zIndex - left.zIndex);

    for (const token of candidates) {
      const visual = token.visual;
      if (!visual) {
        continue;
      }
      const distance = Math.hypot(
        localPointerPosition.clientX - visual.xPx,
        localPointerPosition.clientY - visual.yPx,
      );
      if (distance <= visual.radiusPx * REWARD_TOKEN_HIT_RADIUS_MULTIPLIER) {
        return token;
      }
    }

    return null;
  }, [resolveLocalPointerPosition]);

  const releasePressedToken = useCallback((pointerId: number) => {
    const nowMs = lastFrameNowMsRef.current;
    tokensRef.current = tokensRef.current.map((token) => {
      if (token.phase !== 'pressed' || token.pointerId !== pointerId) {
        return token;
      }
      return {
        ...token,
        phase: 'flying',
        phaseStartedAtMs: nowMs,
        pointerId: null,
        freezePose: null,
      };
    });
    clearPointerPosition(pointerId);
  }, [clearPointerPosition]);

  const drawRewardTokens = useCallback((
    nowMs: number,
    frameDeltaMs: number,
    collectWindowActive: boolean,
    bootReady: boolean,
  ) => {
    lastFrameNowMsRef.current = nowMs;
    collectWindowActiveRef.current = collectWindowActive;
    bootReadyRef.current = bootReady;

    const context = contextRef.current;
    const spriteSet = spriteSetRef.current;
    const bounds = boundsRef.current;
    if (!context || !spriteSet || bounds.width < 1 || bounds.height < 1) {
      return;
    }

    const profile = prefersReducedMotion ? 'reduced-motion' : qualityProfileRef.current;
    const spriteBundle = resolveRewardSpriteBundle(spriteSet, profile);
    const activeTokenLimit = getRewardMaxActiveTokens(profile);

    if (collectWindowActive && assetWarmReadyRef.current && !bootReady && tokensRef.current.length < activeTokenLimit) {
      if (nextSpawnAtMsRef.current <= 0) {
        nextSpawnAtMsRef.current = nowMs + randomBetween(...getRewardSpawnDelayRangeMs(profile));
      } else if (nowMs >= nextSpawnAtMsRef.current) {
        tokensRef.current = [
          ...tokensRef.current,
          createRewardToken(tokenSequenceRef.current, nowMs, profile, bounds),
        ];
        tokenSequenceRef.current += 1;
        nextSpawnAtMsRef.current = nowMs + randomBetween(...getRewardSpawnDelayRangeMs(profile));
      }
    }

    const drawStartMs = getAnimationClockNow();
    clearCanvas(context, bounds);
    context.save();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    const nextTokens: RewardToken[] = [];
    let openingTokens = 0;
    const tokens = [...tokensRef.current].sort((left, right) => left.zIndex - right.zIndex);

    for (const token of tokens) {
      let nextToken = token;
      if (bootReady && token.phase === 'flying') {
        nextToken = {
          ...nextToken,
          expiresAtMs: Math.min(nextToken.expiresAtMs, nowMs + 180),
        };
      }

      if (nextToken.phase === 'pressed' && (nowMs - nextToken.phaseStartedAtMs) >= REWARD_TOKEN_PRESSED_STALE_MS) {
        nextToken = {
          ...nextToken,
          phase: 'flying',
          phaseStartedAtMs: nowMs,
          pointerId: null,
          freezePose: null,
        };
      }

      if (nextToken.phase === 'opening') {
        openingTokens += 1;
        const openingAgeMs = Math.max(0, nowMs - nextToken.phaseStartedAtMs);
        if (openingAgeMs >= REWARD_TOKEN_OPEN_DURATION_MS + REWARD_TOKEN_LABEL_DURATION_MS) {
          nextToken = {
            ...nextToken,
            phase: 'collected',
            phaseStartedAtMs: nowMs,
            pointerId: null,
          };
        }
      } else if (nextToken.phase === 'collected') {
        if ((nowMs - nextToken.phaseStartedAtMs) >= REWARD_TOKEN_COLLECTED_CLEANUP_MS) {
          continue;
        }
      } else if (nextToken.phase === 'flying' && nowMs >= nextToken.expiresAtMs) {
        continue;
      }

      const anchorPose = resolveTokenAnchorPose(nextToken, nowMs);
      const flightPose = resolveRewardFlightPose(nextToken, nowMs);
      const pose = nextToken.phase === 'pressed'
        ? {
          rotation: anchorPose.rotation - REWARD_TOKEN_PRESS_TILT_DEG,
          scaleX: 1 + REWARD_TOKEN_PRESS_SQUEEZE_XZ,
          scaleY: 1 - REWARD_TOKEN_PRESS_SQUEEZE_Y,
          yOffsetPx: nextToken.sizePx * REWARD_TOKEN_PRESS_SINK_RATIO,
          opacity: 1,
          labelOpacity: 0,
          labelY: 0,
          labelScale: 1,
          burstOpacity: 0,
          burstScale: 0,
        }
        : nextToken.phase === 'opening'
          ? (() => {
            const openingAgeMs = Math.max(0, nowMs - nextToken.phaseStartedAtMs);
            const openProgress = clamp(openingAgeMs / REWARD_TOKEN_OPEN_DURATION_MS);
            const openEase = easeOutCubic(openProgress);
            const releaseBlend = 1 - Math.exp(-(openingAgeMs / 1000) * REWARD_TOKEN_PRESS_RELEASE_RECOVER);
            const residual = 1 - clamp(releaseBlend);
            const rebound = Math.sin(openProgress * Math.PI) * REWARD_TOKEN_PRESS_RELEASE_REBOUND;
            const labelProgress = clamp(openingAgeMs / REWARD_TOKEN_LABEL_DURATION_MS);
            return {
              rotation: anchorPose.rotation - (REWARD_TOKEN_PRESS_TILT_DEG * residual),
              scaleX: 1 + (REWARD_TOKEN_PRESS_SQUEEZE_XZ * residual) + rebound,
              scaleY: 1 - (REWARD_TOKEN_PRESS_SQUEEZE_Y * residual) + (rebound * 0.22),
              yOffsetPx: nextToken.sizePx * REWARD_TOKEN_PRESS_SINK_RATIO * residual,
              opacity: Math.max(0, 1 - (openEase * 1.06)),
              labelOpacity: 1 - smoothstep(labelProgress),
              labelY: (nextToken.sizePx * 0.34) + (labelProgress * nextToken.sizePx * 0.96),
              labelScale: 0.96 + (labelProgress * 0.16),
              burstOpacity: profile === 'full' && spriteBundle.burst ? Math.max(0, 1 - (openEase * 1.08)) : 0,
              burstScale: 0.72 + (openProgress * 0.86),
            };
          })()
          : {
            rotation: flightPose.rotation,
            scaleX: flightPose.scale,
            scaleY: flightPose.scale,
            yOffsetPx: 0,
            opacity: flightPose.opacity,
            labelOpacity: 0,
            labelY: 0,
            labelScale: 1,
            burstOpacity: 0,
            burstScale: 0,
          };

      const xPx = (anchorPose.x / 100) * bounds.width;
      const yPx = ((anchorPose.y / 100) * bounds.height) + pose.yOffsetPx;
      const radiusPx = nextToken.sizePx * 0.46;
      nextToken = {
        ...nextToken,
        visual: {
          xPx,
          yPx,
          radiusPx,
          zIndex: nextToken.zIndex,
        },
      };

      const glowAlpha = profile === 'full' ? Math.min(0.96, pose.opacity * 0.9) : Math.min(0.52, pose.opacity * 0.55);
      if (spriteBundle.glow && glowAlpha > 0.02) {
        context.save();
        context.globalAlpha = glowAlpha;
        const glowSizePx = nextToken.sizePx * (profile === 'full' ? 1.74 : 1.52);
        context.drawImage(
          spriteBundle.glow,
          xPx - (glowSizePx / 2),
          yPx - (glowSizePx / 2),
          glowSizePx,
          glowSizePx,
        );
        context.restore();
      }

      if (spriteBundle.burst && pose.burstOpacity > 0.01) {
        context.save();
        context.globalAlpha = pose.burstOpacity;
        context.translate(xPx, yPx - (nextToken.sizePx * 0.16));
        context.rotate((anchorPose.rotation + (Math.sin(nowMs * 0.006) * 6)) * (Math.PI / 180));
        const burstSizePx = nextToken.sizePx * pose.burstScale * 1.72;
        context.drawImage(spriteBundle.burst, -burstSizePx / 2, -burstSizePx / 2, burstSizePx, burstSizePx);
        context.restore();
      }

      if (pose.opacity > 0.01) {
        context.save();
        context.globalAlpha = pose.opacity;
        context.translate(xPx, yPx);
        context.rotate(pose.rotation * (Math.PI / 180));
        context.scale(pose.scaleX, pose.scaleY);
        context.drawImage(
          spriteBundle.coin,
          -nextToken.sizePx / 2,
          -nextToken.sizePx / 2,
          nextToken.sizePx,
          nextToken.sizePx,
        );
        context.restore();
      }

      if (pose.labelOpacity > 0.01) {
        context.save();
        context.globalAlpha = pose.labelOpacity;
        context.translate(xPx, yPx - pose.labelY);
        context.scale(pose.labelScale, pose.labelScale);
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.lineJoin = 'round';
        context.lineWidth = Math.max(3, nextToken.sizePx * 0.08);
        context.strokeStyle = 'rgba(4, 12, 28, 0.82)';
        context.fillStyle = '#fff5bf';
        context.font = `900 ${Math.max(16, nextToken.sizePx * 0.31)}px "Trebuchet MS", sans-serif`;
        const label = `+${rewardPoints}pts`;
        context.strokeText(label, 0, 0);
        context.fillText(label, 0, 0);
        context.restore();
      }

      nextTokens.push(nextToken);
    }

    context.restore();
    tokensRef.current = nextTokens;
    notifyOpeningHoldChange(openingTokens > 0);

    const drawDurationMs = getAnimationClockNow() - drawStartMs;
    const observedFrameMs = Math.max(frameDeltaMs, drawDurationMs + 8);
    rollingFrameMsRef.current = lerp(rollingFrameMsRef.current, observedFrameMs, 0.16);
    if (observedFrameMs > REWARD_TOKEN_FRAME_SPIKE_MS || drawDurationMs > 6) {
      slowFrameStreakRef.current += 1;
    } else {
      slowFrameStreakRef.current = 0;
    }

    if (
      profile === 'full'
      && nextTokens.length > 0
      && (
        rollingFrameMsRef.current > REWARD_TOKEN_FRAME_BUDGET_MS
        || slowFrameStreakRef.current >= 2
      )
    ) {
      downgradeToLite();
    }
  }, [downgradeToLite, notifyOpeningHoldChange, prefersReducedMotion, rewardPoints]);

  const finalizePressedToken = useCallback((
    pointerId: number,
    fallbackClientX?: number,
    fallbackClientY?: number,
  ) => {
    if (
      typeof fallbackClientX === 'number'
      && typeof fallbackClientY === 'number'
    ) {
      updatePointerPosition(pointerId, fallbackClientX, fallbackClientY);
    }

    const token = tokensRef.current.find(
      (candidate) => candidate.phase === 'pressed' && candidate.pointerId === pointerId,
    );
    if (!token) {
      clearPointerPosition(pointerId);
      return false;
    }

    const pointerPosition = pointerPositionsRef.current.get(pointerId) ?? null;
    const shouldCollect = isPointerWithinTokenRadius(
      token,
      REWARD_TOKEN_RELEASE_RADIUS_MULTIPLIER,
      pointerPosition,
    );

    if (shouldCollect) {
      collectPressedToken(token);
    } else {
      releasePressedToken(pointerId);
    }

    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }

    clearPointerPosition(pointerId);
    drawRewardTokens(lastFrameNowMsRef.current, 0, collectWindowActiveRef.current, bootReadyRef.current);
    return shouldCollect;
  }, [
    clearPointerPosition,
    collectPressedToken,
    drawRewardTokens,
    isPointerWithinTokenRadius,
    releasePressedToken,
    updatePointerPosition,
  ]);

  useEffect(() => {
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    if (!layer || !canvas) {
      return undefined;
    }

    const updateBounds = () => {
      const rect = layer.getBoundingClientRect();
      const nextDpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      boundsRef.current = {
        width: rect.width,
        height: rect.height,
        dpr: nextDpr,
      };

      const nextWidth = Math.max(1, Math.round(rect.width * nextDpr));
      const nextHeight = Math.max(1, Math.round(rect.height * nextDpr));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }

      const context = canvas.getContext('2d', { alpha: true });
      if (!context) {
        contextRef.current = null;
        return;
      }

      context.setTransform(nextDpr, 0, 0, nextDpr, 0, 0);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      contextRef.current = context;
      clearCanvas(context, boundsRef.current);
    };

    updateBounds();
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateBounds)
      : null;
    resizeObserver?.observe(layer);
    window.addEventListener('resize', updateBounds, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateBounds);
    };
  }, []);

  useEffect(() => {
    const handleDocumentPointerUp = (event: PointerEvent) => {
      finalizePressedToken(event.pointerId, event.clientX, event.clientY);
    };

    document.addEventListener('pointerup', handleDocumentPointerUp, true);
    return () => {
      document.removeEventListener('pointerup', handleDocumentPointerUp, true);
    };
  }, [finalizePressedToken]);

  useEffect(() => {
    qualityProfileRef.current = prefersReducedMotion ? 'reduced-motion' : 'full';
    assetWarmReadyRef.current = false;
    disposeSpriteSources();
    resetLayerState();

    let disposed = false;
    let settled = false;
    const warmImage = new Image();
    warmImage.decoding = 'async';

    const finalize = async (useFallback: boolean) => {
      if (disposed || settled) {
        return;
      }
      settled = true;
      if (useFallback && !prefersReducedMotion) {
        qualityProfileRef.current = 'lite';
        setQualityProfileState('lite');
      }
      const spriteSet = await buildRewardSpriteSet(useFallback ? null : warmImage);
      if (disposed) {
        Object.values(spriteSet).forEach((bundle) => {
          closeCanvasImageSource(bundle.coin);
        });
        return;
      }
      spriteSetRef.current = spriteSet;
      pendingBitmapSourcesRef.current = [spriteSet.full.coin, spriteSet.lite.coin, spriteSet.reducedMotion.coin];
      assetWarmReadyRef.current = true;
    };

    const timeoutId = window.setTimeout(() => {
      void finalize(true);
    }, REWARD_TOKEN_ASSET_WARMUP_TIMEOUT_MS);

    const handleLoad = async () => {
      try {
        if (typeof warmImage.decode === 'function') {
          await warmImage.decode();
        }
      } catch {
        // Ignore decode failures and keep the loaded source.
      }
      window.clearTimeout(timeoutId);
      void finalize(false);
    };

    const handleError = () => {
      window.clearTimeout(timeoutId);
      void finalize(true);
    };

    warmImage.addEventListener('load', handleLoad, { once: true });
    warmImage.addEventListener('error', handleError, { once: true });
    warmImage.src = assetSrc;

    return () => {
      disposed = true;
      window.clearTimeout(timeoutId);
      warmImage.removeEventListener('load', handleLoad);
      warmImage.removeEventListener('error', handleError);
      disposeSpriteSources();
      spriteSetRef.current = null;
      assetWarmReadyRef.current = false;
      notifyOpeningHoldChange(false);
    };
  }, [assetSrc, disposeSpriteSources, notifyOpeningHoldChange, prefersReducedMotion, resetLayerState]);

  useImperativeHandle(ref, () => ({
    step: (args) => {
      drawRewardTokens(args.nowMs, args.frameDeltaMs, args.collectWindowActive, args.bootReady);
    },
    reset: () => {
      resetLayerState();
    },
  }), [drawRewardTokens, resetLayerState]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!collectWindowActiveRef.current || bootReadyRef.current) {
      return;
    }

    updatePointerPosition(event.pointerId, event.clientX, event.clientY);
    const token = resolveInteractiveToken(event.clientX, event.clientY);
    if (!token) {
      return;
    }

    const anchorPose = resolveTokenAnchorPose(token, lastFrameNowMsRef.current);
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    tokensRef.current = tokensRef.current.map((candidate) => {
      if (candidate.id !== token.id) {
        return candidate;
      }
      return {
        ...candidate,
        phase: 'pressed',
        phaseStartedAtMs: lastFrameNowMsRef.current,
        pointerId: event.pointerId,
        freezePose: anchorPose,
      };
    });
    drawRewardTokens(lastFrameNowMsRef.current, 0, collectWindowActiveRef.current, bootReadyRef.current);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    updatePointerPosition(event.pointerId, event.clientX, event.clientY);
    const token = tokensRef.current.find(
      (candidate) => candidate.phase === 'pressed' && candidate.pointerId === event.pointerId,
    );
    if (!token || !token.visual) {
      return;
    }

    const layer = layerRef.current;
    if (!layer) {
      return;
    }
    const rect = layer.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const distance = Math.hypot(localX - token.visual.xPx, localY - token.visual.yPx);
    if (distance <= token.visual.radiusPx * REWARD_TOKEN_RELEASE_RADIUS_MULTIPLIER) {
      return;
    }

    releasePressedToken(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drawRewardTokens(lastFrameNowMsRef.current, 0, collectWindowActiveRef.current, bootReadyRef.current);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    updatePointerPosition(event.pointerId, event.clientX, event.clientY);
  };

  const handleLostPointerCapture = (event: React.PointerEvent<HTMLCanvasElement>) => {
    updatePointerPosition(event.pointerId, event.clientX, event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();
    finalizePressedToken(event.pointerId, event.clientX, event.clientY);
  };

  const rewardHudCopy = caughtRewardPoints > 0
    ? `Boot bonus +${caughtRewardPoints}`
    : `Catch PTS for +${rewardPoints}`;
  const rewardLayerClassName = [
    'cinematic-loading-screen__reward-layer',
    qualityProfileState === 'lite' ? 'is-reward-lite' : '',
    qualityProfileState === 'reduced-motion' ? 'is-reward-reduced-motion' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={layerRef}
      className={rewardLayerClassName}
      aria-live="polite"
      {...LOADER_INTERACTION_ATTRS}
    >
      <div className="cinematic-loading-screen__reward-hud">
        <span className="cinematic-loading-screen__reward-chip cinematic-loading-screen__reward-chip--total">
          Total PTS {totalPoints}
        </span>
        <span className="cinematic-loading-screen__reward-chip cinematic-loading-screen__reward-chip--hint">
          {rewardHudCopy}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="cinematic-loading-screen__reward-canvas"
        aria-hidden="true"
        {...LOADER_INTERACTION_ATTRS}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      />
    </div>
  );
}));

LoaderRewardLayer.displayName = 'LoaderRewardLayer';

const updateStageElementTransform = (element: HTMLElement | null, transform: string): void => {
  if (!element) {
    return;
  }
  element.style.transform = transform;
};

const renderLoaderScene = (
  refs: StageSceneRefs,
  dimensions: RewardBounds,
  mode: 'indeterminate' | 'boot',
  visualProgress: number,
  bootReady: boolean,
  prefersReducedMotion: boolean,
  timeMs: number,
): void => {
  const { width, height } = dimensions;
  if (width <= 0 || height <= 0) {
    return;
  }

  const curve = prefersReducedMotion ? REDUCED_CURVE : BOOT_CURVE;
  const scrollPoint = prefersReducedMotion ? REDUCED_SCROLL_POINT : BOOT_SCROLL_POINT;
  const travelProgress = mode === 'boot'
    ? resolveBootTravelProgress(visualProgress, bootReady)
    : visualProgress;
  const flightPoint = cubicBezierPoint(
    travelProgress,
    curve.start,
    curve.controlOne,
    curve.controlTwo,
    curve.end,
  );
  const flightTangent = cubicBezierTangent(
    travelProgress,
    curve.start,
    curve.controlOne,
    curve.controlTwo,
    curve.end,
  );

  const directionAngle = Math.atan2(flightTangent.y, flightTangent.x) * (180 / Math.PI);
  const bobbing = prefersReducedMotion
    ? Math.sin((timeMs * 0.0012) + (travelProgress * 3.2)) * 0.05
    : Math.sin((timeMs * 0.0028) + (travelProgress * 4.3)) * 0.12;
  const xioPosition = {
    x: flightPoint.x,
    y: flightPoint.y + bobbing,
  };
  const trailStartX = prefersReducedMotion ? 10.8 : 9.8;
  const trailWidth = Math.max(0, xioPosition.x - trailStartX + 2.6);
  const trailScale = clamp(trailWidth / 100, 0, 1);
  const impactActive = mode === 'boot' && bootReady && visualProgress >= 0.999;
  const scrollGlow = clamp(0.24 + (visualProgress * 0.46) + (impactActive ? 0.34 : 0));
  const xioGlowOpacity = clamp(0.24 + (visualProgress * 0.36));

  const xioX = (xioPosition.x / 100) * width;
  const xioY = (xioPosition.y / 100) * height;
  const scrollX = (scrollPoint.x / 100) * width;
  const scrollY = (scrollPoint.y / 100) * height;
  const trailX = (trailStartX / 100) * width;
  const scrollScale = bootReady
    ? lerp(1, prefersReducedMotion ? 1.05 : 1.12, smoothstep((visualProgress - 0.92) / 0.08))
    : 1;
  const trailHaloOpacity = clamp(0.54 + (visualProgress * 0.28) + (impactActive ? 0.08 : 0));
  const trailCoreOpacity = clamp(0.7 + (visualProgress * 0.18));

  if (refs.root) {
    refs.root.style.setProperty('--cinematic-scroll-glow', scrollGlow.toFixed(4));
    refs.root.style.setProperty('--cinematic-xio-glow-opacity', xioGlowOpacity.toFixed(4));
  }

  if (refs.flightBar) {
    refs.flightBar.style.setProperty('--cinematic-flight-bar-px-width', `${width}px`);
  }

  if (refs.trailHalo) {
    refs.trailHalo.style.opacity = trailHaloOpacity.toFixed(3);
    updateStageElementTransform(
      refs.trailHalo,
      `translate3d(${trailX.toFixed(2)}px, ${xioY.toFixed(2)}px, 0) translate3d(0, -50%, 0) scaleX(${trailScale.toFixed(4)})`,
    );
  }

  if (refs.trailCore) {
    refs.trailCore.style.opacity = trailCoreOpacity.toFixed(3);
    updateStageElementTransform(
      refs.trailCore,
      `translate3d(${trailX.toFixed(2)}px, ${xioY.toFixed(2)}px, 0) translate3d(0, -50%, 0) scaleX(${trailScale.toFixed(4)})`,
    );
  }

  updateStageElementTransform(
    refs.ambientXio,
    `translate3d(${xioX.toFixed(2)}px, ${xioY.toFixed(2)}px, 0) translate3d(-50%, -50%, 0)`,
  );
  updateStageElementTransform(
    refs.ambientScroll,
    `translate3d(${scrollX.toFixed(2)}px, ${scrollY.toFixed(2)}px, 0) translate3d(-50%, -50%, 0)`,
  );

  if (refs.scrollAnchor) {
    refs.scrollAnchor.style.setProperty('--scroll-scale', scrollScale.toFixed(4));
    updateStageElementTransform(
      refs.scrollAnchor,
      `translate3d(${scrollX.toFixed(2)}px, ${scrollY.toFixed(2)}px, 0) translate3d(-50%, -50%, 0)`,
    );
  }

  updateStageElementTransform(
    refs.xio,
    `translate3d(${xioX.toFixed(2)}px, ${xioY.toFixed(2)}px, 0) translate3d(-50%, -50%, 0) rotate(${directionAngle.toFixed(2)}deg)`,
  );
};

export const CinematicLoadingScreen: React.FC<CinematicLoadingScreenProps> = ({
  mode,
  ready,
  onFinish,
  progressOverride,
  minimumBootDurationMs: minimumBootDurationOverrideMs,
  surface = 'page',
  className,
  interactiveRewards,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [bootReadyState, setBootReadyState] = useState(false);
  const [impactActive, setImpactActive] = useState(false);
  const [rewardAnimationExitHoldActive, setRewardAnimationExitHoldActive] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const flightBarRef = useRef<HTMLDivElement | null>(null);
  const rewardLayerRef = useRef<LoaderRewardLayerHandle | null>(null);
  const stageRefs = useRef<StageSceneRefs>({
    root: null,
    flightBar: null,
    trailHalo: null,
    trailCore: null,
    ambientXio: null,
    ambientScroll: null,
    scrollAnchor: null,
    xio: null,
  });
  const sceneBoundsRef = useRef<RewardBounds>({ width: 0, height: 0, dpr: 1 });
  const runtimeRef = useRef<StageRuntimeState>({
    startedAtMs: getAnimationClockNow(),
    previousFrameMs: 0,
    internalBootProgress: INITIAL_BOOT_PROGRESS,
    displayBootProgress: INITIAL_BOOT_PROGRESS,
    finishAtMs: null,
    lastReportedExitHold: null,
  });
  const onFinishRef = useRef(onFinish);
  const rewardAnimationExitHoldActiveRef = useRef(rewardAnimationExitHoldActive);
  const readyRef = useRef(ready);
  const progressOverrideRef = useRef(progressOverride);
  const minimumBootDurationMsRef = useRef(minimumBootDurationOverrideMs ?? 0);
  const externalExitHoldChangeRef = useRef(interactiveRewards?.onExitHoldChange);

  const rewardPoints = interactiveRewards?.rewardPoints ?? 10;
  const minimumCollectWindowMs = Math.max(
    0,
    interactiveRewards?.minimumCollectWindowMs ?? REWARD_TOKEN_MIN_COLLECT_WINDOW_MS,
  );
  const minimumBootDurationMs = mode === 'boot'
    ? Math.max(0, minimumBootDurationOverrideMs ?? minimumCollectWindowMs)
    : 0;
  const interactiveRewardConfig = (
    mode === 'boot'
    && interactiveRewards?.enabled
    && interactiveRewards.assetSrc
  ) ? interactiveRewards : null;
  const interactiveRewardsEnabled = Boolean(interactiveRewardConfig);

  useEffect(() => {
    stageRefs.current.root = rootRef.current;
    stageRefs.current.flightBar = flightBarRef.current;
  });

  useEffect(() => {
    readyRef.current = ready;
    progressOverrideRef.current = progressOverride;
    minimumBootDurationMsRef.current = minimumBootDurationMs;
    onFinishRef.current = onFinish;
    rewardAnimationExitHoldActiveRef.current = rewardAnimationExitHoldActive;
    externalExitHoldChangeRef.current = interactiveRewards?.onExitHoldChange;
  }, [
    interactiveRewards?.onExitHoldChange,
    minimumBootDurationMs,
    onFinish,
    progressOverride,
    ready,
    rewardAnimationExitHoldActive,
  ]);

  useEffect(() => {
    const flightBar = flightBarRef.current;
    if (!flightBar) {
      return undefined;
    }

    const updateBounds = () => {
      const rect = flightBar.getBoundingClientRect();
      sceneBoundsRef.current = {
        width: rect.width,
        height: rect.height,
        dpr: typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2),
      };
      flightBar.style.setProperty('--cinematic-flight-bar-px-width', `${rect.width}px`);
    };

    updateBounds();
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateBounds)
      : null;
    resizeObserver?.observe(flightBar);
    window.addEventListener('resize', updateBounds, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateBounds);
    };
  }, []);

  useEffect(() => {
    runtimeRef.current = {
      startedAtMs: getAnimationClockNow(),
      previousFrameMs: 0,
      internalBootProgress: INITIAL_BOOT_PROGRESS,
      displayBootProgress: INITIAL_BOOT_PROGRESS,
      finishAtMs: null,
      lastReportedExitHold: null,
    };
    rewardLayerRef.current?.reset();

    let cancelled = false;
    let animationFrameId = 0;

    const step = (timestamp: number) => {
      if (cancelled) {
        return;
      }

      const runtime = runtimeRef.current;
      const deltaMs = runtime.previousFrameMs > 0
        ? Math.min(48, Math.max(8, timestamp - runtime.previousFrameMs))
        : 16.67;
      runtime.previousFrameMs = timestamp;

      const currentMinimumBootDurationMs = mode === 'boot'
        ? Math.max(0, minimumBootDurationMsRef.current)
        : 0;
      const bootElapsedMs = mode === 'boot'
        ? Math.max(0, timestamp - runtime.startedAtMs)
        : 0;
      const minimumBootDurationActive = mode === 'boot'
        && bootElapsedMs < currentMinimumBootDurationMs;
      const collectWindowActive = interactiveRewardsEnabled
        && bootElapsedMs < Math.max(minimumCollectWindowMs, currentMinimumBootDurationMs);
      const nextBootReady = readyRef.current && !minimumBootDurationActive;

      if (typeof progressOverrideRef.current !== 'number' && mode === 'boot') {
        const target = nextBootReady ? 1 : 0.9;
        const easing = nextBootReady ? 0.18 : 0.028;
        const drift = nextBootReady ? 0 : (prefersReducedMotion ? 0.0011 : 0.0021);
        const next = runtime.internalBootProgress + ((target - runtime.internalBootProgress) * easing);
        runtime.internalBootProgress = clamp(Math.max(next, Math.min(target, runtime.internalBootProgress + drift)));
      }

      const rawTargetProgress = mode === 'boot'
        ? clamp(typeof progressOverrideRef.current === 'number' ? progressOverrideRef.current : runtime.internalBootProgress)
        : resolveIndeterminateTravelProgress(timestamp);
      const targetProgress = mode === 'boot' && minimumBootDurationActive
        ? Math.min(rawTargetProgress, REWARD_TOKEN_COLLECT_WINDOW_PROGRESS_CAP)
        : rawTargetProgress;

      if (mode === 'boot') {
        const delta = targetProgress - runtime.displayBootProgress;
        if (Math.abs(delta) < 0.0008) {
          runtime.displayBootProgress = targetProgress;
        } else {
          const response = 1 - Math.exp(-(nextBootReady ? 0.0085 : 0.0065) * deltaMs);
          const minimumStep = deltaMs * (nextBootReady ? 0.00009 : 0.000045);
          const maximumStep = deltaMs * (nextBootReady ? 0.0003 : 0.00018);
          const desiredStep = Math.abs(delta) * response;
          const stepMagnitude = Math.min(maximumStep, Math.max(desiredStep, minimumStep));
          runtime.displayBootProgress = clamp(runtime.displayBootProgress + (Math.sign(delta) * stepMagnitude));
        }
      } else {
        runtime.displayBootProgress = targetProgress;
      }

      const visualProgress = runtime.displayBootProgress;
      const nextImpactActive = mode === 'boot' && nextBootReady && visualProgress >= 0.999;
      const loaderExitHoldActive = minimumBootDurationActive || rewardAnimationExitHoldActiveRef.current;

      if (runtime.lastReportedExitHold !== loaderExitHoldActive) {
        runtime.lastReportedExitHold = loaderExitHoldActive;
        externalExitHoldChangeRef.current?.(loaderExitHoldActive);
      }

      renderLoaderScene(
        stageRefs.current,
        sceneBoundsRef.current,
        mode,
        visualProgress,
        nextBootReady,
        prefersReducedMotion,
        timestamp,
      );

      rewardLayerRef.current?.step({
        nowMs: timestamp,
        frameDeltaMs: deltaMs,
        collectWindowActive,
        bootReady: nextBootReady,
      });

      setBootReadyState((current) => (current === nextBootReady ? current : nextBootReady));
      setImpactActive((current) => (current === nextImpactActive ? current : nextImpactActive));

      if (nextImpactActive && !loaderExitHoldActive) {
        const finishDelayMs = prefersReducedMotion ? 150 : 320;
        if (runtime.finishAtMs === null) {
          runtime.finishAtMs = timestamp + finishDelayMs;
        } else if (timestamp >= runtime.finishAtMs) {
          runtime.finishAtMs = Number.POSITIVE_INFINITY;
          onFinishRef.current?.();
        }
      } else {
        runtime.finishAtMs = null;
      }

      animationFrameId = window.requestAnimationFrame(step);
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrameId);
      externalExitHoldChangeRef.current?.(false);
    };
  }, [
    interactiveRewardsEnabled,
    minimumCollectWindowMs,
    mode,
    prefersReducedMotion,
  ]);

  const statusTitle = mode === 'boot'
    ? 'XiO Is Approaching The Mystery Scroll'
    : 'Preparing La\'s Homeschool';
  const statusBody = mode === 'boot'
    ? (bootReadyState
      ? 'XiO touched the Mystery scroll. Opening your homepage...'
      : 'Loading completes once XiO reaches the Mystery scroll and your homepage is ready.')
    : 'XiO is drifting toward the Mystery scroll while the app starts.';

  const rootClassName = [
    'cinematic-loading-screen',
    `cinematic-loading-screen--${surface}`,
    mode === 'boot' ? 'is-boot-mode' : 'is-indeterminate-mode',
    prefersReducedMotion ? 'is-reduced-motion' : '',
    impactActive ? 'is-impact-active' : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  const rootStyle = useMemo(() => ({
    '--cinematic-loader-background': `url("${backgroundImage}")`,
    '--cinematic-scroll-shiver-x': `${impactActive ? 0 : (prefersReducedMotion ? 1.2 : 2.5)}px`,
    '--cinematic-scroll-shiver-y': `${impactActive ? 0 : (prefersReducedMotion ? 0.5 : 1.1)}px`,
  }) as React.CSSProperties, [impactActive, prefersReducedMotion]);

  return (
    <div
      ref={rootRef}
      className={rootClassName}
      style={rootStyle}
      role="status"
      aria-live="polite"
      {...(mode === 'boot' ? LOADER_INTERACTION_ATTRS : {})}
    >
      <div className="cinematic-loading-screen__backdrop" aria-hidden="true" />
      <div className="cinematic-loading-screen__stage">
        <div className="cinematic-loading-screen__flight-bar-dim" aria-hidden="true" />
        <div
          ref={flightBarRef}
          className="cinematic-loading-screen__flight-bar"
          aria-hidden="true"
        >
          <span className="cinematic-loading-screen__flight-bar-sheen" />
          <span
            ref={(node) => {
              stageRefs.current.trailHalo = node;
            }}
            className="cinematic-loading-screen__trail-beam cinematic-loading-screen__trail-beam--halo"
          />
          <span
            ref={(node) => {
              stageRefs.current.trailCore = node;
            }}
            className="cinematic-loading-screen__trail-beam cinematic-loading-screen__trail-beam--core"
          />
          <div
            ref={(node) => {
              stageRefs.current.ambientXio = node;
            }}
            className="cinematic-loading-screen__ambient-orb cinematic-loading-screen__ambient-orb--xio"
          />
          <div
            ref={(node) => {
              stageRefs.current.ambientScroll = node;
            }}
            className="cinematic-loading-screen__ambient-orb cinematic-loading-screen__ambient-orb--scroll"
          />

          <div
            ref={(node) => {
              stageRefs.current.scrollAnchor = node;
            }}
            className="cinematic-loading-screen__scroll-anchor"
          >
            <span className="cinematic-loading-screen__scroll-glow" />
            <span className="cinematic-loading-screen__scroll-shiver">
              <svg className="cinematic-loading-screen__scroll" viewBox="0 0 96 132" role="presentation">
                <defs>
                  <linearGradient id="loader-scroll-paper" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#fff2bf" />
                    <stop offset="54%" stopColor="#ffd272" />
                    <stop offset="100%" stopColor="#ea9f34" />
                  </linearGradient>
                  <linearGradient id="loader-scroll-wood" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ff9a45" />
                    <stop offset="100%" stopColor="#933b0f" />
                  </linearGradient>
                </defs>
                <rect x="24" y="16" width="48" height="86" rx="13" fill="url(#loader-scroll-paper)" stroke="#e58d25" strokeWidth="3.6" />
                <rect x="15" y="11" width="66" height="14" rx="7" fill="url(#loader-scroll-wood)" />
                <rect x="15" y="93" width="66" height="14" rx="7" fill="url(#loader-scroll-wood)" />
                <circle cx="18" cy="18" r="5" fill="#f5b753" />
                <circle cx="78" cy="18" r="5" fill="#f5b753" />
                <circle cx="18" cy="100" r="5" fill="#f5b753" />
                <circle cx="78" cy="100" r="5" fill="#f5b753" />
                <path d="M35 38h26M31 52h34M34 66h22M31 80h30" fill="none" stroke="rgba(138,76,11,0.72)" strokeLinecap="round" strokeWidth="3.5" />
              </svg>
            </span>
            <span className="cinematic-loading-screen__impact-ring cinematic-loading-screen__impact-ring--one" />
            <span className="cinematic-loading-screen__impact-ring cinematic-loading-screen__impact-ring--two" />
            <span className="cinematic-loading-screen__impact-star cinematic-loading-screen__impact-star--one" />
            <span className="cinematic-loading-screen__impact-star cinematic-loading-screen__impact-star--two" />
            <span className="cinematic-loading-screen__impact-star cinematic-loading-screen__impact-star--three" />
          </div>

          <div
            ref={(node) => {
              stageRefs.current.xio = node;
            }}
            className="cinematic-loading-screen__xio"
          >
            <img
              className="cinematic-loading-screen__xio-image"
              src={xioLoadingImageSrc}
              alt=""
              aria-hidden="true"
              draggable="false"
            />
          </div>
        </div>
      </div>
      {interactiveRewardConfig ? (
        <LoaderRewardLayer
          key={`reward-layer:${interactiveRewardConfig.assetSrc}:${prefersReducedMotion ? 'reduced' : 'motion'}`}
          ref={rewardLayerRef}
          assetSrc={interactiveRewardConfig.assetSrc}
          totalPoints={interactiveRewardConfig.totalPoints}
          rewardPoints={rewardPoints}
          prefersReducedMotion={prefersReducedMotion}
          onCollect={interactiveRewardConfig.onCollect}
          onOpeningHoldChange={setRewardAnimationExitHoldActive}
        />
      ) : null}
      <span className="cinematic-loading-screen__sr-only">{statusTitle}. {statusBody}</span>
    </div>
  );
};

export default CinematicLoadingScreen;
