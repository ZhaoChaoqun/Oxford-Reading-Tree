import { useScore } from '../../contexts/ScoreContext';
import stickersData from '../../data/stickers.json';
import { getStickerEmoji } from '../../utils/displayEmoji';
import {
  getMilestoneRewards,
  getNextMilestoneReward,
  getRepeatableRewards,
} from '../../services/rewardLedger.js';

const STAR_ICON     = String.fromCodePoint(0x2b50);
const FIRE_ICON     = String.fromCodePoint(0x1f525);
const LIFETIME_ICON = String.fromCodePoint(0x1f31f);

const repeatableRewards = getRepeatableRewards(stickersData.stickers);
const milestoneRewards  = getMilestoneRewards(stickersData.stickers);
const pngStickers       = stickersData.stickers.filter((s) => s.type === 'png');

export function StickerShop() {
  const {
    totalScore,
    spendableStars,
    lifetimeStarsEarned,
    streak,
    pendingStickerPicks,
    unlockedStickers,
    pickedStickerIds,
    rewardInventory,
    redeemRepeatableReward,
    useRepeatableReward,
  } = useScore();

  const streakRemainder          = streak % 5;
  const nextStreakMilestoneIn    = streakRemainder === 0 ? 5 : 5 - streakRemainder;
  const nextMilestone            = getNextMilestoneReward(lifetimeStarsEarned, milestoneRewards);

  return (
    <div className="space-y-6 px-4 py-3">

      {/* ── 积分摘要卡 ── */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border-2 border-orange-100">
        {/* 可用星星：text-base → text-xl */}
        <div className="text-xl font-extrabold text-gray-800">
          {STAR_ICON} {totalScore} available
        </div>
        {/* 终身星星：text-sm → text-base */}
        <div className="mt-1 text-base font-bold text-sky-600">
          {LIFETIME_ICON} {lifetimeStarsEarned} lifetime
        </div>
        {/* 连续天数：text-sm → text-base */}
        <div className="mt-1 text-base font-bold text-orange-500">
          {FIRE_ICON} {streak} day streak
        </div>
        {/* 下个里程碑：text-xs → text-sm */}
        <div className="mt-1 text-sm font-semibold text-gray-500">
          {nextMilestone
            ? `Next collectible at ${nextMilestone.threshold} lifetime stars`
            : 'All milestone collectibles unlocked! 🎉'}
        </div>
        {/* 连续签到提示：text-xs → text-sm */}
        <div className="text-sm font-semibold text-gray-400">
          Next streak sticker in {nextStreakMilestoneIn} days
        </div>
        {pendingStickerPicks > 0 && (
          <div className="mt-2 inline-flex rounded-full bg-orange-100 px-4 py-1.5 text-sm font-extrabold text-orange-700">
            🎁 {pendingStickerPicks} sticker{pendingStickerPicks > 1 ? 's' : ''} to pick!
          </div>
        )}
      </div>

      {/* ── 可兑换奖励 ── */}
      <section className="space-y-3">
        {/* 区块标题：text-base → text-xl，去除 text-xs 说明段落 */}
        <h2 className="text-xl font-extrabold text-gray-700">🎁 Rewards</h2>

        <div className="grid grid-cols-2 gap-3">
          {repeatableRewards.map((reward) => {
            const available = rewardInventory?.[reward.id] ?? 0;
            const canAfford = spendableStars >= reward.cost;

            return (
              <div
                key={reward.id}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-orange-200 bg-white p-5 shadow-sm"
              >
                {/* Emoji：text-5xl (48px) 保持，加大容器 */}
                <div className="text-6xl leading-none">{getStickerEmoji(reward)}</div>

                {/* 奖励名称：新增，text-lg */}
                <div className="text-lg font-extrabold text-gray-800 text-center">
                  {reward.name}
                </div>

                {/* 费用徽章：text-xs → text-base */}
                <div className={`rounded-full px-4 py-1.5 text-base font-extrabold ${
                  canAfford ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  {STAR_ICON} {reward.cost}
                </div>

                {/* 库存数量：text-xs → text-sm */}
                {available > 0 && (
                  <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-extrabold text-green-700">
                    ×{available} saved
                  </div>
                )}

                {/* 按钮：text-xs py-2 (≈36px) → text-base py-3.5 (≈56px) */}
                <div className="flex w-full gap-2">
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => redeemRepeatableReward(reward.id)}
                    className={`flex-1 rounded-2xl py-3.5 text-base font-extrabold transition-transform active:scale-95 ${
                      canAfford
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                        : 'cursor-not-allowed bg-gray-200 text-gray-400'
                    }`}
                  >
                    Get!
                  </button>
                  <button
                    type="button"
                    disabled={available <= 0}
                    onClick={() => useRepeatableReward(reward.id)}
                    className={`flex-1 rounded-2xl py-3.5 text-base font-extrabold transition-transform active:scale-95 ${
                      available > 0
                        ? 'border-2 border-sky-200 bg-sky-50 text-sky-700'
                        : 'cursor-not-allowed bg-gray-100 text-gray-400'
                    }`}
                  >
                    Use
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 里程碑收集品 ── */}
      <section className="space-y-3">
        {/* 标题：text-base → text-xl，去除 text-xs 说明段落 */}
        <h2 className="text-xl font-extrabold text-gray-700">
          🏆 Milestone Collectibles {LIFETIME_ICON}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {milestoneRewards.map((reward) => {
            const isCollected = unlockedStickers.includes(reward.id);

            return (
              <div
                key={reward.id}
                className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-5 ${
                  isCollected
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-gray-50 opacity-75'
                }`}
              >
                <div className="text-6xl leading-none">{getStickerEmoji(reward)}</div>

                {/* 里程碑数量：text-xs → text-sm */}
                <div className="text-center text-sm font-bold text-gray-500">
                  {reward.threshold} lifetime stars
                </div>

                {/* 状态徽章：text-xs → text-sm，py-1 → py-1.5 */}
                {isCollected ? (
                  <div className="rounded-full bg-green-100 px-4 py-1.5 text-sm font-extrabold text-green-700">
                    ✅ Collected
                  </div>
                ) : (
                  <div className="rounded-full bg-gray-200 px-4 py-1.5 text-sm font-extrabold text-gray-500">
                    🔒 Locked
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 连续签到贴纸 ── */}
      <section className="space-y-3">
        {/* 标题：text-base → text-xl，去除 text-xs 说明段落 */}
        <h2 className="text-xl font-extrabold text-gray-700">
          🔥 Streak Stickers {FIRE_ICON}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {pngStickers.map((sticker, index) => {
            const isCollected = pickedStickerIds.includes(sticker.id);
            const dayLabel    = (index + 1) * 5;

            return (
              <div
                key={sticker.id}
                className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-5 ${
                  isCollected
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-gray-50 opacity-75'
                }`}
              >
                {/* 图片：h-16 w-16 (64px) → h-20 w-20 (80px) */}
                <img
                  src={`/${sticker.image}`}
                  alt={sticker.name}
                  className={`h-20 w-20 object-contain ${isCollected ? '' : 'grayscale'}`}
                />

                {/* Day 标签：text-xs → text-sm */}
                <div className="text-center text-sm font-bold text-gray-500">
                  Day {dayLabel}
                </div>

                {/* 状态：text-xs → text-sm，py-1 → py-1.5 */}
                {isCollected ? (
                  <div className="rounded-full bg-green-100 px-4 py-1.5 text-sm font-extrabold text-green-700">
                    ✅ Collected
                  </div>
                ) : (
                  <div className="rounded-full bg-gray-200 px-4 py-1.5 text-sm font-extrabold text-gray-500">
                    🔒 Locked
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
