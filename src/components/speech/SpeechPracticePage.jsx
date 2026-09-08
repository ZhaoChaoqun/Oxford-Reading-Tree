import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProgress } from '../../hooks/useProgress';
import { SpeechQuestion } from './SpeechQuestion';
import booksData from '../../data/books.json';

const STAR_EMOJI = String.fromCodePoint(0x1f31f);
const PARTY_EMOJI = String.fromCodePoint(0x1f389);
const FLEX_EMOJI = String.fromCodePoint(0x1f4aa);

export function SpeechPracticePage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { markSpeechAnswerPassed } = useProgress();
  const [wordIndex, setWordIndex] = useState(0);
  const [passed, setPassed] = useState(0);
  const [done, setDone] = useState(false);

  const book = booksData.books.find((entry) => entry.id === bookId);
  const keywords = book?.keywords ?? [];

  const finishSession = useCallback(() => {
    setDone(true);
  }, []);

  const goNextWord = useCallback((result = null) => {
    if (result?.passed && !result.autoPass) {
      setPassed((prev) => prev + 1);
    }

    setWordIndex((prev) => {
      if (prev + 1 >= keywords.length) {
        finishSession();
        return prev;
      }
      return prev + 1;
    });
  }, [finishSession, keywords.length]);

  if (keywords.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <div className="text-2xl font-bold text-gray-800">No words to practise</div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-2xl bg-orange-500 px-8 py-4 text-lg font-bold text-white shadow active:scale-95"
        >
          Back
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-sky-50 to-white px-6 py-16 text-center">
        <div className="text-7xl">{STAR_EMOJI}</div>
        <div className="text-3xl font-bold text-gray-800">{passed} / {keywords.length} words</div>
        <div className="text-base text-gray-500">
          {passed >= keywords.length * 0.6
            ? `Amazing speaking! ${PARTY_EMOJI}`
            : `Good practice! Keep it up ${FLEX_EMOJI}`}
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-2xl bg-orange-500 px-8 py-4 text-lg font-bold text-white shadow active:scale-95"
        >
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <SpeechQuestion
      word={keywords[wordIndex]}
      bookId={bookId}
      stage={book?.stage}
      markSpeechAnswerPassed={markSpeechAnswerPassed}
      onPass={goNextWord}
      onSkip={() => goNextWord(null)}
      wordIndex={wordIndex + 1}
      totalWords={keywords.length}
    />
  );
}
