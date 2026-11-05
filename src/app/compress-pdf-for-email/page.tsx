import { CompressorApp } from '@/ui/CompressorApp';

export const metadata = {
  title: 'Compress PDF for Email Attachment – Free & Fast',
  description:
    'Optimize and downscale PDFs to comfortably fit standard 20MB and 25MB email attachment limits in one click.',
};

export default function CompressForEmailPage() {
  return (
    <CompressorApp
      initialPreset="low"
      pageTitle="Compress PDF for Email"
      pageSubtitle="Shrink heavy PDFs to easily attach to Gmail, Outlook, and Apple Mail without getting bounced."
    />
  );
}

