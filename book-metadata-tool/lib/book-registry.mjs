import fs from 'node:fs';
import path from 'node:path';

export function resolveBook(bookId, { resourcesRoot }) {
  const match = /^(\d+)-(\d{2})$/.exec(bookId);
  if (!match) {
    throw new Error(`Invalid book id: ${bookId}`);
  }

  const stage = Number(match[1]);
  const pdfPath = path.join(resourcesRoot, 'books', `stage-${stage}`, `${bookId}.pdf`);

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Could not find PDF for ${bookId} at ${pdfPath}`);
  }

  return {
    bookId,
    stage,
    pdfPath,
  };
}