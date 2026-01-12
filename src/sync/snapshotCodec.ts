import type { PaletteCounts, UserProgress, ViewportTransform } from '../types';

export interface ProgressSnapshotV1 {
  v: 1;
  savedAt: number; // epoch ms
  patternId: string;
  stitchedStateB64: string;
  placedColorsB64: string;
  paletteCounts: PaletteCounts[];
  lastSelectedPaletteIndex: number | null;
  viewport: ViewportTransform;
}

function bytesToBase64(bytes: Uint8Array): string {
  // chunked to avoid call stack / argument limits
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return globalThis.btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = globalThis.atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function u16ToBase64(u16: Uint16Array): string {
  return bytesToBase64(new Uint8Array(u16.buffer));
}

function base64ToU16(b64: string): Uint16Array {
  const bytes = base64ToBytes(b64);
  // copy into aligned buffer
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Uint16Array(buf);
}

async function gzipCompress(input: Uint8Array): Promise<Uint8Array> {
  const CS = (globalThis as any).CompressionStream as (new (format: string) => any) | undefined;
  if (!CS) return input;

  const cs = new CS('gzip');
  const stream = new Blob([input as any]).stream().pipeThrough(cs);
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

async function gzipDecompress(input: Uint8Array): Promise<Uint8Array> {
  const DS = (globalThis as any).DecompressionStream as (new (format: string) => any) | undefined;
  if (!DS) return input;

  const ds = new DS('gzip');
  const stream = new Blob([input as any]).stream().pipeThrough(ds);
  const ab = await new Response(stream).arrayBuffer();
  return new Uint8Array(ab);
}

export async function encodeProgressSnapshot(progress: UserProgress, savedAt: number): Promise<Uint8Array> {
  const snap: ProgressSnapshotV1 = {
    v: 1,
    savedAt,
    patternId: progress.patternId,
    stitchedStateB64: bytesToBase64(progress.stitchedState),
    placedColorsB64: u16ToBase64(progress.placedColors),
    paletteCounts: progress.paletteCounts,
    lastSelectedPaletteIndex: progress.lastSelectedPaletteIndex,
    viewport: progress.viewport,
  };

  const json = JSON.stringify(snap);
  const bytes = new TextEncoder().encode(json);
  return await gzipCompress(bytes);
}

export async function decodeProgressSnapshot(blobBytes: Uint8Array): Promise<ProgressSnapshotV1> {
  // try gzip first, fall back to plain JSON
  let bytes: Uint8Array;
  try {
    bytes = await gzipDecompress(blobBytes);
  } catch {
    bytes = blobBytes;
  }

  const json = new TextDecoder().decode(bytes);
  const parsed = JSON.parse(json) as ProgressSnapshotV1;
  if (!parsed || parsed.v !== 1) throw new Error('Unsupported snapshot format');
  return parsed;
}

export function snapshotToProgress(snapshot: ProgressSnapshotV1): UserProgress {
  return {
    patternId: snapshot.patternId,
    stitchedState: base64ToBytes(snapshot.stitchedStateB64),
    placedColors: base64ToU16(snapshot.placedColorsB64),
    paletteCounts: snapshot.paletteCounts,
    lastSelectedPaletteIndex: snapshot.lastSelectedPaletteIndex,
    viewport: snapshot.viewport,
  };
}
