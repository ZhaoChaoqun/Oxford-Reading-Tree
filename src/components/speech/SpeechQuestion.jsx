import { useCallback, useEffect, useRef, useState } from 'react';
import {
  startRecognitionSession,
  stopRecognitionSession,
  evaluateRecognitionTranscript,
  speak,
  isSupported,
} from '../../services/speechService';
import { useScore } from '../../contexts/ScoreContext';
import { getStageRewardPoints } from '../../services/scoringEngine';

const SPEAKER_EMOJI   = String.fromCodePoint(0x1f50a);
const MICROPHONE_EMOJI = String.fromCodePoint(0x1f3a4);
const STOP_EMOJI      = String.fromCodePoint(0x23f9);
const MAX_ATTEMPTS    = 3;
const SPEECH_LANG     = 'en-US';

export function SpeechQuestion({
  word,
  onPass,
  onSkip,
  wordIndex,
  totalWords,
  bookId,
  stage,
  markSpeechAnswerPassed,
}) {
  const { awardPoints } = useScore();
  const [phase, setPhase]           = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [passed, setPassed]         = useState(false);
  const [autoPass, setAutoPass]     = useState(false);
  const [attempts, setAttempts]     = useState(0);
  const [speechError, setSpeechError] = useState('');
  const transcriptRef  = useRef('');
  const attemptsRef    = useRef(0);
  const finalisedRef   = useRef(false);
  const supported      = isSupported();

  useEffect(() => {
    transcriptRef.current  = '';
    attemptsRef.current    = 0;
    finalisedRef.current   = false;
    setPhase('idle');
    setTranscript('');
    setPassed(false);
    setAutoPass(false);
    setAttempts(0);
    setSpeechError('');
    return () => { stopRecognitionSession(); };
  }, [word]);

  const handleHear = useCallback(() => {
    speak(word, { lang: SPEECH_LANG });
  }, [word]);

  const finaliseAttempt = useCallback(() => {
    if (finalisedRef.current) return;
    finalisedRef.current = true;

    const result      = evaluateRecognitionTranscript(word, transcriptRef.current);
    const nextAttempts = attemptsRef.current + 1;
    attemptsRef.current = nextAttempts;
    setAttempts(nextAttempts);
    setTranscript(result.transcript);

    if (result.passed) {
      const isNew = typeof markSpeechAnswerPassed === 'function' && bookId
        ? markSpeechAnswerPassed(bookId, word)
        : true;
      if (isNew) awardPoints(getStageRewardPoints(stage), 'speech_correct');
      setPassed(true);
      setAutoPass(false);
      setPhase('result');
      return;
    }

    setPassed(false);
    if (nextAttempts >= MAX_ATTEMPTS) { setAutoPass(true); setPhase('result'); return; }
    setAutoPass(false);
    setPhase('try-again');
  }, [awardPoints, bookId, markSpeechAnswerPassed, stage, word]);

  const handleStart = useCallback(() => {
    if (!supported || phase === 'listening') return;
    transcriptRef.current  = '';
    finalisedRef.current   = false;
    setTranscript('');
    setPassed(false);
    setAutoPass(false);
    setSpeechError('');
    setPhase('starting');

    const started = startRecognitionSession({
      lang: SPEECH_LANG,
      onStart:  () => setPhase('listening'),
      onResult: ({ transcript: t }) => {
        const trimmed = String(t || '').trim();
        if (!trimmed) return;
        transcriptRef.current = trimmed;
        setTranscript(trimmed);
      },
      onError: ({ error, message }) => setSpeechError(message ? `${error}: ${message}` : error),
      onEnd:   finaliseAttempt,
    });

    if (!started) setPhase('try-again');
  }, [finaliseAttempt, phase, supported]);

  const handleStop = useCallback(() => {
    if (phase !== 'listening' && phase !== 'starting') return;
    stopRecognitionSession();
  }, [phase]);

  const handleNext = useCallback(() => {
    onPass({ passed: passed || autoPass, autoPass, transcript, word });
  }, [autoPass, onPass, passed, transcript, word]);

  const isListening = phase === 'listening' || phase === 'starting';

  return (
    <div className="flex flex-col items-center gap-6 px-6 py-8">

      {/* 进度：text-xs → text-base */}
      <div className="self-end text-base font-bold text-gray-400">
        {wordIndex} / {totalWords}
      </div>

      {/* 单词卡：text-5xl (48px) 已够大，保持；增大内边距 */}
      <div className="w-full rounded-3xl border-2 border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50 px-10 py-10 shadow-sm">
        <div className="text-center text-5xl font-black tracking-wide text-gray-800">
          {word}
        </div>
      </div>

      {/* "Hear it" 按钮：text-sm py-2.5 → text-lg py-4，加大触摸目标 */}
      <button
        type="button"
        onClick={handleHear}
        disabled={isListening}
        className="flex items-center gap-3 rounded-2xl border-2 border-sky-300 bg-white px-6 py-4 text-lg font-extrabold text-sky-600 shadow-sm active:scale-95 transition-transform disabled:opacity-50"
      >
        <span className="text-2xl">{SPEAKER_EMOJI}</span>
        <span>Hear it</span>
      </button>

      {supported ? (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="flex w-full gap-3">
            {/* Start 按钮：text-sm py-3 → text-lg py-4 */}
            <button
              type="button"
              onClick={handleStart}
              disabled={isListening || phase === 'result'}
              className="flex-1 rounded-2xl bg-orange-500 px-4 py-4 text-lg font-extrabold text-white shadow-md shadow-orange-200 active:scale-95 transition-transform disabled:opacity-50"
            >
              {MICROPHONE_EMOJI} Start
            </button>
            {/* Stop 按钮：text-sm py-3 → text-lg py-4 */}
            <button
              type="button"
              onClick={handleStop}
              disabled={!isListening}
              className="flex-1 rounded-2xl border-2 border-orange-200 bg-white px-4 py-4 text-lg font-extrabold text-orange-600 shadow-sm active:scale-95 transition-transform disabled:opacity-50"
            >
              {STOP_EMOJI} Stop
            </button>
          </div>
          {/* 录音中提示：text-sm → text-base */}
          {isListening && (
            <div className="animate-pulse text-base font-extrabold text-red-500">
              🎙 Listening...
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-200 text-4xl">
            {MICROPHONE_EMOJI}
          </div>
          {/* text-sm → text-base */}
          <div className="rounded-2xl bg-yellow-50 px-5 py-4 text-center text-base font-semibold text-yellow-700">
            Microphone not available — tap Skip to continue
          </div>
        </div>
      )}

      {/* 尝试次数点：h-2.5 w-2.5 → h-3.5 w-3.5 */}
      {attempts > 0 && phase === 'try-again' && (
        <div className="flex gap-3">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
            <div
              key={i}
              className={`h-3.5 w-3.5 rounded-full ${i < attempts ? 'bg-orange-400' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      )}

      {/* 结果反馈：text-sm/text-base → text-lg */}
      {phase === 'result' && passed && !autoPass && (
        <div className="w-full rounded-2xl bg-green-100 px-5 py-4 text-lg font-extrabold text-green-700">
          🎉 Great! You said: &ldquo;{transcript}&rdquo;
        </div>
      )}
      {phase === 'result' && autoPass && (
        <div className="w-full rounded-2xl bg-yellow-50 px-5 py-4 text-center text-lg font-semibold text-yellow-700">
          That&apos;s okay! Keep practising. 💪
        </div>
      )}
      {phase === 'try-again' && (
        <div className="w-full rounded-2xl bg-orange-50 px-5 py-4 text-center text-lg font-semibold text-orange-700">
          {transcript
            ? <>I heard &ldquo;{transcript}&rdquo; — try again!</>
            : <>I didn&apos;t catch that — tap Start and try again!</>}
        </div>
      )}
      {speechError && phase !== 'result' && (
        <div className="w-full rounded-2xl bg-red-50 px-5 py-4 text-center text-base font-semibold text-red-700">
          Speech error: {speechError}
        </div>
      )}

      {/* 底部按钮：font-semibold py-3.5 → font-extrabold py-4 text-lg */}
      <div className="mt-2 flex w-full gap-3">
        <button
          type="button"
          onClick={onSkip}
          disabled={isListening}
          className="flex-1 rounded-2xl border-2 border-gray-200 py-4 text-lg font-extrabold text-gray-500 active:scale-95 transition-transform disabled:opacity-50"
        >
          Skip
        </button>
        {phase === 'result' && (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 rounded-2xl bg-orange-500 py-4 text-lg font-extrabold text-white shadow-md shadow-orange-200 active:scale-95 transition-transform"
          >
            Next {String.fromCodePoint(0x2192)}
          </button>
        )}
      </div>
    </div>
  );
}
