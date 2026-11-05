import { CompressorApp } from '@/ui/CompressorApp';

export const metadata = {
  title: 'Compress PDF to 100KB Online – Free & 100% Client-Side',
  description:
    'Reduce PDF file size to 100KB or less right in your browser. Perfect for application portals and document uploads.',
};

export default function CompressTo100KbPage() {
  return (
    <CompressorApp
      initialPreset="high"
      targetSizeKb={100}
      pageTitle="Compress PDF to 100KB"
      pageSubtitle="Target compact document size under 100KB without uploading your files to any external server."
    />
  );
}
