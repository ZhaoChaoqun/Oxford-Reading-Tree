import { useEffect, useMemo, useRef, useState } from 'react';

export function resolveTranscriptSource(data, wordsKey) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  if (Array.isArray(data.segments)) {
    return data;
  }

  if (!wordsKey) {
    return null;
  }

  const bundledEntry = data[wordsKey] ?? data.books?.[wordsKey] ?? null;
  if (Array.isArray(bundledEntry?.segments)) {
    return bundledEntry;
  }

  return null;
}

export function buildWordHighlightData(data) {
  const segments = Array.isArray(data?.segments) ? data.segments : [];

  const flatWords = segments.flatMap((segment) => {
    const page = segment?.page;
    const words = Array.isArray(segment?.words) ? segment.words : [];

    return words.map((word) => ({
      word: word?.word ?? '',
      start: Number(word?.start ?? 0),
      end: Number(word?.end ?? 0),
      page,
    }));
  });

  const pageStartMap = new Map();

  for (const segment of segments) {
    const page = segment?.page;
    const start = Number(segment?.start ?? 0);

    if (page == null) {
      continue;
    }

    const existing = pageStartMap.get(page);
    if (existing == null || start < existing) {
      pageStartMap.set(page, start);
    }
  }

  const pageTimestamps = Array.from(pageStartMap.entries())
    .map(([page, startTime]) => ({ page, startTime }))
    .sort((a, b) => a.page - b.page);

  return { flatWords, pageTimestamps };
}

export function getActiveWordIndex(flatWords, currentTime) {
  let lastStartedIndex = -1;
  let inRangeIndex = -1;

  for (let index = 0; index < flatWords.length; index += 1) {
    const word = flatWords[index];

    if (word.start <= currentTime) {
      lastStartedIndex = index;
    }

    if (word.start <= currentTime && currentTime < word.end) {
      inRangeIndex = index;
    }
  }

  return inRangeIndex >= 0 ? inRangeIndex : lastStartedIndex;
}

export function getWordsForPlayback(flatWords, activeWordIndex) {
  if (!flatWords.length) {
    return [];
  }

  const activeWord = activeWordIndex >= 0 ? flatWords[activeWordIndex] : flatWords[0];

  if (!activeWord) {
    return [];
  }

  return flatWords.filter((word) => word.page === activeWord.page);
}

export function useWordHighlight(wordsFile, wordsKey, currentTime) {
  const dataRef = useRef(null);
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    dataRef.current = null;
    setData(null);
    setReady(false);

    if (!wordsFile) {
      setReady(true);
      return undefined;
    }

    fetch(wordsFile)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load transcript');
        }
        return response.json();
      })
      .then((json) => {
        if (cancelled) {
          return;
        }

        dataRef.current = json;
        setData(json);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        dataRef.current = null;
        setData(null);
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [wordsFile]);

  const sourceData = useMemo(
    () => resolveTranscriptSource(dataRef.current ?? data, wordsKey),
    [data, wordsKey],
  );

  const { flatWords, pageTimestamps } = useMemo(
    () => buildWordHighlightData(sourceData),
    [sourceData],
  );

  const activeWordIndex = useMemo(
    () => getActiveWordIndex(flatWords, currentTime),
    [flatWords, currentTime],
  );

  const wordsForPage = useMemo(
    () => getWordsForPlayback(flatWords, activeWordIndex),
    [flatWords, activeWordIndex],
  );

  return {
    flatWords,
    wordsForPage,
    pageTimestamps,
    activeWordIndex,
    ready,
  };
}