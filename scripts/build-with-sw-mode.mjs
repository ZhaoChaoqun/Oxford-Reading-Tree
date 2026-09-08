import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const publicDir = resolve(projectRoot, 'public');
const distDir = resolve(projectRoot, 'dist');
const normalSwPath = resolve(publicDir, 'sw.normal.js');
const cleanupSwPath = resolve(publicDir, 'sw.cleanup.js');
const distSwPath = resolve(distDir, 'sw.js');

const mode = process.argv[2] ?? 'normal';

if (!['normal', 'cleanup'].includes(mode)) {
  console.error(`Unsupported service worker mode: ${mode}`);
  process.exit(1);
}

async function runViteBuild() {
  const viteBin = resolve(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  await execFileAsync(process.execPath, [viteBin, 'build'], {
    cwd: projectRoot,
    windowsHide: true,
  });
}

async function replaceDistServiceWorker(sourcePath) {
  const source = await readFile(sourcePath, 'utf8');
  await writeFile(distSwPath, source, 'utf8');
}

async function ensureNormalTemplate() {
  const source = await readFile(normalSwPath, 'utf8');
  if (!source.includes('__ORT_SW_MODE__:normal')) {
    throw new Error('The normal service worker template is missing its marker.');
  }
}

async function main() {
  await ensureNormalTemplate();
  await runViteBuild();

  if (mode === 'cleanup') {
    await replaceDistServiceWorker(cleanupSwPath);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});