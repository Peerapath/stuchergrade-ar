// DOM pointer/wheel input -> tap / rotate / zoom callbacks, via the pure GestureTracker.
import { GestureTracker } from './gestures.js';

const WHEEL_LINE_PX = 33; // WheelEvent.DOM_DELTA_LINE -> approximate pixels
const WHEEL_PAGE_PX = 100; // WheelEvent.DOM_DELTA_PAGE -> approximate pixels

export function attachInput({ element, onTap, onRotate, onZoom }) {
  const tracker = new GestureTracker();
  const dispatch = (actions) => {
    for (const a of actions) {
      if (a.type === 'tap') onTap(a.x, a.y);
      else if (a.type === 'rotate') onRotate(a.dx, a.dy);
      else if (a.type === 'zoom') onZoom(a.factor);
    }
  };
  element.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try {
      element.setPointerCapture(e.pointerId); // keep move/up flowing even if the finger leaves the element
    } catch { /* synthetic or already-gone pointer: capture is best effort */ }
    dispatch(tracker.down(e.pointerId, e.clientX, e.clientY));
  });
  element.addEventListener('pointermove', (e) => dispatch(tracker.move(e.pointerId, e.clientX, e.clientY)));
  element.addEventListener('pointerup', (e) => dispatch(tracker.up(e.pointerId, e.clientX, e.clientY)));
  element.addEventListener('pointercancel', (e) => dispatch(tracker.cancel(e.pointerId)));
  // Fires after every capture release, including normal ones (the id is already gone then: a no-op).
  element.addEventListener('lostpointercapture', (e) => dispatch(tracker.cancel(e.pointerId)));
  window.addEventListener('blur', () => tracker.clear()); // a pointerup may never arrive after focus is lost
  element.addEventListener('wheel', (e) => {
    e.preventDefault();
    const px = e.deltaMode === 1 ? e.deltaY * WHEEL_LINE_PX : e.deltaMode === 2 ? e.deltaY * WHEEL_PAGE_PX : e.deltaY;
    onZoom(Math.exp(-px * 0.001));
  }, { passive: false });
}
