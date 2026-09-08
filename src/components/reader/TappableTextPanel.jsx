export function TappableTextPanel({
  wordsForPage,
  flatWords,
  activeWordIndex,
  onWordTap,
  visible,
  bottomOffset = 160,
}) {
  if (!visible) return null;

  const currentPage     = wordsForPage[0]?.page;
  const pageWordOffset  = currentPage == null
    ? 0
    : Math.max(0, flatWords.findIndex((word) => word.page === currentPage));

  return (
    <div
      className="fixed left-0 right-0 z-40 max-h-[32vh] overflow-y-auto border-t-2 border-orange-200 bg-gradient-to-b from-orange-50/95 to-white/98 px-4 pt-3 pb-4 shadow-[0_-8px_28px_rgba(249,115,22,0.12)]"
      style={{
        bottom: `${bottomOffset}px`,
        borderRadius: '24px 24px 0 0',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* 顶部拖拽把手 + 标签 */}
      <div className="mb-2 flex items-center justify-center gap-2">
        <div className="h-1 w-10 rounded-full bg-orange-200" />
      </div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base font-extrabold text-orange-500">点读</span>
        <span className="text-sm font-semibold text-gray-400">· Tap a word to hear it</span>
      </div>

      {/* 单词列表：gap 从 gap-x-1 gap-y-1 → gap-x-2 gap-y-2 */}
      <div className="flex flex-wrap gap-x-2 gap-y-2">
        {wordsForPage.map((word, idx) => {
          const isActive = pageWordOffset + idx === activeWordIndex;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onWordTap(word.start)}
              className={
                isActive
                  /* 激活词：从 bg-yellow-300 px-0.5 text-base →
                     橙色渐变背景 + 白色文字 + 阴影 + scale + 大字 */
                  ? 'rounded-xl bg-orange-500 px-3.5 py-2.5 text-xl font-black text-white shadow-md shadow-orange-200 scale-110 transition-all'
                  /* 非激活词：从 text-base → text-xl，加轻底色 */
                  : 'rounded-lg bg-orange-50 px-3 py-2.5 text-xl font-bold text-gray-800 transition-all active:scale-95'
              }
            >
              {word.word}
            </button>
          );
        })}
      </div>
    </div>
  );
}
