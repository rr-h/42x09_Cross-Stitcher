import type { PatternDoc, UserProgress } from '../types';
import { NO_STITCH, StitchState } from '../types';

/**
 * Progress evaluation metrics computed from pattern targets and user progress.
 * Used to compare and select the "best" progress when multiple sources exist.
 */
export interface ProgressMetrics {
  /** Number of cells with correct stitches (matches target palette index) */
  correct: number;
  /** Number of cells with wrong stitches (does not match target palette index) */
  wrong: number;
  /** Number of cells with no stitch */
  unstitched: number;
  /** Computed score: (correct * 2) - (wrong * 3) */
  score: number;
}

/**
 * Evaluate progress against pattern targets to compute correctness-aware metrics.
 *
 * This function scans all cells in the progress and compares each stitched cell
 * against the expected palette index from the pattern. This allows us to:
 * - Strongly prefer correct stitches
 * - Penalise wrong stitches (they require fixing)
 * - Make informed decisions when choosing between local and remote progress
 *
 * @param pattern - The pattern document with target palette indices
 * @param progress - The user progress to evaluate
 * @returns Metrics including correct/wrong/unstitched counts and computed score
 */
export function evaluateProgress(pattern: PatternDoc, progress: UserProgress): ProgressMetrics {
  const expectedSize = pattern.width * pattern.height;

  // Sanity check: sizes must match
  if (progress.stitchedState.length !== expectedSize || pattern.targets.length !== expectedSize) {
    return { correct: 0, wrong: 0, unstitched: expectedSize, score: 0 };
  }

  let correct = 0;
  let wrong = 0;
  let unstitched = 0;

  for (let i = 0; i < expectedSize; i++) {
    const stitchState = progress.stitchedState[i];
    const targetPaletteIndex = pattern.targets[i];

    if (stitchState === StitchState.None) {
      // No stitch placed
      unstitched++;
    } else if (stitchState === StitchState.Correct) {
      // Already marked correct by game logic
      correct++;
    } else if (stitchState === StitchState.Wrong) {
      // Already marked wrong by game logic
      wrong++;
    } else {
      // Fallback: derive correctness from placed colour vs target
      // This handles legacy progress that might not have proper state flags
      const placedColour = progress.placedColors[i];
      if (targetPaletteIndex === NO_STITCH) {
        // Cell has no target but has a stitch - treat as wrong
        wrong++;
      } else if (placedColour === targetPaletteIndex) {
        correct++;
      } else {
        wrong++;
      }
    }
  }

  // Scoring formula: heavily rewards correct, heavily penalises wrong
  // correct * 2: each correct stitch adds 2 points (positive contribution)
  // wrong * 3: each wrong stitch subtracts 3 points (negative contribution)
  // This ensures that a progress with more wrong stitches is ranked lower
  // even if it has the same number of correct stitches
  const score = correct * 2 - wrong * 3;

  return { correct, wrong, unstitched, score };
}

/**
 * Metadata for tie-breaking when scores are equal.
 */
export interface ProgressSource {
  progress: UserProgress;
  metrics: ProgressMetrics;
  /** Timestamp when this progress was last updated (if available) */
  updatedAt?: number;
  /** Whether this is from remote storage (true) or local (false) */
  isRemote: boolean;
}

/**
 * Compare two progress sources and return the better one.
 * Uses deterministic tie-breaking rules:
 *
 * 1. Higher score wins
 * 2. If tied, more correct stitches wins
 * 3. If still tied, fewer wrong stitches wins
 * 4. If still tied, more recent timestamp wins
 * 5. If still tied, prefer remote (cloud backup is canonical)
 *
 * @param a - First progress source
 * @param b - Second progress source
 * @returns Negative if a is better, positive if b is better, 0 if equal
 */
export function compareProgressSources(a: ProgressSource, b: ProgressSource): number {
  // 1. Higher score wins
  if (a.metrics.score !== b.metrics.score) {
    return b.metrics.score - a.metrics.score;
  }

  // 2. More correct stitches wins
  if (a.metrics.correct !== b.metrics.correct) {
    return b.metrics.correct - a.metrics.correct;
  }

  // 3. Fewer wrong stitches wins
  if (a.metrics.wrong !== b.metrics.wrong) {
    return a.metrics.wrong - b.metrics.wrong;
  }

  // 4. More recent timestamp wins
  const aTime = a.updatedAt ?? 0;
  const bTime = b.updatedAt ?? 0;
  if (aTime !== bTime) {
    return bTime - aTime;
  }

  // 5. Prefer remote (stable tiebreaker)
  if (a.isRemote !== b.isRemote) {
    return a.isRemote ? -1 : 1;
  }

  return 0;
}

/**
 * Choose the best progress from local and remote sources using correctness-aware scoring.
 *
 * This replaces the naive "count any stitches" approach with a proper evaluation
 * that considers correctness. Wrong stitches are penalised because they represent
 * work that needs to be undone.
 *
 * @param pattern - The pattern document with target palette indices
 * @param localProgress - Progress from local IndexedDB (may be null)
 * @param remoteProgress - Progress from remote Supabase storage (may be null)
 * @param localUpdatedAt - Timestamp when local progress was last saved (optional)
 * @param remoteUpdatedAt - Timestamp when remote progress was last saved (optional)
 * @returns The better progress, or null if both are invalid/null
 */
export function chooseBestProgress(
  pattern: PatternDoc,
  localProgress: UserProgress | null,
  remoteProgress: UserProgress | null,
  localUpdatedAt?: number,
  remoteUpdatedAt?: number
): UserProgress | null {
  const expectedSize = pattern.width * pattern.height;

  // Validate local progress
  const localOk =
    localProgress !== null &&
    localProgress.patternId === pattern.id &&
    localProgress.stitchedState.length === expectedSize;

  // Validate remote progress
  const remoteOk =
    remoteProgress !== null &&
    remoteProgress.patternId === pattern.id &&
    remoteProgress.stitchedState.length === expectedSize;

  // Neither is valid
  if (!localOk && !remoteOk) {
    return null;
  }

  // Only one is valid
  if (!localOk) {
    return remoteProgress;
  }
  if (!remoteOk) {
    return localProgress;
  }

  // Both are valid - compare using correctness-aware metrics
  const localSource: ProgressSource = {
    progress: localProgress!,
    metrics: evaluateProgress(pattern, localProgress!),
    updatedAt: localUpdatedAt,
    isRemote: false,
  };

  const remoteSource: ProgressSource = {
    progress: remoteProgress!,
    metrics: evaluateProgress(pattern, remoteProgress!),
    updatedAt: remoteUpdatedAt,
    isRemote: true,
  };

  const comparison = compareProgressSources(localSource, remoteSource);

  // Return the better one (negative comparison means local is better)
  return comparison <= 0 ? localProgress! : remoteProgress!;
}
