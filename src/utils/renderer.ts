/// <reference lib="dom" />

import type { PatternDoc, ViewportTransform } from '../types';
import { NO_STITCH, StitchState } from '../types';
import { hexToRgb } from './colors';
import { CELL_SIZE, getVisibleGridBounds, worldToScreen } from './coordinates';
import { getCellRandoms } from './random';

/*
  Sprite-based stitch renderer (cloth removed)

  Assets expected under public/:
    /assets/stitches/multiple-sprites-large.png
    /assets/stitches/multiple-sprites-large-alpha-high.png

  Changes:
  - No cloth sprite is drawn.
  - Pattern area gets a flat backing colour.
  - A border is drawn around the pattern bounds.
*/

// -----------------------------
// Required exports (must remain)
// -----------------------------
export const FABRIC_COLOR = '#F5F0E8';

export const FABRIC_HOLE_DARK = 'rgba(0, 0, 0, 0.14)';
export const FABRIC_HOLE_LIGHT = 'rgba(255, 255, 255, 0.12)';
export const FABRIC_WEAVE_DARK = 'rgba(0, 0, 0, 0.06)';
export const FABRIC_WEAVE_LIGHT = 'rgba(255, 255, 255, 0.07)';

export const SYMBOL_COLOR = '#666666';
export const SELECTED_COLOR_HIGHLIGHT = 'rgba(100, 149, 237, 0.28)';

export const FABRIC_GRID_LINE = 'rgba(0, 0, 0, 0.05)';

// -----------------------------
// Pattern backing + border settings
// -----------------------------
const CANVAS_BG_COLOR = '#EFEDE7'; // outside-pattern area
const PATTERN_BG_COLOR = FABRIC_COLOR; // inside-pattern backing
const PATTERN_BORDER_COLOR = 'rgba(0, 0, 0, 0.25)';
const PATTERN_BORDER_WIDTH_PX = 2; // screen pixels

// -----------------------------
// Asset URLs (public/)
// -----------------------------
const BASE_URL = import.meta.env.BASE_URL; // includes the GitHub Pages subpath
const STITCH_SHEET_URL = `${BASE_URL}assets/stitches/multiple-sprites-large.png`;
const STITCH_ALPHA_SHEET_URL = `${BASE_URL}assets/stitches/multiple-sprites-large-alpha-high.png`;
// -----------------------------
// Tunables
// -----------------------------
const STITCH_SHADOW_ALPHA = 0.1;
const STITCH_HIGHLIGHT_PASS_ALPHA = 0.22;
const STITCH_NOISE_ALPHA = 0.08;
const STITCH_CONTRAST_LIFT_ALPHA = 0.1;

const MAX_STAMP_CACHE = 1200;
const VARIANTS = 3;

// -----------------------------
// Types
// -----------------------------
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

type Rect = { sx: number; sy: number; sw: number; sh: number };

type LoadedAssets = {
  stitchSheet: ImageBitmap;
  stitchAlphaSheet: ImageBitmap;
  variantRects: Rect[];
  alphaMasks: Array<OffscreenCanvas | HTMLCanvasElement>;
};

// -----------------------------
// Module state
// -----------------------------
let assets: LoadedAssets | null = null;
let assetsPromise: Promise<void> | null = null;
let assetsFailed = false;

const stampCache = new Map<string, OffscreenCanvas | HTMLCanvasElement>();
const noiseCache = new Map<string, OffscreenCanvas | HTMLCanvasElement>();

// -----------------------------
// Utilities
// -----------------------------
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function quantiseSize(px: number): number {
  if (px < 18) return 18;
  if (px < 24) return 24;
  if (px < 32) return 32;
  if (px < 48) return 48;
  if (px < 64) return 64;
  if (px < 96) return 96;
  return 128;
}

function hash2(a: number, b: number): number {
  let x = (a * 73856093) ^ (b * 19349663);
  x = (x ^ (x >>> 13)) >>> 0;
  x = Math.imul(x, 1274126177) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
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

function evictIfNeeded(): void {
  if (stampCache.size <= MAX_STAMP_CACHE) return;
  const toRemove = stampCache.size - MAX_STAMP_CACHE;
  const it = stampCache.keys();
  for (let i = 0; i < toRemove; i++) {
    const k = it.next().value as string | undefined;
    if (!k) break;
    stampCache.delete(k);
  }
}

function noiseTile(size: number, alpha: number, seed: number): OffscreenCanvas | HTMLCanvasElement {
  const key = `${size}|${alpha}|${seed}`;
  const cached = noiseCache.get(key);
  if (cached) return cached;

  const c = createOffscreenCanvas(size, size);
  const nctx = c.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!nctx) return c;

  let s = seed >>> 0;
  const img = nctx.createImageData(size, size);
  const d = img.data;
  const a = Math.floor(clamp(alpha, 0, 1) * 255);

  for (let i = 0; i < d.length; i += 4) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    const v = (s >>> 24) & 255;
    d[i + 0] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = a;
  }

  nctx.putImageData(img, 0, 0);
  noiseCache.set(key, c);
  return c;
}

