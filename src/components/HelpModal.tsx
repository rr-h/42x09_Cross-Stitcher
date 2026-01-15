import React from 'react';

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>How to Play Cross-Stitcher</h2>
          <button onClick={onClose} style={styles.closeButton}>
            &times;
          </button>
        </div>

        <div style={styles.content}>
          {/* Welcome Section */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Welcome!</h3>
            <p style={styles.paragraph}>
              Cross-Stitcher is a relaxing pixel art game where you recreate beautiful cross-stitch
              patterns by placing colored stitches on a canvas. Follow the pattern, match the
              colors, and watch your masterpiece come to life!
            </p>
          </section>

          {/* Getting Started */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Getting Started</h3>
            <p style={styles.paragraph}>There are several ways to start stitching:</p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Pick Pattern:</strong> Browse the built-in gallery of patterns. Click any
                pattern to start stitching it.
              </li>
              <li style={styles.listItem}>
                <strong>Import Pattern:</strong> Load your own pattern files (.oxs or .fcjson
                format) from your computer.
              </li>
              <li style={styles.listItem}>
                <strong>Import Image:</strong> Convert any image (PNG, JPG, GIF, WebP, BMP) into a
                cross-stitch pattern. You can customize the size and number of colors.
              </li>
              <li style={styles.listItem}>
                <strong>Active:</strong> Resume working on patterns you've already started. Your
                progress is automatically saved.
              </li>
              <li style={styles.listItem}>
                <strong>Drag & Drop:</strong> Simply drag and drop pattern files or images directly
                onto the canvas to load them.
              </li>
            </ul>
          </section>

          {/* The Canvas */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>The Canvas</h3>
            <p style={styles.paragraph}>
              The canvas shows your pattern as a grid of cells. Each cell represents one stitch:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Empty cells with symbols:</strong> These show the target color you need to
                stitch. The symbol and faint color indicate which thread to use.
              </li>
              <li style={styles.listItem}>
                <strong>Filled cells:</strong> These are stitches you've already placed. Correct
                stitches show a solid color matching the target.
              </li>
              <li style={styles.listItem}>
                <strong>Fabric background:</strong> Light cream-colored cells with no symbol are
                blank areas - no stitch needed there.
              </li>
            </ul>
          </section>

          {/* Navigation */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Navigating the Canvas</h3>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Zoom In/Out:</strong> Use the + and - buttons in the toolbar, or scroll
                with your mouse wheel.
              </li>
              <li style={styles.listItem}>
                <strong>Fit:</strong> Click the "Fit" button to see the entire pattern on screen.
              </li>
              <li style={styles.listItem}>
                <strong>Pan:</strong> Click and drag on the canvas to move around the pattern.
              </li>
              <li style={styles.listItem}>
                <strong>Pinch to Zoom:</strong> On touch devices, use two fingers to zoom in and
                out.
              </li>
            </ul>
          </section>

          {/* Tools */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Tools</h3>
            <p style={styles.paragraph}>
              There are three tools available in the toolbar. The active tool is highlighted in
              green:
            </p>

            <div style={styles.toolCard}>
              <h4 style={styles.toolName}>Needle Tool</h4>
              <p style={styles.toolDescription}>
                Your main stitching tool. Click on any cell to place a stitch with your currently
                selected color. You can also click and drag to place multiple stitches quickly.
                Only stitches that match the target color will be counted as correct.
              </p>
            </div>

            <div style={styles.toolCard}>
              <h4 style={styles.toolName}>Fill Tool</h4>
              <p style={styles.toolDescription}>
                Fill an entire area at once! Click on any cell to automatically fill all connected
                cells that share the same target color. This is perfect for quickly completing
                large areas of the same color. Only correct matches are placed. This tool can also be 
                quickly accessed, as needed, by rapidly double clicking on an area of highlighted cells.
              </p>
            </div>

            <div style={styles.toolCard}>
              <h4 style={styles.toolName}>Picker Tool</h4>
              <p style={styles.toolDescription}>
                Made a mistake? Use the Picker tool to remove incorrect stitches. Click on any
                wrongly-placed stitch to remove it. This tool only works on incorrect stitches -
                correct ones are protected. This tool can also be quickly accessed by double clicking
                on an incorrect (marked by a !) cell.
              </p>
            </div>
          </section>

          {/* Color Palette */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>The Color Palette</h3>
            <p style={styles.paragraph}>
              The palette panel (on the right side or bottom on mobile) shows all the thread colors
              in your pattern:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Click a color:</strong> Select it as your active thread for the Needle
                tool.
              </li>
              <li style={styles.listItem}>
                <strong>Color info:</strong> Each entry shows the DMC thread code, color name, and
                a progress bar.
              </li>
              <li style={styles.listItem}>
                <strong>Progress bars:</strong> Green bars show how much of each color you've
                completed. The numbers show completed/total stitches.
              </li>
              <li style={styles.listItem}>
                <strong>Selected color:</strong> The currently active color is highlighted with a
                green border.
              </li>
              <li style={styles.listItem}>
                <strong>Completed colors:</strong> Colors that are 100% done show a checkmark.
              </li>
            </ul>
          </section>

          {/* Progress */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Tracking Progress</h3>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Progress bar:</strong> The bar in the top-right shows your overall
                completion percentage.
              </li>
              <li style={styles.listItem}>
                <strong>Auto-save:</strong> Your progress is automatically saved to your browser.
                You can close the game and come back anytime.
              </li>
              <li style={styles.listItem}>
                <strong>Pattern complete:</strong> When you finish all stitches, the progress bar
                turns green and shows "Complete!"
              </li>
            </ul>
          </section>

          {/* Cloud Sync */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Cloud Sync (Optional)</h3>
            <p style={styles.paragraph}>
              Sign in with your email to sync your progress across devices:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Sign In:</strong> Click "Sign In" in the top-right corner and enter your
                email. You'll receive a magic link - no password needed!
              </li>
              <li style={styles.listItem}>
                <strong>Sync icon:</strong> The cloud icon shows your sync status. Click it to
                manually sync your progress.
              </li>
              <li style={styles.listItem}>
                <strong>Auto-sync:</strong> Your progress automatically syncs when you make changes
                (while signed in).
              </li>
            </ul>
          </section>

          {/* Tips */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Tips for Success</h3>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Work by color:</strong> Complete one color at a time for the most efficient
                stitching.
              </li>
              <li style={styles.listItem}>
                <strong>Use Fill for backgrounds:</strong> Large solid areas are perfect for the
                Fill tool.
              </li>
              <li style={styles.listItem}>
                <strong>Zoom in for details:</strong> Work on intricate areas at higher zoom
                levels.
              </li>
              <li style={styles.listItem}>
                <strong>Check your progress:</strong> Use the palette to see which colors need the
                most work.
              </li>
              <li style={styles.listItem}>
                <strong>Take your time:</strong> There's no rush - cross-stitching is meant to be
                relaxing!
              </li>
            </ul>
          </section>

          {/* Keyboard and Moouse Shortcuts */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Keyboard and Mouse Shortcuts</h3>
            <div style={styles.shortcutsGrid}>
              <div style={styles.shortcut}>
                <kbd style={styles.kbd}>1</kbd>
                <span>Needle Tool</span>
              </div>
              <div style={styles.shortcut}>
                <kbd style={styles.kbd}>2</kbd>
                <span>Fill Tool</span>
              </div>
              <div style={styles.shortcut}>
                <kbd style={styles.kbd}>3</kbd>
                <span>Picker Tool</span>
              </div>
              <div style={styles.shortcut}>
                <kbd style={styles.kbd}>+</kbd>
                <span>Zoom In</span>
              </div>
              <div style={styles.shortcut}>
                <kbd style={styles.kbd}>-</kbd>
                <span>Zoom Out</span>
              </div>
              <div style={styles.shortcut}>
                <kbd style={styles.kbd}>0</kbd>
                <span>Fit to Screen</span>
              </div>
              <div>
               <ul style={styles.list}>
              <li style={styles.listItem}>
              <strong>Doubleclick Highlighted cells:</strong> activate quick fill
                stitching for currently selected colour.
              </li>
              <li style={styles.listItem}>
                <strong>Doubleclick Incorrect Stitchs:</strong> remove the stitch
                to restore the cell for correction.
              </li>
            </ul>
            </div>
          </section>
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.closeBtn}>
            Got it!
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
    maxWidth: '700px',
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
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#2D5A27',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    lineHeight: '1',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '1.5rem',
  },
  section: {
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#333',
    marginTop: 0,
    marginBottom: '0.75rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #2D5A27',
  },
  paragraph: {
    fontSize: '0.85rem',
    lineHeight: '1.6',
    color: '#555',
    margin: '0 0 0.75rem 0',
  },
  list: {
    margin: 0,
    paddingLeft: '1.25rem',
  },
  listItem: {
    fontSize: '0.85rem',
    lineHeight: '1.6',
    color: '#555',
    marginBottom: '0.5rem',
  },
  toolCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: '0.5rem',
    padding: '1rem',
    marginBottom: '0.75rem',
    border: '1px solid #e0e0e0',
  },
  toolName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#2D5A27',
    margin: '0 0 0.5rem 0',
  },
  toolDescription: {
    fontSize: '0.85rem',
    lineHeight: '1.6',
    color: '#555',
    margin: 0,
  },
  shortcutsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '0.75rem',
  },
  shortcut: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.85rem',
    color: '#555',
  },
  kbd: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '28px',
    height: '28px',
    padding: '0 0.5rem',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: '600',
    fontFamily: 'monospace',
    boxShadow: '0 2px 0 #bbb',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '1rem 1.5rem',
    borderTop: '1px solid #eee',
    backgroundColor: '#fafafa',
    borderRadius: '0 0 0.75rem 0.75rem',
    flexShrink: 0,
  },
  closeBtn: {
    padding: '0.75rem 2rem',
    backgroundColor: '#2D5A27',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
};
