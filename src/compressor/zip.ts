import { zipSync } from 'fflate';

/**
 * Packs multiple files into a clean ZIP archive using fflate (100% client-side, AGPL-free)
 */
export function createZipBundle(
  files: Array<{ name: string; data: Uint8Array }>
): Blob {
  const zipData: Record<string, Uint8Array> = {};

  files.forEach((file) => {
    // Avoid filename collisions in ZIP
    let filename = file.name;
    if (zipData[filename]) {
      const ext = filename.slice(filename.lastIndexOf('.'));
      const base = filename.slice(0, filename.lastIndexOf('.'));
      filename = `${base}-${Date.now()}${ext}`;
    }
    zipData[filename] = file.data;
  });

  const zipped = zipSync(zipData, { level: 6 });
  const safeBuffer = zipped.buffer.slice(
    zipped.byteOffset,
    zipped.byteOffset + zipped.byteLength
  );
  return new Blob([safeBuffer as ArrayBuffer], { type: 'application/zip' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

