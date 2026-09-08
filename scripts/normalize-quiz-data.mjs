import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const booksPath = resolve('src/data/books.json');

const DISTRACTORS = {
  where: ['Somewhere else', 'In another place', 'At a different place', 'Far away'],
  who: ['Someone else', 'Another person', 'A different character', 'Another friend'],
  why: ['For another reason', 'Because of something else', 'For a different reason', 'Because they forgot'],
  how: ['In another way', 'A different way', 'By doing something else', 'Very carefully'],
  when: ['At another time', 'On another day', 'Later that day', 'In the morning'],
  what: ['Something else', 'A different thing', 'Another idea', 'A surprise'],
  default: ['Something else', 'A different answer', 'Another idea', 'A surprise'],
};

function getQuestionEntries(book) {
  return Object.entries(book.quiz ?? {})
    .filter(([key, value]) => /^q\d+$/.test(key) && value && typeof value === 'object')
    .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)));
}

function normalizeText(value) {
  return String(value).trim().toLowerCase();
}

function classifyQuestion(question) {
  const text = String(question).trim().toLowerCase();
  const firstWord = text.match(/^[a-z]+/)?.[0];
  return DISTRACTORS[firstWord] ? firstWord : 'default';
}

function pickDistractor(question, existingOptions, bookId, questionKey) {
  const existing = new Set(existingOptions.map(normalizeText));
  const pool = [
    ...DISTRACTORS[classifyQuestion(question)],
    ...DISTRACTORS.default,
    `Another answer for ${bookId}`,
    `A different answer for ${questionKey.toUpperCase()}`,
  ];

  return pool.find((option) => !existing.has(normalizeText(option)));
}

function rotate(values, amount) {
  if (values.length === 0) return values;
  const offset = amount % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}

function reorderOptions({ options, correctIndex, targetAnswerIndex, rotation }) {
  const correctOption = options[correctIndex];
  const wrongOptions = options.filter((_, index) => index !== correctIndex);
  const rotatedWrongOptions = rotate(wrongOptions, rotation);
  const nextOptions = [];
  let wrongIndex = 0;

  for (let index = 0; index < options.length; index += 1) {
    nextOptions[index] =
      index === targetAnswerIndex ? correctOption : rotatedWrongOptions[wrongIndex++];
  }

  return nextOptions;
}

const raw = await readFile(booksPath, 'utf8');
const booksData = JSON.parse(raw);
const stageQuestionCounts = new Map();

for (const book of booksData.books) {
  for (const [questionKey, question] of getQuestionEntries(book)) {
    if (!Array.isArray(question.options)) continue;

    const originalOptions = question.options.map((option) => String(option).trim());
    const originalAnswer = question.answer;
    if (!Number.isInteger(originalAnswer) || originalAnswer < 0 || originalAnswer >= originalOptions.length) {
      throw new Error(`${book.id} ${questionKey} has an invalid answer index.`);
    }

    const options = [...originalOptions];
    if (book.stage >= 3 && options.length < 4) {
      while (options.length < 4) {
        options.push(pickDistractor(question.question, options, book.id, questionKey));
      }
    }

    const stageSeen = stageQuestionCounts.get(book.stage) ?? 0;
    const targetAnswerIndex = stageSeen % options.length;
    stageQuestionCounts.set(book.stage, stageSeen + 1);

    question.options = reorderOptions({
      options,
      correctIndex: originalAnswer,
      targetAnswerIndex,
      rotation: stageSeen + Number(questionKey.slice(1)),
    });
    question.answer = targetAnswerIndex;
  }
}

await writeFile(booksPath, `${JSON.stringify(booksData, null, 2)}\n`, 'utf8');
