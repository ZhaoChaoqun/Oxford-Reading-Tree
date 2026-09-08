const SEARCH_ICON = String.fromCodePoint(0x1f50d);
const CLOSE_ICON  = String.fromCodePoint(0x2715);

export function DictionarySearch({ value, onChange, placeholder = 'Search words…' }) {
  return (
    <div className="relative">
      <input
        type="search"
        /* 输入框：py-3 text-base → py-4 text-xl，字体加粗 */
        className="w-full rounded-2xl border-2 border-gray-200 bg-white py-4 pl-14 pr-12 text-xl font-bold text-gray-800 placeholder:text-gray-400 placeholder:font-normal focus:border-orange-400 focus:outline-none shadow-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />

      {/* 搜索图标：text-lg → text-2xl */}
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">
        {SEARCH_ICON}
      </div>

      {/* 清除按钮：h-6 w-6 (24px) → h-10 w-10 (40px)，更易点击 */}
      {value.length > 0 ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-gray-200 text-base font-bold text-gray-600 active:scale-95 transition-transform"
          aria-label="Clear search"
        >
          {CLOSE_ICON}
        </button>
      ) : null}
    </div>
  );
}
