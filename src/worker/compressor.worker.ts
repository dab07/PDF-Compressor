import { PDFDocument } from 'pdf-lib';
import {
  PRESET_TUNING,
  compressEmbeddedImages,
  rasterizePdf,
} from '../compressor/deepOptimizer';

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
      payload: { id, progress: 15, stage: 'Parsing PDF objects & embedded streams...' },
    } satisfies WorkerOutMessage);

    const settings = PRESET_TUNING[preset] || PRESET_TUNING.medium;
    let finalBytes: Uint8Array | null = null;
    let pagesCount = 1;

    // Check if targetSizeKb is requested or if preset is extreme
    if (preset === 'extreme') {
      self.postMessage({
        type: 'PROGRESS',
        payload: { id, progress: 30, stage: 'Rasterizing pages with pdf.js...' },
      } satisfies WorkerOutMessage);

      try {
        finalBytes = await rasterizePdf(originalBytes, settings, (p) => {
          self.postMessage({
            type: 'PROGRESS',
            payload: { id, progress: p, stage: `Rasterizing page graphics (${p}%)...` },
          } satisfies WorkerOutMessage);
        });
      } catch (e) {
        // Fallback to normal compression if rasterize encounters unsupported feature
        console.warn('Rasterization fallback:', e);
      }
    }

    if (!finalBytes) {
      // Method 1: Deep embedded image re-encoding + stream deflation
      const pdfDoc = await PDFDocument.load(originalBytes, {
        ignoreEncryption: false,
        updateMetadata: false,
      });

      pagesCount = pdfDoc.getPageCount();

      self.postMessage({
        type: 'PROGRESS',
        payload: { id, progress: 35, stage: 'Searching & compressing embedded images...' },
      } satisfies WorkerOutMessage);

      // Recompress embedded high-res images
      const replacedCount = await compressEmbeddedImages(pdfDoc, settings, (p) => {
        self.postMessage({
          type: 'PROGRESS',
          payload: { id, progress: p, stage: `Downsampling embedded image streams...` },
        } satisfies WorkerOutMessage);
      });

      self.postMessage({
        type: 'PROGRESS',
        payload: { id, progress: 80, stage: 'Stripping metadata & packing object streams...' },
      } satisfies WorkerOutMessage);

      // Strip metadata
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('ShrinkFast');
      pdfDoc.setCreator('ShrinkFast');

      let compressed = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });

      // If embedded images weren't present (e.g., scanned PDF with direct page rasters)
      // and user wanted high reduction or file didn't shrink enough:
      if ((preset === 'high' || targetSizeKb) && compressed.length > (originalSize * 0.85)) {
        self.postMessage({
          type: 'PROGRESS',
          payload: { id, progress: 85, stage: 'Applying deep rasterization optimization...' },
        } satisfies WorkerOutMessage);

        try {
          const rasterized = await rasterizePdf(originalBytes, settings);
          if (rasterized.length < compressed.length) {
            compressed = rasterized;
          }
        } catch {
          // Keep best compressed so far
        }
      }

      finalBytes = compressed;
    }

    const compressedSize = finalBytes.length;
    const isAlreadyOptimized = compressedSize >= originalSize;
    const outputBytes = isAlreadyOptimized ? originalBytes : finalBytes;
    const finalSize = isAlreadyOptimized ? originalSize : compressedSize;
    const savedPercent = isAlreadyOptimized
      ? 0
      : Math.max(0, Math.round(((originalSize - finalSize) / originalSize) * 100));

    self.postMessage({
      type: 'PROGRESS',
      payload: { id, progress: 100, stage: isAlreadyOptimized ? 'Already optimized' : 'Complete' },
    } satisfies WorkerOutMessage);

    const safeBuffer = outputBytes.buffer.slice(
      outputBytes.byteOffset,
      outputBytes.byteOffset + outputBytes.byteLength
    ) as ArrayBuffer;

    (self as unknown as Worker).postMessage(
      {
        type: 'SUCCESS',
        payload: {
          id,
          compressedBuffer: safeBuffer,
          originalSize,
          compressedSize: finalSize,
          savedPercent,
          isAlreadyOptimized,
          pagesCount,
        },
      } satisfies WorkerOutMessage,
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
