import Link from 'next/link';
import { ShieldCheck, Cpu, Layers, Lock, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'About ShrinkFast | 100% Client-Side PDF Compressor',
  description:
    'Learn about ShrinkFast architecture, how Web Workers and Canvas compress PDFs without servers, and our zero-retention pledge.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8 bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Compressor
        </Link>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200/60 dark:border-blue-800">
            <Cpu className="w-4 h-4" /> Browser-Powered Technology
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            About ShrinkFast
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            A high-performance, zero-upload PDF compressor built for modern privacy standards.
          </p>
        </div>

        <div className="space-y-6 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-500" />
              100% Client-Side & Private
            </h2>
            <p>
              Unlike traditional PDF tools that upload your private documents, invoices, or contracts to third-party cloud servers, ShrinkFast processes everything strictly inside your web browser. Your files never leave your device.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              Multi-Threaded Web Workers
            </h2>
            <p>
              By delegating document reconstruction and stream deflate compression to dedicated background Web Workers, the browser interface stays smooth and responsive without freezing even when compressing multi-page files.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
              AGPL-Free Architecture
            </h2>
            <p>
              ShrinkFast is intentionally engineered with clean, permissively licensed libraries (pdf-lib, pdfjs-dist, and fflate), avoiding AGPL-licensed tools like Ghostscript or MuPDF.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

