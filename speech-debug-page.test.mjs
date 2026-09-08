import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('./src/App.jsx', import.meta.url), 'utf8');
const shellSource = readFileSync(new URL('./src/components/layout/AppShell.jsx', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('./src/components/debug/SpeechDebugPage.jsx', import.meta.url), 'utf8');

assert.match(appSource, /path: '\/speech-debug', element: <SpeechDebugPage \/>/);
assert.match(shellSource, /'\/speech-debug': 'Speech Debug'/);
assert.match(shellSource, /'\/speech-debug'/);
assert.match(pageSource, /window\.SpeechRecognition \|\| window\.webkitSpeechRecognition/);
assert.match(pageSource, /recognition\.start\(\)/);
assert.match(pageSource, /onresult/);
assert.match(pageSource, /onerror/);
assert.match(pageSource, /onend/);