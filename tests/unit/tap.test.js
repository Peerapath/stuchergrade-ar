import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchTap, findRole, findTagged } from '../../src/tap.js';
import { fakeObject } from '../helpers.js';

function world(boxState, pileBusy = false, pileState = 'stacked') {
  const calls = [];
  const box = {
    state: boxState,
    open: () => { calls.push('open'); return Promise.resolve(true); },
    close: () => { calls.push('close'); return Promise.resolve(true); },
  };
  const pile = (id) => ({
    busy: pileBusy,
    state: pileState,
    toggle: () => { calls.push(`toggle:${id}`); return Promise.resolve(true); },
  });
  const showCard = (face) => { calls.push(`show:${face}`); return null; };
  return { calls, ctx: { box, piles: { good: pile('good'), bad: pile('bad') }, showCard } };
}

test('findRole walks up to the nearest tagged ancestor', () => {
  const root = fakeObject();
  const mid = fakeObject();
  const leaf = fakeObject();
  root.add(mid); mid.add(leaf);
  mid.userData.role = 'lid';
  assert.equal(findRole(leaf), 'lid');
  assert.equal(findRole(root), null);
});

test('findTagged returns the nearest tagged ancestor-or-self, or null', () => {
  const root = fakeObject();
  const card = fakeObject();
  const mesh = fakeObject();
  root.add(card); card.add(mesh);
  card.userData.role = 'fanCard:good';
  assert.equal(findTagged(mesh), card);
  assert.equal(findTagged(card), card);
  assert.equal(findTagged(root), null);
  assert.equal(findTagged(null), null);
});

const cases = [
  ['lid', 'closed', false, ['open']],
  ['base', 'closed', false, ['open']],
  ['lid', 'open', false, ['close']],
  ['lid', 'open', true, []],
  ['base', 'open', false, []],
  ['lid', 'opening', false, []],
  ['pile:good', 'open', false, ['toggle:good']],
  ['pile:good', 'closed', false, []],
  ['pile:unknown', 'open', false, []],
  [null, 'open', false, []],
];

for (const [role, state, busy, expected] of cases) {
  test(`tap ${role} with box ${state}${busy ? ' (pile busy)' : ''} → ${expected.join(',') || 'nothing'}`, () => {
    const { calls, ctx } = world(state, busy);
    dispatchTap(role, ctx);
    assert.deepEqual(calls, expected);
  });
}

function tapFan(role, boxState, pileState, face) {
  const { calls, ctx } = world(boxState, false, pileState);
  const result = dispatchTap(role, ctx, face);
  return { calls, result };
}

test('fanCard tap with box open and pile fanned shows that card, no toggle', () => {
  const { calls, result } = tapFan('fanCard:good', 'open', 'fanned', 'f.jpg');
  assert.deepEqual(calls, ['show:f.jpg']);
  assert.equal(result, null);
});

test('fanCard tap while the pile is not fanned does nothing', () => {
  assert.deepEqual(tapFan('fanCard:good', 'open', 'fanning', 'f.jpg').calls, []);
  assert.deepEqual(tapFan('fanCard:good', 'open', 'collapsing', 'f.jpg').calls, []);
  assert.deepEqual(tapFan('fanCard:good', 'open', 'stacked', 'f.jpg').calls, []);
});

test('fanCard tap without a face, with the box not open, or for an unknown pile does nothing', () => {
  assert.deepEqual(tapFan('fanCard:good', 'open', 'fanned', null).calls, []);
  assert.deepEqual(tapFan('fanCard:good', 'closed', 'fanned', 'f.jpg').calls, []);
  assert.deepEqual(tapFan('fanCard:unknown', 'open', 'fanned', 'f.jpg').calls, []);
});

test('pile tap while fanned collapses it via toggle', () => {
  assert.deepEqual(tapFan('pile:good', 'open', 'fanned', null).calls, ['toggle:good']);
});
