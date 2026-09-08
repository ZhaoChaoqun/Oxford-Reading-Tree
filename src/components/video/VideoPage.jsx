import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import videos from '../../data/videos.json';
import { useVideoPlayer } from '../../hooks/useVideoPlayer';
import { useProgress } from '../../hooks/useProgress';
import { useResource } from '../../contexts/ResourceContext';
import { useScore } from '../../contexts/ScoreContext';
import { formatTime } from '../../utils/formatTime';
import { getFamilyVideoRewardPoints } from '../../services/scoringEngine';
import LibraryConnectionState from '../common/LibraryConnectionState';

const BACK_ARROW = String.fromCodePoint(0x2190);
const PLAY_ICON = String.fromCodePoint(0x25b6);
const PAUSE_ICON = String.fromCodePoint(0x23f8);

export function VideoPage() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { baseUrl } = useResource();
  const { awardPoints } = useScore();
  const { claimVideoCompletionReward } = useProgress();
  const {
    attachVideo,
    isPlaying,
    currentTime,
    duration,
    toggle,
    seek,
    pause,
    isLoading,
    error,
  } = useVideoPlayer();
  const awardedRef = useRef(false);

  const video = useMemo(
    () => videos.videos.find((entry) => entry.id === videoId) || null,
    [videoId]
  );

  const videoUrl = baseUrl && video ? `${baseUrl.replace(/\/$/, '')}/${video.videoFile}` : null;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pause]);

  useEffect(() => {
    if (duration > 0 && currentTime / duration >= 0.9 && !awardedRef.current) {
      const rewardPoints = getFamilyVideoRewardPoints(video?.familyStage, duration);
      if (claimVideoCompletionReward(videoId, {
        durationSeconds: duration,
        familyStage: video?.familyStage,
        rewardPoints,
      })) {
        awardPoints(rewardPoints, 'video_complete');
      }
      awardedRef.current = true;
    }
  }, [awardPoints, claimVideoCompletionReward, currentTime, duration, video, videoId]);

  useEffect(() => {
    awardedRef.current = false;
  }, [videoId]);

  if (!video) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white">
        <div>
          <div className="text-5xl">{String.fromCodePoint(0x1f3ac)}</div>
          <div className="mt-4 text-xl font-bold">Video not found</div>
        </div>
      </div>
    );
  }

  if (!videoUrl) {
    return <LibraryConnectionState />;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-black">
      <video
        ref={attachVideo}
        src={videoUrl}
        className="flex-1 w-full bg-black object-contain"
        playsInline
      />

      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-x-4 top-6 rounded-2xl bg-red-500/90 px-4 py-3 text-center text-sm font-semibold text-white">
          {error}
        </div>
      ) : null}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-6 pt-10">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={(event) => seek(Number(event.target.value))}
          className="mb-4 w-full accent-orange-500"
          aria-label="Video progress"
        />

        <div className="flex items-center justify-between text-white">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="min-h-[48px] min-w-[48px] touch-manipulation rounded-2xl bg-white/10 px-3 text-lg font-bold"
            aria-label="Go back"
          >
            {BACK_ARROW}
          </button>

          <button
            type="button"
            onClick={toggle}
            className="min-h-[48px] min-w-[48px] touch-manipulation rounded-2xl bg-orange-500 px-4 text-lg font-bold text-white"
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
          >
            {isPlaying ? PAUSE_ICON : PLAY_ICON}
          </button>

          <div className="min-h-[48px] min-w-[48px] touch-manipulation text-sm font-semibold">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoPage;
