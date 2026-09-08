import { useScore } from '../../contexts/ScoreContext';
import stickersData from '../../data/stickers.json';
import { getStickerEmoji } from '../../utils/displayEmoji';

export function StickerGrid() {
  const { unlockedStickers, pickedStickerIds } = useScore();
  const owned = stickersData.stickers.filter((sticker) => {
    if (sticker.type === 'repeatable') return false;
    if (sticker.type === 'png') return pickedStickerIds.includes(sticker.id);
    return unlockedStickers.includes(sticker.id);
  });

  if (owned.length === 0) {
    return (
      <div className="mx-4 rounded-2xl bg-orange-50 p-10 text-center border-2 border-orange-100">
        {/* 空状态：图标和文字都加大 */}
        <div className="text-7xl mb-3">🎁</div>
        <div className="text-xl font-extrabold text-gray-600">No stickers yet!</div>
        <div className="mt-2 text-base font-semibold text-gray-400">
          Earn stars and streak rewards to grow your collection!
        </div>
      </div>
    );
  }

  return (
    /* 列数从 grid-cols-4 (每格≈80px) 改为 auto-fill minmax(110px)，iPad 自动多列 */
    <div className="grid gap-3 p-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
      {owned.map((sticker) => (
        <div
          key={sticker.id}
          className="flex flex-col items-center gap-2 rounded-2xl border-2 border-orange-100 bg-gradient-to-br from-yellow-50 to-orange-50 p-4 shadow-sm"
        >
          {sticker.type === 'png' ? (
            /* 图片从 h-12 w-12 (48px) → h-16 w-16 (64px) */
            <img
              src={`/${sticker.image}`}
              alt={sticker.name}
              className="h-16 w-16 object-contain"
            />
          ) : (
            /* Emoji 从 text-4xl (36px) → text-5xl (48px) */
            <div className="text-5xl leading-none">{getStickerEmoji(sticker)}</div>
          )}
          {/* 名称从 text-xs (12px) → text-sm (14px)，font-semibold → font-extrabold */}
          <div className="text-center text-sm font-extrabold leading-tight text-gray-700">
            {sticker.name}
          </div>
        </div>
      ))}
    </div>
  );
}
