import { useState, useRef, useCallback, useEffect, useReducer } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { configurePdfJsWorker, getSharedPdfWorker } from '../services/pdfWorkerSetup';
import { createLatestRenderQueue } from '../services/createLatestRenderQueue';

configurePdfJsWorker(pdfjs);

function isIOSDevice() {
  return (
    navigator.maxTouchPoints > 0 &&
    /iPad|iPhone|Macintosh/.test(navigator.userAgent)
  );
}

function getMaxDpr() {
  return isIOSDevice() ? 2 : window.devicePixelRatio || 2;
}

async function waitForTaskToSettle(task) {
  if (!task) {
    return;
  }

  try {
    await task.promise;
  } catch {
    // RenderingCancelledException is expected when we intentionally abort.
  }
}

function cancelActiveRenderTask(taskRef) {
  const activeTask = taskRef.current;
  if (!activeTask) {
    return;
  }

  activeTask.cancel();
}

async function settleActiveRenderTask(taskRef) {
  const task = taskRef.current;
  if (!task) {
    return;
  }

  await waitForTaskToSettle(task);

  if (taskRef.current === task) {
    taskRef.current = null;
  }
}

export function usePdfRenderer(pdfUrl) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMissing, setIsMissing] = useState(false);
  const [docVersion, bumpDocVersion] = useReducer((value) => value + 1, 0);

  const pdfDocRef = useRef(null);
  const renderTaskRef = useRef(null);
  const currentPageRef = useRef(null);
  const dprRef = useRef(getMaxDpr());
  const mountedRef = useRef(true);
  const renderQueueRef = useRef(createLatestRenderQueue());

  useEffect(() => {
    mountedRef.current = true;
    renderQueueRef.current.invalidate();
    setCurrentPage(1);
    setTotalPages(0);
    setError(null);
    setIsMissing(false);
    setIsLoading(Boolean(pdfUrl));

    if (!pdfUrl) {
      return () => {
        mountedRef.current = false;
        renderQueueRef.current.invalidate();
      };
    }

    let loadingTask = null;
    let destroyed = false;

    async function loadDocument() {
      // Clean up any existing document from this instance (pdfUrl changed)
      if (pdfDocRef.current) {
        try {
          await pdfDocRef.current.destroy();
        } catch {
          // ignore stale destroy failures
        }
        pdfDocRef.current = null;
      }

      if (!mountedRef.current) {
        return;
      }

      dprRef.current = getMaxDpr();
      setIsLoading(true);
      setError(null);
      setCurrentPage(1);
      setTotalPages(0);

      try {
        const worker = await getSharedPdfWorker(pdfjs);
        if (destroyed || !mountedRef.current) return;
        loadingTask = pdfjs.getDocument({
          url: pdfUrl,
          disableAutoFetch: true,
          disableStream: false,
          worker,
        });

        const doc = await loadingTask.promise;

        if (destroyed || !mountedRef.current) {
          doc.destroy();
          return;
        }

        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setIsLoading(false);
        bumpDocVersion();
      } catch (err) {
        if (destroyed || !mountedRef.current) {
          return;
        }

        if (err.name !== 'MissingPDFException') {
          console.warn('[usePdfRenderer] Load failed:', err.message);
        }

        setError(err.message || 'Failed to load PDF');
        setIsMissing(err.name === 'MissingPDFException' || err.status === 404);
        setIsLoading(false);
      }
    }

    loadDocument();

    return () => {
      destroyed = true;
      mountedRef.current = false;
      renderQueueRef.current.invalidate();

      if (loadingTask) {
        loadingTask.destroy?.();
      }

      cancelActiveRenderTask(renderTaskRef);
      renderTaskRef.current = null;

      if (currentPageRef.current) {
        currentPageRef.current.cleanup();
        currentPageRef.current = null;
      }

      pdfDocRef.current = null;
    };
  }, [pdfUrl]);

  const renderToCanvas = useCallback((canvas, pageNum) => {
    if (!canvas || !pdfDocRef.current) {
      return Promise.resolve();
    }

    const targetPage = pageNum ?? currentPage;
    if (targetPage < 1 || targetPage > (pdfDocRef.current.numPages || 0)) {
      return Promise.resolve();
    }

    cancelActiveRenderTask(renderTaskRef);

    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    return renderQueueRef.current.run(async (isStale) => {
      await settleActiveRenderTask(renderTaskRef);

      if (isStale() || !mountedRef.current || !pdfDocRef.current) {
        return;
      }

      if (currentPageRef.current) {
        currentPageRef.current.cleanup();
        currentPageRef.current = null;
      }

      const dprAttempts = dprRef.current > 1 ? [dprRef.current, 1] : [dprRef.current];

      for (const dpr of dprAttempts) {
        const page = await pdfDocRef.current.getPage(targetPage);

        if (isStale() || !mountedRef.current) {
          page.cleanup();
          return;
        }

        currentPageRef.current = page;

        const containerWidth = canvas.parentElement?.clientWidth || canvas.clientWidth || 768;
        const viewport = page.getViewport({ scale: 1 });
        const baseScale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale: baseScale * dpr });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        canvas.style.width = `${containerWidth}px`;
        canvas.style.height = `${scaledViewport.height / dpr}px`;

        const ctx = canvas.getContext('2d');
        const renderTask = page.render({
          canvasContext: ctx,
          viewport: scaledViewport,
        });

        renderTaskRef.current = renderTask;

        try {
          await renderTask.promise;

          if (renderTaskRef.current === renderTask) {
            renderTaskRef.current = null;
          }

          if (isStale() || !mountedRef.current) {
            page.cleanup();
            if (currentPageRef.current === page) {
              currentPageRef.current = null;
            }
            return;
          }

          dprRef.current = dpr;
          setIsLoading(false);
          return;
        } catch (err) {
          if (renderTaskRef.current === renderTask) {
            renderTaskRef.current = null;
          }

          if (currentPageRef.current === page) {
            currentPageRef.current = null;
          }
          page.cleanup();

          if (err instanceof pdfjs.RenderingCancelledException) {
            return;
          }

          console.warn('[usePdfRenderer] Render failed:', err.message);

          if (dpr > 1) {
            console.warn('[usePdfRenderer] Retrying at 1x DPR');
            dprRef.current = 1;
            continue;
          }

          if (mountedRef.current && !isStale()) {
            setError(err.message || 'Failed to render page');
            setIsLoading(false);
          }
          return;
        }
      }
    });
  }, [currentPage, docVersion]);

  const goToPage = useCallback((pageNum) => {
    const clamped = Math.max(1, Math.min(pageNum, totalPages));
    setCurrentPage(clamped);
  }, [totalPages]);

  const goNext = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const goPrev = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  return {
    currentPage,
    totalPages,
    isLoading,
    error,
    isMissing,
    isFirstPage: currentPage <= 1,
    isLastPage: currentPage >= totalPages,
    renderToCanvas,
    goToPage,
    goNext,
    goPrev,
  };
}
