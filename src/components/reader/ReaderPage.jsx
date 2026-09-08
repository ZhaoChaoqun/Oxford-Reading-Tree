import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { usePdfRenderer } from '../../hooks/usePdfRenderer';
import { useProgress } from '../../hooks/useProgress';
import { useResource } from '../../contexts/ResourceContext';
import { useScore } from '../../contexts/ScoreContext';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useWordHighlight } from '../../hooks/useWordHighlight';
import { getStageRewardPoints } from '../../services/scoringEngine';
import { PdfViewer } from './PdfViewer';
import { PageControls } from './PageControls';
import { AudioBar } from './AudioBar';
import { TappableTextPanel } from './TappableTextPanel';
import booksData from '../../data/books.json';
import { markDictionaryWordsLearned } from '../../services/dictionaryLibrary';
import LibraryConnectionState from '../common/LibraryConnectionState';

const PAGE_CONTROLS_BOTTOM = 96;
const TAPPABLE_PANEL_BOTTOM = 160;
const READ_ALONG_LABEL = String.fromCodePoint(0x70b9, 0x8bfb);
const READ_ALONG_ACTIVE_LABEL = String.fromCodePoint(0x70b9, 0x8bfb, 0x4e2d);
const AUDIO_ONLY_BADGE = 'Audio only';
const AUDIO_ONLY_TITLE = 'The PDF is unavailable. You can still use audio and subtitles.';
const AUDIO_ONLY_COPY = 'Use the player and read-along transcript, then continue to the quiz.';
const AUDIO_ONLY_QUIZ_LABEL = 'Go to Quiz';

