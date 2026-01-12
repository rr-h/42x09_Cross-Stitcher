import React, { useCallback, useEffect, useRef, useState } from 'react';
import { patternCatalog, loadPatternFile, type PatternCatalogEntry } from '../data/patternCatalog';
import { parseOXS } from '../parsers/oxs';
import { useGameStore } from '../store';
import type { PatternDoc } from '../types';
import { NO_STITCH } from '../types';

interface PatternGalleryModalProps {
  onClose: () => void;
}

interface PreviewState {
  pattern: PatternDoc | null;
  loading: boolean;
  error: string | null;
  previewDataUrl: string | null;
}

// Loading queue to limit concurrent pattern loads
const loadingQueue: Array<() => Promise<void>> = [];
let activeLoads = 0;
const MAX_CONCURRENT_LOADS = 2;

function processQueue() {
  while (activeLoads < MAX_CONCURRENT_LOADS && loadingQueue.length > 0) {
    const next = loadingQueue.shift();
    if (next) {
      activeLoads++;
      next().finally(() => {
        activeLoads--;
        processQueue();
      });
    }
  }
}

function queueLoad(loadFn: () => Promise<void>) {
  loadingQueue.push(loadFn);
  processQueue();
}

// Generate a preview image of a fully stitched pattern
function generatePreviewImage(pattern: PatternDoc, maxSize: number = 150): string {
  const canvas = document.createElement('canvas');

  // Calculate scale to fit in maxSize while maintaining aspect ratio
  const scale = Math.min(maxSize / pattern.width, maxSize / pattern.height);
  const width = Math.ceil(pattern.width * scale);
  const height = Math.ceil(pattern.height * scale);

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Fill with fabric background
  ctx.fillStyle = '#F5F0E8';
  ctx.fillRect(0, 0, width, height);

  // Draw each cell with its target color (fully stitched preview)
  const cellWidth = width / pattern.width;
  const cellHeight = height / pattern.height;

  for (let row = 0; row < pattern.height; row++) {
    for (let col = 0; col < pattern.width; col++) {
      const cellIndex = row * pattern.width + col;
      const targetIndex = pattern.targets[cellIndex];

      if (targetIndex !== NO_STITCH && targetIndex < pattern.palette.length) {
        const color = pattern.palette[targetIndex].hex;
        ctx.fillStyle = color;
        ctx.fillRect(
          col * cellWidth,
          row * cellHeight,
          cellWidth + 0.5, // Small overlap to avoid gaps
          cellHeight + 0.5
        );
      }
    }
  }

  return canvas.toDataURL('image/png');
}

// Cache for loaded patterns to avoid re-parsing
const patternCache = new Map<string, { pattern: PatternDoc; previewDataUrl: string }>();

