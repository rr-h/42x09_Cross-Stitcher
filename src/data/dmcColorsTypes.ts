/**
 * Type definitions for DMC colour data.
 *
 * Separated from the main data file to avoid loading the large colour array
 * when only types are needed.
 */

/**
 * A single DMC embroidery thread colour.
 */
export interface DMCColor {
  /** DMC colour code (e.g., "310", "B5200", "White") */
  code: string;
  /** Human-readable colour name */
  name: string;
  /** Hexadecimal colour value with # prefix */
  hex: string;
  /** RGB values as a tuple [r, g, b] */
  rgb: [number, number, number];
}
