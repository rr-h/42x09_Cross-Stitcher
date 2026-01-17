import type { CompletedPattern, PatternDoc } from '../types';
import { NO_STITCH } from '../types';
import { COMPLETED_STORE, getDB } from './persistence';

/**
 * Generates a full-resolution JPEG snapshot of a completed pattern
 * @param pattern The pattern to render
 * @param quality JPEG quality (0-1, default 0.9)
 * @returns Data URL of the JPEG image
 */
export function generatePatternSnapshot(pattern: PatternDoc, quality: number = 0.9): string {
  const canvas = document.createElement('canvas');

  // Full resolution - one pixel per stitch for crisp viewing
  canvas.width = pattern.width;
  canvas.height = pattern.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Fill with fabric background
  ctx.fillStyle = '#F5F0E8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw each stitch at full resolution
  for (let row = 0; row < pattern.height; row++) {
    for (let col = 0; col < pattern.width; col++) {
      const cellIndex = row * pattern.width + col;
      const targetIndex = pattern.targets[cellIndex];

      if (targetIndex !== NO_STITCH && targetIndex < pattern.palette.length) {
        const color = pattern.palette[targetIndex].hex;
        ctx.fillStyle = color;
        ctx.fillRect(col, row, 1, 1);
      }
    }
  }

  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Generates a thumbnail preview of the pattern
 * @param pattern The pattern to render
 * @param maxSize Maximum width or height in pixels (default 200)
 * @returns Data URL of the JPEG thumbnail
 */
export function generatePatternThumbnail(pattern: PatternDoc, maxSize: number = 200): string {
  const canvas = document.createElement('canvas');

  // Calculate scale to fit in maxSize while maintaining aspect ratio
  const scale = Math.min(maxSize / pattern.width, maxSize / pattern.height);
  const width = Math.ceil(pattern.width * scale);
  const height = Math.ceil(pattern.height * scale);

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Fill with fabric background
  ctx.fillStyle = '#F5F0E8';
  ctx.fillRect(0, 0, width, height);

  // Draw scaled down version
  const cellWidth = width / pattern.width;
  const cellHeight = height / pattern.height;

  for (let row = 0; row < pattern.height; row++) {
    for (let col = 0; col < pattern.width; col++) {
      const cellIndex = row * pattern.width + col;
      const targetIndex = pattern.targets[cellIndex];

      if (targetIndex !== NO_STITCH && targetIndex < pattern.palette.length) {
        const color = pattern.palette[targetIndex].hex;
        ctx.fillStyle = color;
        ctx.fillRect(
          col * cellWidth,
          row * cellHeight,
          cellWidth + 0.5, // Small overlap to avoid gaps
          cellHeight + 0.5
        );
      }
    }
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Creates a completed pattern record from a finished pattern
 */
export async function captureCompletedPattern(pattern: PatternDoc): Promise<CompletedPattern> {
  const id = `completed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const completedAt = Date.now();

  // Generate both full resolution and thumbnail
  const snapshotDataUrl = generatePatternSnapshot(pattern);
  const thumbnailDataUrl = generatePatternThumbnail(pattern);

  const completed: CompletedPattern = {
    id,
    patternId: pattern.id,
    title: pattern.meta.title || 'Untitled Pattern',
    width: pattern.width,
    height: pattern.height,
    snapshotDataUrl,
    thumbnailDataUrl,
    completedAt,
    syncedToRemote: false,
  };

  return completed;
}

/**
 * Saves a completed pattern to IndexedDB
 */
export async function saveCompletedPattern(completed: CompletedPattern): Promise<void> {
  const db = await getDB();
  await db.put(COMPLETED_STORE, completed);
}

/**
 * Loads all completed patterns from IndexedDB, sorted by completion date (newest first)
 */
export async function loadAllCompletedPatterns(): Promise<CompletedPattern[]> {
  const db = await getDB();
  const patterns = (await db.getAll(COMPLETED_STORE)) as CompletedPattern[];
  return patterns.sort((a, b) => b.completedAt - a.completedAt);
}

/**
 * Loads a specific completed pattern by ID
 */
export async function loadCompletedPattern(id: string): Promise<CompletedPattern | null> {
  const db = await getDB();
  const pattern = (await db.get(COMPLETED_STORE, id)) as CompletedPattern | undefined;
  return pattern || null;
}

/**
 * Deletes a completed pattern from IndexedDB
 */
export async function deleteCompletedPattern(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(COMPLETED_STORE, id);
}

/**
 * Updates the sync status of a completed pattern
 */
export async function markCompletedPatternAsSynced(id: string): Promise<void> {
  const pattern = await loadCompletedPattern(id);
  if (pattern) {
    pattern.syncedToRemote = true;
    await saveCompletedPattern(pattern);
  }
}
