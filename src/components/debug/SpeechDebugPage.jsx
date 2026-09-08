import { useCallback, useMemo, useRef, useState } from 'react';

const SpeechRecognitionCtor =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const DEFAULT_LANG = 'en-GB';
const START_ICON = String.fromCodePoint(0x1f3a4);
const STOP_ICON = String.fromCodePoint(0x23f9);
const CLEAR_ICON = String.fromCodePoint(0x1f5d1);

function timestamp() {
  return new Date().toISOString().slice(11, 23);
}

export function SpeechDebugPage() {
  const recognitionRef = useRef(null);
  const [lang, setLang] = useState(DEFAULT_LANG);
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [errorText, setErrorText] = useState('');
  const [events, setEvents] = useState([]);

  const supported = SpeechRecognitionCtor != null;

  const appendEvent = useCallback((tag, detail = '') => {
    const suffix = detail ? ` ${detail}` : '';
    setEvents((current) => [`${timestamp()} [${tag}]${suffix}`, ...current].slice(0, 40));
  }, []);

  const stopRecognition = useCallback(() => {
    const active = recognitionRef.current;
    if (!active) {
      return;
    }

    try {
      active.stop();
      appendEvent('control', 'stop()');
    } catch (error) {
      appendEvent('control-error', error.message || 'stop failed');
    }
  }, [appendEvent]);

  const startRecognition = useCallback(() => {
    if (!supported || recognitionRef.current) {
      return;
    }

    setTranscript('');
    setFinalTranscript('');
    setErrorText('');
    setStatus('starting');

    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setStatus('listening');
      appendEvent('event', 'onstart');
    };

    recognition.onaudiostart = () => appendEvent('event', 'onaudiostart');
    recognition.onsoundstart = () => appendEvent('event', 'onsoundstart');
    recognition.onspeechstart = () => appendEvent('event', 'onspeechstart');
    recognition.onspeechend = () => appendEvent('event', 'onspeechend');
    recognition.onsoundend = () => appendEvent('event', 'onsoundend');
    recognition.onaudioend = () => appendEvent('event', 'onaudioend');

    recognition.onresult = (event) => {
      let latestInterim = '';
      let latestFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) {
          latestFinal += text;
        } else {
          latestInterim += text;
        }
      }

      if (latestInterim) {
        setTranscript(latestInterim.trim());
        appendEvent('result', `interim=${latestInterim.trim()}`);
      }

      if (latestFinal) {
        const trimmed = latestFinal.trim();
        setFinalTranscript(trimmed);
        setTranscript(trimmed);
        appendEvent('result', `final=${trimmed}`);
      }
    };

    recognition.onerror = (event) => {
      const message = `${event.error}${event.message ? `: ${event.message}` : ''}`;
      setErrorText(message);
      setStatus('error');
      appendEvent('error', message);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setStatus((current) => (current === 'error' ? current : 'idle'));
      appendEvent('event', 'onend');
    };

    try {
      appendEvent('control', `start() lang=${lang}`);
      recognition.start();
    } catch (error) {
      recognitionRef.current = null;
      setStatus('error');
      setErrorText(error.message || 'start failed');
      appendEvent('start-error', error.message || 'start failed');
    }
  }, [appendEvent, lang, supported]);

  const statusLabel = useMemo(() => {
    if (!supported) return 'SpeechRecognition not supported';
    if (status === 'starting') return 'Starting';
    if (status === 'listening') return 'Listening';
    if (status === 'error') return 'Error';
    return 'Idle';
  }, [status, supported]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-8 pt-2">
      <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-extrabold text-gray-800">Standalone Speech Debug</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          This page uses browser speech recognition directly, without Oxford quiz or scoring logic.
        </p>
      </div>

      <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="flex flex-col gap-2 text-sm font-semibold text-gray-700">
            Language
            <select
              value={lang}
              onChange={(event) => setLang(event.target.value)}
              className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-base font-semibold text-gray-700"
            >
              <option value="en-GB">English (UK)</option>
              <option value="en-US">English (US)</option>
              <option value="zh-CN">Chinese (Simplified)</option>
            </select>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startRecognition}
              disabled={!supported || status === 'starting' || status === 'listening'}
              className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {START_ICON} Start
            </button>
            <button
              type="button"
              onClick={stopRecognition}
              disabled={!recognitionRef.current}
              className="rounded-2xl border border-orange-200 bg-white px-5 py-3 text-sm font-bold text-orange-600 shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {STOP_ICON} Stop
            </button>
            <button
              type="button"
              onClick={() => {
                setEvents([]);
                setTranscript('');
                setFinalTranscript('');
                setErrorText('');
                setStatus('idle');
              }}
              className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm font-bold text-gray-600 shadow-sm active:scale-95"
            >
              {CLEAR_ICON} Clear
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-orange-50 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Status</div>
            <div className="mt-2 text-base font-bold text-gray-800">{statusLabel}</div>
          </div>
          <div className="rounded-2xl bg-orange-50 px-4 py-3 sm:col-span-2">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Error</div>
            <div className="mt-2 min-h-[1.5rem] text-sm font-semibold text-red-600">{errorText || 'None'}</div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Transcript</div>
        <div className="mt-3 rounded-2xl bg-orange-50 px-4 py-3 text-sm text-gray-700">
          <div><span className="font-bold text-gray-800">Interim:</span> {transcript || 'None'}</div>
          <div className="mt-2"><span className="font-bold text-gray-800">Final:</span> {finalTranscript || 'None'}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Event Log</div>
        <div className="mt-3 max-h-[40vh] overflow-y-auto rounded-2xl bg-gray-900 px-4 py-3 font-mono text-xs leading-6 text-green-300">
          {events.length > 0 ? events.map((entry) => <div key={entry}>{entry}</div>) : <div>No events yet.</div>}
        </div>
      </div>
    </div>
  );
}