function buildInstructionText({ bookId, stage, totalPages }) {
  const optionCount = stage >= 3 ? 4 : 3;
  const schemaOptions = Array.from({ length: optionCount }, () => '"..."').join(',');
  const schemaHint = `{"title":"...","quizItems":[{"type":"image","pageImage":3,"question":"...","options":[${schemaOptions}],"answer":0,"evidencePages":[3]}],"keywords":["..."]}`;

  return [
    '<image>',
    '<|grounding|>',
    `Analyze Oxford Tree book ${bookId} at stage ${stage}.`,
    `The PDF has ${totalPages} pages.`,
    'Create 2-4 quiz items and 3-8 keywords.',
    `Each quiz item must include exactly ${optionCount} answer options.`,
    'Vary the correct answer position across A/B/C/D where available; do not put every correct answer in the same position.',
    'Every quiz item must be answerable from the PDF and suitable for children under 6 years old.',
    'Use short, simple wording and avoid abstract reasoning.',
    'The answer field must use a 0-based index.',
    'Each quiz item must include evidencePages to show which PDF pages support the answer.',
    'Return valid JSON only with this shape:',
    schemaHint,
  ].join('\n');
}

function formatPageTexts(pageTexts) {
  return pageTexts
    .map(({ pageNumber, text }) => `Page ${pageNumber}:\n${String(text).trim()}`)
    .join('\n\n');
}

export function buildMessages({ model, bookId, stage, totalPages, pageTexts = [], pdfDataUrl }) {
  const systemContent = [
    "You are an expert children's reading coach and curriculum editor.",
    'Return valid JSON only.',
    'Do not wrap the JSON in markdown fences.',
  ].join(' ');

  if (model === 'deepseek-ai/DeepSeek-OCR') {
    return [
      { role: 'system', content: systemContent },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: pdfDataUrl } },
          { type: 'text', text: buildInstructionText({ bookId, stage, totalPages }) },
        ],
      },
    ];
  }

  const userContent = [
    `Analyze Oxford Tree book ${bookId} at stage ${stage}.`,
    `The PDF has ${totalPages} pages.`,
    'Create 2-4 quiz items and 3-8 keywords.',
    `Each quiz item must include exactly ${stage >= 3 ? 4 : 3} answer options.`,
    'Vary the correct answer position across A/B/C/D where available; do not put every correct answer in the same position.',
    'Every quiz item must be answerable from the PDF and suitable for children under 6 years old.',
    'Use short, simple wording and avoid abstract reasoning.',
    'The answer field must use a 0-based index.',
    'Each quiz item must include evidencePages to show which PDF pages support the answer.',
    'Return valid JSON only.',
    '',
    'PDF content:',
    formatPageTexts(pageTexts),
  ].join('\n');

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ];
}
