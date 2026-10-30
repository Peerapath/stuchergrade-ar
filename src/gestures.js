// Pointer events -> actions: one finger rotates (after a slop), two fingers zoom, a still short press taps.

export const TAP_SLOP_PX = 10;

export class GestureTracker {
  constructor() {
    this._pointers = new Map(); // id -> { x, y, ox, oy }  (ox/oy: reference point for slop and deltas)
    this._tapOk = true;
    this._rotating = false;
    this._prevDist = 0;
  }

  down(id, x, y) {
    if (this._pointers.size === 0) {
      this._tapOk = true;
      this._rotating = false;
    }
    this._pointers.set(id, { x, y, ox: x, oy: y });
    if (this._pointers.size >= 2) this._tapOk = false;
    this._reset();
    return [];
  }

  move(id, x, y) {
    const p = this._pointers.get(id);
    if (!p) return [];
    p.x = x;
    p.y = y;
    if (this._pointers.size === 1) return this._moveSingle(p);
    if (this._pointers.size === 2) return this._moveDouble();
    return [];
  }

  up(id, x, y) {
    const p = this._pointers.get(id);
    if (!p) return [];
    p.x = x;
    p.y = y;
    const last = this._pointers.size === 1;
    const tap = last && this._tapOk && Math.hypot(x - p.ox, y - p.oy) <= TAP_SLOP_PX;
    this._pointers.delete(id);
    this._reset();
    return tap ? [{ type: 'tap', x, y }] : [];
  }

  cancel(id) {
    if (!this._pointers.delete(id)) return [];
    this._tapOk = false;
    this._reset();
    return [];
  }

  // Drop every pointer (window blur, lost events): the next touch starts a fresh gesture and nothing taps.
  clear() {
    this._pointers.clear();
    this._tapOk = false;
    this._reset();
  }

  // Pointer count changed: forget previous positions/distance so nothing jumps.
  _reset() {
    this._rotating = false;
    for (const p of this._pointers.values()) {
      p.ox = p.x;
      p.oy = p.y;
    }
    this._prevDist = this._distance();
  }

  _distance() {
    if (this._pointers.size !== 2) return 0;
    const [a, b] = this._pointers.values();
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  _moveSingle(p) {
    if (!this._rotating) {
      if (Math.hypot(p.x - p.ox, p.y - p.oy) <= TAP_SLOP_PX) return [];
      this._rotating = true;
      this._tapOk = false;
    }
    const action = { type: 'rotate', dx: p.x - p.ox, dy: p.y - p.oy };
    p.ox = p.x;
    p.oy = p.y;
    return [action];
  }

  _moveDouble() {
    const dist = this._distance();
    const prev = this._prevDist;
    this._prevDist = dist;
    if (prev <= 0 || dist <= 0 || dist === prev) return [];
    return [{ type: 'zoom', factor: dist / prev }];
  }
}
