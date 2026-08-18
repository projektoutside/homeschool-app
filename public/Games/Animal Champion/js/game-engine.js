export const MODES = Object.freeze({ CHALLENGER: 'challenger', CONTINUOUS: 'continuous' });
export const OUTCOMES = Object.freeze({ CORRECT: 'correct', WRONG: 'wrong', TIMEOUT: 'timeout' });
export const ANSWER_WINDOW_MS = 15_000;
export const FEEDBACK_DELAY_MS = 2_000;
export const POINTS_PER_CORRECT = 10;

const clone = (value) => structuredClone(value);

const isValidMode = (mode) => Object.values(MODES).includes(mode);

const isValidIsoDate = (value) => {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day] = match.map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth;
};

export const normalizeLeaderboard = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => (
      entry !== null
      && typeof entry === 'object'
      && Number.isFinite(entry.score)
      && Number.isInteger(entry.score)
      && entry.score > 0
      && isValidIsoDate(entry.date)
    ))
    .map(({ score, date }) => ({ score, date }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
};

export const recordLeaderboardScore = (raw, score, date) => {
  const normalized = normalizeLeaderboard(raw);
  if (!Number.isFinite(score) || !Number.isInteger(score) || score <= 0 || !isValidIsoDate(date)) {
    return normalized;
  }
  return normalizeLeaderboard([...normalized, { score, date }]);
};

export class AnimalChampionEngine {
  constructor({ animals, random = Math.random }) {
    if (!Array.isArray(animals) || animals.length < 4) {
      throw new TypeError('At least four animals are required');
    }
    if (typeof random !== 'function') throw new TypeError('random must be a function');
    this.animals = animals;
    this.animalById = new Map(animals.map((animal) => [animal.id, animal]));
    if (this.animalById.size !== animals.length) throw new TypeError('Animal IDs must be unique');
    this.random = random;
    this.runSequence = 0;
    this.roundSequence = 0;
    this.imagePreference = new Map();
    this.reset();
  }

  reset() {
    this.deck = [];
    this.previousAnimalId = null;
    this.state = {
      phase: 'idle',
      mode: null,
      runId: null,
      score: 0,
      streak: 0,
      brokenAnimalIds: [],
      currentRound: null,
      pendingEnd: false,
    };
    return this.getState();
  }

  getState() {
    return clone(this.state);
  }

  startRun(mode) {
    if (!isValidMode(mode)) throw new TypeError(`Invalid game mode: ${mode}`);
    this.deck = [];
    this.previousAnimalId = null;
    this.runSequence += 1;
    this.state = {
      phase: 'ready',
      mode,
      runId: `run-${this.runSequence}`,
      score: 0,
      streak: 0,
      brokenAnimalIds: [],
      currentRound: null,
      pendingEnd: false,
    };
    this.refillDeck();
    return this.getState();
  }

  nextRandom() {
    const value = this.random();
    if (!Number.isFinite(value)) throw new RangeError('random output must be finite');
    if (value < 0 || value >= 1) throw new RangeError('random output must be at least 0 and less than 1');
    return value;
  }

  shuffle(values) {
    const shuffled = [...values];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(this.nextRandom() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  refillDeck() {
    const broken = new Set(this.state.brokenAnimalIds);
    this.deck = this.shuffle(this.animals.map(({ id }) => id).filter((id) => !broken.has(id)));
    if (this.deck.length > 1 && this.deck.at(-1) === this.previousAnimalId) {
      [this.deck[0], this.deck[this.deck.length - 1]] = [this.deck.at(-1), this.deck[0]];
    }
  }

  createImageOrder(animal) {
    const images = [...new Set(animal.images.filter((image) => typeof image === 'string' && image.length > 0))];
    if (images.length < 2) return images;
    const preferredIndex = this.imagePreference.get(animal.id) ?? 0;
    this.imagePreference.set(animal.id, (preferredIndex + 1) % images.length);
    return [...images.slice(preferredIndex), ...images.slice(0, preferredIndex)];
  }

  beginRound() {
    if (this.state.phase !== 'ready') return null;
    if (this.deck.length === 0) this.refillDeck();
    if (this.deck.length === 0) {
      this.state.phase = 'content-error';
      return null;
    }

    const correctAnimalId = this.deck.pop();
    this.previousAnimalId = correctAnimalId;
    const animal = this.animalById.get(correctAnimalId);
    const wrongIds = this.shuffle(
      this.animals
        .map(({ id }) => id)
        .filter((id) => id !== correctAnimalId),
    ).slice(0, 3);
    const choiceIds = this.shuffle([correctAnimalId, ...wrongIds]);
    this.roundSequence += 1;
    this.state.currentRound = {
      roundId: `round-${this.roundSequence}`,
      correctAnimalId,
      choiceIds,
      imageOrder: this.createImageOrder(animal),
      activeImagePath: null,
    };
    this.state.phase = 'loading';
    return clone(this.state.currentRound);
  }

  activateRound(roundId, imagePath) {
    if (this.state.phase !== 'loading' || this.state.currentRound?.roundId !== roundId) return false;
    if (!this.state.currentRound.imageOrder.includes(imagePath)) return false;
    this.state.currentRound.activeImagePath = imagePath;
    this.state.phase = 'answering';
    return true;
  }

  submitChoice(roundId, animalId) {
    const round = this.state.currentRound;
    if (
      this.state.phase !== 'answering'
      || round?.roundId !== roundId
      || !round.choiceIds.includes(animalId)
    ) {
      return { accepted: false };
    }
    return this.resolveOutcome(
      animalId === round.correctAnimalId ? OUTCOMES.CORRECT : OUTCOMES.WRONG,
      animalId,
    );
  }

  timeout(roundId) {
    if (this.state.phase !== 'answering' || this.state.currentRound?.roundId !== roundId) {
      return { accepted: false };
    }
    return this.resolveOutcome(OUTCOMES.TIMEOUT);
  }

  resolveOutcome(outcome, selectedAnimalId = null) {
    if (this.state.phase !== 'answering') return { accepted: false };
    const round = this.state.currentRound;
    this.state.phase = 'feedback';
    const correct = outcome === OUTCOMES.CORRECT;
    this.state.score += correct ? POINTS_PER_CORRECT : 0;
    this.state.streak = correct ? this.state.streak + 1 : 0;
    const endsRun = !correct && this.state.mode === MODES.CHALLENGER;
    this.state.pendingEnd = endsRun;
    return {
      accepted: true,
      outcome,
      selectedAnimalId,
      correctAnimalId: round.correctAnimalId,
      score: this.state.score,
      streak: this.state.streak,
      platformPoints: correct ? POINTS_PER_CORRECT : 0,
      eventId: correct ? `${this.state.runId}:${round.roundId}:correct` : null,
      endsRun,
    };
  }

  discardBrokenRound(roundId) {
    const round = this.state.currentRound;
    if (this.state.phase !== 'loading' || round?.roundId !== roundId) return { accepted: false };
    if (!this.state.brokenAnimalIds.includes(round.correctAnimalId)) {
      this.state.brokenAnimalIds.push(round.correctAnimalId);
    }
    this.deck = this.deck.filter((id) => id !== round.correctAnimalId);
    this.state.currentRound = null;
    const exhausted = this.state.brokenAnimalIds.length === this.animals.length;
    this.state.phase = exhausted ? 'content-error' : 'ready';
    return { accepted: true, exhausted };
  }

  finishFeedback() {
    if (this.state.phase !== 'feedback') return null;
    this.state.phase = this.state.pendingEnd ? 'game-over' : 'ready';
    this.state.pendingEnd = false;
    if (this.state.phase === 'ready') this.state.currentRound = null;
    return this.getState();
  }
}

export const createPausableDeadline = ({
  durationMs,
  onTick = () => {},
  onExpire = () => {},
  now = () => performance.now(),
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (frameId) => cancelAnimationFrame(frameId),
}) => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new TypeError('durationMs must be a positive finite number');
  }
  for (const [name, value] of Object.entries({ onTick, onExpire, now, requestFrame, cancelFrame })) {
    if (typeof value !== 'function') throw new TypeError(`${name} must be a function`);
  }

  let status = 'idle';
  let remainingMs = durationMs;
  let lastStartedAt = 0;
  let frameId = null;
  let generation = 0;
  let expired = false;

  const cancelScheduledFrame = () => {
    if (frameId === null) return;
    cancelFrame(frameId);
    frameId = null;
  };

  const consumeElapsed = () => {
    if (status !== 'running') return;
    const current = now();
    const elapsed = Math.max(0, current - lastStartedAt);
    remainingMs = Math.max(0, remainingMs - elapsed);
    lastStartedAt = current;
  };

  const expire = () => {
    if (expired) return;
    expired = true;
    status = 'expired';
    cancelScheduledFrame();
    onExpire();
  };

  const schedule = () => {
    const scheduledGeneration = generation;
    frameId = requestFrame(() => {
      if (scheduledGeneration !== generation || status !== 'running') return;
      frameId = null;
      consumeElapsed();
      onTick(remainingMs, remainingMs / durationMs);
      if (remainingMs === 0) {
        expire();
      } else {
        schedule();
      }
    });
  };

  const start = () => {
    generation += 1;
    cancelScheduledFrame();
    remainingMs = durationMs;
    expired = false;
    status = 'running';
    lastStartedAt = now();
    onTick(remainingMs, 1);
    schedule();
  };

  const pause = () => {
    if (status !== 'running') return;
    consumeElapsed();
    cancelScheduledFrame();
    onTick(remainingMs, remainingMs / durationMs);
    if (remainingMs === 0) {
      expire();
    } else {
      status = 'paused';
    }
  };

  const resume = () => {
    if (status !== 'paused' || expired) return;
    status = 'running';
    lastStartedAt = now();
    schedule();
  };

  const stop = () => {
    generation += 1;
    cancelScheduledFrame();
    status = 'stopped';
  };

  const getRemainingMs = () => {
    if (status !== 'running') return remainingMs;
    return Math.max(0, remainingMs - Math.max(0, now() - lastStartedAt));
  };

  return Object.freeze({ start, pause, resume, stop, getRemainingMs });
};
