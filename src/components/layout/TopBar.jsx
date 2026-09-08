import { useLocation, useNavigate } from 'react-router-dom';
import { StreakBadge } from '../common/StreakBadge';
import ScoreJar from '../rewards/ScoreJar';

export default function TopBar({
  title = 'Oxford Reading Tree',
  showBack = false,
  rightContent,
}) {
  const navigate = useNavigate();
  useLocation();

  return (
    <header
      className="fixed left-0 right-0 top-0 z-40 border-b-2 border-orange-100 bg-white shadow-sm"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* 高度从 h-14 (56px) 提升到 h-16 (64px) */}
      <div className="flex h-16 items-center gap-3 px-4">

        {/* 返回按钮从 h-8 w-8 (32px) 提升到 h-12 w-12 (48px) */}
        <div className="w-12 shrink-0">
          {showBack ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-2xl font-black text-orange-500 active:bg-orange-100 active:scale-95 transition-transform"
            >
              {'\u2190'}
            </button>
          ) : (
            <div className="w-12" />
          )}
        </div>

        {/* 标题从 text-xl (20px) 提升到 text-2xl (24px) */}
        <div className="flex-1">
          <h2 className="truncate text-center text-2xl font-extrabold text-gray-800">
            {title}
          </h2>
        </div>

        {/* 右侧：连续天数 + 积分 */}
        <div className="flex min-w-[3rem] shrink-0 items-center justify-end gap-2">
          <StreakBadge />
          {rightContent ?? <ScoreJar size="mini" />}
        </div>
      </div>
    </header>
  );
}
