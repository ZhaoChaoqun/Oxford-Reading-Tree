import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./public/speech-debug.html', import.meta.url), 'utf8');
const manifest = readFileSync(new URL('./public/speech-debug-manifest.json', import.meta.url), 'utf8');

assert.match(html, /<link rel="manifest" href="\.\/speech-debug-manifest\.json" \/>/);
assert.match(html, /navigator\.mediaDevices\.getUserMedia\(\{ audio: true \}\)/);
assert.match(html, /window\.SpeechRecognition \|\| window\.webkitSpeechRecognition/);
assert.match(html, /recognition\.start\(\)/);
assert.match(html, /speech-debug-manifest/);
assert.match(manifest, /"start_url": "\.\/speech-debug\.html"/);
assert.match(manifest, /"display": "standalone"/);