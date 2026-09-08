import test from 'node:test';
import assert from 'node:assert/strict';
import { createLatestRenderQueue } from './createLatestRenderQueue.js';

function defer() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

test('skips stale queued renders and only runs the latest pending request after the current one', async () => {
  const queue = createLatestRenderQueue();
  const order = [];
  const gate = defer();

  const first = queue.run(async () => {
    order.push('first:start');
    await gate.promise;
    order.push('first:end');
    return 'first';
  });

  const second = queue.run(async () => {
    order.push('second:start');
    return 'second';
  });

  const third = queue.run(async () => {
    order.push('third:start');
    return 'third';
  });

  gate.resolve();

  assert.equal(await first, 'first');
  assert.equal(await second, undefined);
  assert.equal(await third, 'third');
  assert.deepEqual(order, ['first:start', 'first:end', 'third:start']);
});

test('invalidate prevents already queued work from running', async () => {
  const queue = createLatestRenderQueue();
  const gate = defer();
  let executed = false;

  const first = queue.run(async () => {
    await gate.promise;
  });

  const pending = queue.run(async () => {
    executed = true;
  });

  queue.invalidate();
  gate.resolve();

  await first;
  assert.equal(await pending, undefined);
  assert.equal(executed, false);
});