import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const booksData = JSON.parse(
  readFileSync(new URL('./books.json', import.meta.url), 'utf8')
);

function getQuestions(book) {
  return Object.entries(book.quiz ?? {})
    .filter(([key, value]) => /^q\d+$/.test(key) && value && typeof value === 'object')
    .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
    .map(([, question]) => question);
}

test('stage 3 and above quizzes have four options per question', () => {
  const offenders = [];

  for (const book of booksData.books) {
    if (book.stage < 3) continue;

    getQuestions(book).forEach((question, index) => {
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        offenders.push(`${book.id} q${index + 1}`);
      }
    });
  }

  assert.deepEqual(offenders, []);
});

test('quiz answer indexes point at unique non-empty options', () => {
  const offenders = [];

  for (const book of booksData.books) {
    getQuestions(book).forEach((question, index) => {
      const optionTexts = (question.options ?? []).map((option) => String(option).trim());
      const uniqueOptionCount = new Set(optionTexts.map((option) => option.toLowerCase())).size;
      const answerInRange =
        Number.isInteger(question.answer) &&
        question.answer >= 0 &&
        question.answer < optionTexts.length;

      if (
        !answerInRange ||
        optionTexts.some((option) => option === '') ||
        uniqueOptionCount !== optionTexts.length
      ) {
        offenders.push(`${book.id} q${index + 1}`);
      }
    });
  }

  assert.deepEqual(offenders, []);
});

test('quiz answers are not concentrated on one option within a stage', () => {
  const offenders = [];

  for (const stage of [...new Set(booksData.books.map((book) => book.stage))]) {
    const answerCounts = {};
    let questionCount = 0;

    for (const book of booksData.books.filter((entry) => entry.stage === stage)) {
      for (const question of getQuestions(book)) {
        answerCounts[question.answer] = (answerCounts[question.answer] ?? 0) + 1;
        questionCount += 1;
      }
    }

    const maxShare = Math.max(...Object.values(answerCounts)) / questionCount;
    if (maxShare > 0.7) {
      offenders.push({ stage, answerCounts, questionCount });
    }
  }

  assert.deepEqual(offenders, []);
});
