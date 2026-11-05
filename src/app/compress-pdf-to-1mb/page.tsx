import { CompressorApp } from '@/ui/CompressorApp';

export const metadata = {
  title: 'Compress PDF to 1MB Online – Instant & Private',
  description:
    'Reduce PDF file size to under 1MB quickly and privately. Meets standard job board and government upload limits.',
};

export default function CompressTo1MbPage() {
  return (
    <CompressorApp
      initialPreset="medium"
      targetSizeKb={1024}
      pageTitle="Compress PDF to 1MB"
      pageSubtitle="Compress documents to under 1MB with clean vector clarity and balanced downsampling."
    />
  );
}

