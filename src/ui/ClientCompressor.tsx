'use client';

import dynamic from 'next/dynamic';
import type { PresetMode } from '@/compressor/types';

// Web Worker APIs don't exist in Node.js — disable SSR for the whole compressor shell.
const CompressorApp = dynamic(
  () => import('./CompressorApp').then((m) => m.CompressorApp),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium animate-pulse">
          Loading ShrinkFast…
        </p>
      </div>
    ),
  }
);

interface ClientCompressorProps {
  initialPreset?: PresetMode;
  targetSizeKb?: number;
  pageTitle?: string;
  pageSubtitle?: string;
}

export function ClientCompressor(props: ClientCompressorProps) {
  return <CompressorApp {...props} />;
}

