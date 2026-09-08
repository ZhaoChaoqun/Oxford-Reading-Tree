import test from 'node:test';
import assert from 'node:assert/strict';
import * as speechService from './speechService.js';

const {
  evaluateRecognitionTranscript,
  selectPreferredVoice,
  speak,
} = speechService;

test('evaluateRecognitionTranscript matches close single-word variations for frontend scoring reuse', () => {
  const result = evaluateRecognitionTranscript('school', 'schools');
  assert.equal(result.passed, true);
  assert.equal(result.transcript, 'schools');
});

test('selectPreferredVoice prefers female English voice across the language family before male exact-match default', () => {
  const voices = [
    { name: 'Daniel', lang: 'en-GB', default: true },
    { name: 'Samantha', lang: 'en-US', default: false },
    { name: 'Karen', lang: 'en-AU', default: false },
  ];

  const selected = selectPreferredVoice(voices, 'en-GB');
  assert.equal(selected?.name, 'Samantha');
});

test('selectPreferredVoice prefers exact-language female English voice when available', () => {
  const voices = [
    { name: 'Microsoft David', lang: 'en-GB', default: true },
    { name: 'Samantha', lang: 'en-US', default: false },
    { name: 'Microsoft Sonia', lang: 'en-GB', default: false },
  ];

  const selected = selectPreferredVoice(voices, 'en-GB');
  assert.equal(selected?.name, 'Microsoft Sonia');
});

test('selectPreferredVoice falls back to language default when no preferred female voice exists', () => {
  const voices = [
    { name: 'English Default', lang: 'en-GB', default: true },
    { name: 'Chinese Voice', lang: 'zh-CN', default: false },
  ];

  const selected = selectPreferredVoice(voices, 'en-GB');
  assert.equal(selected?.name, 'English Default');
});

test('selectPreferredVoice prefers Chinese female voice hints', () => {
  const voices = [
    { name: 'Chinese Default', lang: 'zh-CN', default: true },
    { name: 'Microsoft Xiaoxiao', lang: 'zh-CN', default: false },
  ];

  const selected = selectPreferredVoice(voices, 'zh-CN');
  assert.equal(selected?.name, 'Microsoft Xiaoxiao');
});

test('speak cancels any queued speech before speaking new text', () => {
  const originalSpeechSynthesis = globalThis.speechSynthesis;
  const originalUtterance = globalThis.SpeechSynthesisUtterance;
  const calls = [];

  globalThis.speechSynthesis = {
    getVoices() {
      return [];
    },
    addEventListener() {},
    cancel() {
      calls.push('cancel');
    },
    speak(utterance) {
      calls.push(['speak', utterance.text]);
    },
  };

  globalThis.SpeechSynthesisUtterance = class MockUtterance {
    constructor(text) {
      this.text = text;
      this.lang = '';
      this.rate = 1;
      this.pitch = 1;
      this.voice = null;
    }
  };

  try {
    speak('school');
    assert.deepEqual(calls, ['cancel', ['speak', 'school']]);
  } finally {
    if (originalSpeechSynthesis === undefined) {
      delete globalThis.speechSynthesis;
    } else {
      globalThis.speechSynthesis = originalSpeechSynthesis;
    }

    if (originalUtterance === undefined) {
      delete globalThis.SpeechSynthesisUtterance;
    } else {
      globalThis.SpeechSynthesisUtterance = originalUtterance;
    }
  }
});
