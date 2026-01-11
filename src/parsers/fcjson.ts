import { z } from 'zod';
import type { PatternDoc, PaletteEntry, PatternMeta } from '../types';
import { NO_STITCH } from '../types';
import { hashString } from '../utils/hash';
import { assignSymbolsForPalette, MAX_PALETTE_SIZE } from '../symbols';

// Zod schemas for FCJSON validation
const FlossIndexSchema = z.object({
  rgb: z.array(z.number()).optional(),
  hex: z.number().optional(),
  sys: z.string().optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  symbol: z.string().optional(),
  order: z.number().optional(),
});

const CrossIndexSchema = z.object({
  tp: z.string(),
  fi: z.number(),
});

const LayerSchema = z.object({
  width: z.number(),
  height: z.number(),
  position: z.object({
    top: z.number(),
    left: z.number(),
  }).optional(),
  cross: z.array(z.number()).optional(),
});

const ImageSchema = z.object({
  width: z.number(),
  height: z.number(),
  flossIndexes: z.array(FlossIndexSchema),
  crossIndexes: z.array(CrossIndexSchema).optional(),
  layers: z.array(LayerSchema).optional(),
  cloth: z.any().optional(),
});

const FCJSONSchema = z.object({
  sv: z.number().optional(),
  v: z.number().optional(),
  model: z.object({
    images: z.array(ImageSchema),
  }),
  info: z.any().optional(),
});

// Intermediate type for palette entries before symbol assignment
interface PaletteEntryCandidate {
  paletteIndex: number;
  paletteId: string;
  name: string;
  brand?: string;
  code?: string;
  hex: string;
  symbol?: string; // Candidate symbol from FCJSON file (may be invalid/duplicate)
  totalTargets: number;
}

function hexNumberToString(hexNum: number): string {
  return '#' + hexNum.toString(16).padStart(6, '0');
}

function rgbToHex(rgb: number[]): string {
  if (rgb.length < 3) return '#000000';
  const [r, g, b] = rgb;
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export async function parseFCJSON(content: string): Promise<PatternDoc> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Invalid FCJSON file: not valid JSON');
  }

  const result = FCJSONSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid FCJSON file: ${result.error.message}`);
  }

  const data = result.data;
  const image = data.model.images[0];

  if (!image) {
    throw new Error('Invalid FCJSON file: no image data found');
  }

  const width = image.width;
  const height = image.height;

  if (width <= 0 || height <= 0) {
    throw new Error('Invalid FCJSON file: invalid dimensions');
  }

  const meta: PatternMeta = {
    title: (data.info as Record<string, unknown>)?.title as string | undefined,
  };

  // Build crossIndex to flossIndex map
  const crossToFloss = new Map<number, number>();
  if (image.crossIndexes) {
    image.crossIndexes.forEach((ci, idx) => {
      if (ci.tp === 'cr') {
        crossToFloss.set(idx, ci.fi);
      }
    });
  }

  // Check palette size limit
  const flossIndexes = image.flossIndexes;
  if (flossIndexes.length > MAX_PALETTE_SIZE) {
    throw new Error(
      `Palette has ${flossIndexes.length} colours but maximum supported is ${MAX_PALETTE_SIZE}. Reduce the number of colours.`
    );
  }

  // Create palette from flossIndexes with candidate symbols
  const paletteWithCandidates: PaletteEntryCandidate[] = flossIndexes.map((floss, i) => {
    let hex: string;
    if (floss.rgb && floss.rgb.length >= 3) {
      hex = rgbToHex(floss.rgb);
    } else if (floss.hex !== undefined) {
      hex = hexNumberToString(floss.hex);
    } else {
      hex = '#000000';
    }

    const sys = floss.sys || '';
    const brand = sys === 'DMC' ? 'DMC' : sys === 'ANC' ? 'Anchor' : sys || undefined;

    // Extract candidate symbol from FCJSON
    // Only accept single-character symbols as candidates
    const rawSymbol = floss.symbol;
    const candidateSymbol =
      rawSymbol && rawSymbol.trim().length === 1 ? rawSymbol.trim() : undefined;

    return {
      paletteIndex: i,
      paletteId: `floss-${i}`,
      name: floss.name || `Color ${i}`,
      brand,
      code: floss.id || undefined,
      hex,
      symbol: candidateSymbol,
      totalTargets: 0,
    };
  });

  // Initialize targets array
  const targets = new Uint16Array(width * height);
  targets.fill(NO_STITCH);

  // Parse cross stitch data from layers
  const layer = image.layers?.[0];
  if (layer?.cross) {
    const cross = layer.cross;
    const layerWidth = layer.width;
    const offsetTop = layer.position?.top ?? 0;
    const offsetLeft = layer.position?.left ?? 0;

    for (let i = 0; i < cross.length; i++) {
      const crossIdx = cross[i];
      if (crossIdx < 0) continue; // -1 typically means no stitch

      const layerRow = Math.floor(i / layerWidth);
      const layerCol = i % layerWidth;

      const targetRow = layerRow + offsetTop;
      const targetCol = layerCol + offsetLeft;

      if (targetRow >= 0 && targetRow < height && targetCol >= 0 && targetCol < width) {
        // Map crossIndex to flossIndex
        const flossIdx = crossToFloss.get(crossIdx);
        if (flossIdx !== undefined && flossIdx >= 0 && flossIdx < paletteWithCandidates.length) {
          const cellIndex = targetRow * width + targetCol;
          targets[cellIndex] = flossIdx;
          paletteWithCandidates[flossIdx].totalTargets++;
        }
      }
    }
  }

  // Assign symbols using the central pool
  // This ensures unique valid symbols, handling duplicates/invalid candidates from FCJSON
  const palette: PaletteEntry[] = assignSymbolsForPalette(paletteWithCandidates, {
    allowProvidedSymbols: true,
    preferProvidedSymbols: true,
    conflictPolicy: 'reassign',
    startingOffset: 0,
  });

  // Generate pattern ID from content hash
  const id = await hashString(content);

  return {
    id,
    width,
    height,
    palette,
    targets,
    meta,
  };
}
