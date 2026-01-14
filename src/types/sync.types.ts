import type { PaletteEntry, PaletteCounts, PatternMeta, ViewportTransform } from './general.types';

// ============================================================================
// Remote Database Types (matching Supabase schema)
// ============================================================================

/**
 * Pattern stored in Supabase patterns table
 */
export interface RemotePattern {
  id: string;
  user_id: string;
  width: number;
  height: number;
  palette: PaletteEntry[];
  targets_b64: string; // Base64-encoded Uint16Array
  meta: PatternMeta;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Progress stored in Supabase pattern_progress table
 */
export interface RemoteProgress {
  pattern_id: string;
  user_id: string;
  stitched_state_b64: string; // Base64-encoded Uint8Array
  placed_colors_b64: string; // Base64-encoded Uint16Array
  palette_counts: PaletteCounts[];
  last_selected_palette_index: number | null;
  viewport: ViewportTransform;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// ============================================================================
// Sync Status Types
// ============================================================================

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

/**
 * Current sync status for UI display
 */
export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: number | null; // Epoch milliseconds
  error: string | null;
}

// ============================================================================
// Sync Metadata Types (stored in IndexedDB)
// ============================================================================

/**
 * Tracks sync state for each pattern
 * Stored in IndexedDB sync_metadata object store
 */
export interface SyncMetadata {
  patternId: string;
  localUpdatedAt: number; // Epoch milliseconds
  remoteUpdatedAt: number | null; // Epoch milliseconds
  needsUpload: boolean;
}
