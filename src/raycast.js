// Turns a tap (not a drag) on the AR view into the role of the first tagged object hit.
import { Raycaster, Vector2 } from 'three';
import { findRole } from './tap.js';

const MAX_TAP_MOVE_PX = 10;

export function attachTap({ element, canvas, camera, root, onRole }) {
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let down = null;
  element.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  element.addEventListener('pointercancel', () => { down = null; });
  element.addEventListener('pointerup', (e) => {
    const isTap = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) <= MAX_TAP_MOVE_PX;
    down = null;
    if (!isTap || !root.visible) return;
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    for (const hit of raycaster.intersectObject(root, true)) {
      const role = findRole(hit.object);
      if (role) {
        onRole(role);
        return;
      }
    }
  });
}
