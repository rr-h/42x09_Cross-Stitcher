// Central Symbol Pool - Single Source of Truth (SSoT)
// Exactly 490 unique symbols for cross-stitch pattern palettes
// All symbols are single JavaScript code units (BMP only, no surrogate pairs)

/**
 * Maximum number of colours supported in a pattern palette.
 */
export const MAX_PALETTE_SIZE = 490;

/**
 * The central pool of 490 unique symbols.
 * Each symbol is a single BMP character (s.length === 1).
 *
 * Composition:
 * - ASCII printable (0x21-0x7E, excluding space): 94 chars
 * - Latin-1 Supplement (0xA1-0xFF, excluding soft hyphen 0xAD): 94 chars
 * - Latin Extended-A (0x0100-0x017F): 128 chars
 * - Greek uppercase/lowercase (0x0391-0x03C9): 57 chars
 * - Cyrillic uppercase/lowercase (0x0410-0x044F): 64 chars
 * - Box Drawing subset (0x2500-0x257F): 53 chars
 * Total: 490 unique symbols
 */
export const SYMBOL_POOL: readonly string[] = [
  // ASCII printable (94 characters: 0x21-0x7E)
  '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>',
  '?', '@', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '[', '\\',
  ']', '^', '_', '`', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k',
  'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '{', '|', '}', '~',
  // Latin-1 Supplement (94 characters: 0xA1-0xFF, excluding soft hyphen 0xAD)
  '\u00A1', '\u00A2', '\u00A3', '\u00A4', '\u00A5', '\u00A6', '\u00A7', '\u00A8',
  '\u00A9', '\u00AA', '\u00AB', '\u00AC', '\u00AE', '\u00AF', '\u00B0', '\u00B1',
  '\u00B2', '\u00B3', '\u00B4', '\u00B5', '\u00B6', '\u00B7', '\u00B8', '\u00B9',
  '\u00BA', '\u00BB', '\u00BC', '\u00BD', '\u00BE', '\u00BF', '\u00C0', '\u00C1',
  '\u00C2', '\u00C3', '\u00C4', '\u00C5', '\u00C6', '\u00C7', '\u00C8', '\u00C9',
  '\u00CA', '\u00CB', '\u00CC', '\u00CD', '\u00CE', '\u00CF', '\u00D0', '\u00D1',
  '\u00D2', '\u00D3', '\u00D4', '\u00D5', '\u00D6', '\u00D7', '\u00D8', '\u00D9',
  '\u00DA', '\u00DB', '\u00DC', '\u00DD', '\u00DE', '\u00DF', '\u00E0', '\u00E1',
  '\u00E2', '\u00E3', '\u00E4', '\u00E5', '\u00E6', '\u00E7', '\u00E8', '\u00E9',
  '\u00EA', '\u00EB', '\u00EC', '\u00ED', '\u00EE', '\u00EF', '\u00F0', '\u00F1',
  '\u00F2', '\u00F3', '\u00F4', '\u00F5', '\u00F6', '\u00F7', '\u00F8', '\u00F9',
  '\u00FA', '\u00FB', '\u00FC', '\u00FD', '\u00FE', '\u00FF',
  // Latin Extended-A (128 characters: 0x0100-0x017F)
  '\u0100', '\u0101', '\u0102', '\u0103', '\u0104', '\u0105', '\u0106', '\u0107',
  '\u0108', '\u0109', '\u010A', '\u010B', '\u010C', '\u010D', '\u010E', '\u010F',
  '\u0110', '\u0111', '\u0112', '\u0113', '\u0114', '\u0115', '\u0116', '\u0117',
  '\u0118', '\u0119', '\u011A', '\u011B', '\u011C', '\u011D', '\u011E', '\u011F',
  '\u0120', '\u0121', '\u0122', '\u0123', '\u0124', '\u0125', '\u0126', '\u0127',
  '\u0128', '\u0129', '\u012A', '\u012B', '\u012C', '\u012D', '\u012E', '\u012F',
  '\u0130', '\u0131', '\u0132', '\u0133', '\u0134', '\u0135', '\u0136', '\u0137',
  '\u0138', '\u0139', '\u013A', '\u013B', '\u013C', '\u013D', '\u013E', '\u013F',
  '\u0140', '\u0141', '\u0142', '\u0143', '\u0144', '\u0145', '\u0146', '\u0147',
  '\u0148', '\u0149', '\u014A', '\u014B', '\u014C', '\u014D', '\u014E', '\u014F',
  '\u0150', '\u0151', '\u0152', '\u0153', '\u0154', '\u0155', '\u0156', '\u0157',
  '\u0158', '\u0159', '\u015A', '\u015B', '\u015C', '\u015D', '\u015E', '\u015F',
  '\u0160', '\u0161', '\u0162', '\u0163', '\u0164', '\u0165', '\u0166', '\u0167',
  '\u0168', '\u0169', '\u016A', '\u016B', '\u016C', '\u016D', '\u016E', '\u016F',
  '\u0170', '\u0171', '\u0172', '\u0173', '\u0174', '\u0175', '\u0176', '\u0177',
  '\u0178', '\u0179', '\u017A', '\u017B', '\u017C', '\u017D', '\u017E', '\u017F',
  // Greek uppercase and lowercase (57 characters)
  '\u0391', '\u0392', '\u0393', '\u0394', '\u0395', '\u0396', '\u0397', '\u0398',
  '\u0399', '\u039A', '\u039B', '\u039C', '\u039D', '\u039E', '\u039F', '\u03A0',
  '\u03A1', '\u03A3', '\u03A4', '\u03A5', '\u03A6', '\u03A7', '\u03A8', '\u03A9',
  '\u03B1', '\u03B2', '\u03B3', '\u03B4', '\u03B5', '\u03B6', '\u03B7', '\u03B8',
  '\u03B9', '\u03BA', '\u03BB', '\u03BC', '\u03BD', '\u03BE', '\u03BF', '\u03C0',
  '\u03C1', '\u03C2', '\u03C3', '\u03C4', '\u03C5', '\u03C6', '\u03C7', '\u03C8',
  '\u03C9', '\u03CA', '\u03CB', '\u03CC', '\u03CD', '\u03CE', '\u03D0', '\u03D1',
  '\u03D5',
  // Cyrillic uppercase and lowercase (64 characters: 0x0410-0x044F)
  '\u0410', '\u0411', '\u0412', '\u0413', '\u0414', '\u0415', '\u0416', '\u0417',
  '\u0418', '\u0419', '\u041A', '\u041B', '\u041C', '\u041D', '\u041E', '\u041F',
  '\u0420', '\u0421', '\u0422', '\u0423', '\u0424', '\u0425', '\u0426', '\u0427',
  '\u0428', '\u0429', '\u042A', '\u042B', '\u042C', '\u042D', '\u042E', '\u042F',
  '\u0430', '\u0431', '\u0432', '\u0433', '\u0434', '\u0435', '\u0436', '\u0437',
  '\u0438', '\u0439', '\u043A', '\u043B', '\u043C', '\u043D', '\u043E', '\u043F',
  '\u0440', '\u0441', '\u0442', '\u0443', '\u0444', '\u0445', '\u0446', '\u0447',
  '\u0448', '\u0449', '\u044A', '\u044B', '\u044C', '\u044D', '\u044E', '\u044F',
  // Box Drawing subset (53 characters to reach exactly 490)
  '\u2500', '\u2502', '\u250C', '\u2510', '\u2514', '\u2518', '\u251C', '\u2524',
  '\u252C', '\u2534', '\u253C', '\u2550', '\u2551', '\u2552', '\u2553', '\u2554',
  '\u2555', '\u2556', '\u2557', '\u2558', '\u2559', '\u255A', '\u255B', '\u255C',
  '\u255D', '\u255E', '\u255F', '\u2560', '\u2561', '\u2562', '\u2563', '\u2564',
  '\u2565', '\u2566', '\u2567', '\u2568', '\u2569', '\u256A', '\u256B', '\u256C',
  '\u2580', '\u2584', '\u2588', '\u258C', '\u2590', '\u2591', '\u2592', '\u2593',
  '\u25A0', '\u25B2', '\u25BC', '\u25C6', '\u25CF',
] as const;

