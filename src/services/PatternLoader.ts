/**
 * PatternLoader - Lazy loading and caching service for pattern files
 *
 * Features:
 * - Lazy loads patterns only when needed
 * - Caches patterns in IndexedDB for offline access
 * - Background preloading of popular patterns
 * - Cache-first strategy with automatic expiration
 * - Progress tracking for large downloads
 */

import { IDBPDatabase, openDB } from 'idb';

const DB_NAME = 'pattern-cache';
const DB_VERSION = 1;
const STORE_NAME = 'patterns';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
// GitHub repository info for fetching patterns from raw URLs
const GITHUB_REPO_OWNER = 'rr-h';
const GITHUB_REPO_NAME = '42x09_Cross-Stitcher';
const GITHUB_BRANCH = 'main';

// Construct pattern URL based on environment
function getPatternUrl(filename: string): string {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    // Development: fetch from local dev server
    return `/patterns/${filename}`;
  } else {
    // Production: fetch from GitHub raw content
    // This avoids bundling 591MB of patterns in the deployment
    return `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/public/patterns/${filename}`;
  }
}
interface CachedPattern {
  path: string;
  data: ArrayBuffer;
  timestamp: number;
  size: number;
}

interface LoadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class PatternLoader {
  private db: IDBPDatabase | null = null;
  private loadingPromises = new Map<string, Promise<ArrayBuffer>>();
  private preloadQueue: string[] = [];
  private isPreloading = false;

  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'path' });
          store.createIndex('timestamp', 'timestamp');
        }
      },
    });

    // Clean expired cache on init
    await this.cleanExpiredCache();
  }

  /**
   * Load a pattern file with caching
   * Cache-first strategy: check cache, then network
   */
  async loadPattern(
    path: string,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<ArrayBuffer> {
    // Return existing promise if already loading
    if (this.loadingPromises.has(path)) {
      return this.loadingPromises.get(path)!;
    }

    const loadPromise = this._loadPatternInternal(path, onProgress);
    this.loadingPromises.set(path, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.loadingPromises.delete(path);
    }
  }

  private async _loadPatternInternal(
    path: string,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<ArrayBuffer> {
    // Try cache first
    const cached = await this.getFromCache(path);
    if (cached) {
      console.log(`[PatternLoader] Loaded from cache: ${path}`);
      if (onProgress) {
        onProgress({ loaded: cached.size, total: cached.size, percentage: 100 });
      }
      return cached.data;
    }

    // Fetch from network
    const url = getPatternUrl(path);
    console.log(`[PatternLoader] Fetching from network: ${path}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load pattern: ${response.statusText} (${response.status})`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    // Stream the response with progress tracking
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const chunks: Uint8Array[] = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.length;

      if (onProgress && total > 0) {
        onProgress({
          loaded,
          total,
          percentage: Math.round((loaded / total) * 100),
        });
      }
    }

    // Combine chunks into single ArrayBuffer
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    const arrayBuffer = result.buffer;

    // Cache for future use
    await this.saveToCache(path, arrayBuffer);

    return arrayBuffer;
  }

  /**
   * Preload patterns in the background
   * Useful for preloading popular/small patterns
   */
  async preloadPatterns(paths: string[], priority: boolean = false): Promise<void> {
    if (priority) {
      this.preloadQueue.unshift(...paths);
    } else {
      this.preloadQueue.push(...paths);
    }

    if (!this.isPreloading) {
      this.processPreloadQueue();
    }
  }

  private async processPreloadQueue(): Promise<void> {
    if (this.preloadQueue.length === 0) {
      this.isPreloading = false;
      return;
    }

    this.isPreloading = true;
    const path = this.preloadQueue.shift()!;

    try {
      // Only preload if not already cached
      const cached = await this.getFromCache(path);
      if (!cached) {
        console.log(`[PatternLoader] Preloading: ${path}`);
        await this.loadPattern(path);
      }
    } catch (error) {
      console.warn(`[PatternLoader] Failed to preload ${path}:`, error);
    }

    // Continue with next in queue (with small delay to not block main thread)
    setTimeout(() => this.processPreloadQueue(), 100);
  }

  /**
   * Get pattern from IndexedDB cache
   */
  private async getFromCache(path: string): Promise<CachedPattern | null> {
    if (!this.db) await this.init();

    try {
      const cached = await this.db!.get(STORE_NAME, path);

      if (!cached) return null;

      // Check if cache is expired
      const age = Date.now() - cached.timestamp;
      if (age > CACHE_EXPIRY_MS) {
        await this.db!.delete(STORE_NAME, path);
        return null;
      }

      return cached;
    } catch (error) {
      console.warn(`[PatternLoader] Cache read error for ${path}:`, error);
      return null;
    }
  }

  /**
   * Save pattern to IndexedDB cache
   */
  private async saveToCache(path: string, data: ArrayBuffer): Promise<void> {
    if (!this.db) await this.init();

    try {
      const cached: CachedPattern = {
        path,
        data,
        timestamp: Date.now(),
        size: data.byteLength,
      };

      await this.db!.put(STORE_NAME, cached);
      console.log(
        `[PatternLoader] Cached ${path} (${(data.byteLength / 1024 / 1024).toFixed(2)}MB)`
      );
    } catch (error) {
      console.warn(`[PatternLoader] Cache write error for ${path}:`, error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanExpiredCache(): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');

      const cutoff = Date.now() - CACHE_EXPIRY_MS;
      const oldEntries = await index.getAll(IDBKeyRange.upperBound(cutoff));

      for (const entry of oldEntries) {
        await store.delete(entry.path);
        console.log(`[PatternLoader] Removed expired cache: ${entry.path}`);
      }

      await tx.done;
    } catch (error) {
      console.warn('[PatternLoader] Cache cleanup error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    count: number;
    totalSize: number;
    patterns: Array<{ path: string; size: number; age: number }>;
  }> {
    if (!this.db) await this.init();

    const all = await this.db!.getAll(STORE_NAME);
    const totalSize = all.reduce((sum, item) => sum + item.size, 0);

    const patterns = all.map(item => ({
      path: item.path,
      size: item.size,
      age: Date.now() - item.timestamp,
    }));

    return { count: all.length, totalSize, patterns };
  }

  /**
   * Clear all cached patterns
   */
  async clearCache(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear(STORE_NAME);
    console.log('[PatternLoader] Cache cleared');
  }

  /**
   * Check if pattern is cached
   */
  async isCached(path: string): Promise<boolean> {
    const cached = await this.getFromCache(path);
    return cached !== null;
  }
}

// Singleton instance
export const patternLoader = new PatternLoader();
