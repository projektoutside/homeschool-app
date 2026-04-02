import {
  COLLECTED_CLEANUP_MS,
  FRAME_BUDGET_MS,
  FRAME_SPIKE_MS,
  FINISH_ANIMATION_MS,
  FINISH_DELAY_MS,
  HOLD_RELEASE_SETTLE_MS,
  OPENING_DURATION_MS,
  PRESS_AUTO_OPEN_MS,
  PRESSED_STALE_MS,
  SPAWN_CUTOFF_MS,
  getProfileDrawScale,
  getProfileHitPaddingPx,
  getProfileMaxActiveTokens,
  getProfileSpawnDelayRangeMs,
} from './constants';
import type {
  LoaderRuntimeState,
  RewardQualityProfile,
  RewardToken,
  StageBounds,
} from './types';
import {
  clamp,
  easeInOutSine,
  getAnimationClockNow,
  lerp,
  randomBetween,
  resolveTimeCurve,
} from './utils';

export const createInitialRuntimeState = (
  prefersReducedMotion: boolean,
  bootStartedAtMs: number,
  bootTargetDurationMs: number,
): LoaderRuntimeState => {
  const qualityProfile: RewardQualityProfile = prefersReducedMotion ? 'reduced-motion' : 'full';
  const elapsedBootMs = Math.max(0, Date.now() - bootStartedAtMs);
  return {
    previousFrameMs: 0,
    visualProgress: resolveTimeCurve(elapsedBootMs, bootTargetDurationMs),
    finishAtMs: null,
    finishTriggered: false,
    rollingFrameMs: 16.67,
    consecutiveSpikes: 0,
    nextSpawnAtMs: 0,
    tokenSequence: 0,
    qualityProfile,
  };
};

export const updateAdaptiveQuality = (
  runtime: LoaderRuntimeState,
  deltaMs: number,
  prefersReducedMotion: boolean,
): RewardQualityProfile | null => {
  if (prefersReducedMotion || runtime.qualityProfile !== 'full') {
    return null;
  }

  runtime.rollingFrameMs = lerp(runtime.rollingFrameMs, deltaMs, 0.18);
  runtime.consecutiveSpikes = deltaMs >= FRAME_SPIKE_MS ? runtime.consecutiveSpikes + 1 : 0;
  if (runtime.rollingFrameMs > FRAME_BUDGET_MS || runtime.consecutiveSpikes >= 2) {
    runtime.qualityProfile = 'lite';
    return 'lite';
  }

  return null;
};

export const countInteractiveTokens = (tokens: RewardToken[]): number => {
  let count = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const phase = tokens[index].phase;
    if (phase === 'flying' || phase === 'pressed') {
      count += 1;
    }
  }
  return count;
};

