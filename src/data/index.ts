// Re-export from dmcColors for backwards compatibility (loads synchronously)
// NOTE: These imports will include the large DMC_COLORS array in the main bundle
// if used directly. For lazy loading, use loadDmcColours() instead.
export {
  DMC_COLORS,
  colorDistance,
  findByCode,
  findByHex,
  findByName,
  findByRgb,
  findClosestDMC,
  findClosestDMCColors,
  findClosestDMCWithDistance,
  findDMC,
  getAllCodes,
  getColorCount,
  getColorFamily,
  rgbToHex,
  searchByName,
} from './dmcColors.ts';
export type { DMCColor } from './dmcColorsTypes.ts';

// Lazy loading API (recommended for new code)
export {
  getDmcColours,
  getDmcColoursIfLoaded,
  isDmcColoursLoaded,
  loadDmcColours,
} from './loadDmcColours.ts';
export type { DmcColourModule } from './loadDmcColours.ts';

export { loadPatternFile, patternCatalog } from './patternCatalog.ts';
export type { PatternCatalogEntry } from './patternCatalog.ts';
