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

function PatternPreviewCard({
  entry,
  onSelect,
}: {
  entry: PatternCatalogEntry;
  onSelect: (pattern: PatternDoc) => void;
}) {
  const [state, setState] = useState<PreviewState>({
    pattern: null,
    loading: false,
    error: null,
    previewDataUrl: null,
  });
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    setState(s => ({ ...s, loading: true }));

    loadPatternFile(entry.filename)
      .then(content => parseOXS(content))
      .then(pattern => {
        const previewDataUrl = generatePreviewImage(pattern, 150);
        setState({
          pattern,
          loading: false,
          error: null,
          previewDataUrl,
        });
      })
      .catch(err => {
        setState({
          pattern: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load',
          previewDataUrl: null,
        });
      });
  }, [entry.filename]);

  const handleClick = () => {
    if (state.pattern) {
      onSelect(state.pattern);
    }
  };

  return (
    <div
      className="gallery-card"
      style={styles.card}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      <div style={styles.previewContainer}>
        {state.loading && (
          <div style={styles.loadingPlaceholder}>
            <div style={styles.spinner} />
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
        {state.pattern && (
          <div style={styles.cardDimensions}>
            {state.pattern.width} x {state.pattern.height}
          </div>
        )}
      </div>
    </div>
  );
}

export function PatternGalleryModal({ onClose }: PatternGalleryModalProps) {
  const loadPattern = useGameStore(s => s.loadPattern);
  const [isLoading, setIsLoading] = useState(false);

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
              />
            ))}
          </div>
        </div>

        <div style={styles.footer}>
          <div style={styles.footerHint}>
            Click a pattern to start stitching
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
