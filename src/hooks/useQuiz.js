import { useState, useCallback, useMemo } from 'react';
import booksData from '../data/books.json';
import { getStageRewardPoints } from '../services/scoringEngine';

export function extractQuestions(quiz) {
  if (!quiz) return [];

  return Object.entries(quiz)
    .filter(([key]) => key !== 'keywords')
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([key, question]) => ({ ...question, _key: key }));
}

export function useQuiz(bookId, { onNewCorrect } = {}) {
  const book = useMemo(
    () => booksData.books.find((entry) => entry.id === bookId) ?? null,
    [bookId]
  );

  const questions = useMemo(() => extractQuestions(book?.quiz), [book]);
  const keywords = useMemo(() => book?.keywords ?? [], [book]);

  const [phase, setPhase] = useState('idle');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  const totalQuestions = questions.length;
  const rewardPoints = getStageRewardPoints(book?.stage);
  const question =
    phase === 'question' || phase === 'reviewing'
      ? (questions[questionIndex] ?? null)
      : null;
  const pointsEarned = correctAnswers * rewardPoints;

  const start = useCallback(() => {
    setPhase('question');
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setCorrectAnswers(0);
  }, []);

  const answer = useCallback((optionIndex) => {
    if (phase !== 'question') return;

    const currentQuestion = questions[questionIndex];
    if (!currentQuestion) return;

    const correct = optionIndex === currentQuestion.answer;
    const questionKey = currentQuestion._key;

    setSelectedAnswer(optionIndex);
    setIsCorrect(correct);
    if (correct) {
      setCorrectAnswers((prev) => prev + 1);
      onNewCorrect?.(questionKey);
    }
    setPhase('reviewing');
  }, [onNewCorrect, phase, questionIndex, questions]);

  const next = useCallback(() => {
    if (phase !== 'reviewing') return;

    const nextIndex = questionIndex + 1;
    if (nextIndex >= questions.length) {
      setPhase('complete');
      return;
    }

    setQuestionIndex(nextIndex);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setPhase('question');
  }, [phase, questionIndex, questions.length]);

  const retry = useCallback(() => {
    setPhase('question');
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setCorrectAnswers(0);
  }, []);

  return {
    questions,
    keywords,
    totalQuestions,
    question,
    questionIndex,
    phase,
    selectedAnswer,
    isCorrect,
    correctAnswers,
    pointsEarned,
    start,
    answer,
    next,
    retry,
  };
}
