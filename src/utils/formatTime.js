/**
 * Format seconds into MM:SS string
 * e.g. 90 → "1:30", 5 → "0:05"
 */
export function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format seconds into human-readable duration
 * e.g. 90 → "1 min 30 sec", 45 → "45 sec"
 */
export function formatDuration(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0 sec';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s} sec`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} sec`;
}