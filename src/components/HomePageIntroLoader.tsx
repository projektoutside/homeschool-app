import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import backgroundImage from '../../MainLoadingScreen.png';
import {
  buildSpriteSet,
  releaseSpriteSet,
} from './homePageIntroLoader/assets';
import {
  DEFAULT_BOOT_TARGET_DURATION_MS,
  DEFAULT_REWARD_POINTS,
  DPR_CAP,
} from './homePageIntroLoader/constants';
import {
  buildStaticStageLayer,
  drawDynamicScene,
} from './homePageIntroLoader/scene';
import {
  computeFinishState,
  createInitialRuntimeState,
  hasActiveHold,
  markTokenOpening,
  maybeSpawnToken,
  pickTopTokenAt,
  prepareDrawOrder,
  resolveBootFinishRequested,
  resolveReleaseShouldCollect,
  resolveTimeCurveProgress,
  restorePressedToken,
  setTokenPressed,
  updateAdaptiveQuality,
  updateTokensInPlace,
} from './homePageIntroLoader/runtime';
import type {
  HomePageIntroLoaderProps,
  InteractiveRewardCollectPayload,
  PointerRecord,
  RewardQualityProfile,
  RewardToken,
  SpriteSet,
  StageBounds,
} from './homePageIntroLoader/types';
import { getAnimationClockNow, lerp } from './homePageIntroLoader/utils';
import './HomePageIntroLoader.css';

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

