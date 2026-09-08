/**
 * speechService.js
 *
 * Web Speech API wrapper for keyword pronunciation practice.
 */

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const DEFAULT_LANG = 'en-US';

let activeRecognition = null;

export function isSupported() {
  return SpeechRecognition != null;
}

function stopSpeaking() {
  if (typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel();
  } catch {
    // ignore
  }
}

export function stopRecognitionSession() {
  if (!activeRecognition) {
    return;
  }

  try {
    activeRecognition.stop();
  } catch {
    try {
      activeRecognition.abort();
    } catch {
      // ignore
    }
  }
}

export function cancel() {
  stopRecognitionSession();
}

function normalise(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1));

  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

function isMatch(target, transcript) {
  const t = normalise(target);
  const s = normalise(transcript);

  if (!t || !s) return false;
  if (s === t) return true;
  if (s.includes(t)) return true;
  if (t.includes(s) && s.length >= t.length * 0.5) return true;

  const words = s.split(' ');
  for (const w of words) {
    if (w === t) return true;
    const maxDist = Math.max(1, Math.ceil(t.length * 0.3));
    if (levenshtein(w, t) <= maxDist) return true;
  }

  const maxDist = Math.max(1, Math.ceil(t.length * 0.3));
  return levenshtein(s, t) <= maxDist;
}

export function evaluateRecognitionTranscript(targetWord, transcript) {
  const spoken = String(transcript || '').trim();
  return {
    passed: isMatch(targetWord, spoken),
    transcript: spoken,
  };
}

const DEBUG_LOG = [];
if (typeof window !== 'undefined') {
  window.__speechDebug = DEBUG_LOG;
}

function debugLog(tag, detail) {
  const entry = `${new Date().toISOString().slice(11, 23)} [${tag}] ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`;
  DEBUG_LOG.push(entry);
  if (DEBUG_LOG.length > 60) DEBUG_LOG.shift();
  console.log('[speechDebug]', entry);
}

export function startRecognitionSession({
  lang = DEFAULT_LANG,
  onStart,
  onAudioStart,
  onSpeechStart,
  onResult,
  onError,
  onEnd,
} = {}) {
  if (!SpeechRecognition) {
    onError?.({ error: 'unsupported', message: 'SpeechRecognition unavailable' });
    return false;
  }

  stopSpeaking();
  stopRecognitionSession();

  const recognition = new SpeechRecognition();
  activeRecognition = recognition;
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  debugLog('init', { lang });

  recognition.onstart = () => {
    debugLog('event', 'onstart');
    onStart?.();
  };
  recognition.onaudiostart = () => {
    debugLog('event', 'onaudiostart');
    onAudioStart?.();
  };
  recognition.onspeechstart = () => {
    debugLog('event', 'onspeechstart');
    onSpeechStart?.();
  };
  recognition.onspeechend = () => debugLog('event', 'onspeechend');
  recognition.onsoundstart = () => debugLog('event', 'onsoundstart');
  recognition.onsoundend = () => debugLog('event', 'onsoundend');
  recognition.onaudioend = () => debugLog('event', 'onaudioend');

  recognition.onresult = (event) => {
    let interim = '';
    let final = '';

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const text = event.results[i][0]?.transcript?.trim() ?? '';
      if (!text) {
        continue;
      }

      if (event.results[i].isFinal) {
        final += `${text} `;
      } else {
        interim += `${text} `;
      }
    }

    const payload = {
      interim: interim.trim(),
      final: final.trim(),
      transcript: (final || interim).trim(),
    };

    debugLog('result', payload);
    onResult?.(payload);
  };

  recognition.onerror = (event) => {
    const payload = {
      error: event.error || 'error',
      message: event.message || '',
    };
    debugLog('error', payload);
    onError?.(payload);
  };

  recognition.onend = () => {
    if (activeRecognition === recognition) {
      activeRecognition = null;
    }
    debugLog('event', 'onend');
    onEnd?.();
  };

  try {
    recognition.start();
    debugLog('start', 'recognition.start() called');
    return true;
  } catch (error) {
    if (activeRecognition === recognition) {
      activeRecognition = null;
    }
    const payload = {
      error: 'start-failed',
      message: error.message || 'start failed',
    };
    debugLog('start', `FAILED: ${payload.message}`);
    onError?.(payload);
    onEnd?.();
    return false;
  }
}

