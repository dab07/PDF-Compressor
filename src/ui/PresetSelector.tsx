'use client';

import React from 'react';
import { PRESET_CONFIGS, PresetMode } from '@/compressor/types';
import { ShieldCheck, Sparkles, Feather, FileText } from 'lucide-react';

interface PresetSelectorProps {
  selectedPreset: PresetMode;
  onSelectPreset: (preset: PresetMode) => void;
  disabled?: boolean;
}

export function PresetSelector({
  selectedPreset,
  onSelectPreset,
  disabled,
}: PresetSelectorProps) {
  const presets: { id: PresetMode; icon: any; tag: string }[] = [
    { id: 'low', icon: ShieldCheck, tag: '300 DPI' },
    { id: 'medium', icon: Sparkles, tag: '150 DPI' },
    { id: 'high', icon: Feather, tag: '96 DPI' },
    { id: 'extreme', icon: FileText, tag: 'Rasterize' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl mx-auto">
      {presets.map(({ id, icon: Icon, tag }) => {
        const item = PRESET_CONFIGS[id];
        const isSelected = selectedPreset === id;

        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPreset(id)}
            className={`group relative p-3.5 rounded-2xl border text-left transition-all duration-200 ${
              isSelected
                ? 'bg-blue-600/95 dark:bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]'
                : 'bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`p-1.5 rounded-xl ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {tag}
              </span>
            </div>

            <div className="text-xs sm:text-sm font-bold tracking-tight">
              {item.label.split(' ')[0]}
            </div>
            <div
              className={`text-[11px] truncate mt-0.5 ${
                isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {id === 'medium'
                ? 'Recommended'
                : id === 'low'
                ? 'High Quality'
                : id === 'high'
                ? 'Smallest Size'
                : 'Scanned Fix'}
            </div>
          </button>
        );
      })}
    </div>
  );
}
