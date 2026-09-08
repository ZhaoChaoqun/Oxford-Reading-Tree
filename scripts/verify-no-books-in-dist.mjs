import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const buildScriptPath = resolve(projectRoot, 'scripts', 'build-with-sw-mode.mjs');
const distBooksPath = resolve(projectRoot, 'dist', 'books');

async function pathExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await execFileAsync(process.execPath, [buildScriptPath, 'normal'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  if (await pathExists(distBooksPath)) {
    throw new Error('Expected dist/books to be absent after a normal build.');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});