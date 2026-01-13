/// <reference lib="dom" />

import type { PatternDoc, ViewportTransform } from '../types';
import { NO_STITCH, StitchState } from '../types';
import { hexToRgb, rgbToString } from './colors';
import { CELL_SIZE, getVisibleGridBounds, worldToScreen } from './coordinates';
import { getCellRandoms } from './random';

// Fabric tuning
export const FABRIC_COLOR = '#F5F0E8';
export const FABRIC_WEAVE_DARK = 'rgba(0, 0, 0, 0.06)';
export const FABRIC_WEAVE_LIGHT = 'rgba(255, 255, 255, 0.07)';
export const FABRIC_GRID_LINE = 'rgba(0, 0, 0, 0.05)';
export const FABRIC_HOLE_DARK = 'rgba(0, 0, 0, 0.14)';
export const FABRIC_HOLE_LIGHT = 'rgba(255, 255, 255, 0.12)';

// UI colours
export const SYMBOL_COLOR = '#888888';
export const SELECTED_COLOR_HIGHLIGHT = 'rgba(100, 149, 237, 0.3)';

// Thread tuning (used)
const THREAD_NOISE_ALPHA = 0.14;
const THREAD_GROOVE_ALPHA = 0.16;
const THREAD_TWIST_ALPHA = 0.26;
const THREAD_EDGE_DARKEN = 0.16;

const NOISE_TILE_SIZE = 48;

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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// 0 at ends, 1 in the middle
function taper01(t: number): number {
  const a = smoothstep(0.0, 0.16, t);
  const b = 1.0 - smoothstep(0.84, 1.0, t);
  return Math.min(a, b);
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
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

// ---- Noise tiles (cached) ----

const noiseTileCache = new Map<string, HTMLCanvasElement | OffscreenCanvas>();

function getNoiseTile(
  size: number,
  alpha: number,
  seed: number
): HTMLCanvasElement | OffscreenCanvas {
  const key = `${size}|${alpha}|${seed}`;
  const cached = noiseTileCache.get(key);
  if (cached) return cached;

  const c = createOffscreenCanvas(size, size);
  const nctx = c.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!nctx) return c;

  const rng = mulberry32(seed);
  const img = nctx.createImageData(size, size);
  const d = img.data;
  const a = Math.floor(clamp(alpha, 0, 1) * 255);

  for (let i = 0; i < d.length; i += 4) {
    const v = Math.floor(rng() * 255);
    d[i + 0] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = a;
  }

  nctx.putImageData(img, 0, 0);
  noiseTileCache.set(key, c);
  return c;
}

// ---- Fabric pattern (cached) ----

const fabricPatternCache = new Map<string, CanvasPattern>();

function getFabricPattern(
  ctx: CanvasRenderingContext2D,
  cellScreenSize: number
): CanvasPattern | null {
  const q = Math.max(6, Math.min(64, Math.round(cellScreenSize)));
  const key = `fabric|${q}`;
  const cached = fabricPatternCache.get(key);
  if (cached) return cached;

  const tileSize = clamp(Math.round(q * 2.2), 24, 128);
  const weaveStep = clamp(Math.round(q * 0.18), 3, 10);

  const canvas = createOffscreenCanvas(tileSize, tileSize);
  const c2d = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!c2d) return null;

  c2d.fillStyle = FABRIC_COLOR;
  c2d.fillRect(0, 0, tileSize, tileSize);

  // Subtle noise to avoid banding/posterisation
  {
    const noise = getNoiseTile(64, 0.08, 1337);
    c2d.save();
    c2d.globalCompositeOperation = 'soft-light';
    c2d.drawImage(noise as any, 0, 0, tileSize, tileSize);
    c2d.restore();
  }

  // Horizontal weave
  c2d.save();
  for (let y = 0; y < tileSize + weaveStep; y += weaveStep) {
    const w = 1 + ((y / weaveStep) % 3);
    c2d.fillStyle = (y / weaveStep) % 2 === 0 ? FABRIC_WEAVE_DARK : FABRIC_WEAVE_LIGHT;
    c2d.fillRect(0, y, tileSize, w);
  }
  c2d.restore();

  // Vertical weave (multiply to look like crossing threads)
  c2d.save();
  c2d.globalCompositeOperation = 'multiply';
  for (let x = 0; x < tileSize + weaveStep; x += weaveStep) {
    const w = 1 + ((x / weaveStep) % 3);
    c2d.fillStyle = 'rgba(0, 0, 0, 0.045)';
    c2d.fillRect(x, 0, w, tileSize);
  }
  c2d.restore();

  // Weave holes at intersections
  const holeR = clamp(q * 0.04, 0.7, 2.2);
  c2d.save();
  for (let y = 0; y < tileSize + weaveStep; y += weaveStep) {
    for (let x = 0; x < tileSize + weaveStep; x += weaveStep) {
      const gx = x + 0.5;
      const gy = y + 0.5;

      const grad = c2d.createRadialGradient(gx, gy, 0, gx, gy, holeR * 2.2);
      grad.addColorStop(0, FABRIC_HOLE_DARK);
      grad.addColorStop(0.6, 'rgba(0,0,0,0.05)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      c2d.fillStyle = grad;
      c2d.beginPath();
      c2d.arc(gx, gy, holeR * 2.2, 0, Math.PI * 2);
      c2d.fill();

      c2d.fillStyle = FABRIC_HOLE_LIGHT;
      c2d.beginPath();
      c2d.arc(gx - holeR * 0.35, gy - holeR * 0.35, holeR * 0.65, 0, Math.PI * 2);
      c2d.fill();
    }
  }
  c2d.restore();

  const pattern = ctx.createPattern(canvas as any, 'repeat');
  if (!pattern) return null;

  fabricPatternCache.set(key, pattern);
  return pattern;
}

