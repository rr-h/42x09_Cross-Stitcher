import {
  syncAllPatterns,
  uploadPattern,
  uploadProgress,
  downloadPattern,
  listUserPatterns,
} from './patternSync';
import { getAllPatternIds, loadPattern, loadProgress } from '../store/persistence';
import { mergeCompletedPatterns } from './completedPatternSync';

/**
 * Check if there are any patterns in local IndexedDB
 */
async function hasLocalPatterns(): Promise<boolean> {
  const patternIds = await getAllPatternIds();
  return patternIds.length > 0;
}

/**
 * Upload all local patterns to Supabase
 */
async function uploadAllLocalPatterns(): Promise<void> {
  console.log('[InitialSync] Uploading all local patterns to Supabase...');
  const patternIds = await getAllPatternIds();

  for (const patternId of patternIds) {
    try {
      const pattern = await loadPattern(patternId);
      if (!pattern) continue;

      // Upload pattern
      await uploadPattern(pattern);

      // Upload progress if it exists
      const progress = await loadProgress(patternId);
      if (progress) {
        await uploadProgress(progress);
      }

      console.log(`[InitialSync] Uploaded pattern: ${patternId}`);
    } catch (error) {
      console.error(`[InitialSync] Failed to upload pattern ${patternId}:`, error);
      // Continue with other patterns
    }
  }

  console.log('[InitialSync] Finished uploading local patterns');
}

/**
 * Download all remote patterns from Supabase
 */
async function downloadAllRemotePatterns(): Promise<void> {
  console.log('[InitialSync] Downloading all remote patterns from Supabase...');
  const remotePatterns = await listUserPatterns();

  for (const remotePattern of remotePatterns) {
    try {
      // Download pattern (also saves to local IndexedDB)
      await downloadPattern(remotePattern.id);
      console.log(`[InitialSync] Downloaded pattern: ${remotePattern.id}`);
    } catch (error) {
      console.error(`[InitialSync] Failed to download pattern ${remotePattern.id}:`, error);
      // Continue with other patterns
    }
  }

  console.log('[InitialSync] Finished downloading remote patterns');
}

/**
 * Perform initial sync when user first logs in or opens app on new device
 *
 * This function determines the sync strategy based on what exists locally and remotely:
 * - If patterns exist only locally: Upload all to remote (first device scenario)
 * - If patterns exist only remotely: Download all from remote (new device scenario)
 * - If patterns exist in both places: Perform bidirectional sync
 * - If neither has patterns: No sync needed
 */
export async function performInitialSync(): Promise<void> {
  try {
    console.log('[InitialSync] Starting initial sync...');

    const hasLocal = await hasLocalPatterns();
    const remotePatterns = await listUserPatterns();
    const hasRemote = remotePatterns.length > 0;

    if (!hasLocal && !hasRemote) {
      console.log('[InitialSync] No patterns found locally or remotely');
      return;
    }

    if (hasLocal && !hasRemote) {
      // First device: upload all local patterns
      console.log('[InitialSync] First device scenario: uploading all local patterns');
      await uploadAllLocalPatterns();
    } else if (!hasLocal && hasRemote) {
      // New device: download all remote patterns
      console.log('[InitialSync] New device scenario: downloading all remote patterns');
      await downloadAllRemotePatterns();
    } else {
      // Both exist: bidirectional sync
      console.log('[InitialSync] Both local and remote patterns exist: performing bidirectional sync');
      await syncAllPatterns();
    }

    // Always sync completed patterns (they're independent of active patterns)
    console.log('[InitialSync] Syncing completed patterns...');
    await mergeCompletedPatterns();

    console.log('[InitialSync] Initial sync completed successfully');
  } catch (error) {
    console.error('[InitialSync] Initial sync failed:', error);
    // Don't throw - allow app to continue even if sync fails
  }
}
