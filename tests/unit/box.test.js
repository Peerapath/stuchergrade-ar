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
