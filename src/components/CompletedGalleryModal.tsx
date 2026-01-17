import React, { useCallback, useEffect, useState } from 'react';
import type { CompletedPattern } from '../types';
import {
  loadAllCompletedPatterns,
  deleteCompletedPattern,
} from '../store/completedPatterns';
import { deleteCompletedPatternFromRemote } from '../sync/completedPatternSync';
import { useAuth } from '../hooks/useAuth';

interface CompletedGalleryModalProps {
  onClose: () => void;
}

interface ViewerState {
  pattern: CompletedPattern | null;
  scale: number;
  translateX: number;
  translateY: number;
}

function CompletedPatternCard({
  completed,
  onView,
  onDelete,
}: {
  completed: CompletedPattern;
  onView: (completed: CompletedPattern) => void;
  onDelete: (id: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${completed.title}"? This cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      await onDelete(completed.id);
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete pattern. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const completedDate = new Date(completed.completedAt).toLocaleDateString();

  return (
    <div
      style={{
        ...styles.card,
        opacity: isDeleting ? 0.5 : 1,
        cursor: isDeleting ? 'wait' : 'pointer',
      }}
      onClick={() => !isDeleting && onView(completed)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && !isDeleting && onView(completed)}
    >
      <div style={styles.previewContainer}>
        <img src={completed.thumbnailDataUrl} alt={completed.title} style={styles.previewImage} />
        <div style={styles.completedBadge}>
          <span style={styles.badgeIcon}>✓</span>
        </div>
      </div>
      <div style={styles.cardInfo}>
        <div style={styles.cardTitle}>{completed.title}</div>
        <div style={styles.cardMeta}>
          <span>
            {completed.width} x {completed.height}
          </span>
          <span style={styles.dot}>•</span>
          <span>{completedDate}</span>
        </div>
      </div>
      <button
        onClick={handleDelete}
        style={styles.deleteButton}
        disabled={isDeleting}
        title="Delete"
      >
        🗑️
      </button>
    </div>
  );
}

function PatternViewer({
  completed,
  onClose,
}: {
  completed: CompletedPattern;
  onClose: () => void;
}) {
  const [viewport, setViewport] = useState<ViewerState>({
    pattern: completed,
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setViewport(v => ({
      ...v,
      scale: Math.max(0.1, Math.min(10, v.scale * zoomFactor)),
    }));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setViewport(v => ({
          ...v,
          translateX: v.translateX + dx,
          translateY: v.translateY + dy,
        }));
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoomIn = () => {
    setViewport(v => ({ ...v, scale: Math.min(10, v.scale * 1.2) }));
  };

  const handleZoomOut = () => {
    setViewport(v => ({ ...v, scale: Math.max(0.1, v.scale / 1.2) }));
  };

  const handleReset = () => {
    setViewport(v => ({ ...v, scale: 1, translateX: 0, translateY: 0 }));
  };

  return (
    <div style={styles.viewerOverlay} onClick={onClose}>
      <div style={styles.viewerModal} onClick={e => e.stopPropagation()}>
        <div style={styles.viewerHeader}>
          <div>
            <h3 style={styles.viewerTitle}>{completed.title}</h3>
            <div style={styles.viewerSubtitle}>
              Completed {new Date(completed.completedAt).toLocaleDateString()} • {completed.width} x {completed.height}
            </div>
          </div>
          <button onClick={onClose} style={styles.viewerCloseButton}>
            &times;
          </button>
        </div>

        <div
          style={styles.viewerCanvas}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={completed.snapshotDataUrl}
            alt={completed.title}
            style={{
              ...styles.viewerImage,
              transform: `translate(${viewport.translateX}px, ${viewport.translateY}px) scale(${viewport.scale})`,
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            draggable={false}
          />
        </div>

        <div style={styles.viewerControls}>
          <button onClick={handleZoomOut} style={styles.controlButton}>
            -
          </button>
          <span style={styles.zoomLabel}>{Math.round(viewport.scale * 100)}%</span>
          <button onClick={handleZoomIn} style={styles.controlButton}>
            +
          </button>
          <button onClick={handleReset} style={styles.resetButton}>
            Reset View
          </button>
        </div>
      </div>
    </div>
  );
}

export function CompletedGalleryModal({ onClose }: CompletedGalleryModalProps) {
  const [completed, setCompleted] = useState<CompletedPattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingPattern, setViewingPattern] = useState<CompletedPattern | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadAllCompletedPatterns()
      .then(patterns => {
        setCompleted(patterns);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load completed patterns:', err);
        setIsLoading(false);
      });
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      // Delete locally
      await deleteCompletedPattern(id);

      // Delete from remote if user is logged in
      if (user) {
        try {
          await deleteCompletedPatternFromRemote(id);
        } catch (error) {
          console.error('Failed to delete from remote:', error);
        }
      }

      // Update local state
      setCompleted(prev => prev.filter(c => c.id !== id));
    },
    [user]
  );

  const handleView = useCallback((pattern: CompletedPattern) => {
    setViewingPattern(pattern);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setViewingPattern(null);
  }, []);

  return (
    <>
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={e => e.stopPropagation()}>
          <div style={styles.header}>
            <h2 style={styles.title}>Completed Patterns</h2>
            <div style={styles.completedCounter}>
              {completed.length} {completed.length === 1 ? 'pattern' : 'patterns'}
            </div>
            <button onClick={onClose} style={styles.closeButton}>
              &times;
            </button>
          </div>

          <div style={styles.content}>
            {isLoading ? (
              <div style={styles.loadingMessage}>Loading completed patterns...</div>
            ) : completed.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🎉</div>
                <div style={styles.emptyTitle}>No Completed Patterns Yet</div>
                <div style={styles.emptyText}>
                  Complete a pattern to see it here! Your finished work will be saved automatically.
                </div>
              </div>
            ) : (
              <div style={styles.grid}>
                {completed.map(pattern => (
                  <CompletedPatternCard
                    key={pattern.id}
                    completed={pattern}
                    onView={handleView}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>

          <div style={styles.footer}>
            <div style={styles.footerHint}>
              Click any pattern to view it full-size. Your completed patterns are synced across devices.
            </div>
            <button onClick={onClose} style={styles.cancelButton}>
              Close
            </button>
          </div>
        </div>
      </div>

      {viewingPattern && <PatternViewer completed={viewingPattern} onClose={handleCloseViewer} />}
    </>
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
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    position: 'relative',
  },
  title: {
    fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
    fontWeight: 600,
    color: '#2D5A27',
    margin: 0,
    flex: 1,
  },
  completedCounter: {
    fontSize: '0.875rem',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    cursor: 'pointer',
    color: '#6b7280',
    lineHeight: 1,
    padding: '0.25rem',
    width: '2rem',
    height: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '1.5rem',
  },
  loadingMessage: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#6b7280',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.5rem',
  },
  emptyText: {
    color: '#6b7280',
    maxWidth: '400px',
    margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    transition: 'all 0.2s',
    backgroundColor: 'white',
    position: 'relative',
  },
  previewContainer: {
    width: '100%',
    aspectRatio: '1',
    backgroundColor: '#F5F0E8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  completedBadge: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    backgroundColor: '#2D5A27',
    color: 'white',
    borderRadius: '50%',
    width: '2rem',
    height: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    fontWeight: 'bold',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
  badgeIcon: {
    fontSize: '1.25rem',
  },
  cardInfo: {
    padding: '0.75rem',
  },
  cardTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.25rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardMeta: {
    fontSize: '0.75rem',
    color: '#6b7280',
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  dot: {
    color: '#d1d5db',
  },
  deleteButton: {
    position: 'absolute',
    bottom: '0.5rem',
    right: '0.5rem',
    background: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid #e5e7eb',
    borderRadius: '0.25rem',
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s',
  },
  footer: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  footerHint: {
    fontSize: '0.875rem',
    color: '#6b7280',
    flex: 1,
  },
  cancelButton: {
    padding: '0.5rem 1.5rem',
    fontSize: '0.875rem',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
  // Viewer styles
  viewerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
  },
  viewerModal: {
    backgroundColor: '#1f2937',
    borderRadius: '0.75rem',
    maxWidth: '95vw',
    maxHeight: '95vh',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  viewerHeader: {
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #374151',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
  },
  viewerTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: 'white',
    margin: 0,
  },
  viewerSubtitle: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    marginTop: '0.25rem',
  },
  viewerCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    cursor: 'pointer',
    color: '#9ca3af',
    lineHeight: 1,
    padding: '0.25rem',
  },
  viewerCanvas: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#111827',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  viewerImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    transformOrigin: 'center center',
    transition: 'transform 0.05s',
    imageRendering: 'pixelated',
  },
  viewerControls: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid #374151',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    justifyContent: 'center',
  },
  controlButton: {
    width: '2.5rem',
    height: '2.5rem',
    backgroundColor: '#374151',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  zoomLabel: {
    color: 'white',
    fontSize: '0.875rem',
    fontWeight: 500,
    minWidth: '4rem',
    textAlign: 'center',
  },
  resetButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#374151',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
};
