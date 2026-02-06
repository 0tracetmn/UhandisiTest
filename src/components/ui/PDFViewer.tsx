import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from './Button';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PDFViewerProps {
  url: string;
  isFullscreen?: boolean;
}

export function PDFViewer({ url, isFullscreen = false }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const isRenderingRef = useRef<boolean>(false);
  const pdfDocRef = useRef<any>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's')) {
        e.preventDefault();
        return false;
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (container) {
        container.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, []);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[PDFViewer] Starting PDF load from URL:', url);

        const response = await fetch(url);
        console.log('[PDFViewer] Fetch response status:', response.status);

        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log('[PDFViewer] PDF ArrayBuffer loaded, size:', arrayBuffer.byteLength);

        if (arrayBuffer.byteLength === 0) {
          throw new Error('PDF file is empty');
        }

        console.log('[PDFViewer] Creating PDF.js document task...');
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
        });

        console.log('[PDFViewer] Waiting for PDF to load...');
        const pdfDoc = await loadingTask.promise;
        console.log('[PDFViewer] PDF loaded successfully!');
        console.log('[PDFViewer] Number of pages:', pdfDoc.numPages);

        pdfDocRef.current = pdfDoc;
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setLoading(false);
      } catch (err: any) {
        console.error('[PDFViewer] Error loading PDF:', err);
        setError(`Failed to load PDF: ${err?.message || 'Unknown error'}`);
        setLoading(false);
      }
    };

    if (url) {
      loadPdf();
    }

    return () => {
      if (pdfDocRef.current) {
        console.log('[PDFViewer] Cleaning up PDF document');
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [url]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    const renderPage = async () => {
      // Prevent concurrent renders
      if (isRenderingRef.current) {
        console.log('[PDFViewer] Render already in progress, waiting...');
        // Cancel the existing render first
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }
        // Wait a bit for the cancellation to complete
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      try {
        isRenderingRef.current = true;

        console.log('[PDFViewer] Rendering page:', currentPage, 'at scale:', scale);
        const page = await pdf.getPage(currentPage);
        console.log('[PDFViewer] Page loaded, rendering...');

        const canvas = canvasRef.current;
        if (!canvas) {
          console.error('[PDFViewer] Canvas ref is null');
          isRenderingRef.current = false;
          return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
          console.error('[PDFViewer] Could not get 2D context');
          isRenderingRef.current = false;
          return;
        }

        const viewport = page.getViewport({ scale });
        console.log('[PDFViewer] Viewport size:', viewport.width, 'x', viewport.height);

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        // Store the render task so we can cancel it if needed
        renderTaskRef.current = page.render(renderContext);

        await renderTaskRef.current.promise;
        renderTaskRef.current = null;
        isRenderingRef.current = false;
        console.log('[PDFViewer] Page rendered successfully');
      } catch (err: any) {
        isRenderingRef.current = false;
        // Ignore cancellation errors
        if (err?.name === 'RenderingCancelledException') {
          console.log('[PDFViewer] Render cancelled (expected)');
          return;
        }
        console.error('[PDFViewer] Error rendering page:', err);
        console.error('[PDFViewer] Error message:', err?.message);
        setError(`Failed to render page: ${err?.message || 'Unknown error'}`);
      }
    };

    renderPage();

    // Cleanup function to cancel render on unmount or when dependencies change
    return () => {
      if (renderTaskRef.current) {
        console.log('[PDFViewer] Cleaning up: cancelling render task');
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
        isRenderingRef.current = false;
      }
    };
  }, [pdf, currentPage, scale]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.25, 0.5));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="text-slate-600">Loading PDF...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-2">
        <div className="text-red-600 text-lg font-medium">{error}</div>
        <div className="text-slate-500 text-sm">Please try again or contact support</div>
      </div>
    );
  }

  if (!pdf) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">No PDF loaded</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full" tabIndex={0}>
      <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 border-b border-slate-200 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-700 min-w-[80px] text-center">
            {currentPage} / {totalPages}
          </span>
          <Button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleZoomOut} variant="outline" size="sm">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-700 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button onClick={handleZoomIn} variant="outline" size="sm">
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto bg-slate-100 p-4 select-none"
        style={{ height: isFullscreen ? 'calc(95vh - 60px)' : 'calc(70vh - 60px)' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="shadow-lg bg-white"
            onContextMenu={(e) => e.preventDefault()}
            style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  );
}
