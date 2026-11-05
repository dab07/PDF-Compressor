import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configure pdfjs worker
if (typeof window !== 'undefined' || typeof self !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface CompressionSettings {
  maxDpi: number;
  quality: number;
  scale: number;
  rasterizeAll: boolean;
}

export const PRESET_TUNING: Record<string, CompressionSettings> = {
  low: { maxDpi: 300, quality: 0.80, scale: 0.9, rasterizeAll: false },
  medium: { maxDpi: 150, quality: 0.60, scale: 0.75, rasterizeAll: false },
  high: { maxDpi: 96, quality: 0.40, scale: 0.55, rasterizeAll: false },
  extreme: { maxDpi: 96, quality: 0.35, scale: 0.50, rasterizeAll: true },
};

/**
 * Recompresses an image bitmap to lossy JPEG using OffscreenCanvas or Canvas
 */
export async function reencodeImageBuffer(
  rawBytes: Uint8Array,
  quality: number,
  maxDimension: number
): Promise<Uint8Array | null> {
  try {
    if (typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined') {
      const blob = new Blob([rawBytes as any]);
      const bitmap = await createImageBitmap(blob);

      let width = bitmap.width;
      let height = bitmap.height;

      // Downscale if higher resolution than target max dimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.max(1, Math.round((height * maxDimension) / width));
          width = maxDimension;
        } else {
          width = Math.max(1, Math.round((width * maxDimension) / height));
          height = maxDimension;
        }
      }

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();

      const compressedBlob = await canvas.convertToBlob({
        type: 'image/jpeg',
        quality: Math.max(0.1, Math.min(quality, 0.95)),
      });

      const buffer = await compressedBlob.arrayBuffer();
      const result = new Uint8Array(buffer);
      if (result.length < rawBytes.length) {
        return result;
      }
    }
  } catch {
    // Keep original on fallback
  }
  return null;
}

/**
 * Deep embedded image compression: Iterates through PDF XObject dictionary,
 * finds heavy DCTDecode/FlateDecode images, downsamples & re-encodes them to compressed JPEG.
 */
export async function compressEmbeddedImages(
  pdfDoc: PDFDocument,
  settings: CompressionSettings,
  onProgress?: (progress: number) => void
): Promise<number> {
  let imagesReplaced = 0;
  const context = pdfDoc.context;
  const enumerated = context.enumerateIndirectObjects();
  const total = enumerated.length;

  const targetMaxDim = settings.maxDpi <= 96 ? 1200 : settings.maxDpi <= 150 ? 1800 : 2500;

  let index = 0;
  for (const [ref, obj] of enumerated) {
    index++;
    if (index % 10 === 0) {
      onProgress?.(30 + Math.floor((index / total) * 45));
    }

    if (obj instanceof PDFRawStream) {
      const dict = obj.dict;
      const subtype = dict.get(PDFName.of('Subtype'));
      if (subtype === PDFName.of('Image')) {
        const filter = dict.get(PDFName.of('Filter'));
        const filterName = filter?.toString();

        if (filterName === '/DCTDecode' || filterName === '/FlateDecode') {
          const rawBytes = obj.contents;
          if (rawBytes.length > 15 * 1024) {
            const compressedBytes = await reencodeImageBuffer(
              rawBytes,
              settings.quality,
              targetMaxDim
            );

            if (compressedBytes && compressedBytes.length < rawBytes.length) {
              dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
              dict.set(PDFName.of('Length'), context.obj(compressedBytes.length));
              // Use PDFRawStream.of static factory method
              const newStream = PDFRawStream.of(dict, compressedBytes);
              context.assign(ref, newStream);
              imagesReplaced++;
            }
          }
        }
      }
    }
  }

  return imagesReplaced;
}

/**
 * Extreme rasterization compression via pdf.js:
 * Renders pages onto high/medium resolution canvases and rebuilds a lean, clean PDF.
 */
export async function rasterizePdf(
  inputBuffer: Uint8Array,
  settings: CompressionSettings,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  const loadingTask = pdfjsLib.getDocument({
    data: inputBuffer,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const newPdfDoc = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    onProgress?.(25 + Math.floor((i / numPages) * 60));
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: settings.scale });

    let canvas: any;
    let ctx: any;

    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(Math.round(viewport.width), Math.round(viewport.height));
      ctx = canvas.getContext('2d');
    } else {
      canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      ctx = canvas.getContext('2d');
    }

    if (!ctx) continue;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext: any = {
      canvasContext: ctx,
      viewport,
      canvas: canvas,
    };

    await page.render(renderContext).promise;

    let imgBytes: Uint8Array;
    if ('convertToBlob' in canvas) {
      const blob = await (canvas as OffscreenCanvas).convertToBlob({
        type: 'image/jpeg',
        quality: settings.quality,
      });
      imgBytes = new Uint8Array(await blob.arrayBuffer());
    } else {
      const blob = await new Promise<Blob | null>((resolve) =>
        (canvas as HTMLCanvasElement).toBlob(resolve, 'image/jpeg', settings.quality)
      );
      if (!blob) continue;
      imgBytes = new Uint8Array(await blob.arrayBuffer());
    }

    const embeddedImage = await newPdfDoc.embedJpg(imgBytes);
    const newPage = newPdfDoc.addPage([viewport.width / settings.scale, viewport.height / settings.scale]);
    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: newPage.getWidth(),
      height: newPage.getHeight(),
    });
  }

  return await newPdfDoc.save({ useObjectStreams: true });
}
