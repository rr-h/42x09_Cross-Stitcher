/// <reference lib="dom" />

import type { PatternDoc, ViewportTransform } from '../types';
import { NO_STITCH, StitchState } from '../types';
import { hexToRgb, rgbToString } from './colors';
import { CELL_SIZE, getVisibleGridBounds, worldToScreen } from './coordinates';
import { getCellRandoms } from './random';

// Colors matching the sample image - dark fabric with visible weave holes
export const FABRIC_COLOR = '#F5F0E8';
export const FABRIC_HOLE_COLOR = '#F5F0E8';
export const SYMBOL_COLOR = '#888888';
export const SELECTED_COLOR_HIGHLIGHT = 'rgba(100, 149, 237, 0.3)'; // Light blue highlight for selected color cells

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  pattern: PatternDoc;
  stitchedState: Uint8Array;
  placedColors: Uint16Array;
  selectedPaletteIndex: number | null;
  viewport: ViewportTransform;
  canvasWidth: number;
  canvasHeight: number;
}

export function drawFabricBackground(rc: RenderContext): void {
  const { ctx, canvasWidth, canvasHeight, viewport, pattern } = rc;

  // Fill with dark fabric color
  ctx.fillStyle = FABRIC_COLOR;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const scale = viewport.scale;
  const cellScreenSize = CELL_SIZE * scale;

  // Only draw fabric holes if zoomed in enough
  if (cellScreenSize < 6) return;

  const bounds = getVisibleGridBounds(
    canvasWidth,
    canvasHeight,
    viewport,
    pattern.width,
    pattern.height
  );

  // Draw fabric holes (small dots at each corner of cells)
  const holeRadius = Math.max(1, Math.min(cellScreenSize * 0.08, 4));
  ctx.fillStyle = FABRIC_HOLE_COLOR;

  for (let row = bounds.minRow; row <= bounds.maxRow + 1; row++) {
    for (let col = bounds.minCol; col <= bounds.maxCol + 1; col++) {
      const screen = worldToScreen(col * CELL_SIZE, row * CELL_SIZE, viewport);

      ctx.beginPath();
      ctx.arc(screen.x, screen.y, holeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawSymbol(
  ctx: CanvasRenderingContext2D,
  symbol: string,
  screenX: number,
  screenY: number,
  cellScreenSize: number
): void {
  const fontSize = Math.max(8, Math.min(cellScreenSize * 0.5, 20));
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.fillStyle = SYMBOL_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, screenX + cellScreenSize / 2, screenY + cellScreenSize / 2);
}

// Draw a single thread strand with realistic embroidery thread appearance
export function drawThreadStrand(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number,
  color: string,
  variationSeed: number,
  isTopStrand: boolean = false
): void {
  const { r, g, b } = hexToRgb(color);

  // Calculate direction and perpendicular
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;

  const nx = -dy / len;
  const ny = dx / len;

  // Subtle soft shadow for bottom strand
  if (!isTopStrand) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = thickness * 0.5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = thickness * 1.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }

  // Create soft gradient perpendicular to thread
  const midX = (x0 + x1) / 2;
  const midY = (y0 + y1) / 2;
  const gradOffset = thickness * 0.7;

  const gradient = ctx.createLinearGradient(
    midX + nx * gradOffset,
    midY + ny * gradOffset,
    midX - nx * gradOffset,
    midY - ny * gradOffset
  );

  // Subtle, soft shading - much less contrast than before
  const highlightR = Math.min(255, r + 50);
  const highlightG = Math.min(255, g + 50);
  const highlightB = Math.min(255, b + 50);

  const midHighR = Math.min(255, r + 25);
  const midHighG = Math.min(255, g + 25);
  const midHighB = Math.min(255, b + 25);

  const midShadowR = Math.max(0, r - 20);
  const midShadowG = Math.max(0, g - 20);
  const midShadowB = Math.max(0, b - 20);

  const shadowR = Math.max(0, r - 45);
  const shadowG = Math.max(0, g - 45);
  const shadowB = Math.max(0, b - 45);

  // Smooth, subtle gradient
  gradient.addColorStop(0, rgbToString(highlightR, highlightG, highlightB));
  gradient.addColorStop(0.2, rgbToString(midHighR, midHighG, midHighB));
  gradient.addColorStop(0.4, color);
  gradient.addColorStop(0.6, color);
  gradient.addColorStop(0.8, rgbToString(midShadowR, midShadowG, midShadowB));
  gradient.addColorStop(1, rgbToString(shadowR, shadowG, shadowB));

  // Draw main thread body with soft edges
  ctx.save();
  ctx.shadowColor = rgbToString(r, g, b, 0.3);
  ctx.shadowBlur = thickness * 0.3;

  ctx.strokeStyle = gradient;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();

  // Add subtle diagonal striations along the thread direction
  const numStriations = Math.max(8, Math.floor(len / (thickness * 0.8)));

  for (let i = 0; i < numStriations; i++) {
    const t = i / numStriations;
    const alpha = 0.03 + Math.sin(t * Math.PI) * 0.02; // Subtle variation

    // Draw thin striation along thread direction
    const offset = ((i % 3) - 1) * thickness * 0.15; // Slight offset for variation
    const sx0 = x0 + dx * t + nx * offset;
    const sy0 = y0 + dy * t + ny * offset;
    const sx1 = x0 + dx * (t + 0.15) + nx * offset;
    const sy1 = y0 + dy * (t + 0.15) + ny * offset;

    ctx.strokeStyle = rgbToString(255, 255, 255, alpha);
    ctx.lineWidth = thickness * 0.15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx0, sy0);
    ctx.lineTo(sx1, sy1);
    ctx.stroke();
  }

  // Add very soft highlight along the lit side
  const highlightOffset = thickness * (0.2 + variationSeed * 0.05);

  ctx.save();
  ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
  ctx.shadowBlur = thickness * 0.4;

  ctx.strokeStyle = rgbToString(255, 255, 255, 0.25);
  ctx.lineWidth = thickness * 0.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + nx * highlightOffset, y0 + ny * highlightOffset);
  ctx.lineTo(x1 + nx * highlightOffset, y1 + ny * highlightOffset);
  ctx.stroke();
  ctx.restore();

  // Add even softer secondary highlight
  ctx.strokeStyle = rgbToString(255, 255, 255, 0.15);
  ctx.lineWidth = thickness * 0.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + nx * highlightOffset * 1.2, y0 + ny * highlightOffset * 1.2);
  ctx.lineTo(x1 + nx * highlightOffset * 1.2, y1 + ny * highlightOffset * 1.2);
  ctx.stroke();
}

