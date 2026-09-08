import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateUnlockedMilestoneIds,
  getMilestoneThreshold,
  normalizeRewardCounts,
  redeemRepeatableRewardState,
  useRepeatableRewardState,
} from './rewardLedger.js';

const rewards = [
  { id: 'sticker-02', type: 'milestone', threshold: 300 },
  { id: 'sticker-03', type: 'milestone', threshold: 650 },
  { id: 'sticker-05', type: 'milestone', threshold: 1000 },
  { id: 'reward-01', type: 'repeatable', cost: 500 },
];

test('calculateUnlockedMilestoneIds unlocks three milestones around 1000 stars', () => {
  assert.deepEqual(
    calculateUnlockedMilestoneIds(1000, rewards),
    ['sticker-02', 'sticker-03', 'sticker-05']
  );
});

test('repeatable rewards can be redeemed and consumed from inventory', () => {
  const redeemed = redeemRepeatableRewardState(
    {
      spendableStars: 1200,
      rewardInventory: {},
      rewardUsageCounts: {},
    },
    rewards[3]
  );

  assert.equal(redeemed.changed, true);
  assert.equal(redeemed.next.spendableStars, 700);
  assert.deepEqual(redeemed.next.rewardInventory, { 'reward-01': 1 });

  const used = useRepeatableRewardState(redeemed.next, 'reward-01');

  assert.equal(used.changed, true);
  assert.deepEqual(used.next.rewardInventory, { 'reward-01': 0 });
  assert.deepEqual(used.next.rewardUsageCounts, { 'reward-01': 1 });
});

test('getMilestoneThreshold returns null for non-milestone rewards', () => {
  assert.equal(getMilestoneThreshold(rewards[3]), null);
});

test('normalizeRewardCounts coerces invalid values to zero-safe objects', () => {
  assert.deepEqual(normalizeRewardCounts(null), {});
  assert.deepEqual(normalizeRewardCounts({ a: 2, b: -1, c: 'x' }), { a: 2, b: 0, c: 0 });
});
