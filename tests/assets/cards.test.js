import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const manifest = () => JSON.parse(readFileSync(join(root, 'assets/cards/manifest.json'), 'utf8'));

test('manifest lists both piles and every file exists', () => {
  const m = manifest();
  assert.equal(m.back, 'assets/cards/back.jpg');
  assert.ok(m.good.length >= 5, `good has ${m.good.length}`);
  assert.ok(m.bad.length >= 5, `bad has ${m.bad.length}`);
  for (const p of [m.back, ...m.good, ...m.bad]) statSync(join(root, p));
});

test('card images stay within 8 MB', () => {
  const dir = join(root, 'assets/cards');
  let total = 0;
  for (const sub of ['', 'good', 'bad']) {
    for (const f of readdirSync(join(dir, sub)).filter((n) => n.endsWith('.jpg'))) total += statSync(join(dir, sub, f)).size;
  }
  assert.ok(total <= 8 * 1024 * 1024, `${total} bytes`);
});
