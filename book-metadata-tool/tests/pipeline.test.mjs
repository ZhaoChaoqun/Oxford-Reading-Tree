import assert from 'node:assert/strict';

import { generateBookMetadata } from '../lib/pipeline.mjs';

const result = await generateBookMetadata({
  bookId: '1-01',
  model: 'deepseek-ai/DeepSeek-OCR',
  resolveBook: () => ({ bookId: '1-01', stage: 1, pdfPath: 'E:/OxfordTree/OxfordTree/books/stage-1/1-01.pdf' }),
  extractPdf: async () => ({ totalPages: 16, pageTexts: [], pdfDataUrl: 'data:application/pdf;base64,AAAA' }),
  buildMessages: ({ model, pdfDataUrl }) => {
    assert.equal(model, 'deepseek-ai/DeepSeek-OCR');
    assert.equal(pdfDataUrl, 'data:application/pdf;base64,AAAA');
    return [{ role: 'system', content: 'sys' }, { role: 'user', content: [{ type: 'image_url', image_url: { url: pdfDataUrl } }, { type: 'text', text: 'prompt' }] }];
  },
  callModel: async () => ({
    latencyMs: 321,
    rawResponseText: '{"title":"At School","quizItems":[{"type":"text","question":"Where?","options":["School","Home"],"answer":0,"evidencePages":[1]},{"type":"text","question":"Who?","options":["Biff","Chip"],"answer":1,"evidencePages":[1]}],"keywords":["school","biff","chip"]}',
    rawResponseJson: { id: 'resp-1' },
    requestBody: { model: 'deepseek-ai/DeepSeek-OCR' },
  }),
  parseModelResponse: () => ({
    title: 'At School',
    quiz: {
      q1: { type: 'text', question: 'Where?', options: ['School', 'Home'], answer: 0, evidencePages: [1] },
      q2: { type: 'text', question: 'Who?', options: ['Biff', 'Chip'], answer: 1, evidencePages: [1] },
      keywords: ['school', 'biff', 'chip'],
    },
  }),
  writeRawArtifact: async ({ bookId, model, payload }) => {
    assert.equal(bookId, '1-01');
    assert.equal(model, 'deepseek-ai/DeepSeek-OCR');
    assert.equal(payload.latencyMs, 321);
    return 'generated/raw/1-01__artifact.json';
  },
});

assert.equal(result.id, '1-01');
assert.equal(result.generationMeta.latencyMs, 321);
assert.equal(result.generationMeta.rawArtifactFile, 'generated/raw/1-01__artifact.json');
assert.equal(result.quiz.q1.answer, 0);