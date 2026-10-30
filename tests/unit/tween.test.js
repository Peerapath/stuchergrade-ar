import test from 'node:test';
import assert from 'node:assert/strict';
import { Tweener, easeInOut } from '../../src/tween.js';
import { advance } from '../helpers.js';

test('easeInOut hits 0, 0.5 and 1', () => {
  assert.equal(easeInOut(0), 0);
  assert.equal(easeInOut(0.5), 0.5);
  assert.equal(easeInOut(1), 1);
});

test('to() moves only the given property and resolves at the end', async () => {
  const tw = new Tweener();
  const o = { x: 0, y: 5 };
  let done = false;
  tw.to(o, { x: 10 }, 1).then(() => { done = true; });
  await advance(tw, 0.5);
  assert.ok(o.x > 0 && o.x < 10);
  assert.equal(o.y, 5);
  assert.equal(done, false);
  await advance(tw, 0.6);
  assert.equal(o.x, 10);
  assert.equal(done, true);
  assert.equal(tw.active, 0);
});

test('chained tweens start from the previous end value', async () => {
  const tw = new Tweener();
  const o = { x: 0 };
  const seq = (async () => {
    await tw.to(o, { x: 1 }, 0.2);
    await tw.to(o, { x: 3 }, 0.2);
  })();
  await advance(tw, 0.6);
  await seq;
  assert.equal(o.x, 3);
});

test('zero duration completes on the next update', async () => {
  const tw = new Tweener();
  const o = { x: 0 };
  const p = tw.to(o, { x: 2 }, 0);
  tw.update(0.001);
  await p;
  assert.equal(o.x, 2);
});
