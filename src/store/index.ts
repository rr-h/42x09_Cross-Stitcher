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
import { loadLatestRemoteSnapshot } from '../sync/remoteSnapshots';

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
  showActivePatterns: boolean;

  // Activity tracking (used by autosave logic)
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
  setShowActivePatterns: (show: boolean) => void;
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
  placedColors.fill(NO_STITCH);

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

function countAnyStitches(progress: UserProgress): number {
  let count = 0;
  const s = progress.stitchedState;
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== StitchState.None) count++;
  }
  return count;
}

/** Counter for generating unique navigation request nonces */
let navigationNonce = 0;

export const useGameStore = create<GameState>((set, get) => {
  const touch = () => set({ lastInteractionAt: Date.now() });

  const chooseBestProgress = (
    pattern: PatternDoc,
    local: UserProgress | null,
    remote: UserProgress | null
  ) => {
    const expectedSize = pattern.width * pattern.height;

    const localOk =
      !!local && local.patternId === pattern.id && local.stitchedState.length === expectedSize;

    const remoteOk =
      !!remote && remote.patternId === pattern.id && remote.stitchedState.length === expectedSize;

    if (localOk && remoteOk) {
      // Heuristic: pick the one with more stitches. If tied, prefer remote.
      const localCount = countAnyStitches(local!);
      const remoteCount = countAnyStitches(remote!);
      return remoteCount >= localCount ? remote! : local!;
    }

    if (remoteOk) return remote!;
    if (localOk) return local!;

    return null;
  };

  return {
    pattern: null,
    progress: null,
    selectedPaletteIndex: null,
    toolMode: 'stitch',
    viewport: { scale: 1, translateX: 0, translateY: 0 },
    isComplete: false,
    showCelebration: false,
    showActivePatterns: false,

    lastInteractionAt: 0,
    markInteraction: touch,

    navigationRequest: null,
    unstitchedIndex: null,

    loadPattern: async (pattern: PatternDoc) => {
      const localProgress = await loadProgress(pattern.id);

      let remoteProgress: UserProgress | null = null;
      try {
        remoteProgress = await loadLatestRemoteSnapshot(pattern.id);
      } catch (err) {
        // Do not block pattern load if Supabase is unavailable
        console.warn('Remote load failed:', err);
      }

      const chosen = chooseBestProgress(pattern, localProgress, remoteProgress);
      const progress = chosen ?? createInitialProgress(pattern);
      const unstitchedIndex = UnstitchedIndex.build(pattern, progress);

      set({
        pattern,
        progress,
        selectedPaletteIndex: progress.lastSelectedPaletteIndex,
        viewport: progress.viewport,
        isComplete: checkCompletion(pattern, progress.paletteCounts),
        showCelebration: false,
        toolMode: 'stitch',
        unstitchedIndex,
        navigationRequest: null,
      });
    },

    selectPalette: (index: number) => {
      touch();
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
      touch();
      set({ toolMode: mode });
    },

    placeStitch: (col: number, row: number) => {
      touch();
      const { pattern, progress, selectedPaletteIndex, unstitchedIndex } = get();
      if (!pattern || !progress || selectedPaletteIndex === null) return;

      const cellIndex = row * pattern.width + col;
      if (cellIndex < 0 || cellIndex >= progress.stitchedState.length) return;

      // Do not overwrite existing stitches
      if (progress.stitchedState[cellIndex] !== StitchState.None) return;

      const targetIndex = pattern.targets[cellIndex];
      if (targetIndex === NO_STITCH) return;

      const isCorrect = targetIndex === selectedPaletteIndex;
      const newState = isCorrect ? StitchState.Correct : StitchState.Wrong;

      const newStitchedState = new Uint8Array(progress.stitchedState);
      newStitchedState[cellIndex] = newState;

      const newPlacedColors = new Uint16Array(progress.placedColors);
      newPlacedColors[cellIndex] = selectedPaletteIndex;

      const newPaletteCounts = [...progress.paletteCounts];

      if (isCorrect) {
        newPaletteCounts[targetIndex] = {
          ...newPaletteCounts[targetIndex],
          remainingTargets: newPaletteCounts[targetIndex].remainingTargets - 1,
          correctCount: newPaletteCounts[targetIndex].correctCount + 1,
        };

        if (unstitchedIndex) {
          unstitchedIndex.markStitched(cellIndex, targetIndex);
        }
      } else {
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

      const wasComplete = get().isComplete;
      const isNowComplete = checkCompletion(pattern, newPaletteCounts);

      set({
        progress: updatedProgress,
        isComplete: isNowComplete,
        showCelebration: isNowComplete && !wasComplete,
      });

      saveProgress(updatedProgress);
    },

    floodFillStitch: (col: number, row: number) => {
      touch();
      const { pattern, progress, selectedPaletteIndex, unstitchedIndex } = get();
      if (!pattern || !progress || selectedPaletteIndex === null) return;

      const startIndex = row * pattern.width + col;
      if (startIndex < 0 || startIndex >= progress.stitchedState.length) return;

      const startTargetIndex = pattern.targets[startIndex];
      if (startTargetIndex !== selectedPaletteIndex) return;
      if (progress.stitchedState[startIndex] !== StitchState.None) return;

      const cellsToFill: number[] = [];
      const visited = new Set<number>();
      const queue: Array<{ col: number; row: number }> = [{ col, row }];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.col < 0 || current.col >= pattern.width) continue;
        if (current.row < 0 || current.row >= pattern.height) continue;

        const cellIndex = current.row * pattern.width + current.col;
        if (visited.has(cellIndex)) continue;

        const targetIndex = pattern.targets[cellIndex];
        if (targetIndex !== selectedPaletteIndex) continue;
        if (progress.stitchedState[cellIndex] !== StitchState.None) continue;

        visited.add(cellIndex);
        cellsToFill.push(cellIndex);

        queue.push({ col: current.col - 1, row: current.row });
        queue.push({ col: current.col + 1, row: current.row });
        queue.push({ col: current.col, row: current.row - 1 });
        queue.push({ col: current.col, row: current.row + 1 });
      }

      if (cellsToFill.length === 0) return;

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

      if (unstitchedIndex) {
        const correctCells = cellsToFill.filter(
          idx => pattern.targets[idx] === selectedPaletteIndex
        );
        unstitchedIndex.markStitchedBatch(correctCells, selectedPaletteIndex);
      }

      const updatedProgress: UserProgress = {
        ...progress,
        stitchedState: newStitchedState,
        placedColors: newPlacedColors,
        paletteCounts: newPaletteCounts,
      };

      const wasComplete = get().isComplete;
      const isNowComplete = checkCompletion(pattern, newPaletteCounts);

      set({
        progress: updatedProgress,
        isComplete: isNowComplete,
        showCelebration: isNowComplete && !wasComplete,
      });

      saveProgress(updatedProgress);
    },

    removeWrongStitch: (col: number, row: number) => {
      touch();
      const { pattern, progress } = get();
      if (!pattern || !progress) return;

      const cellIndex = row * pattern.width + col;
      if (cellIndex < 0 || cellIndex >= progress.stitchedState.length) return;

      if (progress.stitchedState[cellIndex] !== StitchState.Wrong) return;

      const newStitchedState = new Uint8Array(progress.stitchedState);
      newStitchedState[cellIndex] = StitchState.None;

      const placedPaletteIndex = progress.placedColors[cellIndex];
      const newPlacedColors = new Uint16Array(progress.placedColors);
      newPlacedColors[cellIndex] = NO_STITCH;

      const newPaletteCounts = [...progress.paletteCounts];

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
      touch();
      const { progress } = get();
      set({ viewport });

      if (progress) {
        const updatedProgress = { ...progress, viewport };
        set({ progress: updatedProgress });
        saveProgress(updatedProgress);
      }
    },

    navigateToCell: (cellIndex: number, opts?: { animate?: boolean }) => {
      touch();
      const { pattern, progress } = get();
      if (!pattern || !progress) return;

      const totalCells = pattern.width * pattern.height;
      if (cellIndex < 0 || cellIndex >= totalCells) return;

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

    setShowActivePatterns: (show: boolean) => {
      set({ showActivePatterns: show });
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
        showActivePatterns: false,
        navigationRequest: null,
        unstitchedIndex: null,
        lastInteractionAt: 0,
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

      if (unstitchedIndex) {
        return unstitchedIndex.findNearest(paletteIndex, viewportCenterCol, viewportCenterRow);
      }

      const { pattern, progress } = get();
      if (!pattern || !progress) return null;

      let nearestCell: GridCell | null = null;
      let minDistSq = Infinity;

      for (let row = 0; row < pattern.height; row++) {
        for (let col = 0; col < pattern.width; col++) {
          const cellIndex = row * pattern.width + col;
          const targetIdx = pattern.targets[cellIndex];

          if (
            targetIdx === paletteIndex &&
            progress.stitchedState[cellIndex] === StitchState.None
          ) {
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
  };
});
