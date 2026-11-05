import { PDFDocument, rgb } from 'pdf-lib';

/**
 * Creates a sample standard text PDF
 */
export async function createNormalSamplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);
  page.drawText('Sample Standard PDF for Testing Compression', {
    x: 50,
    y: 350,
    size: 20,
    color: rgb(0.1, 0.1, 0.1),
  });
  doc.setTitle('Detailed Metadata That Should Be Stripped');
  doc.setAuthor('Test Author');
  doc.setKeywords(['test', 'uncompressed', 'metadata']);
  return await doc.save({ useObjectStreams: false });
}

/**
 * Creates an already compressed sample PDF
 */
export async function createAlreadyCompressedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  return await doc.save({ useObjectStreams: true });
}

/**
 * Creates an encrypted sample PDF
 */
export function createEncryptedSamplePdf(): Uint8Array {
  // Synthesize a valid PDF header containing /Encrypt dictionary
  const raw = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>
endobj
4 0 obj
<< /Filter /Standard /V 2 /R 3 /O (fake) /U (fake) /P -4 >>
endobj
trailer
<< /Root 1 0 R /Encrypt 4 0 R >>
%%EOF`;
  return new TextEncoder().encode(raw);
}

