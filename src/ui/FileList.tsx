'use client';

import React from 'react';
import {
  FileText,
  Download,
  Trash2,
  Zap,
  AlertCircle,
  RefreshCw,
  ArrowRight,
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
    <div className="space-y-3 max-w-2xl mx-auto">
      {files.map((item) => (
        <div
          key={item.id}
          className="bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/60 dark:to-orange-950/40 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/60 flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {item.name}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>{formatBytes(item.size)}</span>
                  {item.compressedSize && (
                    <>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBytes(item.compressedSize)}
                      </span>
                      {item.isAlreadyOptimized ? (
                        <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                          Already optimized
                        </span>
                      ) : (
                        <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                          -{item.savedPercent}%
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {item.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => onCompressSingle(item.id)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-xs shadow-blue-500/20 transition active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Compress</span>
                </button>
              )}

              {item.status === 'completed' && (
                <button
                  type="button"
                  onClick={() => onDownloadSingle(item)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-xs shadow-emerald-500/20 transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              )}

              {item.status === 'error' && (
                <button
                  type="button"
                  onClick={() => onCompressSingle(item.id)}
                  className="flex items-center gap-1 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-xs px-2.5 py-1.5 rounded-xl border border-red-200 dark:border-red-900 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onRemoveSingle(item.id)}
                title="Remove file"
                className="text-slate-400 hover:text-red-500 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {item.status === 'compressing' && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold">
                <span>{item.stage || 'Processing in worker...'}</span>
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
            <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200/80 dark:border-rose-900/60">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{item.errorMessage || 'An error occurred during compression'}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
