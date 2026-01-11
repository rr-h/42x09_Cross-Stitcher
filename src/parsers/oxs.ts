import { XMLParser } from 'fast-xml-parser';
import type { PatternDoc, PaletteEntry, PatternMeta } from '../types';
import { NO_STITCH } from '../types';
import { hashString } from '../utils/hash';
import { assignSymbolsForPalette, MAX_PALETTE_SIZE } from '../symbols';

interface OxsPaletteItem {
  '@_index': string;
  '@_number': string;
  '@_name': string;
  '@_color': string;
  '@_symbol': string;
}

interface OxsStitch {
  '@_x': string;
  '@_y': string;
  '@_palindex': string;
}

interface OxsProperties {
  '@_chartwidth': string;
  '@_chartheight': string;
  '@_charttitle'?: string;
  '@_author'?: string;
  '@_copyright'?: string;
  '@_instructions'?: string;
  '@_stitchesperinch'?: string;
}

interface OxsChart {
  properties: OxsProperties;
  palette: {
    palette_item: OxsPaletteItem | OxsPaletteItem[];
  };
  fullstitches?: {
    stitch: OxsStitch | OxsStitch[];
  };
}

// Intermediate type for palette entries before symbol assignment
interface PaletteEntryCandidate {
  paletteIndex: number;
  paletteId: string;
  name: string;
  brand?: string;
  code?: string;
  hex: string;
  symbol?: string; // Candidate symbol from OXS file (may be invalid/duplicate)
  totalTargets: number;
}

export async function parseOXS(content: string): Promise<PatternDoc> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const parsed = parser.parse(content);
  const chart: OxsChart = parsed.chart;

  if (!chart) {
    throw new Error('Invalid OXS file: missing <chart> root element');
  }

  if (!chart.properties) {
    throw new Error('Invalid OXS file: missing <properties> element');
  }

  const props = chart.properties;
  const width = parseInt(props['@_chartwidth'], 10);
  const height = parseInt(props['@_chartheight'], 10);

  if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
    throw new Error('Invalid OXS file: invalid chart dimensions');
  }

  const meta: PatternMeta = {
    title: props['@_charttitle'] || undefined,
    author: props['@_author'] || undefined,
    copyright: props['@_copyright'] || undefined,
    instructions: props['@_instructions'] || undefined,
    stitchesPerInch: props['@_stitchesperinch']
      ? parseInt(props['@_stitchesperinch'], 10)
      : undefined,
  };

  // Parse palette
  const paletteItems = chart.palette?.palette_item;
  if (!paletteItems) {
    throw new Error('Invalid OXS file: missing palette');
  }

  const paletteArray = Array.isArray(paletteItems) ? paletteItems : [paletteItems];

  // Filter out cloth entry (index 0 is typically cloth/fabric)
  const threadPalette = paletteArray.filter(item => {
    const idx = parseInt(item['@_index'], 10);
    const num = item['@_number']?.toLowerCase();
    return idx > 0 && num !== 'cloth';
  });

  // Check palette size limit
  if (threadPalette.length > MAX_PALETTE_SIZE) {
    throw new Error(
      `Palette has ${threadPalette.length} colours but maximum supported is ${MAX_PALETTE_SIZE}. Reduce the number of colours.`
    );
  }

  // Create palette entries with candidate symbols from OXS
  const paletteWithCandidates: PaletteEntryCandidate[] = threadPalette.map((item, i) => {
    const originalIndex = parseInt(item['@_index'], 10);
    let hex = item['@_color'] || '000000';
    if (!hex.startsWith('#')) {
      hex = '#' + hex;
    }

    const code = item['@_number'] || '';
    const brand = code.includes('DMC') ? 'DMC' : code.includes('ANC') ? 'Anchor' : undefined;

    // Extract candidate symbol from OXS file
    // Only accept single-character symbols as candidates
    const rawSymbol = item['@_symbol'];
    const candidateSymbol =
      rawSymbol && rawSymbol.trim().length === 1 ? rawSymbol.trim() : undefined;

    return {
      paletteIndex: i,
      paletteId: `pal-${originalIndex}`,
      name: item['@_name'] || `Color ${originalIndex}`,
      brand,
      code: code.replace(/^(DMC|ANC)\s*/, '').trim(),
      hex,
      symbol: candidateSymbol,
      totalTargets: 0,
    };
  });

  // Build original index to new index map
  const indexMap = new Map<number, number>();
  threadPalette.forEach((item, i) => {
    const originalIndex = parseInt(item['@_index'], 10);
    indexMap.set(originalIndex, i);
  });

  // Initialize targets array with NO_STITCH
  const targets = new Uint16Array(width * height);
  targets.fill(NO_STITCH);

  // Parse stitches
  const stitchesData = chart.fullstitches?.stitch;
  if (stitchesData) {
    const stitchArray = Array.isArray(stitchesData) ? stitchesData : [stitchesData];

    for (const stitch of stitchArray) {
      const x = parseInt(stitch['@_x'], 10);
      const y = parseInt(stitch['@_y'], 10);
      const palIndex = parseInt(stitch['@_palindex'], 10);

      if (x >= 0 && x < width && y >= 0 && y < height) {
        const newIndex = indexMap.get(palIndex);
        if (newIndex !== undefined) {
          const cellIndex = y * width + x;
          targets[cellIndex] = newIndex;
          paletteWithCandidates[newIndex].totalTargets++;
        }
      }
    }
  }

  // Assign symbols using the central pool
  // This ensures unique valid symbols, handling duplicates/invalid candidates from OXS
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
