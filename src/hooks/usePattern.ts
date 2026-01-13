/**
 * React hook for loading patterns with caching and progress tracking
 */

import { useCallback, useEffect, useState } from 'react';
import { loadPatternFile, type PatternLoadProgress } from '../data/patternCatalog';
import { patternLoader } from '../services/PatternLoader';

export type { PatternLoadProgress } from '../data/patternCatalog';

export interface UsePatternResult {
  content: string | null;
  loading: boolean;
  error: Error | null;
  progress: PatternLoadProgress | null;
  isCached: boolean;
  reload: () => Promise<void>;
}

/**
 * Hook to load a pattern file with caching and progress tracking
 *
 * @param filename - The pattern filename (relative to /patterns/)
 * @returns Pattern content, loading state, error, progress, and reload function
 *
 * @example
 * ```tsx
 * const { content, loading, progress, error } = usePattern('example.oxs');
 *
 * if (loading) return <div>Loading... {progress?.percentage}%</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * if (content) return <div>Loaded {content.length} bytes</div>;
 * ```
 */
export function usePattern(filename: string | null): UsePatternResult {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<PatternLoadProgress | null>(null);
  const [isCached, setIsCached] = useState(false);

  const loadPattern = useCallback(async () => {
    if (!filename) {
      setContent(null);
      setLoading(false);
      setError(null);
      setProgress(null);
      setIsCached(false);
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(null);

    try {
      // Check if cached
      await patternLoader.init();
      const cached = await patternLoader.isCached(filename);
      setIsCached(cached);

      // Load the pattern
      const patternContent = await loadPatternFile(filename, prog => {
        setProgress(prog);
      });

      setContent(patternContent);
      setProgress({ loaded: patternContent.length, total: patternContent.length, percentage: 100 });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error(`Failed to load pattern ${filename}:`, error);
    } finally {
      setLoading(false);
    }
  }, [filename]);

  useEffect(() => {
    loadPattern();
  }, [loadPattern]);

  return {
    content,
    loading,
    error,
    progress,
    isCached,
    reload: loadPattern,
  };
}

/**
 * Hook to get pattern cache statistics
 * Useful for debugging or showing cache status in UI
 */
export function usePatternCacheStats() {
  const [stats, setStats] = useState<{
    count: number;
    totalSize: number;
    patterns: Array<{ path: string; size: number; age: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await patternLoader.init();
      const cacheStats = await patternLoader.getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}

/**
 * Hook to clear pattern cache
 * Returns a function that clears the cache and optionally calls a callback
 */
export function useClearPatternCache() {
  const [clearing, setClearing] = useState(false);

  const clearCache = useCallback(async (onComplete?: () => void) => {
    setClearing(true);
    try {
      await patternLoader.init();
      await patternLoader.clearCache();
      console.log('[usePattern] Cache cleared');
      onComplete?.();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setClearing(false);
    }
  }, []);

  return { clearCache, clearing };
}
