import type { Metadata } from 'next';
import { ClientCompressor } from '@/ui/ClientCompressor';

export const metadata: Metadata = {
  title: 'Compress PDF for Email Attachments – Free & Private | ShrinkFast',
  description: 'Make PDFs small enough for Gmail, Outlook, and Apple Mail attachments (25MB limit). No uploads needed.',
};

export default function CompressForEmailPage() {
  return (
    <ClientCompressor
      initialPreset="low"
      pageTitle="Compress PDF for Email"
      pageSubtitle="Shrink PDFs to fit Gmail, Outlook, and Apple Mail's 25MB attachment limits."
    />
  );
}