export async function requestMicPermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'unsupported';
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return 'granted';
  } catch (err) {
    console.warn('[speechService] mic permission:', err.name);
    return 'denied';
  }
}

const FEMALE_VOICE_HINTS = {
  en: [
    'Samantha',
    'Karen',
    'Moira',
    'Serena',
    'Susan',
    'Sonia',
    'Natasha',
    'Jenny',
    'Aria',
    'Ava',
    'Emma',
    'Libby',
  ],
  zh: [
    'Tingting',
    'Ting-Ting',
    'Xiaoxiao',
    'Xiaochen',
    'Xiaoyi',
    'Huihui',
    'Yaoyao',
    'Mei-Jia',
    'Meijia',
    'Sin-ji',
    'Yating',
    'Hanhan',
  ],
};

let cachedVoices = [];
let voicesPrimed = false;

function getLanguageFamily(lang) {
  return String(lang || DEFAULT_LANG).toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function languageMatches(voiceLang, targetLang) {
  const target = String(targetLang || DEFAULT_LANG).toLowerCase();
  const voice = String(voiceLang || '').toLowerCase();
  if (!voice) return false;
  if (voice === target) return true;
  return voice.split('-')[0] === target.split('-')[0];
}

function getVoicePool() {
  if (typeof speechSynthesis === 'undefined') {
    return [];
  }

  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
    return voices;
  }

  return cachedVoices;
}

export function primeSpeechVoices() {
  if (typeof speechSynthesis === 'undefined' || voicesPrimed) {
    return;
  }

  voicesPrimed = true;
  cachedVoices = speechSynthesis.getVoices();

  speechSynthesis.addEventListener('voiceschanged', () => {
    cachedVoices = speechSynthesis.getVoices();
  });
}

function findVoiceByHints(voices, hints) {
  for (const hint of hints) {
    const preferred = voices.find((voice) => voice?.name?.toLowerCase().includes(hint.toLowerCase()));
    if (preferred) {
      return preferred;
    }
  }
  return null;
}

export function selectPreferredVoice(voices, lang = DEFAULT_LANG) {
  if (!Array.isArray(voices) || voices.length === 0) {
    return null;
  }

  const family = getLanguageFamily(lang);
  const hints = FEMALE_VOICE_HINTS[family] ?? [];
  const exactMatches = voices.filter((voice) => String(voice?.lang || '').toLowerCase() === String(lang).toLowerCase());
  const familyMatches = voices.filter((voice) => languageMatches(voice?.lang, lang));

  const exactFemale = findVoiceByHints(exactMatches, hints);
  if (exactFemale) {
    return exactFemale;
  }

  const familyFemale = findVoiceByHints(familyMatches, hints);
  if (familyFemale) {
    return familyFemale;
  }

  const exactDefault = exactMatches.find((voice) => voice?.default);
  if (exactDefault) {
    return exactDefault;
  }

  const familyDefault = familyMatches.find((voice) => voice?.default);
  if (familyDefault) {
    return familyDefault;
  }

  if (exactMatches.length > 0) {
    return exactMatches[0];
  }

  if (familyMatches.length > 0) {
    return familyMatches[0];
  }

  const globalDefault = voices.find((voice) => voice?.default);
  return globalDefault || voices[0] || null;
}

primeSpeechVoices();

export function speak(text, opts = {}) {
  if (typeof speechSynthesis === 'undefined' || !text) return;

  primeSpeechVoices();
  stopSpeaking();

  const lang = opts.lang || DEFAULT_LANG;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = opts.rate ?? 0.85;
  utterance.pitch = opts.pitch ?? 1;

  const voice = selectPreferredVoice(getVoicePool(), lang);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || lang;
  }

  speechSynthesis.speak(utterance);
}