const updateTokenVisualPoseInPlace = (token: RewardToken, nowMs: number): void => {
  if (token.phase !== 'flying') {
    return;
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
  token.visualX = x;
  token.visualY = y;
  token.visualRadius = token.sizePx * (0.47 + (oscillation * 0.018));
  token.visualRotation = token.rotationBase + (ageMs * token.rotationVelocity * 0.001);
  token.zIndex = Math.round(y + token.visualRadius);
};

export const createRewardToken = (
  tokenIndex: number,
  nowMs: number,
  bounds: StageBounds,
  profile: RewardQualityProfile,
): RewardToken => {
  const variantRoll = Math.random();
  const drawScale = getProfileDrawScale(profile);
  const sizePx = randomBetween(bounds.width * 0.062, bounds.width * 0.078) * drawScale;
  const fromX = randomBetween(bounds.width * 0.1, bounds.width * 0.88);
  const fromY = randomBetween(bounds.height * 0.16, bounds.height * 0.64);
  const toX = clamp(fromX + randomBetween(-bounds.width * 0.1, bounds.width * 0.1), bounds.width * 0.09, bounds.width * 0.9);
  const toY = clamp(fromY + randomBetween(-bounds.height * 0.07, bounds.height * 0.08), bounds.height * 0.16, bounds.height * 0.68);
  const driftAmplitude = randomBetween(sizePx * 0.12, sizePx * 0.26);
  const driftFrequency = randomBetween(0.0048, 0.0072);
  const driftPhase = randomBetween(0, Math.PI * 2);
  const travelDurationMs = randomBetween(660, 1060);
  const variant = variantRoll < 0.42 ? 'drift' : (variantRoll < 0.76 ? 'drop' : 'burst');

  return {
    id: `reward-${tokenIndex}`,
    variant,
    phase: 'flying',
    spawnedAtMs: nowMs,
    phaseStartedAtMs: nowMs,
    travelDurationMs,
    expiresAtMs: nowMs + (profile === 'full' ? 5600 : 5000),
    pointerId: null,
    sizePx,
    fromX,
    fromY,
    toX,
    toY,
    driftAmplitude,
    driftFrequency,
    driftPhase,
    rotationBase: randomBetween(-0.18, 0.18),
    rotationVelocity: randomBetween(-0.24, 0.24),
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

export const maybeSpawnToken = (
  runtime: LoaderRuntimeState,
  tokens: RewardToken[],
  nowMs: number,
  bounds: StageBounds,
  finishRequested: boolean,
  elapsedBootMs: number,
  bootTargetDurationMs: number,
): void => {
  const spawnEnabled = !finishRequested || elapsedBootMs < (bootTargetDurationMs - SPAWN_CUTOFF_MS);
  if (!spawnEnabled) {
    return;
  }

  if (countInteractiveTokens(tokens) >= getProfileMaxActiveTokens(runtime.qualityProfile)) {
    return;
  }

  if (runtime.nextSpawnAtMs > 0 && nowMs < runtime.nextSpawnAtMs) {
    return;
  }

  runtime.tokenSequence += 1;
  tokens.push(createRewardToken(runtime.tokenSequence, nowMs, bounds, runtime.qualityProfile));
  runtime.nextSpawnAtMs = nowMs + randomBetween(...getProfileSpawnDelayRangeMs(runtime.qualityProfile));
};

export const pickTopTokenAt = (
  tokens: RewardToken[],
  x: number,
  y: number,
  profile: RewardQualityProfile,
): RewardToken | null => {
  const hitPadding = getProfileHitPaddingPx(profile);
  let bestToken: RewardToken | null = null;
  let bestZIndex = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.phase !== 'flying') {
      continue;
    }

    const dx = x - token.visualX;
    const dy = y - token.visualY;
    const radius = token.visualRadius + hitPadding;
    if ((dx * dx) + (dy * dy) > radius * radius) {
      continue;
    }

    if (token.zIndex >= bestZIndex) {
      bestZIndex = token.zIndex;
      bestToken = token;
    }
  }

  return bestToken;
};

export const setTokenPressed = (
  tokens: RewardToken[],
  tokenId: string,
  pointerId: number,
  nowMs: number,
): boolean => {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.id !== tokenId) {
      continue;
    }

    token.phase = 'pressed';
    token.phaseStartedAtMs = nowMs;
    token.pointerId = pointerId;
    token.freezeX = token.visualX;
    token.freezeY = token.visualY;
    token.freezeRotation = token.visualRotation;
    return true;
  }

  return false;
};

export const restorePressedToken = (tokens: RewardToken[], tokenId: string, nowMs: number): boolean => {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.id !== tokenId || token.phase !== 'pressed') {
      continue;
    }

    token.phase = 'flying';
    token.phaseStartedAtMs = nowMs;
    token.pointerId = null;
    return true;
  }

  return false;
};

export const markTokenOpening = (tokens: RewardToken[], tokenId: string, nowMs: number): RewardToken | null => {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.id !== tokenId) {
      continue;
    }
    if (token.phase !== 'pressed' && token.phase !== 'flying') {
      return null;
    }

    token.phase = 'opening';
    token.phaseStartedAtMs = nowMs;
    token.pointerId = null;
    token.freezeX = token.visualX;
    token.freezeY = token.visualY;
    token.freezeRotation = token.visualRotation;
    return token;
  }

  return null;
};

