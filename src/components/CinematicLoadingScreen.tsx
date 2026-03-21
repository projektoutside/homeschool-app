import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  surface?: 'page' | 'panel';
  className?: string;
};

const xioLoadingImageSrc = `${import.meta.env.BASE_URL}HomePageAPP/XiOLoadingscreen.png`;

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

export const CinematicLoadingScreen: React.FC<CinematicLoadingScreenProps> = ({
  mode,
  ready,
  onFinish,
  progressOverride,
  surface = 'page',
  className,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [timeMs, setTimeMs] = useState(0);
  const [internalBootProgress, setInternalBootProgress] = useState(INITIAL_BOOT_PROGRESS);
  const [displayBootProgress, setDisplayBootProgress] = useState(INITIAL_BOOT_PROGRESS);
  const finishTriggeredRef = useRef(false);

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
        const target = ready ? 1 : 0.9;
        const easing = ready ? 0.18 : 0.028;
        const drift = ready ? 0 : (prefersReducedMotion ? 0.0011 : 0.0021);
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
  }, [mode, prefersReducedMotion, progressOverride, ready]);

  const targetVisualProgress = useMemo(() => {
    if (mode === 'boot') {
      return clamp(typeof progressOverride === 'number' ? progressOverride : internalBootProgress);
    }

    return resolveIndeterminateTravelProgress(timeMs);
  }, [internalBootProgress, mode, progressOverride, timeMs]);

  useEffect(() => {
    if (mode !== 'boot') {
      return undefined;
    }

    let animationFrameId = 0;
    let active = true;

    const animate = () => {
      if (!active) {
        return;
      }

      setDisplayBootProgress((current) => {
        const delta = targetVisualProgress - current;
        if (Math.abs(delta) < 0.0008) {
          return targetVisualProgress;
        }

        const easing = ready ? 0.22 : 0.16;
        const minimumStep = ready ? 0.0018 : 0.001;
        const step = Math.sign(delta) * Math.max(Math.abs(delta * easing), minimumStep);
        return clamp(current + step);
      });

      animationFrameId = window.requestAnimationFrame(animate);
    };

    animationFrameId = window.requestAnimationFrame(animate);
    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [mode, ready, targetVisualProgress]);

  const visualProgress = mode === 'boot' ? displayBootProgress : targetVisualProgress;

  const impactActive = mode === 'boot' && ready && visualProgress >= 0.999;

  useEffect(() => {
    if (!impactActive) {
      finishTriggeredRef.current = false;
      return undefined;
    }

    if (finishTriggeredRef.current) {
      return undefined;
    }

    finishTriggeredRef.current = true;
    const timerId = window.setTimeout(() => {
      onFinish?.();
    }, prefersReducedMotion ? 150 : 320);

    return () => window.clearTimeout(timerId);
  }, [impactActive, onFinish, prefersReducedMotion]);

  const scene = useMemo(() => {
    const curve = prefersReducedMotion ? REDUCED_CURVE : BOOT_CURVE;
    const scrollPoint = prefersReducedMotion ? REDUCED_SCROLL_POINT : BOOT_SCROLL_POINT;
    const travelProgress = mode === 'boot'
      ? resolveBootTravelProgress(visualProgress, ready)
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
    const scrollScale = ready
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
        ? (ready
          ? 'XiO touched the Mystery scroll. Opening your homepage...'
          : 'Loading completes the moment XiO reaches the Mystery scroll.')
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
  }, [impactActive, mode, prefersReducedMotion, ready, timeMs, visualProgress]);

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

        <span className="cinematic-loading-screen__sr-only">{scene.statusTitle}. {scene.statusBody}</span>
      </div>
    </div>
  );
};

export default CinematicLoadingScreen;
