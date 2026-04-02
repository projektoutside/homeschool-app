import { PROGRESS_HOLD_CAP } from './constants';

export const clamp = (value: number, min = 0, max = 1): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

export const lerp = (start: number, end: number, alpha: number): number => start + ((end - start) * alpha);
export const easeOutCubic = (value: number): number => 1 - ((1 - clamp(value)) ** 3);
export const easeInOutSine = (value: number): number => -(Math.cos(Math.PI * clamp(value)) - 1) / 2;
export const smoothstep = (value: number): number => {
  const next = clamp(value);
  return next * next * (3 - (2 * next));
};
export const randomBetween = (min: number, max: number): number => min + ((max - min) * Math.random());

export const getAnimationClockNow = (): number => (
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
);

export const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export const resolveTimeCurve = (elapsedMs: number, targetDurationMs: number): number => {
  const safeTargetMs = Math.max(1, targetDurationMs);
  const timeProgress = clamp(elapsedMs / safeTargetMs);
  if (timeProgress < 0.84) {
    return lerp(0.06, 0.89, easeOutCubic(timeProgress / 0.84));
  }
  return lerp(0.89, PROGRESS_HOLD_CAP, smoothstep((timeProgress - 0.84) / 0.16));
};
