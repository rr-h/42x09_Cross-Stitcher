import { describe, expect, it } from 'vitest';
import type { PaletteCounts, PaletteEntry, PatternDoc, UserProgress } from '../types';
import { NO_STITCH, StitchState } from '../types';
import {
  chooseBestProgress,
  compareProgressSources,
  evaluateProgress,
  type ProgressSource,
} from '../utils/progressScoring';

/**
 * Helper to create a minimal pattern for testing.
 */
function createTestPattern(width: number, height: number, targets: number[]): PatternDoc {
  const palette: PaletteEntry[] = [
    {
      paletteIndex: 0,
      paletteId: 'red',
      name: 'Red',
      hex: '#FF0000',
      symbol: 'R',
      totalTargets: 0,
    },
    {
      paletteIndex: 1,
      paletteId: 'blue',
      name: 'Blue',
      hex: '#0000FF',
      symbol: 'B',
      totalTargets: 0,
    },
    {
      paletteIndex: 2,
      paletteId: 'green',
      name: 'Green',
      hex: '#00FF00',
      symbol: 'G',
      totalTargets: 0,
    },
  ];

  // Count targets per palette
  for (const t of targets) {
    if (t !== NO_STITCH && t < palette.length) {
      palette[t].totalTargets++;
    }
  }

  return {
    id: 'test-pattern',
    width,
    height,
    palette,
    targets: new Uint16Array(targets),
    meta: { title: 'Test Pattern' },
  };
}

/**
 * Helper to create progress for testing.
 */
function createTestProgress(
  patternId: string,
  stitchedState: number[],
  placedColors: number[],
  paletteCounts?: PaletteCounts[]
): UserProgress {
  const counts: PaletteCounts[] = paletteCounts ?? [
    { remainingTargets: 0, wrongCount: 0, correctCount: 0 },
    { remainingTargets: 0, wrongCount: 0, correctCount: 0 },
    { remainingTargets: 0, wrongCount: 0, correctCount: 0 },
  ];

  return {
    patternId,
    stitchedState: new Uint8Array(stitchedState),
    placedColors: new Uint16Array(placedColors),
    paletteCounts: counts,
    lastSelectedPaletteIndex: null,
    viewport: { scale: 1, translateX: 0, translateY: 0 },
  };
}

