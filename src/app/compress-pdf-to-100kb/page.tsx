import type { Metadata } from 'next';
import { ClientCompressor } from '@/ui/ClientCompressor';

export const metadata: Metadata = {
  title: 'Compress PDF to 100KB Online – Free & Private | ShrinkFast',
  description: 'Reduce PDF file size to 100KB or less right in your browser. Perfect for portals, visa applications, and document uploads.',
};

export default function CompressTo100KbPage() {
  return (
    <ClientCompressor
      initialPreset="high"
      targetSizeKb={100}
      pageTitle="Compress PDF to 100KB"
      pageSubtitle="Shrink your PDF to under 100KB without uploading it to any server."
    />
  );
}
