import { kv, STORAGE_KEYS, SCHEMA_VERSION, migrateProgress, migrateScore } from './storageService.js';

const DEFAULT_SCORE_STATE = {
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

function encodeBase64Utf8(value) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64');
  }

  return btoa(unescape(encodeURIComponent(value)));
}

function decodeBase64Utf8(value) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf8');
  }

  return decodeURIComponent(escape(atob(value)));
}

function sumRewardCounts(rewardCounts) {
  if (!rewardCounts || typeof rewardCounts !== 'object') {
    return 0;
  }

  return Object.values(rewardCounts).reduce((sum, value) => {
    const count = Number(value);
    return sum + (Number.isFinite(count) && count > 0 ? Math.floor(count) : 0);
  }, 0);
}

export function summarizeProgressTransferData({ exportedAt = null, score, progress }) {
  const normalizedScore = migrateScore(score, DEFAULT_SCORE_STATE);
  const normalizedProgress = migrateProgress(progress);
  const progressItems = Object.values(normalizedProgress);

  return {
    exportedAt,
    totalScore: normalizedScore.totalScore ?? 0,
    spendableStars: normalizedScore.spendableStars ?? normalizedScore.totalScore ?? 0,
    lifetimeStarsEarned: normalizedScore.lifetimeStarsEarned ?? normalizedScore.totalScore ?? 0,
    streak: normalizedScore.streak ?? 0,
    completedUnits: progressItems.filter((item) => item?.status === 'completed').length,
    quizPassedUnits: progressItems.filter((item) => item?.quizPassed).length,
    speechPassedUnits: progressItems.filter((item) => item?.speechAnswers && Object.keys(item.speechAnswers).length > 0).length,
    rewardCount:
      (normalizedScore.unlockedStickers?.length ?? 0)
      + (normalizedScore.pickedStickerIds?.length ?? 0)
      + sumRewardCounts(normalizedScore.rewardInventory),
  };
}

export function createProgressTransferPayload({ score, progress }) {
  const normalized = {
    version: 1,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    score: migrateScore(score, DEFAULT_SCORE_STATE),
    progress: migrateProgress(progress),
  };

  return encodeBase64Utf8(JSON.stringify(normalized));
}

export function parseProgressTransferPayload(payload) {
  try {
    const decoded = decodeBase64Utf8(String(payload || '').trim());
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Transfer payload must be an object');
    }

    return {
      version: parsed.version ?? 1,
      schemaVersion: parsed.schemaVersion ?? SCHEMA_VERSION,
      exportedAt: parsed.exportedAt ?? null,
      score: migrateScore(parsed.score, DEFAULT_SCORE_STATE),
      progress: migrateProgress(parsed.progress),
    };
  } catch (error) {
    throw new Error(`Invalid transfer code: ${error.message}`);
  }
}

export function replaceProgressTransferState(parsedPayload) {
  const parsed = parsedPayload?.score && parsedPayload?.progress
    ? parsedPayload
    : parseProgressTransferPayload(parsedPayload);

  kv.set(STORAGE_KEYS.SCORE, parsed.score);
  kv.set(STORAGE_KEYS.PROGRESS, parsed.progress);
  return parsed;
}

export function readCurrentProgressTransferState() {
  return {
    score: migrateScore(kv.get(STORAGE_KEYS.SCORE), DEFAULT_SCORE_STATE),
    progress: migrateProgress(kv.get(STORAGE_KEYS.PROGRESS)),
  };
}
