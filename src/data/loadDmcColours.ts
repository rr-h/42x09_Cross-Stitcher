/**
 * Lazy loader for DMC colour data.
 *
 * This module provides lazy-loading of the large DMC colour table (~489 colours)
 * to reduce the initial JS bundle size. The data is loaded on first access
 * and cached for subsequent calls.
 *
 * Usage:
 *   const dmcColors = await loadDmcColours();
 *   // Use dmcColors.DMC_COLORS, dmcColors.findClosestDMC, etc.
 */

import type { DMCColor } from './dmcColorsTypes.ts';

// Re-export types for convenience
export type { DMCColor };

/**
 * The loaded DMC colour module interface.
 * Matches the exports from dmcColors.ts
 */
export interface DmcColourModule {
  DMC_COLORS: DMCColor[];
  colorDistance: (rgb1: [number, number, number], rgb2: [number, number, number]) => number;
  rgbToHex: (r: number, g: number, b: number) => string;
  findByCode: (code: string) => DMCColor | undefined;
  findByHex: (hex: string) => DMCColor | undefined;
  findByName: (name: string) => DMCColor | undefined;
  findByRgb: (r: number, g: number, b: number) => DMCColor | undefined;
  findClosestDMC: (rgb: [number, number, number]) => DMCColor;
  findClosestDMCWithDistance: (rgb: [number, number, number]) => {
    color: DMCColor;
    distance: number;
  };
  findClosestDMCColors: (
    rgb: [number, number, number],
    count?: number
  ) => Array<{ color: DMCColor; distance: number }>;
  searchByName: (query: string) => DMCColor[];
  getColorFamily: (family: string) => DMCColor[];
  findDMC: (query: string) => DMCColor | undefined;
  getColorCount: () => number;
  getAllCodes: () => string[];
}

/** Singleton promise for the loaded module */
let loadPromise: Promise<DmcColourModule> | null = null;

/** Cached loaded module */
let cachedModule: DmcColourModule | null = null;

/**
 * Load DMC colour data lazily.
 *
 * Uses dynamic import to ensure the large colour table is in a separate chunk.
 * The result is cached, so subsequent calls return immediately.
 *
 * @returns Promise resolving to the DMC colour module with all utilities
 */
export async function loadDmcColours(): Promise<DmcColourModule> {
  // Return cached result if available
  if (cachedModule) {
    return cachedModule;
  }

  // Return existing promise if loading is in progress
  if (loadPromise) {
    return loadPromise;
  }

  // Start loading
  loadPromise = (async () => {
    try {
      // Dynamic import creates a separate chunk
      const module = await import('./dmcColors');

      // Basic shape validation (lightweight, no heavy libs)
      if (!Array.isArray(module.DMC_COLORS) || module.DMC_COLORS.length < 400) {
        throw new Error('Invalid DMC colour data: expected array with 400+ colours');
      }

      // Validate first entry has required fields
      const first = module.DMC_COLORS[0];
      if (!first || typeof first.code !== 'string' || typeof first.hex !== 'string') {
        throw new Error('Invalid DMC colour data: entries missing required fields');
      }

      cachedModule = module as DmcColourModule;
      return cachedModule;
    } catch (err) {
      // Clear promise so retry is possible
      loadPromise = null;
      throw err;
    }
  })();

  return loadPromise;
}

/**
 * Check if DMC colours are already loaded (synchronous).
 *
 * Useful for conditional rendering while data loads.
 */
export function isDmcColoursLoaded(): boolean {
  return cachedModule !== null;
}

/**
 * Get the cached DMC colour module if already loaded.
 *
 * Returns null if not yet loaded. Use loadDmcColours() to ensure loaded.
 */
export function getDmcColoursIfLoaded(): DmcColourModule | null {
  return cachedModule;
}

/**
 * Synchronously get DMC colour data.
 *
 * Throws if not yet loaded - use loadDmcColours() first or check isDmcColoursLoaded().
 */
export function getDmcColours(): DmcColourModule {
  if (!cachedModule) {
    throw new Error('DMC colours not loaded. Call loadDmcColours() first.');
  }
  return cachedModule;
}
