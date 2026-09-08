function extractJsonText(rawText) {
  const fencedMatch = String(rawText).match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = String(rawText).indexOf('{');
  const lastBrace = String(rawText).lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return String(rawText).slice(firstBrace, lastBrace + 1);
  }

  throw new Error('Could not locate JSON object in model response.');
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function normalizeQuizItem(item, index, { stage } = {}) {
  const key = `quizItems[${index}]`;
  const type = item?.type;
  if (type !== 'image' && type !== 'text') {
    throw new Error(`${key}.type must be image or text.`);
  }

  assertNonEmptyString(item?.question, `${key}.question`);

  if (!Array.isArray(item?.options) || item.options.length < 2 || item.options.length > 4) {
    throw new Error(`${key}.options must contain 2 to 4 strings.`);
  }
  const expectedOptionCount = stage >= 3 ? 4 : 3;
  if (item.options.length !== expectedOptionCount) {
    throw new Error(`${key}.options for stage ${stage} must contain exactly ${expectedOptionCount} options.`);
  }
  item.options.forEach((option, optionIndex) => assertNonEmptyString(option, `${key}.options[${optionIndex}]`));

  if (!Number.isInteger(item?.answer) || item.answer < 0 || item.answer >= item.options.length) {
    throw new Error(`${key}.answer index is invalid.`);
  }

  if (!Array.isArray(item?.evidencePages) || item.evidencePages.length === 0 || item.evidencePages.some((page) => !Number.isInteger(page) || page < 1)) {
    throw new Error(`${key}.evidencePages must contain one or more positive integers.`);
  }

  const normalized = {
    type,
    question: item.question.trim(),
    options: item.options.map((option) => option.trim()),
    answer: item.answer,
    evidencePages: [...new Set(item.evidencePages)],
  };

  if (type === 'image') {
    if (!Number.isInteger(item?.pageImage) || item.pageImage < 1) {
      throw new Error(`${key}.pageImage must be a positive integer for image questions.`);
    }
    normalized.pageImage = item.pageImage;
  }

  return normalized;
}

export function parseModelResponse(rawText, { stage = 1 } = {}) {
  const parsed = JSON.parse(extractJsonText(rawText));
  assertNonEmptyString(parsed?.title, 'title');

  if (!Array.isArray(parsed?.quizItems) || parsed.quizItems.length < 2 || parsed.quizItems.length > 4) {
    throw new Error('quizItems must contain 2 to 4 items.');
  }

  if (!Array.isArray(parsed?.keywords) || parsed.keywords.length < 3 || parsed.keywords.length > 8) {
    throw new Error('keywords must contain 3 to 8 items.');
  }

  const quiz = {};
  parsed.quizItems.forEach((item, index) => {
    quiz[`q${index + 1}`] = normalizeQuizItem(item, index, { stage });
  });

  quiz.keywords = parsed.keywords.map((keyword, index) => {
    assertNonEmptyString(keyword, `keywords[${index}]`);
    return keyword.trim();
  });

  return {
    title: parsed.title.trim(),
    quiz,
  };
}
