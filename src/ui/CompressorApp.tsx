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
  ArrowRight,
  Gauge,
  Smartphone,
  SlidersHorizontal,
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

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

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

  const handleFilesSelected = (newFiles: File[]) => {
    const entries: FileEntry[] = newFiles.map((f) => ({
      id: 'pdf_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      file: f,
      name: f.name,
      size: f.size,
      status: 'pending',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...entries].slice(0, 10));
  };

  const handleCompressSingle = (id: string) => {
    const target = files.find((f) => f.id === id);
    if (!target || target.status === 'compressing') return;

    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'compressing', progress: 5 } : f))
    );

    compressPdfInWorker(id, target.file, selectedPreset, targetSizeKb);
  };

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

  const handleDownloadSingle = (file: FileEntry) => {
    if (!file.compressedBlob) return;
    const base = file.name.replace(/\.pdf$/i, '');
    downloadBlob(file.compressedBlob, `${base}-compressed.pdf`);
  };

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
    downloadBlob(zipBlob, `shrinkfast-compressed-${Date.now()}.zip`);
  };

  const handleRemoveSingle = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearAll = () => {
    setFiles([]);
  };

  const completedItems = files.filter((f) => f.status === 'completed' && f.compressedSize);
  const totalOriginal = completedItems.reduce((acc, f) => acc + f.size, 0);
  const totalCompressed = completedItems.reduce((acc, f) => acc + (f.compressedSize || f.size), 0);
  const totalSaved = Math.max(0, totalOriginal - totalCompressed);
  const overallReduction = totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0;
  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Top Banner */}
      <aside aria-label="Privacy Notice" className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2 shadow-xs">
        <Lock className="w-3.5 h-3.5 shrink-0" />
        <span>100% Private Client-Side. Your documents are never uploaded to any server.</span>
      </aside>

      {/* Modern Floating Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-all">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-slate-900 to-blue-700 dark:from-white dark:to-blue-400 bg-clip-text text-transparent">
              ShrinkFast
            </span>
          </Link>

          <nav className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              href="/privacy/"
              className="text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
            >
              Privacy
            </Link>
            <Link
              href="/about/"
              className="text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
            >
              About
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero & Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-7">
        {/* Hero Section */}
        <div className="text-center space-y-2.5 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200/60 dark:border-blue-900/60 mb-1">
            <Gauge className="w-3.5 h-3.5" /> High Speed In-Browser Compression
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {pageTitle || (
              <>
                Compress PDF Files <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300">
                  Easier In One Click
                </span>
              </>
            )}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base font-normal">
            {pageSubtitle ||
              'Lightweight, fast, and completely private. Shrink heavy PDFs without quality loss right on your device.'}
          </p>
        </div>

        {/* Compression Preset Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Select Compression Profile</span>
          </div>
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

        {/* Action Bar when files are staged */}
        {files.length > 0 && (
          <div className="bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-200/60 dark:border-blue-800">
                {files.length}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {files.length} {files.length === 1 ? 'file' : 'files'} selected
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {completedItems.length} completed • {pendingCount} pending
                </p>
              </div>
            </div>

            {completedItems.length > 0 && (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900 px-3 py-1.5 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Saved: </span>
                <span className="font-bold">{formatBytes(totalSaved)}</span>
                <span className="text-emerald-600 dark:text-emerald-400">(-{overallReduction}%)</span>
              </div>
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={handleCompressAll}
                  disabled={isProcessingAll}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>1-Click Compress</span>
                </button>
              )}

              {completedItems.length > 1 && (
                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium text-xs sm:text-sm px-3.5 py-2.5 rounded-xl transition shadow-xs active:scale-95"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span>ZIP All</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleClearAll}
                title="Clear all"
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Files Queue */}
        <FileList
          files={files}
          onCompressSingle={handleCompressSingle}
          onRemoveSingle={handleRemoveSingle}
          onDownloadSingle={handleDownloadSingle}
        />

        {/* Informational SEO Target Size Cards */}
        <section className="pt-8 border-t border-slate-200/80 dark:border-slate-800/80 max-w-2xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/compress-pdf-to-100kb/"
              className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition shadow-xs text-center space-y-1 group"
            >
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                To 100KB Target
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                For portal & form limits
              </p>
            </Link>

            <Link
              href="/compress-pdf-to-1mb/"
              className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition shadow-xs text-center space-y-1 group"
            >
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                To 1MB Target
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Standard job application size
              </p>
            </Link>

            <Link
              href="/compress-pdf-for-email/"
              className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition shadow-xs text-center space-y-1 group"
            >
              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                For Email Attachments
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Fits 20MB & 25MB mailboxes
              </p>
            </Link>
          </div>
        </section>
      </main>

      {/* Clean Modern Footer */}
      <footer className="bg-white/80 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800/80 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 ShrinkFast • 100% Client-Side PDF Compressor</p>
          <div className="flex items-center space-x-4">
            <Link href="/privacy/" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="/about/" className="hover:underline">
              About
            </Link>
            <span>•</span>
            <span>Cloudflare Pages</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
