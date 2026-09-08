import { useRef, useState, useCallback, useEffect } from 'react';

export function useVideoPlayer() {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [watchedRatio, setWatchedRatio] = useState(0);
  const onCompletedRef = useRef(null);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load?.();
      }
    };
  }, []);

  const attachVideo = useCallback((el) => {
    if (!el || videoRef.current === el) return;
    videoRef.current = el;
    el.crossOrigin = 'anonymous';

    el.addEventListener('timeupdate', () => {
      setCurrentTime(el.currentTime);
      const ratio = el.duration > 0 ? el.currentTime / el.duration : 0;
      setWatchedRatio(ratio);
      if (ratio >= 0.9 && onCompletedRef.current) {
        onCompletedRef.current();
        onCompletedRef.current = null;
      }
    });
    el.addEventListener('loadedmetadata', () => {
      setDuration(el.duration);
      setIsLoading(false);
    });
    el.addEventListener('play', () => setIsPlaying(true));
    el.addEventListener('pause', () => setIsPlaying(false));
    el.addEventListener('ended', () => setIsPlaying(false));
    el.addEventListener('waiting', () => setIsLoading(true));
    el.addEventListener('canplay', () => setIsLoading(false));
    el.addEventListener('error', () => {
      setError('Video failed to load');
      setIsLoading(false);
    });
  }, []);

  const play = useCallback(() => videoRef.current?.play().catch(() => {}), []);
  const pause = useCallback(() => videoRef.current?.pause(), []);
  const toggle = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.paused ? play() : pause();
  }, [play, pause]);
  const seek = useCallback((t) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(t, duration));
  }, [duration]);
  const setOnCompleted = useCallback((fn) => { onCompletedRef.current = fn; }, []);

  return {
    attachVideo, play, pause, toggle, seek,
    isPlaying, currentTime, duration,
    isLoading, error, watchedRatio,
    setOnCompleted,
  };
}