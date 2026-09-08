import assert from 'node:assert/strict';

import {
  SCHEMA_VERSION,
  migrateProgress,
  migrateScore,
} from './storageService.js';
import { applyUnitCompleteStreak } from './scoringEngine.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

runTest('migrateScore upgrades legacy state with repeatable reward defaults', () => {
  const migrated = migrateScore(
    {
      _v: 1,
      totalScore: 120,
      streak: 4,
      lastActiveDate: '2026-03-14',
      unlockedStickers: ['sticker-01', 'sticker-02'],
    },
    {
      totalScore: 0,
      lifetimeStarsEarned: 0,
      spendableStars: 0,
      streak: 0,
      lastActiveDate: null,
      unlockedStickers: [],
      rewardInventory: {},
      rewardUsageCounts: {},
      pendingStickerPicks: 0,
      pickedStickerIds: [],
    }
  );

  assert.equal(migrated._v, SCHEMA_VERSION);
  assert.equal(migrated.totalScore, 120);
  assert.equal(migrated.spendableStars, 120);
  assert.equal(migrated.lifetimeStarsEarned, 120);
  assert.equal(migrated.pendingStickerPicks, 0);
  assert.deepEqual(migrated.pickedStickerIds, []);
  assert.deepEqual(migrated.unlockedStickers, ['sticker-02']);
  assert.deepEqual(migrated.rewardInventory, { 'sticker-01': 1 });
  assert.deepEqual(migrated.rewardUsageCounts, {});
});

runTest('migrateProgress adds quiz and speech answer maps with defaults', () => {
  const migrated = migrateProgress({
    '1-01': {
      status: 'completed',
      currentPage: 12,
      quizPassed: true,
      speechPassed: false,
      videoDone: true,
      scoreEarned: 25,
    },
  });

  assert.deepEqual(migrated['1-01'].quizAnswers, {});
  assert.deepEqual(migrated['1-01'].speechAnswers, {});
});

runTest('applyUnitCompleteStreak is a no-op when the same day already counted', () => {
  const result = applyUnitCompleteStreak(
    {
      streak: 5,
      lastActiveDate: '2026-03-15',
      pendingStickerPicks: 1,
    },
    '2026-03-15'
  );

  assert.equal(result.changed, false);
  assert.equal(result.streak, 5);
  assert.equal(result.pendingStickerPicks, 1);
});

runTest('applyUnitCompleteStreak increments streak and awards a milestone pick', () => {
  const result = applyUnitCompleteStreak(
    {
      streak: 4,
      lastActiveDate: '2026-03-14',
      pendingStickerPicks: 0,
    },
    '2026-03-15'
  );

  assert.equal(result.changed, true);
  assert.equal(result.streak, 5);
  assert.equal(result.pendingStickerPicks, 1);
  assert.equal(result.newPicks, 1);
});
