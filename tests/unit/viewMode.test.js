// ViewMode decides free vs tracked and the 0..1 blend progress after each switch.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ViewMode, BLEND_SECONDS } from '../../src/viewMode.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test('blend lasts 0.35 seconds', () => {
  assert.equal(BLEND_SECONDS, 0.35);
});

test('starts free with the blend complete', () => {
  const m = new ViewMode();
  assert.equal(m.mode, 'free');
  assert.equal(m.t, 1);
});

test('staying free changes nothing', () => {
  const m = new ViewMode();
  assert.deepEqual(m.update(false, 0.1), { mode: 'free', t: 1, switched: false });
});

test('seeing the marker switches to tracked and restarts the blend', () => {
  const m = new ViewMode();
  assert.deepEqual(m.update(true, 0.1), { mode: 'tracked', t: 0, switched: true });
});

test('blend advances by dt / 0.35 and caps at 1', () => {
  const m = new ViewMode();
  m.update(true, 0.1);
  const a = m.update(true, 0.07);
  assert.equal(a.mode, 'tracked');
  assert.equal(a.switched, false);
  near(a.t, 0.2);
  const b = m.update(true, 0.14);
  near(b.t, 0.6);
  const c = m.update(true, 1);
  assert.equal(c.t, 1);
  assert.equal(c.switched, false);
});

test('losing the marker flips back to free with t 0', () => {
  const m = new ViewMode();
  m.update(true, 0.1);
  m.update(true, 1);
  assert.deepEqual(m.update(false, 0.1), { mode: 'free', t: 0, switched: true });
  near(m.update(false, 0.175).t, 0.5);
});

test('flipping mid-blend restarts from 0', () => {
  const m = new ViewMode();
  m.update(true, 0.1);
  m.update(true, 0.1);
  const r = m.update(false, 0.1);
  assert.deepEqual(r, { mode: 'free', t: 0, switched: true });
});
