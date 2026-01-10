import type { PatternDoc } from '../types';
import { parseOXS } from './oxs';
import { parseFCJSON } from './fcjson';

export async function parsePatternFile(file: File): Promise<PatternDoc> {
  const content = await file.text();
  const filename = file.name.toLowerCase();

  if (filename.endsWith('.oxs')) {
    return parseOXS(content);
  } else if (filename.endsWith('.fcjson')) {
    return parseFCJSON(content);
  } else {
    throw new Error(`Unsupported file format. Please use .oxs or .fcjson files.`);
  }
}

export { parseOXS } from './oxs';
export { parseFCJSON } from './fcjson';
