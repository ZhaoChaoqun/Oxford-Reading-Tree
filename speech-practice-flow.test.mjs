import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const questionSource = readFileSync(new URL('./src/components/speech/SpeechQuestion.jsx', import.meta.url), 'utf8');
const serviceSource = readFileSync(new URL('./src/services/speechService.js', import.meta.url), 'utf8');

assert.match(questionSource, /startRecognitionSession/);
assert.match(questionSource, /stopRecognitionSession/);
assert.doesNotMatch(questionSource, /permissionRequestedRef/);
assert.doesNotMatch(questionSource, /requestMicPermission\(\)\.then/);
assert.match(questionSource, /Start recording/);
assert.match(questionSource, /Stop recording/);
assert.match(serviceSource, /export function startRecognitionSession\(/);
assert.match(serviceSource, /export function stopRecognitionSession\(/);
assert.match(serviceSource, /export function evaluateRecognitionTranscript\(/);
assert.doesNotMatch(serviceSource, /getRecognitionPreparationDelay/);