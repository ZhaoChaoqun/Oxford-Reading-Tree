import { useMemo, useState } from 'react';
import { DictionarySearch } from './DictionarySearch';
import { DictionaryCard } from './DictionaryCard';
import { filterDictionaryEntries } from '../../services/staticDictionary';
import {
  getDictionaryEntries,
  getDictionaryLetters,
} from '../../services/dictionaryLibrary';

const LEARNED_FILTERS = [
  { key: 'all',         label: 'All 📚'       },
  { key: 'learned',     label: '✅ Learned'    },
  { key: 'not-learned', label: '🔒 Not yet'   },
];

/* Filter pill：text-xs py-1.5 (≈34px) → text-base py-3 (≈52px) */
function FilterPill({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-5 py-3 text-base font-extrabold shadow-sm transition-all active:scale-95 ${
        active
          ? 'bg-orange-500 text-white shadow-orange-200'
          : 'border-2 border-gray-200 bg-white text-gray-600'
      }`}
    >
      {label}
    </button>
  );
}

/* 字母按钮：text-xs → text-base，h≈34px → h-12 w-12 */
function LetterPill({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 shrink-0 items-center justify-center rounded-xl text-base font-black transition-all active:scale-95 ${
        label === 'All' ? 'w-16' : 'w-12'
      } ${
        active
          ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
          : 'border-2 border-gray-200 bg-white text-gray-600'
      }`}
    >
      {label}
    </button>
  );
}

export default function DictionaryPage() {
  const [entries]       = useState(() => getDictionaryEntries());
  const [query,         setQuery]         = useState('');
  const [learnedFilter, setLearnedFilter] = useState('all');
  const [letterFilter,  setLetterFilter]  = useState('all');

  const letters  = useMemo(() => getDictionaryLetters(entries), [entries]);
  const filtered = useMemo(
    () => filterDictionaryEntries(entries, { query, learnedFilter, letterFilter }),
    [entries, query, learnedFilter, letterFilter]
  );

  return (
    <div className="px-4 py-4 pb-24">

      {/* 页面标题：text-2xl → text-3xl，副标题移除（孩子不需要） */}
      <div className="mb-4 text-3xl font-black text-gray-800">Dictionary 📙</div>

      {/* 搜索框（已在 DictionarySearch 内加大） */}
      <DictionarySearch
        value={query}
        onChange={setQuery}
        placeholder="Search a word..."
      />

      {/* 已学 / 未学 筛选：text-xs py-1.5 → text-base py-3 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {LEARNED_FILTERS.map((filter) => (
          <FilterPill
            key={filter.key}
            active={learnedFilter === filter.key}
            label={filter.label}
            onClick={() => setLearnedFilter(filter.key)}
          />
        ))}
      </div>

      {/* 字母筛选横向滚动条：text-xs → text-base，高度 h-12 */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2 -webkit-overflow-scrolling-touch">
        <LetterPill
          active={letterFilter === 'all'}
          label="All"
          onClick={() => setLetterFilter('all')}
        />
        {letters.map((letter) => (
          <LetterPill
            key={letter}
            active={letterFilter === letter}
            label={letter}
            onClick={() => setLetterFilter(letter)}
          />
        ))}
      </div>

      {/* 词数统计移除（对孩子无意义） */}

      {/* 空状态：text-sm → text-xl，加大 emoji */}
      {filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-sky-50 p-10 text-center border-2 border-sky-100">
          <div className="text-6xl mb-3">🔍</div>
          <div className="text-xl font-extrabold text-gray-600">No words found</div>
          <div className="mt-2 text-base font-semibold text-gray-400">
            Try a different search!
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {filtered.map((entry) => (
            <DictionaryCard key={entry.key} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