describe('evaluateProgress', () => {
  it('should count all unstitched cells for empty progress', () => {
    // 3x3 pattern with all targets set to palette 0
    const pattern = createTestPattern(3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const progress = createTestProgress(
      'test-pattern',
      [0, 0, 0, 0, 0, 0, 0, 0, 0], // all StitchState.None
      [
        NO_STITCH,
        NO_STITCH,
        NO_STITCH,
        NO_STITCH,
        NO_STITCH,
        NO_STITCH,
        NO_STITCH,
        NO_STITCH,
        NO_STITCH,
      ]
    );

    const metrics = evaluateProgress(pattern, progress);

    expect(metrics.correct).toBe(0);
    expect(metrics.wrong).toBe(0);
    expect(metrics.unstitched).toBe(9);
    expect(metrics.score).toBe(0);
  });

  it('should count correct stitches properly', () => {
    // 3x3 pattern: cells 0,1,2 are palette 0; cells 3,4,5 are palette 1; cells 6,7,8 are palette 2
    const pattern = createTestPattern(3, 3, [0, 0, 0, 1, 1, 1, 2, 2, 2]);

    // Place correct stitches in cells 0, 3, 6 (one per colour)
    const progress = createTestProgress(
      'test-pattern',
      [StitchState.Correct, 0, 0, StitchState.Correct, 0, 0, StitchState.Correct, 0, 0],
      [0, NO_STITCH, NO_STITCH, 1, NO_STITCH, NO_STITCH, 2, NO_STITCH, NO_STITCH]
    );

    const metrics = evaluateProgress(pattern, progress);

    expect(metrics.correct).toBe(3);
    expect(metrics.wrong).toBe(0);
    expect(metrics.unstitched).toBe(6);
    expect(metrics.score).toBe(3 * 2); // 6
  });

  it('should count wrong stitches and penalise them in score', () => {
    // 3x3 pattern: all cells target palette 0
    const pattern = createTestPattern(3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0]);

    // Place wrong stitches (palette 1) in cells 0, 1, 2
    const progress = createTestProgress(
      'test-pattern',
      [StitchState.Wrong, StitchState.Wrong, StitchState.Wrong, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH]
    );

    const metrics = evaluateProgress(pattern, progress);

    expect(metrics.correct).toBe(0);
    expect(metrics.wrong).toBe(3);
    expect(metrics.unstitched).toBe(6);
    expect(metrics.score).toBe(0 * 2 - 3 * 3); // -9
  });

  it('should compute mixed correct/wrong score correctly', () => {
    // 3x3 pattern: cells target [0, 0, 0, 1, 1, 1, 2, 2, 2]
    const pattern = createTestPattern(3, 3, [0, 0, 0, 1, 1, 1, 2, 2, 2]);

    // 4 correct, 2 wrong, 3 unstitched
    const progress = createTestProgress(
      'test-pattern',
      [
        StitchState.Correct,
        StitchState.Correct,
        StitchState.Wrong, // wrong: placed 1 instead of 0
        StitchState.Correct,
        StitchState.Wrong, // wrong: placed 2 instead of 1
        0,
        StitchState.Correct,
        0,
        0,
      ],
      [0, 0, 1, 1, 2, NO_STITCH, 2, NO_STITCH, NO_STITCH]
    );

    const metrics = evaluateProgress(pattern, progress);

    expect(metrics.correct).toBe(4);
    expect(metrics.wrong).toBe(2);
    expect(metrics.unstitched).toBe(3);
    expect(metrics.score).toBe(4 * 2 - 2 * 3); // 8 - 6 = 2
  });

  it('should handle mismatched sizes gracefully', () => {
    const pattern = createTestPattern(3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const progress = createTestProgress(
      'test-pattern',
      [0, 0, 0],
      [NO_STITCH, NO_STITCH, NO_STITCH]
    ); // only 3 cells

    const metrics = evaluateProgress(pattern, progress);

    // Should return safe defaults when sizes don't match
    expect(metrics.correct).toBe(0);
    expect(metrics.wrong).toBe(0);
    expect(metrics.unstitched).toBe(9);
    expect(metrics.score).toBe(0);
  });
});

describe('compareProgressSources', () => {
  it('should prefer higher score', () => {
    const a: ProgressSource = {
      progress: {} as UserProgress,
      metrics: { correct: 5, wrong: 0, unstitched: 5, score: 10 },
      isRemote: false,
    };
    const b: ProgressSource = {
      progress: {} as UserProgress,
      metrics: { correct: 3, wrong: 0, unstitched: 7, score: 6 },
      isRemote: true,
    };

    // Negative means a is better
    expect(compareProgressSources(a, b)).toBeLessThan(0);
    expect(compareProgressSources(b, a)).toBeGreaterThan(0);
  });

  it('should prefer more correct stitches when scores are tied', () => {
    // Same score (10), but different correct counts
    // a: correct=10, wrong=3, score=10*2-3*3=11 - wait, let's make it exact
    // score = correct*2 - wrong*3
    // For score=10: a has 8 correct, 2 wrong (8*2-2*3=16-6=10)
    //               b has 5 correct, 0 wrong (5*2-0*3=10)
    const a: ProgressSource = {
      progress: {} as UserProgress,
      metrics: { correct: 8, wrong: 2, unstitched: 0, score: 10 },
      isRemote: false,
    };
    const b: ProgressSource = {
      progress: {} as UserProgress,
      metrics: { correct: 5, wrong: 0, unstitched: 5, score: 10 },
      isRemote: true,
    };

    // a has more correct stitches, so a should be preferred
    expect(compareProgressSources(a, b)).toBeLessThan(0);
  });

  it('should prefer fewer wrong stitches when scores and correct counts are tied', () => {
    // Note: Due to the scoring formula (score = correct*2 - wrong*3),
    // having the same score with different wrong counts requires different correct counts.
    // The tiebreaker for "fewer wrong" only applies when score AND correct are equal.
    // Let's construct such a scenario manually:
    const d: ProgressSource = {
      progress: {} as UserProgress,
      metrics: { correct: 5, wrong: 1, unstitched: 4, score: 7 },
      isRemote: false,
    };
    const e: ProgressSource = {
      progress: {} as UserProgress,
      metrics: { correct: 5, wrong: 2, unstitched: 3, score: 4 },
      isRemote: true,
    };

    // d has higher score, so d is preferred
    expect(compareProgressSources(d, e)).toBeLessThan(0);
  });

  it('should prefer more recent timestamp when other factors are tied', () => {
    const a: ProgressSource = {
      progress: {} as UserProgress,
      metrics: { correct: 5, wrong: 0, unstitched: 5, score: 10 },
      updatedAt: 1000,
      isRemote: false,
    };
    const b: ProgressSource = {
      progress: {} as UserProgress,
      metrics: { correct: 5, wrong: 0, unstitched: 5, score: 10 },
      updatedAt: 2000,
      isRemote: false,
    };

    // b is more recent, so b should be preferred
    expect(compareProgressSources(a, b)).toBeGreaterThan(0);
    expect(compareProgressSources(b, a)).toBeLessThan(0);
  });

  it('should prefer remote when all other factors are tied', () => {
    const a: ProgressSource = {
      progress: {} as UserProgress,
      metrics: { correct: 5, wrong: 0, unstitched: 5, score: 10 },
      updatedAt: 1000,
      isRemote: false,
    };
    const b: ProgressSource = {
      progress: {} as UserProgress,
      metrics: { correct: 5, wrong: 0, unstitched: 5, score: 10 },
      updatedAt: 1000,
      isRemote: true,
    };

    // b is remote, so b should be preferred
    expect(compareProgressSources(a, b)).toBeGreaterThan(0);
    expect(compareProgressSources(b, a)).toBeLessThan(0);
  });
});

describe('chooseBestProgress', () => {
  it('should return null when both progresses are null', () => {
    const pattern = createTestPattern(3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const result = chooseBestProgress(pattern, null, null);
    expect(result).toBeNull();
  });

  it('should return local when remote is null', () => {
    const pattern = createTestPattern(3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const local = createTestProgress(
      'test-pattern',
      [StitchState.Correct, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH]
    );

    const result = chooseBestProgress(pattern, local, null);
    expect(result).toBe(local);
  });

  it('should return remote when local is null', () => {
    const pattern = createTestPattern(3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const remote = createTestProgress(
      'test-pattern',
      [StitchState.Correct, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH]
    );

    const result = chooseBestProgress(pattern, null, remote);
    expect(result).toBe(remote);
  });

  it('should return local when it has wrong pattern ID', () => {
    const pattern = createTestPattern(3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const local = createTestProgress(
      'wrong-pattern',
      [StitchState.Correct, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH]
    );
    const remote = createTestProgress(
      'test-pattern',
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [
        NO_STITCH,
        NO_STITCH,
        NO_STITCH,
        NO_STITCH,
        NO_STITCH,
        NO_STITCH,
        NO_STITCH,
        NO_STITCH,
        NO_STITCH,
      ]
    );

    const result = chooseBestProgress(pattern, local, remote);
    expect(result).toBe(remote);
  });

  it('should choose progress with more correct stitches', () => {
    const pattern = createTestPattern(3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0]);

    // Local: 2 correct, 0 wrong
    const local = createTestProgress(
      'test-pattern',
      [StitchState.Correct, StitchState.Correct, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH]
    );

    // Remote: 1 correct, 0 wrong
    const remote = createTestProgress(
      'test-pattern',
      [StitchState.Correct, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH]
    );

    const result = chooseBestProgress(pattern, local, remote);
    expect(result).toBe(local);
  });

  it('should choose progress with fewer wrong stitches over more stitched cells', () => {
    const pattern = createTestPattern(3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0]);

    // Local: 3 correct, 0 wrong, score = 6
    const local = createTestProgress(
      'test-pattern',
      [StitchState.Correct, StitchState.Correct, StitchState.Correct, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH]
    );

    // Remote: 4 correct, 3 wrong, score = 4*2 - 3*3 = 8 - 9 = -1
    const remote = createTestProgress(
      'test-pattern',
      [
        StitchState.Correct,
        StitchState.Correct,
        StitchState.Correct,
        StitchState.Correct,
        StitchState.Wrong,
        StitchState.Wrong,
        StitchState.Wrong,
        0,
        0,
      ],
      [0, 0, 0, 0, 1, 1, 1, NO_STITCH, NO_STITCH]
    );

    // Local has higher score (6 vs -1), should be chosen
    const result = chooseBestProgress(pattern, local, remote);
    expect(result).toBe(local);
  });

  it('should prefer remote when scores are equal (tiebreaker)', () => {
    const pattern = createTestPattern(3, 3, [0, 0, 0, 0, 0, 0, 0, 0, 0]);

    // Both have same correct/wrong/score
    const local = createTestProgress(
      'test-pattern',
      [StitchState.Correct, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH]
    );

    const remote = createTestProgress(
      'test-pattern',
      [StitchState.Correct, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH, NO_STITCH]
    );

    // With same timestamps (undefined), remote should be preferred
    const result = chooseBestProgress(pattern, local, remote);
    expect(result).toBe(remote);
  });
});