const HomePageIntroLoader: React.FC<HomePageIntroLoaderProps> = ({
  ready,
  onFinish,
  assetSrc,
  totalPoints,
  rewardPoints = DEFAULT_REWARD_POINTS,
  bootStartedAtMs,
  bootTargetDurationMs = DEFAULT_BOOT_TARGET_DURATION_MS,
  onCollect,
  className,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [caughtRewardPoints, setCaughtRewardPoints] = useState(0);
  const [qualityProfileState, setQualityProfileState] = useState<RewardQualityProfile>(prefersReducedMotion ? 'reduced-motion' : 'full');
  const [bootReadyState, setBootReadyState] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const boundsRef = useRef<StageBounds>({ width: 0, height: 0, dpr: 1, left: 0, top: 0 });
  const staticLayerRef = useRef<HTMLCanvasElement | null>(null);
  const staticLayerMetricsRef = useRef<{ width: number; height: number; dpr: number } | null>(null);
  const spriteSetRef = useRef<SpriteSet | null>(null);
  const xioImageRef = useRef<HTMLImageElement | null>(null);
  const tokensRef = useRef<RewardToken[]>([]);
  const drawOrderRef = useRef<RewardToken[]>([]);
  const autoOpenedTokenIdsRef = useRef<string[]>([]);
  const pointersRef = useRef<Map<number, PointerRecord>>(new Map());
  const mountedRef = useRef(true);
  const readyRef = useRef(ready);
  const onCollectRef = useRef(onCollect);
  const onFinishRef = useRef(onFinish);
  const bootReadyStateRef = useRef(false);
  const runtimeRef = useRef(createInitialRuntimeState(prefersReducedMotion, bootStartedAtMs, bootTargetDurationMs));

  const stopEvent = useCallback((event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const syncCanvasMetrics = useCallback(() => {
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
      contextRef.current = canvas.getContext('2d', { alpha: true });
    } else if (!contextRef.current) {
      contextRef.current = canvas.getContext('2d', { alpha: true });
    }

    const nextBounds: StageBounds = {
      width,
      height,
      dpr,
      left: rect.left,
      top: rect.top,
    };

    boundsRef.current = nextBounds;
    const previousStaticLayerMetrics = staticLayerMetricsRef.current;
    if (
      !previousStaticLayerMetrics
      || previousStaticLayerMetrics.width !== width
      || previousStaticLayerMetrics.height !== height
      || previousStaticLayerMetrics.dpr !== dpr
    ) {
      staticLayerRef.current = buildStaticStageLayer(nextBounds);
      staticLayerMetricsRef.current = { width, height, dpr };
    }
  }, []);

  const notifyTokenCollected = useCallback((token: RewardToken) => {
    const collectPayload: InteractiveRewardCollectPayload = {
      tokenId: token.id,
      variant: token.variant,
      occurredAt: new Date().toISOString(),
    };

    const collectResult = onCollectRef.current?.(collectPayload);
    if (!onCollectRef.current) {
      setCaughtRewardPoints((current) => current + rewardPoints);
      return;
    }

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
  }, [rewardPoints]);

  const beginTokenOpening = useCallback((tokenId: string, nowMs: number) => {
    const openedToken = markTokenOpening(tokensRef.current, tokenId, nowMs);
    if (openedToken) {
      notifyTokenCollected(openedToken);
    }
  }, [notifyTokenCollected]);

  const translateClientPoint = useCallback((clientX: number, clientY: number) => {
    const bounds = boundsRef.current;
    return {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
    };
  }, []);

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

    const releasePoint = translateClientPoint(clientX, clientY);
    if (resolveReleaseShouldCollect(token, releasePoint.x, releasePoint.y, runtimeRef.current.qualityProfile)) {
      beginTokenOpening(token.id, getAnimationClockNow());
      return;
    }

    restorePressedToken(tokensRef.current, token.id, getAnimationClockNow());
  }, [beginTokenOpening, translateClientPoint]);

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
  }, [onCollect, onFinish, ready]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') {
      syncCanvasMetrics();
      window.addEventListener('resize', syncCanvasMetrics, { passive: true });
      return () => window.removeEventListener('resize', syncCanvasMetrics);
    }

    syncCanvasMetrics();
    const resizeObserver = new ResizeObserver(() => {
      syncCanvasMetrics();
    });
    resizeObserver.observe(root);
    window.addEventListener('resize', syncCanvasMetrics, { passive: true });
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncCanvasMetrics);
    };
  }, [syncCanvasMetrics]);

  useEffect(() => {
    let cancelled = false;
    const previousSpriteSet = spriteSetRef.current;

    void buildSpriteSet(assetSrc, prefersReducedMotion)
      .then(({ spriteSet, xioImage }) => {
        if (cancelled) {
          releaseSpriteSet(spriteSet);
          return;
        }

        releaseSpriteSet(previousSpriteSet);
        spriteSetRef.current = spriteSet;
        xioImageRef.current = xioImage;
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        releaseSpriteSet(previousSpriteSet);
        spriteSetRef.current = null;
        xioImageRef.current = null;
      });

    return () => {
      cancelled = true;
    };
  }, [assetSrc, prefersReducedMotion]);

  useEffect(() => {
    tokensRef.current.length = 0;
    pointersRef.current.clear();
    runtimeRef.current = createInitialRuntimeState(prefersReducedMotion, bootStartedAtMs, bootTargetDurationMs);
    bootReadyStateRef.current = false;

    let cancelled = false;
    let animationFrameId = 0;

    const step = (timestamp: number) => {
      if (cancelled) {
        return;
      }

      const runtime = runtimeRef.current;
      const bounds = boundsRef.current;
      const context = contextRef.current;
      if (!context || bounds.width <= 0 || bounds.height <= 0) {
        animationFrameId = window.requestAnimationFrame(step);
        return;
      }

      const deltaMs = runtime.previousFrameMs > 0 ? Math.min(48, Math.max(8, timestamp - runtime.previousFrameMs)) : 16.67;
      runtime.previousFrameMs = timestamp;

      const downgradedProfile = updateAdaptiveQuality(runtime, deltaMs, prefersReducedMotion);
      if (downgradedProfile) {
        setQualityProfileState(downgradedProfile);
      }

      const { finishRequested, elapsedBootMs } = resolveBootFinishRequested(
        readyRef.current,
        bootStartedAtMs,
        bootTargetDurationMs,
      );

      if (bootReadyStateRef.current !== finishRequested) {
        bootReadyStateRef.current = finishRequested;
        setBootReadyState(finishRequested);
      }

      const timeCurve = resolveTimeCurveProgress(elapsedBootMs, bootTargetDurationMs);
      runtime.visualProgress = lerp(runtime.visualProgress, finishRequested ? 1 : timeCurve, finishRequested ? 0.16 : 0.09);

      maybeSpawnToken(
        runtime,
        tokensRef.current,
        timestamp,
        bounds,
        finishRequested,
        elapsedBootMs,
        bootTargetDurationMs,
      );

      updateTokensInPlace(tokensRef.current, timestamp, autoOpenedTokenIdsRef.current);
      for (let index = 0; index < autoOpenedTokenIdsRef.current.length; index += 1) {
        const tokenId = autoOpenedTokenIdsRef.current[index];
        const openedToken = tokensRef.current.find((candidate) => candidate.id === tokenId);
        if (openedToken) {
          notifyTokenCollected(openedToken);
        }
      }

      const holdActive = hasActiveHold(tokensRef.current, timestamp);
      computeFinishState(runtime, timestamp, finishRequested, holdActive, () => {
        onFinishRef.current?.();
      });

      drawDynamicScene({
        context,
        bounds,
        runtime,
        staticLayer: staticLayerRef.current,
        spriteSet: spriteSetRef.current,
        xioImage: xioImageRef.current,
        tokens: prepareDrawOrder(tokensRef.current, drawOrderRef.current),
        rewardPoints,
        nowMs: timestamp,
      });

      animationFrameId = window.requestAnimationFrame(step);
    };

    syncCanvasMetrics();
    animationFrameId = window.requestAnimationFrame(step);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [bootStartedAtMs, bootTargetDurationMs, notifyTokenCollected, prefersReducedMotion, rewardPoints, syncCanvasMetrics]);

  useEffect(() => {
    return () => {
      releaseSpriteSet(spriteSetRef.current);
      spriteSetRef.current = null;
      xioImageRef.current = null;
      staticLayerRef.current = null;
      staticLayerMetricsRef.current = null;
    };
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    stopEvent(event);
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const point = translateClientPoint(event.clientX, event.clientY);
    const token = pickTopTokenAt(tokensRef.current, point.x, point.y, runtimeRef.current.qualityProfile);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY, tokenId: token?.id ?? null });

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Ignore capture failures on unsupported browsers.
    }

    if (token) {
      setTokenPressed(tokensRef.current, token.id, event.pointerId, getAnimationClockNow());
    }
  }, [stopEvent, translateClientPoint]);

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
    const handleWindowPointerRelease = (event: PointerEvent) => {
      if (pointersRef.current.has(event.pointerId)) {
        releasePointerToken(event.pointerId, event.clientX, event.clientY);
      }
    };

    window.addEventListener('pointerup', handleWindowPointerRelease, true);
    window.addEventListener('pointercancel', handleWindowPointerRelease, true);
    return () => {
      window.removeEventListener('pointerup', handleWindowPointerRelease, true);
      window.removeEventListener('pointercancel', handleWindowPointerRelease, true);
    };
  }, [releasePointerToken]);

  const rewardHudCopy = caughtRewardPoints > 0 ? `Boot bonus +${caughtRewardPoints}` : `Catch PTS for +${rewardPoints}`;
  const displayQualityProfile = prefersReducedMotion ? 'reduced-motion' : qualityProfileState;
  const rootClassName = [
    'home-page-intro-loader',
    displayQualityProfile === 'lite' ? 'is-lite' : '',
    displayQualityProfile === 'reduced-motion' ? 'is-reduced-motion' : '',
    className ?? '',
  ].filter(Boolean).join(' ');
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

export type { InteractiveRewardCollectPayload } from './homePageIntroLoader/types';
export default HomePageIntroLoader;
