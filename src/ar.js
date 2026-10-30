// MindAR image-tracking stage. Rejects if the camera cannot start.
// A denied camera rejects with the original DOMException; any other start failure rejects with 'AR start failed'.
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
  await probeCamera();
  try {
    await mindar.start();
  } catch (err) {
    releaseCamera(mindar);
    throw new Error('AR start failed', { cause: err });
  }
  return { renderer: mindar.renderer, scene: mindar.scene, camera: mindar.camera, root: anchor.group };
}