function getPatternScreenRect(rc: RenderContext): { x: number; y: number; w: number; h: number } {
  const { pattern, viewport } = rc;
  const tl = worldToScreen(0, 0, viewport);
  const br = worldToScreen(pattern.width * CELL_SIZE, pattern.height * CELL_SIZE, viewport);
  const x = Math.min(tl.x, br.x);
  const y = Math.min(tl.y, br.y);
  const w = Math.abs(br.x - tl.x);
  const h = Math.abs(br.y - tl.y);
  return { x, y, w, h };
}

// -----------------------------
// Asset loading
// -----------------------------
async function loadBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  const blob = await res.blob();
  const fn = globalThis.createImageBitmap;
  return await fn(blob);
}

function ensureAssetsLoading(): void {
  if (assets || assetsPromise || assetsFailed) return;
  void initRenderAssets();
}

// Optional: call once at app start. Also auto-starts on first render if not called.
export function initRenderAssets(): Promise<void> {
  if (assets) return Promise.resolve();
  if (assetsPromise) return assetsPromise;

  assetsPromise = (async () => {
    try {
      const [stitchSheet, stitchAlphaSheet] = await Promise.all([
        loadBitmap(STITCH_SHEET_URL),
        loadBitmap(STITCH_ALPHA_SHEET_URL),
      ]);

      const { variantRects, alphaMasks } = buildVariantRectsAndMasks(stitchAlphaSheet);

      assets = {
        stitchSheet,
        stitchAlphaSheet,
        variantRects,
        alphaMasks,
      };
    } catch {
      assetsFailed = true;
    }
  })();

  return assetsPromise;
}

function buildVariantRectsAndMasks(alphaSheet: ImageBitmap): {
  variantRects: Rect[];
  alphaMasks: Array<OffscreenCanvas | HTMLCanvasElement>;
} {
  const w = alphaSheet.width;
  const h = alphaSheet.height;
  const segH = Math.floor(h / VARIANTS);

  const sheetCanvas = createOffscreenCanvas(w, h);
  const sctx = sheetCanvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;

  const rects: Rect[] = [];
  const masks: Array<OffscreenCanvas | HTMLCanvasElement> = [];

  if (!sctx) {
    for (let v = 0; v < VARIANTS; v++) {
      const side = Math.min(w, segH);
      const rect = { sx: 0, sy: v * segH, sw: side, sh: side };
      rects.push(rect);
      masks.push(makeAlphaMask(alphaSheet, rect));
    }
    return { variantRects: rects, alphaMasks: masks };
  }

  sctx.clearRect(0, 0, w, h);
  sctx.drawImage(alphaSheet as any, 0, 0);

  for (let v = 0; v < VARIANTS; v++) {
    const segTop = v * segH;
    const img = sctx.getImageData(0, segTop, w, segH);
    const d = img.data;

    let alphaVaries = false;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] !== 255) {
        alphaVaries = true;
        break;
      }
    }

    const threshold = 20;
    let minX = w,
      minY = segH,
      maxX = -1,
      maxY = -1;

    for (let y = 0; y < segH; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const r = d[idx + 0];
        const g = d[idx + 1];
        const b = d[idx + 2];
        const a = d[idx + 3];
        const mask = alphaVaries ? a : Math.max(r, g, b);
        if (mask > threshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < 0 || maxY < 0) {
      const side = Math.min(w, segH);
      const sx = Math.floor((w - side) / 2);
      const sy = segTop + Math.floor((segH - side) / 2);
      const rect = { sx, sy, sw: side, sh: side };
      rects.push(rect);
      masks.push(makeAlphaMask(alphaSheet, rect));
      continue;
    }

    const pad = 2;
    minX = clamp(minX - pad, 0, w - 1);
    minY = clamp(minY - pad, 0, segH - 1);
    maxX = clamp(maxX + pad, 0, w - 1);
    maxY = clamp(maxY + pad, 0, segH - 1);

    const bbW = maxX - minX + 1;
    const bbH = maxY - minY + 1;
    const side = Math.min(w, segH, Math.max(bbW, bbH));

    const cx = minX + bbW / 2;
    const cy = minY + bbH / 2;

    let sx = Math.floor(cx - side / 2);
    let syLocal = Math.floor(cy - side / 2);

    sx = clamp(sx, 0, w - side);
    syLocal = clamp(syLocal, 0, segH - side);

    const rect = { sx, sy: segTop + syLocal, sw: side, sh: side };
    rects.push(rect);
    masks.push(makeAlphaMask(alphaSheet, rect));
  }

  return { variantRects: rects, alphaMasks: masks };
}

