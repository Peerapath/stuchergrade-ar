// Composition root: load assets, pick a stage (AR or ?debug=1), wire taps and the render loop.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Tweener } from './tween.js';
import { dispatchTap } from './tap.js';
import { attachTap } from './raycast.js';
import { buildContent, addLights, faceFansToCamera, TARGET_WIDTH_M } from './scene.js';
import { Overlay } from './overlay.js';
import { isCameraDenied } from './cameraError.js';

const overlay = new Overlay(document.getElementById('overlay'));
const container = document.getElementById('ar');
const debug = new URLSearchParams(location.search).has('debug');

async function loadAssets() {
  const loader = new GLTFLoader();
  const [boxGltf, cardGltf, manifest] = await Promise.all([
    loader.loadAsync('assets/models/box.glb'),
    loader.loadAsync('assets/models/card.glb'),
    fetch('assets/cards/manifest.json').then((r) => {
      if (!r.ok) throw new Error(`manifest.json ${r.status}`);
      return r.json();
    }),
  ]);
  return { boxScene: boxGltf.scene, cardScene: cardGltf.scene, manifest };
}

async function cameraDenied() {
  try {
    return (await navigator.permissions.query({ name: 'camera' })).state === 'denied';
  } catch {
    return false;
  }
}

async function startStage() {
  if (debug) {
    const { startDebug } = await import('./debug.js');
    overlay.show('hidden');
    return startDebug({ container });
  }
  const { startAR } = await import('./ar.js');
  let tracking = false;
  const stage = await startAR({
    container,
    targetSrc: 'assets/targets/targets.mind',
    onFound: () => { tracking = true; overlay.show('hidden'); },
    onLost: () => { tracking = false; overlay.show('scan'); },
  });
  overlay.show(tracking ? 'hidden' : 'scan');
  return stage;
}

async function main() {
  overlay.show('loading');
  if (!debug && !navigator.mediaDevices?.getUserMedia) {
    overlay.show('unsupported');
    return;
  }

  let assets;
  try {
    assets = await loadAssets();
  } catch (err) {
    console.error(err);
    overlay.show('error');
    return;
  }

  const tweener = new Tweener();
  let built;
  try {
    built = buildContent({ ...assets, textureLoader: new THREE.TextureLoader(), tweener });
    built.content.rotation.x = Math.PI / 2;
    built.content.scale.setScalar(1 / TARGET_WIDTH_M);
  } catch (err) {
    console.error(err);
    overlay.show('error');
    return;
  }

  let stage;
  try {
    stage = await startStage();
  } catch (err) {
    console.error(err);
    overlay.show(isCameraDenied(err) || (await cameraDenied()) ? 'denied' : 'error');
    return;
  }

  try {
    stage.root.add(built.content);
    addLights(stage.scene);
    attachTap({
      element: container,
      canvas: stage.renderer.domElement,
      camera: stage.camera,
      root: stage.root,
      onRole: async (role) => {
        try {
          await dispatchTap(role, built);
        } catch (err) {
          console.error(err);
        }
      },
    });

    const clock = new THREE.Clock();
    stage.renderer.setAnimationLoop(() => {
      tweener.update(Math.min(clock.getDelta(), 0.1));
      faceFansToCamera(built.piles, stage.camera, built.content);
      stage.renderer.render(stage.scene, stage.camera);
    });
    window.__app = { ...built, stage, tweener };
  } catch (err) {
    console.error(err);
    overlay.show('error');
  }
}

main().catch((err) => {
  console.error(err);
  overlay.show('error');
});
