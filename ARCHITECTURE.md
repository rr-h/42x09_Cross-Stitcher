# Architecture

This document describes the technical architecture of the Cross-Stitcher application.

## Overview

Cross-Stitcher is a single-page application built with React and TypeScript. It uses Canvas2D for rendering and Zustand for state management.

## Data Model

### PatternDoc

The core pattern data structure:

```typescript
interface PatternDoc {
  id: string;              // SHA-256 hash of file contents
  width: number;           // Grid width in stitches
  height: number;          // Grid height in stitches
  palette: PaletteEntry[]; // Thread colors
  targets: Uint16Array;    // Target palette index per cell (NO_STITCH = 0xFFFF)
  meta: PatternMeta;       // Optional metadata
}
```

### PaletteEntry

Thread color definition:

```typescript
interface PaletteEntry {
  paletteIndex: number;  // Position in palette array
  paletteId: string;     // Stable identifier
  name: string;          // Color name
  brand?: string;        // Thread brand (DMC, Anchor)
  code?: string;         // Thread code
  hex: string;           // Color as #RRGGBB
  symbol: string;        // Display symbol
  totalTargets: number;  // Total cells using this color
}
```

### UserProgress

User's stitching progress:

```typescript
interface UserProgress {
  patternId: string;
  stitchedState: Uint8Array;     // 0=none, 1=correct, 2=wrong
  paletteCounts: PaletteCounts[];
  lastSelectedPaletteIndex: number | null;
  viewport: ViewportTransform;
}
```

## Rendering Architecture

### Coordinate Systems

Three coordinate systems are used:

1. **Screen coordinates**: Pixel position on the canvas element
2. **World coordinates**: Virtual canvas space (before zoom/pan)
3. **Grid coordinates**: Cell position (col, row)

Transforms are provided in `utils/coordinates.ts`:
- `screenToWorld(x, y, viewport)`
- `worldToScreen(x, y, viewport)`
- `worldToGrid(x, y)`
- `gridToWorld(col, row)`
- `screenToGrid(x, y, viewport)`

### Viewport Transform

```typescript
interface ViewportTransform {
  scale: number;      // Zoom level (1 = 100%)
  translateX: number; // Pan offset X
  translateY: number; // Pan offset Y
}
```

### Cell Size

All cells are `CELL_SIZE` (40) world units square. Screen size = `CELL_SIZE * scale`.

### Render Pipeline

The `renderCanvas()` function draws in this order:

1. **Background**: Fabric color with subtle weave texture
2. **Grid lines**: Faint lines that fade at low zoom
3. **Symbols**: For unstitched cells, show the pattern symbol
4. **Stitches**: Realistic thread rendering for stitched cells
5. **Warnings**: Yellow "!" overlay for wrong stitches

### Stitch Rendering

Realistic stitches are drawn as two crossing thread strands:

1. Bottom-left to top-right (drawn first)
2. Top-left to bottom-right (drawn on top)

Each strand has:
- Shadow layer (darker, offset down-right)
- Main color layer
- Highlight layer (lighter, offset along perpendicular)

Randomness is seeded by cell coordinates for deterministic variation.

### Performance Optimization

- **Culling**: Only visible cells are rendered
- **Early exit**: Grid lines skip rendering at very low zoom
- **Typed arrays**: `Uint16Array` for targets, `Uint8Array` for stitch state

## State Management

### Zustand Store

The main store (`store/index.ts`) contains:

**State:**
- `pattern`: Current PatternDoc or null
- `progress`: Current UserProgress or null
- `selectedPaletteIndex`: Currently selected color
- `toolMode`: 'stitch' or 'picker'
- `viewport`: Current zoom/pan transform
- `isComplete`: Whether pattern is finished
- `showCelebration`: Show completion overlay

**Actions:**
- `loadPattern(pattern)`: Load a parsed pattern
- `selectPalette(index)`: Select a palette entry
- `setToolMode(mode)`: Switch between stitch/picker
- `placeStitch(col, row)`: Place a stitch at cell
- `removeWrongStitch(col, row)`: Remove wrong stitch
- `setViewport(viewport)`: Update zoom/pan
- `closeCelebration()`: Dismiss completion overlay

**Computed:**
- `getTotalWrongCount()`: Count of all wrong stitches
- `getRemainingForPalette(index)`: Remaining stitches for color
- `findNearestUnstitched(index, centerCol, centerRow)`: Find closest target

### Persistence

Progress is persisted to IndexedDB via `store/persistence.ts`:

```typescript
saveProgress(progress: UserProgress): Promise<void>
loadProgress(patternId: string): Promise<UserProgress | null>
deleteProgress(patternId: string): Promise<void>
```

The pattern ID (SHA-256 hash of file contents) is used as the key.

## File Parsers

### OXS Parser (`parsers/oxs.ts`)

Parses XML Open Cross Stitch format:

1. Parse XML with fast-xml-parser
2. Extract dimensions from `<properties>`
3. Parse `<palette>` items, filtering out cloth entry
4. Build palette index mapping (original -> new)
5. Parse `<fullstitches>` and populate targets array
6. Count targets per palette entry
7. Generate pattern ID from content hash

### FCJSON Parser (`parsers/fcjson.ts`)

Parses FlossCross JSON format:

1. Parse JSON and validate with Zod schema
2. Extract first image from `model.images`
3. Parse `flossIndexes` as palette
4. Build `crossIndexes` to `flossIndex` mapping
5. Parse `layers[0].cross` array as targets
6. Count targets per palette entry
7. Generate pattern ID from content hash

## Component Structure

```
App
├── FileDropZone          # Drag-and-drop wrapper
│   ├── TopBar           # Zoom controls, import, progress
│   ├── PatternCanvas    # Main rendering canvas
│   └── Palette          # Color selection sidebar
```

### PatternCanvas

- Manages canvas element and resize observer
- Handles pointer events for click/drag disambiguation
- Implements zoom (wheel) and pan (drag)
- Delegates rendering to `renderCanvas()`
- Shows completion celebration overlay

### Palette

- Displays palette entries with remaining counts
- Filters out completed colors
- Shows stitch picker tool when wrong stitches exist
- Triggers navigation on click

### TopBar

- File import button
- Zoom controls (+, -, Fit)
- Progress percentage display
- Mode indicator

## Interaction Flow

### Placing a Stitch

1. User clicks canvas
2. Canvas determines if click (not drag)
3. Convert screen coords to grid cell
4. Call `placeStitch(col, row)` action
5. Store validates: cell not already stitched, has target
6. Compare selected palette vs target
7. Update `stitchedState` array
8. Update `paletteCounts`
9. Check for completion
10. Persist progress to IndexedDB
11. Trigger re-render

### Auto-Navigation

1. User clicks palette entry
2. Select that palette index
3. Calculate viewport center in grid coords
4. Search all cells for this palette with `stitchedState === None`
5. Find cell with minimum distance to center
6. Calculate new viewport to center on that cell
7. Animate/update viewport

## Testing

### Unit Tests (Vitest)

- **Parsers**: Test OXS and FCJSON parsing with sample data
- **Coordinates**: Test transform functions and bounds calculation
- **Random**: Test seeded RNG determinism

### E2E Tests (Playwright)

- Import OXS file
- Import FCJSON file
- Select palette and place stitch
- Zoom and pan controls
- Progress tracking
