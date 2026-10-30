import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function readGlb(file) {
  const buf = readFileSync(join(root, file));
  assert.equal(buf.toString('ascii', 0, 4), 'glTF');
  const jsonLen = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
}

function nodeInfo(gltf, name) {
  const node = gltf.nodes.find((n) => n.name === name);
  assert.ok(node, `node ${name} missing`);
  const mesh = gltf.meshes[node.mesh];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const prim of mesh.primitives) {
    const acc = gltf.accessors[prim.attributes.POSITION];
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], acc.min[i]); max[i] = Math.max(max[i], acc.max[i]); }
  }
  const materials = mesh.primitives.map((p) => gltf.materials[p.material].name).sort();
  return { min, max, materials };
}

const close = (actual, expected) => actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < 1e-4, `${actual} vs ${expected}`));

test('box.glb has Lid and Base at spec size with embedded JPEG textures', () => {
  const gltf = readGlb('assets/models/box.glb');
  const lid = nodeInfo(gltf, 'Lid');
  close(lid.min, [-0.15, 0, -0.075]);
  close(lid.max, [0.15, 0.05, 0.075]);
  assert.deepEqual(lid.materials, ['BoxFront', 'BoxInside']);
  const base = nodeInfo(gltf, 'Base');
  close(base.min, [-0.148, 0, -0.073]);
  close(base.max, [0.148, 0.048, 0.073]);
  assert.deepEqual(base.materials, ['BoxBack', 'BoxInside']);
  assert.equal(gltf.images.length, 3);
  assert.ok(gltf.images.every((im) => im.mimeType === 'image/jpeg'));
  assert.ok(statSync(join(root, 'assets/models/box.glb')).size <= 4 * 1024 * 1024);
});

test('card.glb is a 7x12 cm card with front/back materials and no images', () => {
  const gltf = readGlb('assets/models/card.glb');
  const card = nodeInfo(gltf, 'Card');
  close(card.min, [-0.035, -0.00015, -0.06]);
  close(card.max, [0.035, 0.00015, 0.06]);
  assert.deepEqual(card.materials, ['CardBack', 'CardFront']);
  assert.ok(!gltf.images || gltf.images.length === 0);
});
