import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createProductionMediaServer, loadCatalog } from './production-media.mjs';

test('CLI entrypoints execute through the production current-release symlink', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'ort-entrypoint-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await symlink(fileURLToPath(new URL('..', import.meta.url)), join(directory, 'current'), 'dir');
  const env = { ...process.env };
  delete env.OXFORD_MEDIA_DIR;
  for (const name of ['production-media.mjs', 'verify-media.mjs']) {
    await assert.rejects(
      promisify(execFile)(process.execPath, [join(directory, 'current', 'scripts', name)], { env }),
      (error) => error.code === 1 && error.stderr.includes('OXFORD_MEDIA_DIR is required'),
    );
  }
});

test('production server exposes only catalog media, not repository files or SPA fallbacks', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'ort-production-'));
  await mkdir(join(directory, 'L1'));
  await writeFile(join(directory, '.env'), 'SECRET=private');
  await writeFile(join(directory, 'L1', 'At School.pdf'), '%PDF-1.7 real bytes');
  const server = createProductionMediaServer({ directory, files: await loadCatalog() });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['/.env', '/.git/config', '/src/data/books.json', '/L1/At%20School.pdf', '/__local-media/%2e%2e%2f.env']) {
    assert.equal((await fetch(base + path)).status, 404);
  }
  const response = await fetch(`${base}/__local-media/books/stage-1/1-01.pdf`, { headers: { Range: 'bytes=0-3' } });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(await response.text(), '%PDF');
  assert.equal((await fetch(`${base}/__local-media/probe.txt`, { method: 'HEAD' })).status, 200);
  assert.equal((await fetch(`${base}/__local-media/books/stage-7/7-01.pdf`)).status, 404);
});

test('every catalog path matches the deployment manifest, including the 11 absent PDFs', async () => {
  const files = await loadCatalog();
  const manifest = JSON.parse(await readFile(new URL('../Resource-Status.json', import.meta.url)));
  assert.deepEqual([...files.values()].sort(), manifest.map((file) => file.path).sort());
  assert.equal(manifest.filter((file) => file.status === 'available').length, 525);
  assert.equal(manifest.filter((file) => file.status === 'missing' && file.type === 'pdf').length, 11);
});
