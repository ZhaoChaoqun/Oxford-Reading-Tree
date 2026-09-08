/**
 * storageService.js
 *
 * Unified storage abstraction with automatic fallback:
 *   IndexedDB -> localStorage -> in-memory Map
 *
 * Usage:
 *   import { kv, idb, isPrivateMode } from './storageService';
 *
 *   // Synchronous KV (scores, progress, settings)
 *   kv.set('ort-score', 42);
 *   kv.get('ort-score');   // -> 42
 *
 *   // Async IDB (dictionary, history - Phase 3+)
 *   await idb.set('ort-dictionary', 'words', 'apple', { def: '...' });
 *   await idb.get('ort-dictionary', 'words', 'apple');
 */

import { openDB } from 'idb';
import { normalizeRewardCounts } from './rewardLedger.js';

let _isPrivateMode = false;

async function detectPrivateMode() {
  try {
    const TEST_KEY = '__ort_pm_test__';
    localStorage.setItem(TEST_KEY, '1');
    localStorage.removeItem(TEST_KEY);
  } catch {
    _isPrivateMode = true;
    return true;
  }

  try {
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('__ort_pm_test__', 1);
      req.onsuccess = () => {
        req.result.close();
        indexedDB.deleteDatabase('__ort_pm_test__');
        resolve();
      };
      req.onerror = reject;
      req.onblocked = reject;
      setTimeout(reject, 1000);
    });
  } catch {
    _isPrivateMode = true;
    return true;
  }

  _isPrivateMode = false;
  return false;
}

let _initPromise = null;

export function initStorage() {
  if (!_initPromise) {
    _initPromise = detectPrivateMode().then(() => {
      if (_isPrivateMode) {
        console.warn('[storageService] Private/incognito mode detected. Progress will not be saved.');
      }
    });
  }
  return _initPromise;
}

export { _isPrivateMode as isPrivateMode };

const _memoryStore = new Map();

function kvGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch {
    return _memoryStore.has(key) ? _memoryStore.get(key) : null;
  }
}

function kvSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    _memoryStore.set(key, value);
  } catch {
    _memoryStore.set(key, value);
  }
}

function kvRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  _memoryStore.delete(key);
}

