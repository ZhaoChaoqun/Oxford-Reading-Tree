/**
 * dictionaryParser.js
 *
 * Extracts unique words from a book PDF using PDF.js text extraction,
 * filters stop-words, and stores the result in IndexedDB + localStorage
 * so DictionaryPage can display "My Word Book".
 *
 * Design for iPad:
 *   - Processes one page at a time to avoid memory spikes
 *   - Yields between pages (setTimeout(0)) to keep UI responsive
 *   - Progress callback for UI feedback
 *   - Skips already-indexed books (checks per-book flag in IDB)
 *
 * Storage layout:
 *   IndexedDB  ort-dictionary / words   key=word   value={ word, pageRef, bookId }
 *   localStorage  ort-dict-words         JSON array of { word, pageRef } for DictionaryPage
 *
 * Usage:
 *   import { indexBook, getWordCount, clearDictionary } from './dictionaryParser';
 *
 *   await indexBook(pdfUrl, bookId, bookTitle, {
 *     onProgress: (current, total) => setProgress(current / total),
 *   });
 */

import * as pdfjs from 'pdfjs-dist';
import { configurePdfJsWorker, getSharedPdfWorker } from './pdfWorkerSetup';
import { idb, kv, IDB_NAMES, IDB_STORES, STORAGE_KEYS } from './storageService';

configurePdfJsWorker(pdfjs);

// 鈹€鈹€ Stop words 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// ~110 high-frequency English function words that add noise to a
// young learner's word book. Kept intentionally small so real vocabulary
// (even simple words like "cat", "dog") is preserved.

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to',
  'for', 'of', 'by', 'up', 'it', 'is', 'am', 'are', 'was', 'were', 'be',
  'been', 'has', 'had', 'have', 'do', 'did', 'does', 'not', 'no', 'so',
  'as', 'this', 'that', 'with', 'from', 'they', 'them', 'their', 'we',
  'us', 'our', 'you', 'your', 'he', 'she', 'him', 'her', 'his', 'its',
  'my', 'me', 'i', 'will', 'can', 'may', 'just', 'then', 'than', 'very',
  'too', 'also', 'some', 'any', 'all', 'each', 'much', 'many', 'more',
  'most', 'own', 'other', 'such', 'only', 'about', 'into', 'over',
  'after', 'before', 'between', 'out', 'off', 'when', 'where', 'how',
  'what', 'which', 'who', 'whom', 'why', 'could', 'would', 'should',
  'here', 'there', 'now', 'get', 'got', 'go', 'went', 'come', 'came',
  'make', 'made', 'take', 'took', 'see', 'saw', 'look', 'say', 'said',
  'tell', 'told', 'put', 'give', 'gave', 'know', 'knew', 'think',
  'thought', 'let', 'being', 'doing', 'going', 'having',
]);

// 鈹€鈹€ Helpers 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

/**
 * Yield to the main thread so UI can repaint between pages.
 */
function yieldThread() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Extract clean words from a raw text string.
 * Returns an array of lowercase alpha-only words, min 2 chars,
 * excluding stop words.
 */
function extractWords(text) {
  // Match sequences of letters (including accented chars, but for ORT
  // books plain a-z is sufficient). Minimum 2 chars to skip stray letters.
  const raw = text.toLowerCase().match(/[a-z]{2,}/g);
  if (!raw) return [];

  const unique = new Set();
  for (const w of raw) {
    if (!STOP_WORDS.has(w)) {
      unique.add(w);
    }
  }
  return Array.from(unique);
}

/**
 * Build a short human-readable page reference.
 * e.g. "At School p.3"
 */
function pageRef(bookTitle, pageNum) {
  return `${bookTitle} p.${pageNum}`;
}

// 鈹€鈹€ Per-book index flag 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// Stored in IDB under the same dictionary DB as a separate
// "meta" concept keyed by bookId, so we never re-index the same book.

const META_KEY_PREFIX = '__indexed__';

async function isBookIndexed(bookId) {
  const val = await idb.get(IDB_NAMES.DICTIONARY, IDB_STORES.WORDS, META_KEY_PREFIX + bookId);
  return val === true;
}

async function markBookIndexed(bookId) {
  await idb.set(IDB_NAMES.DICTIONARY, IDB_STORES.WORDS, META_KEY_PREFIX + bookId, true);
}