export const updateTokensInPlace = (
  tokens: RewardToken[],
  nowMs: number,
  autoOpenedTokenIds: string[],
): void => {
  autoOpenedTokenIds.length = 0;
  let writeIndex = 0;

  for (let readIndex = 0; readIndex < tokens.length; readIndex += 1) {
    const token = tokens[readIndex];
    let keepToken = true;

    switch (token.phase) {
      case 'flying':
        if (token.expiresAtMs <= nowMs) {
          keepToken = false;
        } else {
          updateTokenVisualPoseInPlace(token, nowMs);
        }
        break;
      case 'pressed':
        if ((nowMs - token.phaseStartedAtMs) >= PRESS_AUTO_OPEN_MS) {
          token.phase = 'opening';
          token.phaseStartedAtMs = nowMs;
          token.pointerId = null;
          token.freezeX = token.visualX;
          token.freezeY = token.visualY;
          token.freezeRotation = token.visualRotation;
          autoOpenedTokenIds.push(token.id);
        } else if ((nowMs - token.phaseStartedAtMs) > PRESSED_STALE_MS) {
          token.phase = 'flying';
          token.phaseStartedAtMs = nowMs;
          token.pointerId = null;
        }
        break;
      case 'opening':
        if ((nowMs - token.phaseStartedAtMs) >= OPENING_DURATION_MS) {
          token.phase = 'collected';
          token.phaseStartedAtMs = nowMs;
        }
        break;
      case 'collected':
        if ((nowMs - token.phaseStartedAtMs) >= COLLECTED_CLEANUP_MS) {
          keepToken = false;
        }
        break;
      default:
        break;
    }

    if (keepToken) {
      tokens[writeIndex] = token;
      writeIndex += 1;
    }
  }

  tokens.length = writeIndex;
};

export const hasActiveHold = (tokens: RewardToken[], nowMs: number): boolean => {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.phase === 'opening') {
      return true;
    }
    if (token.phase === 'pressed' && (nowMs - token.phaseStartedAtMs) <= HOLD_RELEASE_SETTLE_MS) {
      return true;
    }
  }
  return false;
};

export const computeFinishState = (
  runtime: LoaderRuntimeState,
  nowMs: number,
  finishRequested: boolean,
  holdActive: boolean,
  onFinish: () => void,
): void => {
  if (finishRequested && !holdActive) {
    if (runtime.finishAtMs === null) {
      runtime.finishAtMs = nowMs + FINISH_DELAY_MS;
    } else if (!runtime.finishTriggered && nowMs >= runtime.finishAtMs) {
      runtime.finishTriggered = true;
      onFinish();
    }
    return;
  }

  runtime.finishAtMs = null;
};

export const getFinishAnimationProgress = (runtime: LoaderRuntimeState, nowMs: number): number => {
  if (runtime.finishAtMs === null) {
    return 0;
  }

  return clamp((nowMs - runtime.finishAtMs + FINISH_DELAY_MS) / FINISH_ANIMATION_MS);
};

export const resolveReleaseShouldCollect = (
  token: RewardToken,
  releaseX: number,
  releaseY: number,
  profile: RewardQualityProfile,
): boolean => {
  const releasePadding = getProfileHitPaddingPx(profile) + 12;
  const dx = releaseX - token.freezeX;
  const dy = releaseY - token.freezeY;
  const radius = token.visualRadius + releasePadding;
  return ((dx * dx) + (dy * dy)) <= radius * radius;
};

export const prepareDrawOrder = (
  tokens: RewardToken[],
  drawOrderBuffer: RewardToken[],
): RewardToken[] => {
  drawOrderBuffer.length = tokens.length;
  for (let index = 0; index < tokens.length; index += 1) {
    drawOrderBuffer[index] = tokens[index];
  }
  drawOrderBuffer.sort((left, right) => left.zIndex - right.zIndex);
  return drawOrderBuffer;
};

export const resolveBootFinishRequested = (
  ready: boolean,
  bootStartedAtMs: number,
  bootTargetDurationMs: number,
): { finishRequested: boolean; elapsedBootMs: number } => {
  const elapsedBootMs = Math.max(0, Date.now() - bootStartedAtMs);
  return {
    finishRequested: ready && elapsedBootMs >= bootTargetDurationMs,
    elapsedBootMs,
  };
};

export const seedReleaseClockNow = (): number => getAnimationClockNow();
export const resolveTimeCurveProgress = resolveTimeCurve;
