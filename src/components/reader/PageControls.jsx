import { useEffect, useRef } from 'react';

const LEFT_ARROW = String.fromCodePoint(0x2190);
const RIGHT_ARROW = String.fromCodePoint(0x2192);

export function PageControls({
  onNext,
  onPrev,
  isFirstPage,
  isLastPage,
  currentPage,
  totalPages,
  bottomOffset = 96,
}) {
  const swipeStartXRef = useRef(null);
  const startedOnButtonRef = useRef(false);

  useEffect(() => {
    const handleTouchStart = (event) => {
      const touch = event.changedTouches?.[0];
      if (!touch) {
        return;
      }

      startedOnButtonRef.current = Boolean(event.target?.closest?.('button'));
      swipeStartXRef.current = touch.clientX;
    };

    const handleTouchEnd = (event) => {
      const touch = event.changedTouches?.[0];
      if (!touch || swipeStartXRef.current === null || startedOnButtonRef.current) {
        swipeStartXRef.current = null;
        startedOnButtonRef.current = false;
        return;
      }

      if (event.target?.closest?.('button')) {
        swipeStartXRef.current = null;
        startedOnButtonRef.current = false;
        return;
      }

      const deltaX = touch.clientX - swipeStartXRef.current;
      swipeStartXRef.current = null;
      startedOnButtonRef.current = false;

      if (deltaX < -50 && !isLastPage) {
        onNext();
      } else if (deltaX > 50 && !isFirstPage) {
        onPrev();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isFirstPage, isLastPage, onNext, onPrev]);

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 flex items-center justify-between px-4"
      style={{ bottom: `${bottomOffset}px` }}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={isFirstPage}
        className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-3xl font-bold text-orange-500 shadow-md disabled:opacity-40"
        aria-label="Previous page"
      >
        {LEFT_ARROW}
      </button>

      <div className="rounded-full bg-white/80 px-4 py-1 text-sm font-semibold text-gray-600 shadow-sm">
        {currentPage} / {totalPages}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={isLastPage}
        className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-3xl font-bold text-orange-500 shadow-md disabled:opacity-40"
        aria-label="Next page"
      >
        {RIGHT_ARROW}
      </button>
    </div>
  );
}
