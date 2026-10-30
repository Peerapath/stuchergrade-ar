#!/usr/bin/env bash
# Copies the exact three.js / MindAR files the site imports into vendor/.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
(cd "$tmp" && npm pack three@0.160.0 mind-ar@1.2.5 --silent >/dev/null \
  && mkdir three mindar \
  && tar -xzf three-0.160.0.tgz -C three \
  && tar -xzf mind-ar-1.2.5.tgz -C mindar)
T="$tmp/three/package"
M="$tmp/mindar/package"
rm -rf vendor
mkdir -p vendor/three/build vendor/three/examples/jsm/loaders vendor/three/examples/jsm/utils \
  vendor/three/examples/jsm/renderers vendor/three/examples/jsm/controls vendor/mind-ar
cp "$T/build/three.module.js" vendor/three/build/
cp "$T/examples/jsm/loaders/GLTFLoader.js" vendor/three/examples/jsm/loaders/
cp "$T/examples/jsm/utils/BufferGeometryUtils.js" vendor/three/examples/jsm/utils/
cp "$T/examples/jsm/renderers/CSS3DRenderer.js" vendor/three/examples/jsm/renderers/
cp "$T/examples/jsm/controls/OrbitControls.js" vendor/three/examples/jsm/controls/
cp "$T/LICENSE" vendor/three/LICENSE
cp "$M/dist/mindar-image-three.prod.js" "$M/dist/mindar-image.prod.js" \
   "$M/dist/controller-mGt1s8dJ.js" "$M/dist/ui-fBadYuor.js" vendor/mind-ar/
cp "$M/LICENSE" vendor/mind-ar/LICENSE
echo "vendor ready"
