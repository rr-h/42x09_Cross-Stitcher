import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/storeFunctions';
import type { GridCell, ViewportTransform } from '../types';
import { StitchState } from '../types';
import {
  calculateFitViewport,
  clampViewport,
  gridToWorld,
  screenToGrid,
} from '../utils/coordinates';
import { renderCanvas } from '../utils/renderer';

type DragMode = 'none' | 'stitch' | 'pan';

interface DragState {
  isDragging: boolean;
  mode: DragMode;
  startX: number;
  startY: number;
  startTranslateX: number;
  startTranslateY: number;
  lastCell: GridCell | null;
  visitedCells: Set<string>;
}

interface PinchState {
  isPinching: boolean;
  initialDistance: number;
  initialScale: number;
  centerX: number;
  centerY: number;
}

function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

function getTouchDistance(touches: React.TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touches: React.TouchList, rect: DOMRect): { x: number; y: number } {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
    y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top,
  };
}

export const PatternCanvas = React.memo(function PatternCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [cursorStyle, setCursorStyle] = useState<string>('grab');
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    mode: 'none',
    startX: 0,
    startY: 0,
    startTranslateX: 0,
    startTranslateY: 0,
    lastCell: null,
    visitedCells: new Set(),
  });
  const pinchStateRef = useRef<PinchState>({
    isPinching: false,
    initialDistance: 0,
    initialScale: 1,
    centerX: 0,
    centerY: 0,
  });

  // Track last handled navigation nonce to avoid re-handling the same request
  const lastNavigationNonceRef = useRef<number>(-1);

  // Track pending single click to distinguish from double-click
  const singleClickTimerRef = useRef<number | null>(null);

  const pattern = useGameStore(s => s.pattern);
  const progress = useGameStore(s => s.progress);
  const viewport = useGameStore(s => s.viewport);
  const selectedPaletteIndex = useGameStore(s => s.selectedPaletteIndex);
  const toolMode = useGameStore(s => s.toolMode);
  const isComplete = useGameStore(s => s.isComplete);
  const showCelebration = useGameStore(s => s.showCelebration);
  const navigationRequest = useGameStore(s => s.navigationRequest);

  const setViewport = useGameStore(s => s.setViewport);
  const placeStitch = useGameStore(s => s.placeStitch);
  const floodFillStitch = useGameStore(s => s.floodFillStitch);
  const removeWrongStitch = useGameStore(s => s.removeWrongStitch);
  const closeCelebration = useGameStore(s => s.closeCelebration);
  const getStitchState = useGameStore(s => s.getStitchState);
  const getTargetPaletteIndex = useGameStore(s => s.getTargetPaletteIndex);
  const clearNavigationRequest = useGameStore(s => s.clearNavigationRequest);

  // Compute cursor style based on tool mode (but not drag state)
  const baseCursorStyle = useMemo(() => {
    if (toolMode === 'picker') {
      return 'crosshair';
    } else if (toolMode === 'fill') {
      return 'cell';
    } else if (selectedPaletteIndex !== null) {
      return 'crosshair';
    } else {
      return 'grab';
    }
  }, [toolMode, selectedPaletteIndex]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (singleClickTimerRef.current !== null) {
        window.clearTimeout(singleClickTimerRef.current);
      }
    };
  }, []);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Initial fit viewport
  useEffect(() => {
    if (pattern && size.width > 0 && size.height > 0) {
      const fitViewport = calculateFitViewport(
        pattern.width,
        pattern.height,
        size.width,
        size.height
      );
      setViewport(fitViewport);
    }
  }, [pattern?.id, size.width, size.height]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pattern || !progress) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = size.width;
    canvas.height = size.height;

    renderCanvas({
      ctx,
      pattern,
      stitchedState: progress.stitchedState,
      placedColors: progress.placedColors,
      selectedPaletteIndex,
      viewport,
      canvasWidth: size.width,
      canvasHeight: size.height,
    });
  }, [
    pattern,
    progress?.stitchedState,
    progress?.placedColors,
    viewport,
    size,
    selectedPaletteIndex,
  ]);

  // Try to place stitch at cell, returns true if stitch was placed
  const tryPlaceStitch = useCallback(
    (col: number, row: number): boolean => {
      if (!pattern || isComplete || selectedPaletteIndex === null) return false;
      if (col < 0 || col >= pattern.width || row < 0 || row >= pattern.height) return false;

      const state = getStitchState(col, row);
      if (state !== StitchState.None) return false; // Already stitched

      if (toolMode === 'stitch') {
        placeStitch(col, row);
        return true;
      }
      return false;
    },
    [pattern, isComplete, selectedPaletteIndex, toolMode, getStitchState, placeStitch]
  );

  // Handle pointer down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Clear any pending single click timer
      if (singleClickTimerRef.current !== null) {
        window.clearTimeout(singleClickTimerRef.current);
        singleClickTimerRef.current = null;
      }

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || !pattern || !progress) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cell = screenToGrid(x, y, viewport);

      // Determine drag mode based on what's under the cursor
      let mode: DragMode = 'none';

      if (cell.col >= 0 && cell.col < pattern.width && cell.row >= 0 && cell.row < pattern.height) {
        const state = getStitchState(cell.col, cell.row);
        const targetIdx = getTargetPaletteIndex(cell.col, cell.row);

        if (toolMode === 'picker') {
          // Picker mode - just handle clicks, no drag stitching
          if (state === StitchState.Wrong) {
            removeWrongStitch(cell.col, cell.row);
          }
          mode = 'pan';
        } else if (toolMode === 'fill') {
          // Fill mode - flood fill all connected cells of the same color
          if (
            state === StitchState.None &&
            selectedPaletteIndex !== null &&
            targetIdx === selectedPaletteIndex
          ) {
            floodFillStitch(cell.col, cell.row);
          }
          mode = 'pan';
        } else if (state === StitchState.None && selectedPaletteIndex !== null) {
          // Unstitched cell with palette selected - start stitch painting
          mode = 'stitch';
          // Don't place stitch immediately - wait to see if this is a double-click
          // The stitch will be placed on pointer up if no drag occurred
        } else {
          // Stitched cell or no palette selected - pan mode
          mode = 'pan';
        }
      } else {
        // Outside pattern bounds - pan mode
        mode = 'pan';
      }

      dragStateRef.current = {
        isDragging: true,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        startTranslateX: viewport.translateX,
        startTranslateY: viewport.translateY,
        lastCell: cell,
        visitedCells: new Set([cellKey(cell.col, cell.row)]),
      };

      // Update cursor for pan mode
      if (mode === 'pan') {
        setCursorStyle('grabbing');
      } else {
        setCursorStyle(baseCursorStyle);
      }

      const target = e.target as HTMLElement | null;
      if (target) {
        target.setPointerCapture(e.pointerId);
      }
    },
    [
      pattern,
      progress,
      viewport,
      toolMode,
      selectedPaletteIndex,
      baseCursorStyle,
      getStitchState,
      getTargetPaletteIndex,
      floodFillStitch,
      removeWrongStitch,
    ]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState.isDragging || !pattern) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (dragState.mode === 'stitch') {
        // Cancel any pending single click timer since we're now dragging
        if (singleClickTimerRef.current !== null) {
          window.clearTimeout(singleClickTimerRef.current);
          singleClickTimerRef.current = null;
        }

        // Stitch painting mode - place stitches as we drag
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cell = screenToGrid(x, y, viewport);

        const key = cellKey(cell.col, cell.row);
        if (!dragState.visitedCells.has(key)) {
          dragState.visitedCells.add(key);

          // Interpolate between last cell and current cell to not miss any
          if (dragState.lastCell) {
            const dx = cell.col - dragState.lastCell.col;
            const dy = cell.row - dragState.lastCell.row;
            const steps = Math.max(Math.abs(dx), Math.abs(dy));

            if (steps > 1) {
              for (let i = 1; i < steps; i++) {
                const interpCol = Math.round(dragState.lastCell.col + (dx * i) / steps);
                const interpRow = Math.round(dragState.lastCell.row + (dy * i) / steps);
                const interpKey = cellKey(interpCol, interpRow);
                if (!dragState.visitedCells.has(interpKey)) {
                  dragState.visitedCells.add(interpKey);
                  tryPlaceStitch(interpCol, interpRow);
                }
              }
            }
          }

          tryPlaceStitch(cell.col, cell.row);
          dragState.lastCell = cell;
        }
      } else if (dragState.mode === 'pan') {
        // Pan mode
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;

        const newViewport: ViewportTransform = {
          scale: viewport.scale,
          translateX: dragState.startTranslateX + dx,
          translateY: dragState.startTranslateY + dy,
        };

        const clamped = clampViewport(
          newViewport,
          pattern.width,
          pattern.height,
          size.width,
          size.height
        );
        setViewport(clamped);
      }
    },
    [pattern, viewport, size, setViewport, tryPlaceStitch]
  );

  // Handle pointer up
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const dragState = dragStateRef.current;
      const wasStitchMode = dragState.mode === 'stitch';
      const wasDragging =
        dragState.visitedCells.size > 1 ||
        Math.abs(e.clientX - dragState.startX) > 3 ||
        Math.abs(e.clientY - dragState.startY) > 3;

      // If we were in stitch mode but didn't drag, schedule a delayed single stitch
      // This delay allows us to detect double-clicks
      if (
        wasStitchMode &&
        !wasDragging &&
        pattern &&
        !isComplete &&
        selectedPaletteIndex !== null
      ) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const cell = screenToGrid(x, y, viewport);

          // Delay the single stitch placement to detect double-click
          singleClickTimerRef.current = window.setTimeout(() => {
            if (
              cell.col >= 0 &&
              cell.col < pattern.width &&
              cell.row >= 0 &&
              cell.row < pattern.height
            ) {
              tryPlaceStitch(cell.col, cell.row);
            }
            singleClickTimerRef.current = null;
          }, 200); // 200ms delay to detect double-click
        }
      }

      dragStateRef.current.isDragging = false;
      dragStateRef.current.mode = 'none';
      dragStateRef.current.visitedCells.clear();
      dragStateRef.current.lastCell = null;

      // Reset cursor based on base style
      setCursorStyle(baseCursorStyle);

      const target = e.target as HTMLElement | null;
      if (target) {
        target.releasePointerCapture(e.pointerId);
      }
    },
    [baseCursorStyle, pattern, isComplete, selectedPaletteIndex, viewport, tryPlaceStitch]
  );

  // Handle double-click for flood fill or removing wrong stitches (shortcuts to avoid switching tools)
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      // Cancel any pending single click timer since this is a double-click
      if (singleClickTimerRef.current !== null) {
        window.clearTimeout(singleClickTimerRef.current);
        singleClickTimerRef.current = null;
      }

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || !pattern || !progress || isComplete) return;

      // Allow double-click actions when in stitch mode (not picker or fill mode)
      if (toolMode === 'picker' || toolMode === 'fill') return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cell = screenToGrid(x, y, viewport);

      // Check bounds
      if (cell.col < 0 || cell.col >= pattern.width || cell.row < 0 || cell.row >= pattern.height) {
        return;
      }

      const state = getStitchState(cell.col, cell.row);
      const targetIdx = getTargetPaletteIndex(cell.col, cell.row);

      // Priority 1: Remove wrong stitch if double-clicking on one
      if (state === StitchState.Wrong) {
        removeWrongStitch(cell.col, cell.row);
        return;
      }

      // Priority 2: Flood fill if cell is unstitched and matches selected color
      if (
        selectedPaletteIndex !== null &&
        state === StitchState.None &&
        targetIdx === selectedPaletteIndex
      ) {
        floodFillStitch(cell.col, cell.row);
      }
    },
    [
      pattern,
      progress,
      viewport,
      toolMode,
      selectedPaletteIndex,
      isComplete,
      getStitchState,
      getTargetPaletteIndex,
      floodFillStitch,
      removeWrongStitch,
    ]
  );

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (!pattern) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate zoom
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = viewport.scale * zoomFactor;

      // Zoom towards mouse position
      const newTranslateX = mouseX - (mouseX - viewport.translateX) * zoomFactor;
      const newTranslateY = mouseY - (mouseY - viewport.translateY) * zoomFactor;

      const newViewport: ViewportTransform = {
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY,
      };

      const clamped = clampViewport(
        newViewport,
        pattern.width,
        pattern.height,
        size.width,
        size.height
      );
      setViewport(clamped);
    },
    [pattern, viewport, size, setViewport]
  );

  // Handle touch start for pinch-to-zoom
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pattern) {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const center = getTouchCenter(e.touches, rect);
        pinchStateRef.current = {
          isPinching: true,
          initialDistance: getTouchDistance(e.touches),
          initialScale: viewport.scale,
          centerX: center.x,
          centerY: center.y,
        };

        // Stop any pointer drag
        dragStateRef.current.isDragging = false;
        dragStateRef.current.mode = 'none';
      }
    },
    [pattern, viewport.scale]
  );

  // Handle touch move for pinch-to-zoom
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const pinchState = pinchStateRef.current;
      if (!pinchState.isPinching || e.touches.length !== 2 || !pattern) return;

      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const currentDistance = getTouchDistance(e.touches);
      const currentCenter = getTouchCenter(e.touches, rect);
      const scaleFactor = currentDistance / pinchState.initialDistance;
      const newScale = pinchState.initialScale * scaleFactor;

      // Zoom towards pinch center
      const zoomFactor = newScale / viewport.scale;
      const newTranslateX =
        currentCenter.x - (pinchState.centerX - viewport.translateX) * zoomFactor;
      const newTranslateY =
        currentCenter.y - (pinchState.centerY - viewport.translateY) * zoomFactor;

      const newViewport: ViewportTransform = {
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY,
      };

      const clamped = clampViewport(
        newViewport,
        pattern.width,
        pattern.height,
        size.width,
        size.height
      );
      setViewport(clamped);

      // Update pinch center for smooth panning while zooming
      pinchStateRef.current.centerX = currentCenter.x;
      pinchStateRef.current.centerY = currentCenter.y;
    },
    [pattern, viewport, size, setViewport]
  );

  // Handle touch end for pinch-to-zoom
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchStateRef.current.isPinching = false;
    }
  }, []);

  // Navigate to a grid cell by centering the viewport on it
  const navigateToCellInternal = useCallback(
    (col: number, row: number) => {
      if (!pattern) return;

      const targetWorld = gridToWorld(col + 0.5, row + 0.5);
      const newTranslateX = size.width / 2 - targetWorld.x * viewport.scale;
      const newTranslateY = size.height / 2 - targetWorld.y * viewport.scale;

      const newViewport: ViewportTransform = {
        scale: viewport.scale,
        translateX: newTranslateX,
        translateY: newTranslateY,
      };

      const clamped = clampViewport(
        newViewport,
        pattern.width,
        pattern.height,
        size.width,
        size.height
      );
      setViewport(clamped);
    },
    [pattern, viewport.scale, size, setViewport]
  );

  // Handle navigation requests from the store (triggered by Palette selection)
  useEffect(() => {
    if (!navigationRequest || !pattern) return;

    // Skip if we've already handled this request (same nonce)
    if (navigationRequest.nonce === lastNavigationNonceRef.current) return;

    // Mark this request as handled
    lastNavigationNonceRef.current = navigationRequest.nonce;

    const { cellIndex } = navigationRequest;
    const totalCells = pattern.width * pattern.height;

    // Validate cell index
    if (cellIndex < 0 || cellIndex >= totalCells) {
      clearNavigationRequest();
      return;
    }

    // Convert cell index to col/row
    const col = cellIndex % pattern.width;
    const row = Math.floor(cellIndex / pattern.width);

    // Navigate to the cell
    navigateToCellInternal(col, row);

    // Clear the request so it's not re-processed on re-render
    clearNavigationRequest();
  }, [navigationRequest, pattern, navigateToCellInternal, clearNavigationRequest]);

  // Pre-calculate confetti styles to avoid impure Math.random() in render
  const confettiPieces = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => {
      // Use deterministic math (Math.sin) instead of Math.random logic to keep render pure
      const s1 = Math.abs(Math.sin((i + 1) * 123.45));
      const s2 = Math.abs(Math.sin((i + 1) * 678.9));
      const s3 = Math.abs(Math.sin((i + 1) * 456.7));
      const s4 = Math.abs(Math.sin((i + 1) * 890.1));

      return {
        id: i,
        backgroundColor: ['#FFD700', '#FF69B4', '#00CED1', '#FF6347', '#32CD32'][i % 5],
        left: `${s1 * 100}%`,
        animationDuration: `${2 + s2 * 3}s`,
        animationDelay: `${s3 * 0.5}s`,
        rotation: s4 * 360,
      };
    });
  }, []);

  if (!pattern) {
    return (
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F5F0E8',
          color: '#666',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>No pattern loaded</p>
          <p>Import an .oxs or .fcjson file to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: size.width,
          height: size.height,
          cursor: cursorStyle,
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {showCelebration && (
        <>
          {/* Confetti animation overlay - non-blocking */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              overflow: 'hidden',
              zIndex: 100,
            }}
          >
            {confettiPieces.map(piece => (
              <div
                key={piece.id}
                style={{
                  position: 'absolute',
                  width: '10px',
                  height: '10px',
                  backgroundColor: piece.backgroundColor,
                  top: '-10px',
                  left: piece.left,
                  animation: `confetti-fall ${piece.animationDuration} linear ${piece.animationDelay} infinite`,
                  opacity: 0.8,
                  borderRadius: '2px',
                  transform: `rotate(${piece.rotation}deg)`,
                }}
              />
            ))}
          </div>

          {/* Celebration modal - positioned at top, non-blocking */}
          <div
            style={{
              position: 'absolute',
              top: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 101,
              pointerEvents: 'auto',
              animation: 'celebration-slide-in 0.5s ease-out',
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                padding: '1.5rem 2rem',
                borderRadius: '1rem',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                maxWidth: '90vw',
                width: '400px',
                border: '3px solid #2D5A27',
              }}
            >
              <h2
                style={{
                  fontSize: 'clamp(1rem, 4vw, 1.5rem)',
                  marginBottom: '0.75rem',
                  color: '#2D5A27',
                }}
              >
                🎉 Congratulations! 🎉
              </h2>
              <p
                style={{
                  fontSize: 'clamp(0.875rem, 3vw, 1rem)',
                  color: '#666',
                  marginBottom: '0.5rem',
                }}
              >
                You completed the pattern!
              </p>
              <p
                style={{
                  fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
                  color: '#999',
                  marginBottom: '1rem',
                }}
              >
                Take a moment to zoom and admire your work!
              </p>
              <button
                onClick={closeCelebration}
                style={{
                  padding: '0.625rem 1.5rem',
                  fontSize: 'clamp(0.775rem, 2vw, 0.9rem)',
                  backgroundColor: '#2D5A27',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  minWidth: '120px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1f3f1b')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2D5A27')}
              >
                Done
              </button>
            </div>
          </div>

          {/* CSS animations */}
          <style>{`
            @keyframes confetti-fall {
              to {
                transform: translateY(${window.innerHeight + 20}px) rotate(720deg);
              }
            }

            @keyframes celebration-slide-in {
              from {
                opacity: 0;
                transform: translateX(-50%) translateY(-20px);
              }
              to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
              }
            }
          `}</style>
        </>
      )}
    </div>
  );
});
