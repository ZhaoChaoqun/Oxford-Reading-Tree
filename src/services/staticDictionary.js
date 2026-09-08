function compareBookIds(a, b) {
  return a.localeCompare(b, undefined, { numeric: true });
}

export function normalizeDictionaryKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function getDictionaryLetter(value) {
  const match = String(value ?? '').trim().match(/[A-Za-z]/);
  return match ? match[0].toUpperCase() : '#';
}

export function buildStaticDictionary({ books = [], entries = [] }) {
  const entryByKey = new Map();

  for (const entry of entries) {
    const key = normalizeDictionaryKey(entry?.key || entry?.display);
    if (!key) continue;

    entryByKey.set(key, {
      key,
      display: String(entry?.display ?? entry?.key ?? '').trim(),
      definitionEn: String(entry?.definitionEn ?? '').trim(),
      definitionZh: String(entry?.definitionZh ?? '').trim(),
      occurrences: [],
      letter: getDictionaryLetter(entry?.display ?? entry?.key),
    });
  }

  for (const book of books) {
    const seenKeys = new Set();

    for (const rawKeyword of book?.keywords ?? []) {
      const key = normalizeDictionaryKey(rawKeyword);
      if (!key || seenKeys.has(key)) continue;
      seenKeys.add(key);

      const entry = entryByKey.get(key);
      if (!entry) continue;

      entry.occurrences.push({
        bookId: book.id,
        stage: book.stage,
      });
    }
  }

  return [...entryByKey.values()]
    .map((entry) => ({
      ...entry,
      occurrences: [...entry.occurrences].sort((a, b) => {
        if (a.stage !== b.stage) return a.stage - b.stage;
        return compareBookIds(a.bookId, b.bookId);
      }),
    }))
    .sort((a, b) => {
      const byDisplay = a.display.localeCompare(b.display, undefined, {
        sensitivity: 'base',
      });
      if (byDisplay !== 0) return byDisplay;
      return compareBookIds(a.key, b.key);
    });
}

export function enrichDictionaryEntries(entries, learnedWordMap = {}) {
  return entries.map((entry) => ({
    ...entry,
    learned: Boolean(learnedWordMap[entry.key]),
  }));
}

export function getAvailableDictionaryLetters(entries) {
  const letters = new Set(entries.map((entry) => entry.letter));
  const alpha = [...letters].filter((letter) => letter !== '#').sort();
  return letters.has('#') ? [...alpha, '#'] : alpha;
}

export function filterDictionaryEntries(
  entries,
  { query = '', learnedFilter = 'all', letterFilter = 'all' } = {}
) {
  const normalizedQuery = String(query).trim().toLowerCase();

  return entries.filter((entry) => {
    if (normalizedQuery) {
      const matchesQuery =
        entry.display.toLowerCase().includes(normalizedQuery)
        || entry.key.includes(normalizedQuery);

      if (!matchesQuery) {
        return false;
      }
    }

    if (learnedFilter === 'learned' && !entry.learned) {
      return false;
    }

    if (learnedFilter === 'not-learned' && entry.learned) {
      return false;
    }

    if (letterFilter !== 'all' && entry.letter !== letterFilter) {
      return false;
    }

    return true;
  });
}

export function findMissingDictionaryKeywords({ books = [], entries = [] }) {
  const entryKeys = new Set(entries.map((entry) => normalizeDictionaryKey(entry?.key || entry?.display)));
  const keywords = new Set();

  for (const book of books) {
    for (const rawKeyword of book?.keywords ?? []) {
      const key = normalizeDictionaryKey(rawKeyword);
      if (key) {
        keywords.add(key);
      }
    }
  }

  return [...keywords].filter((key) => !entryKeys.has(key)).sort(compareBookIds);
}