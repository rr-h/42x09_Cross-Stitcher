import { XMLParser } from 'fast-xml-parser';
import type { PatternDoc, PaletteEntry, PatternMeta } from '../types';
import { NO_STITCH } from '../types';
import { hashString } from '../utils/hash';

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

const SYMBOLS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#$%&*+-=~^<>!?/|';

function getSymbol(index: number, providedSymbol?: string): string {
  if (providedSymbol && providedSymbol.trim()) {
    return providedSymbol.trim().charAt(0) || SYMBOLS[index % SYMBOLS.length];
  }
  return SYMBOLS[index % SYMBOLS.length];
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

  // Create palette entries
  const palette: PaletteEntry[] = threadPalette.map((item, i) => {
    const originalIndex = parseInt(item['@_index'], 10);
    let hex = item['@_color'] || '000000';
    if (!hex.startsWith('#')) {
      hex = '#' + hex;
    }

    const code = item['@_number'] || '';
    const brand = code.includes('DMC') ? 'DMC' : code.includes('ANC') ? 'Anchor' : undefined;

    return {
      paletteIndex: i,
      paletteId: `pal-${originalIndex}`,
      name: item['@_name'] || `Color ${originalIndex}`,
      brand,
      code: code.replace(/^(DMC|ANC)\s*/, '').trim(),
      hex,
      symbol: getSymbol(i, item['@_symbol']),
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
          palette[newIndex].totalTargets++;
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
