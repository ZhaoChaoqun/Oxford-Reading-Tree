import { useState } from 'react';
import { useScore } from '../../contexts/ScoreContext';
import stickersData from '../../data/stickers.json';
import { getMilestoneRewards, getNextMilestoneReward } from '../../services/rewardLedger.js';
import { StickerGrid } from './StickerGrid';
import { StickerShop } from './StickerShop';
import StickerPickerModal from './StickerPickerModal';

const COLLECTION_ICON = String.fromCodePoint(0x1f3f7);
const SHOP_ICON       = String.fromCodePoint(0x1f6cd);
const STAR_EMOJI      = String.fromCodePoint(0x2b50);
const LIFETIME_EMOJI  = String.fromCodePoint(0x1f31f);
const FIRE_EMOJI      = String.fromCodePoint(0x1f525);

const milestoneRewards = getMilestoneRewards(stickersData.stickers);

export default function RewardsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const {
    totalScore,
    lifetimeStarsEarned,
    streak,
    pendingStickerPicks,
  } = useScore();

  const nextReward = getNextMilestoneReward(lifetimeStarsEarned, milestoneRewards);
  const previousThreshold = milestoneRewards
    .filter((r) => r.threshold <= lifetimeStarsEarned)
    .at(-1)?.threshold ?? 0;
  const progressRange = nextReward ? nextReward.threshold - previousThreshold : 1;
  const progressPct   = nextReward
    ? Math.min(((lifetimeStarsEarned - previousThreshold) / progressRange) * 100, 100)
    : 100;

  return (
    <div className="flex flex-col gap-0 pb-24">

      {/* ── 积分横幅：替代旧版罐子图形 ── */}
      <div className="mx-4 mt-4 rounded-3xl p-5 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)' }}
      >
        {/* 可用 / 终身 双栏 */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-orange-100">Available</div>
            {/* text-xl → text-4xl */}
            <div className="text-4xl font-black text-white leading-tight mt-1">
              {STAR_EMOJI} {totalScore}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-orange-100">Lifetime</div>
            {/* text-lg → text-2xl */}
            <div className="text-2xl font-black text-white leading-tight mt-1">
              {LIFETIME_EMOJI} {lifetimeStarsEarned}
            </div>
          </div>
        </div>

        {/* 进度条：距下个里程碑 */}
        {nextReward && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-bold text-orange-100">
                Next milestone: {nextReward.threshold} stars
              </span>
              <span className="text-sm font-bold text-orange-100">
                {lifetimeStarsEarned} / {nextReward.threshold}
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden bg-orange-300/50">
              <div
                className="h-full rounded-full bg-white/75 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* 连续天数 + 待选贴纸按钮 */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {streak > 0 && (
            <div className="flex items-center gap-2 rounded-2xl bg-white/20 px-4 py-2">
              <span className="text-xl">{FIRE_EMOJI}</span>
              {/* text-sm → text-base */}
              <span className="text-base font-extrabold text-white">
                {streak} day streak
              </span>
            </div>
          )}
          {pendingStickerPicks > 0 && (
            <div className="rounded-2xl bg-white px-4 py-2">
              {/* text-xs → text-base */}
              <span className="text-base font-extrabold text-orange-600">
                🎁 Pick {pendingStickerPicks} sticker{pendingStickerPicks > 1 ? 's' : ''}!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── 标签切换 ── */}
      <div className="mx-4 mt-4 flex border-b-2 border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab(0)}
          /* text-sm → text-lg，py-3 → py-4 */
          className={`flex-1 py-4 text-center text-lg font-extrabold transition-colors ${
            activeTab === 0
              ? 'border-b-4 border-orange-500 text-orange-600'
              : 'text-gray-400'
          }`}
        >
          My Stickers {COLLECTION_ICON}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab(1)}
          className={`flex-1 py-4 text-center text-lg font-extrabold transition-colors ${
            activeTab === 1
              ? 'border-b-4 border-orange-500 text-orange-600'
              : 'text-gray-400'
          }`}
        >
          Shop {SHOP_ICON}
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 0 ? <StickerGrid /> : <StickerShop />}
      </div>

      {pendingStickerPicks > 0 && <StickerPickerModal />}
    </div>
  );
}
