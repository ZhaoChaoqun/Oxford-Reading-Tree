import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import curriculum from '../../data/curriculum.json';
import { useProgress } from '../../hooks/useProgress';
import { ProgressTransferModal } from '../common/ProgressTransferModal';
import UnitProgress from './UnitProgress';

export function CurriculumPage() {
  const navigate = useNavigate();
  const { isCompleted } = useProgress();
  const [transferOpen, setTransferOpen] = useState(false);

  const completedCount = useMemo(
    () => curriculum.schedule.filter((item) => isCompleted(item.id)).length,
    [isCompleted]
  );

  const firstPendingId = useMemo(() => {
    const nextItem = curriculum.schedule.find((item) => !isCompleted(item.id));
    return nextItem?.id ?? null;
  }, [isCompleted]);

  return (
    <div className="overflow-y-auto pb-24">

      {/* 页面标题 */}
      <div className="px-4 pb-2 pt-4">
        <div className="text-3xl font-black text-gray-800">
          Learning Path {String.fromCodePoint(0x1f5fa, 0xfe0f)}
        </div>
      </div>

      {/* 总进度卡 */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-md border-2 border-orange-100">
          <div>
            {/* 副标题：text-sm (14px) → text-base (16px) */}
            <div className="text-base font-bold text-gray-400">Overall progress</div>
            {/* 主文字：text-lg (18px) → text-xl (20px) */}
            <div className="text-xl font-extrabold text-gray-800 mt-1">Keep going! 💪</div>
          </div>
          <UnitProgress
            completed={completedCount}
            total={curriculum.schedule.length}
            label="Done"
          />
        </div>
      </div>

      {/* iPad 进度迁移提示 */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-sky-100 bg-sky-50 p-4 shadow-sm">
          <div>
            {/* text-sm (14px) → text-base (16px) */}
            <div className="text-base font-extrabold text-sky-700">
              Safari and Home Screen app keep separate progress on iPad
            </div>
            <div className="mt-1 text-base text-sky-600/80">
              Use Transfer Progress to move stars, rewards, and unit records between them.
            </div>
          </div>
          {/* 按钮：text-sm py-2 (≈36px) → text-base py-3 (≈52px) */}
          <button
            type="button"
            onClick={() => setTransferOpen(true)}
            className="shrink-0 rounded-2xl bg-sky-500 px-4 py-3 text-base font-extrabold text-white shadow active:scale-95 transition-transform"
          >
            Transfer
          </button>
        </div>
      </div>

      {/* 时间线 */}
      <div className="ml-8 border-l-4 border-orange-200 pl-4 pr-4">
        {curriculum.schedule.map((item) => {
          const completed = isCompleted(item.id);
          const isCurrent = firstPendingId === item.id;
          const isBook = item.type === 'book';

          return (
            <div key={item.id} className="relative">
              {/* 时间线圆点：h-6 w-6 (24px) → h-8 w-8 (32px) */}
              <div
                className={`absolute -left-8 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full border-4 border-white shadow-md flex items-center justify-center ${
                  completed
                    ? 'bg-green-500'
                    : isCurrent
                      ? 'bg-orange-500'
                      : isBook
                        ? 'bg-orange-300'
                        : 'bg-sky-400'
                }`}
              >
                {completed && (
                  <span className="text-xs font-black text-white">✓</span>
                )}
                {!completed && isCurrent && (
                  <span className="text-xs text-white">▶</span>
                )}
              </div>

              {/* 条目卡片 */}
              <div
                className={`mb-4 ml-4 flex items-center gap-3 rounded-2xl p-4 shadow-sm border-l-4 ${
                  completed
                    ? 'bg-green-50 border-green-400'
                    : isCurrent
                      ? 'bg-white border-orange-500 ring-2 ring-orange-400 ring-offset-1'
                      : isBook
                        ? 'bg-white border-transparent'
                        : 'bg-sky-50 border-transparent'
                }`}
              >
                <span className="text-3xl shrink-0">
                  {isBook ? '📖' : '🎬'}
                </span>

                <div className="flex-1 min-w-0">
                  {/* 当前项标签 */}
                  {isCurrent && (
                    <div className="mb-1 inline-block rounded-full bg-orange-500 px-3 py-0.5 text-sm font-extrabold text-white">
                      🔥 Now!
                    </div>
                  )}
                  {/* 条目标题：text-base (16px) → text-lg (18px) */}
                  <div className={`text-lg font-extrabold truncate ${completed ? 'text-green-800' : 'text-gray-800'}`}>
                    {item.title}
                  </div>
                  {/* Stage 徽章：text-xs (12px) → text-sm (14px)，padding 加大 */}
                  <div className="mt-1">
                    {isBook ? (
                      <span className="inline-block rounded-full bg-orange-100 px-3 py-1 text-sm font-extrabold text-orange-700">
                        Stage {item.stage}
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-sky-100 px-3 py-1 text-sm font-extrabold text-sky-700">
                        Family Stage {item.familyStage}
                      </span>
                    )}
                  </div>
                </div>

                {completed ? (
                  <span className="text-2xl shrink-0">✅</span>
                ) : (
                  /* 按钮：text-sm py-1.5 (≈36px) → text-base py-3 (≈52px) */
                  <button
                    type="button"
                    onClick={() =>
                      navigate(isBook ? `/book/${item.id}` : `/video/${item.id}`)
                    }
                    className={`shrink-0 rounded-2xl px-4 py-3 text-base font-extrabold text-white shadow active:scale-95 transition-transform ${
                      isBook
                        ? 'bg-orange-500 shadow-orange-200'
                        : 'bg-sky-500 shadow-sky-200'
                    }`}
                  >
                    {isBook
                      ? `${String.fromCodePoint(0x25b6)} Read`
                      : `${String.fromCodePoint(0x25b6)} Watch`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ProgressTransferModal open={transferOpen} onClose={() => setTransferOpen(false)} />
    </div>
  );
}

export default CurriculumPage;
