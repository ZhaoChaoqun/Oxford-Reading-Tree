import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createLocalMediaMiddleware, createMediaMap } from './local-media.mjs';

export async function loadCatalog() {
  const books = JSON.parse(await readFile(new URL('../src/data/books.json', import.meta.url))).books;
  const videos = JSON.parse(await readFile(new URL('../src/data/videos.json', import.meta.url))).videos;
  return createMediaMap(books, videos);
}

export function createProductionMediaServer({ directory, files, logger = console }) {
  const media = createLocalMediaMiddleware({ directory, files, logger });
  return createServer((req, res) => {
    media(req, res, () => {
      res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : 'Not found');
    }).catch((error) => {
      logger.error(`[media-server] ${error.message}`);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });
}

async function main() {
  if (!process.env.OXFORD_MEDIA_DIR) throw new Error('OXFORD_MEDIA_DIR is required.');
  const directory = await realpath(process.env.OXFORD_MEDIA_DIR);
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  const server = createProductionMediaServer({ directory, files: await loadCatalog() });
  server.listen(port, '127.0.0.1', () => console.log(`Media server listening on 127.0.0.1:${port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      server.close((error) => { process.exitCode = error ? 1 : 0; });
      setTimeout(() => server.closeAllConnections(), 10_000).unref();
    });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
