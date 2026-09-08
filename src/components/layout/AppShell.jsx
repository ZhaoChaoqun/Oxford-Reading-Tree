import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';
import TopBar from './TopBar.jsx';

const TITLE_MAP = {
  '/':            'Oxford Reading Tree',
  '/curriculum':  'Learning Path',
  '/rewards':     'My Rewards',
  '/dictionary':  'Dictionary',
  '/speech-debug':'Speech Debug',
};

const BACK_BUTTON_PATHS = ['/book/', '/video/', '/quiz/', '/speech-debug'];

export default function AppShell({ title, showBack }) {
  const location = useLocation();

  const resolvedTitle = title ?? TITLE_MAP[location.pathname] ?? 'Oxford Reading Tree';
  const autoShowBack  = BACK_BUTTON_PATHS.some((path) =>
    location.pathname.startsWith(path)
  );
  const resolvedShowBack = showBack ?? autoShowBack;

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col">
      <TopBar title={resolvedTitle} showBack={resolvedShowBack} />
      <main
        className="flex-1 overflow-y-auto"
        style={{
          /* TopBar h-16 (64px) + safe-area-top */
          paddingTop: 'calc(4rem + env(safe-area-inset-top))',
          /* BottomNav h-20 (80px) + safe-area-bottom + 16px 额外边距 */
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom) + 1rem)',
        }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
