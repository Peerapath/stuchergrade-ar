// Builds the box + card piles from loaded assets and wires the pure controllers to three objects.
import * as THREE from 'three';
import { BoxController } from './box.js';
import { CardPile } from './cardPile.js';

export const TARGET_WIDTH_M = 0.10;
export const BASE_FLOOR_Y = 0.002;
export const PILE_X = { good: -0.045, bad: 0.045 };

function loadTexture(loader, url) {
  const texture = loader.load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  return texture;
}

export function buildContent({ boxScene, cardScene, manifest, textureLoader, tweener, rng = Math.random }) {
  const content = new THREE.Group();
  content.name = 'Content';
  const lid = boxScene.getObjectByName('Lid');
  const base = boxScene.getObjectByName('Base');
  lid.userData.role = 'lid';
  base.userData.role = 'base';
  content.add(base, lid);

  const backMaterial = new THREE.MeshStandardMaterial({ map: loadTexture(textureLoader, manifest.back), roughness: 0.6 });
  const faceMaterials = new Map();
  const faceMaterial = (url) => {
    if (!faceMaterials.has(url)) {
      faceMaterials.set(url, new THREE.MeshStandardMaterial({ map: loadTexture(textureLoader, url), roughness: 0.6 }));
    }
    return faceMaterials.get(url);
  };
  const template = cardScene.getObjectByName('Card');
  const makeCard = (faceUrl) => {
    const card = template.clone(true);
    card.traverse((o) => {
      if (o.isMesh) o.material = o.material.name === 'CardFront' && faceUrl ? faceMaterial(faceUrl) : backMaterial;
    });
    return card;
  };

  const piles = {};
  for (const id of ['good', 'bad']) {
    piles[id] = new CardPile({
      id,
      faces: manifest[id],
      floorY: BASE_FLOOR_Y,
      origin: { x: PILE_X[id], z: 0 },
      parent: content,
      makeCard,
      makeGroup: () => new THREE.Group(),
      tweener,
      rng,
    });
    piles[id].build();
  }

  const box = new BoxController({
    lid,
    tweener,
    beforeClose: () => Promise.all(Object.values(piles).map((p) => p.collapse())),
  });
  return { content, lid, base, box, piles };
}

export function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(1, 3, 2);
  scene.add(sun);
}

const cameraLocal = new THREE.Vector3();
const screenDown = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const contentQuat = new THREE.Quaternion();

// Yaws each fan so its +Z points toward the viewer. The horizontal direction to the camera
// vanishes when looking straight down, so the camera's screen-down direction (projected onto the
// box plane) is added: it points toward the viewer from above and fades out in side views.
export function faceFansToCamera(piles, camera, content) {
  camera.getWorldPosition(cameraLocal);
  content.worldToLocal(cameraLocal);
  camera.getWorldQuaternion(tmpQuat);
  content.getWorldQuaternion(contentQuat).invert();
  screenDown.set(0, -1, 0).applyQuaternion(tmpQuat).applyQuaternion(contentQuat);
  for (const pile of Object.values(piles)) {
    const g = pile.fanGroup;
    const dx = cameraLocal.x - g.position.x;
    const dz = cameraLocal.z - g.position.z;
    const dist = Math.hypot(dx, cameraLocal.y - g.position.y, dz) || 1;
    g.rotation.y = Math.atan2(dx / dist + screenDown.x, dz / dist + screenDown.z);
  }
}