// Draw a realistic cross stitch with two crossing threads
export function drawRealisticStitch(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  cellScreenSize: number,
  color: string,
  col: number,
  row: number
): void {
  const randoms = getCellRandoms(col, row);

  // Padding from cell edges - leave room for fabric holes to show
  const padding = cellScreenSize * 0.15;
  const x0 = screenX + padding;
  const y0 = screenY + padding;
  const x1 = screenX + cellScreenSize - padding;
  const y1 = screenY + cellScreenSize - padding;

  // Thread thickness - slightly thicker for realistic look
  const baseThickness = Math.max(4, cellScreenSize * 0.36);
  const thickness1 = baseThickness * randoms.thickness1;
  const thickness2 = baseThickness * randoms.thickness2;

  // Small random offsets for natural variation
  const maxOffset = cellScreenSize * 0.03;
  const ox1 = randoms.offsetX1 * maxOffset;
  const oy1 = randoms.offsetY1 * maxOffset;
  const ox2 = randoms.offsetX2 * maxOffset;
  const oy2 = randoms.offsetY2 * maxOffset;

  // Calculate center point for soft shadow
  const centerX = screenX + cellScreenSize / 2;
  const centerY = screenY + cellScreenSize / 2;

  // Draw first strand (bottom-left to top-right) - UNDER
  drawThreadStrand(
    ctx,
    x0 + ox1,
    y1 + oy1,
    x1 + ox1,
    y0 + oy1,
    thickness1,
    color,
    randoms.highlight1,
    false
  );

  // Draw very subtle shadow where top thread crosses bottom thread
  const shadowSize = Math.max(thickness2 * 1.5, baseThickness * 1.4);
  const shadowGradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    shadowSize
  );
  shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.12)');
  shadowGradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.06)');
  shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = shadowGradient;
  ctx.fillRect(centerX - shadowSize, centerY - shadowSize, shadowSize * 2, shadowSize * 2);

  // Draw second strand (top-left to bottom-right) - OVER
  // This creates the proper X crossing pattern
  drawThreadStrand(
    ctx,
    x0 + ox2,
    y0 + oy2,
    x1 + ox2,
    y1 + oy2,
    thickness2,
    color,
    randoms.highlight2,
    true
  );
}

