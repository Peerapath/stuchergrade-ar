// Turns a screen point into the first tagged object hit under `root`: { role, face } or null.
import { Raycaster, Vector2 } from 'three';
import { findTagged } from './tap.js';

const raycaster = new Raycaster();
const ndc = new Vector2();

export function pickTarget({ x, y, canvas, camera, root }) {
  const rect = canvas.getBoundingClientRect();
  ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  for (const hit of raycaster.intersectObject(root, true)) {
    const tagged = findTagged(hit.object);
    if (tagged) return { role: tagged.userData.role, face: tagged.userData.face ?? null };
  }
  return null;
}
