import type { PatternDoc, ViewportTransform } from '../types';
import { StitchState, NO_STITCH } from '../types';
import { CELL_SIZE, getVisibleGridBounds, worldToScreen } from './coordinates';
import { getCellRandoms } from './random';

// Colors matching the sample image - dark fabric with visible weave holes
const FABRIC_COLOR = '#F5F0E8';
const FABRIC_HOLE_COLOR = '#F5F0E8';
const SYMBOL_COLOR = '#888888';
const SELECTED_COLOR_HIGHLIGHT = 'rgba(100, 149, 237, 0.3)'; // Light blue highlight for selected color cells

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  pattern: PatternDoc;
  stitchedState: Uint8Array;
  placedColors: Uint16Array;
  selectedPaletteIndex: number | null;
  viewport: ViewportTransform;
  canvasWidth: number;
  canvasHeight: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 128, g: 128, b: 128 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbToString(r: number, g: number, b: number, a: number = 1): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

function drawFabricBackground(rc: RenderContext): void {
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

function drawSymbol(
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

// Draw a single thread strand with realistic 3D cylinder effect
function drawThreadStrand(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number,
  color: string,
  variationSeed: number
): void {
  const { r, g, b } = hexToRgb(color);

  // Calculate direction and perpendicular
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;

  const nx = -dy / len;
  const ny = dx / len;

  // Create gradient perpendicular to thread for cylinder effect
  const midX = (x0 + x1) / 2;
  const midY = (y0 + y1) / 2;
  const gradOffset = thickness * 0.8;

  const gradient = ctx.createLinearGradient(
    midX + nx * gradOffset,
    midY + ny * gradOffset,
    midX - nx * gradOffset,
    midY - ny * gradOffset
  );

  // Cylinder shading - bright highlight, main color, shadow
  const highlightR = Math.min(255, r + 100);
  const highlightG = Math.min(255, g + 100);
  const highlightB = Math.min(255, b + 100);

  const shadowR = Math.max(0, r - 80);
  const shadowG = Math.max(0, g - 80);
  const shadowB = Math.max(0, b - 80);

  gradient.addColorStop(0, rgbToString(highlightR, highlightG, highlightB));
  gradient.addColorStop(0.25, rgbToString(r + 30, g + 30, b + 30));
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(0.75, rgbToString(r - 20, g - 20, b - 20));
  gradient.addColorStop(1, rgbToString(shadowR, shadowG, shadowB));

  // Draw main thread body
  ctx.strokeStyle = gradient;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  // Add specular highlight
  const highlightThickness = thickness * 0.15;
  const highlightDist = thickness * (0.25 + variationSeed * 0.1);

  ctx.strokeStyle = rgbToString(255, 255, 255, 0.4);
  ctx.lineWidth = highlightThickness;
  ctx.beginPath();
  ctx.moveTo(x0 + nx * highlightDist, y0 + ny * highlightDist);
  ctx.lineTo(x1 + nx * highlightDist, y1 + ny * highlightDist);
  ctx.stroke();
}

// Draw a realistic cross stitch with two crossing threads
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

  // Padding from cell edges - leave room for fabric holes to show
  const padding = cellScreenSize * 0.15;
  const x0 = screenX + padding;
  const y0 = screenY + padding;
  const x1 = screenX + cellScreenSize - padding;
  const y1 = screenY + cellScreenSize - padding;

  // Thread thickness - thicker for more realistic look
  const baseThickness = Math.max(3, cellScreenSize * 0.22);
  const thickness1 = baseThickness * randoms.thickness1;
  const thickness2 = baseThickness * randoms.thickness2;

  // Small random offsets for natural variation
  const maxOffset = cellScreenSize * 0.03;
  const ox1 = randoms.offsetX1 * maxOffset;
  const oy1 = randoms.offsetY1 * maxOffset;
  const ox2 = randoms.offsetX2 * maxOffset;
  const oy2 = randoms.offsetY2 * maxOffset;

  // Draw first strand (bottom-left to top-right) - UNDER
  drawThreadStrand(
    ctx,
    x0 + ox1,
    y1 + oy1,
    x1 + ox1,
    y0 + oy1,
    thickness1,
    color,
    randoms.highlight1
  );

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
    randoms.highlight2
  );
}

function drawWrongIndicator(
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
  const { ctx, pattern, stitchedState, placedColors, selectedPaletteIndex, viewport, canvasWidth, canvasHeight } = rc;

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