export function drawWrongIndicator(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  cellScreenSize: number
): void {
  const centerX = screenX + cellScreenSize / 2;
  const centerY = screenY + cellScreenSize / 2;
  const radius = Math.max(8, cellScreenSize * 0.22);
  const fontSize = Math.max(10, radius * 1.5);

  // Draw yellow circle background
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw black outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1.5, radius * 0.12);
  ctx.stroke();

  // Draw exclamation mark
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', centerX, centerY + 1);
}

export function renderCanvas(rc: RenderContext): void {
  const {
    ctx,
    pattern,
    stitchedState,
    placedColors,
    selectedPaletteIndex,
    viewport,
    canvasWidth,
    canvasHeight,
  } = rc;

  // Clear and draw background with fabric holes
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  drawFabricBackground(rc);

  const bounds = getVisibleGridBounds(
    canvasWidth,
    canvasHeight,
    viewport,
    pattern.width,
    pattern.height
  );
  const cellScreenSize = CELL_SIZE * viewport.scale;

  // Draw cells
  for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
    for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
      const cellIndex = row * pattern.width + col;
      const targetIndex = pattern.targets[cellIndex];

      if (targetIndex === NO_STITCH) continue;

      const screen = worldToScreen(col * CELL_SIZE, row * CELL_SIZE, viewport);
      const state = stitchedState[cellIndex];

      if (state === StitchState.None) {
        // Highlight cells that match the selected palette color
        if (selectedPaletteIndex !== null && targetIndex === selectedPaletteIndex) {
          ctx.fillStyle = SELECTED_COLOR_HIGHLIGHT;
          ctx.fillRect(screen.x, screen.y, cellScreenSize, cellScreenSize);
        }

        // Draw symbol for unstitched cells
        const paletteEntry = pattern.palette[targetIndex];
        if (paletteEntry && cellScreenSize > 12) {
          drawSymbol(ctx, paletteEntry.symbol, screen.x, screen.y, cellScreenSize);
        }
      } else {
        // Draw stitch - use placed color for wrong stitches, target color for correct ones
        let colorIndex: number;
        if (state === StitchState.Wrong) {
          colorIndex = placedColors[cellIndex];
        } else {
          colorIndex = targetIndex;
        }

        const paletteEntry = pattern.palette[colorIndex];
        if (paletteEntry) {
          drawRealisticStitch(ctx, screen.x, screen.y, cellScreenSize, paletteEntry.hex, col, row);
        }

        // Draw wrong indicator overlay
        if (state === StitchState.Wrong) {
          drawWrongIndicator(ctx, screen.x, screen.y, cellScreenSize);
        }
      }
    }
  }
}

export function createOffscreenCanvas(
  width: number,
  height: number
): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
