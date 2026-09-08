import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import booksData from '../../data/books.json';
import { useQuiz } from '../../hooks/useQuiz';
import { useScore } from '../../contexts/ScoreContext';
import { useProgress } from '../../hooks/useProgress';
import { useConfetti } from '../../hooks/useConfetti';
import { getStageRewardPoints } from '../../services/scoringEngine';
import { ImageQuestion } from './ImageQuestion';
import { TextQuestion } from './TextQuestion';
import { QuizResult } from './QuizResult';

const BACK_ARROW = String.fromCodePoint(0x2190);
const NEXT_ARROW = String.fromCodePoint(0x2192);

export default function QuizPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { awardPoints, onUnitComplete } = useScore();
  const { getItem, markQuizPassed, markQuizAnswerCorrect } = useProgress();
  const { burst: triggerConfetti } = useConfetti();
  const awardedRef = useRef(false);
  const book = useMemo(
    () => booksData.books.find((entry) => entry.id === bookId) ?? null,
    [bookId]
  );
  const hasSpeech = (book?.keywords?.length ?? 0) > 0;
  const stageRewardPoints = getStageRewardPoints(book?.stage);

  const {
    question,
    questionIndex,
    totalQuestions,
    phase,
    selectedAnswer,
    isCorrect,
    correctAnswers,
    start,
    answer,
    next,
    retry,
  } = useQuiz(bookId, {
    onNewCorrect: (questionKey) => {
      if (bookId && markQuizAnswerCorrect(bookId, questionKey)) {
        awardPoints(stageRewardPoints, 'quiz_correct');
      }
    },
  });

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => {
    if (
      phase === 'question' &&
      questionIndex === 0 &&
      selectedAnswer === null &&
      correctAnswers === 0
    ) {
      awardedRef.current = false;
    }
  }, [correctAnswers, phase, questionIndex, selectedAnswer]);

  useEffect(() => {
    if (!bookId || phase !== 'complete' || awardedRef.current) return;

    awardedRef.current = true;
    if (!getItem(bookId).quizPassed) {
      markQuizPassed(bookId);
    }
    onUnitComplete(bookId);
  }, [bookId, getItem, markQuizPassed, onUnitComplete, phase]);

  if (phase === 'complete') {
    return (
      <QuizResult
        correctAnswers={correctAnswers}
        totalQuestions={totalQuestions}
        onConfetti={triggerConfetti}
        onDone={() => navigate('/')}
        onRetry={retry}
        onSpeech={hasSpeech ? () => navigate(`/speech/${bookId}`) : undefined}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-yellow-50 to-orange-50">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center text-gray-600"
          aria-label="Go back"
        >
          {BACK_ARROW}
        </button>
        <div className="flex flex-1 items-center gap-2">
          {Array.from({ length: totalQuestions }).map((_, index) => (
            <div
              key={index}
              className={`h-3 w-3 rounded-full ${
                index < questionIndex
                  ? 'bg-green-400'
                  : index === questionIndex && phase !== 'complete'
                    ? 'bg-orange-400'
                    : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        {phase === 'idle' ? (
          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
          </div>
        ) : phase === 'question' || phase === 'reviewing' ? (
          question?.type === 'image' ? (
            <ImageQuestion
              question={question.question}
              options={question.options}
              onAnswer={answer}
              selectedAnswer={selectedAnswer}
              isCorrect={isCorrect}
              imageUrl={question.imageUrl}
              correctAnswer={question.answer}
            />
          ) : question ? (
            <TextQuestion
              question={question.question}
              options={question.options}
              onAnswer={answer}
              selectedAnswer={selectedAnswer}
              isCorrect={isCorrect}
              emoji={question.emoji}
              correctAnswer={question.answer}
            />
          ) : null
        ) : null}
      </div>

      {phase === 'reviewing' ? (
        <button
          type="button"
          onClick={next}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-2xl bg-orange-500 px-10 py-4 text-lg font-bold text-white shadow-lg active:scale-95"
        >
          Next {NEXT_ARROW}
        </button>
      ) : null}
    </div>
  );
}
