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

export const NO_STITCH = 0xFFFF;

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
  paletteCounts: PaletteCounts[];
  lastSelectedPaletteIndex: number | null;
  viewport: ViewportTransform;
}

export type ToolMode = 'stitch' | 'picker';

export interface Point {
  x: number;
  y: number;
}

export interface GridCell {
  col: number;
  row: number;
}
