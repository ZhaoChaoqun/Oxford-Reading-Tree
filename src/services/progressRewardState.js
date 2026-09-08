const DEFAULT_PROGRESS_ITEM = {
  status: 'not-started',
  currentPage: 0,
  quizPassed: false,
  speechPassed: false,
  videoDone: false,
  bookRewardClaimed: false,
  durationSeconds: null,
  familyStage: null,
  videoRewardPoints: null,
  scoreEarned: 0,
  quizAnswers: {},
  speechAnswers: {},
};

function normalizeProgressState(progress) {
  return progress && typeof progress === 'object' ? progress : {};
}

export function createDefaultProgressItem() {
  return {
    ...DEFAULT_PROGRESS_ITEM,
    quizAnswers: {},
    speechAnswers: {},
  };
}

export function mergeProgressItemInState(progress, id, updates) {
  const state = normalizeProgressState(progress);
  if (!id) return state;

  const current = state[id] || createDefaultProgressItem();
  return {
    ...state,
    [id]: {
      ...current,
      ...updates,
    },
  };
}

export function claimBookCompletionRewardInState(progress, id) {
  const state = normalizeProgressState(progress);
  if (!id) {
    return { next: state, isNew: false };
  }

  const current = state[id] || createDefaultProgressItem();
  if (current.bookRewardClaimed) {
    return { next: state, isNew: false };
  }

  return {
    next: {
      ...state,
      [id]: {
        ...current,
        status: 'completed',
        bookRewardClaimed: true,
      },
    },
    isNew: true,
  };
}

export function claimVideoCompletionRewardInState(progress, id, rewardDetails = {}) {
  const state = normalizeProgressState(progress);
  if (!id) {
    return { next: state, isNew: false };
  }

  const current = state[id] || createDefaultProgressItem();
  if (current.videoDone) {
    return { next: state, isNew: false };
  }

  return {
    next: {
      ...state,
      [id]: {
        ...current,
        videoDone: true,
        status: 'completed',
        durationSeconds: typeof rewardDetails.durationSeconds === 'number'
          ? rewardDetails.durationSeconds
          : current.durationSeconds,
        familyStage: typeof rewardDetails.familyStage === 'number'
          ? rewardDetails.familyStage
          : current.familyStage,
        videoRewardPoints: typeof rewardDetails.rewardPoints === 'number'
          ? rewardDetails.rewardPoints
          : current.videoRewardPoints,
      },
    },
    isNew: true,
  };
}

export function markQuizAnswerCorrectInState(progress, bookId, questionKey) {
  const state = normalizeProgressState(progress);
  if (!bookId || !questionKey) {
    return { next: state, isNew: false };
  }

  const current = state[bookId] || createDefaultProgressItem();
  if (current.quizAnswers?.[questionKey]) {
    return { next: state, isNew: false };
  }

  return {
    next: {
      ...state,
      [bookId]: {
        ...current,
        quizAnswers: {
          ...(current.quizAnswers ?? {}),
          [questionKey]: true,
        },
      },
    },
    isNew: true,
  };
}

export function markSpeechAnswerPassedInState(progress, bookId, word) {
  const state = normalizeProgressState(progress);
  if (!bookId || !word) {
    return { next: state, isNew: false };
  }

  const current = state[bookId] || createDefaultProgressItem();
  if (current.speechAnswers?.[word]) {
    return { next: state, isNew: false };
  }

  return {
    next: {
      ...state,
      [bookId]: {
        ...current,
        speechAnswers: {
          ...(current.speechAnswers ?? {}),
          [word]: true,
        },
      },
    },
    isNew: true,
  };
}
