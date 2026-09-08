import { usePdfThumbnail } from '../../hooks/usePdfThumbnail';
import { useResource } from '../../contexts/ResourceContext';

const STAGE_CLASS_MAP = {
  1: 'bg-green-100 text-green-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-purple-100 text-purple-700',
  4: 'bg-orange-100 text-orange-700',
};

const BOOK_EMOJI  = String.fromCodePoint(0x1f4d6);
const NEXT_EMOJI  = String.fromCodePoint(0x1f449);
const DONE_EMOJI  = String.fromCodePoint(0x2705);

export default function BookCard({ book, isCompleted, isCurrent, onClick }) {
  const { baseUrl } = useResource();
  const pdfUrl = baseUrl && book.pdfFile
    ? `${baseUrl.replace(/\/$/, '')}/${book.pdfFile}`
    : null;
  const { thumbnailUrl } = usePdfThumbnail(pdfUrl);
  const stageClass = STAGE_CLASS_MAP[book.stage] ?? 'bg-red-100 text-red-700';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-3xl overflow-hidden shadow-md transition-transform active:scale-95 bg-white ${
        isCurrent ? 'ring-4 ring-orange-400 ring-offset-2' : ''
      }`}
    >
      {/* 缩略图区域：高度从 h-36 (144px) 提升到 h-44 (176px) */}
      <div className="relative h-44 bg-orange-50 flex items-center justify-center overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-7xl">{BOOK_EMOJI}</span>
        )}

        {/* Stage 徽章：text-xs (12px) → text-sm (14px)，padding 加大 */}
        <span className={`absolute top-2 right-2 text-sm font-extrabold px-3 py-1 rounded-full ${stageClass}`}>
          Stage {book.stage}
        </span>

        {/* 当前书徽章 */}
        {isCurrent ? (
          <span className="absolute top-2 left-2 text-sm font-extrabold px-3 py-1 rounded-full bg-orange-500 text-white shadow">
            {NEXT_EMOJI} Next
          </span>
        ) : null}

        {/* 已完成遮罩 */}
        {isCompleted ? (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <span className="text-5xl drop-shadow">{DONE_EMOJI}</span>
          </div>
        ) : null}
      </div>

      {/* 文字区域 */}
      <div className="p-4 pb-5">
        {/* 书名：text-sm (14px) → text-lg (18px) */}
        <p className="font-extrabold text-gray-800 text-lg leading-snug line-clamp-2">
          {book.title}
        </p>
        {/* 副文字：text-xs (12px) → text-base (16px) */}
        <p className={`text-base mt-1.5 font-bold ${isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
          {isCompleted ? '\u2713 Completed' : `${book.totalPages} pages`}
        </p>
      </div>
    </button>
  );
}
