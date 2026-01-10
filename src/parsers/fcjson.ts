import { z } from 'zod';
import type { PatternDoc, PaletteEntry, PatternMeta } from '../types';
import { NO_STITCH } from '../types';
import { hashString } from '../utils/hash';

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

const SYMBOLS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#$%&*+-=~^<>!?/|';

function getSymbol(index: number, providedSymbol?: string): string {
  if (providedSymbol && providedSymbol.trim()) {
    // Extract a simple character from symbol codes like "sm0", "sm28"
    const match = providedSymbol.match(/sm(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return SYMBOLS[num % SYMBOLS.length];
    }
    return providedSymbol.trim().charAt(0) || SYMBOLS[index % SYMBOLS.length];
  }
  return SYMBOLS[index % SYMBOLS.length];
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

  // Create palette from flossIndexes
  const flossIndexes = image.flossIndexes;
  const palette: PaletteEntry[] = flossIndexes.map((floss, i) => {
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

    return {
      paletteIndex: i,
      paletteId: `floss-${i}`,
      name: floss.name || `Color ${i}`,
      brand,
      code: floss.id || undefined,
      hex,
      symbol: getSymbol(i, floss.symbol),
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
        if (flossIdx !== undefined && flossIdx >= 0 && flossIdx < palette.length) {
          const cellIndex = targetRow * width + targetCol;
          targets[cellIndex] = flossIdx;
          palette[flossIdx].totalTargets++;
        }
      }
    }
  }

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
