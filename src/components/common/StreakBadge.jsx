import { useScore } from '../../contexts/ScoreContext';

export function StreakBadge() {
  const { streak } = useScore();

  if (streak < 1) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 sm:px-3">
      <span className="text-base">🔥</span>
      <span className="text-sm font-bold text-orange-700">{streak}</span>
      <span className="hidden text-xs text-orange-500 sm:inline">day streak</span>
    </div>
  );
}
