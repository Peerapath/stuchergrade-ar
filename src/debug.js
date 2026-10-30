// ?debug=1 stage: no camera, no tracking. The camera sits at the origin looking down -Z; the box floats in front of it.
import * as THREE from 'three';

export function startDebug({ container }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8a8f99);
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.01, 100);

  window.addEventListener('resize', () => {
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
  });
  return { renderer, scene, camera, anchor: null, markerScale: 1 };
}
