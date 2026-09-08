import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * HTML5 Audio wrapper for book read-along.
 * crossOrigin is set to "anonymous" to allow Service Worker caching.
 */
export function useAudioPlayer() {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const onEndedRef = useRef(null);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';

    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
      setIsLoading(false);
    });
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      if (onEndedRef.current) onEndedRef.current();
    });
    audio.addEventListener('waiting', () => setIsLoading(true));
    audio.addEventListener('canplay', () => { setIsLoading(false); setError(null); });
    audio.addEventListener('error', () => {
      setError('Audio failed to load');
      setIsLoading(false);
    });

    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const load = useCallback((src) => {
    if (!audioRef.current) return;
    setError(null);
    setIsLoading(true);
    setCurrentTime(0);
    setDuration(0);
    audioRef.current.pause();
    audioRef.current.src = src;
    audioRef.current.load();
  }, []);

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => setError('Playback blocked'));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.paused ? play() : pause();
  }, [play, pause]);

  const seek = useCallback((time) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
  }, [duration]);

  const setPlaybackRate = useCallback((rate) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = rate;
    setPlaybackRateState(rate);
  }, []);

  const setOnEnded = useCallback((fn) => {
    onEndedRef.current = fn;
  }, []);

  return {
    load, play, pause, toggle, seek,
    isPlaying, currentTime, duration,
    isLoading, error, playbackRate,
    setPlaybackRate, setOnEnded,
  };
}