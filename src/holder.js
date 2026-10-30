// The box holder: one group whose pose is either the tracked QR anchor or a camera-relative "free" pose,
// blended on mode switches. Inside it, `pivot` applies the user's yaw (around the box's up axis) and zoom.
import { Group, Vector3, Quaternion, Matrix4, Euler, MathUtils } from 'three';
import { easeInOut } from './tween.js';

const BOX_LENGTH_MARKERS = 3; // the box is 3 marker-widths long
const SCREEN_FILL = 0.8; // free view: box length fills this fraction of the screen width

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

  let hasFrom = false;

  function freeTarget(pitch) {
    const vFov = MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const d = (BOX_LENGTH_MARKERS * markerScale / SCREEN_FILL) / (2 * Math.tan(hFov / 2));
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
    if (switched) {
      holder.matrix.decompose(fromPos, fromQuat, fromScale);
      hasFrom = true;
    }

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
  }

  return { holder, pivot, update };
}