function PatternPreviewCard({
  entry,
  onSelect,
  onLoaded,
}: {
  entry: PatternCatalogEntry;
  onSelect: (pattern: PatternDoc) => void;
  onLoaded?: () => void;
}) {
  const [state, setState] = useState<PreviewState>(() => {
    // Check cache first
    const cached = patternCache.get(entry.filename);
    if (cached) {
      return {
        pattern: cached.pattern,
        loading: false,
        error: null,
        previewDataUrl: cached.previewDataUrl,
      };
    }
    return {
      pattern: null,
      loading: false,
      error: null,
      previewDataUrl: null,
    };
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const loadStartedRef = useRef(false);

  const startLoading = useCallback(() => {
    if (loadStartedRef.current || state.pattern) return;
    loadStartedRef.current = true;

    setState(s => ({ ...s, loading: true }));

    queueLoad(async () => {
      try {
        const content = await loadPatternFile(entry.filename);
        const pattern = await parseOXS(content);
        const previewDataUrl = generatePreviewImage(pattern, 150);

        // Cache the result
        patternCache.set(entry.filename, { pattern, previewDataUrl });

        setState({
          pattern,
          loading: false,
          error: null,
          previewDataUrl,
        });
        onLoaded?.();
      } catch (err) {
        setState({
          pattern: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load',
          previewDataUrl: null,
        });
      }
    });
  }, [entry.filename, state.pattern, onLoaded]);

  // Lazy load using IntersectionObserver
  useEffect(() => {
    if (loadStartedRef.current || state.pattern) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          startLoading();
        }
      },
      { rootMargin: '100px' } // Start loading slightly before visible
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [startLoading, state.pattern]);

  const handleClick = () => {
    if (state.pattern) {
      onSelect(state.pattern);
    } else if (!state.loading && !state.error) {
      // Start loading if not already started
      startLoading();
    }
  };

  // Format file size
  const sizeLabel = entry.sizeKB < 10000
    ? `${Math.round(entry.sizeKB / 1000)}MB`
    : `${Math.round(entry.sizeKB / 1000)}MB`;

  return (
    <div
      ref={cardRef}
      className="gallery-card"
      style={{
        ...styles.card,
        opacity: state.pattern ? 1 : 0.8,
        cursor: state.pattern ? 'pointer' : state.loading ? 'wait' : 'pointer',
      }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      <div style={styles.previewContainer}>
        {!state.pattern && !state.loading && !state.error && (
          <div style={styles.pendingPlaceholder}>
            <span style={styles.pendingText}>Click to load</span>
          </div>
        )}
        {state.loading && (
          <div style={styles.loadingPlaceholder}>
            <div style={styles.spinner} />
            <span style={styles.loadingText}>Loading...</span>
          </div>
        )}
        {state.error && (
          <div style={styles.errorPlaceholder}>
            <span style={styles.errorIcon}>!</span>
          </div>
        )}
        {state.previewDataUrl && (
          <img
            src={state.previewDataUrl}
            alt={entry.displayName}
            style={styles.previewImage}
          />
        )}
      </div>
      <div style={styles.cardInfo}>
        <div style={styles.cardTitle}>{entry.displayName}</div>
        <div style={styles.cardMeta}>
          {state.pattern ? (
            <span>{state.pattern.width} x {state.pattern.height}</span>
          ) : (
            <span style={styles.sizeLabel}>{sizeLabel}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function PatternGalleryModal({ onClose }: PatternGalleryModalProps) {
  const loadPattern = useGameStore(s => s.loadPattern);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedCount, setLoadedCount] = useState(patternCache.size);

  // Update loaded count when cache changes
  const incrementLoadedCount = useCallback(() => {
    setLoadedCount(patternCache.size);
  }, []);

  const handleSelectPattern = useCallback(async (pattern: PatternDoc) => {
    setIsLoading(true);
    try {
      // Load the pattern - this will create fresh progress (unstitched)
      await loadPattern(pattern);
      onClose();
    } catch (error) {
      console.error('Failed to load pattern:', error);
      alert(`Failed to load pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadPattern, onClose]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Pick a Pattern</h2>
          <div style={styles.loadedCounter}>
            {loadedCount} / {patternCatalog.length} loaded
          </div>
          <button onClick={onClose} style={styles.closeButton} disabled={isLoading}>
            &times;
          </button>
        </div>

        <div style={styles.content}>
          {isLoading && (
            <div style={styles.loadingOverlay}>
              <div style={styles.loadingMessage}>Loading pattern...</div>
            </div>
          )}
          <div style={styles.grid}>
            {patternCatalog.map(entry => (
              <PatternPreviewCard
                key={entry.filename}
                entry={entry}
                onSelect={handleSelectPattern}
                onLoaded={incrementLoadedCount}
              />
            ))}
          </div>
        </div>

        <div style={styles.footer}>
          <div style={styles.footerHint}>
            Patterns load as you scroll. Click any pattern to start stitching.
          </div>
          <button onClick={onClose} style={styles.cancelButton} disabled={isLoading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '1rem',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #eee',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.75rem',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    lineHeight: '1',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '1rem',
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingMessage: {
    fontSize: '1.1rem',
    color: '#666',
    fontWeight: '500',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '1rem',
  },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    border: '1px solid #e0e0e0',
  },
  previewContainer: {
    width: '100%',
    aspectRatio: '1',
    backgroundColor: '#F5F0E8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  loadingPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid #ddd',
    borderTopColor: '#2D5A27',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: '#fee',
  },
  errorIcon: {
    fontSize: '2rem',
    color: '#c00',
    fontWeight: 'bold',
  },
  cardInfo: {
    padding: '0.75rem',
    borderTop: '1px solid #e0e0e0',
  },
  cardTitle: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardDimensions: {
    fontSize: '0.75rem',
    color: '#888',
    marginTop: '0.25rem',
  },
  cardMeta: {
    fontSize: '0.75rem',
    color: '#888',
    marginTop: '0.25rem',
  },
  sizeLabel: {
    color: '#aaa',
  },
  loadedCounter: {
    fontSize: '0.85rem',
    color: '#666',
    backgroundColor: '#f0f0f0',
    padding: '0.25rem 0.75rem',
    borderRadius: '1rem',
  },
  pendingPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    color: '#999',
  },
  pendingText: {
    fontSize: '0.8rem',
    color: '#999',
  },
  loadingText: {
    fontSize: '0.75rem',
    color: '#666',
    marginTop: '0.5rem',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderTop: '1px solid #eee',
    backgroundColor: '#fafafa',
    borderRadius: '0 0 0.75rem 0.75rem',
    flexShrink: 0,
  },
  footerHint: {
    fontSize: '0.85rem',
    color: '#888',
  },
  cancelButton: {
    padding: '0.625rem 1.25rem',
    border: '1px solid #ddd',
    borderRadius: '0.375rem',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
  },
};

// Add keyframes for spinner animation
if (typeof document !== 'undefined') {
  const styleSheet = document.styleSheets[0];
  if (styleSheet) {
    try {
      styleSheet.insertRule(`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `, styleSheet.cssRules.length);
    } catch {
      // Rule might already exist
    }
  }
}
