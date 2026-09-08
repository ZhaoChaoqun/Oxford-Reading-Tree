import assert from 'node:assert/strict';

import { buildMessages } from '../lib/prompt-builder.mjs';

const messages = buildMessages({
  model: 'deepseek-ai/DeepSeek-OCR',
  bookId: '1-01',
  stage: 1,
  totalPages: 16,
  pdfDataUrl: 'data:application/pdf;base64,AAAA',
  pageTexts: [],
});

assert.equal(messages.length, 2);
const [system, user] = messages;

assert.match(system.content, /valid JSON only/i);
assert.equal(Array.isArray(user.content), true);
assert.equal(user.content[0].type, 'image_url');
assert.equal(user.content[0].image_url.url, 'data:application/pdf;base64,AAAA');
assert.equal(user.content[1].type, 'text');
assert.match(user.content[1].text, /2-4 quiz items/i);
assert.match(user.content[1].text, /exactly 3 answer options/i);
assert.match(user.content[1].text, /3-8 keywords/i);
assert.match(user.content[1].text, /under 6 years old/i);
assert.match(user.content[1].text, /0-based/i);
assert.match(user.content[1].text, /evidencePages/i);
assert.match(user.content[1].text, /<image>/i);

const stage3Messages = buildMessages({
  model: 'deepseek-ai/DeepSeek-OCR',
  bookId: '3-01',
  stage: 3,
  totalPages: 24,
  pdfDataUrl: 'data:application/pdf;base64,BBBB',
  pageTexts: [],
});

assert.match(stage3Messages[1].content[1].text, /exactly 4 answer options/i);
