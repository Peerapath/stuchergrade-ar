// Drives a Tweener in fixed 60 fps steps, letting awaited promise chains run between frames.
export async function advance(tweener, seconds, onStep = () => {}) {
  const steps = Math.ceil(seconds * 60);
  for (let i = 0; i < steps; i++) {
    tweener.update(1 / 60);
    await new Promise((r) => setImmediate(r));
    onStep();
  }
}

// Minimal stand-in for a three.js Object3D.
export function fakeObject() {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, order: 'XYZ' },
    userData: {},
    children: [],
    parent: null,
    visible: true,
    add(...objs) {
      for (const o of objs) { o.parent = this; this.children.push(o); }
      return this;
    },
    remove(o) {
      this.children = this.children.filter((c) => c !== o);
      o.parent = null;
      return this;
    },
  };
}
