import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { configurePdfJsWorker, getSharedPdfWorker } from '../services/pdfWorkerSetup';

const thumbnailCache = new Map();

configurePdfJsWorker(pdfjs);

export function usePdfThumbnail(pdfUrl) {
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let loadingTask = null;
    let page = null;
    let doc = null;

    if (!pdfUrl) {
      if (mountedRef.current) {
        setThumbnailUrl(null);
        setIsLoading(false);
        setError(null);
      }
      return () => {
        loadingTask?.destroy?.();
      };
    }

    if (thumbnailCache.has(pdfUrl)) {
      if (mountedRef.current) {
        setThumbnailUrl(thumbnailCache.get(pdfUrl));
        setIsLoading(false);
        setError(null);
      }
      return () => {
        loadingTask?.destroy?.();
      };
    }

    async function renderThumbnail() {
      const worker = await getSharedPdfWorker(pdfjs);

      if (mountedRef.current) {
        setIsLoading(true);
        setError(null);
        setThumbnailUrl(null);
      }

      try {
        loadingTask = pdfjs.getDocument({ url: pdfUrl, disableAutoFetch: true, worker });
        doc = await loadingTask.promise;
        page = await doc.getPage(1);

        const scale = Math.min(1.5, window.devicePixelRatio || 1);
        const viewport = page.getViewport({ scale: 1 });
        const targetWidth = 150;
        const renderScale = (targetWidth / viewport.width) * scale;
        const scaledViewport = page.getViewport({ scale: renderScale });

        const canvas = document.createElement('canvas');
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({
          canvasContext: canvas.getContext('2d'),
          viewport: scaledViewport,
        }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);

        page.cleanup();
        page = null;
        doc.destroy();
        doc = null;

        thumbnailCache.set(pdfUrl, dataUrl);

        if (mountedRef.current) {
          setThumbnailUrl(dataUrl);
          setIsLoading(false);
        }
      } catch (err) {
        page?.cleanup();
        doc?.destroy();
        console.warn('[usePdfThumbnail] Failed:', pdfUrl, err.message);

        if (mountedRef.current) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    }

    renderThumbnail();

    return () => {
      loadingTask?.destroy?.();
    };
  }, [pdfUrl]);

  return { thumbnailUrl, isLoading, error };
}