function kvClear() {
  try {
    const ortKeys = Object.keys(localStorage).filter((k) => k.startsWith('ort-'));
    ortKeys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
  _memoryStore.clear();
}

export const kv = {
  get: kvGet,
  set: kvSet,
  remove: kvRemove,
  clear: kvClear,
};

const _dbCache = new Map();

async function getDb(dbName, storeName) {
  if (_isPrivateMode) {
    throw new Error('IndexedDB unavailable in private mode');
  }

  const cacheKey = `${dbName}::${storeName}`;

  if (_dbCache.has(cacheKey)) {
    return _dbCache.get(cacheKey);
  }

  const db = await openDB(dbName, 1, {
    upgrade(dbInstance) {
      if (!dbInstance.objectStoreNames.contains(storeName)) {
        dbInstance.createObjectStore(storeName);
      }
    },
  });

  _dbCache.set(cacheKey, db);
  return db;
}

async function idbGet(dbName, storeName, key) {
  try {
    const db = await getDb(dbName, storeName);
    return (await db.get(storeName, key)) ?? null;
  } catch (err) {
    console.warn(`[storageService] idb.get failed (${dbName}/${storeName}/${key}):`, err.message);
    return null;
  }
}

async function idbSet(dbName, storeName, key, value) {
  try {
    const db = await getDb(dbName, storeName);
    await db.put(storeName, value, key);
  } catch (err) {
    console.warn(`[storageService] idb.set failed (${dbName}/${storeName}/${key}):`, err.message);
  }
}

async function idbRemove(dbName, storeName, key) {
  try {
    const db = await getDb(dbName, storeName);
    await db.delete(storeName, key);
  } catch (err) {
    console.warn('[storageService] idb.remove failed:', err.message);
  }
}

async function idbGetAll(dbName, storeName) {
  try {
    const db = await getDb(dbName, storeName);
    return await db.getAll(storeName);
  } catch (err) {
    console.warn(`[storageService] idb.getAll failed (${dbName}/${storeName}):`, err.message);
    return [];
  }
}

async function idbClear(dbName, storeName) {
  try {
    const db = await getDb(dbName, storeName);
    await db.clear(storeName);
  } catch (err) {
    console.warn('[storageService] idb.clear failed:', err.message);
  }
}

export const idb = {
  get: idbGet,
  set: idbSet,
  remove: idbRemove,
  getAll: idbGetAll,
  clear: idbClear,
};

export const STORAGE_KEYS = {
  SCORE: 'ort-score',
  PROGRESS: 'ort-progress',
  BASE_URL: 'ort-base-url',
  DICT_INDEXED: 'ort-dict-indexed',
};

/**
 * Current schema (v3):
 *   ort-score    -> { _v, totalScore, lifetimeStarsEarned, spendableStars,
 *                     streak, lastActiveDate, unlockedStickers[],
 *                     rewardInventory, rewardUsageCounts,
 *                     pendingStickerPicks, pickedStickerIds[] }
 *   ort-progress -> { [bookId]: { status, currentPage, quizPassed, speechPassed,
 *                                 videoDone, bookRewardClaimed, scoreEarned,
 *                                 quizAnswers, speechAnswers } }
 */
export const SCHEMA_VERSION = 3;

function getDefaultScoreState(defaultState) {
  const totalScore = typeof defaultState?.totalScore === 'number' ? defaultState.totalScore : 0;
  const spendableStars = typeof defaultState?.spendableStars === 'number'
    ? defaultState.spendableStars
    : totalScore;
  const lifetimeStarsEarned = typeof defaultState?.lifetimeStarsEarned === 'number'
    ? defaultState.lifetimeStarsEarned
    : totalScore;

  return {
    totalScore: spendableStars,
    lifetimeStarsEarned,
    spendableStars,
    streak: typeof defaultState?.streak === 'number' ? defaultState.streak : 0,
    lastActiveDate: defaultState?.lastActiveDate ?? null,
    unlockedStickers: Array.isArray(defaultState?.unlockedStickers) ? defaultState.unlockedStickers : [],
    rewardInventory: normalizeRewardCounts(defaultState?.rewardInventory),
    rewardUsageCounts: normalizeRewardCounts(defaultState?.rewardUsageCounts),
    pendingStickerPicks: defaultState?.pendingStickerPicks ?? 0,
    pickedStickerIds: Array.isArray(defaultState?.pickedStickerIds) ? defaultState.pickedStickerIds : [],
  };
}

export function migrateScore(saved, defaultState) {
  const defaults = getDefaultScoreState(defaultState);
  if (!saved || typeof saved !== 'object') {
    return { ...defaults, _v: SCHEMA_VERSION };
  }

  const legacyTotal = typeof saved.totalScore === 'number' ? saved.totalScore : defaults.totalScore;
  const spendableStars = typeof saved.spendableStars === 'number' ? saved.spendableStars : legacyTotal;
  const lifetimeStarsEarned = typeof saved.lifetimeStarsEarned === 'number'
    ? saved.lifetimeStarsEarned
    : legacyTotal;

  const rewardInventory = normalizeRewardCounts(saved.rewardInventory ?? defaults.rewardInventory);
  const rewardUsageCounts = normalizeRewardCounts(saved.rewardUsageCounts ?? defaults.rewardUsageCounts);

  let unlockedStickers = Array.isArray(saved.unlockedStickers)
    ? [...new Set(saved.unlockedStickers)]
    : [...defaults.unlockedStickers];

  if (unlockedStickers.includes('sticker-01')) {
    rewardInventory['sticker-01'] = (rewardInventory['sticker-01'] ?? 0) + 1;
    unlockedStickers = unlockedStickers.filter((id) => id !== 'sticker-01');
  }

  return {
    totalScore: spendableStars,
    lifetimeStarsEarned,
    spendableStars,
    streak: typeof saved.streak === 'number' ? saved.streak : defaults.streak,
    lastActiveDate: saved.lastActiveDate ?? defaults.lastActiveDate,
    unlockedStickers,
    rewardInventory,
    rewardUsageCounts,
    pendingStickerPicks: saved.pendingStickerPicks ?? defaults.pendingStickerPicks,
    pickedStickerIds: Array.isArray(saved.pickedStickerIds) ? saved.pickedStickerIds : defaults.pickedStickerIds,
    _v: SCHEMA_VERSION,
  };
}

export function migrateProgress(saved) {
  if (!saved || typeof saved !== 'object') return {};

  const migrated = {};
  for (const [id, item] of Object.entries(saved)) {
    if (id === '_v') continue;
    migrated[id] = {
      status: item?.status ?? 'not-started',
      currentPage: item?.currentPage ?? 0,
      quizPassed: item?.quizPassed ?? false,
      speechPassed: item?.speechPassed ?? false,
      videoDone: item?.videoDone ?? false,
      bookRewardClaimed: item?.bookRewardClaimed ?? false,
      durationSeconds: typeof item?.durationSeconds === 'number' ? item.durationSeconds : null,
      familyStage: typeof item?.familyStage === 'number' ? item.familyStage : null,
      videoRewardPoints: typeof item?.videoRewardPoints === 'number' ? item.videoRewardPoints : null,
      scoreEarned: item?.scoreEarned ?? 0,
      quizAnswers: item?.quizAnswers ?? {},
      speechAnswers: item?.speechAnswers ?? {},
    };
  }
  return migrated;
}

export const IDB_NAMES = {
  DICTIONARY: 'ort-dictionary',
  SCORE_HISTORY: 'ort-score-history',
  AI_IMAGES: 'ort-ai-images',
};

export const IDB_STORES = {
  WORDS: 'words',
  HISTORY: 'history',
  IMAGES: 'images',
};
