import {
  INTRO_PREWARM_TIMEOUT_MS,
  xioLoadingImageSrc,
} from './constants';
import type { SpriteBundle, SpriteSet } from './types';
import { createCanvas } from './utils';

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

const finalizeSprite = async (canvas: HTMLCanvasElement): Promise<CanvasImageSource> => {
  if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
    try {
      return await window.createImageBitmap(canvas);
    } catch {
      return canvas;
    }
  }

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

const buildGlowSpriteCanvas = (sizePx: number): HTMLCanvasElement | null => {
  const canvas = createCanvas(sizePx, sizePx);
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  const gradient = context.createRadialGradient(sizePx * 0.5, sizePx * 0.5, sizePx * 0.12, sizePx * 0.5, sizePx * 0.5, sizePx * 0.5);
  gradient.addColorStop(0, 'rgba(120, 238, 255, 0.34)');
  gradient.addColorStop(0.55, 'rgba(120, 238, 255, 0.16)');
  gradient.addColorStop(1, 'rgba(120, 238, 255, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, sizePx, sizePx);
  return canvas;
};

const buildBurstSpriteCanvas = (sizePx: number): HTMLCanvasElement | null => {
  const canvas = createCanvas(sizePx, sizePx);
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  const center = sizePx * 0.5;
  const outerRadius = sizePx * 0.5;
  const innerRadius = sizePx * 0.16;
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
    context.fillStyle = index % 2 === 0 ? 'rgba(255, 236, 163, 0.92)' : 'rgba(120, 238, 255, 0.88)';
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

const buildCoinSpriteCanvas = (sourceImage: HTMLImageElement | null, sizePx: number): HTMLCanvasElement => {
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

  drawRoundedRect(context, sizePx * 0.18, sizePx * 0.28, sizePx * 0.64, sizePx * 0.44, sizePx * 0.12);
  context.strokeStyle = 'rgba(112, 57, 2, 0.2)';
  context.stroke();
  context.fillStyle = 'rgba(112, 57, 2, 0.9)';
  context.font = `${Math.floor(sizePx * 0.28)}px "Trebuchet MS", "Segoe UI", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('PTS', center, center + (sizePx * 0.01));
  return canvas;
};

const buildSpriteBundle = async (
  image: HTMLImageElement | null,
  sizePx: number,
  glowEnabled: boolean,
): Promise<SpriteBundle> => {
  const coinCanvas = buildCoinSpriteCanvas(image, sizePx);
  const glowCanvas = glowEnabled ? buildGlowSpriteCanvas(Math.round(sizePx * 1.72)) : null;
  const burstCanvas = buildBurstSpriteCanvas(Math.round(sizePx * 1.82));

  const [coin, glow, burst] = await Promise.all([
    finalizeSprite(coinCanvas),
    glowCanvas ? finalizeSprite(glowCanvas) : Promise.resolve(null),
    burstCanvas ? finalizeSprite(burstCanvas) : Promise.resolve(null),
  ]);

  return {
    coin,
    glow,
    burst,
    drawSizePx: sizePx,
  };
};

export const buildSpriteSet = async (
  rewardAssetSrc: string,
  prefersReducedMotion: boolean,
): Promise<{ spriteSet: SpriteSet; xioImage: HTMLImageElement | null }> => {
  const [coinImage, xioImage] = await Promise.all([
    loadImage(rewardAssetSrc, INTRO_PREWARM_TIMEOUT_MS),
    loadImage(xioLoadingImageSrc, INTRO_PREWARM_TIMEOUT_MS),
  ]);

  const [full, lite, reducedMotion] = await Promise.all([
    buildSpriteBundle(coinImage, 92, true),
    buildSpriteBundle(coinImage, 80, true),
    buildSpriteBundle(coinImage, 68, !prefersReducedMotion),
  ]);

  return {
    spriteSet: { full, lite, reducedMotion },
    xioImage,
  };
};

const maybeCloseSprite = (sprite: CanvasImageSource | null | undefined) => {
  if (sprite && typeof sprite === 'object' && 'close' in sprite && typeof sprite.close === 'function') {
    sprite.close();
  }
};

export const releaseSpriteSet = (spriteSet: SpriteSet | null): void => {
  if (!spriteSet) {
    return;
  }

  [spriteSet.full, spriteSet.lite, spriteSet.reducedMotion].forEach((bundle) => {
    maybeCloseSprite(bundle.coin);
    maybeCloseSprite(bundle.glow);
    maybeCloseSprite(bundle.burst);
  });
};