// Cover the stitch ends so they look like they disappear into the cloth.
function drawHoleOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fabricHex: string
): void {
  const { r: fr, g: fg, b: fb } = hexToRgb(fabricHex);

  ctx.save();

  ctx.fillStyle = rgbToString(fr, fg, fb, 0.92);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.fill();

  const g1 = ctx.createRadialGradient(x, y, 0, x, y, r * 1.9);
  g1.addColorStop(0, 'rgba(0, 0, 0, 0.22)');
  g1.addColorStop(0.5, 'rgba(0, 0, 0, 0.10)');
  g1.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = g1;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
  ctx.fill();

  const hx = x - r * 0.35;
  const hy = y - r * 0.35;
  const g2 = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 1.1);
  g2.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
  g2.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.arc(hx, hy, r * 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawFabricBackground(rc: RenderContext): void {
  const { ctx, canvasWidth, canvasHeight, viewport, pattern } = rc;

  const cellScreenSize = CELL_SIZE * viewport.scale;

  ctx.fillStyle = FABRIC_COLOR;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (cellScreenSize < 7) return;

  const fabricPat = getFabricPattern(ctx, cellScreenSize);
  if (fabricPat) {
    ctx.save();
    ctx.fillStyle = fabricPat;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();
  }

  // Faint grid lines
  if (cellScreenSize >= 10) {
    const bounds = getVisibleGridBounds(
      canvasWidth,
      canvasHeight,
      viewport,
      pattern.width,
      pattern.height
    );

    ctx.save();
    ctx.strokeStyle = FABRIC_GRID_LINE;
    ctx.lineWidth = 1;

    for (let col = bounds.minCol; col <= bounds.maxCol + 1; col++) {
      const x = worldToScreen(col * CELL_SIZE, 0, viewport).x;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }

    for (let row = bounds.minRow; row <= bounds.maxRow + 1; row++) {
      const y = worldToScreen(0, row * CELL_SIZE, viewport).y;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }

    ctx.restore();
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

// Tapered, textured ribbon strand that fades into holes.
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
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return;

  const { r, g, b } = hexToRgb(color);

  const seed =
    ((Math.floor(variationSeed * 1_000_000) ^ (isTopStrand ? 0xa5a5a5a5 : 0x5a5a5a5a)) >>> 0) ^
    (Math.floor(thickness * 1000) * 2654435761);
  const rng = mulberry32(seed >>> 0);

  const angle = Math.atan2(dy, dx);
  const half = thickness / 2;

  // Depth shadow: stronger on bottom strand
  if (!isTopStrand) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = thickness * 0.75;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = thickness * 1.08;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(angle);

  // Gentle centreline bend, endpoints fixed
  const bend = (rng() * 2 - 1) * thickness * (isTopStrand ? 0.06 : 0.09);

  // Ribbon polygon (tapered)
  const segments = clamp(Math.floor(len / 6), 12, 26);
  const top: Array<[number, number]> = [];
  const bot: Array<[number, number]> = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = len * t;

    const tt = taper01(t);
    const widthFactor = 0.16 + 0.84 * tt;

    const jitter = 0.96 + (rng() - 0.5) * 0.06;
    const w = half * widthFactor * jitter;

    const cy = bend * Math.sin(Math.PI * t) * (0.25 + 0.75 * tt);

    top.push([x, cy - w]);
    bot.push([x, cy + w]);
  }

  ctx.beginPath();
  ctx.moveTo(top[0][0], top[0][1]);
  for (let i = 1; i < top.length; i++) ctx.lineTo(top[i][0], top[i][1]);
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
  ctx.closePath();
  ctx.clip();

  // Base cross-section shading (more stops, less banding)
  const maxHalf = half;
  const grad = ctx.createLinearGradient(0, -maxHalf, 0, maxHalf);

  const hiR = clamp(r + 52 + (rng() - 0.5) * 10, 0, 255);
  const hiG = clamp(g + 52 + (rng() - 0.5) * 10, 0, 255);
  const hiB = clamp(b + 52 + (rng() - 0.5) * 10, 0, 255);

  const mhR = clamp(r + 26 + (rng() - 0.5) * 8, 0, 255);
  const mhG = clamp(g + 26 + (rng() - 0.5) * 8, 0, 255);
  const mhB = clamp(b + 26 + (rng() - 0.5) * 8, 0, 255);

  const mlR = clamp(r - 18 + (rng() - 0.5) * 8, 0, 255);
  const mlG = clamp(g - 18 + (rng() - 0.5) * 8, 0, 255);
  const mlB = clamp(b - 18 + (rng() - 0.5) * 8, 0, 255);

  const loR = clamp(r - 46 + (rng() - 0.5) * 10, 0, 255);
  const loG = clamp(g - 46 + (rng() - 0.5) * 10, 0, 255);
  const loB = clamp(b - 46 + (rng() - 0.5) * 10, 0, 255);

  grad.addColorStop(0.0, rgbToString(hiR, hiG, hiB));
  grad.addColorStop(0.18, rgbToString(mhR, mhG, mhB));
  grad.addColorStop(0.42, color);
  grad.addColorStop(0.58, color);
  grad.addColorStop(0.82, rgbToString(mlR, mlG, mlB));
  grad.addColorStop(1.0, rgbToString(loR, loG, loB));

  ctx.fillStyle = grad;
  ctx.fillRect(0, -maxHalf - 2, len, thickness + 4);

  // Edge darkening (rounded cross-section feel)
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = `rgba(0,0,0,${THREAD_EDGE_DARKEN})`;
  ctx.lineCap = 'round';
  ctx.lineWidth = clamp(thickness * 0.1, 0.7, 2.0);

  ctx.beginPath();
  ctx.moveTo(0, -maxHalf * 0.92);
  ctx.lineTo(len, -maxHalf * 0.92);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, maxHalf * 0.92);
  ctx.lineTo(len, maxHalf * 0.92);
  ctx.stroke();
  ctx.restore();

  // Fibre noise to kill "plastic poster"
  {
    const noise = getNoiseTile(NOISE_TILE_SIZE, THREAD_NOISE_ALPHA, seed ^ 0x12345678);
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.drawImage(noise as any, 0, -maxHalf, len, thickness);
    ctx.restore();
  }

  // Grooves (subtle)
  {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = `rgba(0,0,0,${THREAD_GROOVE_ALPHA})`;
    ctx.lineCap = 'round';

    const grooves = clamp(Math.floor(thickness * 1.2), 6, 18);
    const step = clamp(thickness * 0.55, 2, 6);

    for (let i = 0; i < grooves; i++) {
      const baseY = (rng() * 2 - 1) * maxHalf * 0.78;
      const w = clamp(thickness * (0.035 + rng() * 0.02), 0.4, 1.2);
      ctx.lineWidth = w;

      ctx.beginPath();
      for (let x = 0; x <= len; x += step) {
        const y = baseY + Math.sin(x / (thickness * 1.2) + rng() * 2) * (thickness * 0.03);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  // Twist highlight
  {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `rgba(255,255,255,${THREAD_TWIST_ALPHA})`;
    ctx.lineWidth = clamp(thickness * 0.24, 0.8, thickness * 0.34);
    ctx.lineCap = 'round';

    const step = clamp(thickness * 0.55, 2, 6);

    ctx.beginPath();
    for (let x = 0; x <= len; x += step) {
      const t = x / Math.max(1, len);
      const phase = t * Math.PI * 2 * 1.05 + variationSeed * Math.PI * 2;
      const y = -maxHalf * 0.18 + Math.sin(phase) * (maxHalf * 0.22);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  // End fade mask LAST so every layer (noise, grooves, highlight) also fades into holes
  {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    const aGrad = ctx.createLinearGradient(0, 0, len, 0);
    aGrad.addColorStop(0.0, 'rgba(0,0,0,0)');
    aGrad.addColorStop(0.14, 'rgba(0,0,0,1)');
    aGrad.addColorStop(0.86, 'rgba(0,0,0,1)');
    aGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = aGrad;
    ctx.fillRect(0, -maxHalf - 6, len, thickness + 12);
    ctx.restore();
  }

  // Optional fuzz (only when zoomed in)
  if (thickness >= 9) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const x = rng() * len;
      const t = x / Math.max(1, len);
      const tt = taper01(t);
      const side = rng() < 0.5 ? -1 : 1;
      const y = side * (maxHalf * (0.85 + rng() * 0.15));
      const out = side * (maxHalf * (1.05 + rng() * 0.25));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 2, y + (out - y));
      ctx.globalAlpha = 0.03 + 0.05 * tt;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  ctx.restore();
}

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

  // Cheap fallback when zoomed out
  if (cellScreenSize < 12) {
    const pad = cellScreenSize * 0.18;
    const x0 = screenX + pad;
    const y0 = screenY + pad;
    const x1 = screenX + cellScreenSize - pad;
    const y1 = screenY + cellScreenSize - pad;

    const t = Math.max(1.2, cellScreenSize * 0.16);
    ctx.strokeStyle = color;
    ctx.lineWidth = t;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y1);
    ctx.lineTo(x1, y0);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    return;
  }

  // Hole centres (fixed endpoints, variation happens inside the strand)
  const inset = clamp(cellScreenSize * 0.06, 1.0, cellScreenSize * 0.14);
  const hxL = screenX + inset;
  const hxR = screenX + cellScreenSize - inset;
  const hyT = screenY + inset;
  const hyB = screenY + cellScreenSize - inset;

  const baseThickness = Math.max(2.2, cellScreenSize * 0.3);
  const thickness1 = baseThickness * randoms.thickness1;
  const thickness2 = baseThickness * randoms.thickness2;

  // Underlay bed shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
  ctx.shadowBlur = baseThickness * 0.9;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
  ctx.lineWidth = baseThickness * 0.9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hxL, hyB);
  ctx.lineTo(hxR, hyT);
  ctx.moveTo(hxL, hyT);
  ctx.lineTo(hxR, hyB);
  ctx.stroke();
  ctx.restore();

  // Bottom strand (BL -> TR)
  drawThreadStrand(ctx, hxL, hyB, hxR, hyT, thickness1, color, randoms.highlight1, false);

  // Centre shadow for crossing depth
  const cx = screenX + cellScreenSize / 2;
  const cy = screenY + cellScreenSize / 2;
  const shadowSize = Math.max(thickness2 * 1.15, baseThickness * 1.05);
  const sGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, shadowSize);
  sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.14)');
  sGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.06)');
  sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sGrad;
  ctx.fillRect(cx - shadowSize, cy - shadowSize, shadowSize * 2, shadowSize * 2);

  // Top strand (TL -> BR)
  drawThreadStrand(ctx, hxL, hyT, hxR, hyB, thickness2, color, randoms.highlight2, true);

  // Hole overlays (hide blunt ends, sell "goes into cloth")
  const holeR = clamp(cellScreenSize * 0.07, 1.2, 3.6);
  drawHoleOverlay(ctx, hxL, hyT, holeR, FABRIC_COLOR);
  drawHoleOverlay(ctx, hxR, hyT, holeR, FABRIC_COLOR);
  drawHoleOverlay(ctx, hxL, hyB, holeR, FABRIC_COLOR);
  drawHoleOverlay(ctx, hxR, hyB, holeR, FABRIC_COLOR);
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

  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1.5, radius * 0.12);
  ctx.stroke();

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

  for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
    for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
      const cellIndex = row * pattern.width + col;
      const targetIndex = pattern.targets[cellIndex];
      if (targetIndex === NO_STITCH) continue;

      const screen = worldToScreen(col * CELL_SIZE, row * CELL_SIZE, viewport);
      const state = stitchedState[cellIndex];

      if (state === StitchState.None) {
        if (selectedPaletteIndex !== null && targetIndex === selectedPaletteIndex) {
          ctx.fillStyle = SELECTED_COLOR_HIGHLIGHT;
          ctx.fillRect(screen.x, screen.y, cellScreenSize, cellScreenSize);
        }

        const paletteEntry = pattern.palette[targetIndex];
        if (paletteEntry && cellScreenSize > 12) {
          drawSymbol(ctx, paletteEntry.symbol, screen.x, screen.y, cellScreenSize);
        }
      } else {
        const colourIndex = state === StitchState.Wrong ? placedColors[cellIndex] : targetIndex;
        const paletteEntry = pattern.palette[colourIndex];
        if (paletteEntry) {
          drawRealisticStitch(ctx, screen.x, screen.y, cellScreenSize, paletteEntry.hex, col, row);
        }

        if (state === StitchState.Wrong) {
          drawWrongIndicator(ctx, screen.x, screen.y, cellScreenSize);
        }
      }
    }
  }
}
