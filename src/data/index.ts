export {
  colorDistance,
  DMC_COLORS,
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
export type { DMCColor } from './dmcColors.ts';
export { loadPatternFile, patternCatalog } from './patternCatalog.ts';
export type { PatternCatalogEntry } from './patternCatalog.ts';
