// Minimal property tweener driven by update(dt); each to() returns a promise resolved on completion.

export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

export class Tweener {
  constructor() {
    this._tweens = [];
  }

  to(target, props, duration, ease = easeInOut) {
    return new Promise((resolve) => {
      const from = {};
      for (const key of Object.keys(props)) from[key] = target[key];
      this._tweens.push({ target, from, props, duration: Math.max(duration, 1e-6), t: 0, ease, resolve });
    });
  }

  update(dt) {
    const finished = [];
    for (const tw of this._tweens) {
      tw.t = Math.min(tw.t + dt, tw.duration);
      const k = tw.ease(tw.t / tw.duration);
      for (const key of Object.keys(tw.props)) {
        tw.target[key] = tw.from[key] + (tw.props[key] - tw.from[key]) * k;
      }
      if (tw.t >= tw.duration) finished.push(tw);
    }
    if (finished.length === 0) return;
    this._tweens = this._tweens.filter((tw) => !finished.includes(tw));
    for (const tw of finished) tw.resolve();
  }

  get active() {
    return this._tweens.length;
  }
}
