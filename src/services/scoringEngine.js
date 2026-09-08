/**
 * Points awarded for each action (matches requirements doc)
 */
export const POINTS = {
  VIDEO_COMPLETE: 5,
  BOOK_COMPLETE: 6,
  QUIZ_CORRECT: 6,
  SPEECH_CORRECT: 6,
  SPEECH_PASS: 6,
  UNIT_BONUS: 10,
  STREAK_DAILY: 5,
};

const STAGE_REWARD_POINTS = Object.freeze([6, 7, 8, 9, 10, 11, 13, 14, 16]);

function normalizeStage(stage) {
  const numericStage = Number(stage);
  if (!Number.isFinite(numericStage)) {
    return 1;
  }
  return Math.min(Math.max(Math.trunc(numericStage), 1), STAGE_REWARD_POINTS.length);
}

export function getStageRewardPoints(stage = 1) {
  return STAGE_REWARD_POINTS[normalizeStage(stage) - 1];
}

export function getStageRewardMultiplier(stage = 1) {
  return getStageRewardPoints(stage) / getStageRewardPoints(1);
}

export function getFamilyVideoRewardPoints(familyStage = 1, durationSeconds = 0) {
  const duration = Number(durationSeconds);
  const durationMinutes = Number.isFinite(duration) && duration > 0
    ? Math.ceil(duration / 60)
    : 0;
  const durationPoints = Math.max(POINTS.VIDEO_COMPLETE, durationMinutes * 2);
  return Math.max(
    POINTS.VIDEO_COMPLETE,
    Math.round(durationPoints * getStageRewardMultiplier(familyStage))
  );
}

function countAwardedEntries(record) {
  if (!record || typeof record !== 'object') {
    return 0;
  }

  return Object.values(record).filter(Boolean).length;
}

function buildMetadataMap(items = []) {
  if (!Array.isArray(items)) {
    return new Map();
  }

  return new Map(items.map((item) => [item.id, item]));
}

export function calculateProgressRewardTotal(progress, metadata = {}) {
  if (!progress || typeof progress !== 'object') {
    return 0;
  }

  const booksById = buildMetadataMap(metadata.books);
  const videosById = buildMetadataMap(metadata.videos);

  return Object.entries(progress).reduce((total, [id, item]) => {
    if (!item || typeof item !== 'object') {
      return total;
    }

    let nextTotal = total;
    const book = booksById.get(id);
    const video = videosById.get(id);
    const bookStage = book?.stage ?? item.stage ?? 1;

    if (item.bookRewardClaimed) {
      nextTotal += getStageRewardPoints(bookStage);
    }

    if (item.videoDone) {
      nextTotal += typeof item.videoRewardPoints === 'number'
        ? item.videoRewardPoints
        : getFamilyVideoRewardPoints(
          video?.familyStage ?? item.familyStage ?? 1,
          video?.durationSeconds ?? item.durationSeconds ?? 0
        );
    }

    nextTotal += countAwardedEntries(item.quizAnswers) * getStageRewardPoints(bookStage);
    nextTotal += countAwardedEntries(item.speechAnswers) * getStageRewardPoints(bookStage);

    return nextTotal;
  }, 0);
}

export function reconcileScoreWithProgress(scoreState, progress, metadata = {}) {
  const base = scoreState && typeof scoreState === 'object' ? scoreState : {};
  const currentLifetime = typeof base.lifetimeStarsEarned === 'number'
    ? base.lifetimeStarsEarned
    : (typeof base.totalScore === 'number' ? base.totalScore : 0);
  const currentSpendable = typeof base.spendableStars === 'number'
    ? base.spendableStars
    : (typeof base.totalScore === 'number' ? base.totalScore : 0);
  const minimumLifetime = calculateProgressRewardTotal(progress, metadata);

  if (minimumLifetime <= currentLifetime) {
    return {
      ...base,
      lifetimeStarsEarned: currentLifetime,
      spendableStars: currentSpendable,
      totalScore: currentSpendable,
    };
  }

  const delta = minimumLifetime - currentLifetime;
  return {
    ...base,
    lifetimeStarsEarned: minimumLifetime,
    spendableStars: currentSpendable + delta,
    totalScore: currentSpendable + delta,
  };
}

export function calcBookPoints(pagesRead, totalPages, stage = 1) {
  if (totalPages <= 0) return 0;
  return pagesRead >= totalPages ? getStageRewardPoints(stage) : 0;
}

export function calcVideoPoints(watchedRatio, video = {}) {
  return watchedRatio >= 0.9
    ? getFamilyVideoRewardPoints(video.familyStage, video.durationSeconds)
    : 0;
}

export function calcQuizPoints(correctCount, speechPassed, stage = 1) {
  const rewardPoints = getStageRewardPoints(stage);
  return correctCount * rewardPoints + (speechPassed ? rewardPoints : 0);
}

export function isUnitComplete(unitStatus) {
  return unitStatus.bookDone && unitStatus.quizDone;
}

export function calcStreakBonus(streakDays) {
  return streakDays >= 1 ? POINTS.STREAK_DAILY : 0;
}

export function updateStreak(currentStreak, lastDate) {
  const today = new Date().toISOString().slice(0, 10);
  if (!lastDate) return { streak: 1, lastDate: today };
  if (lastDate === today) return { streak: currentStreak, lastDate: today };
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (lastDate === yesterday) return { streak: currentStreak + 1, lastDate: today };
  return { streak: 1, lastDate: today };
}

export function applyUnitCompleteStreak(prevState, today = new Date().toISOString().slice(0, 10)) {
  if (prevState.lastActiveDate === today) {
    return {
      changed: false,
      streak: prevState.streak,
      lastActiveDate: prevState.lastActiveDate,
      pendingStickerPicks: prevState.pendingStickerPicks,
      newPicks: 0,
    };
  }

  const yesterday = new Date(new Date(`${today}T00:00:00Z`).getTime() - 86400000)
    .toISOString()
    .slice(0, 10);
  const newStreak = prevState.lastActiveDate === yesterday ? prevState.streak + 1 : 1;
  const prevMilestone = Math.floor((prevState.streak ?? 0) / 5);
  const newMilestone = Math.floor(newStreak / 5);
  const newPicks = newMilestone > prevMilestone ? newMilestone - prevMilestone : 0;

  return {
    changed: true,
    streak: newStreak,
    lastActiveDate: today,
    pendingStickerPicks: (prevState.pendingStickerPicks ?? 0) + newPicks,
    newPicks,
  };
}
