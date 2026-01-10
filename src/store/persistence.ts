import { openDB, type IDBPDatabase } from 'idb';
import type { UserProgress, ViewportTransform, PaletteCounts } from '../types';
import { NO_STITCH } from '../types';

const DB_NAME = 'cross-stitcher-db';
const DB_VERSION = 2; // Bumped version for placedColors addition
const PROGRESS_STORE = 'progress';

interface PersistedProgress {
  patternId: string;
  stitchedState: number[];
  placedColors: number[];
  paletteCounts: PaletteCounts[];
  lastSelectedPaletteIndex: number | null;
  viewport: ViewportTransform;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
          db.createObjectStore(PROGRESS_STORE, { keyPath: 'patternId' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProgress(progress: UserProgress): Promise<void> {
  const db = await getDB();

  const persisted: PersistedProgress = {
    patternId: progress.patternId,
    stitchedState: Array.from(progress.stitchedState),
    placedColors: Array.from(progress.placedColors),
    paletteCounts: progress.paletteCounts,
    lastSelectedPaletteIndex: progress.lastSelectedPaletteIndex,
    viewport: progress.viewport,
  };

  await db.put(PROGRESS_STORE, persisted);
}

export async function loadProgress(patternId: string): Promise<UserProgress | null> {
  const db = await getDB();
  const persisted = await db.get(PROGRESS_STORE, patternId) as PersistedProgress | undefined;

  if (!persisted) {
    return null;
  }

  // Handle migration from old format without placedColors
  let placedColors: Uint16Array;
  if (persisted.placedColors) {
    placedColors = new Uint16Array(persisted.placedColors);
  } else {
    // Migrate old progress: assume all stitches were placed with correct color
    placedColors = new Uint16Array(persisted.stitchedState.length);
    placedColors.fill(NO_STITCH);
  }

  return {
    patternId: persisted.patternId,
    stitchedState: new Uint8Array(persisted.stitchedState),
    placedColors,
    paletteCounts: persisted.paletteCounts,
    lastSelectedPaletteIndex: persisted.lastSelectedPaletteIndex,
    viewport: persisted.viewport,
  };
}

export async function deleteProgress(patternId: string): Promise<void> {
  const db = await getDB();
  await db.delete(PROGRESS_STORE, patternId);
}
