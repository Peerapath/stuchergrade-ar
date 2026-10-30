import test from 'node:test';
import assert from 'node:assert/strict';
import { Tweener } from '../../src/tween.js';
import {
  CardPile, pickRandom, fanLayout, PILE_MAX_STACK, CARD_GAP, FAN_COUNT, FAN_HEIGHT, FAN_SPREAD,
} from '../../src/cardPile.js';
import { advance, fakeObject } from '../helpers.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;
const faces = (n) => Array.from({ length: n }, (_, i) => `f${i}.jpg`);

function makePile(n = 30) {
  const parent = fakeObject();
  const made = [];
  const pile = new CardPile({
    id: 'good',
    faces: faces(n),
    floorY: 0.002,
    origin: { x: -0.045, z: 0 },
    parent,
    makeCard: (face) => { const c = fakeObject(); c.userData.face = face; made.push(c); return c; },
    makeGroup: fakeObject,
    tweener: new Tweener(),
    rng: () => 0.5,
  });
  return { pile, parent, made };
}

test('pickRandom returns n distinct items, or all when fewer', () => {
  let i = 0;
  const rng = () => [0.9, 0.1, 0.5, 0.3, 0.7][i++ % 5];
  const picked = pickRandom(faces(10), 5, rng);
  assert.equal(picked.length, 5);
  assert.equal(new Set(picked).size, 5);
  assert.equal(pickRandom(faces(3), 5).length, 3);
});

test('fanLayout is symmetric with ±FAN_SPREAD at the ends', () => {
  const l = fanLayout(5);
  assert.equal(l.length, 5);
  assert.ok(near(l[0].rotZ, FAN_SPREAD) && near(l[4].rotZ, -FAN_SPREAD) && near(l[2].rotZ, 0));
  assert.ok(near(l[0].x, -l[4].x) && l[0].x < 0);
  assert.ok(l[4].z > l[0].z);
  assert.deepEqual(fanLayout(1), [{ x: 0, y: 0, z: 0, rotZ: 0 }]);
});

test('build stacks up to PILE_MAX_STACK face-down cards with the pile role', () => {
  const { pile, parent } = makePile(30);
  pile.build();
  assert.equal(pile.stack.length, PILE_MAX_STACK);
  assert.ok(pile.stack.every((c) => c.userData.role === 'pile:good' && c.userData.face === null));
  assert.ok(pile.stack.every((c) => near(c.rotation.x, Math.PI)));
  assert.ok(pile.stack[1].position.y > pile.stack[0].position.y);
  assert.ok(near(pile.stack[0].position.x, -0.045));
  assert.ok(parent.children.includes(pile.fanGroup));
  assert.ok(near(pile.fanGroup.position.y, 0.002 + FAN_HEIGHT));
});

test('fan raises FAN_COUNT distinct face-up cards into the fan layout', async () => {
  const { pile } = makePile(30);
  pile.build();
  const fanned = pile.fan();
  assert.equal(pile.state, 'fanning');
  assert.equal(await pile.fan(), false);
  await advance(pile.tweener, 1.0);
  assert.equal(await fanned, true);
  assert.equal(pile.state, 'fanned');
  assert.equal(pile.fanCards.length, FAN_COUNT);
  assert.equal(new Set(pile.fanCards.map((c) => c.userData.face)).size, FAN_COUNT);
  const layout = fanLayout(FAN_COUNT);
  pile.fanCards.forEach((c, i) => {
    assert.equal(c.userData.role, 'fanCard:good');
    assert.equal(c.rotation.order, 'ZYX');
    assert.ok(near(c.rotation.x, Math.PI / 2));
    assert.ok(near(c.rotation.z, layout[i].rotZ));
    assert.ok(near(c.position.x, layout[i].x) && near(c.position.y, layout[i].y));
  });
  assert.equal(pile.fanGroup.children.length, FAN_COUNT);
});

test('collapse returns cards to the pile and removes them', async () => {
  const { pile } = makePile(30);
  pile.build();
  const f = pile.fan();
  await advance(pile.tweener, 1.0);
  await f;
  const c = pile.collapse();
  assert.equal(pile.state, 'collapsing');
  await advance(pile.tweener, 1.0);
  assert.equal(await c, true);
  assert.equal(pile.state, 'stacked');
  assert.equal(pile.fanCards.length, 0);
  assert.equal(pile.fanGroup.children.length, 0);
  assert.equal(await pile.collapse(), false);
});

test('toggle fans when stacked and collapses when fanned', async () => {
  const { pile } = makePile(3);
  pile.build();
  const a = pile.toggle();
  await advance(pile.tweener, 1.0);
  await a;
  assert.equal(pile.state, 'fanned');
  assert.equal(pile.fanCards.length, 3);
  const b = pile.toggle();
  await advance(pile.tweener, 1.0);
  await b;
  assert.equal(pile.state, 'stacked');
});

test('stack height uses CARD_GAP', () => {
  const { pile } = makePile(2);
  pile.build();
  assert.ok(near(pile.topY, 0.002 + 2 * CARD_GAP));
});

test('fan failure removes added cards and leaves the pile stacked and usable', async () => {
  const { pile } = makePile(30);
  pile.build();
  const working = pile.makeCard;
  let calls = 0;
  pile.makeCard = (face) => {
    if (++calls === 3) throw new Error('no card');
    return working(face);
  };
  await assert.rejects(pile.fan(), /no card/);
  assert.equal(pile.state, 'stacked');
  assert.equal(pile.fanGroup.children.length, 0);
  assert.equal(pile.fanCards.length, 0);
  pile.makeCard = working;
  const again = pile.fan();
  await advance(pile.tweener, 1.0);
  assert.equal(await again, true);
  assert.equal(pile.state, 'fanned');
});

test('collapse failure still clears the fan and leaves the pile stacked', async () => {
  const { pile } = makePile(30);
  pile.build();
  const f = pile.fan();
  await advance(pile.tweener, 1.0);
  await f;
  pile.tweener = { to: () => Promise.reject(new Error('tween')) };
  await assert.rejects(pile.collapse(), /tween/);
  assert.equal(pile.state, 'stacked');
  assert.equal(pile.fanGroup.children.length, 0);
  assert.equal(pile.fanCards.length, 0);
});
