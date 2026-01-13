# Pattern Loading System

## Overview

The app uses a sophisticated lazy-loading and caching system for pattern files to avoid bundling 591MB of patterns into the build output. Patterns are loaded on-demand and cached using IndexedDB for offline support and fast subsequent loads.

## Architecture

### 1. Storage Location

Patterns are stored in `/public/patterns/` directory and served as static assets (not bundled by Vite).

- **Development**: Loaded from local dev server at `/patterns/`
- **Production**: Served from GitHub Pages static files

### 2. PatternLoader Service

Located in [`src/services/PatternLoader.ts`](../src/services/PatternLoader.ts)

**Features:**
- Cache-first strategy with IndexedDB
- Progress tracking for large downloads
- Background preloading of popular patterns
- Automatic cache expiration (7 days)
- De-duplication of concurrent requests

**Usage:**
```typescript
import { patternLoader } from '../services/PatternLoader';

// Initialize
await patternLoader.init();

// Load a pattern with progress
const arrayBuffer = await patternLoader.loadPattern('example.oxs', (progress) => {
  console.log(`${progress.percentage}% (${progress.loaded}/${progress.total} bytes)`);
});

// Preload patterns in background
await patternLoader.preloadPatterns(['pattern1.oxs', 'pattern2.oxs']);

// Get cache statistics
const stats = await patternLoader.getCacheStats();
console.log(`Cached ${stats.count} patterns (${stats.totalSize} bytes)`);

// Clear cache
await patternLoader.clearCache();
```

### 3. React Hooks

Located in [`src/hooks/usePattern.ts`](../src/hooks/usePattern.ts)

#### `usePattern(filename)`

Load a pattern file with React state management:

```tsx
import { usePattern } from '../hooks';

function MyComponent() {
  const { content, loading, progress, error, isCached } = usePattern('example.oxs');

  if (loading) {
    return <div>Loading... {progress?.percentage}%</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <div>Loaded {content?.length} bytes {isCached && '(from cache)'}</div>;
}
```

#### `usePatternCacheStats()`

Get cache statistics:

```tsx
import { usePatternCacheStats } from '../hooks';

function CacheDebug() {
  const { stats, loading, refresh } = usePatternCacheStats();

  if (loading) return <div>Loading stats...</div>;

  return (
    <div>
      <p>Cached patterns: {stats?.count}</p>
      <p>Total size: {(stats?.totalSize / 1024 / 1024).toFixed(2)} MB</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

#### `useClearPatternCache()`

Clear the cache:

```tsx
import { useClearPatternCache } from '../hooks';

function Settings() {
  const { clearCache, clearing } = useClearPatternCache();

  return (
    <button 
      onClick={() => clearCache(() => alert('Cache cleared!'))}
      disabled={clearing}
    >
      {clearing ? 'Clearing...' : 'Clear Cache'}
    </button>
  );
}
```

### 4. Pattern Catalog

Located in [`src/data/patternCatalog.ts`](../src/data/patternCatalog.ts)

**Convenience functions:**

```typescript
import { loadPatternFile, preloadPopularPatterns } from '../data/patternCatalog';

// Load a single pattern
const xmlContent = await loadPatternFile('example.oxs', (progress) => {
  console.log(`${progress.percentage}%`);
});

// Preload popular patterns in background (called automatically in main.tsx)
await preloadPopularPatterns();
```

## Build Process

### Custom Public Directory Copy

The build process excludes patterns from the bundle:

1. Vite builds the app (sets `publicDir: false`)
2. Custom script [`scripts/copy-public.js`](../scripts/copy-public.js) copies `public/` to `dist/` **excluding** `patterns/`
3. Result: Build output is ~4MB instead of 519MB

**Build command:**
```bash
pnpm build
# Runs: tsc && vite build && node scripts/copy-public.js
```

## Caching Strategy

### Cache-First with Expiration

1. Check IndexedDB cache first
2. If cached and not expired (< 7 days old), return cached data
3. Otherwise, fetch from network
4. Store in cache for future requests

### Cache Management

- **Automatic cleanup**: Expired entries are removed on initialization
- **Manual clear**: Use `clearCache()` method or React hook
- **Storage**: IndexedDB (typically 50MB+ quota per origin)

## Performance Optimizations

1. **De-duplication**: Multiple concurrent requests for the same pattern share a single network fetch
2. **Streaming**: Large files are streamed with progress updates, not loaded into memory all at once
3. **Background preloading**: Popular patterns load in the background after app initialization
4. **Deterministic caching**: Patterns are cached forever (until expiration) regardless of network conditions

## Deployment

### GitHub Pages

Patterns must be committed to the repository since GitHub Pages serves static files:

```bash
# Patterns are in: public/patterns/
# They are NOT copied to dist/ during build
# They are served directly from: https://yourusername.github.io/repo-name/patterns/
```

### Alternative: External CDN

For production, consider moving patterns to a CDN:

1. Upload patterns to S3/CloudFlare/etc
2. Update `PatternLoader.ts` to fetch from CDN URL
3. Remove patterns from repository

## Testing

Patterns are automatically tested by e2e tests in [`e2e/app.spec.ts`](../e2e/app.spec.ts).

## Troubleshooting

### Pattern not loading

1. Check browser console for errors
2. Verify pattern exists in `public/patterns/`
3. Check cache stats: `await patternLoader.getCacheStats()`
4. Try clearing cache: `await patternLoader.clearCache()`

### Build size too large

1. Verify `publicDir: false` in `vite.config.ts`
2. Check `dist/` directory: `du -sh dist/patterns/` should show "directory not found"
3. Verify build script includes `node scripts/copy-public.js`

### Cache not working

1. Check IndexedDB support: `'indexedDB' in window`
2. Check browser quota: May be limited in private/incognito mode
3. Check browser console for IDB errors

## Future Improvements

1. **Compression**: Serve patterns as `.gz` or `.br` compressed files
2. **CDN**: Move patterns to external CDN for faster global delivery
3. **Partial loading**: For very large patterns, load only visible sections
4. **Service Worker**: Add offline support with service worker caching
5. **Delta updates**: Cache pattern metadata separately from pattern data
