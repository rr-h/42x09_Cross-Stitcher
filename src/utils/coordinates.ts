import type { Point, GridCell, ViewportTransform } from '../types';

export const CELL_SIZE = 40; // Base cell size in world units

export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: ViewportTransform
): Point {
  return {
    x: (screenX - viewport.translateX) / viewport.scale,
    y: (screenY - viewport.translateY) / viewport.scale,
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: ViewportTransform
): Point {
  return {
    x: worldX * viewport.scale + viewport.translateX,
    y: worldY * viewport.scale + viewport.translateY,
  };
}

export function worldToGrid(worldX: number, worldY: number): GridCell {
  return {
    col: Math.floor(worldX / CELL_SIZE),
    row: Math.floor(worldY / CELL_SIZE),
  };
}

export function gridToWorld(col: number, row: number): Point {
  return {
    x: col * CELL_SIZE,
    y: row * CELL_SIZE,
  };
}

export function screenToGrid(
  screenX: number,
  screenY: number,
  viewport: ViewportTransform
): GridCell {
  const world = screenToWorld(screenX, screenY, viewport);
  return worldToGrid(world.x, world.y);
}

export function gridCenterToScreen(
  col: number,
  row: number,
  viewport: ViewportTransform
): Point {
  const worldX = (col + 0.5) * CELL_SIZE;
  const worldY = (row + 0.5) * CELL_SIZE;
  return worldToScreen(worldX, worldY, viewport);
}

export function getVisibleGridBounds(
  canvasWidth: number,
  canvasHeight: number,
  viewport: ViewportTransform,
  gridWidth: number,
  gridHeight: number
): { minCol: number; maxCol: number; minRow: number; maxRow: number } {
  const topLeft = screenToWorld(0, 0, viewport);
  const bottomRight = screenToWorld(canvasWidth, canvasHeight, viewport);

  const minCol = Math.max(0, Math.floor(topLeft.x / CELL_SIZE));
  const maxCol = Math.min(gridWidth - 1, Math.ceil(bottomRight.x / CELL_SIZE));
  const minRow = Math.max(0, Math.floor(topLeft.y / CELL_SIZE));
  const maxRow = Math.min(gridHeight - 1, Math.ceil(bottomRight.y / CELL_SIZE));

  return { minCol, maxCol, minRow, maxRow };
}

export function getViewportCenterInGrid(
  canvasWidth: number,
  canvasHeight: number,
  viewport: ViewportTransform
): GridCell {
  const centerScreen = { x: canvasWidth / 2, y: canvasHeight / 2 };
  const world = screenToWorld(centerScreen.x, centerScreen.y, viewport);
  return worldToGrid(world.x, world.y);
}

export function calculateFitViewport(
  gridWidth: number,
  gridHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 20
): ViewportTransform {
  const worldWidth = gridWidth * CELL_SIZE;
  const worldHeight = gridHeight * CELL_SIZE;

  const scaleX = (canvasWidth - padding * 2) / worldWidth;
  const scaleY = (canvasHeight - padding * 2) / worldHeight;
  const scale = Math.min(scaleX, scaleY, 2); // Cap at 2x

  const scaledWidth = worldWidth * scale;
  const scaledHeight = worldHeight * scale;

  const translateX = (canvasWidth - scaledWidth) / 2;
  const translateY = (canvasHeight - scaledHeight) / 2;

  return { scale, translateX, translateY };
}

export function clampViewport(
  viewport: ViewportTransform,
  gridWidth: number,
  gridHeight: number,
  canvasWidth: number,
  canvasHeight: number
): ViewportTransform {
  const worldWidth = gridWidth * CELL_SIZE;
  const worldHeight = gridHeight * CELL_SIZE;

  // Calculate minimum scale to fit the pattern
  const minScaleX = canvasWidth / worldWidth;
  const minScaleY = canvasHeight / worldHeight;
  const minScale = Math.min(minScaleX, minScaleY) * 0.5;
  const maxScale = 4;

  const scale = Math.max(minScale, Math.min(maxScale, viewport.scale));

  // Clamp translation to keep pattern visible
  const scaledWidth = worldWidth * scale;
  const scaledHeight = worldHeight * scale;

  let translateX = viewport.translateX;
  let translateY = viewport.translateY;

  // Ensure at least some of the pattern is visible
  const margin = 100;
  translateX = Math.max(-(scaledWidth - margin), Math.min(canvasWidth - margin, translateX));
  translateY = Math.max(-(scaledHeight - margin), Math.min(canvasHeight - margin, translateY));

  return { scale, translateX, translateY };
}