// Pre-compute a Set for O(1) membership checks
const SYMBOL_SET = new Set(SYMBOL_POOL);

/**
 * Validates that a string is a single JavaScript code unit (BMP character).
 * Returns true if the string has exactly length 1 and is not in the surrogate range.
 */
export function isSingleCodeUnitSymbol(s: string): boolean {
  if (s.length !== 1) return false;
  const code = s.charCodeAt(0);
  // Exclude surrogate range 0xD800-0xDFFF
  if (code >= 0xD800 && code <= 0xDFFF) return false;
  return true;
}

/**
 * Checks if a character is in the braille range (U+2800-U+28FF).
 */
function isBraille(code: number): boolean {
  return code >= 0x2800 && code <= 0x28FF;
}

/**
 * Checks if a character is whitespace or a control character.
 */
function isWhitespaceOrControl(code: number): boolean {
  // Control characters: 0x00-0x1F, 0x7F, 0x80-0x9F
  if (code <= 0x1F) return true;
  if (code === 0x7F) return true;
  if (code >= 0x80 && code <= 0x9F) return true;
  // Whitespace: space (0x20), various Unicode spaces
  if (code === 0x20) return true; // space
  if (code === 0xA0) return true; // non-breaking space
  if (code === 0x00AD) return true; // soft hyphen
  return false;
}

