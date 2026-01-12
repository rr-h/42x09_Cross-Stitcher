import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaletteEntry, PatternDoc } from '../types';

// Mock the persistence module to avoid IndexedDB complexity in unit tests
vi.mock('../store/persistence', () => ({
  saveProgress: vi.fn().mockResolvedValue(undefined),
  loadProgress: vi.fn().mockResolvedValue(null),
  deleteProgress: vi.fn().mockResolvedValue(undefined),
}));

// Import store after mocking
import { useGameStore } from '../store/storeFunctions';

/**
 * Creates a minimal test pattern for store testing.
 */
function createMinimalPattern(): PatternDoc {
  const width = 5;
  const height = 5;
  const targets = new Uint16Array(width * height);
  targets.fill(0);
  targets[12] = 1; // Center cell is color 1

  const palette: PaletteEntry[] = [
    {
      paletteIndex: 0,
      paletteId: 'color-0',
      name: 'Color 0',
      hex: '#000000',
      symbol: 'A',
      totalTargets: 24,
    },
    {
      paletteIndex: 1,
      paletteId: 'color-1',
      name: 'Color 1',
      hex: '#FF0000',
      symbol: 'B',
      totalTargets: 1,
    },
  ];

  return {
    id: 'test-pattern-nav',
    width,
    height,
    palette,
    targets,
    meta: {},
  };
}

describe('Navigation Store Action', () => {
  beforeEach(() => {
    // Reset store before each test
    useGameStore.getState().reset();
  });

  describe('navigateToCell', () => {
    it('should do nothing when no pattern is loaded', () => {
      const store = useGameStore.getState();
      expect(store.pattern).toBeNull();

      store.navigateToCell(0);

      expect(useGameStore.getState().navigationRequest).toBeNull();
    });

    it('should set navigationRequest when pattern is loaded', async () => {
      const pattern = createMinimalPattern();

      // Load pattern
      await useGameStore.getState().loadPattern(pattern);

      // Navigate to cell
      useGameStore.getState().navigateToCell(12);

      const navRequest = useGameStore.getState().navigationRequest;
      expect(navRequest).not.toBeNull();
      expect(navRequest?.cellIndex).toBe(12);
      expect(navRequest?.animate).toBe(true);
      expect(navRequest?.nonce).toBeGreaterThan(0);
    });

    it('should increment nonce on each navigation call', async () => {
      const pattern = createMinimalPattern();
      await useGameStore.getState().loadPattern(pattern);

      useGameStore.getState().navigateToCell(0);
      const nonce1 = useGameStore.getState().navigationRequest?.nonce;

      useGameStore.getState().navigateToCell(1);
      const nonce2 = useGameStore.getState().navigationRequest?.nonce;

      expect(nonce2).toBeGreaterThan(nonce1!);
    });

    it('should increment nonce even for same cell index', async () => {
      const pattern = createMinimalPattern();
      await useGameStore.getState().loadPattern(pattern);

      useGameStore.getState().navigateToCell(5);
      const nonce1 = useGameStore.getState().navigationRequest?.nonce;

      useGameStore.getState().navigateToCell(5);
      const nonce2 = useGameStore.getState().navigationRequest?.nonce;

      expect(nonce2).toBeGreaterThan(nonce1!);
      expect(useGameStore.getState().navigationRequest?.cellIndex).toBe(5);
    });

    it('should respect animate option', async () => {
      const pattern = createMinimalPattern();
      await useGameStore.getState().loadPattern(pattern);

      useGameStore.getState().navigateToCell(10, { animate: false });
      expect(useGameStore.getState().navigationRequest?.animate).toBe(false);

      useGameStore.getState().navigateToCell(11, { animate: true });
      expect(useGameStore.getState().navigationRequest?.animate).toBe(true);
    });

    it('should default animate to true', async () => {
      const pattern = createMinimalPattern();
      await useGameStore.getState().loadPattern(pattern);

      useGameStore.getState().navigateToCell(10);
      expect(useGameStore.getState().navigationRequest?.animate).toBe(true);
    });

    it('should not set request for invalid cell index (negative)', async () => {
      const pattern = createMinimalPattern();
      await useGameStore.getState().loadPattern(pattern);

      useGameStore.getState().navigateToCell(-1);
      expect(useGameStore.getState().navigationRequest).toBeNull();
    });

    it('should not set request for invalid cell index (too large)', async () => {
      const pattern = createMinimalPattern();
      await useGameStore.getState().loadPattern(pattern);

      // Pattern is 5x5 = 25 cells, so 25 is invalid
      useGameStore.getState().navigateToCell(25);
      expect(useGameStore.getState().navigationRequest).toBeNull();

      useGameStore.getState().navigateToCell(100);
      expect(useGameStore.getState().navigationRequest).toBeNull();
    });
  });

  describe('clearNavigationRequest', () => {
    it('should clear the navigation request', async () => {
      const pattern = createMinimalPattern();
      await useGameStore.getState().loadPattern(pattern);

      useGameStore.getState().navigateToCell(5);
      expect(useGameStore.getState().navigationRequest).not.toBeNull();

      useGameStore.getState().clearNavigationRequest();
      expect(useGameStore.getState().navigationRequest).toBeNull();
    });

    it('should be safe to call when no request exists', () => {
      expect(useGameStore.getState().navigationRequest).toBeNull();

      // Should not throw
      useGameStore.getState().clearNavigationRequest();
      expect(useGameStore.getState().navigationRequest).toBeNull();
    });
  });

  describe('loadPattern clears navigation', () => {
    it('should clear navigation request when loading a new pattern', async () => {
      const pattern1 = createMinimalPattern();
      pattern1.id = 'pattern-1';

      await useGameStore.getState().loadPattern(pattern1);
      useGameStore.getState().navigateToCell(5);
      expect(useGameStore.getState().navigationRequest).not.toBeNull();

      const pattern2 = createMinimalPattern();
      pattern2.id = 'pattern-2';

      await useGameStore.getState().loadPattern(pattern2);
      expect(useGameStore.getState().navigationRequest).toBeNull();
    });
  });

  describe('reset clears navigation', () => {
    it('should clear navigation request on reset', async () => {
      const pattern = createMinimalPattern();
      await useGameStore.getState().loadPattern(pattern);

      useGameStore.getState().navigateToCell(5);
      expect(useGameStore.getState().navigationRequest).not.toBeNull();

      useGameStore.getState().reset();
      expect(useGameStore.getState().navigationRequest).toBeNull();
    });
  });
});

