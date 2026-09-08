import assert from 'node:assert/strict';

import { parseCliArgs } from '../lib/config.mjs';

const parsed = parseCliArgs([
  '--book-ids',
  '1-01,1-31,3-27',
  '--model',
  'PaddlePaddle/PaddleOCR-VL-1.5',
  '--extract-only',
]);

assert.deepEqual(parsed.bookIds, ['1-01', '1-31', '3-27']);
assert.equal(parsed.model, 'PaddlePaddle/PaddleOCR-VL-1.5');
assert.equal(parsed.extractOnly, true);