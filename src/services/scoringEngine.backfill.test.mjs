import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateProgressRewardTotal,
  getFamilyVideoRewardPoints,
  getStageRewardPoints,
  reconcileScoreWithProgress,
} from './scoringEngine.js';

test('calculateProgressRewardTotal counts historical rewards with stage metadata', () => {
  const metadata = {
    books: [{ id: '1-01', stage: 3 }],
    videos: [{ id: 'fs2-01', familyStage: 2, durationSeconds: 121 }],
  };
  const total = calculateProgressRewardTotal(
    {
      '1-01': {
        bookRewardClaimed: true,
        quizAnswers: { q1: true, q2: true },
        speechAnswers: { school: true, kipper: true },
      },
      'fs2-01': {
        videoDone: true,
      },
    },
    metadata
  );

  assert.equal(
    total,
    getStageRewardPoints(3) +
      (2 * getStageRewardPoints(3)) +
      (2 * getStageRewardPoints(3)) +
      getFamilyVideoRewardPoints(2, 121)
  );
});

test('calculateProgressRewardTotal uses stored video reward points before fallback metadata', () => {
  const total = calculateProgressRewardTotal({
    'fs1-01': {
      videoDone: true,
      videoRewardPoints: 12,
      durationSeconds: 249,
      familyStage: 1,
    },
  });

  assert.equal(total, 12);
});

test('reconcileScoreWithProgress backfills missing points into lifetime and spendable totals', () => {
  const metadata = {
    books: [{ id: '1-01', stage: 3 }],
  };
  const progress = {
    '1-01': {
      bookRewardClaimed: true,
      quizAnswers: { q1: true, q2: true },
      speechAnswers: { school: true, kipper: true },
    },
  };

  const reconciled = reconcileScoreWithProgress(
    {
      totalScore: 20,
      spendableStars: 20,
      lifetimeStarsEarned: 20,
      streak: 1,
      unlockedStickers: [],
      rewardInventory: {},
      rewardUsageCounts: {},
      pendingStickerPicks: 0,
      pickedStickerIds: [],
    },
    progress,
    metadata
  );

  assert.equal(reconciled.totalScore, 40);
  assert.equal(reconciled.spendableStars, 40);
  assert.equal(reconciled.lifetimeStarsEarned, 40);

  const alreadyHigher = reconcileScoreWithProgress(
    {
      totalScore: 40,
      spendableStars: 40,
      lifetimeStarsEarned: 40,
      streak: 1,
      unlockedStickers: [],
      rewardInventory: {},
      rewardUsageCounts: {},
      pendingStickerPicks: 0,
      pickedStickerIds: [],
    },
    progress,
    metadata
  );

  assert.equal(alreadyHigher.totalScore, 40);
  assert.equal(alreadyHigher.spendableStars, 40);
  assert.equal(alreadyHigher.lifetimeStarsEarned, 40);
});
