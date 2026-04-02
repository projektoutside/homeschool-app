import {
  INTRO_CURVE,
  ORIGINAL_SCROLL_ROTATION_RAD,
} from './constants';
import type {
  LoaderRuntimeState,
  RewardToken,
  SpriteBundle,
  SpriteSet,
  StageBounds,
} from './types';
import { clamp, createCanvas, easeOutCubic, lerp } from './utils';

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

export const resolveBundleForProfile = (spriteSet: SpriteSet, profile: LoaderRuntimeState['qualityProfile']): SpriteBundle => (
  profile === 'full' ? spriteSet.full : profile === 'lite' ? spriteSet.lite : spriteSet.reducedMotion
);

export const resolveStagePoint = (bounds: StageBounds, point: { x: number; y: number }) => {
  const stageLeft = Math.max(18, bounds.width * 0.06);
  const stageRight = bounds.width - Math.max(20, bounds.width * 0.08);
  const stageTop = Math.max(48, bounds.height * 0.14);
  const stageBottom = bounds.height - Math.max(132, bounds.height * 0.2);
  return {
    x: lerp(stageLeft, stageRight, point.x),
    y: lerp(stageTop, stageBottom, point.y),
  };
};

const cubicBezierPoint = (
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
) => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: (mt2 * mt * p0.x) + (3 * mt2 * t * p1.x) + (3 * mt * t2 * p2.x) + (t2 * t * p3.x),
    y: (mt2 * mt * p0.y) + (3 * mt2 * t * p1.y) + (3 * mt * t2 * p2.y) + (t2 * t * p3.y),
  };
};

const cubicBezierTangent = (
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
) => {
  const mt = 1 - t;
  return {
    x: (3 * mt * mt * (p1.x - p0.x)) + (6 * mt * t * (p2.x - p1.x)) + (3 * t * t * (p3.x - p2.x)),
    y: (3 * mt * mt * (p1.y - p0.y)) + (6 * mt * t * (p2.y - p1.y)) + (3 * t * t * (p3.y - p2.y)),
  };
};

export const resolveFlightPose = (bounds: StageBounds, progress: number) => {
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

export const buildStaticStageLayer = (bounds: StageBounds): HTMLCanvasElement | null => {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return null;
  }

  const canvas = createCanvas(Math.round(bounds.width * bounds.dpr), Math.round(bounds.height * bounds.dpr));
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  context.setTransform(bounds.dpr, 0, 0, bounds.dpr, 0, 0);

  const start = resolveStagePoint(bounds, INTRO_CURVE.start);
  const controlOne = resolveStagePoint(bounds, INTRO_CURVE.controlOne);
  const controlTwo = resolveStagePoint(bounds, INTRO_CURVE.controlTwo);
  const end = resolveStagePoint(bounds, INTRO_CURVE.end);

  context.save();
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.bezierCurveTo(controlOne.x, controlOne.y, controlTwo.x, controlTwo.y, end.x, end.y);
  context.lineWidth = Math.max(18, bounds.height * 0.038);
  context.strokeStyle = 'rgba(16, 28, 58, 0.56)';
  context.stroke();

  context.beginPath();
  context.moveTo(start.x, start.y);
  context.bezierCurveTo(controlOne.x, controlOne.y, controlTwo.x, controlTwo.y, end.x, end.y);
  context.lineWidth = Math.max(9, bounds.height * 0.016);
  context.strokeStyle = 'rgba(94, 233, 255, 0.58)';
  context.stroke();
  context.restore();

  const scrollPoint = resolveStagePoint(bounds, INTRO_CURVE.end);
  const scrollGlowRadius = Math.max(40, bounds.width * 0.065);
  const scrollGlow = context.createRadialGradient(scrollPoint.x, scrollPoint.y, scrollGlowRadius * 0.12, scrollPoint.x, scrollPoint.y, scrollGlowRadius);
  scrollGlow.addColorStop(0, 'rgba(255, 229, 140, 0.58)');
  scrollGlow.addColorStop(1, 'rgba(255, 229, 140, 0)');
  context.fillStyle = scrollGlow;
  context.beginPath();
  context.arc(scrollPoint.x, scrollPoint.y, scrollGlowRadius, 0, Math.PI * 2);
  context.fill();
  drawScrollIcon(context, scrollPoint.x, scrollPoint.y, Math.max(0.82, bounds.width / 1100));

  return canvas;
};

