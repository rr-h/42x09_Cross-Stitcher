import { PatternCanvas, Palette, TopBar, FileDropZone } from './components';

export function App() {
  return (
    <FileDropZone>
      <div style={styles.container}>
        <TopBar />
        <div style={styles.main}>
          <div style={styles.canvasContainer} data-canvas-container>
            <PatternCanvas />
          </div>
          <Palette />
        </div>
      </div>
    </FileDropZone>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  canvasContainer: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
};
