import { describe, it, expect } from 'vitest';
import {
  SYMBOL_POOL,
  MAX_PALETTE_SIZE,
  isSingleCodeUnitSymbol,
  isValidPoolSymbol,
  validateSymbolPool,
  assignSymbolsForPalette,
  type SymbolAssignOptions,
} from '../symbols';

describe('SymbolPool', () => {
  describe('SYMBOL_POOL constant', () => {
    it('has exactly 490 symbols', () => {
      expect(SYMBOL_POOL.length).toBe(490);
      expect(SYMBOL_POOL.length).toBe(MAX_PALETTE_SIZE);
    });

    it('contains all unique symbols', () => {
      const uniqueSymbols = new Set(SYMBOL_POOL);
      expect(uniqueSymbols.size).toBe(SYMBOL_POOL.length);
    });

    it('each symbol has length === 1', () => {
      for (let i = 0; i < SYMBOL_POOL.length; i++) {
        const s = SYMBOL_POOL[i];
        expect(s.length).toBe(1);
      }
    });

    it('contains no braille characters (U+2800-U+28FF)', () => {
      for (const s of SYMBOL_POOL) {
        const code = s.charCodeAt(0);
        expect(code).not.toBeGreaterThanOrEqual(0x2800);
        if (code >= 0x2800) {
          expect(code).not.toBeLessThanOrEqual(0x28FF);
        }
      }
    });

    it('contains no whitespace characters', () => {
      for (const s of SYMBOL_POOL) {
        const code = s.charCodeAt(0);
        // Space
        expect(code).not.toBe(0x20);
        // Non-breaking space
        expect(code).not.toBe(0xA0);
        // Soft hyphen
        expect(code).not.toBe(0xAD);
        // Control characters
        expect(code).toBeGreaterThan(0x1F);
        expect(code).not.toBe(0x7F);
        if (code >= 0x80 && code <= 0x9F) {
          // C1 control characters
          expect(false).toBe(true);
        }
      }
    });

    it('contains no surrogate characters (U+D800-U+DFFF)', () => {
      for (const s of SYMBOL_POOL) {
        const code = s.charCodeAt(0);
        expect(code < 0xD800 || code > 0xDFFF).toBe(true);
      }
    });

    it('is stable (same order on each access)', () => {
      const copy1 = [...SYMBOL_POOL];
      const copy2 = [...SYMBOL_POOL];
      expect(copy1).toEqual(copy2);
    });

    it('is readonly', () => {
      // TypeScript readonly is compile-time only, but we can check it is a frozen or at least consistent array
      expect(Array.isArray(SYMBOL_POOL)).toBe(true);
    });
  });

  describe('isSingleCodeUnitSymbol', () => {
    it('returns true for single BMP characters', () => {
      expect(isSingleCodeUnitSymbol('A')).toBe(true);
      expect(isSingleCodeUnitSymbol('0')).toBe(true);
      expect(isSingleCodeUnitSymbol('!')).toBe(true);
      expect(isSingleCodeUnitSymbol('\u00C0')).toBe(true); // A with grave
      expect(isSingleCodeUnitSymbol('\u0100')).toBe(true); // Latin Extended-A
    });

    it('returns false for empty strings', () => {
      expect(isSingleCodeUnitSymbol('')).toBe(false);
    });

    it('returns false for multi-character strings', () => {
      expect(isSingleCodeUnitSymbol('AB')).toBe(false);
      expect(isSingleCodeUnitSymbol('12')).toBe(false);
      expect(isSingleCodeUnitSymbol('X ')).toBe(false);
    });

    it('returns false for surrogate pairs (emoji)', () => {
      // Emoji like "😀" is actually 2 code units (surrogate pair)
      // The first character would be a high surrogate
      const emoji = '😀';
      expect(emoji.length).toBe(2); // Confirms surrogate pair
      expect(isSingleCodeUnitSymbol(emoji)).toBe(false);
      // Individual surrogates should also be rejected
      expect(isSingleCodeUnitSymbol('\uD83D')).toBe(false); // High surrogate
      expect(isSingleCodeUnitSymbol('\uDE00')).toBe(false); // Low surrogate
    });
  });

  describe('isValidPoolSymbol', () => {
    it('returns true for symbols in the pool', () => {
      expect(isValidPoolSymbol('!')).toBe(true);
      expect(isValidPoolSymbol('A')).toBe(true);
      expect(isValidPoolSymbol('z')).toBe(true);
      expect(isValidPoolSymbol('0')).toBe(true);
    });

    it('returns false for symbols not in the pool', () => {
      // Space is not in the pool
      expect(isValidPoolSymbol(' ')).toBe(false);
      // Tab is not in the pool
      expect(isValidPoolSymbol('\t')).toBe(false);
      // Random Unicode that may not be in pool
      expect(isValidPoolSymbol('\u9999')).toBe(false);
    });

    it('returns false for multi-character strings', () => {
      expect(isValidPoolSymbol('AB')).toBe(false);
    });
  });

  describe('validateSymbolPool', () => {
    it('does not throw for the default SYMBOL_POOL', () => {
      expect(() => validateSymbolPool(SYMBOL_POOL)).not.toThrow();
    });

    it('throws for wrong length', () => {
      const shortPool = SYMBOL_POOL.slice(0, 489);
      expect(() => validateSymbolPool(shortPool)).toThrow(/must have exactly 490 symbols/);

      const longPool = [...SYMBOL_POOL, 'X'];
      expect(() => validateSymbolPool(longPool)).toThrow(/must have exactly 490 symbols/);
    });

    it('throws for duplicate symbols', () => {
      const dupPool = [...SYMBOL_POOL.slice(0, 489), SYMBOL_POOL[0]];
      expect(() => validateSymbolPool(dupPool)).toThrow(/Duplicate symbol/);
    });

    it('throws for multi-character symbols', () => {
      const badPool = [...SYMBOL_POOL.slice(0, 489), 'AB'];
      expect(() => validateSymbolPool(badPool)).toThrow(/not a single character/);
    });
  });

  describe('assignSymbolsForPalette', () => {
    const defaultOptions: SymbolAssignOptions = {
      allowProvidedSymbols: false,
      preferProvidedSymbols: false,
      conflictPolicy: 'reassign',
      startingOffset: 0,
    };

    it('assigns unique symbols to all palette entries', () => {
      const palette = [
        { name: 'Red', hex: '#FF0000' },
        { name: 'Green', hex: '#00FF00' },
        { name: 'Blue', hex: '#0000FF' },
      ];

      const result = assignSymbolsForPalette(palette, defaultOptions);

      expect(result.length).toBe(3);
      expect(result[0].symbol).toBe(SYMBOL_POOL[0]);
      expect(result[1].symbol).toBe(SYMBOL_POOL[1]);
      expect(result[2].symbol).toBe(SYMBOL_POOL[2]);

      // All unique
      const symbols = result.map(e => e.symbol);
      expect(new Set(symbols).size).toBe(symbols.length);
    });

    it('assigns symbols deterministically', () => {
      const palette = [
        { name: 'Red', hex: '#FF0000' },
        { name: 'Green', hex: '#00FF00' },
      ];

      const result1 = assignSymbolsForPalette(palette, defaultOptions);
      const result2 = assignSymbolsForPalette(palette, defaultOptions);

      expect(result1[0].symbol).toBe(result2[0].symbol);
      expect(result1[1].symbol).toBe(result2[1].symbol);
    });

    it('throws for palette > 490 entries', () => {
      const largePalette = Array.from({ length: 491 }, (_, i) => ({
        name: `Color ${i}`,
        hex: '#000000',
      }));

      expect(() => assignSymbolsForPalette(largePalette, defaultOptions)).toThrow(
        /maximum supported is 490/
      );
    });

    it('handles exactly 490 entries', () => {
      const maxPalette = Array.from({ length: 490 }, (_, i) => ({
        name: `Color ${i}`,
        hex: '#000000',
      }));

      const result = assignSymbolsForPalette(maxPalette, defaultOptions);
      expect(result.length).toBe(490);

      // All unique
      const symbols = result.map(e => e.symbol);
      expect(new Set(symbols).size).toBe(490);
    });

    it('does not mutate the input palette', () => {
      const palette = [
        { name: 'Red', hex: '#FF0000' },
        { name: 'Green', hex: '#00FF00' },
      ];

      const originalFirst = { ...palette[0] };
      assignSymbolsForPalette(palette, defaultOptions);

      expect(palette[0]).toEqual(originalFirst);
      expect((palette[0] as { symbol?: string }).symbol).toBeUndefined();
    });

    describe('with allowProvidedSymbols: true', () => {
      const parserOptions: SymbolAssignOptions = {
        allowProvidedSymbols: true,
        preferProvidedSymbols: true,
        conflictPolicy: 'reassign',
        startingOffset: 0,
      };

      it('preserves valid provided symbols', () => {
        const palette = [
          { name: 'Red', hex: '#FF0000', symbol: 'A' },
          { name: 'Green', hex: '#00FF00', symbol: 'B' },
        ];

        const result = assignSymbolsForPalette(palette, parserOptions);

        expect(result[0].symbol).toBe('A');
        expect(result[1].symbol).toBe('B');
      });

      it('replaces invalid provided symbols', () => {
        const palette = [
          { name: 'Red', hex: '#FF0000', symbol: 'AB' }, // Multi-char, invalid
          { name: 'Green', hex: '#00FF00', symbol: '' }, // Empty, invalid
        ];

        const result = assignSymbolsForPalette(palette, parserOptions);

        // Both should be assigned from pool
        expect(result[0].symbol.length).toBe(1);
        expect(result[1].symbol.length).toBe(1);
        expect(isValidPoolSymbol(result[0].symbol)).toBe(true);
        expect(isValidPoolSymbol(result[1].symbol)).toBe(true);
      });

      it('resolves duplicate provided symbols by reassigning', () => {
        const palette = [
          { name: 'Red', hex: '#FF0000', symbol: 'X' },
          { name: 'Green', hex: '#00FF00', symbol: 'X' }, // Duplicate!
          { name: 'Blue', hex: '#0000FF', symbol: 'Y' },
        ];

        const result = assignSymbolsForPalette(palette, parserOptions);

        // First X should be kept, second should be reassigned
        expect(result[0].symbol).toBe('X');
        expect(result[1].symbol).not.toBe('X'); // Reassigned
        expect(result[2].symbol).toBe('Y');

        // All unique
        const symbols = result.map(e => e.symbol);
        expect(new Set(symbols).size).toBe(3);
      });

      it('respects startingOffset for non-provided symbols', () => {
        const palette = [
          { name: 'Red', hex: '#FF0000' }, // No provided symbol
          { name: 'Green', hex: '#00FF00' },
        ];

        const optionsWithOffset: SymbolAssignOptions = {
          ...parserOptions,
          startingOffset: 10,
        };

        const result = assignSymbolsForPalette(palette, optionsWithOffset);

        // Should start from index 10 in the pool
        expect(result[0].symbol).toBe(SYMBOL_POOL[10]);
        expect(result[1].symbol).toBe(SYMBOL_POOL[11]);
      });
    });

    describe('with allowProvidedSymbols: false (image conversion)', () => {
      it('ignores any provided symbols', () => {
        const palette = [
          { name: 'Red', hex: '#FF0000', symbol: 'Z' },
          { name: 'Green', hex: '#00FF00', symbol: 'Y' },
        ];

        const result = assignSymbolsForPalette(palette, defaultOptions);

        // Provided symbols should be ignored
        expect(result[0].symbol).toBe(SYMBOL_POOL[0]);
        expect(result[1].symbol).toBe(SYMBOL_POOL[1]);
      });
    });

    describe('edge cases', () => {
      it('handles empty palette', () => {
        const result = assignSymbolsForPalette([], defaultOptions);
        expect(result).toEqual([]);
      });

      it('handles single entry palette', () => {
        const palette = [{ name: 'Red', hex: '#FF0000' }];
        const result = assignSymbolsForPalette(palette, defaultOptions);
        expect(result.length).toBe(1);
        expect(result[0].symbol).toBe(SYMBOL_POOL[0]);
      });

      it('preserves all original properties', () => {
        const palette = [
          {
            paletteIndex: 0,
            paletteId: 'dmc-310',
            name: 'Black',
            brand: 'DMC',
            code: '310',
            hex: '#000000',
            totalTargets: 100,
          },
        ];

        const result = assignSymbolsForPalette(palette, defaultOptions);

        expect(result[0].paletteIndex).toBe(0);
        expect(result[0].paletteId).toBe('dmc-310');
        expect(result[0].name).toBe('Black');
        expect(result[0].brand).toBe('DMC');
        expect(result[0].code).toBe('310');
        expect(result[0].hex).toBe('#000000');
        expect(result[0].totalTargets).toBe(100);
        expect(result[0].symbol).toBeDefined();
      });
    });
  });

  describe('large palette uniqueness (regression test for modulo collision)', () => {
    it('assigns unique symbols for palette > 79 entries (old fallback string length)', () => {
      // The old system used a 79-character fallback string with modulo
      // This test ensures we no longer have collisions for larger palettes
      const palette = Array.from({ length: 100 }, (_, i) => ({
        name: `Color ${i}`,
        hex: '#000000',
      }));

      const result = assignSymbolsForPalette(palette, {
        allowProvidedSymbols: false,
        preferProvidedSymbols: false,
        conflictPolicy: 'reassign',
        startingOffset: 0,
      });

      const symbols = result.map(e => e.symbol);
      expect(new Set(symbols).size).toBe(100);
    });

    it('assigns unique symbols for palette of 200 entries', () => {
      const palette = Array.from({ length: 200 }, (_, i) => ({
        name: `Color ${i}`,
        hex: '#000000',
      }));

      const result = assignSymbolsForPalette(palette, {
        allowProvidedSymbols: false,
        preferProvidedSymbols: false,
        conflictPolicy: 'reassign',
        startingOffset: 0,
      });

      const symbols = result.map(e => e.symbol);
      expect(new Set(symbols).size).toBe(200);
    });
  });
});