const drawFlightTrail = (
  context: CanvasRenderingContext2D,
  bounds: StageBounds,
  trailX: number,
  trailY: number,
  trailProgress: number,
): void => {
  const start = resolveStagePoint(bounds, INTRO_CURVE.start);
  const controlOne = resolveStagePoint(bounds, INTRO_CURVE.controlOne);
  const controlTwo = resolveStagePoint(bounds, INTRO_CURVE.controlTwo);
  const trailGradient = context.createLinearGradient(start.x, start.y, trailX, trailY);
  trailGradient.addColorStop(0, 'rgba(120, 238, 255, 0)');
  trailGradient.addColorStop(0.35, 'rgba(120, 238, 255, 0.18)');
  trailGradient.addColorStop(1, 'rgba(241, 251, 255, 0.95)');
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.bezierCurveTo(controlOne.x, controlOne.y, controlTwo.x, controlTwo.y, trailX, trailY);
  context.lineWidth = Math.max(5, bounds.height * 0.012);
  context.strokeStyle = trailGradient;
  context.stroke();

  if (trailProgress > 0.98) {
    context.save();
    context.globalAlpha = clamp((trailProgress - 0.98) / 0.02);
    context.beginPath();
    context.arc(trailX, trailY, Math.max(28, bounds.width * 0.04), 0, Math.PI * 2);
    context.fillStyle = 'rgba(255, 241, 196, 0.22)';
    context.fill();
    context.restore();
  }
};

