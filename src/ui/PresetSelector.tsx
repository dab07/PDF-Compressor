'use client';

import React from 'react';
import { PRESET_CONFIGS, PresetMode } from '@/compressor/types';

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
  const presets: PresetMode[] = ['low', 'medium', 'high', 'extreme'];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-xs max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
      {presets.map((mode) => {
        const item = PRESET_CONFIGS[mode];
        const isSelected = selectedPreset === mode;

        return (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPreset(mode)}
            className={`py-2 px-3 rounded-xl text-center transition-all ${
              isSelected
                ? 'bg-blue-600 text-white font-medium shadow-sm shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="text-xs sm:text-sm font-bold">{item.label.split(' ')[0]}</div>
            <div
              className={`text-[10px] sm:text-xs truncate ${
                isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {item.description.split('•')[0]}
            </div>
          </button>
        );
      })}
    </div>
  );
}

