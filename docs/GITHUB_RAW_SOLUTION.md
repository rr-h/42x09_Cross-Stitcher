# Pattern Loading Fix - GitHub Raw URLs

## Problem

After implementing lazy loading and excluding patterns from the build, the production app showed 404 errors when trying to load patterns:

```
Failed to load resource: the server responded with a status of 404
patterns/example.oxs
```

This happened because:
1. Patterns were excluded from `dist/` to reduce build size (519MB → 3.9MB)
2. App tried to fetch patterns from `/patterns/` (relative path)
3. GitHub Pages didn't have those files (they weren't deployed)

## Solution

Updated `PatternLoader.ts` to use **different URLs for development vs production**:

### Development
```
http://localhost:5173/patterns/example.oxs
```
Patterns loaded from local dev server (`public/patterns/` directory)

### Production
```
https://raw.githubusercontent.com/rr-h/42x09_Cross-Stitcher/main/public/patterns/example.oxs
```
Patterns fetched from GitHub's raw content CDN

## Implementation

```typescript
// PatternLoader.ts
const GITHUB_REPO_OWNER = 'rr-h';
const GITHUB_REPO_NAME = '42x09_Cross-Stitcher';
const GITHUB_BRANCH = 'main';

function getPatternUrl(filename: string): string {
  const isDev = import.meta.env.DEV;
  
  if (isDev) {
    return `/patterns/${filename}`;
  } else {
    return `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/public/patterns/${filename}`;
  }
}

// Use in fetch
const url = getPatternUrl(path);
const response = await fetch(url);
```

## Benefits

✅ **Small deployment**: 3.9MB (vs 519MB)  
✅ **Fast deployment**: No timeout issues  
✅ **Global CDN**: GitHub raw content served via CDN  
✅ **Caching**: IndexedDB caches patterns after first load  
✅ **Offline**: Cached patterns work offline  

## Trade-offs

⚠️ **First load latency**: ~100-200ms to fetch from GitHub raw  
⚠️ **Internet required**: Must be online for first load of each pattern  
⚠️ **GitHub dependency**: Relies on GitHub being available  

## Performance

| Scenario | Load Time | Source |
|----------|-----------|--------|
| **First load** | ~100-200ms + download time | GitHub raw CDN |
| **Cached** | <10ms | IndexedDB (local) |
| **Offline (cached)** | <10ms | IndexedDB (local) |
| **Offline (not cached)** | ❌ Fails | No network |

## Verification

```bash
# Build size still small
pnpm build
du -sh dist/
# 3.9M

# Patterns NOT in dist/
ls dist/patterns
# ls: cannot access 'dist/patterns': No such file or directory

# Patterns still in repo
ls public/patterns/ | wc -l
# 35
```

## Testing

### Dev Server
```bash
pnpm dev
# Opens http://localhost:5173
# Patterns load from /patterns/ (local files)
```

### Production Build
```bash
pnpm build
pnpm preview
# Opens http://localhost:4173
# Patterns load from GitHub raw URLs
```

### Network Tab
In production, you should see requests like:
```
https://raw.githubusercontent.com/rr-h/42x09_Cross-Stitcher/main/public/patterns/example.oxs
Status: 200 OK
```

## Alternative Solutions Considered

### 1. Include patterns in dist/ ❌
- **Pro**: Simple, patterns always available
- **Con**: 519MB deployment, GitHub Pages timeout

### 2. External CDN (S3, Cloudflare R2) ⚠️
- **Pro**: Faster, more control
- **Con**: Requires setup, ongoing costs, more complexity

### 3. GitHub raw URLs ✅ (chosen)
- **Pro**: No deployment bloat, free, global CDN, simple
- **Con**: Small latency on first load, GitHub dependency

## Future Optimizations

1. **Compression**: Serve patterns as `.gz` files from GitHub
2. **Preloading**: Smarter preload strategy based on user behavior
3. **CDN migration**: Move to dedicated CDN if GitHub becomes bottleneck
4. **Pattern splitting**: Split large patterns into chunks for faster initial load

## Configuration

To change the GitHub repository or branch, update these constants in `PatternLoader.ts`:

```typescript
const GITHUB_REPO_OWNER = 'rr-h';        // Your GitHub username
const GITHUB_REPO_NAME = '42x09_Cross-Stitcher';  // Your repo name
const GITHUB_BRANCH = 'main';             // Branch containing patterns
```

## Troubleshooting

### Patterns still 404 in production?

1. **Check repo/branch names** in `PatternLoader.ts`
2. **Verify patterns exist** in `public/patterns/` on the main branch
3. **Check GitHub raw URL** manually in browser:
   ```
   https://raw.githubusercontent.com/rr-h/42x09_Cross-Stitcher/main/public/patterns/cleopatra.oxs
   ```
4. **Clear cache** and retry:
   ```javascript
   await patternLoader.clearCache();
   ```

### Slow pattern loading?

- **Expected on first load**: GitHub raw URLs have ~100-200ms latency
- **Should be fast after cache**: Check IndexedDB in DevTools
- **Consider CDN**: If consistently slow, migrate to dedicated CDN

### CORS errors?

- GitHub raw content has CORS enabled by default
- If errors occur, check browser console for specific CORS issues
- May need to add CORS proxy for certain use cases
