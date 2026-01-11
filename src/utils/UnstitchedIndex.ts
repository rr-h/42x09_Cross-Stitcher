/**
 * UnstitchedIndex - High-performance index for finding unstitched cells per palette color.
 *
 * This replaces the O(width*height) grid scan with an indexed approach that provides:
 * - O(1) updates when stitches are placed/removed
 * - Fast nearest-unstitched lookups using spatial bucketing
 *
 * ## Data Structure
 *
 * For each palette color index, we maintain:
 * 1. `targetCells`: Array of cell indices that target this color (static after build)
 * 2. `unstitchedSet`: Set of positions in targetCells that are still unstitched
 * 3. Spatial tiles for fast nearest-neighbor queries
 *
 * ## Spatial Indexing
 *
 * The grid is divided into tiles (TILE_SIZE x TILE_SIZE). For each color, we track
 * which tiles contain unstitched cells. When finding nearest unstitched, we expand
 * outward from the query point's tile, checking nearby tiles first.
 *
 * ## Update Rules
 *
 * - On correct stitch placement: Mark cell as stitched in index
 * - On wrong stitch placement: No change (target remains unstitched)
 * - On wrong stitch removal: No change (target was already unstitched)
 * - On correct stitch removal (undo): Mark cell as unstitched in index
 *
 * The index is NOT persisted - it is rebuilt from pattern + progress on load.
 */

import type { PatternDoc, UserProgress, GridCell } from '../types';
import { StitchState, NO_STITCH } from '../types';

/** Tile size for spatial bucketing. 32x32 is a good balance of memory vs lookup speed. */
const TILE_SIZE = 32;

/** Sentinel value for cells that are not targets for any color. */
const NOT_A_TARGET = 0xFFFFFFFF;

/**
 * Per-color index tracking unstitched cells.
 */
interface ColorIndex {
  /** Array of cell indices that target this color (sorted for binary search if needed). */
  targetCells: Uint32Array;
  /** Pre-computed columns for each target cell (parallel array to targetCells). */
  targetCols: Uint16Array;
  /** Pre-computed rows for each target cell (parallel array to targetCells). */
  targetRows: Uint16Array;
  /** Set of positions in targetCells that are still unstitched. */
  unstitchedPositions: Set<number>;
  /** Map from tileId -> set of positions in this tile that are unstitched. */
  tileIndex: Map<number, Set<number>>;
}

export class UnstitchedIndex {
  private readonly width: number;
  private readonly height: number;
  private readonly tilesPerRow: number;
  private readonly colorIndices: ColorIndex[];
  /**
   * Maps cellIndex -> position in the color's targetCells array.
   * Allows O(1) lookup when a stitch is placed.
   */
  private readonly cellToTargetPosition: Uint32Array;

  private constructor(
    width: number,
    height: number,
    colorIndices: ColorIndex[],
    cellToTargetPosition: Uint32Array
  ) {
    this.width = width;
    this.height = height;
    this.tilesPerRow = Math.ceil(width / TILE_SIZE);
    this.colorIndices = colorIndices;
    this.cellToTargetPosition = cellToTargetPosition;
  }