function makeAlphaMask(alphaSheet: ImageBitmap, rect: Rect): OffscreenCanvas | HTMLCanvasElement {
  const c = createOffscreenCanvas(rect.sw, rect.sh);
  const cctx = c.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!cctx) return c;

  cctx.clearRect(0, 0, rect.sw, rect.sh);
  cctx.drawImage(alphaSheet as any, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, rect.sw, rect.sh);

  const img = cctx.getImageData(0, 0, rect.sw, rect.sh);
  const d = img.data;

  let alphaVaries = false;
  for (let i = 3; i < d.length; i += 4) {
    if (d[i] !== 255) {
      alphaVaries = true;
      break;
    }
  }

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i + 0];
    const g = d[i + 1];
    const b = d[i + 2];
    const a = d[i + 3];
    const mask = alphaVaries ? a : Math.max(r, g, b);

    d[i + 0] = 255;
    d[i + 1] = 255;
    d[i + 2] = 255;
    d[i + 3] = mask;
  }

  cctx.putImageData(img, 0, 0);
  return c;
}

// -----------------------------
// Required export: drawFabricBackground
// Now means: draw plain background and pattern backing
// -----------------------------
export function drawFabricBackground(rc: RenderContext): void {
  const { ctx, canvasWidth, canvasHeight } = rc;

  // Outside-pattern area
  ctx.fillStyle = CANVAS_BG_COLOR;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Pattern backing (flat)
  const rect = getPatternScreenRect(rc);
  if (rect.w <= 0 || rect.h <= 0) return;

  ctx.save();
  ctx.fillStyle = PATTERN_BG_COLOR;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawPatternBorder(rc: RenderContext): void {
  const { ctx } = rc;
  const rect = getPatternScreenRect(rc);
  if (rect.w <= 0 || rect.h <= 0) return;

  ctx.save();
  ctx.strokeStyle = PATTERN_BORDER_COLOR;
  ctx.lineWidth = PATTERN_BORDER_WIDTH_PX;

  // Crisp lines: align stroke to pixel grid
  const half = PATTERN_BORDER_WIDTH_PX / 2;
  ctx.strokeRect(
    Math.round(rect.x) + half,
    Math.round(rect.y) + half,
    Math.round(rect.w) - PATTERN_BORDER_WIDTH_PX,
    Math.round(rect.h) - PATTERN_BORDER_WIDTH_PX
  );
  ctx.restore();
}

function drawGridLines(rc: RenderContext, cellScreenSize: number): void {
  const { ctx, canvasWidth, canvasHeight, viewport, pattern } = rc;
  if (cellScreenSize < 12) return;

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

// -----------------------------
// Required export: drawSymbol
// -----------------------------
export function drawSymbol(
  ctx: CanvasRenderingContext2D,
  symbol: string,
  screenX: number,
  screenY: number,
  cellScreenSize: number
): void {
  const fontSize = Math.max(8, Math.min(cellScreenSize * 0.48, 20));
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.fillStyle = SYMBOL_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, screenX + cellScreenSize / 2, screenY + cellScreenSize / 2);
}

// -----------------------------
// Sprite stamp generation
// -----------------------------
function makeTintedStamp(
  hex: string,
  size: number,
  variant: number,
  flipX: boolean,
  flipY: boolean
): OffscreenCanvas | HTMLCanvasElement {
  const key = `stamp|${hex}|${size}|v${variant}|fx${flipX ? 1 : 0}|fy${flipY ? 1 : 0}`;
  const cached = stampCache.get(key);
  if (cached) return cached;

  const c = createOffscreenCanvas(size, size);
  const sctx = c.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!sctx || !assets) return c;

  const v = clamp(variant, 0, VARIANTS - 1);
  const rect = assets.variantRects[v];
  const alphaMask = assets.alphaMasks[v];

  sctx.clearRect(0, 0, size, size);
  sctx.imageSmoothingEnabled = true;

  sctx.save();
  if (flipX || flipY) {
    sctx.translate(flipX ? size : 0, flipY ? size : 0);
    sctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  }

  // Base colour
  sctx.globalCompositeOperation = 'source-over';
  sctx.fillStyle = hex;
  sctx.fillRect(0, 0, size, size);

  // Multiply shading
  sctx.globalCompositeOperation = 'multiply';
  sctx.drawImage(assets.stitchSheet as any, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, size, size);

  // Lift crushed blacks slightly
  sctx.globalCompositeOperation = 'screen';
  sctx.globalAlpha = STITCH_CONTRAST_LIFT_ALPHA;
  sctx.fillStyle = '#3a3a3a';
  sctx.fillRect(0, 0, size, size);

  // Restore highlights
  sctx.globalAlpha = STITCH_HIGHLIGHT_PASS_ALPHA;
  sctx.drawImage(assets.stitchSheet as any, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, size, size);
  sctx.globalAlpha = 1;

  // Dither/noise
  sctx.globalCompositeOperation = 'soft-light';
  const n = noiseTile(
    48,
    STITCH_NOISE_ALPHA,
    hash2(size, v) ^ hash2(hex.length, hex.charCodeAt(1) || 0)
  );
  sctx.drawImage(n as any, 0, 0, size, size);

  // Apply alpha mask last
  sctx.globalCompositeOperation = 'destination-in';
  sctx.drawImage(alphaMask as any, 0, 0, size, size);

  sctx.restore();

  stampCache.set(key, c);
  evictIfNeeded();
  return c;
}