/**
 * Validates the symbol pool. Throws an error if validation fails.
 * Checks:
 * - Exactly 490 symbols
 * - All unique
 * - Each is a single code unit
 * - None are braille
 * - None are whitespace/control
 * - None are in the surrogate range
 */
export function validateSymbolPool(pool: readonly string[]): void {
  if (pool.length !== MAX_PALETTE_SIZE) {
    throw new Error(
      `Symbol pool must have exactly ${MAX_PALETTE_SIZE} symbols, but has ${pool.length}`
    );
  }

  const seen = new Set<string>();
  for (let i = 0; i < pool.length; i++) {
    const s = pool[i];

    if (s.length !== 1) {
      throw new Error(
        `Symbol at index ${i} is not a single character: "${s}" (length ${s.length})`
      );
    }

    const code = s.charCodeAt(0);

    // Check surrogate range
    if (code >= 0xD800 && code <= 0xDFFF) {
      throw new Error(
        `Symbol at index ${i} is in the surrogate range (U+${code.toString(16).toUpperCase()})`
      );
    }

    // Check braille range
    if (isBraille(code)) {
      throw new Error(
        `Symbol at index ${i} is a braille character (U+${code.toString(16).toUpperCase()})`
      );
    }

    // Check whitespace/control
    if (isWhitespaceOrControl(code)) {
      throw new Error(
        `Symbol at index ${i} is whitespace or a control character (U+${code.toString(16).toUpperCase()})`
      );
    }

    // Check uniqueness
    if (seen.has(s)) {
      throw new Error(`Duplicate symbol "${s}" at index ${i}`);
    }
    seen.add(s);
  }
}

/**
 * Checks whether a symbol is valid and present in the central pool.
 */
export function isValidPoolSymbol(s: string): boolean {
  return isSingleCodeUnitSymbol(s) && SYMBOL_SET.has(s);
}

/**
 * Options for symbol assignment.
 */
export interface SymbolAssignOptions {
  /**
   * If true, provided symbols (from file parsers) will be considered as candidates.
   * If false (for image conversion), all symbols come from the pool.
   */
  allowProvidedSymbols: boolean;

  /**
   * If true and allowProvidedSymbols is true, the algorithm will prefer
   * keeping valid provided symbols rather than replacing them.
   */
  preferProvidedSymbols: boolean;

  /**
   * How to handle conflicts when a provided symbol is invalid or duplicated.
   * - "reassign": Replace with the next available symbol from the pool (default).
   * - "reject": Throw an error on conflict (strict mode).
   */
  conflictPolicy: 'reassign' | 'reject';

  /**
   * Starting offset in the symbol pool for assignment (default 0).
   * Useful for deterministic assignment starting from a specific point.
   */
  startingOffset?: number;
}

/**
 * Default options for symbol assignment.
 */
export const DEFAULT_SYMBOL_OPTIONS: SymbolAssignOptions = {
  allowProvidedSymbols: false,
  preferProvidedSymbols: false,
  conflictPolicy: 'reassign',
  startingOffset: 0,
};

/**
 * Assigns unique symbols to a palette from the central symbol pool.
 *
 * Algorithm:
 * 1. Validates the symbol pool.
 * 2. If palette.length > 490, throws an error.
 * 3. If allowProvidedSymbols is true:
 *    - Normalises candidate symbols (trim, must be length 1, must be in pool).
 *    - Accepts only if not already used in this palette.
 * 4. For remaining entries without accepted symbols:
 *    - Assigns next unused symbol from pool, scanning from startingOffset.
 * 5. Validates all assigned symbols are unique and in pool.
 * 6. Returns a new array (does not mutate input).
 *
 * @param palette - The palette entries with optional symbol candidates.
 * @param options - Assignment options.
 * @returns A new array of palette entries with guaranteed unique valid symbols.
 */
