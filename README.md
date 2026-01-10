# Cross-Stitcher

A web-based cross-stitch pattern game that lets you interactively stitch digital patterns from OXS and FCJSON files.

## Features

- **Pattern Import**: Load patterns from `.oxs` (Open Cross Stitch) or `.fcjson` (FlossCross JSON) files
- **Realistic Stitches**: Thread-like stitch rendering with highlights, shadows, and subtle variations
- **Interactive Stitching**: Click cells to place stitches, with validation for correct/incorrect placements
- **Palette Management**: Color palette with symbols, thread codes, and remaining stitch counts
- **Auto-Navigation**: Clicking a palette entry navigates to the nearest unstitched cell for that color
- **Stitch Picker Tool**: Remove incorrect stitches with a dedicated picker mode
- **Progress Persistence**: Your progress is saved locally and restored when you reload
- **Zoom & Pan**: Smooth navigation with mouse wheel zoom and drag-to-pan
- **Completion Celebration**: Visual celebration when you complete a pattern

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build

```bash
npm run build
```

### Testing

```bash
# Unit tests
npm test

# E2E tests (requires Playwright browsers)
npx playwright install
npm run test:e2e
```

### Linting

```bash
npm run lint
npm run format
```

## Usage

1. **Import a Pattern**: Click "Import Pattern" or drag-and-drop an `.oxs` or `.fcjson` file
2. **Select a Color**: Click a palette entry to select that color
3. **Place Stitches**: Click on pattern cells to place stitches
   - Correct placement: Stitch appears normally
   - Wrong placement: Stitch appears with a yellow "!" warning
4. **Remove Wrong Stitches**: When wrong stitches exist, the "Stitch Picker" tool appears. Activate it to remove incorrect stitches
5. **Navigate**:
   - Use mouse wheel to zoom in/out
   - Click and drag to pan
   - Click a palette entry to jump to the nearest unstitched cell for that color
6. **Track Progress**: The top bar shows your completion percentage
7. **Complete the Pattern**: When all stitches are correctly placed, enjoy the celebration!

## Supported File Formats

### OXS (Open Cross Stitch)

XML-based format with:
- Pattern dimensions
- Thread palette with colors and symbols
- Full stitch coordinates

### FCJSON (FlossCross JSON)

JSON export from FlossCross with:
- Image dimensions
- Floss (thread) definitions
- Cross stitch layer data

## Keyboard Shortcuts

- **Mouse Wheel**: Zoom in/out
- **Click + Drag**: Pan the canvas

## Limitations

- Only full cross stitches are supported (no half stitches, backstitches, etc.)
- Large patterns (500x500+) may have performance impacts
- Progress is stored locally per browser

## Deployment to GitHub Pages

This project is configured for automatic deployment to GitHub Pages.

### Automatic Deployment

1. Push your code to the `main` branch
2. GitHub Actions will automatically build and deploy to GitHub Pages
3. Access your app at `https://<username>.github.io/42x09_Cross-Stitcher/`

### Manual Setup (first time)

1. Go to your GitHub repository settings
2. Navigate to **Pages** in the sidebar
3. Under "Build and deployment", select **GitHub Actions** as the source
4. Push to `main` branch to trigger the first deployment

### Custom Repository Name

If you rename the repository, update the `base` path in [vite.config.ts](vite.config.ts):

```typescript
base: process.env.GITHUB_ACTIONS ? '/your-repo-name/' : '/',
```

## Project Structure

```
src/
├── components/       # React components
│   ├── PatternCanvas.tsx
│   ├── Palette.tsx
│   ├── TopBar.tsx
│   └── FileDropZone.tsx
├── parsers/         # File format parsers
│   ├── oxs.ts
│   └── fcjson.ts
├── store/           # Zustand state management
│   ├── index.ts
│   └── persistence.ts
├── utils/           # Utility functions
│   ├── coordinates.ts
│   ├── renderer.ts
│   ├── random.ts
│   └── hash.ts
├── types/           # TypeScript type definitions
└── test/            # Unit tests
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - State management
- **IndexedDB (idb)** - Local persistence
- **Canvas2D** - Rendering
- **Vitest** - Unit testing
- **Playwright** - E2E testing

## License

ISC
