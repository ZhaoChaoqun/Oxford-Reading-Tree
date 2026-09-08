import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const buildScriptPath = resolve(projectRoot, 'scripts', 'build-with-sw-mode.mjs');

async function readText(relativePath) {
  return readFile(resolve(projectRoot, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runBuildMode(mode) {
  await execFileAsync(process.execPath, [buildScriptPath, mode], {
    cwd: projectRoot,
    windowsHide: true,
  });
}

async function main() {
  const packageJson = JSON.parse(await readText('package.json'));
  assert(
    packageJson.scripts?.['build:cleanup'],
    'Expected package.json to define a build:cleanup script.',
  );

  const sourceSwBefore = await readText('public/sw.js');
  assert(
    sourceSwBefore.includes('__ORT_SW_MODE__:normal'),
    'Expected public/sw.js to stay on the normal marker before verification starts.',
  );

  await runBuildMode('cleanup');

  const cleanupDistSw = await readText('dist/sw.js');
  const sourceSwAfterCleanup = await readText('public/sw.js');

  assert(
    cleanupDistSw.includes('__ORT_SW_MODE__:cleanup'),
    'Expected dist/sw.js from build:cleanup to contain the cleanup marker.',
  );
  assert(
    sourceSwAfterCleanup.includes('__ORT_SW_MODE__:normal'),
    'Expected public/sw.js to remain on the normal marker after build:cleanup.',
  );

  await runBuildMode('normal');

  const normalDistSw = await readText('dist/sw.js');
  const sourceSwAfterNormal = await readText('public/sw.js');
  assert(
    normalDistSw.includes('__ORT_SW_MODE__:normal'),
    'Expected dist/sw.js from the normal build to contain the normal marker.',
  );
  assert(
    sourceSwAfterNormal.includes('__ORT_SW_MODE__:normal'),
    'Expected public/sw.js to remain on the normal marker after the normal build.',
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});