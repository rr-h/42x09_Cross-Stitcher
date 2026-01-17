import type { CompletedPattern } from '../types';
import type { RemoteCompletedPattern } from '../types/sync.types';
import { supabase } from './supabaseClient';
import {
  loadAllCompletedPatterns,
  saveCompletedPattern,
  markCompletedPatternAsSynced,
} from '../store/completedPatterns';

/**
 * Get the current user's ID from Supabase auth
 */
async function getUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

/**
 * Convert a data URL to a Blob
 */
function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = window.atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Upload a completed pattern snapshot to Supabase Storage
 * Returns the public URL of the uploaded image
 */
async function uploadSnapshotToStorage(
  userId: string,
  completedId: string,
  dataUrl: string,
  type: 'snapshot' | 'thumbnail'
): Promise<string> {
  const blob = dataURLtoBlob(dataUrl);
  const fileName = `${completedId}_${type}.jpg`;
  const filePath = `${userId}/${fileName}`;

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from('completed-patterns')
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload ${type}: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from('completed-patterns').getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Upload a completed pattern to Supabase
 */
export async function uploadCompletedPattern(completed: CompletedPattern): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error('User not authenticated');

  // Upload both snapshot and thumbnail to storage
  const snapshotUrl = await uploadSnapshotToStorage(
    userId,
    completed.id,
    completed.snapshotDataUrl,
    'snapshot'
  );
  const thumbnailUrl = await uploadSnapshotToStorage(
    userId,
    completed.id,
    completed.thumbnailDataUrl,
    'thumbnail'
  );

  // Create database record
  const remoteCompleted: RemoteCompletedPattern = {
    id: completed.id,
    user_id: userId,
    pattern_id: completed.patternId,
    title: completed.title,
    width: completed.width,
    height: completed.height,
    snapshot_url: snapshotUrl,
    thumbnail_url: thumbnailUrl,
    completed_at: new Date(completed.completedAt).toISOString(),
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('completed_patterns').upsert(remoteCompleted);

  if (error) {
    throw new Error(`Failed to upload completed pattern: ${error.message}`);
  }

  // Mark as synced locally
  await markCompletedPatternAsSynced(completed.id);
}

/**
 * Download all completed patterns from Supabase
 */
export async function downloadCompletedPatterns(): Promise<CompletedPattern[]> {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('completed_patterns')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (error) {
    console.error('Failed to download completed patterns:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Convert remote records to local format
  // Note: We keep the storage URLs and fetch images on demand
  const completed: CompletedPattern[] = data.map((remote: RemoteCompletedPattern) => ({
    id: remote.id,
    patternId: remote.pattern_id,
    title: remote.title,
    width: remote.width,
    height: remote.height,
    snapshotDataUrl: remote.snapshot_url, // Store URL, will fetch on demand
    thumbnailDataUrl: remote.thumbnail_url,
    completedAt: new Date(remote.completed_at).getTime(),
    syncedToRemote: true,
  }));

  return completed;
}

/**
 * Delete a completed pattern from Supabase
 */
export async function deleteCompletedPatternFromRemote(completedId: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error('User not authenticated');

  // Delete storage files
  const snapshotPath = `${userId}/${completedId}_snapshot.jpg`;
  const thumbnailPath = `${userId}/${completedId}_thumbnail.jpg`;

  await supabase.storage.from('completed-patterns').remove([snapshotPath, thumbnailPath]);

  // Delete database record
  const { error } = await supabase.from('completed_patterns').delete().eq('id', completedId).eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete completed pattern: ${error.message}`);
  }
}

/**
 * Sync all unsynced completed patterns to Supabase
 */
export async function syncCompletedPatterns(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return; // Not logged in, skip sync

  const allCompleted = await loadAllCompletedPatterns();
  const unsynced = allCompleted.filter(c => !c.syncedToRemote);

  for (const completed of unsynced) {
    try {
      await uploadCompletedPattern(completed);
    } catch (error) {
      console.error(`Failed to sync completed pattern ${completed.id}:`, error);
    }
  }
}

/**
 * Merge remote completed patterns with local ones
 */
export async function mergeCompletedPatterns(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const localCompleted = await loadAllCompletedPatterns();
  const remoteCompleted = await downloadCompletedPatterns();

  // Create a map of local completed patterns by ID
  const localMap = new Map(localCompleted.map(c => [c.id, c]));

  // Add remote patterns that don't exist locally
  for (const remote of remoteCompleted) {
    if (!localMap.has(remote.id)) {
      await saveCompletedPattern(remote);
    }
  }

  // Upload local patterns that aren't synced
  await syncCompletedPatterns();
}
