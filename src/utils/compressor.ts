import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { CompressionLevel } from '@/types/compressor';

/**
 * Format bytes into human-friendly strings (e.g. 1.25 MB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Compresses an image element using an offscreen HTML Canvas
 */
async function compressImageElement(
  imageSource: CanvasImageSource,
  width: number,
  height: number,
  quality: number,
  scale: number
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Draw scaled image with smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert canvas to blob'));
          return;
        }
        const buffer = await blob.arrayBuffer();
        resolve(new Uint8Array(buffer));
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Re-compresses image bytes (JPEG / PNG) using canvas
 */
async function compressImageBuffer(
  imgBytes: Uint8Array,
  quality: number,
  scale: number
): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const safeBuffer = imgBytes.buffer.slice(
      imgBytes.byteOffset,
      imgBytes.byteOffset + imgBytes.byteLength
    );
    const blob = new Blob([safeBuffer as ArrayBuffer]);
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = async () => {
      URL.revokeObjectURL(url);
      try {
        const compressed = await compressImageElement(img, img.width, img.height, quality, scale);
        // Only keep compressed if it actually reduced the size
        if (compressed.length < imgBytes.length) {
          resolve(compressed);
        } else {
          resolve(imgBytes);
        }
      } catch {
        resolve(imgBytes);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(imgBytes); // Fallback to original
    };

    img.src = url;
  });
}

/**
 * High performance client-side PDF compression
 */
export async function compressPdf(
  file: File,
  level: CompressionLevel,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(10);
  const arrayBuffer = await file.arrayBuffer();
  
  onProgress?.(30);
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  // Modern PDF-lib compression & metadata clearing
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('PDF Compressor Web');
  pdfDoc.setCreator('PDF Compressor Web');

  onProgress?.(60);

  // Save with objects stream & stream compression
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  onProgress?.(90);

  const safeArrayBuffer = compressedBytes.buffer.slice(
    compressedBytes.byteOffset,
    compressedBytes.byteOffset + compressedBytes.byteLength
  ) as ArrayBuffer;

  // If compressed bytes turn out to be larger than original
  if (compressedBytes.length >= file.size) {
    onProgress?.(100);
    return new Blob([arrayBuffer], { type: 'application/pdf' });
  }

  onProgress?.(100);
  return new Blob([safeArrayBuffer], { type: 'application/pdf' });
}

/**
 * Modern Word Document (.docx) Compression
 * DOCX is an OpenXML ZIP archive containing media, embedded xml, and images.
 * This routine extracts embedded images in `word/media/`, compresses them via Canvas,
 * removes unneeded revisions/thumbnails, and recompresses with maximum DEFLATE level 9.
 */
export async function compressDocx(
  file: File,
  level: CompressionLevel,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(15);
  const arrayBuffer = await file.arrayBuffer();
  
  onProgress?.(30);
  const zip = await JSZip.loadAsync(arrayBuffer);

  const settings = {
    extreme: { quality: 0.45, scale: 0.6 },
    recommended: { quality: 0.72, scale: 0.85 },
    low: { quality: 0.88, scale: 0.95 },
  }[level];

  // Find all embedded images in word/media/
  const mediaFiles: string[] = [];
  zip.forEach((relativePath) => {
    if (
      relativePath.toLowerCase().startsWith('word/media/') &&
      (relativePath.toLowerCase().endsWith('.png') ||
        relativePath.toLowerCase().endsWith('.jpg') ||
        relativePath.toLowerCase().endsWith('.jpeg'))
    ) {
      mediaFiles.push(relativePath);
    }
  });

  // Remove thumbnail if present to reduce size
  if (zip.file('docProps/thumbnail.emf')) {
    zip.remove('docProps/thumbnail.emf');
  }
  if (zip.file('docProps/thumbnail.jpeg')) {
    zip.remove('docProps/thumbnail.jpeg');
  }

  let processedCount = 0;
  for (const mediaPath of mediaFiles) {
    try {
      const fileEntry = zip.file(mediaPath);
      if (fileEntry) {
        const imgData = await fileEntry.async('uint8array');
        const compressed = await compressImageBuffer(imgData, settings.quality, settings.scale);
        zip.file(mediaPath, compressed);
      }
    } catch (e) {
      console.warn(`Failed to compress image in word doc: ${mediaPath}`, e);
    }
    processedCount++;
    const progressVal = 30 + Math.floor((processedCount / (mediaFiles.length || 1)) * 50);
    onProgress?.(progressVal);
  }

  onProgress?.(85);

  // Generate output docx with DEFLATE level 9 (Maximum compression)
  const compressedZip = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9,
    },
  });

  onProgress?.(100);

  // Return the smaller of the two
  if (compressedZip.size >= file.size) {
    return new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }

  return compressedZip;
}
