'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, ShieldCheck, Zap, AlertCircle, FilePlus2 } from 'lucide-react';
import { validatePdfFile, validatePdfMagicBytes } from '@/compressor/validator';

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function Dropzone({ onFilesSelected, disabled }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (fileList: FileList | File[]) => {
    setValidationError(null);
    const files = Array.from(fileList);
    const validPdfs: File[] = [];

    for (const file of files) {
      const sizeCheck = validatePdfFile(file);
      if (!sizeCheck.valid) {
        setValidationError(sizeCheck.error || 'File exceeded size limit.');
        continue;
      }

      const headerSlice = await file.slice(0, 5).arrayBuffer();
      if (!validatePdfMagicBytes(new Uint8Array(headerSlice))) {
        setValidationError(`"${file.name}" is not a valid PDF document.`);
        continue;
      }

      validPdfs.push(file);
    }

    if (validPdfs.length > 0) {
      onFilesSelected(validPdfs.slice(0, 10));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || !e.dataTransfer.files) return;
    await processFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`group relative border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 scale-[0.99] shadow-inner ring-4 ring-blue-500/10'
            : 'border-slate-300/80 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-400 bg-white/90 dark:bg-slate-900/80 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 shadow-sm hover:shadow-md'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files) {
              processFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-blue-50/80 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-300" />
          </div>

          <div className="space-y-1.5">
            <p className="text-lg sm:text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Drag & drop PDFs, or <span className="text-blue-600 dark:text-blue-400 underline underline-offset-4 decoration-2 decoration-blue-500/40 group-hover:decoration-blue-500">browse</span>
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal">
              Batch up to 10 files • Max 100 MB per file (30 MB on mobile)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-400 dark:text-slate-500">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-200/50 dark:border-emerald-900/50">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Private (Device Only)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Background Worker
            </span>
          </div>
        </div>
      </div>

      {validationError && (
        <div className="flex items-center gap-2 p-3.5 text-xs sm:text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}
