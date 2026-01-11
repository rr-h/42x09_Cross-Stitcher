import { colorDistance, DMC_COLORS, rgbToHex, type DMCColor } from '../data/dmcColors';
import type { PaletteEntry, PatternDoc, PatternMeta } from '../types';
import { NO_STITCH } from '../types';
import { hashString } from '../utils/hash';

export interface ImageConversionOptions {
  maxWidth: number;
  maxHeight: number;
  maxColors: number;
  useDMCColors: boolean;
  title?: string;
}

export const DEFAULT_OPTIONS: ImageConversionOptions = {
  maxWidth: 150,
  maxHeight: 150,
  maxColors: 64,
  useDMCColors: true,
};

// Fallback symbols for non-DMC colours (quantised without DMC mapping)
const FALLBACK_SYMBOLS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#$%&*+-=~^<>!?/|';

interface ColorCount {
  rgb: [number, number, number];
  count: number;
}

interface ColorBox {
  colors: ColorCount[];
  rMin: number;
  rMax: number;
  gMin: number;
  gMax: number;
  bMin: number;
  bMax: number;
}

// Load image from file and return HTMLImageElement
async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// Calculate target dimensions maintaining aspect ratio
function calculateDimensions(
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = imgWidth / imgHeight;

  let width = maxWidth;
  let height = Math.round(width / aspectRatio);

  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspectRatio);
  }

  return { width: Math.max(1, width), height: Math.max(1, height) };
}

// Get pixel data from image at target dimensions
function getImagePixels(img: HTMLImageElement, width: number, height: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Use high-quality downscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

// Extract unique colours from image data with counts
function extractColors(imageData: ImageData): Map<string, ColorCount> {
  const colorMap = new Map<string, ColorCount>();
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip transparent pixels
    if (a < 128) continue;

    const key = `${r},${g},${b}`;
    const existing = colorMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorMap.set(key, { rgb: [r, g, b], count: 1 });
    }
  }

  return colorMap;
}

// Calculate bounds for a box of colours
function calculateBounds(colors: ColorCount[]): Omit<ColorBox, 'colors'> {
  let rMin = 255,
    rMax = 0;
  let gMin = 255,
    gMax = 0;
  let bMin = 255,
    bMax = 0;

  for (const { rgb } of colors) {
    rMin = Math.min(rMin, rgb[0]);
    rMax = Math.max(rMax, rgb[0]);
    gMin = Math.min(gMin, rgb[1]);
    gMax = Math.max(gMax, rgb[1]);
    bMin = Math.min(bMin, rgb[2]);
    bMax = Math.max(bMax, rgb[2]);
  }

  return { rMin, rMax, gMin, gMax, bMin, bMax };
}

// Median Cut colour quantisation algorithm
function medianCut(colors: ColorCount[], numColors: number): [number, number, number][] {
  if (colors.length === 0) return [];
  if (colors.length <= numColors) {
    return colors.map(c => c.rgb);
  }

  // Initialise with one box containing all colours
  const initialBounds = calculateBounds(colors);
  const boxes: ColorBox[] = [{ colors, ...initialBounds }];

  // Split boxes until we have enough
  while (boxes.length < numColors) {
    // Find box with largest range (weighted by pixel count)
    let maxVolume = 0;
    let maxBoxIndex = 0;

    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const rRange = box.rMax - box.rMin;
      const gRange = box.gMax - box.gMin;
      const bRange = box.bMax - box.bMin;
      const volume = Math.max(rRange, gRange, bRange);

      if (volume > maxVolume && box.colors.length > 1) {
        maxVolume = volume;
        maxBoxIndex = i;
      }
    }

    // No more boxes can be split
    if (maxVolume === 0) break;

    const boxToSplit = boxes[maxBoxIndex];

    // Find which channel has the largest range
    const rRange = boxToSplit.rMax - boxToSplit.rMin;
    const gRange = boxToSplit.gMax - boxToSplit.gMin;
    const bRange = boxToSplit.bMax - boxToSplit.bMin;

    let channel: 0 | 1 | 2;
    if (rRange >= gRange && rRange >= bRange) {
      channel = 0;
    } else if (gRange >= bRange) {
      channel = 1;
    } else {
      channel = 2;
    }

    // Sort by the selected channel
    boxToSplit.colors.sort((a, b) => a.rgb[channel] - b.rgb[channel]);

    // Find median by pixel count
    let totalCount = 0;
    for (const c of boxToSplit.colors) totalCount += c.count;

    let cumCount = 0;
    let medianIndex = Math.floor(boxToSplit.colors.length / 2);
    for (let i = 0; i < boxToSplit.colors.length; i++) {
      cumCount += boxToSplit.colors[i].count;
      if (cumCount >= totalCount / 2) {
        medianIndex = Math.max(1, i);
        break;
      }
    }

    // Split into two boxes
    const colors1 = boxToSplit.colors.slice(0, medianIndex);
    const colors2 = boxToSplit.colors.slice(medianIndex);

    if (colors1.length > 0 && colors2.length > 0) {
      boxes.splice(maxBoxIndex, 1);
      boxes.push({ colors: colors1, ...calculateBounds(colors1) });
      boxes.push({ colors: colors2, ...calculateBounds(colors2) });
    } else {
      break;
    }
  }

  // Calculate average colour for each box (weighted by pixel count)
  return boxes.map(box => {
    let totalR = 0,
      totalG = 0,
      totalB = 0,
      totalCount = 0;
    for (const { rgb, count } of box.colors) {
      totalR += rgb[0] * count;
      totalG += rgb[1] * count;
      totalB += rgb[2] * count;
      totalCount += count;
    }
    return [
      Math.round(totalR / totalCount),
      Math.round(totalG / totalCount),
      Math.round(totalB / totalCount),
    ] as [number, number, number];
  });
}

