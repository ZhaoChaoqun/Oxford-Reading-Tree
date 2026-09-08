import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadCatalog } from './production-media.mjs';

export async function verifyMedia(directory) {
  const root = await realpath(directory);
  const manifest = JSON.parse(await readFile(new URL('../Resource-Status.json', import.meta.url)));
  const files = await loadCatalog();
  const entries = new Map(manifest.map((entry) => [entry.path, entry]));
  if (entries.size !== manifest.length || files.size !== entries.size) {
    throw new Error('Catalog and manifest counts differ or contain duplicates.');
  }
  let available = 0;
  let missing = 0;
  let bytes = 0;
  for (const path of files.values()) {
    const entry = entries.get(path);
    if (!entry) throw new Error(`Catalog file not in manifest: ${path}`);
    if (entry.status === 'missing' && entry.type === 'pdf') { missing++; continue; }
    if (entry.status !== 'available') throw new Error(`Unexpected resource status: ${path}`);
    const actual = await realpath(resolve(root, path));
    const child = relative(root, actual);
    if (!child || child === '..' || child.startsWith('../') || isAbsolute(child)) {
      throw new Error(`Media escapes root: ${path}`);
    }
    const info = await stat(actual);
    if (!info.isFile() || info.size !== entry.bytes) throw new Error(`Media size mismatch: ${path}`);
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(actual)) hash.update(chunk);
    if (hash.digest('hex') !== entry.sha256) throw new Error(`Media SHA-256 mismatch: ${path}`);
    available++;
    bytes += info.size;
  }
  return { available, missing, bytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  if (!process.env.OXFORD_MEDIA_DIR) throw new Error('OXFORD_MEDIA_DIR is required.');
  console.log(JSON.stringify(await verifyMedia(process.env.OXFORD_MEDIA_DIR)));
}
