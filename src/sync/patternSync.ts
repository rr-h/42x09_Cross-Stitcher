import type { PatternDoc, UserProgress } from '../types';
import type { RemotePattern, RemoteProgress } from '../types/sync.types';
import { bytesToBase64, u16ToBase64, base64ToBytes } from './snapshotCodec';
import { supabase } from './supabaseClient';
import {
  savePattern as savePatternLocal,
  loadPattern as loadPatternLocal,
  saveProgress as saveProgressLocal,
  loadProgress as loadProgressLocal,
  saveSyncMeta,
  loadSyncMeta,
  deleteSyncMeta,
  getAllPatternIds,
} from '../store/persistence';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the current user's ID from Supabase auth
 */
async function getUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

/**
 * Decode Base64 string to Uint16Array
 */
function base64ToU16(b64: string): Uint16Array {
  const bytes = base64ToBytes(b64);
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Uint16Array(buf);
}

// ============================================================================
// Encoding/Decoding Functions
// ============================================================================

/**
 * Convert PatternDoc to RemotePattern for database storage
 */
export function encodePatternForRemote(pattern: PatternDoc, userId: string): RemotePattern {
  return {
    id: pattern.id,
    user_id: userId,
    width: pattern.width,
    height: pattern.height,
    palette: pattern.palette,
    targets_b64: u16ToBase64(pattern.targets),
    meta: pattern.meta,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Convert RemotePattern from database to PatternDoc
 */
export function decodePatternFromRemote(remote: RemotePattern): PatternDoc {
  return {
    id: remote.id,
    width: remote.width,
    height: remote.height,
    palette: remote.palette,
    targets: base64ToU16(remote.targets_b64),
    meta: remote.meta,
  };
}

/**
 * Convert UserProgress to RemoteProgress for database storage
 */
export function encodeProgressForRemote(progress: UserProgress, userId: string): RemoteProgress {
  return {
    pattern_id: progress.patternId,
    user_id: userId,
    stitched_state_b64: bytesToBase64(progress.stitchedState),
    placed_colors_b64: u16ToBase64(progress.placedColors),
    palette_counts: progress.paletteCounts,
    last_selected_palette_index: progress.lastSelectedPaletteIndex,
    viewport: progress.viewport,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Convert RemoteProgress from database to UserProgress
 */
export function decodeProgressFromRemote(remote: RemoteProgress): UserProgress {
  return {
    patternId: remote.pattern_id,
    stitchedState: base64ToBytes(remote.stitched_state_b64),
    placedColors: base64ToU16(remote.placed_colors_b64),
    paletteCounts: remote.palette_counts,
    lastSelectedPaletteIndex: remote.last_selected_palette_index,
    viewport: remote.viewport,
  };
}

// ============================================================================
// Pattern Sync Operations
// ============================================================================

/**
 * Upload a pattern to Supabase
 */
export async function uploadPattern(pattern: PatternDoc): Promise<void> {
  const userId = await getUserId();
  if (!userId) {
    console.warn('Cannot upload pattern: user not authenticated');
    return;
  }

  const remotePattern = encodePatternForRemote(pattern, userId);

  const { error } = await supabase
    .from('patterns')
    .upsert(remotePattern, { onConflict: 'id' });

  if (error) throw error;

  // Update sync metadata
  await saveSyncMeta({
    patternId: pattern.id,
    localUpdatedAt: Date.now(),
    remoteUpdatedAt: Date.now(),
    needsUpload: false,
  });
}

/**
 * Download a pattern from Supabase and save to local IndexedDB
 */
export async function downloadPattern(patternId: string): Promise<PatternDoc | null> {
  const userId = await getUserId();
  if (!userId) {
    console.warn('Cannot download pattern: user not authenticated');
    return null;
  }

  const { data, error } = await supabase
    .from('patterns')
    .select('*')
    .eq('id', patternId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Row not found
      return null;
    }
    throw error;
  }

  if (!data) return null;

  const pattern = decodePatternFromRemote(data as RemotePattern);

  // Save to local IndexedDB
  await savePatternLocal(pattern);

  // Update sync metadata
  const remoteUpdatedAt = new Date(data.updated_at).getTime();
  await saveSyncMeta({
    patternId: pattern.id,
    localUpdatedAt: Date.now(),
    remoteUpdatedAt,
    needsUpload: false,
  });

  return pattern;
}

/**
 * List all patterns for the current user from Supabase
 */
export async function listUserPatterns(): Promise<RemotePattern[]> {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('patterns')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data as RemotePattern[]) ?? [];
}

/**
 * Delete a pattern from Supabase (both pattern and progress)
 */
export async function deleteRemotePattern(patternId: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) {
    console.warn('Cannot delete pattern: user not authenticated');
    return;
  }

  // Delete pattern (cascade will delete progress)
  const { error: patternError } = await supabase
    .from('patterns')
    .delete()
    .eq('id', patternId)
    .eq('user_id', userId);

  if (patternError) throw patternError;

  // Delete progress separately (in case pattern doesn't exist)
  const { error: progressError } = await supabase
    .from('pattern_progress')
    .delete()
    .eq('pattern_id', patternId)
    .eq('user_id', userId);

  // Ignore progress delete errors (pattern might not have progress)
  if (progressError && progressError.code !== 'PGRST116') {
    console.warn('Error deleting remote progress:', progressError);
  }

  // Delete sync metadata
  await deleteSyncMeta(patternId);
}

// ============================================================================
// Progress Sync Operations
// ============================================================================

/**
 * Upload progress to Supabase
 */
export async function uploadProgress(progress: UserProgress): Promise<void> {
  const userId = await getUserId();
  if (!userId) {
    console.warn('Cannot upload progress: user not authenticated');
    return;
  }

  const remoteProgress = encodeProgressForRemote(progress, userId);

  const { error } = await supabase
    .from('pattern_progress')
    .upsert(remoteProgress, { onConflict: 'pattern_id,user_id' });

  if (error) throw error;
}

/**
 * Download progress from Supabase
 */
export async function downloadProgress(patternId: string): Promise<UserProgress | null> {
  const userId = await getUserId();
  if (!userId) {
    console.warn('Cannot download progress: user not authenticated');
    return null;
  }

  const { data, error } = await supabase
    .from('pattern_progress')
    .select('*')
    .eq('pattern_id', patternId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Row not found
      return null;
    }
    throw error;
  }

  if (!data) return null;

  return decodeProgressFromRemote(data as RemoteProgress);
}

