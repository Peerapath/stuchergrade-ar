// Turns a screen point into the role of the first tagged object hit under `root`.
import { Raycaster, Vector2 } from 'three';
import { findRole } from './tap.js';

const raycaster = new Raycaster();
const ndc = new Vector2();

export function pickRole({ x, y, canvas, camera, root }) {
  const rect = canvas.getBoundingClientRect();
  ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  for (const hit of raycaster.intersectObject(root, true)) {
    const role = findRole(hit.object);
    if (role) return role;
  }
  return null;
}
