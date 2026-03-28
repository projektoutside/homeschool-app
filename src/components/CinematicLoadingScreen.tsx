import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type RewardFlightPose = {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
  blur: number;
};

type RewardToken = {
  id: string;
  variant: InteractiveRewardVariant;
  phase: InteractiveRewardPhase;
  spawnedAtMs: number;
  phaseStartedAtMs: number;
  expiresAtMs: number;
  pointerId: number | null;
  sizeRem: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  waveAmplitude: number;
  waveFrequency: number;
  wavePhase: number;
  rotationBase: number;
  rotationVelocity: number;
  freezeX: number | null;
  freezeY: number | null;
  freezeRotation: number | null;
  zIndex: number;
};

type RewardBurstShard = {
  id: string;
  clipPath: string;
  dx: number;
  dy: number;
  spinMultiplier: number;
  rotationOffsetDeg: number;
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
const REWARD_TOKEN_MAX_ACTIVE = 5;
const REWARD_TOKEN_MAX_ACTIVE_REDUCED = 3;
const REWARD_TOKEN_PRESS_SQUEEZE_Y = 0.14;
const REWARD_TOKEN_PRESS_SQUEEZE_XZ = 0.10;
const REWARD_TOKEN_PRESS_SINK = 0.042;
const REWARD_TOKEN_PRESS_TILT_DEG = 0.032 * (180 / Math.PI);
const REWARD_TOKEN_PRESS_RELEASE_RECOVER = 1.85;
const REWARD_TOKEN_PRESS_RELEASE_REBOUND = 0.055;
const REWARD_TOKEN_OPEN_BURST_DISTANCE = 2.7;
const REWARD_TOKEN_OPEN_BURST_LIFT = 1.9;
const REWARD_TOKEN_OPEN_BURST_SPIN_DEG = 2.2 * (180 / Math.PI);
const REWARD_TOKEN_MIN_COLLECT_WINDOW_MS = 5000;
const REWARD_TOKEN_COLLECT_WINDOW_PROGRESS_CAP = 0.92;
const REWARD_TOKEN_ASSET_WARMUP_TIMEOUT_MS = 700;
const REWARD_TOKEN_FRAME_BUDGET_MS = 18;
const REWARD_TOKEN_FRAME_SPIKE_MS = 22;
const REWARD_TOKEN_POOL_SIZE = REWARD_TOKEN_MAX_ACTIVE;

const rewardBurstShards: RewardBurstShard[] = [
  {
    id: 'one',
    clipPath: 'polygon(0 0, 56% 0, 45% 42%, 0 48%)',
    dx: -0.78,
    dy: -0.36,
    spinMultiplier: -1.05,
    rotationOffsetDeg: -18,
  },
  {
    id: 'two',
    clipPath: 'polygon(54% 0, 100% 0, 100% 46%, 63% 36%)',
    dx: 0.82,
    dy: -0.42,
    spinMultiplier: 0.92,
    rotationOffsetDeg: 22,
  },
  {
    id: 'three',
    clipPath: 'polygon(0 46%, 44% 40%, 45% 72%, 0 100%)',
    dx: -1.02,
    dy: 0.28,
    spinMultiplier: -0.72,
    rotationOffsetDeg: -14,
  },
  {
    id: 'four',
    clipPath: 'polygon(54% 38%, 100% 48%, 100% 100%, 58% 72%)',
    dx: 1.04,
    dy: 0.24,
    spinMultiplier: 0.78,
    rotationOffsetDeg: 16,
  },
  {
    id: 'five',
    clipPath: 'polygon(16% 68%, 52% 54%, 62% 100%, 12% 100%)',
    dx: -0.28,
    dy: 0.98,
    spinMultiplier: -0.54,
    rotationOffsetDeg: -10,
  },
  {
    id: 'six',
    clipPath: 'polygon(48% 56%, 88% 68%, 100% 100%, 44% 100%)',
    dx: 0.34,
    dy: 1.04,
    spinMultiplier: 0.48,
    rotationOffsetDeg: 12,
  },
];

const LoaderXioCharacter: React.FC = () => (
  <img
    className="cinematic-loading-screen__xio-image"
    src={xioLoadingImageSrc}
    alt=""
    aria-hidden="true"
    draggable="false"
  />
);

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

const createRewardToken = (id: number, nowMs: number, prefersReducedMotion: boolean): RewardToken => {
  const lifetimeMs = prefersReducedMotion
    ? randomBetween(2200, 2800)
    : randomBetween(2300, 3600);
  const variantRoll = Math.random();
  const variant: InteractiveRewardVariant = variantRoll < 0.38
    ? 'drift'
    : (variantRoll < 0.72 ? 'drop' : 'burst');
  const sizeRem = randomBetween(
    prefersReducedMotion ? 3.05 : 3.15,
    prefersReducedMotion ? 3.85 : 4.45,
  );

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
      sizeRem,
      originX: leftToRight ? -12 : 112,
      originY: randomBetween(18, 64),
      targetX: leftToRight ? 112 : -12,
      targetY: randomBetween(20, 76),
      waveAmplitude: randomBetween(1.8, 4.2),
      waveFrequency: randomBetween(1.1, 2.1),
      wavePhase: randomBetween(0, Math.PI * 2),
      rotationBase: randomBetween(-18, 18),
      rotationVelocity: randomBetween(120, 240) * (leftToRight ? 1 : -1),
      freezeX: null,
      freezeY: null,
      freezeRotation: null,
      zIndex: 4 + Math.round(randomBetween(0, 5)),
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
      sizeRem,
      originX: horizontalStart,
      originY: -14,
      targetX: clamp(horizontalStart + randomBetween(-8, 8), 8, 92),
      targetY: randomBetween(50, 78),
      waveAmplitude: randomBetween(0.6, 2.3),
      waveFrequency: randomBetween(2.2, 3.8),
      wavePhase: randomBetween(0, Math.PI * 2),
      rotationBase: randomBetween(-12, 12),
      rotationVelocity: randomBetween(-42, 42),
      freezeX: null,
      freezeY: null,
      freezeRotation: null,
      zIndex: 4 + Math.round(randomBetween(0, 4)),
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
    sizeRem,
    originX: randomBetween(34, 68),
    originY: randomBetween(34, 58),
    targetX: clamp(randomBetween(18, 86), 8, 92),
    targetY: clamp(randomBetween(18, 76), 10, 88),
    waveAmplitude: randomBetween(1.6, 3.8),
    waveFrequency: randomBetween(1.8, 3.2),
    wavePhase: randomBetween(0, Math.PI * 2),
    rotationBase: randomBetween(-24, 24),
    rotationVelocity: randomBetween(-160, 160),
    freezeX: null,
    freezeY: null,
    freezeRotation: null,
    zIndex: 4 + Math.round(randomBetween(0, 6)),
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
      scale: 0.86 + (fadeIn * 0.18),
      opacity,
      blur: (1 - opacity) * 1.5,
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
      scale: 0.82 + (fadeIn * 0.2),
      opacity,
      blur: (1 - opacity) * 1.8,
    };
  }

  const burstEase = easeOutCubic(progress);
  return {
    x: lerp(token.originX, token.targetX, burstEase),
    y: lerp(token.originY, token.targetY, burstEase)
      - (Math.sin(progress * Math.PI) * token.waveAmplitude * 1.1),
    rotation,
    scale: 0.78 + (fadeIn * 0.24),
    opacity,
    blur: (1 - opacity) * 1.3,
  };
};

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

