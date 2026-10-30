import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const root = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function dirSize(dir) {
  return readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
    const p = join(dir, e.name);
    return sum + (e.isDirectory() ? dirSize(p) : statSync(p).size);
  }, 0);
}

test('three r160 is vendored', () => {
  const src = readFileSync(join(root, 'vendor/three/build/three.module.js'), 'utf8');
  assert.match(src, /REVISION = '160'/);
});

test('every relative import inside vendor/mind-ar resolves to a vendored file', () => {
  const dir = join(root, 'vendor/mind-ar');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    const src = readFileSync(join(dir, f), 'utf8');
    for (const [, spec] of src.matchAll(/from\s*"(\.\/[^"]+)"/g)) {
      assert.doesNotThrow(() => statSync(join(dir, spec)), `${f} imports missing ${spec}`);
    }
  }
});

test('vendor stays within 4.5 MB', () => {
  assert.ok(dirSize(join(root, 'vendor')) <= 4.5 * 1024 * 1024);
});
