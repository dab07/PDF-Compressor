import type { Metadata } from 'next';
import { ClientCompressor } from '@/ui/ClientCompressor';

export const metadata: Metadata = {
  title: 'Compress PDF to 1MB Online – Free & Private | ShrinkFast',
  description: 'Reduce your PDF to under 1MB instantly in the browser. No uploads, no server. Perfect for job applications and government forms.',
};

export default function CompressTo1MbPage() {
  return (
    <ClientCompressor
      initialPreset="medium"
      targetSizeKb={1024}
      pageTitle="Compress PDF to 1MB"
      pageSubtitle="Target 1MB or less. Great for job boards, HR portals, and government uploads."
    />
  );
}
