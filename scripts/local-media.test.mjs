import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, symlink, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLocalMediaMiddleware, createMediaMap, LOCAL_MEDIA_BASE } from './local-media.mjs';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'ort-local-media-'));
  const library = join(directory, 'library');
  await mkdir(join(library, 'L1'), { recursive: true });
  const pdf = Buffer.from('%PDF-1.7\nsample file\n%%EOF');
  await writeFile(join(library, 'L1', "Kipper's Diary.pdf"), pdf);
  await writeFile(join(library, 'L1', "Kipper's Diary.mp3"), 'ID3sample audio');
  await writeFile(join(library, 'L1', 'Pointer.pdf'),
    'version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 100\n');
  await writeFile(join(directory, 'secret.pdf'), 'not part of the library');
  await symlink(join(directory, 'secret.pdf'), join(library, 'L1', 'Link.pdf'));
  await mkdir(join(library, 'Videos', 'Family-Stage-1'), { recursive: true });
  await writeFile(join(library, 'Videos', 'Family-Stage-1', 'Episode 1.mp4'), '1234ftypvideo');
  const files = createMediaMap([
    { stage: 1, title: "Kipper's Diary", pdfFile: 'books/1.pdf', audioFile: 'books/1.mp3' },
    { stage: 1, title: 'Absent', pdfFile: 'books/missing.pdf' },
    { stage: 1, title: 'Link', pdfFile: 'books/link.pdf' },
    { stage: 1, title: 'Pointer', pdfFile: 'books/pointer.pdf' },
  ], [{ familyStage: 1, title: 'Episode 1', videoFile: 'videos/1.mp4' }]);
  const middleware = createLocalMediaMiddleware({ directory: library, files });
  const server = createServer((req, res) => middleware(req, res, () => {
    res.writeHead(418);
    res.end('next middleware');
  }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  return { library, url, pdf, get: (path, init) => fetch(`${url}${LOCAL_MEDIA_BASE}/${path}`, init) };
}

test('local server maps catalog IDs to title filenames and serves probe/HEAD', async (t) => {
  const { get, pdf, url } = await fixture(t);
  assert.equal((await get('probe.txt', { method: 'HEAD' })).status, 200);
  const response = await get('books/1.pdf');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
  const head = await get('books/1.mp3', { method: 'HEAD' });
  assert.equal(head.headers.get('content-type'), 'audio/mpeg');
  assert.equal(Number(head.headers.get('content-length')), 15);
  assert.equal(await head.text(), '');
  assert.equal((await get('videos/1.mp4')).headers.get('content-type'), 'video/mp4');
  assert.equal((await fetch(`${url}/src/main.jsx`)).status, 418);
});

test('media byte ranges support seeking, suffixes, open ends and HEAD', async (t) => {
  const { get, pdf } = await fixture(t);
  for (const [range, start, end] of [
    ['bytes=0-4', 0, 4],
    ['bytes=5-', 5, pdf.length - 1],
    ['bytes=-5', pdf.length - 5, pdf.length - 1],
    ['bytes=0-99999', 0, pdf.length - 1],
  ]) {
    const response = await get('books/1.pdf', { headers: { Range: range } });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('content-range'), `bytes ${start}-${end}/${pdf.length}`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf.subarray(start, end + 1));
  }
  const head = await get('videos/1.mp4', { method: 'HEAD', headers: { Range: 'bytes=0-3' } });
  assert.equal(head.status, 206);
  assert.equal(head.headers.get('content-length'), '4');
  assert.equal(await head.text(), '');
  for (const range of ['bytes=9999-', 'bytes=9-1', 'bytes=-0', 'bytes=0-1,3-4', 'bytes=-']) {
    const response = await get('books/1.pdf', { headers: { Range: range } });
    assert.equal(response.status, 416);
    assert.equal(response.headers.get('content-range'), `bytes */${pdf.length}`);
  }
});

test('missing resources return real errors rather than the SPA HTML', async (t) => {
  const { get, library } = await fixture(t);
  assert.equal((await get('books/missing.pdf')).status, 404);
  assert.equal((await get('books/unknown.pdf')).status, 404);
  const pointer = await get('books/pointer.pdf');
  assert.equal(pointer.status, 409);
  assert.match(await pointer.text(), /git lfs pull/);
  await rm(library, { recursive: true });
  assert.equal((await get('probe.txt')).status, 503);
});

test('only catalog files are readable, including through encoded URLs and symlinks', async (t) => {
  const { get } = await fixture(t);
  assert.equal((await get('books/link.pdf')).status, 403);
  assert.equal((await get('%2e%2e%2fsecret.pdf')).status, 404);
  assert.equal((await get('L1/Kipper%27s%20Diary.pdf')).status, 404);
  assert.equal((await get('%00')).status, 404);
  assert.equal((await get('%E0%A4%A')).status, 400);
  assert.equal((await get('books/1.pdf', { method: 'POST' })).status, 405);
});

test('all real catalog resources map to distinct organized media filenames', async () => {
  const books = JSON.parse(await readFile(new URL('../src/data/books.json', import.meta.url))).books;
  const videos = JSON.parse(await readFile(new URL('../src/data/videos.json', import.meta.url))).videos;
  const files = createMediaMap(books, videos);
  assert.equal(files.size, books.length * 2 + videos.length);
  assert.equal(new Set(files.values()).size, files.size);
  assert.equal(files.get('books/stage-1/1-01.pdf'), 'L1/At School.pdf');
  assert.equal(files.get('videos/family-stage-1/fs1-01.mp4'),
    'Videos/Family-Stage-1/Family Stage 1 - Episode 1.mp4');
});
