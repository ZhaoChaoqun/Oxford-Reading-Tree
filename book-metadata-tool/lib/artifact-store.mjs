import fs from 'node:fs/promises';
import path from 'node:path';

function sanitizeFilePart(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '_');
}

export async function ensureOutputDirs(outputDir) {
  const rawDir = path.join(outputDir, 'raw');
  await fs.mkdir(rawDir, { recursive: true });
  return { rawDir };
}

export async function writeRawArtifact({ outputDir, bookId, model, payload }) {
  const { rawDir } = await ensureOutputDirs(outputDir);
  const fileName = `${sanitizeFilePart(bookId)}__${sanitizeFilePart(model)}.json`;
  const fullPath = path.join(rawDir, fileName);
  await fs.writeFile(fullPath, JSON.stringify(payload, null, 2), 'utf8');
  return path.relative(outputDir, fullPath).replace(/\\/g, '/');
}

export async function writeGeneratedOutput({ outputDir, payload }) {
  await ensureOutputDirs(outputDir);
  const outputFile = path.join(outputDir, 'books.generated.json');
  await fs.writeFile(outputFile, JSON.stringify(payload, null, 2), 'utf8');
  return outputFile;
}