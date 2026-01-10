import { openDB, type IDBPDatabase } from 'idb';
import type { UserProgress, ViewportTransform, PaletteCounts } from '../types';

const DB_NAME = 'cross-stitcher-db';
const DB_VERSION = 1;
const PROGRESS_STORE = 'progress';

interface PersistedProgress {
  patternId: string;
  stitchedState: number[];
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

  return {
    patternId: persisted.patternId,
    stitchedState: new Uint8Array(persisted.stitchedState),
    paletteCounts: persisted.paletteCounts,
    lastSelectedPaletteIndex: persisted.lastSelectedPaletteIndex,
    viewport: persisted.viewport,
  };
}

export async function deleteProgress(patternId: string): Promise<void> {
  const db = await getDB();
  await db.delete(PROGRESS_STORE, patternId);
}
