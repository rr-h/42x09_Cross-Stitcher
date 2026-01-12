/// <reference lib="dom" />

import type { PatternDoc, ViewportTransform } from '../types';
import { NO_STITCH, StitchState } from '../types';
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

  // Create gradient perpendicular to thread for cylinder effect
  const midX = (x0 + x1) / 2;
  const midY = (y0 + y1) / 2;
  const gradOffset = thickness * 0.9;

  const gradient = ctx.createLinearGradient(
    midX + nx * gradOffset,
    midY + ny * gradOffset,
    midX - nx * gradOffset,
    midY - ny * gradOffset
  );

  // Enhanced cylinder shading with more pronounced highlights and shadows
  const highlightR = Math.min(255, r + 120);
  const highlightG = Math.min(255, g + 120);
  const highlightB = Math.min(255, b + 120);

  const midHighR = Math.min(255, r + 60);
  const midHighG = Math.min(255, g + 60);
  const midHighB = Math.min(255, b + 60);

  const midShadowR = Math.max(0, r - 40);
  const midShadowG = Math.max(0, g - 40);
  const midShadowB = Math.max(0, b - 40);

  const shadowR = Math.max(0, r - 100);
  const shadowG = Math.max(0, g - 100);
  const shadowB = Math.max(0, b - 100);

  // More complex gradient for better roundness
  gradient.addColorStop(0, rgbToString(highlightR, highlightG, highlightB, 0.95));
  gradient.addColorStop(0.15, rgbToString(midHighR, midHighG, midHighB));
  gradient.addColorStop(0.35, color);
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(0.65, rgbToString(midShadowR, midShadowG, midShadowB));
  gradient.addColorStop(0.85, rgbToString(shadowR, shadowG, shadowB));
  gradient.addColorStop(1, rgbToString(shadowR, shadowG, shadowB, 0.9));

  // Draw ambient occlusion shadow at edges (darker at fabric contact points)
  if (!isTopStrand) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = thickness * 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // Draw main thread body
  ctx.strokeStyle = gradient;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  // Add primary specular highlight along the thread
  const highlightThickness = thickness * 0.2;
  const highlightDist = thickness * (0.3 + variationSeed * 0.05);

  ctx.strokeStyle = rgbToString(255, 255, 255, 0.6);
  ctx.lineWidth = highlightThickness;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + nx * highlightDist, y0 + ny * highlightDist);
  ctx.lineTo(x1 + nx * highlightDist, y1 + ny * highlightDist);
  ctx.stroke();

  // Add secondary specular highlight for more depth
  const highlight2Thickness = thickness * 0.12;
  const highlight2Dist = thickness * (0.35 + variationSeed * 0.08);

  ctx.strokeStyle = rgbToString(255, 255, 255, 0.35);
  ctx.lineWidth = highlight2Thickness;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + nx * highlight2Dist, y0 + ny * highlight2Dist);
  ctx.lineTo(x1 + nx * highlight2Dist, y1 + ny * highlight2Dist);
  ctx.stroke();

  // Add texture highlights to simulate twisted/braided thread fibers
  const numTextures = Math.max(2, Math.floor(len / (thickness * 2)));
  ctx.strokeStyle = rgbToString(255, 255, 255, 0.15);
  ctx.lineWidth = thickness * 0.08;
  ctx.lineCap = 'round';

  for (let i = 0; i < numTextures; i++) {
    const t = (i + 0.5) / numTextures;
    const tx = x0 + dx * t;
    const ty = y0 + dy * t;

    // Alternate sides for twisted appearance
    const side = (i % 2 === 0) ? 1 : -1;
    const texDist = thickness * 0.25 * side;
    const texLen = thickness * 0.3;

    ctx.beginPath();
    ctx.moveTo(tx + nx * texDist - ny * texLen * 0.5, ty + ny * texDist + nx * texLen * 0.5);
    ctx.lineTo(tx + nx * texDist + ny * texLen * 0.5, ty + ny * texDist - nx * texLen * 0.5);
    ctx.stroke();
  }
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
  const baseThickness = Math.max(4, cellScreenSize * 0.35);
  const thickness1 = baseThickness * randoms.thickness1;
  const thickness2 = baseThickness * randoms.thickness2;

  // Small random offsets for natural variation
  const maxOffset = cellScreenSize * 0.03;
  const ox1 = randoms.offsetX1 * maxOffset;
  const oy1 = randoms.offsetY1 * maxOffset;
  const ox2 = randoms.offsetX2 * maxOffset;
  const oy2 = randoms.offsetY2 * maxOffset;

  // Calculate center point for shadow
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

  // Draw shadow where top thread crosses bottom thread
  const shadowSize = Math.max(thickness2 * 1.3, baseThickness * 1.2);
  const shadowGradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    shadowSize
  );
  shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
  shadowGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.12)');
  shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = shadowGradient;
  ctx.fillRect(
    centerX - shadowSize,
    centerY - shadowSize,
    shadowSize * 2,
    shadowSize * 2
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
    randoms.highlight2,
    true
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
