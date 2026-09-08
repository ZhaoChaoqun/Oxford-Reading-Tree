import process from 'node:process';

import { writeGeneratedOutput } from './lib/artifact-store.mjs';
import { parseCliArgs } from './lib/config.mjs';
import { generateBookMetadata } from './lib/pipeline.mjs';

async function main(argv) {
  const options = parseCliArgs(argv);
  const apiKey = process.env[options.apiKeyEnv];

  if (!options.extractOnly && !apiKey) {
    throw new Error(`Missing API key in environment variable ${options.apiKeyEnv}.`);
  }

  const startedAt = new Date().toISOString();
  const books = [];
  for (const bookId of options.bookIds) {
    books.push(
      await generateBookMetadata({
        bookId,
        model: options.model,
        resourcesRoot: options.resourcesRoot,
        outputDir: options.outputDir,
        apiKey,
        extractOnly: options.extractOnly,
      }),
    );
  }
  const finishedAt = new Date().toISOString();

  const payload = {
    runMeta: {
      model: options.model,
      bookIds: options.bookIds,
      extractOnly: options.extractOnly,
      startedAt,
      finishedAt,
    },
    books,
  };

  const outputFile = await writeGeneratedOutput({ outputDir: options.outputDir, payload });
  console.log(JSON.stringify({ outputFile, bookCount: books.length, extractOnly: options.extractOnly }, null, 2));
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});