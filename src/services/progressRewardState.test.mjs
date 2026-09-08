import test from 'node:test';
import assert from 'node:assert/strict';

import {
  claimBookCompletionRewardInState,
  claimVideoCompletionRewardInState,
  markQuizAnswerCorrectInState,
  markSpeechAnswerPassedInState,
} from './progressRewardState.js';

test('claimBookCompletionRewardInState marks the book reward exactly once', () => {
  const first = claimBookCompletionRewardInState({}, '1-01');

  assert.equal(first.isNew, true);
  assert.equal(first.next['1-01'].bookRewardClaimed, true);
  assert.equal(first.next['1-01'].status, 'completed');

  const second = claimBookCompletionRewardInState(first.next, '1-01');

  assert.equal(second.isNew, false);
  assert.equal(second.next, first.next);
});

test('claimVideoCompletionRewardInState stores video reward details exactly once', () => {
  const first = claimVideoCompletionRewardInState({}, 'fs1-01', {
    durationSeconds: 249,
    familyStage: 1,
    rewardPoints: 10,
  });

  assert.equal(first.isNew, true);
  assert.equal(first.next['fs1-01'].videoDone, true);
  assert.equal(first.next['fs1-01'].status, 'completed');
  assert.equal(first.next['fs1-01'].durationSeconds, 249);
  assert.equal(first.next['fs1-01'].familyStage, 1);
  assert.equal(first.next['fs1-01'].videoRewardPoints, 10);

  const second = claimVideoCompletionRewardInState(first.next, 'fs1-01', {
    durationSeconds: 999,
    familyStage: 6,
    rewardPoints: 99,
  });

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
