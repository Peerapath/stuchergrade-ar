// MindAR image-tracking stage. Rejects if the camera cannot start.
// A denied camera rejects with the original DOMException; any other start failure rejects with 'AR start failed'.
// The camera is opened once on success: the getUserMedia probe runs only after mindar.start() has failed.
import { Vector3, Quaternion, Matrix4 } from 'three';
import { MindARThree } from '../vendor/mind-ar/mindar-image-three.prod.js';

async function probeCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'environment' } });
  stream.getTracks().forEach((track) => track.stop());
}

function releaseCamera(mindar) {
  const video = mindar.video;
  video?.srcObject?.getTracks().forEach((track) => track.stop());
  video?.remove();
}

export async function startAR({ container, targetSrc, onFound, onLost }) {
  const mindar = new MindARThree({
    container,
    imageTargetSrc: targetSrc,
    uiLoading: 'no',
    uiScanning: 'no',
    uiError: 'no',
  });
  const anchor = mindar.addAnchor(0);
  anchor.onTargetFound = onFound;
  anchor.onTargetLost = onLost;
  mindar.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  try {
    await mindar.start();
  } catch (err) {
    releaseCamera(mindar);
    // Only after a failed start: classify it. A rejecting probe (e.g. NotAllowedError) is rethrown unchanged.
    await probeCamera();
    throw new Error('AR start failed', { cause: err });
  }
  // postMatrixs[0] is composed with scale = marker width in world units.
  const markerScale = new Vector3();
  new Matrix4().copy(mindar.postMatrixs[0]).decompose(new Vector3(), new Quaternion(), markerScale);
  return { renderer: mindar.renderer, scene: mindar.scene, camera: mindar.camera, anchor: anchor.group, markerScale: markerScale.x };
}
