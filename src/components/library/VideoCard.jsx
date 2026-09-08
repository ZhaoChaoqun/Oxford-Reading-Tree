const VIDEO_EMOJI = String.fromCodePoint(0x1f3ac);
const NEXT_EMOJI = String.fromCodePoint(0x1f449);
const DONE_EMOJI = String.fromCodePoint(0x2705);
const CAMERA_EMOJI = String.fromCodePoint(0x1f4f9);

export default function VideoCard({ video, isCompleted, isCurrent, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-3xl overflow-hidden shadow-md transition-transform active:scale-95 ${
        isCurrent ? 'ring-4 ring-orange-400 ring-offset-2' : ''
      } bg-white`}
    >
      <div className="relative h-36 bg-sky-50 flex items-center justify-center overflow-hidden">
        <span className="text-6xl">{VIDEO_EMOJI}</span>

        <span className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
          Family Stage {video.familyStage}
        </span>

        {isCurrent ? (
          <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white">
            {NEXT_EMOJI} Next
          </span>
        ) : null}

        {isCompleted ? (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <span className="text-4xl">{DONE_EMOJI}</span>
          </div>
        ) : null}
      </div>

      <div className="p-3 pb-4">
        <p className="font-bold text-gray-800 text-sm leading-snug line-clamp-2">
          {video.title}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {isCompleted ? '\u2713 Watched' : `${CAMERA_EMOJI} Video`}
        </p>
      </div>
    </button>
  );
}