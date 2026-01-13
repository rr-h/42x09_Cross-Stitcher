import React, { useCallback, useMemo } from 'react';
import { useGameStore } from '../store/storeFunctions';
import { getViewportCenterInGrid } from '../utils/coordinates';

export const Palette = React.memo(function Palette() {
  const pattern = useGameStore(s => s.pattern);
  const progress = useGameStore(s => s.progress);
  const selectedPaletteIndex = useGameStore(s => s.selectedPaletteIndex);
  const toolMode = useGameStore(s => s.toolMode);
  const viewport = useGameStore(s => s.viewport);

  const selectPalette = useGameStore(s => s.selectPalette);
  const setToolMode = useGameStore(s => s.setToolMode);
  const getTotalWrongCount = useGameStore(s => s.getTotalWrongCount);
  const findNearestUnstitched = useGameStore(s => s.findNearestUnstitched);
  const navigateToCell = useGameStore(s => s.navigateToCell);

  // Filter palette to only show entries with remaining stitches (memoized)
  // Must be called before any early returns to satisfy Rules of Hooks
  const visiblePalette = useMemo(() => {
    if (!pattern || !progress) return [];
    return pattern.palette.filter((_, index) => progress.paletteCounts[index].remainingTargets > 0);
  }, [pattern, progress]);

  const handlePaletteClick = useCallback(
    (paletteIndex: number) => {
      selectPalette(paletteIndex);

      if (!pattern) return;

      // Get canvas size from DOM (rough estimate)
      const canvasContainer = document.querySelector('[data-canvas-container]');
      const canvasWidth = canvasContainer?.clientWidth || 800;
      const canvasHeight = canvasContainer?.clientHeight || 600;

      // Get current viewport center in grid coords
      const viewportCenter = getViewportCenterInGrid(canvasWidth, canvasHeight, viewport);

      // Find nearest unstitched cell for this palette (uses indexed approach)
      const nearest = findNearestUnstitched(paletteIndex, viewportCenter.col, viewportCenter.row);

      if (nearest) {
        // Navigate to that cell via store action
        const cellIndex = nearest.row * pattern.width + nearest.col;
        navigateToCell(cellIndex, { animate: true });
      }
    },
    [pattern, viewport, selectPalette, findNearestUnstitched, navigateToCell]
  );

  if (!pattern || !progress) {
    return (
      <div className="palette-container">
        <div className="palette-header" style={styles.header}>
          Palette
        </div>
        <div style={styles.empty}>No pattern loaded</div>
      </div>
    );
  }

  const wrongCount = getTotalWrongCount();

  return (
    <div className="palette-container">
      <div className="palette-header" style={styles.header}>
        Palette
      </div>

      {wrongCount > 0 && (
        <button
          onClick={() => setToolMode(toolMode === 'picker' ? 'stitch' : 'picker')}
          className="picker-button"
          style={{
            ...styles.pickerButton,
            ...(toolMode === 'picker' ? styles.pickerButtonActive : {}),
          }}
        >
          <span style={styles.pickerIcon}>&#x2702;</span>
          Stitch Picker ({wrongCount})
        </button>
      )}

      <div className="palette-list" style={styles.list}>
        {visiblePalette.map(entry => {
          const remaining = progress.paletteCounts[entry.paletteIndex].remainingTargets;
          const isSelected = selectedPaletteIndex === entry.paletteIndex && toolMode === 'stitch';

          return (
            <button
              key={entry.paletteId}
              onClick={() => handlePaletteClick(entry.paletteIndex)}
              className="palette-tile"
              style={{
                ...styles.tile,
                ...(isSelected ? styles.tileSelected : {}),
              }}
            >
              <div
                className="palette-swatch"
                style={{
                  ...styles.swatch,
                  backgroundColor: entry.hex,
                }}
              />
              <div className="palette-symbol" style={styles.symbol}>
                {entry.symbol}
              </div>
              <div className="palette-info" style={styles.info}>
                <div style={styles.name}>{entry.name}</div>
                <div style={styles.code}>
                  {entry.brand && entry.code ? `${entry.brand} ${entry.code}` : entry.code || ''}
                </div>
              </div>
              <div className="palette-count" style={styles.count}>
                {remaining}
              </div>
            </button>
          );
        })}

        {visiblePalette.length === 0 && <div style={styles.allComplete}>All colors completed!</div>}
      </div>
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  header: {
    padding: '1rem',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    borderBottom: '1px solid #ddd',
    backgroundColor: '#f9f9f9',
  },
  empty: {
    padding: '2rem',
    textAlign: 'center',
    color: '#888',
  },
  pickerButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    margin: '0.75rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#FFD700',
    border: '2px solid #DAA520',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.8rem',
    transition: 'all 0.2s',
  },
  pickerButtonActive: {
    backgroundColor: '#FFA500',
    borderColor: '#FF8C00',
  },
  pickerIcon: {
    fontSize: '0.9rem',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem',
  },
  tile: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.75rem',
    marginBottom: '0.5rem',
    backgroundColor: '#f9f9f9',
    border: '2px solid transparent',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  tileSelected: {
    borderColor: '#2D5A27',
    backgroundColor: '#E8F0E7',
  },
  swatch: {
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    flexShrink: 0,
  },
  symbol: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize: '1rem',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  name: {
    fontSize: '0.775rem',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  code: {
    fontSize: '0.775rem',
    color: '#888',
  },
  count: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#666',
    backgroundColor: '#e0e0e0',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    minWidth: '40px',
    textAlign: 'center',
  },
  allComplete: {
    padding: '2rem',
    textAlign: 'center',
    color: '#2D5A27',
    fontWeight: 'bold',
  },
};
