import { create } from 'zustand';
import type {
  PatternDoc,
  UserProgress,
  ToolMode,
  ViewportTransform,
  PaletteCounts,
  GridCell,
} from '../types';
import { StitchState, NO_STITCH } from '../types';
import { saveProgress, loadProgress } from './persistence';

interface GameState {
  // Pattern data
  pattern: PatternDoc | null;
  progress: UserProgress | null;

  // UI state
  selectedPaletteIndex: number | null;
  toolMode: ToolMode;
  viewport: ViewportTransform;
  isComplete: boolean;
  showCelebration: boolean;

  // Actions
  loadPattern: (pattern: PatternDoc) => Promise<void>;
  selectPalette: (index: number) => void;
  setToolMode: (mode: ToolMode) => void;
  placeStitch: (col: number, row: number) => void;
  floodFillStitch: (col: number, row: number) => void;
  removeWrongStitch: (col: number, row: number) => void;
  setViewport: (viewport: ViewportTransform) => void;
  closeCelebration: () => void;
  reset: () => void;

  // Computed helpers
  getTotalWrongCount: () => number;
  getRemainingForPalette: (index: number) => number;
  getStitchState: (col: number, row: number) => StitchState;
  getTargetPaletteIndex: (col: number, row: number) => number;
  findNearestUnstitched: (paletteIndex: number, viewportCenterCol: number, viewportCenterRow: number) => GridCell | null;
}

function createInitialProgress(pattern: PatternDoc): UserProgress {
  const size = pattern.width * pattern.height;
  const stitchedState = new Uint8Array(size);
  const placedColors = new Uint16Array(size);
  placedColors.fill(NO_STITCH); // Initialize all to NO_STITCH

  const paletteCounts: PaletteCounts[] = pattern.palette.map(p => ({
    remainingTargets: p.totalTargets,
    wrongCount: 0,
    correctCount: 0,
  }));

  return {
    patternId: pattern.id,
    stitchedState,
    placedColors,
    paletteCounts,
    lastSelectedPaletteIndex: null,
    viewport: { scale: 1, translateX: 0, translateY: 0 },
  };
}

function checkCompletion(_pattern: PatternDoc, paletteCounts: PaletteCounts[]): boolean {
  return paletteCounts.every(pc => pc.remainingTargets === 0);
}