export function assignSymbolsForPalette<T extends object>(
  palette: readonly T[],
  options: SymbolAssignOptions = DEFAULT_SYMBOL_OPTIONS
): (T & { symbol: string })[] {
  // Step 1: Validate the pool
  validateSymbolPool(SYMBOL_POOL);

  // Step 2: Check palette size
  if (palette.length > MAX_PALETTE_SIZE) {
    throw new Error(
      `Palette has ${palette.length} colours but maximum supported is ${MAX_PALETTE_SIZE}. Reduce the number of colours.`
    );
  }

  const {
    allowProvidedSymbols,
    preferProvidedSymbols,
    conflictPolicy,
    startingOffset = 0,
  } = options;

  // Track which symbols are used
  const usedSymbols = new Set<string>();

  // Track which pool indices are used
  const usedPoolIndices = new Set<number>();

  // Result array
  const result: (T & { symbol: string })[] = [];

  // First pass: Process provided symbols if allowed
  const needsAssignment: number[] = [];

  for (let i = 0; i < palette.length; i++) {
    const entry = palette[i];
    let assignedSymbol: string | null = null;

    // Access symbol property safely (may not exist on all objects)
    const entrySymbol = (entry as { symbol?: string | null }).symbol;

    if (allowProvidedSymbols && preferProvidedSymbols && entrySymbol != null) {
      const candidate = entrySymbol.trim();

      // Validate candidate: must be single char and in pool
      if (
        candidate.length === 1 &&
        isValidPoolSymbol(candidate) &&
        !usedSymbols.has(candidate)
      ) {
        // Accept this symbol
        assignedSymbol = candidate;
        usedSymbols.add(candidate);

        // Mark the pool index as used
        const poolIndex = SYMBOL_POOL.indexOf(candidate);
        if (poolIndex >= 0) {
          usedPoolIndices.add(poolIndex);
        }
      } else if (conflictPolicy === 'reject' && candidate.length === 1) {
        // In reject mode, invalid or duplicate provided symbols cause an error
        if (!isValidPoolSymbol(candidate)) {
          throw new Error(
            `Palette entry ${i} has invalid symbol "${candidate}" not in the symbol pool`
          );
        }
        if (usedSymbols.has(candidate)) {
          throw new Error(
            `Palette entry ${i} has duplicate symbol "${candidate}"`
          );
        }
      }
      // Otherwise fall through to reassignment
    }

    if (assignedSymbol !== null) {
      result.push({ ...entry, symbol: assignedSymbol });
    } else {
      // Mark for later assignment
      needsAssignment.push(i);
      result.push({ ...entry, symbol: '' }); // Placeholder
    }
  }

  // Second pass: Assign symbols from pool to entries that need them
  let poolScanIndex = startingOffset % SYMBOL_POOL.length;

  for (const paletteIndex of needsAssignment) {
    // Find next unused symbol in pool
    let attempts = 0;
    while (usedPoolIndices.has(poolScanIndex) && attempts < SYMBOL_POOL.length) {
      poolScanIndex = (poolScanIndex + 1) % SYMBOL_POOL.length;
      attempts++;
    }

    if (attempts >= SYMBOL_POOL.length) {
      // This should never happen if palette.length <= 490
      throw new Error(
        `Unable to assign symbol for palette entry ${paletteIndex}: pool exhausted`
      );
    }

    const symbol = SYMBOL_POOL[poolScanIndex];
    usedPoolIndices.add(poolScanIndex);
    usedSymbols.add(symbol);

    result[paletteIndex] = { ...result[paletteIndex], symbol };

    // Move to next index for next assignment
    poolScanIndex = (poolScanIndex + 1) % SYMBOL_POOL.length;
  }

  // Final validation
  const finalSymbols = new Set<string>();
  for (let i = 0; i < result.length; i++) {
    const entry = result[i];

    if (!entry.symbol || entry.symbol.length !== 1) {
      throw new Error(
        `Palette entry ${i} has invalid symbol after assignment: "${entry.symbol}"`
      );
    }

    if (!isValidPoolSymbol(entry.symbol)) {
      throw new Error(
        `Palette entry ${i} symbol "${entry.symbol}" is not in the symbol pool`
      );
    }

    if (finalSymbols.has(entry.symbol)) {
      throw new Error(
        `Duplicate symbol "${entry.symbol}" detected after assignment at index ${i}`
      );
    }
    finalSymbols.add(entry.symbol);
  }

  return result;
}

// Validate the pool at module load time (fail fast)
validateSymbolPool(SYMBOL_POOL);
