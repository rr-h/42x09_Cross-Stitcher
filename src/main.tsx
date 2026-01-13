import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// Initialize background pattern preloading
import { preloadPopularPatterns } from './data/patternCatalog';

// Start preloading popular patterns in the background (non-blocking)
preloadPopularPatterns().catch((error: Error) => {
  console.warn('[PatternPreload] Failed to preload patterns:', error);
});

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
