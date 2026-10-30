// The box holder: one group whose pose is either the tracked QR anchor or a camera-relative "free" pose,
// blended on mode switches. Inside it, `pivot` applies the user's yaw (around the box's up axis) and zoom.
import { Group, Vector3, Quaternion, Matrix4, Euler, MathUtils } from 'three';
import { easeInOut } from './tween.js';

const SCREEN_FILL = 0.8; // free view: the framed length fills this fraction of the screen width

// Free-view framing, in marker widths: `length` is what must fit the screen width, `shift` is how far the
// framed centre lies along the box's long axis from the base centre (the open lid sits beside the base).
export const FRAMING_CLOSED = Object.freeze({ length: 3, shift: 0 });
export const FRAMING_OPEN = Object.freeze({ length: 6.3, shift: 1.65 });

const freePos = new Vector3();
const freeQuat = new Quaternion();
const freeScale = new Vector3();
const freeEuler = new Euler();
const targetPos = new Vector3();
const targetQuat = new Quaternion();
const targetScale = new Vector3();
const fromPos = new Vector3();
const fromQuat = new Quaternion();
const fromScale = new Vector3();
const poseMatrix = new Matrix4();
const targetMatrix = new Matrix4();

export function createHolder({ scene, content, camera, markerScale }) {
  const holder = new Group();
  holder.matrixAutoUpdate = false;
  const pivot = new Group();
  holder.add(pivot);
  pivot.add(content);
  scene.add(holder);

  // Tweened by the caller (see main.js) when the box opens or closes.
  const framing = { ...FRAMING_CLOSED };
  let hasFrom = false;
  let initialised = false;

  function freeTarget(pitch) {
    const vFov = MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const d = (framing.length * markerScale / SCREEN_FILL) / (2 * Math.tan(hFov / 2));
    freePos.set(0, 0, -d);
    freeQuat.setFromEuler(freeEuler.set(pitch - Math.PI / 2, 0, 0));
    freeScale.setScalar(markerScale);
    targetMatrix.compose(freePos, freeQuat, freeScale);
    camera.updateWorldMatrix(true, false);
    targetMatrix.premultiply(camera.matrixWorld);
  }

  function update({ anchor, tracking, freeView, viewMode, dt }) {
    pivot.rotation.z = freeView.yaw;
    pivot.scale.setScalar(freeView.zoom);

    const { mode, t, switched } = viewMode.update(tracking, dt);
    if (switched && initialised) {
      holder.matrix.decompose(fromPos, fromQuat, fromScale);
      hasFrom = true;
    }

    // Free view recentres the open layout (base + lid) by moving the pivot opposite to where the layout's
    // centre ends up after yaw/zoom (1 pivot unit = 1 marker width); tracked view keeps the real position.
    const freeWeight = mode === 'free' ? easeInOut(t) : 1 - easeInOut(t);
    const offset = -framing.shift * freeView.zoom * freeWeight;
    pivot.position.set(offset * Math.cos(freeView.yaw), offset * Math.sin(freeView.yaw), 0);

    if (mode === 'tracked' && anchor) targetMatrix.copy(anchor.matrix);
    else freeTarget(freeView.pitch);

    if (t >= 1 || !hasFrom) {
      holder.matrix.copy(targetMatrix);
    } else {
      targetMatrix.decompose(targetPos, targetQuat, targetScale);
      const k = easeInOut(t);
      targetPos.lerpVectors(fromPos, targetPos, k);
      targetQuat.slerpQuaternions(fromQuat, targetQuat, k);
      targetScale.lerpVectors(fromScale, targetScale, k);
      holder.matrix.copy(poseMatrix.compose(targetPos, targetQuat, targetScale));
    }
    holder.matrixWorldNeedsUpdate = true;
    initialised = true;
  }

  return { holder, pivot, framing, update };
}
