// Core data model types for Cross-Stitch Pattern Game

export interface PaletteEntry {
  paletteIndex: number;
  paletteId: string;
  name: string;
  brand?: string;
  code?: string;
  hex: string;
  symbol: string;
  totalTargets: number;
}

export interface PatternMeta {
  title?: string;
  author?: string;
  copyright?: string;
  instructions?: string;
  stitchesPerInch?: number;
}

export interface PatternDoc {
  id: string;
  width: number;
  height: number;
  palette: PaletteEntry[];
  targets: Uint16Array;
  meta: PatternMeta;
}

export const NO_STITCH = 0xffff;

export enum StitchState {
  None = 0,
  Correct = 1,
  Wrong = 2,
}

export interface PaletteCounts {
  remainingTargets: number;
  wrongCount: number;
  correctCount: number;
}

export interface ViewportTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface UserProgress {
  patternId: string;
  stitchedState: Uint8Array;
  placedColors: Uint16Array; // Which palette index was actually placed (NO_STITCH if none)
  paletteCounts: PaletteCounts[];
  lastSelectedPaletteIndex: number | null;
  viewport: ViewportTransform;
}

export type ToolMode = 'stitch' | 'picker' | 'fill';

export interface Point {
  x: number;
  y: number;
}

export interface GridCell {
  col: number;
  row: number;
}

export interface CompletedPattern {
  id: string; // Unique ID for the completed pattern record
  patternId: string; // Original pattern ID (may no longer exist)
  title: string; // Pattern title
  width: number;
  height: number;
  snapshotDataUrl: string; // Full resolution JPEG as data URL
  thumbnailDataUrl: string; // Small preview thumbnail
  completedAt: number; // Epoch milliseconds
  syncedToRemote: boolean; // Whether it's been uploaded to Supabase
}
