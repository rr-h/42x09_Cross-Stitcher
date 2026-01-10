import { FileDropZone, Palette, PatternCanvas, TopBar } from './components';

export function App() {
  return (
    <FileDropZone>
      <div className="app-container">
        <TopBar />
        <div className="app-main">
          <div className="canvas-container" data-canvas-container>
            <PatternCanvas />
          </div>
          <Palette />
        </div>
      </div>
    </FileDropZone>
  );
}
