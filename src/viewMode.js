// Free vs tracked view selection, with a 0..1 blend progress that restarts on every switch.

export const BLEND_SECONDS = 0.35;

export class ViewMode {
  constructor() {
    this.mode = 'free';
    this.t = 1;
  }

  update(tracking, dt) {
    const wanted = tracking ? 'tracked' : 'free';
    let switched = false;
    if (wanted !== this.mode) {
      this.mode = wanted;
      this.t = 0;
      switched = true;
    } else {
      this.t = Math.min(1, this.t + dt / BLEND_SECONDS);
    }
    return { mode: this.mode, t: this.t, switched };
  }
}
