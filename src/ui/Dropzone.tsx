'use client';

import React, { useRef, useState } from 'react';
import { Upload, ShieldCheck, Zap, AlertCircle } from 'lucide-react';
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
      // 1. Platform size validation (100MB desktop / 30MB mobile)
      const sizeCheck = validatePdfFile(file);
      if (!sizeCheck.valid) {
        setValidationError(sizeCheck.error || 'File exceeded size limit.');
        continue;
      }

      // 2. Validate %PDF magic bytes
      const headerSlice = await file.slice(0, 5).arrayBuffer();
      if (!validatePdfMagicBytes(new Uint8Array(headerSlice))) {
        setValidationError(`"${file.name}" is not a valid PDF document (invalid magic bytes).`);
        continue;
      }

      validPdfs.push(file);
    }

    if (validPdfs.length > 0) {
      // Limit to 10 files per batch
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
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 scale-[0.99] shadow-inner'
            : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 shadow-xs'
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
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/40 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Upload className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce duration-1000" />
          </div>

          <div className="space-y-1">
            <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
              Drop PDFs here, or <span className="text-blue-600 dark:text-blue-400 underline underline-offset-4">browse</span>
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Batch up to 10 files • 100 MB max per file (30 MB on mobile)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> 100% Client-Side
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Zap className="w-4 h-4 text-amber-500" /> Dedicated Web Worker
            </span>
          </div>
        </div>
      </div>

      {validationError && (
        <div className="flex items-center gap-2 p-3 text-xs sm:text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}