// -----------------------------
// Required export: drawThreadStrand
// Sprite system draws full stitches, but keep this for API compatibility.
// -----------------------------
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

  if (!isTopStrand) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
    ctx.shadowBlur = thickness * 0.6;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = thickness * 1.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }

  const { r, g, b } = hexToRgb(color);

  ctx.save();
  ctx.strokeStyle = `rgb(${r},${g},${b})`;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();

  const n = noiseTile(
    32,
    0.1,
    hash2(Math.floor(variationSeed * 10000), Math.floor(thickness * 100))
  );
  ctx.globalCompositeOperation = 'soft-light';
  ctx.drawImage(
    n as any,
    Math.min(x0, x1) - 8,
    Math.min(y0, y1) - 8,
    Math.abs(dx) + 16,
    Math.abs(dy) + 16
  );

  ctx.restore();
}

// -----------------------------
// Required export: drawRealisticStitch
// -----------------------------
export function drawRealisticStitch(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  cellScreenSize: number,
  colorHex: string,
  col: number,
  row: number
): void {
  if (!assets && !assetsFailed) ensureAssetsLoading();

  const drawFallback = (): void => {
    const pad = cellScreenSize * 0.18;
    const x0 = screenX + pad;
    const y0 = screenY + pad;
    const x1 = screenX + cellScreenSize - pad;
    const y1 = screenY + cellScreenSize - pad;

    ctx.save();
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = Math.max(1.2, cellScreenSize * 0.16);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y1);
    ctx.lineTo(x1, y0);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  };

  if (!assets || cellScreenSize < 10) {
    drawFallback();
    return;
  }

  const q = quantiseSize(cellScreenSize);

  const h = hash2(col, row);
  const variant = h % VARIANTS;
  const flipX = ((h >>> 2) & 1) === 1;
  const flipY = ((h >>> 3) & 1) === 1;

  const stamp = makeTintedStamp(colorHex, q, variant, flipX, flipY);

  const rnd = getCellRandoms(col, row);
  const jitter = clamp(q * 0.01, 0.0, 0.6);
  const jx = (rnd.offsetX1 - 0.5) * jitter;
  const jy = (rnd.offsetY1 - 0.5) * jitter;

  ctx.save();
  ctx.imageSmoothingEnabled = true;

  ctx.shadowColor = `rgba(0,0,0,${STITCH_SHADOW_ALPHA})`;
  ctx.shadowBlur = q * 0.1;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  const inset = clamp(cellScreenSize * 0.05, 0.8, 2.8);
  const scale = 1.1; // 10% bigger
  const base = cellScreenSize - inset * 2;
  const ds = base * scale;
  const dx = screenX + inset + jx;
  const dy = screenY + inset + jy;

  ctx.drawImage(stamp as any, dx, dy, ds, ds);

  ctx.restore();
}

// -----------------------------
// Required export: drawWrongIndicator
// -----------------------------
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

// -----------------------------
// Required export: renderCanvas
// -----------------------------
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

  // Flat background + pattern backing
  drawFabricBackground(rc);

  const bounds = getVisibleGridBounds(
    canvasWidth,
    canvasHeight,
    viewport,
    pattern.width,
    pattern.height
  );

  const cellScreenSize = CELL_SIZE * viewport.scale;

  // Grid inside the pattern only (optional but helpful)
  drawGridLines(rc, cellScreenSize);

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

  // Border on top so it is always visible
  drawPatternBorder(rc);
}