type RewardQualityProfile = 'full' | 'lite' | 'reduced-motion';

type LoaderRewardLayerProps = {
  assetSrc: string;
  totalPoints: number;
  rewardPoints: number;
  collectWindowActive: boolean;
  bootReady: boolean;
  prefersReducedMotion: boolean;
  onCollect?: (payload: InteractiveRewardCollectPayload) => boolean | void | Promise<boolean | void>;
  onOpeningHoldChange?: (holding: boolean) => void;
};

const getRewardMaxActiveTokens = (profile: RewardQualityProfile): number => (
  profile === 'full' ? REWARD_TOKEN_MAX_ACTIVE : REWARD_TOKEN_MAX_ACTIVE_REDUCED
);

const getRewardSpawnDelayRangeMs = (profile: RewardQualityProfile): [number, number] => {
  if (profile === 'full') {
    return [520, 980];
  }
  if (profile === 'lite') {
    return [720, 1180];
  }
  return [780, 1240];
};

const LoaderRewardLayer: React.FC<LoaderRewardLayerProps> = React.memo(({
  assetSrc,
  totalPoints,
  rewardPoints,
  collectWindowActive,
  bootReady,
  prefersReducedMotion,
  onCollect,
  onOpeningHoldChange,
}) => {
  const [caughtRewardPoints, setCaughtRewardPoints] = useState(0);
  const [adaptiveQuality, setAdaptiveQuality] = useState<'full' | 'lite'>('full');
  const rewardQualityProfile: RewardQualityProfile = prefersReducedMotion
    ? 'reduced-motion'
    : adaptiveQuality;
  const rewardLayerRef = useRef<HTMLDivElement | null>(null);
  const rewardLayerBoundsRef = useRef({ width: 0, height: 0 });
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>(
    Array.from({ length: REWARD_TOKEN_POOL_SIZE }, () => null),
  );
  const shellRefs = useRef<Array<HTMLSpanElement | null>>(
    Array.from({ length: REWARD_TOKEN_POOL_SIZE }, () => null),
  );
  const glowRefs = useRef<Array<HTMLSpanElement | null>>(
    Array.from({ length: REWARD_TOKEN_POOL_SIZE }, () => null),
  );
  const imageRefs = useRef<Array<HTMLImageElement | null>>(
    Array.from({ length: REWARD_TOKEN_POOL_SIZE }, () => null),
  );
  const pointsRefs = useRef<Array<HTMLSpanElement | null>>(
    Array.from({ length: REWARD_TOKEN_POOL_SIZE }, () => null),
  );
  const shardRefs = useRef<Array<Array<HTMLSpanElement | null>>>(
    Array.from(
      { length: REWARD_TOKEN_POOL_SIZE },
      () => Array.from({ length: rewardBurstShards.length }, () => null),
    ),
  );
  const tokensRef = useRef<Array<RewardToken | null>>(
    Array.from({ length: REWARD_TOKEN_POOL_SIZE }, () => null),
  );
  const tokenSequenceRef = useRef(0);
  const nextSpawnAtMsRef = useRef(0);
  const animationNowRef = useRef(getAnimationClockNow());
  const adaptiveQualityRef = useRef<'full' | 'lite'>('full');
  const assetWarmReadyRef = useRef(false);
  const openingHoldActiveRef = useRef(false);
  const rollingFrameMsRef = useRef(16.67);
  const slowFrameStreakRef = useRef(0);

  useEffect(() => {
    const layer = rewardLayerRef.current;
    if (!layer) {
      return undefined;
    }

    let pendingFrameId = 0;
    const updateBounds = () => {
      pendingFrameId = 0;
      const rect = layer.getBoundingClientRect();
      rewardLayerBoundsRef.current = {
        width: rect.width,
        height: rect.height,
      };
    };

    const scheduleUpdate = () => {
      if (pendingFrameId !== 0) {
        return;
      }
      pendingFrameId = window.requestAnimationFrame(updateBounds);
    };

    updateBounds();
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(scheduleUpdate)
      : null;
    resizeObserver?.observe(layer);
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    return () => {
      if (pendingFrameId !== 0) {
        window.cancelAnimationFrame(pendingFrameId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  const applyInactiveTokenSlot = useCallback((slotIndex: number) => {
    const button = buttonRefs.current[slotIndex];
    const shell = shellRefs.current[slotIndex];
    const glow = glowRefs.current[slotIndex];
    const image = imageRefs.current[slotIndex];
    const points = pointsRefs.current[slotIndex];

    if (button) {
      button.className = 'cinematic-loading-screen__reward-token is-inactive';
      button.style.visibility = 'hidden';
      button.style.opacity = '0';
      button.style.pointerEvents = 'none';
      button.style.transform = 'translate3d(-240px, -240px, 0)';
      button.style.width = '0px';
      button.style.height = '0px';
      button.style.zIndex = '0';
      button.disabled = true;
      button.tabIndex = -1;
    }

    if (shell) {
      shell.style.transform = 'scale(0.82)';
      shell.style.opacity = '0';
    }

    if (glow) {
      glow.style.opacity = '0';
      glow.style.transform = 'scale(0.92)';
    }

    if (image) {
      image.style.opacity = '0';
    }

    if (points) {
      points.style.opacity = '0';
      points.style.transform = 'translate(-50%, -10%) scale(0.94)';
    }

    shardRefs.current[slotIndex]?.forEach((shard) => {
      if (!shard) {
        return;
      }
      shard.style.opacity = '0';
      shard.style.transform = 'translate(0rem, 0rem) scale(0.2)';
    });
  }, []);

  const notifyOpeningHoldChange = useCallback((holding: boolean) => {
    if (openingHoldActiveRef.current === holding) {
      return;
    }
    openingHoldActiveRef.current = holding;
    onOpeningHoldChange?.(holding);
  }, [onOpeningHoldChange]);

  const downgradeToLite = useCallback(() => {
    if (prefersReducedMotion) {
      return;
    }

    setAdaptiveQuality((current) => {
      if (current === 'lite') {
        return current;
      }
      adaptiveQualityRef.current = 'lite';
      return 'lite';
    });
  }, [prefersReducedMotion]);

  useEffect(() => {
    adaptiveQualityRef.current = adaptiveQuality;
  }, [adaptiveQuality]);

  const applyTokenPresentation = useCallback((
    slotIndex: number,
    token: RewardToken,
    nowMs: number,
    qualityProfile: RewardQualityProfile,
  ) => {
    const button = buttonRefs.current[slotIndex];
    const shell = shellRefs.current[slotIndex];
    const glow = glowRefs.current[slotIndex];
    const image = imageRefs.current[slotIndex];
    const points = pointsRefs.current[slotIndex];
    const shards = shardRefs.current[slotIndex];

    if (!button || !shell || !glow || !image || !points) {
      return;
    }

    const frozenPose = (
      typeof token.freezeX === 'number'
      && typeof token.freezeY === 'number'
      && typeof token.freezeRotation === 'number'
    )
      ? {
        x: token.freezeX,
        y: token.freezeY,
        rotation: token.freezeRotation,
      }
      : null;
    const flightPose = resolveRewardFlightPose(token, nowMs);
    const anchorPose = frozenPose ?? {
      x: flightPose.x,
      y: flightPose.y,
      rotation: flightPose.rotation,
    };

    let shellTransform = `rotate(${flightPose.rotation.toFixed(2)}deg) scale(${flightPose.scale.toFixed(3)})`;
    let shellOpacity = flightPose.opacity;
    let tokenOpacity = 1;
    let pointsOpacity = 0;
    let pointsTransform = 'translate(-50%, -10%) scale(0.96)';
    let openProgress = 0;
    let shardsVisible = qualityProfile === 'full' && !prefersReducedMotion;

    if (token.phase === 'pressed') {
      const pressedScaleX = 1 + REWARD_TOKEN_PRESS_SQUEEZE_XZ;
      const pressedScaleY = 1 - REWARD_TOKEN_PRESS_SQUEEZE_Y;
      const pressedSinkRem = token.sizeRem * REWARD_TOKEN_PRESS_SINK;
      shellTransform = `translate3d(0, ${pressedSinkRem.toFixed(3)}rem, 0) rotate(${(anchorPose.rotation - REWARD_TOKEN_PRESS_TILT_DEG).toFixed(2)}deg) scale(${pressedScaleX.toFixed(3)}, ${pressedScaleY.toFixed(3)})`;
      shellOpacity = 1;
    } else if (token.phase === 'opening') {
      const openAgeMs = Math.max(0, nowMs - token.phaseStartedAtMs);
      openProgress = clamp(openAgeMs / REWARD_TOKEN_OPEN_DURATION_MS);
      const openEase = easeOutCubic(openProgress);
      const releaseBlend = 1 - Math.exp(-(openAgeMs / 1000) * REWARD_TOKEN_PRESS_RELEASE_RECOVER);
      const residual = 1 - clamp(releaseBlend);
      const rebound = Math.sin(openProgress * Math.PI) * REWARD_TOKEN_PRESS_RELEASE_REBOUND;
      const scaleY = 1 - (REWARD_TOKEN_PRESS_SQUEEZE_Y * residual) + (rebound * 0.25);
      const scaleXZ = 1 + (REWARD_TOKEN_PRESS_SQUEEZE_XZ * residual) + rebound;
      const sinkRem = token.sizeRem * REWARD_TOKEN_PRESS_SINK * residual;
      shellTransform = `translate3d(0, ${sinkRem.toFixed(3)}rem, 0) rotate(${(anchorPose.rotation - (REWARD_TOKEN_PRESS_TILT_DEG * residual)).toFixed(2)}deg) scale(${scaleXZ.toFixed(3)}, ${scaleY.toFixed(3)})`;
      shellOpacity = Math.max(0, 1 - (openEase * 1.06));
      tokenOpacity = Math.max(0, 1 - (openEase * 1.06));
      shardsVisible = shardsVisible && openProgress > 0;
      const labelProgress = clamp(openAgeMs / REWARD_TOKEN_LABEL_DURATION_MS);
      pointsOpacity = 1 - smoothstep(labelProgress);
      const pointsRiseRem = 0.35 + (labelProgress * 2.4);
      const pointsScale = 0.96 + (labelProgress * 0.16);
      pointsTransform = `translate(-50%, calc(-50% - ${pointsRiseRem.toFixed(3)}rem)) scale(${pointsScale.toFixed(3)})`;
    } else if (token.phase === 'collected') {
      shellTransform = `rotate(${anchorPose.rotation.toFixed(2)}deg) scale(0.18)`;
      shellOpacity = 0;
      tokenOpacity = 0;
      shardsVisible = false;
    } else {
      shardsVisible = false;
    }

    const nextClassName = `cinematic-loading-screen__reward-token cinematic-loading-screen__reward-token--${token.variant} is-${token.phase}`;
    if (button.className !== nextClassName) {
      button.className = nextClassName;
    }

    const layerBounds = rewardLayerBoundsRef.current;
    const layerWidth = Math.max(layerBounds.width, 1);
    const layerHeight = Math.max(layerBounds.height, 1);
    const anchorX = (anchorPose.x / 100) * layerWidth;
    const anchorY = (anchorPose.y / 100) * layerHeight;
    const buttonTransform = `translate3d(${anchorX.toFixed(2)}px, ${anchorY.toFixed(2)}px, 0) translate3d(-50%, -50%, 0)`;
    const buttonSize = `${token.sizeRem.toFixed(3)}rem`;
    const buttonZIndex = String(token.zIndex);

    button.style.visibility = 'visible';
    button.style.opacity = '1';
    button.style.pointerEvents = 'auto';
    if (button.style.transform !== buttonTransform) {
      button.style.transform = buttonTransform;
    }
    if (button.style.width !== buttonSize) {
      button.style.width = buttonSize;
      button.style.height = buttonSize;
    }
    if (button.style.zIndex !== buttonZIndex) {
      button.style.zIndex = buttonZIndex;
    }
    button.disabled = token.phase !== 'flying' && token.phase !== 'pressed';
    button.tabIndex = button.disabled ? -1 : 0;

    shell.style.transform = shellTransform;
    shell.style.opacity = shellOpacity.toFixed(3);
    glow.style.opacity = qualityProfile === 'full' ? '0.88' : '0';
    glow.style.transform = qualityProfile === 'full' ? 'scale(1)' : 'scale(0.92)';
    image.style.opacity = tokenOpacity.toFixed(3);
    points.style.opacity = pointsOpacity.toFixed(3);
    points.style.transform = pointsTransform;

    const burstDistanceRem = REWARD_TOKEN_OPEN_BURST_DISTANCE * openProgress;
    const burstLiftRem = REWARD_TOKEN_OPEN_BURST_LIFT * openProgress;
    const burstPieceScale = Math.max(0.16, 1 - (openProgress * 0.84));
    const burstOpacity = Math.max(0, 1 - (easeOutCubic(openProgress) * 1.06));

    shards?.forEach((shardNode, shardIndex) => {
      if (!shardNode) {
        return;
      }
      if (!shardsVisible) {
        shardNode.style.opacity = '0';
        shardNode.style.transform = 'translate(0rem, 0rem) scale(0.2)';
        return;
      }

      const shard = rewardBurstShards[shardIndex];
      shardNode.style.opacity = burstOpacity.toFixed(3);
      shardNode.style.transform = `translate(${(shard.dx * burstDistanceRem).toFixed(3)}rem, ${((shard.dy * burstDistanceRem) - burstLiftRem).toFixed(3)}rem) rotate(${(shard.rotationOffsetDeg + (REWARD_TOKEN_OPEN_BURST_SPIN_DEG * shard.spinMultiplier * openProgress)).toFixed(2)}deg) scale(${burstPieceScale.toFixed(3)})`;
    });
  }, [prefersReducedMotion]);

  useEffect(() => {
    adaptiveQualityRef.current = 'full';
    assetWarmReadyRef.current = false;
    openingHoldActiveRef.current = false;
    tokenSequenceRef.current = 0;
    nextSpawnAtMsRef.current = 0;
    rollingFrameMsRef.current = 16.67;
    slowFrameStreakRef.current = 0;
    tokensRef.current = Array.from({ length: REWARD_TOKEN_POOL_SIZE }, () => null);
    for (let index = 0; index < REWARD_TOKEN_POOL_SIZE; index += 1) {
      applyInactiveTokenSlot(index);
    }
    onOpeningHoldChange?.(false);
  }, [applyInactiveTokenSlot, assetSrc, onOpeningHoldChange]);

  useEffect(() => {
    let disposed = false;
    let settled = false;
    const warmImage = new Image();

    const finalize = (fallbackToLite: boolean) => {
      if (disposed || settled) {
        return;
      }
      settled = true;
      assetWarmReadyRef.current = true;
      if (fallbackToLite) {
        downgradeToLite();
      }
    };

    const timeoutId = window.setTimeout(() => {
      finalize(true);
    }, REWARD_TOKEN_ASSET_WARMUP_TIMEOUT_MS);

    warmImage.onload = () => finalize(false);
    warmImage.onerror = () => finalize(true);
    warmImage.decoding = 'async';
    warmImage.src = assetSrc;

    if (typeof warmImage.decode === 'function') {
      warmImage.decode().then(
        () => finalize(false),
        () => finalize(true),
      );
    }

    return () => {
      disposed = true;
      window.clearTimeout(timeoutId);
    };
  }, [assetSrc, downgradeToLite]);

  useEffect(() => {
    let animationFrameId = 0;
    let active = true;
    let previousTimestamp = 0;

    const step = (timestamp: number) => {
      if (!active) {
        return;
      }

      const nowMs = Number.isFinite(timestamp) ? timestamp : getAnimationClockNow();
      animationNowRef.current = nowMs;
      const deltaMs = previousTimestamp > 0
        ? Math.min(48, Math.max(8, nowMs - previousTimestamp))
        : 16.67;
      previousTimestamp = nowMs;
      const qualityProfile: RewardQualityProfile = prefersReducedMotion
        ? 'reduced-motion'
        : adaptiveQualityRef.current;
      let activeTokenCount = 0;
      let freeSlotIndex = -1;
      let hasOpening = false;

      for (let slotIndex = 0; slotIndex < REWARD_TOKEN_POOL_SIZE; slotIndex += 1) {
        let token = tokensRef.current[slotIndex];
        if (!token) {
          if (freeSlotIndex < 0) {
            freeSlotIndex = slotIndex;
          }
          applyInactiveTokenSlot(slotIndex);
          continue;
        }

        if (token.phase === 'flying' && nowMs >= token.expiresAtMs) {
          tokensRef.current[slotIndex] = null;
          if (freeSlotIndex < 0) {
            freeSlotIndex = slotIndex;
          }
          applyInactiveTokenSlot(slotIndex);
          continue;
        }

        if (token.phase === 'pressed' && (nowMs - token.phaseStartedAtMs) >= REWARD_TOKEN_PRESSED_STALE_MS) {
          token = {
            ...token,
            phase: 'flying',
            phaseStartedAtMs: nowMs,
            pointerId: null,
            freezeX: null,
            freezeY: null,
            freezeRotation: null,
          };
          tokensRef.current[slotIndex] = token;
        }

        if (token.phase === 'opening' && (nowMs - token.phaseStartedAtMs) >= REWARD_TOKEN_OPEN_DURATION_MS) {
          token = {
            ...token,
            phase: 'collected',
            phaseStartedAtMs: nowMs,
            pointerId: null,
          };
          tokensRef.current[slotIndex] = token;
        }

        if (token.phase === 'collected' && (nowMs - token.phaseStartedAtMs) >= REWARD_TOKEN_COLLECTED_CLEANUP_MS) {
          tokensRef.current[slotIndex] = null;
          if (freeSlotIndex < 0) {
            freeSlotIndex = slotIndex;
          }
          applyInactiveTokenSlot(slotIndex);
          continue;
        }

        if (token.phase === 'opening') {
          hasOpening = true;
        }

        activeTokenCount += 1;
        applyTokenPresentation(slotIndex, token, nowMs, qualityProfile);
      }

      if (
        assetWarmReadyRef.current
        && !bootReady
        && freeSlotIndex >= 0
        && activeTokenCount < getRewardMaxActiveTokens(qualityProfile)
        && nowMs >= nextSpawnAtMsRef.current
      ) {
        const nextTokenId = tokenSequenceRef.current + 1;
        tokenSequenceRef.current = nextTokenId;
        const nextToken = createRewardToken(nextTokenId, nowMs, qualityProfile !== 'full');
        tokensRef.current[freeSlotIndex] = nextToken;
        applyTokenPresentation(freeSlotIndex, nextToken, nowMs, qualityProfile);
        activeTokenCount += 1;
        const [minDelayMs, maxDelayMs] = getRewardSpawnDelayRangeMs(qualityProfile);
        nextSpawnAtMsRef.current = nowMs + randomBetween(minDelayMs, maxDelayMs);
      }

      if (!assetWarmReadyRef.current || bootReady || activeTokenCount === 0) {
        slowFrameStreakRef.current = 0;
      } else if (!prefersReducedMotion && adaptiveQualityRef.current === 'full') {
        rollingFrameMsRef.current = lerp(rollingFrameMsRef.current, deltaMs, 0.18);
        slowFrameStreakRef.current = deltaMs > REWARD_TOKEN_FRAME_SPIKE_MS
          ? slowFrameStreakRef.current + 1
          : 0;
        if (
          rollingFrameMsRef.current > REWARD_TOKEN_FRAME_BUDGET_MS
          || slowFrameStreakRef.current >= 2
        ) {
          downgradeToLite();
        }
      }

      notifyOpeningHoldChange(hasOpening);
      animationFrameId = window.requestAnimationFrame(step);
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [
    applyInactiveTokenSlot,
    applyTokenPresentation,
    bootReady,
    downgradeToLite,
    notifyOpeningHoldChange,
    prefersReducedMotion,
  ]);

  useEffect(() => () => {
    notifyOpeningHoldChange(false);
  }, [notifyOpeningHoldChange]);

  const resolveSlotIndex = (element: HTMLButtonElement): number => {
    const parsed = Number(element.dataset.slotIndex ?? '-1');
    return Number.isInteger(parsed) ? parsed : -1;
  };

  const releasePointerCaptureSafely = useCallback((element: HTMLButtonElement, pointerId: number) => {
    if (typeof element.hasPointerCapture !== 'function' || !element.hasPointerCapture(pointerId)) {
      return;
    }

    try {
      element.releasePointerCapture(pointerId);
    } catch {
      // Ignore browsers that reject release after implicit cancel/up.
    }
  }, []);

  const releaseRewardTokenBackToFlight = useCallback((slotIndex: number, pointerId: number) => {
    if (slotIndex < 0) {
      return;
    }

    const token = tokensRef.current[slotIndex];
    if (!token || token.phase !== 'pressed' || (token.pointerId !== null && token.pointerId !== pointerId)) {
      return;
    }

    const nextToken: RewardToken = {
      ...token,
      phase: 'flying',
      phaseStartedAtMs: getAnimationClockNow(),
      pointerId: null,
      freezeX: null,
      freezeY: null,
      freezeRotation: null,
    };
    tokensRef.current[slotIndex] = nextToken;
    applyTokenPresentation(
      slotIndex,
      nextToken,
      animationNowRef.current || getAnimationClockNow(),
      prefersReducedMotion ? 'reduced-motion' : adaptiveQualityRef.current,
    );
  }, [applyTokenPresentation, prefersReducedMotion]);

  const handleRewardTokenPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 && event.pointerType !== 'touch') {
      return;
    }

    const slotIndex = resolveSlotIndex(event.currentTarget);
    const token = slotIndex >= 0 ? tokensRef.current[slotIndex] : null;
    if (!token || token.phase !== 'flying') {
      return;
    }

    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers may reject capture during rapid teardown; keep the press flow alive.
    }
    const nowMs = getAnimationClockNow();
    const pose = resolveRewardFlightPose(token, nowMs);
    const nextToken: RewardToken = {
      ...token,
      phase: 'pressed',
      phaseStartedAtMs: nowMs,
      pointerId: event.pointerId,
      freezeX: pose.x,
      freezeY: pose.y,
      freezeRotation: pose.rotation,
    };

    tokensRef.current[slotIndex] = nextToken;
    applyTokenPresentation(
      slotIndex,
      nextToken,
      nowMs,
      prefersReducedMotion ? 'reduced-motion' : adaptiveQualityRef.current,
    );
  }, [applyTokenPresentation, prefersReducedMotion]);

  const handleRewardTokenPointerLeave = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (
      event.buttons === 0
      || (typeof event.currentTarget.hasPointerCapture === 'function' && event.currentTarget.hasPointerCapture(event.pointerId))
    ) {
      return;
    }

    releaseRewardTokenBackToFlight(resolveSlotIndex(event.currentTarget), event.pointerId);
  }, [releaseRewardTokenBackToFlight]);

  const handleRewardTokenPointerCancel = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    releasePointerCaptureSafely(event.currentTarget, event.pointerId);
    releaseRewardTokenBackToFlight(resolveSlotIndex(event.currentTarget), event.pointerId);
  }, [releasePointerCaptureSafely, releaseRewardTokenBackToFlight]);

  const handleRewardTokenPointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    releasePointerCaptureSafely(event.currentTarget, event.pointerId);

    const slotIndex = resolveSlotIndex(event.currentTarget);
    const token = slotIndex >= 0 ? tokensRef.current[slotIndex] : null;
    if (!token || token.phase !== 'pressed' || (token.pointerId !== null && token.pointerId !== event.pointerId)) {
      return;
    }

    const nowMs = getAnimationClockNow();
    const nextToken: RewardToken = {
      ...token,
      phase: 'opening',
      phaseStartedAtMs: nowMs,
      pointerId: null,
    };
    tokensRef.current[slotIndex] = nextToken;
    applyTokenPresentation(
      slotIndex,
      nextToken,
      nowMs,
      prefersReducedMotion ? 'reduced-motion' : adaptiveQualityRef.current,
    );

    const collectPayload: InteractiveRewardCollectPayload = {
      tokenId: nextToken.id,
      variant: nextToken.variant,
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
        // Keep the local boot bonus in sync with accepted awards only.
      });
  }, [applyTokenPresentation, onCollect, prefersReducedMotion, releasePointerCaptureSafely, rewardPoints]);

  const handleRewardTokenLostPointerCapture = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    releaseRewardTokenBackToFlight(resolveSlotIndex(event.currentTarget), event.pointerId);
  }, [releaseRewardTokenBackToFlight]);

  const rewardHudCopy = caughtRewardPoints > 0
    ? `Boot bonus +${caughtRewardPoints}`
    : `Catch PTS for +${rewardPoints}`;
  const rewardLayerClassName = [
    'cinematic-loading-screen__reward-layer',
    rewardQualityProfile === 'lite' ? 'is-reward-lite' : '',
    rewardQualityProfile === 'reduced-motion' ? 'is-reward-reduced-motion' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={rewardLayerRef}
      className={rewardLayerClassName}
      aria-live="polite"
      data-collect-window-active={collectWindowActive ? 'true' : 'false'}
    >
      <div className="cinematic-loading-screen__reward-hud">
        <span className="cinematic-loading-screen__reward-chip cinematic-loading-screen__reward-chip--total">
          Total PTS {totalPoints}
        </span>
        <span className="cinematic-loading-screen__reward-chip cinematic-loading-screen__reward-chip--hint">
          {rewardHudCopy}
        </span>
      </div>
      {Array.from({ length: REWARD_TOKEN_POOL_SIZE }, (_, slotIndex) => (
        <button
          key={`reward-slot-${slotIndex}`}
          ref={(node) => {
            buttonRefs.current[slotIndex] = node;
          }}
          type="button"
          className="cinematic-loading-screen__reward-token is-inactive"
          style={{
            visibility: 'hidden',
            opacity: 0,
          }}
          data-slot-index={slotIndex}
          onPointerDown={handleRewardTokenPointerDown}
          onPointerLeave={handleRewardTokenPointerLeave}
          onPointerCancel={handleRewardTokenPointerCancel}
          onPointerUp={handleRewardTokenPointerUp}
          onLostPointerCapture={handleRewardTokenLostPointerCapture}
          onDragStart={(event) => event.preventDefault()}
          aria-label={`Collect ${rewardPoints} points`}
          data-no-click-sound="true"
          disabled
        >
          <span
            ref={(node) => {
              shellRefs.current[slotIndex] = node;
            }}
            className="cinematic-loading-screen__reward-token-shell"
          >
            <span
              ref={(node) => {
                glowRefs.current[slotIndex] = node;
              }}
              className="cinematic-loading-screen__reward-token-glow"
              aria-hidden="true"
            />
            {rewardBurstShards.map((shard, shardIndex) => (
              <span
                key={shard.id}
                ref={(node) => {
                  shardRefs.current[slotIndex][shardIndex] = node;
                }}
                className="cinematic-loading-screen__reward-token-shard"
                aria-hidden="true"
                style={{
                  backgroundImage: `url("${assetSrc}")`,
                  clipPath: shard.clipPath,
                  opacity: 0,
                  transform: 'translate(0rem, 0rem) scale(0.2)',
                }}
              />
            ))}
            <img
              ref={(node) => {
                imageRefs.current[slotIndex] = node;
              }}
              className="cinematic-loading-screen__reward-token-image"
              src={assetSrc}
              alt=""
              aria-hidden="true"
              draggable="false"
              style={{ opacity: 0 }}
            />
          </span>
          <span
            ref={(node) => {
              pointsRefs.current[slotIndex] = node;
            }}
            className="cinematic-loading-screen__reward-points-pop"
            aria-hidden="true"
            style={{
              opacity: 0,
              transform: 'translate(-50%, -10%) scale(0.94)',
            }}
          >
            +{rewardPoints}pts
          </span>
        </button>
      ))}
    </div>
  );
});

