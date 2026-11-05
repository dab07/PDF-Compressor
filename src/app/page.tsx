import type { Metadata } from 'next';
import { ClientCompressor } from '@/ui/ClientCompressor';

export const metadata: Metadata = {
  title: 'Free PDF Compressor Online – 100% Private, No Uploads | ShrinkFast',
  description:
    'Compress PDF files directly in your browser. No server uploads, no data collection. Fast, private, and free on mobile and desktop.',
  openGraph: {
    title: 'ShrinkFast – Free PDF Compressor Online',
    description: 'Compress PDFs 100% in your browser. No uploads, no servers, completely private.',
    type: 'website',
  },
};

export default function HomePage() {
  return <ClientCompressor initialPreset="medium" />;
}
