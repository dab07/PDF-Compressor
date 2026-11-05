import { CompressorApp } from '@/ui/CompressorApp';

export const metadata = {
  title: 'Free PDF Compressor Online – 100% Client-Side & Private',
  description:
    'Compress PDF documents directly in your browser. No file uploads, no server storage, zero data collection. Fast and private.',
};

export default function HomePage() {
  return <CompressorApp initialPreset="medium" />;
}
