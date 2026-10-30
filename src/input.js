// DOM pointer/wheel input -> tap / rotate / zoom callbacks, via the pure GestureTracker.
import { GestureTracker } from './gestures.js';

export function attachInput({ element, onTap, onRotate, onZoom }) {
  const tracker = new GestureTracker();
  const dispatch = (actions) => {
    for (const a of actions) {
      if (a.type === 'tap') onTap(a.x, a.y);
      else if (a.type === 'rotate') onRotate(a.dx, a.dy);
      else if (a.type === 'zoom') onZoom(a.factor);
    }
  };
  element.addEventListener('pointerdown', (e) => dispatch(tracker.down(e.pointerId, e.clientX, e.clientY)));
  element.addEventListener('pointermove', (e) => dispatch(tracker.move(e.pointerId, e.clientX, e.clientY)));
  element.addEventListener('pointerup', (e) => dispatch(tracker.up(e.pointerId, e.clientX, e.clientY)));
  element.addEventListener('pointercancel', (e) => dispatch(tracker.cancel(e.pointerId)));
  element.addEventListener('wheel', (e) => {
    e.preventDefault();
    onZoom(Math.exp(-e.deltaY * 0.001));
  }, { passive: false });
}
