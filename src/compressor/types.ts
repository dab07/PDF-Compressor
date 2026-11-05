export type PresetMode = 'low' | 'medium' | 'high' | 'extreme';

export interface PresetConfig {
  name: PresetMode;
  label: string;
  description: string;
  maxDpi: number;
  quality: number;
  rasterizeAll: boolean;
}

export const PRESET_CONFIGS: Record<PresetMode, PresetConfig> = {
  low: {
    name: 'low',
    label: 'Low Compression',
    description: 'Max 300 DPI • High Quality (0.85)',
    maxDpi: 300,
    quality: 0.85,
    rasterizeAll: false,
  },
  medium: {
    name: 'medium',
    label: 'Medium (Recommended)',
    description: '150 DPI • Balanced (0.70)',
    maxDpi: 150,
    quality: 0.70,
    rasterizeAll: false,
  },
  high: {
    name: 'high',
    label: 'High Compression',
    description: '96 DPI • Smallest Size (0.50)',
    maxDpi: 96,
    quality: 0.50,
    rasterizeAll: false,
  },
  extreme: {
    name: 'extreme',
    label: 'Extreme (Rasterize)',
    description: 'Full Page Rasterization • 96 DPI',
    maxDpi: 96,
    quality: 0.45,
    rasterizeAll: true,
  },
};

export interface CompressionOptions {
  preset: PresetMode;
  targetSizeKb?: number; // Optional target size (e.g., 100KB, 1024KB)
  password?: string;
  onProgress?: (progress: number, stage: string) => void;
}

export interface CompressionResult {
  data: Uint8Array;
  originalSize: number;
  compressedSize: number;
  savedPercent: number;
  isAlreadyOptimized: boolean;
  pagesCount: number;
}