// Map a colour to the closest palette colour index
function findClosestPaletteIndex(
  rgb: [number, number, number],
  palette: [number, number, number][]
): number {
  let minDist = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < palette.length; i++) {
    const dist = colorDistance(rgb, palette[i]);
    if (dist < minDist) {
      minDist = dist;
      closestIndex = i;
    }
  }

  return closestIndex;
}

// Map quantised colours to closest DMC colours, avoiding duplicates where possible
function mapToDMC(
  quantizedColors: [number, number, number][]
): { dmc: DMCColor; originalRgb: [number, number, number] }[] {
  const usedCodes = new Set<string>();
  const result: { dmc: DMCColor; originalRgb: [number, number, number] }[] = [];

  for (const rgb of quantizedColors) {
    let bestDMC: DMCColor | null = null;
    let bestDist = Infinity;

    // Find closest DMC, penalising already-used colours
    for (const dmc of DMC_COLORS) {
      const dist = colorDistance(rgb, dmc.rgb);
      const adjustedDist = usedCodes.has(dmc.code) ? dist * 1.5 : dist;

      if (adjustedDist < bestDist) {
        bestDist = adjustedDist;
        bestDMC = dmc;
      }
    }

    if (bestDMC) {
      usedCodes.add(bestDMC.code);
      result.push({ dmc: bestDMC, originalRgb: rgb });
    }
  }

  return result;
}

// Main conversion function
export async function convertImageToPattern(
  file: File,
  options: ImageConversionOptions = DEFAULT_OPTIONS
): Promise<PatternDoc> {
  // Load and resize image
  const img = await loadImage(file);
  const { width, height } = calculateDimensions(
    img.width,
    img.height,
    options.maxWidth,
    options.maxHeight
  );

  const imageData = getImagePixels(img, width, height);
  URL.revokeObjectURL(img.src);

  // Extract unique colours
  const colorMap = extractColors(imageData);
  const colorCounts = Array.from(colorMap.values());

  // Quantise colours using median cut
  const quantizedColors = medianCut(colorCounts, options.maxColors);

  // Build palette
  let palette: PaletteEntry[];
  let paletteRgb: [number, number, number][];

  if (options.useDMCColors) {
    // Map to DMC colours, using built-in DMC symbols
    const dmcMappings = mapToDMC(quantizedColors);

    palette = dmcMappings.map((mapping, i) => ({
      paletteIndex: i,
      paletteId: `dmc-${mapping.dmc.code}`,
      name: mapping.dmc.name,
      brand: 'DMC',
      code: mapping.dmc.code,
      hex: mapping.dmc.hex,
      symbol: mapping.dmc.symbol,
      totalTargets: 0,
    }));

    paletteRgb = dmcMappings.map(m => m.dmc.rgb);
  } else {
    // Use quantised colours directly with fallback symbols
    palette = quantizedColors.map((rgb, i) => ({
      paletteIndex: i,
      paletteId: `color-${i}`,
      name: `Colour ${i + 1}`,
      hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
      symbol: FALLBACK_SYMBOLS[i % FALLBACK_SYMBOLS.length],
      totalTargets: 0,
    }));

    paletteRgb = quantizedColors;
  }

  // Create targets array: map each pixel to closest palette colour
  const targets = new Uint16Array(width * height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = (y * width + x) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const a = data[pixelIndex + 3];

      const cellIndex = y * width + x;

      if (a < 128) {
        // Transparent pixel, no stitch
        targets[cellIndex] = NO_STITCH;
      } else {
        // Find closest palette colour directly
        const paletteIdx = findClosestPaletteIndex([r, g, b], paletteRgb);
        targets[cellIndex] = paletteIdx;
        palette[paletteIdx].totalTargets++;
      }
    }
  }

  // Remove unused palette entries and remap targets
  const usedPaletteIndices = new Set<number>();
  for (let i = 0; i < targets.length; i++) {
    if (targets[i] !== NO_STITCH) {
      usedPaletteIndices.add(targets[i]);
    }
  }

  const usedIndicesArray = Array.from(usedPaletteIndices).sort((a, b) => a - b);
  const indexRemap = new Map<number, number>();
  const newPalette: PaletteEntry[] = [];

  for (let newIndex = 0; newIndex < usedIndicesArray.length; newIndex++) {
    const oldIndex = usedIndicesArray[newIndex];
    indexRemap.set(oldIndex, newIndex);

    const entry = { ...palette[oldIndex] };
    entry.paletteIndex = newIndex;
    // Keep the original DMC symbol (no re-assignment needed)
    newPalette.push(entry);
  }

  // Remap targets to new indices
  for (let i = 0; i < targets.length; i++) {
    if (targets[i] !== NO_STITCH) {
      targets[i] = indexRemap.get(targets[i])!;
    }
  }

  // Generate pattern ID
  const contentForHash = `${file.name}-${width}x${height}-${options.maxColors}-${Date.now()}`;
  const id = await hashString(contentForHash);

  // Build metadata
  const meta: PatternMeta = {
    title: options.title || file.name.replace(/\.[^/.]+$/, ''),
    author: 'Image Converter',
    instructions: `Converted from ${file.name} (${img.width}x${img.height} to ${width}x${height})`,
    stitchesPerInch: 14,
  };

  return {
    id,
    width,
    height,
    palette: newPalette,
    targets,
    meta,
  };
}

// Check if a file is a supported image type
export function isImageFile(file: File): boolean {
  const imageTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/bmp',
  ];
  return imageTypes.includes(file.type);
}

// Get image dimensions without fully loading
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const img = await loadImage(file);
  const result = { width: img.width, height: img.height };
  URL.revokeObjectURL(img.src);
  return result;
}
