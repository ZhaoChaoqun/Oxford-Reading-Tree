import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-OCR';
export const DEFAULT_API_KEY_ENV = 'SILICONFLOW_API_KEY';

const TOOL_ROOT = path.dirname(fileURLToPath(new URL('../cli.mjs', import.meta.url)));
const PROJECT_ROOT = path.resolve(TOOL_ROOT, '..');
const DEFAULT_RESOURCES_ROOT = path.resolve(PROJECT_ROOT, '..', 'OxfordTree');
const DEFAULT_OUTPUT_DIR = path.resolve(TOOL_ROOT, 'generated');

export function parseCliArgs(argv) {
  const options = {
    bookIds: [],
    model: DEFAULT_MODEL,
    apiKeyEnv: DEFAULT_API_KEY_ENV,
    extractOnly: false,
    resourcesRoot: DEFAULT_RESOURCES_ROOT,
    outputDir: DEFAULT_OUTPUT_DIR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case '--book-ids':
        options.bookIds = String(argv[index + 1] ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        index += 1;
        break;
      case '--model':
        options.model = String(argv[index + 1] ?? '').trim() || DEFAULT_MODEL;
        index += 1;
        break;
      case '--api-key-env':
        options.apiKeyEnv = String(argv[index + 1] ?? '').trim() || DEFAULT_API_KEY_ENV;
        index += 1;
        break;
      case '--resources-root':
        options.resourcesRoot = path.resolve(String(argv[index + 1] ?? '').trim());
        index += 1;
        break;
      case '--output-dir':
        options.outputDir = path.resolve(String(argv[index + 1] ?? '').trim());
        index += 1;
        break;
      case '--extract-only':
        options.extractOnly = true;
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (options.bookIds.length === 0) {
    throw new Error('Missing required --book-ids argument.');
  }

  return options;
}