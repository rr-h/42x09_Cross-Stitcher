import { useCallback, useState } from 'react';
import { isImageFile } from '../converters/imageToPattern';
import { parsePatternFile } from '../parsers';
import { useGameStore } from '../store/storeFunctions';
import { ImageImportModal } from './ImageImportModal';

interface FileDropZoneProps {
  children: React.ReactNode;
}

export function FileDropZone({ children }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const loadPattern = useGameStore(s => s.loadPattern);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setError(null);

      const file = e.dataTransfer.files[0];
      if (!file) return;

      // Check if it's an image file
      if (isImageFile(file)) {
        setImageFile(file);
        return;
      }

      const filename = file.name.toLowerCase();
      if (!filename.endsWith('.oxs') && !filename.endsWith('.fcjson')) {
        setError(
          'Unsupported file format. Please use .oxs, .fcjson, or image files (PNG, JPG, etc.).'
        );
        return;
      }

      try {
        const patternDoc = await parsePatternFile(file);
        await loadPattern(patternDoc);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse file');
      }
    },
    [loadPattern]
  );

  const handleCloseImageModal = useCallback(() => {
    setImageFile(null);
  }, []);

  const dismissError = () => setError(null);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      {children}

      {isDragging && (
        <div style={styles.overlay}>
          <div style={styles.dropTarget}>
            <div style={styles.dropIcon}>+</div>
            <div style={styles.dropText}>Drop file here</div>
            <div style={styles.dropHint}>.oxs, .fcjson, or image files</div>
          </div>
        </div>
      )}

      {imageFile && <ImageImportModal file={imageFile} onClose={handleCloseImageModal} />}

      {error && (
        <div style={styles.errorOverlay} onClick={dismissError}>
          <div style={styles.errorBox}>
            <div style={styles.errorTitle}>Error</div>
            <div style={styles.errorMessage}>{error}</div>
            <button onClick={dismissError} style={styles.errorButton}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(45, 90, 39, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  dropTarget: {
    padding: 'clamp(1.5rem, 5vw, 3rem)',
    backgroundColor: 'white',
    borderRadius: '1rem',
    textAlign: 'center',
    border: '3px dashed #2D5A27',
    maxWidth: '90vw',
    width: '400px',
  },
  dropIcon: {
    fontSize: 'clamp(1.5rem, 7vw, 3rem)',
    color: '#2D5A27',
    marginBottom: '1rem',
  },
  dropText: {
    fontSize: 'clamp(1rem, 4vw, 1.5rem)',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '0.5rem',
  },
  dropHint: {
    fontSize: 'clamp(0.875rem, 3vw, 1rem)',
    color: '#666',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  errorBox: {
    padding: 'clamp(1rem, 4vw, 2rem)',
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    textAlign: 'center',
    maxWidth: '90vw',
    width: '400px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  errorTitle: {
    fontSize: 'clamp(1rem, 4vw, 1.25rem)',
    fontWeight: 'bold',
    color: '#c0392b',
    marginBottom: '0.75rem',
  },
  errorMessage: {
    fontSize: 'clamp(0.875rem, 3vw, 1rem)',
    color: '#333',
    marginBottom: '1rem',
    wordBreak: 'break-word',
  },
  errorButton: {
    padding: '0.5rem 1.5rem',
    backgroundColor: '#c0392b',
    color: 'white',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    fontSize: 'clamp(0.875rem, 3vw, 1rem)',
    minWidth: '100px',
  },
};
