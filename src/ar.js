// MindAR image-tracking stage. Rejects if the camera cannot start.
import { MindARThree } from '../vendor/mind-ar/mindar-image-three.prod.js';

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
  await mindar.start();
  return { renderer: mindar.renderer, scene: mindar.scene, camera: mindar.camera, root: anchor.group };
}
