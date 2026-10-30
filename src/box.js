// Lid state machine: lift, slide along the box length, lower beside the box (and back).

export const LID_LIFT = 0.06;
export const LID_SLIDE = 0.33;

export class BoxController {
  constructor({ lid, tweener, beforeClose = async () => {}, onStateChange = () => {} }) {
    this.lid = lid;
    this.tweener = tweener;
    this.beforeClose = beforeClose;
    this.onStateChange = onStateChange; // (state) => void, called after every state change
    this.state = 'closed';
  }

  #set(state) {
    this.state = state;
    this.onStateChange(state);
  }

  get busy() {
    return this.state === 'opening' || this.state === 'closing';
  }

  async open() {
    if (this.state !== 'closed') return false;
    this.#set('opening');
    try {
      const p = this.lid.position;
      await this.tweener.to(p, { y: LID_LIFT }, 0.3);
      await this.tweener.to(p, { x: LID_SLIDE }, 0.4);
      await this.tweener.to(p, { y: 0 }, 0.2);
      this.#set('open');
      return true;
    } catch (err) {
      this.#set('closed');
      throw err;
    }
  }

  async close() {
    if (this.state !== 'open') return false;
    this.#set('closing');
    try {
      await this.beforeClose();
      const p = this.lid.position;
      await this.tweener.to(p, { y: LID_LIFT }, 0.2);
      await this.tweener.to(p, { x: 0 }, 0.4);
      await this.tweener.to(p, { y: 0 }, 0.3);
      this.#set('closed');
      return true;
    } catch (err) {
      this.#set('open');
      throw err;
    }
  }
}
