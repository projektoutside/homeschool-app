const STEPS = ['3', '2', '1', 'START!'];
const DURATIONS = [1000, 1000, 1000, 600];

export class StartCountdown {
  constructor({ onStep, onComplete, now = () => performance.now(), schedule = (callback, delay) => setTimeout(callback, delay), unschedule = timer => clearTimeout(timer) }) {
    Object.assign(this, { onStep, onComplete, now, schedule, unschedule });
    this.timer = null;
    this.generation = 0;
    this.active = false;
    this.pauses = new Set();
  }
  start(pausedReasons = []) {
    this.cancel();
    this.active = true;
    this.index = 0;
    this.remaining = DURATIONS[0];
    this.pauses = new Set(pausedReasons);
    this.onStep(STEPS[0]);
    this.queue();
  }
  queue() {
    if (!this.active || this.pauses.size || this.timer !== null) return;
    const generation = this.generation;
    this.deadline = this.now() + this.remaining;
    this.timer = this.schedule(() => {
      if (!this.active || generation !== this.generation) return;
      this.timer = null;
      this.index++;
      if (this.index === STEPS.length) {
        this.active = false;
        this.onComplete();
        return;
      }
      this.remaining = DURATIONS[this.index];
      this.onStep(STEPS[this.index]);
      this.queue();
    }, this.remaining);
  }
  pause(reason) {
    if (!this.active || this.pauses.has(reason)) return;
    this.pauses.add(reason);
    if (this.timer !== null) {
      this.remaining = Math.max(0, this.deadline - this.now());
      this.unschedule(this.timer);
      this.timer = null;
      this.generation++;
    }
  }
  resume(reason) {
    this.pauses.delete(reason);
    this.queue();
  }
  cancel() {
    if (this.timer !== null) this.unschedule(this.timer);
    this.timer = null;
    this.active = false;
    this.generation++;
    this.pauses.clear();
  }
}
