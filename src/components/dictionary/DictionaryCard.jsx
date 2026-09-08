import { useState } from 'react';
import { speak } from '../../services/speechService';

const BOOK_ICON    = String.fromCodePoint(0x1f4d6);
const SPEAKER_ICON = String.fromCodePoint(0x1f50a);
const LEARNED_ICON = String.fromCodePoint(0x2705);

/* 朗读按钮：h-12 w-12 (48px) 圆形 */
function SpeakButton({ label, text, lang, rate = 0.85, size = 'md' }) {
  const sizeClass = size === 'lg' ? 'h-14 w-14 text-2xl' : 'h-12 w-12 text-xl';
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); speak(text, { lang, rate }); }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-sky-50 border-2 border-sky-100 text-sky-500 shadow-sm active:scale-95 transition-transform ${sizeClass}`}
      aria-label={label}
    >
      {SPEAKER_ICON}
    </button>
  );
}

export function DictionaryCard({ entry }) {
  /* 折叠状态：默认展开 */
  const [open, setOpen] = useState(true);
  const toggleOpen = () => setOpen((value) => !value);

  return (
    <div className="rounded-3xl bg-white shadow-md border-2 border-gray-100 overflow-hidden">

      {/* ── 标题行 ── */}
      <div className="flex w-full items-center gap-3 px-5 py-5">
        {/* 单词 + Learned 徽章：点击这里折叠 */}
        <button
          type="button"
          onClick={toggleOpen}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left"
          aria-expanded={open}
          aria-label={open ? `Collapse ${entry.display}` : `Expand ${entry.display}`}
        >
          <span className="text-3xl font-black text-gray-800">{entry.display}</span>
          {entry.learned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1.5 text-sm font-extrabold text-green-700">
              <span>{LEARNED_ICON}</span>
              <span>Learned</span>
            </span>
          )}
        </button>

        <SpeakButton
          label={`Read ${entry.display} aloud`}
          text={entry.display}
          lang="en-GB"
          rate={0.85}
          size="lg"
        />

        <button
          type="button"
          onClick={toggleOpen}
          className="shrink-0 p-2"
          aria-label={open ? 'Collapse' : 'Expand'}
          aria-expanded={open}
        >
          <span
            className="text-2xl text-gray-400 transition-transform duration-200"
            style={{ display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>
      </div>

      {/* ── 展开内容 ── */}
      {open && (
        <div className="flex flex-col gap-3 px-5 pb-5">

          {/* 英文释义 */}
          <div className="rounded-2xl bg-orange-50 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="mb-2 text-sm font-extrabold text-orange-500">
                  🇬🇧 English
                </div>
                {/* 释义正文：text-sm → text-lg */}
                <div className="text-lg font-bold leading-relaxed text-gray-700">
                  {entry.definitionEn}
                </div>
              </div>
              <SpeakButton
                label={`Read English meaning of ${entry.display}`}
                text={entry.definitionEn}
                lang="en-GB"
                rate={0.88}
              />
            </div>
          </div>

          {/* 中文释义 */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="mb-2 text-sm font-extrabold text-slate-500">
                  🇨🇳 中文
                </div>
                {/* 释义正文：text-sm → text-lg */}
                <div className="text-lg font-bold leading-relaxed text-gray-700">
                  {entry.definitionZh}
                </div>
              </div>
              <SpeakButton
                label={`Read Chinese meaning of ${entry.display}`}
                text={entry.definitionZh}
                lang="zh-CN"
                rate={0.92}
              />
            </div>
          </div>

          {/* 出现书目 */}
          {entry.occurrences.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-base">{BOOK_ICON}</span>
                <span className="text-sm font-extrabold text-orange-500">Found in</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {entry.occurrences.map((occurrence) => (
                  <span
                    key={`${entry.key}-${occurrence.bookId}`}
                    className="rounded-full bg-orange-100 px-4 py-2 text-sm font-extrabold text-orange-700"
                  >
                    {`S${occurrence.stage} ${occurrence.bookId}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
