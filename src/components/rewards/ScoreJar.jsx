import stickersData from '../../data/stickers.json';
import { useScore } from '../../contexts/ScoreContext';
import { getMilestoneRewards, getNextMilestoneReward } from '../../services/rewardLedger.js';

const STAR_EMOJI     = String.fromCodePoint(0x2b50);
const LIFETIME_EMOJI = String.fromCodePoint(0x1f31f);
const milestoneRewards = getMilestoneRewards(stickersData.stickers);

export default function ScoreJar({ size = 'mini' }) {
  const { totalScore, lifetimeStarsEarned } = useScore();
  const nextReward = getNextMilestoneReward(lifetimeStarsEarned, milestoneRewards);
  const previousThreshold = milestoneRewards
    .filter((r) => r.threshold <= lifetimeStarsEarned)
    .at(-1)?.threshold ?? 0;
  const progressRange = nextReward ? nextReward.threshold - previousThreshold : 1;
  const progressValue = nextReward
    ? Math.min(((lifetimeStarsEarned - previousThreshold) / progressRange) * 100, 100)
    : 100;

  /* Mini 模式：显示在 TopBar 右侧，星星 + 分数 */
  if (size === 'mini') {
    return (
      <div className="flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-1.5">
        {/* 星星从 text-xl (20px) 保持，分数从 text-base → text-lg */}
        <span className="text-xl">{STAR_EMOJI}</span>
        <span className="text-lg font-black text-orange-600">{totalScore}</span>
      </div>
    );
  }

  /* Full 模式：显示在 Rewards 页顶部 */
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-5">
      {/* 罐子图形 */}
      <div className="relative h-36 w-28 overflow-hidden rounded-b-3xl rounded-t-xl border-4 border-orange-300 bg-orange-50 shadow-inner">
        <div
          className="absolute bottom-0 left-0 right-0 bg-orange-400 transition-all duration-700"
          style={{ height: `${progressValue}%` }}
        />
      </div>
      {/* 可用星星：text-xl → text-3xl */}
      <p className="text-3xl font-black text-orange-600">
        {STAR_EMOJI} {totalScore} available
      </p>
      {/* 终身星星：text-sm → text-lg */}
      <p className="text-lg font-bold text-gray-500">
        {LIFETIME_EMOJI} {lifetimeStarsEarned} lifetime
      </p>
      {/* 下个里程碑：text-sm → text-base */}
      {nextReward ? (
        <p className="text-base font-semibold text-gray-400">
          Next milestone at {nextReward.threshold}
        </p>
      ) : (
        <p className="text-base font-semibold text-gray-400">
          All milestone collectibles unlocked 🎉
        </p>
      )}
    </div>
  );
}
