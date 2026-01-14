import { useEffect, useRef } from 'react';
import { FileDropZone, Palette, PatternCanvas, TopBar } from './components';
import { useAutosaveSnapshots } from './hooks/useAutosaveSnapshots';
import { useAuth } from './hooks/useAuth';
import { performInitialSync } from './sync/initialSync';

export function App() {
  useAutosaveSnapshots();
  const { user } = useAuth();
  const hasPerformedInitialSync = useRef(false);

  useEffect(() => {
    // Perform initial sync when user logs in (only once per session)
    if (user && !hasPerformedInitialSync.current) {
      hasPerformedInitialSync.current = true;
      performInitialSync().catch(error => {
        console.error('Initial sync failed:', error);
      });
    }

    // Reset flag when user logs out
    if (!user) {
      hasPerformedInitialSync.current = false;
    }
  }, [user]);

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
