import React, { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../store';
import { getAllPatternsWithProgress, deleteProgress, deleteLocalSnapshots } from '../store/persistence';
import type { PatternDoc, UserProgress } from '../types';
import { NO_STITCH } from '../types';
import { patternCatalog, loadPatternFile } from '../data/patternCatalog';
import { parseOXS } from '../parsers/oxs';

interface ActivePatternsModalProps {
  onClose: () => void;
}

interface ActivePatternItem {
  patternId: string;
  progress: UserProgress;
  progressPercent: number;
  pattern: PatternDoc | null;
  previewDataUrl: string | null;
  loading: boolean;
  error: string | null;
}

// Generate a preview image showing current progress
function generateProgressPreview(
  pattern: PatternDoc,
  progress: UserProgress,
  maxSize: number = 150
): string {
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

  // Draw each cell
  const cellWidth = width / pattern.width;
  const cellHeight = height / pattern.height;

  for (let row = 0; row < pattern.height; row++) {
    for (let col = 0; col < pattern.width; col++) {
      const cellIndex = row * pattern.width + col;
      const targetIndex = pattern.targets[cellIndex];
      const stitchState = progress.stitchedState[cellIndex];

      if (targetIndex !== NO_STITCH && targetIndex < pattern.palette.length) {
        // If stitched correctly, show the color, otherwise show fabric
        if (stitchState === 1) {
          // StitchState.Correct
          const color = pattern.palette[targetIndex].hex;
          ctx.fillStyle = color;
          ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth + 0.5, cellHeight + 0.5);
        }
      }
    }
  }

  return canvas.toDataURL('image/png');
}

// Try to load pattern from catalog
async function tryLoadCatalogPattern(patternId: string): Promise<PatternDoc | null> {
  // Check if this pattern is in the catalog
  const catalogEntry = patternCatalog.find(entry => {
    // Pattern IDs are typically based on filename without extension
    const baseFilename = entry.filename.replace(/\.oxs$/, '');
    return patternId === baseFilename || patternId === entry.filename;
  });

  if (!catalogEntry) return null;

  try {
    const content = await loadPatternFile(catalogEntry.filename);
    const pattern = await parseOXS(content);
    return pattern;
  } catch (err) {
    console.error('Failed to load catalog pattern:', err);
    return null;
  }
}

