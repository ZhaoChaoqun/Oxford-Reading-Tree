import test from 'node:test';
import assert from 'node:assert/strict';

import {
  claimBookCompletionRewardInState,
  markQuizAnswerCorrectInState,
  markSpeechAnswerPassedInState,
} from '../services/progressRewardState.js';

test('claimBookCompletionRewardInState marks the book reward exactly once', () => {
  const first = claimBookCompletionRewardInState({}, '1-01');

  assert.equal(first.isNew, true);
  assert.equal(first.next['1-01'].bookRewardClaimed, true);
  assert.equal(first.next['1-01'].status, 'completed');

  const second = claimBookCompletionRewardInState(first.next, '1-01');

  assert.equal(second.isNew, false);
  assert.equal(second.next, first.next);
});

test('markQuizAnswerCorrectInState records each question only once', () => {
  const first = markQuizAnswerCorrectInState({}, '1-01', 'q1');

  assert.equal(first.isNew, true);
  assert.deepEqual(first.next['1-01'].quizAnswers, { q1: true });

  const second = markQuizAnswerCorrectInState(first.next, '1-01', 'q1');

  assert.equal(second.isNew, false);
  assert.equal(second.next, first.next);
});

test('markSpeechAnswerPassedInState records each word only once', () => {
  const first = markSpeechAnswerPassedInState({}, '1-01', 'school');

  assert.equal(first.isNew, true);
  assert.deepEqual(first.next['1-01'].speechAnswers, { school: true });

  const second = markSpeechAnswerPassedInState(first.next, '1-01', 'school');

  assert.equal(second.isNew, false);
  assert.equal(second.next, first.next);
});
