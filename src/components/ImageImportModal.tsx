import React, { useEffect, useRef, useState } from 'react';
import {
  convertImageToPattern,
  DEFAULT_OPTIONS,
  getImageDimensions,
  type ImageConversionOptions,
} from '../converters/imageToPattern';
import { useGameStore } from '../store';

declare const URL: typeof globalThis.URL;

interface ImageImportModalProps {
  file: File;
  onClose: () => void;
}

export function ImageImportModal({ file, onClose }: ImageImportModalProps) {
  const loadPattern = useGameStore(s => s.loadPattern);

  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
    null
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [maxWidth, setMaxWidth] = useState(DEFAULT_OPTIONS.maxWidth);
  const [maxHeight, setMaxHeight] = useState(DEFAULT_OPTIONS.maxHeight);
  const [maxColors, setMaxColors] = useState(DEFAULT_OPTIONS.maxColors);
  const [useDMCColors, setUseDMCColors] = useState(DEFAULT_OPTIONS.useDMCColors);
  const [title, setTitle] = useState('');

  // Track if aspect ratio lock is enabled
  const [lockAspect, setLockAspect] = useState(true);
  const aspectRatio = useRef(1);

  useEffect(() => {
    // Load image preview and dimensions
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    getImageDimensions(file)
      .then(dims => {
        setImageDimensions(dims);
        aspectRatio.current = dims.width / dims.height;

        // Calculate initial dimensions
        let w = Math.min(dims.width, DEFAULT_OPTIONS.maxWidth);
        let h = Math.round(w / aspectRatio.current);
        if (h > DEFAULT_OPTIONS.maxHeight) {
          h = DEFAULT_OPTIONS.maxHeight;
          w = Math.round(h * aspectRatio.current);
        }
        setMaxWidth(w);
        setMaxHeight(h);
      })
      .catch(() => {
        setError('Failed to load image');
      });

    // Set title from filename
    setTitle(file.name.replace(/\.[^/.]+$/, ''));

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleWidthChange = (value: number) => {
    setMaxWidth(value);
    if (lockAspect && aspectRatio.current > 0) {
      setMaxHeight(Math.round(value / aspectRatio.current));
    }
  };

  const handleHeightChange = (value: number) => {
    setMaxHeight(value);
    if (lockAspect && aspectRatio.current > 0) {
      setMaxWidth(Math.round(value * aspectRatio.current));
    }
  };

  const handleConvert = async () => {
    setIsConverting(true);
    setError(null);

    try {
      const options: ImageConversionOptions = {
        maxWidth,
        maxHeight,
        maxColors,
        useDMCColors,
        title: title || undefined,
      };

      const pattern = await convertImageToPattern(file, options);
      await loadPattern(pattern);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setIsConverting(false);
    }
  };

  // Calculate estimated final size
  let estimatedWidth = maxWidth;
  let estimatedHeight = maxHeight;
  if (imageDimensions) {
    const ratio = imageDimensions.width / imageDimensions.height;
    estimatedWidth = maxWidth;
    estimatedHeight = Math.round(maxWidth / ratio);
    if (estimatedHeight > maxHeight) {
      estimatedHeight = maxHeight;
      estimatedWidth = Math.round(maxHeight * ratio);
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Import Image as Pattern</h2>
          <button onClick={onClose} style={styles.closeButton}>
            &times;
          </button>
        </div>

        <div style={styles.content}>
          {/* Preview */}
          {previewUrl && (
            <div style={styles.previewContainer}>
              <img src={previewUrl} alt="Preview" style={styles.preview} />
              {imageDimensions && (
                <div style={styles.dimensions}>
                  Original: {imageDimensions.width} x {imageDimensions.height} px
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          <div style={styles.settings}>
            {/* Title */}
            <div style={styles.field}>
              <label style={styles.label}>Pattern Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={styles.input}
                placeholder="Enter pattern title"
              />
            </div>

            {/* Dimensions */}
            <div style={styles.fieldRow}>
              <div style={styles.field}>
                <label style={styles.label}>Width (stitches)</label>
                <input
                  type="number"
                  value={maxWidth}
                  onChange={e => handleWidthChange(parseInt(e.target.value) || 1)}
                  min={1}
                  max={1000}
                  style={styles.inputSmall}
                />
              </div>
              <div style={styles.lockContainer}>
                <button
                  onClick={() => setLockAspect(!lockAspect)}
                  style={{
                    ...styles.lockButton,
                    backgroundColor: lockAspect ? '#2D5A27' : '#ccc',
                  }}
                  title={lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                >
                  {lockAspect ? '🔗' : '🔓'}
                </button>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Height (stitches)</label>
                <input
                  type="number"
                  value={maxHeight}
                  onChange={e => handleHeightChange(parseInt(e.target.value) || 1)}
                  min={1}
                  max={1000}
                  style={styles.inputSmall}
                />
              </div>
            </div>

            {/* Estimated size */}
            <div style={styles.estimate}>
              Pattern size: {estimatedWidth} x {estimatedHeight} stitches
              {imageDimensions && (
                <>
                  {' '}
                  (~{Math.round((estimatedWidth / 14) * 10) / 10}" x{' '}
                  {Math.round((estimatedHeight / 14) * 10) / 10}" at 14ct)
                </>
              )}
            </div>

            {/* Max Colors */}
            <div style={styles.field}>
              <label style={styles.label}>Maximum Colors</label>
              <div style={styles.sliderContainer}>
                <input
                  type="range"
                  value={maxColors}
                  onChange={e => setMaxColors(parseInt(e.target.value))}
                  min={2}
                  max={490}
                  style={styles.slider}
                />
                <span style={styles.sliderValue}>{maxColors}</span>
              </div>
              <div style={styles.hint}>
                More colors = more detail, but more thread changes while stitching
              </div>
            </div>

            {/* DMC Colors */}
            <div style={styles.field}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={useDMCColors}
                  onChange={e => setUseDMCColors(e.target.checked)}
                  style={styles.checkbox}
                />
                <span>Use DMC thread colors</span>
              </label>
              <div style={styles.hint}>
                {useDMCColors
                  ? 'Colors will be matched to real DMC embroidery thread codes'
                  : 'Colors will be preserved as-is (custom palette)'}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && <div style={styles.error}>{error}</div>}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button onClick={onClose} style={styles.cancelButton} disabled={isConverting}>
            Cancel
          </button>
          <button
            onClick={handleConvert}
            style={styles.convertButton}
            disabled={isConverting || !imageDimensions}
          >
            {isConverting ? 'Converting...' : 'Create Pattern'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '1rem',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #eee',
  },
  title: {
    margin: 0,
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '0.8rem',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    lineHeight: '1',
  },
  content: {
    padding: '1.5rem',
    overflow: 'auto',
    flex: 1,
  },
  previewContainer: {
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
  preview: {
    maxWidth: '100%',
    maxHeight: '200px',
    objectFit: 'contain',
    borderRadius: '0.5rem',
    border: '1px solid #ddd',
  },
  dimensions: {
    fontSize: '0.85rem',
    color: '#666',
    marginTop: '0.5rem',
  },
  settings: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  fieldRow: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#333',
  },
  input: {
    padding: '0.625rem 0.75rem',
    border: '1px solid #ddd',
    borderRadius: '0.375rem',
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box',
  },
  inputSmall: {
    padding: '0.625rem 0.75rem',
    border: '1px solid #ddd',
    borderRadius: '0.375rem',
    fontSize: '0.9rem',
    width: '100px',
  },
  lockContainer: {
    display: 'flex',
    alignItems: 'center',
    paddingBottom: '0.25rem',
  },
  lockButton: {
    width: '36px',
    height: '36px',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s',
  },
  estimate: {
    fontSize: '0.85rem',
    color: '#666',
    backgroundColor: '#f5f5f5',
    padding: '0.75rem',
    borderRadius: '0.375rem',
    textAlign: 'center',
  },
  sliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  slider: {
    flex: 1,
    height: '6px',
    cursor: 'pointer',
  },
  sliderValue: {
    minWidth: '40px',
    textAlign: 'right',
    fontWeight: '600',
    color: '#2D5A27',
  },
  hint: {
    fontSize: '0.8rem',
    color: '#888',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  error: {
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: '#fee',
    color: '#c00',
    borderRadius: '0.375rem',
    fontSize: '0.9rem',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    borderTop: '1px solid #eee',
    backgroundColor: '#fafafa',
    borderRadius: '0 0 0.75rem 0.75rem',
  },
  cancelButton: {
    padding: '0.625rem 1.25rem',
    border: '1px solid #ddd',
    borderRadius: '0.375rem',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  convertButton: {
    padding: '0.625rem 1.25rem',
    border: 'none',
    borderRadius: '0.375rem',
    backgroundColor: '#2D5A27',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
};
