// GestureTracker turns raw pointer events into rotate / zoom / tap actions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GestureTracker, TAP_SLOP_PX } from '../../src/gestures.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);
const ofType = (actions, type) => actions.filter((a) => a.type === type);
const sum = (actions, key) => actions.reduce((s, a) => s + a[key], 0);

test('slop is 10 px', () => {
  assert.equal(TAP_SLOP_PX, 10);
});

test('a still press and release is a tap at the up position', () => {
  const g = new GestureTracker();
  assert.deepEqual(g.down(1, 100, 100), []);
  assert.deepEqual(g.move(1, 103, 98), []);
  assert.deepEqual(g.move(1, 104, 102), []);
  assert.deepEqual(g.up(1, 104, 102), [{ type: 'tap', x: 104, y: 102 }]);
});

test('movement of exactly the slop is still a tap', () => {
  const g = new GestureTracker();
  g.down(1, 0, 0);
  assert.deepEqual(g.move(1, 10, 0), []);
  assert.deepEqual(g.up(1, 10, 0), [{ type: 'tap', x: 10, y: 0 }]);
});

test('dragging 30 px right rotates by a total of dx 30, dy 0 and does not tap', () => {
  const g = new GestureTracker();
  g.down(1, 100, 100);
  const out = [];
  for (const x of [105, 110, 120, 130]) out.push(...g.move(1, x, 100));
  assert.ok(out.length > 0);
  assert.ok(out.every((a) => a.type === 'rotate'));
  assert.equal(sum(out, 'dx'), 30);
  assert.equal(sum(out, 'dy'), 0);
  assert.deepEqual(g.up(1, 130, 100), []);
});

test('the first rotate delta is measured from the down point', () => {
  const g = new GestureTracker();
  g.down(1, 50, 50);
  assert.deepEqual(g.move(1, 55, 50), []);
  assert.deepEqual(g.move(1, 62, 54), [{ type: 'rotate', dx: 12, dy: 4 }]);
  assert.deepEqual(g.move(1, 60, 60), [{ type: 'rotate', dx: -2, dy: 6 }]);
});

test('a drag that returns to the start is still not a tap', () => {
  const g = new GestureTracker();
  g.down(1, 0, 0);
  g.move(1, 30, 0);
  g.move(1, 0, 0);
  assert.deepEqual(g.up(1, 0, 0), []);
});

test('two pointers spreading from 100 to 200 px zoom by a product of 2 and never tap', () => {
  const g = new GestureTracker();
  g.down(1, 100, 200);
  g.down(2, 200, 200);
  const out = [];
  out.push(...g.move(2, 230, 200));
  out.push(...g.move(1, 70, 200));
  out.push(...g.move(2, 270, 200));
  out.push(...g.move(1, 70, 200));
  assert.ok(out.length > 0);
  assert.ok(out.every((a) => a.type === 'zoom'));
  near(out.reduce((p, a) => p * a.factor, 1), 2);
  assert.deepEqual(g.up(1, 70, 200), []);
  assert.deepEqual(g.up(2, 270, 200), []);
});

test('two-finger moves never emit rotate', () => {
  const g = new GestureTracker();
  g.down(1, 0, 0);
  g.down(2, 100, 0);
  const out = [...g.move(1, 0, 50), ...g.move(2, 100, 50), ...g.move(1, 20, 60)];
  assert.equal(ofType(out, 'rotate').length, 0);
});

test('lifting one finger resets so the remaining finger does not jump or tap', () => {
  const g = new GestureTracker();
  g.down(1, 0, 0);
  g.down(2, 100, 0);
  g.move(2, 150, 0);
  g.up(1, 0, 0);
  // finger 2 has moved far from where it went down, but nothing should fire until it moves past slop again
  assert.deepEqual(g.move(2, 153, 0), []);
  const out = g.move(2, 170, 0);
  assert.deepEqual(out, [{ type: 'rotate', dx: 20, dy: 0 }]);
  assert.deepEqual(g.up(2, 170, 0), []);
});

test('adding a second finger mid-drag does not jump the zoom', () => {
  const g = new GestureTracker();
  g.down(1, 0, 0);
  g.move(1, 40, 0);
  g.down(2, 140, 0);
  assert.deepEqual(g.move(2, 140, 0), []);
  const out = g.move(2, 240, 0);
  assert.equal(out.length, 1);
  near(out[0].factor, 200 / 100);
});

test('a lone second-finger touch that lifts without moving is not a tap', () => {
  const g = new GestureTracker();
  g.down(1, 0, 0);
  g.down(2, 10, 0);
  g.up(2, 10, 0);
  assert.deepEqual(g.up(1, 0, 0), []);
});

test('a new gesture after a multi-touch one can tap again', () => {
  const g = new GestureTracker();
  g.down(1, 0, 0);
  g.down(2, 100, 0);
  g.up(1, 0, 0);
  g.up(2, 100, 0);
  g.down(3, 5, 5);
  assert.deepEqual(g.up(3, 5, 5), [{ type: 'tap', x: 5, y: 5 }]);
});

test('cancel removes the pointer and suppresses the tap', () => {
  const g = new GestureTracker();
  g.down(1, 10, 10);
  assert.deepEqual(g.cancel(1), []);
  assert.deepEqual(g.up(1, 10, 10), []);
  // a following press is a fresh gesture
  g.down(2, 20, 20);
  assert.deepEqual(g.up(2, 20, 20), [{ type: 'tap', x: 20, y: 20 }]);
});

test('cancel of one of two pointers leaves the survivor unable to tap', () => {
  const g = new GestureTracker();
  g.down(1, 0, 0);
  g.down(2, 50, 0);
  g.cancel(1);
  assert.deepEqual(g.up(2, 50, 0), []);
});

test('unknown ids are ignored', () => {
  const g = new GestureTracker();
  assert.deepEqual(g.move(9, 1, 1), []);
  assert.deepEqual(g.up(9, 1, 1), []);
  assert.deepEqual(g.cancel(9), []);
  g.down(1, 0, 0);
  assert.deepEqual(g.move(9, 500, 500), []);
  assert.deepEqual(g.up(1, 0, 0), [{ type: 'tap', x: 0, y: 0 }]);
});

test('clear drops every pointer so the next single touch rotates instead of zooming', () => {
  const g = new GestureTracker();
  g.down(1, 0, 0);
  g.down(2, 100, 0); // pointerup for both was lost
  g.clear();
  g.down(3, 50, 50);
  const out = g.move(3, 80, 50);
  assert.deepEqual(out, [{ type: 'rotate', dx: 30, dy: 0 }]);
});

test('clear makes the gesture tap-ineligible and leaves later gestures normal', () => {
  const g = new GestureTracker();
  g.down(1, 10, 10);
  g.clear();
  assert.deepEqual(g.up(1, 10, 10), []); // dropped pointer: no tap
  g.down(2, 20, 20);
  assert.deepEqual(g.up(2, 20, 20), [{ type: 'tap', x: 20, y: 20 }]);
});

test('clear on an empty tracker is harmless', () => {
  const g = new GestureTracker();
  g.clear();
  g.down(1, 0, 0);
  assert.deepEqual(g.up(1, 0, 0), [{ type: 'tap', x: 0, y: 0 }]);
});
