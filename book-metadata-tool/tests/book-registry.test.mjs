import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveBook } from '../lib/book-registry.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resourcesRoot = path.resolve(__dirname, '..', '..', '..', 'OxfordTree');

const book101 = resolveBook('1-01', { resourcesRoot });
assert.equal(book101.stage, 1);
assert.match(book101.pdfPath, /books[\\/]stage-1[\\/]1-01\.pdf$/);

const book131 = resolveBook('1-31', { resourcesRoot });
assert.equal(book131.stage, 1);
assert.match(book131.pdfPath, /books[\\/]stage-1[\\/]1-31\.pdf$/);

const book327 = resolveBook('3-27', { resourcesRoot });
assert.equal(book327.stage, 3);
assert.match(book327.pdfPath, /books[\\/]stage-3[\\/]3-27\.pdf$/);

assert.throws(
  () => resolveBook('9-99', { resourcesRoot }),
  /Could not find PDF/i,
);