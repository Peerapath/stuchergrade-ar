// A face-down card stack that can fan a random sample of its cards above itself.

export const PILE_MAX_STACK = 20;
export const CARD_GAP = 0.0004;
export const FAN_COUNT = 5;
export const FAN_HEIGHT = 0.08;
export const FAN_SPREAD = Math.PI / 15;
export const FAN_STEP_X = 0.055;
const JITTER_POS = 0.001;
const JITTER_ROT = (2 * Math.PI) / 180;

export function pickRandom(items, n, rng = Math.random) {
  const pool = [...items];
  const out = [];
  while (out.length < n && pool.length > 0) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}

export function fanLayout(count) {
  if (count === 1) return [{ x: 0, y: 0, z: 0, rotY: 0 }];
  return Array.from({ length: count }, (_, i) => {
    const t = (i / (count - 1)) * 2 - 1;
    return {
      x: (t * FAN_STEP_X * (count - 1)) / 2,
      y: i * 0.002,
      z: Math.abs(t) * 0.01,
      rotY: -t * FAN_SPREAD,
    };
  });
}

export class CardPile {
  constructor({ id, faces, floorY, origin, parent, makeCard, makeGroup, tweener, rng = Math.random }) {
    Object.assign(this, { id, faces, floorY, origin, parent, makeCard, tweener, rng });
    this.state = 'stacked';
    this.stack = [];
    this.fanCards = [];
    this.fanGroup = makeGroup();
    Object.assign(this.fanGroup.position, { x: origin.x, y: floorY + FAN_HEIGHT, z: origin.z });
    parent.add(this.fanGroup);
  }

  get busy() {
    return this.state === 'fanning' || this.state === 'collapsing';
  }

  get topY() {
    return this.floorY + this.stack.length * CARD_GAP;
  }

  build() {
    const count = Math.min(PILE_MAX_STACK, this.faces.length);
    const jitter = (amount) => (this.rng() * 2 - 1) * amount;
    for (let i = 0; i < count; i++) {
      const card = this.makeCard(null);
      card.userData.role = `pile:${this.id}`;
      Object.assign(card.rotation, { x: Math.PI, y: jitter(JITTER_ROT), z: 0 });
      Object.assign(card.position, {
        x: this.origin.x + jitter(JITTER_POS),
        y: this.floorY + (i + 0.5) * CARD_GAP,
        z: this.origin.z + jitter(JITTER_POS),
      });
      this.parent.add(card);
      this.stack.push(card);
    }
  }

  #removeFanCards(cards) {
    for (const card of cards) this.fanGroup.remove(card);
    this.fanCards = [];
  }

  async fan() {
    if (this.state !== 'stacked') return false;
    this.state = 'fanning';
    const added = [];
    try {
      const startY = this.topY - this.fanGroup.position.y;
      const picks = pickRandom(this.faces, FAN_COUNT, this.rng);
      const layout = fanLayout(picks.length);
      this.fanCards = picks.map((face) => {
        const card = this.makeCard(face);
        card.userData.role = `fanCard:${this.id}`;
        card.userData.face = face;
        card.rotation.order = 'YXZ';
        Object.assign(card.rotation, { x: Math.PI, y: 0, z: 0 });
        Object.assign(card.position, { x: 0, y: startY, z: 0 });
        this.fanGroup.add(card);
        added.push(card);
        return card;
      });
      await Promise.all(this.fanCards.map(async (card, i) => {
        const slot = layout[i];
        await this.tweener.to(card.position, { y: 0, z: slot.z }, 0.4);
        await Promise.all([
          this.tweener.to(card.rotation, { x: 0, y: slot.rotY }, 0.4),
          this.tweener.to(card.position, { x: slot.x, y: slot.y }, 0.4),
        ]);
      }));
      this.state = 'fanned';
      return true;
    } catch (err) {
      this.#removeFanCards(added);
      this.state = 'stacked';
      throw err;
    }
  }

  async collapse() {
    if (this.state !== 'fanned') return false;
    this.state = 'collapsing';
    try {
      const startY = this.topY - this.fanGroup.position.y;
      await Promise.all(this.fanCards.map(async (card) => {
        await Promise.all([
          this.tweener.to(card.rotation, { x: Math.PI, y: 0 }, 0.4),
          this.tweener.to(card.position, { x: 0, y: 0, z: 0 }, 0.4),
        ]);
        await this.tweener.to(card.position, { y: startY, z: 0 }, 0.4);
      }));
      this.#removeFanCards(this.fanCards);
      this.state = 'stacked';
      return true;
    } catch (err) {
      this.#removeFanCards(this.fanCards);
      this.state = 'stacked';
      throw err;
    }
  }

  toggle() {
    if (this.state === 'stacked') return this.fan();
    if (this.state === 'fanned') return this.collapse();
    return Promise.resolve(false);
  }
}
