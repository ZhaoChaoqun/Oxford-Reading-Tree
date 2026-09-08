/**
 * ScoreContext.jsx
 *
 * Manages spendable stars, lifetime stars, streak, collectible rewards,
 * repeatable reward inventory, and pending PNG sticker picks.
 * Persists to localStorage via storageService.kv.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import stickersData from '../data/stickers.json';
import booksData from '../data/books.json';
import videosData from '../data/videos.json';
import {
  kv,
  initStorage,
  STORAGE_KEYS,
  migrateProgress,
  migrateScore,
  isPrivateMode as getIsPrivateMode,
} from '../services/storageService';
import {
  applyUnitCompleteStreak,
  reconcileScoreWithProgress,
} from '../services/scoringEngine';
import {
  getRepeatableRewards,
  redeemRepeatableRewardState,
  syncMilestoneUnlocks,
  useRepeatableRewardState,
} from '../services/rewardLedger.js';

export const ScoreContext = createContext(null);

const DEFAULT_STATE = {
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
};

const REPEATABLE_REWARDS = getRepeatableRewards(stickersData.stickers);
const REPEATABLE_REWARD_MAP = new Map(REPEATABLE_REWARDS.map((reward) => [reward.id, reward]));
const REWARD_METADATA = {
  books: booksData.books,
  videos: videosData.videos,
};

function normalizeLoadedScore() {
  const rawScore = kv.get(STORAGE_KEYS.SCORE);
  const rawProgress = kv.get(STORAGE_KEYS.PROGRESS);
  const score = migrateScore(rawScore, DEFAULT_STATE);
  const progress = migrateProgress(rawProgress);
  return syncMilestoneUnlocks(
    reconcileScoreWithProgress(score, progress, REWARD_METADATA),
    stickersData.stickers
  );
}

function persistScore(next) {
  kv.set(STORAGE_KEYS.SCORE, next);
  return next;
}

export function ScoreProvider({ children }) {
  const [state, setState] = useState(normalizeLoadedScore);
  const [privateMode, setPrivateMode] = useState(false);

  useEffect(() => {
    initStorage().then(() => {
      const pm = getIsPrivateMode;
      setPrivateMode(pm);
      const saved = normalizeLoadedScore();
      setState(saved);
      persistScore(saved);

      if (pm) {
        console.warn('[ScoreContext] Private mode: progress will not be saved after this session.');
      }
    });
  }, []);

  const awardPoints = useCallback((amount, reason) => {
    if (amount <= 0) return;

    setState((prev) => {
      const next = syncMilestoneUnlocks(
        {
          ...prev,
          lifetimeStarsEarned: prev.lifetimeStarsEarned + amount,
          spendableStars: prev.spendableStars + amount,
          totalScore: prev.spendableStars + amount,
        },
        stickersData.stickers
      );

      if (reason) {
        // Placeholder for future score history logging.
      }

      return persistScore(next);
    });
  }, []);

  const unlockSticker = useCallback((stickerId) => {
    setState((prev) => {
      if (prev.unlockedStickers.includes(stickerId)) return prev;
      const next = {
        ...prev,
        unlockedStickers: [...prev.unlockedStickers, stickerId],
      };
      return persistScore(next);
    });
  }, []);

  const redeemRepeatableReward = useCallback((rewardId) => {
    const reward = REPEATABLE_REWARD_MAP.get(rewardId);
    if (!reward) return;

    setState((prev) => {
      const result = redeemRepeatableRewardState(prev, reward);
      if (!result.changed) {
        return prev;
      }
      return persistScore(result.next);
    });
  }, []);

  const useRepeatableReward = useCallback((rewardId) => {
    setState((prev) => {
      const result = useRepeatableRewardState(prev, rewardId);
      if (!result.changed) {
        return prev;
      }
      return persistScore(result.next);
    });
  }, []);

  const onUnitComplete = useCallback(() => {
    setState((prev) => {
      const transition = applyUnitCompleteStreak(prev);
      if (!transition.changed) return prev;

      const next = {
        ...prev,
        streak: transition.streak,
        lastActiveDate: transition.lastActiveDate,
        pendingStickerPicks: transition.pendingStickerPicks,
      };
      return persistScore(next);
    });
  }, []);

  const pickPngSticker = useCallback((stickerId) => {
    setState((prev) => {
      if (prev.pendingStickerPicks <= 0 || prev.pickedStickerIds.includes(stickerId)) {
        return prev;
      }

      const next = {
        ...prev,
        pendingStickerPicks: prev.pendingStickerPicks - 1,
        pickedStickerIds: [...prev.pickedStickerIds, stickerId],
      };
      return persistScore(next);
    });
  }, []);

  const value = {
    totalScore: state.totalScore,
    spendableStars: state.spendableStars,
    lifetimeStarsEarned: state.lifetimeStarsEarned,
    streak: state.streak,
    lastActiveDate: state.lastActiveDate,
    unlockedStickers: state.unlockedStickers,
    rewardInventory: state.rewardInventory,
    rewardUsageCounts: state.rewardUsageCounts,
    pendingStickerPicks: state.pendingStickerPicks,
    pickedStickerIds: state.pickedStickerIds,
    isPrivateMode: privateMode,
    awardPoints,
    unlockSticker,
    redeemRepeatableReward,
    useRepeatableReward,
    onUnitComplete,
    pickPngSticker,
  };

  return <ScoreContext.Provider value={value}>{children}</ScoreContext.Provider>;
}

export function useScore() {
  const ctx = useContext(ScoreContext);
  if (!ctx) throw new Error('useScore must be used within ScoreProvider');
  return ctx;
}
