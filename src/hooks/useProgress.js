import { useState, useCallback, useRef } from 'react';
import { kv, STORAGE_KEYS, migrateProgress } from '../services/storageService';
import {
  claimBookCompletionRewardInState,
  claimVideoCompletionRewardInState,
  createDefaultProgressItem,
  markQuizAnswerCorrectInState,
  markSpeechAnswerPassedInState,
  mergeProgressItemInState,
} from '../services/progressRewardState.js';

function loadProgress() {
  const raw = kv.get(STORAGE_KEYS.PROGRESS);
  return migrateProgress(raw);
}

function saveProgress(data) {
  kv.set(STORAGE_KEYS.PROGRESS, data);
}

export function useProgress() {
  const [progress, setProgress] = useState(loadProgress);
  const progressRef = useRef(progress);

  const persistProgress = useCallback((next) => {
    progressRef.current = next;
    setProgress(next);
    saveProgress(next);
  }, []);

  const applyTransition = useCallback((transition) => {
    const prev = progressRef.current;
    const result = transition(prev);
    const next = result?.next ?? prev;

    if (next !== prev) {
      persistProgress(next);
    }

    return result;
  }, [persistProgress]);

  const getItem = useCallback((id) => {
    return progressRef.current[id] || createDefaultProgressItem();
  }, []);

  const updateItem = useCallback((id, updates) => {
    if (!id) return;

    applyTransition((prev) => ({
      next: mergeProgressItemInState(prev, id, updates),
    }));
  }, [applyTransition]);

  const setCurrentPage = useCallback((id, page, totalPages) => {
    const status = page >= totalPages ? 'completed' : 'in-progress';
    updateItem(id, { currentPage: page, status });
  }, [updateItem]);

  const markBookComplete = useCallback((id) => {
    updateItem(id, { status: 'completed' });
  }, [updateItem]);

  const claimBookCompletionReward = useCallback((id) => {
    return applyTransition((prev) => claimBookCompletionRewardInState(prev, id)).isNew;
  }, [applyTransition]);

  const markQuizPassed = useCallback((id) => {
    updateItem(id, { quizPassed: true });
  }, [updateItem]);

  const markVideoDone = useCallback((id) => {
    updateItem(id, { videoDone: true, status: 'completed' });
  }, [updateItem]);

  const claimVideoCompletionReward = useCallback((id, rewardDetails) => {
    return applyTransition((prev) => claimVideoCompletionRewardInState(prev, id, rewardDetails)).isNew;
  }, [applyTransition]);

  const addScore = useCallback((id, points) => {
    if (!id) return;

    applyTransition((prev) => {
      const current = prev[id] || createDefaultProgressItem();
      return {
        next: {
          ...prev,
          [id]: {
            ...current,
            scoreEarned: (current.scoreEarned || 0) + points,
          },
        },
      };
    });
  }, [applyTransition]);

  const markQuizAnswerCorrect = useCallback((bookId, questionKey) => {
    return applyTransition((prev) => markQuizAnswerCorrectInState(prev, bookId, questionKey)).isNew;
  }, [applyTransition]);

  const markSpeechAnswerPassed = useCallback((bookId, word) => {
    return applyTransition((prev) => markSpeechAnswerPassedInState(prev, bookId, word)).isNew;
  }, [applyTransition]);

  const isCompleted = useCallback((id) => {
    return progress[id]?.status === 'completed';
  }, [progress]);

  const getNextItem = useCallback((schedule) => {
    return schedule.find((item) => !isCompleted(item.id)) || null;
  }, [isCompleted]);

  return {
    progress,
    getItem,
    updateItem,
    setCurrentPage,
    markBookComplete,
    claimBookCompletionReward,
    markQuizPassed,
    markVideoDone,
    claimVideoCompletionReward,
    addScore,
    markQuizAnswerCorrect,
    markSpeechAnswerPassed,
    isCompleted,
    getNextItem,
  };
}
