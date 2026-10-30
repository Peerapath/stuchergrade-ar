import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SKIP = new Set(['.git', 'tools', 'tests', 'node_modules']);

function size(dir) {
  return readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
    if (SKIP.has(e.name)) return sum;
    const p = join(dir, e.name);
    return sum + (e.isDirectory() ? size(p) : statSync(p).size);
  }, 0);
}

test('deployed site stays within 15 MB', () => {
  const total = size(root);
  assert.ok(total <= 15 * 1024 * 1024, `${(total / 1048576).toFixed(1)} MB`);
});
