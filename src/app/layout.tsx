import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ShrinkFast – Free PDF Compressor Online (100% Private)',
  description:
    'Compress PDF files directly in your browser with zero uploads. Fast, private, and free. Works on mobile, tablet, and desktop.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
