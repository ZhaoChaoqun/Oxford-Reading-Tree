import { formatTime } from '../../utils/formatTime';

const PLAY_ICON  = String.fromCodePoint(0x25b6);
const PAUSE_ICON = String.fromCodePoint(0x23f8);

export function AudioBar({ audioUrl, player }) {
  if (!audioUrl) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 border-t-2 border-orange-100 bg-white/95 px-4 py-3 backdrop-blur"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-4">

        {/* 播放按钮：h-12 w-12 (48px) → h-16 w-16 (64px)，渐变背景 */}
        <button
          type="button"
          onClick={player.toggle}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-orange-500 text-2xl font-black text-white shadow-lg shadow-orange-200 active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }}
          aria-label={player.isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {player.isLoading ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-orange-200 border-t-white" />
          ) : player.isPlaying ? (
            PAUSE_ICON
          ) : (
            PLAY_ICON
          )}
        </button>

        {/* 进度条区域 */}
        <div className="flex-1 min-w-0">
          {/* 时间：text-xs (12px) → text-base (16px) */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-base font-bold text-gray-600">
              {formatTime(player.currentTime)}
            </span>
            <span className="text-base font-bold text-gray-400">
              {formatTime(player.duration)}
            </span>
          </div>

          {player.error ? (
            <div className="text-base font-semibold text-red-500">Audio unavailable</div>
          ) : (
            /* 进度条：h-2 (8px) → h-3 (12px) */
            <input
              type="range"
              min="0"
              max={player.duration || 0}
              value={player.currentTime}
              onChange={(event) => player.seek(Number(event.target.value))}
              className="h-3 w-full cursor-pointer accent-orange-500"
              aria-label="Audio progress"
            />
          )}
        </div>

        {/* 音量/速度快捷按钮：新增，48px */}
        <button
          type="button"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-xl text-orange-500 active:scale-95 transition-transform"
          aria-label="Speaker"
        >
          🔊
        </button>
      </div>
    </div>
  );
}