LoaderRewardLayer.displayName = 'LoaderRewardLayer';

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
  const [timeMs, setTimeMs] = useState(0);
  const [internalBootProgress, setInternalBootProgress] = useState(INITIAL_BOOT_PROGRESS);
  const [displayBootProgress, setDisplayBootProgress] = useState(INITIAL_BOOT_PROGRESS);
  const [rewardAnimationExitHoldActive, setRewardAnimationExitHoldActive] = useState(false);
  const [bootStartedAtMs] = useState(() => getAnimationClockNow());
  const finishTriggeredRef = useRef(false);
  const finishTimerRef = useRef<number | null>(null);

  const rewardPoints = interactiveRewards?.rewardPoints ?? 10;
  const minimumCollectWindowMs = Math.max(
    0,
    interactiveRewards?.minimumCollectWindowMs ?? REWARD_TOKEN_MIN_COLLECT_WINDOW_MS,
  );
  const minimumBootDurationMs = mode === 'boot'
    ? Math.max(0, minimumBootDurationOverrideMs ?? minimumCollectWindowMs)
    : 0;
  const interactiveRewardsEnabled = Boolean(
    interactiveRewards?.enabled
    && interactiveRewards.assetSrc
    && mode === 'boot',
  );
  const interactiveRewardConfig = interactiveRewardsEnabled && interactiveRewards
    ? interactiveRewards
    : null;
  const bootElapsedMs = mode === 'boot'
    ? Math.max(0, timeMs - bootStartedAtMs)
    : 0;
  const minimumBootDurationActive = mode === 'boot'
    && bootElapsedMs < minimumBootDurationMs;
  const rewardCollectWindowActive = interactiveRewardsEnabled
    && bootElapsedMs < Math.max(minimumCollectWindowMs, minimumBootDurationMs);
  const bootReady = ready && !minimumBootDurationActive;
  const loaderExitHoldActive = minimumBootDurationActive || rewardAnimationExitHoldActive;

  useEffect(() => {
    let animationFrameId = 0;
    let active = true;

    const tick = (timestamp: number) => {
      if (!active) {
        return;
      }

      setTimeMs(timestamp);
      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);
    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    if (mode !== 'boot' || typeof progressOverride === 'number') {
      return undefined;
    }

    let animationFrameId = 0;
    let active = true;

    const step = () => {
      if (!active) {
        return;
      }

      setInternalBootProgress((current) => {
        const target = bootReady ? 1 : 0.9;
        const easing = bootReady ? 0.18 : 0.028;
        const drift = bootReady ? 0 : (prefersReducedMotion ? 0.0011 : 0.0021);
        const next = current + ((target - current) * easing);
        return clamp(Math.max(next, Math.min(target, current + drift)));
      });

      animationFrameId = window.requestAnimationFrame(step);
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [bootReady, mode, prefersReducedMotion, progressOverride]);

  const targetVisualProgress = useMemo(() => {
    if (mode === 'boot') {
      const bootProgressTarget = clamp(
        typeof progressOverride === 'number' ? progressOverride : internalBootProgress,
      );
      return minimumBootDurationActive
        ? Math.min(bootProgressTarget, REWARD_TOKEN_COLLECT_WINDOW_PROGRESS_CAP)
        : bootProgressTarget;
    }

    return resolveIndeterminateTravelProgress(timeMs);
  }, [internalBootProgress, minimumBootDurationActive, mode, progressOverride, timeMs]);

  useEffect(() => {
    if (mode !== 'boot') {
      return undefined;
    }

    let animationFrameId = 0;
    let active = true;
    let previousTimestamp = 0;

    const animate = (timestamp: number) => {
      if (!active) {
        return;
      }

      const deltaMs = previousTimestamp > 0
        ? Math.min(48, Math.max(8, timestamp - previousTimestamp))
        : 16.67;
      previousTimestamp = timestamp;

      setDisplayBootProgress((current) => {
        const delta = targetVisualProgress - current;
        if (Math.abs(delta) < 0.0008) {
          return targetVisualProgress;
        }

        const response = 1 - Math.exp(-(bootReady ? 0.0085 : 0.0065) * deltaMs);
        const minimumStep = deltaMs * (bootReady ? 0.00009 : 0.000045);
        const maximumStep = deltaMs * (bootReady ? 0.0003 : 0.00018);
        const desiredStep = Math.abs(delta) * response;
        const stepMagnitude = Math.min(maximumStep, Math.max(desiredStep, minimumStep));
        const step = Math.sign(delta) * stepMagnitude;
        return clamp(current + step);
      });

      animationFrameId = window.requestAnimationFrame(animate);
    };

    animationFrameId = window.requestAnimationFrame(animate);
    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [bootReady, mode, targetVisualProgress]);

  const visualProgress = mode === 'boot' ? displayBootProgress : targetVisualProgress;

  const impactActive = mode === 'boot' && bootReady && visualProgress >= 0.999;

  useEffect(() => {
    interactiveRewards?.onExitHoldChange?.(loaderExitHoldActive);
  }, [interactiveRewards, loaderExitHoldActive]);

  useEffect(() => {
    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }

    if (!impactActive) {
      finishTriggeredRef.current = false;
      return undefined;
    }

    if (finishTriggeredRef.current || loaderExitHoldActive) {
      return undefined;
    }

    finishTimerRef.current = window.setTimeout(() => {
      finishTimerRef.current = null;
      finishTriggeredRef.current = true;
      onFinish?.();
    }, prefersReducedMotion ? 150 : 320);

    return () => {
      if (finishTimerRef.current !== null) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
    };
  }, [impactActive, loaderExitHoldActive, onFinish, prefersReducedMotion]);

  const scene = useMemo(() => {
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
    const scrollGlow = clamp(0.24 + (visualProgress * 0.46) + (impactActive ? 0.34 : 0));
    const wingFlap = prefersReducedMotion
      ? (4.6 + (Math.sin((timeMs * 0.0042) + (visualProgress * 3.2)) * 1.8))
      : (8.2 + (Math.sin((timeMs * 0.012) + (visualProgress * 4.4)) * 6.6));
    const trailStartX = prefersReducedMotion ? 10.8 : 9.8;
    const trailWidth = Math.max(0, xioPosition.x - trailStartX + 2.6);
    const trailHaloOpacity = clamp(0.54 + (visualProgress * 0.28) + (impactActive ? 0.08 : 0));
    const trailCoreOpacity = clamp(0.7 + (visualProgress * 0.18));
    const sparkleStrength = impactActive
      ? clamp(0.58 + (Math.sin(timeMs * 0.03) * 0.12))
      : clamp((visualProgress - 0.72) / 0.28);
    const scrollScale = bootReady
      ? lerp(1, prefersReducedMotion ? 1.05 : 1.12, smoothstep((visualProgress - 0.92) / 0.08))
      : 1;
    const scrollShiverX = impactActive ? 0 : (prefersReducedMotion ? 1.2 : 2.5);
    const scrollShiverY = impactActive ? 0 : (prefersReducedMotion ? 0.5 : 1.1);

    return {
      directionAngle,
      scrollGlow,
      scrollPoint,
      scrollScale,
      scrollShiverX,
      scrollShiverY,
      sparkleStrength,
      statusBody: mode === 'boot'
        ? (bootReady
          ? 'XiO touched the Mystery scroll. Opening your homepage...'
          : 'Loading completes once XiO reaches the Mystery scroll and your homepage is ready.')
        : 'XiO is drifting toward the Mystery scroll while the app starts.',
      statusTitle: mode === 'boot' ? 'XiO Is Approaching The Mystery Scroll' : 'Preparing La\'s Homeschool',
      trailCoreOpacity,
      trailHaloOpacity,
      trailStartX,
      trailWidth,
      wingFlap,
      xioGlowOpacity: clamp(0.24 + (visualProgress * 0.36)),
      xioPosition,
    };
  }, [bootReady, impactActive, mode, prefersReducedMotion, timeMs, visualProgress]);

  const rootClassName = [
    'cinematic-loading-screen',
    `cinematic-loading-screen--${surface}`,
    mode === 'boot' ? 'is-boot-mode' : 'is-indeterminate-mode',
    prefersReducedMotion ? 'is-reduced-motion' : '',
    impactActive ? 'is-impact-active' : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  const rootStyle = {
    '--cinematic-loader-background': `url("${backgroundImage}")`,
    '--cinematic-progress': visualProgress.toFixed(4),
    '--cinematic-scroll-glow': scene.scrollGlow.toFixed(4),
    '--cinematic-scroll-shiver-x': `${scene.scrollShiverX}px`,
    '--cinematic-scroll-shiver-y': `${scene.scrollShiverY}px`,
    '--cinematic-xio-glow-opacity': scene.xioGlowOpacity.toFixed(4),
  } as React.CSSProperties;

  return (
    <div className={rootClassName} style={rootStyle} role="status" aria-live="polite">
      <div className="cinematic-loading-screen__backdrop" aria-hidden="true" />
      <div className="cinematic-loading-screen__stage">
        <div className="cinematic-loading-screen__flight-bar-dim" aria-hidden="true" />
        <div className="cinematic-loading-screen__flight-bar" aria-hidden="true">
          <span className="cinematic-loading-screen__flight-bar-sheen" />
          <span
            className="cinematic-loading-screen__trail-beam cinematic-loading-screen__trail-beam--halo"
            style={{
              left: `${scene.trailStartX}%`,
              top: `${scene.xioPosition.y}%`,
              width: `${scene.trailWidth}%`,
              opacity: scene.trailHaloOpacity,
            }}
          />
          <span
            className="cinematic-loading-screen__trail-beam cinematic-loading-screen__trail-beam--core"
            style={{
              left: `${scene.trailStartX}%`,
              top: `${scene.xioPosition.y}%`,
              width: `${scene.trailWidth}%`,
              opacity: scene.trailCoreOpacity,
            }}
          />

          <div
            className="cinematic-loading-screen__ambient-orb cinematic-loading-screen__ambient-orb--xio"
            style={{
              left: `${scene.xioPosition.x}%`,
              top: `${scene.xioPosition.y}%`,
            }}
          />
          <div
            className="cinematic-loading-screen__ambient-orb cinematic-loading-screen__ambient-orb--scroll"
            style={{
              left: `${scene.scrollPoint.x}%`,
              top: `${scene.scrollPoint.y}%`,
            }}
          />

          <div
            className="cinematic-loading-screen__scroll-anchor"
            style={{
              left: `${scene.scrollPoint.x}%`,
              top: `${scene.scrollPoint.y}%`,
              '--scroll-scale': scene.scrollScale.toFixed(4),
            } as React.CSSProperties}
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
            className="cinematic-loading-screen__xio"
            style={{
              left: `${scene.xioPosition.x}%`,
              top: `${scene.xioPosition.y}%`,
              transform: `translate(-50%, -50%) rotate(${scene.directionAngle}deg)`,
              '--wing-flap': `${scene.wingFlap.toFixed(2)}deg`,
              '--body-tilt': `${(scene.directionAngle * 0.12).toFixed(2)}deg`,
              '--sparkle-strength': scene.sparkleStrength.toFixed(4),
            } as React.CSSProperties}
          >
            <LoaderXioCharacter />
          </div>
        </div>
      </div>
      {interactiveRewardConfig ? (
        <LoaderRewardLayer
          key={`reward-layer:${interactiveRewardConfig.assetSrc}`}
          assetSrc={interactiveRewardConfig.assetSrc}
          totalPoints={interactiveRewardConfig.totalPoints}
          rewardPoints={rewardPoints}
          collectWindowActive={rewardCollectWindowActive}
          bootReady={bootReady}
          prefersReducedMotion={prefersReducedMotion}
          onCollect={interactiveRewardConfig.onCollect}
          onOpeningHoldChange={setRewardAnimationExitHoldActive}
        />
      ) : null}
      <span className="cinematic-loading-screen__sr-only">{scene.statusTitle}. {scene.statusBody}</span>
    </div>
  );
};

export default CinematicLoadingScreen;
