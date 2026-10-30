import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

test('printable marker files exist', () => {
  assert.ok(statSync(join(root, 'marker/stuchergrade-marker.png')).size > 50_000);
  assert.ok(statSync(join(root, 'marker/stuchergrade-marker.pdf')).size > 50_000);
});

test('compiled MindAR target exists', () => {
  assert.ok(statSync(join(root, 'assets/targets/targets.mind')).size > 10_000);
});
