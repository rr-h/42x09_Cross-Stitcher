// Seeded pseudo-random number generator using xorshift32
export function createSeededRandom(seed: number): () => number {
  let state = seed || 1;

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

// Create a seed from grid coordinates
export function cellSeed(col: number, row: number): number {
  // Simple hash combining col and row
  return ((col * 73856093) ^ (row * 19349663)) >>> 0;
}

// Get deterministic random values for a cell
export function getCellRandoms(col: number, row: number): {
  offsetX1: number;
  offsetY1: number;
  offsetX2: number;
  offsetY2: number;
  thickness1: number;
  thickness2: number;
  highlight1: number;
  highlight2: number;
} {
  const rng = createSeededRandom(cellSeed(col, row));

  return {
    offsetX1: (rng() - 0.5) * 2,
    offsetY1: (rng() - 0.5) * 2,
    offsetX2: (rng() - 0.5) * 2,
    offsetY2: (rng() - 0.5) * 2,
    thickness1: 0.9 + rng() * 0.2,
    thickness2: 0.9 + rng() * 0.2,
    highlight1: 0.3 + rng() * 0.3,
    highlight2: 0.3 + rng() * 0.3,
  };
}
