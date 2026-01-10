import { describe, it, expect } from 'vitest';
import {
  screenToWorld,
  worldToScreen,
  worldToGrid,
  gridToWorld,
  screenToGrid,
  getVisibleGridBounds,
  calculateFitViewport,
  CELL_SIZE,
} from '../utils/coordinates';

describe('Coordinate Transforms', () => {
  const identity = { scale: 1, translateX: 0, translateY: 0 };

  describe('screenToWorld', () => {
    it('handles identity transform', () => {
      const result = screenToWorld(100, 200, identity);
      expect(result.x).toBe(100);
      expect(result.y).toBe(200);
    });

    it('handles translation', () => {
      const viewport = { scale: 1, translateX: 50, translateY: 30 };
      const result = screenToWorld(100, 200, viewport);
      expect(result.x).toBe(50);
      expect(result.y).toBe(170);
    });

    it('handles scale', () => {
      const viewport = { scale: 2, translateX: 0, translateY: 0 };
      const result = screenToWorld(100, 200, viewport);
      expect(result.x).toBe(50);
      expect(result.y).toBe(100);
    });

    it('handles scale and translation', () => {
      const viewport = { scale: 2, translateX: 100, translateY: 50 };
      const result = screenToWorld(200, 150, viewport);
      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
    });
  });

  describe('worldToScreen', () => {
    it('handles identity transform', () => {
      const result = worldToScreen(100, 200, identity);
      expect(result.x).toBe(100);
      expect(result.y).toBe(200);
    });

    it('handles translation', () => {
      const viewport = { scale: 1, translateX: 50, translateY: 30 };
      const result = worldToScreen(100, 200, viewport);
      expect(result.x).toBe(150);
      expect(result.y).toBe(230);
    });

    it('is inverse of screenToWorld', () => {
      const viewport = { scale: 1.5, translateX: 100, translateY: 200 };
      const world = screenToWorld(300, 400, viewport);
      const screen = worldToScreen(world.x, world.y, viewport);
      expect(Math.round(screen.x)).toBe(300);
      expect(Math.round(screen.y)).toBe(400);
    });
  });

  describe('worldToGrid', () => {
    it('converts world coordinates to grid cell', () => {
      const result = worldToGrid(CELL_SIZE * 2.5, CELL_SIZE * 3.7);
      expect(result.col).toBe(2);
      expect(result.row).toBe(3);
    });

    it('handles origin', () => {
      const result = worldToGrid(0, 0);
      expect(result.col).toBe(0);
      expect(result.row).toBe(0);
    });

    it('handles exact cell boundaries', () => {
      const result = worldToGrid(CELL_SIZE, CELL_SIZE);
      expect(result.col).toBe(1);
      expect(result.row).toBe(1);
    });
  });

  describe('gridToWorld', () => {
    it('converts grid cell to world coordinates', () => {
      const result = gridToWorld(2, 3);
      expect(result.x).toBe(CELL_SIZE * 2);
      expect(result.y).toBe(CELL_SIZE * 3);
    });

    it('returns top-left corner of cell', () => {
      const result = gridToWorld(0, 0);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });

  describe('screenToGrid', () => {
    it('combines screen to world to grid', () => {
      const viewport = { scale: 1, translateX: 0, translateY: 0 };
      const result = screenToGrid(CELL_SIZE * 1.5, CELL_SIZE * 2.5, viewport);
      expect(result.col).toBe(1);
      expect(result.row).toBe(2);
    });

    it('accounts for viewport scale', () => {
      const viewport = { scale: 2, translateX: 0, translateY: 0 };
      const result = screenToGrid(CELL_SIZE * 2, CELL_SIZE * 4, viewport);
      expect(result.col).toBe(1);
      expect(result.row).toBe(2);
    });
  });

  describe('getVisibleGridBounds', () => {
    it('returns visible grid cells', () => {
      const bounds = getVisibleGridBounds(400, 300, identity, 10, 10);
      expect(bounds.minCol).toBeGreaterThanOrEqual(0);
      expect(bounds.maxCol).toBeLessThan(10);
      expect(bounds.minRow).toBeGreaterThanOrEqual(0);
      expect(bounds.maxRow).toBeLessThan(10);
    });

    it('clamps to grid bounds', () => {
      const viewport = { scale: 0.5, translateX: 0, translateY: 0 };
      const bounds = getVisibleGridBounds(800, 600, viewport, 10, 10);
      expect(bounds.minCol).toBe(0);
      expect(bounds.minRow).toBe(0);
      expect(bounds.maxCol).toBe(9);
      expect(bounds.maxRow).toBe(9);
    });
  });

  describe('calculateFitViewport', () => {
    it('calculates viewport to fit pattern', () => {
      const viewport = calculateFitViewport(10, 10, 400, 400);
      expect(viewport.scale).toBeGreaterThan(0);
      expect(viewport.translateX).toBeGreaterThan(0);
      expect(viewport.translateY).toBeGreaterThan(0);
    });

    it('scales down large patterns', () => {
      const viewport = calculateFitViewport(100, 100, 400, 400);
      expect(viewport.scale).toBeLessThan(1);
    });

    it('caps scale at 2x', () => {
      const viewport = calculateFitViewport(2, 2, 800, 800);
      expect(viewport.scale).toBeLessThanOrEqual(2);
    });
  });
});
