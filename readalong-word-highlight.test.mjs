import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import {
  buildWordHighlightData,
  getActiveWordIndex,
  getWordsForPlayback,
  resolveTranscriptSource,
} from './src/hooks/useWordHighlight.js';

const readerPageSource = readFileSync(
  new URL('./src/components/reader/ReaderPage.jsx', import.meta.url),
  'utf8',
);
const videoPageSource = readFileSync(
  new URL('./src/components/video/VideoPage.jsx', import.meta.url),
  'utf8',
);
const progressHookSource = readFileSync(
  new URL('./src/hooks/useProgress.js', import.meta.url),
  'utf8',
);
const storageServiceSource = readFileSync(
  new URL('./src/services/storageService.js', import.meta.url),
  'utf8',
);
const pageControlsSource = readFileSync(
  new URL('./src/components/reader/PageControls.jsx', import.meta.url),
  'utf8',
);
const pdfViewerSource = readFileSync(
  new URL('./src/components/reader/PdfViewer.jsx', import.meta.url),
  'utf8',
);
const rewardsPageSource = readFileSync(
  new URL('./src/components/rewards/RewardsPage.jsx', import.meta.url),
  'utf8',
);
const stickerShopSource = readFileSync(
  new URL('./src/components/rewards/StickerShop.jsx', import.meta.url),
  'utf8',
);
const bottomNavSource = readFileSync(
  new URL('./src/components/layout/BottomNav.jsx', import.meta.url),
  'utf8',
);
const audioBarSource = readFileSync(
  new URL('./src/components/reader/AudioBar.jsx', import.meta.url),
  'utf8',
);
const quizPageSource = readFileSync(
  new URL('./src/components/quiz/QuizPage.jsx', import.meta.url),
  'utf8',
);
const stickerPickerSource = readFileSync(
  new URL('./src/components/rewards/StickerPickerModal.jsx', import.meta.url),
  'utf8',
);
const textQuestionSource = readFileSync(
  new URL('./src/components/quiz/TextQuestion.jsx', import.meta.url),
  'utf8',
);
const booksData = JSON.parse(
  readFileSync(new URL('./src/data/books.json', import.meta.url), 'utf8'),
);
const publicWordFiles = readdirSync(
  new URL('./public/words/', import.meta.url),
)
  .filter((name) => name.endsWith('.json'))
  .sort();

