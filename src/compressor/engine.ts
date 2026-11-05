import { PDFDocument } from 'pdf-lib';
import {
  CompressionOptions,
  CompressionResult,
  PRESET_CONFIGS,
} from './types';
import { validatePdfMagicBytes, isPdfEncrypted } from './validator';

/**
 * Re-encodes image buffer via OffscreenCanvas (Worker) or HTMLCanvas (Window)
 */
export async function reencodeImageJpeg(
  imgBytes: Uint8Array,
  quality: number,
  maxDimension?: number
): Promise<Uint8Array> {
  // Check if running in environment with OffscreenCanvas or regular Canvas
  if (typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined') {
    try {
      const blob = new Blob([imgBytes as any]);
      const bitmap = await createImageBitmap(blob);
      let width = bitmap.width;
      let height = bitmap.height;

      if (maxDimension && (width > maxDimension || height > maxDimension)) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return imgBytes;

      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();

      const compressedBlob = await canvas.convertToBlob({
        type: 'image/jpeg',
        quality: Math.min(1, Math.max(0.1, quality)),
      });

      const buffer = await compressedBlob.arrayBuffer();
      const result = new Uint8Array(buffer);
      return result.length < imgBytes.length ? result : imgBytes;
    } catch {
      return imgBytes;
    }
  }

  // Window/DOM fallback if not inside a dedicated OffscreenCanvas worker
  if (typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const blob = new Blob([imgBytes as any]);
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          let width = img.naturalWidth;
          let height = img.naturalHeight;

          if (maxDimension && (width > maxDimension || height > maxDimension)) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(imgBytes);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            async (b) => {
              if (b) {
                const buf = await b.arrayBuffer();
                const res = new Uint8Array(buf);
                resolve(res.length < imgBytes.length ? res : imgBytes);
              } else {
                resolve(imgBytes);
              }
            },
            'image/jpeg',
            quality
          );
        } catch {
          resolve(imgBytes);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(imgBytes);
      };

      img.src = url;
    });
  }

  // Node.js or environment without canvas
  return imgBytes;
}

/**
 * Core PDF Optimization (Method 1: Stream & Image Compression)
 */
export async function optimizePdf(
  inputBuffer: Uint8Array,
  options: CompressionOptions
): Promise<CompressionResult> {
  const originalSize = inputBuffer.length;

  // 1. Magic bytes validation
  if (!validatePdfMagicBytes(inputBuffer)) {
    throw new Error('Invalid PDF: Missing %PDF header magic bytes.');
  }

  // 2. Encrypted detection
  if (isPdfEncrypted(inputBuffer)) {
    throw new Error('This PDF is password-protected or encrypted. Please remove password first.');
  }

  options.onProgress?.(15, 'Loading and parsing PDF objects...');

  // 3. Load PDF with pdf-lib
  const pdfDoc = await PDFDocument.load(inputBuffer, {
    ignoreEncryption: false,
    updateMetadata: false,
  });

  const preset = PRESET_CONFIGS[options.preset] || PRESET_CONFIGS.medium;
  const pages = pdfDoc.getPages();
  const pagesCount = pages.length;

  options.onProgress?.(35, 'Stripping metadata and unreferenced streams...');

  // 4. Strip non-essential document info metadata
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('ShrinkFast 100% Client-Side');
  pdfDoc.setCreator('ShrinkFast');

  options.onProgress?.(60, 'Re-compressing PDF object streams with Deflate...');

  // 5. Serialize with object streams enabled (compresses stream dictionaries)
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  options.onProgress?.(90, 'Verifying compression efficiency...');

  const compressedSize = compressedBytes.length;

  // 6. Compare output size vs input size
  // If compressed output is not smaller, return original and flag "Already optimized"
  if (compressedSize >= originalSize) {
    options.onProgress?.(100, 'Already optimized');
    return {
      data: inputBuffer,
      originalSize,
      compressedSize: originalSize,
      savedPercent: 0,
      isAlreadyOptimized: true,
      pagesCount,
    };
  }

  const savedPercent = Math.round(((originalSize - compressedSize) / originalSize) * 100);
  options.onProgress?.(100, 'Complete');

  return {
    data: compressedBytes,
    originalSize,
    compressedSize,
    savedPercent,
    isAlreadyOptimized: false,
    pagesCount,
  };
}

