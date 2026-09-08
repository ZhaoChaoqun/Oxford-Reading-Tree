import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildStaticDictionary,
  enrichDictionaryEntries,
  filterDictionaryEntries,
  findMissingDictionaryKeywords,
  getAvailableDictionaryLetters,
} from './staticDictionary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

function loadJson(relativePath) {
  return JSON.parse(readFileSync(path.join(projectRoot, relativePath), 'utf8'));
}

function loadLines(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .map((line) => line.toLowerCase());
}

const books = loadJson('src/data/books.json').books;
const entries = loadJson('docs/dictionary/dictionary.json').entries;
const excluded = loadLines('docs/dictionary/dictionary-keywords-excluded.txt');
const catalog = buildStaticDictionary({ books, entries });

test('dictionary covers every kept keyword and only excludes curated names/noise words', () => {
  const missing = findMissingDictionaryKeywords({ books, entries });
  const excludedSet = new Set(excluded);
  const unexpected = missing.filter((word) => !excludedSet.has(word));

  assert.deepEqual(unexpected, []);
});

test('dictionary includes approved common speaking keywords', () => {
  const approvedCommonWords = [
    'again',
    'down',
    'everyone',
    'fun',
    'get',
    'look',
    'off',
    'one',
    'see',
    'sit',
    'up',
  ];

  assert.deepEqual(
    approvedCommonWords.filter((word) => !catalog.some((entry) => entry.key === word)),
    []
  );
});

test('buildStaticDictionary keeps occurrence references for shared words', () => {
  const school = catalog.find((entry) => entry.key === 'school');
  assert.ok(school);
  assert.equal(school.display, 'school');
  assert.deepEqual(
    school.occurrences.slice(0, 3),
    [
      { bookId: '1-01', stage: 1 },
      { bookId: '2-13', stage: 2 },
      { bookId: '3-17', stage: 3 },
    ]
  );
  assert.ok(school.occurrences.length >= 6);
});

test('learned enrichment and combined filters work together', () => {
  const enriched = enrichDictionaryEntries(catalog, {
    school: true,
    castle: true,
  });

  const learnedWords = filterDictionaryEntries(enriched, {
    learnedFilter: 'learned',
    letterFilter: 'C',
  });

  assert.deepEqual(
    learnedWords.map((entry) => entry.key),
    ['castle']
  );

  const searchResult = filterDictionaryEntries(enriched, {
    query: 'sch',
    learnedFilter: 'learned',
    letterFilter: 'S',
  });

  assert.deepEqual(searchResult.map((entry) => entry.key), ['school']);
});

test('available first-letter filters expose alphabetical groups', () => {
  const letters = getAvailableDictionaryLetters(catalog);
  assert.ok(letters.includes('A'));
  assert.ok(letters.includes('S'));
  assert.ok(!letters.includes('All'));
});
