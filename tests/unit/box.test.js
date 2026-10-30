import test from 'node:test';
import assert from 'node:assert/strict';
import { Tweener } from '../../src/tween.js';
import { BoxController, LID_LIFT, LID_SLIDE } from '../../src/box.js';
import { advance, fakeObject } from '../helpers.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('open lifts first, slides at full lift, then lowers beside the box', async () => {
  const tw = new Tweener();
  const lid = fakeObject();
  const box = new BoxController({ lid, tweener: tw });
  const opened = box.open();
  assert.equal(box.state, 'opening');
  assert.equal(box.busy, true);
  let slidBelowLift = false;
  await advance(tw, 1.2, () => {
    const sliding = lid.position.x > 0 && lid.position.x < LID_SLIDE;
    if (sliding && !near(lid.position.y, LID_LIFT)) slidBelowLift = true;
  });
  assert.equal(await opened, true);
  assert.equal(slidBelowLift, false);
  assert.equal(box.state, 'open');
  assert.equal(box.busy, false);
  assert.ok(near(lid.position.x, LID_SLIDE));
  assert.ok(near(lid.position.y, 0));
});

test('open is ignored unless closed', async () => {
  const tw = new Tweener();
  const box = new BoxController({ lid: fakeObject(), tweener: tw });
  const first = box.open();
  assert.equal(await box.open(), false);
  await advance(tw, 1.2);
  assert.equal(await first, true);
  assert.equal(await box.open(), false);
});

test('close waits for beforeClose, then returns the lid home', async () => {
  const tw = new Tweener();
  const lid = fakeObject();
  const order = [];
  const box = new BoxController({
    lid,
    tweener: tw,
    beforeClose: async () => { order.push(`beforeClose@x=${lid.position.x.toFixed(2)}`); },
  });
  const opened = box.open();
  await advance(tw, 1.2);
  await opened;
  const closed = box.close();
  assert.equal(box.state, 'closing');
  await advance(tw, 1.2);
  assert.equal(await closed, true);
  assert.deepEqual(order, [`beforeClose@x=${LID_SLIDE.toFixed(2)}`]);
  assert.equal(box.state, 'closed');
  assert.ok(near(lid.position.x, 0) && near(lid.position.y, 0));
});

test('close is ignored unless open', async () => {
  const box = new BoxController({ lid: fakeObject(), tweener: new Tweener() });
  assert.equal(await box.close(), false);
  assert.equal(box.state, 'closed');
});

test('close recovers to open when beforeClose rejects', async () => {
  const tw = new Tweener();
  const lid = fakeObject();
  let fail = true;
  const box = new BoxController({
    lid,
    tweener: tw,
    beforeClose: async () => { if (fail) throw new Error('boom'); },
  });
  const opened = box.open();
  await advance(tw, 1.2);
  await opened;
  await assert.rejects(box.close(), /boom/);
  assert.equal(box.state, 'open');
  assert.equal(box.busy, false);
  fail = false;
  const closed = box.close();
  await advance(tw, 1.2);
  assert.equal(await closed, true);
  assert.equal(box.state, 'closed');
});

test('open recovers to closed when a tween rejects', async () => {
  const box = new BoxController({
    lid: fakeObject(),
    tweener: { to: () => Promise.reject(new Error('x')) },
  });
  await assert.rejects(box.open(), /x/);
  assert.equal(box.state, 'closed');
  assert.equal(box.busy, false);
});

test('onStateChange fires on every transition, including failure recovery', async () => {
  const tw = new Tweener();
  const seen = [];
  const box = new BoxController({
    lid: fakeObject(),
    tweener: tw,
    onStateChange: (state) => seen.push(state),
  });
  const opened = box.open();
  await advance(tw, 1.2);
  await opened;
  const closed = box.close();
  await advance(tw, 1.2);
  await closed;
  assert.deepEqual(seen, ['opening', 'open', 'closing', 'closed']);

  const failing = new BoxController({
    lid: fakeObject(),
    tweener: { to: () => Promise.reject(new Error('x')) },
    onStateChange: (state) => seen.push(state),
  });
  seen.length = 0;
  await assert.rejects(failing.open(), /x/);
  assert.deepEqual(seen, ['opening', 'closed']);
});
