# Deployment Optimization Summary

## Problem

GitHub Pages deployment was timing out after 10 minutes while stuck in "syncing_files" status. The root cause was a **519MB build artifact** containing 591MB of pattern files that were being bundled into the dist directory.

## Solution

Implemented a lazy-loading and caching system that:

1. **Excludes patterns from build** - Patterns are no longer bundled
2. **Lazy loads patterns** - Patterns load only when selected
3. **Caches in IndexedDB** - Patterns cached for offline use and fast subsequent loads
4. **Preloads popular patterns** - Small patterns preload in background
5. **Tracks progress** - Shows download progress for large patterns

## Results

### Before
- **Build size**: 519MB (too large for GitHub Pages)
- **Deployment**: Timeout after 10 minutes
- **Load time**: All patterns loaded upfront

### After
- **Build size**: 3.9MB (99.2% reduction!)
- **Deployment**: Fast and reliable
- **Load time**: Patterns load on-demand with caching

## Implementation

### 1. Pattern Storage

Patterns stored in `public/patterns/` but **not** deployed:
- Not bundled by Vite
- Not copied to dist/ during build
- Fetched from GitHub raw URLs in production
- Fetched from local dev server in development

**Production URL pattern:**
```
https://raw.githubusercontent.com/rr-h/42x09_Cross-Stitcher/main/public/patterns/example.oxs
```

**Development URL pattern:**
```
http://localhost:5173/patterns/example.oxs
```

### 2. Custom Build Script

[`scripts/copy-public.js`](../scripts/copy-public.js) copies public assets to dist, **excluding** patterns directory.

**Build command updated:**
```json
"build": "tsc && vite build && node scripts/copy-public.js"
```

### 3. Vite Config

[`vite.config.ts`](../vite.config.ts) disables automatic public directory copying:
```typescript
publicDir: false  // Use custom script instead
```

### 4. PatternLoader Service

[`src/services/PatternLoader.ts`](../src/services/PatternLoader.ts) implements:
- **Dual URL strategy**: GitHub raw URLs in production, local paths in development
- IndexedDB caching with 7-day expiration
- Progress tracking for downloads
- De-duplication of concurrent requests
- Background preloading queue
- Cache management (stats, clear, cleanup)

**Environment detection:**
```typescript
if (isDev) {
  // Development: /patterns/example.oxs
} else {
  // Production: https://raw.githubusercontent.com/.../example.oxs
}
```

### 5. React Hooks

[`src/hooks/usePattern.ts`](../src/hooks/usePattern.ts) provides:
- `usePattern(filename)` - Load with progress and caching
- `usePatternCacheStats()` - View cache statistics
- `useClearPatternCache()` - Clear cached patterns

### 6. Pattern Catalog Updates

[`src/data/patternCatalog.ts`](../src/data/patternCatalog.ts) exports:
- `loadPatternFile(filename, onProgress)` - Convenience loader
- `preloadPopularPatterns()` - Background preloading
- `getPatternCacheStats()` - Cache statistics

### 7. App Initialization

[`src/main.tsx`](../src/main.tsx) starts background preloading automatically:
```typescript
preloadPopularPatterns().catch(error => {
  console.warn('[PatternPreload] Failed to preload patterns:', error);
});
```

## Performance Benefits

### Initial Load
- **App**: 3.9MB (HTML + JS + CSS + assets)
- **First pattern**: Fetched on-demand from static files
- **Background**: 5 smallest patterns preload automatically

### Subsequent Loads
- **Cached patterns**: Instant load from IndexedDB
- **New patterns**: Fetch from network with progress
- **Offline**: Cached patterns work offline

### Cache Strategy
- **Cache-first**: Check IndexedDB before network
- **Streaming**: Large files streamed with progress
- **Expiration**: 7-day TTL with automatic cleanup
- **De-duplication**: Multiple requests share single fetch

## File Sizes

```
dist/                  3.9MB
├── assets/
│   ├── index.js      550KB (gzip: 162KB)
│   ├── dmcColors.js   35KB (gzip: 9.7KB)
│   ├── index.css     6.7KB (gzip: 1.6KB)
│   └── ...
└── index.html        0.7KB

public/patterns/      591MB (NOT in dist/)
├── small patterns    3-8MB each
├── medium patterns   8-30MB each
└── large patterns    30-52MB each
```

## Testing

Patterns load correctly in:
- Development (`pnpm dev`)
- Production build (`pnpm build && pnpm preview`)
- E2E tests (`pnpm test:e2e`)

## Deployment

### GitHub Pages
Patterns are served directly from GitHub Pages static files:
```
https://username.github.io/repo-name/patterns/example.oxs
```

### Future: External CDN
For better global performance, patterns could be moved to:
- AWS S3 + CloudFront
- Cloudflare R2
- Google Cloud Storage
- Any CDN with CORS support

Update `PatternLoader.ts` to fetch from CDN URL instead of relative path.

## Maintenance

### Adding New Patterns
1. Add `.oxs` file to `public/patterns/`
2. Update `patternCatalog.ts` with metadata
3. Rebuild: `pnpm build`
4. Patterns served automatically from static files

### Monitoring Cache
Use browser DevTools:
- **IndexedDB**: Check "pattern-cache" database
- **Network**: Monitor pattern fetches
- **Console**: Logs cache hits/misses

### Clearing Cache
Users can clear cache via:
- Browser DevTools → Application → IndexedDB → Delete database
- React hook: `useClearPatternCache()`
- Service: `await patternLoader.clearCache()`

## Documentation

See [`PATTERN_LOADING.md`](./PATTERN_LOADING.md) for detailed API documentation and usage examples.
