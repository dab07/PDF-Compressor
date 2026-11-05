import Link from 'next/link';
import { ShieldCheck, Lock, Clock, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | ShrinkFast PDF Compressor',
  description: '100% Client-Side Privacy Policy. Your files never leave your computer or browser.',
};

export default function PrivacyPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200/60 dark:border-emerald-800">
            <ShieldCheck className="w-4 h-4" /> Zero Data Collection
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ShrinkFast is engineered from the ground up for strict document confidentiality.
          </p>
        </div>

        <div className="space-y-6 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-500" />
              1. Your Files Never Leave Your Device
            </h2>
            <p>
              ShrinkFast operates completely inside your web browser using HTML5 Canvas, WebAssembly, and Web Workers. When you select or drag and drop a PDF into the tool, no network requests containing your file bytes are transmitted over the internet.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              2. No Databases or Server Storage
            </h2>
            <p>
              Because this website is deployed as a static application on Cloudflare Pages, there are no backend servers, no temporary file caches, and no databases holding your confidential records.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
