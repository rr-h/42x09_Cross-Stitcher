# Quick Start: Pattern Loading System

## What Changed?

Your GitHub Pages deployment was timing out because patterns (591MB) were bundled into the build. Now patterns:
- ✅ Load on-demand (only when selected)
- ✅ Cache in browser (IndexedDB)
- ✅ Preload in background (popular patterns)
- ✅ Work offline (after first load)

**Build size: 519MB → 3.9MB (99.2% smaller!)**

## Usage Examples

### Load a Pattern in React

```tsx
import { usePattern } from './hooks';

function MyComponent() {
  const { content, loading, progress, error, isCached } = usePattern('example.oxs');

  if (loading) {
    return <div>Loading {progress?.percentage}%...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <div>{isCached ? '✓ Cached' : '↓ Downloaded'}</div>;
}
```

### Load Without React Hook

```typescript
import { loadPatternFile } from './data/patternCatalog';

// With progress tracking
const xml = await loadPatternFile('example.oxs', (progress) => {
  console.log(`${progress.percentage}% complete`);
});

// Simple load
const xml = await loadPatternFile('example.oxs');
```

### Preload Patterns

```typescript
import { preloadPopularPatterns, patternLoader } from './data/patternCatalog';

// Automatic (already runs on app start)
await preloadPopularPatterns();

// Manual preload
await patternLoader.preloadPatterns([
  'pattern1.oxs',
  'pattern2.oxs',
  'pattern3.oxs',
], true); // true = high priority
```

### Check Cache Status

```tsx
import { usePatternCacheStats } from './hooks';

function CacheStats() {
  const { stats, loading } = usePatternCacheStats();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <p>Cached: {stats?.count} patterns</p>
      <p>Size: {(stats?.totalSize / 1024 / 1024).toFixed(2)} MB</p>
      {stats?.patterns.map(p => (
        <div key={p.path}>
          {p.path}: {(p.size / 1024 / 1024).toFixed(2)} MB
          (age: {Math.floor(p.age / 1000 / 60)} min)
        </div>
      ))}
    </div>
  );
}
```

### Clear Cache

```tsx
import { useClearPatternCache } from './hooks';

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

## Development

```bash
# Run dev server (patterns load from /patterns/)
pnpm dev

# Build for production (patterns excluded from dist/)
pnpm build

# Preview production build
pnpm preview

# Test
pnpm test
pnpm test:e2e
```

## How It Works

1. **App loads** (3.9MB)
2. **Background preload** starts (5 smallest patterns)
3. **User selects pattern** → Fetches from `/patterns/` or IndexedDB cache
4. **Pattern cached** → Next load is instant
5. **Offline** → Cached patterns still work

## File Structure

```
public/patterns/          ← Patterns here (NOT bundled)
├── example.oxs
├── pattern2.oxs
└── ...

dist/                     ← Build output (NO patterns)
├── assets/
│   ├── index.js
│   └── index.css
└── index.html

src/
├── services/
│   └── PatternLoader.ts  ← Caching + loading logic
├── hooks/
│   └── usePattern.ts     ← React hooks
└── data/
    └── patternCatalog.ts ← Convenience functions
```

## Cache Settings

- **Storage**: IndexedDB (50MB+ quota)
- **Expiration**: 7 days
- **Cleanup**: Automatic on app start
- **Strategy**: Cache-first with network fallback

## Troubleshooting

### Pattern not loading?
1. Check console for errors
2. Verify file exists in `public/patterns/`
3. Clear cache: `await patternLoader.clearCache()`

### Build too large?
```bash
# Check dist size
du -sh dist/

# Should be ~4MB, not 500MB+
# If large, verify patterns/ is NOT in dist/
ls dist/patterns  # Should show: No such file or directory
```

### Cache full?
```typescript
// Check cache size
const stats = await patternLoader.getCacheStats();
console.log(`${stats.totalSize / 1024 / 1024}MB cached`);

// Clear if needed
await patternLoader.clearCache();
```

## Performance Tips

1. **Preload critical patterns** early:
   ```typescript
   await patternLoader.preloadPatterns(['critical.oxs'], true);
   ```

2. **Show progress** for large patterns:
   ```typescript
   await loadPatternFile('large.oxs', (p) => {
     setProgress(p.percentage);
   });
   ```

3. **Check if cached** before loading:
   ```typescript
   const cached = await patternLoader.isCached('example.oxs');
   if (!cached) showDownloadWarning();
   ```

## More Info

- [**PATTERN_LOADING.md**](./PATTERN_LOADING.md) - Full API documentation
- [**DEPLOYMENT_OPTIMIZATION.md**](./DEPLOYMENT_OPTIMIZATION.md) - How we fixed the 519MB build

## Support

Pattern loader supports:
- ✅ Chrome/Edge (full support)
- ✅ Firefox (full support)
- ✅ Safari (full support)
- ✅ Mobile browsers (full support)
- ⚠️ Private/Incognito (limited quota)
