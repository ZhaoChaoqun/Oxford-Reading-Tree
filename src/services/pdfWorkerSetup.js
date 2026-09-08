import PdfJsWorkerPort from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import { createPdfWorkerManager } from './pdfWorkerManager';

const manager = createPdfWorkerManager(() => new PdfJsWorkerPort());

// Kept for call sites that already invoke it at module scope.
// We no longer configure GlobalWorkerOptions.workerPort globally.
export function configurePdfJsWorker() {}

export const getSharedPdfWorker = manager.getSharedPdfWorker;
export const destroySharedPdfWorker = manager.destroySharedPdfWorker;
