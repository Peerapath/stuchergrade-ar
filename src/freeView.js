// User-controlled view of the box: yaw (unbounded), pitch (clamped, free mode only) and zoom (clamped).

export const PITCH_DEFAULT = Math.PI / 4;
export const PITCH_MIN = Math.PI / 18;
export const PITCH_MAX = Math.PI / 2;
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
export const YAW_PER_PX = 0.01;
export const PITCH_PER_PX = 0.005;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class FreeView {
  constructor() {
    this.yaw = 0;
    this.pitch = PITCH_DEFAULT;
    this.zoom = 1;
  }

  // Drag right turns the box; drag down tilts it more top-down (only when allowPitch).
  rotate(dx, dy, { allowPitch }) {
    this.yaw += dx * YAW_PER_PX;
    if (allowPitch) this.pitch = clamp(this.pitch + dy * PITCH_PER_PX, PITCH_MIN, PITCH_MAX);
  }

  zoomBy(factor) {
    this.zoom = clamp(this.zoom * factor, ZOOM_MIN, ZOOM_MAX);
  }
}
