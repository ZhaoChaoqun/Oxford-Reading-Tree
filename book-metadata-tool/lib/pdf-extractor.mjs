import fs from 'node:fs/promises';

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function extractPdf(pdfPath) {
  const data = await fs.readFile(pdfPath);
  const pdfDataUrl = `data:application/pdf;base64,${data.toString('base64')}`;
  const loadingTask = getDocument({
    data: new Uint8Array(data),
    disableWorker: true,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;

  const pageTexts = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    pageTexts.push({ pageNumber, text });
  }

  return {
    totalPages: pdf.numPages,
    pageTexts,
    pdfDataUrl,
  };
}