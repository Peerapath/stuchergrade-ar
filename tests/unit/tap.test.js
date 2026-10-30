import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchTap, findRole } from '../../src/tap.js';
import { fakeObject } from '../helpers.js';

function world(boxState, pileBusy = false) {
  const calls = [];
  const box = {
    state: boxState,
    open: () => { calls.push('open'); return Promise.resolve(true); },
    close: () => { calls.push('close'); return Promise.resolve(true); },
  };
  const pile = (id) => ({ busy: pileBusy, toggle: () => { calls.push(`toggle:${id}`); return Promise.resolve(true); } });
  return { calls, ctx: { box, piles: { good: pile('good'), bad: pile('bad') } } };
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

const cases = [
  ['lid', 'closed', false, ['open']],
  ['base', 'closed', false, ['open']],
  ['lid', 'open', false, ['close']],
  ['lid', 'open', true, []],
  ['base', 'open', false, []],
  ['lid', 'opening', false, []],
  ['pile:good', 'open', false, ['toggle:good']],
  ['fanCard:bad', 'open', false, ['toggle:bad']],
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
