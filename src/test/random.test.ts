import { describe, it, expect } from 'vitest';
import { createSeededRandom, cellSeed, getCellRandoms } from '../utils/random';

describe('Seeded Random', () => {
  describe('createSeededRandom', () => {
    it('produces values between 0 and 1', () => {
      const rng = createSeededRandom(12345);
      for (let i = 0; i < 100; i++) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('is deterministic with same seed', () => {
      const rng1 = createSeededRandom(42);
      const rng2 = createSeededRandom(42);

      const values1 = Array.from({ length: 10 }, () => rng1());
      const values2 = Array.from({ length: 10 }, () => rng2());

      expect(values1).toEqual(values2);
    });

    it('produces different sequences for different seeds', () => {
      const rng1 = createSeededRandom(1);
      const rng2 = createSeededRandom(2);

      const values1 = Array.from({ length: 10 }, () => rng1());
      const values2 = Array.from({ length: 10 }, () => rng2());

      expect(values1).not.toEqual(values2);
    });
  });

  describe('cellSeed', () => {
    it('produces consistent seed for same coordinates', () => {
      const seed1 = cellSeed(5, 10);
      const seed2 = cellSeed(5, 10);
      expect(seed1).toBe(seed2);
    });

    it('produces different seeds for different coordinates', () => {
      const seed1 = cellSeed(5, 10);
      const seed2 = cellSeed(10, 5);
      expect(seed1).not.toBe(seed2);
    });

    it('produces positive integers', () => {
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const seed = cellSeed(x, y);
          expect(seed).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(seed)).toBe(true);
        }
      }
    });
  });

  describe('getCellRandoms', () => {
    it('returns deterministic values for same cell', () => {
      const randoms1 = getCellRandoms(3, 7);
      const randoms2 = getCellRandoms(3, 7);

      expect(randoms1).toEqual(randoms2);
    });

    it('returns different values for different cells', () => {
      const randoms1 = getCellRandoms(3, 7);
      const randoms2 = getCellRandoms(7, 3);

      expect(randoms1.offsetX1).not.toBe(randoms2.offsetX1);
    });

    it('returns values in expected ranges', () => {
      const randoms = getCellRandoms(0, 0);

      // Offsets should be between -1 and 1
      expect(randoms.offsetX1).toBeGreaterThanOrEqual(-1);
      expect(randoms.offsetX1).toBeLessThanOrEqual(1);
      expect(randoms.offsetY1).toBeGreaterThanOrEqual(-1);
      expect(randoms.offsetY1).toBeLessThanOrEqual(1);

      // Thickness should be between 0.9 and 1.1
      expect(randoms.thickness1).toBeGreaterThanOrEqual(0.9);
      expect(randoms.thickness1).toBeLessThanOrEqual(1.1);

      // Highlight should be between 0.3 and 0.6
      expect(randoms.highlight1).toBeGreaterThanOrEqual(0.3);
      expect(randoms.highlight1).toBeLessThanOrEqual(0.6);
    });
  });
});
