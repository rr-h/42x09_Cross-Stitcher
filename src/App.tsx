import { FileDropZone, Palette, PatternCanvas, TopBar } from './components';
import { useAutosaveSnapshots } from './hooks/useAutosaveSnapshots';

export function App() {
  useAutosaveSnapshots();

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
