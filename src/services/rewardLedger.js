export function normalizeRewardCounts(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const normalized = {};
  for (const [key, rawCount] of Object.entries(value)) {
    const count = Number(rawCount);
    normalized[key] = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  }
  return normalized;
}

export function getMilestoneThreshold(reward) {
  if (reward?.type !== 'milestone') {
    return null;
  }

  return typeof reward.threshold === 'number' ? reward.threshold : null;
}

export function getMilestoneRewards(rewards) {
  return (Array.isArray(rewards) ? rewards : [])
    .filter((reward) => getMilestoneThreshold(reward) !== null)
    .sort((a, b) => a.threshold - b.threshold);
}

export function getRepeatableRewards(rewards) {
  return (Array.isArray(rewards) ? rewards : [])
    .filter((reward) => reward?.type === 'repeatable');
}

export function calculateUnlockedMilestoneIds(lifetimeStarsEarned, rewards = []) {
  const total = typeof lifetimeStarsEarned === 'number' ? lifetimeStarsEarned : 0;

  return getMilestoneRewards(rewards)
    .filter((reward) => total >= reward.threshold)
    .map((reward) => reward.id);
}

export function syncMilestoneUnlocks(scoreState, rewards = []) {
  const base = scoreState && typeof scoreState === 'object' ? scoreState : {};
  const unlocked = new Set(Array.isArray(base.unlockedStickers) ? base.unlockedStickers : []);

  for (const id of calculateUnlockedMilestoneIds(base.lifetimeStarsEarned ?? 0, rewards)) {
    unlocked.add(id);
  }

  return {
    ...base,
    unlockedStickers: Array.from(unlocked),
  };
}

export function getNextMilestoneReward(lifetimeStarsEarned, rewards = []) {
  const total = typeof lifetimeStarsEarned === 'number' ? lifetimeStarsEarned : 0;
  return getMilestoneRewards(rewards).find((reward) => total < reward.threshold) ?? null;
}

export function redeemRepeatableRewardState(scoreState, reward) {
  const base = scoreState && typeof scoreState === 'object' ? scoreState : {};
  const spendableStars = typeof base.spendableStars === 'number' ? base.spendableStars : 0;
  const rewardInventory = normalizeRewardCounts(base.rewardInventory);

  if (!reward || reward.type !== 'repeatable' || typeof reward.cost !== 'number' || spendableStars < reward.cost) {
    return { changed: false, next: { ...base, spendableStars, rewardInventory } };
  }

  return {
    changed: true,
    next: {
      ...base,
      spendableStars: spendableStars - reward.cost,
      totalScore: spendableStars - reward.cost,
      rewardInventory: {
        ...rewardInventory,
        [reward.id]: (rewardInventory[reward.id] ?? 0) + 1,
      },
    },
  };
}

export function useRepeatableRewardState(scoreState, rewardId) {
  const base = scoreState && typeof scoreState === 'object' ? scoreState : {};
  const rewardInventory = normalizeRewardCounts(base.rewardInventory);
  const rewardUsageCounts = normalizeRewardCounts(base.rewardUsageCounts);
  const available = rewardInventory[rewardId] ?? 0;

  if (!rewardId || available <= 0) {
    return {
      changed: false,
      next: {
        ...base,
        rewardInventory,
        rewardUsageCounts,
      },
    };
  }

  return {
    changed: true,
    next: {
      ...base,
      rewardInventory: {
        ...rewardInventory,
        [rewardId]: available - 1,
      },
      rewardUsageCounts: {
        ...rewardUsageCounts,
        [rewardId]: (rewardUsageCounts[rewardId] ?? 0) + 1,
      },
    },
  };
}
