import { useCallback } from 'react';

let ctx = null;

function getCtx() {
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioContextClass();
  }
  return ctx;
}

function tone(ac, freq, startTime, duration, type = 'sine', gain = 0.35) {
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.connect(env);
  env.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  env.gain.setValueAtTime(0, startTime);
  env.gain.linearRampToValueAtTime(gain, startTime + 0.01);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function play(name) {
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();

    switch (name) {
      case 'correct': {
        const t = ac.currentTime;
        tone(ac, 523, t, 0.12, 'sine', 0.3);
        tone(ac, 659, t + 0.1, 0.18, 'sine', 0.3);
        break;
      }
      case 'score': {
        const t = ac.currentTime;
        tone(ac, 784, t, 0.08, 'triangle', 0.25);
        tone(ac, 988, t + 0.07, 0.08, 'triangle', 0.25);
        tone(ac, 1175, t + 0.14, 0.12, 'triangle', 0.25);
        break;
      }
      case 'unlock': {
        const t = ac.currentTime;
        tone(ac, 523, t, 0.1, 'sine', 0.28);
        tone(ac, 659, t + 0.09, 0.1, 'sine', 0.28);
        tone(ac, 784, t + 0.18, 0.1, 'sine', 0.28);
        tone(ac, 1047, t + 0.27, 0.2, 'sine', 0.28);
        break;
      }
      case 'complete': {
        const t = ac.currentTime;
        tone(ac, 523, t, 0.35, 'sine', 0.25);
        tone(ac, 659, t, 0.35, 'sine', 0.2);
        tone(ac, 784, t, 0.35, 'sine', 0.2);
        tone(ac, 1047, t, 0.35, 'triangle', 0.15);
        break;
      }
      default:
        break;
    }
  } catch {
    // AudioContext blocked - silently ignore.
  }
}

export function useSound() {
  const playFn = useCallback(play, []);
  return { play: playFn };
}
