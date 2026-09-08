import { useEffect, useRef } from 'react';

const SAD_FACE = String.fromCodePoint(0x1f61f);

export function PdfViewer({ canvasKey, renderToCanvas, isLoading, error }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof renderToCanvas !== 'function') {
      return;
    }

    let disposed = false;

    Promise.resolve(renderToCanvas(canvas)).catch(() => {
      if (disposed) {
        return;
      }
    });

    return () => {
      disposed = true;
      if (canvasRef.current) {
        canvasRef.current.width = 0;
        canvasRef.current.height = 0;
      }
    };
  }, [canvasKey, renderToCanvas]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg">
      {error ? (
        <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 border-2 border-orange-200 bg-orange-50 px-6 py-10 text-center">
          <div className="text-5xl">{SAD_FACE}</div>
          <div className="text-lg font-extrabold text-orange-600">Oops, the page could not load</div>
          <div className="text-sm font-semibold text-orange-500">{error}</div>
        </div>
      ) : (
        <>
          <canvas key={canvasKey} ref={canvasRef} className="block w-full" />
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
