import type { CubicCurve, RewardQualityProfile } from './types';

export const xioLoadingImageSrc = `${import.meta.env.BASE_URL}HomePageAPP/XiOLoadingscreen.png`;
export const DEFAULT_BOOT_TARGET_DURATION_MS = 7000;
export const DEFAULT_REWARD_POINTS = 10;
export const DPR_CAP = 2;
export const INTRO_PREWARM_TIMEOUT_MS = 900;
export const FINISH_DELAY_MS = 90;
export const FINISH_ANIMATION_MS = 420;
export const PRESS_AUTO_OPEN_MS = 120;
export const PRESSED_STALE_MS = 260;
export const OPENING_DURATION_MS = 430;
export const COLLECTED_CLEANUP_MS = 170;
export const HOLD_RELEASE_SETTLE_MS = 90;
export const FRAME_BUDGET_MS = 18;
export const FRAME_SPIKE_MS = 22;
export const PROGRESS_HOLD_CAP = 0.925;
export const SPAWN_CUTOFF_MS = 420;
export const ORIGINAL_SCROLL_ROTATION_RAD = (21 * Math.PI) / 180;

export const INTRO_CURVE: CubicCurve = Object.freeze({
  start: { x: 0.1, y: 0.935 },
  controlOne: { x: 0.32, y: 0.935 },
  controlTwo: { x: 0.62, y: 0.935 },
  end: { x: 0.84, y: 0.935 },
});

export const getProfileMaxActiveTokens = (profile: RewardQualityProfile): number => (
  profile === 'full' ? 4 : profile === 'lite' ? 2 : 1
);

export const getProfileSpawnDelayRangeMs = (profile: RewardQualityProfile): [number, number] => (
  profile === 'full' ? [560, 920] : profile === 'lite' ? [820, 1240] : [1020, 1460]
);

export const getProfileHitPaddingPx = (profile: RewardQualityProfile): number => (
  profile === 'full' ? 14 : profile === 'lite' ? 18 : 20
);

export const getProfileDrawScale = (profile: RewardQualityProfile): number => (
  profile === 'full' ? 1 : profile === 'lite' ? 0.9 : 0.82
);
