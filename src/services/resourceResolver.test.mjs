import test from 'node:test';
import assert from 'node:assert/strict';
import { createResourceResolver } from './resourceResolver.js';

function setup(overrides = {}) {
  const calls = [];
  const writes = [];
  const resolver = createResourceResolver({
    primaryUrl: 'https://primary.test',
    fallbackUrl: 'https://fallback.test',
    getCached: () => null,
    setCached: (url) => writes.push(url),
    fetchImpl: async (url) => { calls.push(url); return { ok: true }; },
    ...overrides,
  });
  return { ...resolver, calls, writes };
}

test('local mode ignores the old NAS cache and probes only the local server', async () => {
  const resolver = setup({
    localBaseUrl: '/__local-media',
    getCached: () => 'https://old-nas.test',
  });
  assert.equal(resolver.getCachedBaseUrl(), null);
  assert.equal(await resolver.resolveBaseUrl(), '/__local-media');
  assert.deepEqual(resolver.calls, ['/__local-media/probe.txt']);
  assert.deepEqual(resolver.writes, []);
});

test('failed local probe rejects without falling back to NAS, then can retry', async () => {
  let reachable = false;
  const resolver = setup({
    localBaseUrl: '/__local-media',
    getCached: () => 'https://old-nas.test',
    fetchImpl: async () => ({ ok: reachable }),
  });
  await assert.rejects(resolver.resolveBaseUrl(), /OXFORD_MEDIA_DIR/);
  // Let rejected-promise callbacks run: node:test fails on unhandled rejections.
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(resolver.getCachedBaseUrl(), null);
  reachable = true;
  assert.equal(await resolver.resolveBaseUrl(true), '/__local-media');
});

test('production/default mode preserves primary, fallback and cached NAS resolution', async () => {
  const primary = setup();
  assert.equal(await primary.resolveBaseUrl(), 'https://primary.test');
  assert.deepEqual(primary.writes, ['https://primary.test']);
  const fallback = setup({ fetchImpl: async (url) => ({ ok: url.includes('fallback') }) });
  assert.equal(await fallback.resolveBaseUrl(), 'https://fallback.test');
  const cached = setup({
    getCached: () => 'https://cached.test',
    fetchImpl: async () => ({ ok: false }),
  });
  assert.equal(await cached.resolveBaseUrl(), 'https://cached.test');
  const unavailable = setup({ fetchImpl: async () => ({ ok: false }) });
  await assert.rejects(unavailable.resolveBaseUrl(), /Cannot reach NAS/);
});

test('concurrent probes are deduplicated and forced retries bypass a fresh result', async () => {
  let finish;
  const resolver = setup({ fetchImpl: () => new Promise((resolve) => { finish = resolve; }) });
  const first = resolver.resolveBaseUrl();
  assert.equal(resolver.resolveBaseUrl(true), first);
  finish({ ok: true });
  await first;
  assert.equal(await resolver.resolveBaseUrl(), 'https://primary.test');
  const forced = resolver.resolveBaseUrl(true);
  finish({ ok: true });
  assert.equal(await forced, 'https://primary.test');
});

test('local probe timeout surfaces an error and identical NAS addresses are not probed twice', async () => {
  const local = setup({
    localBaseUrl: '/__local-media', timeout: 5,
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }),
  });
  await assert.rejects(local.resolveBaseUrl(), /Cannot reach the local library/);
  let count = 0;
  const remote = setup({
    fallbackUrl: 'https://primary.test',
    fetchImpl: async () => { count += 1; throw new TypeError('Network error'); },
  });
  await assert.rejects(remote.resolveBaseUrl(), /Cannot reach NAS/);
  assert.equal(count, 1);
});
