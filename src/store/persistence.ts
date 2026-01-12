import { openDB, type IDBPDatabase } from 'idb';
import type { PaletteCounts, UserProgress, ViewportTransform } from '../types';
import { NO_STITCH } from '../types';

const DB_NAME = 'cross-stitcher-db';
const DB_VERSION = 3;

// Stores
const PROGRESS_STORE = 'progress';
const SNAPSHOT_STORE = 'snapshots';

type MaybeArrayBuffer = ArrayBuffer | number[];

interface PersistedProgress {
  patternId: string;
  stitchedState: MaybeArrayBuffer;
  placedColors?: MaybeArrayBuffer;
  paletteCounts: PaletteCounts[];
  lastSelectedPaletteIndex: number | null;
  viewport: ViewportTransform;
}

interface PersistedSnapshot extends PersistedProgress {
  slot: number; // 0..8
  savedAt: number; // epoch ms
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
          db.createObjectStore(PROGRESS_STORE, { keyPath: 'patternId' });
        }

        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          const store = db.createObjectStore(SNAPSHOT_STORE, { keyPath: ['patternId', 'slot'] });
          store.createIndex('byPatternId', 'patternId');
          store.createIndex('byPatternIdSavedAt', ['patternId', 'savedAt']);
        }
      },
    });
  }
  return dbPromise;
}

function u8ToPersisted(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

function u16ToPersisted(u16: Uint16Array): ArrayBuffer {
  return u16.buffer.slice(u16.byteOffset, u16.byteOffset + u16.byteLength) as ArrayBuffer;
}

function persistedToU8(data: MaybeArrayBuffer): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data);
}

function persistedToU16(data: MaybeArrayBuffer): Uint16Array {
  if (data instanceof ArrayBuffer) return new Uint16Array(data);
  return new Uint16Array(data);
}

function toPersisted(progress: UserProgress): PersistedProgress {
  return {
    patternId: progress.patternId,
    stitchedState: u8ToPersisted(progress.stitchedState),
    placedColors: u16ToPersisted(progress.placedColors),
    paletteCounts: progress.paletteCounts,
    lastSelectedPaletteIndex: progress.lastSelectedPaletteIndex,
    viewport: progress.viewport,
  };
}

function fromPersisted(persisted: PersistedProgress): UserProgress {
  const stitchedState = persistedToU8(persisted.stitchedState);

  let placedColors: Uint16Array;
  if (persisted.placedColors) {
    placedColors = persistedToU16(persisted.placedColors);
  } else {
    placedColors = new Uint16Array(stitchedState.length);
    placedColors.fill(NO_STITCH);
  }

  return {
    patternId: persisted.patternId,
    stitchedState,
    placedColors,
    paletteCounts: persisted.paletteCounts,
    lastSelectedPaletteIndex: persisted.lastSelectedPaletteIndex,
    viewport: persisted.viewport,
  };
}

export async function saveProgress(progress: UserProgress): Promise<void> {
  const db = await getDB();
  await db.put(PROGRESS_STORE, toPersisted(progress));
}

export async function loadProgress(patternId: string): Promise<UserProgress | null> {
  const db = await getDB();
  const persisted = (await db.get(PROGRESS_STORE, patternId)) as PersistedProgress | undefined;
  if (!persisted) return null;
  return fromPersisted(persisted);
}

export async function deleteProgress(patternId: string): Promise<void> {
  const db = await getDB();
  await db.delete(PROGRESS_STORE, patternId);
}

/**
 * Local rolling snapshots (max 9 per pattern).
 * This is separate from saveProgress (which stores only the latest state).
 */
export async function saveLocalRollingSnapshot(
  progress: UserProgress,
  opts?: { maxSlots?: number; savedAt?: number }
): Promise<number> {
  const db = await getDB();
  const maxSlots = opts?.maxSlots ?? 9;
  const savedAt = opts?.savedAt ?? Date.now();

  if (maxSlots <= 0) throw new Error('maxSlots must be > 0');

  const existing = (await db.getAllFromIndex(
    SNAPSHOT_STORE,
    'byPatternId',
    progress.patternId
  )) as PersistedSnapshot[];

  const used = new Set<number>();
  for (const s of existing) used.add(s.slot);

  let slotToWrite: number | null = null;

  if (existing.length < maxSlots) {
    for (let slot = 0; slot < maxSlots; slot++) {
      if (!used.has(slot)) {
        slotToWrite = slot;
        break;
      }
    }
    if (slotToWrite === null) slotToWrite = existing.length;
  } else {
    // overwrite oldest
    existing.sort((a, b) => a.savedAt - b.savedAt);
    slotToWrite = existing[0].slot;
  }

  const record: PersistedSnapshot = {
    ...toPersisted(progress),
    slot: slotToWrite,
    savedAt,
  };

  await db.put(SNAPSHOT_STORE, record);
  return slotToWrite;
}

export async function listLocalSnapshots(
  patternId: string
): Promise<Array<{ slot: number; savedAt: number }>> {
  const db = await getDB();
  const existing = (await db.getAllFromIndex(
    SNAPSHOT_STORE,
    'byPatternId',
    patternId
  )) as PersistedSnapshot[];

  return existing
    .map(s => ({ slot: s.slot, savedAt: s.savedAt }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

export async function loadLocalSnapshot(
  patternId: string,
  slot: number
): Promise<UserProgress | null> {
  const db = await getDB();
  const rec = (await db.get(SNAPSHOT_STORE, [patternId, slot])) as PersistedSnapshot | undefined;
  if (!rec) return null;
  return fromPersisted(rec);
}

export async function deleteLocalSnapshots(patternId: string): Promise<void> {
  const db = await getDB();
  const existing = (await db.getAllFromIndex(
    SNAPSHOT_STORE,
    'byPatternId',
    patternId
  )) as PersistedSnapshot[];

  const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
  for (const s of existing) {
    void tx.store.delete([patternId, s.slot]);
  }
  await tx.done;
}
