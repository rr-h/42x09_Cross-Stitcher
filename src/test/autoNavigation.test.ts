import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../store/storeFunctions';
import type { PatternDoc } from '../types';
import { NO_STITCH } from '../types';

// Mock DOM elements for canvas container
function setupMockCanvas(width: number = 800, height: number = 600) {
  const mockElement = {
    clientWidth: width,
    clientHeight: height,
  };

  vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
    if (selector === '[data-canvas-container]') {
      return mockElement as any;
    }
    return null;
  });
}

function createTestPattern(grid: number[][], numPalettes: number): PatternDoc {
  const height = grid.length;
  const width = grid[0].length;
  const size = width * height;

  const targets = new Uint16Array(size);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const value = grid[row][col];
      targets[row * width + col] = value === -1 ? NO_STITCH : value;
    }
  }

  // Count targets per palette
  const targetCounts = new Array(numPalettes).fill(0);
  for (let i = 0; i < size; i++) {
    const t = targets[i];
    if (t !== NO_STITCH && t < numPalettes) {
      targetCounts[t]++;
    }
  }

  return {
    id: 'test-pattern',
    width,
    height,
    targets,
    palette: Array.from({ length: numPalettes }, (_, i) => ({
      paletteIndex: i,
      paletteId: `color-${i}`,
      name: `Color ${i}`,
      hex: `#${i}${i}${i}${i}${i}${i}`,
      symbol: String.fromCharCode(65 + i), // A, B, C, ...
      totalTargets: targetCounts[i],
    })),
    meta: {
      title: 'Test Pattern',
      author: 'Test',
    },
  };
}

