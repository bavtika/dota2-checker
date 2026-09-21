const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('../src/queue');

describe('Queue', () => {
  it('runs tasks sequentially', async () => {
    const q = new Queue({ delayMs: 0 });
    const order = [];

    const p1 = q.add(async () => {
      order.push('a-start');
      await new Promise((r) => setTimeout(r, 20));
      order.push('a-end');
      return 1;
    });

    const p2 = q.add(async () => {
      order.push('b');
      return 2;
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    assert.equal(r1, 1);
    assert.equal(r2, 2);
    assert.deepEqual(order, ['a-start', 'a-end', 'b']);
  });

  it('reports queue length', async () => {
    const q = new Queue({ delayMs: 0 });
    let release;
    const gate = new Promise((r) => {
      release = r;
    });

    const first = q.add(async () => {
      await gate;
    });
    q.add(async () => {});

    await new Promise((r) => setTimeout(r, 5));
    assert.ok(q.getLength() >= 1);
    release();
    await first;
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(q.getLength(), 0);
  });
});