export const useGameStore = create<GameState>((set, get) => ({
  pattern: null,
  progress: null,
  selectedPaletteIndex: null,
  toolMode: 'stitch',
  viewport: { scale: 1, translateX: 0, translateY: 0 },
  isComplete: false,
  showCelebration: false,

  loadPattern: async (pattern: PatternDoc) => {
    // Try to load existing progress
    const existingProgress = await loadProgress(pattern.id);

    if (existingProgress && existingProgress.stitchedState.length === pattern.width * pattern.height) {
      set({
        pattern,
        progress: existingProgress,
        selectedPaletteIndex: existingProgress.lastSelectedPaletteIndex,
        viewport: existingProgress.viewport,
        isComplete: checkCompletion(pattern, existingProgress.paletteCounts),
        showCelebration: false,
        toolMode: 'stitch',
      });
    } else {
      const newProgress = createInitialProgress(pattern);
      set({
        pattern,
        progress: newProgress,
        selectedPaletteIndex: null,
        viewport: { scale: 1, translateX: 0, translateY: 0 },
        isComplete: false,
        showCelebration: false,
        toolMode: 'stitch',
      });
    }
  },

  selectPalette: (index: number) => {
    const { progress } = get();
    if (progress) {
      const updatedProgress = {
        ...progress,
        lastSelectedPaletteIndex: index,
      };
      set({
        selectedPaletteIndex: index,
        toolMode: 'stitch',
        progress: updatedProgress,
      });
      saveProgress(updatedProgress);
    } else {
      set({ selectedPaletteIndex: index, toolMode: 'stitch' });
    }
  },

  setToolMode: (mode: ToolMode) => {
    set({ toolMode: mode });
  },

  placeStitch: (col: number, row: number) => {
    const { pattern, progress, selectedPaletteIndex } = get();
    if (!pattern || !progress || selectedPaletteIndex === null) return;

    const cellIndex = row * pattern.width + col;
    if (cellIndex < 0 || cellIndex >= progress.stitchedState.length) return;

    // Don't overwrite existing stitches
    if (progress.stitchedState[cellIndex] !== StitchState.None) return;

    const targetIndex = pattern.targets[cellIndex];
    if (targetIndex === NO_STITCH) return; // Can't stitch empty cells

    const isCorrect = targetIndex === selectedPaletteIndex;
    const newState = isCorrect ? StitchState.Correct : StitchState.Wrong;

    const newStitchedState = new Uint8Array(progress.stitchedState);
    newStitchedState[cellIndex] = newState;

    // Track the actual color placed
    const newPlacedColors = new Uint16Array(progress.placedColors);
    newPlacedColors[cellIndex] = selectedPaletteIndex;

    const newPaletteCounts = [...progress.paletteCounts];

    if (isCorrect) {
      // Correct stitch: decrement remaining targets for that palette
      newPaletteCounts[targetIndex] = {
        ...newPaletteCounts[targetIndex],
        remainingTargets: newPaletteCounts[targetIndex].remainingTargets - 1,
        correctCount: newPaletteCounts[targetIndex].correctCount + 1,
      };
    } else {
      // Wrong stitch: increment wrong count for the selected palette
      newPaletteCounts[selectedPaletteIndex] = {
        ...newPaletteCounts[selectedPaletteIndex],
        wrongCount: newPaletteCounts[selectedPaletteIndex].wrongCount + 1,
      };
    }

    const updatedProgress: UserProgress = {
      ...progress,
      stitchedState: newStitchedState,
      placedColors: newPlacedColors,
      paletteCounts: newPaletteCounts,
    };

    const isNowComplete = checkCompletion(pattern, newPaletteCounts);

    set({
      progress: updatedProgress,
      isComplete: isNowComplete,
      showCelebration: isNowComplete && !get().isComplete,
    });

    saveProgress(updatedProgress);
  },

  floodFillStitch: (col: number, row: number) => {
    const { pattern, progress, selectedPaletteIndex } = get();
    if (!pattern || !progress || selectedPaletteIndex === null) return;

    const startIndex = row * pattern.width + col;
    if (startIndex < 0 || startIndex >= progress.stitchedState.length) return;

    // Check if starting cell is valid for flood fill
    const startTargetIndex = pattern.targets[startIndex];
    if (startTargetIndex !== selectedPaletteIndex) return; // Must match selected color
    if (progress.stitchedState[startIndex] !== StitchState.None) return; // Must be unstitched

    // BFS to find all connected cells with same target color that are unstitched
    const cellsToFill: number[] = [];
    const visited = new Set<number>();
    const queue: Array<{ col: number; row: number }> = [{ col, row }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const cellIndex = current.row * pattern.width + current.col;

      if (visited.has(cellIndex)) continue;
      if (current.col < 0 || current.col >= pattern.width) continue;
      if (current.row < 0 || current.row >= pattern.height) continue;

      const targetIndex = pattern.targets[cellIndex];
      if (targetIndex !== selectedPaletteIndex) continue; // Different color
      if (progress.stitchedState[cellIndex] !== StitchState.None) continue; // Already stitched

      visited.add(cellIndex);
      cellsToFill.push(cellIndex);

      // Add orthogonal neighbors (not diagonal)
      queue.push({ col: current.col - 1, row: current.row }); // left
      queue.push({ col: current.col + 1, row: current.row }); // right
      queue.push({ col: current.col, row: current.row - 1 }); // up
      queue.push({ col: current.col, row: current.row + 1 }); // down
    }

    if (cellsToFill.length === 0) return;

    // Place all stitches at once
    const newStitchedState = new Uint8Array(progress.stitchedState);
    const newPlacedColors = new Uint16Array(progress.placedColors);
    const newPaletteCounts = [...progress.paletteCounts];

    for (const cellIndex of cellsToFill) {
      const targetIndex = pattern.targets[cellIndex];
      const isCorrect = targetIndex === selectedPaletteIndex;
      const newState = isCorrect ? StitchState.Correct : StitchState.Wrong;

      newStitchedState[cellIndex] = newState;
      newPlacedColors[cellIndex] = selectedPaletteIndex;

      if (isCorrect) {
        newPaletteCounts[targetIndex] = {
          ...newPaletteCounts[targetIndex],
          remainingTargets: newPaletteCounts[targetIndex].remainingTargets - 1,
          correctCount: newPaletteCounts[targetIndex].correctCount + 1,
        };
      } else {
        newPaletteCounts[selectedPaletteIndex] = {
          ...newPaletteCounts[selectedPaletteIndex],
          wrongCount: newPaletteCounts[selectedPaletteIndex].wrongCount + 1,
        };
      }
    }

    const updatedProgress: UserProgress = {
      ...progress,
      stitchedState: newStitchedState,
      placedColors: newPlacedColors,
      paletteCounts: newPaletteCounts,
    };

    const isNowComplete = checkCompletion(pattern, newPaletteCounts);

    set({
      progress: updatedProgress,
      isComplete: isNowComplete,
      showCelebration: isNowComplete && !get().isComplete,
    });

    saveProgress(updatedProgress);
  },

  removeWrongStitch: (col: number, row: number) => {
    const { pattern, progress } = get();
    if (!pattern || !progress) return;

    const cellIndex = row * pattern.width + col;
    if (cellIndex < 0 || cellIndex >= progress.stitchedState.length) return;

    // Only remove wrong stitches
    if (progress.stitchedState[cellIndex] !== StitchState.Wrong) return;

    const newStitchedState = new Uint8Array(progress.stitchedState);
    newStitchedState[cellIndex] = StitchState.None;

    // Get which palette was actually placed and clear it
    const placedPaletteIndex = progress.placedColors[cellIndex];
    const newPlacedColors = new Uint16Array(progress.placedColors);
    newPlacedColors[cellIndex] = NO_STITCH;

    const newPaletteCounts = [...progress.paletteCounts];

    // Decrement wrong count for the palette that was actually used
    if (placedPaletteIndex !== NO_STITCH && placedPaletteIndex < newPaletteCounts.length) {
      newPaletteCounts[placedPaletteIndex] = {
        ...newPaletteCounts[placedPaletteIndex],
        wrongCount: Math.max(0, newPaletteCounts[placedPaletteIndex].wrongCount - 1),
      };
    }

    const updatedProgress: UserProgress = {
      ...progress,
      stitchedState: newStitchedState,
      placedColors: newPlacedColors,
      paletteCounts: newPaletteCounts,
    };

    set({ progress: updatedProgress });
    saveProgress(updatedProgress);
  },

  setViewport: (viewport: ViewportTransform) => {
    const { progress } = get();
    set({ viewport });

    if (progress) {
      const updatedProgress = { ...progress, viewport };
      set({ progress: updatedProgress });
      // Debounce saving viewport changes
      saveProgress(updatedProgress);
    }
  },

  closeCelebration: () => {
    set({ showCelebration: false });
  },

  reset: () => {
    set({
      pattern: null,
      progress: null,
      selectedPaletteIndex: null,
      toolMode: 'stitch',
      viewport: { scale: 1, translateX: 0, translateY: 0 },
      isComplete: false,
      showCelebration: false,
    });
  },

  getTotalWrongCount: () => {
    const { progress } = get();
    if (!progress) return 0;
    return progress.paletteCounts.reduce((sum, pc) => sum + pc.wrongCount, 0);
  },

  getRemainingForPalette: (index: number) => {
    const { progress } = get();
    if (!progress || index < 0 || index >= progress.paletteCounts.length) return 0;
    return progress.paletteCounts[index].remainingTargets;
  },

  getStitchState: (col: number, row: number) => {
    const { pattern, progress } = get();
    if (!pattern || !progress) return StitchState.None;
    const cellIndex = row * pattern.width + col;
    if (cellIndex < 0 || cellIndex >= progress.stitchedState.length) return StitchState.None;
    return progress.stitchedState[cellIndex];
  },

  getTargetPaletteIndex: (col: number, row: number) => {
    const { pattern } = get();
    if (!pattern) return NO_STITCH;
    const cellIndex = row * pattern.width + col;
    if (cellIndex < 0 || cellIndex >= pattern.targets.length) return NO_STITCH;
    return pattern.targets[cellIndex];
  },

  findNearestUnstitched: (paletteIndex: number, viewportCenterCol: number, viewportCenterRow: number) => {
    const { pattern, progress } = get();
    if (!pattern || !progress) return null;

    let nearestCell: GridCell | null = null;
    let minDistSq = Infinity;

    for (let row = 0; row < pattern.height; row++) {
      for (let col = 0; col < pattern.width; col++) {
        const cellIndex = row * pattern.width + col;
        const targetIdx = pattern.targets[cellIndex];

        if (targetIdx === paletteIndex && progress.stitchedState[cellIndex] === StitchState.None) {
          const dx = col - viewportCenterCol;
          const dy = row - viewportCenterRow;
          const distSq = dx * dx + dy * dy;

          if (distSq < minDistSq) {
            minDistSq = distSq;
            nearestCell = { col, row };
          }
        }
      }
    }

    return nearestCell;
  },
}));
