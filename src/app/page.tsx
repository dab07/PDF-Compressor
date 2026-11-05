'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  FileText,
  FileCheck2,
  Upload,
  Download,
  Trash2,
  Zap,
  ShieldCheck,
  Smartphone,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderArchive,
  ArrowRight,
  ExternalLink,
  Laptop
} from 'lucide-react';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import { FileItem, CompressionLevel, CompressionStats } from '@/types/compressor';
import { compressPdf, compressDocx, formatBytes } from '@/utils/compressor';
import { useMultiTabCoordinator } from '@/hooks/useMultiTabCoordinator';

export default function CompressorPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('recommended');
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { tabId, otherActiveTabsCount } = useMultiTabCoordinator();

  // Helper to trigger confetti celebration
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.75 },
      });
    } catch {
      // Ignore if confetti fails
    }
  };

  // Handle incoming files
  const handleAddFiles = useCallback((incomingFiles: FileList | File[]) => {
    const validFiles: FileItem[] = [];
    const validExtensions = ['.pdf', '.docx', '.doc'];

    Array.from(incomingFiles).forEach((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (validExtensions.includes(ext)) {
        const type = ext === '.pdf' ? 'pdf' : (ext === '.docx' ? 'docx' : 'doc');
        validFiles.push({
          id: 'file_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
          file,
          name: file.name,
          size: file.size,
          type,
          status: 'pending',
          progress: 0,
          compressionLevel,
          tabInstanceId: tabId,
        });
      }
    });

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  }, [compressionLevel, tabId]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  // Compress a single item
  const compressSingleFile = async (id: string) => {
    const target = files.find((f) => f.id === id);
    if (!target || target.status === 'compressing') return;

    // Update status to compressing
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: 'compressing', progress: 10 } : f))
    );

    try {
      let compressedBlob: Blob;

      const onProgress = (percent: number) => {
        setFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, progress: percent } : f))
        );
      };

      if (target.type === 'pdf') {
        compressedBlob = await compressPdf(target.file, target.compressionLevel, onProgress);
      } else if (target.type === 'docx') {
        compressedBlob = await compressDocx(target.file, target.compressionLevel, onProgress);
      } else {
        // Fallback for legacy .doc
        compressedBlob = new Blob([await target.file.arrayBuffer()], { type: target.file.type });
      }

      const compressedSize = compressedBlob.size;
      const ratio = Math.max(0, Math.round(((target.size - compressedSize) / target.size) * 100));

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'completed',
                progress: 100,
                compressedBlob,
                compressedSize,
                compressionRatio: ratio,
              }
            : f
        )
      );

      triggerConfetti();
    } catch (err: any) {
      console.error('Compression error:', err);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'error',
                errorMessage: err.message || 'Failed to compress file',
              }
            : f
        )
      );
    }
  };

  // 1-Click Compress All
  const handleCompressAll = async () => {
    if (isProcessingAll) return;
    setIsProcessingAll(true);

    const pendingFiles = files.filter((f) => f.status === 'pending');

    // Process files concurrently in parallel promises
    await Promise.all(
      pendingFiles.map(async (fileItem) => {
        await compressSingleFile(fileItem.id);
      })
    );

    setIsProcessingAll(false);
  };

  // Single download
  const handleDownload = (item: FileItem) => {
    if (!item.compressedBlob) return;
    const url = URL.createObjectURL(item.compressedBlob);
    const a = document.createElement('a');
    a.href = url;
    const ext = item.name.substring(item.name.lastIndexOf('.'));
    const base = item.name.substring(0, item.name.lastIndexOf('.'));
    a.download = `${base}-compressed${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download all completed as a ZIP
  const handleDownloadAllZip = async () => {
    const completedFiles = files.filter((f) => f.status === 'completed' && f.compressedBlob);
    if (completedFiles.length === 0) return;

    const zip = new JSZip();
    completedFiles.forEach((item) => {
      if (item.compressedBlob) {
        const ext = item.name.substring(item.name.lastIndexOf('.'));
        const base = item.name.substring(0, item.name.lastIndexOf('.'));
        zip.file(`${base}-compressed${ext}`, item.compressedBlob);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shrinkfast-compressed-bundle-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Delete item
  const handleDelete = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Clear list
  const handleClearAll = () => {
    setFiles([]);
  };

  // Calculate overall stats
  const completedItems = files.filter((f) => f.status === 'completed' && f.compressedSize);
  const totalOriginal = completedItems.reduce((acc, f) => acc + f.size, 0);
  const totalCompressed = completedItems.reduce((acc, f) => acc + (f.compressedSize || f.size), 0);
  const totalSaved = Math.max(0, totalOriginal - totalCompressed);
  const overallReduction = totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0;

  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Header & Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-blue-700 bg-clip-text text-transparent">
                ShrinkFast
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60">
                PDF & DOCX
              </span>
            </div>
          </div>

          {/* Active Tabs Badge */}
          <div className="flex items-center space-x-3">
            {otherActiveTabsCount > 0 ? (
              <div
                title="Concurrent multi-tab processing active across browser windows"
                className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium animate-pulse"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>{otherActiveTabsCount} other active tab{otherActiveTabsCount > 1 ? 's' : ''} sync</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-1 text-xs text-slate-500 bg-slate-100/70 border border-slate-200 px-2.5 py-1 rounded-full">
                <Laptop className="w-3.5 h-3.5 text-slate-400 mr-1" />
                <span>Tab isolated instance</span>
              </div>
            )}

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-slate-500 hover:text-slate-800 text-xs sm:text-sm font-medium flex items-center gap-1 transition"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline">100% Private Client-Side</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Compress PDF & Word Files <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              In One Instant Click
            </span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-base md:text-lg font-normal">
            Ultra-fast, zero-cloud compression. Files never leave your browser, making it completely private, responsive, and unlimited across multiple tabs.
          </p>
        </div>

        {/* Compression Level Selector */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-2 sm:p-3 shadow-xs max-w-lg mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
          {(
            [
              { id: 'extreme', label: 'Extreme', desc: 'Max savings' },
              { id: 'recommended', label: 'Recommended', desc: 'Balanced' },
              { id: 'low', label: 'Low', desc: 'High Quality' },
            ] as const
          ).map((level) => (
            <button
              key={level.id}
              onClick={() => setCompressionLevel(level.id)}
              className={`flex-1 py-2 px-3 rounded-xl text-center transition-all ${
                compressionLevel === level.id
                  ? 'bg-blue-600 text-white font-medium shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:bg-slate-100 font-normal'
              }`}
            >
              <div className="text-xs sm:text-sm font-semibold">{level.label}</div>
              <div className={`text-[10px] sm:text-xs ${compressionLevel === level.id ? 'text-blue-100' : 'text-slate-400'}`}>
                {level.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Dropzone Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-blue-500 bg-blue-50/70 scale-[0.99] shadow-inner'
              : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/50 shadow-sm'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleAddFiles(e.target.files);
                e.target.value = ''; // Reset for re-selection
              }
            }}
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
              <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 animate-bounce duration-1000" />
            </div>

            <div className="space-y-1">
              <p className="text-lg sm:text-xl font-bold text-slate-800">
                Click to upload or drag & drop files
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                Supports Adobe PDF (<span className="font-semibold text-slate-700">.pdf</span>) and Microsoft Word (<span className="font-semibold text-slate-700">.docx, .doc</span>)
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> 100% Client-Side
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-amber-500" /> Multi-Threaded Speed
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Smartphone className="w-4 h-4 text-blue-500" /> Mobile & Tablet Ready
              </span>
            </div>
          </div>
        </div>

        {/* Global Action Bar & Overall Stats */}
        {files.length > 0 && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex -space-x-1 overflow-hidden">
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                  {files.length}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {files.length} {files.length === 1 ? 'file' : 'files'} selected
                </h3>
                <p className="text-xs text-slate-500">
                  {completedItems.length} compressed • {pendingCount} pending
                </p>
              </div>
            </div>

            {/* Savings Badge */}
            {completedItems.length > 0 && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-emerald-800 text-xs sm:text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span>Total Saved: </span>
                  <span className="text-emerald-950 font-bold">{formatBytes(totalSaved)}</span>
                  <span className="ml-1 text-emerald-600">(-{overallReduction}%)</span>
                </div>
              </div>
            )}

            {/* 1-Click Compress All / Download All */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              {pendingCount > 0 && (
                <button
                  onClick={handleCompressAll}
                  disabled={isProcessingAll}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
                >
                  {isProcessingAll ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Compressing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      1-Click Compress All
                    </>
                  )}
                </button>
              )}

              {completedItems.length > 1 && (
                <button
                  onClick={handleDownloadAllZip}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition shadow-xs active:scale-95"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span className="hidden sm:inline">Download</span> ZIP
                </button>
              )}

              <button
                onClick={handleClearAll}
                title="Clear all files"
                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Files List */}
        {files.length > 0 && (
          <div className="space-y-3">
            {files.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 ${
                        item.type === 'pdf'
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : 'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}
                    >
                      {item.type === 'pdf' ? (
                        <FileText className="w-6 h-6" />
                      ) : (
                        <FileCheck2 className="w-6 h-6" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Original: {formatBytes(item.size)}</span>
                        {item.compressedSize && (
                          <>
                            <span>→</span>
                            <span className="font-semibold text-emerald-600">
                              {formatBytes(item.compressedSize)}
                            </span>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                              -{item.compressionRatio}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for this individual file */}
                  <div className="flex items-center gap-2">
                    {item.status === 'pending' && (
                      <button
                        onClick={() => compressSingleFile(item.id)}
                        className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-blue-200/60 transition"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Compress</span>
                      </button>
                    )}

                    {item.status === 'completed' && (
                      <button
                        onClick={() => handleDownload(item)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-xs transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    )}

                    {item.status === 'error' && (
                      <button
                        onClick={() => compressSingleFile(item.id)}
                        className="flex items-center gap-1 bg-red-50 text-red-600 text-xs px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-100 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-slate-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar during compression */}
                {item.status === 'compressing' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-blue-600 font-medium">
                      <span>Compressing & optimizing streams...</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {item.status === 'error' && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{item.errorMessage || 'An error occurred during compression'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Informative Value Props / Features Grid */}
        <section className="pt-6 sm:pt-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">1-Click Instant Compression</h3>
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                Compress multiple PDFs and Word documents concurrently in parallel with a single tap. Download individually or as a clean ZIP bundle.
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Zero Server Uploads</h3>
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                All byte manipulation occurs right on your device hardware using WebAssembly and Canvas optimization. 100% GDPR and HIPAA safe.
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Multi-Tab Independent Sync</h3>
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                Open in 2, 5, or 10 separate tabs simultaneously. Each tab works independently without blocking or interfering with other windows.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 ShrinkFast • Responsive PDF & Word Compressor</p>
          <div className="flex items-center space-x-4">
            <span>Client-Side Processing</span>
            <span>•</span>
            <span>Desktop, Tablet & Mobile</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
