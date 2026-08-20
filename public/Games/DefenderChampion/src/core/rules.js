export const MAX_ATTACKERS_PER_GATE = 3;
export const MAX_LIVING_ENEMIES = 18;
export const EARLY_GATE_BACKPRESSURE_LIMIT = 480;
export const ENTRANCE_LANE_CLEARANCE = 80;
export const MIN_CONGESTED_GATE_CAPACITY = 8;
export const MIN_ENTRANCE_ADJACENT_LANE_PROGRESS = 40;
export const MIN_ENTRANCE_SAME_LANE_PROGRESS = 80;

const NARROW_ENTRANCE_OFFSETS = Object.freeze([-40, 40, 0]);
const WIDE_ENTRANCE_OFFSETS = Object.freeze([-40, 40]);
const BOSS_ENTRANCE_OFFSETS = Object.freeze([0]);
export const READABLE_ENTRANCE_POLICIES = Object.freeze({
  'blight-walker': NARROW_ENTRANCE_OFFSETS,
  skitter: WIDE_ENTRANCE_OFFSETS,
  swarmkin: NARROW_ENTRANCE_OFFSETS,
  shellguard: WIDE_ENTRANCE_OFFSETS,
  hexcaller: WIDE_ENTRANCE_OFFSETS,
  crusher: WIDE_ENTRANCE_OFFSETS,
  'mossback-brute': BOSS_ENTRANCE_OFFSETS,
  'ironhide-warlord': BOSS_ENTRANCE_OFFSETS,
  'dread-colossus': BOSS_ENTRANCE_OFFSETS,
});