// 鈹€鈹€ Sync localStorage snapshot 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
// DictionaryPage reads from localStorage for instant, synchronous access.
// We rebuild this snapshot from IDB whenever the dictionary changes.

async function syncLocalStorageSnapshot() {
  try {
    const allEntries = await idb.getAll(IDB_NAMES.DICTIONARY, IDB_STORES.WORDS);

    // Filter out meta flags (keyed with __indexed__) and build display list
    const words = [];
    for (const entry of allEntries) {
      if (entry && typeof entry === 'object' && entry.word) {
        words.push({ word: entry.word, pageRef: entry.pageRef });
      }
    }

    // Sort alphabetically for consistent display order
    words.sort((a, b) => a.word.localeCompare(b.word));

    kv.set('ort-dict-words', words);
  } catch (err) {
    console.warn('[dictionaryParser] syncLocalStorageSnapshot failed:', err.message);
  }
}

// 鈹€鈹€ Public API 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

/**
 * Parse a book PDF and index its unique words into the dictionary.
 *
 * Skips silently if the book has already been indexed.
 * Processes one page at a time with a yield between pages.
 *
 * @param {string} pdfUrl      Full URL to the PDF on NAS
 * @param {string} bookId      e.g. "1-01"
 * @param {string} bookTitle   e.g. "At School" (used in pageRef)
 * @param {object} [opts]
 * @param {function} [opts.onProgress]  Called with (currentPage, totalPages)
 * @param {AbortSignal} [opts.signal]   Cancel processing if aborted
 * @returns {Promise<{ wordsAdded: number, skipped: boolean }>}
 */
export async function indexBook(pdfUrl, bookId, bookTitle, opts = {}) {
  const { onProgress, signal } = opts;

  // Skip if already indexed
  if (await isBookIndexed(bookId)) {
    return { wordsAdded: 0, skipped: true };
  }

  let doc = null;
  let wordsAdded = 0;

  const worker = await getSharedPdfWorker(pdfjs);

  try {
    const loadingTask = pdfjs.getDocument({
      url: pdfUrl,
      disableAutoFetch: true,
      worker,
    });

    // Support cancellation
    if (signal) {
      signal.addEventListener('abort', () => {
        loadingTask.destroy?.();
      }, { once: true });
    }

    doc = await loadingTask.promise;
    const totalPages = doc.numPages;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      // Check cancellation
      if (signal?.aborted) {
        break;
      }

      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Concatenate all text items on the page
      const pageText = textContent.items
        .map((item) => item.str)
        .join(' ');

      const words = extractWords(pageText);

      // Write each word to IDB (upsert: keep first occurrence's pageRef)
      for (const word of words) {
        const existing = await idb.get(IDB_NAMES.DICTIONARY, IDB_STORES.WORDS, word);
        if (!existing) {
          await idb.set(IDB_NAMES.DICTIONARY, IDB_STORES.WORDS, word, {
            word,
            pageRef: pageRef(bookTitle, pageNum),
            bookId,
          });
          wordsAdded++;
        }
      }

      page.cleanup();

      onProgress?.(pageNum, totalPages);

      // Yield to main thread between pages
      await yieldThread();
    }

    if (!signal?.aborted) {
      await markBookIndexed(bookId);
    }
  } catch (err) {
    // Don't crash on parse errors 鈥?log and return partial results
    if (err.name !== 'AbortError') {
      console.warn('[dictionaryParser] indexBook failed:', bookId, err.message);
    }
  } finally {
    if (doc) {
      try { doc.destroy(); } catch { /* already destroyed */ }
    }
  }

  // Rebuild the localStorage snapshot for DictionaryPage
  await syncLocalStorageSnapshot();

  return { wordsAdded, skipped: false };
}

/**
 * Return the total number of words in the dictionary.
 */
export async function getWordCount() {
  try {
    const all = await idb.getAll(IDB_NAMES.DICTIONARY, IDB_STORES.WORDS);
    return all.filter((e) => e && typeof e === 'object' && e.word).length;
  } catch {
    return 0;
  }
}

/**
 * Clear the entire dictionary (all books). Used in settings/debug.
 */
export async function clearDictionary() {
  await idb.clear(IDB_NAMES.DICTIONARY, IDB_STORES.WORDS);
  kv.remove('ort-dict-words');
}
