import { Link, useLocation } from 'react-router-dom';

const TABS = [
  { path: '/',            label: '书库', emoji: String.fromCodePoint(0x1f4da) },
  { path: '/curriculum',  label: '路径', emoji: String.fromCodePoint(0x1f5fa, 0xfe0f) },
  { path: '/rewards',     label: '奖励', emoji: String.fromCodePoint(0x2b50) },
  { path: '/dictionary',  label: '词典', emoji: String.fromCodePoint(0x1f4d9) },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-orange-100 bg-white shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* 高度从 h-16 (64px) 提升到 h-20 (80px)，更易点击 */}
      <div className="flex h-20 items-stretch">
        {TABS.map((tab) => {
          const isActive =
            tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-1 flex-col items-center justify-center gap-1 ${
                isActive ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              {/* Emoji 从 text-2xl (24px) 提升到 text-3xl (30px) */}
              <span
                className={`text-3xl leading-none transition-transform ${
                  isActive ? 'scale-110' : ''
                }`}
              >
                {tab.emoji}
              </span>
              {/* 标签从 text-xs (12px) 提升到 text-base (16px)，font-bold → font-extrabold */}
              <span className={`text-base font-extrabold ${isActive ? 'text-orange-500' : 'text-gray-400'}`}>
                {tab.label}
              </span>
              {/* 激活指示点 */}
              {isActive && (
                <span className="absolute bottom-2 h-1.5 w-1.5 rounded-full bg-orange-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
