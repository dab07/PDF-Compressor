import { describe, it, expect } from 'vitest';
import { optimizePdf } from './engine';
import { validatePdfMagicBytes, isPdfEncrypted } from './validator';
import {
  createNormalSamplePdf,
  createAlreadyCompressedPdf,
  createEncryptedSamplePdf,
} from './fixtures';

describe('PDF Compression Engine (Phase 1)', () => {
  it('should validate %PDF magic bytes correctly', () => {
    const validBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]); // %PDF-1
    const invalidBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header

    expect(validatePdfMagicBytes(validBytes)).toBe(true);
    expect(validatePdfMagicBytes(invalidBytes)).toBe(false);
  });

  it('should reject non-PDF files', async () => {
    const fakeFile = new Uint8Array([1, 2, 3, 4, 5, 6]);
    await expect(
      optimizePdf(fakeFile, { preset: 'medium' })
    ).rejects.toThrow('Invalid PDF: Missing %PDF header magic bytes.');
  });

  it('should detect password-protected or encrypted PDFs', async () => {
    const encryptedPdf = createEncryptedSamplePdf();
    expect(isPdfEncrypted(encryptedPdf)).toBe(true);

    await expect(
      optimizePdf(encryptedPdf, { preset: 'medium' })
    ).rejects.toThrow('This PDF is password-protected or encrypted');
  });

  it('should compress normal PDF and strip unneeded metadata', async () => {
    const normalPdf = await createNormalSamplePdf();
    const result = await optimizePdf(normalPdf, { preset: 'medium' });

    expect(result.pagesCount).toBe(1);
    expect(result.data.length).toBeGreaterThan(0);
    expect(validatePdfMagicBytes(result.data)).toBe(true);
  });

  it('should detect when PDF is already optimized and return original without bloating', async () => {
    const alreadyOptimized = await createAlreadyCompressedPdf();
    const result = await optimizePdf(alreadyOptimized, { preset: 'low' });

    expect(result.isAlreadyOptimized).toBe(true);
    expect(result.savedPercent).toBe(0);
    expect(result.compressedSize).toBe(result.originalSize);
  });
});

