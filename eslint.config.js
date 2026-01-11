import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  js.configs.recommended,
  {
    files: [ '**/*.{ts,tsx}' ],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        crypto: 'readonly',
        indexedDB: 'readonly',
        OffscreenCanvas: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLElement: 'readonly',
        DOMRect: 'readonly',
        CanvasRenderingContext2D: 'readonly',
        ResizeObserver: 'readonly',
        Event: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Image: 'readonly',
        ArrayBuffer: 'readonly',
        Uint8Array: 'readonly',
        Uint16Array: 'readonly',
        Uint32Array: 'readonly',
        TextEncoder: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        Promise: 'readonly',
        Error: 'readonly',
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [ 'error', { argsIgnorePattern: '^_' } ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'warn',
    },
  },
  {
    ignores: [ 'dist/**', 'node_modules/**', '*.config.js', '*.config.ts' ],
  },
]
