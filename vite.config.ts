import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages - uses repo name from env or defaults to '/'
  // Set VITE_BASE_PATH env var during build for custom path
  base: process.env.GITHUB_ACTIONS ? '/42x09_Cross-Stitcher/' : '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
  // Disable automatic public directory copying - we use a custom script
  // to exclude the 591MB patterns directory from the build
  publicDir: false,
});
