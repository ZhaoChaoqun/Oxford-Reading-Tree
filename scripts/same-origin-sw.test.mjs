import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

for (const name of ['sw.js', 'sw.normal.js']) {
  test(`${name}: same-origin media uses range-aware routes, never app-shell caching`, async () => {
    const source = await readFile(new URL(`../public/${name}`, import.meta.url), 'utf8');
    const handlers = {};
    const context = {
      self: {
        registration: { scope: 'https://library.test/' },
        location: { origin: 'https://library.test' },
        addEventListener: (type, handler) => { handlers[type] = handler; },
      },
      URL,
    };
    runInNewContext(source, context);
    runInNewContext(`
      bookResourceStrategy = () => 'book';
      videoResourceStrategy = () => 'video';
      appShellStrategy = () => 'shell';
      fetch = () => 'network';
    `, context);
    for (const [path, expected] of [
      ['/__local-media/books/stage-1/1-01.pdf', 'book'],
      ['/__local-media/books/stage-1/1-01.mp3', 'book'],
      ['/__local-media/videos/family-stage-1/fs1-01.mp4', 'video'],
      ['/__local-media/probe.txt', 'network'],
      ['/assets/main.js', 'shell'],
    ]) {
      let result;
      handlers.fetch({
        request: { method: 'GET', url: `https://library.test${path}` },
        respondWith: (value) => { result = value; },
      });
      assert.equal(result, expected);
    }
  });

  test(`${name}: partial media responses are not inserted into Cache API`, async () => {
    const source = await readFile(new URL(`../public/${name}`, import.meta.url), 'utf8');
    const partial = { ok: true, status: 206, clone() { throw new Error('Do not cache partial data'); } };
    const context = {
      self: { registration: { scope: 'https://library.test/' }, addEventListener() {} },
      URL, caches: { match: async () => undefined }, fetch: async () => partial,
    };
    runInNewContext(source, context);
    assert.equal(await context.bookResourceStrategy(
      { headers: new Headers({ Range: 'bytes=0-4' }) },
      new URL('https://library.test/__local-media/books/stage-1/1-01.pdf'),
    ), partial);
  });
}
