import { describe, it, expect } from 'vitest';
import { parseOXS } from '../parsers/oxs';
import { parseFCJSON } from '../parsers/fcjson';

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

  it('throws on missing chart element', async () => {
    await expect(parseOXS('<notachart></notachart>')).rejects.toThrow('missing <chart>');
  });

  it('throws on empty chart', async () => {
    // Empty chart element is treated as invalid
    await expect(parseOXS('<chart></chart>')).rejects.toThrow();
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

  it('throws on invalid JSON', async () => {
    await expect(parseFCJSON('not json')).rejects.toThrow('not valid JSON');
  });

  it('throws on missing images', async () => {
    await expect(parseFCJSON(JSON.stringify({ model: {} }))).rejects.toThrow();
  });
});
