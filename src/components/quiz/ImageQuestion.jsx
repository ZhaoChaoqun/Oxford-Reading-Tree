import React from 'react';

/* 根据答题状态返回选项样式 */
function getOptionClassName(index, selectedAnswer, isCorrect, correctAnswer) {
  const base = 'min-h-[80px] rounded-2xl border-2 transition-all active:scale-95 text-xl font-extrabold px-4';

  if (selectedAnswer === null) {
    return `${base} border-gray-200 bg-white text-gray-800`;
  }
  if (index === selectedAnswer && isCorrect === true) {
    return `${base} border-green-500 bg-green-100 text-green-800`;
  }
  if (index === selectedAnswer && isCorrect === false) {
    return `${base} border-red-400 bg-red-100 text-red-800`;
  }
  if (isCorrect === false && correctAnswer !== null && index === correctAnswer) {
    return `${base} border-green-400 bg-green-50 text-green-700`;
  }
  return `${base} cursor-not-allowed border-gray-200 bg-white text-gray-700 opacity-40`;
}

export function ImageQuestion({
  question,
  options,
  onAnswer,
  selectedAnswer,
  isCorrect,
  imageUrl,
  correctAnswer = null,
}) {
  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      {/* 图片区域：max-h-56 → max-h-64 */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="question image"
          className="max-h-64 w-full rounded-2xl object-cover shadow"
        />
      ) : (
        <div className="flex h-52 items-center justify-center rounded-2xl bg-orange-50 text-7xl">
          📖
        </div>
      )}

      {/* 题目文字：text-xl → text-2xl */}
      <div className="rounded-2xl bg-white/80 px-4 py-4 shadow-sm">
        <div className="text-center text-2xl font-extrabold text-gray-800">{question}</div>
      </div>

      {/* 选项：2列网格，min-h-[64px] → min-h-[80px]，text-base → text-xl */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((option, index) => (
          <button
            key={`${option}-${index}`}
            type="button"
            disabled={selectedAnswer !== null}
            onClick={() => onAnswer(index)}
            className={getOptionClassName(index, selectedAnswer, isCorrect, correctAnswer)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
