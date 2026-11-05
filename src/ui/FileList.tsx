'use client';

import React from 'react';
import {
  FileText,
  Download,
  Trash2,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { formatBytes } from '@/compressor/format';

export interface FileEntry {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'compressing' | 'completed' | 'error';
  progress: number;
  stage?: string;
  compressedBlob?: Blob;
  compressedSize?: number;
  savedPercent?: number;
  isAlreadyOptimized?: boolean;
  errorMessage?: string;
}

interface FileListProps {
  files: FileEntry[];
  onCompressSingle: (id: string) => void;
  onRemoveSingle: (id: string) => void;
  onDownloadSingle: (file: FileEntry) => void;
}

export function FileList({
  files,
  onCompressSingle,
  onRemoveSingle,
  onDownloadSingle,
}: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-3">
      {files.map((item) => (
        <div
          key={item.id}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {item.name}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Original: {formatBytes(item.size)}</span>
                  {item.compressedSize && (
                    <>
                      <span>→</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatBytes(item.compressedSize)}
                      </span>
                      {item.isAlreadyOptimized ? (
                        <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] px-1.5 py-0.5 rounded-md font-semibold">
                          Already optimized
                        </span>
                      ) : (
                        <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                          -{item.savedPercent}%
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {item.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => onCompressSingle(item.id)}
                  className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-blue-200/60 dark:border-blue-800 transition"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Compress</span>
                </button>
              )}

              {item.status === 'completed' && (
                <button
                  type="button"
                  onClick={() => onDownloadSingle(item)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-xs transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              )}

              {item.status === 'error' && (
                <button
                  type="button"
                  onClick={() => onCompressSingle(item.id)}
                  className="flex items-center gap-1 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-xs px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onRemoveSingle(item.id)}
                title="Remove file"
                className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {item.status === 'compressing' && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 font-medium">
                <span>{item.stage || 'Compressing inside Web Worker...'}</span>
                <span>{item.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          )}

          {item.status === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{item.errorMessage || 'An error occurred during compression'}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
