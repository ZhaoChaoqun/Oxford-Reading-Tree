import { resolveBook as defaultResolveBook } from './book-registry.mjs';
import { buildMessages as defaultBuildMessages } from './prompt-builder.mjs';
import { parseModelResponse as defaultParseModelResponse } from './response-parser.mjs';
import { extractPdf as defaultExtractPdf } from './pdf-extractor.mjs';
import { callSiliconFlow as defaultCallSiliconFlow } from './siliconflow-client.mjs';
import { writeRawArtifact as defaultWriteRawArtifact } from './artifact-store.mjs';

export async function generateBookMetadata(options) {
  const {
    bookId,
    model,
    resourcesRoot,
    outputDir,
    apiKey,
    extractOnly = false,
    resolveBook = defaultResolveBook,
    extractPdf = defaultExtractPdf,
    buildMessages = defaultBuildMessages,
    callModel = defaultCallSiliconFlow,
    parseModelResponse = defaultParseModelResponse,
    writeRawArtifact = defaultWriteRawArtifact,
  } = options;

  const book = resolveBook(bookId, { resourcesRoot });
  const extracted = await extractPdf(book.pdfPath);

  const baseRecord = {
    id: book.bookId,
    stage: book.stage,
    totalPages: extracted.totalPages,
    sourcePdf: book.pdfPath,
  };

  if (extractOnly) {
    return {
      ...baseRecord,
      extractionMeta: {
        extractOnly: true,
        pdfInputReady: Boolean(extracted.pdfDataUrl),
        textItemsDetected: extracted.pageTexts.filter((page) => page.text).length,
      },
    };
  }

  const messages = buildMessages({
    model,
    bookId: book.bookId,
    stage: book.stage,
    totalPages: extracted.totalPages,
    pageTexts: extracted.pageTexts,
    pdfDataUrl: extracted.pdfDataUrl,
  });

  const modelResult = await callModel({ model, messages, apiKey });
  const parsed = parseModelResponse(modelResult.rawResponseText, { stage: book.stage });
  const rawArtifactFile = await writeRawArtifact({
    outputDir,
    bookId: book.bookId,
    model,
    payload: {
      book,
      extracted: {
        totalPages: extracted.totalPages,
        pageTexts: extracted.pageTexts,
        hasPdfDataUrl: Boolean(extracted.pdfDataUrl),
      },
      messages,
      ...modelResult,
    },
  });

  return {
    ...baseRecord,
    title: parsed.title,
    quiz: parsed.quiz,
    generationMeta: {
      model,
      latencyMs: modelResult.latencyMs,
      startedAt: modelResult.startedAt,
      finishedAt: modelResult.finishedAt,
      rawArtifactFile,
    },
  };
}
