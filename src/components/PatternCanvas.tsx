import { useRef, useEffect, useCallback, useState } from 'react';
import { useGameStore } from '../store';
import { renderCanvas } from '../utils/renderer';
import {
  screenToGrid,
  clampViewport,
  calculateFitViewport,
  getViewportCenterInGrid,
  gridToWorld,
  CELL_SIZE,
} from '../utils/coordinates';
import type { ViewportTransform, GridCell } from '../types';

const DRAG_THRESHOLD = 5;

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startTranslateX: number;
  startTranslateY: number;
  hasMoved: boolean;
}

export function PatternCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startTranslateX: 0,
    startTranslateY: 0,
    hasMoved: false,
  });

  const pattern = useGameStore(s => s.pattern);
  const progress = useGameStore(s => s.progress);
  const viewport = useGameStore(s => s.viewport);
  const selectedPaletteIndex = useGameStore(s => s.selectedPaletteIndex);
  const toolMode = useGameStore(s => s.toolMode);
  const isComplete = useGameStore(s => s.isComplete);
  const showCelebration = useGameStore(s => s.showCelebration);

  const setViewport = useGameStore(s => s.setViewport);
  const placeStitch = useGameStore(s => s.placeStitch);
  const removeWrongStitch = useGameStore(s => s.removeWrongStitch);
  const closeCelebration = useGameStore(s => s.closeCelebration);

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
      selectedPaletteIndex,
      viewport,
      canvasWidth: size.width,
      canvasHeight: size.height,
    });
  }, [pattern, progress?.stitchedState, viewport, size, selectedPaletteIndex]);

  // Handle pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startTranslateX: viewport.translateX,
      startTranslateY: viewport.translateY,
      hasMoved: false,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [viewport]);

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const dragState = dragStateRef.current;
    if (!dragState.isDragging) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      dragState.hasMoved = true;
    }

    if (dragState.hasMoved && pattern) {
      const newViewport: ViewportTransform = {
        scale: viewport.scale,
        translateX: dragState.startTranslateX + dx,
        translateY: dragState.startTranslateY + dy,
      };

      const clamped = clampViewport(newViewport, pattern.width, pattern.height, size.width, size.height);
      setViewport(clamped);
    }
  }, [pattern, viewport.scale, size, setViewport]);

  // Handle pointer up
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const dragState = dragStateRef.current;
    const wasClick = !dragState.hasMoved;

    dragStateRef.current.isDragging = false;
    dragStateRef.current.hasMoved = false;

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (wasClick && pattern && !isComplete) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cell = screenToGrid(x, y, viewport);

      if (cell.col >= 0 && cell.col < pattern.width && cell.row >= 0 && cell.row < pattern.height) {
        if (toolMode === 'stitch') {
          if (selectedPaletteIndex !== null) {
            placeStitch(cell.col, cell.row);
          }
        } else if (toolMode === 'picker') {
          removeWrongStitch(cell.col, cell.row);
        }
      }
    }
  }, [pattern, viewport, toolMode, selectedPaletteIndex, placeStitch, removeWrongStitch, isComplete]);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
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

    const clamped = clampViewport(newViewport, pattern.width, pattern.height, size.width, size.height);
    setViewport(clamped);
  }, [pattern, viewport, size, setViewport]);

  // Navigate to cell
  const navigateToCell = useCallback((cell: GridCell) => {
    if (!pattern) return;

    const targetWorld = gridToWorld(cell.col + 0.5, cell.row + 0.5);
    const newTranslateX = size.width / 2 - targetWorld.x * viewport.scale;
    const newTranslateY = size.height / 2 - targetWorld.y * viewport.scale;

    const newViewport: ViewportTransform = {
      scale: viewport.scale,
      translateX: newTranslateX,
      translateY: newTranslateY,
    };

    const clamped = clampViewport(newViewport, pattern.width, pattern.height, size.width, size.height);
    setViewport(clamped);
  }, [pattern, viewport.scale, size, setViewport]);

  // Expose navigation method for palette clicks
  useEffect(() => {
    (window as unknown as { navigateToCell: (cell: GridCell) => void }).navigateToCell = navigateToCell;
  }, [navigateToCell]);

  // Get cursor style
  const getCursor = () => {
    if (dragStateRef.current.hasMoved) return 'grabbing';
    if (toolMode === 'picker') return 'crosshair';
    return 'default';
  };

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
          <p style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>No pattern loaded</p>
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
          cursor: getCursor(),
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      />

      {showCelebration && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 100,
          }}
          onClick={closeCelebration}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '2rem 3rem',
              borderRadius: '1rem',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#2D5A27' }}>
              Congratulations!
            </h2>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>
              You completed the pattern!
            </p>
            <button
              onClick={closeCelebration}
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                backgroundColor: '#2D5A27',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
