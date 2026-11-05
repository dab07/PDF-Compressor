export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export const MAX_DESKTOP_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_MOBILE_BYTES = 30 * 1024 * 1024;   // 30 MB

/**
 * Validates %PDF magic bytes (first 5 bytes of the file)
 */
export function validatePdfMagicBytes(buffer: Uint8Array): boolean {
  if (buffer.length < 5) return false;
  // %PDF- in ASCII is [0x25, 0x50, 0x44, 0x46, 0x2D]
  return (
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46    // F
  );
}

/**
 * Validates PDF file bounds against platform limits
 */
export function validatePdfFile(file: File): { valid: boolean; error?: string } {
  const isMobile = isMobileDevice();
  const maxLimit = isMobile ? MAX_MOBILE_BYTES : MAX_DESKTOP_BYTES;
  const limitLabel = isMobile ? '30 MB (mobile limit)' : '100 MB';

  if (file.size > maxLimit) {
    return {
      valid: false,
      error: `File exceeds maximum allowed size of ${limitLabel}.`,
    };
  }

  return { valid: true };
}

/**
 * Checks if a PDF buffer has encryption dictionary
 */
export function isPdfEncrypted(buffer: Uint8Array): boolean {
  // Simple fast ASCII check for /Encrypt dictionary
  const headerSlice = buffer.subarray(0, Math.min(buffer.length, 100000));
  const text = new TextDecoder('latin1').decode(headerSlice);
  if (text.includes('/Encrypt')) return true;

  const tailSlice = buffer.subarray(Math.max(0, buffer.length - 10000));
  const tailText = new TextDecoder('latin1').decode(tailSlice);
  return tailText.includes('/Encrypt');
}

