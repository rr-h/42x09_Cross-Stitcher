import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { isImageFile } from '../converters/imageToPattern';
import { useAuth } from '../hooks/useAuth';
import { usePatternSync } from '../hooks/usePatternSync';
import { parsePatternFile } from '../parsers';
import { useGameStore } from '../store/storeFunctions';
import type { ViewportTransform } from '../types';
import { calculateFitViewport, clampViewport } from '../utils/coordinates';
import { AuthButton } from './AuthButton';

// Lazy load modals to reduce initial bundle size
const ImageImportModal = lazy(() =>
  import('./ImageImportModal').then(module => ({ default: module.ImageImportModal }))
);
const PatternGalleryModal = lazy(() =>
  import('./PatternGalleryModal').then(module => ({ default: module.PatternGalleryModal }))
);
const ActivePatternsModal = lazy(() =>
  import('./ActivePatternsModal').then(module => ({ default: module.ActivePatternsModal }))
);
const CompletedGalleryModal = lazy(() =>
  import('./CompletedGalleryModal').then(module => ({ default: module.CompletedGalleryModal }))
);
const HelpModal = lazy(() => import('./HelpModal').then(module => ({ default: module.HelpModal })));

export const TopBar = React.memo(function TopBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [showCompletedGallery, setShowCompletedGallery] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const pattern = useGameStore(s => s.pattern);
  const progress = useGameStore(s => s.progress);
  const viewport = useGameStore(s => s.viewport);
  const toolMode = useGameStore(s => s.toolMode);
  const isComplete = useGameStore(s => s.isComplete);
  const showActivePatterns = useGameStore(s => s.showActivePatterns);

  const loadPattern = useGameStore(s => s.loadPattern);
  const setViewport = useGameStore(s => s.setViewport);
  const setToolMode = useGameStore(s => s.setToolMode);
  const setShowActivePatterns = useGameStore(s => s.setShowActivePatterns);

  const { user } = useAuth();
  const { syncStatus, triggerManualSync } = usePatternSync();

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const formatLastSyncTime = (timestamp: number | null): string => {
    if (!timestamp) return 'Never synced';
    const secondsAgo = Math.floor((now - timestamp) / 1000);
    if (secondsAgo < 60) return 'Just now';
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
    return `${Math.floor(secondsAgo / 86400)}d ago`;
  };

  const handleSyncClick = async () => {
    try {
      await triggerManualSync();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const patternDoc = await parsePatternFile(file);
      await loadPattern(patternDoc);
    } catch (error) {
      alert(`Failed to load pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      alert('Please select a valid image file (PNG, JPG, GIF, WebP, or BMP)');
      return;
    }

    setImageFile(file);

    // Reset file input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleCloseImageModal = () => {
    setImageFile(null);
  };

  const handleZoomIn = () => {
    if (!pattern) return;
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const newViewport: ViewportTransform = {
      scale: viewport.scale * 1.25,
      translateX: canvas.width / 2 - (canvas.width / 2 - viewport.translateX) * 1.25,
      translateY: canvas.height / 2 - (canvas.height / 2 - viewport.translateY) * 1.25,
    };

    const clamped = clampViewport(
      newViewport,
      pattern.width,
      pattern.height,
      canvas.width,
      canvas.height
    );
    setViewport(clamped);
  };

  const handleZoomOut = () => {
    if (!pattern) return;
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const newViewport: ViewportTransform = {
      scale: viewport.scale / 1.25,
      translateX: canvas.width / 2 - (canvas.width / 2 - viewport.translateX) / 1.25,
      translateY: canvas.height / 2 - (canvas.height / 2 - viewport.translateY) / 1.25,
    };

    const clamped = clampViewport(
      newViewport,
      pattern.width,
      pattern.height,
      canvas.width,
      canvas.height
    );
    setViewport(clamped);
  };

  const handleFit = () => {
    if (!pattern) return;
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const fitViewport = calculateFitViewport(
      pattern.width,
      pattern.height,
      canvas.width,
      canvas.height
    );
    setViewport(fitViewport);
  };

  // Calculate progress percentage (memoized to avoid recalculation on every render)
  const progressPercent = useMemo(() => {
    if (!pattern || !progress) return 0;
    const totalTargets = pattern.palette.reduce((sum, p) => sum + p.totalTargets, 0);
    const completedTargets = progress.paletteCounts.reduce((sum, pc) => sum + pc.correctCount, 0);
    return totalTargets > 0 ? Math.round((completedTargets / totalTargets) * 100) : 0;
  }, [pattern, progress]);

  return (
    <div className="topbar">
      <div className="topbar-left">
        <input
          ref={fileInputRef}
          type="file"
          accept=".oxs,.fcjson"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="file-input"
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
          onChange={handleImageChange}
          style={{ display: 'none' }}
          id="image-input"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="import-button"
          style={styles.button}
          title="Import .oxs or .fcjson pattern file"
        >
          Import Pattern
        </button>
        <button
          onClick={() => imageInputRef.current?.click()}
          className="import-image-button"
          style={styles.imageButton}
          title="Create pattern from an image"
        >
          Import Image
        </button>
        <button
          onClick={() => setShowGallery(true)}
          className="pick-pattern-button"
          style={styles.galleryButton}
          title="Browse and select from pre-loaded patterns"
        >
          Pick Pattern
        </button>
        <button
          onClick={() => setShowActivePatterns(true)}
          className="active-button"
          style={styles.activeButton}
          title="View your active patterns in progress"
        >
          Active
        </button>
        <button
          onClick={() => setShowCompletedGallery(true)}
          className="completed-button"
          style={styles.completedButton}
          title="View your completed patterns"
        >
          Completed
        </button>

        {pattern && (
          <span className="topbar-title">
            {pattern.meta.title || 'Untitled'} ({pattern.width}x{pattern.height})
          </span>
        )}
      </div>

      <div className="topbar-center">
        {pattern && (
          <>
            <div className="tool-group">
              <button
                onClick={() => setToolMode('stitch')}
                className="tool-button"
                style={{
                  ...styles.toolButton,
                  backgroundColor: toolMode === 'stitch' ? '#2D5A27' : '#f0f0f0',
                  color: toolMode === 'stitch' ? 'white' : '#333',
                }}
                title="Stitch Tool - Click or drag to place stitches"
              >
                Needle
              </button>
              <button
                onClick={() => setToolMode('fill')}
                className="tool-button"
                style={{
                  ...styles.toolButton,
                  backgroundColor: toolMode === 'fill' ? '#2D5A27' : '#f0f0f0',
                  color: toolMode === 'fill' ? 'white' : '#333',
                }}
                title="Fill Tool - Click to fill all connected cells of the same color"
              >
                Fill
              </button>
              <button
                onClick={() => setToolMode('picker')}
                className="tool-button"
                style={{
                  ...styles.toolButton,
                  backgroundColor: toolMode === 'picker' ? '#2D5A27' : '#f0f0f0',
                  color: toolMode === 'picker' ? 'white' : '#333',
                }}
                title="Picker Tool - Click wrong stitches to remove them"
              >
                Picker
              </button>
            </div>
            <div className="separator" style={styles.separator} />
            <button onClick={handleZoomOut} className="zoom-button" style={styles.zoomButton}>
              -
            </button>
            <span className="zoom-level" style={styles.zoomLevel}>
              {Math.round(viewport.scale * 100)}%
            </span>
            <button onClick={handleZoomIn} className="zoom-button" style={styles.zoomButton}>
              +
            </button>
            <button onClick={handleFit} className="fit-button" style={styles.fitButton}>
              Fit
            </button>
          </>
        )}
      </div>

      <div className="topbar-right">
        {pattern && (
          <>
            <div className="progress-container">
              <div
                style={{
                  ...styles.progressBar,
                  width: `${progressPercent}%`,
                  backgroundColor: isComplete ? '#2D5A27' : '#4A90D9',
                }}
              />
            </div>
            <span className="progress-text" style={styles.progressText}>
              {isComplete ? 'Complete!' : `${progressPercent}%`}
            </span>
            <div style={styles.separator} />
          </>
        )}
        {user && (
          <>
            <button
              onClick={handleSyncClick}
              disabled={syncStatus.state === 'syncing'}
              title={
                syncStatus.state === 'error'
                  ? `Sync error: ${syncStatus.error}`
                  : `Last synced: ${formatLastSyncTime(syncStatus.lastSyncedAt)}`
              }
              style={{
                ...styles.syncButton,
                opacity: syncStatus.state === 'syncing' ? 0.6 : 1,
                cursor: syncStatus.state === 'syncing' ? 'not-allowed' : 'pointer',
              }}
            >
              {syncStatus.state === 'syncing' ? '↻' : syncStatus.state === 'error' ? '⚠' : '☁'}
            </button>
            <div style={styles.separator} />
          </>
        )}
        <button onClick={() => setShowHelp(true)} style={styles.helpButton} title="How to play">
          ?
        </button>
        <AuthButton />
      </div>

      <Suspense fallback={null}>
        {imageFile && <ImageImportModal file={imageFile} onClose={handleCloseImageModal} />}
      </Suspense>

      <Suspense fallback={null}>
        {showGallery && <PatternGalleryModal onClose={() => setShowGallery(false)} />}
      </Suspense>

      <Suspense fallback={null}>
        {showActivePatterns && <ActivePatternsModal onClose={() => setShowActivePatterns(false)} />}
      </Suspense>

      <Suspense fallback={null}>
        {showCompletedGallery && (
          <CompletedGalleryModal onClose={() => setShowCompletedGallery(false)} />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </Suspense>
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  button: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#2D5A27',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.85rem',
  },
  imageButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#4A7A45',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.85rem',
  },
  galleryButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#5A8A55',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.85rem',
  },
  activeButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#4A90D9',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.85rem',
  },
  completedButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#2D5A27',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.85rem',
  },
  zoomButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  zoomLevel: {
    minWidth: '50px',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: '#666',
  },
  fitButton: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  toolButton: {
    padding: '0.375rem 0.75rem',
    border: '1px solid #ddd',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'background-color 0.15s, color 0.15s',
  },
  separator: {
    width: '1px',
    height: '24px',
    backgroundColor: '#ddd',
    margin: '0 0.5rem',
  },
  progressBar: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '0.85rem',
    fontWeight: '500',
    minWidth: '70px',
  },
  syncButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '0.25rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    transition: 'background-color 0.15s',
  },
  helpButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90D9',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginRight: '0.5rem',
    transition: 'background-color 0.15s',
  },
};