  /**
   * Build the index from a pattern and progress state.
   * This should be called once on pattern load.
   */
  static build(pattern: PatternDoc, progress: UserProgress): UnstitchedIndex {
    const { width, height, palette, targets } = pattern;
    const { stitchedState } = progress;
    const totalCells = width * height;
    const tilesPerRow = Math.ceil(width / TILE_SIZE);

    // Phase 1: Count targets per color
    const targetCounts = new Uint32Array(palette.length);
    for (let i = 0; i < totalCells; i++) {
      const colorIdx = targets[i];
      if (colorIdx !== NO_STITCH && colorIdx < palette.length) {
        targetCounts[colorIdx]++;
      }
    }

    // Phase 2: Allocate arrays for each color
    const colorIndices: ColorIndex[] = palette.map((_, i) => ({
      targetCells: new Uint32Array(targetCounts[i]),
      targetCols: new Uint16Array(targetCounts[i]),
      targetRows: new Uint16Array(targetCounts[i]),
      unstitchedPositions: new Set(),
      tileIndex: new Map(),
    }));

    // Phase 3: Fill arrays and build cellToTargetPosition
    const cellToTargetPosition = new Uint32Array(totalCells);
    cellToTargetPosition.fill(NOT_A_TARGET);
    const insertPositions = new Uint32Array(palette.length); // Current insert position per color

    for (let cellIndex = 0; cellIndex < totalCells; cellIndex++) {
      const colorIdx = targets[cellIndex];
      if (colorIdx === NO_STITCH || colorIdx >= palette.length) continue;

      const pos = insertPositions[colorIdx]++;
      const colorIndex = colorIndices[colorIdx];
      const col = cellIndex % width;
      const row = Math.floor(cellIndex / width);
      const tileId = Math.floor(row / TILE_SIZE) * tilesPerRow + Math.floor(col / TILE_SIZE);

      colorIndex.targetCells[pos] = cellIndex;
      colorIndex.targetCols[pos] = col;
      colorIndex.targetRows[pos] = row;
      cellToTargetPosition[cellIndex] = pos;

      // Check if this cell is unstitched (None state and not wrong-stitched)
      // A cell is "unstitched for this color" if its state is None (no stitch placed)
      if (stitchedState[cellIndex] === StitchState.None) {
        colorIndex.unstitchedPositions.add(pos);
        if (!colorIndex.tileIndex.has(tileId)) {
          colorIndex.tileIndex.set(tileId, new Set());
        }
        colorIndex.tileIndex.get(tileId)!.add(pos);
      }
    }

    return new UnstitchedIndex(width, height, colorIndices, cellToTargetPosition);
  }

  /**
   * Get the total count of unstitched cells for a palette color.
   */
  getUnstitchedCount(paletteIndex: number): number {
    if (paletteIndex < 0 || paletteIndex >= this.colorIndices.length) return 0;
    return this.colorIndices[paletteIndex].unstitchedPositions.size;
  }

  /**
   * Find the nearest unstitched cell for a given palette color, relative to a viewport center.
   * Returns null if no unstitched cells exist for that color.
   *
   * Uses spatial bucketing to avoid scanning all cells:
   * 1. Start from the tile containing the viewport center
   * 2. Expand outward in rings until we find tiles with unstitched cells
   * 3. Compute exact distance only for cells in nearby tiles
   */
  findNearest(
    paletteIndex: number,
    viewportCenterCol: number,
    viewportCenterRow: number
  ): GridCell | null {
    if (paletteIndex < 0 || paletteIndex >= this.colorIndices.length) return null;

    const colorIndex = this.colorIndices[paletteIndex];
    if (colorIndex.unstitchedPositions.size === 0) return null;

    // If there's only one unstitched cell, return it directly
    if (colorIndex.unstitchedPositions.size === 1) {
      const pos = colorIndex.unstitchedPositions.values().next().value as number;
      return { col: colorIndex.targetCols[pos], row: colorIndex.targetRows[pos] };
    }

    const centerTileCol = Math.floor(viewportCenterCol / TILE_SIZE);
    const centerTileRow = Math.floor(viewportCenterRow / TILE_SIZE);
    const maxTileCol = Math.ceil(this.width / TILE_SIZE) - 1;
    const maxTileRow = Math.ceil(this.height / TILE_SIZE) - 1;

    let bestCell: GridCell | null = null;
    let bestDistSq = Infinity;

    // Expand in rings from center tile
    // We need to expand until we're sure we can't find a closer cell
    // Once we find a cell at distance D, we only need to search tiles within D of center
    const maxRing = Math.max(maxTileCol, maxTileRow) + 1;

    for (let ring = 0; ring <= maxRing; ring++) {
      // Early termination: if best distance is less than ring * TILE_SIZE,
      // no tile in this ring or beyond can have a closer cell
      const minPossibleDistFromRing = (ring - 1) * TILE_SIZE;
      if (bestDistSq < minPossibleDistFromRing * minPossibleDistFromRing && ring > 0) {
        break;
      }

      // Collect tiles in this ring
      const tilesToCheck: number[] = [];

      if (ring === 0) {
        // Just the center tile
        if (centerTileCol >= 0 && centerTileCol <= maxTileCol &&
            centerTileRow >= 0 && centerTileRow <= maxTileRow) {
          tilesToCheck.push(centerTileRow * this.tilesPerRow + centerTileCol);
        }
      } else {
        // Ring around center
        for (let dx = -ring; dx <= ring; dx++) {
          for (let dy = -ring; dy <= ring; dy++) {
            // Only process cells on the perimeter of the ring
            if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;

            const tileCol = centerTileCol + dx;
            const tileRow = centerTileRow + dy;
            if (tileCol >= 0 && tileCol <= maxTileCol &&
                tileRow >= 0 && tileRow <= maxTileRow) {
              tilesToCheck.push(tileRow * this.tilesPerRow + tileCol);
            }
          }
        }
      }

      // Check cells in these tiles
      for (const tileId of tilesToCheck) {
        const positionsInTile = colorIndex.tileIndex.get(tileId);
        if (!positionsInTile || positionsInTile.size === 0) continue;

        for (const pos of positionsInTile) {
          const col = colorIndex.targetCols[pos];
          const row = colorIndex.targetRows[pos];
          const dx = col - viewportCenterCol;
          const dy = row - viewportCenterRow;
          const distSq = dx * dx + dy * dy;

          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            bestCell = { col, row };
          }
        }
      }
    }

