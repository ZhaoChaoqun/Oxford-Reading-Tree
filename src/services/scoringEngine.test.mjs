import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcBookPoints,
  calcQuizPoints,
  calcVideoPoints,
  getFamilyVideoRewardPoints,
  getStageRewardPoints,
  POINTS,
} from './scoringEngine.js';

test('book, quiz, and speaking rewards scale by stage', () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((stage) => getStageRewardPoints(stage)),
    [6, 7, 8, 9, 10, 11, 13, 14, 16]
  );

  assert.equal(calcBookPoints(10, 10, 4), 9);
  assert.equal(calcBookPoints(9, 10, 4), 0);
  assert.equal(calcQuizPoints(3, true, 4), 36);
});

test('family video rewards scale by duration and family stage', () => {
  assert.equal(getFamilyVideoRewardPoints(1, 30), 5);
  assert.equal(getFamilyVideoRewardPoints(1, 121), 6);
  assert.equal(getFamilyVideoRewardPoints(2, 121), 7);
  assert.equal(getFamilyVideoRewardPoints(6, 121), 11);

  assert.equal(calcVideoPoints(0.89, { familyStage: 6, durationSeconds: 121 }), 0);
  assert.equal(calcVideoPoints(0.9, { familyStage: 6, durationSeconds: 121 }), 11);
});

test('legacy flat point constants remain as stage 1 fallbacks', () => {
  assert.equal(POINTS.BOOK_COMPLETE, 6);
  assert.equal(POINTS.QUIZ_CORRECT, 6);
  assert.equal(POINTS.SPEECH_CORRECT, 6);
  assert.equal(POINTS.SPEECH_PASS, 6);
  assert.equal(POINTS.VIDEO_COMPLETE, 5);
});
