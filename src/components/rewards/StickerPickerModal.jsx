import { useMemo } from 'react';
import { useScore } from '../../contexts/ScoreContext';
import stickersData from '../../data/stickers.json';

const CELEBRATION_ICON = String.fromCodePoint(0x1f389);

export default function StickerPickerModal() {
  const { pendingStickerPicks, pickedStickerIds, pickPngSticker } = useScore();
  const availableStickers = useMemo(
    () => stickersData.stickers.filter(
      (sticker) => sticker.type === 'png' && !pickedStickerIds.includes(sticker.id)
    ),
    [pickedStickerIds]
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-orange-50 shadow-2xl flex flex-col">

        {/* 头部：标题加大，副文字加大 */}
        <div className="border-b-2 border-orange-100 bg-white px-6 py-6 text-center">
          {/* 庆祝图标：text-2xl → text-4xl */}
          <div className="text-4xl mb-2">{CELEBRATION_ICON}</div>
          {/* 标题：text-2xl (24px) → text-3xl (30px) */}
          <div className="text-3xl font-black text-orange-600">
            You earned a new sticker!
          </div>
          {/* 副文字：text-sm (14px) → text-lg (18px) */}
          <div className="mt-2 text-lg font-semibold text-gray-500">
            Choose one sticker to add to your collection
          </div>
          {pendingStickerPicks > 1 && (
            /* 徽章：text-xs → text-base */
            <div className="mt-3 inline-flex rounded-full bg-orange-100 px-4 py-2 text-base font-extrabold text-orange-700">
              🎁 You have {pendingStickerPicks} stickers to pick!
            </div>
          )}
        </div>

        {/* 贴纸网格 */}
        <div className="flex-1 overflow-y-auto p-4">
          {availableStickers.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center">
              {/* 空状态文字：text-sm → text-base */}
              <div className="text-base font-bold text-gray-500">
                No PNG stickers left to choose from.
              </div>
            </div>
          ) : (
            /* 贴纸网格：自适应列宽，最小 130px */
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}
            >
              {availableStickers.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={() => pickPngSticker(sticker.id)}
                  className="flex flex-col items-center gap-3 rounded-2xl border-2 border-orange-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-orange-400 active:scale-95"
                >
                  {/* 图片：h-16 w-16 (64px) → h-20 w-20 (80px) */}
                  <img
                    src={`/${sticker.image}`}
                    alt={sticker.name}
                    className="h-20 w-20 object-contain"
                  />
                  {/* 贴纸名：text-xs (12px) → text-base (16px) */}
                  <div className="text-center text-base font-extrabold text-gray-700">
                    {sticker.name}
                  </div>
                  {/* "Tap to select"：text-[11px] (11px!) → text-sm (14px) */}
                  <div className="text-sm font-bold text-orange-500">
                    Tap to pick! 👆
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
