// Pattern catalog for the gallery
// Lists all available pre-loaded patterns with metadata

export interface PatternCatalogEntry {
  filename: string;
  displayName: string;
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

// All available patterns in the gallery
const patternFilenames = [
  'Annunciation.oxs',
  'art-deco.oxs',
  'Bei-Sonnenuntergang-in-Venedig.oxs',
  'bluehende-mandelbaumzweig-5093000.oxs',
  'Bluehende-Pfirsichbaeume-Souvenir-de-Mauve.oxs',
  'Blumen-und-Fruechte-Jan-Frans-van-Dael.oxs',
  'Cafeterrasse-bei-Nacht.oxs',
  'cleopatra.oxs',
  'Dame-in-gruener-Jacke.oxs',
  'dante-and-virgil-in-hell_1.oxs',
  'das-maedchen-mit-dem-perlenohrring-unrestauriert.oxs',
  'der-schrei-munch-museum-oslo.oxs',
  'Die-Dame-mit-dem-Hermelin.oxs',
  'die-lesende.oxs',
  'Die-Sonne-1.oxs',
  'Die-Sternennacht.oxs',
  'Die-weisse-Katze-Kater-auf-gelbem-Kissen.oxs',
  'Gelb-Rot-Blau.oxs',
  'hygieia_.oxs',
  'Impression-aufgehende-Sonne-1.oxs',
  'irises-at-horikiri.oxs',
  'Jahreszeiten-Der-Fruehling-1900.oxs',
  'Kreidefelsen-auf-Ruegen-2.oxs',
  'Madonna-mit-Kind.oxs',
  'massaki-und-suijin-hain-am-sumida-fluss.oxs',
  'milchausgiessende-magd_vermeer.oxs',
  'Musikstilleben-mit-Pfingstrosen-1.oxs',
  'skeleton_cigarette.oxs',
  'Sunset-1.oxs',
  'the-archangel-michael-defeating-satan.oxs',
  'the-courtesan_van-gogh.oxs',
  'The-Houses-of-Parliament-London-with-the-sun-breaking-through-the-fog-Claude-Monet.oxs',
  'Tiger.oxs',
  'tuerkisches-cafe_macke.oxs',
  'vam5934_v1-1.oxs',
  'Vanitas-Still-Life-with-a-Tulip-Skull-and-Hour-Glass.oxs',
  'vier-kuenste-der-tanz.oxs',
  'waves.oxs',
  'Xaver_Rimsky_Korsakov.oxs',
];

export const patternCatalog: PatternCatalogEntry[] = patternFilenames.map(filename => ({
  filename,
  displayName: filenameToDisplayName(filename),
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
