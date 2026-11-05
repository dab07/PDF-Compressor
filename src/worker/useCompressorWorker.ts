import { useEffect, useRef, useCallback } from 'react';
import { WorkerInMessage, WorkerOutMessage } from './compressor.worker';

export interface UseCompressorWorkerProps {
  onProgress?: (id: string, progress: number, stage: string) => void;
  onSuccess?: (
    id: string,
    result: {
      compressedBlob: Blob;
      originalSize: number;
      compressedSize: number;
      savedPercent: number;
      isAlreadyOptimized: boolean;
      pagesCount: number;
    }
  ) => void;
  onError?: (id: string, error: string) => void;
}

export function useCompressorWorker({
  onProgress,
  onSuccess,
  onError,
}: UseCompressorWorkerProps) {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Instantiate Dedicated Web Worker
    const worker = new Worker(
      new URL('./compressor.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;
      if (msg.type === 'PROGRESS') {
        onProgress?.(msg.payload.id, msg.payload.progress, msg.payload.stage);
      } else if (msg.type === 'SUCCESS') {
        const blob = new Blob([msg.payload.compressedBuffer], { type: 'application/pdf' });
        onSuccess?.(msg.payload.id, {
          compressedBlob: blob,
          originalSize: msg.payload.originalSize,
          compressedSize: msg.payload.compressedSize,
          savedPercent: msg.payload.savedPercent,
          isAlreadyOptimized: msg.payload.isAlreadyOptimized,
          pagesCount: msg.payload.pagesCount,
        });
      } else if (msg.type === 'ERROR') {
        onError?.(msg.payload.id, msg.payload.error);
      }
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, [onProgress, onSuccess, onError]);

  const compressPdfInWorker = useCallback(
    async (id: string, file: File, preset: 'low' | 'medium' | 'high' | 'extreme', targetSizeKb?: number) => {
      if (!workerRef.current) return;
      const arrayBuffer = await file.arrayBuffer();

      const message: WorkerInMessage = {
        type: 'COMPRESS_FILE',
        payload: {
          id,
          fileBuffer: arrayBuffer,
          fileName: file.name,
          preset,
          targetSizeKb,
        },
      };

      // Transfer ArrayBuffer to worker thread for high performance (zero UI blocking)
      workerRef.current.postMessage(message, [arrayBuffer]);
    },
    []
  );

  return { compressPdfInWorker };
}
