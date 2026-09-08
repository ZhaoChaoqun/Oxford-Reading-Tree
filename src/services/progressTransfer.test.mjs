import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProgressTransferPayload,
  parseProgressTransferPayload,
  summarizeProgressTransferData,
} from './progressTransfer.js';

test('createProgressTransferPayload encodes score and progress snapshot', () => {
  const payload = createProgressTransferPayload({
    score: {
      totalScore: 180,
      spendableStars: 180,
      lifetimeStarsEarned: 240,
      streak: 4,
      lastActiveDate: '2026-03-16',
      unlockedStickers: ['emoji-01'],
      rewardInventory: { 'reward-02': 2 },
      rewardUsageCounts: { 'reward-02': 1 },
      pendingStickerPicks: 1,
      pickedStickerIds: ['png-02'],
    },
    progress: {
      '1-01': {
        status: 'completed',
        currentPage: 6,
        quizPassed: true,
        speechPassed: true,
        videoDone: false,
        bookRewardClaimed: true,
        scoreEarned: 15,
        quizAnswers: { q1: true },
        speechAnswers: { school: true },
      },
    },
  });

  const parsed = parseProgressTransferPayload(payload);
  assert.equal(parsed.score.totalScore, 180);
  assert.equal(parsed.score.spendableStars, 180);
  assert.equal(parsed.score.lifetimeStarsEarned, 240);
  assert.deepEqual(parsed.score.rewardInventory, { 'reward-02': 2 });
  assert.equal(parsed.progress['1-01'].quizPassed, true);
});

test('parseProgressTransferPayload rejects malformed payloads', () => {
  assert.throws(() => parseProgressTransferPayload('not-valid-base64'), /Invalid transfer code/);
});

test('summarizeProgressTransferData returns human review metrics before import', () => {
  const summary = summarizeProgressTransferData({
    exportedAt: '2026-03-16T08:30:00.000Z',
    score: {
      totalScore: 180,
      spendableStars: 180,
      lifetimeStarsEarned: 260,
      streak: 4,
      lastActiveDate: '2026-03-16',
      unlockedStickers: ['emoji-01'],
      rewardInventory: { 'reward-02': 2 },
      rewardUsageCounts: { 'reward-02': 1 },
      pendingStickerPicks: 1,
      pickedStickerIds: ['png-02'],
    },
    progress: {
      '1-01': {
        status: 'completed',
        currentPage: 6,
        quizPassed: true,
        speechPassed: true,
        videoDone: false,
        bookRewardClaimed: true,
        scoreEarned: 15,
        quizAnswers: { q1: true },
        speechAnswers: { school: true },
      },
      '1-02': {
        status: 'in-progress',
        currentPage: 2,
        quizPassed: false,
        speechPassed: true,
        videoDone: false,
        bookRewardClaimed: false,
        scoreEarned: 5,
        quizAnswers: {},
        speechAnswers: { gate: true },
      },
    },
  });

  assert.deepEqual(summary, {
    exportedAt: '2026-03-16T08:30:00.000Z',
    totalScore: 180,
    spendableStars: 180,
    lifetimeStarsEarned: 260,
    streak: 4,
    completedUnits: 1,
    quizPassedUnits: 1,
    speechPassedUnits: 2,
    rewardCount: 4,
  });
});
