import test from 'node:test';
import assert from 'node:assert/strict';
import { createPdfWorkerManager } from './pdfWorkerManager.js';

class FakePDFWorker {
  static instances = [];

  constructor({ name, port }) {
    this.name = name;
    this.port = port;
    this.destroyed = false;
    this.promise = Promise.resolve();
    FakePDFWorker.instances.push(this);
  }

  destroy() {
    this.destroyed = true;
  }
}

test('getSharedPdfWorker returns the same worker instance across calls', async () => {
  let portCount = 0;
  const manager = createPdfWorkerManager(() => ({ id: ++portCount }));
  const pdfjs = { PDFWorker: FakePDFWorker };

  const workerA = await manager.getSharedPdfWorker(pdfjs);
  const workerB = await manager.getSharedPdfWorker(pdfjs);

  assert.equal(workerA, workerB);
  assert.equal(portCount, 1);
  assert.equal(workerA.name, 'ort-shared-worker');
});

test('destroySharedPdfWorker clears the singleton and allows recreation', async () => {
  let portCount = 0;
  const manager = createPdfWorkerManager(() => ({ id: ++portCount }));
  const pdfjs = { PDFWorker: FakePDFWorker };

  const workerA = await manager.getSharedPdfWorker(pdfjs);
  await manager.destroySharedPdfWorker();
  const workerB = await manager.getSharedPdfWorker(pdfjs);

  assert.notEqual(workerA, workerB);
  assert.equal(workerA.destroyed, true);
  assert.equal(portCount, 2);
});

test('failed creation resets the singleton promise', async () => {
  let calls = 0;
  class FlakyPDFWorker {
    constructor({ port }) {
      this.port = port;
      calls += 1;
      this.promise = calls === 1 ? Promise.reject(new Error('boom')) : Promise.resolve();
    }

    destroy() {}
  }

  const manager = createPdfWorkerManager(() => ({ id: calls + 1 }));
  const pdfjs = { PDFWorker: FlakyPDFWorker };

  await assert.rejects(() => manager.getSharedPdfWorker(pdfjs), /boom/);
  const worker = await manager.getSharedPdfWorker(pdfjs);

  assert.ok(worker);
  assert.equal(calls, 2);
});
