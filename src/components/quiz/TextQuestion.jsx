import React from 'react';
import { speak } from '../../services/speechService';
import { getQuizEmoji } from '../../utils/displayEmoji';

const DEFAULT_EMOJI  = String.fromCodePoint(0x2753);
const SPEAKER_ICON   = String.fromCodePoint(0x1f50a);

function getOptionClassName(index, selectedAnswer, isCorrect, correctAnswer) {
  const base = 'w-full min-h-[80px] rounded-2xl border-2 transition-all text-xl font-extrabold px-5 text-left flex items-center gap-3';

  if (selectedAnswer === null) {
    return `${base} border-gray-200 bg-white text-gray-800 active:scale-95`;
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

export function TextQuestion({
  question,
  options,
  onAnswer,
  selectedAnswer,
  isCorrect,
  emoji = DEFAULT_EMOJI,
  correctAnswer = null,
}) {
  const displayEmoji = getQuizEmoji(emoji);

  return (
    <div className="flex flex-col gap-5 px-4 py-6">

      {/* Emoji 展示区：h-36 → h-44，text-7xl → text-8xl */}
      <div className="flex h-44 items-center justify-center rounded-2xl bg-sky-50 border-2 border-sky-100">
        <span className="text-8xl leading-none">{displayEmoji}</span>
      </div>

      {/* 题目气泡：text-xl → text-2xl */}
      <div className="rounded-2xl bg-white/80 px-5 py-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-left text-2xl font-extrabold text-gray-800 leading-snug flex-1">
            {question}
          </div>
          {/* 朗读按钮：h-10 w-10 → h-14 w-14 */}
          <button
            type="button"
            onClick={() => speak(question, { lang: 'en-GB', rate: 0.9 })}
            className="shrink-0 flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 border-2 border-sky-100 text-2xl text-sky-500 shadow-sm active:scale-95 transition-transform"
            aria-label="Read question aloud"
          >
            {SPEAKER_ICON}
          </button>
        </div>
      </div>

      {/* 选项列表：min-h-[64px] → min-h-[80px]，text-base → text-xl */}
      <div className="flex flex-col gap-3">
        {options.map((option, index) => (
          <button
            key={`${option}-${index}`}
            type="button"
            disabled={selectedAnswer !== null}
            onClick={() => onAnswer(index)}
            className={getOptionClassName(index, selectedAnswer, isCorrect, correctAnswer)}
          >
            {/* A/B/C/D 字母徽章 */}
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-black ${
              selectedAnswer !== null && index === correctAnswer
                ? 'bg-green-500 text-white'
                : 'bg-orange-100 text-orange-600'
            }`}>
              {String.fromCharCode(65 + index)}
            </span>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
