/**
 * Types and interfaces for the PDF & Word Compressor
 */

export type CompressionLevel = 'extreme' | 'recommended' | 'low';

export type FileType = 'pdf' | 'docx' | 'doc';

export interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: FileType;
  status: 'pending' | 'compressing' | 'completed' | 'error';
  progress: number;
  compressedBlob?: Blob;
  compressedSize?: number;
  compressionRatio?: number;
  errorMessage?: string;
  compressionLevel: CompressionLevel;
  tabInstanceId: string;
}

export interface CompressionStats {
  originalTotalSize: number;
  compressedTotalSize: number;
  totalSaved: number;
  percentReduction: number;
  totalFiles: number;
}