    return bestCell;
  }

  /**
   * Mark a cell as stitched (correct stitch placed).
   * Call this when a correct stitch is placed at the given cell.
   */
  markStitched(cellIndex: number, paletteIndex: number): void {
    if (paletteIndex < 0 || paletteIndex >= this.colorIndices.length) return;

    const pos = this.cellToTargetPosition[cellIndex];
    if (pos === NOT_A_TARGET) return;

    const colorIndex = this.colorIndices[paletteIndex];
    if (!colorIndex.unstitchedPositions.has(pos)) return;

    const col = colorIndex.targetCols[pos];
    const row = colorIndex.targetRows[pos];
    const tileId = Math.floor(row / TILE_SIZE) * this.tilesPerRow + Math.floor(col / TILE_SIZE);

    colorIndex.unstitchedPositions.delete(pos);
    const tileSet = colorIndex.tileIndex.get(tileId);
    if (tileSet) {
      tileSet.delete(pos);
      if (tileSet.size === 0) {
        colorIndex.tileIndex.delete(tileId);
      }
    }
  }

  /**
   * Mark a cell as unstitched (correct stitch removed, e.g., undo).
   * Call this when a correct stitch is removed from the given cell.
   */
  markUnstitched(cellIndex: number, paletteIndex: number): void {
    if (paletteIndex < 0 || paletteIndex >= this.colorIndices.length) return;

    const pos = this.cellToTargetPosition[cellIndex];
    if (pos === NOT_A_TARGET) return;

    const colorIndex = this.colorIndices[paletteIndex];
    if (colorIndex.unstitchedPositions.has(pos)) return; // Already unstitched

    const col = colorIndex.targetCols[pos];
    const row = colorIndex.targetRows[pos];
    const tileId = Math.floor(row / TILE_SIZE) * this.tilesPerRow + Math.floor(col / TILE_SIZE);

    colorIndex.unstitchedPositions.add(pos);
    if (!colorIndex.tileIndex.has(tileId)) {
      colorIndex.tileIndex.set(tileId, new Set());
    }
    colorIndex.tileIndex.get(tileId)!.add(pos);
  }

  /**
   * Batch mark multiple cells as stitched (for flood fill operations).
   */
  markStitchedBatch(cellIndices: number[], paletteIndex: number): void {
    for (const cellIndex of cellIndices) {
      this.markStitched(cellIndex, paletteIndex);
    }
  }
}