export default function ReaderPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { baseUrl } = useResource();
  const { awardPoints } = useScore();
  const {
    getItem,
    setCurrentPage: saveCurrentPage,
    markBookComplete,
    claimBookCompletionReward,
  } = useProgress();

  const book = booksData.books.find((item) => item.id === bookId);

  const base = baseUrl ? baseUrl.replace(/\/$/, '') : null;
  const pdfUrl = base && book ? `${base}/${book.pdfFile}` : null;
  const audioUrl = base && book ? `${base}/${book.audioFile}` : null;
  const wordsFile = book?.wordsFile ? `/${book.wordsFile.replace(/^\/+/, '')}` : null;
  const hasReadAlong = Boolean(wordsFile);
  const isAudioOnlyUnit = book?.readerMode === 'audio-only';

  const [isReadAlongEnabled, setIsReadAlongEnabled] = useState(false);
  const player = useAudioPlayer();

  useEffect(() => {
    setIsReadAlongEnabled(false);
  }, [bookId]);

  useEffect(() => {
    if (audioUrl) {
      player.load(audioUrl);
    }
  }, [audioUrl, player.load]);

  const {
    currentPage,
    totalPages,
    isLoading,
    error,
    isMissing,
    isFirstPage,
    isLastPage,
    renderToCanvas,
    goNext,
    goPrev,
    goToPage,
  } = usePdfRenderer(pdfUrl);

  const {
    flatWords,
    wordsForPage,
    activeWordIndex,
    ready,
  } = useWordHighlight(wordsFile, book?.wordsKey ?? null, player.currentTime);

  const hasPdfPages = totalPages > 0;
  const showAudioOnlyFallback = (isAudioOnlyUnit || isMissing) && !hasPdfPages;
  const isReadAlongVisible = isReadAlongEnabled && ready && wordsForPage.length > 0;

  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current || !totalPages || !bookId) {
      return;
    }

    restoredRef.current = true;
    const saved = getItem(bookId);

    if (saved.currentPage > 1 && saved.currentPage <= totalPages) {
      goToPage(saved.currentPage);
    }
  }, [totalPages, bookId, getItem, goToPage]);

  useEffect(() => {
    if (!bookId || !totalPages || currentPage < 1) {
      return;
    }

    saveCurrentPage(bookId, currentPage, totalPages);
  }, [bookId, currentPage, totalPages, saveCurrentPage]);

  const completedRef = useRef(false);

  const completeBookAndGoQuiz = useCallback(() => {
    const wasAlreadyCompleted = getItem(bookId).bookRewardClaimed;

    if (!completedRef.current) {
      completedRef.current = true;
      markBookComplete(bookId);

      if (!wasAlreadyCompleted && claimBookCompletionReward(bookId)) {
        awardPoints(getStageRewardPoints(book?.stage), 'book_complete');
      }
      markDictionaryWordsLearned(book?.keywords ?? []);
    }

    navigate(`/quiz/${bookId}`);
  }, [bookId, getItem, markBookComplete, claimBookCompletionReward, awardPoints, book, navigate]);

  const handleNext = useCallback(() => {
    if (isLastPage) {
      completeBookAndGoQuiz();
      return;
    }

    goNext();
  }, [isLastPage, completeBookAndGoQuiz, goNext]);

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
        <div className="text-6xl">Book</div>
        <p className="text-lg font-bold text-gray-600">Book not found.</p>
        <button
          onClick={() => navigate('/')}
          className="rounded-2xl bg-orange-500 px-6 py-3 font-bold text-white shadow active:scale-95"
        >
          Back to Library
        </button>
      </div>
    );
  }

  if (!baseUrl) {
    return <LibraryConnectionState />;
  }

  return (
    <div className="px-3 pb-20 pt-2">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-bold text-orange-700">
          Stage {book.stage}
        </span>
        {hasPdfPages && (
          <span className="text-xs text-gray-400">{totalPages} pages</span>
        )}
        {showAudioOnlyFallback && (
          <span className="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-bold text-sky-700">
            {AUDIO_ONLY_BADGE}
          </span>
        )}
        {hasReadAlong && (
          <button
            type="button"
            onClick={() => setIsReadAlongEnabled((value) => !value)}
            className={`rounded-full px-3 py-0.5 text-xs font-bold shadow-sm transition-colors ${
              isReadAlongEnabled
                ? 'bg-orange-500 text-white'
                : 'border border-orange-200 bg-white text-orange-600'
            }`}
          >
            {isReadAlongEnabled ? READ_ALONG_ACTIVE_LABEL : READ_ALONG_LABEL}
          </button>
        )}
        {isLastPage && hasPdfPages && (
          <span className="ml-auto rounded-full bg-green-100 px-3 py-0.5 text-xs font-bold text-green-700">
            Last page - tap next for Quiz!
          </span>
        )}
      </div>

      {showAudioOnlyFallback ? (
        <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 px-6 py-10 text-center shadow-lg">
          <div className="mx-auto mb-3 inline-flex rounded-full bg-white px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-orange-500 shadow-sm">
            {AUDIO_ONLY_BADGE}
          </div>
          <div className="text-lg font-extrabold text-orange-700">{AUDIO_ONLY_TITLE}</div>
          <p className="mt-3 text-sm font-semibold leading-6 text-orange-600">{AUDIO_ONLY_COPY}</p>
        </div>
      ) : (
        <PdfViewer
          canvasKey={`${location.key}-${bookId}-${currentPage}`}
          renderToCanvas={renderToCanvas}
          isLoading={isLoading}
          error={error}
        />
      )}

      <TappableTextPanel
        wordsForPage={wordsForPage}
        flatWords={flatWords}
        activeWordIndex={activeWordIndex}
        onWordTap={(time) => player.seek(time)}
        visible={isReadAlongVisible}
        bottomOffset={TAPPABLE_PANEL_BOTTOM}
      />

      {hasPdfPages ? (
        <PageControls
          onNext={handleNext}
          onPrev={goPrev}
          isFirstPage={isFirstPage}
          isLastPage={false}
          currentPage={currentPage}
          totalPages={totalPages}
          bottomOffset={PAGE_CONTROLS_BOTTOM}
        />
      ) : showAudioOnlyFallback ? (
        <div
          className="pointer-events-none fixed left-0 right-0 z-40 flex justify-center px-4"
          style={{ bottom: `${PAGE_CONTROLS_BOTTOM}px` }}
        >
          <button
            type="button"
            onClick={completeBookAndGoQuiz}
            className="pointer-events-auto rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg active:scale-95"
          >
            {AUDIO_ONLY_QUIZ_LABEL}
          </button>
        </div>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <AudioBar audioUrl={audioUrl} player={player} />
      </div>
    </div>
  );
}
