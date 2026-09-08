import booksData from '../data/books.json';
import dictionaryData from '../../docs/dictionary/dictionary.json';
import { kv, STORAGE_KEYS } from './storageService';
import {
  buildStaticDictionary,
  enrichDictionaryEntries,
  getAvailableDictionaryLetters,
  normalizeDictionaryKey,
} from './staticDictionary';

const STATIC_DICTIONARY = buildStaticDictionary({
  books: booksData.books,
  entries: dictionaryData.entries,
});

const DICTIONARY_KEYS = new Set(STATIC_DICTIONARY.map((entry) => entry.key));

function sanitizeLearnedWordMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const next = {};
  for (const [key, value] of Object.entries(raw)) {
    const normalized = normalizeDictionaryKey(key);
    if (!normalized || !DICTIONARY_KEYS.has(normalized)) continue;
    next[normalized] = Boolean(value);
  }
  return next;
}

export function getStaticDictionary() {
  return STATIC_DICTIONARY;
}

export function loadLearnedWordMap() {
  return sanitizeLearnedWordMap(kv.get(STORAGE_KEYS.DICTIONARY_LEARNED));
}

export function saveLearnedWordMap(wordMap) {
  const sanitized = sanitizeLearnedWordMap(wordMap);
  kv.set(STORAGE_KEYS.DICTIONARY_LEARNED, sanitized);
  return sanitized;
}

export function markDictionaryWordsLearned(words = []) {
  if (!Array.isArray(words) || words.length === 0) {
    return loadLearnedWordMap();
  }

  const next = {
    ...loadLearnedWordMap(),
  };
  let changed = false;

  for (const rawWord of words) {
    const key = normalizeDictionaryKey(rawWord);
    if (!key || !DICTIONARY_KEYS.has(key) || next[key]) continue;
    next[key] = true;
    changed = true;
  }

  return changed ? saveLearnedWordMap(next) : next;
}

export function getDictionaryEntries(learnedWordMap = loadLearnedWordMap()) {
  return enrichDictionaryEntries(STATIC_DICTIONARY, learnedWordMap);
}

export function getDictionaryLetters(entries = STATIC_DICTIONARY) {
  return getAvailableDictionaryLetters(entries);
}