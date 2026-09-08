export function createPdfWorkerManager(createPort) {
  let workerPromise = null;

  return {
    async getSharedPdfWorker(pdfjs) {
      if (!workerPromise) {
        workerPromise = (async () => {
          const worker = new pdfjs.PDFWorker({
            name: 'ort-shared-worker',
            port: createPort(),
          });

          await worker.promise;
          return worker;
        })().catch((error) => {
          workerPromise = null;
          throw error;
        });
      }

      return workerPromise;
    },

    async destroySharedPdfWorker() {
      if (!workerPromise) {
        return;
      }

      const worker = await workerPromise.catch(() => null);
      workerPromise = null;
      worker?.destroy?.();
    },
  };
}