assert.match(readerPageSource, /const READ_ALONG_LABEL = String\.fromCodePoint\(0x70b9, 0x8bfb\);/);
assert.match(readerPageSource, /const READ_ALONG_ACTIVE_LABEL = String\.fromCodePoint\(0x70b9, 0x8bfb, 0x4e2d\);/);
assert.match(readerPageSource, /const hasReadAlong = Boolean\(wordsFile\);/);
assert.match(readerPageSource, /const isAudioOnlyUnit = book\?\.readerMode === 'audio-only';/);
assert.match(readerPageSource, /const showAudioOnlyFallback = \(isAudioOnlyUnit \|\| isMissing\) && !hasPdfPages;/);
assert.match(readerPageSource, /const wasAlreadyCompleted = getItem\(bookId\)\.bookRewardClaimed;/);
assert.match(readerPageSource, /if \(!wasAlreadyCompleted && claimBookCompletionReward\(bookId\)\) \{/);
assert.match(readerPageSource, /useWordHighlight\(wordsFile, book\?\.wordsKey \?\? null, player\.currentTime\)/);

assert.match(videoPageSource, /const \{ claimVideoCompletionReward \} = useProgress\(\);/);
assert.match(videoPageSource, /if \(duration > 0 && currentTime \/ duration >= 0\.9 && !awardedRef\.current\) \{/);
assert.match(videoPageSource, /if \(claimVideoCompletionReward\(videoId\)\) \{/);
assert.match(videoPageSource, /awardPoints\(5, 'video_complete'\);/);

assert.match(progressHookSource, /import \{ kv, STORAGE_KEYS, migrateProgress \} from '\.\.\/services\/storageService';/);
assert.doesNotMatch(progressHookSource, /localStorage\.getItem/);
assert.doesNotMatch(progressHookSource, /localStorage\.setItem/);
assert.match(progressHookSource, /bookRewardClaimed: false,/);
assert.match(progressHookSource, /const claimBookCompletionReward = useCallback\(/);
assert.match(progressHookSource, /const claimVideoCompletionReward = useCallback\(/);
assert.match(progressHookSource, /kv\.get\(STORAGE_KEYS\.PROGRESS\)/);
assert.match(progressHookSource, /kv\.set\(STORAGE_KEYS\.PROGRESS, data\)/);
assert.match(storageServiceSource, /bookRewardClaimed: item\?\.bookRewardClaimed \?\? false,/);

assert.match(pageControlsSource, /String\.fromCodePoint\(0x2190\)/);
assert.match(pageControlsSource, /String\.fromCodePoint\(0x2192\)/);
assert.match(pdfViewerSource, /String\.fromCodePoint\(0x1f61f\)/);
assert.match(rewardsPageSource, /My Stickers/);
assert.match(rewardsPageSource, /Shop/);
assert.match(stickerShopSource, /Your Stars:/);
assert.match(stickerShopSource, /Current streak:/);
assert.match(stickerShopSource, /Streak Stickers/);
assert.match(bottomNavSource, /label: '\\u4e66\\u5e93'/);
assert.match(audioBarSource, /String\.fromCodePoint\(0x25b6\)/);
assert.match(audioBarSource, /String\.fromCodePoint\(0x23f8\)/);
assert.match(quizPageSource, /String\.fromCodePoint\(0x2190\)/);
assert.match(quizPageSource, /String\.fromCodePoint\(0x2192\)/);
assert.match(stickerPickerSource, /String\.fromCodePoint\(0x1f389\)/);
assert.match(textQuestionSource, /String\.fromCodePoint\(0x2753\)/);

const expectedStageFiles = Array.from(
  new Set(booksData.books.map((book) => `stage-${book.stage}.json`)),
).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
assert.deepEqual(publicWordFiles, expectedStageFiles);
const audioOnlyIds = [
  '6-03',
  '6-06',
  '6-07',
  '6-08',
  '6-11',
  '6-12',
  '6-14',
  '6-15',
  '6-16',
  '6-17',
];

assert.deepEqual(
  booksData.books
    .filter((book) => book.readerMode === 'audio-only')
    .map((book) => book.id)
    .sort(),
  audioOnlyIds,
);

for (const book of booksData.books) {
  assert.equal(book.wordsFile, `words/stage-${book.stage}.json`);
  assert.equal(book.wordsKey, book.id);
  assert.equal(Object.hasOwn(book, 'readAlong'), false);
}

const transcript = {
  segments: [
    {
      start: 10,
      end: 12,
      page: 1,
      words: [
        { word: 'It', start: 10, end: 10.2 },
        { word: 'was', start: 10.6, end: 10.9 },
      ],
    },
    {
      start: 20,
      end: 22,
      page: 2,
      words: [
        { word: 'Go', start: 20, end: 20.3 },
      ],
    },
    {
      start: 18,
      end: 19,
      page: 2,
      words: [
        { word: 'Now', start: 18, end: 18.4 },
      ],
    },
  ],
};

const transcriptBundle = {
  '1-01': transcript,
  '1-02': {
    segments: [
      {
        start: 1,
        end: 2,
        page: 1,
        words: [{ word: 'Other', start: 1, end: 1.3 }],
      },
    ],
  },
};

assert.deepEqual(resolveTranscriptSource(transcript, null), transcript);
assert.deepEqual(resolveTranscriptSource(transcriptBundle, '1-01'), transcript);
assert.equal(resolveTranscriptSource(transcriptBundle, '9-99'), null);

const { flatWords, pageTimestamps } = buildWordHighlightData(transcript);

assert.deepEqual(flatWords, [
  { word: 'It', start: 10, end: 10.2, page: 1 },
  { word: 'was', start: 10.6, end: 10.9, page: 1 },
  { word: 'Go', start: 20, end: 20.3, page: 2 },
  { word: 'Now', start: 18, end: 18.4, page: 2 },
]);

assert.deepEqual(pageTimestamps, [
  { page: 1, startTime: 10 },
  { page: 2, startTime: 18 },
]);

assert.equal(getActiveWordIndex(flatWords, 9.5), -1);
assert.equal(getActiveWordIndex(flatWords, 10.1), 0);
assert.equal(getActiveWordIndex(flatWords, 10.4), 0);
assert.equal(getActiveWordIndex(flatWords, 10.7), 1);
assert.equal(getActiveWordIndex(flatWords, 19.5), 3);
assert.equal(getActiveWordIndex(flatWords, 21), 3);

assert.deepEqual(getWordsForPlayback(flatWords, -1), [
  { word: 'It', start: 10, end: 10.2, page: 1 },
  { word: 'was', start: 10.6, end: 10.9, page: 1 },
]);

assert.deepEqual(getWordsForPlayback(flatWords, 2), [
  { word: 'Go', start: 20, end: 20.3, page: 2 },
  { word: 'Now', start: 18, end: 18.4, page: 2 },
]);