import { create } from 'zustand';
import type {
  GridCell,
  PaletteCounts,
  PatternDoc,
  ToolMode,
  UserProgress,
  ViewportTransform,
} from '../types';
import { NO_STITCH, StitchState } from '../types';
import { UnstitchedIndex } from '../utils/UnstitchedIndex';
import { loadProgress, saveProgress } from './persistence';

/**
 * Navigation request object. PatternCanvas subscribes to changes and
 * centers the viewport on the requested cell. The nonce ensures that
 * repeat requests to the same cell are handled (not ignored due to
 * shallow equality).
 */
export interface NavigationRequest {
  /** Cell index to navigate to (row * width + col) */
  cellIndex: number;
  /** Whether to animate the navigation */
  animate: boolean;
  /** Incrementing counter to ensure uniqueness of each request */
  nonce: number;
}

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
  // in GameState 
  lastInteractionAt: number;
  markInteraction: () => void;

  /**
   * Navigation request for PatternCanvas to observe.
   * When this changes (nonce increments), PatternCanvas should center
   * the viewport on the specified cell.
   */
  navigationRequest: NavigationRequest | null;

  /**
   * Index of unstitched cells per palette color for fast lookups.
   * Rebuilt on pattern load, updated on stitch changes.
   * Not persisted - always rebuilt from pattern + progress.
   */
  unstitchedIndex: UnstitchedIndex | null;

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

  /**
   * Request navigation to a specific cell.
   * PatternCanvas subscribes to navigationRequest and performs the actual viewport change.
   * @param cellIndex - The cell index (row * width + col) to navigate to
   * @param opts - Optional configuration (animate: whether to animate the transition)
   */
  navigateToCell: (cellIndex: number, opts?: { animate?: boolean }) => void;

  /**
   * Clear the navigation request after PatternCanvas has handled it.
   * This prevents re-navigation on component re-renders.
   */
  clearNavigationRequest: () => void;

  // Computed helpers
  getTotalWrongCount: () => number;
  getRemainingForPalette: (index: number) => number;
  getStitchState: (col: number, row: number) => StitchState;
  getTargetPaletteIndex: (col: number, row: number) => number;

  /**
   * Find the nearest unstitched cell for a given palette color.
   * Uses the UnstitchedIndex for O(1) average case lookups instead of O(width*height) scans.
   */
  findNearestUnstitched: (
    paletteIndex: number,
    viewportCenterCol: number,
    viewportCenterRow: number
  ) => GridCell | null;
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

/** Counter for generating unique navigation request nonces */
let navigationNonce = 0;

export const useGameStore = create<GameState>((set, get) => ({
  pattern: null,
  progress: null,
  selectedPaletteIndex: null,
  toolMode: 'stitch',
  viewport: { scale: 1, translateX: 0, translateY: 0 },
  isComplete: false,
  showCelebration: false,
  navigationRequest: null,
  unstitchedIndex: null,

  loadPattern: async (pattern: PatternDoc) => {
    // Try to load existing progress
    const existingProgress = await loadProgress(pattern.id);

    if (
      existingProgress &&
      existingProgress.stitchedState.length === pattern.width * pattern.height
    ) {
      // Build the unstitched index from existing progress
      const unstitchedIndex = UnstitchedIndex.build(pattern, existingProgress);

      set({
        pattern,
        progress: existingProgress,
        selectedPaletteIndex: existingProgress.lastSelectedPaletteIndex,
        viewport: existingProgress.viewport,
        isComplete: checkCompletion(pattern, existingProgress.paletteCounts),
        showCelebration: false,
        toolMode: 'stitch',
        unstitchedIndex,
        navigationRequest: null,
      });
    } else {
      const newProgress = createInitialProgress(pattern);
      // Build the unstitched index from fresh progress
      const unstitchedIndex = UnstitchedIndex.build(pattern, newProgress);

      set({
        pattern,
        progress: newProgress,
        selectedPaletteIndex: null,
        viewport: { scale: 1, translateX: 0, translateY: 0 },
        isComplete: false,
        showCelebration: false,
        toolMode: 'stitch',
        unstitchedIndex,
        navigationRequest: null,
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
    const { pattern, progress, selectedPaletteIndex, unstitchedIndex } = get();
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

      // Update the unstitched index - mark this cell as stitched
      if (unstitchedIndex) {
        unstitchedIndex.markStitched(cellIndex, targetIndex);
      }
    } else {
      // Wrong stitch: increment wrong count for the selected palette
      // Note: Do NOT update unstitchedIndex for wrong stitches - the target remains unstitched
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
    const { pattern, progress, selectedPaletteIndex, unstitchedIndex } = get();
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

    // Batch update the unstitched index for all correct stitches
    if (unstitchedIndex) {
      const correctCells = cellsToFill.filter(idx => pattern.targets[idx] === selectedPaletteIndex);
      unstitchedIndex.markStitchedBatch(correctCells, selectedPaletteIndex);
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

    // Note: Do NOT update unstitchedIndex when removing wrong stitches.
    // Wrong stitches never affected the index (targets remained "unstitched" for their target color).

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

  navigateToCell: (cellIndex: number, opts?: { animate?: boolean }) => {
    const { pattern, progress } = get();
    if (!pattern || !progress) return;

    // Validate cell index
    const totalCells = pattern.width * pattern.height;
    if (cellIndex < 0 || cellIndex >= totalCells) return;

    // Increment nonce to ensure this request is treated as new
    navigationNonce++;

    set({
      navigationRequest: {
        cellIndex,
        animate: opts?.animate ?? true,
        nonce: navigationNonce,
      },
    });
  },

  clearNavigationRequest: () => {
    set({ navigationRequest: null });
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
      navigationRequest: null,
      unstitchedIndex: null,
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

  findNearestUnstitched: (
    paletteIndex: number,
    viewportCenterCol: number,
    viewportCenterRow: number
  ) => {
    const { unstitchedIndex } = get();

    // Use the indexed approach for fast lookups
    if (unstitchedIndex) {
      return unstitchedIndex.findNearest(paletteIndex, viewportCenterCol, viewportCenterRow);
    }

    // Fallback: should not happen if pattern is loaded correctly
    // But keep the old O(n) scan as a safety net
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
