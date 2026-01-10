import { useRef } from 'react';
import { useGameStore } from '../store';
import { parsePatternFile } from '../parsers';
import { calculateFitViewport, clampViewport } from '../utils/coordinates';
import type { ViewportTransform } from '../types';

export function TopBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pattern = useGameStore(s => s.pattern);
  const progress = useGameStore(s => s.progress);
  const viewport = useGameStore(s => s.viewport);
  const toolMode = useGameStore(s => s.toolMode);
  const isComplete = useGameStore(s => s.isComplete);

  const loadPattern = useGameStore(s => s.loadPattern);
  const setViewport = useGameStore(s => s.setViewport);
  const setToolMode = useGameStore(s => s.setToolMode);

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

  const handleZoomIn = () => {
    if (!pattern) return;
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const newViewport: ViewportTransform = {
      scale: viewport.scale * 1.25,
      translateX: canvas.width / 2 - (canvas.width / 2 - viewport.translateX) * 1.25,
      translateY: canvas.height / 2 - (canvas.height / 2 - viewport.translateY) * 1.25,
    };

    const clamped = clampViewport(newViewport, pattern.width, pattern.height, canvas.width, canvas.height);
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

    const clamped = clampViewport(newViewport, pattern.width, pattern.height, canvas.width, canvas.height);
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

  // Calculate progress percentage
  let progressPercent = 0;
  if (pattern && progress) {
    const totalTargets = pattern.palette.reduce((sum, p) => sum + p.totalTargets, 0);
    const completedTargets = progress.paletteCounts.reduce((sum, pc) => sum + pc.correctCount, 0);
    progressPercent = totalTargets > 0 ? Math.round((completedTargets / totalTargets) * 100) : 0;
  }

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".oxs,.fcjson"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="file-input"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={styles.button}
        >
          Import Pattern
        </button>

        {pattern && (
          <span style={styles.title}>
            {pattern.meta.title || 'Untitled'} ({pattern.width}x{pattern.height})
          </span>
        )}
      </div>

      <div style={styles.center}>
        {pattern && (
          <>
            <div style={styles.toolGroup}>
              <button
                onClick={() => setToolMode('stitch')}
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
            <div style={styles.separator} />
            <button onClick={handleZoomOut} style={styles.zoomButton}>-</button>
            <span style={styles.zoomLevel}>{Math.round(viewport.scale * 100)}%</span>
            <button onClick={handleZoomIn} style={styles.zoomButton}>+</button>
            <button onClick={handleFit} style={styles.fitButton}>Fit</button>
          </>
        )}
      </div>

      <div style={styles.right}>
        {pattern && (
          <>
            <div style={styles.progressContainer}>
              <div
                style={{
                  ...styles.progressBar,
                  width: `${progressPercent}%`,
                  backgroundColor: isComplete ? '#2D5A27' : '#4A90D9',
                }}
              />
            </div>
            <span style={styles.progressText}>
              {isComplete ? 'Complete!' : `${progressPercent}%`}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    backgroundColor: '#fff',
    borderBottom: '1px solid #ddd',
    gap: '1rem',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  button: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2D5A27',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.9rem',
  },
  title: {
    fontSize: '0.9rem',
    color: '#666',
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
  toolGroup: {
    display: 'flex',
    gap: '0.25rem',
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
  progressContainer: {
    width: '100px',
    height: '8px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
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
};