describe('Auto-Navigation', () => {
  beforeEach(() => {
    setupMockCanvas(800, 600);
    useGameStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should auto-navigate when all visible cells of a color are stitched', async () => {
    // Create a pattern where color 0 has cells at (0,0) and (10,10)
    // At default zoom, only (0,0) would be visible
    const grid = Array(20)
      .fill(null)
      .map((_, row) =>
        Array(20)
          .fill(null)
          .map((_, col) => {
            if ((row === 0 && col === 0) || (row === 10 && col === 10)) {
              return 0; // Color 0
            }
            return -1; // No stitch
          })
      );

    const pattern = createTestPattern(grid, 1);
    await useGameStore.getState().loadPattern(pattern);

    // Select color 0
    useGameStore.getState().selectPalette(0);

    // Set initial viewport centered on (0,0) with limited zoom
    // This should make (10,10) not visible
    useGameStore.getState().setViewport({
      scale: 1.5,
      translateX: 300,
      translateY: 250,
    });

    // Get initial navigation request state
    const initialNavRequest = useGameStore.getState().navigationRequest;

    // Place stitch at (0,0) - this should be correct
    useGameStore.getState().placeStitch(0, 0);

    // After placing the stitch, there should be no more visible unstitched cells of color 0
    // So auto-navigation should have been triggered
    const navRequest = useGameStore.getState().navigationRequest;

    // Navigation request should have changed (new nonce)
    if (initialNavRequest) {
      expect(navRequest?.nonce).not.toBe(initialNavRequest.nonce);
    }

    // Navigation should be to cell (10,10) which is cellIndex 10*20 + 10 = 210
    expect(navRequest?.cellIndex).toBe(210);
    expect(navRequest?.animate).toBe(true);
  });

  it('should not auto-navigate when visible cells of the color still remain', async () => {
    // Create a pattern with multiple color 0 cells close together (all visible)
    const grid = Array(5)
      .fill(null)
      .map((_, row) =>
        Array(5)
          .fill(null)
          .map((_, col) => {
            if (row < 2 && col < 2) {
              return 0; // Four cells of color 0 in top-left
            }
            return -1;
          })
      );

    const pattern = createTestPattern(grid, 1);
    await useGameStore.getState().loadPattern(pattern);

    useGameStore.getState().selectPalette(0);

    // Set viewport to show all cells
    useGameStore.getState().setViewport({
      scale: 2,
      translateX: 100,
      translateY: 100,
    });

    const initialNavRequest = useGameStore.getState().navigationRequest;

    // Place one stitch at (0,0)
    useGameStore.getState().placeStitch(0, 0);

    const navRequest = useGameStore.getState().navigationRequest;

    // Since there are still visible unstitched cells of color 0 (at 0,1 and 1,0 and 1,1),
    // navigation should NOT be triggered
    expect(navRequest?.nonce).toBe(initialNavRequest?.nonce ?? -1);
  });

  it('should auto-navigate after flood fill when no visible cells remain', async () => {
    // Create a pattern with two disconnected regions of color 0
    const grid = Array(20)
      .fill(null)
      .map((_, row) =>
        Array(20)
          .fill(null)
          .map((_, col) => {
            // Region 1: (0,0) to (1,1)
            if (row < 2 && col < 2) return 0;
            // Region 2: (15,15) to (16,16) - far away
            if (row >= 15 && row < 17 && col >= 15 && col < 17) return 0;
            return -1;
          })
      );

    const pattern = createTestPattern(grid, 1);
    await useGameStore.getState().loadPattern(pattern);

    useGameStore.getState().selectPalette(0);

    // Set viewport to show only region 1
    useGameStore.getState().setViewport({
      scale: 2,
      translateX: 100,
      translateY: 100,
    });

    const initialNavRequest = useGameStore.getState().navigationRequest;

    // Flood fill from (0,0) - should fill the entire visible region 1
    useGameStore.getState().floodFillStitch(0, 0);

    const navRequest = useGameStore.getState().navigationRequest;

    // After flood fill, all visible cells are stitched, so should auto-navigate to region 2
    expect(navRequest?.nonce).not.toBe(initialNavRequest?.nonce ?? -1);

    // Should navigate to one of the cells in region 2 (cellIndex around 15*20+15 = 315)
    const targetRow = Math.floor(navRequest!.cellIndex / 20);
    const targetCol = navRequest!.cellIndex % 20;
    expect(targetRow).toBeGreaterThanOrEqual(15);
    expect(targetCol).toBeGreaterThanOrEqual(15);
  });

  it('should not auto-navigate when color is complete', async () => {
    // Pattern with only one cell of color 0
    const grid = Array(5)
      .fill(null)
      .map((_, row) =>
        Array(5)
          .fill(null)
          .map((_, col) => {
            if (row === 2 && col === 2) return 0;
            return -1;
          })
      );

    const pattern = createTestPattern(grid, 1);
    await useGameStore.getState().loadPattern(pattern);

    useGameStore.getState().selectPalette(0);

    const initialNavRequest = useGameStore.getState().navigationRequest;

    // Place the only stitch - color 0 is now complete
    useGameStore.getState().placeStitch(2, 2);

    const navRequest = useGameStore.getState().navigationRequest;

    // Should not navigate since the color is complete (remainingTargets = 0)
    expect(navRequest?.nonce).toBe(initialNavRequest?.nonce ?? -1);
  });

  it('should not auto-navigate when wrong stitch is placed', async () => {
    // Pattern with color 0 at (0,0) and color 1 at (5,5)
    const grid = Array(10)
      .fill(null)
      .map((_, row) =>
        Array(10)
          .fill(null)
          .map((_, col) => {
            if (row === 0 && col === 0) return 0;
            if (row === 5 && col === 5) return 1;
            return -1;
          })
      );

    const pattern = createTestPattern(grid, 2);
    await useGameStore.getState().loadPattern(pattern);

    // Select color 1
    useGameStore.getState().selectPalette(1);

    const initialNavRequest = useGameStore.getState().navigationRequest;

    // Place wrong stitch at (0,0) (which targets color 0, not color 1)
    useGameStore.getState().placeStitch(0, 0);

    const navRequest = useGameStore.getState().navigationRequest;

    // Should not auto-navigate for wrong stitches
    expect(navRequest?.nonce).toBe(initialNavRequest?.nonce ?? -1);
  });
});