describe('UnstitchedIndex Integration', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('should build unstitched index when loading pattern', async () => {
    const pattern = createMinimalPattern();
    await useGameStore.getState().loadPattern(pattern);

    expect(useGameStore.getState().unstitchedIndex).not.toBeNull();
  });

  it('should use indexed findNearestUnstitched', async () => {
    const pattern = createMinimalPattern();
    await useGameStore.getState().loadPattern(pattern);

    const nearest = useGameStore.getState().findNearestUnstitched(0, 2, 2);
    expect(nearest).not.toBeNull();
    // Should find a cell targeting color 0 (most cells)
    if (nearest) {
      const cellIndex = nearest.row * pattern.width + nearest.col;
      expect(pattern.targets[cellIndex]).toBe(0);
    }
  });

  it('should update index after placing correct stitch', async () => {
    const pattern = createMinimalPattern();
    await useGameStore.getState().loadPattern(pattern);

    const indexBefore = useGameStore.getState().unstitchedIndex;
    const countBefore = indexBefore?.getUnstitchedCount(0) ?? 0;

    // Select palette and place stitch at (0,0)
    useGameStore.getState().selectPalette(0);
    useGameStore.getState().placeStitch(0, 0);

    const indexAfter = useGameStore.getState().unstitchedIndex;
    const countAfter = indexAfter?.getUnstitchedCount(0) ?? 0;

    expect(countAfter).toBe(countBefore - 1);
  });

  it('should not update index for wrong stitch', async () => {
    const pattern = createMinimalPattern();
    await useGameStore.getState().loadPattern(pattern);

    const indexBefore = useGameStore.getState().unstitchedIndex;
    // Color 1 has 1 target at center (12)
    const count1Before = indexBefore?.getUnstitchedCount(1) ?? 0;

    // Select color 0 and place at center (which targets color 1 - wrong!)
    useGameStore.getState().selectPalette(0);
    useGameStore.getState().placeStitch(2, 2); // Center cell

    const indexAfter = useGameStore.getState().unstitchedIndex;
    const count1After = indexAfter?.getUnstitchedCount(1) ?? 0;

    // Color 1's unstitched count should be unchanged (wrong stitch doesn't fulfill target)
    expect(count1After).toBe(count1Before);
  });

  it('should clear index on reset', async () => {
    const pattern = createMinimalPattern();
    await useGameStore.getState().loadPattern(pattern);

    expect(useGameStore.getState().unstitchedIndex).not.toBeNull();

    useGameStore.getState().reset();

    expect(useGameStore.getState().unstitchedIndex).toBeNull();
  });
});
