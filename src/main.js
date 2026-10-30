// Composition root: load assets, pick a stage (AR or ?debug=1), wire taps and the render loop.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Tweener } from './tween.js';
import { dispatchTap } from './tap.js';
import { pickTarget } from './raycast.js';
import { CardDetail } from './cardDetail.js';
import { attachInput } from './input.js';
import { createHolder, FRAMING_CLOSED, FRAMING_OPEN } from './holder.js';
import { FreeView } from './freeView.js';
import { ViewMode } from './viewMode.js';
import { buildContent, addLights, faceFansToCamera, TARGET_WIDTH_M } from './scene.js';
import { Overlay } from './overlay.js';
import { isCameraDenied } from './cameraError.js';

const overlay = new Overlay(document.getElementById('overlay'));
const container = document.getElementById('ar');
const debug = new URLSearchParams(location.search).has('debug');
let tracking = false; // QR currently seen (AR stage only; stays false in debug)
let failed = false; // once an error/denied overlay is shown, late MindAR callbacks must not replace it

function fail(state) {
  failed = true;
  overlay.show(state);
}

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
  const stage = await startAR({
    container,
    targetSrc: 'assets/targets/targets.mind',
    onFound: () => { if (failed) return; tracking = true; overlay.show('hidden'); },
    onLost: () => { if (failed) return; tracking = false; overlay.show('scan'); },
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
    fail('error');
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
    fail('error');
    return;
  }

  let stage;
  try {
    stage = await startStage();
  } catch (err) {
    console.error(err);
    fail(isCameraDenied(err) || (await cameraDenied()) ? 'denied' : 'error');
    return;
  }

  try {
    const freeView = new FreeView();
    const viewMode = new ViewMode();
    const holder = createHolder({
      scene: stage.scene,
      content: built.content,
      camera: stage.camera,
      markerScale: stage.markerScale,
    });
    addLights(stage.scene);
    // Reframe the free view as the lid starts opening / closing (also covers a failed open/close reverting).
    built.box.onStateChange = (state) => {
      const to = state === 'opening' || state === 'open' ? FRAMING_OPEN : FRAMING_CLOSED;
      tweener.to(holder.framing, { length: to.length, shift: to.shift }, 0.6);
    };
    const detail = new CardDetail(document.getElementById('card-detail'));
    attachInput({
      element: container,
      onTap: async (x, y) => {
        if (detail.isOpen) return;
        try {
          const target = pickTarget({ x, y, canvas: stage.renderer.domElement, camera: stage.camera, root: holder.holder });
          if (target) await dispatchTap(target.role, { ...built, showCard: (url) => detail.show(url) }, target.face);
        } catch (err) {
          console.error(err);
        }
      },
      onRotate: (dx, dy) => freeView.rotate(dx, dy, { allowPitch: viewMode.mode === 'free' }),
      onZoom: (factor) => freeView.zoomBy(factor),
    });

    const clock = new THREE.Clock();
    stage.renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.1);
      tweener.update(dt);
      holder.update({ anchor: stage.anchor, tracking, freeView, viewMode, dt });
      faceFansToCamera(built.piles, stage.camera, built.content);
      stage.renderer.render(stage.scene, stage.camera);
    });
    window.__app = { ...built, stage, tweener, freeView, viewMode, holder };
  } catch (err) {
    console.error(err);
    fail('error');
  }
}

main().catch((err) => {
  console.error(err);
  fail('error');
});
