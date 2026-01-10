import type { PatternDoc, ViewportTransform } from '../types';
import { StitchState, NO_STITCH } from '../types';
import { CELL_SIZE, getVisibleGridBounds, worldToScreen } from './coordinates';
import { getCellRandoms } from './random';

// Colors
const FABRIC_COLOR = '#F5F0E8';
const GRID_COLOR = '#D0C8C0';
const SYMBOL_COLOR = '#666666';

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  pattern: PatternDoc;
  stitchedState: Uint8Array;
  selectedPaletteIndex: number | null;
  viewport: ViewportTransform;
  canvasWidth: number;
  canvasHeight: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function lightenColor(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const newR = Math.min(255, Math.round(r + (255 - r) * amount));
  const newG = Math.min(255, Math.round(g + (255 - g) * amount));
  const newB = Math.min(255, Math.round(b + (255 - b) * amount));
  return `rgb(${newR}, ${newG}, ${newB})`;
}

function darkenColor(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const newR = Math.round(r * (1 - amount));
  const newG = Math.round(g * (1 - amount));
  const newB = Math.round(b * (1 - amount));
  return `rgb(${newR}, ${newG}, ${newB})`;
}

function drawFabricBackground(rc: RenderContext): void {
  const { ctx, canvasWidth, canvasHeight } = rc;

  // Fill with fabric color
  ctx.fillStyle = FABRIC_COLOR;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Add subtle weave texture
  const scale = rc.viewport.scale;
  if (scale > 0.3) {
    ctx.globalAlpha = Math.min(0.15, 0.05 * scale);
    ctx.strokeStyle = '#CCC5BD';
    ctx.lineWidth = 1;

    const spacing = 4 * scale;
    for (let x = 0; x < canvasWidth; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function drawGrid(rc: RenderContext): void {
  const { ctx, pattern, viewport, canvasWidth, canvasHeight } = rc;
  const bounds = getVisibleGridBounds(canvasWidth, canvasHeight, viewport, pattern.width, pattern.height);

  const scale = viewport.scale;
  const cellScreenSize = CELL_SIZE * scale;

  // Don't draw grid if zoomed out too far
  if (cellScreenSize < 4) return;

  // Fade grid at low zoom levels
  const gridAlpha = Math.min(1, (cellScreenSize - 4) / 20);
  ctx.globalAlpha = gridAlpha * 0.4;
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;

  ctx.beginPath();

  // Vertical lines
  for (let col = bounds.minCol; col <= bounds.maxCol + 1; col++) {
    const screen = worldToScreen(col * CELL_SIZE, 0, viewport);
    ctx.moveTo(screen.x, 0);
    ctx.lineTo(screen.x, canvasHeight);
  }

  // Horizontal lines
  for (let row = bounds.minRow; row <= bounds.maxRow + 1; row++) {
    const screen = worldToScreen(0, row * CELL_SIZE, viewport);
    ctx.moveTo(0, screen.y);
    ctx.lineTo(canvasWidth, screen.y);
  }

  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawSymbol(
  ctx: CanvasRenderingContext2D,
  symbol: string,
  screenX: number,
  screenY: number,
  cellScreenSize: number
): void {
  const fontSize = Math.max(8, Math.min(cellScreenSize * 0.6, 24));
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.fillStyle = SYMBOL_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, screenX + cellScreenSize / 2, screenY + cellScreenSize / 2);
}

function drawRealisticStitch(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  cellScreenSize: number,
  color: string,
  col: number,
  row: number
): void {
  const randoms = getCellRandoms(col, row);
  const padding = cellScreenSize * 0.1;
  const x0 = screenX + padding;
  const y0 = screenY + padding;
  const x1 = screenX + cellScreenSize - padding;
  const y1 = screenY + cellScreenSize - padding;

  const baseThickness = Math.max(2, cellScreenSize * 0.12);

  // Draw first strand (bottom-left to top-right)
  drawStrand(
    ctx,
    x0 + randoms.offsetX1,
    y1 + randoms.offsetY1,
    x1 + randoms.offsetX1,
    y0 + randoms.offsetY1,
    baseThickness * randoms.thickness1,
    color,
    randoms.highlight1
  );

  // Draw second strand (top-left to bottom-right) - on top
  drawStrand(
    ctx,
    x0 + randoms.offsetX2,
    y0 + randoms.offsetY2,
    x1 + randoms.offsetX2,
    y1 + randoms.offsetY2,
    baseThickness * randoms.thickness2,
    color,
    randoms.highlight2
  );
}

function drawStrand(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number,
  color: string,
  highlightAmount: number
): void {
  // Calculate perpendicular direction for highlight
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len;
  const ny = dx / len;

  // Draw shadow
  ctx.strokeStyle = darkenColor(color, 0.3);
  ctx.lineWidth = thickness + 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + 1, y0 + 1);
  ctx.lineTo(x1 + 1, y1 + 1);
  ctx.stroke();

  // Draw main thread
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  // Draw highlight
  const highlightOffset = thickness * 0.3;
  ctx.strokeStyle = lightenColor(color, highlightAmount);
  ctx.lineWidth = thickness * 0.4;
  ctx.beginPath();
  ctx.moveTo(x0 + nx * highlightOffset, y0 + ny * highlightOffset);
  ctx.lineTo(x1 + nx * highlightOffset, y1 + ny * highlightOffset);
  ctx.stroke();
}

function drawWrongIndicator(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  cellScreenSize: number
): void {
  const centerX = screenX + cellScreenSize / 2;
  const centerY = screenY + cellScreenSize / 2;
  const fontSize = Math.max(12, Math.min(cellScreenSize * 0.5, 28));

  // Draw background circle
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(centerX, centerY, fontSize * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Draw outline
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw exclamation mark
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', centerX, centerY);
}

export function renderCanvas(rc: RenderContext): void {
  const { ctx, pattern, stitchedState, viewport, canvasWidth, canvasHeight } = rc;

  // Clear and draw background
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  drawFabricBackground(rc);
  drawGrid(rc);

  const bounds = getVisibleGridBounds(canvasWidth, canvasHeight, viewport, pattern.width, pattern.height);
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
        // Draw symbol for unstitched cells
        const paletteEntry = pattern.palette[targetIndex];
        if (paletteEntry && cellScreenSize > 10) {
          drawSymbol(ctx, paletteEntry.symbol, screen.x, screen.y, cellScreenSize);
        }
      } else {
        // Draw stitch
        // For correct stitch, use the target color
        // For wrong stitch, we still show the stitch but in wrong position indication
        const paletteEntry = pattern.palette[targetIndex];
        if (paletteEntry) {
          drawRealisticStitch(ctx, screen.x, screen.y, cellScreenSize, paletteEntry.hex, col, row);
        }

        // Draw wrong indicator
        if (state === StitchState.Wrong) {
          drawWrongIndicator(ctx, screen.x, screen.y, cellScreenSize);
        }
      }
    }
  }
}

// For offscreen caching optimization (future enhancement)
export function createOffscreenCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