const drawToken = (
  context: CanvasRenderingContext2D,
  token: RewardToken,
  spriteBundle: SpriteBundle | null,
  nowMs: number,
  rewardPoints: number,
): void => {
  const drawX = token.phase === 'flying' ? token.visualX : token.freezeX;
  const drawY = token.phase === 'flying' ? token.visualY : token.freezeY;
  const drawRotation = token.phase === 'flying' ? token.visualRotation : token.freezeRotation;
  const openingProgress = token.phase === 'opening' ? clamp((nowMs - token.phaseStartedAtMs) / 430) : 0;
  const collectedProgress = token.phase === 'collected' ? clamp((nowMs - token.phaseStartedAtMs) / 170) : 0;
  const baseScale = token.phase === 'pressed' ? 0.95 : (token.phase === 'opening' ? lerp(1, 1.14, easeOutCubic(openingProgress)) : 1);
  const baseOpacity = token.phase === 'collected'
    ? 1 - collectedProgress
    : (token.expiresAtMs - nowMs < 900 ? clamp((token.expiresAtMs - nowMs) / 900, 0.38, 1) : 1);
  const drawSize = spriteBundle?.drawSizePx ?? token.sizePx;
  const glowSize = drawSize * 1.68;

  context.save();
  context.globalAlpha = baseOpacity;
  context.translate(drawX, drawY);
  context.rotate(drawRotation);

  if (spriteBundle?.glow) {
    context.globalAlpha = baseOpacity * (token.phase === 'opening' ? 0.46 : 0.22);
    context.drawImage(spriteBundle.glow, -glowSize * 0.5, -glowSize * 0.5, glowSize, glowSize);
    context.globalAlpha = baseOpacity;
  }

  context.scale(token.phase === 'pressed' ? 1.06 : baseScale, token.phase === 'pressed' ? 0.9 : baseScale);
  if (spriteBundle) {
    context.drawImage(spriteBundle.coin, -drawSize * 0.5, -drawSize * 0.5, drawSize, drawSize);
  } else {
    context.fillStyle = '#ffd54d';
    context.beginPath();
    context.arc(0, 0, token.sizePx * 0.42, 0, Math.PI * 2);
    context.fill();
  }

  if (token.phase === 'opening' && spriteBundle?.burst) {
    const burstSize = drawSize * lerp(0.92, 1.38, easeOutCubic(openingProgress));
    context.globalAlpha = baseOpacity * (1 - openingProgress);
    context.drawImage(spriteBundle.burst, -burstSize * 0.5, -burstSize * 0.5, burstSize, burstSize);
    context.globalAlpha = baseOpacity;
  }

  context.restore();

  if (token.phase === 'opening') {
    const labelProgress = easeOutCubic(openingProgress);
    const labelY = drawY - lerp(token.sizePx * 0.12, token.sizePx * 0.82, labelProgress);
    context.save();
    context.globalAlpha = 1 - (openingProgress * 0.72);
    context.fillStyle = '#fff7d1';
    context.strokeStyle = 'rgba(9, 18, 37, 0.72)';
    context.lineWidth = 5;
    context.lineJoin = 'round';
    context.font = `800 ${Math.max(18, Math.round(token.sizePx * 0.25))}px "Trebuchet MS", "Segoe UI", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const label = `+${rewardPoints}`;
    context.strokeText(label, drawX, labelY);
    context.fillText(label, drawX, labelY);
    context.restore();
  }
};

export const drawDynamicScene = ({
  context,
  bounds,
  runtime,
  staticLayer,
  spriteSet,
  xioImage,
  tokens,
  rewardPoints,
  nowMs,
}: {
  context: CanvasRenderingContext2D;
  bounds: StageBounds;
  runtime: LoaderRuntimeState;
  staticLayer: HTMLCanvasElement | null;
  spriteSet: SpriteSet | null;
  xioImage: CanvasImageSource | HTMLImageElement | null;
  tokens: RewardToken[];
  rewardPoints: number;
  nowMs: number;
}): void => {
  context.save();
  context.setTransform(bounds.dpr, 0, 0, bounds.dpr, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);

  if (staticLayer) {
    context.drawImage(staticLayer, 0, 0, bounds.width, bounds.height);
  }

  const flightPose = resolveFlightPose(bounds, runtime.visualProgress);
  drawFlightTrail(context, bounds, flightPose.point.x, flightPose.point.y, runtime.visualProgress);

  const xioGlow = context.createRadialGradient(flightPose.point.x, flightPose.point.y, bounds.width * 0.01, flightPose.point.x, flightPose.point.y, bounds.width * 0.058);
  xioGlow.addColorStop(0, 'rgba(196, 248, 255, 0.82)');
  xioGlow.addColorStop(1, 'rgba(120, 238, 255, 0)');
  context.fillStyle = xioGlow;
  context.beginPath();
  context.arc(flightPose.point.x, flightPose.point.y, Math.max(26, bounds.width * 0.042), 0, Math.PI * 2);
  context.fill();

  const xioDrawSize = Math.max(52, bounds.width * 0.095);
  context.save();
  context.translate(flightPose.point.x, flightPose.point.y);
  context.rotate(flightPose.angle * 0.22);
  if (xioImage) {
    context.scale(-1, 1);
    context.drawImage(xioImage, -xioDrawSize * 0.5, -xioDrawSize * 0.44, xioDrawSize, xioDrawSize);
  } else {
    drawFallbackXio(context, 0, 0, xioDrawSize);
  }
  context.restore();

  const spriteBundle = spriteSet ? resolveBundleForProfile(spriteSet, runtime.qualityProfile) : null;
  for (let index = 0; index < tokens.length; index += 1) {
    drawToken(context, tokens[index], spriteBundle, nowMs, rewardPoints);
  }

  context.restore();
};
