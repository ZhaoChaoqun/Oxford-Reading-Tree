import { useEffect } from 'react';

function getStarCount(correctAnswers, totalQuestions) {
  if (totalQuestions <= 0) {
    return 1;
  }

  const ratio = correctAnswers / totalQuestions;
  if (ratio <= 0.33) {
    return 1;
  }
  if (ratio <= 0.66) {
    return 2;
  }
  return 3;
}

function getMessage(starCount) {
  if (starCount === 3) {
    return 'Amazing! 🎉';
  }
  if (starCount === 2) {
    return 'Well done! 😊';
  }
  return 'Keep trying! 💪';
}

export function QuizResult({
  correctAnswers,
  totalQuestions,
  onConfetti,
  onDone,
  onRetry,
  onSpeech,
}) {
  const starCount = getStarCount(correctAnswers, totalQuestions);

  useEffect(() => {
    if (correctAnswers >= Math.ceil(totalQuestions / 2)) {
      onConfetti();
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-yellow-50 to-orange-50 px-6">
      <div className="flex gap-3">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="star-pop text-5xl"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            {index < starCount ? '⭐' : '☆'}
          </span>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <div className="text-3xl font-bold text-gray-800">
          {correctAnswers} / {totalQuestions}
        </div>
        <div className="text-lg font-semibold text-gray-600">{getMessage(starCount)}</div>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        {onSpeech && (
          <button
            type="button"
            onClick={onSpeech}
            className="rounded-2xl bg-sky-500 py-4 text-lg font-bold text-white shadow-md transition-transform active:scale-95"
          >
            🎤 Practise Speaking
          </button>
        )}
        <button
          type="button"
          onClick={onDone}
          className="rounded-2xl bg-orange-500 py-4 text-lg font-bold text-white shadow-md transition-transform active:scale-95"
        >
          Back to Library
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-2xl border-2 border-orange-300 bg-white py-4 text-lg font-bold text-orange-600 transition-transform active:scale-95"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
