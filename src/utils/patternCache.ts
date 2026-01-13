// Persistent caching for pattern gallery using IndexedDB
// Stores parsed patterns and generated preview images across sessions

import type { PatternDoc } from '../types';

const DB_NAME = 'CrossStitcherPatternCache';
const DB_VERSION = 1;
const PATTERN_STORE = 'patterns';
const CACHE_NAME = 'pattern-files-v1';

interface CachedPattern {
  filename: string;
  pattern: PatternDoc;
  previewDataUrl: string;
  timestamp: number;
}

// Open IndexedDB connection
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create pattern store if it doesn't exist
      if (!db.objectStoreNames.contains(PATTERN_STORE)) {
        const store = db.createObjectStore(PATTERN_STORE, { keyPath: 'filename' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Get cached pattern from IndexedDB
export async function getCachedPattern(
  filename: string
): Promise<{ pattern: PatternDoc; previewDataUrl: string } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PATTERN_STORE], 'readonly');
      const store = transaction.objectStore(PATTERN_STORE);
      const request = store.get(filename);

      request.onsuccess = () => {
        const cached = request.result as CachedPattern | undefined;
        if (cached) {
          resolve({ pattern: cached.pattern, previewDataUrl: cached.previewDataUrl });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting cached pattern:', error);
    return null;
  }
}

// Save pattern to IndexedDB cache
export async function setCachedPattern(
  filename: string,
  pattern: PatternDoc,
  previewDataUrl: string
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PATTERN_STORE], 'readwrite');
      const store = transaction.objectStore(PATTERN_STORE);

      const cached: CachedPattern = {
        filename,
        pattern,
        previewDataUrl,
        timestamp: Date.now(),
      };

      const request = store.put(cached);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error caching pattern:', error);
  }
}

// Get all cached pattern filenames
export async function getCachedPatternList(): Promise<string[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PATTERN_STORE], 'readonly');
      const store = transaction.objectStore(PATTERN_STORE);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting cached pattern list:', error);
    return [];
  }
}

// Clear old cache entries (optional - can be used to manage storage)
export async function clearOldCache(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const db = await openDB();
    const cutoffTime = Date.now() - maxAgeMs;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PATTERN_STORE], 'readwrite');
      const store = transaction.objectStore(PATTERN_STORE);
      const index = store.index('timestamp');
      const request = index.openCursor();

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const cached = cursor.value as CachedPattern;
          if (cached.timestamp < cutoffTime) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error clearing old cache:', error);
  }
}

// Cache raw pattern file using Cache API
export async function cachePatternFile(url: string, content: string): Promise<void> {
  try {
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      const response = new Response(content, {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'max-age=31536000', // 1 year
        },
      });
      await cache.put(url, response);
    }
  } catch (error) {
    console.error('Error caching pattern file:', error);
  }
}

// Get cached pattern file from Cache API
export async function getCachedPatternFile(url: string): Promise<string | null> {
  try {
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(url);
      if (response) {
        return await response.text();
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting cached pattern file:', error);
    return null;
  }
}

// Clear all caches (useful for debugging or cache management)
export async function clearAllCaches(): Promise<void> {
  try {
    // Clear IndexedDB
    const db = await openDB();
    const transaction = db.transaction([PATTERN_STORE], 'readwrite');
    const store = transaction.objectStore(PATTERN_STORE);
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Clear Cache API
    if ('caches' in window) {
      await caches.delete(CACHE_NAME);
    }

    console.log('All pattern caches cleared');
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
}