/**
 * Delete progress from Supabase
 */
export async function deleteRemoteProgress(patternId: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) {
    console.warn('Cannot delete progress: user not authenticated');
    return;
  }

  const { error } = await supabase
    .from('pattern_progress')
    .delete()
    .eq('pattern_id', patternId)
    .eq('user_id', userId);

  if (error && error.code !== 'PGRST116') throw error;
}

// ============================================================================
// Full Sync Operations
// ============================================================================

/**
 * Sync a single pattern (compare timestamps and upload/download as needed)
 */
export async function syncPattern(patternId: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const localPattern = await loadPatternLocal(patternId);
  const syncMeta = await loadSyncMeta(patternId);

  // Fetch remote pattern
  const { data: remoteData } = await supabase
    .from('patterns')
    .select('*')
    .eq('id', patternId)
    .eq('user_id', userId)
    .single();

  const remotePattern = remoteData ? (remoteData as RemotePattern) : null;

  // Determine what to do
  if (!localPattern && remotePattern) {
    // Remote exists, local doesn't: download
    await downloadPattern(patternId);
  } else if (localPattern && !remotePattern) {
    // Local exists, remote doesn't: upload
    await uploadPattern(localPattern);
  } else if (localPattern && remotePattern) {
    // Both exist: compare timestamps
    const localTime = syncMeta?.localUpdatedAt ?? 0;
    const remoteTime = new Date(remotePattern.updated_at).getTime();

    if (remoteTime > localTime || syncMeta?.needsUpload) {
      // Remote is newer or local needs upload
      if (syncMeta?.needsUpload) {
        await uploadPattern(localPattern);
      } else {
        await downloadPattern(patternId);
      }
    }
  }

  // Also sync progress if pattern exists
  if (localPattern || remotePattern) {
    const localProgress = await loadProgressLocal(patternId);
    const remoteProgress = await downloadProgress(patternId);

    if (!localProgress && remoteProgress) {
      await saveProgressLocal(remoteProgress);
    } else if (localProgress && !remoteProgress) {
      await uploadProgress(localProgress);
    } else if (localProgress && remoteProgress) {
      // Both exist: upload local (last-write-wins)
      await uploadProgress(localProgress);
    }
  }
}

/**
 * Sync all patterns bidirectionally
 */
export async function syncAllPatterns(): Promise<void> {
  const userId = await getUserId();
  if (!userId) {
    console.warn('Cannot sync: user not authenticated');
    return;
  }

  // Get all local pattern IDs
  const localPatternIds = await getAllPatternIds();

  // Get all remote patterns
  const remotePatterns = await listUserPatterns();
  const remotePatternIds = remotePatterns.map(p => p.id);

  // Combine and deduplicate
  const allPatternIds = [...new Set([...localPatternIds, ...remotePatternIds])];

  // Sync each pattern
  for (const patternId of allPatternIds) {
    try {
      await syncPattern(patternId);
    } catch (error) {
      console.error(`Error syncing pattern ${patternId}:`, error);
      // Continue with other patterns
    }
  }
}

/**
 * Mark a pattern as needing upload (called when pattern is modified locally)
 */
export async function markPatternForUpload(patternId: string): Promise<void> {
  const meta = await loadSyncMeta(patternId);
  await saveSyncMeta({
    patternId,
    localUpdatedAt: Date.now(),
    remoteUpdatedAt: meta?.remoteUpdatedAt ?? null,
    needsUpload: true,
  });
}
