import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const indexHtml = await readFile(resolve(projectRoot, 'index.html'), 'utf8');
  const css = await readFile(resolve(projectRoot, 'src', 'index.css'), 'utf8');
  const tailwindConfig = await readFile(resolve(projectRoot, 'tailwind.config.js'), 'utf8');

  assert(!indexHtml.includes('fonts.googleapis.com'), 'index.html still references Google Fonts.');
  assert(!indexHtml.includes('fonts.gstatic.com'), 'index.html still preconnects to Google Fonts hosts.');
  assert(!css.includes('Nunito'), 'src/index.css still hardcodes Nunito.');
  assert(!tailwindConfig.includes('Nunito'), 'tailwind.config.js still hardcodes Nunito.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});