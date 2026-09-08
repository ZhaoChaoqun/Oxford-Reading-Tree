import assert from 'node:assert/strict';

import { parseModelResponse } from '../lib/response-parser.mjs';

const raw = `\`\`\`json
{
  "title": "At School",
  "quizItems": [
    {
      "type": "image",
      "pageImage": 3,
      "question": "Where are the children?",
      "options": ["At school", "At home", "At the zoo"],
      "answer": 0,
      "evidencePages": [3]
    },
    {
      "type": "text",
      "question": "Who is in the story?",
      "options": ["Biff", "Chip", "Floppy"],
      "answer": 1,
      "evidencePages": [1, 2]
    }
  ],
  "keywords": ["school", "teacher", "book"]
}
\`\`\``;

const parsed = parseModelResponse(raw);
assert.equal(parsed.title, 'At School');
assert.equal(parsed.quiz.q1.answer, 0);
assert.equal(parsed.quiz.q2.answer, 1);
assert.deepEqual(parsed.quiz.keywords, ['school', 'teacher', 'book']);

const stage3Raw = JSON.stringify({
  title: 'The Duck Race',
  quizItems: [
    {
      type: 'text',
      question: 'What happened?',
      options: ['The duck won', 'The dog ran', 'The car stopped', 'The rain fell'],
      answer: 0,
      evidencePages: [1],
    },
    {
      type: 'text',
      question: 'Who helped?',
      options: ['Biff', 'Chip', 'Kipper', 'Floppy'],
      answer: 2,
      evidencePages: [2],
    },
  ],
  keywords: ['duck', 'race', 'help'],
});

const parsedStage3 = parseModelResponse(stage3Raw, { stage: 3 });
assert.equal(parsedStage3.quiz.q1.options.length, 4);
assert.equal(parsedStage3.quiz.q2.answer, 2);

const badRaw = JSON.stringify({
  title: 'Bad Quiz',
  quizItems: [
    {
      type: 'text',
      question: 'Pick one.',
      options: ['A', 'B'],
      answer: 2,
      evidencePages: [1],
    },
  ],
  keywords: ['one', 'two', 'three'],
});

assert.throws(() => parseModelResponse(badRaw), /quizItems must contain 2 to 4 items|answer index/i);

assert.throws(
  () => parseModelResponse(raw, { stage: 3 }),
  /stage 3 must contain exactly 4 options/i
);
