import { describe, it, expect } from 'vitest';
import { parseOXS } from '../parsers/oxs';
import { parseFCJSON } from '../parsers/fcjson';
import { isValidPoolSymbol, SYMBOL_POOL } from '../symbols';

describe('OXS Parser', () => {
  const sampleOXS = `<?xml version="1.0" encoding="UTF-8"?>
<chart>
  <format comments01="Test" />
  <properties
    oxsversion="1.0"
    software="Test"
    chartheight="3"
    chartwidth="3"
    charttitle="Test Pattern"
    author="Test Author"
    palettecount="3"
  />
  <palette>
    <palette_item index="0" number="cloth" name="cloth" color="f1eaed" symbol="0" />
    <palette_item index="1" number="DMC 310" name="Black" color="000000" symbol="X" />
    <palette_item index="2" number="ANC 403" name="Red" color="FF0000" symbol="O" />
  </palette>
  <fullstitches>
    <stitch x="0" y="0" palindex="1" />
    <stitch x="1" y="0" palindex="2" />
    <stitch x="2" y="0" palindex="1" />
    <stitch x="0" y="1" palindex="2" />
    <stitch x="1" y="1" palindex="1" />
    <stitch x="2" y="1" palindex="2" />
    <stitch x="0" y="2" palindex="1" />
    <stitch x="1" y="2" palindex="2" />
    <stitch x="2" y="2" palindex="1" />
  </fullstitches>
</chart>`;

  it('parses dimensions correctly', async () => {
    const pattern = await parseOXS(sampleOXS);
    expect(pattern.width).toBe(3);
    expect(pattern.height).toBe(3);
  });

  it('parses metadata correctly', async () => {
    const pattern = await parseOXS(sampleOXS);
    expect(pattern.meta.title).toBe('Test Pattern');
    expect(pattern.meta.author).toBe('Test Author');
  });

  it('filters out cloth palette entry', async () => {
    const pattern = await parseOXS(sampleOXS);
    expect(pattern.palette.length).toBe(2);
    expect(pattern.palette.every(p => p.name !== 'cloth')).toBe(true);
  });

  it('parses palette colors correctly', async () => {
    const pattern = await parseOXS(sampleOXS);
    expect(pattern.palette[0].hex).toBe('#000000');
    expect(pattern.palette[1].hex).toBe('#FF0000');
  });

  it('detects brand from number', async () => {
    const pattern = await parseOXS(sampleOXS);
    expect(pattern.palette[0].brand).toBe('DMC');
    expect(pattern.palette[1].brand).toBe('Anchor');
  });

  it('counts targets correctly', async () => {
    const pattern = await parseOXS(sampleOXS);
    // 5 black stitches (corners and center)
    // 4 red stitches (edges)
    expect(pattern.palette[0].totalTargets).toBe(5);
    expect(pattern.palette[1].totalTargets).toBe(4);
  });

  it('generates unique pattern ID', async () => {
    const pattern = await parseOXS(sampleOXS);
    expect(pattern.id).toBeTruthy();
    expect(pattern.id.length).toBeGreaterThan(0);
  });

  it('assigns unique valid symbols from central pool', async () => {
    const pattern = await parseOXS(sampleOXS);

    // All symbols should be valid pool symbols
    for (const entry of pattern.palette) {
      expect(entry.symbol).toBeDefined();
      expect(entry.symbol.length).toBe(1);
      expect(isValidPoolSymbol(entry.symbol)).toBe(true);
    }

    // All symbols should be unique
    const symbols = pattern.palette.map(p => p.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it('preserves valid single-character provided symbols', async () => {
    const pattern = await parseOXS(sampleOXS);
    // X and O are both valid single-char symbols in the pool
    // The parser should preserve them if they're valid and unique
    expect(pattern.palette[0].symbol).toBe('X');
    expect(pattern.palette[1].symbol).toBe('O');
  });

  it('throws on missing chart element', async () => {
    await expect(parseOXS('<notachart></notachart>')).rejects.toThrow('missing <chart>');
  });

  it('throws on empty chart', async () => {
    // Empty chart element is treated as invalid
    await expect(parseOXS('<chart></chart>')).rejects.toThrow();
  });

  describe('symbol collision handling', () => {
    it('reassigns duplicate symbols from OXS file', async () => {
      const oxsWithDuplicates = `<?xml version="1.0" encoding="UTF-8"?>
<chart>
  <properties chartwidth="2" chartheight="1" />
  <palette>
    <palette_item index="0" number="cloth" name="cloth" color="f1eaed" symbol="0" />
    <palette_item index="1" number="DMC 310" name="Black" color="000000" symbol="X" />
    <palette_item index="2" number="DMC 321" name="Red" color="FF0000" symbol="X" />
  </palette>
  <fullstitches>
    <stitch x="0" y="0" palindex="1" />
    <stitch x="1" y="0" palindex="2" />
  </fullstitches>
</chart>`;

      const pattern = await parseOXS(oxsWithDuplicates);

      // Symbols should be unique even though OXS had duplicates
      expect(pattern.palette[0].symbol).not.toBe(pattern.palette[1].symbol);
      // First occurrence keeps the symbol, second is reassigned
      expect(pattern.palette[0].symbol).toBe('X');
      expect(pattern.palette[1].symbol).not.toBe('X');
    });

    it('reassigns multi-character symbols from OXS file', async () => {
      const oxsWithBadSymbols = `<?xml version="1.0" encoding="UTF-8"?>
<chart>
  <properties chartwidth="2" chartheight="1" />
  <palette>
    <palette_item index="0" number="cloth" name="cloth" color="f1eaed" symbol="0" />
    <palette_item index="1" number="DMC 310" name="Black" color="000000" symbol="10" />
    <palette_item index="2" number="DMC 321" name="Red" color="FF0000" symbol="11" />
  </palette>
  <fullstitches>
    <stitch x="0" y="0" palindex="1" />
    <stitch x="1" y="0" palindex="2" />
  </fullstitches>
</chart>`;

      const pattern = await parseOXS(oxsWithBadSymbols);

      // Multi-char symbols should be reassigned to valid single-char pool symbols
      for (const entry of pattern.palette) {
        expect(entry.symbol.length).toBe(1);
        expect(isValidPoolSymbol(entry.symbol)).toBe(true);
      }
    });
  });
});

describe('FCJSON Parser', () => {
  const sampleFCJSON = JSON.stringify({
    sv: 1,
    v: 1,
    model: {
      images: [{
        width: 3,
        height: 3,
        flossIndexes: [
          { rgb: [0, 0, 0], name: 'Black', sys: 'DMC', id: '310', symbol: 'sm0' },
          { rgb: [255, 0, 0], name: 'Red', sys: 'ANC', id: '403', symbol: 'sm1' },
        ],
        crossIndexes: [
          { tp: 'cr', fi: 0 },
          { tp: 'cr', fi: 1 },
        ],
        layers: [{
          width: 3,
          height: 3,
          position: { top: 0, left: 0 },
          cross: [0, 1, 0, 1, 0, 1, 0, 1, 0],
        }],
      }],
    },
  });

  it('parses dimensions correctly', async () => {
    const pattern = await parseFCJSON(sampleFCJSON);
    expect(pattern.width).toBe(3);
    expect(pattern.height).toBe(3);
  });

  it('parses palette colors from RGB', async () => {
    const pattern = await parseFCJSON(sampleFCJSON);
    expect(pattern.palette[0].hex).toBe('#000000');
    expect(pattern.palette[1].hex).toBe('#ff0000');
  });

  it('parses brand and code', async () => {
    const pattern = await parseFCJSON(sampleFCJSON);
    expect(pattern.palette[0].brand).toBe('DMC');
    expect(pattern.palette[0].code).toBe('310');
    expect(pattern.palette[1].brand).toBe('Anchor');
    expect(pattern.palette[1].code).toBe('403');
  });

  it('maps cross indices to targets', async () => {
    const pattern = await parseFCJSON(sampleFCJSON);
    // Check pattern: 0, 1, 0, 1, 0, 1, 0, 1, 0
    expect(pattern.targets[0]).toBe(0); // Black
    expect(pattern.targets[1]).toBe(1); // Red
    expect(pattern.targets[4]).toBe(0); // Black (center)
  });

  it('counts targets correctly', async () => {
    const pattern = await parseFCJSON(sampleFCJSON);
    expect(pattern.palette[0].totalTargets).toBe(5); // 5 black
    expect(pattern.palette[1].totalTargets).toBe(4); // 4 red
  });

  it('assigns unique valid symbols from central pool', async () => {
    const pattern = await parseFCJSON(sampleFCJSON);

    // All symbols should be valid pool symbols
    for (const entry of pattern.palette) {
      expect(entry.symbol).toBeDefined();
      expect(entry.symbol.length).toBe(1);
      expect(isValidPoolSymbol(entry.symbol)).toBe(true);
    }

    // All symbols should be unique
    const symbols = pattern.palette.map(p => p.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it('ignores invalid multi-char symbols from FCJSON', async () => {
    // The sample has 'sm0' and 'sm1' which are multi-char, so they should be ignored
    const pattern = await parseFCJSON(sampleFCJSON);

    // Symbols should be from the pool, not the invalid FCJSON symbols
    expect(pattern.palette[0].symbol).not.toBe('sm0');
    expect(pattern.palette[1].symbol).not.toBe('sm1');
    expect(pattern.palette[0].symbol).toBe(SYMBOL_POOL[0]);
    expect(pattern.palette[1].symbol).toBe(SYMBOL_POOL[1]);
  });

  it('throws on invalid JSON', async () => {
    await expect(parseFCJSON('not json')).rejects.toThrow('not valid JSON');
  });

  it('throws on missing images', async () => {
    await expect(parseFCJSON(JSON.stringify({ model: {} }))).rejects.toThrow();
  });

  describe('symbol handling with valid single-char symbols', () => {
    it('preserves valid single-char symbols', async () => {
      const fcjsonWithValidSymbols = JSON.stringify({
        sv: 1,
        v: 1,
        model: {
          images: [{
            width: 2,
            height: 1,
            flossIndexes: [
              { rgb: [0, 0, 0], name: 'Black', sys: 'DMC', id: '310', symbol: 'A' },
              { rgb: [255, 0, 0], name: 'Red', sys: 'DMC', id: '321', symbol: 'B' },
            ],
            crossIndexes: [
              { tp: 'cr', fi: 0 },
              { tp: 'cr', fi: 1 },
            ],
            layers: [{
              width: 2,
              height: 1,
              cross: [0, 1],
            }],
          }],
        },
      });

      const pattern = await parseFCJSON(fcjsonWithValidSymbols);

      // Valid single-char symbols should be preserved
      expect(pattern.palette[0].symbol).toBe('A');
      expect(pattern.palette[1].symbol).toBe('B');
    });
  });
});

describe('Parser symbol uniqueness integration', () => {
  it('OXS parser handles large palette without symbol collisions', async () => {
    // Generate OXS with 100 palette entries
    const paletteItems = Array.from({ length: 101 }, (_, i) => {
      if (i === 0) {
        return '<palette_item index="0" number="cloth" name="cloth" color="f1eaed" symbol="0" />';
      }
      const hex = ((i * 12345) & 0xFFFFFF).toString(16).padStart(6, '0');
      // Use index as symbol (will cause collisions with old modulo system)
      return `<palette_item index="${i}" number="DMC ${i}" name="Color ${i}" color="${hex}" symbol="${i % 10}" />`;
    }).join('\n    ');

    const stitches = Array.from({ length: 100 }, (_, i) =>
      `<stitch x="${i % 10}" y="${Math.floor(i / 10)}" palindex="${(i % 100) + 1}" />`
    ).join('\n    ');

    const largeOXS = `<?xml version="1.0" encoding="UTF-8"?>
<chart>
  <properties chartwidth="10" chartheight="10" />
  <palette>
    ${paletteItems}
  </palette>
  <fullstitches>
    ${stitches}
  </fullstitches>
</chart>`;

    const pattern = await parseOXS(largeOXS);

    // Should have 100 palette entries (excluding cloth)
    expect(pattern.palette.length).toBe(100);

    // All symbols should be unique
    const symbols = pattern.palette.map(p => p.symbol);
    expect(new Set(symbols).size).toBe(100);

    // All symbols should be valid
    for (const entry of pattern.palette) {
      expect(isValidPoolSymbol(entry.symbol)).toBe(true);
    }
  });

  it('FCJSON parser handles large palette without symbol collisions', async () => {
    // Generate FCJSON with 100 floss entries
    const flossIndexes = Array.from({ length: 100 }, (_, i) => ({
      rgb: [(i * 3) % 256, (i * 5) % 256, (i * 7) % 256],
      name: `Color ${i}`,
      sys: 'DMC',
      id: `${i}`,
      symbol: `sym${i}`, // Invalid multi-char symbols
    }));

    const crossIndexes = flossIndexes.map((_, i) => ({ tp: 'cr', fi: i }));
    const cross = Array.from({ length: 100 }, (_, i) => i);

    const largeFCJSON = JSON.stringify({
      sv: 1,
      v: 1,
      model: {
        images: [{
          width: 10,
          height: 10,
          flossIndexes,
          crossIndexes,
          layers: [{
            width: 10,
            height: 10,
            cross,
          }],
        }],
      },
    });

    const pattern = await parseFCJSON(largeFCJSON);

    // Should have 100 palette entries
    expect(pattern.palette.length).toBe(100);

    // All symbols should be unique
    const symbols = pattern.palette.map(p => p.symbol);
    expect(new Set(symbols).size).toBe(100);

    // All symbols should be valid
    for (const entry of pattern.palette) {
      expect(isValidPoolSymbol(entry.symbol)).toBe(true);
    }
  });
});
