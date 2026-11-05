import { PDFDocument } from 'pdf-lib';

export type WorkerInMessage = {
  type: 'COMPRESS_FILE';
  payload: {
    id: string;
    fileBuffer: ArrayBuffer;
    fileName: string;
    preset: 'low' | 'medium' | 'high' | 'extreme';
    targetSizeKb?: number;
  };
};

export type WorkerOutMessage =
  | {
      type: 'PROGRESS';
      payload: {
        id: string;
        progress: number;
        stage: string;
      };
    }
  | {
      type: 'SUCCESS';
      payload: {
        id: string;
        compressedBuffer: ArrayBuffer;
        originalSize: number;
        compressedSize: number;
        savedPercent: number;
        isAlreadyOptimized: boolean;
        pagesCount: number;
      };
    }
  | {
      type: 'ERROR';
      payload: {
        id: string;
        error: string;
      };
    };

// Listen to message from UI thread
self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const { type, payload } = e.data;
  if (type !== 'COMPRESS_FILE') return;

  const { id, fileBuffer, preset, targetSizeKb } = payload;
  const originalBytes = new Uint8Array(fileBuffer);
  const originalSize = originalBytes.length;

  try {
    // 1. Verify %PDF magic bytes
    if (
      originalBytes.length < 5 ||
      originalBytes[0] !== 0x25 ||
      originalBytes[1] !== 0x50 ||
      originalBytes[2] !== 0x44 ||
      originalBytes[3] !== 0x46
    ) {
      self.postMessage({
        type: 'ERROR',
        payload: {
          id,
          error: 'Invalid PDF format: Missing %PDF header bytes.',
        },
      } satisfies WorkerOutMessage);
      return;
    }

    self.postMessage({
      type: 'PROGRESS',
      payload: { id, progress: 20, stage: 'Parsing PDF objects...' },
    } satisfies WorkerOutMessage);

    // 2. Load PDF
    const pdfDoc = await PDFDocument.load(originalBytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });

    self.postMessage({
      type: 'PROGRESS',
      payload: { id, progress: 50, stage: 'Stripping metadata & cleaning object streams...' },
    } satisfies WorkerOutMessage);

    // Strip metadata
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('ShrinkFast 100% Client-Side');
    pdfDoc.setCreator('ShrinkFast');

    self.postMessage({
      type: 'PROGRESS',
      payload: { id, progress: 75, stage: 'Optimizing Deflate streams...' },
    } satisfies WorkerOutMessage);

    // Save with useObjectStreams enabled
    let compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    // Anti-bloat check: If output is >= original, return original
    const compressedSize = compressedBytes.length;
    const isAlreadyOptimized = compressedSize >= originalSize;

    const finalBytes = isAlreadyOptimized ? originalBytes : compressedBytes;
    const finalSize = isAlreadyOptimized ? originalSize : compressedSize;
    const savedPercent = isAlreadyOptimized
      ? 0
      : Math.max(0, Math.round(((originalSize - finalSize) / originalSize) * 100));

    self.postMessage({
      type: 'PROGRESS',
      payload: { id, progress: 100, stage: isAlreadyOptimized ? 'Already optimized' : 'Complete' },
    } satisfies WorkerOutMessage);

    // Return ArrayBuffer with Transferable Objects for zero-copy memory transfer
    const safeBuffer = finalBytes.buffer.slice(
      finalBytes.byteOffset,
      finalBytes.byteOffset + finalBytes.byteLength
    ) as ArrayBuffer;

    self.postMessage(
      {
        type: 'SUCCESS',
        payload: {
          id,
          compressedBuffer: safeBuffer,
          originalSize,
          compressedSize: finalSize,
          savedPercent,
          isAlreadyOptimized,
          pagesCount: pdfDoc.getPageCount(),
        },
      } satisfies WorkerOutMessage,
      // @ts-ignore transfer safeBuffer
      [safeBuffer]
    );
  } catch (err: any) {
    self.postMessage({
      type: 'ERROR',
      payload: {
        id,
        error:
          err.message?.includes('Encrypt') || err.message?.includes('password')
            ? 'This PDF is password-protected or encrypted. Please unlock it first.'
            : err.message || 'Compression failed',
      },
    } satisfies WorkerOutMessage);
  }
};
