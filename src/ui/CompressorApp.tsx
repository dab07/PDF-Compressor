'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Zap,
  FolderArchive,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Moon,
  Sun,
  Lock,
  Smartphone,
} from 'lucide-react';
import { PresetMode } from '@/compressor/types';
import { formatBytes } from '@/compressor/format';
import { createZipBundle, downloadBlob } from '@/compressor/zip';
import { Dropzone } from '@/ui/Dropzone';
import { PresetSelector } from '@/ui/PresetSelector';
import { FileList, FileEntry } from '@/ui/FileList';
import { useCompressorWorker } from '@/worker/useCompressorWorker';

interface CompressorAppProps {
  initialPreset?: PresetMode;
  targetSizeKb?: number;
  pageTitle?: string;
  pageSubtitle?: string;
}

export function CompressorApp({
  initialPreset = 'medium',
  targetSizeKb,
  pageTitle,
  pageSubtitle,
}: CompressorAppProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PresetMode>(initialPreset);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Toggle Dark Mode
  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Web Worker Callbacks
  const handleWorkerProgress = useCallback((id: string, progress: number, stage: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, progress, stage } : f))
    );
  }, []);

  const handleWorkerSuccess = useCallback(
    (
      id: string,
      result: {
        compressedBlob: Blob;
        originalSize: number;
        compressedSize: number;
        savedPercent: number;
        isAlreadyOptimized: boolean;
        pagesCount: number;
      }
    ) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'completed',
                progress: 100,
                compressedBlob: result.compressedBlob,
                compressedSize: result.compressedSize,
                savedPercent: result.savedPercent,
                isAlreadyOptimized: result.isAlreadyOptimized,
              }
            : f
        )
      );
    },
    []
  );

  const handleWorkerError = useCallback((id: string, error: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              status: 'error',
              errorMessage: error,
            }
          : f
      )
    );
  }, []);

  const { compressPdfInWorker } = useCompressorWorker({
    onProgress: handleWorkerProgress,
    onSuccess: handleWorkerSuccess,
    onError: handleWorkerError,
  });

  // Adding Files
  const handleFilesSelected = (newFiles: File[]) => {
    const entries: FileEntry[] = newFiles.map((f) => ({
      id: 'pdf_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      file: f,
      name: f.name,
      size: f.size,
      status: 'pending',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...entries].slice(0, 10)); // max 10
  };

  // Compress single
  const handleCompressSingle = (id: string) => {
    const target = files.find((f) => f.id === id);
    if (!target || target.status === 'compressing') return;

    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'compressing', progress: 5 } : f))
    );

    compressPdfInWorker(id, target.file, selectedPreset, targetSizeKb);
  };

  // 1-Click Compress All
  const handleCompressAll = async () => {
    if (isProcessingAll) return;
    setIsProcessingAll(true);

    const pending = files.filter((f) => f.status === 'pending');
    for (const item of pending) {
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'compressing', progress: 5 } : f))
      );
      await compressPdfInWorker(item.id, item.file, selectedPreset, targetSizeKb);
    }

    setIsProcessingAll(false);
  };

  // Download single
  const handleDownloadSingle = (file: FileEntry) => {
    if (!file.compressedBlob) return;
    const base = file.name.replace(/\.pdf$/i, '');
    downloadBlob(file.compressedBlob, `${base}-compressed.pdf`);
  };

  // Download All as ZIP (fflate)
  const handleDownloadAllZip = async () => {
    const completed = files.filter((f) => f.status === 'completed' && f.compressedBlob);
    if (completed.length === 0) return;

    const zipList: Array<{ name: string; data: Uint8Array }> = [];
    for (const item of completed) {
      if (item.compressedBlob) {
        const buffer = await item.compressedBlob.arrayBuffer();
        const base = item.name.replace(/\.pdf$/i, '');
        zipList.push({
          name: `${base}-compressed.pdf`,
          data: new Uint8Array(buffer),
        });
      }
    }

    const zipBlob = createZipBundle(zipList);
    downloadBlob(zipBlob, `shrinkfast-bundle-${Date.now()}.zip`);
  };

  const handleRemoveSingle = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearAll = () => {
    setFiles([]);
  };

  // Aggregate stats
  const completedItems = files.filter((f) => f.status === 'completed' && f.compressedSize);
  const totalOriginal = completedItems.reduce((acc, f) => acc + f.size, 0);
  const totalCompressed = completedItems.reduce((acc, f) => acc + (f.compressedSize || f.size), 0);
  const totalSaved = Math.max(0, totalOriginal - totalCompressed);
  const overallReduction = totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0;
  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Top Banner: Privacy Promise */}
      <div className="bg-emerald-600 text-white text-xs sm:text-sm font-semibold py-2 px-4 text-center flex items-center justify-center gap-2 shadow-inner">
        <Lock className="w-4 h-4 shrink-0" />
        <span>Your files never leave your device. 100% client-side Web Worker processing.</span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-blue-700 dark:from-white dark:to-blue-400 bg-clip-text text-transparent">
                ShrinkFast
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800">
                Static & Free
              </span>
            </div>
          </Link>

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              title="Toggle Dark Mode"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              href="/privacy/"
              className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            >
              Privacy
            </Link>
            <Link
              href="/about/"
              className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            >
              About
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            {pageTitle || (
              <>
                Compress PDF Free Online <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300">
                  100% In Your Browser
                </span>
              </>
            )}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            {pageSubtitle ||
              'No uploads. No servers. Zero wait times. Compress PDF documents safely using multi-threaded Web Workers.'}
          </p>
        </div>

        {/* Preset Selector */}
        <div className="space-y-2">
          <label className="block text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            Choose Compression Level
          </label>
          <PresetSelector
            selectedPreset={selectedPreset}
            onSelectPreset={setSelectedPreset}
            disabled={isProcessingAll}
          />
        </div>

        {/* Dropzone */}
        <Dropzone
          onFilesSelected={handleFilesSelected}
          disabled={files.length >= 10 || isProcessingAll}
        />

        {/* Batch Action Toolbar */}
        {files.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                {files.length}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {files.length} {files.length === 1 ? 'file' : 'files'} in queue
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {completedItems.length} completed • {pendingCount} pending
                </p>
              </div>
            </div>

            {completedItems.length > 0 && (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 px-3.5 py-1.5 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Total Saved: </span>
                <span className="font-bold">{formatBytes(totalSaved)}</span>
                <span className="text-emerald-600 dark:text-emerald-400">(-{overallReduction}%)</span>
              </div>
            )}

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={handleCompressAll}
                  disabled={isProcessingAll}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>1-Click Compress All</span>
                </button>
              )}

              {completedItems.length > 1 && (
                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium text-xs sm:text-sm px-4 py-2.5 rounded-xl transition shadow-xs active:scale-95"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>ZIP All</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleClearAll}
                title="Clear queue"
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Files Queue List */}
        <FileList
          files={files}
          onCompressSingle={handleCompressSingle}
          onRemoveSingle={handleRemoveSingle}
          onDownloadSingle={handleDownloadSingle}
        />

        {/* Quick Links for Target-size Pages */}
        <section className="pt-8 border-t border-slate-200/80 dark:border-slate-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center mb-4">
            Popular Target Size Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/compress-pdf-to-100kb/"
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition shadow-xs text-center space-y-1 group"
            >
              <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Compress PDF to 100KB
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Target small file size for portal submissions
              </p>
            </Link>

            <Link
              href="/compress-pdf-to-1mb/"
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition shadow-xs text-center space-y-1 group"
            >
              <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Compress PDF to 1MB
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Optimized for government and job forms
              </p>
            </Link>

            <Link
              href="/compress-pdf-for-email/"
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition shadow-xs text-center space-y-1 group"
            >
              <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Compress PDF for Email
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fits easily within 25MB attachment limits
              </p>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 ShrinkFast • 100% Client-Side PDF Compressor</p>
          <div className="flex items-center space-x-4">
            <Link href="/privacy/" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="/about/" className="hover:underline">
              About
            </Link>
            <span>•</span>
            <span>Hosted on Cloudflare Pages</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