// Active pattern card component
function ActivePatternCard({
  item,
  onSelect,
  onDelete,
}: {
  item: ActivePatternItem;
  onSelect: (pattern: PatternDoc) => void;
  onDelete: (patternId: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  // Initialize loading based on whether we need to fetch the pattern
  const [state, setState] = useState(() => ({
    ...item,
    loading: !item.pattern,
  }));

  useEffect(() => {
    if (state.pattern) return;

    let mounted = true;

    // Try to load the pattern
    tryLoadCatalogPattern(state.patternId)
      .then(pattern => {
        if (!mounted) return;

        if (pattern) {
          const previewDataUrl = generateProgressPreview(pattern, state.progress, 150);
          setState(s => ({
            ...s,
            pattern,
            previewDataUrl,
            loading: false,
            error: null,
          }));
        } else {
          setState(s => ({
            ...s,
            loading: false,
            error: 'Pattern not found',
          }));
        }
      })
      .catch(err => {
        if (!mounted) return;
        setState(s => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load',
        }));
      });

    return () => {
      mounted = false;
    };
  }, [state.patternId, state.pattern, state.progress]);

  const handleClick = () => {
    if (state.pattern) {
      onSelect(state.pattern);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete progress for "${state.pattern?.meta.title || state.patternId}"?`)) {
      onDelete(state.patternId);
    }
  };

  return (
    <div
      className="gallery-card"
      style={{
        ...styles.card,
        opacity: state.pattern ? 1 : 0.8,
        cursor: state.pattern ? 'pointer' : state.loading ? 'wait' : 'default',
        position: 'relative',
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={state.pattern ? 0 : -1}
      onKeyDown={e => e.key === 'Enter' && state.pattern && handleClick()}
    >
      <div style={styles.previewContainer}>
        {state.loading && (
          <div style={styles.loadingPlaceholder}>
            <div style={styles.spinner} />
            <span style={styles.loadingText}>Loading...</span>
          </div>
        )}
        {state.error && (
          <div style={styles.errorPlaceholder}>
            <span style={styles.errorIcon}>!</span>
            <span style={styles.errorText}>{state.error}</span>
          </div>
        )}
        {state.previewDataUrl && (
          <>
            <img
              src={state.previewDataUrl}
              alt={state.pattern?.meta.title || state.patternId}
              style={styles.previewImage}
            />
            {/* Progress overlay */}
            <div style={styles.progressOverlay}>
              <div style={styles.progressBadge}>{state.progressPercent}%</div>
            </div>
            {/* Delete button on hover */}
            {isHovered && (
              <button
                onClick={handleDelete}
                style={styles.deleteButton}
                title="Delete progress"
                aria-label="Delete progress"
              >
                ×
              </button>
            )}
          </>
        )}
      </div>
      <div style={styles.cardInfo}>
        <div style={styles.cardTitle}>{state.pattern?.meta.title || state.patternId}</div>
        {state.pattern && (
          <div style={styles.cardMeta}>
            <span>
              {state.pattern.width} x {state.pattern.height}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ActivePatternsModal({ onClose }: ActivePatternsModalProps) {
  const loadPattern = useGameStore(s => s.loadPattern);
  const [activePatterns, setActivePatterns] = useState<ActivePatternItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPattern, setIsLoadingPattern] = useState(false);

  const loadActivePatterns = useCallback(() => {
    setIsLoading(true);
    getAllPatternsWithProgress()
      .then(patterns => {
        const items: ActivePatternItem[] = patterns.map(p => ({
          patternId: p.patternId,
          progress: p.progress,
          progressPercent: p.progressPercent,
          pattern: null,
          previewDataUrl: null,
          loading: false,
          error: null,
        }));
        setActivePatterns(items);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load active patterns:', err);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadActivePatterns();
  }, [loadActivePatterns]);

  const handleSelectPattern = useCallback(
    async (pattern: PatternDoc) => {
      setIsLoadingPattern(true);
      try {
        await loadPattern(pattern);
        onClose();
      } catch (error) {
        console.error('Failed to load pattern:', error);
        alert(
          `Failed to load pattern: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        setIsLoadingPattern(false);
      }
    },
    [loadPattern, onClose]
  );

  const handleDeleteProgress = useCallback(
    async (patternId: string) => {
      try {
        // Delete both the progress and snapshots
        await deleteProgress(patternId);
        await deleteLocalSnapshots(patternId);

        // Reload the active patterns list
        loadActivePatterns();
      } catch (error) {
        console.error('Failed to delete progress:', error);
        alert(`Failed to delete progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [loadActivePatterns]
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Active Patterns</h2>
          <button onClick={onClose} style={styles.closeButton} disabled={isLoadingPattern}>
            &times;
          </button>
        </div>

        <div style={styles.content}>
          {isLoading && (
            <div style={styles.loadingOverlay}>
              <div style={styles.loadingMessage}>Loading active patterns...</div>
            </div>
          )}
          {isLoadingPattern && (
            <div style={styles.loadingOverlay}>
              <div style={styles.loadingMessage}>Loading pattern...</div>
            </div>
          )}
          {!isLoading && activePatterns.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No active patterns found.</p>
              <p style={styles.emptyHint}>Start stitching a pattern to see it here!</p>
            </div>
          )}
          {!isLoading && activePatterns.length > 0 && (
            <div style={styles.grid}>
              {activePatterns.map(item => (
                <ActivePatternCard
                  key={item.patternId}
                  item={item}
                  onSelect={handleSelectPattern}
                  onDelete={handleDeleteProgress}
                />
              ))}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <div style={styles.footerHint}>
            {activePatterns.length > 0
              ? `${activePatterns.length} active pattern${activePatterns.length !== 1 ? 's' : ''}`
              : 'Patterns you start working on will appear here'}
          </div>
          <button onClick={onClose} style={styles.cancelButton} disabled={isLoadingPattern}>
            Close
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
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '0.8rem',
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
    fontSize: '0.8rem',
    color: '#666',
    fontWeight: '500',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '0.8rem',
    color: '#666',
    margin: '0 0 0.5rem 0',
  },
  emptyHint: {
    fontSize: '0.8rem',
    color: '#999',
    margin: 0,
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
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  progressOverlay: {
    position: 'absolute',
    bottom: '0.5rem',
    left: '0.5rem',
  },
  progressBadge: {
    backgroundColor: 'rgba(74, 144, 217, 0.95)',
    color: 'white',
    padding: '0.375rem 0.625rem',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  deleteButton: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(220, 53, 69, 0.95)',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
    transition: 'all 0.2s',
    zIndex: 2,
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
    borderTopColor: '#4A90D9',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '0.75rem',
    color: '#666',
    marginTop: '0.5rem',
  },
  errorPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: '#fee',
    padding: '1rem',
  },
  errorIcon: {
    fontSize: '2rem',
    color: '#c00',
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: '0.7rem',
    color: '#c00',
    marginTop: '0.5rem',
    textAlign: 'center',
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
  cardMeta: {
    fontSize: '0.75rem',
    color: '#888',
    marginTop: '0.25rem',
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
      styleSheet.insertRule(
        `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `,
        styleSheet.cssRules.length
      );
    } catch {
      // Rule might already exist
    }
  }
}
