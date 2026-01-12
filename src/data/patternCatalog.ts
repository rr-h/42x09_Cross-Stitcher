// Pattern catalog for the gallery
// Lists all available pre-loaded patterns with metadata

export interface PatternCatalogEntry {
  filename: string;
  displayName: string;
  sizeKB: number; // Approximate file size for sorting (smaller loads faster)
}

// Helper to convert filename to readable display name
function filenameToDisplayName(filename: string): string {
  return filename
    .replace(/\.oxs$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/(\d+)$/, ' $1') // Add space before trailing numbers
    .trim();
}

// All available patterns sorted by file size (smallest first for faster loading)
const patternData: Array<{ filename: string; sizeKB: number }> = [
  { filename: 'bluehende-mandelbaumzweig-5093000.oxs', sizeKB: 3958 },
  { filename: 'Blumen-und-Fruechte-Jan-Frans-van-Dael.oxs', sizeKB: 4091 },
  { filename: 'cleopatra.oxs', sizeKB: 4270 },
  { filename: 'Bei-Sonnenuntergang-in-Venedig.oxs', sizeKB: 7055 },
  { filename: 'Cafeterrasse-bei-Nacht.oxs', sizeKB: 7130 },
  { filename: 'Bluehende-Pfirsichbaeume-Souvenir-de-Mauve.oxs', sizeKB: 7283 },
  { filename: 'Annunciation.oxs', sizeKB: 8537 },
  { filename: 'vam5934_v1-1.oxs', sizeKB: 13466 },
  { filename: 'art-deco.oxs', sizeKB: 14231 },
  { filename: 'das-maedchen-mit-dem-perlenohrring-unrestauriert.oxs', sizeKB: 16744 },
  { filename: 'The-Houses-of-Parliament-London-with-the-sun-breaking-through-the-fog-Claude-Monet.oxs', sizeKB: 17572 },
  { filename: 'Die-Sonne-1.oxs', sizeKB: 19403 },
  { filename: 'hygieia_.oxs', sizeKB: 21847 },
  { filename: 'Gelb-Rot-Blau.oxs', sizeKB: 22665 },
  { filename: 'Die-Dame-mit-dem-Hermelin.oxs', sizeKB: 25808 },
  { filename: 'Sunset-1.oxs', sizeKB: 26103 },
  { filename: 'Musikstilleben-mit-Pfingstrosen-1.oxs', sizeKB: 26265 },
  { filename: 'tuerkisches-cafe_macke.oxs', sizeKB: 26902 },
  { filename: 'the-courtesan_van-gogh.oxs', sizeKB: 26911 },
  { filename: 'Impression-aufgehende-Sonne-1.oxs', sizeKB: 26989 },
  { filename: 'Vanitas-Still-Life-with-a-Tulip-Skull-and-Hour-Glass.oxs', sizeKB: 27409 },
  { filename: 'skeleton_cigarette.oxs', sizeKB: 27775 },
  { filename: 'Kreidefelsen-auf-Ruegen-2.oxs', sizeKB: 28233 },
  { filename: 'Die-Sternennacht.oxs', sizeKB: 28510 },
  { filename: 'Die-weisse-Katze-Kater-auf-gelbem-Kissen.oxs', sizeKB: 29128 },
  { filename: 'massaki-und-suijin-hain-am-sumida-fluss.oxs', sizeKB: 30023 },
  { filename: 'irises-at-horikiri.oxs', sizeKB: 30393 },
  { filename: 'the-archangel-michael-defeating-satan.oxs', sizeKB: 30404 },
  { filename: 'waves.oxs', sizeKB: 30556 },
  { filename: 'Madonna-mit-Kind.oxs', sizeKB: 32367 },
  { filename: 'Xaver_Rimsky_Korsakov.oxs', sizeKB: 34523 },
  { filename: 'Dame-in-gruener-Jacke.oxs', sizeKB: 34786 },
  { filename: 'Tiger.oxs', sizeKB: 35401 },
  { filename: 'Jahreszeiten-Der-Fruehling-1900.oxs', sizeKB: 35518 },
  { filename: 'dante-and-virgil-in-hell_1.oxs', sizeKB: 35663 },
  { filename: 'die-lesende.oxs', sizeKB: 35897 },
  { filename: 'der-schrei-munch-museum-oslo.oxs', sizeKB: 36077 },
  { filename: 'milchausgiessende-magd_vermeer.oxs', sizeKB: 40155 },
  { filename: 'vier-kuenste-der-tanz.oxs', sizeKB: 51858 },
];

export const patternCatalog: PatternCatalogEntry[] = patternData.map(({ filename, sizeKB }) => ({
  filename,
  displayName: filenameToDisplayName(filename),
  sizeKB,
}));

// Load pattern file content from the bundled assets
export async function loadPatternFile(filename: string): Promise<string> {
  const url = new URL(`../patterns/${filename}`, import.meta.url).href;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load pattern: ${filename}`);
  }
  return response.text();
}
